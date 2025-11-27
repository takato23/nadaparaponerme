/**
 * useSubscription Hook
 *
 * Provides global subscription state and quota management.
 * Auto-refreshes on mount and exposes methods for checking feature access.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../src/lib/supabase';
import type { SubscriptionTier, SubscriptionPlan } from '../types-payment';

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

// Admin emails with full access (bypass paywall)
const ADMIN_EMAILS = [
  'admin@admin.com',
  'santiagobalosky@gmail.com',
];

// ============================================================================
// HOOK
// ============================================================================

export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    status: 'active',
    aiGenerationsUsed: 0,
    aiGenerationsLimit: 10,
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
        setState({
          tier: 'free',
          status: 'active',
          aiGenerationsUsed: 0,
          aiGenerationsLimit: 10,
          currentPeriodEnd: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Check if admin
      const userIsAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
      setIsAdmin(userIsAdmin);

      // Fetch subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      // If no subscription, use defaults
      if (!subscription) {
        setState({
          tier: 'free',
          status: 'active',
          aiGenerationsUsed: 0,
          aiGenerationsLimit: 10,
          currentPeriodEnd: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Get plan limits
      const plan = PLANS.find(p => p.id === subscription.tier) || PLANS[0];

      setState({
        tier: subscription.tier as SubscriptionTier,
        status: subscription.status,
        aiGenerationsUsed: subscription.ai_generations_used || 0,
        aiGenerationsLimit: plan.limits.ai_generations_per_month,
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

    // Plan info
    currentPlan,
    allPlans: PLANS,
  };
}

export default useSubscription;
