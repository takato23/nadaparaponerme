import React from 'react';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
}

const Loader = ({ size = 'medium', text, fullScreen = false }: LoaderProps) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const spinnerSize = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="relative">
        {/* Outer ring */}
        <div className={`${spinnerSize[size]} rounded-full border-4 border-primary/20`}></div>
        {/* Spinning ring */}
        <div className={`absolute inset-0 ${spinnerSize[size]} rounded-full border-4 border-transparent border-t-primary animate-spin`}></div>
        {/* Inner pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
        </div>
      </div>
      {text && (
        <p className="text-sm font-medium text-text-secondary dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
