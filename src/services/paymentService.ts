/**
 * Payment Service
 *
 * Handles MercadoPago integration and subscription management
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  Subscription,
  SubscriptionTier,
  SubscriptionPlan,
  PaymentTransaction,
  MercadoPagoPreference,
  UsageMetrics,
  SUBSCRIPTION_PLANS,
} from '../../types-payment';

// ============================================================================
// CONSTANTS
// ============================================================================

const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// Import subscription plans
const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para empezar a organizar tu armario',
    price_monthly_ars: 0,
    price_monthly_usd: 0,
    features: [
      'Hasta 50 prendas en tu armario',
      '10 generaciones de outfits por mes',
      'Análisis básico de color',
      'Outfits guardados ilimitados',
      'Compartir en comunidad',
    ],
    limits: {
      ai_generations_per_month: 10,
      max_closet_items: 50,
      max_saved_outfits: -1,
      can_use_virtual_tryon: false,
      can_use_ai_designer: false,
      can_use_lookbook: false,
      can_use_style_dna: false,
      can_export_lookbooks: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para fashionistas serios',
    price_monthly_ars: 2999,
    price_monthly_usd: 9.99,
    features: [
      'Todo lo de Free +',
      'Prendas ilimitadas',
      '100 generaciones de outfits por mes',
      'Probador virtual con tu foto',
      'AI Fashion Designer',
      'Lookbook Creator',
      'Exportar lookbooks en HD',
      'Análisis avanzado de gaps',
      'Sin anuncios',
    ],
    limits: {
      ai_generations_per_month: 100,
      max_closet_items: -1,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: false,
      can_export_lookbooks: true,
    },
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Experiencia completa con IA ilimitada',
    price_monthly_ars: 4999,
    price_monthly_usd: 16.99,
    features: [
      'Todo lo de Pro +',
      'Generaciones de IA ilimitadas',
      'Style DNA Profile completo',
      'Análisis de evolución de estilo',
      'Recomendaciones personalizadas diarias',
      'Acceso anticipado a features',
      'Soporte prioritario',
    ],
    limits: {
      ai_generations_per_month: -1,
      max_closet_items: -1,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: true,
      can_export_lookbooks: true,
    },
  },
];

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get user's current subscription
 */
export async function getCurrentSubscription(): Promise<Subscription | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

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
 */
export async function createPaymentPreference(
  tier: SubscriptionTier,
  currency: 'ARS' | 'USD' = 'ARS'
): Promise<MercadoPagoPreference> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const plan = getSubscriptionPlan(tier);
    if (!plan) throw new Error('Invalid subscription tier');

    // Call Supabase Edge Function to create preference
    const { data, error } = await supabase.functions.invoke('create-payment-preference', {
      body: {
        tier,
        currency,
        user_email: user.email,
        user_id: user.id,
      },
    });

    if (error) throw error;

    return data as MercadoPagoPreference;
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
 * Handle successful payment callback
 */
export async function handlePaymentSuccess(
  paymentId: string,
  subscriptionTier: SubscriptionTier
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

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

// ============================================================================
// FEATURE ACCESS CONTROL
// ============================================================================

// Admin emails with full access (bypass paywall)
const ADMIN_EMAILS = [
  'admin@admin.com',
  'santiagobalosky@gmail.com', // Backup admin
];

/**
 * Check if user is admin
 */
async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
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

    const plan = getSubscriptionPlan(subscription.tier);
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

    const plan = getSubscriptionPlan(subscription.tier);
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
    if (!user) throw new Error('No authenticated user');

    // Call database function to increment usage
    const { error } = await supabase.rpc('increment_ai_generation_usage', {
      p_user_id: user.id,
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
    if (!user) throw new Error('No authenticated user');

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
  if (!plan) throw new Error('Invalid subscription tier');

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

    const plan = getSubscriptionPlan(subscription.tier);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Create payment preference and redirect to MercadoPago
    const preference = await createPaymentPreference(newTier);

    // Redirect to MercadoPago checkout
    window.location.href = preference.init_point;
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
    if (!user) throw new Error('No authenticated user');

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
    if (!user) throw new Error('No authenticated user');

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
