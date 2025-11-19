/**
 * Preferences Service
 *
 * Manages user preferences in Supabase (style_preferences JSONB field in profiles table)
 */

import { supabase } from '../lib/supabase';
import type { SortOption } from '../../types';

/**
 * Get sort preferences from Supabase
 *
 * @param userId - User ID (from auth)
 * @returns SortOption or null if not found
 */
export async function getSortPreferences(userId: string): Promise<SortOption | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('style_preferences')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Parse sort preferences from style_preferences JSONB
    if (data?.style_preferences) {
      const prefs = data.style_preferences as string[];
      const sortPref = prefs.find((p: string) => p.startsWith('sort:'));

      if (sortPref) {
        const [_, property, direction] = sortPref.split(':');

        // Validate parsed values match SortOption type
        const validProperties: Array<'date' | 'name' | 'color'> = ['date', 'name', 'color'];
        const validDirections: Array<'asc' | 'desc'> = ['asc', 'desc'];

        if (validProperties.includes(property as any) && validDirections.includes(direction as any)) {
          return {
            property: property as 'date' | 'name' | 'color',
            direction: direction as 'asc' | 'desc',
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to load sort preferences from Supabase:', error);
    return null;
  }
}

/**
 * Update sort preferences in Supabase
 *
 * @param userId - User ID (from auth)
 * @param sortOption - New sort preferences
 */
export async function updateSortPreferences(
  userId: string,
  sortOption: SortOption
): Promise<void> {
  try {
    // Get current preferences
    const { data } = await supabase
      .from('profiles')
      .select('style_preferences')
      .eq('id', userId)
      .single();

    const currentPrefs = (data?.style_preferences as string[]) || [];

    // Remove old sort preference and add new one
    const otherPrefs = currentPrefs.filter((p: string) => !p.startsWith('sort:'));
    const newPrefs = [...otherPrefs, `sort:${sortOption.property}:${sortOption.direction}`];

    // Update preferences
    const { error } = await supabase
      .from('profiles')
      .update({ style_preferences: newPrefs })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save sort preferences to Supabase:', error);
    throw error;
  }
}

/**
 * Get all style preferences from Supabase
 *
 * @param userId - User ID (from auth)
 * @returns Array of preference strings or empty array
 */
export async function getStylePreferences(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('style_preferences')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return (data?.style_preferences as string[]) || [];
  } catch (error) {
    console.error('Failed to load style preferences from Supabase:', error);
    return [];
  }
}

/**
 * Update all style preferences in Supabase
 *
 * @param userId - User ID (from auth)
 * @param preferences - Array of preference strings
 */
export async function updateStylePreferences(
  userId: string,
  preferences: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ style_preferences: preferences })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update style preferences:', error);
    throw error;
  }
}
