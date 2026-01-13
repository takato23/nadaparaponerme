export type ConsentCategory = 'analytics' | 'ads';

export interface ConsentPreferences {
  analytics: boolean;
  ads: boolean;
  updatedAt: string;
  version: number;
}

const STORAGE_KEY = 'ojodeloca-consent-v1';
const CURRENT_VERSION = 1;

type Listener = (prefs: ConsentPreferences | null) => void;
const listeners = new Set<Listener>();

function getRuntimeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export function getConsentPreferences(): ConsentPreferences | null {
  const storage = getRuntimeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.ads !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return !!getConsentPreferences()?.analytics;
}

export function hasAdsConsent(): boolean {
  return !!getConsentPreferences()?.ads;
}

export function setConsentPreferences(input: { analytics: boolean; ads: boolean }): ConsentPreferences {
  const storage = getRuntimeStorage();
  const prefs: ConsentPreferences = {
    analytics: input.analytics,
    ads: input.ads,
    updatedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage write errors
    }
  }

  notify(prefs);
  return prefs;
}

export function clearConsentPreferences(): void {
  const storage = getRuntimeStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  notify(null);
}

export function subscribeConsent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(prefs: ConsentPreferences | null): void {
  listeners.forEach((listener) => listener(prefs));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ojodeloca-consent-updated'));
  }
}
