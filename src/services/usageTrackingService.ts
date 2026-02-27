/**
 * Usage Tracking Service - SIMPLIFIED
 *
 * Single pool of AI credits per month.
 * Free: 200 credits/month | Pro: 300 credits/month | Premium: 400 credits/month
 */

// ============================================================================
// TYPES
// ============================================================================

export type UserTier = 'free' | 'pro' | 'premium';

export interface CreditUsage {
  month: string;           // YYYY-MM format
  used: number;            // Total credits used this month
  lastUpdated: string;     // ISO timestamp
}

export interface FeatureUsageStore {
  month: string; // YYYY-MM format
  usage: Partial<Record<FeatureType, number>>;
  lastUpdated: string;
}

export interface CreditStatus {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  canUse: boolean;
  tier: UserTier;
  daysUntilReset: number;
}

// Keep FeatureType for backwards compatibility but it's no longer used for limits
export type FeatureType =
  | 'outfit_generation'
  | 'clothing_analysis'
  | 'fashion_chat'
  | 'virtual_tryon'
  | 'packing_list'
  | 'image_generation'
  | 'color_palette'
  | 'style_dna'
  | 'gap_analysis'
  | 'lookbook'
  | 'weather_outfit'
  | 'similar_items'
  | 'shopping_suggestions'
  | 'brand_recognition';

// ============================================================================
// CREDIT LIMITS BY TIER
// ============================================================================

export const CREDIT_LIMITS: Record<UserTier, number> = {
  free: 200,
  pro: 300,
  premium: 400,
};

// ============================================================================
// ANTI-ABUSE: Device Fingerprinting
// ============================================================================

const DEVICE_ID_KEY = 'ojodeloca-device-id';
const DEVICE_REWARDS_KEY = 'ojodeloca-device-rewards';

/**
 * Generate or retrieve a persistent device ID
 * This persists across accounts on the same browser/device
 */
