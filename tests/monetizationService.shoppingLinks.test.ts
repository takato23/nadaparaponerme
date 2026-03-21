import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({
  supabase: {},
}));

import {
  MONETIZATION_FLAGS,
  getShoppingLinks,
} from '../src/services/monetizationService';

describe('monetizationService.getShoppingLinks', () => {
  let storage: Record<string, string> = {};
  const storageMock = {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
    setItem: (key: string, value: string) => {
      storage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
    get length() {
      return Object.keys(storage).length;
    },
  };

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', storageMock as Storage);
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      configurable: true,
    });
  });

  it('generates geo-routed links for MX', () => {
    const links = getShoppingLinks('remera blanca basica', 'MX');

    expect(links).toHaveLength(3);
    expect(links[0].url).toContain('listado.mercadolibre.com.mx');
    expect(links[1].url).toContain('www.amazon.com.mx');
    expect(links[2].url).toContain('www.google.com.mx');
  });

  it('falls back to AR when country code is unsupported', () => {
    const links = getShoppingLinks('campera negra', 'BR');

    expect(links).toHaveLength(3);
    expect(links[0].url).toContain('listado.mercadolibre.com.ar');
    expect(links[1].url).toContain('www.amazon.com');
    expect(links[2].url).toContain('www.google.com.ar');
  });

  it('keeps backward compatibility when country is omitted', () => {
    const links = getShoppingLinks('zapatillas urbanas');

    expect(links).toHaveLength(3);
    expect(links[0].platform).toBe('mercadolibre');
    expect(links[1].platform).toBe('amazon');
    expect(links[2].platform).toBe('google');
  });

  it('returns empty array when affiliate feature is disabled', () => {
    window.localStorage.setItem(MONETIZATION_FLAGS.ENABLE_AFFILIATES, 'false');

    const links = getShoppingLinks('jean recto', 'AR');
    expect(links).toEqual([]);
  });
});
