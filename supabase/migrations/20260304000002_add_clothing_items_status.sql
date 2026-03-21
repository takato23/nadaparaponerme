-- Add clothing item status for wishlist/virtual flows if missing
BEGIN;

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'owned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clothing_items_status_check'
      AND conrelid = 'public.clothing_items'::regclass
  ) THEN
    ALTER TABLE public.clothing_items
      ADD CONSTRAINT clothing_items_status_check
      CHECK (status IN ('owned', 'wishlist', 'virtual'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_clothing_items_user_status
  ON public.clothing_items(user_id, status)
  WHERE deleted_at IS NULL;

COMMIT;
