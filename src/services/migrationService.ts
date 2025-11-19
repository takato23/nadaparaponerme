/**
 * Migration Service
 *
 * Handles migration from localStorage to Supabase backend.
 * Converts base64 images to uploaded files and migrates data structures.
 */

import { supabase, uploadImage, compressImage, createThumbnail } from '../lib/supabase';
import type { ClothingItem, SavedOutfit } from '../../types';
import type { Database } from '../types/api';

type ClothingItemInsert = Database['public']['Tables']['clothing_items']['Insert'];
type OutfitInsert = Database['public']['Tables']['outfits']['Insert'];

export interface MigrationProgress {
  phase: 'idle' | 'closet' | 'outfits' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export type MigrationCallback = (progress: MigrationProgress) => void;

/**
 * Upload a base64 image to Supabase Storage
 */
async function uploadBase64Image(
  base64Data: string,
  userId: string,
  itemId: string
): Promise<string> {
  try {
    // Convert base64 to Blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();

    // Create File object
    const file = new File([blob], `${itemId}.jpg`, { type: 'image/jpeg' });

    // Compress image
    const compressedFile = await compressImage(file, 1200, 0.85);

    // Create thumbnail
    const thumbnail = await createThumbnail(compressedFile, 400);

    // Upload both versions
    const imagePath = `${userId}/${itemId}/image.jpg`;
    const thumbnailPath = `${userId}/${itemId}/thumbnail.jpg`;

    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadImage('clothing-images', imagePath, compressedFile),
      uploadImage('clothing-images', thumbnailPath, thumbnail),
    ]);

    return imageUrl; // Return the main image URL
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw new Error('Failed to upload image to storage');
  }
}

/**
 * Convert legacy ClothingItem to Supabase format
 */
async function convertClothingItem(
  item: ClothingItem,
  userId: string,
  onProgress?: (message: string) => void
): Promise<ClothingItemInsert> {
  onProgress?.(`Subiendo imagen de ${item.metadata.subcategory}...`);

  // Upload image to storage
  const imageUrl = await uploadBase64Image(item.imageDataUrl, userId, item.id);

  // Convert to Supabase format
  return {
    user_id: userId,
    name: item.metadata.subcategory, // Use subcategory as name
    category: item.metadata.category as any, // Cast to ClothingCategory
    subcategory: item.metadata.subcategory,
    color_primary: item.metadata.color_primary,
    image_url: imageUrl,
    ai_metadata: {
      neckline: item.metadata.neckline,
      sleeve_type: item.metadata.sleeve_type,
      vibe_tags: item.metadata.vibe_tags,
      seasons: item.metadata.seasons as any[],
    },
    tags: item.metadata.vibe_tags || [],
    notes: item.metadata.description || null,
    // id, times_worn, and timestamps will be set by database defaults
  };
}

/**
 * Convert legacy SavedOutfit to Supabase format
 */
function convertOutfit(outfit: SavedOutfit, userId: string): OutfitInsert {
  // Convert from old format (separate top/bottom/shoes ids) to new format (array)
  const clothing_item_ids = [
    outfit.top_id,
    outfit.bottom_id,
    outfit.shoes_id,
  ].filter(Boolean); // Remove any null/undefined values

  return {
    user_id: userId,
    name: `Outfit ${new Date().toLocaleDateString()}`, // Auto-generate name
    clothing_item_ids,
    ai_generated: true, // These were AI-generated outfits
    ai_reasoning: outfit.explanation,
    is_public: false, // Default to private
    // id and timestamps will be set by database
  };
}

/**
 * Migrate closet items from localStorage to Supabase
 */
async function migrateCloset(
  items: ClothingItem[],
  userId: string,
  onProgress: MigrationCallback
): Promise<void> {
  const total = items.length;
  let current = 0;

  onProgress({
    phase: 'closet',
    current,
    total,
    message: 'Iniciando migración del armario...',
  });

  for (const item of items) {
    try {
      // Convert and upload
      const supabaseItem = await convertClothingItem(item, userId, (msg) => {
        onProgress({
          phase: 'closet',
          current,
          total,
          message: msg,
        });
      });

      // Insert into database (use insert instead of upsert since we don't have id)
      const { error } = await supabase
        .from('clothing_items')
        .insert(supabaseItem);

      if (error) {
        console.error('Failed to insert item:', error);
        throw error;
      }

      current++;
      onProgress({
        phase: 'closet',
        current,
        total,
        message: `Migrado: ${item.metadata.subcategory} (${current}/${total})`,
      });
    } catch (error) {
      console.error('Failed to migrate item:', item, error);
      throw new Error(`Error migrando ${item.metadata.subcategory}`);
    }
  }
}

