BEGIN;

CREATE TABLE IF NOT EXISTS public.activity_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.activity_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_comment_likes_unique UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_comment
  ON public.activity_comment_likes(comment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_user
  ON public.activity_comment_likes(user_id, created_at DESC);

ALTER TABLE public.activity_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read comment likes" ON public.activity_comment_likes;
CREATE POLICY "Users can read comment likes"
  ON public.activity_comment_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert own comment likes" ON public.activity_comment_likes;
CREATE POLICY "Users can insert own comment likes"
  ON public.activity_comment_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comment likes" ON public.activity_comment_likes;
CREATE POLICY "Users can delete own comment likes"
  ON public.activity_comment_likes FOR DELETE
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.toggle_activity_comment_like(
  p_comment_id UUID
)
RETURNS TABLE (
  is_active BOOLEAN,
  likes_count INTEGER
) AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
  v_likes INTEGER;
  v_is_active BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.activity_comments c
    WHERE c.id = p_comment_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  SELECT acl.id
  INTO v_existing_id
  FROM public.activity_comment_likes acl
  WHERE acl.comment_id = p_comment_id
    AND acl.user_id = v_user_id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.activity_comment_likes AS acl (comment_id, user_id)
    VALUES (p_comment_id, v_user_id);
    v_is_active := true;
  ELSE
    DELETE FROM public.activity_comment_likes acl
    WHERE acl.id = v_existing_id;
    v_is_active := false;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_likes
  FROM public.activity_comment_likes acl
  WHERE acl.comment_id = p_comment_id;

  RETURN QUERY SELECT v_is_active, v_likes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
