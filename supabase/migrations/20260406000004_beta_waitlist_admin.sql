BEGIN;

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'waitlist_status_check'
  ) THEN
    ALTER TABLE public.waitlist
      ADD CONSTRAINT waitlist_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

UPDATE public.waitlist
SET
  email = lower(trim(email)),
  source = COALESCE(NULLIF(trim(source), ''), 'instagram'),
  status = CASE
    WHEN status IN ('pending', 'approved', 'rejected') THEN status
    ELSE 'pending'
  END,
  updated_at = COALESCE(updated_at, created_at, NOW()),
  metadata = COALESCE(metadata, '{}'::jsonb)
WHERE TRUE;

CREATE INDEX IF NOT EXISTS idx_waitlist_status_created_at
  ON public.waitlist (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_approved_email
  ON public.waitlist (email, status)
  WHERE status = 'approved';

COMMIT;
