/**
 * Outfit Service
 *
 * `outfits` is the primary look-library entity.
 * Generated renders live in `generated_looks` and link back via `outfit_id`.
 */

import { supabase } from '../lib/supabase';
import type { LookFolder, SavedOutfit, FitResult } from '../../types';
import type { Database } from '../types/api';
import { logger } from '../../utils/logger';
import { retryNetworkOperation } from '../../utils/retryWithBackoff';

type OutfitRow = Database['public']['Tables']['outfits']['Row'];
type OutfitInsert = Database['public']['Tables']['outfits']['Insert'];
type OutfitUpdate = Database['public']['Tables']['outfits']['Update'];
type LookFolderRow = Database['public']['Tables']['look_folders']['Row'];
type LookFolderInsert = Database['public']['Tables']['look_folders']['Insert'];
type LookFolderUpdate = Database['public']['Tables']['look_folders']['Update'];

export interface SaveOutfitOptions {
  name?: string;
  description?: string | null;
  occasion?: string | null;
  styleNotes?: string | null;
  weatherContext?: string | null;
  source?: SavedOutfit['source'];
  chatThreadId?: string | null;
  heroItemId?: string | null;
  contextJson?: Record<string, unknown> | null;
  aiGenerated?: boolean;
  isPublic?: boolean;
  folderId?: string | null;
  tags?: string[];
  coverImageUrl?: string | null;
  referenceSummary?: string | null;
}

export interface SharedOutfitPayload {
  id: string;
  type?: 'outfit' | 'generated_look';
  name?: string | null;
  description?: string | null;
  explanation?: string | null;
  created_at?: string;
  cover_image_url?: string | null;
  reference_summary?: string | null;
  tags?: string[];
  hero_image_url?: string | null;
  render_count?: number;
  items: Array<{
    id: string;
    label?: string | null;
    image_url: string;
  }>;
}

export interface OutfitLibraryFilters {
  folderId?: string | null;
  source?: SavedOutfit['source'] | 'all';
  search?: string;
  tags?: string[];
}

export interface OutfitLibraryItem extends SavedOutfit {
  linked_generated_look_ids?: string[];
}

export interface CreateLookFolderInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export type SaveOutfitInput = Omit<FitResult, 'missing_piece_suggestion'> & SaveOutfitOptions;
const SHARED_LOOK_ENDPOINT_PATH = '/functions/v1/shared-look';
const SHARE_TOKEN_BYTES = 24;

function generateShareToken(): string {
  const bytes = new Uint8Array(SHARE_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getMissingColumnFromSchemaError(error: any): string | null {
  if (!error || error.code !== 'PGRST204' || typeof error.message !== 'string') {
    return null;
  }
  const match = error.message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

async function insertOutfitCompat(
  payload: OutfitInsert
): Promise<{ data: OutfitRow | null; error: any; normalizedPayload: Partial<OutfitInsert> }> {
  const normalizedPayload: Partial<OutfitInsert> = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await (supabase.from('outfits') as any)
      .insert(normalizedPayload)
      .select()
      .single();

    if (!error) return { data, error: null, normalizedPayload };

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in normalizedPayload)) {
      return { data: null, error, normalizedPayload };
    }

    delete (normalizedPayload as any)[missingColumn];
  }

  return {
    data: null,
    error: new Error('No se pudo insertar el look por incompatibilidad de esquema'),
    normalizedPayload,
  };
}

async function updateOutfitCompat(
  userId: string,
  id: string,
  payload: OutfitUpdate,
): Promise<{ data: OutfitRow | null; error: any; normalizedPayload: Partial<OutfitUpdate> }> {
  const normalizedPayload: Partial<OutfitUpdate> = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await (supabase.from('outfits') as any)
      .update(normalizedPayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error) return { data, error: null, normalizedPayload };

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in normalizedPayload)) {
      return { data: null, error, normalizedPayload };
    }

    delete (normalizedPayload as any)[missingColumn];
  }

  return {
    data: null,
    error: new Error('No se pudo actualizar el look por incompatibilidad de esquema'),
    normalizedPayload,
  };
}

