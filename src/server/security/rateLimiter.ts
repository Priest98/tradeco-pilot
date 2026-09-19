import { getDatabase } from "@/server/db/client";
export interface RateLimitResult { allowed: boolean; remaining: number; resetInMs: number }
const memoryWindows = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(key: string, limit: number, windowMs: number, now: number): RateLimitResult {
  const current = memoryWindows.get(key);
  const window = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };
  memoryWindows.set(key, window);
  return {
    allowed: window.count <= limit,
    remaining: Math.max(0, limit - window.count),
    resetInMs: Math.max(0, window.resetAt - now),
  };
}

/** Atomic fixed window; shared only by processes using the same SQLite file. */
export function checkRateLimit(key: string, limit=60, windowMs=60000): RateLimitResult {
  const now=Date.now();
  try {
    const row=getDatabase().prepare(`INSERT INTO rate_limits(key,count,reset_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,
      reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count,reset_at`).get(key,now+windowMs,now,now,now+windowMs);
    const count=Number(row?.count ?? limit+1);
    return {allowed:count<=limit,remaining:Math.max(0,limit-count),resetInMs:Math.max(0,Number(row?.reset_at ?? now+windowMs)-now)};
  } catch {
    // Serverless filesystems may be read-only. Keep per-instance protection instead
    // of rejecting every API request when the shared SQLite store is unavailable.
    return checkMemoryRateLimit(key, limit, windowMs, now);
  }
}
export function pruneRateLimits(): void { getDatabase().prepare("DELETE FROM rate_limits WHERE reset_at < ?").run(Date.now()); }
