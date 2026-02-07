/**
 * UI Components Index
 * Central export for all reusable UI components
 * Import pattern: import { Button, Card, Badge } from './components/ui'
 */

// Core Button System (new unified component)
export { Button, IconButton as IconBtn, ButtonGroup } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps as IconBtnProps, ButtonGroupProps } from './Button';

// Card Components
export { Card } from './Card';
export type { CardProps } from './Card';

// Badge Components
export { Badge, PriorityBadge, QualityBadge } from './Badge';
export type { BadgeProps, PriorityBadgeProps, QualityBadgeProps } from './Badge';

// State Components
export { EmptyState, EmptyStates } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Legacy Button Components (kept for backward compatibility)
export { LoadingButton, IconButton } from './LoadingButton';
export type { LoadingButtonProps, IconButtonProps } from './LoadingButton';

// Product Display
export { ProductCard, ProductGrid } from './ProductCard';
export type { Product, ProductCardProps, ProductGridProps } from './ProductCard';

// Loading & Skeleton
export {
  default as Skeleton,
  ClosetGridSkeleton,
  CardSkeleton,
  TextSkeleton,
  AvatarSkeleton
} from './Skeleton';

// Modal & Overlay
export { default as Modal } from './Modal';
export { default as BottomSheet } from './BottomSheet';
export { default as ConfirmDeleteModal } from './ConfirmDeleteModal';

// Navigation
export { FloatingDock } from './FloatingDock';

// Feedback
export { default as Toast } from './Toast';
export { default as PullToRefreshIndicator } from './PullToRefreshIndicator';

// Utility
export { TooltipWrapper } from './TooltipWrapper';
export { HelpIcon } from './HelpIcon';
