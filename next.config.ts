import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security: Disable production browser source maps (Checklist 1.5)
  productionBrowserSourceMaps: false,

  // Server external packages
  serverExternalPackages: ["@google/generative-ai"],

  // Allow Cesium assets and workers from public/cesium
  async headers() {
    return [
      {
        source: "/cesium/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Global security headers
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
