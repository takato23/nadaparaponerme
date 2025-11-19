-- =====================================================
-- MIGRATION: Tribes & Communities
-- =====================================================

-- Communities Table
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category TEXT NOT NULL, -- e.g., 'style', 'location', 'brand', 'interest'
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_private BOOLEAN DEFAULT false,
  members_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communities_category ON communities(category);
CREATE INDEX idx_communities_created_by ON communities(created_by);

-- Community Members Table
CREATE TABLE community_members (
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_membership UNIQUE (community_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'moderator', 'member'))
);

CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);

-- RLS Policies

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Communities Policies
CREATE POLICY "Communities are viewable by everyone"
  ON communities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their communities"
  ON communities FOR UPDATE
  USING (auth.uid() = created_by);

-- Community Members Policies
CREATE POLICY "Memberships are viewable by everyone"
  ON community_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join public communities"
  ON community_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_id AND is_private = false
    )
  );

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update members_count
CREATE OR REPLACE FUNCTION update_community_members_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities
    SET members_count = members_count + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities
    SET members_count = members_count - 1
    WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_community_member_change
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_members_count();
