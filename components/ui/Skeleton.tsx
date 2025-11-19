import React from 'react';
import { Card } from './Card';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
}

const Skeleton = ({ variant = 'rectangular', width, height, className = '' }: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200/60 dark:bg-gray-700/60';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl aspect-square'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-label="Cargando..."
      role="status"
    />
  );
};

// Prebuilt skeleton patterns for common use cases
export const ClosetGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 p-4 pb-32 animate-fade-in">
    {Array.from({ length: 12 }).map((_, i) => (
      <Skeleton key={i} variant="card" />
    ))}
  </div>
);

export const OutfitCardSkeleton = () => (
  <Card variant="glass" padding="md" rounded="2xl" className="space-y-4">
    <div className="flex gap-3">
      <Skeleton variant="card" width={80} height={80} />
      <Skeleton variant="card" width={80} height={80} />
      <Skeleton variant="card" width={80} height={80} />
    </div>
    <Skeleton variant="text" width="100%" />
    <Skeleton variant="text" width="80%" />
  </Card>
);

export const ListItemSkeleton = () => (
  <Card variant="glass" padding="none" rounded="2xl" className="p-2 flex items-center gap-4">
    <Skeleton variant="circular" width={64} height={64} />
    <div className="flex-grow space-y-2">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
    </div>
  </Card>
);

export default Skeleton;
