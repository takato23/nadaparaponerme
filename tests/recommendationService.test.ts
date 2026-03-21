// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetUser,
  mockFrom,
  trackConfirmed,
  trackExpired,
  trackRejected,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  trackConfirmed: vi.fn(),
  trackExpired: vi.fn(),
  trackRejected: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}));

vi.mock('../src/services/analyticsService', () => ({
  trackStylistRecommendationConfirmed: trackConfirmed,
  trackStylistRecommendationDismissed: vi.fn(),
  trackStylistRecommendationExpired: trackExpired,
  trackStylistRecommendationRejected: trackRejected,
}));

import {
  blockItem,
  confirmRecommendation,
  getActiveRecommendation,
  getBlockedItemIds,
  recommendationStorageKeys,
} from '../src/services/recommendationService';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function createQueryBuilder(overrides: Partial<Record<string, any>> = {}) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  chain.update = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.single = vi.fn(async () => ({ data: null, error: null }));
  chain.upsert = vi.fn(async () => ({ data: null, error: null }));
  chain.gt = vi.fn(() => chain);
  Object.assign(chain, overrides);
  return chain;
}

describe('recommendationService', () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });

    localStorage.clear();
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => createQueryBuilder());
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('confirma recomendación local con expiración a 48h aprox', async () => {
    const candidate = {
      item_id: 'item-1',
      reason: 'Color y ocasión alineados',
      score_total: 0.84,
      score_breakdown: {
        colorimetry: 0.9,
        occasion_style: 0.8,
        season_climate: 0.7,
        usage: 0.6,
      },
    };

    const recommendation = await confirmRecommendation(candidate, 'thread-1');

    expect(recommendation.status).toBe('active');
    expect(recommendation.item_id).toBe('item-1');
    expect(recommendation.thread_id).toBe('thread-1');

    const deltaHours = (Date.parse(recommendation.expires_at) - Date.now()) / (1000 * 60 * 60);
    expect(deltaHours).toBeGreaterThan(47);
    expect(deltaHours).toBeLessThan(49);

    const stored = JSON.parse(localStorage.getItem(recommendationStorageKeys.ACTIVE_RECOMMENDATION_KEY) || '{}');
    expect(stored.item_id).toBe('item-1');
    expect(trackConfirmed).toHaveBeenCalledTimes(1);
  });

  it('marca recomendación local expirada y limpia storage', async () => {
    localStorage.setItem(
      recommendationStorageKeys.ACTIVE_RECOMMENDATION_KEY,
      JSON.stringify({
        id: 'reco-expired',
        user_id: 'local-user',
        item_id: 'item-x',
        thread_id: 'thread-x',
        reason: 'expirada',
        score_total: 0.6,
        score_breakdown: {
          colorimetry: 0.6,
          occasion_style: 0.6,
          season_climate: 0.6,
          usage: 0.6,
        },
        status: 'active',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        created_at: new Date(Date.now() - 120_000).toISOString(),
        updated_at: new Date(Date.now() - 60_000).toISOString(),
      }),
    );

    const result = await getActiveRecommendation();
    expect(result).toBeNull();
    expect(localStorage.getItem(recommendationStorageKeys.ACTIVE_RECOMMENDATION_KEY)).toBeNull();
    expect(trackExpired).toHaveBeenCalledTimes(1);
  });

  it('bloquea prenda y la devuelve en bloqueadas locales', async () => {
    await blockItem('item-block', 30);
    const blocked = await getBlockedItemIds();

    expect(blocked).toContain('item-block');
    expect(trackRejected).toHaveBeenCalledTimes(1);

    const rawBlocks = JSON.parse(localStorage.getItem(recommendationStorageKeys.BLOCKED_ITEMS_KEY) || '[]');
    expect(rawBlocks.length).toBeGreaterThan(0);
  });

  it('usa fallback local cuando falla Supabase al confirmar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const failingChain = createQueryBuilder({
      single: vi.fn(async () => ({ data: null, error: { message: 'db unavailable' } })),
    });
    mockFrom.mockImplementation(() => failingChain);

    const recommendation = await confirmRecommendation({
      item_id: 'item-db-fallback',
      reason: 'fallback',
      score_total: 0.7,
      score_breakdown: {
        colorimetry: 0.7,
        occasion_style: 0.7,
        season_climate: 0.7,
        usage: 0.7,
      },
    });

    expect(recommendation.id.startsWith('local_reco_')).toBe(true);
    expect(recommendation.item_id).toBe('item-db-fallback');
  });
});
