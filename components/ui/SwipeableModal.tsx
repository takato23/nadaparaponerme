import React, { ReactNode, useEffect, useRef } from 'react';
import { useDrag } from '@use-gesture/react';

interface SwipeableModalProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

/**
 * SwipeableModal Component
 *
 * Mobile-optimized modal with swipe-down-to-close gesture.
 * Implements iOS-style sheet behavior with smooth animations.
 *
 * Features:
 * - Swipe down to dismiss (threshold: 120px)
 * - Spring physics for natural feel
 * - Prevents body scroll when open
 * - Touch-optimized drag handle
 */
const SwipeableModal = ({ children, onClose, className = '' }: SwipeableModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const bind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], last, event }) => {
      // Prevent drag on scrollable content
      const target = event.target as HTMLElement;
      if (target.closest('[data-scrollable="true"]')) {
        return;
      }

      const modal = modalRef.current;
      if (!modal) return;

      // Only allow downward dragging
      if (my < 0) {
        modal.style.transform = `translateY(0px)`;
        return;
      }

      if (last) {
        // Dismiss if dragged down > 120px or fast swipe down
        const shouldDismiss = my > 120 || (vy > 0.5 && dy > 0);

        if (shouldDismiss) {
          modal.style.transform = `translateY(100%)`;
          modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          setTimeout(onClose, 300);
        } else {
          // Snap back to position
          modal.style.transform = `translateY(0px)`;
          modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      } else {
        // Follow finger during drag
        modal.style.transform = `translateY(${my}px)`;
        modal.style.transition = 'none';
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      rubberband: true,
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        {...bind()}
        className={`w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-4xl shadow-soft-lg animate-slide-up touch-none ${className}`}
        style={{ maxHeight: '95vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" data-scrollable="true" style={{ maxHeight: 'calc(95vh - 48px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SwipeableModal;
