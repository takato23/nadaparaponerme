import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'primary' | 'secondary';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const variantClasses = {
  default: 'bg-white dark:bg-gray-800 shadow-soft',
  glass: 'liquid-glass',
  primary: 'bg-primary text-white shadow-soft shadow-primary/30',
  secondary: 'bg-gray-100 dark:bg-gray-700'
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

const roundedClasses = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl'
};

/**
 * Reusable Card component
 * Replaces repetitive liquid-glass divs throughout the app
 */
export function Card({
  children,
  className = '',
  onClick,
  variant = 'glass',
  padding = 'lg',
  rounded = '2xl'
}: CardProps) {
  const baseClasses = variantClasses[variant];
  const paddingClass = paddingClasses[padding];
  const roundedClass = roundedClasses[rounded];

  const interactiveClasses = onClick
    ? 'cursor-pointer transition-transform active:scale-95 hover:shadow-lg'
    : '';

  return (
    <div
      className={`${baseClasses} ${paddingClass} ${roundedClass} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
