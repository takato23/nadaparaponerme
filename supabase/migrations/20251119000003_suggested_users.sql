-- =====================================================
-- MIGRATION: User Recommendation Algorithm
-- =====================================================

-- Function to get suggested users based on style preference overlap
CREATE OR REPLACE FUNCTION get_suggested_users(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  similarity_score FLOAT,
  common_preferences TEXT[]
) AS $$
DECLARE
  v_user_preferences JSONB;
BEGIN
  -- Get current user's preferences
  SELECT style_preferences INTO v_user_preferences
  FROM profiles
  WHERE id = p_user_id;

  -- If user has no preferences, return random popular users (fallback)
  IF v_user_preferences IS NULL OR jsonb_array_length(v_user_preferences) = 0 THEN
    RETURN QUERY
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      0.0::FLOAT as similarity_score,
      ARRAY[]::TEXT[] as common_preferences
    FROM profiles p
    WHERE p.id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.requester_id = p_user_id AND f.addressee_id = p.id)
      OR (f.requester_id = p.id AND f.addressee_id = p_user_id)
    )
    ORDER BY random()
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Calculate similarity and return top matches
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements_text(p.style_preferences) p_pref
      WHERE p_pref IN (SELECT jsonb_array_elements_text(v_user_preferences))
    )::FLOAT / GREATEST(jsonb_array_length(v_user_preferences), 1)::FLOAT as similarity_score,
    ARRAY(
      SELECT p_pref
      FROM jsonb_array_elements_text(p.style_preferences) p_pref
      WHERE p_pref IN (SELECT jsonb_array_elements_text(v_user_preferences))
    ) as common_preferences
  FROM profiles p
  WHERE p.id != p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.requester_id = p_user_id AND f.addressee_id = p.id)
    OR (f.requester_id = p.id AND f.addressee_id = p_user_id)
  )
  ORDER BY similarity_score DESC, random()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
