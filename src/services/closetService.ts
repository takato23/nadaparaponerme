/**
 * Closet Service
 *
 * Handles CRUD operations for clothing items.
 * Supports both localStorage (legacy) and Supabase backend.
 */

import { supabase, uploadImage, compressImage, createThumbnail, dataUrlToFile } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  ClothingItem as LegacyClothingItem,
  ClothingItemMetadata,
  ClothingItemSourceRef,
  ItemAIStatus,
  NormalizedImageVariant,
} from '../../types';
import type { Database, ClothingCategory, Season } from '../types/api';
import { analyzeClothingViaEdge, proxyImageViaEdge } from './edgeFunctionClient';
import { removeImageBackground } from '../utils/backgroundRemoval';

type ClothingItemRow = Database['public']['Tables']['clothing_items']['Row'];
type ClothingItemInsert = Database['public']['Tables']['clothing_items']['Insert'];
type ClothingItemUpdate = Database['public']['Tables']['clothing_items']['Update'];
type PersistedItemStatus = NonNullable<ClothingItemInsert['status']>;
type AnalyzeOnDemandOptions = {
  imageDataUrl?: string;
  currentItem?: LegacyClothingItem;
};

type ImportedClothingItemInput = {
  imageSource?: string;
  metadata?: Partial<ClothingItemMetadata>;
  status?: PersistedItemStatus;
  isFavorite?: boolean;
  linkMode?: 'copy' | 'linked';
  sourceRef?: ClothingItemSourceRef;
};

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

function safeParseAIStatus(status: unknown): ItemAIStatus {
  if (status === 'pending' || status === 'processing' || status === 'ready' || status === 'failed') {
    return status;
  }
  return 'pending';
}

function extFromMimeType(mimeType?: string | null): string {
  if (!mimeType) return '.jpg';
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('gif')) return '.gif';
  return '.jpg';
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer la imagen.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

async function loadImageElement(imageSource: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen normalizada.'));
    image.src = imageSource;
  });
}

async function paintTransparentImageOnWhite(transparentDataUrl: string): Promise<string> {
  const image = await loadImageElement(transparentDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas de normalización.');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

async function createNormalizedVariant(
  imageFile: File,
  userId: string,
  timestamp = Date.now(),
  mode: NormalizedImageVariant['mode'] = 'local_white_background',
): Promise<{
  variant: NormalizedImageVariant;
  imagePath?: string;
  thumbnailPath?: string;
}> {
  try {
    const sourceDataUrl = await fileToDataUrl(imageFile);
    const transparentDataUrl = await removeImageBackground(sourceDataUrl);
    const whiteBackgroundDataUrl = await paintTransparentImageOnWhite(transparentDataUrl);

    const normalizedFile = dataUrlToFile(whiteBackgroundDataUrl, `normalized-${timestamp}.png`);
    const normalizedThumb = await createThumbnail(normalizedFile, 400);
    const imagePath = `${userId}/${timestamp}/normalized_image.png`;
    const thumbnailPath = `${userId}/${timestamp}/normalized_thumbnail.png`;

    const [normalizedImageUrl, normalizedThumbnailUrl] = await Promise.all([
      uploadImage('clothing-images', imagePath, normalizedFile),
      uploadImage('clothing-images', thumbnailPath, normalizedThumb),
    ]);

    return {
      variant: {
        image_url: normalizedImageUrl,
        thumbnail_url: normalizedThumbnailUrl,
        status: 'ready',
        mode,
        background: 'white',
        error: null,
        updated_at: new Date().toISOString(),
      },
      imagePath,
      thumbnailPath,
    };
  } catch (error) {
    logger.warn('Local normalization failed, keeping original item image only:', error);
    return {
      variant: {
        image_url: null,
        thumbnail_url: null,
        status: 'failed',
        mode,
        background: 'white',
        error: error instanceof Error ? error.message : 'normalization_failed',
        updated_at: new Date().toISOString(),
      },
    };
  }
}

function ensureImportedMetadata(metadata?: Partial<ClothingItemMetadata>): ClothingItemMetadata {
  return {
    category: safeParseCategory(metadata?.category || 'top'),
    subcategory: metadata?.subcategory || 'Prenda descubierta',
    color_primary: metadata?.color_primary || 'desconocido',
    neckline: metadata?.neckline,
    sleeve_type: metadata?.sleeve_type,
    vibe_tags: metadata?.vibe_tags || [],
    seasons: metadata?.seasons || [],
    description: metadata?.description,
    fashion_score: metadata?.fashion_score,
    occasion_tags: metadata?.occasion_tags,
    color_palette: metadata?.color_palette,
    styling_tips: metadata?.styling_tips,
    care_instructions: metadata?.care_instructions,
    fabric_composition: metadata?.fabric_composition,
  };
}

async function imageSourceToFile(imageSource: string, fileBasename: string): Promise<File> {
  if (imageSource.startsWith('data:image')) {
    return dataUrlToFile(imageSource, `${fileBasename}.jpg`);
  }

  try {
    const response = await fetch(imageSource);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la imagen (${response.status})`);
    }
    const imageBlob = await response.blob();
    return new File([imageBlob], `${fileBasename}${extFromMimeType(imageBlob.type)}`, {
      type: imageBlob.type || 'image/jpeg',
    });
  } catch {
    const proxiedDataUrl = await proxyImageViaEdge(imageSource);
    return dataUrlToFile(proxiedDataUrl, `${fileBasename}.jpg`);
  }
}

function isPersistedItemId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer la imagen.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo convertir la imagen.'));
    reader.readAsDataURL(blob);
  });
}

async function ensureDataImageUrl(imageSource: string): Promise<string> {
  if (!imageSource) {
    throw new Error('La prenda no tiene imagen para analizar.');
  }

  if (imageSource.startsWith('data:image')) {
    return imageSource;
  }

  try {
    const response = await fetch(imageSource);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la imagen (${response.status})`);
    }
    const imageBlob = await response.blob();
    return await blobToDataUrl(imageBlob);
  } catch {
    return await proxyImageViaEdge(imageSource);
  }
}

