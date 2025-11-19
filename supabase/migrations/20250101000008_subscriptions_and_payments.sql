-- Migration: Subscriptions and Payments System
-- Description: Creates tables for subscription management and payment processing with MercadoPago

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Subscription tier and status
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'premium')) DEFAULT 'free',
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing', 'paused')) DEFAULT 'active',

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Payment details
  payment_method TEXT CHECK (payment_method IN ('mercadopago_credit_card', 'mercadopago_debit_card', 'mercadopago_cash', 'mercadopago_bank_transfer', 'stripe_card')),
  mercadopago_subscription_id TEXT,

  -- Usage tracking
  ai_generations_used INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active subscription per user
  UNIQUE(user_id)
);

-- Create indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_mercadopago_id ON subscriptions(mercadopago_subscription_id) WHERE mercadopago_subscription_id IS NOT NULL;

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at for subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Amount and currency
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')) DEFAULT 'ARS',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')) DEFAULT 'pending',

  -- Provider details
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe')),
  provider_transaction_id TEXT NOT NULL,
  provider_payment_method_id TEXT,

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique provider transaction IDs
  UNIQUE(provider, provider_transaction_id)
);

-- Create indexes for payment_transactions
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_provider_id ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Enable RLS on payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their own transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions"
  ON payment_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at for payment_transactions
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transactions_updated_at();

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Payment method type
  type TEXT NOT NULL CHECK (type IN ('mercadopago_credit_card', 'mercadopago_debit_card', 'mercadopago_cash', 'mercadopago_bank_transfer', 'stripe_card')),

  -- Card details (if applicable)
  last_four TEXT,
  brand TEXT,  -- visa, mastercard, etc
  exp_month INTEGER CHECK (exp_month >= 1 AND exp_month <= 12),
  exp_year INTEGER,

  -- Provider specific IDs
  mercadopago_customer_id TEXT,
  mercadopago_card_id TEXT,
  stripe_payment_method_id TEXT,

  -- Default payment method
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payment_methods
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_payment_methods_mercadopago_customer ON payment_methods(mercadopago_customer_id) WHERE mercadopago_customer_id IS NOT NULL;

-- Enable RLS on payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Users can view their own payment methods"
  ON payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
  ON payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
  ON payment_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
  ON payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure only one default payment method per user
CREATE OR REPLACE FUNCTION enforce_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE payment_methods
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_single_default
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_default_payment_method();

-- ============================================================================
-- USAGE METRICS TABLE
-- ============================================================================

CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('free', 'pro', 'premium')),

  -- Monthly limits and usage
  ai_generations_used INTEGER DEFAULT 0,
  ai_generations_limit INTEGER NOT NULL,

  -- Feature usage counters
  virtual_tryon_count INTEGER DEFAULT 0,
  lookbook_created_count INTEGER DEFAULT 0,

  -- Period tracking
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  last_reset TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One metrics record per user per period
  UNIQUE(user_id, period_start)
);

-- Create indexes for usage_metrics
CREATE INDEX idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(period_start, period_end);
CREATE INDEX idx_usage_metrics_tier ON usage_metrics(subscription_tier);

-- Enable RLS on usage_metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usage_metrics
CREATE POLICY "Users can view their own usage metrics"
  ON usage_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage metrics"
  ON usage_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at for usage_metrics
CREATE OR REPLACE FUNCTION update_usage_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usage_metrics_updated_at
  BEFORE UPDATE ON usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_metrics_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION user_has_feature_access(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
BEGIN
  -- Get user's subscription tier and status
  SELECT tier, status INTO v_tier, v_status
  FROM subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  -- Default to free if no subscription found
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Check feature access based on tier
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
      RETURN TRUE;  -- Unknown features are accessible by default
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment AI generation usage
CREATE OR REPLACE FUNCTION increment_ai_generation_usage(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
BEGIN
  -- Get current subscription tier
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Get current usage and limit
  SELECT
    COALESCE(ai_generations_used, 0),
    CASE v_tier
      WHEN 'free' THEN 10
      WHEN 'pro' THEN 100
      WHEN 'premium' THEN -1  -- Unlimited
    END
  INTO v_current_usage, v_limit
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Check if user has reached limit
  IF v_limit != -1 AND v_current_usage >= v_limit THEN
    RETURN FALSE;  -- Limit reached
  END IF;

  -- Increment usage
  UPDATE subscriptions
  SET ai_generations_used = ai_generations_used + 1
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create free subscription for all existing users
INSERT INTO subscriptions (user_id, tier, status, current_period_end)
SELECT
  id,
  'free',
  'active',
  NOW() + INTERVAL '1 year'
FROM profiles
WHERE id NOT IN (SELECT user_id FROM subscriptions);

-- Create usage metrics for all users
INSERT INTO usage_metrics (
  user_id,
  subscription_tier,
  ai_generations_limit,
  period_start,
  period_end
)
SELECT
  p.id,
  COALESCE(s.tier, 'free'),
  CASE COALESCE(s.tier, 'free')
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN -1
  END,
  DATE_TRUNC('month', NOW()),
  DATE_TRUNC('month', NOW() + INTERVAL '1 month')
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE p.id NOT IN (
  SELECT user_id
  FROM usage_metrics
  WHERE period_start = DATE_TRUNC('month', NOW())
);
