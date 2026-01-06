/**
 * Waitlist Service
 *
 * Manages beta waitlist signups
 * Stores in Supabase if available, falls back to localStorage
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface WaitlistEntry {
  email: string;
  created_at: string;
  source?: string;
}

/**
 * Add email to waitlist
 */
export async function joinWaitlist(email: string, source: string = 'landing'): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, message: 'Por favor ingresá un email válido' };
  }

  try {
    // Try Supabase first
    const { error } = await supabase
      .from('waitlist')
      .insert({
        email: normalizedEmail,
        source,
      });

    if (error) {
      // If table doesn't exist or other error, fall back to localStorage
      if (error.code === '42P01' || error.message.includes('relation')) {
        logger.log('Waitlist table not found, using localStorage fallback');
        return saveToLocalStorage(normalizedEmail, source);
      }

      // Duplicate email
      if (error.code === '23505' || error.message.includes('duplicate')) {
        return { success: false, message: '¡Ya estás en la lista! Te avisaremos pronto.' };
      }

      throw error;
    }

    return { success: true, message: '¡Listo! Te avisaremos cuando lancemos.' };
  } catch (error) {
    logger.error('Error joining waitlist:', error);
    // Fallback to localStorage on any error
    return saveToLocalStorage(normalizedEmail, source);
  }
}

/**
 * Fallback: Save to localStorage
 */
function saveToLocalStorage(email: string, source: string): { success: boolean; message: string } {
  try {
    const key = 'ojodeloca-waitlist';
    const existingData = localStorage.getItem(key);
    const waitlist: WaitlistEntry[] = existingData ? JSON.parse(existingData) : [];

    // Check for duplicate
    if (waitlist.some(entry => entry.email === email)) {
      return { success: false, message: '¡Ya estás en la lista! Te avisaremos pronto.' };
    }

    // Add new entry
    waitlist.push({
      email,
      created_at: new Date().toISOString(),
      source,
    });

    localStorage.setItem(key, JSON.stringify(waitlist));

    return { success: true, message: '¡Listo! Te avisaremos cuando lancemos.' };
  } catch (error) {
    logger.error('Error saving to localStorage:', error);
    return { success: false, message: 'Hubo un error. Intentá de nuevo.' };
  }
}

/**
 * Get waitlist count (for display)
 */
export async function getWaitlistCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Fallback to localStorage count
      const localData = localStorage.getItem('ojodeloca-waitlist');
      if (localData) {
        return JSON.parse(localData).length;
      }
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}