function getMissingColumnFromSchemaError(error: any): string | null {
  if (!error || error.code !== 'PGRST204' || typeof error.message !== 'string') {
    return null;
  }
  const match = error.message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

async function insertClothingItemCompat(
  payload: ClothingItemInsert
): Promise<{ data: ClothingItemRow | null; error: any; normalizedPayload: Partial<ClothingItemInsert> }> {
  const normalizedPayload: Partial<ClothingItemInsert> = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await (supabase.from('clothing_items') as any)
      .insert(normalizedPayload)
      .select()
      .single();

    if (!error) {
      return { data, error: null, normalizedPayload };
    }

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in normalizedPayload)) {
      return { data: null, error, normalizedPayload };
    }

    delete (normalizedPayload as any)[missingColumn];
  }

  return {
    data: null,
    error: new Error('No se pudo insertar prenda por incompatibilidad de esquema'),
    normalizedPayload,
  };
}

async function updateClothingItemCompat(
  userId: string,
  itemId: string,
  payload: ClothingItemUpdate
): Promise<{ data: ClothingItemRow | null; error: any; normalizedPayload: Partial<ClothingItemUpdate> }> {
  const normalizedPayload: Partial<ClothingItemUpdate> = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await (supabase.from('clothing_items') as any)
      .update(normalizedPayload)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (!error) {
      return { data, error: null, normalizedPayload };
    }

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in normalizedPayload)) {
      return { data: null, error, normalizedPayload };
    }

    delete (normalizedPayload as any)[missingColumn];
  }

  return {
    data: null,
    error: new Error('No se pudo actualizar prenda por incompatibilidad de esquema'),
    normalizedPayload,
  };
}

/**
 * Convert Supabase ClothingItem to legacy format
 */
