import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public path allowlist (all other /api/* routes are default-deny, Checklist 3.2)
const PUBLIC_API_PATHS = [
  "/api/system/status",
  "/api/system/health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply auth gate to /api/* routes
  if (pathname.startsWith("/api")) {
    const isPublic = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

    if (!isPublic) {
      const systemKey = process.env.SYSTEM_API_KEY;

      // Check header, Authorization bearer, or cookie
      const headerKey = request.headers.get("x-system-key");
      const authHeader = request.headers.get("authorization");
      const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
      const cookieKey = request.cookies.get("system_key")?.value;

      const providedKey = headerKey || bearerKey || cookieKey;

      const isKeyValid = Boolean(
        systemKey &&
        providedKey &&
        providedKey.length === systemKey.length &&
        crypto.subtle ? true : providedKey === systemKey
      );

      // In production/active deployment, reject if key is missing or mismatched
      if (!systemKey || !providedKey || providedKey !== systemKey) {
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
