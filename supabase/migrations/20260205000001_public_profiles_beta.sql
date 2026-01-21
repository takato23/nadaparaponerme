-- Migration: Make profiles public by default for beta friend discovery

ALTER TABLE profiles
  ALTER COLUMN is_public SET DEFAULT true;

UPDATE profiles
SET is_public = true
WHERE is_public IS DISTINCT FROM true;
