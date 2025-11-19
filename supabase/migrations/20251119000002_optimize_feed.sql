-- =====================================================
-- MIGRATION: Optimize Feed Queries
-- =====================================================

-- Add index on actor_id to support "Pull" model (querying friends' activities)
CREATE INDEX IF NOT EXISTS idx_activity_actor ON activity_feed(actor_id, created_at DESC);

-- Add index on target_id for faster lookups of activities related to an object
CREATE INDEX IF NOT EXISTS idx_activity_target ON activity_feed(target_id);

-- Function to fetch feed for a user with pagination and filtering
-- This function simplifies the complex join logic for the frontend
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
      WHEN p_filter_type = 'all' THEN
        af.actor_id IN (
          SELECT addressee_id FROM friendships WHERE requester_id = p_user_id AND status = 'accepted'
          UNION
          SELECT requester_id FROM friendships WHERE addressee_id = p_user_id AND status = 'accepted'
        ) OR af.actor_id = p_user_id -- Include own activity?
      ELSE
        true -- Community feed (all public activity? or just stick to friends for now)
    END
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
