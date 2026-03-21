import { useEffect, useRef } from 'react';
import { trackInteractionTiming } from '../services/analyticsService';

const INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
  'pointerdown',
  'touchstart',
  'keydown',
  'scroll',
];

/**
 * Tracks lightweight route responsiveness metrics.
 * Emits two events:
 * - route_ready_ms: first paint after mount
 * - first_interaction_ms: first user interaction after mount
 */
export function useInteractionMetrics(screenName: string, enabled = true): void {
  const startRef = useRef(0);
  const interactionTrackedRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    startRef.current = performance.now();
    interactionTrackedRef.current = false;

    const emitRouteReady = () => {
      const elapsed = Math.max(0, Math.round(performance.now() - startRef.current));
      trackInteractionTiming({
        screen_name: screenName,
        metric_name: 'route_ready_ms',
        value_ms: elapsed,
      });
    };

    const rafId = window.requestAnimationFrame(emitRouteReady);

    const handleFirstInteraction = (event: Event) => {
      if (interactionTrackedRef.current) return;
      interactionTrackedRef.current = true;

      const elapsed = Math.max(0, Math.round(performance.now() - startRef.current));
      trackInteractionTiming({
        screen_name: screenName,
        metric_name: 'first_interaction_ms',
        value_ms: elapsed,
        interaction_type: event.type,
      });
    };

    for (const eventName of INTERACTION_EVENTS) {
      window.addEventListener(eventName, handleFirstInteraction, {
        passive: true,
        capture: true,
      });
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      for (const eventName of INTERACTION_EVENTS) {
        window.removeEventListener(eventName, handleFirstInteraction, true);
      }
    };
  }, [enabled, screenName]);
}

