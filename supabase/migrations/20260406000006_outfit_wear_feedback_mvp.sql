-- =====================================================
-- Outfit wear feedback MVP
-- =====================================================

CREATE TABLE IF NOT EXISTS public.outfit_wear_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  confidence_positive BOOLEAN,
  comfort_positive BOOLEAN,
  skip_reason TEXT,
  source_surface TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT outfit_wear_feedback_status_check
    CHECK (status IN ('worn', 'not_worn')),
  CONSTRAINT outfit_wear_feedback_skip_reason_check
    CHECK (skip_reason IS NULL OR skip_reason IN ('weather', 'comfort', 'occasion', 'changed_mind')),
  CONSTRAINT outfit_wear_feedback_source_surface_check
    CHECK (source_surface IN ('home', 'planner')),
  CONSTRAINT outfit_wear_feedback_worn_signals_check
    CHECK (
      (status = 'worn' AND skip_reason IS NULL)
      OR (status = 'not_worn' AND confidence_positive IS NULL AND comfort_positive IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_outfit_wear_feedback_user_date_outfit
  ON public.outfit_wear_feedback(user_id, date, outfit_id);

CREATE INDEX IF NOT EXISTS idx_outfit_wear_feedback_user_date
  ON public.outfit_wear_feedback(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_outfit_wear_feedback_user_status
  ON public.outfit_wear_feedback(user_id, status, date DESC);

ALTER TABLE public.outfit_wear_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own outfit wear feedback" ON public.outfit_wear_feedback;
CREATE POLICY "Users can read own outfit wear feedback"
  ON public.outfit_wear_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own outfit wear feedback" ON public.outfit_wear_feedback;
CREATE POLICY "Users can insert own outfit wear feedback"
  ON public.outfit_wear_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own outfit wear feedback" ON public.outfit_wear_feedback;
CREATE POLICY "Users can update own outfit wear feedback"
  ON public.outfit_wear_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own outfit wear feedback" ON public.outfit_wear_feedback;
CREATE POLICY "Users can delete own outfit wear feedback"
  ON public.outfit_wear_feedback FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS trigger_outfit_wear_feedback_updated_at ON public.outfit_wear_feedback;
    CREATE TRIGGER trigger_outfit_wear_feedback_updated_at
      BEFORE UPDATE ON public.outfit_wear_feedback
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;
