-- Migration: Improve Subscription Usage Reset
-- Description: Adds automatic monthly reset for AI generation counters
-- and improves the increment function with period validation

-- ============================================================================
-- IMPROVED INCREMENT FUNCTION WITH AUTO-RESET
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_ai_generation_usage(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get current subscription info
  SELECT
    tier,
    ai_generations_used,
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- If no subscription, create free one
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

  -- Check if period has expired and reset if needed
  IF v_period_end < v_now THEN
    UPDATE subscriptions
    SET
      ai_generations_used = 0,
      current_period_start = DATE_TRUNC('month', v_now),
      current_period_end = DATE_TRUNC('month', v_now) + INTERVAL '1 month'
    WHERE user_id = p_user_id;

    v_current_usage := 0;
  END IF;

  -- Determine limit based on tier
  v_limit := CASE v_tier
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN -1  -- Unlimited
    ELSE 10
  END;

  -- Check if user has reached limit (skip for unlimited)
  IF v_limit != -1 AND v_current_usage >= v_limit THEN
    RETURN FALSE;  -- Limit reached
  END IF;

  -- Increment usage
  UPDATE subscriptions
  SET ai_generations_used = ai_generations_used + 1
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION TO CHECK IF USER CAN GENERATE
-- ============================================================================

CREATE OR REPLACE FUNCTION can_user_generate_outfit(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get current subscription info
  SELECT
    tier,
    COALESCE(ai_generations_used, 0),
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Default to free if no subscription
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current_usage := 0;
  END IF;

  -- If period expired, usage should be reset (return true since effectively 0 usage)
  IF v_period_end IS NOT NULL AND v_period_end < v_now THEN
    RETURN TRUE;
  END IF;

  -- Determine limit based on tier
  v_limit := CASE v_tier
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN -1  -- Unlimited
    ELSE 10
  END;

  -- Premium users always can generate
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Check if under limit
  RETURN v_current_usage < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION TO GET REMAINING GENERATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_remaining_generations(
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
  -- Get current subscription info
  SELECT
    tier,
    COALESCE(ai_generations_used, 0),
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Default to free if no subscription
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current_usage := 0;
  END IF;

  -- If period expired, effectively full quota available
  IF v_period_end IS NOT NULL AND v_period_end < v_now THEN
    v_current_usage := 0;
  END IF;

  -- Determine limit based on tier
  v_limit := CASE v_tier
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN -1  -- Unlimited
    ELSE 10
  END;

  -- Return -1 for unlimited
  IF v_limit = -1 THEN
    RETURN -1;
  END IF;

  -- Return remaining
  RETURN GREATEST(0, v_limit - v_current_usage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED RESET FUNCTION (for pg_cron if available)
-- ============================================================================

-- This function can be called by pg_cron to reset expired subscriptions
-- Run daily: SELECT cron.schedule('reset-expired-subscriptions', '0 0 * * *', 'SELECT reset_expired_subscription_periods()');

CREATE OR REPLACE FUNCTION reset_expired_subscription_periods()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE subscriptions
    SET
      ai_generations_used = 0,
      current_period_start = DATE_TRUNC('month', NOW()),
      current_period_end = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    WHERE current_period_end < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION increment_ai_generation_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_generate_outfit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_generations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_expired_subscription_periods() TO service_role;
