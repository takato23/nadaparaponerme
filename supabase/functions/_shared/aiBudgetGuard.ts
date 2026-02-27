type SubscriptionTier = 'free' | 'pro' | 'premium';
type BudgetReason = 'daily_request_limit' | 'daily_success_limit' | 'daily_credits_limit';

type BudgetLimits = {
  dailyRequests: number;
  dailySuccesses: number;
  dailyCredits: number;
};

type BudgetGuardResult = {
  allowed: boolean;
  reason?: BudgetReason;
  retryAfterSeconds?: number;
  tier: SubscriptionTier;
  limits: BudgetLimits;
  guardError?: boolean;
};

const DEFAULT_LIMITS_BY_TIER: Record<SubscriptionTier, BudgetLimits> = {
  free: { dailyRequests: 40, dailySuccesses: 24, dailyCredits: 40 },
  pro: { dailyRequests: 120, dailySuccesses: 80, dailyCredits: 160 },
  premium: { dailyRequests: 300, dailySuccesses: 220, dailyCredits: 500 },
};

const FEATURE_OVERRIDES: Record<string, Partial<Record<SubscriptionTier, Partial<BudgetLimits>>>> = {
  'prepare-closet-insights': {
    free: { dailyRequests: 20, dailySuccesses: 20, dailyCredits: 0 },
    pro: { dailyRequests: 60, dailySuccesses: 60, dailyCredits: 0 },
    premium: { dailyRequests: 140, dailySuccesses: 140, dailyCredits: 0 },
  },
  'analyze-clothing': {
    free: { dailyRequests: 30, dailySuccesses: 30, dailyCredits: 30 },
    pro: { dailyRequests: 90, dailySuccesses: 90, dailyCredits: 90 },
    premium: { dailyRequests: 240, dailySuccesses: 240, dailyCredits: 240 },
  },
  'virtual-try-on': {
    free: { dailyRequests: 10, dailySuccesses: 8, dailyCredits: 24 },
    pro: { dailyRequests: 30, dailySuccesses: 24, dailyCredits: 96 },
    premium: { dailyRequests: 80, dailySuccesses: 60, dailyCredits: 300 },
  },
  'generate-fashion-image': {
    free: { dailyRequests: 12, dailySuccesses: 10, dailyCredits: 20 },
    pro: { dailyRequests: 40, dailySuccesses: 30, dailyCredits: 90 },
    premium: { dailyRequests: 120, dailySuccesses: 90, dailyCredits: 270 },
  },
};

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
}

function normalizeTier(rawTier: unknown): SubscriptionTier {
  if (rawTier === 'premium') return 'premium';
  if (rawTier === 'pro') return 'pro';
  return 'free';
}

