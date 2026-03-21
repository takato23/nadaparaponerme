BEGIN;

-- =====================================================
-- Baseline safety: ensure columns used by social import flows exist
-- =====================================================

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'owned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clothing_items_status_check'
      AND conrelid = 'public.clothing_items'::regclass
  ) THEN
    ALTER TABLE public.clothing_items
      ADD CONSTRAINT clothing_items_status_check
      CHECK (status IN ('owned', 'wishlist', 'virtual'));
  END IF;
END;
$$;

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
END;
$$;

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS source_ref JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_clothing_items_source_ref_gin
  ON public.clothing_items USING GIN (source_ref);

-- =====================================================
-- Followers graph
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> followee_id),
  CONSTRAINT user_follows_status_check CHECK (status IN ('active', 'blocked')),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON public.user_follows(followee_id, status, created_at DESC);

-- =====================================================
-- Blocks
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id, created_at DESC);

-- =====================================================
-- Activity comments (threaded)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID NULL REFERENCES public.activity_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT activity_comments_content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT activity_comments_content_len CHECK (char_length(content) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_created
  ON public.activity_comments(activity_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_comments_parent
  ON public.activity_comments(parent_comment_id)
  WHERE deleted_at IS NULL;

-- =====================================================
-- Activity reactions (like/share)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_reactions_type_check CHECK (reaction_type IN ('like', 'share')),
  CONSTRAINT activity_reactions_unique UNIQUE (activity_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_reactions_activity ON public.activity_reactions(activity_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_activity_reactions_user ON public.activity_reactions(user_id, created_at DESC);

-- =====================================================
-- Social notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.social_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_notifications_event_type_check CHECK (
    event_type IN (
      'follow',
      'post_like',
      'post_comment',
      'comment_reply',
      'post_shared',
      'challenge_invite',
      'challenge_voted',
      'report_status'
    )
  ),
  CONSTRAINT social_notifications_entity_type_check CHECK (
    entity_type IN ('activity', 'comment', 'challenge', 'profile')
  )
);

CREATE INDEX IF NOT EXISTS idx_social_notifications_user_unread
  ON public.social_notifications(user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_notifications_actor
  ON public.social_notifications(actor_id, created_at DESC);

-- =====================================================
-- Moderation reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_reports_target_type_check CHECK (target_type IN ('activity', 'comment', 'profile')),
  CONSTRAINT content_reports_reason_check CHECK (reason IN ('spam', 'abuse', 'sexual', 'copyright', 'other')),
  CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  CONSTRAINT content_reports_unique UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_id, created_at DESC);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follows involving them" ON public.user_follows;
CREATE POLICY "Users can view follows involving them"
  ON public.user_follows FOR SELECT
  USING (follower_id = auth.uid() OR followee_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own follows" ON public.user_follows;
CREATE POLICY "Users can insert own follows"
  ON public.user_follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own follows" ON public.user_follows;
CREATE POLICY "Users can update own follows"
  ON public.user_follows FOR UPDATE
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own follows" ON public.user_follows;
CREATE POLICY "Users can delete own follows"
  ON public.user_follows FOR DELETE
  USING (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own blocks" ON public.user_blocks;
CREATE POLICY "Users can insert own blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete own blocks"
  ON public.user_blocks FOR DELETE
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can read visible activity comments" ON public.activity_comments;
CREATE POLICY "Users can read visible activity comments"
  ON public.activity_comments FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own activity comments" ON public.activity_comments;
CREATE POLICY "Users can insert own activity comments"
  ON public.activity_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own activity comments" ON public.activity_comments;
CREATE POLICY "Users can update own activity comments"
  ON public.activity_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own activity comments" ON public.activity_comments;
CREATE POLICY "Users can delete own activity comments"
  ON public.activity_comments FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can read own activity reactions"
  ON public.activity_reactions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can insert own activity reactions"
  ON public.activity_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can delete own activity reactions"
  ON public.activity_reactions FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own social notifications" ON public.social_notifications;
CREATE POLICY "Users can read own social notifications"
  ON public.social_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own social notifications" ON public.social_notifications;
CREATE POLICY "Users can update own social notifications"
  ON public.social_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert social notifications" ON public.social_notifications;
CREATE POLICY "Users can insert social notifications"
  ON public.social_notifications FOR INSERT
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own content reports" ON public.content_reports;
CREATE POLICY "Users can insert own content reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own content reports" ON public.content_reports;
CREATE POLICY "Users can read own content reports"
  ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- =====================================================
-- Helper functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_blocked_pair(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE (ub.blocker_id = p_user_a AND ub.blocked_id = p_user_b)
       OR (ub.blocker_id = p_user_b AND ub.blocked_id = p_user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.normalize_visibility(p_metadata JSONB)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  v_value := COALESCE(NULLIF(p_metadata->>'visibility', ''), 'followers');
  IF v_value = 'community' THEN
    RETURN 'community';
  END IF;

  IF v_value = 'friends' THEN
    RETURN 'followers';
  END IF;

  RETURN 'followers';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Feed visibility by followers/community + blocks
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
  JOIN public.profiles p ON p.id = af.actor_id
  WHERE
    (p_target_actor_id IS NULL OR af.actor_id = p_target_actor_id)
    AND NOT public.is_blocked_pair(p_user_id, af.actor_id)
    AND (
      CASE
        WHEN p_filter_type = 'community' THEN
          public.normalize_visibility(af.metadata) = 'community'

        WHEN p_filter_type = 'close_friends' THEN
          af.actor_id = p_user_id
          OR (
            af.actor_id IN (
              SELECT cf.friend_id
              FROM public.close_friends cf
              WHERE cf.user_id = p_user_id
            )
            AND public.normalize_visibility(af.metadata) = 'followers'
          )
          OR public.normalize_visibility(af.metadata) = 'community'

        ELSE
          af.actor_id = p_user_id
          OR public.normalize_visibility(af.metadata) = 'community'
          OR (
            public.normalize_visibility(af.metadata) = 'followers'
            AND EXISTS (
              SELECT 1
              FROM public.user_follows uf
              WHERE uf.follower_id = p_user_id
                AND uf.followee_id = af.actor_id
                AND uf.status = 'active'
            )
          )
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

-- =====================================================
-- Comments RPCs
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_activity_comments(
  p_activity_id UUID
)
RETURNS TABLE (
  id UUID,
  activity_id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  content TEXT,
  parent_comment_id UUID,
  replies_count INTEGER,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.activity_id,
    c.user_id,
    COALESCE(pr.display_name, pr.username, 'Usuario') AS user_name,
    pr.avatar_url AS user_avatar,
    c.content,
    c.parent_comment_id,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.activity_comments child
      WHERE child.parent_comment_id = c.id
        AND child.deleted_at IS NULL
    ) AS replies_count,
    c.created_at,
    c.deleted_at
  FROM public.activity_comments c
  LEFT JOIN public.profiles pr ON pr.id = c.user_id
  WHERE c.activity_id = p_activity_id
    AND c.deleted_at IS NULL
    AND NOT public.is_blocked_pair(v_current_user, c.user_id)
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_activity_comment(
  p_activity_id UUID,
  p_parent_comment_id UUID DEFAULT NULL,
  p_content TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  activity_id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  content TEXT,
  parent_comment_id UUID,
  replies_count INTEGER,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_actor_id UUID;
  v_trimmed_content TEXT;
  v_comment_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_trimmed_content := trim(COALESCE(p_content, ''));
  IF char_length(v_trimmed_content) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty';
  END IF;

  IF char_length(v_trimmed_content) > 500 THEN
    RAISE EXCEPTION 'Comment too long';
  END IF;

  SELECT af.actor_id
  INTO v_actor_id
  FROM public.activity_feed af
  WHERE af.id = p_activity_id;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  IF public.is_blocked_pair(v_user_id, v_actor_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.activity_comments c
      WHERE c.id = p_parent_comment_id
        AND c.activity_id = p_activity_id
        AND c.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Parent comment not found';
    END IF;
  END IF;

  INSERT INTO public.activity_comments (
    activity_id,
    user_id,
    parent_comment_id,
    content
  ) VALUES (
    p_activity_id,
    v_user_id,
    p_parent_comment_id,
    v_trimmed_content
  )
  RETURNING activity_comments.id INTO v_comment_id;

  UPDATE public.activity_feed
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{comments_count}',
    to_jsonb(COALESCE((metadata->>'comments_count')::INTEGER, 0) + 1),
    true
  )
  WHERE id = p_activity_id;

  IF v_actor_id <> v_user_id THEN
    INSERT INTO public.social_notifications (
      user_id,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_actor_id,
      v_user_id,
      CASE WHEN p_parent_comment_id IS NULL THEN 'post_comment' ELSE 'comment_reply' END,
      CASE WHEN p_parent_comment_id IS NULL THEN 'activity' ELSE 'comment' END,
      COALESCE(p_parent_comment_id, p_activity_id),
      jsonb_build_object(
        'activity_id', p_activity_id,
        'comment_preview', left(v_trimmed_content, 120)
      )
    );
  END IF;

  RETURN QUERY
  SELECT gac.*
  FROM public.get_activity_comments(p_activity_id) gac
  WHERE gac.id = v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Reactions RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.toggle_activity_reaction(
  p_activity_id UUID,
  p_reaction_type TEXT
)
RETURNS TABLE (
  is_active BOOLEAN,
  likes_count INTEGER,
  shares_count INTEGER
) AS $$
DECLARE
  v_user_id UUID;
  v_actor_id UUID;
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_likes INTEGER;
  v_shares INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reaction_type NOT IN ('like', 'share') THEN
    RAISE EXCEPTION 'Invalid reaction';
  END IF;

  SELECT af.actor_id INTO v_actor_id
  FROM public.activity_feed af
  WHERE af.id = p_activity_id;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  SELECT ar.id INTO v_existing_id
  FROM public.activity_reactions ar
  WHERE ar.activity_id = p_activity_id
    AND ar.user_id = v_user_id
    AND ar.reaction_type = p_reaction_type
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.activity_reactions(activity_id, user_id, reaction_type)
    VALUES (p_activity_id, v_user_id, p_reaction_type);
    v_is_active := true;
  ELSE
    DELETE FROM public.activity_reactions WHERE id = v_existing_id;
    v_is_active := false;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN ar.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN ar.reaction_type = 'share' THEN 1 ELSE 0 END), 0)::INTEGER
  INTO v_likes, v_shares
  FROM public.activity_reactions ar
  WHERE ar.activity_id = p_activity_id;

  UPDATE public.activity_feed
  SET metadata = jsonb_set(
    jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{likes_count}',
      to_jsonb(v_likes),
      true
    ),
    '{shares_count}',
    to_jsonb(v_shares),
    true
  )
  WHERE id = p_activity_id;

  IF v_is_active AND v_actor_id <> v_user_id THEN
    INSERT INTO public.social_notifications (
      user_id,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_actor_id,
      v_user_id,
      CASE WHEN p_reaction_type = 'like' THEN 'post_like' ELSE 'post_shared' END,
      'activity',
      p_activity_id,
      jsonb_build_object('reaction_type', p_reaction_type)
    );
  END IF;

  RETURN QUERY SELECT v_is_active, v_likes, v_shares;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Notifications RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_social_notifications(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  actor_id UUID,
  actor_username TEXT,
  actor_display_name TEXT,
  actor_avatar TEXT,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    sn.id,
    sn.user_id,
    sn.actor_id,
    p.username,
    p.display_name,
    p.avatar_url,
    sn.event_type,
    sn.entity_type,
    sn.entity_id,
    sn.metadata,
    sn.read_at,
    sn.created_at
  FROM public.social_notifications sn
  LEFT JOIN public.profiles p ON p.id = sn.actor_id
  WHERE sn.user_id = v_user_id
    AND (NOT p_unread_only OR sn.read_at IS NULL)
  ORDER BY sn.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 30), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_social_notifications_read(
  p_ids UUID[] DEFAULT NULL,
  p_mark_all BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_mark_all THEN
    UPDATE public.social_notifications sn
    SET read_at = NOW()
    WHERE sn.user_id = v_user_id
      AND sn.read_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.social_notifications sn
  SET read_at = NOW()
  WHERE sn.user_id = v_user_id
    AND sn.read_at IS NULL
    AND sn.id = ANY(p_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Follow graph RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.follow_user(
  p_target_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  IF public.is_blocked_pair(v_user_id, p_target_user_id) THEN
    RAISE EXCEPTION 'Follow blocked by privacy settings';
  END IF;

  INSERT INTO public.user_follows (follower_id, followee_id, status)
  VALUES (v_user_id, p_target_user_id, 'active')
  ON CONFLICT (follower_id, followee_id)
  DO UPDATE SET status = 'active', updated_at = NOW();

  INSERT INTO public.social_notifications (
    user_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  SELECT
    p_target_user_id,
    v_user_id,
    'follow',
    'profile',
    p_target_user_id,
    '{}'::jsonb
  WHERE p_target_user_id <> v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.unfollow_user(
  p_target_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_follows
  WHERE follower_id = v_user_id
    AND followee_id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_profile_social_summary(
  p_profile_id UUID
)
RETURNS TABLE (
  followers_count INTEGER,
  following_count INTEGER,
  is_following BOOLEAN,
  is_followed_by BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    (
      SELECT COUNT(*)::INTEGER
      FROM public.user_follows uf
      WHERE uf.followee_id = p_profile_id
        AND uf.status = 'active'
    ) AS followers_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.user_follows uf
      WHERE uf.follower_id = p_profile_id
        AND uf.status = 'active'
    ) AS following_count,
    EXISTS (
      SELECT 1
      FROM public.user_follows uf
      WHERE uf.follower_id = v_user_id
        AND uf.followee_id = p_profile_id
        AND uf.status = 'active'
    ) AS is_following,
    EXISTS (
      SELECT 1
      FROM public.user_follows uf
      WHERE uf.follower_id = p_profile_id
        AND uf.followee_id = v_user_id
        AND uf.status = 'active'
    ) AS is_followed_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Suggested users ranking (style affinity + mutuals + activity)
-- =====================================================
BEGIN;

-- =====================================================
-- Baseline safety: ensure columns used by social import flows exist
-- =====================================================

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'owned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clothing_items_status_check'
      AND conrelid = 'public.clothing_items'::regclass
  ) THEN
    ALTER TABLE public.clothing_items
      ADD CONSTRAINT clothing_items_status_check
      CHECK (status IN ('owned', 'wishlist', 'virtual'));
  END IF;
END;
$$;

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
END;
$$;

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS source_ref JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_clothing_items_source_ref_gin
  ON public.clothing_items USING GIN (source_ref);

-- =====================================================
-- Followers graph
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> followee_id),
  CONSTRAINT user_follows_status_check CHECK (status IN ('active', 'blocked')),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON public.user_follows(followee_id, status, created_at DESC);

-- =====================================================
-- Blocks
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id, created_at DESC);

-- =====================================================
-- Activity comments (threaded)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID NULL REFERENCES public.activity_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT activity_comments_content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT activity_comments_content_len CHECK (char_length(content) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_created
  ON public.activity_comments(activity_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_comments_parent
  ON public.activity_comments(parent_comment_id)
  WHERE deleted_at IS NULL;

-- =====================================================
-- Activity reactions (like/share)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_reactions_type_check CHECK (reaction_type IN ('like', 'share')),
  CONSTRAINT activity_reactions_unique UNIQUE (activity_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_reactions_activity ON public.activity_reactions(activity_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_activity_reactions_user ON public.activity_reactions(user_id, created_at DESC);

-- =====================================================
-- Social notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.social_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_notifications_event_type_check CHECK (
    event_type IN (
      'follow',
      'post_like',
      'post_comment',
      'comment_reply',
      'post_shared',
      'challenge_invite',
      'challenge_voted',
      'report_status'
    )
  ),
  CONSTRAINT social_notifications_entity_type_check CHECK (
    entity_type IN ('activity', 'comment', 'challenge', 'profile')
  )
);

CREATE INDEX IF NOT EXISTS idx_social_notifications_user_unread
  ON public.social_notifications(user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_notifications_actor
  ON public.social_notifications(actor_id, created_at DESC);

-- =====================================================
-- Moderation reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_reports_target_type_check CHECK (target_type IN ('activity', 'comment', 'profile')),
  CONSTRAINT content_reports_reason_check CHECK (reason IN ('spam', 'abuse', 'sexual', 'copyright', 'other')),
  CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  CONSTRAINT content_reports_unique UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_id, created_at DESC);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follows involving them" ON public.user_follows;
CREATE POLICY "Users can view follows involving them"
  ON public.user_follows FOR SELECT
  USING (follower_id = auth.uid() OR followee_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own follows" ON public.user_follows;
CREATE POLICY "Users can insert own follows"
  ON public.user_follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own follows" ON public.user_follows;
CREATE POLICY "Users can update own follows"
  ON public.user_follows FOR UPDATE
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own follows" ON public.user_follows;
CREATE POLICY "Users can delete own follows"
  ON public.user_follows FOR DELETE
  USING (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own blocks" ON public.user_blocks;
CREATE POLICY "Users can insert own blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete own blocks"
  ON public.user_blocks FOR DELETE
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can read visible activity comments" ON public.activity_comments;
CREATE POLICY "Users can read visible activity comments"
  ON public.activity_comments FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own activity comments" ON public.activity_comments;
CREATE POLICY "Users can insert own activity comments"
  ON public.activity_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own activity comments" ON public.activity_comments;
CREATE POLICY "Users can update own activity comments"
  ON public.activity_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own activity comments" ON public.activity_comments;
CREATE POLICY "Users can delete own activity comments"
  ON public.activity_comments FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can read own activity reactions"
  ON public.activity_reactions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can insert own activity reactions"
  ON public.activity_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can delete own activity reactions"
  ON public.activity_reactions FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own social notifications" ON public.social_notifications;
CREATE POLICY "Users can read own social notifications"
  ON public.social_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own social notifications" ON public.social_notifications;
CREATE POLICY "Users can update own social notifications"
  ON public.social_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert social notifications" ON public.social_notifications;
CREATE POLICY "Users can insert social notifications"
  ON public.social_notifications FOR INSERT
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own content reports" ON public.content_reports;
CREATE POLICY "Users can insert own content reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own content reports" ON public.content_reports;
CREATE POLICY "Users can read own content reports"
  ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- =====================================================
-- Helper functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_blocked_pair(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE (ub.blocker_id = p_user_a AND ub.blocked_id = p_user_b)
       OR (ub.blocker_id = p_user_b AND ub.blocked_id = p_user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.normalize_visibility(p_metadata JSONB)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  v_value := COALESCE(NULLIF(p_metadata->>'visibility', ''), 'followers');
  IF v_value = 'community' THEN
    RETURN 'community';
  END IF;

  IF v_value = 'friends' THEN
    RETURN 'followers';
  END IF;

  RETURN 'followers';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Feed visibility by followers/community + blocks
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
  JOIN public.profiles p ON p.id = af.actor_id
  WHERE
    (p_target_actor_id IS NULL OR af.actor_id = p_target_actor_id)
    AND NOT public.is_blocked_pair(p_user_id, af.actor_id)
    AND (
      CASE
        WHEN p_filter_type = 'community' THEN
          public.normalize_visibility(af.metadata) = 'community'

        WHEN p_filter_type = 'close_friends' THEN
          af.actor_id = p_user_id
          OR (
            af.actor_id IN (
              SELECT cf.friend_id
              FROM public.close_friends cf
              WHERE cf.user_id = p_user_id
            )
            AND public.normalize_visibility(af.metadata) = 'followers'
          )
          OR public.normalize_visibility(af.metadata) = 'community'

        ELSE
          af.actor_id = p_user_id
          OR public.normalize_visibility(af.metadata) = 'community'
          OR (
            public.normalize_visibility(af.metadata) = 'followers'
            AND EXISTS (
              SELECT 1
              FROM public.user_follows uf
              WHERE uf.follower_id = p_user_id
                AND uf.followee_id = af.actor_id
                AND uf.status = 'active'
            )
          )
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

-- =====================================================
-- Comments RPCs
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_activity_comments(
  p_activity_id UUID
)
RETURNS TABLE (
  id UUID,
  activity_id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  content TEXT,
  parent_comment_id UUID,
  replies_count INTEGER,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.activity_id,
    c.user_id,
    COALESCE(pr.display_name, pr.username, 'Usuario') AS user_name,
    pr.avatar_url AS user_avatar,
    c.content,
    c.parent_comment_id,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.activity_comments child
      WHERE child.parent_comment_id = c.id
        AND child.deleted_at IS NULL
    ) AS replies_count,
    c.created_at,
    c.deleted_at
  FROM public.activity_comments c
  LEFT JOIN public.profiles pr ON pr.id = c.user_id
  WHERE c.activity_id = p_activity_id
    AND c.deleted_at IS NULL
    AND NOT public.is_blocked_pair(v_current_user, c.user_id)
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_activity_comment(
  p_activity_id UUID,
  p_parent_comment_id UUID DEFAULT NULL,
  p_content TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  activity_id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  content TEXT,
  parent_comment_id UUID,
  replies_count INTEGER,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_actor_id UUID;
  v_trimmed_content TEXT;
  v_comment_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_trimmed_content := trim(COALESCE(p_content, ''));
  IF char_length(v_trimmed_content) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty';
  END IF;

  IF char_length(v_trimmed_content) > 500 THEN
    RAISE EXCEPTION 'Comment too long';
  END IF;

  SELECT af.actor_id
  INTO v_actor_id
  FROM public.activity_feed af
  WHERE af.id = p_activity_id;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  IF public.is_blocked_pair(v_user_id, v_actor_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.activity_comments c
      WHERE c.id = p_parent_comment_id
        AND c.activity_id = p_activity_id
        AND c.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Parent comment not found';
    END IF;
  END IF;

  INSERT INTO public.activity_comments (
    activity_id,
    user_id,
    parent_comment_id,
    content
  ) VALUES (
    p_activity_id,
    v_user_id,
    p_parent_comment_id,
    v_trimmed_content
  )
  RETURNING activity_comments.id INTO v_comment_id;

  UPDATE public.activity_feed
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{comments_count}',
    to_jsonb(COALESCE((metadata->>'comments_count')::INTEGER, 0) + 1),
    true
  )
  WHERE id = p_activity_id;

  IF v_actor_id <> v_user_id THEN
    INSERT INTO public.social_notifications (
      user_id,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_actor_id,
      v_user_id,
      CASE WHEN p_parent_comment_id IS NULL THEN 'post_comment' ELSE 'comment_reply' END,
      CASE WHEN p_parent_comment_id IS NULL THEN 'activity' ELSE 'comment' END,
      COALESCE(p_parent_comment_id, p_activity_id),
      jsonb_build_object(
        'activity_id', p_activity_id,
        'comment_preview', left(v_trimmed_content, 120)
      )
    );
  END IF;

  RETURN QUERY
  SELECT gac.*
  FROM public.get_activity_comments(p_activity_id) gac
  WHERE gac.id = v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Reactions RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.toggle_activity_reaction(
  p_activity_id UUID,
  p_reaction_type TEXT
)
RETURNS TABLE (
  is_active BOOLEAN,
  likes_count INTEGER,
  shares_count INTEGER
) AS $$
DECLARE
  v_user_id UUID;
  v_actor_id UUID;
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_likes INTEGER;
  v_shares INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reaction_type NOT IN ('like', 'share') THEN
    RAISE EXCEPTION 'Invalid reaction';
  END IF;

  SELECT af.actor_id INTO v_actor_id
  FROM public.activity_feed af
  WHERE af.id = p_activity_id;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  SELECT ar.id INTO v_existing_id
  FROM public.activity_reactions ar
  WHERE ar.activity_id = p_activity_id
    AND ar.user_id = v_user_id
    AND ar.reaction_type = p_reaction_type
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.activity_reactions(activity_id, user_id, reaction_type)
    VALUES (p_activity_id, v_user_id, p_reaction_type);
    v_is_active := true;
  ELSE
    DELETE FROM public.activity_reactions WHERE id = v_existing_id;
    v_is_active := false;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN ar.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN ar.reaction_type = 'share' THEN 1 ELSE 0 END), 0)::INTEGER
  INTO v_likes, v_shares
  FROM public.activity_reactions ar
  WHERE ar.activity_id = p_activity_id;

  UPDATE public.activity_feed
  SET metadata = jsonb_set(
    jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{likes_count}',
      to_jsonb(v_likes),
      true
    ),
    '{shares_count}',
    to_jsonb(v_shares),
    true
  )
  WHERE id = p_activity_id;

  IF v_is_active AND v_actor_id <> v_user_id THEN
    INSERT INTO public.social_notifications (
      user_id,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_actor_id,
      v_user_id,
      CASE WHEN p_reaction_type = 'like' THEN 'post_like' ELSE 'post_shared' END,
      'activity',
      p_activity_id,
      jsonb_build_object('reaction_type', p_reaction_type)
    );
  END IF;

  RETURN QUERY SELECT v_is_active, v_likes, v_shares;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Notifications RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_social_notifications(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  actor_id UUID,
  actor_username TEXT,
  actor_display_name TEXT,
  actor_avatar TEXT,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    sn.id,
    sn.user_id,
    sn.actor_id,
    p.username,
    p.display_name,
    p.avatar_url,
    sn.event_type,
    sn.entity_type,
    sn.entity_id,
    sn.metadata,
    sn.read_at,
    sn.created_at
  FROM public.social_notifications sn
  LEFT JOIN public.profiles p ON p.id = sn.actor_id
  WHERE sn.user_id = v_user_id
    AND (NOT p_unread_only OR sn.read_at IS NULL)
  ORDER BY sn.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 30), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_social_notifications_read(
  p_ids UUID[] DEFAULT NULL,
  p_mark_all BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_mark_all THEN
    UPDATE public.social_notifications sn
    SET read_at = NOW()
    WHERE sn.user_id = v_user_id
      AND sn.read_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.social_notifications sn
  SET read_at = NOW()
  WHERE sn.user_id = v_user_id
    AND sn.read_at IS NULL
    AND sn.id = ANY(p_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Follow graph RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.follow_user(
  p_target_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  IF public.is_blocked_pair(v_user_id, p_target_user_id) THEN
    RAISE EXCEPTION 'Follow blocked by privacy settings';
  END IF;

  INSERT INTO public.user_follows (follower_id, followee_id, status)
  VALUES (v_user_id, p_target_user_id, 'active')
  ON CONFLICT (follower_id, followee_id)
  DO UPDATE SET status = 'active', updated_at = NOW();

  INSERT INTO public.social_notifications (
    user_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  SELECT
    p_target_user_id,
    v_user_id,
    'follow',
    'profile',
    p_target_user_id,
    '{}'::jsonb
  WHERE p_target_user_id <> v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.unfollow_user(
  p_target_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_follows
  WHERE follower_id = v_user_id
    AND followee_id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_profile_social_summary(
  p_profile_id UUID
)
RETURNS TABLE (
  followers_count INTEGER,
  following_count INTEGER,
  is_following BOOLEAN,
  is_followed_by BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    (
      SELECT COUNT(*)::INTEGER
      FROM public.user_follows uf
      WHERE uf.followee_id = p_profile_id
        AND uf.status = 'active'
    ) AS followers_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.user_follows uf
      WHERE uf.follower_id = p_profile_id
        AND uf.status = 'active'
    ) AS following_count,
    EXISTS (
      SELECT 1
      FROM public.user_follows uf
      WHERE uf.follower_id = v_user_id
        AND uf.followee_id = p_profile_id
        AND uf.status = 'active'
    ) AS is_following,
    EXISTS (
      SELECT 1
      FROM public.user_follows uf
      WHERE uf.follower_id = p_profile_id
        AND uf.followee_id = v_user_id
        AND uf.status = 'active'
    ) AS is_followed_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Suggested users ranking (style affinity + mutuals + activity)
-- =====================================================

DROP FUNCTION IF EXISTS public.get_suggested_users(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_suggested_users(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  similarity_score FLOAT,
  common_preferences TEXT[],
  mutual_follows INTEGER,
  recent_activity_score FLOAT
) AS $$
DECLARE
  v_user_preferences JSONB;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT prof.style_preferences
  INTO v_user_preferences
  FROM public.profiles prof
  WHERE prof.id = p_user_id;

  IF v_user_preferences IS NULL THEN
    v_user_preferences := '[]'::jsonb;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      ARRAY(
        SELECT p_pref
        FROM jsonb_array_elements_text(COALESCE(p.style_preferences, '[]'::jsonb)) p_pref
        WHERE p_pref IN (
          SELECT jsonb_array_elements_text(COALESCE(v_user_preferences, '[]'::jsonb))
        )
      ) AS common_preferences,
      (
        SELECT COUNT(*)::INTEGER
        FROM public.user_follows mine
        JOIN public.user_follows theirs
          ON theirs.followee_id = mine.followee_id
         AND theirs.follower_id = p.id
         AND theirs.status = 'active'
        WHERE mine.follower_id = p_user_id
          AND mine.status = 'active'
      ) AS mutual_follows,
      (
        SELECT COUNT(*)::FLOAT
        FROM public.activity_feed af
        WHERE af.actor_id = p.id
          AND af.created_at >= NOW() - INTERVAL '30 days'
      ) AS recent_activity_score
    FROM public.profiles p
    WHERE p.id <> p_user_id
      AND p.is_public = true
      AND NOT public.is_blocked_pair(p_user_id, p.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_follows uf
        WHERE uf.follower_id = p_user_id
          AND uf.followee_id = p.id
          AND uf.status = 'active'
      )
  )
  SELECT
    c.id,
    c.username,
    c.display_name,
    c.avatar_url,
    (
      COALESCE(array_length(c.common_preferences, 1), 0)::FLOAT /
      GREATEST(jsonb_array_length(COALESCE(v_user_preferences, '[]'::jsonb)), 1)::FLOAT
    ) AS similarity_score,
    c.common_preferences,
    c.mutual_follows,
    c.recent_activity_score
  FROM candidates c
  ORDER BY
    similarity_score DESC,
    c.mutual_follows DESC,
    c.recent_activity_score DESC,
    random()
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;

DROP FUNCTION IF EXISTS public.get_suggested_users(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_suggested_users(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  similarity_score FLOAT,
  common_preferences TEXT[],
  mutual_follows INTEGER,
  recent_activity_score FLOAT
) AS $$
DECLARE
  v_user_preferences JSONB;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT prof.style_preferences
  INTO v_user_preferences
  FROM public.profiles prof
  WHERE prof.id = p_user_id;

  IF v_user_preferences IS NULL THEN
    v_user_preferences := '[]'::jsonb;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      ARRAY(
        SELECT p_pref
        FROM jsonb_array_elements_text(COALESCE(p.style_preferences, '[]'::jsonb)) p_pref
        WHERE p_pref IN (
          SELECT jsonb_array_elements_text(COALESCE(v_user_preferences, '[]'::jsonb))
        )
      ) AS common_preferences,
      (
        SELECT COUNT(*)::INTEGER
        FROM public.user_follows mine
        JOIN public.user_follows theirs
          ON theirs.followee_id = mine.followee_id
         AND theirs.follower_id = p.id
         AND theirs.status = 'active'
        WHERE mine.follower_id = p_user_id
          AND mine.status = 'active'
      ) AS mutual_follows,
      (
        SELECT COUNT(*)::FLOAT
        FROM public.activity_feed af
        WHERE af.actor_id = p.id
          AND af.created_at >= NOW() - INTERVAL '30 days'
      ) AS recent_activity_score
    FROM public.profiles p
    WHERE p.id <> p_user_id
      AND p.is_public = true
      AND NOT public.is_blocked_pair(p_user_id, p.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_follows uf
        WHERE uf.follower_id = p_user_id
          AND uf.followee_id = p.id
          AND uf.status = 'active'
      )
  )
  SELECT
    c.id,
    c.username,
    c.display_name,
    c.avatar_url,
    (
      COALESCE(array_length(c.common_preferences, 1), 0)::FLOAT /
      GREATEST(jsonb_array_length(COALESCE(v_user_preferences, '[]'::jsonb)), 1)::FLOAT
    ) AS similarity_score,
    c.common_preferences,
    c.mutual_follows,
    c.recent_activity_score
  FROM candidates c
  ORDER BY
    similarity_score DESC,
    c.mutual_follows DESC,
    c.recent_activity_score DESC,
    random()
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
