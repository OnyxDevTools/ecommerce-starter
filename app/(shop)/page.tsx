// filename: app/(shop)/page.tsx
import Image from "next/image";
import { services } from "@/lib/server";
import { catalog } from "@/modules/catalog/service";
import { ProductCard } from "@/components/product-card";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const data = await catalog(services().store);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">THE EVERYDAY COLLECTION / 01</span>
          <h1>
            Good things.
            <br />
            For the <em>ordinary.</em>
          </h1>
          <p>
            A few well-considered pieces for slower mornings, busy days, and
            everything in between.
          </p>
          <a href="/shop" className="button">
            Find your everyday →
          </a>
          <div className="hero-note">
            <span>↗</span>
            <p>
              Useful by nature.
              <br />
              Thoughtful by design.
            </p>
          </div>
        </div>
        <div className="hero-art">
          <Image
            src="/products/hero.webp"
            alt="A sculptural green lamp, ceramic cup and everyday notebook arranged on a warm ivory surface"
            width={1400}
            height={1100}
            priority
            sizes="(max-width: 800px) 100vw, 55vw"
          />
          <span className="hero-label">A little better, every day.</span>
        </div>
      </section>
      <div className="principles">
        <span>01 &nbsp; Simple, useful design</span>
        <span>02 &nbsp; Made for daily rituals</span>
        <span>03 &nbsp; Less, but considered</span>
      </div>
      <section className="container collection">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD COMPANY FOR YOUR DAY</span>
            <h2>The everyday edit.</h2>
          </div>
          <a href="/shop">Explore all pieces ↗</a>
        </div>
        <div className="product-grid">
          {data.products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} variants={data.variants} />
          ))}
        </div>
      </section>
      <section className="story">
        <span className="eyebrow">A SMALLER, BETTER COLLECTION</span>
        <h2>
          Objects you reach for.
          <br />
          Again, and again.
        </h2>
        <p>
          From a favorite morning cup to a bag that goes everywhere, we believe
          the everyday deserves a little attention.
        </p>
        <a href="/shop?category=home">Make yourself at home ↗</a>
      </section>
    </>
  );
}
