/**
 * Analytics Service
 *
 * Google Analytics 4 integration for tracking key events
 */

// GA4 Measurement ID (set via environment variable)
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// Check if GA is loaded
const isGALoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

// Initialize GA4 (called once on app load)
export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) {
    console.log('📊 Analytics: No GA_MEASUREMENT_ID configured, skipping');
    return;
  }

  // Don't load in development unless explicitly enabled
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_ANALYTICS_DEV) {
    console.log('📊 Analytics: Disabled in development');
    return;
  }

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll handle page views manually
  });

  console.log('📊 Analytics: Initialized');
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isGALoaded()) return;

  window.gtag('event', eventName, params);

  if (import.meta.env.DEV) {
    console.log('📊 Event:', eventName, params);
  }
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isGALoaded()) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });
}

// ============================================================================
// KEY BUSINESS EVENTS
// ============================================================================

/**
 * User signed up
 */
export function trackSignup(method: 'email' | 'google' = 'email'): void {
  trackEvent('sign_up', { method });
}

/**
 * User logged in
 */
export function trackLogin(method: 'email' | 'google' = 'email'): void {
  trackEvent('login', { method });
}

/**
 * User completed onboarding
 */
export function trackOnboardingComplete(): void {
  trackEvent('onboarding_complete');
}

/**
 * User added first clothing item
 */
export function trackFirstItem(): void {
  trackEvent('first_item_added');
}

/**
 * User generated first outfit
 */
export function trackFirstOutfit(): void {
  trackEvent('first_outfit_generated');
}

/**
 * User generated an outfit
 */
export function trackOutfitGenerated(closetSize: number): void {
  trackEvent('outfit_generated', {
    closet_size: closetSize,
  });
}

/**
 * User used virtual try-on
 */
export function trackVirtualTryOn(): void {
  trackEvent('virtual_tryon_used');
}

/**
 * User viewed upgrade modal
 */
export function trackUpgradeModalView(trigger: string): void {
  trackEvent('upgrade_modal_view', { trigger });
}

/**
 * User started checkout
 */
export function trackCheckoutStart(tier: 'pro' | 'premium', currency: 'ARS' | 'USD'): void {
  trackEvent('begin_checkout', {
    tier,
    currency,
  });
}

/**
 * User completed purchase
 */
export function trackPurchase(tier: 'pro' | 'premium', currency: 'ARS' | 'USD', value: number): void {
  trackEvent('purchase', {
    tier,
    currency,
    value,
  });
}

/**
 * User hit generation limit
 */
export function trackLimitReached(tier: 'free' | 'pro'): void {
  trackEvent('limit_reached', { tier });
}

/**
 * User joined waitlist
 */
export function trackWaitlistSignup(): void {
  trackEvent('waitlist_signup');
}

/**
 * User used AI feature
 */
export function trackAIFeatureUsed(feature: string): void {
  trackEvent('ai_feature_used', { feature });
}

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
