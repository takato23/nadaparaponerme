/**
 * Usage Tracking Service - SIMPLIFIED
 *
 * Single pool of AI credits per month.
 * Source of truth for client-side credit messaging and local fallbacks.
 */

import { readBillingSummaryCache } from './billingCatalogService';

// ============================================================================
// TYPES
// ============================================================================

export type UserTier = 'free' | 'plus' | 'pro' | 'premium';

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
  | 'brand_recognition'
  | 'free_chat'
  | 'wardrobe_recommendation'
  | 'saved_look_creation'
  | 'wardrobe_gap_detection'
  | 'navigation'
  | 'external_link_suggestions'
  | 'external_search_enriched'
  | 'new_garment_generation'
  | 'studio_render'
  | 'try_on';

const FREE_STYLIST_ACTIONS = new Set<FeatureType>([
  'fashion_chat',
  'free_chat',
  'wardrobe_recommendation',
  'saved_look_creation',
  'wardrobe_gap_detection',
  'navigation',
  'external_link_suggestions',
]);

export function isFreeStylistAction(feature: FeatureType): boolean {
  return FREE_STYLIST_ACTIONS.has(feature);
}

// ============================================================================
// CREDIT LIMITS BY TIER
// ============================================================================

export const CREDIT_LIMITS: Record<UserTier, number> = {
  free: 50,
  plus: 150,
  pro: 400,
  premium: 500,
};

