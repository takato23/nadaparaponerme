/**
 * QuotaIndicator Component
 *
 * Displays remaining AI generations and upgrade prompt.
 * Can be shown as a badge, bar, or compact indicator.
 */

import React from 'react';
import type { SubscriptionTier } from '../types-payment';

// ============================================================================
// TYPES
// ============================================================================

interface QuotaIndicatorProps {
  used: number;
  limit: number;
  tier: SubscriptionTier;
  variant?: 'badge' | 'bar' | 'compact' | 'full';
  onUpgradeClick?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuotaIndicator({
  used,
  limit,
  tier,
  variant = 'badge',
  onUpgradeClick,
  className = '',
}: QuotaIndicatorProps) {
  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used);
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isLow = !isUnlimited && percentage >= 70;
  const isCritical = !isUnlimited && percentage >= 90;
  const isAtLimit = !isUnlimited && used >= limit;

  // Badge variant - small pill showing remaining
  if (variant === 'badge') {
    if (isUnlimited) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white ${className}`}
        >
          <span className="material-symbols-rounded text-sm">all_inclusive</span>
          Ilimitado
        </span>
      );
    }

    return (
      <button
        onClick={onUpgradeClick}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
          isCritical
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            : isLow
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
        } ${className}`}
      >
        <span className="material-symbols-rounded text-sm">
          {isCritical ? 'warning' : 'auto_awesome'}
        </span>
        {remaining} restantes
      </button>
    );
  }

  // Compact variant - just the number
  if (variant === 'compact') {
    if (isUnlimited) {
      return (
        <span className={`text-xs text-purple-500 font-medium ${className}`}>
          ∞
        </span>
      );
    }

    return (
      <span
        className={`text-xs font-medium ${
          isCritical
            ? 'text-red-500'
            : isLow
            ? 'text-yellow-500'
            : 'text-gray-500 dark:text-gray-400'
        } ${className}`}
      >
        {used}/{limit}
      </span>
    );
  }

  // Bar variant - progress bar
  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Generaciones de IA
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {isUnlimited ? '∞' : `${used}/${limit}`}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isUnlimited
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-full'
                : isCritical
                ? 'bg-red-500'
                : isLow
                ? 'bg-yellow-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
          />
        </div>
        {isAtLimit && onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Upgrade para más generaciones →
          </button>
        )}
      </div>
    );
  }

  // Full variant - complete card with all info
  return (
    <div
      className={`p-4 rounded-xl border ${
        isCritical
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : isLow
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-rounded text-xl ${
              isCritical
                ? 'text-red-500'
                : isLow
                ? 'text-yellow-500'
                : 'text-purple-500'
            }`}
          >
            {isUnlimited ? 'all_inclusive' : isCritical ? 'warning' : 'auto_awesome'}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            Generaciones de IA
          </span>
        </div>
        <TierBadge tier={tier} />
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isUnlimited
                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                : isCritical
                ? 'bg-red-500'
                : isLow
                ? 'bg-yellow-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {isUnlimited ? (
            'Generaciones ilimitadas'
          ) : (
            <>
              <span className="font-bold text-gray-900 dark:text-white">{remaining}</span>{' '}
              restantes este mes
            </>
          )}
        </span>
        {!isUnlimited && tier !== 'premium' && onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Warning Messages */}
      {isAtLimit && (
        <div className="mt-3 p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
          <p className="text-xs text-red-700 dark:text-red-300">
            Has alcanzado tu límite mensual. Upgrade para continuar generando outfits.
          </p>
        </div>
      )}
      {isCritical && !isAtLimit && (
        <div className="mt-3 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Te quedan pocas generaciones. Considerá hacer upgrade.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const config = {
    free: {
      label: 'Free',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    },
    pro: {
      label: 'Pro',
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    },
    premium: {
      label: 'Premium',
      className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    },
  };

  const { label, className } = config[tier];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ============================================================================
// LIMIT REACHED MODAL
// ============================================================================

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  tier: SubscriptionTier;
}

export function LimitReachedModal({
  isOpen,
  onClose,
  onUpgrade,
  tier,
}: LimitReachedModalProps) {
  if (!isOpen) return null;

  const nextTier = tier === 'free' ? 'Pro' : 'Premium';
  const nextLimit = tier === 'free' ? '100' : 'ilimitadas';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="material-symbols-rounded text-3xl text-white">
            auto_awesome
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          ¡Alcanzaste tu límite!
        </h2>

        {/* Description */}
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Has usado todas tus generaciones de IA este mes.
          Hacé upgrade a <strong>{nextTier}</strong> para obtener {nextLimit} generaciones.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onUpgrade}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
          >
            Ver planes
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            Quizás después
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-xl text-gray-400">close</span>
        </button>
      </div>
    </div>
  );
}

export default QuotaIndicator;
