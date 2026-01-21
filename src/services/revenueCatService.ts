/**
 * RevenueCat Service
 * 
 * International payments via RevenueCat for users outside Argentina.
 * MercadoPago remains the primary payment method for Argentina.
 */

import { Purchases } from '@revenuecat/purchases-js';

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_KEY || '';

let purchasesInstance: Purchases | null = null;

export type PurchasesTier = 'pro' | 'premium';

export interface RCOffering {
    identifier: string;
    availablePackages: RCPackage[];
}

export interface RCPackage {
    identifier: string;
    packageType: string;
    product: {
        identifier: string;
        title: string;
        description: string;
        price: number;
        priceString: string;
        currencyCode: string;
    };
}

export interface RCCustomerInfo {
    entitlements: {
        active: Record<string, {
            identifier: string;
            productIdentifier: string;
            isActive: boolean;
            willRenew: boolean;
            expirationDate: string | null;
        }>;
    };
    activeSubscriptions: string[];
    originalAppUserId: string;
}

/**
 * Check if user should use RevenueCat (non-Argentina)
 */
export function shouldUseRevenueCat(): boolean {
    // Detect user's country from timezone or locale
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isArgentina = timezone.includes('Buenos_Aires') || timezone.includes('Argentina');

    // Also check locale
    const locale = navigator.language || '';
    const isArgentineLocale = locale === 'es-AR';

    // Use MercadoPago for Argentina, RevenueCat for rest of world
    return !isArgentina && !isArgentineLocale;
}

/**
 * Initialize RevenueCat
 * Call this on app startup for international users
 */
export async function initRevenueCat(appUserId?: string): Promise<void> {
    if (!REVENUECAT_API_KEY) {
        if (import.meta.env.DEV) {
            console.log('[RevenueCat] No API key configured, skipping initialization');
        }
        return;
    }

    if (!shouldUseRevenueCat()) {
        console.log('[RevenueCat] Argentina detected, using MercadoPago instead');
        return;
    }

    try {
        purchasesInstance = Purchases.configure(REVENUECAT_API_KEY, appUserId);
        console.log('[RevenueCat] Initialized');
    } catch (error) {
        console.error('[RevenueCat] Initialization failed:', error);
    }
}

/**
 * Set the app user ID (after login)
 */
export async function setUserId(userId: string): Promise<void> {
    if (!purchasesInstance) return;

    try {
        await purchasesInstance.changeUser(userId);
    } catch (error) {
        console.error('[RevenueCat] Failed to set user ID:', error);
    }
}

/**
 * Get available offerings (subscription plans)
 */
export async function getOfferings(): Promise<RCOffering | null> {
    if (!purchasesInstance) return null;

    try {
        const offerings = await purchasesInstance.getOfferings();
        return offerings.current as unknown as RCOffering;
    } catch (error) {
        console.error('[RevenueCat] Failed to get offerings:', error);
        return null;
    }
}

/**
 * Purchase a package
 */
export async function purchasePackage(
    packageToPurchase: RCPackage
): Promise<{ success: boolean; customerInfo?: RCCustomerInfo; error?: string }> {
    if (!purchasesInstance) {
        return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
        const { customerInfo } = await purchasesInstance.purchasePackage(
            packageToPurchase as unknown as Parameters<typeof purchasesInstance.purchasePackage>[0]
        );
        return {
            success: true,
            customerInfo: customerInfo as unknown as RCCustomerInfo
        };
    } catch (error) {
        console.error('[RevenueCat] Purchase failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Purchase failed'
        };
    }
}

/**
 * Restore purchases (for users who reinstall)
 * Note: Web SDK may have limited restore functionality
 */
export async function restorePurchases(): Promise<RCCustomerInfo | null> {
    if (!purchasesInstance) return null;

    try {
        // The web SDK uses getCustomerInfo instead of restorePurchases
        // since purchases are tied to the user account, not the device
        const customerInfo = await purchasesInstance.getCustomerInfo();
        return customerInfo as unknown as RCCustomerInfo;
    } catch (error) {
        console.error('[RevenueCat] Restore failed:', error);
        return null;
    }
}

/**
 * Get current customer info (entitlements, subscriptions)
 */
export async function getCustomerInfo(): Promise<RCCustomerInfo | null> {
    if (!purchasesInstance) return null;

    try {
        const customerInfo = await purchasesInstance.getCustomerInfo();
        return customerInfo as unknown as RCCustomerInfo;
    } catch (error) {
        console.error('[RevenueCat] Failed to get customer info:', error);
        return null;
    }
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    return Object.keys(customerInfo.entitlements.active).length > 0;
}

/**
 * Get the user's current tier based on entitlements
 */
export async function getCurrentTier(): Promise<PurchasesTier | 'free'> {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return 'free';

    const activeEntitlements = customerInfo.entitlements.active;

    if ('premium' in activeEntitlements) return 'premium';
    if ('pro' in activeEntitlements) return 'pro';

    return 'free';
}

/**
 * Check if RevenueCat is available and initialized
 */
export function isRevenueCatAvailable(): boolean {
    return purchasesInstance !== null;
}

/**
 * Get pricing for display
 */
export async function getPricing(): Promise<{
    pro: { price: string; currencyCode: string } | null;
    premium: { price: string; currencyCode: string } | null;
}> {
    const offerings = await getOfferings();
    if (!offerings) {
        return { pro: null, premium: null };
    }

    let proPackage: RCPackage | undefined;
    let premiumPackage: RCPackage | undefined;

    for (const pkg of offerings.availablePackages) {
        if (pkg.identifier.includes('pro')) {
            proPackage = pkg;
        } else if (pkg.identifier.includes('premium')) {
            premiumPackage = pkg;
        }
    }

    return {
        pro: proPackage
            ? { price: proPackage.product.priceString, currencyCode: proPackage.product.currencyCode }
            : null,
        premium: premiumPackage
            ? { price: premiumPackage.product.priceString, currencyCode: premiumPackage.product.currencyCode }
            : null,
    };
}
