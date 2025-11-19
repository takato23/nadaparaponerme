import React, { useEffect, useState } from 'react';

interface LoadingProgressProps {
  progress: number; // 0-100
  message?: string;
  estimatedTime?: number; // seconds remaining
  fullScreen?: boolean;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({
  progress,
  message = 'Procesando...',
  estimatedTime,
  fullScreen = false
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 50);
    return () => clearTimeout(timer);
  }, [progress]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-6 p-6 animate-scale-in">
      {/* Circular progress */}
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - displayProgress / 100)}`}
            className="text-primary transition-all duration-500 ease-smooth"
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-text-primary dark:text-gray-200">
            {Math.round(displayProgress)}%
          </span>
        </div>
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <p className="text-base font-medium text-text-primary dark:text-gray-200">
          {message}
        </p>
        {estimatedTime !== undefined && estimatedTime > 0 && (
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Tiempo estimado: {formatTime(estimatedTime)}
          </p>
        )}
      </div>

      {/* Progress bar (alternative visual) */}
      <div className="w-full max-w-xs">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-smooth rounded-full"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingProgress;
