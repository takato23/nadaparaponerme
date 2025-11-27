-- AI Image Generation System with Rate Limiting
-- Tracks generated images and daily quotas per user

-- Table: ai_generated_images
-- Stores all AI-generated fashion images with metadata
CREATE TABLE IF NOT EXISTS public.ai_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('flash', 'pro')),
    generation_time_ms INTEGER NOT NULL,
    style_preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Table: daily_generation_quota
-- Tracks daily usage limits per user, model type, and plan
CREATE TABLE IF NOT EXISTS public.daily_generation_quota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('flash', 'pro')),
    count INTEGER DEFAULT 0,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'premium')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, model_type)
);

-- Enable RLS
ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_generation_quota ENABLE ROW LEVEL SECURITY;

-- RLS Policies: ai_generated_images
DROP POLICY IF EXISTS "Users can view their own generated images" ON public.ai_generated_images;
CREATE POLICY "Users can view their own generated images"
    ON public.ai_generated_images FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can soft delete their own generated images" ON public.ai_generated_images;
CREATE POLICY "Users can soft delete their own generated images"
    ON public.ai_generated_images FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all generated images" ON public.ai_generated_images;
CREATE POLICY "Service role can manage all generated images"
    ON public.ai_generated_images FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies: daily_generation_quota
DROP POLICY IF EXISTS "Users can view their own quota" ON public.daily_generation_quota;
CREATE POLICY "Users can view their own quota"
    ON public.daily_generation_quota FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all quotas" ON public.daily_generation_quota;
CREATE POLICY "Service role can manage all quotas"
    ON public.daily_generation_quota FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_user_id ON public.ai_generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_created_at ON public.ai_generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_model_type ON public.ai_generated_images(model_type);
CREATE INDEX IF NOT EXISTS idx_daily_generation_quota_user_date ON public.daily_generation_quota(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_generation_quota_model_type ON public.daily_generation_quota(model_type);

-- Function: get_user_quota_status
-- Returns current quota usage and limits for a user
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
    -- Get user's subscription tier
    SELECT tier INTO v_plan
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    -- Default to free if no subscription
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

    -- Get current usage
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: cleanup_old_quotas
-- Remove quota records older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_quotas()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.daily_generation_quota
    WHERE date < CURRENT_DATE - INTERVAL '30 days';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: update_quota_timestamp
-- Auto-update updated_at on quota changes
CREATE OR REPLACE FUNCTION public.update_quota_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quota_timestamp ON public.daily_generation_quota;
CREATE TRIGGER trigger_update_quota_timestamp
    BEFORE UPDATE ON public.daily_generation_quota
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quota_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.ai_generated_images IS 'Stores AI-generated fashion images with metadata and generation details';
COMMENT ON TABLE public.daily_generation_quota IS 'Tracks daily image generation quotas per user, model, and subscription tier';
COMMENT ON FUNCTION public.get_user_quota_status IS 'Returns current quota usage and limits for a specific user and model type';
COMMENT ON FUNCTION public.cleanup_old_quotas IS 'Maintenance function to remove quota records older than 30 days';