export const TRYON_LIMITS: Record<UserTier, number> = {
  free: 1,
  plus: 4,
  pro: 8,
  premium: 18,
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

const TRYON_STORAGE_KEY = 'ojodeloca-tryon-usage';
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

function getBillingSummaryBucket(bucketKey: string): any | null {
  const cached = readBillingSummaryCache();
  return cached?.usage?.buckets?.[bucketKey] || null;
}

function getBillingDaysUntilReset(): number | null {
  const cached = readBillingSummaryCache();
  const cycleEnd = cached?.usage?.cycle?.end || cached?.current?.cycle?.end;
  if (!cycleEnd) return null;
  const diff = new Date(cycleEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get current user tier from localStorage
 */
export function getUserTier(): UserTier {
  const billingTier = readBillingSummaryCache()?.current?.plan?.code;
  if (billingTier && ['free', 'plus', 'pro', 'premium'].includes(String(billingTier))) {
    return billingTier as UserTier;
  }
  const stored = readStorage(TIER_KEY);
  if (stored && ['free', 'plus', 'pro', 'premium'].includes(stored)) {
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
  const billingBucket = getBillingSummaryBucket('kumbi_messages');
  if (billingBucket) {
    const used = Number(billingBucket.used || 0);
    const limit = Number(billingBucket.monthly_limit ?? 0);
    const reserved = Number(billingBucket.reserved || 0);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used - reserved);
    const percentUsed = limit === -1 ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
    const canUse = limit === -1 || remaining > 0;
    return {
      used,
      limit,
      remaining,
      percentUsed,
      canUse,
      tier,
      daysUntilReset: getBillingDaysUntilReset() ?? getDaysUntilReset(),
    };
  }

  const usage = getCreditUsage();
  const limit = CREDIT_LIMITS[tier];
  const remaining = limit === -1 ? -1 : Math.max(0, limit - usage.used);
  const percentUsed = limit === -1 ? 0 : Math.min(100, (usage.used / limit) * 100);
  const canUse = limit === -1 || usage.used < limit;
  return { used: usage.used, limit, remaining, percentUsed, canUse, tier, daysUntilReset: getDaysUntilReset() };
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
// TRY-ON TRACKING (SEPARATE FROM AI CREDITS)
// ============================================================================

export interface TryOnUsage {
  month: string;
  used: number;
  bonus: number; // Extra try-ons from packs
  lastUpdated: string;
}

function getTryOnUsage(): TryOnUsage {
  const currentMonth = getCurrentMonth();

  try {
    const stored = readStorage(TRYON_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as TryOnUsage;
      if (data.month === currentMonth) {
        return data;
      }
      // New month: reset used but keep bonus (packs don't expire monthly)
      return {
        month: currentMonth,
        used: 0,
        bonus: data.bonus || 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('Error reading try-on usage:', e);
  }

  return {
    month: currentMonth,
    used: 0,
    bonus: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function saveTryOnUsage(usage: TryOnUsage): void {
  try {
    usage.lastUpdated = new Date().toISOString();
    writeStorage(TRYON_STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.warn('Error saving try-on usage:', e);
  }
}

export interface TryOnStatus {
  used: number;
  monthlyLimit: number;
  bonus: number;
  totalAvailable: number;
  remaining: number;
  canUse: boolean;
  tier: UserTier;
}

/**
 * Get current try-on status
 */
export function getTryOnStatus(): TryOnStatus {
  const tier = getUserTier();
  const billingBucket = getBillingSummaryBucket('tryons');
  if (billingBucket) {
    const used = Number(billingBucket.used || 0);
    const monthlyLimit = Number(billingBucket.monthly_limit ?? 0);
    const reserved = Number(billingBucket.reserved || 0);
    const remaining = monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - used - reserved);
    return {
      used,
      monthlyLimit,
      bonus: 0,
      totalAvailable: monthlyLimit,
      remaining,
      canUse: monthlyLimit === -1 || remaining > 0,
      tier,
    };
  }

  const usage = getTryOnUsage();
  const monthlyLimit = TRYON_LIMITS[tier];
  const totalAvailable = monthlyLimit + usage.bonus;
  const remaining = Math.max(0, totalAvailable - usage.used);
  return { used: usage.used, monthlyLimit, bonus: usage.bonus, totalAvailable, remaining, canUse: remaining > 0, tier };
}

/**
 * Check if user can do a try-on
 */
export function canUseTryOn(): boolean {
  return getTryOnStatus().canUse;
}

/**
 * Consume one try-on usage
 */
export function consumeTryOn(): boolean {
  const status = getTryOnStatus();
  if (!status.canUse) {
    console.warn('No try-ons remaining');
    return false;
  }

  const usage = getTryOnUsage();
  usage.used += 1;
  saveTryOnUsage(usage);
  return true;
}

/**
 * Refund a try-on (for failed generations)
 */
export function refundTryOn(): void {
  const usage = getTryOnUsage();
  if (usage.used > 0) {
    usage.used -= 1;
    saveTryOnUsage(usage);
    console.log('🔄 Try-on refunded');
  }
}

/**
 * Grant bonus try-ons from pack purchase
 */
export function grantBonusTryOns(amount: number): { success: boolean; newRemaining: number } {
  const usage = getTryOnUsage();
  usage.bonus += amount;
  saveTryOnUsage(usage);

  const status = getTryOnStatus();
  console.log(`✅ Pack de ${amount} probadas activado. Disponibles: ${status.remaining}`);
  return { success: true, newRemaining: status.remaining };
}

/**
 * Reset try-on usage (admin/testing only)
 */
export function resetTryOnUsage(): void {
  saveTryOnUsage({
    month: getCurrentMonth(),
    used: 0,
    bonus: 0,
    lastUpdated: new Date().toISOString(),
  });
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
  const isFreeAction = isFreeStylistAction(_feature);

  return {
    feature: _feature,
    used: status.used,
    limit: status.limit,
    remaining: status.remaining,
    percentUsed: status.percentUsed,
    canUse: isFreeAction ? true : status.canUse,
    isPremiumLocked: false,
    nextResetDate: nextMonth.toISOString(),
  };
}

/**
 * @deprecated Use consumeCredit() instead
 */
export function recordCreditUsage(_feature: FeatureType): boolean {
  if (isFreeStylistAction(_feature)) {
    return true;
  }
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
  return 'Usos IA';
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