async function insertLookFolderCompat(
  payload: LookFolderInsert
): Promise<{ data: LookFolderRow | null; error: any; normalizedPayload: Partial<LookFolderInsert> }> {
  const normalizedPayload: Partial<LookFolderInsert> = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await (supabase.from('look_folders') as any)
      .insert(normalizedPayload)
      .select()
      .single();

    if (!error) return { data, error: null, normalizedPayload };

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in normalizedPayload)) {
      return { data: null, error, normalizedPayload };
    }

    delete (normalizedPayload as any)[missingColumn];
  }

  return {
    data: null,
    error: new Error('No se pudo crear la carpeta por incompatibilidad de esquema'),
    normalizedPayload,
  };
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

function mergeLibraryContext(outfit: OutfitRow): Record<string, unknown> | null {
  const context = (outfit.context_json && typeof outfit.context_json === 'object')
    ? { ...outfit.context_json }
    : {};

  if (Array.isArray(outfit.tags) && outfit.tags.length > 0) {
    context.tags = outfit.tags;
  }
  if ((outfit as any).folder_id) {
    context.folder_id = (outfit as any).folder_id;
  }
  if ((outfit as any).reference_summary) {
    context.reference_summary = (outfit as any).reference_summary;
  }

  return Object.keys(context).length > 0 ? context : null;
}

function convertToLegacyFormat(outfit: OutfitRow & {
  render_count?: number | null;
  linked_generated_look_ids?: string[] | null;
}): OutfitLibraryItem {
  const [top_id = '', bottom_id = '', shoes_id = ''] = outfit.clothing_item_ids;

  return {
    id: outfit.id,
    top_id,
    bottom_id,
    shoes_id,
    explanation: outfit.ai_reasoning || outfit.description || '',
    name: outfit.name,
    description: outfit.description,
    occasion: outfit.occasion,
    style_notes: outfit.style_notes,
    weather_context: outfit.weather_context,
    source: outfit.source || (outfit.ai_generated ? 'ai_recommendation' : 'manual'),
    chat_thread_id: outfit.chat_thread_id,
    hero_item_id: outfit.hero_item_id,
    context_json: mergeLibraryContext(outfit),
    ai_generated: outfit.ai_generated,
    folder_id: (outfit as any).folder_id ?? null,
    tags: normalizeTags((outfit as any).tags),
    cover_image_url: (outfit as any).cover_image_url ?? null,
    reference_summary: (outfit as any).reference_summary ?? null,
    render_count: Number((outfit as any).render_count || 0),
    is_public: Boolean((outfit as any).is_public),
    share_token: (outfit as any).share_token ?? null,
    linked_generated_look_ids: Array.isArray((outfit as any).linked_generated_look_ids)
      ? ((outfit as any).linked_generated_look_ids as string[])
      : undefined,
  };
}