/**
 * Migrate saved outfits from localStorage to Supabase
 */
async function migrateOutfits(
  outfits: SavedOutfit[],
  userId: string,
  onProgress: MigrationCallback
): Promise<void> {
  const total = outfits.length;
  let current = 0;

  onProgress({
    phase: 'outfits',
    current,
    total,
    message: 'Iniciando migración de outfits guardados...',
  });

  if (total === 0) {
    onProgress({
      phase: 'outfits',
      current: 0,
      total: 0,
      message: 'No hay outfits para migrar',
    });
    return;
  }

  for (const outfit of outfits) {
    try {
      const supabaseOutfit = convertOutfit(outfit, userId);

      const { error } = await supabase
        .from('outfits')
        .insert(supabaseOutfit);

      if (error) {
        console.error('Failed to insert outfit:', error);
        throw error;
      }

      current++;
      onProgress({
        phase: 'outfits',
        current,
        total,
        message: `Migrado: Outfit ${current}/${total}`,
      });
    } catch (error) {
      console.error('Failed to migrate outfit:', outfit, error);
      throw new Error(`Error migrando outfit ${outfit.id}`);
    }
  }
}

/**
 * Main migration function
 *
 * Migrates all user data from localStorage to Supabase.
 * Handles errors gracefully and provides progress updates.
 */
export async function migrateUserData(
  onProgress: MigrationCallback
): Promise<void> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    // Load data from localStorage
    const closetData = localStorage.getItem('ojodeloca-closet');
    const outfitsData = localStorage.getItem('ojodeloca-saved-outfits');

    const closet: ClothingItem[] = closetData ? JSON.parse(closetData) : [];
    const outfits: SavedOutfit[] = outfitsData ? JSON.parse(outfitsData) : [];

    // Check if already migrated
    const { data: existingItems } = await supabase
      .from('clothing_items')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      onProgress({
        phase: 'complete',
        current: 0,
        total: 0,
        message: 'Los datos ya fueron migrados previamente',
      });
      return;
    }

    // Migrate closet items
    if (closet.length > 0) {
      await migrateCloset(closet, user.id, onProgress);
    } else {
      onProgress({
        phase: 'closet',
        current: 0,
        total: 0,
        message: 'No hay prendas para migrar',
      });
    }

    // Migrate outfits
    if (outfits.length > 0) {
      await migrateOutfits(outfits, user.id, onProgress);
    }

    // Verify migration succeeded by checking Supabase
    onProgress({
      phase: 'complete',
      current: closet.length + outfits.length,
      total: closet.length + outfits.length,
      message: 'Verificando migración...',
    });

    const { data: migratedItems } = await supabase
      .from('clothing_items')
      .select('id')
      .eq('user_id', user.id);

    const migratedCount = migratedItems?.length || 0;

    if (migratedCount >= closet.length) {
      // Migration verified - safe to clear localStorage
      localStorage.removeItem('ojodeloca-closet');
      localStorage.removeItem('ojodeloca-saved-outfits');
      localStorage.setItem('ojodeloca-migrated-closet', 'true');

      onProgress({
        phase: 'complete',
        current: closet.length + outfits.length,
        total: closet.length + outfits.length,
        message: '¡Migración completada y verificada exitosamente!',
      });
    } else {
      // Migration incomplete - don't clear localStorage
      throw new Error(
        `Migración incompleta: se migraron ${migratedCount} de ${closet.length} prendas. Los datos de localStorage se mantienen seguros.`
      );
    }
  } catch (error) {
    console.error('Migration failed:', error);
    onProgress({
      phase: 'error',
      current: 0,
      total: 0,
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
    throw error;
  }
}

/**
 * Check if user needs migration
 */
export async function needsMigration(): Promise<boolean> {
  try {
    // Check if user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if localStorage has data
    const closetData = localStorage.getItem('ojodeloca-closet');
    const closet: ClothingItem[] = closetData ? JSON.parse(closetData) : [];
    if (closet.length === 0) return false;

    // Check if Supabase already has data
    const { data: existingItems } = await supabase
      .from('clothing_items')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    // Need migration if localStorage has data but Supabase doesn't
    return !existingItems || existingItems.length === 0;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
}
