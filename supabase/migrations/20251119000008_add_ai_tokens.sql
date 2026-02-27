-- =====================================================
-- MIGRATION: ADD AI TOKENS BALANCE
-- =====================================================

-- Add ai_tokens_balance to profiles table
ALTER TABLE profiles
ADD COLUMN ai_tokens_balance INTEGER NOT NULL DEFAULT 20;

-- Optional: Add a comment describing the column
COMMENT ON COLUMN profiles.ai_tokens_balance IS 'Balance of Styling Coins used for AI generation tasks like Virtual Try-On';
