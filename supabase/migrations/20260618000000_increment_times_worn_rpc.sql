-- =====================================================
-- Ropa Olvidada (Forgotten Clothing) — usage tracking RPC
-- =====================================================
-- Provides an atomic, race-safe way to record that a clothing item was worn.
-- The client (closetService.incrementTimesWorn) calls this RPC; without it the
-- client falls back to a non-atomic SELECT + UPDATE. This makes wear tracking
-- reliable, which is the data source that powers the forgotten-items engine.
--
-- Also adds an index to make "least recently worn" / unused queries fast.

CREATE OR REPLACE FUNCTION public.increment_times_worn(item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clothing_items
  SET
    times_worn = COALESCE(times_worn, 0) + 1,
    last_worn_at = NOW(),
    updated_at = NOW()
  WHERE id = item_id
    -- Ownership check: a user can only update their own items.
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
END;
$$;

-- Allow authenticated users to call the function.
GRANT EXECUTE ON FUNCTION public.increment_times_worn(UUID) TO authenticated;

-- Speed up forgotten / least-worn lookups per user.
CREATE INDEX IF NOT EXISTS idx_clothing_items_usage
  ON public.clothing_items (user_id, last_worn_at NULLS FIRST, times_worn);
