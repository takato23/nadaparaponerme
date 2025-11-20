/**
 * Schedule Service
 *
 * Handles CRUD operations for outfit schedule (weekly planner).
 * Manages outfit_schedule table in Supabase.
 */

import { supabase } from '../lib/supabase';
import type { OutfitSchedule, ScheduledOutfitWithDetails, SavedOutfit } from '../../types';
import type { Database } from '../types/api';
import { logger } from '../../utils/logger';

type ScheduleRow = Database['public']['Tables']['outfit_schedule']['Row'];
type ScheduleInsert = Database['public']['Tables']['outfit_schedule']['Insert'];
type ScheduleUpdate = Database['public']['Tables']['outfit_schedule']['Update'];
type OutfitRow = Database['public']['Tables']['outfits']['Row'];

/**
 * Convert Supabase Schedule to OutfitSchedule format
 */
function convertScheduleToType(schedule: ScheduleRow): OutfitSchedule {
  return {
    id: schedule.id,
    user_id: schedule.user_id,
    date: schedule.date,
    outfit_id: schedule.outfit_id,
    created_at: schedule.created_at,
    updated_at: schedule.updated_at,
  };
}

/**
 * Convert Outfit Row to SavedOutfit format
 */
function convertOutfitToLegacyFormat(outfit: OutfitRow): SavedOutfit {
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
 * Get week schedule (7 days starting from date)
 * Returns scheduled outfits with full outfit details
 */
export async function getWeekSchedule(startDate: string): Promise<ScheduledOutfitWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate end date (6 days after start date)
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // Fetch schedules with outfit data
    const { data, error } = await supabase
      .from('outfit_schedule')
      .select(`
        *,
        outfit:outfits (*)
      `)
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (error) throw error;

    // Convert to ScheduledOutfitWithDetails format
    return data.map((schedule: any) => ({
      ...convertScheduleToType(schedule),
      outfit: convertOutfitToLegacyFormat(schedule.outfit),
    }));
  } catch (error) {
    logger.error('Failed to fetch week schedule:', error);
    throw error;
  }
}

/**
 * Get today's scheduled outfit
 */
export async function getTodaySchedule(): Promise<ScheduledOutfitWithDetails | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('outfit_schedule')
      .select(`
        *,
        outfit:outfits (*)
      `)
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      ...convertScheduleToType(data),
      outfit: convertOutfitToLegacyFormat(data.outfit),
    };
  } catch (error) {
    logger.error('Failed to fetch today schedule:', error);
    throw error;
  }
}

/**
 * Schedule an outfit for a specific date
 * If an outfit is already scheduled for that date, it will be replaced (upsert)
 */
export async function scheduleOutfit(date: string, outfitId: string): Promise<OutfitSchedule> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const scheduleData: ScheduleInsert = {
      user_id: user.id,
      date,
      outfit_id: outfitId,
    };

    // Upsert: insert or update if exists
    const { data, error } = await supabase
      .from('outfit_schedule')
      .upsert(scheduleData, {
        onConflict: 'user_id,date', // Unique constraint
      })
      .select()
      .single();

    if (error) throw error;

    return convertScheduleToType(data);
  } catch (error) {
    logger.error('Failed to schedule outfit:', error);
    throw error;
  }
}

/**
 * Update a scheduled outfit
 */
export async function updateSchedule(
  scheduleId: string,
  updates: {
    date?: string;
    outfit_id?: string;
  }
): Promise<OutfitSchedule> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: ScheduleUpdate = {
      date: updates.date,
      outfit_id: updates.outfit_id,
    };

    const { data, error } = await supabase
      .from('outfit_schedule')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return convertScheduleToType(data);
  } catch (error) {
    logger.error('Failed to update schedule:', error);
    throw error;
  }
}

/**
 * Delete a scheduled outfit
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('outfit_schedule')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to delete schedule:', error);
    throw error;
  }
}

/**
 * Delete scheduled outfit by date
 * Convenience method for removing outfit from a specific date
 */
export async function deleteScheduleByDate(date: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('outfit_schedule')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to delete schedule by date:', error);
    throw error;
  }
}

/**
 * Get all scheduled outfits for current user
 * Useful for overview and analytics
 */
export async function getAllSchedules(): Promise<ScheduledOutfitWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('outfit_schedule')
      .select(`
        *,
        outfit:outfits (*)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) throw error;

    return data.map((schedule: any) => ({
      ...convertScheduleToType(schedule),
      outfit: convertOutfitToLegacyFormat(schedule.outfit),
    }));
  } catch (error) {
    logger.error('Failed to fetch all schedules:', error);
    throw error;
  }
}
