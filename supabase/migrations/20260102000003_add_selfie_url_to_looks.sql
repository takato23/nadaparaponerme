-- Migration: Add selfie_url to generated_looks
-- Created: 2026-01-02
-- Description: Store the original selfie URL for before/after comparison

-- Add selfie_url column
ALTER TABLE generated_looks ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- Add keep_pose and face_refs_used columns for metadata
ALTER TABLE generated_looks ADD COLUMN IF NOT EXISTS keep_pose BOOLEAN DEFAULT false;
ALTER TABLE generated_looks ADD COLUMN IF NOT EXISTS face_refs_used INTEGER DEFAULT 0;

-- Comment on columns
COMMENT ON COLUMN generated_looks.selfie_url IS 'URL of the original selfie used for generation (for before/after comparison)';
COMMENT ON COLUMN generated_looks.keep_pose IS 'Whether pose preservation was enabled during generation';
COMMENT ON COLUMN generated_looks.face_refs_used IS 'Number of face reference photos used during generation';
