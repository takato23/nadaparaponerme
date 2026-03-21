/**
 * PostHog Analytics Service
 * 
 * Advanced analytics with funnels, feature flags, and session replay.
 * Acts as the primary product analytics layer during the beta.
 */

import posthog from 'posthog-js';

function parseEnvBoolean(value: string | boolean | undefined, fallback = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    return fallback;
}

const POSTHOG_KEY = String(import.meta.env.VITE_POSTHOG_KEY || '').trim();
const POSTHOG_HOST = String(import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com').trim();
const ENABLE_POSTHOG_IN_DEV = parseEnvBoolean(import.meta.env.VITE_ENABLE_POSTHOG_DEV, false);
const POSTHOG_DEBUG = parseEnvBoolean(import.meta.env.VITE_POSTHOG_DEBUG, false);

let isInitialized = false;
let disabledReason: 'missing_key' | 'dev_disabled' | 'non_browser' | null = null;

export type PostHogStatus = {
    initialized: boolean;
    configured: boolean;
    host: string;
    disabledReason: 'missing_key' | 'dev_disabled' | 'non_browser' | null;
};

/**
 * Initialize PostHog
 * Call this once on app startup
 */
export function initPostHog(): void {
    if (isInitialized) return;

    if (typeof window === 'undefined') {
        disabledReason = 'non_browser';
        return;
    }

    if (!POSTHOG_KEY) {
        disabledReason = 'missing_key';
        if (import.meta.env.DEV) {
            console.log('[PostHog] No API key configured, skipping initialization');
        }
        return;
    }

    // Don't track in development unless explicitly enabled
    if (import.meta.env.DEV && !ENABLE_POSTHOG_IN_DEV) {
        disabledReason = 'dev_disabled';
        console.log('[PostHog] Disabled in development');
        return;
    }

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        // Enable session recording
        session_recording: {
            maskAllInputs: true,
            maskTextSelector: '.sensitive-data',
        },
        // Page views are tracked manually from analyticsService to keep one source of truth
        capture_pageview: false,
        // Capture page leaves
        capture_pageleave: true,
        // Autocapture clicks, form submissions, etc.
        autocapture: true,
        // Respect Do Not Track
        respect_dnt: true,
        // Persistence
        persistence: 'localStorage',
        // Load feature flags on init
        bootstrap: {
            featureFlags: {},
        },
        loaded: () => {
            if (POSTHOG_DEBUG && import.meta.env.DEV) {
                console.log('[PostHog] Loaded');
            }
        },
    });

    isInitialized = true;
    disabledReason = null;
    if (import.meta.env.DEV) {
        console.log('[PostHog] Initialized');
    }
}

/**
 * Identify a user
 * Call after login or when user info is available
 */
export function identify(
    userId: string,
    properties?: Record<string, unknown>
): void {
    if (!isInitialized) return;

    posthog.identify(userId, properties);
}

/**
 * Reset user identity (on logout)
 */
export function reset(): void {
    if (!isInitialized) return;

    posthog.reset();
}

/**
 * Capture a custom event
 */
export function capture(
    eventName: string,
    properties?: Record<string, unknown>
): void {
    if (!isInitialized) return;

    posthog.capture(eventName, properties);

    if (import.meta.env.DEV) {
        console.log('[PostHog] Event:', eventName, properties);
    }
}

// ============================================================================
// FUNNEL TRACKING
// ============================================================================

/**
 * Track onboarding funnel step
 */
export function trackOnboardingStep(
    step: 'welcome' | 'body_shape' | 'color_season' | 'style_goals' | 'commitment' | 'analyzing' | 'paywall',
    properties?: Record<string, unknown>
): void {
    capture('onboarding_step', {
        step,
        step_number: ['welcome', 'body_shape', 'color_season', 'style_goals', 'commitment', 'analyzing', 'paywall'].indexOf(step) + 1,
        ...properties,
    });
}

/**
 * Track paywall conversion funnel
 */
export function trackPaywallEvent(
    action: 'viewed' | 'cta_clicked' | 'completed' | 'dismissed',
    tier?: 'pro' | 'premium'
): void {
    capture('paywall_funnel', {
        action,
        tier,
    });
}

/**
 * Track outfit generation funnel
 */
export function trackOutfitFunnel(
    action: 'started' | 'occasion_selected' | 'style_selected' | 'generated' | 'saved' | 'shared',
    properties?: Record<string, unknown>
): void {
    capture('outfit_funnel', {
        action,
        ...properties,
    });
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagName: string): boolean {
    if (!isInitialized) return false;

    return posthog.isFeatureEnabled(flagName) ?? false;
}

/**
 * Get feature flag value (for multivariate flags)
 */
export function getFeatureFlag(flagName: string): string | boolean | undefined {
    if (!isInitialized) return undefined;

    return posthog.getFeatureFlag(flagName);
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): Record<string, boolean | string> {
    if (!isInitialized) return {};

    return posthog.featureFlags.getFlagVariants() || {};
}

/**
 * Reload feature flags (useful after user properties change)
 */
export function reloadFeatureFlags(): void {
    if (!isInitialized) return;

    posthog.reloadFeatureFlags();
}

// ============================================================================
// SESSION RECORDING
// ============================================================================

/**
 * Start session recording
 */
export function startSessionRecording(): void {
    if (!isInitialized) return;

    posthog.startSessionRecording();
}

/**
 * Stop session recording
 */
export function stopSessionRecording(): void {
    if (!isInitialized) return;

    posthog.stopSessionRecording();
}

// ============================================================================
// USER PROPERTIES
// ============================================================================

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
    if (!isInitialized) return;

    posthog.people.set(properties);
}

/**
 * Set user properties only once (won't overwrite existing)
 */
export function setUserPropertiesOnce(properties: Record<string, unknown>): void {
    if (!isInitialized) return;

    posthog.people.set_once(properties);
}

export function getPostHogStatus(): PostHogStatus {
    return {
        initialized: isInitialized,
        configured: Boolean(POSTHOG_KEY),
        host: POSTHOG_HOST,
        disabledReason,
    };
}

// ============================================================================
// EXPORT POSTHOG INSTANCE
// ============================================================================

export { posthog };