function convertToLegacyFormat(item: ClothingItemRow): LegacyClothingItem {
  const sourceRef = item.source_ref as LegacyClothingItem['sourceRef'];
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
    aiStatus: safeParseAIStatus(item.ai_status),
    aiAnalyzedAt: item.ai_analyzed_at,
    aiMetadataVersion: item.ai_metadata_version ?? 0,
    aiLastError: item.ai_last_error,
    isFavorite: Boolean(item.is_favorite),
    linkMode: (item.link_mode as LegacyClothingItem['linkMode']) || 'copy',
    sourceRef: sourceRef?.originType ? sourceRef : undefined,
    normalizedImage: {
      image_url: (item as any).normalized_image_url || null,
      thumbnail_url: (item as any).normalized_thumbnail_url || null,
      status: ((item as any).normalization_status as NormalizedImageVariant['status']) || 'pending',
      mode: ((item as any).normalization_mode as NormalizedImageVariant['mode']) || 'none',
      background: ((item as any).normalization_background as 'transparent' | 'white' | undefined) || undefined,
      error: (item as any).normalization_error || null,
      updated_at: item.updated_at,
    },
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
  status: PersistedItemStatus = 'owned',
  aiStatus: ItemAIStatus = 'pending'
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
    const normalizedVariantResult = await createNormalizedVariant(imageFile, user.id, timestamp);

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
      normalized_image_url: normalizedVariantResult.variant.image_url || null,
      normalized_thumbnail_url: normalizedVariantResult.variant.thumbnail_url || null,
      normalization_status: normalizedVariantResult.variant.status,
      normalization_mode: normalizedVariantResult.variant.mode,
      normalization_background: normalizedVariantResult.variant.background || null,
      normalization_error: normalizedVariantResult.variant.error || null,
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
      ai_status: aiStatus,
      ai_analyzed_at: aiStatus === 'ready' ? new Date().toISOString() : null,
      ai_metadata_version: aiStatus === 'ready' ? 1 : 0,
      ai_last_error: null,
      status,
    };

    const { data, error } = await insertClothingItemCompat(newItem);

    if (error) {
      // Cleanup uploaded images if database insert fails
      const pathsToRemove = [imagePath, thumbnailPath];
      if (normalizedVariantResult.imagePath) pathsToRemove.push(normalizedVariantResult.imagePath);
      if (normalizedVariantResult.thumbnailPath) pathsToRemove.push(normalizedVariantResult.thumbnailPath);
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
  status: PersistedItemStatus = 'owned',
  aiStatus: ItemAIStatus = 'pending'
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
    normalized_image_url: imageUrl,
    normalized_thumbnail_url: imageUrl,
    normalization_status: 'ready',
    normalization_mode: 'premium_refine',
    normalization_background: 'white',
    normalization_error: null,
    ai_metadata: {
      neckline: metadata.neckline,
      sleeve_type: metadata.sleeve_type,
      vibe_tags: metadata.vibe_tags || ['ai-generated'],
      seasons: (metadata.seasons || []) as Season[],
    },
    tags: metadata.vibe_tags || ['ai-generated'],
    notes: metadata.description || null,
    ai_status: aiStatus,
    ai_analyzed_at: aiStatus === 'ready' ? new Date().toISOString() : null,
    ai_metadata_version: aiStatus === 'ready' ? 1 : 0,
    ai_last_error: null,
    status,
  };

  const { data, error } = await insertClothingItemCompat(itemToInsert);

  if (error) {
    logger.error('Failed to add generated closet item:', error);
    throw error;
  }

  return convertToLegacyFormat(data);
}

/**
 * Add an imported clothing item (snapshot/url/social source).
 * Used by timeline/import flows and street capture save actions.
 */
