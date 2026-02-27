-- Beta access + shareable invite codes
-- Goals:
-- 1) Allow controlled beta testers to experience premium/unlimited AI.
-- 2) Keep hard server-side revocation and expiration controls.

CREATE TABLE IF NOT EXISTS public.beta_access (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source_code TEXT,
  premium_override BOOLEAN NOT NULL DEFAULT FALSE,
  unlimited_ai BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_access_active
  ON public.beta_access (expires_at, revoked_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.beta_invite_codes (
  code TEXT PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  grants_premium BOOLEAN NOT NULL DEFAULT TRUE,
  grants_unlimited_ai BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_active
  ON public.beta_invite_codes (expires_at, revoked_at);

ALTER TABLE public.beta_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own beta access" ON public.beta_access;
CREATE POLICY "Users can view own beta access"
  ON public.beta_access
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages beta access" ON public.beta_access;
CREATE POLICY "Service role manages beta access"
  ON public.beta_access
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP POLICY IF EXISTS "Service role manages beta invites" ON public.beta_invite_codes;
CREATE POLICY "Service role manages beta invites"
  ON public.beta_invite_codes
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

CREATE OR REPLACE FUNCTION public.claim_beta_invite(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  expires_at TIMESTAMPTZ,
  premium_override BOOLEAN,
  unlimited_ai BOOLEAN
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_invite RECORD;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF v_code = '' OR length(v_code) < 4 THEN
    RETURN QUERY SELECT false, 'Código inválido', NULL::TIMESTAMPTZ, false, false;
    RETURN;
  END IF;

  SELECT *
  INTO v_invite
  FROM public.beta_invite_codes
  WHERE UPPER(code) = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Código no encontrado', NULL::TIMESTAMPTZ, false, false;
    RETURN;
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Código revocado', NULL::TIMESTAMPTZ, false, false;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= v_now THEN
    RETURN QUERY SELECT false, 'Código vencido', v_invite.expires_at, false, false;
    RETURN;
  END IF;

  IF v_invite.uses_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, 'Código sin cupos disponibles', v_invite.expires_at, false, false;
    RETURN;
  END IF;

  INSERT INTO public.beta_access (
    user_id,
    source_code,
    premium_override,
    unlimited_ai,
    granted_by,
    granted_at,
    expires_at,
    revoked_at,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_code,
    COALESCE(v_invite.grants_premium, false),
    COALESCE(v_invite.grants_unlimited_ai, false),
    v_invite.created_by,
    v_now,
    v_invite.expires_at,
    NULL,
    jsonb_build_object('claimed_at', v_now, 'claimed_code', v_code),
    v_now,
    v_now
  )
  ON CONFLICT (user_id)
  DO UPDATE
  SET
    source_code = v_code,
    premium_override = (public.beta_access.premium_override OR COALESCE(v_invite.grants_premium, false)),
    unlimited_ai = (public.beta_access.unlimited_ai OR COALESCE(v_invite.grants_unlimited_ai, false)),
    granted_by = COALESCE(v_invite.created_by, public.beta_access.granted_by),
    granted_at = v_now,
    expires_at = CASE
      WHEN public.beta_access.expires_at IS NULL THEN NULL
      WHEN v_invite.expires_at IS NULL THEN NULL
      ELSE GREATEST(public.beta_access.expires_at, v_invite.expires_at)
    END,
    revoked_at = NULL,
    metadata = COALESCE(public.beta_access.metadata, '{}'::jsonb) || jsonb_build_object(
      'claimed_at', v_now,
      'claimed_code', v_code
    ),
    updated_at = v_now;

  UPDATE public.beta_invite_codes
  SET
    uses_count = uses_count + 1,
    updated_at = v_now
  WHERE UPPER(code) = v_code;

  RETURN QUERY
  SELECT
    true,
    'Acceso beta activado',
    b.expires_at,
    b.premium_override,
    b.unlimited_ai
  FROM public.beta_access b
  WHERE b.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_has_feature_access(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT tier, status INTO v_tier, v_status
  FROM subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  IF EXISTS (
    SELECT 1
    FROM public.beta_access b
    WHERE b.user_id = p_user_id
      AND b.premium_override = TRUE
      AND b.revoked_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > v_now)
  ) THEN
    v_tier := 'premium';
    v_status := 'active';
  END IF;

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  CASE p_feature_name
    WHEN 'ai_designer' THEN
      RETURN v_tier IN ('pro', 'premium');
    WHEN 'virtual_tryon' THEN
      RETURN v_tier IN ('pro', 'premium');
    WHEN 'lookbook_creator' THEN
      RETURN v_tier IN ('pro', 'premium');
    WHEN 'style_dna' THEN
      RETURN v_tier = 'premium';
    WHEN 'unlimited_ai' THEN
      RETURN v_tier = 'premium';
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_ai_generation_usage(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_amount INTEGER := GREATEST(COALESCE(p_amount, 1), 1);
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF EXISTS (
    SELECT 1
    FROM public.beta_access b
    WHERE b.user_id = p_user_id
      AND b.unlimited_ai = TRUE
      AND b.revoked_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > v_now)
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT
    tier,
    ai_generations_used,
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    INSERT INTO subscriptions (
      user_id,
      tier,
      status,
      current_period_start,
      current_period_end,
      ai_generations_used
    ) VALUES (
      p_user_id,
      'free',
      'active',
      DATE_TRUNC('month', v_now),
      DATE_TRUNC('month', v_now) + INTERVAL '1 month',
      0
    );
    v_tier := 'free';
    v_current_usage := 0;
    v_period_end := DATE_TRUNC('month', v_now) + INTERVAL '1 month';
  END IF;

  IF v_period_end < v_now THEN
    UPDATE subscriptions
    SET
      ai_generations_used = 0,
      current_period_start = DATE_TRUNC('month', v_now),
      current_period_end = DATE_TRUNC('month', v_now) + INTERVAL '1 month'
    WHERE user_id = p_user_id;

    v_current_usage := 0;
  END IF;

  v_limit := CASE v_tier
    WHEN 'free' THEN 200
    WHEN 'pro' THEN 300
    WHEN 'premium' THEN 400
    ELSE 200
  END;

  IF v_limit != -1 AND (v_current_usage + v_amount) > v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE subscriptions
  SET ai_generations_used = ai_generations_used + v_amount
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_user_generate_outfit(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_amount INTEGER := GREATEST(COALESCE(p_amount, 1), 1);
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF EXISTS (
    SELECT 1
    FROM public.beta_access b
    WHERE b.user_id = p_user_id
      AND b.unlimited_ai = TRUE
      AND b.revoked_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > v_now)
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT
    tier,
    COALESCE(ai_generations_used, 0),
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current_usage := 0;
  END IF;

  IF v_period_end IS NOT NULL AND v_period_end < v_now THEN
    RETURN TRUE;
  END IF;

  v_limit := CASE v_tier
    WHEN 'free' THEN 200
    WHEN 'pro' THEN 300
    WHEN 'premium' THEN 400
    ELSE 200
  END;

  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN (v_current_usage + v_amount) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_remaining_generations(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF EXISTS (
    SELECT 1
    FROM public.beta_access b
    WHERE b.user_id = p_user_id
      AND b.unlimited_ai = TRUE
      AND b.revoked_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > v_now)
  ) THEN
    RETURN -1;
  END IF;

  SELECT
    tier,
    COALESCE(ai_generations_used, 0),
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current_usage := 0;
  END IF;

  IF v_period_end IS NOT NULL AND v_period_end < v_now THEN
    v_current_usage := 0;
  END IF;

  v_limit := CASE v_tier
    WHEN 'free' THEN 200
    WHEN 'pro' THEN 300
    WHEN 'premium' THEN 400
    ELSE 200
  END;

  IF v_limit = -1 THEN
    RETURN -1;
  END IF;

  RETURN GREATEST(0, v_limit - v_current_usage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.claim_beta_invite(UUID, TEXT) TO authenticated;
