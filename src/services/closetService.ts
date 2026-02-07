/**
 * Closet Service
 *
 * Handles CRUD operations for clothing items.
 * Supports both localStorage (legacy) and Supabase backend.
 */

import { supabase, uploadImage, compressImage, createThumbnail } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ClothingItem as LegacyClothingItem, ClothingItemMetadata } from '../../types';
import type { Database, ClothingCategory, Season } from '../types/api';

type ClothingItemRow = Database['public']['Tables']['clothing_items']['Row'];
type ClothingItemInsert = Database['public']['Tables']['clothing_items']['Insert'];
type ClothingItemUpdate = Database['public']['Tables']['clothing_items']['Update'];
type PersistedItemStatus = NonNullable<ClothingItemInsert['status']>;

// Type guards for safe category validation
const VALID_CATEGORIES = ['top', 'bottom', 'shoes', 'accessory', 'outerwear', 'one-piece'] as const;
type ValidCategory = typeof VALID_CATEGORIES[number];

function isValidCategory(category: string | null): category is ValidCategory {
  return VALID_CATEGORIES.includes(category as any);
}

function safeParseCategory(category: string | null): string {
  if (!category) return 'top'; // Default fallback
  if (isValidCategory(category)) return category;

  // Try to normalize common variations
  const normalized = category.toLowerCase();
  if (normalized.includes('top') || normalized.includes('shirt')) return 'top';
  if (normalized.includes('bottom') || normalized.includes('pants')) return 'bottom';
  if (normalized.includes('shoe')) return 'shoes';
  if (normalized.includes('accessory')) return 'accessory';
  if (normalized.includes('jacket') || normalized.includes('coat')) return 'outerwear';
  if (normalized.includes('dress') || normalized.includes('one-piece') || normalized.includes('onepiece')) {
    return 'one-piece';
  }

  return 'top'; // Default fallback
}

function safeParseSeasons(seasons: unknown): string[] {
  if (!seasons) return [];
  if (Array.isArray(seasons)) {
    return seasons.filter(s => typeof s === 'string');
  }
  return [];
}

/**
 * Convert Supabase ClothingItem to legacy format
 */
function convertToLegacyFormat(item: ClothingItemRow): LegacyClothingItem {
  return {
    id: item.id,
    imageDataUrl: item.image_url,
    metadata: {
      category: safeParseCategory(item.category),
      subcategory: item.subcategory || '',
      color_primary: item.color_primary,
      neckline: item.ai_metadata?.neckline,
      sleeve_type: item.ai_metadata?.sleeve_type,
      vibe_tags: item.ai_metadata?.vibe_tags || item.tags || [],
      seasons: safeParseSeasons(item.ai_metadata?.seasons),
      description: item.notes || undefined,
    },
    backImageDataUrl: item.back_image_url || undefined,
    status: (item.status as LegacyClothingItem['status']) || 'owned',
  };
}

/**
 * Get all clothing items for current user
 */
export async function getClothingItems(): Promise<LegacyClothingItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(convertToLegacyFormat);
  } catch (error) {
    logger.error('Failed to fetch closet items:', error);
    throw error;
  }
}

/**
 * Get a single clothing item by ID
 */
export async function getClothingItem(id: string): Promise<LegacyClothingItem | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to fetch closet item:', error);
    throw error;
  }
}

/**
 * Add a new clothing item
 */
export async function addClothingItem(
  imageFile: File,
  metadata: ClothingItemMetadata,
  backImageFile?: File, // Optional back view image
  status: PersistedItemStatus = 'owned'
): Promise<LegacyClothingItem> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Compress main image
    const compressedImage = await compressImage(imageFile, 1200, 0.85);
    const thumbnail = await createThumbnail(compressedImage, 400);
    const extension = compressedImage.name.match(/\.[^.]+$/)?.[0] || '.jpg';

    const timestamp = Date.now();
    const imagePath = `${user.id}/${timestamp}/image${extension}`;
    const thumbnailPath = `${user.id}/${timestamp}/thumbnail${extension}`;

    // Helper for back image processing if provided
    let backImageUrl: string | null = null;
    let backThumbnailUrl: string | null = null;
    let backImagePath: string | null = null;
    let backThumbnailPath: string | null = null;

    if (backImageFile) {
      const compressedBack = await compressImage(backImageFile, 1200, 0.85);
      const thumbnailBack = await createThumbnail(compressedBack, 400);
      const extBack = compressedBack.name.match(/\.[^.]+$/)?.[0] || '.jpg';

      backImagePath = `${user.id}/${timestamp}/back_image${extBack}`;
      backThumbnailPath = `${user.id}/${timestamp}/back_thumbnail${extBack}`;

      const [bUrl, btUrl] = await Promise.all([
        uploadImage('clothing-images', backImagePath, compressedBack),
        uploadImage('clothing-images', backThumbnailPath, thumbnailBack),
      ]);
      backImageUrl = bUrl;
      backThumbnailUrl = btUrl;
    }

    // Upload main images
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadImage('clothing-images', imagePath, compressedImage),
      uploadImage('clothing-images', thumbnailPath, thumbnail),
    ]);

    // Insert into database
    const newItem: ClothingItemInsert = {
      user_id: user.id,
      name: metadata.subcategory,
      category: safeParseCategory(metadata.category) as ClothingCategory,
      subcategory: metadata.subcategory,
      color_primary: metadata.color_primary,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      back_image_url: backImageUrl,
      back_thumbnail_url: backThumbnailUrl,
      ai_metadata: {
        neckline: metadata.neckline,
        sleeve_type: metadata.sleeve_type,
        vibe_tags: metadata.vibe_tags,
        seasons: (metadata.seasons || []) as Season[],
      },
      tags: metadata.vibe_tags || [],
      notes: metadata.description || null,
      status,
    };

    const { data, error } = await (supabase.from('clothing_items') as any)
      .insert(newItem)
      .select()
      .single();

    if (error) {
      // Cleanup uploaded images if database insert fails
      const pathsToRemove = [imagePath, thumbnailPath];
      if (backImagePath) pathsToRemove.push(backImagePath);
      if (backThumbnailPath) pathsToRemove.push(backThumbnailPath);
      await supabase.storage.from('clothing-images').remove(pathsToRemove);
      throw error;
    }

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to add closet item:', error);
    throw error;
  }
}

