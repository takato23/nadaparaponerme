-- Migration: Guided look creation workflow sessions
-- Date: 2026-03-26

CREATE TABLE IF NOT EXISTS guided_look_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'collecting', 'confirming', 'generating', 'generated', 'cancelled', 'error')),
  collected_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  pending_confirmation_token TEXT,
  generated_item_json JSONB,
  autosave_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours'),
  UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_guided_look_sessions_user_session_updated
  ON guided_look_sessions(user_id, session_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_guided_look_sessions_user_status_updated
  ON guided_look_sessions(user_id, status, updated_at DESC);

ALTER TABLE guided_look_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own guided look sessions" ON guided_look_sessions;
CREATE POLICY "Users can view own guided look sessions"
  ON guided_look_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own guided look sessions" ON guided_look_sessions;
CREATE POLICY "Users can insert own guided look sessions"
  ON guided_look_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own guided look sessions" ON guided_look_sessions;
CREATE POLICY "Users can update own guided look sessions"
  ON guided_look_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_guided_look_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guided_look_sessions_updated_at ON guided_look_sessions;
CREATE TRIGGER trigger_guided_look_sessions_updated_at
  BEFORE UPDATE ON guided_look_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_guided_look_sessions_updated_at();
