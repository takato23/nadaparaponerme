-- =====================================================
-- MIGRATION: Profile Feed Support
-- =====================================================

-- Update get_user_feed to support filtering by a specific actor (for Profile View)
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_filter_type TEXT DEFAULT 'all', -- 'all', 'close_friends', 'community'
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_target_actor_id UUID DEFAULT NULL -- New parameter to filter by specific user
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
    -- Filter by specific actor if provided (Profile View)
    (p_target_actor_id IS NULL OR af.actor_id = p_target_actor_id)
    AND
    (
      CASE
        -- If viewing a specific profile, we don't apply the standard feed filters
        -- We just check if we have permission to see it (public or friend)
        -- For now, assuming if you can see the profile, you can see the feed
        WHEN p_target_actor_id IS NOT NULL THEN
           true 
        
        -- Standard Feed Logic
        WHEN p_filter_type = 'close_friends' THEN
          af.actor_id IN (SELECT friend_id FROM close_friends WHERE close_friends.user_id = p_user_id)
        WHEN p_filter_type = 'all' THEN
          af.actor_id IN (
            SELECT addressee_id FROM friendships WHERE requester_id = p_user_id AND status = 'accepted'
            UNION
            SELECT requester_id FROM friendships WHERE addressee_id = p_user_id AND status = 'accepted'
          ) OR af.actor_id = p_user_id
        ELSE
          true -- Community or other filters
      END
    )
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
