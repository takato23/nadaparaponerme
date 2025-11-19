-- =====================================================
-- MIGRATION: Community Feed Support
-- =====================================================

-- Update get_user_feed to support 'community' filter
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_filter_type TEXT DEFAULT 'all', -- 'all', 'close_friends', 'community'
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
  SELECT
    af.id,
    af.user_id,
    af.actor_id,
    af.activity_type,
    af.target_type,
    af.target_id,
    af.metadata,
    af.created_at,
    p.username as actor_username,
    p.avatar_url as actor_avatar,
    p.display_name as actor_display_name
  FROM activity_feed af
  JOIN profiles p ON af.actor_id = p.id
  WHERE
    CASE
      WHEN p_filter_type = 'close_friends' THEN
        af.actor_id IN (SELECT friend_id FROM close_friends WHERE close_friends.user_id = p_user_id)
      WHEN p_filter_type = 'community' THEN
        -- Show activities from members of communities I'm in (or specific community logic)
        -- For now, let's assume it shows activities tagged with a community_id in metadata
        -- OR activities from users in my communities (which might be too broad)
        -- Let's go with: Activities that are "posted to" a community (if we had that)
        -- OR for this implementation: Activities from users who are in the same communities as me
        af.actor_id IN (
          SELECT cm.user_id 
          FROM community_members cm
          WHERE cm.community_id IN (
            SELECT my_cm.community_id 
            FROM community_members my_cm 
            WHERE my_cm.user_id = p_user_id
          )
        )
      WHEN p_filter_type = 'all' THEN
        af.actor_id IN (
          SELECT addressee_id FROM friendships WHERE requester_id = p_user_id AND status = 'accepted'
          UNION
          SELECT requester_id FROM friendships WHERE addressee_id = p_user_id AND status = 'accepted'
        ) OR af.actor_id = p_user_id
      ELSE
        true
    END
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
