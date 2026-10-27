// filename: app/robots.ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
  return {
    rules:
      process.env.APP_ENV === "production"
        ? {
            userAgent: "*",
            allow: "/",
            disallow: [
              "/admin",
              "/api",
              "/cart",
              "/checkout",
              "/orders",
              "/account",
              "/sign-in",
              "/sign-up",
            ],
          }
        : { userAgent: "*", disallow: "/" },
    sitemap: `${origin}/sitemap.xml`,
  };
}
