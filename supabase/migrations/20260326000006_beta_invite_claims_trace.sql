-- Beta invite claims trace + idempotent consumption
-- Ensures:
-- 1) We can audit who claimed each public beta link.
-- 2) A user claiming the same code twice does not consume extra slots.

CREATE TABLE IF NOT EXISTS public.beta_invite_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES public.beta_invite_codes(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'link',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_beta_invite_claims_code_claimed
  ON public.beta_invite_claims (code, claimed_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_invite_claims_user_claimed
  ON public.beta_invite_claims (user_id, claimed_at DESC);

ALTER TABLE public.beta_invite_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own beta invite claims" ON public.beta_invite_claims;
CREATE POLICY "Users can view own beta invite claims"
  ON public.beta_invite_claims
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages beta invite claims" ON public.beta_invite_claims;
CREATE POLICY "Service role manages beta invite claims"
  ON public.beta_invite_claims
  FOR ALL
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');

DROP FUNCTION IF EXISTS public.claim_beta_invite(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.claim_beta_invite(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  expires_at TIMESTAMPTZ,
  premium_override BOOLEAN,
  unlimited_ai BOOLEAN,
  remaining_uses INTEGER
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_invite RECORD;
  v_claim RECORD;
  v_remaining_uses INTEGER;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF v_code = '' OR length(v_code) < 4 THEN
    RETURN QUERY SELECT false, 'Código inválido', NULL::TIMESTAMPTZ, false, false, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT *
  INTO v_invite
  FROM public.beta_invite_codes
  WHERE UPPER(code) = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Código no encontrado', NULL::TIMESTAMPTZ, false, false, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Código revocado', NULL::TIMESTAMPTZ, false, false, 0;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= v_now THEN
    RETURN QUERY SELECT false, 'Código vencido', v_invite.expires_at, false, false, 0;
    RETURN;
  END IF;

  SELECT c.*
  INTO v_claim
  FROM public.beta_invite_claims c
  WHERE c.code = v_invite.code
    AND c.user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    SELECT
      GREATEST(0, v_invite.max_uses - v_invite.uses_count)
    INTO v_remaining_uses;

    RETURN QUERY
    SELECT
      true,
      'Acceso beta ya activo para este código',
      v_invite.expires_at,
      COALESCE(v_invite.grants_premium, false),
      COALESCE(v_invite.grants_unlimited_ai, false),
      v_remaining_uses;
    RETURN;
  END IF;

  IF v_invite.uses_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, 'Código sin cupos disponibles', v_invite.expires_at, false, false, 0;
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

  INSERT INTO public.beta_invite_claims (
    code,
    user_id,
    claimed_at,
    source,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_invite.code,
    p_user_id,
    v_now,
    'link',
    jsonb_build_object('claimed_code', v_code, 'claimed_at', v_now),
    v_now,
    v_now
  );

  UPDATE public.beta_invite_codes
  SET
    uses_count = uses_count + 1,
    updated_at = v_now
  WHERE code = v_invite.code;

  SELECT
    GREATEST(0, v_invite.max_uses - (v_invite.uses_count + 1))
  INTO v_remaining_uses;

  RETURN QUERY
  SELECT
    true,
    'Acceso beta activado',
    b.expires_at,
    b.premium_override,
    b.unlimited_ai,
    v_remaining_uses
  FROM public.beta_access b
  WHERE b.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.claim_beta_invite(UUID, TEXT) TO authenticated;
