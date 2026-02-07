/**
 * useI18n Hook
 * 
 * React hook for using translations in components.
 * Automatically re-renders when locale changes.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    initI18n,
    getLocale,
    setLocale as setServiceLocale,
    t as translate,
    isI18nReady,
    getSupportedLocales,
    type Locale
} from '../src/services/i18nService';

interface UseI18nReturn {
    t: (key: string, params?: Record<string, string | number>) => string;
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;
    isReady: boolean;
    supportedLocales: { code: Locale; name: string; flag: string }[];
}

/**
 * Hook for internationalization
 * 
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useI18n();
 * return <h1>{t('onboarding.welcome.title')}</h1>;
 * ```
 */
export function useI18n(): UseI18nReturn {
    const [locale, setLocaleState] = useState<Locale>(getLocale());
    const [isReady, setIsReady] = useState(isI18nReady());
    const [, forceUpdate] = useState(0);

    // Initialize i18n on mount
    useEffect(() => {
        if (!isI18nReady()) {
            initI18n().then(() => {
                setLocaleState(getLocale());
                setIsReady(true);
            });
        }
    }, []);

    // Listen for locale changes
    useEffect(() => {
        const handleLocaleChange = (event: CustomEvent<{ locale: Locale }>) => {
            setLocaleState(event.detail.locale);
            forceUpdate(n => n + 1); // Force re-render to update translations
        };

        window.addEventListener('localechange', handleLocaleChange as EventListener);
        return () => {
            window.removeEventListener('localechange', handleLocaleChange as EventListener);
        };
    }, []);

    // Wrapper for setLocale that updates local state
    const setLocale = useCallback(async (newLocale: Locale) => {
        await setServiceLocale(newLocale);
        setLocaleState(newLocale);
    }, []);

    // Memoized translation function
    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        return translate(key, params);
    }, [locale, isReady]); // Re-create when locale changes

    return {
        t,
        locale,
        setLocale,
        isReady,
        supportedLocales: getSupportedLocales(),
    };
}

/**
 * Simple language selector component
 */
export function LanguageSelector() {
    const { locale, setLocale, supportedLocales } = useI18n();

    return (
        <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm"
        >
            {supportedLocales.map(({ code, name, flag }) => (
                <option key={code} value={code}>
                    {flag} {name}
                </option>
            ))}
        </select>
    );
}
