/**
 * Payment Service
 *
 * Handles dual payment system:
 * - MercadoPago for Argentina (primary)
 * - RevenueCat/Stripe for international users
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import {
  SUBSCRIPTION_PLANS,
  type Subscription,
  type SubscriptionTier,
  type SubscriptionPlan,
  type MercadoPagoPreference,
  type UsageMetrics,
} from '../../types-payment';
import {
  shouldUseRevenueCat,
  initRevenueCat,
  getOfferings as getRCOfferings,
  purchasePackage as purchaseRCPackage,
  restorePurchases as restoreRCPurchases,
  getCurrentTier as getRCCurrentTier,
  isRevenueCatAvailable,
} from './revenueCatService';
import { isAdminUser } from './accessControlService';
import { PAYMENTS_ENABLED } from '../config/runtime';

// ============================================================================
// CONSTANTS
// ============================================================================

const MERCADOPAGO_PUBLIC_KEY =
  import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ||
  // Backwards-compat for older env naming (deprecated)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((import.meta.env as any).VITE_MP_PUBLIC_KEY as string) ||
  '';
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

type CheckoutCurrency = 'ARS' | 'USD';

// ============================================================================
// IDEMPOTENCY KEY GENERATION
// ============================================================================

/**
 * Generate a unique idempotency key for payment requests.
 * This prevents duplicate charges if users tap "Pay" multiple times.
 * Format: user_id_tier_timestamp_random
 */
function generateIdempotencyKey(userId: string, tier: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  return `${userId}_${tier}_${timestamp}_${random}`;
}

// Track in-flight payment requests to prevent double-tap
const inFlightPayments = new Map<string, Promise<MercadoPagoPreference>>();

const PLANS: SubscriptionPlan[] = SUBSCRIPTION_PLANS;

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get user's current subscription
 */
export async function getCurrentSubscription(): Promise<Subscription | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no subscription exists, create a free one
      if (error.code === 'PGRST116') {
        return await createFreeSubscription();
      }
      throw error;
    }

    return data as Subscription;
  } catch (error) {
    logger.error('Error getting subscription:', error);
    return null;
  }
}

/**
 * Create a free subscription for a new user
 */
export async function createFreeSubscription(): Promise<Subscription> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      tier: 'free',
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: oneYearLater.toISOString(),
      ai_generations_used: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Also create usage metrics
  await initializeUsageMetrics('free');

  return data as Subscription;
}

/**
 * Get all available subscription plans
 */
export function getSubscriptionPlans(): SubscriptionPlan[] {
  return PLANS;
}

/**
 * Get a specific subscription plan by ID
 */
export function getSubscriptionPlan(tier: SubscriptionTier): SubscriptionPlan | undefined {
  return PLANS.find(plan => plan.id === tier);
}

// ============================================================================
// MERCADOPAGO INTEGRATION
// ============================================================================

/**
 * Create MercadoPago payment preference
 * Includes client-side idempotency protection against double-tap
 */
