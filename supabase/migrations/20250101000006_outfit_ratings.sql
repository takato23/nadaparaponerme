-- Migration: Outfit Rating System
-- Description: Creates table for user ratings and feedback on saved outfits

-- Create outfit_ratings table
CREATE TABLE outfit_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one rating per outfit per user
  UNIQUE(user_id, outfit_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_outfit_ratings_user_id ON outfit_ratings(user_id);
CREATE INDEX idx_outfit_ratings_outfit_id ON outfit_ratings(outfit_id);
CREATE INDEX idx_outfit_ratings_rating ON outfit_ratings(rating DESC);
CREATE INDEX idx_outfit_ratings_user_rating ON outfit_ratings(user_id, rating DESC);
CREATE INDEX idx_outfit_ratings_created_at ON outfit_ratings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE outfit_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own ratings
CREATE POLICY "Users can view their own ratings"
  ON outfit_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ratings"
  ON outfit_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON outfit_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON outfit_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outfit_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outfit_ratings_updated_at
  BEFORE UPDATE ON outfit_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_outfit_ratings_updated_at();
