import React, { useState, useEffect } from 'react';
import { loadingMessages } from '../../data/helpContent';

interface LoadingStateProps {
  type?: keyof typeof loadingMessages | 'default';
  customMessages?: string[];
  title?: string;
  showProgress?: boolean;
  variant?: 'fullscreen' | 'inline' | 'overlay';
}

const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'default',
  customMessages,
  title,
  showProgress = true,
  variant = 'inline'
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const messages = customMessages ||
    (type !== 'default' && loadingMessages[type]) ||
    ['Procesando...', 'Un momento...', 'Casi listo...'];

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  // Simulate progress
  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we approach 100
        const increment = Math.max(1, Math.floor((100 - prev) / 10));
        const newProgress = prev + increment;
        return Math.min(newProgress, 95); // Never reach 100 until actually done
      });
    }, 500);

    return () => clearInterval(interval);
  }, [showProgress]);

  const containerClasses = {
    fullscreen: 'fixed inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm',
    inline: 'py-12 px-4',
    overlay: 'absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl'
  };

  return (
    <div className={`
      flex flex-col items-center justify-center
      ${containerClasses[variant]}
      animate-fade-in
    `}>
      {/* Animated loader */}
      <div className="relative mb-6">
        {/* Outer ring */}
        <div className="w-20 h-20 rounded-full border-4 border-gray-200 dark:border-slate-700" />

        {/* Spinning gradient ring */}
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: 'var(--color-primary)',
            borderRightColor: 'var(--color-secondary)',
            animationDuration: '1s'
          }}
        />

        {/* Inner pulsing circle */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-2xl animate-bounce-slow">
            auto_awesome
          </span>
        </div>
      </div>

      {/* Title */}
      {title && (
        <h3 className="text-lg font-bold text-text-primary dark:text-gray-100 mb-2">
          {title}
        </h3>
      )}

      {/* Rotating message */}
      <div className="h-6 flex items-center justify-center">
        <p className="text-text-secondary dark:text-gray-400 text-center animate-fade-in" key={messageIndex}>
          {messages[messageIndex]}
        </p>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-48 mt-4">
          <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary dark:text-gray-500 text-center mt-2">
            {progress}%
          </p>
        </div>
      )}

      {/* Helpful tip */}
      <div className="mt-8 flex items-center gap-2 text-xs text-text-secondary/70 dark:text-gray-500">
        <span className="material-symbols-outlined text-sm">lightbulb</span>
        <span>La IA está trabajando en tu solicitud</span>
      </div>
    </div>
  );
};

export default LoadingState;

// Preset loading states for common operations
export const OutfitGenerationLoader: React.FC = () => (
  <LoadingState
    type="generate-outfit"
    title="Creando tu outfit"
  />
);

export const ItemAnalysisLoader: React.FC = () => (
  <LoadingState
    type="analyze-item"
    title="Analizando prenda"
  />
);

export const VirtualTryOnLoader: React.FC = () => (
  <LoadingState
    type="virtual-tryon"
    title="Preparando probador"
  />
);

export const SmartPackerLoader: React.FC = () => (
  <LoadingState
    type="smart-packer"
    title="Preparando tu maleta"
  />
);

export const StyleDNALoader: React.FC = () => (
  <LoadingState
    type="style-dna"
    title="Analizando tu estilo"
  />
);

export const ChatLoader: React.FC = () => (
  <LoadingState
    type="chat"
    showProgress={false}
    variant="inline"
  />
);

// Simple inline spinner
export const InlineSpinner: React.FC<{ text?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  text = 'Cargando...',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full border-2 border-gray-200 dark:border-slate-700
          border-t-primary animate-spin
        `}
      />
      {text && (
        <span className="text-sm text-text-secondary dark:text-gray-400">
          {text}
        </span>
      )}
    </div>
  );
};
