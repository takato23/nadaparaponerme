/**
 * AIModalHeader - Header reutilizable para modales de funciones AI
 *
 * Muestra título, indicador de créditos y botón de cerrar de forma consistente.
 */

import React, { useMemo } from 'react';
import { getCreditStatus } from '../../src/services/usageTrackingService';

interface AIModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  showCredits?: boolean;
  variant?: 'default' | 'dark' | 'transparent';
  className?: string;
}

export function AIModalHeader({
  title,
  subtitle,
  onClose,
  onBack,
  showCredits = true,
  variant = 'default',
  className = '',
}: AIModalHeaderProps) {
  const credits = useMemo(() => getCreditStatus(), []);

  const getCreditsColor = () => {
    if (credits.limit === -1) return 'text-emerald-500';
    if (credits.remaining <= 3) return 'text-red-500';
    if (credits.percentUsed >= 70) return 'text-amber-500';
    return 'text-gray-600 dark:text-gray-300';
  };

  const getCreditsBackground = () => {
    if (variant === 'dark' || variant === 'transparent') {
      if (credits.remaining <= 3) return 'bg-red-500/20 border border-red-400/50';
      return 'bg-white/10';
    }
    if (credits.remaining <= 3) return 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  const baseStyles = {
    default: 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800',
    dark: 'bg-black/60 backdrop-blur-md',
    transparent: 'bg-gradient-to-b from-black/60 to-transparent',
  };

  const textStyles = {
    default: 'text-gray-900 dark:text-white',
    dark: 'text-white',
    transparent: 'text-white',
  };

  const subtitleStyles = {
    default: 'text-gray-500 dark:text-gray-400',
    dark: 'text-white/70',
    transparent: 'text-white/70',
  };

  return (
    <div className={`px-4 py-3 flex items-center justify-between ${baseStyles[variant]} ${className}`}>
      {/* Left side - Back button or title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition-colors ${
              variant === 'default'
                ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
        )}
        <div className="min-w-0">
          <h2 className={`text-lg font-bold truncate ${textStyles[variant]}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`text-xs truncate ${subtitleStyles[variant]}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Credits and close */}
      <div className="flex items-center gap-2 shrink-0">
        {showCredits && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${getCreditsBackground()}`}>
            <span className={`material-symbols-rounded text-sm ${
              variant === 'default' ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'
            }`}>
              toll
            </span>
            <span className={`text-xs font-semibold ${
              variant === 'default' ? getCreditsColor() : (credits.remaining <= 3 ? 'text-red-300' : 'text-white/90')
            }`}>
              {credits.limit === -1 ? '∞' : credits.remaining}
            </span>
          </div>
        )}
        <button
          onClick={onClose}
          className={`p-2 rounded-full transition-colors ${
            variant === 'default'
              ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
              : 'hover:bg-white/10 text-white'
          }`}
        >
          <span className="material-symbols-rounded text-xl">close</span>
        </button>
      </div>
    </div>
  );
}

export default AIModalHeader;
