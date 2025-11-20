import React from 'react';
import { TooltipWrapper } from './TooltipWrapper';

interface HelpIconProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({
  content,
  position = 'top',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base'
  };

  const touchTargetSize = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };

  return (
    <TooltipWrapper content={content} position={position}>
      <button
        type="button"
        aria-label="Ayuda"
        className={`
          inline-flex items-center justify-center
          ${touchTargetSize[size]}
          min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0
          rounded-full
          text-gray-500 dark:text-gray-400
          hover:text-blue-600 dark:hover:text-blue-400
          hover:bg-blue-50 dark:hover:bg-blue-900/20
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          ${className}
        `}
        onClick={(e) => e.preventDefault()}
      >
        <svg
          className={sizeClasses[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </TooltipWrapper>
  );
};
