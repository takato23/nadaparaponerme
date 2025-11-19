-- =====================================================
-- TRIGGERS AND ROW LEVEL SECURITY
-- =====================================================

-- =====================================================
-- TRIGGERS FOR DENORMALIZATION AND AUTO-UPDATES
-- =====================================================

-- Update outfit likes count
CREATE OR REPLACE FUNCTION update_outfit_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE outfits SET likes_count = likes_count + 1 WHERE id = NEW.outfit_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE outfits SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.outfit_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_outfit_likes_count
AFTER INSERT OR DELETE ON outfit_likes
FOR EACH ROW EXECUTE FUNCTION update_outfit_likes_count();

-- Update outfit comments count
CREATE OR REPLACE FUNCTION update_outfit_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE outfits SET comments_count = comments_count + 1 WHERE id = NEW.outfit_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE outfits SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.outfit_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_outfit_comments_count
AFTER INSERT OR DELETE ON outfit_comments
FOR EACH ROW EXECUTE FUNCTION update_outfit_comments_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_clothing_updated_at BEFORE UPDATE ON clothing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_outfits_updated_at BEFORE UPDATE ON outfits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_friendships_updated_at BEFORE UPDATE ON friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_comments_updated_at BEFORE UPDATE ON outfit_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_borrowed_updated_at BEFORE UPDATE ON borrowed_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_packing_updated_at BEFORE UPDATE ON packing_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can view public profiles
CREATE POLICY "Users can view public profiles"
  ON profiles FOR SELECT
  USING (is_public = true);

-- Users can view friends' profiles
CREATE POLICY "Users can view friends profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = profiles.id)
        OR (addressee_id = auth.uid() AND requester_id = profiles.id))
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- CLOTHING ITEMS POLICIES
-- =====================================================

-- Users can view their own items
CREATE POLICY "Users can view own clothing items"
  ON clothing_items FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can view friends' items (for borrowing)
CREATE POLICY "Users can view friends clothing items"
  ON clothing_items FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = clothing_items.user_id)
        OR (addressee_id = auth.uid() AND requester_id = clothing_items.user_id))
    )
  );

-- Users can manage their own items
CREATE POLICY "Users can insert own clothing items"
  ON clothing_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own clothing items"
  ON clothing_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own clothing items"
  ON clothing_items FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- OUTFITS POLICIES
-- =====================================================

-- Users can view their own outfits
CREATE POLICY "Users can view own outfits"
  ON outfits FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can view public outfits
CREATE POLICY "Users can view public outfits"
  ON outfits FOR SELECT
  USING (is_public = true AND deleted_at IS NULL);

-- Users can view friends' outfits
CREATE POLICY "Users can view friends outfits"
  ON outfits FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = outfits.user_id)
        OR (addressee_id = auth.uid() AND requester_id = outfits.user_id))
    )
  );

-- Users can manage their own outfits
CREATE POLICY "Users can insert own outfits"
  ON outfits FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own outfits"
  ON outfits FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own outfits"
  ON outfits FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- FRIENDSHIPS POLICIES
-- =====================================================

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Users can send friend requests
CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Users can update friendships they're part of (accept/decline)
CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- =====================================================
-- OUTFIT LIKES POLICIES
-- =====================================================

-- Users can view likes on outfits they can see
CREATE POLICY "Users can view outfit likes"
  ON outfit_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_likes.outfit_id
      AND deleted_at IS NULL
      AND (
        outfits.user_id = auth.uid()
        OR outfits.is_public = true
        OR EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = outfits.user_id)
            OR (addressee_id = auth.uid() AND requester_id = outfits.user_id))
        )
      )
    )
  );

-- Users can like outfits they can see
CREATE POLICY "Users can like outfits"
  ON outfit_likes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_likes.outfit_id
      AND deleted_at IS NULL
      AND (
        outfits.user_id = auth.uid()
        OR outfits.is_public = true
        OR EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = outfits.user_id)
            OR (addressee_id = auth.uid() AND requester_id = outfits.user_id))
        )
      )
    )
  );

-- Users can remove their own likes
CREATE POLICY "Users can remove own likes"
  ON outfit_likes FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- OUTFIT COMMENTS POLICIES
-- =====================================================

-- Users can view comments on outfits they can see
CREATE POLICY "Users can view outfit comments"
  ON outfit_comments FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_comments.outfit_id
      AND deleted_at IS NULL
      AND (
        outfits.user_id = auth.uid()
        OR outfits.is_public = true
        OR EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = outfits.user_id)
            OR (addressee_id = auth.uid() AND requester_id = outfits.user_id))
        )
      )
    )
  );

-- Users can comment on outfits they can see
CREATE POLICY "Users can comment on outfits"
  ON outfit_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_comments.outfit_id
      AND deleted_at IS NULL
      AND (
        outfits.user_id = auth.uid()
        OR outfits.is_public = true
        OR EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND ((requester_id = auth.uid() AND addressee_id = outfits.user_id)
            OR (addressee_id = auth.uid() AND requester_id = outfits.user_id))
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON outfit_comments FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON outfit_comments FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- BORROWED ITEMS POLICIES
-- =====================================================

-- Users can view borrow requests involving them
CREATE POLICY "Users can view own borrow requests"
  ON borrowed_items FOR SELECT
  USING (owner_id = auth.uid() OR borrower_id = auth.uid());

-- Users can create borrow requests for friends' items
CREATE POLICY "Users can create borrow requests"
  ON borrowed_items FOR INSERT
  WITH CHECK (
    borrower_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND addressee_id = borrowed_items.owner_id)
        OR (addressee_id = auth.uid() AND requester_id = borrowed_items.owner_id))
    )
  );

-- Users can update borrow requests involving them
CREATE POLICY "Users can update own borrow requests"
  ON borrowed_items FOR UPDATE
  USING (owner_id = auth.uid() OR borrower_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR borrower_id = auth.uid());

-- =====================================================
-- PACKING LISTS POLICIES
-- =====================================================

-- Users can view their own packing lists
CREATE POLICY "Users can view own packing lists"
  ON packing_lists FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own packing lists
CREATE POLICY "Users can insert own packing lists"
  ON packing_lists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own packing lists"
  ON packing_lists FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own packing lists"
  ON packing_lists FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- ACTIVITY FEED POLICIES
-- =====================================================

-- Users can view their own activity feed
CREATE POLICY "Users can view own activity feed"
  ON activity_feed FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own activity as read
CREATE POLICY "Users can update own activity"
  ON activity_feed FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
