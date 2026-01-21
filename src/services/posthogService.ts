/**
 * PostHog Analytics Service
 * 
 * Advanced analytics with funnels, feature flags, and session replay.
 * Works alongside Google Analytics for comprehensive tracking.
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog
 * Call this once on app startup
 */
export function initPostHog(): void {
    if (isInitialized || !POSTHOG_KEY) {
        if (!POSTHOG_KEY && import.meta.env.DEV) {
            console.log('[PostHog] No API key configured, skipping initialization');
        }
        return;
    }

    // Don't track in development unless explicitly enabled
    if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_POSTHOG_DEV) {
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
        // Capture page views automatically
        capture_pageview: true,
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
    });

    isInitialized = true;
    console.log('[PostHog] Initialized');
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

// ============================================================================
// EXPORT POSTHOG INSTANCE
// ============================================================================

export { posthog };
