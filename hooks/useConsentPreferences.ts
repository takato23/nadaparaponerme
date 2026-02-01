import { useEffect, useState } from 'react';
import { getConsentPreferences, subscribeConsent, type ConsentPreferences } from '../services/consentService';

export function useConsentPreferences(): ConsentPreferences | null {
  const [prefs, setPrefs] = useState<ConsentPreferences | null>(() => getConsentPreferences());

  useEffect(() => {
    const unsubscribe = subscribeConsent(setPrefs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== 'ojodeloca-consent-v1') return;
      setPrefs(getConsentPreferences());
    };

    const handleCustom = () => {
      setPrefs(getConsentPreferences());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('ojodeloca-consent-updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ojodeloca-consent-updated', handleCustom);
    };
  }, []);

  return prefs;
}
