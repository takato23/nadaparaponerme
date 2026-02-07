import React from 'react';

type CardVariant = 'default' | 'glass' | 'primary' | 'secondary';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type CardRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  rounded?: CardRounded;
  component?: React.ElementType;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
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
  lg: 'p-6',
  xl: 'p-8',
};

const roundedClasses = {
  none: '',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

/**
 * Reusable Card component
 * Replaces repetitive liquid-glass divs throughout the app
 */
export const Card = React.forwardRef<HTMLElement, CardProps>(function Card({
  children,
  className = '',
  variant = 'glass',
  padding = 'lg',
  rounded = '2xl',
  component: Component = 'div',
  ...rest
}, ref) {
  const Tag = Component as React.ElementType;
  const baseClasses = variantClasses[variant];
  const paddingClass = paddingClasses[padding];
  const roundedClass = roundedClasses[rounded];

  const interactiveClasses = typeof rest.onClick === 'function'
    ? 'cursor-pointer transition-transform active:scale-95 hover:shadow-lg'
    : '';

  return (
    <Tag
      ref={ref as React.Ref<any>}
      className={`${baseClasses} ${paddingClass} ${roundedClass} ${interactiveClasses} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
});

Card.displayName = 'Card';
