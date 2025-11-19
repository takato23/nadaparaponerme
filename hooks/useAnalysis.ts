import { useState, useCallback } from 'react';

export interface UseAnalysisOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
}

export interface UseAnalysisReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  execute: (analysisFunction: () => Promise<T>) => Promise<void>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * Custom hook for AI analysis operations
 * Handles loading, error states, and data management
 */
export function useAnalysis<T = any>({
  onSuccess,
  onError,
  initialData = null
}: UseAnalysisOptions<T> = {}): UseAnalysisReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (analysisFunction: () => Promise<T>) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await analysisFunction();
        setData(result);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        if (onError) {
          onError(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
    setData
  };
}
