-- Unified look library folders + normalized clothing item variants

CREATE TABLE IF NOT EXISTS public.look_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_look_folders_user_sort
  ON public.look_folders(user_id, sort_order, created_at DESC);

ALTER TABLE public.look_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own look folders" ON public.look_folders;
CREATE POLICY "Users can view own look folders"
  ON public.look_folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own look folders" ON public.look_folders;
CREATE POLICY "Users can insert own look folders"
  ON public.look_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own look folders" ON public.look_folders;
CREATE POLICY "Users can update own look folders"
  ON public.look_folders FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own look folders" ON public.look_folders;
CREATE POLICY "Users can delete own look folders"
  ON public.look_folders FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trigger_look_folders_updated_at ON public.look_folders;
CREATE TRIGGER trigger_look_folders_updated_at
  BEFORE UPDATE ON public.look_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.outfits
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.look_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS reference_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_outfits_user_folder_created
  ON public.outfits(user_id, folder_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outfits_tags_gin
  ON public.outfits USING GIN (tags);

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS normalized_image_url TEXT,
  ADD COLUMN IF NOT EXISTS normalized_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS normalization_status TEXT
    CHECK (normalization_status IN ('pending', 'processing', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS normalization_mode TEXT
    CHECK (normalization_mode IN ('none', 'local_remove_background', 'local_white_background', 'premium_refine')),
  ADD COLUMN IF NOT EXISTS normalization_background TEXT
    CHECK (normalization_background IN ('transparent', 'white')),
  ADD COLUMN IF NOT EXISTS normalization_error TEXT;

UPDATE public.clothing_items
SET normalization_status = COALESCE(normalization_status, 'pending'),
    normalization_mode = COALESCE(normalization_mode, 'none');
