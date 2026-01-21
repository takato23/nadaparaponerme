/**
 * Internationalization (i18n) Service
 * 
 * Lightweight i18n system for ASO multi-language support.
 * Supports Spanish (default), English, and Portuguese.
 */

export type Locale = 'es' | 'en' | 'pt-BR';

const STORAGE_KEY = 'ojodeloca_locale';
const DEFAULT_LOCALE: Locale = 'es';

// Current locale state
let currentLocale: Locale = DEFAULT_LOCALE;
let translations: Record<string, string> = {};
let isInitialized = false;

/**
 * Detect browser locale and map to supported locales
 */
function detectBrowserLocale(): Locale {
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

    const browserLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage;
    if (!browserLang) return DEFAULT_LOCALE;

    const lang = browserLang.toLowerCase();

    // Portuguese variants
    if (lang.startsWith('pt')) return 'pt-BR';

    // English variants
    if (lang.startsWith('en')) return 'en';

    // Spanish is default
    return 'es';
}

/**
 * Load translations for a locale
 */
async function loadTranslations(locale: Locale): Promise<Record<string, string>> {
    try {
        // Dynamic import of locale file
        const module = await import(`../locales/${locale}.json`);
        return flattenObject(module.default || module);
    } catch (error) {
        console.warn(`[i18n] Failed to load locale ${locale}, falling back to es`);
        if (locale !== 'es') {
            const esModule = await import('../locales/es.json');
            return flattenObject(esModule.default || esModule);
        }
        return {};
    }
}

/**
 * Flatten nested object keys with dot notation
 * { a: { b: 'c' } } => { 'a.b': 'c' }
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
        } else {
            result[newKey] = String(value);
        }
    }

    return result;
}

/**
 * Initialize i18n with stored or detected locale
 */
export async function initI18n(): Promise<void> {
    if (isInitialized) return;

    // Check for stored preference
    const stored = typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY) as Locale | null
        : null;

    currentLocale = stored || detectBrowserLocale();
    translations = await loadTranslations(currentLocale);
    isInitialized = true;

    console.log(`[i18n] Initialized with locale: ${currentLocale}`);
}

/**
 * Get the current locale
 */
export function getLocale(): Locale {
    return currentLocale;
}

/**
 * Set locale and reload translations
 */
export async function setLocale(locale: Locale): Promise<void> {
    if (locale === currentLocale && isInitialized) return;

    currentLocale = locale;
    translations = await loadTranslations(locale);

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, locale);
    }

    // Dispatch event for React to re-render
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localechange', { detail: { locale } }));
    }
}

/**
 * Translate a key with optional interpolation
 * @param key - Dot-notation key (e.g. 'onboarding.welcome.title')
 * @param params - Interpolation params (e.g. { name: 'Juan' })
 * @returns Translated string or key if not found
 */
export function t(key: string, params?: Record<string, string | number>): string {
    let text = translations[key];

    // Return key if translation not found
    if (!text) {
        if (import.meta.env.DEV) {
            console.warn(`[i18n] Missing translation for key: ${key}`);
        }
        return key;
    }

    // Interpolate params
    if (params) {
        for (const [param, value] of Object.entries(params)) {
            text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
        }
    }

    return text;
}

/**
 * Check if translations are loaded
 */
export function isI18nReady(): boolean {
    return isInitialized;
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): { code: Locale; name: string; flag: string }[] {
    return [
        { code: 'es', name: 'Español', flag: '🇦🇷' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    ];
}
