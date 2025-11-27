-- =====================================================
-- INITIAL SCHEMA MIGRATION
-- No Tengo Nada Para Ponerme - Fashion Closet App
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER PROFILES
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT false,
  style_preferences JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_]+$')
);

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_public ON profiles(is_public) WHERE is_public = true;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- CLOTHING ITEMS
-- =====================================================

CREATE TABLE clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic metadata
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  color_primary TEXT NOT NULL,

  -- Image storage (Supabase Storage path)
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- AI-generated metadata from Gemini
  ai_metadata JSONB DEFAULT '{}'::jsonb,

  -- User-added metadata
  brand TEXT,
  size TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(10, 2),
  tags TEXT[] DEFAULT '{}'::text[],
  notes TEXT,

  -- Usage tracking
  times_worn INTEGER DEFAULT 0,
  last_worn_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_category CHECK (category IN ('top', 'bottom', 'shoes', 'accessory', 'outerwear', 'one-piece'))
);

-- Indexes
CREATE INDEX idx_clothing_user ON clothing_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clothing_category ON clothing_items(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_clothing_favorite ON clothing_items(user_id, is_favorite) WHERE is_favorite = true AND deleted_at IS NULL;
CREATE INDEX idx_clothing_tags ON clothing_items USING GIN(tags);
CREATE INDEX idx_clothing_ai_metadata ON clothing_items USING GIN(ai_metadata);
CREATE INDEX idx_clothing_created ON clothing_items(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- OUTFITS
-- =====================================================

CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Outfit composition (array of clothing_item IDs)
  clothing_item_ids UUID[] NOT NULL,

  -- Context
  occasion TEXT,
  season TEXT,

  -- Sharing & visibility
  is_public BOOLEAN DEFAULT false,
  ai_generated BOOLEAN DEFAULT false,

  -- AI context
  ai_reasoning TEXT,

  -- Social metrics (denormalized for performance)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT outfit_has_items CHECK (array_length(clothing_item_ids, 1) > 0)
);

-- Indexes
CREATE INDEX idx_outfits_user ON outfits(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_outfits_public ON outfits(is_public, created_at DESC) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX idx_outfits_clothing_items ON outfits USING GIN(clothing_item_ids);

-- =====================================================
-- FRIENDSHIPS
-- =====================================================

CREATE TABLE friendships (
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

CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX idx_friendships_accepted ON friendships(requester_id, addressee_id) WHERE status = 'accepted';

-- =====================================================
-- OUTFIT LIKES
-- =====================================================

CREATE TABLE outfit_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_like UNIQUE (outfit_id, user_id)
);

CREATE INDEX idx_outfit_likes_outfit ON outfit_likes(outfit_id);
CREATE INDEX idx_outfit_likes_user ON outfit_likes(user_id);

-- =====================================================
-- OUTFIT COMMENTS
-- =====================================================

CREATE TABLE outfit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT comment_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT comment_length CHECK (char_length(content) <= 500)
);

CREATE INDEX idx_outfit_comments_outfit ON outfit_comments(outfit_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_outfit_comments_user ON outfit_comments(user_id);

-- =====================================================
-- BORROWED ITEMS
-- =====================================================

CREATE TABLE borrowed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clothing_item_id UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'requested',

  borrowed_at TIMESTAMPTZ,
  expected_return_date DATE,
  returned_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_borrow CHECK (owner_id != borrower_id),
  CONSTRAINT valid_borrow_status CHECK (status IN ('requested', 'approved', 'borrowed', 'returned', 'declined'))
);

CREATE INDEX idx_borrowed_owner ON borrowed_items(owner_id, status);
CREATE INDEX idx_borrowed_borrower ON borrowed_items(borrower_id, status);
CREATE INDEX idx_borrowed_item ON borrowed_items(clothing_item_id);
CREATE INDEX idx_borrowed_active ON borrowed_items(status) WHERE status IN ('requested', 'approved', 'borrowed');

-- =====================================================
-- PACKING LISTS
-- =====================================================

CREATE TABLE packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  trip_name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Array of outfit IDs
  outfit_ids UUID[] DEFAULT '{}'::uuid[],

  -- AI suggestions (markdown format)
  ai_suggestions TEXT,

  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_packing_user ON packing_lists(user_id, start_date DESC);
CREATE INDEX idx_packing_active ON packing_lists(user_id, is_archived) WHERE is_archived = false;

-- =====================================================
-- ACTIVITY FEED
-- =====================================================

CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,

  metadata JSONB DEFAULT '{}'::jsonb,

  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_activity_type CHECK (activity_type IN ('like', 'comment', 'follow', 'borrow_request', 'borrow_approved', 'outfit_shared'))
);

CREATE INDEX idx_activity_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_unread ON activity_feed(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_activity_type ON activity_feed(activity_type, created_at DESC);
