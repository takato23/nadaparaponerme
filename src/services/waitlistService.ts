/**
 * Waitlist Service
 *
 * Manages beta waitlist signups
 * Stores in Supabase if available, falls back to localStorage
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { joinWaitlistViaEdge } from './edgeFunctionClient';

interface WaitlistEntry {
  email: string;
  instagram_handle?: string;
  created_at: string;
  source?: string;
}

/**
 * Add email to waitlist
 */
export async function joinWaitlist(
  email: string,
  options: {
    instagramHandle?: string;
    source?: string;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    entry_path?: string | null;
    legacyBetaCode?: string | null;
  } = {},
): Promise<{ success: boolean; message: string; status?: string; approved?: boolean; activated?: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  const source = options.source || 'landing';
  const instagramHandle = String(options.instagramHandle || '').trim().replace(/^@+/, '');

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, message: 'Por favor ingresá un email válido' };
  }

  try {
    const edgeResult = await joinWaitlistViaEdge({
      email: normalizedEmail,
      instagram_handle: instagramHandle,
      source,
      utm_source: options.utm_source,
      utm_medium: options.utm_medium,
      utm_campaign: options.utm_campaign,
      entry_path: options.entry_path,
      legacy_beta_code: options.legacyBetaCode,
    });
    return edgeResult;
  } catch (edgeError) {
    logger.warn('joinWaitlistViaEdge unavailable, falling back to direct table access:', edgeError);
    try {
      // Try Supabase first
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email: normalizedEmail,
          source,
          instagram_handle: instagramHandle || null,
        });

      if (error) {
        // If table doesn't exist or other error, fall back to localStorage
        if (error.code === '42P01' || error.message.includes('relation')) {
          logger.log('Waitlist table not found, using localStorage fallback');
          return saveToLocalStorage(normalizedEmail, instagramHandle, source);
        }

        // Duplicate email
        if (error.code === '23505' || error.message.includes('duplicate')) {
          return { success: true, status: 'pending', approved: false, activated: false, message: 'Ya estabas en la lista. Cuando te aprobemos, vas a poder entrar con ese email.' };
        }

        throw error;
      }

      return { success: true, status: 'pending', approved: false, activated: false, message: 'Te sumamos a la beta. Cuando aprobemos tu acceso, vas a poder entrar con ese email.' };
    } catch (error) {
      logger.error('Error joining waitlist:', error);
      // Fallback to localStorage on any error
      return saveToLocalStorage(normalizedEmail, instagramHandle, source);
    }
  }
}

/**
 * Fallback: Save to localStorage
 */
function saveToLocalStorage(email: string, instagramHandle: string, source: string): { success: boolean; message: string; status?: string; approved?: boolean; activated?: boolean } {
  try {
    const key = 'ojodeloca-waitlist';
    const existingData = localStorage.getItem(key);
    const waitlist: WaitlistEntry[] = existingData ? JSON.parse(existingData) : [];

    // Check for duplicate
    if (waitlist.some(entry => entry.email === email)) {
      return { success: true, status: 'pending', approved: false, activated: false, message: 'Ya estabas en la lista. Cuando aprobemos tu acceso, vas a poder entrar con ese email.' };
    }

    // Add new entry
    waitlist.push({
      email,
      instagram_handle: instagramHandle || undefined,
      created_at: new Date().toISOString(),
      source,
    });

    localStorage.setItem(key, JSON.stringify(waitlist));

    return { success: true, status: 'pending', approved: false, activated: false, message: 'Te sumamos a la beta. Cuando aprobemos tu acceso, vas a poder entrar con ese email.' };
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
