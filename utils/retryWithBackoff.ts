/**
 * Retry Mechanism with Exponential Backoff
 * Handles transient failures with intelligent retry logic
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number, nextDelay: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise with the result or throws on final failure
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: Error;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt);
      const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
      const nextDelay = Math.min(exponentialDelay + jitter, maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1, nextDelay);
      }

      // Wait before retrying
      await sleep(nextDelay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError!;
}

/**
 * Default retry decision logic
 * Determines if an error is retryable based on common patterns
 */
function defaultShouldRetry(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors (retryable)
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('etimedout')
  ) {
    return true;
  }

  // HTTP status codes (retryable)
  if (
    message.includes('429') || // Rate limit
    message.includes('503') || // Service unavailable
    message.includes('502') || // Bad gateway
    message.includes('504')    // Gateway timeout
  ) {
    return true;
  }

  // AI/API errors (retryable)
  if (
    message.includes('overloaded') ||
    message.includes('unavailable') ||
    message.includes('resource_exhausted') ||
    message.includes('deadline')
  ) {
    return true;
  }

  // Client errors (not retryable)
  if (
    message.includes('400') || // Bad request
    message.includes('401') || // Unauthorized
    message.includes('403') || // Forbidden
    message.includes('404') || // Not found
    message.includes('422')    // Unprocessable entity
  ) {
    return false;
  }

  // Default: retry on unknown errors (conservative approach)
  return true;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with detailed result tracking (doesn't throw)
 * Useful when you want to handle retry failures gracefully
 */
export async function retryWithBackoffSafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const data = await retryWithBackoff(fn, {
      ...options,
      onRetry: (error, attempt, delay) => {
        attempts = attempt;
        options.onRetry?.(error, attempt, delay);
      },
    });

    return {
      data,
      attempts,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      attempts,
      totalTime: Date.now() - startTime,
    };
  }
}

/**
 * Specialized retry for AI operations
 * Has specific retry logic for common AI API errors
 */
export async function retryAIOperation<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 2000, // AI operations may need more time
    maxDelay: 60000, // Up to 1 minute for AI
    backoffFactor: 2.5, // Slightly more aggressive backoff
    shouldRetry: (error) => {
      const message = error.message.toLowerCase();

      // Don't retry if quota is exceeded (different from rate limiting)
      if (
        message.includes('exceeded your current quota') ||
        message.includes('billing')
      ) {
        return false; // Don't retry quota exhaustion - user needs to wait or upgrade
      }

      // Retry on temporary rate limits and server overload
      if (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('resource_exhausted') ||
        message.includes('overloaded') ||
        message.includes('503') ||
        message.includes('unavailable')
      ) {
        return true;
      }

      // Don't retry on validation errors
      if (
        message.includes('invalid') ||
        message.includes('malformed') ||
        message.includes('bad request') ||
        message.includes('400')
      ) {
        return false;
      }

      // Retry on network/timeout errors
      if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('deadline')
      ) {
        return true;
      }

      return false;
    },
    onRetry: (error, attempt, delay) => {
      console.warn(
        `AI operation failed (attempt ${attempt}/3), retrying in ${Math.round(delay)}ms...`,
        error.message
      );
      onRetry?.(attempt, delay);
    },
  });
}

/**
 * Specialized retry for network operations
 */
export async function retryNetworkOperation<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    shouldRetry: (error) => {
      const message = error.message.toLowerCase();

      // Retry on network errors
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      );
    },
    onRetry: (error, attempt, delay) => {
      console.warn(
        `Network operation failed (attempt ${attempt}/2), retrying in ${Math.round(delay)}ms...`,
        error.message
      );
      onRetry?.(attempt, delay);
    },
  });
}

/**
 * Create a retry wrapper that can be reused
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}
