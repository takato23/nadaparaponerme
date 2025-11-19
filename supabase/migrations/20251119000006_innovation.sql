-- =====================================================
-- MIGRATION: Innovation Features (Party Mode & Marketplace)
-- =====================================================

-- 1. Party Mode (Collaborative Wardrobe / Events)

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL, -- Optional link to a community
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_participants (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going', -- 'going', 'maybe', 'invited', 'declined'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_event_participant UNIQUE (event_id, user_id)
);

CREATE TABLE event_outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL, -- Can be null if just planning
  notes TEXT, -- "Thinking of wearing this", "Need to borrow shoes"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_outfits ENABLE ROW LEVEL SECURITY;

-- Events Policies
CREATE POLICY "Events are viewable by participants"
  ON events FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM event_participants WHERE event_id = id AND user_id = auth.uid()) OR
    (is_private = false)
  );

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Event Participants Policies
CREATE POLICY "Participants viewable by event members"
  ON event_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND (created_by = auth.uid() OR is_private = false)) OR
    EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = event_id AND ep.user_id = auth.uid())
  );

CREATE POLICY "Users can join public events or if invited"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id); -- Simplified for now

-- Event Outfits Policies
CREATE POLICY "Event outfits viewable by participants"
  ON event_outfits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM event_participants WHERE event_id = event_outfits.event_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can add their outfits to events"
  ON event_outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 2. Marketplace P2P ("Shop the Look")

-- Add marketplace columns to clothing_items
ALTER TABLE clothing_items
ADD COLUMN is_for_sale BOOLEAN DEFAULT false,
ADD COLUMN is_for_exchange BOOLEAN DEFAULT false,
ADD COLUMN price DECIMAL(10, 2),
ADD COLUMN currency TEXT DEFAULT 'ARS',
ADD COLUMN condition TEXT; -- 'new', 'like_new', 'good', 'fair'

CREATE INDEX idx_clothing_items_for_sale ON clothing_items(is_for_sale) WHERE is_for_sale = true;
CREATE INDEX idx_clothing_items_for_exchange ON clothing_items(is_for_exchange) WHERE is_for_exchange = true;

-- Marketplace Offers Table
CREATE TABLE marketplace_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL, -- 'purchase', 'exchange'
  offer_amount DECIMAL(10, 2), -- For purchase
  exchange_item_id UUID REFERENCES clothing_items(id), -- For exchange
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own offers (buy/sell)"
  ON marketplace_offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can make offers"
  ON marketplace_offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their offers"
  ON marketplace_offers FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
