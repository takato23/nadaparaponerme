-- =====================================================
-- SETUP COMPLETO - No Tengo Nada Para Ponerme
-- Ejecutar este script en Supabase SQL Editor
-- https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/sql/new
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
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
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(is_public) WHERE is_public = true;

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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- CLOTHING ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS clothing_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  color_primary TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  brand TEXT,
  size TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(10, 2),
  tags TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  times_worn INTEGER DEFAULT 0,
  last_worn_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_category CHECK (category IN ('top', 'bottom', 'shoes', 'accessory', 'outerwear', 'one-piece'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clothing_user ON clothing_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clothing_category ON clothing_items(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clothing_favorite ON clothing_items(user_id, is_favorite) WHERE is_favorite = true AND deleted_at IS NULL;

-- =====================================================
-- OUTFITS
-- =====================================================

CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  clothing_item_ids UUID[] NOT NULL,
  occasion TEXT,
  season TEXT,
  is_public BOOLEAN DEFAULT false,
  ai_generated BOOLEAN DEFAULT false,
  ai_reasoning TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT outfit_has_items CHECK (array_length(clothing_item_ids, 1) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outfits_public ON outfits(is_public, created_at DESC) WHERE is_public = true AND deleted_at IS NULL;

-- =====================================================
-- OUTFIT RATINGS (Feature 12)
-- =====================================================

CREATE TABLE IF NOT EXISTS outfit_ratings (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outfit_ratings_user_id ON outfit_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_ratings_outfit_id ON outfit_ratings(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_ratings_rating ON outfit_ratings(rating DESC);

-- Enable Row Level Security
ALTER TABLE outfit_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own ratings" ON outfit_ratings;
CREATE POLICY "Users can view their own ratings"
  ON outfit_ratings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own ratings" ON outfit_ratings;
CREATE POLICY "Users can create their own ratings"
  ON outfit_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON outfit_ratings;
CREATE POLICY "Users can update their own ratings"
  ON outfit_ratings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON outfit_ratings;
CREATE POLICY "Users can delete their own ratings"
  ON outfit_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_outfit_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outfit_ratings_updated_at ON outfit_ratings;
CREATE TRIGGER outfit_ratings_updated_at
  BEFORE UPDATE ON outfit_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_outfit_ratings_updated_at();

-- =====================================================
-- STYLE CHALLENGES (Feature 13)
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
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for clothing_items
DROP POLICY IF EXISTS "Users can view their own items" ON clothing_items;
CREATE POLICY "Users can view their own items"
  ON clothing_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own items" ON clothing_items;
CREATE POLICY "Users can insert their own items"
  ON clothing_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own items" ON clothing_items;
CREATE POLICY "Users can update their own items"
  ON clothing_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own items" ON clothing_items;
CREATE POLICY "Users can delete their own items"
  ON clothing_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for outfits
DROP POLICY IF EXISTS "Users can view their own outfits" ON outfits;
CREATE POLICY "Users can view their own outfits"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can insert their own outfits" ON outfits;
CREATE POLICY "Users can insert their own outfits"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own outfits" ON outfits;
CREATE POLICY "Users can update their own outfits"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own outfits" ON outfits;
CREATE POLICY "Users can delete their own outfits"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Setup completo! Todas las tablas creadas correctamente.';
  RAISE NOTICE '🎯 Feature 12: Outfit Rating System lista para usar.';
  RAISE NOTICE '🎯 Feature 13: Style Challenges System lista para usar.';
  RAISE NOTICE '🚀 Abrí http://localhost:3000 y empezá a testear!';
END $$;
