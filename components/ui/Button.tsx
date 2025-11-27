import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * Button variants following the design system
 */
export type ButtonVariant =
  | 'primary'      // Main CTA buttons
  | 'secondary'    // Secondary actions
  | 'outline'      // Bordered buttons
  | 'ghost'        // Minimal buttons
  | 'glass'        // Glassmorphism style
  | 'ai'           // AI/magic themed
  | 'danger'       // Destructive actions
  | 'success';     // Success/confirm actions

/**
 * Button sizes
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

/**
 * Button props interface
 */
export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Left icon (Material Symbols name or React node) */
  leftIcon?: string | React.ReactNode;
  /** Right icon (Material Symbols name or React node) */
  rightIcon?: string | React.ReactNode;
  /** Children content */
  children?: React.ReactNode;
  /** Custom class names */
  className?: string;
  /** Disable animations */
  noAnimation?: boolean;
}

/**
 * Variant styles mapping
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary text-white',
    'hover:bg-primary/90 hover:shadow-glow',
    'active:bg-primary/80',
    'focus-visible:ring-2 focus-visible:ring-primary/50'
  ),
  secondary: cn(
    'bg-secondary text-white',
    'hover:bg-secondary/90',
    'active:bg-secondary/80',
    'focus-visible:ring-2 focus-visible:ring-secondary/50'
  ),
  outline: cn(
    'bg-transparent border-2 border-primary text-primary',
    'hover:bg-primary/10',
    'active:bg-primary/20',
    'focus-visible:ring-2 focus-visible:ring-primary/50'
  ),
  ghost: cn(
    'bg-transparent text-text-primary dark:text-gray-200',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    'active:bg-gray-200 dark:active:bg-gray-700',
    'focus-visible:ring-2 focus-visible:ring-gray-400/50'
  ),
  glass: cn(
    'liquid-glass text-text-primary dark:text-white',
    'hover:bg-white/30 dark:hover:bg-white/10',
    'active:bg-white/40 dark:active:bg-white/20',
    'focus-visible:ring-2 focus-visible:ring-white/50'
  ),
  ai: cn(
    'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white',
    'hover:shadow-glow hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600',
    'active:from-violet-700 active:via-purple-700 active:to-fuchsia-700',
    'focus-visible:ring-2 focus-visible:ring-purple-500/50'
  ),
  danger: cn(
    'bg-red-500 text-white',
    'hover:bg-red-600 hover:shadow-red-500/25',
    'active:bg-red-700',
    'focus-visible:ring-2 focus-visible:ring-red-500/50'
  ),
  success: cn(
    'bg-green-500 text-white',
    'hover:bg-green-600 hover:shadow-green-500/25',
    'active:bg-green-700',
    'focus-visible:ring-2 focus-visible:ring-green-500/50'
  )
};

/**
 * Size styles mapping
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-base gap-2 rounded-xl',
  lg: 'h-12 px-6 text-lg gap-2.5 rounded-2xl',
  xl: 'h-14 px-8 text-xl gap-3 rounded-2xl',
  icon: 'h-10 w-10 p-0 rounded-xl'
};

/**
 * Icon size mapping
 */
const iconSizes: Record<ButtonSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
  icon: 'text-xl'
};

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => (
  <svg
    className={cn('animate-spin', iconSizes[size])}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Icon renderer - handles both Material Symbols strings and React nodes
 */
const renderIcon = (
  icon: string | React.ReactNode,
  size: ButtonSize,
  className?: string
) => {
  if (typeof icon === 'string') {
    return (
      <span
        className={cn(
          'material-symbols-outlined',
          iconSizes[size],
          className
        )}
      >
        {icon}
      </span>
    );
  }
  return icon;
};

/**
 * Button Component
 *
 * A unified button system with multiple variants, sizes, and states.
 * Supports icons, loading states, and animations.
 *
 * @example
 * ```tsx
 * // Primary CTA
 * <Button variant="primary" size="lg">
 *   Get Started
 * </Button>
 *
 * // With icons
 * <Button variant="ai" leftIcon="auto_awesome">
 *   Generate
 * </Button>
 *
 * // Loading state
 * <Button variant="primary" isLoading>
 *   Saving...
 * </Button>
 *
 * // Icon only
 * <Button variant="ghost" size="icon" leftIcon="close" />
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className,
      noAnimation = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    // Base button styles
    const baseStyles = cn(
      // Layout
      'inline-flex items-center justify-center',
      // Touch optimization
      'touch-manipulation select-none',
      // Minimum touch target (44x44px)
      'min-h-[44px] min-w-[44px]',
      // Typography
      'font-semibold',
      // Transitions
      'transition-all duration-200 ease-out',
      // Disabled state
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
    );

    // Animation props for framer-motion
    const motionProps = noAnimation
      ? {}
      : {
          whileHover: isDisabled ? {} : { scale: 1.02 },
          whileTap: isDisabled ? {} : { scale: 0.98 },
          transition: { duration: 0.15, ease: 'easeOut' }
        };

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...motionProps}
        {...props}
      >
        {/* Loading spinner or left icon */}
        {isLoading ? (
          <LoadingSpinner size={size} />
        ) : leftIcon ? (
          renderIcon(leftIcon, size)
        ) : null}

        {/* Button text */}
        {children && (
          <span className={cn(isLoading && 'opacity-70')}>
            {children}
          </span>
        )}

        {/* Right icon */}
        {rightIcon && !isLoading && renderIcon(rightIcon, size)}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

/**
 * IconButton - Convenience wrapper for icon-only buttons
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: string | React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'icon', ...props }, ref) => (
    <Button ref={ref} size={size} leftIcon={icon} {...props} />
  )
);

IconButton.displayName = 'IconButton';

/**
 * ButtonGroup - Groups multiple buttons together
 */
export interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  className
}) => (
  <div
    className={cn(
      'inline-flex',
      orientation === 'horizontal' ? 'flex-row gap-2' : 'flex-col gap-2',
      className
    )}
    role="group"
  >
    {children}
  </div>
);

export default Button;
