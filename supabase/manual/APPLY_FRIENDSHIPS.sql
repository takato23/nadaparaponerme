-- =====================================================
-- APPLY FRIENDSHIPS TABLES
-- Run this in the Supabase SQL Editor
-- =====================================================

-- 1. Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_accepted ON friendships(requester_id, addressee_id) WHERE status = 'accepted';

-- 3. Create close_friends table
CREATE TABLE IF NOT EXISTS close_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_close_friend CHECK (user_id != friend_id),
  CONSTRAINT unique_close_friend UNIQUE (user_id, friend_id)
);

-- 4. Create indexes for close_friends
CREATE INDEX IF NOT EXISTS idx_close_friends_user ON close_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_close_friends_friend ON close_friends(friend_id);

-- 5. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for friendships
DROP TRIGGER IF EXISTS trigger_friendships_updated_at ON friendships;
CREATE TRIGGER trigger_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friend requests" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;

-- 9. Create friendships RLS policies
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- 10. Drop existing close_friends policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own close friends" ON close_friends;
DROP POLICY IF EXISTS "Users can insert their own close friends" ON close_friends;
DROP POLICY IF EXISTS "Users can delete their own close friends" ON close_friends;

-- 11. Create close_friends RLS policies
CREATE POLICY "Users can view their own close friends"
  ON close_friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own close friends"
  ON close_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own close friends"
  ON close_friends FOR DELETE
  USING (auth.uid() = user_id);

-- 12. Function to check if users are close friends
CREATE OR REPLACE FUNCTION is_close_friend(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM close_friends
    WHERE user_id = user_uuid AND friend_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE! Refresh the page to see the changes
-- =====================================================
