import { getDatabase } from "@/server/db/client";
export interface RateLimitResult { allowed: boolean; remaining: number; resetInMs: number }
/** Atomic fixed window; shared only by processes using the same SQLite file. */
export function checkRateLimit(key: string, limit=60, windowMs=60000): RateLimitResult {
  const now=Date.now();
  try {
    const row=getDatabase().prepare(`INSERT INTO rate_limits(key,count,reset_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,
      reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count,reset_at`).get(key,now+windowMs,now,now,now+windowMs);
    const count=Number(row?.count ?? limit+1);
    return {allowed:count<=limit,remaining:Math.max(0,limit-count),resetInMs:Math.max(0,Number(row?.reset_at ?? now+windowMs)-now)};
  } catch { return {allowed:false,remaining:0,resetInMs:windowMs}; }
}
export function pruneRateLimits(): void { getDatabase().prepare("DELETE FROM rate_limits WHERE reset_at < ?").run(Date.now()); }
