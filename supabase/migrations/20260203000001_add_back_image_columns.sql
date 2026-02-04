-- =====================================================
-- Add back image columns to clothing_items
-- Support for back-view photos of clothing items
-- =====================================================

-- Add columns for back image URL and thumbnail
ALTER TABLE clothing_items
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_thumbnail_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clothing_items.back_image_url IS 'URL to the back view image of the clothing item';
COMMENT ON COLUMN clothing_items.back_thumbnail_url IS 'URL to the thumbnail of the back view image';
