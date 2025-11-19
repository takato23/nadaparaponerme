-- =====================================================
-- STORAGE BUCKETS SETUP
-- =====================================================

-- Create buckets for different types of images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'clothing-images',
    'clothing-images',
    false,  -- Private bucket
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'avatars',
    'avatars',
    true,  -- Public bucket
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'outfit-shares',
    'outfit-shares',
    true,  -- Public bucket for social sharing
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES - CLOTHING IMAGES
-- =====================================================

-- Users can upload their own clothing images
CREATE POLICY "Users can upload own clothing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'clothing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own clothing images
CREATE POLICY "Users can view own clothing images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'clothing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view friends' clothing images
CREATE POLICY "Users can view friends clothing images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'clothing-images'
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id::text = (storage.foldername(name))[1])
        OR (addressee_id = auth.uid() AND requester_id::text = (storage.foldername(name))[1]))
    )
  );

-- Users can update their own clothing images
CREATE POLICY "Users can update own clothing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'clothing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own clothing images
CREATE POLICY "Users can delete own clothing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'clothing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- STORAGE POLICIES - AVATARS
-- =====================================================

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Avatars are publicly readable (bucket is public)
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- STORAGE POLICIES - OUTFIT SHARES
-- =====================================================

-- Users can upload their own outfit share images
CREATE POLICY "Users can upload outfit shares"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'outfit-shares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Outfit shares are publicly readable (bucket is public)
CREATE POLICY "Outfit shares are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'outfit-shares');

-- Users can update their own outfit shares
CREATE POLICY "Users can update own outfit shares"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'outfit-shares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own outfit shares
CREATE POLICY "Users can delete own outfit shares"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'outfit-shares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
