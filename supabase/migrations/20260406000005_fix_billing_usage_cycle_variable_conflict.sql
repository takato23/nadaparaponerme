-- Fix runtime ambiguity between RETURNS TABLE output params and billing_usage_cycles columns.
-- This was breaking billing_get_effective_entitlements / billing_reserve_usage with:
--   42702: column reference "cycle_start" is ambiguous

CREATE OR REPLACE FUNCTION public.billing_ensure_usage_cycle(
  p_user_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  cycle_id UUID,
  plan_code TEXT,
  cycle_start TIMESTAMPTZ,
  cycle_end TIMESTAMPTZ,
  source TEXT,
  features JSONB,
  buckets JSONB,
  pricing JSONB,
  plan_display_name TEXT,
  plan_visible BOOLEAN,
  plan_version INTEGER,
  plan_metadata JSONB
) AS $$
#variable_conflict use_column
DECLARE
  v_context RECORD;
  v_features JSONB;
  v_buckets JSONB;
  v_existing RECORD;
BEGIN
  SELECT *
  INTO v_context
  FROM public.billing_resolve_context(p_user_id, p_now);

  v_features := public.billing_build_features_json(v_context.plan_code, v_context.feature_overrides);
  v_buckets := public.billing_build_buckets_json(v_context.plan_code, v_context.bucket_overrides, v_context.unlimited_buckets);

  INSERT INTO public.billing_usage_cycles (
    user_id,
    cycle_start,
    cycle_end,
    plan_code,
    entitlements_snapshot,
    pricing_snapshot,
    source,
    metadata
  ) VALUES (
    p_user_id,
    v_context.cycle_start,
    v_context.cycle_end,
    v_context.plan_code,
    jsonb_build_object(
      'features', v_features,
      'buckets', v_buckets,
      'plan_display_name', v_context.plan_display_name,
      'plan_visible', v_context.plan_visible,
      'plan_version', v_context.plan_version,
      'plan_metadata', v_context.plan_metadata
    ),
    COALESCE(v_context.pricing, '{}'::jsonb),
    v_context.source,
    '{}'::jsonb
  )
  ON CONFLICT (user_id, cycle_start, cycle_end)
  DO UPDATE
  SET
    plan_code = EXCLUDED.plan_code,
    entitlements_snapshot = EXCLUDED.entitlements_snapshot,
    pricing_snapshot = EXCLUDED.pricing_snapshot,
    source = EXCLUDED.source,
    updated_at = NOW()
  RETURNING
    billing_usage_cycles.id,
    billing_usage_cycles.plan_code,
    billing_usage_cycles.cycle_start,
    billing_usage_cycles.cycle_end,
    billing_usage_cycles.source,
    billing_usage_cycles.entitlements_snapshot,
    billing_usage_cycles.pricing_snapshot
  INTO v_existing;

  RETURN QUERY
  SELECT
    v_existing.id,
    v_existing.plan_code,
    v_existing.cycle_start,
    v_existing.cycle_end,
    v_existing.source,
    COALESCE(v_existing.entitlements_snapshot -> 'features', '{}'::jsonb),
    COALESCE(v_existing.entitlements_snapshot -> 'buckets', '{}'::jsonb),
    COALESCE(v_existing.pricing_snapshot, '{}'::jsonb),
    COALESCE(v_existing.entitlements_snapshot ->> 'plan_display_name', v_context.plan_display_name),
    COALESCE((v_existing.entitlements_snapshot ->> 'plan_visible')::BOOLEAN, v_context.plan_visible),
    COALESCE((v_existing.entitlements_snapshot ->> 'plan_version')::INTEGER, v_context.plan_version),
    COALESCE(v_existing.entitlements_snapshot -> 'plan_metadata', '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
