import { getDatabase } from "@/server/db/client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * SQLite-backed persistent sliding window rate limiter.
 * Survives process restarts and cold starts (Checklist 6.3).
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60_000
): RateLimitResult {
  const db = getDatabase();
  const now = Date.now();

  try {
    // 1. Fetch current limit state for key
    const stmt = db.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?");
    const row = stmt.get(key) as { count: number; reset_at: number } | undefined;

    if (!row || now > row.reset_at) {
      // Initialize or reset window
      const resetAt = now + windowMs;
      const upsertStmt = db.prepare(`
        INSERT INTO rate_limits (key, count, reset_at)
        VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = ?
      `);
      upsertStmt.run(key, resetAt, resetAt);

      return {
        allowed: true,
        remaining: limit - 1,
        resetInMs: windowMs,
      };
    }

    if (row.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, row.reset_at - now),
      };
    }

    // Increment count
    const updateStmt = db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?");
    updateStmt.run(key);

    return {
      allowed: true,
      remaining: limit - (row.count + 1),
      resetInMs: Math.max(0, row.reset_at - now),
    };
  } catch (err) {
    // If rate limiter fails, fail safe (allow request with warning)
    console.warn("Rate limiter SQLite error:", err);
    return {
      allowed: true,
      remaining: 1,
      resetInMs: 0,
    };
  }
}

/**
 * Cleanup expired rate limit keys periodically.
 */
export function pruneRateLimits(): void {
  try {
    const db = getDatabase();
    const now = Date.now();
    const stmt = db.prepare("DELETE FROM rate_limits WHERE reset_at < ?");
    stmt.run(now);
  } catch (err) {
    console.error("Failed to prune rate limits:", err);
  }
}
