import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[]; // Percentage heights [50, 80, 100]
  defaultSnapPoint?: number;
  showHandle?: boolean;
}

const BottomSheet = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [50, 90],
  defaultSnapPoint = 0,
  showHandle = true
}: BottomSheetProps) => {
  const containerRef = useFocusTrap(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(defaultSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const deltaY = currentY - startY;
    const windowHeight = window.innerHeight;
    const threshold = windowHeight * 0.2;

    if (deltaY > threshold) {
      // Swipe down - close or snap to lower point
      if (currentSnapIndex === 0) {
        onClose();
      } else {
        setCurrentSnapIndex(prev => Math.max(0, prev - 1));
      }
    } else if (deltaY < -threshold) {
      // Swipe up - snap to higher point
      setCurrentSnapIndex(prev => Math.min(snapPoints.length - 1, prev + 1));
    }

    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  const currentHeight = snapPoints[currentSnapIndex];
  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={containerRef}
        className="fixed inset-x-0 bottom-0 z-50 liquid-glass rounded-t-3xl shadow-2xl animate-slide-up transition-all duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        style={{
          height: `${currentHeight}vh`,
          transform: `translateY(${dragOffset}px)`,
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Handle area */}
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showHandle && (
            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          {title && (
            <h2
              id="sheet-title"
              className="mt-3 text-xl font-bold text-text-primary dark:text-gray-200"
            >
              {title}
            </h2>
          )}
        </div>

        {/* Content */}
        <div
          ref={sheetRef}
          className="overflow-y-auto px-6 pb-6"
          style={{
            height: 'calc(100% - 3rem)',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