/**
 * Add a generated clothing item from an existing image URL (no upload step).
 * Used by AI generation flows when image is already hosted.
 */
export async function addGeneratedClothingItem(
  imageUrl: string,
  metadata: ClothingItemMetadata,
  status: PersistedItemStatus = 'owned'
): Promise<LegacyClothingItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const safeCategory = safeParseCategory(metadata.category);
  const itemToInsert: ClothingItemInsert = {
    user_id: user.id,
    name: metadata.subcategory || 'AI Generated Item',
    category: safeCategory as ClothingCategory,
    subcategory: metadata.subcategory || 'AI Generated Item',
    color_primary: metadata.color_primary || '#000000',
    image_url: imageUrl,
    thumbnail_url: imageUrl,
    ai_metadata: {
      neckline: metadata.neckline,
      sleeve_type: metadata.sleeve_type,
      vibe_tags: metadata.vibe_tags || ['ai-generated'],
      seasons: (metadata.seasons || []) as Season[],
    },
    tags: metadata.vibe_tags || ['ai-generated'],
    notes: metadata.description || null,
    status,
  };

  const { data, error } = await (supabase.from('clothing_items') as any)
    .insert(itemToInsert)
    .select()
    .single();

  if (error) {
    logger.error('Failed to add generated closet item:', error);
    throw error;
  }

  return convertToLegacyFormat(data);
}

/**
 * Update a clothing item
 */
export async function updateClothingItem(
  id: string,
  metadata: ClothingItemMetadata,
  newBackImage?: File
): Promise<LegacyClothingItem> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const update: ClothingItemUpdate = {
      name: metadata.subcategory,
      category: metadata.category as ClothingCategory,
      subcategory: metadata.subcategory,
      color_primary: metadata.color_primary,
      ai_metadata: {
        neckline: metadata.neckline,
        sleeve_type: metadata.sleeve_type,
        vibe_tags: metadata.vibe_tags,
        seasons: (metadata.seasons || []) as Season[],
      },
      tags: metadata.vibe_tags || [],
      notes: metadata.description || null,
    };

    // Handle new back image if provided
    if (newBackImage) {
      const compressedBack = await compressImage(newBackImage, 1200, 0.85);
      const thumbnailBack = await createThumbnail(compressedBack, 400);
      const extBack = compressedBack.name.match(/\.[^.]+$/)?.[0] || '.jpg';
      const timestamp = Date.now();
      const backImagePath = `${user.id}/${timestamp}/back_image${extBack}`;
      const backThumbnailPath = `${user.id}/${timestamp}/back_thumbnail${extBack}`;

      const [bUrl, btUrl] = await Promise.all([
        uploadImage('clothing-images', backImagePath, compressedBack),
        uploadImage('clothing-images', backThumbnailPath, thumbnailBack),
      ]);
      update.back_image_url = bUrl;
      update.back_thumbnail_url = btUrl;
    }

    const { data, error } = await (supabase.from('clothing_items') as any)
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to update closet item:', error);
    throw error;
  }
}

/**
 * Delete a clothing item (soft delete)
 */
export async function deleteClothingItem(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase.from('clothing_items') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to delete closet item:', error);
    throw error;
  }
}

/**
 * Increment times_worn counter
 */
export async function incrementTimesWorn(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Increment (atomic update)
    const { error } = await (supabase.rpc('increment_times_worn', { item_id: id }) as any);

    if (error) {
      // Fallback to manual update if RPC fails (or doesn't exist yet)
      const { data: item, error: fetchError } = await (supabase
        .from('clothing_items') as any)
        .select('times_worn')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await (supabase
        .from('clothing_items') as any)
        .update({
          times_worn: (item?.times_worn || 0) + 1,
          last_worn_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }
  } catch (error) {
    logger.error('Failed to increment times worn:', error);
    // Don't throw, just log - this is a non-critical operation
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current favorite status
    const { data: item, error: fetchError } = await (supabase
      .from('clothing_items') as any)
      .select('is_favorite')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newFavoriteStatus = !item?.is_favorite;

    // Toggle
    const { error } = await (supabase
      .from('clothing_items') as any)
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return newFavoriteStatus;
  } catch (error) {
    logger.error('Failed to toggle favorite:', error);
    throw error;
  }
}
