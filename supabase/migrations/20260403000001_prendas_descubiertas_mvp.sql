-- MVP Prendas Descubiertas
-- - linked/copy source model for clothing_items
-- - activity feed types + visibility-aware feed
-- - insert policy for authenticated self-activity

BEGIN;

-- =====================================================
-- clothing_items: linked/copy + source_ref
-- =====================================================

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS link_mode TEXT NOT NULL DEFAULT 'copy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clothing_items_link_mode_check'
      AND conrelid = 'public.clothing_items'::regclass
  ) THEN
    ALTER TABLE public.clothing_items
      ADD CONSTRAINT clothing_items_link_mode_check
      CHECK (link_mode IN ('copy', 'linked'));
  END IF;
END $$;

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS source_ref JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_clothing_items_source_ref_gin
  ON public.clothing_items USING GIN (source_ref);

-- =====================================================
-- activity_feed: align activity types used by UI
-- =====================================================

ALTER TABLE public.activity_feed
  DROP CONSTRAINT IF EXISTS valid_activity_type;

ALTER TABLE public.activity_feed
  ADD CONSTRAINT valid_activity_type CHECK (
    activity_type IN (
      'like',
      'comment',
      'follow',
      'borrow_request',
      'borrow_approved',
      'borrow_declined',
      'item_returned',
      'outfit_shared',
      'item_added',
      'challenge_completed',
      'outfit_saved',
      'capsule_created',
      'style_milestone',
      'lookbook_created',
      'rating_given'
    )
  );

-- =====================================================
-- activity_feed RLS: authenticated self-insert
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own activity feed" ON public.activity_feed;
CREATE POLICY "Users can insert own activity feed"
  ON public.activity_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND actor_id = auth.uid()
  );

-- =====================================================
-- get_user_feed: visibility-aware filters
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_feed(
  p_user_id UUID,
  p_filter_type TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_target_actor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  actor_id UUID,
  activity_type TEXT,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  actor_username TEXT,
  actor_avatar TEXT,
  actor_display_name TEXT
) AS $$
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF p_target_actor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles prof
      WHERE prof.id = p_target_actor_id
        AND (
          prof.is_public = true
          OR prof.id = p_user_id
          OR EXISTS (
            SELECT 1
            FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = p_user_id AND f.addressee_id = prof.id)
                OR (f.addressee_id = p_user_id AND f.requester_id = prof.id)
              )
          )
        )
    ) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    af.id,
    af.user_id,
    af.actor_id,
    af.activity_type,
    af.target_type,
    af.target_id,
    af.metadata,
    af.created_at,
    p.username AS actor_username,
    p.avatar_url AS actor_avatar,
    p.display_name AS actor_display_name
  FROM public.activity_feed af
  JOIN public.profiles p ON af.actor_id = p.id
  WHERE
    (p_target_actor_id IS NULL OR af.actor_id = p_target_actor_id)
    AND (
      CASE
        WHEN p_filter_type = 'community' THEN
          COALESCE(NULLIF(af.metadata->>'visibility', ''), 'friends') = 'community'

        WHEN p_target_actor_id IS NOT NULL THEN
          af.actor_id = p_user_id
          OR (
            COALESCE(NULLIF(af.metadata->>'visibility', ''), 'friends') = 'community'
          )
          OR (
            COALESCE(NULLIF(af.metadata->>'visibility', ''), 'friends') = 'friends'
            AND EXISTS (
              SELECT 1
              FROM public.friendships f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = p_user_id AND f.addressee_id = af.actor_id)
                  OR (f.addressee_id = p_user_id AND f.requester_id = af.actor_id)
                )
            )
          )

        WHEN p_filter_type = 'close_friends' THEN
          af.actor_id = p_user_id
          OR (
            af.actor_id IN (
              SELECT cf.friend_id
              FROM public.close_friends cf
              WHERE cf.user_id = p_user_id
            )
            AND COALESCE(NULLIF(af.metadata->>'visibility', ''), 'friends') = 'friends'
          )

        WHEN p_filter_type = 'all' THEN
          af.actor_id = p_user_id
          OR (
            COALESCE(NULLIF(af.metadata->>'visibility', ''), 'friends') = 'friends'
            AND EXISTS (
              SELECT 1
              FROM public.friendships f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = p_user_id AND f.addressee_id = af.actor_id)
                  OR (f.addressee_id = p_user_id AND f.requester_id = af.actor_id)
                )
            )
          )

        ELSE true
      END
    )
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_feed(
  p_user_id UUID,
  p_filter_type TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  actor_id UUID,
  activity_type TEXT,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  actor_username TEXT,
  actor_avatar TEXT,
  actor_display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_user_feed(p_user_id, p_filter_type, p_limit, p_offset, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
