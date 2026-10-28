import redis from "@/lib/redis";

export interface ServerRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter for Node route handlers.
 *
 * Middleware runs on the Edge runtime and cannot open a Redis socket, so its
 * in-memory shield is only a first pass. Sensitive routes (OTP, login, order
 * creation, payment verification, uploads) call this helper, which is shared
 * across every app instance and survives a restart.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<ServerRateLimitResult> {
  const window = Math.floor(Date.now() / windowMs);
  const redisKey = `ratelimit:${key}:${window}`;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
  };
}

export function rateLimitHeaders(
  result: ServerRateLimitResult
): Record<string, string> {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
