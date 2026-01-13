/**
 * CreditsBadge Component
 *
 * Displays user's credits/usage status with a compact badge.
 * Shows progress ring and triggers upgrade modal when clicked.
 */

import React from 'react';
import { useUserCredits } from '../hooks/useUserCredits';

interface CreditsBadgeProps {
  onClick?: () => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CreditsBadge({
  onClick,
  showLabel = true,
  size = 'md',
  className = '',
}: CreditsBadgeProps) {
  const { tier, summary, setShowUpgradeModal } = useUserCredits();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowUpgradeModal(true);
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'h-7 px-2 text-xs gap-1.5',
      ring: 'w-4 h-4',
      icon: 'text-xs',
    },
    md: {
      container: 'h-8 px-3 text-sm gap-2',
      ring: 'w-5 h-5',
      icon: 'text-sm',
    },
    lg: {
      container: 'h-10 px-4 text-base gap-2.5',
      ring: 'w-6 h-6',
      icon: 'text-base',
    },
  };

  const config = sizeConfig[size];

  // Progress ring calculation
  const percentage = summary.percentUsed;
  const circumference = 2 * Math.PI * 8; // r=8 for viewBox
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on usage
  const getProgressColor = () => {
    if (percentage >= 90) return '#ef4444'; // red
    if (percentage >= 70) return '#f97316'; // orange
    if (percentage >= 50) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  // Tier badge colors
  const tierColors = {
    free: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    pro: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    premium: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  const tierLabels = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center rounded-full
        ${tierColors[tier]}
        ${config.container}
        hover:opacity-90 transition-all duration-200
        border border-current/10
        ${className}
      `}
      title={`${summary.totalUsed}/${summary.totalLimit} créditos usados este mes`}
    >
      {/* Progress Ring */}
      <svg className={config.ring} viewBox="0 0 20 20">
        {/* Background circle */}
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
        {/* Progress circle */}
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={getProgressColor()}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 10 10)"
          className="transition-all duration-500"
        />
        {/* Center icon */}
        {tier === 'premium' ? (
          <text
            x="10"
            y="10"
            textAnchor="middle"
            dominantBaseline="central"
            className={`${config.icon} fill-current`}
          >
            ∞
          </text>
        ) : (
          <text
            x="10"
            y="10"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7"
            className="fill-current font-medium"
          >
            {summary.totalLimit - summary.totalUsed}
          </text>
        )}
      </svg>

      {/* Label */}
      {showLabel && (
        <span className="font-medium">
          {tierLabels[tier]}
        </span>
      )}

      {/* Upgrade indicator for free users */}
      {tier === 'free' && (
        <span
          className="material-symbols-rounded text-xs opacity-60"
          style={{ fontSize: '14px' }}
        >
          arrow_upward
        </span>
      )}
    </button>
  );
}

// ============================================================================
// CREDITS PROGRESS BAR (for detailed views)
// ============================================================================

interface CreditsProgressBarProps {
  className?: string;
}

export function CreditsProgressBar({ className = '' }: CreditsProgressBarProps) {
  const { tier, summary } = useUserCredits();

  const getBarColor = () => {
    if (summary.percentUsed >= 90) return 'bg-red-500';
    if (summary.percentUsed >= 70) return 'bg-orange-500';
    if (summary.percentUsed >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (summary.totalLimit === -1) {
    return (
      <div className={`text-center text-purple-600 dark:text-purple-400 ${className}`}>
        <span className="material-symbols-rounded mr-1" style={{ fontSize: '16px' }}>
          all_inclusive
        </span>
        <span className="text-sm font-medium">Créditos ilimitados</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Créditos del mes
        </span>
        <span className="text-xs font-medium">
          {summary.totalUsed} / {summary.totalLimit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, summary.percentUsed)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
        Se reinician en {summary.daysUntilReset} días
      </p>
    </div>
  );
}

// ============================================================================
// FEATURE USAGE CARD (for specific feature tracking)
// ============================================================================

interface FeatureUsageCardProps {
  featureName: string;
  used: number;
  limit: number;
  isPremiumLocked?: boolean;
  icon?: string;
  onUpgrade?: () => void;
}

export function FeatureUsageCard({
  featureName,
  used,
  limit,
  isPremiumLocked = false,
  icon = 'auto_awesome',
  onUpgrade,
}: FeatureUsageCardProps) {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);

  const getBarColor = () => {
    if (isPremiumLocked) return 'bg-gray-400';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-rounded ${isPremiumLocked ? 'text-gray-400' : 'text-blue-500'}`}
            style={{ fontSize: '18px' }}
          >
            {isPremiumLocked ? 'lock' : icon}
          </span>
          <span className="text-sm font-medium">{featureName}</span>
        </div>
        {isPremiumLocked ? (
          <button
            onClick={onUpgrade}
            className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            Upgrade
          </button>
        ) : (
          <span className="text-xs text-gray-500">
            {limit === -1 ? `${used} usados` : `${used}/${limit}`}
          </span>
        )}
      </div>

      {!isPremiumLocked && limit !== -1 && (
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default CreditsBadge;
