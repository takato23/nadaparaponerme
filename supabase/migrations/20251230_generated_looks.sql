-- Migration: Generated Looks Storage
-- Created: 2024-12-30
-- Description: Table and storage for virtual try-on generated looks

-- =====================================================
-- Table: generated_looks
-- =====================================================

CREATE TABLE IF NOT EXISTS generated_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Storage URLs
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Source items (nullable, references to clothing_items)
  -- Using TEXT instead of UUID for flexibility with legacy string IDs
  top_base_id TEXT,
  top_mid_id TEXT,
  outerwear_id TEXT,
  bottom_id TEXT,
  one_piece_id TEXT,
  shoes_id TEXT,
  head_id TEXT,
  eyewear_id TEXT,
  bag_id TEXT,
  hand_acc_id TEXT,

  -- Generation metadata
  selfie_used BOOLEAN DEFAULT true,
  generation_preset TEXT DEFAULT 'selfie' CHECK (generation_preset IN ('selfie', 'casual', 'pro')),
  generation_model TEXT DEFAULT 'gemini-2.5-flash-image',

  -- User preferences
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  auto_saved BOOLEAN DEFAULT false,

  -- Sharing
  share_token TEXT UNIQUE,

  -- Optional metadata
  title TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_generated_looks_user_id
  ON generated_looks(user_id);

CREATE INDEX IF NOT EXISTS idx_generated_looks_created_at
  ON generated_looks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_looks_is_favorite
  ON generated_looks(user_id, is_favorite)
  WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_generated_looks_share_token
  ON generated_looks(share_token)
  WHERE share_token IS NOT NULL;

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE generated_looks ENABLE ROW LEVEL SECURITY;

-- Users can view their own looks
CREATE POLICY "Users can view own looks"
  ON generated_looks FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view public looks (for sharing)
CREATE POLICY "Anyone can view public looks"
  ON generated_looks FOR SELECT
  USING (is_public = true);

-- Users can insert their own looks
CREATE POLICY "Users can insert own looks"
  ON generated_looks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own looks
CREATE POLICY "Users can update own looks"
  ON generated_looks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own looks
CREATE POLICY "Users can delete own looks"
  ON generated_looks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Updated_at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_generated_looks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generated_looks_updated_at
  BEFORE UPDATE ON generated_looks
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_looks_updated_at();

-- =====================================================
-- Storage Bucket: generated-looks
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-looks',
  'generated-looks',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload generated looks"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-looks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own generated looks"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'generated-looks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own generated looks"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-looks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read access for generated looks"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-looks');

-- =====================================================
-- Helper function: Get user's look count
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_look_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM generated_looks
  WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- Helper function: Check if user can save more looks
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_save_look(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(tier, 'free') INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- Get current count
  SELECT get_user_look_count(p_user_id) INTO v_count;

  -- Determine limit based on tier
  v_limit := CASE v_tier
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 50
    WHEN 'premium' THEN 1000 -- Effectively unlimited
    ELSE 10
  END;

  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Cleanup job: Delete old non-favorite looks (30 days)
-- This should be run via pg_cron or external scheduler
-- =====================================================

-- Function to cleanup old looks
CREATE OR REPLACE FUNCTION cleanup_old_generated_looks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM generated_looks
    WHERE is_favorite = false
      AND auto_saved = true
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_generated_looks() IS
  'Removes auto-saved, non-favorite looks older than 30 days. Run via scheduler.';
