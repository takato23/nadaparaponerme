import React from 'react';
import { errorMessages } from '../../data/helpContent';

interface ErrorMessageProps {
  type?: keyof typeof errorMessages | 'custom';
  customError?: {
    title: string;
    message: string;
    action?: string;
  };
  onAction?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'toast' | 'fullscreen' | 'card';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type = 'general-error',
  customError,
  onAction,
  onDismiss,
  variant = 'inline'
}) => {
  const error = type === 'custom' ? customError : errorMessages[type] || errorMessages['general-error'];

  if (!error) return null;

  // Toast variant (floating notification)
  if (variant === 'toast') {
    return (
      <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-down">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-red-800 dark:text-red-200">{error.title}</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error.message}</p>
              {error.action && onAction && (
                <button
                  onClick={onAction}
                  className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
                >
                  {error.action} →
                </button>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen variant (blocking error)
  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-4xl">error</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-gray-100 mb-3">{error.title}</h2>
          <p className="text-text-secondary dark:text-gray-400 mb-6">{error.message}</p>
          {error.action && onAction && (
            <button
              onClick={onAction}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
              {error.action}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant (contained error)
  if (variant === 'card') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">error</span>
        </div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">{error.title}</h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error.message}</p>
        {error.action && onAction && (
          <button
            onClick={onAction}
            className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
          >
            {error.action}
          </button>
        )}
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
      <span className="material-symbols-outlined text-red-600 dark:text-red-400 flex-shrink-0">error</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-red-800 dark:text-red-200">{error.title}</h4>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error.message}</p>
        {error.action && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
          >
            {error.action} →
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;

// Preset error components for common errors
export const NetworkError: React.FC<{ onRetry: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onRetry, variant = 'inline' }) => (
  <ErrorMessage type="network-error" onAction={onRetry} variant={variant} />
);

export const AITimeoutError: React.FC<{ onRetry: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onRetry, variant = 'inline' }) => (
  <ErrorMessage type="ai-timeout" onAction={onRetry} variant={variant} />
);

export const EmptyClosetError: React.FC<{ onAddItems: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onAddItems, variant = 'card' }) => (
  <ErrorMessage type="closet-empty" onAction={onAddItems} variant={variant} />
);

export const ImageError: React.FC<{ onChooseAnother: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onChooseAnother, variant = 'inline' }) => (
  <ErrorMessage type="invalid-image" onAction={onChooseAnother} variant={variant} />
);

export const SaveError: React.FC<{ onRetry: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onRetry, variant = 'toast' }) => (
  <ErrorMessage type="save-failed" onAction={onRetry} variant={variant} />
);

export const AuthRequiredError: React.FC<{ onLogin: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onLogin, variant = 'card' }) => (
  <ErrorMessage type="auth-required" onAction={onLogin} variant={variant} />
);

export const FeatureLockedError: React.FC<{ onUpgrade: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onUpgrade, variant = 'card' }) => (
  <ErrorMessage type="feature-locked" onAction={onUpgrade} variant={variant} />
);

export const GenericError: React.FC<{ onRetry?: () => void; variant?: 'inline' | 'toast' | 'fullscreen' | 'card' }> = ({ onRetry, variant = 'inline' }) => (
  <ErrorMessage type="general-error" onAction={onRetry} variant={variant} />
);
