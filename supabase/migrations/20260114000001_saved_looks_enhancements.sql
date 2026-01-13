-- Migration: Saved Looks Enhancements
-- Created: 2026-01-14
-- Description: Add rating and tags support to generated_looks table

-- =====================================================
-- Add rating column (1-5 stars)
-- =====================================================

ALTER TABLE generated_looks 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

COMMENT ON COLUMN generated_looks.rating IS 'User rating 1-5 stars';

-- =====================================================
-- Add tags column (JSON array of strings)
-- =====================================================

ALTER TABLE generated_looks 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

COMMENT ON COLUMN generated_looks.tags IS 'User-defined tags for categorization';

-- =====================================================
-- Indexes for efficient filtering
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_generated_looks_rating 
ON generated_looks(user_id, rating) 
WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generated_looks_tags 
ON generated_looks USING GIN (tags);

-- =====================================================
-- Helper function: Check if user can share looks
-- Free users cannot share, only Pro and Premium
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_share_look(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(tier, 'free') INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- Only pro and premium can share
  RETURN v_tier IN ('pro', 'premium');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_share_look(UUID) IS 
  'Returns true if user can share looks (Pro/Premium only)';
