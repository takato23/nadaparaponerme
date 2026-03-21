import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type PlanRow = {
  plan_code: string;
  display_name: string;
  description: string | null;
  visible: boolean;
  sort_order: number;
  version: number;
  visible_pricing: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

type BucketRow = {
  plan_code: string;
  bucket_key: string;
  display_name: string | null;
  monthly_limit: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

type FeatureRow = {
  plan_code: string;
  feature_key: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
};

type SubscriptionRow = {
  tier: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
};

type BetaAccessRow = {
  premium_override: boolean;
  unlimited_ai: boolean;
  expires_at: string | null;
  revoked_at: string | null;
};

type BillingCatalogPlan = ReturnType<typeof groupCatalog>[number];

const DEFAULT_PLAN_CATALOG: BillingCatalogPlan[] = [
  {
    code: 'free',
    display_name: 'Free',
    description: 'Carga tu armario y empeza a usar Kumbi gratis',
    visible: true,
    version: 1,
    pricing: {
      ARS: { monthly_minor: 0, currency: 'ARS', display: 'Gratis' },
      USD: { monthly_minor: 0, currency: 'USD', display: 'Free' },
    },
    metadata: { recommended: false },
    buckets: [
      { key: 'kumbi_messages', display_name: 'Mensajes de Kumbi', monthly_limit: 100, metadata: { unit: 'messages' } },
      { key: 'shopping_grounded_searches', display_name: 'Shopping real', monthly_limit: 0, metadata: { unit: 'searches' } },
      { key: 'tryons', display_name: 'Try-ons', monthly_limit: 1, metadata: { unit: 'images' } },
    ],
    features: [
      { key: 'kumbi_chat', enabled: true, metadata: {} },
      { key: 'shopping_real', enabled: false, metadata: {} },
      { key: 'try_on', enabled: true, metadata: {} },
      { key: 'priority_support', enabled: false, metadata: {} },
    ],
  },
  {
    code: 'plus',
    display_name: 'Plus',
    description: 'Desbloquea shopping real para completar tus looks',
    visible: true,
    version: 1,
    pricing: {
      ARS: { monthly_minor: 7990, currency: 'ARS', display: 'AR$ 7.990/mes' },
      USD: { monthly_minor: 799, currency: 'USD', display: 'US$ 7.99/month' },
    },
    metadata: { recommended: true },
    buckets: [
      { key: 'kumbi_messages', display_name: 'Mensajes de Kumbi', monthly_limit: 600, metadata: { unit: 'messages' } },
      { key: 'shopping_grounded_searches', display_name: 'Shopping real', monthly_limit: 8, metadata: { unit: 'searches' } },
      { key: 'tryons', display_name: 'Try-ons', monthly_limit: 4, metadata: { unit: 'images' } },
    ],
    features: [
      { key: 'kumbi_chat', enabled: true, metadata: {} },
      { key: 'shopping_real', enabled: true, metadata: {} },
      { key: 'try_on', enabled: true, metadata: {} },
      { key: 'priority_support', enabled: false, metadata: {} },
    ],
  },
  {
    code: 'pro',
    display_name: 'Pro',
    description: 'Para uso intensivo de Kumbi, shopping real y capa visual premium',
    visible: true,
    version: 1,
    pricing: {
      ARS: { monthly_minor: 10990, currency: 'ARS', display: 'AR$ 10.990/mes' },
      USD: { monthly_minor: 1099, currency: 'USD', display: 'US$ 10.99/month' },
    },
    metadata: { recommended: false },
    buckets: [
      { key: 'kumbi_messages', display_name: 'Mensajes de Kumbi', monthly_limit: 1500, metadata: { unit: 'messages' } },
      { key: 'shopping_grounded_searches', display_name: 'Shopping real', monthly_limit: 20, metadata: { unit: 'searches' } },
      { key: 'tryons', display_name: 'Try-ons', monthly_limit: 8, metadata: { unit: 'images' } },
    ],
    features: [
      { key: 'kumbi_chat', enabled: true, metadata: {} },
      { key: 'shopping_real', enabled: true, metadata: {} },
      { key: 'try_on', enabled: true, metadata: {} },
      { key: 'priority_support', enabled: true, metadata: {} },
    ],
  },
  {
    code: 'premium',
    display_name: 'Premium',
    description: 'Acceso legacy premium con cupos extendidos',
    visible: false,
    version: 1,
    pricing: {},
    metadata: { legacy: true },
    buckets: [
      { key: 'kumbi_messages', display_name: 'Mensajes de Kumbi', monthly_limit: 500, metadata: { unit: 'messages' } },
      { key: 'shopping_grounded_searches', display_name: 'Shopping real', monthly_limit: 20, metadata: { unit: 'searches' } },
      { key: 'tryons', display_name: 'Try-ons', monthly_limit: 8, metadata: { unit: 'images' } },
    ],
    features: [
      { key: 'kumbi_chat', enabled: true, metadata: {} },
      { key: 'shopping_real', enabled: true, metadata: {} },
      { key: 'try_on', enabled: true, metadata: {} },
      { key: 'priority_support', enabled: true, metadata: {} },
    ],
  },
];

function groupCatalog(plans: PlanRow[], buckets: BucketRow[], features: FeatureRow[]) {
  const bucketsByPlan = new Map<string, BucketRow[]>();
  const featuresByPlan = new Map<string, FeatureRow[]>();

  for (const bucket of buckets) {
    const list = bucketsByPlan.get(bucket.plan_code) || [];
    list.push(bucket);
    bucketsByPlan.set(bucket.plan_code, list);
  }

  for (const feature of features) {
    const list = featuresByPlan.get(feature.plan_code) || [];
    list.push(feature);
    featuresByPlan.set(feature.plan_code, list);
  }

  return plans.map((plan) => ({
    code: plan.plan_code,
    display_name: plan.display_name,
    description: plan.description,
    visible: plan.visible,
    version: plan.version,
    pricing: plan.visible_pricing || {},
    metadata: plan.metadata || {},
    buckets: (bucketsByPlan.get(plan.plan_code) || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((bucket) => ({
        key: bucket.bucket_key,
        display_name: bucket.display_name || bucket.bucket_key,
        monthly_limit: bucket.monthly_limit,
        metadata: bucket.metadata || {},
      })),
    features: (featuresByPlan.get(plan.plan_code) || []).map((feature) => ({
      key: feature.feature_key,
      enabled: feature.enabled,
      metadata: feature.metadata || {},
    })),
  }));
}

function getPlanFromCatalog(catalog: BillingCatalogPlan[], planCode: string | null | undefined): BillingCatalogPlan {
  if (!planCode) return catalog.find((plan) => plan.code === 'free') || catalog[0];
  return catalog.find((plan) => plan.code === planCode) || catalog.find((plan) => plan.code === 'free') || catalog[0];
}

function isSchemaMissingError(message: string): boolean {
  return [
    'does not exist',
    'could not find the function',
    'relation',
    'column',
    'schema cache',
    'PGRST',
  ].some((fragment) => message.includes(fragment));
}

function isBetaActive(betaAccess: BetaAccessRow | null): boolean {
  if (!betaAccess || betaAccess.revoked_at) return false;
  if (!betaAccess.expires_at) return true;
  return new Date(betaAccess.expires_at).getTime() > Date.now();
}

function buildFallbackSummary(
  catalog: BillingCatalogPlan[],
  subscription: SubscriptionRow | null,
  betaAccess: BetaAccessRow | null,
) {
  const betaActive = isBetaActive(betaAccess);
  const subscriptionIsPaid = subscription?.status === 'active' || subscription?.status === 'trialing';
  const planCode = betaActive && betaAccess?.premium_override
    ? 'premium'
    : (subscriptionIsPaid ? subscription?.tier : null) || 'free';
  const plan = getPlanFromCatalog(catalog, planCode);
  const cycleStart = subscription?.current_period_start || new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const cycleEnd = subscription?.current_period_end || new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString();

  const features = Object.fromEntries(
    plan.features.map((feature) => [
      feature.key,
      { enabled: feature.enabled, metadata: feature.metadata || {} },
    ]),
  );

  const currentBuckets = Object.fromEntries(
    plan.buckets.map((bucket) => [
      bucket.key,
      {
        display_name: bucket.display_name,
        monthly_limit: betaActive && betaAccess?.unlimited_ai && bucket.key === 'kumbi_messages' ? -1 : bucket.monthly_limit,
        metadata: bucket.metadata || {},
      },
    ]),
  );

  const usageBuckets = Object.fromEntries(
    plan.buckets.map((bucket) => [
      bucket.key,
      {
        display_name: bucket.display_name,
        monthly_limit: betaActive && betaAccess?.unlimited_ai && bucket.key === 'kumbi_messages' ? -1 : bucket.monthly_limit,
        metadata: bucket.metadata || {},
        used: 0,
        reserved: 0,
        remaining: betaActive && betaAccess?.unlimited_ai && bucket.key === 'kumbi_messages'
          ? -1
          : bucket.monthly_limit,
      },
    ]),
  );

  return {
    current: {
      plan: {
        code: plan.code,
        display_name: plan.display_name,
        visible: plan.visible,
        version: plan.version,
        metadata: plan.metadata || {},
      },
      cycle: {
        start: cycleStart,
        end: cycleEnd,
        source: 'fallback',
      },
      features,
      buckets: currentBuckets,
      pricing: plan.pricing || {},
    },
    usage: {
      plan: {
        code: plan.code,
        display_name: plan.display_name,
        visible: plan.visible,
        version: plan.version,
        metadata: plan.metadata || {},
      },
      cycle: {
        start: cycleStart,
        end: cycleEnd,
        source: 'fallback',
      },
      features,
      pricing: plan.pricing || {},
      buckets: usageBuckets,
    },
    catalog,
    generated_at: new Date().toISOString(),
    degraded: true,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [subscriptionResult, betaAccessResult, plansResult, bucketsResult, featuresResult] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('tier, status, current_period_start, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('beta_access')
        .select('premium_override, unlimited_ai, expires_at, revoked_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('billing_plan_catalog')
        .select('plan_code, display_name, description, visible, sort_order, version, visible_pricing, metadata')
        .eq('status', 'active')
        .order('sort_order', { ascending: true }),
      supabase
        .from('billing_plan_buckets')
        .select('plan_code, bucket_key, display_name, monthly_limit, sort_order, metadata')
        .order('sort_order', { ascending: true }),
      supabase
        .from('billing_plan_features')
        .select('plan_code, feature_key, enabled, metadata'),
    ]);

    if (subscriptionResult.error) {
      console.warn('billing-summary subscription lookup failed:', subscriptionResult.error);
    }
    if (betaAccessResult.error && betaAccessResult.error.code !== 'PGRST116') {
      console.warn('billing-summary beta_access lookup failed:', betaAccessResult.error);
    }

    let catalog = DEFAULT_PLAN_CATALOG;
    const catalogError = plansResult.error || bucketsResult.error || featuresResult.error;
    if (!catalogError && plansResult.data && bucketsResult.data && featuresResult.data) {
      catalog = groupCatalog(
        (plansResult.data || []) as PlanRow[],
        (bucketsResult.data || []) as BucketRow[],
        (featuresResult.data || []) as FeatureRow[],
      );
    } else if (catalogError) {
      console.warn('billing-summary catalog lookup degraded to defaults:', catalogError);
    }

    const entitlementsResult = await supabase.rpc('billing_get_effective_entitlements', { p_user_id: user.id });
    const usageResult = await supabase.rpc('billing_get_usage_summary', { p_user_id: user.id });

    const entitlementsError = entitlementsResult.error;
    const usageError = usageResult.error;

    if (entitlementsError || usageError) {
      const message = `${entitlementsError?.message || ''} ${usageError?.message || ''}`.trim();
      console.warn('billing-summary RPC degraded to fallback:', {
        entitlementsError,
        usageError,
      });

      if (!message || isSchemaMissingError(message)) {
        const fallbackPayload = buildFallbackSummary(
          catalog,
          (subscriptionResult.data || null) as SubscriptionRow | null,
          (betaAccessResult.data || null) as BetaAccessRow | null,
        );

        return new Response(JSON.stringify(fallbackPayload), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (entitlementsError) throw entitlementsError;
      if (usageError) throw usageError;
    }

    const payload = {
      current: entitlementsResult.data || {},
      usage: usageResult.data || {},
      catalog,
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown billing summary error';
    console.error('billing-summary error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
