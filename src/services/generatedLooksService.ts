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
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('generated-looks')
      .upload(filePath, compressedFile, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-looks')
      .getPublicUrl(filePath);

    // Insert into database
    const { data, error } = await supabase
      .from('generated_looks')
      .insert({
        user_id: user.id,
        image_url: publicUrl,
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
        generation_model: options.model ?? 'gemini-2.5-flash-image',
        auto_saved: options.autoSaved ?? false,
        title: options.title,
        keep_pose: options.keepPose ?? false,
        face_refs_used: options.faceRefsUsed ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Saved generated look:', data.id);
    return rowToGeneratedLook(data);
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

    return (data || []).map(rowToGeneratedLook);
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

    return rowToGeneratedLook(data);
  } catch (error) {
    logger.error('Failed to fetch look:', error);
    throw error;
  }
}

/**
 * Get a look by share token (public access)
 */
export async function getGeneratedLookByShareToken(token: string): Promise<GeneratedLook | null> {
  try {
    const { data, error } = await supabase
      .from('generated_looks')
      .select('*')
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return rowToGeneratedLook(data);
  } catch (error) {
    logger.error('Failed to fetch shared look:', error);
    return null;
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

    const shareToken = generateShareToken();

    const { error } = await supabase
      .from('generated_looks')
      .update({
        is_public: true,
        share_token: shareToken,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

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

    const { error } = await supabase
      .from('generated_looks')
      .update({
        is_public: false,
        share_token: null,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
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
      .select('image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from database
    const { error } = await supabase
      .from('generated_looks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Try to delete from storage (extract path from URL)
    if (look?.image_url) {
      const urlParts = look.image_url.split('/generated-looks/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('generated-looks')
          .remove([filePath]);
      }
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

    return rowToGeneratedLook(data);
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
