-- =====================================================
-- MIGRATION: Friend search by username/display_name/email
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_profiles_for_friendship(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN
) AS $$
DECLARE
  v_query TEXT := lower(trim(COALESCE(p_query, '')));
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_is_email BOOLEAN := position('@' in v_query) > 1;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  IF char_length(v_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.is_public
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> p_user_id
    AND (
      (p.is_public = true AND (
        p.username ILIKE '%' || v_query || '%'
        OR COALESCE(p.display_name, '') ILIKE '%' || v_query || '%'
      ))
      OR (v_is_email AND lower(COALESCE(u.email, '')) = v_query)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM friendships f
      WHERE (
        (f.requester_id = p_user_id AND f.addressee_id = p.id)
        OR (f.requester_id = p.id AND f.addressee_id = p_user_id)
      )
      AND f.status = 'blocked'
    )
  ORDER BY
    CASE
      WHEN v_is_email AND lower(COALESCE(u.email, '')) = v_query THEN 0
      WHEN lower(p.username) = v_query THEN 1
      WHEN lower(COALESCE(p.display_name, '')) = v_query THEN 2
      WHEN lower(p.username) LIKE v_query || '%' THEN 3
      WHEN lower(COALESCE(p.display_name, '')) LIKE v_query || '%' THEN 4
      ELSE 5
    END,
    p.created_at DESC
  LIMIT v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.search_profiles_for_friendship(UUID, TEXT, INTEGER)
IS 'Secure friend search by username/display name (public profiles) or exact email match.';

GRANT EXECUTE ON FUNCTION public.search_profiles_for_friendship(UUID, TEXT, INTEGER) TO authenticated;
