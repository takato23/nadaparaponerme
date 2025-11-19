-- =====================================================
-- Aplicar tabla style_challenges a base de datos existente
-- Ejecutar este script en Supabase SQL Editor si la tabla no existe
-- https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/sql/new
-- =====================================================

-- Enable UUID extension (si no está habilitado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STYLE CHALLENGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS style_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('color', 'style', 'occasion', 'seasonal', 'creativity', 'minimalist')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_items JSONB,
  duration_days INTEGER NOT NULL DEFAULT 7,
  points_reward INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_style_challenges_user_id ON style_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_style_challenges_status ON style_challenges(status);
CREATE INDEX IF NOT EXISTS idx_style_challenges_type ON style_challenges(type);
CREATE INDEX IF NOT EXISTS idx_style_challenges_user_status ON style_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_style_challenges_created_at ON style_challenges(created_at DESC);

-- Enable Row Level Security
ALTER TABLE style_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own challenges" ON style_challenges;
CREATE POLICY "Users can view their own challenges"
  ON style_challenges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own challenges" ON style_challenges;
CREATE POLICY "Users can create their own challenges"
  ON style_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own challenges" ON style_challenges;
CREATE POLICY "Users can update their own challenges"
  ON style_challenges FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own challenges" ON style_challenges;
CREATE POLICY "Users can delete their own challenges"
  ON style_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_style_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS style_challenges_updated_at ON style_challenges;
CREATE TRIGGER style_challenges_updated_at
  BEFORE UPDATE ON style_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_style_challenges_updated_at();

-- Trigger to set completed_at when status changes to 'completed'
CREATE OR REPLACE FUNCTION set_challenge_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS challenge_completed_at ON style_challenges;
CREATE TRIGGER challenge_completed_at
  BEFORE UPDATE ON style_challenges
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION set_challenge_completed_at();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabla style_challenges creada correctamente!';
  RAISE NOTICE '🎯 Feature 13: Style Challenges System lista para usar.';
END $$;





