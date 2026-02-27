-- Migration: Generated Looks sharing hardening
-- Date: 2026-03-20
-- Purpose:
-- - Persist deterministic storage paths for generated looks
-- - Make generated-looks bucket private and remove global public storage reads
-- - Enforce token/path consistency for shared rows
-- - Add orphan cleanup helper for eventual maintenance

-- 1) Ensure deterministic storage path is stored
ALTER TABLE generated_looks
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Revoke legacy invalid public rows after switching sharing contract.
UPDATE generated_looks
SET is_public = false,
    share_token = NULL
WHERE is_public = true
  AND (share_token IS NULL OR share_token !~ '^[a-f0-9]{48}$');

-- Clean any malformed share token value globally so there are no accidental public links
-- outside the controlled sharing flow.
UPDATE generated_looks
SET share_token = NULL
WHERE share_token IS NOT NULL
  AND share_token !~ '^[a-f0-9]{48}$';

-- Ensure share state is only enabled together with a valid token.
ALTER TABLE generated_looks
DROP CONSTRAINT IF EXISTS generated_looks_public_share_token_check;

ALTER TABLE generated_looks
ADD CONSTRAINT generated_looks_public_share_token_check
  CHECK (
    COALESCE(is_public, false) = false
    OR (share_token ~ '^[a-f0-9]{48}$')
  );

CREATE INDEX IF NOT EXISTS idx_generated_looks_storage_path
  ON generated_looks (storage_path)
  WHERE storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generated_looks_share_public_lookup
  ON generated_looks (is_public, share_token)
  WHERE is_public = true AND share_token IS NOT NULL;

-- Backward-compatible fallback for legacy rows stored as a single path string.
UPDATE generated_looks
SET storage_path = COALESCE(
  storage_path,
  NULLIF(split_part(image_url, '/storage/v1/object/public/generated-looks/', 2), ''),
  NULLIF(split_part(image_url, '/storage/v1/object/sign/generated-looks/', 2), ''),
  NULLIF(split_part(image_url, '/generated-looks/', 2), ''),
  NULLIF(split_part(image_url, '?', 1), '')
)
WHERE storage_path IS NULL;

-- 2) Storage bucket hardening
UPDATE storage.buckets
SET public = false
WHERE id = 'generated-looks';

DROP POLICY IF EXISTS "Public read access for generated looks" ON storage.objects;
DROP POLICY IF EXISTS "Users can read generated looks" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own generated looks" ON storage.objects;

CREATE POLICY "Users can read own generated looks"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'generated-looks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Public row access must be token-gated at API boundary
DROP POLICY IF EXISTS "Anyone can view public looks" ON generated_looks;

-- 4) Helpers for deterministic path and orphan cleanup
CREATE OR REPLACE FUNCTION public.get_generated_look_storage_path(
  p_image_url TEXT,
  p_storage_path TEXT
) RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT COALESCE(
    NULLIF(split_part(p_storage_path, '?', 1), ''),
    NULLIF(split_part(p_image_url, '/storage/v1/object/public/generated-looks/', 2), ''),
    NULLIF(split_part(p_image_url, '/storage/v1/object/sign/generated-looks/', 2), ''),
    NULLIF(split_part(p_image_url, '/generated-looks/', 2), ''),
    NULLIF(split_part(p_image_url, '?', 1), '')
  );
$$;

COMMENT ON FUNCTION public.get_generated_look_storage_path(TEXT, TEXT) IS
  'Normalize a generated_looks storage path from storage_path or image_url.';

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_generated_looks_storage(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_limit INTEGER DEFAULT 500
) RETURNS TABLE (
  orphan_count INTEGER,
  deleted_count INTEGER,
  deleted_paths TEXT[]
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_limit INTEGER;
  v_paths TEXT[];
BEGIN
  v_limit := GREATEST(COALESCE(p_limit, 500), 1);

  WITH orphan_paths AS (
    SELECT o.name
    FROM storage.objects o
    WHERE
      o.bucket_id = 'generated-looks'
      AND NOT EXISTS (
        SELECT 1
        FROM generated_looks g
        WHERE public.get_generated_look_storage_path(g.image_url, g.storage_path) = o.name
      )
    ORDER BY o.created_at DESC
    LIMIT v_limit
  )
  SELECT COALESCE(array_agg(name), ARRAY[]::TEXT[]) INTO v_paths
  FROM orphan_paths;

  orphan_count := COALESCE(array_length(v_paths, 1), 0);
  deleted_paths := v_paths;

  IF p_dry_run OR orphan_count = 0 THEN
    deleted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM storage.objects o
  USING unnest(v_paths) AS x(path)
  WHERE o.bucket_id = 'generated-looks'
    AND o.name = x.path;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cleanup_orphaned_generated_looks_storage(BOOLEAN, INTEGER) IS
  'List and optionally delete orphaned objects in generated-looks storage (eventual consistency cleanup).';
