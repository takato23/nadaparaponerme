import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export const BILLING_SUMMARY_CACHE_KEY = 'ojodeloca-billing-summary-cache';

export type BillingCurrency = 'ARS' | 'USD';
export type BillingBucketKey = 'kumbi_messages' | 'shopping_grounded_searches' | 'tryons' | string;
export type BillingFeatureKey = 'kumbi_chat' | 'shopping_real' | 'try_on' | 'priority_support' | string;
export type BillingPlanCode = 'free' | 'plus' | 'pro' | 'premium' | string;

export interface BillingCatalogBucket {
  key: BillingBucketKey;
  display_name: string;
  monthly_limit: number;
  metadata: Record<string, unknown>;
}

export interface BillingCatalogFeature {
  key: BillingFeatureKey;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

export interface BillingCatalogPlan {
  code: BillingPlanCode;
  display_name: string;
  description: string | null;
  visible: boolean;
  version: number;
  pricing: Record<string, any>;
  metadata: Record<string, unknown>;
  buckets: BillingCatalogBucket[];
  features: BillingCatalogFeature[];
}

export interface BillingUsageBucket {
  display_name: string;
  monthly_limit: number;
  metadata?: Record<string, unknown>;
  overridden?: boolean;
  unlimited?: boolean;
  used: number;
  reserved: number;
  remaining: number;
}

export interface BillingSummaryPayload {
  current: {
    plan?: {
      code: BillingPlanCode;
      display_name: string;
      visible: boolean;
      version: number;
      metadata?: Record<string, unknown>;
    };
    cycle?: {
      start: string;
      end: string;
      source: string;
    };
    features?: Record<string, { enabled: boolean; metadata?: Record<string, unknown> }>;
    buckets?: Record<string, { display_name: string; monthly_limit: number; metadata?: Record<string, unknown> }>;
    pricing?: Record<string, any>;
  };
  usage: {
    plan?: {
      code: BillingPlanCode;
      display_name: string;
      visible: boolean;
      version: number;
      metadata?: Record<string, unknown>;
    };
    cycle?: {
      id?: string;
      start: string;
      end: string;
      source: string;
    };
    features?: Record<string, { enabled: boolean; metadata?: Record<string, unknown> }>;
    pricing?: Record<string, any>;
    buckets?: Record<string, BillingUsageBucket>;
  };
  catalog: BillingCatalogPlan[];
  generated_at: string;
}

const LOCAL_DEV_PLAN_CATALOG: BillingCatalogPlan[] = [
  {
    code: 'free',
    display_name: 'Free',
    description: 'Cargá tu armario y empezá a usar Kumbi gratis',
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
    description: 'Desbloqueá shopping real para completar tus looks',
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
];

export function buildLocalDevBillingSummary(now: Date = new Date()): BillingSummaryPayload {
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const currentPlan = LOCAL_DEV_PLAN_CATALOG[0];
  const usageBuckets = Object.fromEntries(
    currentPlan.buckets.map((bucket) => [
      bucket.key,
      {
        display_name: bucket.display_name,
        monthly_limit: bucket.monthly_limit,
        metadata: bucket.metadata,
        used: 0,
        reserved: 0,
        remaining: bucket.monthly_limit,
      } satisfies BillingUsageBucket,
    ]),
  );
  const currentFeatures = Object.fromEntries(
    currentPlan.features.map((feature) => [
      feature.key,
      {
        enabled: feature.enabled,
        metadata: feature.metadata,
      },
    ]),
  );
  const currentBuckets = Object.fromEntries(
    currentPlan.buckets.map((bucket) => [
      bucket.key,
      {
        display_name: bucket.display_name,
        monthly_limit: bucket.monthly_limit,
        metadata: bucket.metadata,
      },
    ]),
  );

  return {
    current: {
      plan: {
        code: currentPlan.code,
        display_name: currentPlan.display_name,
        visible: currentPlan.visible,
        version: currentPlan.version,
        metadata: currentPlan.metadata,
      },
      cycle: {
        start: cycleStart.toISOString(),
        end: cycleEnd.toISOString(),
        source: 'local-dev',
      },
      features: currentFeatures,
      buckets: currentBuckets,
      pricing: currentPlan.pricing,
    },
    usage: {
      plan: {
        code: currentPlan.code,
        display_name: currentPlan.display_name,
        visible: currentPlan.visible,
        version: currentPlan.version,
        metadata: currentPlan.metadata,
      },
      cycle: {
        start: cycleStart.toISOString(),
        end: cycleEnd.toISOString(),
        source: 'local-dev',
      },
      features: currentFeatures,
      pricing: currentPlan.pricing,
      buckets: usageBuckets,
    },
    catalog: LOCAL_DEV_PLAN_CATALOG,
    generated_at: now.toISOString(),
  };
}

export function persistBillingSummaryCache(summary: BillingSummaryPayload | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (!summary) {
      window.localStorage.removeItem(BILLING_SUMMARY_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(BILLING_SUMMARY_CACHE_KEY, JSON.stringify(summary));
  } catch (error) {
    logger.warn('billing-summary cache write failed:', error);
  }
}

export function readBillingSummaryCache(): BillingSummaryPayload | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(BILLING_SUMMARY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BillingSummaryPayload;
  } catch (error) {
    logger.warn('billing-summary cache read failed:', error);
    return null;
  }
}

const isLocalDevBillingFallback = () => typeof window !== 'undefined' && import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

const BILLING_SUMMARY_RETRY_COOLDOWN_MS = 30_000;
let billingSummaryBlockedUntil = 0;
let lastBillingSummaryError: Error | null = null;

export async function fetchBillingSummary(): Promise<BillingSummaryPayload> {
  const now = Date.now();
  const cachedSummary = readBillingSummaryCache();

  if (isLocalDevBillingFallback()) {
    if (cachedSummary) return cachedSummary;
    const localSummary = buildLocalDevBillingSummary();
    persistBillingSummaryCache(localSummary);
    return localSummary;
  }

  if (billingSummaryBlockedUntil > now && lastBillingSummaryError) {
    if (cachedSummary) return cachedSummary;
    throw lastBillingSummaryError;
  }

  const { data, error } = await supabase.functions.invoke('billing-summary', {
    body: {},
  });

  if (error) {
    billingSummaryBlockedUntil = now + BILLING_SUMMARY_RETRY_COOLDOWN_MS;
    lastBillingSummaryError = error instanceof Error ? error : new Error('billing-summary invoke failed');
    if (cachedSummary) {
      logger.warn('billing-summary unavailable, using cached summary:', error);
      return cachedSummary;
    }
    logger.error('billing-summary invoke failed:', error);
    throw lastBillingSummaryError;
  }

  const payload = data as BillingSummaryPayload;
  billingSummaryBlockedUntil = 0;
  lastBillingSummaryError = null;
  persistBillingSummaryCache(payload);
  return payload;
}

export function getPlanPriceLabel(plan: BillingCatalogPlan, currency: BillingCurrency): string {
  const pricing = plan.pricing?.[currency] || plan.pricing?.ARS || null;
  if (!pricing) return plan.code === 'free' ? 'Gratis' : '-';
  if (typeof pricing.display === 'string' && pricing.display.trim()) return pricing.display;

  const minor = Number(pricing.monthly_minor || 0);
  if (minor <= 0) return currency === 'ARS' ? 'Gratis' : 'Free';

  if (currency === 'USD') {
    return `US$ ${(minor / 100).toFixed(2)}`;
  }

  return `AR$ ${minor.toLocaleString('es-AR')}`;
}

export function getBucketSummary(summary: BillingSummaryPayload | null | undefined, bucketKey: BillingBucketKey): BillingUsageBucket | null {
  return (summary?.usage?.buckets?.[bucketKey] as BillingUsageBucket | undefined) || null;
}

export function isFeatureEnabled(summary: BillingSummaryPayload | null | undefined, featureKey: BillingFeatureKey): boolean {
  return Boolean(summary?.current?.features?.[featureKey]?.enabled);
}

const BUCKET_LABELS: Record<string, string> = {
  kumbi_messages: 'mensajes de Kumbi',
  shopping_grounded_searches: 'shopping real con links',
  tryons: 'try-ons',
};

const ANALYSIS_LIMITS_BY_PLAN: Partial<Record<BillingPlanCode, number>> = {
  free: 50,
  plus: 150,
  pro: 400,
  premium: 500,
};

export function buildPlanFeatureBullets(plan: BillingCatalogPlan): string[] {
  const bullets: string[] = [];
  const analysisLimit = ANALYSIS_LIMITS_BY_PLAN[plan.code];

  if (typeof analysisLimit === 'number' && analysisLimit > 0) {
    bullets.push(`${analysisLimit} análisis de prendas por mes`);
  }

  for (const bucket of plan.buckets) {
    const label = BUCKET_LABELS[bucket.key] || bucket.display_name || bucket.key;
    if (bucket.monthly_limit < 0) {
      bullets.push(`${label} ilimitados`);
    } else if (bucket.monthly_limit === 0) {
      bullets.push(`${label}: no incluido`);
    } else {
      const singular = bucket.monthly_limit === 1;
      const formattedLabel = singular && label === 'try-ons' ? 'try-on' : label;
      bullets.push(`${bucket.monthly_limit} ${formattedLabel}`);
    }
  }

  const enabledFeatures = plan.features.filter((feature) => feature.enabled).map((feature) => feature.key);
  if (enabledFeatures.includes('shopping_real') && !bullets.some((item) => item.includes('shopping real'))) {
    bullets.push('Shopping real con links y precios');
  }
  if (enabledFeatures.includes('try_on') && !bullets.some((item) => item.includes('try-ons'))) {
    bullets.push('Try-on premium');
  }
  if (enabledFeatures.includes('priority_support')) {
    bullets.push('Soporte prioritario');
  }

  return bullets;
}

export function getBucketLimit(plan: BillingCatalogPlan, bucketKey: BillingBucketKey): number {
  return plan.buckets.find((bucket) => bucket.key === bucketKey)?.monthly_limit ?? 0;
}