export async function createPaymentPreference(
  tier: SubscriptionTier,
  currency: CheckoutCurrency = 'ARS'
): Promise<MercadoPagoPreference> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const plan = getSubscriptionPlan(tier);
    if (!plan) throw new Error('Plan de suscripción inválido');

    // ============================================================================
    // DOUBLE-TAP PROTECTION: If there's already a payment in flight for this tier,
    // return that promise instead of creating a new one
    // ============================================================================
    const cacheKey = `${user.id}_${tier}`;
    const existingRequest = inFlightPayments.get(cacheKey);
    if (existingRequest) {
      logger.log('⚠️ Duplicate payment request detected, returning existing promise');
      return existingRequest;
    }

    // Generate idempotency key for this payment attempt
    const idempotencyKey = generateIdempotencyKey(user.id, tier);

    // Create the payment request promise
    const paymentPromise = (async () => {
      try {
        // Call Supabase Edge Function to create preference
        const { data, error } = await supabase.functions.invoke('create-payment-preference', {
          body: {
            tier,
            currency,
            user_email: user.email,
            user_id: user.id,
            idempotency_key: idempotencyKey,  // Send idempotency key to server
          },
        });

        if (error) throw error;
        return data as MercadoPagoPreference;
      } finally {
        // Clean up after request completes (success or failure)
        inFlightPayments.delete(cacheKey);
      }
    })();

    // Store the in-flight request
    inFlightPayments.set(cacheKey, paymentPromise);

    // Wait for the payment to complete
    return await paymentPromise;
  } catch (error: any) {
    logger.error('Error creating payment preference:', error);

    // Try to extract more details from the error
    let errorMessage = 'No se pudo crear la preferencia de pago. Intentá de nuevo.';

    if (error && typeof error === 'object') {
      // Check if it's a FunctionsHttpError with a JSON body
      if (error.context && error.context.json) {
        try {
          const errorBody = await error.context.json();
          logger.error('Edge Function Error Body:', errorBody);
          if (errorBody.error) {
            errorMessage = `Error del servidor: ${errorBody.error}`;
          }
        } catch (e) {
          logger.error('Could not parse error body', e);
        }
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Create a MercadoPago recurring subscription (Argentina) and return the init_point.
 * This uses MercadoPago "preapproval" (Suscripciones).
 */
export async function createMercadoPagoSubscription(
  tier: SubscriptionTier
): Promise<{ id: string; init_point: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  if (tier !== 'pro' && tier !== 'premium') {
    throw new Error('Plan inválido');
  }

  const { data, error } = await supabase.functions.invoke('create-mp-preapproval', {
    body: {
      tier,
      user_id: user.id,
      user_email: user.email,
    },
  });

  if (error) throw error;
  return data as { id: string; init_point: string };
}

/**
 * Create a Paddle transaction (international) and return checkout URL.
 */
export async function createPaddleTransaction(
  tier: SubscriptionTier
): Promise<{ transaction_id: string; checkout_url: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  if (tier !== 'pro' && tier !== 'premium') {
    throw new Error('Plan inválido');
  }

  const { data, error } = await supabase.functions.invoke('create-paddle-transaction', {
    body: {
      tier,
      user_id: user.id,
    },
  });

  if (error) throw error;
  return data as { transaction_id: string; checkout_url: string };
}

/**
 * Unified checkout entrypoint.
 * - ARS: MercadoPago subscriptions (Argentina)
 * - USD: Paddle checkout (international)
 */
export async function startCheckout(
  tier: SubscriptionTier,
  currency: CheckoutCurrency
): Promise<void> {
  if (!PAYMENTS_ENABLED) {
    throw new Error('Pagos desactivados. Próximamente vas a poder hacer upgrade.');
  }

  if (tier === 'free') return;

  if (currency === 'USD') {
    const { checkout_url } = await createPaddleTransaction(tier);
    window.location.href = checkout_url;
    return;
  }

  // Default: Argentina (ARS) recurring subscription.
  try {
    const { init_point } = await createMercadoPagoSubscription(tier);
    window.location.href = init_point;
    return;
  } catch (error: any) {
    // If recurring flow isn't deployed or fails, fall back to one-time checkout preference.
    const status = error?.context?.status;
    const message = String(error?.message || '');
    const looksLikeNotFound =
      status === 404 ||
      message.toLowerCase().includes('requested function was not found') ||
      message.toLowerCase().includes('not_found') ||
      message.toLowerCase().includes('not found');

    if (!looksLikeNotFound) {
      throw error;
    }

    logger.warn('MercadoPago subscription flow unavailable; falling back to one-time preference', error);

    const preference = await createPaymentPreference(tier, 'ARS');
    const url = preference.sandbox_init_point || preference.init_point;
    if (!url) {
      throw new Error('No se pudo iniciar el checkout. Intentá de nuevo.');
    }
    window.location.href = url;
  }
}

/**
 * Handle successful payment callback
 */
export async function handlePaymentSuccess(
  paymentId: string,
  subscriptionTier: SubscriptionTier
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Call Edge Function to process payment
    const { error } = await supabase.functions.invoke('process-payment', {
      body: {
        payment_id: paymentId,
        user_id: user.id,
        subscription_tier: subscriptionTier,
      },
    });

    if (error) throw error;
  } catch (error) {
    logger.error('Error handling payment success:', error);
    throw new Error('Error al procesar el pago. Contactá a soporte.');
  }
}

/**
 * Handle MercadoPago recurring subscription callback (preapproval flow).
 *
 * Normally activation happens via webhook, but this provides a reliable fallback
 * when the user returns to the app (reduces "I paid but didn't get Pro" cases).
 */
export async function handleMercadoPagoSubscriptionSuccess(
  externalReference: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase.functions.invoke('process-mp-preapproval', {
      body: {
        external_reference: externalReference,
      },
    });

    if (error) throw error;
  } catch (error) {
    logger.error('Error handling MercadoPago subscription success:', error);
    // Non-fatal: webhook can still activate asynchronously.
    throw new Error('Error al procesar la suscripción. Si el cobro se realizó, tu plan se activará automáticamente en unos minutos.');
  }
}

// ============================================================================
// FEATURE ACCESS CONTROL
// ============================================================================

/**
 * Check if user is admin
 */
async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return isAdminUser(user);
  } catch {
    return false;
  }
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(featureName: string): Promise<boolean> {
  try {
    // Admins have full access to everything
    if (await isAdmin()) {
      logger.log('🔑 Admin detected, granting full access');
      return true;
    }

    const subscription = await getCurrentSubscription();
    if (!subscription) return false;

    const isPaidActive = subscription.status === 'active' || subscription.status === 'trialing';
    const effectiveTier: SubscriptionTier = isPaidActive ? subscription.tier : 'free';
    const plan = getSubscriptionPlan(effectiveTier);
    if (!plan) return false;

    // Check feature access based on limits
    switch (featureName) {
      case 'ai_designer':
        return plan.limits.can_use_ai_designer;
      case 'virtual_tryon':
        return plan.limits.can_use_virtual_tryon;
      case 'lookbook':
        return plan.limits.can_use_lookbook;
      case 'style_dna':
        return plan.limits.can_use_style_dna;
      case 'export_lookbooks':
        return plan.limits.can_export_lookbooks;
      default:
        return true; // Unknown features are allowed by default
    }
  } catch (error) {
    logger.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * Check if user can generate more AI outfits
 */
export async function canGenerateOutfit(): Promise<boolean> {
  try {
    // Admins have unlimited generations
    if (await isAdmin()) {
      logger.log('🔑 Admin detected, unlimited AI generations');
      return true;
    }

    const subscription = await getCurrentSubscription();
    if (!subscription) return false;

    const isPaidActive = subscription.status === 'active' || subscription.status === 'trialing';
    const effectiveTier: SubscriptionTier = isPaidActive ? subscription.tier : 'free';
    const plan = getSubscriptionPlan(effectiveTier);
    if (!plan) return false;

    // Premium has unlimited generations
    if (plan.limits.ai_generations_per_month === -1) return true;

    // Check if under limit
    return subscription.ai_generations_used < plan.limits.ai_generations_per_month;
  } catch (error) {
    logger.error('Error checking outfit generation limit:', error);
    return false;
  }
}

/**
 * Increment AI generation usage count
 */
export async function incrementAIGenerationUsage(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Call database function to increment usage
    const { error } = await supabase.rpc('increment_ai_generation_usage', {
      p_user_id: user.id,
      p_amount: 1,
    });

    if (error) throw error;
  } catch (error) {
    logger.error('Error incrementing AI generation usage:', error);
  }
}

// ============================================================================
// USAGE METRICS
// ============================================================================

/**
 * Get user's current usage metrics
 */
export async function getUsageMetrics(): Promise<UsageMetrics | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data, error } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', periodStart.toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Create metrics if not exists
        return await initializeUsageMetrics();
      }
      throw error;
    }

    return data as UsageMetrics;
  } catch (error) {
    logger.error('Error getting usage metrics:', error);
    return null;
  }
}

