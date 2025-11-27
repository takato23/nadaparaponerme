-- =====================================================
-- OUTFIT SCHEDULE MIGRATION
-- No Tengo Nada Para Ponerme - Weekly Outfit Planner
-- =====================================================

-- =====================================================
-- OUTFIT SCHEDULE TABLE
-- =====================================================

CREATE TABLE outfit_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date for this scheduled outfit (YYYY-MM-DD)
  date DATE NOT NULL,

  -- Reference to saved outfit
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: one outfit per day per user
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indexes for performance
CREATE INDEX idx_outfit_schedule_user ON outfit_schedule(user_id);
CREATE INDEX idx_outfit_schedule_date ON outfit_schedule(date);
CREATE INDEX idx_outfit_schedule_user_date ON outfit_schedule(user_id, date);
CREATE INDEX idx_outfit_schedule_outfit ON outfit_schedule(outfit_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_outfit_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outfit_schedule_updated_at
  BEFORE UPDATE ON outfit_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_outfit_schedule_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE outfit_schedule ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scheduled outfits
CREATE POLICY "Users can view own scheduled outfits"
  ON outfit_schedule FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scheduled outfits
CREATE POLICY "Users can insert own scheduled outfits"
  ON outfit_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled outfits
CREATE POLICY "Users can update own scheduled outfits"
  ON outfit_schedule FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scheduled outfits
CREATE POLICY "Users can delete own scheduled outfits"
  ON outfit_schedule FOR DELETE
  USING (auth.uid() = user_id);
