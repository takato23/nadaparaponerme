-- Reposition reusable looks as the primary product entity.
-- Adds richer context metadata to outfits and links premium generated renders back to outfits.

ALTER TABLE public.outfits
  ADD COLUMN IF NOT EXISTS source TEXT
    CHECK (source IN ('manual', 'ai_recommendation', 'planner', 'community_import')),
  ADD COLUMN IF NOT EXISTS style_notes TEXT,
  ADD COLUMN IF NOT EXISTS weather_context TEXT,
  ADD COLUMN IF NOT EXISTS chat_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS hero_item_id UUID REFERENCES public.clothing_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS context_json JSONB DEFAULT '{}'::jsonb;

UPDATE public.outfits
SET source = CASE
  WHEN ai_generated THEN 'ai_recommendation'
  ELSE 'manual'
END
WHERE source IS NULL;

ALTER TABLE public.generated_looks
  ADD COLUMN IF NOT EXISTS outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outfits_user_source_created
  ON public.outfits(user_id, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_looks_outfit_id
  ON public.generated_looks(outfit_id)
  WHERE outfit_id IS NOT NULL;
