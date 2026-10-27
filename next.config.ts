// filename: next.config.ts
import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@onyx.dev/onyx-database",
    "firebase-admin",
    "nodemailer",
  ],
  images: {
    localPatterns: [{ pathname: "/products/**" }, { pathname: "/media/**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      ...[
        "/admin/:path*",
        "/account/:path*",
        "/orders/:path*",
        "/api/:path*",
        "/cart",
        "/checkout",
      ].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
    ];
  },
};
export default config;
