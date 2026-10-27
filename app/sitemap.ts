// filename: app/sitemap.ts
import type { MetadataRoute } from "next";
import { services } from "@/lib/server";
import { catalog } from "@/modules/catalog/service";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.APP_ENV !== "production") return [];
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new Error("Configure APP_ORIGIN");
  const data = await catalog(services().store);
  return [
    { url: origin },
    { url: `${origin}/shop` },
    ...data.products.map((p) => ({
      url: `${origin}/products/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
