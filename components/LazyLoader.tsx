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

  // Default full-screen view loader with professional design
  return (
    <div className="animate-fade-in w-full h-full flex flex-col items-center justify-center p-6 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div className="relative">
        {/* Animated rings */}
        <div className="absolute inset-0 w-20 h-20 border-4 border-primary/10 rounded-full animate-ping" />
        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        {/* Logo or Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary/60 text-2xl">checkroom</span>
        </div>
      </div>
      <p className="mt-6 text-gray-600 dark:text-gray-400 text-sm font-medium">
        Preparando tu experiencia...
      </p>
      <p className="mt-2 text-gray-400 dark:text-gray-500 text-xs">
        Esto tomará solo un momento
      </p>
    </div>
  );
};

export default LazyLoader;
