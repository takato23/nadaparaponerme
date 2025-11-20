import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Subscription {
    id: string;
    user_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    trial_end: string | null;
    created_at: string;
    updated_at: string;
}

export interface UsageMetrics {
    id: string;
    user_id: string;
    subscription_tier: SubscriptionTier;
    ai_generations_used: number;
    ai_generations_limit: number;
    closet_items_count: number;
    closet_items_limit: number;
    period_start: string;
    period_end: string;
    last_reset: string;
}

export interface PlanLimits {
    aiGenerations: number;
    closetItems: number;
    virtualTryOn: boolean;
    analytics: boolean;
    exportToSocial: boolean;
    outfitCalendar: boolean;
    prioritySupport: boolean;
}

const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
    free: {
        aiGenerations: 5,
        closetItems: 5,
        virtualTryOn: false,
        analytics: false,
        exportToSocial: false,
        outfitCalendar: false,
        prioritySupport: false,
    },
    pro: {
        aiGenerations: 50,
        closetItems: -1, // unlimited
        virtualTryOn: true,
        analytics: true,
        exportToSocial: false,
        outfitCalendar: false,
        prioritySupport: false,
    },
    premium: {
        aiGenerations: -1, // unlimited
        closetItems: -1, // unlimited
        virtualTryOn: true,
        analytics: true,
        exportToSocial: true,
        outfitCalendar: true,
        prioritySupport: true,
    },
};

/**
 * Get current user's subscription
 */
export async function getUserSubscription(): Promise<Subscription | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        logger.error('Error fetching subscription:', error);
        return null;
    }

    return data as Subscription;
}

/**
 * Get current user's usage metrics
 */
export async function getUserUsageMetrics(): Promise<UsageMetrics | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        logger.error('Error fetching usage metrics:', error);
        return null;
    }

    return data as UsageMetrics;
}

/**
 * Check if user can perform an action based on their plan
 */
export async function canUseFeature(feature: keyof PlanLimits): Promise<boolean> {
    const subscription = await getUserSubscription();
    if (!subscription) return false;

    const limits = PLAN_LIMITS[subscription.tier];
    const featureValue = limits[feature];

    // Boolean features
    if (typeof featureValue === 'boolean') {
        return featureValue;
    }

    return true;
}

/**
 * Check if user can generate another outfit
 */
export async function canGenerateOutfit(): Promise<{ allowed: boolean; reason?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, reason: 'Not authenticated' };

    const { data, error } = await supabase.rpc('can_user_generate_outfit', {
        p_user_id: user.id,
    });

    if (error) {
        logger.error('Error checking generation limit:', error);
        return { allowed: false, reason: 'Error checking limits' };
    }

    if (!data) {
        const usage = await getUserUsageMetrics();
        const subscription = await getUserSubscription();

        if (usage && subscription) {
            return {
                allowed: false,
                reason: `Has alcanzado tu límite de ${usage.ai_generations_limit} generaciones este mes. Upgradeá a ${subscription.tier === 'free' ? 'Pro' : 'Premium'} para más.`,
            };
        }

        return { allowed: false, reason: 'Límite alcanzado' };
    }

    return { allowed: true };
}

/**
 * Increment AI generation count
 */
export async function incrementAIGeneration(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('increment_ai_generation', {
        p_user_id: user.id,
    });

    if (error) {
        logger.error('Error incrementing generation count:', error);
        return false;
    }

    return !!data;
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(tier: SubscriptionTier): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { tier, user_id: user.id },
        });

        if (error) throw error;

        return data.url;
    } catch (error) {
        logger.error('Error creating checkout session:', error);
        return null;
    }
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('create-portal-session', {
            body: { user_id: user.id },
        });

        if (error) throw error;

        return data.url;
    } catch (error) {
        logger.error('Error creating portal session:', error);
        return null;
    }
}

/**
 * Get plan limits for a tier
 */
export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

/**
 * Format usage display
 */
export function formatUsage(used: number, limit: number): string {
    if (limit === -1) return `${used} (ilimitado)`;
    return `${used} / ${limit}`;
}

/**
 * Calculate usage percentage
 */
export function getUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0;
    return Math.min(100, (used / limit) * 100);
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trialing';
}

/**
 * Get days until period end
 */
export function getDaysUntilRenewal(subscription: Subscription | null): number {
    if (!subscription) return 0;

    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}
