import React, { useState, useRef, useEffect } from 'react';

interface TooltipWrapperProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleClick = () => {
    if (isTouchDevice) {
      setIsVisible(!isVisible);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800 dark:border-t-gray-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800 dark:border-b-gray-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800 dark:border-l-gray-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800 dark:border-r-gray-700'
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={!isTouchDevice ? showTooltip : undefined}
      onMouseLeave={!isTouchDevice ? hideTooltip : undefined}
      onClick={isTouchDevice ? handleClick : undefined}
    >
      <div
        aria-describedby={isVisible ? tooltipId.current : undefined}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <>
          {/* Backdrop for touch devices */}
          {isTouchDevice && (
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                hideTooltip();
              }}
            />
          )}

          {/* Tooltip */}
          <div
            id={tooltipId.current}
            role="tooltip"
            className={`
              absolute z-50 px-3 py-2 text-sm font-medium text-white
              bg-gray-800 dark:bg-gray-700 rounded-lg shadow-lg
              whitespace-nowrap max-w-xs sm:max-w-sm md:max-w-md
              animate-fade-in pointer-events-none
              ${positionClasses[position]}
            `}
            style={{
              minWidth: isTouchDevice ? '200px' : undefined,
              whiteSpace: content.length > 50 ? 'normal' : 'nowrap'
            }}
          >
            {content}

            {/* Arrow */}
            <div
              className={`
                absolute w-0 h-0 border-4
                ${arrowClasses[position]}
              `}
            />
          </div>
        </>
      )}
    </div>
  );
};
