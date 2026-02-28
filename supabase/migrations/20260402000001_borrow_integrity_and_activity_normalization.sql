-- =====================================================
-- Borrow integrity + activity type normalization
-- =====================================================
-- Goals:
-- 1) Canonicalize activity type to 'borrow_request' while keeping legacy write compatibility.
-- 2) Allow borrowers to cancel only their own pending requests via RLS DELETE policy.
-- 3) Enforce borrowed_items integrity:
--    - owner_id must match clothing_items.user_id
--    - only one active borrow per clothing item (requested/approved/borrowed)

-- Normalize legacy rows (if any)
UPDATE public.activity_feed
SET activity_type = 'borrow_request'
WHERE activity_type = 'borrow_requested';

-- Normalize legacy writes from old clients before CHECK constraints are evaluated
CREATE OR REPLACE FUNCTION public.normalize_activity_feed_borrow_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.activity_type = 'borrow_requested' THEN
    NEW.activity_type := 'borrow_request';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_activity_feed_borrow_type ON public.activity_feed;
CREATE TRIGGER trigger_normalize_activity_feed_borrow_type
BEFORE INSERT OR UPDATE OF activity_type
ON public.activity_feed
FOR EACH ROW
EXECUTE FUNCTION public.normalize_activity_feed_borrow_type();

-- Borrowers can cancel only their own pending requests
DROP POLICY IF EXISTS "Borrower can cancel requested borrow" ON public.borrowed_items;
DROP POLICY IF EXISTS "Users can delete own borrow requests" ON public.borrowed_items;
CREATE POLICY "Borrower can cancel requested borrow"
  ON public.borrowed_items FOR DELETE
  USING (borrower_id = auth.uid() AND status = 'requested');

-- Enforce owner consistency + active-borrow exclusivity
CREATE OR REPLACE FUNCTION public.validate_borrowed_item_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_owner UUID;
BEGIN
  SELECT user_id INTO v_item_owner
  FROM public.clothing_items
  WHERE id = NEW.clothing_item_id;

  IF v_item_owner IS NULL THEN
    RAISE EXCEPTION 'BORROW_ITEM_NOT_FOUND'
      USING ERRCODE = '23503',
            DETAIL = 'clothing_item_id=' || NEW.clothing_item_id;
  END IF;

  IF v_item_owner <> NEW.owner_id THEN
    RAISE EXCEPTION 'BORROW_OWNER_MISMATCH'
      USING ERRCODE = '23514',
            DETAIL = 'owner_id must match clothing_items.user_id';
  END IF;

  IF NEW.status IN ('requested', 'approved', 'borrowed') THEN
    IF EXISTS (
      SELECT 1
      FROM public.borrowed_items bi
      WHERE bi.clothing_item_id = NEW.clothing_item_id
        AND bi.status IN ('requested', 'approved', 'borrowed')
        AND (TG_OP = 'INSERT' OR bi.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'BORROW_ITEM_ALREADY_ACTIVE'
        USING ERRCODE = '23505',
              DETAIL = 'clothing_item_id=' || NEW.clothing_item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_borrowed_item_integrity ON public.borrowed_items;
CREATE TRIGGER trigger_validate_borrowed_item_integrity
BEFORE INSERT OR UPDATE OF clothing_item_id, owner_id, status
ON public.borrowed_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_borrowed_item_integrity();

-- Optional stronger guarantee at index level (created only when current data is conflict-free)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_borrowed_items_single_active_per_item'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.borrowed_items bi
      WHERE bi.status IN ('requested', 'approved', 'borrowed')
      GROUP BY bi.clothing_item_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipping idx_borrowed_items_single_active_per_item because active duplicates already exist';
    ELSE
      CREATE UNIQUE INDEX idx_borrowed_items_single_active_per_item
        ON public.borrowed_items (clothing_item_id)
        WHERE status IN ('requested', 'approved', 'borrowed');
    END IF;
  END IF;
END $$;