export async function addImportedClothingItem(
  input: ImportedClothingItemInput
): Promise<LegacyClothingItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const metadata = ensureImportedMetadata(input.metadata);
  const status: PersistedItemStatus = input.status || 'wishlist';
  const linkMode: 'copy' | 'linked' = input.linkMode || 'linked';
  const imageSource = input.imageSource || '';
  const nowIso = new Date().toISOString();

  const dedupeKey = input.sourceRef?.dedupeKey?.trim();
  if (dedupeKey) {
    const { data: existingItem, error: existingError } = await (supabase.from('clothing_items') as any)
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .contains('source_ref', { dedupeKey })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      const missingColumn = getMissingColumnFromSchemaError(existingError);
      if (missingColumn !== 'source_ref') {
        throw existingError;
      }
      logger.warn('Skipping dedupe by source_ref due schema cache mismatch');
    } else if (existingItem) {
      const nextFavorite = Boolean(input.isFavorite) || Boolean(existingItem.is_favorite);
      const nextStatus = (input.status || existingItem.status || 'owned') as PersistedItemStatus;
      const needsUpdate = nextFavorite !== Boolean(existingItem.is_favorite) || nextStatus !== existingItem.status;

      if (needsUpdate) {
        const { data: updatedItem, error: updateError } = await updateClothingItemCompat(
          user.id,
          existingItem.id,
          {
            is_favorite: nextFavorite,
            status: nextStatus,
          }
        );

        if (updateError) throw updateError;
        if (updatedItem) return convertToLegacyFormat(updatedItem);
      }

      return convertToLegacyFormat(existingItem);
    }
  }

  let finalImageUrl = imageSource;
  let finalThumbnailUrl = imageSource;
  let normalizedVariant: NormalizedImageVariant = {
    image_url: imageSource || null,
    thumbnail_url: imageSource || null,
    status: imageSource ? 'ready' : 'pending',
    mode: imageSource ? 'premium_refine' : 'none',
    background: 'white',
    error: null,
    updated_at: nowIso,
  };

  if (linkMode === 'copy' && imageSource) {
    const baseName = `imported-${Date.now()}`;
    const sourceFile = await imageSourceToFile(imageSource, baseName);
    const compressed = await compressImage(sourceFile, 1200, 0.85);
    const thumbnail = await createThumbnail(compressed, 400);
    const ext = compressed.name.match(/\.[^.]+$/)?.[0] || '.jpg';
    const timestamp = Date.now();
    const imagePath = `${user.id}/${timestamp}/${baseName}${ext}`;
    const thumbnailPath = `${user.id}/${timestamp}/${baseName}-thumb${ext}`;
    const normalizedResult = await createNormalizedVariant(sourceFile, user.id, timestamp);

    const [uploadedImageUrl, uploadedThumbUrl] = await Promise.all([
      uploadImage('clothing-images', imagePath, compressed),
      uploadImage('clothing-images', thumbnailPath, thumbnail),
    ]);
    finalImageUrl = uploadedImageUrl;
    finalThumbnailUrl = uploadedThumbUrl;
    normalizedVariant = normalizedResult.variant;
  }

  if (!finalImageUrl) {
    finalImageUrl = 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#6b7280">Prenda sin imagen</text></svg>');
    finalThumbnailUrl = finalImageUrl;
  }

  const sourceRef: ClothingItemSourceRef = {
    originType: input.sourceRef?.originType || 'import',
    ...input.sourceRef,
    originUrl: input.sourceRef?.originUrl || imageSource || undefined,
    dedupeKey: dedupeKey || input.sourceRef?.dedupeKey,
  };

  const newItem: ClothingItemInsert = {
    user_id: user.id,
    name: metadata.subcategory,
    category: safeParseCategory(metadata.category) as ClothingCategory,
    subcategory: metadata.subcategory,
    color_primary: metadata.color_primary,
    image_url: finalImageUrl,
    thumbnail_url: finalThumbnailUrl || finalImageUrl,
    normalized_image_url: normalizedVariant.image_url || null,
    normalized_thumbnail_url: normalizedVariant.thumbnail_url || null,
    normalization_status: normalizedVariant.status,
    normalization_mode: normalizedVariant.mode,
    normalization_background: normalizedVariant.background || null,
    normalization_error: normalizedVariant.error || null,
    ai_metadata: {
      neckline: metadata.neckline,
      sleeve_type: metadata.sleeve_type,
      vibe_tags: metadata.vibe_tags || [],
      seasons: (metadata.seasons || []) as Season[],
    },
    tags: metadata.vibe_tags || [],
    notes: metadata.description || null,
    ai_status: 'ready',
    ai_analyzed_at: nowIso,
    ai_metadata_version: 1,
    ai_last_error: null,
    status,
    is_favorite: Boolean(input.isFavorite),
    link_mode: linkMode,
    source_ref: {
      ...sourceRef,
      importedAt: nowIso,
    } as Record<string, any>,
  };

  const { data, error } = await insertClothingItemCompat(newItem);

  if (error) {
    logger.error('Failed to add imported closet item:', error);
    throw error;
  }

  return convertToLegacyFormat(data);
}

