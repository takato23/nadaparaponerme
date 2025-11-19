import { useEffect, useRef } from 'react';

/**
 * Hook for trapping focus within a modal/dialog
 * Improves keyboard navigation accessibility
 */
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Hook for restoring focus to the trigger element when modal closes
 */
export const useRestoreFocus = () => {
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const saveTriggerElement = () => {
    triggerElementRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
      triggerElementRef.current.focus();
    }
  };

  return { saveTriggerElement, restoreFocus };
};
