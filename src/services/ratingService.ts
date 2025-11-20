/**
 * Outfit Rating Service
 * Handles CRUD operations for outfit ratings
 */

import { supabase } from '../lib/supabase';
import { getSessionUser } from './authService';
import { logger } from '../utils/logger';
import type { OutfitRating, RatingStats, SavedOutfit } from '../../types';
import type { OutfitRatingInsert, OutfitRatingUpdate } from '../types/api';

/**
 * Get all ratings for the current user
 * @returns Array of outfit ratings
 */
export async function getUserRatings(): Promise<OutfitRating[]> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('outfit_ratings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching ratings:', error);
    throw new Error('Error al obtener calificaciones');
  }

  return data as OutfitRating[];
}

/**
 * Get rating for a specific outfit
 * @param outfitId Outfit ID
 * @returns Outfit rating or null if not rated
 */
export async function getOutfitRating(outfitId: string): Promise<OutfitRating | null> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('outfit_ratings')
    .select('*')
    .eq('outfit_id', outfitId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching outfit rating:', error);
    throw new Error('Error al obtener calificación');
  }

  return data as OutfitRating | null;
}

/**
 * Create or update a rating (upsert)
 * @param outfitId Outfit ID
 * @param rating Rating value (1-5)
 * @param notes Optional notes/feedback
 * @returns Created or updated rating
 */
export async function createOrUpdateRating(
  outfitId: string,
  rating: number,
  notes?: string
): Promise<OutfitRating> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  if (rating < 1 || rating > 5) {
    throw new Error('La calificación debe ser entre 1 y 5');
  }

  const ratingData: OutfitRatingInsert = {
    user_id: user.id,
    outfit_id: outfitId,
    rating,
    notes: notes || null,
  };

  // Upsert: insert or update if exists
  const { data, error } = await supabase
    .from('outfit_ratings')
    .upsert(ratingData, {
      onConflict: 'user_id,outfit_id',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating/updating rating:', error);
    throw new Error('Error al guardar calificación');
  }

  return data as OutfitRating;
}

/**
 * Update an existing rating
 * @param ratingId Rating ID
 * @param updates Update data
 * @returns Updated rating
 */
export async function updateRating(
  ratingId: string,
  updates: OutfitRatingUpdate
): Promise<OutfitRating> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
    throw new Error('La calificación debe ser entre 1 y 5');
  }

  const { data, error } = await supabase
    .from('outfit_ratings')
    .update(updates)
    .eq('id', ratingId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating rating:', error);
    throw new Error('Error al actualizar calificación');
  }

  return data as OutfitRating;
}

/**
 * Delete a rating
 * @param ratingId Rating ID
 */
export async function deleteRating(ratingId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { error } = await supabase
    .from('outfit_ratings')
    .delete()
    .eq('id', ratingId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error deleting rating:', error);
    throw new Error('Error al eliminar calificación');
  }
}

/**
 * Get rating statistics for the current user
 * @param savedOutfits Array of saved outfits to enrich stats
 * @returns Rating statistics
 */
export async function getRatingStats(savedOutfits: SavedOutfit[]): Promise<RatingStats> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('outfit_ratings')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error fetching rating stats:', error);
    throw new Error('Error al obtener estadísticas');
  }

  const ratings = data as OutfitRating[];

  if (ratings.length === 0) {
    return {
      average_rating: 0,
      total_ratings: 0,
      rating_distribution: {},
      highest_rated_outfit: undefined,
      lowest_rated_outfit: undefined,
    };
  }

  // Calculate average
  const average_rating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  // Calculate distribution
  const rating_distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  ratings.forEach((r) => {
    rating_distribution[r.rating] = (rating_distribution[r.rating] || 0) + 1;
  });

  // Find highest and lowest rated outfits
  const sortedRatings = [...ratings].sort((a, b) => b.rating - a.rating);
  const highestRating = sortedRatings[0];
  const lowestRating = sortedRatings[sortedRatings.length - 1];

  // Match with SavedOutfit data
  const highest_rated_outfit = savedOutfits.find(
    (o) => o.id === highestRating.outfit_id
  )
    ? {
        ...savedOutfits.find((o) => o.id === highestRating.outfit_id)!,
        rating: highestRating.rating,
      }
    : undefined;

  const lowest_rated_outfit = savedOutfits.find(
    (o) => o.id === lowestRating.outfit_id
  )
    ? {
        ...savedOutfits.find((o) => o.id === lowestRating.outfit_id)!,
        rating: lowestRating.rating,
      }
    : undefined;

  return {
    average_rating: Math.round(average_rating * 10) / 10, // Round to 1 decimal
    total_ratings: ratings.length,
    rating_distribution,
    highest_rated_outfit,
    lowest_rated_outfit,
  };
}
