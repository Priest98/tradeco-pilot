import { checkRateLimit } from "./server/security/rateLimiter";
import { NextResponse, type NextRequest } from "next/server";
import { verifySystemKey } from "./server/security/auth";
const publicReads = ["/api/system/status", "/api/anomalies", "/api/events", "/api/forecasts", "/api/live", "/api/replay", "/api/briefing", "/api/tripwires", "/api/recon"];
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicRead = request.method === "GET" && publicReads.some(p => path === p || path.startsWith(p + "/"));
  if (!publicRead) {
    const key = request.headers.get("x-system-key") || request.headers.get("authorization")?.replace(/^Bearer /, "") || null;
    if (!verifySystemKey(key, path.startsWith("/api/cron/") ? process.env.CRON_SECRET : process.env.SYSTEM_API_KEY)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quota = checkRateLimit(request.method === "GET" ? "api:reads" : "api:writes", request.method === "GET" ? 600 : 12);
  if (!quota.allowed) return NextResponse.json({error:"Rate limit exceeded"},{status:429,headers:{"Retry-After":String(Math.ceil(quota.resetInMs/1000))}});
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export const config = { matcher: ["/api/:path*"], runtime: "nodejs" };
