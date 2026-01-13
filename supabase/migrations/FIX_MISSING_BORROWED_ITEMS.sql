-- =====================================================
-- FIX MISSING borrowed_items TABLE
-- =====================================================

-- 1. Create table if missing
CREATE TABLE IF NOT EXISTS public.borrowed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clothing_item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'requested',

  borrowed_at TIMESTAMPTZ,
  expected_return_date DATE,
  returned_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_borrow CHECK (owner_id != borrower_id),
  CONSTRAINT valid_borrow_status CHECK (status IN ('requested', 'approved', 'borrowed', 'returned', 'declined'))
);

-- 2. Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_borrowed_owner ON public.borrowed_items(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_borrowed_borrower ON public.borrowed_items(borrower_id, status);
CREATE INDEX IF NOT EXISTS idx_borrowed_item ON public.borrowed_items(clothing_item_id);
CREATE INDEX IF NOT EXISTS idx_borrowed_active ON public.borrowed_items(status) WHERE status IN ('requested', 'approved', 'borrowed');

-- 3. Enable RLS
ALTER TABLE public.borrowed_items ENABLE ROW LEVEL SECURITY;

-- 4. Re-create policies (Drop first to avoid conflicts if they somehow exist partially)
DROP POLICY IF EXISTS "Users can view own borrow requests" ON public.borrowed_items;
CREATE POLICY "Users can view own borrow requests"
  ON public.borrowed_items FOR SELECT
  USING (owner_id = auth.uid() OR borrower_id = auth.uid());

DROP POLICY IF EXISTS "Users can create borrow requests" ON public.borrowed_items;
CREATE POLICY "Users can create borrow requests"
  ON public.borrowed_items FOR INSERT
  WITH CHECK (
    borrower_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = borrowed_items.owner_id)
        OR (addressee_id = auth.uid() AND requester_id = borrowed_items.owner_id))
    )
  );

DROP POLICY IF EXISTS "Users can update own borrow requests" ON public.borrowed_items;
CREATE POLICY "Users can update own borrow requests"
  ON public.borrowed_items FOR UPDATE
  USING (owner_id = auth.uid() OR borrower_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR borrower_id = auth.uid());

-- 5. Create trigger for updated_at if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_borrowed_updated_at') THEN
    CREATE TRIGGER trigger_borrowed_updated_at 
    BEFORE UPDATE ON public.borrowed_items 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- 6. Verification query
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'borrowed_items') as table_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'borrowed_items') as policy_count,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'borrowed_items') as trigger_count;
