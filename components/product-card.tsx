// filename: components/product-card.tsx
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import type { Rows } from "@/lib/domain";
export function ProductCard({
  product,
  variants,
}: {
  product: Rows["Product"];
  variants: Rows["Variant"][];
}) {
  const price = Math.min(
      ...variants.filter((v) => v.productId === product.id).map((v) => v.price),
    ),
    currency = variants.find((v) => v.productId === product.id)?.currency,
    src = JSON.parse(product.images)[0] as string;
  return (
    <a className="product-card" href={`/products/${product.slug}`}>
      <div className="product-image">
        <Image
          src={src}
          alt={product.name}
          width={800}
          height={800}
          sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
          unoptimized={src.startsWith("/media/")}
        />
        <span className="image-arrow">↗</span>
      </div>
      <div className="product-title">
        <h3>{product.name}</h3>
        <span>
          {Number.isFinite(price) && currency
            ? formatMoney(price, currency)
            : "Coming soon"}
        </span>
      </div>
      <p>{product.summary}</p>
    </a>
  );
}
