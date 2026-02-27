/**
 * Generated Looks Service
 *
 * Handles CRUD operations for virtual try-on generated looks.
 * Includes storage management, compression, and sharing features.
 */

import { supabase, compressImage } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  GeneratedLook,
  ClothingSlot,
  GenerationPreset,
  LOOK_STORAGE_LIMITS,
} from '../../types';

// Re-export limits for convenience
export { LOOK_STORAGE_LIMITS } from '../../types';

const GENERATED_LOOKS_BUCKET = 'generated-looks';
const PRIVATE_IMAGE_TTL_SECONDS = 60 * 60; // 1 hour
const TOKEN_BYTES = 24;
const SHARE_ENDPOINT_PATH = '/functions/v1/shared-look';

/**
 * Convert base64 data URL to Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Generate a unique share token
 */
function generateShareToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isValidShareToken(token: string): boolean {
  return /^[a-f0-9]{48}$/.test(normalizeShareToken(token));
}

function normalizeShareToken(token: string): string {
  return token.trim().toLowerCase();
}

function getStoragePathFromImageUrl(imageUrl: string | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.includes('/storage/v1/object/public/generated-looks/')) {
    return imageUrl.split('/storage/v1/object/public/generated-looks/')[1];
  }
  if (imageUrl.includes('/storage/v1/object/sign/generated-looks/')) {
    return imageUrl.split('/storage/v1/object/sign/generated-looks/')[1].split('?')[0];
  }

  const fallbackMatch = imageUrl.match(/\/generated-looks\/(.+?)(\?.*)?$/);
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1].split('?')[0];
  }

  return null;
}

function getStoragePath(storagePath: string | undefined, imageUrl: string | undefined): string | null {
  if (storagePath?.trim()) {
    return storagePath.trim();
  }
  return getStoragePathFromImageUrl(imageUrl);
}

function isStorageNotFoundError(error: any): boolean {
  const message = `${error?.message || ''} ${error?.error || ''}`.toLowerCase();
  return (
    error?.status === 404 ||
    error?.statusCode === 404 ||
    error?.code === 'PGRST116' || // no rows/doesn't exist
    message.includes('not found') ||
    message.includes('does not exist')
  );
}

async function createSignedImageUrl(storagePath: string, ttlSeconds = PRIVATE_IMAGE_TTL_SECONDS): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(GENERATED_LOOKS_BUCKET)
      .createSignedUrl(storagePath, ttlSeconds);

    if (error) {
      logger.error('Failed to create signed URL for look image:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    logger.error('Unexpected error creating signed URL:', error);
    return null;
  }
}

async function enrichGeneratedLookImageUrl(look: GeneratedLook, ttlSeconds = PRIVATE_IMAGE_TTL_SECONDS): Promise<GeneratedLook> {
  const storagePath = getStoragePath(look.storage_path, look.image_url);
  if (!storagePath) {
    return look;
  }

  const signedUrl = await createSignedImageUrl(storagePath, ttlSeconds);
  return {
    ...look,
    image_url: signedUrl || look.image_url,
  };
}

async function enrichGeneratedLooksImageUrls(
  looks: GeneratedLook[],
  ttlSeconds = PRIVATE_IMAGE_TTL_SECONDS
): Promise<GeneratedLook[]> {
  return Promise.all(looks.map((look) => enrichGeneratedLookImageUrl(look, ttlSeconds)));
}

function mapSharedLook(row: any): SharedGeneratedLook {
  return {
    id: row.id,
    image_url: row.image_url,
    selfie_url: row.selfie_url,
    title: row.title,
    notes: row.notes,
    created_at: row.created_at,
    generation_preset: row.generation_preset,
    generation_model: row.generation_model,
    keep_pose: row.keep_pose,
    face_refs_used: row.face_refs_used,
  };
}

export interface SharedGeneratedLook {
  id: string;
  image_url: string;
  selfie_url?: string;
  title?: string;
  notes?: string;
  created_at: string;
  generation_preset: GenerationPreset;
  generation_model?: string;
  keep_pose?: boolean;
  face_refs_used?: number;
}

