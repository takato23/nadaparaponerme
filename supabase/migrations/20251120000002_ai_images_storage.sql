-- Storage Bucket: ai-generated-images
-- Private bucket for AI-generated fashion images

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ai-generated-images',
    'ai-generated-images',
    false,  -- Private bucket
    2097152, -- 2MB max file size
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies

-- Policy: Users can view their own generated images
DROP POLICY IF EXISTS "Users can view own AI images" ON storage.objects;
CREATE POLICY "Users can view own AI images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'ai-generated-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can upload their own images (via service role)
DROP POLICY IF EXISTS "Service role can upload AI images" ON storage.objects;
CREATE POLICY "Service role can upload AI images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'ai-generated-images' AND
        auth.jwt()->>'role' = 'service_role'
    );

-- Policy: Users can delete their own generated images
DROP POLICY IF EXISTS "Users can delete own AI images" ON storage.objects;
CREATE POLICY "Users can delete own AI images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'ai-generated-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Service role can manage all
DROP POLICY IF EXISTS "Service role can manage all AI images" ON storage.objects;
CREATE POLICY "Service role can manage all AI images"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'ai-generated-images' AND
        auth.jwt()->>'role' = 'service_role'
    );

-- Comments
COMMENT ON TABLE storage.buckets IS 'Storage buckets for user-generated content';
