-- =====================================================
-- MIGRATION: Security hardening for RLS and definer functions
-- =====================================================

-- Helper: ensure calls only act on the current user (or service role)
CREATE OR REPLACE FUNCTION public.ensure_current_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  ELSIF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- RLS POLICY FIXES
-- =====================================================

-- Communities: restrict private visibility to members/creator
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON communities;
CREATE POLICY "Communities are viewable by members or public"
  ON communities FOR SELECT
  USING (
    is_private = false
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM community_members cm
      WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
    )
  );

-- Community members: hide private memberships from non-members
DROP POLICY IF EXISTS "Memberships are viewable by everyone" ON community_members;
CREATE POLICY "Memberships are viewable by community members"
  ON community_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM communities c
      WHERE c.id = community_members.community_id
        AND (
          c.is_private = false
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM community_members cm
            WHERE cm.community_id = community_members.community_id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

-- Event participants: only allow public joins or creator-managed adds
DROP POLICY IF EXISTS "Users can join public events or if invited" ON event_participants;
CREATE POLICY "Users can join public events or creators can add"
  ON event_participants FOR INSERT
  WITH CHECK (
    (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM events
        WHERE events.id = event_participants.event_id
          AND (events.is_private = false OR events.created_by = auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1
      FROM events
      WHERE events.id = event_participants.event_id
        AND events.created_by = auth.uid()
    )
  );

-- Challenge stats: prevent user tampering
DROP POLICY IF EXISTS "Stats auto-created and updated by triggers" ON user_challenge_stats;
DROP POLICY IF EXISTS "Stats can be updated" ON user_challenge_stats;
CREATE POLICY "Stats can be inserted by service role"
  ON user_challenge_stats FOR INSERT
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'service_role');
CREATE POLICY "Stats can be updated by service role"
  ON user_challenge_stats FOR UPDATE
  USING (COALESCE(auth.jwt()->>'role', '') = 'service_role');

-- =====================================================
-- FUNCTION HARDENING (AUTH + SEARCH_PATH)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_feature TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 12
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  retry_after_seconds INTEGER,
  blocked_until TIMESTAMPTZ
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_window_count INTEGER;
  v_blocked_until TIMESTAMPTZ;
  v_retry INTEGER;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT window_start, window_count, blocked_until
  INTO v_window_start, v_window_count, v_blocked_until
  FROM public.ai_request_limits
  WHERE user_id = p_user_id AND feature = p_feature
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_request_limits (
      user_id,
      feature,
      window_start,
      window_count,
      last_request_at
    ) VALUES (
      p_user_id,
      p_feature,
      v_now,
      1,
      v_now
    );
    RETURN QUERY SELECT true, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > v_now THEN
    v_retry := CEIL(EXTRACT(EPOCH FROM (v_blocked_until - v_now)))::INTEGER;
    RETURN QUERY SELECT false, 'blocked', v_retry, v_blocked_until;
    RETURN;
  END IF;

  IF v_window_start IS NULL OR v_window_start < (v_now - make_interval(secs => p_window_seconds)) THEN
    v_window_start := v_now;
    v_window_count := 1;
  ELSE
    v_window_count := v_window_count + 1;
  END IF;

  UPDATE public.ai_request_limits
  SET
    window_start = v_window_start,
    window_count = v_window_count,
    last_request_at = v_now,
    blocked_until = NULL,
    updated_at = v_now
  WHERE user_id = p_user_id AND feature = p_feature;

  IF v_window_count > p_max_requests THEN
    v_retry := CEIL(EXTRACT(EPOCH FROM ((v_window_start + make_interval(secs => p_window_seconds)) - v_now)))::INTEGER;
    v_retry := GREATEST(v_retry, 1);
    RETURN QUERY SELECT false, 'rate_limited', v_retry, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.record_ai_request_result(
  p_user_id UUID,
  p_feature TEXT,
  p_success BOOLEAN,
  p_error_threshold INTEGER DEFAULT 10,
  p_error_window_seconds INTEGER DEFAULT 300,
  p_block_seconds INTEGER DEFAULT 900
)
RETURNS TABLE (
  blocked_until TIMESTAMPTZ,
  error_count INTEGER
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_error_count INTEGER;
  v_error_window_start TIMESTAMPTZ;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT error_count, error_window_start, blocked_until
  INTO v_error_count, v_error_window_start, v_blocked_until
  FROM public.ai_request_limits
  WHERE user_id = p_user_id AND feature = p_feature
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_request_limits (
      user_id,
      feature,
      window_start,
      window_count,
      last_request_at,
      error_count,
      error_window_start,
      last_error_at
    ) VALUES (
      p_user_id,
      p_feature,
      v_now,
      0,
      v_now,
      0,
      NULL,
      NULL
    );
    v_error_count := 0;
    v_error_window_start := NULL;
  END IF;

  IF p_success THEN
    UPDATE public.ai_request_limits
    SET
      error_count = 0,
      error_window_start = NULL,
      last_error_at = NULL,
      blocked_until = NULL,
      updated_at = v_now
    WHERE user_id = p_user_id AND feature = p_feature;

    RETURN QUERY SELECT NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  IF v_error_window_start IS NULL OR v_error_window_start < (v_now - make_interval(secs => p_error_window_seconds)) THEN
    v_error_window_start := v_now;
    v_error_count := 1;
  ELSE
    v_error_count := v_error_count + 1;
  END IF;

  IF v_error_count >= p_error_threshold THEN
    v_blocked_until := v_now + make_interval(secs => p_block_seconds);
    UPDATE public.ai_request_limits
    SET
      error_count = v_error_count,
      error_window_start = v_error_window_start,
      last_error_at = v_now,
      blocked_until = v_blocked_until,
      updated_at = v_now
    WHERE user_id = p_user_id AND feature = p_feature;

    RETURN QUERY SELECT v_blocked_until, v_error_count;
    RETURN;
  END IF;

  UPDATE public.ai_request_limits
  SET
    error_count = v_error_count,
    error_window_start = v_error_window_start,
    last_error_at = v_now,
    updated_at = v_now
  WHERE user_id = p_user_id AND feature = p_feature;

  RETURN QUERY SELECT NULL::TIMESTAMPTZ, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_quota_status(p_user_id UUID, p_model_type TEXT)
RETURNS TABLE (
    current_count INTEGER,
    daily_limit INTEGER,
    remaining_quota INTEGER,
    plan_type TEXT,
    can_generate BOOLEAN
) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_count INTEGER := 0;
    v_plan TEXT;
    v_limit INTEGER;
BEGIN
    PERFORM public.ensure_current_user(p_user_id);

    SELECT tier INTO v_plan
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    v_plan := COALESCE(v_plan, 'free');

    IF v_plan = 'free' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 10 ELSE 0 END;
    ELSIF v_plan = 'pro' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 50 ELSE 5 END;
    ELSIF v_plan = 'premium' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 200 ELSE 20 END;
    ELSE
        v_limit := 0;
    END IF;

    SELECT COALESCE(dgq.count, 0) INTO v_count
    FROM public.daily_generation_quota dgq
    WHERE dgq.user_id = p_user_id
      AND dgq.date = v_today
      AND dgq.model_type = p_model_type;

    RETURN QUERY SELECT
        v_count,
        v_limit,
        GREATEST(v_limit - v_count, 0),
        v_plan,
        v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_generation_quota(
    p_user_id UUID,
    p_model_type TEXT DEFAULT 'flash'
)
RETURNS TABLE(
    can_generate BOOLEAN,
    current_count INTEGER,
    daily_limit INTEGER,
    remaining_quota INTEGER,
    plan_type TEXT,
    next_reset_at TIMESTAMPTZ
) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_tomorrow TIMESTAMPTZ := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
    v_count INTEGER := 0;
    v_plan TEXT;
    v_limit INTEGER;
BEGIN
    PERFORM public.ensure_current_user(p_user_id);

    SELECT tier INTO v_plan
    FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    v_plan := COALESCE(v_plan, 'free');

    IF v_plan = 'free' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 10 ELSE 0 END;
    ELSIF v_plan = 'pro' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 50 ELSE 5 END;
    ELSIF v_plan = 'premium' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 200 ELSE 20 END;
    ELSE
        v_limit := 0;
    END IF;

    SELECT COALESCE(dgq.count, 0) INTO v_count
    FROM public.daily_generation_quota dgq
    WHERE dgq.user_id = p_user_id
      AND dgq.date = v_today
      AND dgq.model_type = p_model_type;

    IF v_count IS NULL THEN
        INSERT INTO public.daily_generation_quota (user_id, date, model_type, count, plan_type)
        VALUES (p_user_id, v_today, p_model_type, 0, v_plan)
        ON CONFLICT (user_id, date, model_type) DO NOTHING;
        v_count := 0;
    END IF;

    RETURN QUERY SELECT
        (v_count < v_limit)::BOOLEAN,
        v_count,
        v_limit,
        GREATEST(v_limit - v_count, 0),
        v_plan,
        v_tomorrow;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_generation_quota(
    p_user_id UUID,
    p_model_type TEXT,
    p_plan_type TEXT DEFAULT 'free'
)
RETURNS TABLE(
    success BOOLEAN,
    new_count INTEGER,
    remaining_quota INTEGER,
    message TEXT
) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_current_count INTEGER;
    v_limit INTEGER;
    v_plan TEXT;
BEGIN
    PERFORM public.ensure_current_user(p_user_id);

    SELECT tier INTO v_plan
    FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    v_plan := COALESCE(v_plan, 'free');

    IF v_plan = 'free' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 10 ELSE 0 END;
    ELSIF v_plan = 'pro' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 50 ELSE 5 END;
    ELSIF v_plan = 'premium' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 200 ELSE 20 END;
    ELSE
        v_limit := 0;
    END IF;

    INSERT INTO public.daily_generation_quota (user_id, date, model_type, count, plan_type)
    VALUES (p_user_id, v_today, p_model_type, 1, v_plan)
    ON CONFLICT (user_id, date, model_type)
    DO UPDATE SET
        count = daily_generation_quota.count + 1,
        updated_at = NOW(),
        plan_type = v_plan
    RETURNING count INTO v_current_count;

    IF v_current_count > v_limit THEN
        RETURN QUERY SELECT
            false,
            v_current_count,
            0,
            'Daily limit exceeded'::TEXT;
    ELSE
        RETURN QUERY SELECT
            true,
            v_current_count,
            v_limit - v_current_count,
            'Quota incremented successfully'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_generation_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    prompt TEXT,
    image_url TEXT,
    model_type TEXT,
    generation_time_ms INTEGER,
    ai_metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    PERFORM public.ensure_current_user(p_user_id);

    RETURN QUERY
    SELECT
        aig.id,
        aig.prompt,
        aig.image_url,
        aig.model_type,
        aig.generation_time_ms,
        aig.ai_metadata,
        aig.created_at
    FROM public.ai_generated_images aig
    WHERE aig.user_id = p_user_id
      AND aig.deleted_at IS NULL
    ORDER BY aig.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_quota_statistics(
    p_user_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    date DATE,
    flash_count INTEGER,
    pro_count INTEGER,
    total_count INTEGER,
    plan_type TEXT
) AS $$
BEGIN
    PERFORM public.ensure_current_user(p_user_id);

    RETURN QUERY
    SELECT
        dgq.date,
        SUM(CASE WHEN dgq.model_type = 'flash' THEN dgq.count ELSE 0 END)::INTEGER AS flash_count,
        SUM(CASE WHEN dgq.model_type = 'pro' THEN dgq.count ELSE 0 END)::INTEGER AS pro_count,
        SUM(dgq.count)::INTEGER AS total_count,
        MAX(dgq.plan_type) AS plan_type
    FROM public.daily_generation_quota dgq
    WHERE dgq.user_id = p_user_id
      AND dgq.date >= CURRENT_DATE - p_days
    GROUP BY dgq.date
    ORDER BY dgq.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.soft_delete_generated_image(
    p_image_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    PERFORM public.ensure_current_user(p_user_id);

    UPDATE public.ai_generated_images
    SET deleted_at = NOW()
    WHERE id = p_image_id
      AND user_id = p_user_id
      AND deleted_at IS NULL
    RETURNING true INTO v_deleted;

    RETURN COALESCE(v_deleted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Latest signature with profile filtering
CREATE OR REPLACE FUNCTION get_user_feed(
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
      FROM profiles prof
      WHERE prof.id = p_target_actor_id
        AND (
          prof.is_public = true
          OR prof.id = p_user_id
          OR EXISTS (
            SELECT 1
            FROM friendships f
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
    p.username as actor_username,
    p.avatar_url as actor_avatar,
    p.display_name as actor_display_name
  FROM activity_feed af
  JOIN profiles p ON af.actor_id = p.id
  WHERE
    (p_target_actor_id IS NULL OR af.actor_id = p_target_actor_id)
    AND
    (
      CASE
        WHEN p_target_actor_id IS NOT NULL THEN
           true
        WHEN p_filter_type = 'close_friends' THEN
          af.actor_id IN (SELECT friend_id FROM close_friends WHERE close_friends.user_id = p_user_id)
        WHEN p_filter_type = 'community' THEN
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
    )
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backward compatible signature
CREATE OR REPLACE FUNCTION get_user_feed(
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
  FROM get_user_feed(p_user_id, p_filter_type, p_limit, p_offset, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  PERFORM public.ensure_current_user(p_user_id);

  SELECT style_preferences INTO v_user_preferences
  FROM profiles
  WHERE id = p_user_id;

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
      AND p.is_public = true
      AND NOT EXISTS (
        SELECT 1 FROM friendships f
        WHERE (f.requester_id = p_user_id AND f.addressee_id = p.id)
        OR (f.requester_id = p.id AND f.addressee_id = p_user_id)
      )
    ORDER BY random()
    LIMIT p_limit;
    RETURN;
  END IF;

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
    AND p.is_public = true
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.requester_id = p_user_id AND f.addressee_id = p.id)
      OR (f.requester_id = p.id AND f.addressee_id = p_user_id)
    )
  ORDER BY similarity_score DESC, random()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION user_has_feature_access(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT tier, status INTO v_tier, v_status
  FROM subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  CASE p_feature_name
    WHEN 'ai_designer' THEN
      RETURN v_tier IN ('pro', 'premium');
    WHEN 'virtual_tryon' THEN
      RETURN v_tier IN ('pro', 'premium');
    WHEN 'lookbook_creator' THEN
      RETURN v_tier IN ('pro', 'premium');
    WHEN 'style_dna' THEN
      RETURN v_tier = 'premium';
    WHEN 'unlimited_ai' THEN
      RETURN v_tier = 'premium';
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_ai_generation_usage(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_amount INTEGER := GREATEST(COALESCE(p_amount, 1), 1);
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT
    tier,
    ai_generations_used,
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    INSERT INTO subscriptions (
      user_id,
      tier,
      status,
      current_period_start,
      current_period_end,
      ai_generations_used
    ) VALUES (
      p_user_id,
      'free',
      'active',
      DATE_TRUNC('month', v_now),
      DATE_TRUNC('month', v_now) + INTERVAL '1 month',
      0
    );
    v_tier := 'free';
    v_current_usage := 0;
    v_period_end := DATE_TRUNC('month', v_now) + INTERVAL '1 month';
  END IF;

  IF v_period_end < v_now THEN
    UPDATE subscriptions
    SET
      ai_generations_used = 0,
      current_period_start = DATE_TRUNC('month', v_now),
      current_period_end = DATE_TRUNC('month', v_now) + INTERVAL '1 month'
    WHERE user_id = p_user_id;

    v_current_usage := 0;
  END IF;

  v_limit := CASE v_tier
    WHEN 'free' THEN 200
    WHEN 'pro' THEN 300
    WHEN 'premium' THEN 400
    ELSE 200
  END;

  IF v_limit != -1 AND (v_current_usage + v_amount) > v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE subscriptions
  SET ai_generations_used = ai_generations_used + v_amount
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_user_generate_outfit(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_amount INTEGER := GREATEST(COALESCE(p_amount, 1), 1);
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT
    tier,
    COALESCE(ai_generations_used, 0),
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current_usage := 0;
  END IF;

  IF v_period_end IS NOT NULL AND v_period_end < v_now THEN
    RETURN TRUE;
  END IF;

  v_limit := CASE v_tier
    WHEN 'free' THEN 200
    WHEN 'pro' THEN 300
    WHEN 'premium' THEN 400
    ELSE 200
  END;

  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN (v_current_usage + v_amount) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_remaining_generations(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_period_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT
    tier,
    COALESCE(ai_generations_used, 0),
    current_period_end
  INTO v_tier, v_current_usage, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_current_usage := 0;
  END IF;

  IF v_period_end IS NOT NULL AND v_period_end < v_now THEN
    v_current_usage := 0;
  END IF;

  v_limit := CASE v_tier
    WHEN 'free' THEN 200
    WHEN 'pro' THEN 300
    WHEN 'premium' THEN 400
    ELSE 200
  END;

  IF v_limit = -1 THEN
    RETURN -1;
  END IF;

  RETURN GREATEST(0, v_limit - v_current_usage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_look_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM generated_looks
  WHERE user_id = p_user_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_user_save_look(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT COALESCE(tier, 'free') INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  SELECT get_user_look_count(p_user_id) INTO v_count;

  v_limit := CASE v_tier
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 50
    WHEN 'premium' THEN 1000
    ELSE 10
  END;

  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_user_share_look(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
BEGIN
  PERFORM public.ensure_current_user(p_user_id);

  SELECT COALESCE(tier, 'free') INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  RETURN v_tier IN ('pro', 'premium');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- SEARCH_PATH HARDENING FOR OTHER DEFINER FUNCTIONS
-- =====================================================

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_close_friend(UUID) SET search_path = public;
ALTER FUNCTION public.update_community_members_count() SET search_path = public;
ALTER FUNCTION public.complete_challenge(UUID) SET search_path = public;
ALTER FUNCTION public.update_challenge_statuses() SET search_path = public;
ALTER FUNCTION public.cleanup_old_ai_data() SET search_path = public;
ALTER FUNCTION public.cleanup_old_quotas() SET search_path = public;
ALTER FUNCTION public.cleanup_old_generated_looks() SET search_path = public;
ALTER FUNCTION public.reset_expired_subscription_periods() SET search_path = public;