/**
 * Convert a linked item to a copied asset in user's storage bucket.
 */
export async function convertLinkedItemToCopy(itemId: string): Promise<LegacyClothingItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: currentItem, error: fetchError } = await (supabase.from('clothing_items') as any)
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (fetchError) throw fetchError;
  if (!currentItem) throw new Error('No se encontró la prenda');

  if (currentItem.link_mode === 'copy') {
    return convertToLegacyFormat(currentItem);
  }

  const sourceUrl: string = currentItem.image_url || currentItem.source_ref?.originUrl;
  if (!sourceUrl) {
    throw new Error('No se encontró imagen de origen para convertir');
  }

  const sourceFile = await imageSourceToFile(sourceUrl, `linked-copy-${itemId}`);
  const compressed = await compressImage(sourceFile, 1200, 0.85);
  const thumbnail = await createThumbnail(compressed, 400);
  const ext = compressed.name.match(/\.[^.]+$/)?.[0] || '.jpg';
  const timestamp = Date.now();
  const normalizedResult = await createNormalizedVariant(sourceFile, user.id, timestamp);
  const imagePath = `${user.id}/${timestamp}/linked_copy${ext}`;
  const thumbPath = `${user.id}/${timestamp}/linked_copy_thumb${ext}`;

  const [uploadedImageUrl, uploadedThumbUrl] = await Promise.all([
    uploadImage('clothing-images', imagePath, compressed),
    uploadImage('clothing-images', thumbPath, thumbnail),
  ]);

  const updatedSourceRef = {
    ...(currentItem.source_ref || {}),
    copiedAt: new Date().toISOString(),
    copiedFrom: sourceUrl,
  };

  const { data: updatedItem, error: updateError } = await updateClothingItemCompat(
    user.id,
    itemId,
    {
      image_url: uploadedImageUrl,
      thumbnail_url: uploadedThumbUrl,
      normalized_image_url: normalizedResult.variant.image_url || null,
      normalized_thumbnail_url: normalizedResult.variant.thumbnail_url || null,
      normalization_status: normalizedResult.variant.status,
      normalization_mode: normalizedResult.variant.mode,
      normalization_background: normalizedResult.variant.background || null,
      normalization_error: normalizedResult.variant.error || null,
      link_mode: 'copy',
      source_ref: updatedSourceRef,
    }
  );

  if (updateError) throw updateError;
  return convertToLegacyFormat(updatedItem);
}

export async function retryClothingItemNormalization(itemId: string): Promise<LegacyClothingItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: currentItem, error: fetchError } = await (supabase.from('clothing_items') as any)
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (fetchError) throw fetchError;
  if (!currentItem?.image_url) throw new Error('La prenda no tiene imagen para normalizar');

  const sourceFile = await imageSourceToFile(currentItem.image_url, `retry-normalize-${itemId}`);
  const result = await createNormalizedVariant(sourceFile, user.id, Date.now(), 'local_white_background');

  const { data, error } = await updateClothingItemCompat(
    user.id,
    itemId,
    {
      normalized_image_url: result.variant.image_url || null,
      normalized_thumbnail_url: result.variant.thumbnail_url || null,
      normalization_status: result.variant.status,
      normalization_mode: result.variant.mode,
      normalization_background: result.variant.background || null,
      normalization_error: result.variant.error || null,
    }
  );

  if (error) throw error;
  return convertToLegacyFormat(data);
}

