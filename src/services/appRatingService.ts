/**
 * App Rating Service
 * 
 * Intelligent system to prompt users for app store reviews
 * after "success moments" - not randomly.
 */

type SuccessMomentType =
    | 'outfit_saved'
    | 'outfit_generated'
    | 'try_on_completed'
    | 'first_item_added'
    | 'challenge_completed';

interface RatingState {
    successMomentCount: number;
    hasRated: boolean;
    hasDismissed: boolean;
    lastPromptDate: string | null;
    sessionPromptShown: boolean;
}

const STORAGE_KEY = 'ojodeloca_rating_state';
const SUCCESS_THRESHOLD = 3; // Show prompt after 3 success moments
const MIN_DAYS_BETWEEN_PROMPTS = 7;

// Session-level flag to prevent multiple prompts per session
let sessionPromptShown = false;

/**
 * Get current rating state from storage
 */
function getState(): RatingState {
    if (typeof localStorage === 'undefined') {
        return getDefaultState();
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return getDefaultState();
        return { ...getDefaultState(), ...JSON.parse(stored) };
    } catch {
        return getDefaultState();
    }
}

function getDefaultState(): RatingState {
    return {
        successMomentCount: 0,
        hasRated: false,
        hasDismissed: false,
        lastPromptDate: null,
        sessionPromptShown: false,
    };
}

/**
 * Save state to storage
 */
function saveState(state: RatingState): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Track a success moment
 * Call this after user completes a positive action
 */
export function trackSuccessMoment(type: SuccessMomentType): void {
    const state = getState();
    state.successMomentCount += 1;
    saveState(state);

    if (import.meta.env.DEV) {
        console.log(`[AppRating] Success moment tracked: ${type}. Total: ${state.successMomentCount}`);
    }
}

/**
 * Check if we should show the rating prompt
 * Returns true only under optimal conditions
 */
export function shouldShowRatingPrompt(): boolean {
    const state = getState();

    // Never show if already rated
    if (state.hasRated) return false;

    // Don't show again if permanently dismissed
    if (state.hasDismissed) return false;

    // Only show once per session
    if (sessionPromptShown) return false;

    // Need minimum success moments
    if (state.successMomentCount < SUCCESS_THRESHOLD) return false;

    // Respect cooldown period
    if (state.lastPromptDate) {
        const lastPrompt = new Date(state.lastPromptDate);
        const daysSince = (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return false;
    }

    return true;
}

/**
 * Mark that the rating prompt was shown
 */
export function markPromptShown(): void {
    sessionPromptShown = true;
    const state = getState();
    state.lastPromptDate = new Date().toISOString();
    saveState(state);
}

/**
 * User gave a positive rating (4-5 stars)
 * Redirect to app store
 */
export function handlePositiveRating(): void {
    const state = getState();
    state.hasRated = true;
    saveState(state);

    // Open app store link
    // For web, we can link to a reviews page or social proof page
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
        // Replace with actual App Store URL when published
        window.open('https://apps.apple.com/app/id_placeholder', '_blank');
    } else if (isAndroid) {
        // Replace with actual Play Store URL when published
        window.open('https://play.google.com/store/apps/details?id=placeholder', '_blank');
    } else {
        // For web, maybe link to social media or testimonials page
        console.log('[AppRating] Positive rating received on web');
    }
}

/**
 * User gave a negative rating (1-3 stars)
 * Show feedback form instead of redirecting to store
 */
export function handleNegativeRating(): void {
    const state = getState();
    state.hasRated = true; // Still mark as rated to prevent future prompts
    saveState(state);
}

/**
 * User clicked "Not now" - temporary dismiss
 */
export function dismissRatingPrompt(): void {
    sessionPromptShown = true;
    const state = getState();
    state.lastPromptDate = new Date().toISOString();
    // Reset success count to give user more time
    state.successMomentCount = 0;
    saveState(state);
}

/**
 * User clicked "Never ask again" - permanent dismiss
 */
export function permanentlyDismissRating(): void {
    const state = getState();
    state.hasDismissed = true;
    saveState(state);
}

/**
 * Reset rating state (for testing)
 */
export function resetRatingState(): void {
    sessionPromptShown = false;
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Get current rating stats (for debugging)
 */
export function getRatingStats(): RatingState & { sessionPromptShown: boolean } {
    return {
        ...getState(),
        sessionPromptShown,
    };
}
