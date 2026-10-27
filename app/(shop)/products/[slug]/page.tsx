// filename: app/(shop)/products/[slug]/page.tsx
import { cache } from "react";
import { notFound } from "next/navigation";
import { services } from "@/lib/server";
import { catalog, images } from "@/modules/catalog/service";
import { available } from "@/modules/inventory/service";
import { Gallery } from "@/components/gallery";
import { AddToBag } from "@/components/cart";
import { RichText } from "@/components/rich-text";
import { formatMoney, exponents } from "@/lib/money";
const load = cache(async (slug: string) => {
  const { store } = services(),
    data = await catalog(store),
    p = data.products.find((p) => p.slug === slug);
  if (!p) notFound();
  const variants = await Promise.all(
    data.variants
      .filter((v) => v.productId === p.id)
      .map(async (v) => ({ ...v, available: await available(store, v) })),
  );
  const gallery = await Promise.all(
    images(p.images).map(async (src, i) => {
      const media = src.startsWith("/media/")
        ? await store.get("Media", src.slice(7))
        : null;
      return {
        src,
        alt: media?.alt || `${p.name}, view ${i + 1}`,
        width: media?.width || 1000,
        height: media?.height || 1000,
      };
    }),
  );
  return { p, variants, gallery };
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { p } = await load((await params).slug);
  return {
    title: p.name,
    description: p.summary,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title: p.name,
      description: p.summary,
      images: images(p.images),
    },
  };
}
export default async function Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { p, variants, gallery } = await load((await params).slug),
    origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary,
    image: images(p.images).map((x) => origin + x),
    offers: variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      price: v.price / 10 ** exponents[v.currency],
      priceCurrency: v.currency,
      availability: `https://schema.org/${v.available ? "InStock" : "OutOfStock"}`,
      url: `${origin}/products/${p.slug}`,
    })),
  };
  return (
    <div className="container">
      <nav className="breadcrumb">
        <a href="/shop">The collection</a> / {p.name}
      </nav>
      <div className="product-detail">
        <Gallery images={gallery} />
        <section className="product-info">
          <span className="eyebrow">AN EVERYDAY ESSENTIAL</span>
          <h1>{p.name}</h1>
          <p className="intro">{p.summary}</p>
          {variants[0] && (
            <p className="price">
              From{" "}
              {formatMoney(
                Math.min(...variants.map((v) => v.price)),
                variants[0].currency,
              )}
            </p>
          )}
          <AddToBag variants={variants} />
          <details open>
            <summary>The details</summary>
            <RichText value={p.description} />
          </details>
          <details>
            <summary>Shipping & care</summary>
            <p>
              Shipping and configured tax are shown in your bag before checkout.
              Treat your pieces gently and follow the product care details.
            </p>
          </details>
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ld).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
