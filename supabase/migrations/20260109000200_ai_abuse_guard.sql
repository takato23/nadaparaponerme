-- Migration: AI rate limiting + abuse guard
-- Adds per-user request throttling and consecutive error blocking

CREATE TABLE IF NOT EXISTS public.ai_request_limits (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_count INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_count INTEGER NOT NULL DEFAULT 0,
  error_window_start TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_ai_request_limits_blocked ON public.ai_request_limits(blocked_until);
CREATE INDEX IF NOT EXISTS idx_ai_request_limits_last_request ON public.ai_request_limits(last_request_at DESC);

ALTER TABLE public.ai_request_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage ai_request_limits" ON public.ai_request_limits;
CREATE POLICY "Service role can manage ai_request_limits"
  ON public.ai_request_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Rate limit check
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_feature TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 12
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  retry_after_seconds INTEGER,
  blocked_until TIMESTAMPTZ
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_window_count INTEGER;
  v_blocked_until TIMESTAMPTZ;
  v_retry INTEGER;
BEGIN
  SELECT window_start, window_count, blocked_until
  INTO v_window_start, v_window_count, v_blocked_until
  FROM public.ai_request_limits
  WHERE user_id = p_user_id AND feature = p_feature
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_request_limits (
      user_id,
      feature,
      window_start,
      window_count,
      last_request_at
    ) VALUES (
      p_user_id,
      p_feature,
      v_now,
      1,
      v_now
    );
    RETURN QUERY SELECT true, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > v_now THEN
    v_retry := CEIL(EXTRACT(EPOCH FROM (v_blocked_until - v_now)))::INTEGER;
    RETURN QUERY SELECT false, 'blocked', v_retry, v_blocked_until;
    RETURN;
  END IF;

  IF v_window_start IS NULL OR v_window_start < (v_now - make_interval(secs => p_window_seconds)) THEN
    v_window_start := v_now;
    v_window_count := 1;
  ELSE
    v_window_count := v_window_count + 1;
  END IF;

  UPDATE public.ai_request_limits
  SET
    window_start = v_window_start,
    window_count = v_window_count,
    last_request_at = v_now,
    blocked_until = NULL,
    updated_at = v_now
  WHERE user_id = p_user_id AND feature = p_feature;

  IF v_window_count > p_max_requests THEN
    v_retry := CEIL(EXTRACT(EPOCH FROM ((v_window_start + make_interval(secs => p_window_seconds)) - v_now)))::INTEGER;
    v_retry := GREATEST(v_retry, 1);
    RETURN QUERY SELECT false, 'rate_limited', v_retry, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record success/failure to detect abuse
CREATE OR REPLACE FUNCTION public.record_ai_request_result(
  p_user_id UUID,
  p_feature TEXT,
  p_success BOOLEAN,
  p_error_threshold INTEGER DEFAULT 10,
  p_error_window_seconds INTEGER DEFAULT 300,
  p_block_seconds INTEGER DEFAULT 900
)
RETURNS TABLE (
  blocked_until TIMESTAMPTZ,
  error_count INTEGER
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_error_count INTEGER;
  v_error_window_start TIMESTAMPTZ;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  SELECT error_count, error_window_start, blocked_until
  INTO v_error_count, v_error_window_start, v_blocked_until
  FROM public.ai_request_limits
  WHERE user_id = p_user_id AND feature = p_feature
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_request_limits (
      user_id,
      feature,
      window_start,
      window_count,
      last_request_at,
      error_count,
      error_window_start,
      last_error_at
    ) VALUES (
      p_user_id,
      p_feature,
      v_now,
      0,
      v_now,
      0,
      NULL,
      NULL
    );
    v_error_count := 0;
    v_error_window_start := NULL;
  END IF;

  IF p_success THEN
    UPDATE public.ai_request_limits
    SET
      error_count = 0,
      error_window_start = NULL,
      last_error_at = NULL,
      blocked_until = NULL,
      updated_at = v_now
    WHERE user_id = p_user_id AND feature = p_feature;

    RETURN QUERY SELECT NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  IF v_error_window_start IS NULL OR v_error_window_start < (v_now - make_interval(secs => p_error_window_seconds)) THEN
    v_error_window_start := v_now;
    v_error_count := 1;
  ELSE
    v_error_count := v_error_count + 1;
  END IF;

  IF v_error_count >= p_error_threshold THEN
    v_blocked_until := v_now + make_interval(secs => p_block_seconds);
    UPDATE public.ai_request_limits
    SET
      error_count = v_error_count,
      error_window_start = v_error_window_start,
      last_error_at = v_now,
      blocked_until = v_blocked_until,
      updated_at = v_now
    WHERE user_id = p_user_id AND feature = p_feature;

    RETURN QUERY SELECT v_blocked_until, v_error_count;
    RETURN;
  END IF;

  UPDATE public.ai_request_limits
  SET
    error_count = v_error_count,
    error_window_start = v_error_window_start,
    last_error_at = v_now,
    updated_at = v_now
  WHERE user_id = p_user_id AND feature = p_feature;

  RETURN QUERY SELECT NULL::TIMESTAMPTZ, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_request_result(UUID, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated;
