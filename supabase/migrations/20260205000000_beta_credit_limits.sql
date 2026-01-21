-- Migration: Beta credit limits for friend testing
-- Description: Increase free limits and keep variable credit costs

-- Drop previous signatures to avoid ambiguity
DROP FUNCTION IF EXISTS increment_ai_generation_usage(UUID);
DROP FUNCTION IF EXISTS can_user_generate_outfit(UUID);

-- ============================================================================
-- INCREMENT FUNCTION WITH OPTIONAL AMOUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_ai_generation_usage(
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
  -- Get current subscription info
  SELECT
    tier,
    ai_generations_used,
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- If no subscription, create a free one
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

  -- Reset usage if period expired
  IF v_period_end < v_now THEN
    UPDATE subscriptions
    SET
      ai_generations_used = 0,
      current_period_start = DATE_TRUNC('month', v_now),
      current_period_end = DATE_TRUNC('month', v_now) + INTERVAL '1 month'
    WHERE user_id = p_user_id;

    v_current_usage := 0;
  END IF;

  -- Limits per tier (beta)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION TO CHECK IF USER CAN GENERATE (WITH AMOUNT)
-- ============================================================================

CREATE OR REPLACE FUNCTION can_user_generate_outfit(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE USAGE METRICS FOR CURRENT PERIOD (BETA)
-- ============================================================================

UPDATE usage_metrics
SET ai_generations_limit = 200
WHERE subscription_tier = 'free'
  AND period_start = DATE_TRUNC('month', NOW());

UPDATE usage_metrics
SET ai_generations_limit = 300
WHERE subscription_tier = 'pro'
  AND period_start = DATE_TRUNC('month', NOW());

UPDATE usage_metrics
SET ai_generations_limit = 400
WHERE subscription_tier = 'premium'
  AND period_start = DATE_TRUNC('month', NOW());

GRANT EXECUTE ON FUNCTION increment_ai_generation_usage(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_generate_outfit(UUID, INTEGER) TO authenticated;