function featureEnvPrefix(feature: string): string {
  return feature.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function withEnvOverride(
  feature: string,
  tier: SubscriptionTier,
  key: 'dailyRequests' | 'dailySuccesses' | 'dailyCredits',
  fallback: number,
): number {
  const suffix = key === 'dailyRequests' ? 'DAILY_REQUESTS' : key === 'dailySuccesses' ? 'DAILY_SUCCESSES' : 'DAILY_CREDITS';
  const tierLabel = tier.toUpperCase();
  const featureLabel = featureEnvPrefix(feature);
  const featureValue = parsePositiveInt(Deno.env.get(`AI_BUDGET_${featureLabel}_${tierLabel}_${suffix}`));
  if (featureValue !== null) return featureValue;

  const tierValue = parsePositiveInt(Deno.env.get(`AI_BUDGET_${tierLabel}_${suffix}`));
  if (tierValue !== null) return tierValue;

  return fallback;
}

async function getUserTier(supabase: any, userId: string): Promise<SubscriptionTier> {
  try {
    const { data: betaAccess, error: betaError } = await supabase
      .from('beta_access')
      .select('premium_override, expires_at, revoked_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!betaError && betaAccess) {
      const revoked = Boolean(betaAccess.revoked_at);
      const expiresAt = typeof betaAccess.expires_at === 'string' ? new Date(betaAccess.expires_at).getTime() : null;
      const active = !revoked && (expiresAt === null || expiresAt > Date.now());
      if (active && betaAccess.premium_override === true) {
        return 'premium';
      }
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('ai-budget: failed to read subscription tier:', error);
      return 'free';
    }

    return normalizeTier(data?.tier);
  } catch (error) {
    console.error('ai-budget: tier lookup crashed:', error);
    return 'free';
  }
}

function resolveLimits(feature: string, tier: SubscriptionTier): BudgetLimits {
  const base = DEFAULT_LIMITS_BY_TIER[tier];
  const override = FEATURE_OVERRIDES[feature]?.[tier] || {};
  const merged: BudgetLimits = {
    dailyRequests: Math.max(1, override.dailyRequests ?? base.dailyRequests),
    dailySuccesses: Math.max(1, override.dailySuccesses ?? base.dailySuccesses),
    dailyCredits: Math.max(0, override.dailyCredits ?? base.dailyCredits),
  };

  return {
    dailyRequests: withEnvOverride(feature, tier, 'dailyRequests', merged.dailyRequests),
    dailySuccesses: withEnvOverride(feature, tier, 'dailySuccesses', merged.dailySuccesses),
    dailyCredits: withEnvOverride(feature, tier, 'dailyCredits', merged.dailyCredits),
  };
}

export function getBudgetLimitMessage(reason?: BudgetReason): string {
  if (reason === 'daily_credits_limit') {
    return 'Llegaste al presupuesto diario de IA para hoy. Reintentá mañana o upgradeá tu plan.';
  }
  if (reason === 'daily_success_limit') {
    return 'Llegaste al máximo diario de generaciones exitosas. Reintentá mañana o upgradeá tu plan.';
  }
  return 'Llegaste al límite diario de solicitudes de IA. Reintentá mañana.';
}

export async function enforceAIBudgetGuard(
  supabase: any,
  userId: string,
  feature: string,
  expectedCredits: number,
): Promise<BudgetGuardResult> {
  try {
    const { data: betaAccess, error: betaError } = await supabase
      .from('beta_access')
      .select('premium_override, unlimited_ai, expires_at, revoked_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!betaError && betaAccess) {
      const revoked = Boolean(betaAccess.revoked_at);
      const expiresAt = typeof betaAccess.expires_at === 'string' ? new Date(betaAccess.expires_at).getTime() : null;
      const active = !revoked && (expiresAt === null || expiresAt > Date.now());
      if (active && betaAccess.unlimited_ai === true) {
        const tier: SubscriptionTier = betaAccess.premium_override === true ? 'premium' : 'pro';
        return {
          allowed: true,
          tier,
          limits: {
            dailyRequests: 999999,
            dailySuccesses: 999999,
            dailyCredits: 999999,
          },
        };
      }
    }
  } catch (error) {
    console.error('ai-budget: beta access check crashed:', error);
  }

  const tier = await getUserTier(supabase, userId);
  const limits = resolveLimits(feature, tier);
  const expected = Math.max(0, Math.floor(expectedCredits));

  try {
    const { data, error } = await supabase.rpc('check_and_reserve_ai_budget', {
      p_user_id: userId,
      p_feature: feature,
      p_expected_credits: expected,
      p_daily_request_limit: limits.dailyRequests,
      p_daily_success_limit: limits.dailySuccesses,
      p_daily_credits_limit: limits.dailyCredits,
    });

    if (error) {
      console.error('ai-budget: reservation failed:', error);
      return { allowed: true, tier, limits, guardError: true };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.allowed) {
      return {
        allowed: false,
        reason: row?.reason as BudgetReason,
        retryAfterSeconds: row?.retry_after_seconds || undefined,
        tier,
        limits,
      };
    }

    return { allowed: true, tier, limits };
  } catch (error) {
    console.error('ai-budget: reservation crashed:', error);
    return { allowed: true, tier, limits, guardError: true };
  }
}

export async function recordAIBudgetSuccess(
  supabase: any,
  userId: string,
  feature: string,
  creditsUsed: number,
): Promise<void> {
  const credits = Math.max(0, Math.floor(creditsUsed));
  try {
    await supabase.rpc('record_ai_budget_success', {
      p_user_id: userId,
      p_feature: feature,
      p_credits_used: credits,
    });
  } catch (error) {
    console.error('ai-budget: success recording failed:', error);
  }
}
