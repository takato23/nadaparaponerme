/**
 * Style Challenges Service
 * Handles CRUD operations for user style challenges
 */

import { supabase } from '../lib/supabase';
import { getSessionUser } from './authService';
import { logger } from '../utils/logger';
import type { StyleChallenge, ChallengeStatus } from '../../types';
import type { StyleChallengeInsert, StyleChallengeUpdate } from '../types/api';

/**
 * Get all challenges for the current user
 * @param status Optional filter by challenge status
 * @returns Array of style challenges
 */
export async function getUserChallenges(status?: ChallengeStatus): Promise<StyleChallenge[]> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  let query = supabase
    .from('style_challenges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching challenges:', error);
    // Si la tabla no existe (PGRST205), retornar array vacío
    if (error.code === 'PGRST205' || error.message?.includes('style_challenges')) {
      logger.warn('La tabla style_challenges no existe. Ejecuta la migración apply_style_challenges.sql en Supabase.');
      return [];
    }
    throw new Error('Error al obtener desafíos');
  }

  return (data || []) as StyleChallenge[];
}

/**
 * Get a single challenge by ID
 * @param challengeId Challenge ID
 * @returns Style challenge
 */
export async function getChallengeById(challengeId: string): Promise<StyleChallenge> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('style_challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    logger.error('Error fetching challenge:', error);
    throw new Error('Error al obtener desafío');
  }

  return data as StyleChallenge;
}

/**
 * Create a new style challenge
 * @param challenge Challenge data
 * @returns Created challenge
 */
export async function createChallenge(challenge: Omit<StyleChallengeInsert, 'user_id'>): Promise<StyleChallenge> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('style_challenges')
    .insert({
      ...challenge,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating challenge:', error);
    throw new Error('Error al crear desafío');
  }

  return data as StyleChallenge;
}

/**
 * Update a challenge (typically to change status or add outfit)
 * @param challengeId Challenge ID
 * @param updates Update data
 * @returns Updated challenge
 */
export async function updateChallenge(
  challengeId: string,
  updates: StyleChallengeUpdate
): Promise<StyleChallenge> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('style_challenges')
    .update(updates)
    .eq('id', challengeId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating challenge:', error);
    throw new Error('Error al actualizar desafío');
  }

  return data as StyleChallenge;
}

/**
 * Mark a challenge as completed
 * @param challengeId Challenge ID
 * @param outfitId Optional outfit ID that fulfilled the challenge
 * @returns Updated challenge
 */
export async function completeChallenge(challengeId: string, outfitId?: string): Promise<StyleChallenge> {
  return updateChallenge(challengeId, {
    status: 'completed',
    outfit_id: outfitId || null,
  });
}

/**
 * Mark a challenge as skipped
 * @param challengeId Challenge ID
 * @returns Updated challenge
 */
export async function skipChallenge(challengeId: string): Promise<StyleChallenge> {
  return updateChallenge(challengeId, {
    status: 'skipped',
  });
}

/**
 * Delete a challenge
 * @param challengeId Challenge ID
 */
export async function deleteChallenge(challengeId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { error } = await supabase
    .from('style_challenges')
    .delete()
    .eq('id', challengeId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error deleting challenge:', error);
    throw new Error('Error al eliminar desafío');
  }
}

/**
 * Get challenge statistics for the current user
 * @returns Challenge statistics
 */
export async function getChallengeStats(): Promise<{
  total: number;
  active: number;
  completed: number;
  skipped: number;
  totalPoints: number;
}> {
  const user = await getSessionUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('style_challenges')
    .select('status, points_reward')
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error fetching challenge stats:', error);
    // Si la tabla no existe (PGRST205), retornar estadísticas vacías
    if (error.code === 'PGRST205' || error.message?.includes('style_challenges')) {
      logger.warn('La tabla style_challenges no existe. Ejecuta la migración apply_style_challenges.sql en Supabase.');
      return {
        total: 0,
        active: 0,
        completed: 0,
        skipped: 0,
        totalPoints: 0,
      };
    }
    throw new Error('Error al obtener estadísticas');
  }

  const challengeData = data || [];
  const stats = {
    total: challengeData.length,
    active: challengeData.filter((c) => c.status === 'active').length,
    completed: challengeData.filter((c) => c.status === 'completed').length,
    skipped: challengeData.filter((c) => c.status === 'skipped').length,
    totalPoints: challengeData
      .filter((c) => c.status === 'completed')
      .reduce((sum, c) => sum + (c.points_reward || 0), 0),
  };

  return stats;
}
