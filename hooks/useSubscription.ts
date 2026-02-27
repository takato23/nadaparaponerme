/**
 * useSubscription Hook
 *
 * Provides global subscription state and quota management.
 * Auto-refreshes on mount and exposes methods for checking feature access.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../src/lib/supabase';
import { PAYMENTS_ENABLED, V1_SAFE_MODE } from '../src/config/runtime';
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionTier,
  type SubscriptionPlan,
} from '../types-payment';
import {
  recordCreditUsage as recordLocalUsage,
  canUseFeature as canUseLocalFeature,
  setUserTier,
  type FeatureType,
} from '../src/services/usageTrackingService';
import { isAdminUser } from '../src/services/accessControlService';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing' | 'paused';
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  currentPeriodEnd: Date | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseSubscriptionReturn extends SubscriptionState {
  // Computed values
  remainingGenerations: number;
  usagePercentage: number;
  isAtLimit: boolean;
  isPro: boolean;
  isPremium: boolean;
  isFree: boolean;
  daysUntilRenewal: number;

  // Methods
  refresh: () => Promise<void>;
  canUseFeature: (feature: FeatureName) => boolean;
  canGenerate: () => boolean;
  incrementUsage: (feature?: FeatureType) => Promise<boolean>;
  canUseAIFeature: (feature: FeatureType) => { canUse: boolean; reason?: string };

  // Plan info
  currentPlan: SubscriptionPlan;
  allPlans: SubscriptionPlan[];
}

export type FeatureName =
  | 'ai_designer'
  | 'virtual_tryon'
  | 'lookbook'
  | 'style_dna'
  | 'export_lookbooks'
  | 'unlimited_closet';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLANS: SubscriptionPlan[] = SUBSCRIPTION_PLANS;
const FREE_PLAN = PLANS.find((plan) => plan.id === 'free') || PLANS[0];

// ============================================================================
// HOOK
// ============================================================================

export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    status: 'active',
    aiGenerationsUsed: 0,
    aiGenerationsLimit: FREE_PLAN.limits.ai_generations_per_month,
    currentPeriodEnd: null,
    isLoading: true,
    error: null,
  });

  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch subscription data
  const refresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUserTier('free');
        setIsAdmin(false);
        setState({
          tier: 'free',
          status: 'active',
          aiGenerationsUsed: 0,
          aiGenerationsLimit: FREE_PLAN.limits.ai_generations_per_month,
          currentPeriodEnd: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Check if admin
      const userIsAdmin = isAdminUser(user);
      setIsAdmin(userIsAdmin);

      // Fetch subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: betaAccess, error: betaError } = await supabase
        .from('beta_access')
        .select('premium_override, unlimited_ai, expires_at, revoked_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }
      if (betaError && betaError.code !== 'PGRST116') {
        console.warn('Beta access lookup failed, continuing without beta overrides:', betaError);
      }

      const betaIsActive = !!betaAccess
        && !betaAccess.revoked_at
        && (!betaAccess.expires_at || new Date(betaAccess.expires_at).getTime() > Date.now());
      const betaPremium = betaIsActive && betaAccess?.premium_override === true;
      const betaUnlimitedAI = betaIsActive && betaAccess?.unlimited_ai === true;

      // If no subscription, use defaults
      if (!subscription) {
        const tierFromBeta = betaPremium ? 'premium' : 'free';
        setUserTier(tierFromBeta);
        setState({
          tier: tierFromBeta,
          status: 'active',
          aiGenerationsUsed: 0,
          aiGenerationsLimit: betaUnlimitedAI ? -1 : (PLANS.find((plan) => plan.id === tierFromBeta)?.limits.ai_generations_per_month ?? FREE_PLAN.limits.ai_generations_per_month),
          currentPeriodEnd: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Get plan limits
      const isPaidActive = subscription.status === 'active' || subscription.status === 'trialing';
      const baseTier = (isPaidActive ? subscription.tier : 'free') as SubscriptionTier;
      const effectiveTier = (betaPremium ? 'premium' : baseTier) as SubscriptionTier;
      const plan = PLANS.find(p => p.id === effectiveTier) || PLANS[0];
      setUserTier(effectiveTier);

      setState({
        tier: effectiveTier,
        status: subscription.status,
        aiGenerationsUsed: subscription.ai_generations_used || 0,
        aiGenerationsLimit: betaUnlimitedAI ? -1 : plan.limits.ai_generations_per_month,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : null,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching subscription:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error al cargar suscripción',
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  // Computed values
  const remainingGenerations = useMemo(() => {
    if (isAdmin) return 999;
    if (state.aiGenerationsLimit === -1) return -1; // Unlimited
    return Math.max(0, state.aiGenerationsLimit - state.aiGenerationsUsed);
  }, [state.aiGenerationsLimit, state.aiGenerationsUsed, isAdmin]);

  const usagePercentage = useMemo(() => {
    if (isAdmin) return 0;
    if (state.aiGenerationsLimit === -1) return 0;
    return Math.min(100, (state.aiGenerationsUsed / state.aiGenerationsLimit) * 100);
  }, [state.aiGenerationsUsed, state.aiGenerationsLimit, isAdmin]);

  const isAtLimit = useMemo(() => {
    if (isAdmin) return false;
    if (state.aiGenerationsLimit === -1) return false;
    return state.aiGenerationsUsed >= state.aiGenerationsLimit;
  }, [state.aiGenerationsUsed, state.aiGenerationsLimit, isAdmin]);

  const daysUntilRenewal = useMemo(() => {
    if (!state.currentPeriodEnd) return 0;
    const now = new Date();
    const diffTime = state.currentPeriodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [state.currentPeriodEnd]);

  const currentPlan = useMemo(() => {
    return PLANS.find(p => p.id === state.tier) || PLANS[0];
  }, [state.tier]);

  // Methods
  const canUseFeature = useCallback((feature: FeatureName): boolean => {
    if (isAdmin) return true;

    const plan = PLANS.find(p => p.id === state.tier) || PLANS[0];

    switch (feature) {
      case 'ai_designer':
        return plan.limits.can_use_ai_designer;
      case 'virtual_tryon':
        // V1 SAFE: habilitamos Try-On como “beta” aunque pagos estén apagados.
        // La protección real de costos la hace el server (RPC quota + Edge).
        if (V1_SAFE_MODE && !PAYMENTS_ENABLED) return true;
        return plan.limits.can_use_virtual_tryon;
      case 'lookbook':
        return plan.limits.can_use_lookbook;
      case 'style_dna':
        return plan.limits.can_use_style_dna;
      case 'export_lookbooks':
        return plan.limits.can_export_lookbooks;
      case 'unlimited_closet':
        return plan.limits.max_closet_items === -1;
      default:
        return true;
    }
  }, [state.tier, isAdmin]);

  const canGenerate = useCallback((): boolean => {
    if (isAdmin) return true;
    if (state.aiGenerationsLimit === -1) return true;
    return state.aiGenerationsUsed < state.aiGenerationsLimit;
  }, [state.aiGenerationsUsed, state.aiGenerationsLimit, isAdmin]);

  /**
   * Increment usage counter (local tracking + Supabase)
   * Returns true if usage was recorded successfully
   */
  const incrementUsage = useCallback(async (feature: FeatureType = 'outfit_generation'): Promise<boolean> => {
    if (isAdmin) return true;

    let userId: string | null = null;
    let serverIncremented = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    // If authenticated, use server guard as source of truth.
    if (userId) {
      try {
        const { data, error } = await supabase.rpc('increment_ai_generation_usage', {
          p_user_id: userId,
          p_amount: 1,
        });

        if (error) {
          throw error;
        }

        if (data === false) {
          return false;
        }

        serverIncremented = true;
      } catch (error) {
        console.warn('Failed to sync usage to Supabase, using local fallback:', error);
      }
    }

    // When server already accepted the increment, keep local store/state in sync.
    if (serverIncremented) {
      recordLocalUsage(feature);
      setState(prev => ({
        ...prev,
        aiGenerationsUsed: prev.aiGenerationsUsed + 1,
      }));
      return true;
    }

    // Offline/local fallback.
    const localStatus = canUseLocalFeature(feature);
    if (!localStatus.canUse) {
      return false;
    }
    recordLocalUsage(feature);

    // Update local state immediately
    setState(prev => ({
      ...prev,
      aiGenerationsUsed: prev.aiGenerationsUsed + 1,
    }));

    return true;
  }, [isAdmin]);

  /**
   * Check if specific AI feature can be used (with local fallback)
   */
  const canUseAIFeature = useCallback((_feature: FeatureType): { canUse: boolean; reason?: string } => {
    if (isAdmin) return { canUse: true };

    if (state.aiGenerationsLimit !== -1 && state.aiGenerationsUsed >= state.aiGenerationsLimit) {
      return {
        canUse: false,
        reason: `Límite alcanzado (${state.aiGenerationsUsed}/${state.aiGenerationsLimit})`,
      };
    }

    return { canUse: true };
  }, [isAdmin, state.aiGenerationsLimit, state.aiGenerationsUsed]);

  return {
    // State
    ...state,

    // Computed
    remainingGenerations,
    usagePercentage,
    isAtLimit,
    isPro: state.tier === 'pro',
    isPremium: state.tier === 'premium',
    isFree: state.tier === 'free',
    daysUntilRenewal,

    // Methods
    refresh,
    canUseFeature,
    canGenerate,
    incrementUsage,
    canUseAIFeature,

    // Plan info
    currentPlan,
    allPlans: PLANS,
  };
}

export default useSubscription;
