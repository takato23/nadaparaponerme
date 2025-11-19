-- Add subscription tables for payment system
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'premium')),
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier TEXT NOT NULL,
    ai_generations_used INTEGER DEFAULT 0,
    ai_generations_limit INTEGER DEFAULT 5, -- Free tier default
    closet_items_count INTEGER DEFAULT 0,
    closet_items_limit INTEGER DEFAULT 5, -- Free tier default
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    last_reset TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,
    tier TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage all subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for usage_metrics
DROP POLICY IF EXISTS "Users can view their own usage metrics" ON public.usage_metrics;
CREATE POLICY "Users can view their own usage metrics"
    ON public.usage_metrics FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all usage metrics" ON public.usage_metrics;
CREATE POLICY "Service role can manage all usage metrics"
    ON public.usage_metrics FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for payment_history
DROP POLICY IF EXISTS "Users can view their own payment history" ON public.payment_history;
CREATE POLICY "Users can view their own payment history"
    ON public.payment_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all payment history" ON public.payment_history;
CREATE POLICY "Service role can manage all payment history"
    ON public.payment_history FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Function to initialize new user with free tier
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Create free subscription
    INSERT INTO public.subscriptions (
        user_id,
        tier,
        status,
        current_period_start,
        current_period_end
    ) VALUES (
        NEW.id,
        'free',
        'active',
        NOW(),
        NOW() + INTERVAL '1000 years' -- Free tier never expires
    );

    -- Create usage metrics
    INSERT INTO public.usage_metrics (
        user_id,
        subscription_tier,
        ai_generations_used,
        ai_generations_limit,
        closet_items_count,
        closet_items_limit,
        period_start,
        period_end
    ) VALUES (
        NEW.id,
        'free',
        0,
        5,
        0,
        5,
        NOW(),
        NOW() + INTERVAL '1 month'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create subscription for new users
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_user_subscription();

-- Function to check if user can generate outfit
CREATE OR REPLACE FUNCTION public.can_user_generate_outfit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_used INTEGER;
    v_limit INTEGER;
    v_tier TEXT;
BEGIN
    SELECT 
        ai_generations_used,
        ai_generations_limit,
        subscription_tier
    INTO v_used, v_limit, v_tier
    FROM public.usage_metrics
    WHERE user_id = p_user_id;

    -- Premium tier has unlimited generations
    IF v_tier = 'premium' THEN
        RETURN TRUE;
    END IF;

    -- Check if under limit
    RETURN v_used < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment AI generation count
CREATE OR REPLACE FUNCTION public.increment_ai_generation(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_generate BOOLEAN;
BEGIN
    -- Check if user can generate
    v_can_generate := public.can_user_generate_outfit(p_user_id);
    
    IF NOT v_can_generate THEN
        RETURN FALSE;
    END IF;

    -- Increment usage
    UPDATE public.usage_metrics
    SET ai_generations_used = ai_generations_used + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON public.usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
