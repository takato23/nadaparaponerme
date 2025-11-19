/**
 * Development-only Gemini API initialization
 *
 * WARNING: This file should ONLY be used in development mode.
 * In production, all Gemini API calls go through Supabase Edge Functions.
 *
 * This file is automatically excluded from production builds.
 */

import { configureGeminiAPI } from '../../services/geminiService-rest';

/**
 * Initialize Gemini API for local development
 * This reads from VITE_GEMINI_API_KEY which is only available in .env.local
 */
export function initGeminiForDevelopment() {
  // Only run in development mode
  if (import.meta.env.DEV) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey) {
      console.warn(
        '⚠️ DEVELOPMENT MODE: Using Gemini API key from environment. ' +
        'This should NEVER happen in production!'
      );
      configureGeminiAPI(apiKey);
    } else {
      console.warn(
        '⚠️ No VITE_GEMINI_API_KEY found in .env.local. ' +
        'AI features will only work through Edge Functions.'
      );
    }
  }
}

/**
 * Check if we should use Edge Functions
 * Returns false in development if API key is available locally
 */
export function shouldUseEdgeFunctions(): boolean {
  if (import.meta.env.PROD) {
    return true; // Always use Edge Functions in production
  }

  // In development, use Edge Functions only if no local API key
  return !import.meta.env.VITE_GEMINI_API_KEY;
}
