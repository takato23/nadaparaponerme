-- Migration: Sponsors System
-- Description: Creates tables for sponsor management and click tracking

-- ============================================================================
-- SPONSORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- 'zara', 'hm', 'nike'
  logo_url TEXT,
  website_url TEXT NOT NULL,
  
  -- Display config
  icon TEXT NOT NULL DEFAULT 'storefront',  -- Material icon
  description TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Ver más',
  
  -- Targeting
  match_categories TEXT[] DEFAULT '{}',  -- ['top', 'bottom', 'shoes']
  match_vibes TEXT[] DEFAULT '{}',       -- ['casual', 'formal', 'street']
  match_colors TEXT[] DEFAULT '{}',      -- ['negro', 'blanco']
  
  -- Priority & Status
  priority INTEGER DEFAULT 5,        -- 1-10, higher = more likely to show
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SPONSOR CLICKS TABLE (Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- null = anonymous
  
  -- Context: where was the click?
  placement_context TEXT NOT NULL,  -- 'dupe_finder', 'outfit_result', 'shop_the_look', 'fit_result'
  item_category TEXT,               -- 'top', 'bottom' etc
  search_term TEXT,                 -- what user was searching for
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsors_priority ON sponsors(priority DESC);
CREATE INDEX IF NOT EXISTS idx_sponsors_slug ON sponsors(slug);
CREATE INDEX IF NOT EXISTS idx_sponsor_clicks_sponsor_id ON sponsor_clicks(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_clicks_created_at ON sponsor_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_clicks_context ON sponsor_clicks(placement_context);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_clicks ENABLE ROW LEVEL SECURITY;

-- Everyone can read active sponsors
DROP POLICY IF EXISTS "Anyone can view active sponsors" ON sponsors;
CREATE POLICY "Anyone can view active sponsors"
  ON sponsors FOR SELECT
  USING (is_active = true);

-- Service role manages sponsors
DROP POLICY IF EXISTS "Service role manages sponsors" ON sponsors;
CREATE POLICY "Service role manages sponsors"
  ON sponsors FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anyone can insert clicks (for tracking)
DROP POLICY IF EXISTS "Anyone can insert clicks" ON sponsor_clicks;
CREATE POLICY "Anyone can insert clicks"
  ON sponsor_clicks FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Users can view their own clicks
DROP POLICY IF EXISTS "Users can view their own clicks" ON sponsor_clicks;
CREATE POLICY "Users can view their own clicks"
  ON sponsor_clicks FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can view all clicks
DROP POLICY IF EXISTS "Service role can view all clicks" ON sponsor_clicks;
CREATE POLICY "Service role can view all clicks"
  ON sponsor_clicks FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sponsors_updated_at ON sponsors;
CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsors_updated_at();

-- ============================================================================
-- SEED DATA: Migrate existing hardcoded sponsors
-- ============================================================================

INSERT INTO sponsors (slug, name, website_url, icon, description, cta_text, match_categories, match_vibes, priority)
VALUES
  ('zara', 'Zara', 'https://www.zara.com/ar/', 'storefront', 'Básicos nuevos y colecciones de temporada.', 'Ver novedades', ARRAY['top', 'bottom', 'shoes', 'outerwear'], ARRAY['formal', 'casual'], 6),
  ('hm', 'H&M', 'https://www2.hm.com/es_ar/', 'local_mall', 'Looks completos con precios accesibles.', 'Explorar catálogo', ARRAY['top', 'bottom'], ARRAY['casual', 'street', 'basic'], 5),
  ('mango', 'Mango', 'https://shop.mango.com/ar', 'shopping_bag', 'Opciones premium para elevar el look.', 'Comprar ahora', ARRAY['outerwear'], ARRAY['formal', 'night', 'elegant'], 4),
  ('nike', 'Nike', 'https://www.nike.com/ar/', 'sports_tennis', 'Zapatillas y athleisure para outfits urbanos.', 'Ver sneakers', ARRAY['shoes'], ARRAY['sport', 'street', 'active'], 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  website_url = EXCLUDED.website_url,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  cta_text = EXCLUDED.cta_text,
  match_categories = EXCLUDED.match_categories,
  match_vibes = EXCLUDED.match_vibes,
  priority = EXCLUDED.priority,
  updated_at = NOW();
