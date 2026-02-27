/**
 * Outfit Service
 *
 * Handles CRUD operations for saved outfits.
 * Supports both localStorage (legacy) and Supabase backend.
 */

import { supabase } from '../lib/supabase';
import type { SavedOutfit, FitResult } from '../../types';
import type { Database } from '../types/api';
import { logger } from '../../utils/logger';
import { retryNetworkOperation } from '../../utils/retryWithBackoff';

type OutfitRow = Database['public']['Tables']['outfits']['Row'];
type OutfitInsert = Database['public']['Tables']['outfits']['Insert'];
type OutfitUpdate = Database['public']['Tables']['outfits']['Update'];

/**
 * Convert Supabase Outfit to legacy SavedOutfit format
 */
function convertToLegacyFormat(outfit: OutfitRow): SavedOutfit {
  // Extract IDs from the array (assuming order: top, bottom, shoes)
  const [top_id = '', bottom_id = '', shoes_id = ''] = outfit.clothing_item_ids;

  return {
    id: outfit.id,
    top_id,
    bottom_id,
    shoes_id,
    explanation: outfit.ai_reasoning || outfit.description || '',
  };
}

/**
 * Get all saved outfits for current user
 */
export async function getSavedOutfits(): Promise<SavedOutfit[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await retryNetworkOperation(async () => await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }));

    if (error) throw error;

    return data.map(convertToLegacyFormat);
  } catch (error) {
    logger.error('Failed to fetch saved outfits:', error);
    throw error;
  }
}

/**
 * Get a single outfit by ID
 */
export async function getSavedOutfit(id: string): Promise<SavedOutfit | null> {
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
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to fetch saved outfit:', error);
    throw error;
  }
}

/**
 * Save a new outfit from FitResult
 */
export async function saveOutfit(
  fitResult: Omit<FitResult, 'missing_piece_suggestion'>
): Promise<SavedOutfit> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Convert from legacy format to new format
    const clothing_item_ids = [
      fitResult.top_id,
      fitResult.bottom_id,
      fitResult.shoes_id,
    ].filter(Boolean);

    const newOutfit: OutfitInsert = {
      user_id: user.id,
      name: `Outfit ${new Date().toLocaleDateString()}`,
      clothing_item_ids,
      ai_generated: true,
      ai_reasoning: fitResult.explanation,
      is_public: false,
    };

    const { data, error } = await retryNetworkOperation(async () => await supabase
      .from('outfits')
      .insert(newOutfit)
      .select()
      .single());

    if (error) throw error;

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to save outfit:', error);
    throw error;
  }
}

/**
 * Update an outfit
 */
export async function updateOutfit(
  id: string,
  updates: {
    name?: string;
    description?: string;
    is_public?: boolean;
  }
): Promise<SavedOutfit> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const update: OutfitUpdate = {
      name: updates.name,
      description: updates.description,
      is_public: updates.is_public,
    };

    const { data, error } = await supabase
      .from('outfits')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return convertToLegacyFormat(data);
  } catch (error) {
    logger.error('Failed to update outfit:', error);
    throw error;
  }
}

/**
 * Delete an outfit (soft delete)
 */
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

/**
 * Toggle outfit public/private
 */
export async function toggleOutfitVisibility(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current visibility
    const { data: outfit, error: fetchError } = await supabase
      .from('outfits')
      .select('is_public')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!outfit) throw new Error('Outfit not found');

    const outfitData = outfit as { is_public: boolean };
    const newVisibility = !outfitData.is_public;
    const visibilityPayload: OutfitUpdate = {
      is_public: newVisibility,
    };

    // Toggle
    const { error } = await supabase
      .from('outfits')
      .update(visibilityPayload)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return newVisibility;
  } catch (error) {
    logger.error('Failed to toggle outfit visibility:', error);
    throw error;
  }
}
