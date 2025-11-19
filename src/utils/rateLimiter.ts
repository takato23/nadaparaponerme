/**
 * Rate Limiter for Gemini API
 *
 * Implements token bucket algorithm to prevent 429 errors
 * Free tier limits: 15 requests/minute
 */

interface RateLimiterConfig {
  maxRequests: number;      // Max requests per window
  windowMs: number;          // Time window in milliseconds
  minDelayMs: number;        // Minimum delay between requests
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimiterConfig;
  private queue: Array<() => void> = [];
  private processing = false;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests || 10, // Conservative: 10 req/min (Gemini free = 15)
      windowMs: config.windowMs || 60000,    // 1 minute
      minDelayMs: config.minDelayMs || 6000, // 6 seconds between requests
    };
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for available slot
    await this.waitForSlot();

    // Record this request
    this.requests.push(Date.now());

    // Execute
    return fn();
  }

  /**
   * Wait until a slot is available
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        // Clean old requests outside window
        const now = Date.now();
        this.requests = this.requests.filter(
          (time) => now - time < this.config.windowMs
        );

        // Check if we have capacity
        if (this.requests.length < this.config.maxRequests) {
          // Check minimum delay from last request
          const lastRequest = this.requests[this.requests.length - 1] || 0;
          const timeSinceLastRequest = now - lastRequest;

          if (timeSinceLastRequest >= this.config.minDelayMs) {
            resolve();
            return;
          }

          // Wait for minimum delay
          const waitTime = this.config.minDelayMs - timeSinceLastRequest;
          setTimeout(checkSlot, waitTime);
          return;
        }

        // Wait until oldest request expires
        const oldestRequest = this.requests[0];
        const waitTime = this.config.windowMs - (now - oldestRequest);
        setTimeout(checkSlot, Math.max(waitTime, 1000)); // At least 1 second
      };

      checkSlot();
    });
  }

  /**
   * Reset limiter (useful for testing)
   */
  reset(): void {
    this.requests = [];
    this.queue = [];
    this.processing = false;
  }

  /**
   * Get current usage stats
   */
  getStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter(
      (time) => now - time < this.config.windowMs
    );

    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.config.maxRequests,
      queueLength: this.queue.length,
      utilizationPercent: Math.round(
        (recentRequests.length / this.config.maxRequests) * 100
      ),
    };
  }
}

// Global rate limiter instance for Gemini API
export const geminiRateLimiter = new RateLimiter({
  maxRequests: 10,   // Conservative limit (Gemini free tier = 15 RPM)
  windowMs: 60000,   // 1 minute window
  minDelayMs: 6000,  // 6 seconds between requests (10 requests/min = 1 request/6s)
});

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      const is429 =
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('RESOURCE_EXHAUSTED') ||
          error.message.includes('quota'));

      // If not a rate limit error, don't retry
      if (!is429) {
        throw error;
      }

      // If last attempt, throw
      if (attempt === maxRetries) {
        throw new Error(
          `Rate limit excedido después de ${maxRetries} intentos. Por favor espera 1 minuto e intenta de nuevo.`
        );
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;

      console.log(
        `🔄 Rate limit alcanzado (429), reintentando en ${Math.round(delay / 1000)}s... (intento ${attempt + 1}/${maxRetries})`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