async function canUserShareLook(userId: string): Promise<boolean> {
  try {
    const rpcResponse = await (supabase.rpc as any)('can_user_share_look', {
      p_user_id: userId,
    });

    if (!rpcResponse.error && typeof rpcResponse.data === 'boolean') {
      return rpcResponse.data;
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const tier = subscription?.tier || 'free';
    return tier === 'pro' || tier === 'premium';
  } catch (error) {
    logger.error('Failed to resolve share permission:', error);
    return false;
  }
}

/**
 * Convert database row to GeneratedLook type
 */
function rowToGeneratedLook(row: any): GeneratedLook {
  return {
    id: row.id,
    user_id: row.user_id,
    image_url: row.image_url,
    thumbnail_url: row.thumbnail_url,
    storage_path: row.storage_path,
    source_items: {
      top_base: row.top_base_id,
      top_mid: row.top_mid_id,
      outerwear: row.outerwear_id,
      bottom: row.bottom_id,
      one_piece: row.one_piece_id,
      shoes: row.shoes_id,
      head: row.head_id,
      eyewear: row.eyewear_id,
      bag: row.bag_id,
      hand_acc: row.hand_acc_id,
    },
    selfie_used: row.selfie_used,
    selfie_url: row.selfie_url,
    generation_preset: row.generation_preset,
    generation_model: row.generation_model,
    keep_pose: row.keep_pose,
    face_refs_used: row.face_refs_used,
    is_favorite: row.is_favorite,
    is_public: row.is_public,
    auto_saved: row.auto_saved,
    share_token: row.share_token,
    title: row.title,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Check if user can save more looks based on subscription tier
 */
export async function canUserSaveLook(): Promise<{ allowed: boolean; reason?: string; count: number; limit: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { allowed: false, reason: 'No autenticado', count: 0, limit: 0 };
    }

    // Get user's subscription tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const tier = subscription?.tier || 'free';
    const limit = tier === 'premium' ? 1000 : tier === 'pro' ? 50 : 10;

    // Count existing looks
    const { count, error } = await supabase
      .from('generated_looks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) throw error;

    const currentCount = count || 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: `Has alcanzado el límite de tu armario de looks (${limit}). Eliminá algunos o upgradeá tu plan.`,
        count: currentCount,
        limit,
      };
    }

    return { allowed: true, count: currentCount, limit };
  } catch (error) {
    logger.error('Failed to check look limit:', error);
    return { allowed: false, reason: 'Error al verificar límite', count: 0, limit: 0 };
  }
}

/**
 * Save a generated look
 */
