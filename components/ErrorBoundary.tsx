import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details (dev only via logger)
    logger.error('Error Boundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // TODO: Send error to error tracking service (Sentry, LogRocket, etc.) in production
    // Example: reportErrorToService(error, errorInfo);
  }

  handleReload = (): void => {
    // Clear error state and reload
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  handleGoBack = (): void => {
    // Clear error state and navigate back
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.history.back();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default ErrorPage
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full liquid-glass rounded-3xl p-8 text-center space-y-6">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ¡Ups! Algo salió mal
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
              </p>
            </div>

            {/* Error Details (dev only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left">
                <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                  Ver detalles técnicos
                </summary>
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs font-mono text-red-800 dark:text-red-300 overflow-auto max-h-40">
                  <p className="font-bold">{this.state.error.name}</p>
                  <p>{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleGoBack}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ← Volver
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
              >
                🔄 Recargar
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Si el problema persiste, intenta limpiar la caché del navegador o contacta soporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
