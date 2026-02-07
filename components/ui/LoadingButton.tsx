import React from 'react';
import Loader from '../Loader';

export interface LoadingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: string;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantClasses = {
  primary: 'bg-primary text-white shadow-soft shadow-primary/30 hover:shadow-lg',
  secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  outline:
    'border-2 border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20',
  ghost: 'text-primary hover:bg-primary/10 dark:hover:bg-primary/20'
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg'
};

/**
 * Reusable LoadingButton component
 * Button with built-in loading state and spinner
 */
export function LoadingButton({
  children,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  type = 'button',
  className = ''
}: LoadingButtonProps) {
  const baseClasses = 'rounded-2xl font-semibold transition-all flex items-center justify-center gap-2';
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || isLoading
    ? 'opacity-50 cursor-not-allowed'
    : 'active:scale-95 cursor-pointer';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${disabledClass} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader size="small" />
          <span>Cargando...</span>
        </>
      ) : (
        <>
          {icon && <span className="material-symbols-outlined text-xl">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * Icon-only loading button variant
 */
export interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel: string;
}

const iconSizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl'
};

export function IconButton({
  icon,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  ariaLabel
}: IconButtonProps) {
  const baseClasses = 'rounded-full flex items-center justify-center transition-all';
  const variantClass = variantClasses[variant];
  const sizeClass = iconSizeClasses[size];
  const disabledClass = disabled || isLoading
    ? 'opacity-50 cursor-not-allowed'
    : 'active:scale-95 cursor-pointer';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      aria-label={ariaLabel}
    >
      {isLoading ? (
        <Loader size="small" />
      ) : (
        <span className="material-symbols-outlined">{icon}</span>
      )}
    </button>
  );
}
