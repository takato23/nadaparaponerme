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

// Enable rewarded ads UI (credits for watching ads).
export const REWARDED_ADS_ENABLED = String(import.meta.env.VITE_REWARDED_ADS_ENABLED || '').toLowerCase() === 'true';

// Currency controls
export const USD_ENABLED = String(import.meta.env.VITE_USD_ENABLED || '').toLowerCase() === 'true';

// Rewarded ads provider label (UI only until integration)
export const REWARDED_ADS_PROVIDER = import.meta.env.VITE_REWARDED_ADS_PROVIDER || 'AdMob';

// AdSense (display ads)
export const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || '';
export const ADSENSE_HOME_SLOT = import.meta.env.VITE_ADSENSE_HOME_SLOT || '';
export const ADSENSE_CREDITS_SLOT = import.meta.env.VITE_ADSENSE_CREDITS_SLOT || '';
export const ADSENSE_ENABLED = Boolean(ADSENSE_CLIENT_ID);

/**
 * Hard safety: never allow a client-side Gemini key in production builds.
 * If this flag is true, the app will refuse to boot when VITE_GEMINI_API_KEY is present.
 */
export const DISALLOW_CLIENT_GEMINI_KEY_IN_PROD = true;