export async function saveGeneratedLook(
  imageDataUrl: string,
  sourceItems: Partial<Record<ClothingSlot, string>>,
  options: {
    selfieUsed?: boolean;
    selfieUrl?: string; // Original selfie for before/after comparison
    preset?: GenerationPreset;
    model?: string;
    autoSaved?: boolean;
    title?: string;
    keepPose?: boolean;
    faceRefsUsed?: number;
  } = {}
): Promise<GeneratedLook> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Check if user can save more looks
    const canSave = await canUserSaveLook();
    if (!canSave.allowed) {
      throw new Error(canSave.reason);
    }

    // Convert data URL to blob and compress
    const blob = dataUrlToBlob(imageDataUrl);
    const file = new File([blob], 'look.webp', { type: 'image/webp' });
    const compressedFile = await compressImage(file, 1200, 0.8);

    // Upload to storage
    const filePath = `${user.id}/${Date.now()}-${generateShareToken().slice(0, 12)}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(GENERATED_LOOKS_BUCKET)
      .upload(filePath, compressedFile, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Storage path for generated look
    const path = filePath;

    try {
      const { data, error } = await supabase
        .from('generated_looks')
        .insert({
          user_id: user.id,
          image_url: path,
          storage_path: path,
          top_base_id: sourceItems.top_base,
          top_mid_id: sourceItems.top_mid,
          outerwear_id: sourceItems.outerwear,
          bottom_id: sourceItems.bottom,
          one_piece_id: sourceItems.one_piece,
          shoes_id: sourceItems.shoes,
          head_id: sourceItems.head,
          eyewear_id: sourceItems.eyewear,
          bag_id: sourceItems.bag,
          hand_acc_id: sourceItems.hand_acc,
          selfie_used: options.selfieUsed ?? true,
          selfie_url: options.selfieUrl, // For before/after comparison
          generation_preset: options.preset ?? 'overlay',
          generation_model: options.model ?? 'gemini-3.1-flash-image-preview',
          auto_saved: options.autoSaved ?? false,
          title: options.title,
          keep_pose: options.keepPose ?? false,
          face_refs_used: options.faceRefsUsed ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      const inserted = rowToGeneratedLook(data);
      return enrichGeneratedLookImageUrl(inserted);
    } catch (error) {
      try {
        const { error: deleteError } = await supabase.storage
          .from(GENERATED_LOOKS_BUCKET)
          .remove([path]);
        if (deleteError) {
          logger.warn('Failed to rollback uploaded generated look image:', deleteError);
        }
      } catch (rollbackError) {
        logger.warn('Unexpected error during save rollback:', rollbackError);
      }

      throw error;
    }

  } catch (error: any) {
    logger.error('Failed to save generated look:', error);

    // Provide specific error messages based on error type
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;

    if (errorMessage.includes('No autenticado') || errorCode === 'PGRST301') {
      throw new Error('Tu sesión expiró. Volvé a iniciar sesión.');
    }
    if (errorMessage.includes('límite') || errorMessage.includes('limit')) {
      throw new Error(errorMessage); // Already has a good message
    }
    if (errorCode === '23505' || errorMessage.includes('duplicate')) {
      throw new Error('Ya existe un look en tu armario con esa información.');
    }
    if (errorMessage.includes('storage') || errorMessage.includes('upload') || errorMessage.includes('bucket')) {
      throw new Error('Error al subir la imagen. Intentá de nuevo.');
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      throw new Error('Error de conexión. Verificá tu internet.');
    }
    if (errorCode === '42501' || errorMessage.includes('permission')) {
      throw new Error('No tenés permiso para guardar looks.');
    }
    if (errorCode === '42P01' || errorMessage.includes('does not exist')) {
      throw new Error('Servicio temporalmente no disponible. Intentá más tarde.');
    }

    // Generic fallback
    throw new Error('Error al guardar el look. Intentá de nuevo.');
  }
}

/**
 * Get all looks for current user
 */
export async function getGeneratedLooks(options: {
  limit?: number;
  offset?: number;
  favoritesOnly?: boolean;
} = {}): Promise<GeneratedLook[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let query = supabase
      .from('generated_looks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (options.favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    const looks = (data || []).map(rowToGeneratedLook);
    return enrichGeneratedLooksImageUrls(looks);
  } catch (error) {
    logger.error('Failed to fetch generated looks:', error);
    throw error;
  }
}

/**
 * Get a single look by ID
 */
export async function getGeneratedLookById(id: string): Promise<GeneratedLook | null> {
  try {
    const { data, error } = await supabase
      .from('generated_looks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return enrichGeneratedLookImageUrl(rowToGeneratedLook(data));
  } catch (error) {
    logger.error('Failed to fetch look:', error);
    throw error;
  }
}

/**
 * Get a look by share token (public access)
 */
export async function getGeneratedLookByShareToken(token: string): Promise<SharedGeneratedLook | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const normalizedToken = normalizeShareToken(token);

    if (!isValidShareToken(normalizedToken)) {
      throw new Error('Token de compartición inválido');
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Config de Supabase incompleta para vista pública.');
    }

    const response = await fetch(`${supabaseUrl}${SHARE_ENDPOINT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ token: normalizedToken }),
    });

    if (response.status === 404) {
      throw new Error('Este look no existe o el link no es válido.');
    }
    if (response.status === 410) {
      throw new Error('El link ya no está disponible.');
    }

    const rawResponse = await response.text();
    let responseData: any = null;
    try {
      responseData = rawResponse ? JSON.parse(rawResponse) : null;
    } catch {
      responseData = { error: rawResponse || 'No se pudo cargar el look compartido.' };
    }

    if (!response.ok) {
      throw new Error(responseData?.error || responseData?.message || 'No se pudo cargar el look compartido');
    }

    if (!responseData?.id || !responseData?.image_url || !responseData?.created_at) {
      throw new Error('Respuesta del servicio de compartido incompleta.');
    }

    return mapSharedLook(responseData);
  } catch (error) {
    logger.error('Failed to fetch shared look:', error);
    throw error;
  }
}

