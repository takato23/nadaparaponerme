import React, { useState, useEffect } from 'react';

interface FloatingHelpButtonProps {
  onClick: () => void;
  showPulse?: boolean; // Show attention-grabbing pulse for new users
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({
  onClick,
  showPulse = false,
  position = 'bottom-right'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Check if user has interacted with help before
  useEffect(() => {
    const interacted = localStorage.getItem('help-button-interacted');
    if (interacted) {
      setHasInteracted(true);
    }
  }, []);

  const handleClick = () => {
    setHasInteracted(true);
    localStorage.setItem('help-button-interacted', 'true');
    onClick();
  };

  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
  };

  const positionClasses = {
    'bottom-right': 'bottom-safe-24 right-safe-4 md:bottom-8 md:right-8',
    'bottom-left': 'bottom-safe-24 left-safe-4 md:bottom-8 md:left-8',
    'top-right': 'top-safe-20 right-safe-4 md:top-8 md:right-8',
    'top-left': 'top-safe-20 left-safe-4 md:top-8 md:left-8'
  };

  return (
    <div
      className={`
        fixed z-40
        ${positionClasses[position]}
      `}
    >
      {/* Pulse ring for attention (only for new users) */}
      {showPulse && !hasInteracted && (
        <>
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
        </>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          relative flex items-center gap-2
          bg-white dark:bg-slate-800
          border-2 border-primary/20 dark:border-primary/30
          shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20
          rounded-full
          transition-all duration-300 ease-out
          hover:-translate-y-1
          active:scale-95
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
          ${isExpanded ? 'pl-4 pr-5 py-3' : 'p-3'}
        `}
        aria-label="Abrir centro de ayuda"
      >
        {/* Icon */}
        <span className={`
          material-symbols-outlined text-primary text-xl
          transition-transform duration-300
          ${isExpanded ? 'rotate-12' : ''}
        `}>
          help
        </span>

        {/* Expanded text */}
        <span
          className={`
            text-sm font-medium text-text-primary dark:text-gray-100 whitespace-nowrap
            transition-all duration-300
            ${isExpanded ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0'}
            overflow-hidden
          `}
        >
          Ayuda
        </span>
      </button>

      {/* Tooltip hint for new users */}
      {!hasInteracted && (
        <div className={`
          absolute ${position.includes('right') ? 'right-full mr-3' : 'left-full ml-3'}
          top-1/2 -translate-y-1/2
          hidden md:block
          animate-fade-in
        `}>
          <div className="relative bg-primary text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            ¿Necesitás ayuda?
            {/* Arrow */}
            <div className={`
              absolute top-1/2 -translate-y-1/2
              w-0 h-0
              border-t-[6px] border-t-transparent
              border-b-[6px] border-b-transparent
              ${position.includes('right')
                ? 'left-full border-l-[6px] border-l-primary'
                : 'right-full border-r-[6px] border-r-primary'
              }
            `} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingHelpButton;