function getDeviceId(): string {
  const stored = readStorage(DEVICE_ID_KEY);
  if (stored) return stored;

  // Generate a unique device ID based on browser fingerprint
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const deviceId = `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  writeStorage(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

interface DeviceRewards {
  deviceId: string;
  shareRewardsThisMonth: number;
  lastShareMonth: string;
  totalAccountsUsed: number;
  accountIds: string[];
}

function getDeviceRewards(): DeviceRewards {
  const deviceId = getDeviceId();
  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    const stored = readStorage(DEVICE_REWARDS_KEY);
    if (stored) {
      const data = JSON.parse(stored) as DeviceRewards;
      // Reset monthly counter if new month
      if (data.lastShareMonth !== currentMonth) {
        data.shareRewardsThisMonth = 0;
        data.lastShareMonth = currentMonth;
      }
      return data;
    }
  } catch (e) {
    console.warn('Error reading device rewards:', e);
  }

  return {
    deviceId,
    shareRewardsThisMonth: 0,
    lastShareMonth: currentMonth,
    totalAccountsUsed: 0,
    accountIds: [],
  };
}

function saveDeviceRewards(rewards: DeviceRewards): void {
  try {
    writeStorage(DEVICE_REWARDS_KEY, JSON.stringify(rewards));
  } catch (e) {
    console.warn('Error saving device rewards:', e);
  }
}

/**
 * Check if device can claim share reward (max 2 per month per device)
 */
export function canClaimShareReward(): { allowed: boolean; reason?: string } {
  const rewards = getDeviceRewards();
  const MAX_SHARE_REWARDS_PER_DEVICE = 2;

  if (rewards.shareRewardsThisMonth >= MAX_SHARE_REWARDS_PER_DEVICE) {
    return {
      allowed: false,
      reason: `Límite alcanzado: máximo ${MAX_SHARE_REWARDS_PER_DEVICE} recompensas por compartir este mes.`
    };
  }

  return { allowed: true };
}

/**
 * Record that a share reward was claimed on this device
 */
export function recordShareReward(userId?: string): void {
  const rewards = getDeviceRewards();
  rewards.shareRewardsThisMonth += 1;

  if (userId && !rewards.accountIds.includes(userId)) {
    rewards.accountIds.push(userId);
    rewards.totalAccountsUsed += 1;
  }

  saveDeviceRewards(rewards);
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY = 'ojodeloca-credits';
const TIER_KEY = 'ojodeloca-user-tier';
const FEATURE_STORAGE_KEY = 'ojodeloca-credits-by-feature';

type StorageProvider = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

function getRuntimeStorage(): StorageProvider | null {
  if (typeof globalThis === 'undefined') return null;
  const holder = globalThis as typeof globalThis & { localStorage?: StorageProvider };
  const candidate = holder.localStorage;
  if (!candidate) return null;
  if (typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function') {
    return null;
  }
  return candidate;
}

function readStorage(key: string): string | null {
  const storage = getRuntimeStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  const storage = getRuntimeStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // swallow errors
  }
}

function removeStorage(key: string): void {
  const storage = getRuntimeStorage();
  if (!storage || typeof storage.removeItem !== 'function') return;
  try {
    storage.removeItem(key);
  } catch {
    // swallow errors
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDaysUntilReset(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get current user tier from localStorage
 */
export function getUserTier(): UserTier {
  const stored = readStorage(TIER_KEY);
  if (stored && ['free', 'pro', 'premium'].includes(stored)) {
    return stored as UserTier;
  }
  return 'free';
}

/**
 * Set user tier (for testing or after subscription update)
 */
export function setUserTier(tier: UserTier): void {
  writeStorage(TIER_KEY, tier);
}

/**
 * Get current month's credit usage
 */
export function getCreditUsage(): CreditUsage {
  const currentMonth = getCurrentMonth();

  try {
    const stored = readStorage(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as CreditUsage;
      if (data.month === currentMonth) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Error reading credit usage:', e);
  }

  // Fresh month
  return {
    month: currentMonth,
    used: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function getFeatureUsageStore(): FeatureUsageStore {
  const currentMonth = getCurrentMonth();

  try {
    const stored = readStorage(FEATURE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as FeatureUsageStore;
      if (data.month === currentMonth && data.usage) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Error reading feature usage:', e);
  }

  return {
    month: currentMonth,
    usage: {},
    lastUpdated: new Date().toISOString(),
  };
}

function saveFeatureUsage(store: FeatureUsageStore): void {
  try {
    store.lastUpdated = new Date().toISOString();
    writeStorage(FEATURE_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Error saving feature usage:', e);
  }
}

export function getFeatureUsageSummary(): Array<{ feature: FeatureType; used: number }> {
  const store = getFeatureUsageStore();
  return Object.entries(store.usage || {}).map(([feature, used]) => ({
    feature: feature as FeatureType,
    used: used || 0,
  }));
}

/**
 * Save credit usage
 */
function saveCreditUsage(usage: CreditUsage): void {
  try {
    usage.lastUpdated = new Date().toISOString();
    writeStorage(STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.warn('Error saving credit usage:', e);
  }
}

/**
 * Get current credit status
 */
export function getCreditStatus(): CreditStatus {
  const tier = getUserTier();
  const usage = getCreditUsage();
  const limit = CREDIT_LIMITS[tier];

  const remaining = limit === -1 ? -1 : Math.max(0, limit - usage.used);
  const percentUsed = limit === -1 ? 0 : Math.min(100, (usage.used / limit) * 100);
  const canUse = limit === -1 || usage.used < limit;

  return {
    used: usage.used,
    limit,
    remaining,
    percentUsed,
    canUse,
    tier,
    daysUntilReset: getDaysUntilReset(),
  };
}

/**
 * Check if user can use AI features (has credits remaining)
 * This is the main function components should call before AI operations
 */
export function canUseCredits(): boolean {
  const status = getCreditStatus();
  return status.canUse;
}

/**
 * Use one credit (call after successful AI operation)
 * Returns true if credit was used, false if no credits remaining
 */
export function consumeCredit(): boolean {
  const status = getCreditStatus();

  if (!status.canUse) {
    console.warn('No credits remaining');
    return false;
  }

  const usage = getCreditUsage();
  usage.used += 1;
  saveCreditUsage(usage);

  return true;
}

/**
 * Use multiple credits at once (for expensive operations)
 */
export function useCredits(amount: number): boolean {
  const status = getCreditStatus();

  if (status.limit !== -1 && status.remaining < amount) {
    console.warn(`Not enough credits. Need ${amount}, have ${status.remaining}`);
    return false;
  }

  const usage = getCreditUsage();
  usage.used += amount;
  saveCreditUsage(usage);

  return true;
}

/**
 * Reset all credits (admin/testing only)
 */
export function resetCredits(): void {
  const freshUsage: CreditUsage = {
    month: getCurrentMonth(),
    used: 0,
    lastUpdated: new Date().toISOString(),
  };
  saveCreditUsage(freshUsage);
  removeStorage(FEATURE_STORAGE_KEY);
}

/**
 * Grant bonus credits (e.g., for sharing, watching ads, referrals)
 * Returns the new remaining credits count
 */
export function grantBonusCredit(amount: number = 1): { success: boolean; newRemaining: number } {
  const usage = getCreditUsage();
  const tier = getUserTier();
  const limit = CREDIT_LIMITS[tier];

  // Reduce "used" credits (effectively giving more)
  // But don't go below 0
  usage.used = Math.max(0, usage.used - amount);
  saveCreditUsage(usage);

  const newRemaining = limit === -1 ? -1 : Math.max(0, limit - usage.used);

  console.log(`✅ Bonus credit granted: +${amount}. New remaining: ${newRemaining}`);

  return { success: true, newRemaining };
}

// ============================================================================
// BACKWARDS COMPATIBILITY - These functions keep the old API working
// ============================================================================

// Legacy type for backwards compatibility
export interface UsageStatus {
  feature: FeatureType;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  canUse: boolean;
  isPremiumLocked: boolean;
  nextResetDate: string;
}

/**
 * @deprecated Use getCreditStatus() instead
 * Kept for backwards compatibility with existing components
 */
export function canUseFeature(_feature: FeatureType): UsageStatus {
  const status = getCreditStatus();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);

  return {
    feature: _feature,
    used: status.used,
    limit: status.limit,
    remaining: status.remaining,
    percentUsed: status.percentUsed,
    canUse: status.canUse,
    isPremiumLocked: false,
    nextResetDate: nextMonth.toISOString(),
  };
}

/**
 * @deprecated Use consumeCredit() instead
 */
export function recordCreditUsage(_feature: FeatureType): boolean {
  const ok = consumeCredit();
  if (!ok) return false;

  const store = getFeatureUsageStore();
  store.usage[_feature] = (store.usage[_feature] || 0) + 1;
  saveFeatureUsage(store);
  return true;
}

// NOTE: do not re-export legacy hook-like aliases (`useCredit`, `recordUsage`)
// to avoid triggering `react-hooks/rules-of-hooks` naming checks for hook-like names.

/**
 * @deprecated No longer needed with unified credits
 */
export function getFeatureDisplayName(_feature: FeatureType): string {
  return 'Créditos IA';
}

/**
 * @deprecated Use getCreditStatus() instead
 */
export function getUsageSummary() {
  const status = getCreditStatus();
  return {
    tier: status.tier,
    totalUsed: status.used,
    totalLimit: status.limit,
    percentUsed: status.percentUsed,
    mostUsedFeature: null,
    premiumFeaturesLocked: 0,
    daysUntilReset: status.daysUntilReset,
  };
}

/**
 * @deprecated No longer needed with unified credits
 */
export function getAllFeatureStatuses(): UsageStatus[] {
  return [];
}

/**
 * @deprecated Use resetCredits() instead
 */
export function resetAllUsage(): void {
  resetCredits();
}

/**
 * @deprecated No longer needed
 */
export function resetFeatureUsage(_feature: FeatureType): void {
  // No-op for backwards compatibility
}

/**
 * @deprecated No longer needed
 */
export function getFeatureUsage(_feature: FeatureType): number {
  return getCreditUsage().used;
}

/**
 * @deprecated No longer needed
 */
export function formatUsageDisplay(_status: UsageStatus): string {
  const status = getCreditStatus();
  if (status.limit === -1) return '∞';
  return `${status.remaining}/${status.limit}`;
}

/**
 * @deprecated No longer needed
 */
export function getMonthlyUsage() {
  const usage = getCreditUsage();
  return {
    month: usage.month,
    records: [],
    totalCreditsUsed: usage.used,
    lastUpdated: usage.lastUpdated,
    featureUsage: getFeatureUsageSummary(),
  };
}
