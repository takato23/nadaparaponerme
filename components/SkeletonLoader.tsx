import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'grid' | 'analytics';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`liquid-glass rounded-2xl overflow-hidden ${className}`}>
            <div className="w-full h-48 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-3/4" />
              <div className="h-3 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-1/2" />
              <div className="flex gap-2 mt-3">
                <div className="h-6 w-16 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded-full" />
                <div className="h-6 w-20 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded-full" />
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={`liquid-glass rounded-2xl p-4 space-y-3 ${className}`}>
            <div className="h-5 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-full" />
            <div className="h-5 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-5/6" />
            <div className="h-5 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-4/6" />
          </div>
        );

      case 'grid':
        return (
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="liquid-glass rounded-2xl overflow-hidden">
                <div className="aspect-square bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-3/4" />
                  <div className="h-3 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'analytics':
        return (
          <div className={`space-y-6 ${className}`}>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="liquid-glass rounded-2xl p-4 space-y-2">
                  <div className="h-8 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-16" />
                  <div className="h-4 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-full" />
                </div>
              ))}
            </div>
            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="liquid-glass rounded-2xl p-4">
                  <div className="h-6 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded w-1/2 mb-4" />
                  <div className="h-64 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-300 dark:via-gray-600 to-gray-200 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded" />
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (type === 'grid' || type === 'analytics') {
    return <>{renderSkeleton()}</>;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
};

export default SkeletonLoader;
