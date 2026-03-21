BEGIN;

DROP FUNCTION IF EXISTS public.create_activity_comment(UUID, UUID, TEXT);

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

  INSERT INTO public.activity_comments AS ac (
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
  RETURNING ac.id INTO v_comment_id;

  UPDATE public.activity_feed AS af
  SET metadata = jsonb_set(
    COALESCE(af.metadata, '{}'::jsonb),
    '{comments_count}',
    to_jsonb(COALESCE((af.metadata->>'comments_count')::INTEGER, 0) + 1),
    true
  )
  WHERE af.id = p_activity_id;

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
  WHERE c.id = v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
