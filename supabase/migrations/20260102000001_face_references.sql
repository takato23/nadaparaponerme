-- Face References for Virtual Try-On Identity Preservation
-- Nano Banana Pro supports up to 5 identity references for better face consistency

-- Table to store user face reference photos
CREATE TABLE IF NOT EXISTS face_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    label TEXT DEFAULT 'Principal', -- 'Principal', 'Perfil', 'Sonrisa', etc.
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_face_references_user_id ON face_references(user_id);

-- Limit to max 3 face references per user
CREATE OR REPLACE FUNCTION check_face_reference_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM face_references WHERE user_id = NEW.user_id) >= 3 THEN
        RAISE EXCEPTION 'Maximum 3 face references allowed per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_face_reference_limit
    BEFORE INSERT ON face_references
    FOR EACH ROW
    EXECUTE FUNCTION check_face_reference_limit();

-- Ensure only one primary face reference per user
CREATE OR REPLACE FUNCTION ensure_single_primary_face()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE face_references
        SET is_primary = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_primary_face
    AFTER INSERT OR UPDATE ON face_references
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_face();

-- RLS Policies
ALTER TABLE face_references ENABLE ROW LEVEL SECURITY;

-- Users can only see their own face references
CREATE POLICY "Users can view own face references"
    ON face_references FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own face references
CREATE POLICY "Users can insert own face references"
    ON face_references FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own face references
CREATE POLICY "Users can update own face references"
    ON face_references FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own face references
CREATE POLICY "Users can delete own face references"
    ON face_references FOR DELETE
    USING (auth.uid() = user_id);

-- Storage bucket for face reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-references', 'face-references', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for face references bucket
CREATE POLICY "Users can upload own face references"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'face-references'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own face references storage"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'face-references'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own face references storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'face-references'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
