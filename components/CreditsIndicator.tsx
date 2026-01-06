/**
 * CreditsIndicator Component - SIMPLIFIED
 *
 * Shows unified AI credits remaining.
 * Single pool of credits for all AI features.
 */

import React, { useMemo } from 'react';
import { getCreditStatus } from '../services/usageTrackingService';

interface CreditsIndicatorProps {
  variant?: 'badge' | 'compact' | 'minimal';
  className?: string;
  onClick?: () => void;
}

export function CreditsIndicator({ variant = 'compact', className = '', onClick }: CreditsIndicatorProps) {
  const status = useMemo(() => getCreditStatus(), []);

  // Color based on remaining percentage
  const getColor = () => {
    if (status.limit === -1) return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    if (status.remaining <= 3) return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
    if (status.percentUsed >= 70) return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', border: '' };
  };

  const colors = getColor();
  const isClickable = !!onClick;

  // Minimal: just the number
  if (variant === 'minimal') {
    return (
      <button
        onClick={onClick}
        disabled={!isClickable}
        className={`flex items-center gap-1 ${colors.text} ${className} ${isClickable ? 'hover:opacity-80 cursor-pointer' : ''}`}
      >
        <span className="material-symbols-rounded text-sm">toll</span>
        <span className="text-xs font-semibold">
          {status.limit === -1 ? '∞' : status.remaining}
        </span>
      </button>
    );
  }

  // Compact: icon + number in pill
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        disabled={!isClickable}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors.bg} ${status.remaining <= 3 ? `border ${colors.border}` : ''} ${className} ${isClickable ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}
      >
        <span className="material-symbols-rounded text-gray-500 dark:text-gray-400 text-sm">toll</span>
        <span className={`text-xs font-medium ${colors.text}`}>
          {status.limit === -1 ? '∞' : status.remaining}
        </span>
      </button>
    );
  }

  // Badge: larger with label
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${status.remaining <= 3 ? `border ${colors.border}` : ''} ${className} ${isClickable ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}
    >
      <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">toll</span>
      <div className="flex flex-col items-start">
        <span className={`text-xs font-semibold ${colors.text}`}>
          {status.limit === -1 ? '∞' : `${status.remaining}/${status.limit}`}
        </span>
        <span className="text-[10px] text-gray-400">créditos</span>
      </div>
    </button>
  );
}

// Simplified warning for low credits
export function LowCreditsWarning() {
  const status = useMemo(() => getCreditStatus(), []);

  if (status.limit === -1 || status.remaining > 5) return null;

  return (
    <p className="text-xs text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
      <span className="material-symbols-rounded text-sm">warning</span>
      Te quedan {status.remaining} créditos este mes
    </p>
  );
}

export default CreditsIndicator;
