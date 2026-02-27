-- AI Budget Guard (daily, per-user, per-feature)
-- Purpose:
-- 1) Prevent cost abuse even when minute-level rate limits are respected.
-- 2) Keep budget enforcement server-side and atomic.

CREATE TABLE IF NOT EXISTS public.ai_budget_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT (timezone('utc', now()))::date,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, feature, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_budget_usage_daily_date
  ON public.ai_budget_usage_daily (usage_date, feature);

ALTER TABLE public.ai_budget_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai budget usage" ON public.ai_budget_usage_daily;
CREATE POLICY "Users can view own ai budget usage"
  ON public.ai_budget_usage_daily
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_and_reserve_ai_budget(
  p_user_id UUID,
  p_feature TEXT,
  p_expected_credits INTEGER DEFAULT 0,
  p_daily_request_limit INTEGER DEFAULT 30,
  p_daily_success_limit INTEGER DEFAULT 20,
  p_daily_credits_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  retry_after_seconds INTEGER,
  request_count INTEGER,
  success_count INTEGER,
  credits_used INTEGER
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_usage_date DATE := (timezone('utc', v_now))::date;
  v_request_count INTEGER := 0;
  v_success_count INTEGER := 0;
  v_credits_used INTEGER := 0;
  v_expected_credits INTEGER := GREATEST(COALESCE(p_expected_credits, 0), 0);
  v_daily_request_limit INTEGER := GREATEST(COALESCE(p_daily_request_limit, 1), 1);
  v_daily_success_limit INTEGER := GREATEST(COALESCE(p_daily_success_limit, 1), 1);
  v_daily_credits_limit INTEGER := GREATEST(COALESCE(p_daily_credits_limit, 0), 0);
  v_retry_after_seconds INTEGER;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT
    d.request_count,
    d.success_count,
    d.credits_used
  INTO
    v_request_count,
    v_success_count,
    v_credits_used
  FROM public.ai_budget_usage_daily d
  WHERE d.user_id = p_user_id
    AND d.feature = p_feature
    AND d.usage_date = v_usage_date
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_budget_usage_daily (
      user_id,
      feature,
      usage_date,
      request_count,
      success_count,
      credits_used,
      last_request_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_feature,
      v_usage_date,
      0,
      0,
      0,
      v_now,
      v_now,
      v_now
    );
    v_request_count := 0;
    v_success_count := 0;
    v_credits_used := 0;
  END IF;

  v_retry_after_seconds := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM ((date_trunc('day', timezone('utc', v_now)) + interval '1 day') - timezone('utc', v_now))))::INTEGER
  );

  IF v_request_count >= v_daily_request_limit THEN
    RETURN QUERY SELECT false, 'daily_request_limit', v_retry_after_seconds, v_request_count, v_success_count, v_credits_used;
    RETURN;
  END IF;

  IF v_success_count >= v_daily_success_limit THEN
    RETURN QUERY SELECT false, 'daily_success_limit', v_retry_after_seconds, v_request_count, v_success_count, v_credits_used;
    RETURN;
  END IF;

  IF v_expected_credits > 0 AND (v_credits_used + v_expected_credits) > v_daily_credits_limit THEN
    RETURN QUERY SELECT false, 'daily_credits_limit', v_retry_after_seconds, v_request_count, v_success_count, v_credits_used;
    RETURN;
  END IF;

  v_request_count := v_request_count + 1;

  UPDATE public.ai_budget_usage_daily
  SET
    request_count = v_request_count,
    last_request_at = v_now,
    updated_at = v_now
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND usage_date = v_usage_date;

  RETURN QUERY SELECT true, NULL::TEXT, NULL::INTEGER, v_request_count, v_success_count, v_credits_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.record_ai_budget_success(
  p_user_id UUID,
  p_feature TEXT,
  p_credits_used INTEGER DEFAULT 0
)
RETURNS TABLE (
  success_count INTEGER,
  credits_used INTEGER
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_usage_date DATE := (timezone('utc', v_now))::date;
  v_credits_to_add INTEGER := GREATEST(COALESCE(p_credits_used, 0), 0);
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  INSERT INTO public.ai_budget_usage_daily (
    user_id,
    feature,
    usage_date,
    request_count,
    success_count,
    credits_used,
    last_request_at,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_feature,
    v_usage_date,
    1,
    1,
    v_credits_to_add,
    v_now,
    v_now,
    v_now
  )
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE
  SET
    success_count = ai_budget_usage_daily.success_count + 1,
    credits_used = ai_budget_usage_daily.credits_used + v_credits_to_add,
    last_request_at = v_now,
    updated_at = v_now;

  RETURN QUERY
  SELECT d.success_count, d.credits_used
  FROM public.ai_budget_usage_daily d
  WHERE d.user_id = p_user_id
    AND d.feature = p_feature
    AND d.usage_date = v_usage_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_and_reserve_ai_budget(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_budget_success(UUID, TEXT, INTEGER) TO authenticated;
