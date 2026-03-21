export const LATAM_PRIMARY_COUNTRIES = ['AR', 'MX', 'CL', 'CO', 'PE'] as const;

export type SupportedShoppingCountryCode = (typeof LATAM_PRIMARY_COUNTRIES)[number];

const DEFAULT_COUNTRY: SupportedShoppingCountryCode = 'AR';

export function normalizeCountryCode(
  countryCode: string | null | undefined
): SupportedShoppingCountryCode | null {
  if (!countryCode) return null;
  const normalized = countryCode.trim().toUpperCase();
  if (!normalized) return null;
  if ((LATAM_PRIMARY_COUNTRIES as readonly string[]).includes(normalized)) {
    return normalized as SupportedShoppingCountryCode;
  }
  return null;
}

export function resolveCountryCodeFromLocale(
  locale: string | null | undefined
): SupportedShoppingCountryCode {
  if (!locale) return DEFAULT_COUNTRY;

  const normalizedLocale = locale.trim();
  if (!normalizedLocale) return DEFAULT_COUNTRY;

  const parts = normalizedLocale.replace('_', '-').split('-');
  const candidate = normalizeCountryCode(parts[1] || parts[0]);
  return candidate || DEFAULT_COUNTRY;
}

export function getUserLocaleSafe(): string {
  if (typeof navigator === 'undefined') return 'es-AR';
  return navigator.language || 'es-AR';
}

