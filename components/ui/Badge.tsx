import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  default: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  primary: 'bg-primary/20 text-primary border border-primary/30',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base'
};

/**
 * Reusable Badge component
 * Used for priority indicators, quality badges, tags, etc.
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 rounded-full font-medium';
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const interactiveClass = onClick
    ? 'cursor-pointer hover:opacity-80 transition-opacity'
    : '';

  return (
    <span
      className={`${baseClasses} ${variantClass} ${sizeClass} ${interactiveClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

/**
 * Priority Badge - Specialized badge for priority levels
 */
export interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const labels = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja'
  };

  const variants = {
    high: 'error' as const,
    medium: 'warning' as const,
    low: 'info' as const
  };

  return (
    <Badge variant={variants[priority]} size="sm" className={className}>
      {labels[priority]}
    </Badge>
  );
}

/**
 * Quality Badge - Specialized badge for quality ratings
 */
export interface QualityBadgeProps {
  quality: number;
  className?: string;
}

export function QualityBadge({ quality, className }: QualityBadgeProps) {
  const getVariant = (q: number) => {
    if (q >= 8) return 'success';
    if (q >= 6) return 'info';
    if (q >= 4) return 'warning';
    return 'error';
  };

  return (
    <Badge variant={getVariant(quality)} size="sm" className={className}>
      ⭐ {quality}/10
    </Badge>
  );
}
