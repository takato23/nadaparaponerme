-- Outfit-level public sharing + library metadata backfill

ALTER TABLE public.outfits
  ADD COLUMN IF NOT EXISTS share_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outfits_share_token_unique
  ON public.outfits(share_token)
  WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outfits_public_share_lookup
  ON public.outfits(is_public, share_token)
  WHERE is_public = true AND share_token IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'generated_looks'
      AND column_name = 'outfit_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.outfits o
      SET cover_image_url = sub.image_url
      FROM (
        SELECT DISTINCT ON (g.outfit_id) g.outfit_id, g.image_url
        FROM public.generated_looks g
        WHERE g.outfit_id IS NOT NULL
        ORDER BY g.outfit_id, g.created_at DESC
      ) sub
      WHERE o.id = sub.outfit_id
        AND o.cover_image_url IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'outfits'
      AND column_name = 'tags'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'outfits'
      AND column_name = 'context_json'
  ) THEN
    EXECUTE $sql$
      UPDATE public.outfits
      SET tags = COALESCE(tags, CASE
        WHEN context_json ? 'tags' AND jsonb_typeof(context_json->'tags') = 'array'
          THEN ARRAY(
            SELECT jsonb_array_elements_text(context_json->'tags')
          )
        ELSE '{}'::TEXT[]
      END)
      WHERE tags IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'outfits'
      AND column_name = 'reference_summary'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'outfits'
      AND column_name = 'context_json'
  ) THEN
    EXECUTE $sql$
      UPDATE public.outfits
      SET reference_summary = COALESCE(
        reference_summary,
        NULLIF(TRIM(COALESCE(context_json->>'reference_summary', '')), '')
      )
      WHERE reference_summary IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clothing_items'
      AND column_name = 'normalized_image_url'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clothing_items'
      AND column_name = 'normalization_status'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clothing_items'
      AND column_name = 'normalization_mode'
  ) THEN
    EXECUTE $sql$
      UPDATE public.clothing_items
      SET normalization_status = COALESCE(normalization_status, CASE
        WHEN normalized_image_url IS NOT NULL THEN 'ready'
        ELSE 'pending'
      END),
      normalization_mode = COALESCE(normalization_mode, CASE
        WHEN normalized_image_url IS NOT NULL THEN 'local_white_background'
        ELSE 'none'
      END)
    $sql$;
  END IF;
END $$;