/**
 * Initialize usage metrics for current period
 */
async function initializeUsageMetrics(tier?: SubscriptionTier): Promise<UsageMetrics> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  // Get subscription tier if not provided
  let subscriptionTier = tier;
  if (!subscriptionTier) {
    const subscription = await getCurrentSubscription();
    subscriptionTier = subscription?.tier || 'free';
  }

  const plan = getSubscriptionPlan(subscriptionTier);
  if (!plan) throw new Error('Plan de suscripción inválido');

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('usage_metrics')
    .insert({
      user_id: user.id,
      subscription_tier: subscriptionTier,
      ai_generations_used: 0,
      ai_generations_limit: plan.limits.ai_generations_per_month,
      virtual_tryon_count: 0,
      lookbook_created_count: 0,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      last_reset: now.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data as UsageMetrics;
}

/**
 * Get remaining AI generations for the month
 */
export async function getRemainingGenerations(): Promise<number> {
  try {
    const subscription = await getCurrentSubscription();
    if (!subscription) return 0;

    const isPaidActive = subscription.status === 'active' || subscription.status === 'trialing';
    const effectiveTier: SubscriptionTier = isPaidActive ? subscription.tier : 'free';
    const plan = getSubscriptionPlan(effectiveTier);
    if (!plan) return 0;

    // Premium has unlimited
    if (plan.limits.ai_generations_per_month === -1) return -1;

    return Math.max(0, plan.limits.ai_generations_per_month - subscription.ai_generations_used);
  } catch (error) {
    logger.error('Error getting remaining generations:', error);
    return 0;
  }
}

// ============================================================================
// SUBSCRIPTION UPDATES
// ============================================================================

/**
 * Upgrade subscription to a higher tier
 */
export async function upgradeSubscription(newTier: SubscriptionTier): Promise<void> {
  try {
    // Backwards-compatible: default ARS flow.
    await startCheckout(newTier, 'ARS');
  } catch (error) {
    logger.error('Error upgrading subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const now = new Date();

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: now.toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    throw new Error('Error al cancelar la suscripción. Intentá de nuevo.');
  }
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    logger.error('Error reactivating subscription:', error);
    throw new Error('Error al reactivar la suscripción. Intentá de nuevo.');
  }
}