function mapFolder(row: LookFolderRow): LookFolder {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function enrichOutfitsWithRenderData(outfits: OutfitRow[]): Promise<OutfitLibraryItem[]> {
  if (!Array.isArray(outfits) || outfits.length === 0) return [];

  const outfitIds = outfits.map((outfit) => outfit.id);
  const { data: generatedLooks } = await supabase
    .from('generated_looks')
    .select('id, outfit_id, image_url, storage_path, created_at')
    .in('outfit_id', outfitIds);

  const renderMap = new Map<string, { count: number; coverImageUrl: string | null; ids: string[] }>();
  (generatedLooks || []).forEach((row: any) => {
    const outfitId = String(row?.outfit_id || '');
    if (!outfitId) return;
    const current = renderMap.get(outfitId) || { count: 0, coverImageUrl: null, ids: [] };
    current.count += 1;
    current.ids.push(String(row?.id || ''));
    if (!current.coverImageUrl) {
      current.coverImageUrl = row?.image_url || row?.storage_path || null;
    }
    renderMap.set(outfitId, current);
  });

  return outfits.map((outfit) => {
    const renderInfo = renderMap.get(outfit.id);
    return convertToLegacyFormat({
      ...outfit,
      render_count: renderInfo?.count || 0,
      cover_image_url: (outfit as any).cover_image_url || renderInfo?.coverImageUrl || null,
      linked_generated_look_ids: renderInfo?.ids || [],
    } as OutfitRow & { render_count?: number; linked_generated_look_ids?: string[] });
  });
}

/**
 * Get all saved outfits for current user
 */
export async function getSavedOutfits(filters: OutfitLibraryFilters = {}): Promise<OutfitLibraryItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters.folderId) {
      query = query.eq('folder_id', filters.folderId);
    }

    if (filters.source && filters.source !== 'all') {
      query = query.eq('source', filters.source);
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,reference_summary.ilike.%${search}%`);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await retryNetworkOperation(async () => await query);

    if (error) throw error;

    return enrichOutfitsWithRenderData(data || []);
  } catch (error) {
    logger.error('Failed to fetch saved outfits:', error);
    throw error;
  }
}

export async function getSavedOutfit(id: string): Promise<OutfitLibraryItem | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const [enriched] = await enrichOutfitsWithRenderData(data ? [data] : []);
    return enriched || null;
  } catch (error) {
    logger.error('Failed to fetch saved outfit:', error);
    throw error;
  }
}

export async function saveOutfit(fitResult: SaveOutfitInput): Promise<OutfitLibraryItem> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const canSave = await canUserSaveOutfitToLibrary();
    if (!canSave.allowed) {
      throw new Error(canSave.reason || 'Límite de looks alcanzado');
    }

    const clothing_item_ids = [
      fitResult.top_id,
      fitResult.bottom_id,
      fitResult.shoes_id,
    ].filter(Boolean);

    const contextJson = {
      ...(fitResult.contextJson || {}),
      folder_id: fitResult.folderId ?? (fitResult.contextJson as any)?.folder_id ?? null,
      tags: fitResult.tags || (fitResult.contextJson as any)?.tags || [],
      reference_summary: fitResult.referenceSummary ?? (fitResult.contextJson as any)?.reference_summary ?? null,
    };

    const newOutfit: OutfitInsert = {
      user_id: user.id,
      name: fitResult.name || `Look ${new Date().toLocaleDateString()}`,
      description: fitResult.description ?? null,
      clothing_item_ids,
      occasion: fitResult.occasion ?? null,
      source: fitResult.source || (fitResult.aiGenerated ?? false ? 'ai_recommendation' : 'manual'),
      style_notes: fitResult.styleNotes ?? null,
      weather_context: fitResult.weatherContext ?? null,
      chat_thread_id: fitResult.chatThreadId ?? null,
      hero_item_id: fitResult.heroItemId ?? fitResult.top_id ?? null,
      folder_id: fitResult.folderId ?? null,
      tags: fitResult.tags || [],
      cover_image_url: fitResult.coverImageUrl ?? null,
      reference_summary: fitResult.referenceSummary ?? null,
      context_json: contextJson,
      ai_generated: fitResult.aiGenerated ?? true,
      ai_reasoning: fitResult.explanation,
      is_public: fitResult.isPublic ?? false,
    };

    const { data, error } = await retryNetworkOperation(async () => await insertOutfitCompat(newOutfit));
    if (error) throw error;
    if (!data) throw new Error('No outfit returned after save');

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to save outfit:', error);
    throw error;
  }
}

export async function updateOutfit(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    occasion?: string | null;
    style_notes?: string | null;
    weather_context?: string | null;
    source?: SavedOutfit['source'];
    chat_thread_id?: string | null;
    hero_item_id?: string | null;
    context_json?: Record<string, unknown> | null;
    is_public?: boolean;
    folder_id?: string | null;
    tags?: string[];
    cover_image_url?: string | null;
    reference_summary?: string | null;
  }
): Promise<OutfitLibraryItem> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const update: OutfitUpdate = {
      name: updates.name,
      description: updates.description,
      occasion: updates.occasion,
      style_notes: updates.style_notes,
      weather_context: updates.weather_context,
      source: updates.source,
      chat_thread_id: updates.chat_thread_id,
      hero_item_id: updates.hero_item_id,
      folder_id: updates.folder_id,
      tags: updates.tags,
      cover_image_url: updates.cover_image_url,
      reference_summary: updates.reference_summary,
      context_json: updates.context_json,
      is_public: updates.is_public,
    };

    const { data, error } = await updateOutfitCompat(user.id, id, update);
    if (error) throw error;
    if (!data) throw new Error('No outfit returned after update');

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to update outfit:', error);
    throw error;
  }
}

export async function deleteOutfit(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const deletePayload: OutfitUpdate = {
      deleted_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('outfits')
      .update(deletePayload)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to delete outfit:', error);
    throw error;
  }
}

export async function toggleOutfitVisibility(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: outfit, error: fetchError } = await supabase
      .from('outfits')
      .select('is_public')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!outfit) throw new Error('Outfit not found');

    const newVisibility = !Boolean((outfit as { is_public?: boolean }).is_public);
    const { error } = await supabase
      .from('outfits')
      .update({ is_public: newVisibility })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return newVisibility;
  } catch (error) {
    logger.error('Failed to toggle outfit visibility:', error);
    throw error;
  }
}

export async function canUserSaveOutfitToLibrary(): Promise<{ allowed: boolean; reason?: string; count: number; limit: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, reason: 'No autenticado', count: 0, limit: 0 };

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const tier = subscription?.tier || 'free';
    const limitByTier: Record<string, number> = {
      free: 25,
      plus: 150,
      pro: 500,
      premium: 5000,
    };
    const limit = limitByTier[tier] || 25;

    const { count, error } = await (supabase.from('outfits') as any)
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('user_id', user.id);

    if (error) throw error;
    const currentCount = Number(count || 0);

    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: `Llegaste al límite de looks guardados de tu plan (${limit}). Eliminá algunos o mejorá tu plan.`,
        count: currentCount,
        limit,
      };
    }

    return { allowed: true, count: currentCount, limit };
  } catch (error) {
    logger.error('Failed to check outfit-library limit:', error);
    return { allowed: false, reason: 'No se pudo verificar el límite de la biblioteca', count: 0, limit: 0 };
  }
}

export async function enableOutfitSharing(id: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const shareToken = generateShareToken();
  const { data, error } = await updateOutfitCompat(user.id, id, {
    is_public: true,
    share_token: shareToken,
  });

  if (error) throw error;
  if (!data) throw new Error('No se pudo habilitar el link de compartido');
  return shareToken;
}

export async function disableOutfitSharing(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await updateOutfitCompat(user.id, id, {
    is_public: false,
    share_token: null,
  });

  if (error) throw error;
}

export async function getSharedOutfitByShareToken(token: string): Promise<SharedOutfitPayload | null> {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Config de Supabase incompleta para vista pública.');
  }

  const response = await fetch(`${supabaseUrl}${SHARED_LOOK_ENDPOINT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ token: token.trim().toLowerCase() }),
  });

  const rawResponse = await response.text();
  const responseData = rawResponse ? JSON.parse(rawResponse) : null;
  if (!response.ok) {
    throw new Error(responseData?.error || responseData?.message || 'No se pudo cargar el look compartido');
  }

  return responseData as SharedOutfitPayload;
}

