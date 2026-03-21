import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CREDIT_LIMITS,
  TRYON_LIMITS,
  canUseFeature,
  getCreditStatus,
  resetCredits,
  setUserTier,
  consumeCredit,
  useCredits,
  getTryOnStatus,
  consumeTryOn,
  refundTryOn,
  grantBonusTryOns,
  resetTryOnUsage,
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
    resetTryOnUsage();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: originalLocalStorage,
    });
  });

  // ======================================================================
  // AI CREDITS
  // ======================================================================

  it('returns the expected limits for the free tier', () => {
    const status = getCreditStatus();
    expect(status.tier).toBe('free');
    expect(status.limit).toBe(CREDIT_LIMITS.free);
    expect(status.remaining).toBe(CREDIT_LIMITS.free);
    expect(status.canUse).toBe(true);
  });

  it('consumes credits and stops at the limit', () => {
    for (let i = 0; i < CREDIT_LIMITS.free; i += 1) {
      expect(consumeCredit()).toBe(true);
    }

    expect(consumeCredit()).toBe(false);

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

  it('uses plus tier limits correctly', () => {
    setUserTier('plus');
    resetCredits();

    const status = getCreditStatus();
    expect(status.limit).toBe(CREDIT_LIMITS.plus);
    expect(status.remaining).toBe(CREDIT_LIMITS.plus);
    expect(status.canUse).toBe(true);

    expect(consumeCredit()).toBe(true);
    expect(getCreditStatus().remaining).toBe(CREDIT_LIMITS.plus - 1);
  });

  it('uses pro tier limits correctly', () => {
    setUserTier('pro');
    resetCredits();

    const status = getCreditStatus();
    expect(status.limit).toBe(CREDIT_LIMITS.pro);
    expect(status.remaining).toBe(CREDIT_LIMITS.pro);
  });

  it('uses premium tier limits correctly', () => {
    setUserTier('premium');
    resetCredits();

    const status = getCreditStatus();
    expect(status.limit).toBe(CREDIT_LIMITS.premium);
    expect(status.remaining).toBe(CREDIT_LIMITS.premium);
    expect(status.canUse).toBe(true);

    expect(consumeCredit()).toBe(true);
    expect(getCreditStatus().remaining).toBe(CREDIT_LIMITS.premium - 1);
  });

  it('does not block free stylist actions even when premium credits are exhausted', () => {
    for (let i = 0; i < CREDIT_LIMITS.free; i += 1) {
      expect(consumeCredit()).toBe(true);
    }

    const status = canUseFeature('free_chat');
    expect(status.canUse).toBe(true);
  });

  it('still blocks paid stylist actions when premium credits are exhausted', () => {
    for (let i = 0; i < CREDIT_LIMITS.free; i += 1) {
      expect(consumeCredit()).toBe(true);
    }

    const status = canUseFeature('new_garment_generation');
    expect(status.canUse).toBe(false);
  });

  // ======================================================================
  // TRY-ON TRACKING
  // ======================================================================

  it('returns the expected try-on limits for the free tier', () => {
    const status = getTryOnStatus();
    expect(status.tier).toBe('free');
    expect(status.monthlyLimit).toBe(TRYON_LIMITS.free);
    expect(status.remaining).toBe(TRYON_LIMITS.free);
    expect(status.canUse).toBe(true);
    expect(status.bonus).toBe(0);
  });

  it('consumes try-ons and stops at the limit', () => {
    // Free tier has 1 try-on
    expect(consumeTryOn()).toBe(true);
    expect(consumeTryOn()).toBe(false);

    const status = getTryOnStatus();
    expect(status.remaining).toBe(0);
    expect(status.canUse).toBe(false);
  });

  it('plus tier gets 4 try-ons per month', () => {
    setUserTier('plus');
    resetTryOnUsage();

    const status = getTryOnStatus();
    expect(status.monthlyLimit).toBe(4);
    expect(status.remaining).toBe(4);

    for (let i = 0; i < 4; i++) {
      expect(consumeTryOn()).toBe(true);
    }
    expect(consumeTryOn()).toBe(false);
  });

  it('refunds a try-on correctly', () => {
    expect(consumeTryOn()).toBe(true);
    expect(getTryOnStatus().remaining).toBe(0);

    refundTryOn();
    expect(getTryOnStatus().remaining).toBe(1);
    expect(getTryOnStatus().canUse).toBe(true);
  });

  it('grants bonus try-ons from pack purchase', () => {
    // Use up the free try-on
    expect(consumeTryOn()).toBe(true);
    expect(getTryOnStatus().canUse).toBe(false);

    // Buy a pack of 3
    const result = grantBonusTryOns(3);
    expect(result.success).toBe(true);
    expect(result.newRemaining).toBe(3);

    const status = getTryOnStatus();
    expect(status.bonus).toBe(3);
    expect(status.canUse).toBe(true);

    // Consume 3 more
    expect(consumeTryOn()).toBe(true);
    expect(consumeTryOn()).toBe(true);
    expect(consumeTryOn()).toBe(true);
    expect(consumeTryOn()).toBe(false);
  });
});
