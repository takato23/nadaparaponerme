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
      className={`relative overflow-hidden rounded-2xl ${
        isCritical
          ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
          : isLow
          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20'
          : 'bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20'
      } shadow-lg shadow-purple-500/10 dark:shadow-purple-500/5 border border-white/50 dark:border-gray-700/50 ${className}`}
    >
      {/* Decorative sparkles */}
      <div className="absolute top-2 right-2 opacity-30">
        <span className="material-symbols-rounded text-4xl text-purple-300 dark:text-purple-600">
          auto_awesome
        </span>
      </div>
      <div className="absolute -bottom-4 -left-4 opacity-20">
        <span className="material-symbols-rounded text-6xl text-fuchsia-300 dark:text-fuchsia-700">
          auto_awesome
        </span>
      </div>

      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCritical
                  ? 'bg-red-500/20 dark:bg-red-500/30'
                  : isLow
                  ? 'bg-amber-500/20 dark:bg-amber-500/30'
                  : 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 dark:from-violet-500/30 dark:to-fuchsia-500/30'
              }`}
            >
              <span
                className={`material-symbols-rounded text-xl ${
                  isCritical
                    ? 'text-red-600 dark:text-red-400'
                    : isLow
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-violet-600 dark:text-violet-400'
                }`}
              >
                {isUnlimited ? 'all_inclusive' : isCritical ? 'warning' : 'auto_awesome'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Generaciones de IA
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isUnlimited ? 'Sin límites' : 'Este mes'}
              </p>
            </div>
          </div>
          <TierBadge tier={tier} />
        </div>

        {/* Main Stats */}
        <div className="flex items-end gap-1 mb-3">
          <span
            className={`text-3xl font-bold ${
              isCritical
                ? 'text-red-600 dark:text-red-400'
                : isLow
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-violet-600 dark:text-violet-400'
            }`}
          >
            {isUnlimited ? '∞' : remaining}
          </span>
          {!isUnlimited && (
            <span className="text-gray-400 dark:text-gray-500 text-sm mb-1">
              / {limit} restantes
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-2.5 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isUnlimited
                  ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500'
                  : isCritical
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : isLow
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                  : 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500'
              }`}
              style={{ width: isUnlimited ? '100%' : `${100 - percentage}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        {!isUnlimited && tier !== 'premium' && onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              isCritical || isLow
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50 hover:border-violet-300 dark:hover:border-violet-700'
            }`}
          >
            {isCritical ? '¡Upgrade ahora!' : isLow ? 'Obtener más' : 'Ver planes'}
          </button>
        )}

        {/* Warning Messages */}
        {isAtLimit && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-200/50 dark:border-red-800/50">
            <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <span className="material-symbols-rounded text-sm">error</span>
              Límite alcanzado. Upgrade para continuar.
            </p>
          </div>
        )}
      </div>
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
