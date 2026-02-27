-- Migration: Stylist memory and event tracking
-- Date: 2026-03-26

CREATE TABLE IF NOT EXISTS stylist_memory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tone_preference TEXT,
  last_profile_json JSONB,
  liked_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  disliked_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stylist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT,
  surface TEXT NOT NULL DEFAULT 'studio' CHECK (surface IN ('studio', 'closet')),
  prompt TEXT,
  suggestion_json JSONB,
  action TEXT NOT NULL CHECK (action IN ('accepted', 'rejected', 'generated', 'saved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stylist_events_user_created_at
  ON stylist_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stylist_events_thread_id
  ON stylist_events(thread_id)
  WHERE thread_id IS NOT NULL;

ALTER TABLE stylist_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stylist memory" ON stylist_memory;
CREATE POLICY "Users can view own stylist memory"
  ON stylist_memory FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own stylist memory" ON stylist_memory;
CREATE POLICY "Users can upsert own stylist memory"
  ON stylist_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stylist memory" ON stylist_memory;
CREATE POLICY "Users can update own stylist memory"
  ON stylist_memory FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own stylist events" ON stylist_events;
CREATE POLICY "Users can view own stylist events"
  ON stylist_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stylist events" ON stylist_events;
CREATE POLICY "Users can insert own stylist events"
  ON stylist_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stylist events" ON stylist_events;
CREATE POLICY "Users can delete own stylist events"
  ON stylist_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_stylist_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stylist_memory_updated_at ON stylist_memory;
CREATE TRIGGER trigger_stylist_memory_updated_at
  BEFORE UPDATE ON stylist_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_stylist_memory_updated_at();
