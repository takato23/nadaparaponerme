-- Migration: Add Paddle support + MercadoPago subscriptions metadata
-- Date: 2026-02-07
--
-- Goals:
-- - Allow Paddle as an international payment provider (MoR) while keeping MercadoPago for Argentina.
-- - Keep existing constraints, but extend them to include Paddle fields.
-- - Add provider IDs to subscriptions for lifecycle management.

-- ============================================================================
-- SUBSCRIPTIONS: add Paddle subscription id + extend payment_method enum/check
-- ============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_id
  ON subscriptions(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the CHECK constraint that mentions payment_method on subscriptions.
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'subscriptions'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%payment_method%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (
    payment_method IN (
      'mercadopago_credit_card',
      'mercadopago_debit_card',
      'mercadopago_cash',
      'mercadopago_bank_transfer',
      'stripe_card',
      'paddle_card'
    )
  );

-- ============================================================================
-- PAYMENT TRANSACTIONS: allow Paddle as provider
-- ============================================================================

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'payment_transactions'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%provider%'
    AND pg_get_constraintdef(c.oid) ILIKE '%mercadopago%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payment_transactions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_provider_check
  CHECK (provider IN ('mercadopago', 'stripe', 'paddle'));

-- ============================================================================
-- PAYMENT METHODS: allow Paddle card type (optional future use)
-- ============================================================================

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'payment_methods'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%type%'
    AND pg_get_constraintdef(c.oid) ILIKE '%stripe_card%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payment_methods DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE payment_methods
  ADD CONSTRAINT payment_methods_type_check
  CHECK (
    type IN (
      'mercadopago_credit_card',
      'mercadopago_debit_card',
      'mercadopago_cash',
      'mercadopago_bank_transfer',
      'stripe_card',
      'paddle_card'
    )
  );

