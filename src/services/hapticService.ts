/**
 * Haptic Feedback Service
 * 
 * Provides haptic feedback for mobile devices to enhance user engagement.
 * Falls back silently on devices without vibration support.
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [30, 50, 30], // Two quick pulses
    warning: [50, 100, 50, 100, 50], // Three warning pulses
    error: [100, 50, 100], // Strong double pulse
    selection: 15, // Quick tap for selection
};

/**
 * Check if the device supports vibration
 */
export function supportsHaptics(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 * @returns true if haptic was triggered, false if not supported
 */
export function triggerHaptic(type: HapticType = 'medium'): boolean {
    if (!supportsHaptics()) {
        return false;
    }

    try {
        const pattern = HAPTIC_PATTERNS[type];
        navigator.vibrate(pattern);
        return true;
    } catch {
        // Silently fail if vibration is not allowed
        return false;
    }
}

/**
 * Trigger a custom vibration pattern
 * @param pattern - Array of vibration/pause durations in ms
 */
export function triggerCustomHaptic(pattern: number[]): boolean {
    if (!supportsHaptics()) {
        return false;
    }

    try {
        navigator.vibrate(pattern);
        return true;
    } catch {
        return false;
    }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): void {
    if (supportsHaptics()) {
        navigator.vibrate(0);
    }
}

/**
 * Trigger haptic on tap/click - wrapper for common use case
 */
export function hapticTap(): void {
    triggerHaptic('selection');
}

/**
 * Trigger haptic on successful action
 */
export function hapticSuccess(): void {
    triggerHaptic('success');
}

/**
 * Trigger haptic for commitment/important action
 */
export function hapticCommitment(): void {
    // Special pattern for commitment ritual: building anticipation
    triggerCustomHaptic([20, 50, 30, 50, 40, 50, 50]);
}
