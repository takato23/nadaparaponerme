/**
 * Safe Navigation Hook
 *
 * Wraps React Router's navigate function in startTransition to prevent
 * React Suspense error #426 when navigating to routes with lazy-loaded components.
 */

import { useCallback, startTransition, useTransition } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';

/**
 * A hook that provides a navigate function wrapped in startTransition.
 * This prevents React error #426 when navigating to routes with lazy-loaded components
 * during synchronous user events.
 *
 * Uses useTransition for better React 18+ compatibility with concurrent features.
 *
 * @example
 * const navigate = useNavigateTransition();
 * navigate('/profile');
 * navigate(-1); // Go back
 */
export function useNavigateTransition() {
  const routerNavigate = useNavigate();
  const [isPending, startNavigationTransition] = useTransition();

  const navigate = useCallback((to: To | number, options?: NavigateOptions) => {
    // Use flushSync alternative: schedule the navigation in a transition
    // This prevents the "suspended while responding to synchronous input" error
    startNavigationTransition(() => {
      if (typeof to === 'number') {
        routerNavigate(to);
      } else {
        routerNavigate(to, options);
      }
    });
  }, [routerNavigate, startNavigationTransition]);

  return navigate;
}

export default useNavigateTransition;
