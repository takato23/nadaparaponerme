const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldRetry(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  return (
    message.includes('429') ||
    message.toLowerCase().includes('rate') ||
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('resource_exhausted') ||
    message.toLowerCase().includes('overloaded')
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 2000;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!shouldRetry(error) || attempt >= retries) {
        throw error;
      }
      const jitter = Math.random() * 150;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt + jitter);
      await sleep(delay);
      attempt += 1;
    }
  }
}
