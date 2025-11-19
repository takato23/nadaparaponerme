-- Migration: Closet Gap Analysis System
-- Description: Creates table for storing historical closet gap analyses
-- Feature 14: Allows users to track wardrobe improvements over time

-- Create closet_gap_analyses table
CREATE TABLE closet_gap_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Analysis results stored as JSONB for flexibility
  missing_essentials JSONB NOT NULL DEFAULT '[]'::jsonb,
  nice_to_have JSONB NOT NULL DEFAULT '[]'::jsonb,
  versatility_analysis JSONB NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  weaknesses TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  style_summary TEXT NOT NULL,
  shopping_budget_estimate TEXT,

  -- Metadata
  analyzed_items_count INTEGER NOT NULL DEFAULT 0,
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional: Track which items were analyzed (for historical comparison)
  closet_snapshot_ids TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Create indexes for better query performance
CREATE INDEX idx_gap_analyses_user_id ON closet_gap_analyses(user_id);
CREATE INDEX idx_gap_analyses_created_at ON closet_gap_analyses(user_id, created_at DESC);
CREATE INDEX idx_gap_analyses_confidence ON closet_gap_analyses(confidence_level);

-- Enable Row Level Security
ALTER TABLE closet_gap_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own analyses
CREATE POLICY "Users can view their own gap analyses"
  ON closet_gap_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gap analyses"
  ON closet_gap_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gap analyses"
  ON closet_gap_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Note: No UPDATE policy - gap analyses are immutable once created
-- Users should create a new analysis to track progress

-- Add comment explaining the table purpose
COMMENT ON TABLE closet_gap_analyses IS
'Stores historical closet gap analyses. Users can compare analyses over time to track wardrobe improvements.';

COMMENT ON COLUMN closet_gap_analyses.missing_essentials IS
'Array of essential items missing from wardrobe (GapAnalysisItem[])';

COMMENT ON COLUMN closet_gap_analyses.nice_to_have IS
'Array of recommended but optional items (GapAnalysisItem[])';

COMMENT ON COLUMN closet_gap_analyses.versatility_analysis IS
'VersatilityScore object with current_score, potential_score, and bottleneck_categories';

COMMENT ON COLUMN closet_gap_analyses.closet_snapshot_ids IS
'Optional: Array of clothing_item IDs that were analyzed (for historical tracking)';
