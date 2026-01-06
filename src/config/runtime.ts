/**
 * Runtime Flags (Release Controls)
 *
 * Centralizes environment-based toggles used to safely ship V1.
 * These are resolved at build time by Vite, but read at runtime via import.meta.env.
 */

const rawSafeMode = String(import.meta.env.VITE_V1_SAFE_MODE || '').toLowerCase();
// Default to safe mode in production unless explicitly disabled.
export const V1_SAFE_MODE = import.meta.env.PROD ? rawSafeMode !== 'false' : rawSafeMode === 'true';

/**
 * Payments are intentionally off by default for V1 safety.
 * Enable only after you have tested MercadoPago end-to-end in production.
 */
export const PAYMENTS_ENABLED = String(import.meta.env.VITE_PAYMENTS_ENABLED || '').toLowerCase() === 'true';

/**
 * Hard safety: never allow a client-side Gemini key in production builds.
 * If this flag is true, the app will refuse to boot when VITE_GEMINI_API_KEY is present.
 */
export const DISALLOW_CLIENT_GEMINI_KEY_IN_PROD = true;
