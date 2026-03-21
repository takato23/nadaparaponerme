-- Unified billing catalog, entitlements, and bucketed monthly usage.
-- This layer coexists with legacy subscription counters but becomes the new source of truth.

-- ============================================================================
-- BILLING CATALOG TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_plan_catalog (
  plan_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  visible_pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_plan_buckets (
  plan_code TEXT NOT NULL REFERENCES public.billing_plan_catalog(plan_code) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL,
  display_name TEXT,
  monthly_limit INTEGER NOT NULL CHECK (monthly_limit >= -1),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_code, bucket_key)
);

CREATE TABLE IF NOT EXISTS public.billing_plan_features (
  plan_code TEXT NOT NULL REFERENCES public.billing_plan_catalog(plan_code) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_code, feature_key)
);

CREATE TABLE IF NOT EXISTS public.billing_user_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_plan_code TEXT REFERENCES public.billing_plan_catalog(plan_code) ON DELETE SET NULL,
  feature_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  bucket_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlimited_buckets TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_usage_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  plan_code TEXT NOT NULL REFERENCES public.billing_plan_catalog(plan_code),
  entitlements_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'subscription',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, cycle_start, cycle_end)
);

CREATE TABLE IF NOT EXISTS public.billing_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.billing_usage_cycles(id) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'committed', 'released')) DEFAULT 'reserved',
  reservation_key TEXT NOT NULL,
  idempotency_key TEXT,
  request_source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_usage_events_idempotency
  ON public.billing_usage_events (user_id, cycle_id, bucket_key, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_plan_catalog_visible
  ON public.billing_plan_catalog (visible, sort_order)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_billing_plan_buckets_plan
  ON public.billing_plan_buckets (plan_code, sort_order);

CREATE INDEX IF NOT EXISTS idx_billing_plan_features_plan
  ON public.billing_plan_features (plan_code, feature_key);

CREATE INDEX IF NOT EXISTS idx_billing_user_overrides_active
  ON public.billing_user_overrides (user_id, starts_at DESC, expires_at, revoked_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_billing_usage_cycles_current
  ON public.billing_usage_cycles (user_id, cycle_start DESC, cycle_end DESC);

CREATE INDEX IF NOT EXISTS idx_billing_usage_events_cycle_bucket
  ON public.billing_usage_events (cycle_id, bucket_key, status);

CREATE INDEX IF NOT EXISTS idx_billing_usage_events_expires_at
  ON public.billing_usage_events (expires_at)
  WHERE status = 'reserved' AND expires_at IS NOT NULL;

ALTER TABLE public.billing_plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catalog readable by everyone" ON public.billing_plan_catalog;
CREATE POLICY "Catalog readable by everyone"
  ON public.billing_plan_catalog
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Plan buckets readable by everyone" ON public.billing_plan_buckets;
CREATE POLICY "Plan buckets readable by everyone"
  ON public.billing_plan_buckets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Plan features readable by everyone" ON public.billing_plan_features;
CREATE POLICY "Plan features readable by everyone"
  ON public.billing_plan_features
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role manages plan catalog" ON public.billing_plan_catalog;
CREATE POLICY "Service role manages plan catalog"
  ON public.billing_plan_catalog
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP POLICY IF EXISTS "Service role manages plan buckets" ON public.billing_plan_buckets;
CREATE POLICY "Service role manages plan buckets"
  ON public.billing_plan_buckets
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP POLICY IF EXISTS "Service role manages plan features" ON public.billing_plan_features;
CREATE POLICY "Service role manages plan features"
  ON public.billing_plan_features
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP POLICY IF EXISTS "Users can view own billing overrides" ON public.billing_user_overrides;
CREATE POLICY "Users can view own billing overrides"
  ON public.billing_user_overrides
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages billing overrides" ON public.billing_user_overrides;
CREATE POLICY "Service role manages billing overrides"
  ON public.billing_user_overrides
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP POLICY IF EXISTS "Users can view own billing cycles" ON public.billing_usage_cycles;
CREATE POLICY "Users can view own billing cycles"
  ON public.billing_usage_cycles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages billing cycles" ON public.billing_usage_cycles;
CREATE POLICY "Service role manages billing cycles"
  ON public.billing_usage_cycles
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP POLICY IF EXISTS "Users can view own billing usage events" ON public.billing_usage_events;
CREATE POLICY "Users can view own billing usage events"
  ON public.billing_usage_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages billing usage events" ON public.billing_usage_events;
CREATE POLICY "Service role manages billing usage events"
  ON public.billing_usage_events
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP TRIGGER IF EXISTS trigger_billing_plan_catalog_updated_at ON public.billing_plan_catalog;
CREATE TRIGGER trigger_billing_plan_catalog_updated_at
  BEFORE UPDATE ON public.billing_plan_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_billing_plan_buckets_updated_at ON public.billing_plan_buckets;
CREATE TRIGGER trigger_billing_plan_buckets_updated_at
  BEFORE UPDATE ON public.billing_plan_buckets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_billing_plan_features_updated_at ON public.billing_plan_features;
CREATE TRIGGER trigger_billing_plan_features_updated_at
  BEFORE UPDATE ON public.billing_plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_billing_user_overrides_updated_at ON public.billing_user_overrides;
CREATE TRIGGER trigger_billing_user_overrides_updated_at
  BEFORE UPDATE ON public.billing_user_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_billing_usage_cycles_updated_at ON public.billing_usage_cycles;
CREATE TRIGGER trigger_billing_usage_cycles_updated_at
  BEFORE UPDATE ON public.billing_usage_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_billing_usage_events_updated_at ON public.billing_usage_events;
CREATE TRIGGER trigger_billing_usage_events_updated_at
  BEFORE UPDATE ON public.billing_usage_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- INITIAL CATALOG SEED
-- ============================================================================

INSERT INTO public.billing_plan_catalog (
  plan_code,
  display_name,
  description,
  status,
  visible,
  sort_order,
  version,
  visible_pricing,
  metadata
)
VALUES
  (
    'free',
    'Free',
    'Acceso base a Kumbi',
    'active',
    TRUE,
    10,
    1,
    jsonb_build_object(
      'ARS', jsonb_build_object('monthly_minor', 0, 'currency', 'ARS', 'display', 'Gratis'),
      'USD', jsonb_build_object('monthly_minor', 0, 'currency', 'USD', 'display', 'Free')
    ),
    jsonb_build_object('recommended', false)
  ),
  (
    'plus',
    'Plus',
    'Más mensajes de Kumbi y shopping real limitado',
    'active',
    TRUE,
    20,
    1,
    jsonb_build_object(
      'ARS', jsonb_build_object('monthly_minor', 7990, 'currency', 'ARS', 'display', 'AR$ 7.990/mes'),
      'USD', jsonb_build_object('monthly_minor', 799, 'currency', 'USD', 'display', 'US$ 7.99/month')
    ),
    jsonb_build_object('recommended', true)
  ),
  (
    'pro',
    'Pro',
    'Uso intensivo de Kumbi, shopping real y más try-ons',
    'active',
    TRUE,
    30,
    1,
    jsonb_build_object(
      'ARS', jsonb_build_object('monthly_minor', 10990, 'currency', 'ARS', 'display', 'AR$ 10.990/mes'),
      'USD', jsonb_build_object('monthly_minor', 1099, 'currency', 'USD', 'display', 'US$ 10.99/month')
    ),
    jsonb_build_object('recommended', false)
  ),
  (
    'premium',
    'Premium',
    'Plan legado para compatibilidad',
    'active',
    FALSE,
    40,
    1,
    jsonb_build_object(
      'ARS', jsonb_build_object('monthly_minor', 14990, 'currency', 'ARS', 'display', 'AR$ 14.990/mes'),
      'USD', jsonb_build_object('monthly_minor', 1499, 'currency', 'USD', 'display', 'US$ 14.99/month')
    ),
    jsonb_build_object('legacy', true)
  )
ON CONFLICT (plan_code) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  visible = EXCLUDED.visible,
  sort_order = EXCLUDED.sort_order,
  version = EXCLUDED.version,
  visible_pricing = EXCLUDED.visible_pricing,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

DELETE FROM public.billing_plan_buckets
WHERE plan_code IN ('free', 'plus', 'pro', 'premium');

INSERT INTO public.billing_plan_buckets (plan_code, bucket_key, display_name, monthly_limit, sort_order, metadata)
VALUES
  ('free', 'kumbi_messages', 'Mensajes de Kumbi', 150, 10, jsonb_build_object('unit', 'messages')),
  ('free', 'shopping_grounded_searches', 'Shopping real', 0, 20, jsonb_build_object('unit', 'searches')),
  ('free', 'tryons', 'Try-ons', 1, 30, jsonb_build_object('unit', 'images')),
  ('plus', 'kumbi_messages', 'Mensajes de Kumbi', 1000, 10, jsonb_build_object('unit', 'messages')),
  ('plus', 'shopping_grounded_searches', 'Shopping real', 10, 20, jsonb_build_object('unit', 'searches')),
  ('plus', 'tryons', 'Try-ons', 5, 30, jsonb_build_object('unit', 'images')),
  ('pro', 'kumbi_messages', 'Mensajes de Kumbi', 2500, 10, jsonb_build_object('unit', 'messages')),
  ('pro', 'shopping_grounded_searches', 'Shopping real', 25, 20, jsonb_build_object('unit', 'searches')),
  ('pro', 'tryons', 'Try-ons', 10, 30, jsonb_build_object('unit', 'images')),
  ('premium', 'kumbi_messages', 'Mensajes de Kumbi', 5000, 10, jsonb_build_object('unit', 'messages', 'legacy', true)),
  ('premium', 'shopping_grounded_searches', 'Shopping real', 50, 20, jsonb_build_object('unit', 'searches', 'legacy', true)),
  ('premium', 'tryons', 'Try-ons', 20, 30, jsonb_build_object('unit', 'images', 'legacy', true));

DELETE FROM public.billing_plan_features
WHERE plan_code IN ('free', 'plus', 'pro', 'premium');

INSERT INTO public.billing_plan_features (plan_code, feature_key, enabled, metadata)
VALUES
  ('free', 'kumbi_chat', TRUE, '{}'::jsonb),
  ('free', 'shopping_real', FALSE, '{}'::jsonb),
  ('free', 'try_on', TRUE, '{}'::jsonb),
  ('free', 'priority_support', FALSE, '{}'::jsonb),
  ('plus', 'kumbi_chat', TRUE, '{}'::jsonb),
  ('plus', 'shopping_real', TRUE, '{}'::jsonb),
  ('plus', 'try_on', TRUE, '{}'::jsonb),
  ('plus', 'priority_support', FALSE, '{}'::jsonb),
  ('pro', 'kumbi_chat', TRUE, '{}'::jsonb),
  ('pro', 'shopping_real', TRUE, '{}'::jsonb),
  ('pro', 'try_on', TRUE, '{}'::jsonb),
  ('pro', 'priority_support', TRUE, '{}'::jsonb),
  ('premium', 'kumbi_chat', TRUE, jsonb_build_object('legacy', true)),
  ('premium', 'shopping_real', TRUE, jsonb_build_object('legacy', true)),
  ('premium', 'try_on', TRUE, jsonb_build_object('legacy', true)),
  ('premium', 'priority_support', TRUE, jsonb_build_object('legacy', true));

-- ============================================================================
-- INTERNAL HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.billing_release_expired_reservations(
  p_cycle_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_released INTEGER := 0;
BEGIN
  UPDATE public.billing_usage_events
  SET
    status = 'released',
    released_at = NOW(),
    updated_at = NOW()
  WHERE cycle_id = p_cycle_id
    AND status = 'reserved'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_build_features_json(
  p_plan_code TEXT,
  p_feature_overrides JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_features JSONB := '{}'::jsonb;
  v_key TEXT;
  v_value JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_object_agg(
      f.feature_key,
      jsonb_build_object(
        'enabled', f.enabled,
        'metadata', COALESCE(f.metadata, '{}'::jsonb)
      )
    ),
    '{}'::jsonb
  )
  INTO v_features
  FROM public.billing_plan_features f
  WHERE f.plan_code = p_plan_code;

  IF p_feature_overrides IS NULL OR p_feature_overrides = '{}'::jsonb THEN
    RETURN v_features;
  END IF;

  FOR v_key, v_value IN
    SELECT key, value
    FROM jsonb_each(p_feature_overrides)
  LOOP
    IF jsonb_typeof(v_value) = 'boolean' THEN
      v_features := jsonb_set(
        v_features,
        ARRAY[v_key],
        jsonb_build_object('enabled', (v_value #>> '{}')::boolean, 'metadata', '{}'::jsonb),
        TRUE
      );
    ELSIF jsonb_typeof(v_value) = 'object' THEN
      v_features := jsonb_set(
        v_features,
        ARRAY[v_key],
        COALESCE(v_features -> v_key, '{}'::jsonb) || v_value,
        TRUE
      );
    END IF;
  END LOOP;

  RETURN v_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_build_buckets_json(
  p_plan_code TEXT,
  p_bucket_overrides JSONB DEFAULT '{}'::jsonb,
  p_unlimited_buckets TEXT[] DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_buckets JSONB := '{}'::jsonb;
  v_key TEXT;
  v_value JSONB;
  v_unlimited TEXT;
BEGIN
  SELECT COALESCE(
    jsonb_object_agg(
      b.bucket_key,
      jsonb_build_object(
        'display_name', COALESCE(b.display_name, b.bucket_key),
        'monthly_limit', b.monthly_limit,
        'metadata', COALESCE(b.metadata, '{}'::jsonb),
        'overridden', false
      )
    ),
    '{}'::jsonb
  )
  INTO v_buckets
  FROM public.billing_plan_buckets b
  WHERE b.plan_code = p_plan_code;

  IF p_bucket_overrides IS NOT NULL AND p_bucket_overrides <> '{}'::jsonb THEN
    FOR v_key, v_value IN
      SELECT key, value
      FROM jsonb_each(p_bucket_overrides)
    LOOP
      IF jsonb_typeof(v_value) = 'number' THEN
        v_buckets := jsonb_set(
          v_buckets,
          ARRAY[v_key],
          COALESCE(v_buckets -> v_key, '{}'::jsonb) || jsonb_build_object(
            'monthly_limit', (v_value #>> '{}')::INTEGER,
            'overridden', true
          ),
          TRUE
        );
      ELSIF jsonb_typeof(v_value) = 'object' THEN
        v_buckets := jsonb_set(
          v_buckets,
          ARRAY[v_key],
          COALESCE(v_buckets -> v_key, '{}'::jsonb) || v_value || jsonb_build_object('overridden', true),
          TRUE
        );
      END IF;
    END LOOP;
  END IF;

  FOREACH v_unlimited IN ARRAY COALESCE(p_unlimited_buckets, '{}')
  LOOP
    v_buckets := jsonb_set(
      v_buckets,
      ARRAY[v_unlimited],
      COALESCE(v_buckets -> v_unlimited, '{}'::jsonb) || jsonb_build_object(
        'monthly_limit', -1,
        'overridden', true,
        'unlimited', true
      ),
      TRUE
    );
  END LOOP;

  RETURN v_buckets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_resolve_context(
  p_user_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  plan_code TEXT,
  cycle_start TIMESTAMPTZ,
  cycle_end TIMESTAMPTZ,
  source TEXT,
  feature_overrides JSONB,
  bucket_overrides JSONB,
  unlimited_buckets TEXT[],
  pricing JSONB,
  plan_display_name TEXT,
  plan_visible BOOLEAN,
  plan_version INTEGER,
  plan_metadata JSONB
) AS $$
DECLARE
  v_subscription RECORD;
  v_override RECORD;
  v_beta RECORD;
  v_plan_code TEXT;
  v_source TEXT := 'free_default';
  v_cycle_start TIMESTAMPTZ;
  v_cycle_end TIMESTAMPTZ;
  v_feature_overrides JSONB := '{}'::jsonb;
  v_bucket_overrides JSONB := '{}'::jsonb;
  v_unlimited_buckets TEXT[] := '{}';
  v_plan RECORD;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT s.tier, s.status, s.current_period_start, s.current_period_end
  INTO v_subscription
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.updated_at DESC
  LIMIT 1;

  SELECT o.*
  INTO v_override
  FROM public.billing_user_overrides o
  WHERE o.user_id = p_user_id
    AND o.revoked_at IS NULL
    AND o.starts_at <= p_now
    AND (o.expires_at IS NULL OR o.expires_at > p_now)
  ORDER BY o.starts_at DESC, o.created_at DESC
  LIMIT 1;

  SELECT b.premium_override, b.unlimited_ai
  INTO v_beta
  FROM public.beta_access b
  WHERE b.user_id = p_user_id
    AND b.revoked_at IS NULL
    AND (b.expires_at IS NULL OR b.expires_at > p_now)
  LIMIT 1;

  v_plan_code := COALESCE(v_override.override_plan_code, v_subscription.tier, 'free');

  IF v_override.id IS NOT NULL THEN
    v_source := 'billing_override';
    v_feature_overrides := COALESCE(v_override.feature_overrides, '{}'::jsonb);
    v_bucket_overrides := COALESCE(v_override.bucket_overrides, '{}'::jsonb);
    v_unlimited_buckets := COALESCE(v_override.unlimited_buckets, '{}');
  ELSIF COALESCE(v_beta.premium_override, FALSE) THEN
    v_plan_code := 'premium';
    v_source := 'beta_access';
  ELSIF v_subscription.tier IS NOT NULL THEN
    v_source := 'subscription';
  END IF;

  IF COALESCE(v_beta.unlimited_ai, FALSE) THEN
    v_unlimited_buckets := ARRAY['kumbi_messages', 'shopping_grounded_searches', 'tryons'];
  END IF;

  IF v_subscription.current_period_start IS NOT NULL AND v_subscription.current_period_end IS NOT NULL THEN
    v_cycle_start := v_subscription.current_period_start;
    v_cycle_end := v_subscription.current_period_end;
  ELSE
    v_cycle_start := date_trunc('month', timezone('utc', p_now));
    v_cycle_end := date_trunc('month', timezone('utc', p_now)) + INTERVAL '1 month';
  END IF;

  SELECT
    c.plan_code,
    c.display_name,
    c.visible,
    c.version,
    c.visible_pricing,
    c.metadata
  INTO v_plan
  FROM public.billing_plan_catalog c
  WHERE c.plan_code = v_plan_code
    AND c.status = 'active'
  LIMIT 1;

  IF v_plan.plan_code IS NULL THEN
    SELECT
      c.plan_code,
      c.display_name,
      c.visible,
      c.version,
      c.visible_pricing,
      c.metadata
    INTO v_plan
    FROM public.billing_plan_catalog c
    WHERE c.plan_code = 'free'
      AND c.status = 'active'
    LIMIT 1;
    v_plan_code := 'free';
  END IF;

  RETURN QUERY
  SELECT
    v_plan_code,
    v_cycle_start,
    v_cycle_end,
    v_source,
    COALESCE(v_feature_overrides, '{}'::jsonb),
    COALESCE(v_bucket_overrides, '{}'::jsonb),
    COALESCE(v_unlimited_buckets, '{}'),
    COALESCE(v_plan.visible_pricing, '{}'::jsonb),
    COALESCE(v_plan.display_name, v_plan_code),
    COALESCE(v_plan.visible, FALSE),
    COALESCE(v_plan.version, 1),
    COALESCE(v_plan.metadata, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    id,
    public.billing_usage_cycles.plan_code,
    public.billing_usage_cycles.cycle_start,
    public.billing_usage_cycles.cycle_end,
    public.billing_usage_cycles.source,
    public.billing_usage_cycles.entitlements_snapshot,
    public.billing_usage_cycles.pricing_snapshot
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

-- ============================================================================
-- PUBLIC RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.billing_get_effective_entitlements(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_cycle RECORD;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT *
  INTO v_cycle
  FROM public.billing_ensure_usage_cycle(p_user_id, NOW());

  RETURN jsonb_build_object(
    'plan', jsonb_build_object(
      'code', v_cycle.plan_code,
      'display_name', v_cycle.plan_display_name,
      'visible', v_cycle.plan_visible,
      'version', v_cycle.plan_version,
      'metadata', COALESCE(v_cycle.plan_metadata, '{}'::jsonb)
    ),
    'cycle', jsonb_build_object(
      'start', v_cycle.cycle_start,
      'end', v_cycle.cycle_end,
      'source', v_cycle.source
    ),
    'features', COALESCE(v_cycle.features, '{}'::jsonb),
    'buckets', COALESCE(v_cycle.buckets, '{}'::jsonb),
    'pricing', COALESCE(v_cycle.pricing, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_get_usage_summary(
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_cycle RECORD;
  v_bucket RECORD;
  v_committed INTEGER;
  v_reserved INTEGER;
  v_monthly_limit INTEGER;
  v_remaining INTEGER;
  v_buckets JSONB := '{}'::jsonb;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT *
  INTO v_cycle
  FROM public.billing_ensure_usage_cycle(p_user_id, NOW());

  PERFORM public.billing_release_expired_reservations(v_cycle.cycle_id);

  FOR v_bucket IN
    SELECT key AS bucket_key, value AS bucket_value
    FROM jsonb_each(COALESCE(v_cycle.buckets, '{}'::jsonb))
  LOOP
    SELECT COALESCE(SUM(e.amount), 0)
    INTO v_committed
    FROM public.billing_usage_events e
    WHERE e.cycle_id = v_cycle.cycle_id
      AND e.bucket_key = v_bucket.bucket_key
      AND e.status = 'committed';

    SELECT COALESCE(SUM(e.amount), 0)
    INTO v_reserved
    FROM public.billing_usage_events e
    WHERE e.cycle_id = v_cycle.cycle_id
      AND e.bucket_key = v_bucket.bucket_key
      AND e.status = 'reserved'
      AND (e.expires_at IS NULL OR e.expires_at > NOW());

    v_monthly_limit := COALESCE((v_bucket.bucket_value ->> 'monthly_limit')::INTEGER, 0);
    v_remaining := CASE
      WHEN v_monthly_limit < 0 THEN -1
      ELSE GREATEST(v_monthly_limit - v_committed - v_reserved, 0)
    END;

    v_buckets := jsonb_set(
      v_buckets,
      ARRAY[v_bucket.bucket_key],
      COALESCE(v_bucket.bucket_value, '{}'::jsonb) || jsonb_build_object(
        'used', v_committed,
        'reserved', v_reserved,
        'remaining', v_remaining
      ),
      TRUE
    );
  END LOOP;

  RETURN jsonb_build_object(
    'plan', jsonb_build_object(
      'code', v_cycle.plan_code,
      'display_name', v_cycle.plan_display_name,
      'visible', v_cycle.plan_visible,
      'version', v_cycle.plan_version,
      'metadata', COALESCE(v_cycle.plan_metadata, '{}'::jsonb)
    ),
    'cycle', jsonb_build_object(
      'id', v_cycle.cycle_id,
      'start', v_cycle.cycle_start,
      'end', v_cycle.cycle_end,
      'source', v_cycle.source
    ),
    'features', COALESCE(v_cycle.features, '{}'::jsonb),
    'pricing', COALESCE(v_cycle.pricing, '{}'::jsonb),
    'buckets', COALESCE(v_buckets, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_reserve_usage(
  p_user_id UUID,
  p_bucket_key TEXT,
  p_amount INTEGER DEFAULT 1,
  p_request_source TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reservation_ttl_seconds INTEGER DEFAULT 900,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  ok BOOLEAN,
  code TEXT,
  message TEXT,
  reservation_key TEXT,
  cycle_id UUID,
  plan_code TEXT,
  bucket_key TEXT,
  amount INTEGER,
  used INTEGER,
  reserved INTEGER,
  remaining INTEGER,
  monthly_limit INTEGER
) AS $$
DECLARE
  v_cycle RECORD;
  v_existing RECORD;
  v_bucket JSONB;
  v_monthly_limit INTEGER;
  v_used INTEGER;
  v_reserved INTEGER;
  v_amount INTEGER := GREATEST(COALESCE(p_amount, 1), 1);
  v_ttl_seconds INTEGER := GREATEST(COALESCE(p_reservation_ttl_seconds, 900), 60);
  v_reservation_key TEXT := COALESCE(NULLIF(TRIM(p_idempotency_key), ''), gen_random_uuid()::TEXT);
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT *
  INTO v_cycle
  FROM public.billing_ensure_usage_cycle(p_user_id, NOW());

  PERFORM 1
  FROM public.billing_usage_cycles c
  WHERE c.id = v_cycle.cycle_id
  FOR UPDATE;

  PERFORM public.billing_release_expired_reservations(v_cycle.cycle_id);

  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT e.*
    INTO v_existing
    FROM public.billing_usage_events e
    WHERE e.user_id = p_user_id
      AND e.cycle_id = v_cycle.cycle_id
      AND e.bucket_key = p_bucket_key
      AND e.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      SELECT COALESCE(SUM(e.amount), 0)
      INTO v_used
      FROM public.billing_usage_events e
      WHERE e.cycle_id = v_cycle.cycle_id
        AND e.bucket_key = p_bucket_key
        AND e.status = 'committed';

      SELECT COALESCE(SUM(e.amount), 0)
      INTO v_reserved
      FROM public.billing_usage_events e
      WHERE e.cycle_id = v_cycle.cycle_id
        AND e.bucket_key = p_bucket_key
        AND e.status = 'reserved'
        AND (e.expires_at IS NULL OR e.expires_at > NOW());

      v_bucket := v_cycle.buckets -> p_bucket_key;
      v_monthly_limit := COALESCE((v_bucket ->> 'monthly_limit')::INTEGER, 0);

      RETURN QUERY
      SELECT
        true,
        'already_reserved',
        'Reserva reutilizada',
        v_existing.reservation_key,
        v_cycle.cycle_id,
        v_cycle.plan_code,
        p_bucket_key,
        v_existing.amount,
        v_used,
        v_reserved,
        CASE
          WHEN v_monthly_limit < 0 THEN -1
          ELSE GREATEST(v_monthly_limit - v_used - v_reserved, 0)
        END,
        v_monthly_limit;
      RETURN;
    END IF;
  END IF;

  v_bucket := v_cycle.buckets -> p_bucket_key;
  IF v_bucket IS NULL THEN
    RETURN QUERY
    SELECT false, 'bucket_not_found', 'Bucket no configurado', NULL::TEXT, v_cycle.cycle_id, v_cycle.plan_code, p_bucket_key, v_amount, 0, 0, 0, 0;
    RETURN;
  END IF;

  v_monthly_limit := COALESCE((v_bucket ->> 'monthly_limit')::INTEGER, 0);

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_used
  FROM public.billing_usage_events e
  WHERE e.cycle_id = v_cycle.cycle_id
    AND e.bucket_key = p_bucket_key
    AND e.status = 'committed';

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_reserved
  FROM public.billing_usage_events e
  WHERE e.cycle_id = v_cycle.cycle_id
    AND e.bucket_key = p_bucket_key
    AND e.status = 'reserved'
    AND (e.expires_at IS NULL OR e.expires_at > NOW());

  IF v_monthly_limit >= 0 AND (v_used + v_reserved + v_amount) > v_monthly_limit THEN
    RETURN QUERY
    SELECT
      false,
      'limit_exceeded',
      'No tenés saldo disponible en este bucket',
      NULL::TEXT,
      v_cycle.cycle_id,
      v_cycle.plan_code,
      p_bucket_key,
      v_amount,
      v_used,
      v_reserved,
      GREATEST(v_monthly_limit - v_used - v_reserved, 0),
      v_monthly_limit;
    RETURN;
  END IF;

  INSERT INTO public.billing_usage_events (
    user_id,
    cycle_id,
    bucket_key,
    amount,
    status,
    reservation_key,
    idempotency_key,
    request_source,
    metadata,
    expires_at,
    reserved_at
  ) VALUES (
    p_user_id,
    v_cycle.cycle_id,
    p_bucket_key,
    v_amount,
    'reserved',
    v_reservation_key,
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    p_request_source,
    COALESCE(p_metadata, '{}'::jsonb),
    NOW() + make_interval(secs => v_ttl_seconds),
    NOW()
  );

  RETURN QUERY
  SELECT
    true,
    'reserved',
    'Reserva creada',
    v_reservation_key,
    v_cycle.cycle_id,
    v_cycle.plan_code,
    p_bucket_key,
    v_amount,
    v_used,
    v_reserved + v_amount,
    CASE
      WHEN v_monthly_limit < 0 THEN -1
      ELSE GREATEST(v_monthly_limit - v_used - v_reserved - v_amount, 0)
    END,
    v_monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_commit_usage(
  p_user_id UUID,
  p_reservation_key TEXT,
  p_commit BOOLEAN DEFAULT TRUE,
  p_actual_amount INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  ok BOOLEAN,
  code TEXT,
  message TEXT,
  reservation_key TEXT,
  cycle_id UUID,
  plan_code TEXT,
  bucket_key TEXT,
  amount INTEGER,
  used INTEGER,
  reserved INTEGER,
  remaining INTEGER,
  monthly_limit INTEGER
) AS $$
DECLARE
  v_event RECORD;
  v_cycle RECORD;
  v_bucket JSONB;
  v_monthly_limit INTEGER;
  v_used INTEGER;
  v_reserved INTEGER;
  v_effective_amount INTEGER;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT e.*
  INTO v_event
  FROM public.billing_usage_events e
  WHERE e.user_id = p_user_id
    AND e.reservation_key = p_reservation_key
  FOR UPDATE;

  IF v_event.id IS NULL THEN
    RETURN QUERY
    SELECT false, 'reservation_not_found', 'Reserva no encontrada', p_reservation_key, NULL::UUID, NULL::TEXT, NULL::TEXT, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  IF v_event.status = 'reserved' AND v_event.expires_at IS NOT NULL AND v_event.expires_at <= NOW() THEN
    UPDATE public.billing_usage_events
    SET
      status = 'released',
      released_at = NOW(),
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
    WHERE id = v_event.id;

    RETURN QUERY
    SELECT false, 'reservation_expired', 'La reserva venció', v_event.reservation_key, v_event.cycle_id, NULL::TEXT, v_event.bucket_key, v_event.amount, 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT *
  INTO v_cycle
  FROM public.billing_usage_cycles c
  WHERE c.id = v_event.cycle_id
  FOR UPDATE;

  PERFORM public.billing_release_expired_reservations(v_cycle.id);

  v_bucket := COALESCE(v_cycle.entitlements_snapshot -> 'buckets', '{}'::jsonb) -> v_event.bucket_key;
  v_monthly_limit := COALESCE((v_bucket ->> 'monthly_limit')::INTEGER, 0);
  v_effective_amount := LEAST(COALESCE(NULLIF(p_actual_amount, 0), v_event.amount), v_event.amount);
  v_effective_amount := GREATEST(v_effective_amount, 1);

  IF v_event.status = 'committed' THEN
    v_effective_amount := v_event.amount;
  ELSIF v_event.status = 'released' THEN
    RETURN QUERY
    SELECT false, 'already_released', 'La reserva ya fue liberada', v_event.reservation_key, v_event.cycle_id, v_cycle.plan_code, v_event.bucket_key, v_event.amount, 0, 0, 0, v_monthly_limit;
    RETURN;
  ELSIF p_commit THEN
    UPDATE public.billing_usage_events
    SET
      status = 'committed',
      amount = v_effective_amount,
      committed_at = NOW(),
      expires_at = NULL,
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
    WHERE id = v_event.id;
  ELSE
    UPDATE public.billing_usage_events
    SET
      status = 'released',
      released_at = NOW(),
      expires_at = NULL,
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
    WHERE id = v_event.id;
    v_effective_amount := v_event.amount;
  END IF;

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_used
  FROM public.billing_usage_events e
  WHERE e.cycle_id = v_event.cycle_id
    AND e.bucket_key = v_event.bucket_key
    AND e.status = 'committed';

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_reserved
  FROM public.billing_usage_events e
  WHERE e.cycle_id = v_event.cycle_id
    AND e.bucket_key = v_event.bucket_key
    AND e.status = 'reserved'
    AND (e.expires_at IS NULL OR e.expires_at > NOW());

  RETURN QUERY
  SELECT
    true,
    CASE WHEN p_commit THEN 'committed' ELSE 'released' END,
    CASE WHEN p_commit THEN 'Consumo confirmado' ELSE 'Reserva liberada' END,
    v_event.reservation_key,
    v_event.cycle_id,
    v_cycle.plan_code,
    v_event.bucket_key,
    v_effective_amount,
    v_used,
    v_reserved,
    CASE
      WHEN v_monthly_limit < 0 THEN -1
      ELSE GREATEST(v_monthly_limit - v_used - v_reserved, 0)
    END,
    v_monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.billing_release_expired_reservations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_build_features_json(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_build_buckets_json(TEXT, JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_resolve_context(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_ensure_usage_cycle(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_get_effective_entitlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_get_usage_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_reserve_usage(UUID, TEXT, INTEGER, TEXT, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_commit_usage(UUID, TEXT, BOOLEAN, INTEGER, JSONB) TO authenticated;
