import { useEffect, useRef, useCallback } from 'react';

/**
 * Focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive?: boolean;
  /** Whether to restore focus to the previously focused element when deactivated */
  restoreFocus?: boolean;
  /** Whether to auto-focus the first focusable element when activated */
  autoFocus?: boolean;
  /** Called when Escape key is pressed */
  onEscape?: () => void;
}

/**
 * Hook for trapping focus within a modal/dialog
 * Improves keyboard navigation accessibility
 *
 * Enhanced features:
 * - Traps Tab/Shift+Tab cycling within container
 * - Handles Escape key for closing
 * - Restores focus to previous element on close
 * - Auto-focuses first focusable element on open
 */
export const useFocusTrap = (
  optionsOrIsActive: boolean | UseFocusTrapOptions = true
) => {
  // Handle both legacy boolean and new options object
  const options: UseFocusTrapOptions = typeof optionsOrIsActive === 'boolean'
    ? { isActive: optionsOrIsActive }
    : optionsOrIsActive;

  const {
    isActive = true,
    restoreFocus = true,
    autoFocus = true,
    onEscape
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store current focus for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableElements = getFocusableElements();

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    if (autoFocus && firstElement) {
      requestAnimationFrame(() => firstElement.focus());
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      // Re-query in case DOM changed
      const currentFocusable = getFocusableElements();
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }

      // If focus is outside container, bring it back
      if (!container.contains(document.activeElement)) {
        e.preventDefault();
        first?.focus();
      }
    };

    // Use document level to catch all keyboard events
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus when deactivating
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, autoFocus, restoreFocus, onEscape, getFocusableElements]);

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

/**
 * Hook for keyboard dismiss (Escape key)
 * Use when you only need escape handling without full focus trap
 */
export const useKeyboardDismiss = (
  isActive: boolean,
  onDismiss: () => void,
  key: string = 'Escape'
) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onDismiss, key]);
};

/**
 * Combined hook for accessible modal behavior
 * Includes focus trap, escape dismiss, and body scroll lock
 */
export const useAccessibleModal = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  restoreFocus = true,
  autoFocus = true
}: {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}) => {
  const containerRef = useFocusTrap({
    isActive: isOpen,
    restoreFocus,
    autoFocus,
    onEscape: closeOnEscape ? onClose : undefined
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return {
    containerRef,
    // Props to spread on container element
    containerProps: {
      ref: containerRef,
      role: 'dialog' as const,
      'aria-modal': true as const,
      tabIndex: -1
    }
  };
};