export function buildOutfitShareUrl(shareToken: string): string {
  return `${window.location.origin}/look/${shareToken}`;
}

export async function getLookFolders(): Promise<LookFolder[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await (supabase.from('look_folders') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Array.isArray(data) ? data.map(mapFolder) : [];
  } catch (error: any) {
    if (error?.code === '42P01' || String(error?.message || '').includes('look_folders')) {
      logger.warn('look_folders table unavailable, returning empty folder list');
      return [];
    }
    logger.error('Failed to fetch look folders:', error);
    throw error;
  }
}

export async function createLookFolder(input: CreateLookFolderInput): Promise<LookFolder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload: LookFolderInsert = {
    user_id: user.id,
    name: input.name.trim(),
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? 'folder',
    sort_order: input.sortOrder ?? 0,
  };

  const { data, error } = await insertLookFolderCompat(payload);
  if (error) throw error;
  if (!data) throw new Error('No folder returned after create');

  return mapFolder(data);
}

export async function updateLookFolder(id: string, updates: Partial<CreateLookFolderInput>): Promise<LookFolder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload: LookFolderUpdate = {
    name: updates.name?.trim(),
    description: updates.description,
    color: updates.color,
    icon: updates.icon,
    sort_order: updates.sortOrder,
  };

  const { data, error } = await (supabase.from('look_folders') as any)
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return mapFolder(data);
}

export async function deleteLookFolder(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error: outfitError } = await (supabase.from('outfits') as any)
    .update({ folder_id: null })
    .eq('user_id', user.id)
    .eq('folder_id', id);

  if (outfitError) throw outfitError;

  const { error } = await (supabase.from('look_folders') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}
