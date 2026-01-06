-- Migration: Update generation_preset constraint
-- Created: 2026-01-02
-- Description: Expand allowed presets to include all new background options

-- Drop the old constraint
ALTER TABLE generated_looks DROP CONSTRAINT IF EXISTS generated_looks_generation_preset_check;

-- Add new constraint with all presets
ALTER TABLE generated_looks ADD CONSTRAINT generated_looks_generation_preset_check
  CHECK (generation_preset IN (
    -- Legacy presets
    'selfie',
    'casual',
    'pro',
    -- New presets
    'overlay',
    'mirror_selfie',
    'studio',
    'street',
    'golden_hour',
    'minimalist',
    'coffee_shop',
    'home',
    'editorial',
    'custom'
  ));

-- Update default to 'overlay' (the new default)
ALTER TABLE generated_looks ALTER COLUMN generation_preset SET DEFAULT 'overlay';
