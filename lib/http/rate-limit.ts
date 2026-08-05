/**
 * In-memory fixed-window rate limiter.
 *
 * Single-process only: each server instance keeps its own counters, so this
 * does not coordinate across multiple instances/replicas. That's an accepted
 * tradeoff for this app's current single-instance deployment — if this is ever
 * deployed across multiple instances, replace the Map below with a shared
 * store (e.g. Redis) so limits are enforced globally, not per-instance.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Bound memory growth: opportunistically sweep expired entries instead of
// running a timer (keeps this module side-effect-free at import time).
function sweepExpired(now: number): void {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key unique bucket key, e.g. `login:ip:1.2.3.4` or `login:email:a@b.com`
 * @param maxAttempts attempts allowed per window
 * @param windowMs window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 10_000) sweepExpired(now);

  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP extraction behind a proxy/load balancer. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
