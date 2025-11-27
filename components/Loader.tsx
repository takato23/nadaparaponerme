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

  const textSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const content = (
    <div
      className="flex flex-col items-center justify-center gap-4 animate-fade-in"
      role="status"
      aria-label={text || "Cargando"}
    >
      <div className="relative">
        {/* Outer ring */}
        <div className={`${spinnerSize[size]} rounded-full border-4 border-primary/20`}></div>
        {/* Inner ring (animated) */}
        <div className={`absolute top-0 left-0 ${spinnerSize[size]} rounded-full border-4 border-primary border-t-transparent animate-spin`}></div>
      </div>

      {text && (
        <p className={`text-text-secondary dark:text-gray-400 font-medium animate-pulse ${textSize[size]}`}>
          {text}
        </p>
      )}
      <span className="sr-only">{text || "Cargando contenido..."}</span>
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
