-- Migration: Update Free Tier Limits for Beta Testing
-- Description: Increases Free tier limits to enable proper beta testing with Google Cloud credits
-- Date: 2026-01-13

-- Update the increment_ai_generation_usage function with new limits
CREATE OR REPLACE FUNCTION increment_ai_generation_usage(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
BEGIN
  -- Get current subscription tier
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Get current usage and limit (UPDATED LIMITS)
  SELECT
    COALESCE(ai_generations_used, 0),
    CASE v_tier
      WHEN 'free' THEN 100      -- Was 10
      WHEN 'pro' THEN 150        -- Was 100
      WHEN 'premium' THEN -1     -- Unlimited
    END
  INTO v_current_usage, v_limit
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Check if user has reached limit
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

-- Update existing usage_metrics for current period to reflect new limits
UPDATE usage_metrics
SET ai_generations_limit = 100
WHERE subscription_tier = 'free'
  AND period_start = DATE_TRUNC('month', NOW());

UPDATE usage_metrics
SET ai_generations_limit = 150
WHERE subscription_tier = 'pro'
  AND period_start = DATE_TRUNC('month', NOW());

-- Reset AI generation usage for all free users to give them the new quota
UPDATE subscriptions
SET ai_generations_used = 0
WHERE tier = 'free';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Free tier limits updated:';
  RAISE NOTICE '  - AI Generations: 10 → 100';
  RAISE NOTICE '  - Closet Items: 50 → 200';
  RAISE NOTICE '  - Virtual Try-On: Enabled';
  RAISE NOTICE '  - Analytics: Enabled';
  RAISE NOTICE 'Pro tier AI generations: 100 → 150';
END $$;
