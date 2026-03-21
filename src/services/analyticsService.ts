/**
 * Analytics Service
 *
 * Unified analytics wrapper.
 * PostHog is the primary product analytics layer for beta,
 * while GA4 remains available for marketing/page view support.
 */

import {
  capture as capturePostHog,
  getPostHogStatus,
  identify as identifyPostHog,
  initPostHog,
  reset as resetPostHog,
} from './posthogService';

// GA4 Measurement ID (set via environment variable)
const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();

function parseEnvBoolean(value: string | boolean | undefined, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  return fallback;
}

const ENABLE_ANALYTICS = parseEnvBoolean(import.meta.env.VITE_ENABLE_ANALYTICS, true);
const ENABLE_ANALYTICS_IN_DEV = parseEnvBoolean(import.meta.env.VITE_ENABLE_ANALYTICS_DEV, false);
const analyticsEnabledInRuntime = ENABLE_ANALYTICS && (!import.meta.env.DEV || ENABLE_ANALYTICS_IN_DEV);
let gaInitialized = false;

// Check if GA is loaded
const isGALoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

function initGA4(): void {
  if (gaInitialized || !GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }

  const existingScript = document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });
  gaInitialized = true;
}

// Initialize GA4 (called once on app load)
export function initAnalytics(): void {
  if (!analyticsEnabledInRuntime) {
    if (import.meta.env.DEV) {
      console.log('📊 Analytics: Disabled by environment flags');
    }
    return;
  }

  initPostHog();
  initGA4();

  if (!GA_MEASUREMENT_ID && import.meta.env.DEV) {
    console.log('📊 Analytics: No GA_MEASUREMENT_ID configured, skipping GA4');
  }

  if (import.meta.env.DEV) {
    console.log('📊 Analytics: Initialized');
  }
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
  if (!analyticsEnabledInRuntime) return;

  capturePostHog(eventName, params);

  if (isGALoaded()) {
    window.gtag('event', eventName, params);
  }

  if (import.meta.env.DEV) {
    console.log('📊 Event:', eventName, params);
  }
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!analyticsEnabledInRuntime) return;

  const payload = {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  };

  capturePostHog('$pageview', payload);

  if (isGALoaded()) {
    window.gtag('event', 'page_view', payload);
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!analyticsEnabledInRuntime) return;
  identifyPostHog(userId, properties);
}

export function resetUserTracking(): void {
  if (!analyticsEnabledInRuntime) return;
  resetPostHog();
}

export type AnalyticsStatus = {
  enabled: boolean;
  gaConfigured: boolean;
  gaInitialized: boolean;
  posthog: ReturnType<typeof getPostHogStatus>;
};

export function getAnalyticsStatus(): AnalyticsStatus {
  return {
    enabled: analyticsEnabledInRuntime,
    gaConfigured: Boolean(GA_MEASUREMENT_ID),
    gaInitialized,
    posthog: getPostHogStatus(),
  };
}

type InteractionTimingParams = {
  screen_name: string;
  metric_name: 'route_ready_ms' | 'first_interaction_ms';
  value_ms: number;
  interaction_type?: string;
};

/**
 * Track UI responsiveness metrics for critical surfaces.
 */
