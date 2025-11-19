import React from 'react';
import SkeletonLoader from './SkeletonLoader';

interface LazyLoaderProps {
  type?: 'view' | 'grid' | 'modal' | 'analytics';
}

const LazyLoader: React.FC<LazyLoaderProps> = ({ type = 'view' }) => {
  if (type === 'grid') {
    return (
      <div className="p-6">
        <SkeletonLoader type="grid" count={8} />
      </div>
    );
  }

  if (type === 'analytics') {
    return (
      <div className="p-6">
        <SkeletonLoader type="analytics" />
      </div>
    );
  }

  if (type === 'modal') {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-4">
          <SkeletonLoader type="list" count={3} />
        </div>
      </div>
    );
  }

  // Default full-screen view loader with shimmer effect
  return (
    <div className="animate-fade-in w-full h-full flex flex-col items-center justify-center p-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
      <p className="mt-6 text-gray-600 dark:text-gray-400 text-sm font-medium">
        Cargando...
      </p>
    </div>
  );
};

export default LazyLoader;
