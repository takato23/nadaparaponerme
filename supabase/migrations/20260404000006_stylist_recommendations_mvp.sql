-- =====================================================
-- Chat stylist wardrobe recommendations (MVP)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stylist_item_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  thread_id TEXT,
  reason TEXT NOT NULL,
  score_total NUMERIC NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stylist_item_recommendations_status_check
    CHECK (status IN ('active', 'dismissed', 'applied', 'expired')),
  CONSTRAINT stylist_item_recommendations_score_total_check
    CHECK (score_total >= 0 AND score_total <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stylist_item_recommendations_active_user
  ON public.stylist_item_recommendations(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_stylist_item_recommendations_user_created
  ON public.stylist_item_recommendations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stylist_item_recommendations_user_status_expires
  ON public.stylist_item_recommendations(user_id, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.stylist_recommendation_blocks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  block_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_stylist_recommendation_blocks_user_until
  ON public.stylist_recommendation_blocks(user_id, block_until DESC);

ALTER TABLE public.stylist_item_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stylist_recommendation_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own stylist item recommendations" ON public.stylist_item_recommendations;
CREATE POLICY "Users can read own stylist item recommendations"
  ON public.stylist_item_recommendations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stylist item recommendations" ON public.stylist_item_recommendations;
CREATE POLICY "Users can insert own stylist item recommendations"
  ON public.stylist_item_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stylist item recommendations" ON public.stylist_item_recommendations;
CREATE POLICY "Users can update own stylist item recommendations"
  ON public.stylist_item_recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stylist item recommendations" ON public.stylist_item_recommendations;
CREATE POLICY "Users can delete own stylist item recommendations"
  ON public.stylist_item_recommendations FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own stylist recommendation blocks" ON public.stylist_recommendation_blocks;
CREATE POLICY "Users can read own stylist recommendation blocks"
  ON public.stylist_recommendation_blocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stylist recommendation blocks" ON public.stylist_recommendation_blocks;
CREATE POLICY "Users can insert own stylist recommendation blocks"
  ON public.stylist_recommendation_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stylist recommendation blocks" ON public.stylist_recommendation_blocks;
CREATE POLICY "Users can update own stylist recommendation blocks"
  ON public.stylist_recommendation_blocks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stylist recommendation blocks" ON public.stylist_recommendation_blocks;
CREATE POLICY "Users can delete own stylist recommendation blocks"
  ON public.stylist_recommendation_blocks FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS trigger_stylist_item_recommendations_updated_at ON public.stylist_item_recommendations;
    CREATE TRIGGER trigger_stylist_item_recommendations_updated_at
      BEFORE UPDATE ON public.stylist_item_recommendations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    DROP TRIGGER IF EXISTS trigger_stylist_recommendation_blocks_updated_at ON public.stylist_recommendation_blocks;
    CREATE TRIGGER trigger_stylist_recommendation_blocks_updated_at
      BEFORE UPDATE ON public.stylist_recommendation_blocks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;
