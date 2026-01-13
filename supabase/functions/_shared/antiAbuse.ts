type RateLimitResult = {
  allowed: boolean;
  reason?: 'blocked' | 'rate_limited';
  retryAfterSeconds?: number;
  blockedUntil?: string | null;
};

const DEFAULT_LIMITS = {
  windowSeconds: 60,
  maxRequests: 12,
  errorThreshold: 10,
  errorWindowSeconds: 300,
  blockSeconds: 900,
};

export async function enforceRateLimit(
  supabase: any,
  userId: string,
  feature: string,
  overrides?: Partial<typeof DEFAULT_LIMITS>
): Promise<RateLimitResult> {
  const limits = { ...DEFAULT_LIMITS, ...(overrides || {}) };

  try {
    const { data, error } = await supabase.rpc('check_ai_rate_limit', {
      p_user_id: userId,
      p_feature: feature,
      p_window_seconds: limits.windowSeconds,
      p_max_requests: limits.maxRequests,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) return { allowed: true };

    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason || 'rate_limited',
        retryAfterSeconds: result.retry_after_seconds || undefined,
        blockedUntil: result.blocked_until || null,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
}

export async function recordRequestResult(
  supabase: any,
  userId: string,
  feature: string,
  success: boolean,
  overrides?: Partial<typeof DEFAULT_LIMITS>
): Promise<void> {
  const limits = { ...DEFAULT_LIMITS, ...(overrides || {}) };

  try {
    await supabase.rpc('record_ai_request_result', {
      p_user_id: userId,
      p_feature: feature,
      p_success: success,
      p_error_threshold: limits.errorThreshold,
      p_error_window_seconds: limits.errorWindowSeconds,
      p_block_seconds: limits.blockSeconds,
    });
  } catch (error) {
    console.error('Failed to record request result:', error);
  }
}