/**
 * Toggle favorite status
 */
export async function toggleLookFavorite(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Get current status
    const { data: look, error: fetchError } = await supabase
      .from('generated_looks')
      .select('is_favorite')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = !look.is_favorite;

    // Update
    const { error } = await supabase
      .from('generated_looks')
      .update({ is_favorite: newStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return newStatus;
  } catch (error) {
    logger.error('Failed to toggle favorite:', error);
    throw error;
  }
}

/**
 * Enable sharing for a look
 */
export async function enableLookSharing(id: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const canShare = await canUserShareLook(user.id);
    if (!canShare) {
      throw new Error('Tu plan actual no permite compartir looks');
    }

    const shareToken = generateShareToken();

    const { data, error } = await supabase
      .from('generated_looks')
      .update({
        is_public: true,
        share_token: shareToken,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_public')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('No se pudo activar el enlace: el look no existe o no tienes permisos');
    }

    return shareToken;
  } catch (error) {
    logger.error('Failed to enable sharing:', error);
    throw error;
  }
}

/**
 * Disable sharing for a look
 */
export async function disableLookSharing(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('generated_looks')
      .update({
        is_public: false,
        share_token: null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_public')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('No se pudo desactivar el enlace: el look no existe o no tienes permisos');
    }
  } catch (error) {
    logger.error('Failed to disable sharing:', error);
    throw error;
  }
}

/**
 * Delete a generated look
 */
export async function deleteGeneratedLook(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Get the look to find the image URL
    const { data: look, error: fetchError } = await supabase
      .from('generated_looks')
      .select('storage_path, image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const storagePath = getStoragePath(look.storage_path, look.image_url);

    if (storagePath) {
      const { error: storageDeleteError } = await supabase.storage
        .from(GENERATED_LOOKS_BUCKET)
        .remove([storagePath]);

      if (storageDeleteError && !isStorageNotFoundError(storageDeleteError)) {
        throw new Error(storageDeleteError.message || 'No se pudo eliminar la imagen del look');
      } else if (storageDeleteError) {
        logger.warn('Ignoring storage object not found during delete, continuing with DB cleanup:', storageDeleteError);
      }
    }

    // Delete from database
    const { data: deletedLook, error } = await supabase
      .from('generated_looks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!deletedLook) {
      throw new Error('No se pudo eliminar: el look ya no existe');
    }

    logger.info('Deleted generated look:', id);
  } catch (error: any) {
    logger.error('Failed to delete look:', error);

    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;

    if (errorMessage.includes('No autenticado') || errorCode === 'PGRST301') {
      throw new Error('Tu sesión expiró. Volvé a iniciar sesión.');
    }
    if (errorCode === 'PGRST116' || errorMessage.includes('no rows')) {
      throw new Error('Este look ya no existe o fue eliminado.');
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      throw new Error('Error de conexión. Verificá tu internet.');
    }

    throw new Error('Error al eliminar el look. Intentá de nuevo.');
  }
}

/**
 * Update look metadata (title, notes)
 */
export async function updateLookMetadata(
  id: string,
  updates: { title?: string; notes?: string }
): Promise<GeneratedLook> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('generated_looks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return enrichGeneratedLookImageUrl(rowToGeneratedLook(data));
  } catch (error) {
    logger.error('Failed to update look:', error);
    throw error;
  }
}

/**
 * Get user's look stats
 */
export async function getLookStats(): Promise<{
  total: number;
  favorites: number;
  shared: number;
  limit: number;
  tier: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Get subscription tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const tier = subscription?.tier || 'free';
    const limit = tier === 'premium' ? 1000 : tier === 'pro' ? 50 : 10;

    // Get counts
    const { count: total } = await supabase
      .from('generated_looks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: favorites } = await supabase
      .from('generated_looks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_favorite', true);

    const { count: shared } = await supabase
      .from('generated_looks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_public', true);

    return {
      total: total || 0,
      favorites: favorites || 0,
      shared: shared || 0,
      limit,
      tier,
    };
  } catch (error) {
    logger.error('Failed to get look stats:', error);
    throw error;
  }
}
