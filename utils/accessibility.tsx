/**
 * Accessibility Utilities
 * WCAG 2.1 Level AA Compliance Tools
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ============================================
// Skip to Main Content Component
// ============================================

export const SkipToMainContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
  >
    Saltar al contenido principal
  </a>
);

// ============================================
// Focus Trap Hook for Modals
// ============================================

interface UseFocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

export const useFocusTrap = (options: UseFocusTrapOptions) => {
  const { isOpen, onClose, initialFocusRef, finalFocusRef } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that was focused before opening the modal
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the initial element or the first focusable element
    const focusInitialElement = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const firstFocusable = getFocusableElements(containerRef.current)?.[0];
        firstFocusable?.focus();
      }
    };

    // Delay to ensure DOM is ready
    setTimeout(focusInitialElement, 50);

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements(containerRef.current);
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift + Tab
        if (e.shiftKey) {
          if (activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        }
        // Tab
        else {
          if (activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the element that opened the modal
      if (previousActiveElement.current && finalFocusRef?.current) {
        finalFocusRef.current.focus();
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose, initialFocusRef, finalFocusRef]);

  return containerRef;
};

// ============================================
// Get Focusable Elements
// ============================================

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
};

// ============================================
// Screen Reader Announcements
// ============================================

let announcementRegion: HTMLElement | null = null;

const getAnnouncementRegion = (): HTMLElement => {
  if (announcementRegion) return announcementRegion;

  // Create live region for announcements
  announcementRegion = document.createElement('div');
  announcementRegion.setAttribute('role', 'status');
  announcementRegion.setAttribute('aria-live', 'polite');
  announcementRegion.setAttribute('aria-atomic', 'true');
  announcementRegion.className = 'sr-only';
  document.body.appendChild(announcementRegion);

  return announcementRegion;
};

export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const region = getAnnouncementRegion();
  region.setAttribute('aria-live', priority);

  // Clear previous message
  region.textContent = '';

  // Set new message with delay to ensure screen reader picks it up
  setTimeout(() => {
    region.textContent = message;
  }, 100);
};

// ============================================
// Use Announcement Hook
// ============================================

export const useAnnouncement = () => {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);
};

// ============================================
// Accessible Button Props
// ============================================

interface AccessibleButtonProps {
  label: string;
  description?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const getAccessibleButtonProps = (props: AccessibleButtonProps) => {
  const { label, description, disabled, loading } = props;

  return {
    'aria-label': label,
    'aria-describedby': description ? `${label}-description` : undefined,
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    disabled: disabled || loading,
  };
};

// ============================================
// Accessible Form Field Props
// ============================================

interface AccessibleFormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
}

export const getAccessibleFormFieldProps = (props: AccessibleFormFieldProps) => {
  const { id, label, error, required, description } = props;

  const describedBy = [
    description ? `${id}-description` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(' ');

  return {
    id,
    'aria-label': label,
    'aria-required': required,
    'aria-invalid': !!error,
    'aria-describedby': describedBy || undefined,
  };
};

// ============================================
// Keyboard Navigation Helpers
// ============================================

export const handleKeyboardActivation = (
  e: React.KeyboardEvent,
  callback: () => void
) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    callback();
  }
};

// ============================================
// Color Contrast Checker
// ============================================

export const getContrastRatio = (hex1: string, hex2: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map(c => {
      const val = c / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
};

export const meetsWCAGAA = (hex1: string, hex2: string, isLargeText = false): boolean => {
  const ratio = getContrastRatio(hex1, hex2);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

// ============================================
// Focus Visible Style
// ============================================

export const focusVisibleStyles = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

// ============================================
// Semantic HTML Helpers
// ============================================

export const getHeadingLevel = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
  const Component = `h${level}` as React.ElementType;
  return Component;
};

// ============================================
// Live Region Component
// ============================================

interface LiveRegionProps {
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  priority = 'polite',
  atomic = true,
  className = '',
}) => (
  <div
    role={priority === 'assertive' ? 'alert' : 'status'}
    aria-live={priority}
    aria-atomic={atomic}
    className={className}
  >
    {children}
  </div>
);

// ============================================
// Visually Hidden Component
// ============================================

interface VisuallyHiddenProps {
  children: React.ReactNode;
  focusable?: boolean;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  children,
  focusable = false,
}) => (
  <span className={focusable ? 'sr-only focus:not-sr-only' : 'sr-only'}>
    {children}
  </span>
);
