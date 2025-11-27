-- =====================================================
-- Migration: Enhance AI Image Generation System
-- Description: Add missing features and optimize existing AI generation system
-- Date: 2025-11-20
-- =====================================================

-- =====================================================
-- ENHANCEMENT 1: Add missing columns to ai_generated_images
-- =====================================================

-- Add metadata column if not exists (for future extensibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_generated_images' AND column_name = 'ai_metadata'
    ) THEN
        ALTER TABLE public.ai_generated_images
        ADD COLUMN ai_metadata JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN public.ai_generated_images.ai_metadata IS 'Additional AI-generated metadata (colors, tags, etc)';
    END IF;
END $$;

-- =====================================================
-- ENHANCEMENT 2: Improve quota checking function
-- =====================================================

-- Enhanced function with better error handling and detailed response
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
    -- Get user's subscription tier from subscriptions table
    SELECT tier INTO v_plan
    FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Default to free if no active subscription
    v_plan := COALESCE(v_plan, 'free');

    -- Set limits based on tier and model
    IF v_plan = 'free' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 10 ELSE 0 END;
    ELSIF v_plan = 'pro' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 50 ELSE 5 END;
    ELSIF v_plan = 'premium' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 200 ELSE 20 END;
    ELSE
        v_limit := 0;
    END IF;

    -- Get current usage for today
    SELECT COALESCE(dgq.count, 0) INTO v_count
    FROM public.daily_generation_quota dgq
    WHERE dgq.user_id = p_user_id
      AND dgq.date = v_today
      AND dgq.model_type = p_model_type;

    -- If no record exists, create one
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_generation_quota IS 'Enhanced quota check with next reset time and auto-creation';

-- =====================================================
-- ENHANCEMENT 3: Add function to increment quota
-- =====================================================

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
BEGIN
    -- Set limits based on tier
    IF p_plan_type = 'free' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 10 ELSE 0 END;
    ELSIF p_plan_type = 'pro' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 50 ELSE 5 END;
    ELSIF p_plan_type = 'premium' THEN
        v_limit := CASE WHEN p_model_type = 'flash' THEN 200 ELSE 20 END;
    ELSE
        v_limit := 0;
    END IF;

    -- Upsert quota record
    INSERT INTO public.daily_generation_quota (user_id, date, model_type, count, plan_type)
    VALUES (p_user_id, v_today, p_model_type, 1, p_plan_type)
    ON CONFLICT (user_id, date, model_type)
    DO UPDATE SET
        count = daily_generation_quota.count + 1,
        updated_at = NOW()
    RETURNING count INTO v_current_count;

    -- Check if limit exceeded
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_generation_quota IS 'Increments daily quota counter with validation';

-- =====================================================
-- ENHANCEMENT 4: Add function to get generation history
-- =====================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_generation_history IS 'Returns paginated generation history for a user';

-- =====================================================
-- ENHANCEMENT 5: Add function to get quota statistics
-- =====================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_quota_statistics IS 'Returns usage statistics for the past N days';

-- =====================================================
-- ENHANCEMENT 6: Add soft delete function
-- =====================================================

CREATE OR REPLACE FUNCTION public.soft_delete_generated_image(
    p_image_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    UPDATE public.ai_generated_images
    SET deleted_at = NOW()
    WHERE id = p_image_id
      AND user_id = p_user_id
      AND deleted_at IS NULL
    RETURNING true INTO v_deleted;

    RETURN COALESCE(v_deleted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.soft_delete_generated_image IS 'Soft deletes a generated image (sets deleted_at)';

-- =====================================================
-- ENHANCEMENT 7: Add index for better query performance
-- =====================================================

-- Index for ai_metadata queries (GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_metadata
    ON public.ai_generated_images USING GIN (ai_metadata)
    WHERE deleted_at IS NULL;

-- Index for deleted_at filtering
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_deleted
    ON public.ai_generated_images(user_id, deleted_at)
    WHERE deleted_at IS NULL;

-- =====================================================
-- ENHANCEMENT 8: Add RLS policy for INSERT operations
-- =====================================================

-- Policy: Service role can insert generated images
DROP POLICY IF EXISTS "Service role can insert generated images" ON public.ai_generated_images;
CREATE POLICY "Service role can insert generated images"
    ON public.ai_generated_images FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- ENHANCEMENT 9: Add automatic cleanup scheduled job info
-- =====================================================

-- Create cleanup function with better logging
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_data()
RETURNS TABLE(
    deleted_quotas INTEGER,
    deleted_images INTEGER,
    cleanup_time TIMESTAMPTZ
) AS $$
DECLARE
    v_deleted_quotas INTEGER;
    v_deleted_images INTEGER;
BEGIN
    -- Delete quota records older than 30 days
    DELETE FROM public.daily_generation_quota
    WHERE date < CURRENT_DATE - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_quotas = ROW_COUNT;

    -- Permanently delete soft-deleted images older than 90 days
    DELETE FROM public.ai_generated_images
    WHERE deleted_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_images = ROW_COUNT;

    RETURN QUERY SELECT
        v_deleted_quotas,
        v_deleted_images,
        NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_ai_data IS 'Cleans up old quota records (30d) and soft-deleted images (90d)';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ Migration: enhance_ai_image_generation';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Enhancements applied:';
    RAISE NOTICE '1. ✅ Added ai_metadata column for extensibility';
    RAISE NOTICE '2. ✅ Enhanced check_generation_quota function';
    RAISE NOTICE '3. ✅ Added increment_generation_quota function';
    RAISE NOTICE '4. ✅ Added get_generation_history function';
    RAISE NOTICE '5. ✅ Added get_quota_statistics function';
    RAISE NOTICE '6. ✅ Added soft_delete_generated_image function';
    RAISE NOTICE '7. ✅ Added performance indexes (GIN, deleted_at)';
    RAISE NOTICE '8. ✅ Added RLS policy for service role INSERT';
    RAISE NOTICE '9. ✅ Enhanced cleanup_old_ai_data function';
    RAISE NOTICE '================================================';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   - Run: supabase db push';
    RAISE NOTICE '   - Verify: execute verify_ai_image_generation.sql';
    RAISE NOTICE '   - Update Edge Functions to use new functions';
    RAISE NOTICE '================================================';
END $$;
