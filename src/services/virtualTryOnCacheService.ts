import { compressImage, dataUrlToFile, supabase } from '../lib/supabase';
import type { TryOnCacheEntry, TryOnSurface } from '../../types';

const CACHE_BUCKET = 'generated-looks';
const CACHE_SIGNED_TTL_SECONDS = 60 * 60;
const CACHE_TTL_DAYS = 14;

interface UpsertTryOnCacheEntryInput {
  renderHash: string;
  storagePath: string;
  sourceSurface: TryOnSurface;
  quality: 'flash' | 'pro';
  preset: string;
  view: 'front' | 'back' | 'side';
  keepPose: boolean;
  useFaceRefs: boolean;
  slotSignature: Record<string, string>;
  faceRefsSignature?: string | null;
  model: string;
}

async function requireCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No autenticado');
  }
  return user.id;
}

async function resolveImageUrl(storagePath: string): Promise<string> {
  const { data: signed, error } = await supabase.storage
    .from(CACHE_BUCKET)
    .createSignedUrl(storagePath, CACHE_SIGNED_TTL_SECONDS);

  if (!error && signed?.signedUrl) {
    return signed.signedUrl;
  }

  return supabase.storage.from(CACHE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function mapRowToEntry(row: any): Promise<TryOnCacheEntry> {
  const imageUrl = await resolveImageUrl(row.storage_path);
  return {
    id: row.id,
    user_id: row.user_id,
    render_hash: row.render_hash,
    storage_path: row.storage_path,
    image_url: imageUrl,
    source_surface: row.source_surface,
    quality: row.quality,
    preset: row.preset,
    view: row.view,
    keep_pose: row.keep_pose,
    use_face_refs: row.use_face_refs,
    slot_signature: row.slot_signature || {},
    face_refs_signature: row.face_refs_signature || null,
    model: row.model,
    hit_count: row.hit_count || 0,
    last_hit_at: row.last_hit_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getCachedTryOnRender(renderHash: string): Promise<TryOnCacheEntry | null> {
  const userId = await requireCurrentUserId();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('virtual_tryon_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('render_hash', renderHash)
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Error consultando cache');
  }

  if (!data) return null;
  return mapRowToEntry(data);
}

export async function upsertTryOnCacheEntry(
  input: UpsertTryOnCacheEntryInput
): Promise<TryOnCacheEntry> {
  const userId = await requireCurrentUserId();
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('virtual_tryon_cache')
    .upsert({
      user_id: userId,
      render_hash: input.renderHash,
      storage_path: input.storagePath,
      source_surface: input.sourceSurface,
      quality: input.quality,
      preset: input.preset,
      view: input.view,
      keep_pose: input.keepPose,
      use_face_refs: input.useFaceRefs,
      slot_signature: input.slotSignature,
      face_refs_signature: input.faceRefsSignature || null,
      model: input.model,
      expires_at: expiresAt,
      last_hit_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,render_hash',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Error guardando cache');
  }

  return mapRowToEntry(data);
}

export async function recordTryOnCacheHit(renderHash: string): Promise<void> {
  const userId = await requireCurrentUserId();

  const { data: existing, error: selectError } = await supabase
    .from('virtual_tryon_cache')
    .select('id, hit_count')
    .eq('user_id', userId)
    .eq('render_hash', renderHash)
    .maybeSingle();

  if (selectError || !existing?.id) {
    return;
  }

  await supabase
    .from('virtual_tryon_cache')
    .update({
      hit_count: Number(existing.hit_count || 0) + 1,
      last_hit_at: new Date().toISOString(),
    })
    .eq('id', existing.id);
}

export async function saveRenderImageToStorage(
  imageDataUrl: string,
  userId: string,
  renderHash: string
): Promise<{ storagePath: string; imageUrl: string }> {
  const sourceFile = dataUrlToFile(imageDataUrl, `${renderHash}.png`);
  const optimizedFile = await compressImage(sourceFile, 1400, 0.88);
  const storagePath = `cache/${userId}/${renderHash}.webp`;

  const { error } = await supabase.storage
    .from(CACHE_BUCKET)
    .upload(storagePath, optimizedFile, {
      upsert: true,
      contentType: optimizedFile.type || 'image/webp',
      cacheControl: '604800',
    });

  if (error) {
    throw new Error(error.message || 'Error subiendo render');
  }

  const imageUrl = await resolveImageUrl(storagePath);
  return { storagePath, imageUrl };
}
