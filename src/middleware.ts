import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public path allowlist (read-only telemetry accessible to tactical HUD)
const PUBLIC_READ_PATHS = [
  "/api/system/status",
  "/api/system/health",
  "/api/anomalies",
  "/api/events",
  "/api/forecasts",
  "/api/live",
];

// Constant-time key comparison to prevent timing side-channels (Checklist 3.1, CWE-208)
function timingSafeCheck(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply auth gate to /api/* routes
  if (pathname.startsWith("/api")) {
    const isPublicRead =
      request.method === "GET" &&
      PUBLIC_READ_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

    if (!isPublicRead) {
      const systemKey = process.env.SYSTEM_API_KEY;

      // Check header, Authorization bearer, or cookie
      const headerKey = request.headers.get("x-system-key");
      const authHeader = request.headers.get("authorization");
      const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
      const cookieKey = request.cookies.get("system_key")?.value;

      const providedKey = headerKey || bearerKey || cookieKey;

      // Constant-time validation
      if (!systemKey || !providedKey || !timingSafeCheck(providedKey, systemKey)) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Missing or invalid system security key. Provide 'x-system-key' header or valid session.",
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }
    }
  }

  const response = NextResponse.next();

  // Enforce defensive security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