export function trackInteractionTiming(params: InteractionTimingParams): void {
  trackEvent('ui_interaction_timing', params);
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

export function trackOwnedItemAdded(totalOwnedItems: number): void {
  trackEvent('owned_item_added', {
    total_owned_items: totalOwnedItems,
  });
}

export function trackFirstEightItemsReached(totalOwnedItems: number): void {
  trackEvent('first_8_items_reached', {
    total_owned_items: totalOwnedItems,
  });
}

/**
 * User generated first outfit
 */
export function trackFirstOutfit(): void {
  trackEvent('first_outfit_generated');
  trackEvent('first_look_generated');
}

/**
 * User generated an outfit
 */
export function trackOutfitGenerated(closetSize: number): void {
  trackEvent('outfit_generated', {
    closet_size: closetSize,
  });
}

export function trackOutfitSaved(source: 'saved_outfits' | 'planner' | 'stylist', totalSavedOutfits: number): void {
  trackEvent('outfit_saved', {
    source,
    total_saved_outfits: totalSavedOutfits,
  });
  trackEvent('look_saved', {
    source,
    total_saved_outfits: totalSavedOutfits,
  });
  if (totalSavedOutfits === 1) {
    trackEvent('first_look_saved', { source });
  }
}

/**
 * User used virtual try-on
 */
export function trackVirtualTryOn(): void {
  trackEvent('virtual_tryon_used');
}

export function trackPlannerUsed(action: string, source: string): void {
  trackEvent('planner_used', {
    action,
    source,
  });
}

type OutfitFeedbackAnalyticsParams = {
  source_surface: 'home' | 'planner';
  mode?: 'create' | 'edit';
  status?: 'worn' | 'not_worn';
  skip_reason?: 'weather' | 'comfort' | 'occasion' | 'changed_mind';
};

export function trackOutfitFeedbackOpened(params: OutfitFeedbackAnalyticsParams): void {
  trackEvent('outfit_feedback_opened', params);
}

export function trackOutfitFeedbackSubmitted(params: OutfitFeedbackAnalyticsParams): void {
  trackEvent('outfit_feedback_submitted', params);
}

export function trackOutfitFeedbackEdited(params: OutfitFeedbackAnalyticsParams): void {
  trackEvent('outfit_feedback_edited', params);
}

export function trackWeeklyWearInsightsViewed(params: { source_surface: 'planner'; pending_count: number }): void {
  trackEvent('weekly_wear_insights_viewed', params);
}

export function trackGapViewed(source: string): void {
  trackEvent('gap_viewed', { source });
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
export function trackCheckoutStart(tier: 'plus' | 'pro' | 'premium', currency: 'ARS' | 'USD'): void {
  trackEvent('begin_checkout', {
    tier,
    currency,
  });
  trackEvent('checkout_started', {
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
export function trackLimitReached(tier: 'free' | 'plus' | 'pro' | 'premium'): void {
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

interface TryOnAnalyticsParams extends Record<string, string | number | boolean> {
  surface: 'mirror' | 'studio';
  quality: 'flash' | 'pro';
  preset: string;
  slot_count: number;
  latency_ms?: number;
  model?: string;
}

export function trackTryOnCacheHit(params: TryOnAnalyticsParams): void {
  trackEvent('tryon_cache_hit', params);
}

export function trackTryOnCacheMiss(params: TryOnAnalyticsParams): void {
  trackEvent('tryon_cache_miss', params);
}

export function trackTryOnHdRequested(params: TryOnAnalyticsParams): void {
  trackEvent('tryon_hd_requested', params);
}

export function trackTryOnHdCompleted(params: TryOnAnalyticsParams): void {
  trackEvent('tryon_hd_completed', params);
}

export function trackTryOnStaleResultDiscarded(params: TryOnAnalyticsParams): void {
  trackEvent('tryon_stale_result_discarded', params);
}

/**
 * User clicked rewarded ad CTA
 */
export function trackRewardedAdClick(provider: string): void {
  trackEvent('rewarded_ad_click', { provider });
}

/**
 * User earned reward from ad (placeholder)
 */
export function trackRewardedAdReward(provider: string, credits: number): void {
  trackEvent('rewarded_ad_reward', { provider, credits });
}

type GuidedLookAnalyticsParams = {
  session_id: string;
  strategy?: 'direct' | 'guided';
  operation?: 'generate' | 'edit' | 'tryon';
  category?: string;
  occasion?: string;
  style?: string;
  error_code?: string;
  latency_ms?: number;
  credits_charged?: number;
};

export function trackGuidedLookStart(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_start', params);
}

export function trackGuidedLookModeSelected(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_mode_selected', params);
}

export function trackGuidedLookFieldCompleted(params: GuidedLookAnalyticsParams & { field: string }): void {
  trackEvent('guided_look_field_completed', params);
}

export function trackGuidedLookCostShown(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_cost_shown', params);
}

export function trackGuidedLookConfirmed(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_confirmed', params);
}

export function trackGuidedLookGenerationSuccess(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_generation_success', params);
}

export function trackGuidedLookGenerationError(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_generation_error', params);
}

export function trackGuidedLookSaved(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_saved', params);
}

export function trackGuidedLookOutfitRequested(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_outfit_requested', params);
}

export function trackGuidedLookUpgradeCTAClick(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_upgrade_cta_click', params);
}

export function trackGuidedLookTryOn(params: GuidedLookAnalyticsParams): void {
  trackEvent('guided_look_tryon', params);
}

export type StylistActionAnalyticsParams = {
  action_type:
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
  charged?: boolean;
  credits_used?: number;
  surface?: 'closet' | 'studio';
  source?: 'chat' | 'home' | 'looks' | 'closet';
  used_external_search?: boolean;
  thread_id?: string | null;
  outcome?: 'success' | 'failure';
};

export function trackStylistActionRequested(params: StylistActionAnalyticsParams): void {
  trackEvent('stylist_action_requested', params);
}

export function trackStylistActionCompleted(params: StylistActionAnalyticsParams): void {
  trackEvent('stylist_action_completed', params);
}

export function trackStylistActionFailed(params: StylistActionAnalyticsParams): void {
  trackEvent('stylist_action_failed', params);
}

type StylistRecommendationAnalyticsParams = {
  thread_id?: string;
  item_id?: string;
  surface?: 'closet' | 'studio';
  source?: 'chat';
  score_total?: number;
  expires_in_hours?: number;
};

export function trackStylistRecommendationRequested(params: StylistRecommendationAnalyticsParams): void {
  trackEvent('stylist_reco_requested', params);
}

export function trackStylistRecommendationCandidateShown(params: StylistRecommendationAnalyticsParams): void {
  trackEvent('stylist_reco_candidate_shown', params);
}

export function trackStylistRecommendationConfirmed(params: StylistRecommendationAnalyticsParams): void {
  trackEvent('stylist_reco_confirmed', params);
}

export function trackStylistRecommendationRejected(params: StylistRecommendationAnalyticsParams): void {
  trackEvent('stylist_reco_rejected', params);
}

export function trackStylistRecommendationExpired(params: StylistRecommendationAnalyticsParams): void {
  trackEvent('stylist_reco_expired', params);
}

export function trackStylistRecommendationDismissed(params: StylistRecommendationAnalyticsParams): void {
  trackEvent('stylist_reco_dismissed', params);
}

type KumbiSurfaceOpenedParams = {
  surface?: string;
  source?: string;
  entry_mode?: 'looks' | 'items' | 'contextual';
  has_selected_look?: boolean;
  has_inferred_look?: boolean;
};

export function trackKumbiSurfaceOpened(params: KumbiSurfaceOpenedParams): void {
  trackEvent('kumbi_surface_opened', params);
}

type KumbiResponseRenderedParams = {
  surface?: string;
  thread_id?: string | null;
  has_outfit?: boolean;
  has_actions?: boolean;
  has_references?: boolean;
  has_shopping?: boolean;
};

export function trackKumbiResponseRendered(params: KumbiResponseRenderedParams): void {
  trackEvent('kumbi_response_rendered', params);
}

type KumbiUiActionTriggeredParams = {
  surface?: string;
  thread_id?: string | null;
  action_type?: string;
  source?: 'chat' | 'studio';
};

export function trackKumbiUiActionTriggered(params: KumbiUiActionTriggeredParams): void {
  trackEvent('kumbi_ui_action_triggered', params);
}

type KumbiLookExtractionParams = {
  surface?: string;
  thread_id?: string | null;
  attachment_kind?: 'reference_look' | 'extractable_look';
  detected_count?: number;
  selected_count?: number;
  followup_type?: 'variants' | 'gap_fill' | 'open_closet';
};

export function trackKumbiLookExtractionStarted(params: KumbiLookExtractionParams): void {
  trackEvent('kumbi_look_extraction_started', params);
}

export function trackKumbiLookExtractionCompleted(params: KumbiLookExtractionParams): void {
  trackEvent('kumbi_look_extraction_completed', params);
}

export function trackKumbiLookExtractionSaved(params: KumbiLookExtractionParams): void {
  trackEvent('kumbi_look_extraction_saved', params);
}

export function trackKumbiLookExtractionFollowupSelected(params: KumbiLookExtractionParams): void {
  trackEvent('kumbi_look_extraction_followup_selected', params);
}

type KumbiLookSaveParams = {
  surface?: string;
  thread_id?: string | null;
  look_goal?: string;
  folder_id?: string | null;
  tag_count?: number;
  followup_type?: 'variant' | 'occasion' | 'open_looks';
};

export function trackKumbiLookSaveStarted(params: KumbiLookSaveParams): void {
  trackEvent('kumbi_look_save_started', params);
}

export function trackKumbiLookSaveCompleted(params: KumbiLookSaveParams): void {
  trackEvent('kumbi_look_save_completed', params);
}

export function trackKumbiLookSaveFailed(params: KumbiLookSaveParams): void {
  trackEvent('kumbi_look_save_failed', params);
}

export function trackKumbiLookSaveFollowupSelected(params: KumbiLookSaveParams): void {
  trackEvent('kumbi_look_save_followup_selected', params);
}

type ShoppingDupesAnalyticsParams = {
  country_code: string;
  item_category?: string;
  source_mix?: string;
  result_count?: number;
  latency_ms?: number;
  verified_count?: number;
  error_code?: string;
};

export function trackShoppingDupesRequested(params: ShoppingDupesAnalyticsParams): void {
  trackEvent('shopping_dupes_requested', params);
}

export function trackShoppingDupesCompleted(params: ShoppingDupesAnalyticsParams): void {
  trackEvent('shopping_dupes_completed', params);
}

export function trackShoppingDupesFailed(params: ShoppingDupesAnalyticsParams): void {
  trackEvent('shopping_dupes_failed', params);
}

export function trackShoppingDupesResultCount(params: ShoppingDupesAnalyticsParams): void {
  trackEvent('shopping_dupes_result_count', params);
}

export function trackShoppingLinkClicked(params: ShoppingDupesAnalyticsParams & {
  shop_name?: string;
  source?: string;
  link_verified?: boolean;
}): void {
  trackEvent('shopping_link_clicked', params);
}

export function trackShoppingFallbackLinkClicked(params: ShoppingDupesAnalyticsParams & {
  platform?: string;
}): void {
  trackEvent('shopping_fallback_link_clicked', params);
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
