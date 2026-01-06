/**
 * Usage Tracking Service - SIMPLIFIED
 *
 * Single pool of AI credits per month.
 * Free: 30 credits/month | Pro: 150 credits/month | Premium: Unlimited
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
  free: 15,      // 🔒 BETA: Reducido de 30 para proteger créditos GCloud
  pro: 150,      // 150 créditos/mes para Pro
  premium: -1,   // Ilimitado para Premium
};

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY = 'ojodeloca-credits';
const TIER_KEY = 'ojodeloca-user-tier';

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
export function useCredit(): boolean {
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
 * @deprecated Use useCredit() instead
 */
export function recordUsage(_feature: FeatureType): boolean {
  return useCredit();
}

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
  };
}
