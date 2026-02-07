import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CREDIT_LIMITS,
  getCreditStatus,
  resetCredits,
  setUserTier,
  useCredit,
  useCredits,
} from '../src/services/usageTrackingService';

const createMockStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } as Storage;
};

const originalLocalStorage = globalThis.localStorage;

describe('usageTrackingService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: createMockStorage(),
    });
    setUserTier('free');
    resetCredits();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: originalLocalStorage,
    });
  });

  it('returns the expected limits for the free tier', () => {
    const status = getCreditStatus();
    expect(status.tier).toBe('free');
    expect(status.limit).toBe(CREDIT_LIMITS.free);
    expect(status.remaining).toBe(CREDIT_LIMITS.free);
    expect(status.canUse).toBe(true);
  });

  it('consumes credits and stops at the limit', () => {
    for (let i = 0; i < CREDIT_LIMITS.free; i += 1) {
      expect(useCredit()).toBe(true);
    }

    expect(useCredit()).toBe(false);

    const status = getCreditStatus();
    expect(status.remaining).toBe(0);
    expect(status.canUse).toBe(false);
  });

  it('useCredits allows batch consumption and avoids overdraft', () => {
    expect(useCredits(5)).toBe(true);
    expect(getCreditStatus().remaining).toBe(CREDIT_LIMITS.free - 5);

    expect(useCredits(CREDIT_LIMITS.free)).toBe(false);
    expect(getCreditStatus().remaining).toBe(CREDIT_LIMITS.free - 5);
  });

  it('uses premium tier limits correctly', () => {
    setUserTier('premium');
    resetCredits();

    const status = getCreditStatus();
    expect(status.limit).toBe(CREDIT_LIMITS.premium);
    expect(status.remaining).toBe(CREDIT_LIMITS.premium);
    expect(status.canUse).toBe(true);

    expect(useCredit()).toBe(true);
    expect(getCreditStatus().remaining).toBe(CREDIT_LIMITS.premium - 1);
  });
});