export async function requestPremiumNormalization(itemId: string): Promise<LegacyClothingItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: currentItem, error: fetchError } = await (supabase.from('clothing_items') as any)
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (fetchError) throw fetchError;
  if (!currentItem?.image_url) throw new Error('La prenda no tiene imagen para mejorar');

  const sourceFile = await imageSourceToFile(currentItem.image_url, `premium-normalize-${itemId}`);
  const result = await createNormalizedVariant(sourceFile, user.id, Date.now(), 'premium_refine');

  const { data, error } = await updateClothingItemCompat(
    user.id,
    itemId,
    {
      normalized_image_url: result.variant.image_url || null,
      normalized_thumbnail_url: result.variant.thumbnail_url || null,
      normalization_status: result.variant.status,
      normalization_mode: 'premium_refine',
      normalization_background: result.variant.background || null,
      normalization_error: result.variant.error || null,
    }
  );

  if (error) throw error;
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
      ai_status: 'ready',
      ai_analyzed_at: new Date().toISOString(),
      ai_metadata_version: 1,
      ai_last_error: null,
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
 * Analyze an existing clothing item on-demand and persist enriched metadata.
 */
export async function analyzeClothingItemOnDemand(
  id: string,
  options: AnalyzeOnDemandOptions = {}
): Promise<LegacyClothingItem> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Evita PATCH/SELECT inválidos en Supabase cuando el ítem todavía vive en localStorage
    // (ej: item_123, item-123, etc.).
    const isLegacyId = !isPersistedItemId(id);

    if (!isLegacyId) {
      const { error: markProcessingError } = await (supabase.from('clothing_items') as any)
        .update({ ai_status: 'processing', ai_last_error: null })
        .eq('id', id)
        .eq('user_id', user.id);

      if (markProcessingError) throw markProcessingError;
    }

    let prepareError = null;

    if (!isLegacyId) {
      const { error } = await supabase.functions.invoke('prepare-closet-insights', {
        body: {
          insightType: 'report',
          closetItemIds: [id],
        },
      });
      prepareError = error;
    } else {
      logger.info('Legacy item detected, skipping pg vector insights DB flow, hitting analyze function directly');
      prepareError = new Error('Legacy OnDemand requested');
    }

    if (prepareError) {
      if (!isLegacyId) {
        logger.warn('prepare-closet-insights failed, using fallback on-demand analysis:', prepareError);
      }

      let currentItem;
      if (isLegacyId) {
        const sourceImage = options.imageDataUrl || options.currentItem?.imageDataUrl;
        const imageDataUrl = await ensureDataImageUrl(sourceImage || '');
        const analyzedMetadata = await analyzeClothingViaEdge(imageDataUrl);
        const nowIso = new Date().toISOString();

        if (options.currentItem) {
          return {
            ...options.currentItem,
            metadata: {
              ...options.currentItem.metadata,
              ...analyzedMetadata,
            },
            aiStatus: 'ready',
            aiAnalyzedAt: nowIso,
            aiMetadataVersion: Math.max(1, (options.currentItem.aiMetadataVersion || 0) + 1),
            aiLastError: null,
          };
        }

        return {
          id,
          imageDataUrl,
          metadata: analyzedMetadata,
          aiStatus: 'ready',
          aiAnalyzedAt: nowIso,
          aiMetadataVersion: 1,
          aiLastError: null,
        };
      }

      currentItem = await getClothingItem(id);
      if (!currentItem) {
        throw new Error('No se encontró la prenda para analizar.');
      }

      const imageDataUrl = await ensureDataImageUrl(currentItem.imageDataUrl);
      const analyzedMetadata = await analyzeClothingViaEdge(imageDataUrl);
      return await updateClothingItem(id, analyzedMetadata);
    }

    const updated = await getClothingItem(id);
    if (!updated) {
      throw new Error('No se pudo recuperar la prenda luego del análisis');
    }

    return updated;
  } catch (error) {
    try {
      const isLegacyId = !isPersistedItemId(id);
      if (!isLegacyId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase.from('clothing_items') as any)
            .update({
              ai_status: 'failed',
              ai_last_error: error instanceof Error ? error.message : 'analyze_failed',
            })
            .eq('id', id)
            .eq('user_id', user.id);
        }
      }
    } catch (markFailedError) {
      logger.warn('Failed to mark item as failed after on-demand analyze error:', markFailedError);
    }

    logger.error('Failed to analyze clothing item on-demand:', error);
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
