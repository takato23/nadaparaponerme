-- =====================================================
-- MIGRATION: Add Close Friends Support
-- =====================================================

-- Create close_friends table for unidirectional "Close Friend" relationships
CREATE TABLE close_friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_close_friend CHECK (user_id != friend_id),
  CONSTRAINT unique_close_friend UNIQUE (user_id, friend_id)
);

-- Indexes for performance
CREATE INDEX idx_close_friends_user ON close_friends(user_id);
CREATE INDEX idx_close_friends_friend ON close_friends(friend_id);

-- RLS Policies
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;

-- Users can view their own close friends list
CREATE POLICY "Users can view their own close friends"
  ON close_friends FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own close friends
CREATE POLICY "Users can insert their own close friends"
  ON close_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own close friends"
  ON close_friends FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check if users are close friends (useful for RLS on other tables)
CREATE OR REPLACE FUNCTION is_close_friend(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM close_friends
    WHERE user_id = user_uuid AND friend_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
