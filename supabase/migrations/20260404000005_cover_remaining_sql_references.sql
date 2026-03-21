BEGIN;

-- Cover waitlist usage from waitlistService.
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

-- Landing waitlist flow may be unauthenticated; keep RLS disabled for this table.
ALTER TABLE public.waitlist DISABLE ROW LEVEL SECURITY;

-- Cover closetService RPC usage for atomic wear-counter updates.
CREATE OR REPLACE FUNCTION public.increment_times_worn(item_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.clothing_items ci
  SET
    times_worn = COALESCE(ci.times_worn, 0) + 1,
    last_worn_at = NOW(),
    updated_at = NOW()
  WHERE ci.id = item_id
    AND ci.user_id = v_user_id
    AND ci.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
