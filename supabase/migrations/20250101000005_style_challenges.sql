-- Migration: Style Challenges System
-- Description: Creates table for personalized style challenges

-- Create style_challenges table
CREATE TABLE style_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('color', 'style', 'occasion', 'seasonal', 'creativity', 'minimalist')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of constraint strings
  required_items JSONB, -- Optional: Array of required item categories
  duration_days INTEGER NOT NULL DEFAULT 7,
  points_reward INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL, -- Optional: outfit submitted for challenge
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_style_challenges_user_id ON style_challenges(user_id);
CREATE INDEX idx_style_challenges_status ON style_challenges(status);
CREATE INDEX idx_style_challenges_type ON style_challenges(type);
CREATE INDEX idx_style_challenges_user_status ON style_challenges(user_id, status);
CREATE INDEX idx_style_challenges_created_at ON style_challenges(created_at DESC);

-- Enable Row Level Security
ALTER TABLE style_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own challenges
CREATE POLICY "Users can view their own challenges"
  ON style_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenges"
  ON style_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON style_challenges FOR UPDATE
  USING (auth.uid() = user_id);

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

CREATE TRIGGER style_challenges_updated_at
  BEFORE UPDATE ON style_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_style_challenges_updated_at();

-- Trigger to set completed_at when status changes to 'completed'
CREATE OR REPLACE FUNCTION set_challenge_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_completed_at
  BEFORE UPDATE ON style_challenges
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION set_challenge_completed_at();
