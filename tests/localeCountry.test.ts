import { describe, expect, it } from 'vitest';
import {
  normalizeCountryCode,
  resolveCountryCodeFromLocale,
  LATAM_PRIMARY_COUNTRIES,
} from '../src/utils/localeCountry';

describe('localeCountry utils', () => {
  it('normalizes supported country codes', () => {
    expect(normalizeCountryCode('ar')).toBe('AR');
    expect(normalizeCountryCode(' MX ')).toBe('MX');
  });

  it('returns null for unsupported country codes', () => {
    expect(normalizeCountryCode('BR')).toBeNull();
    expect(normalizeCountryCode('')).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
  });

  it('resolves supported locale country and falls back to AR', () => {
    expect(resolveCountryCodeFromLocale('es-CO')).toBe('CO');
    expect(resolveCountryCodeFromLocale('es_MX')).toBe('MX');
    expect(resolveCountryCodeFromLocale('pt-BR')).toBe('AR');
    expect(resolveCountryCodeFromLocale(undefined)).toBe('AR');
  });

  it('keeps configured LatAm rollout countries', () => {
    expect(LATAM_PRIMARY_COUNTRIES).toEqual(['AR', 'MX', 'CL', 'CO', 'PE']);
  });
});
