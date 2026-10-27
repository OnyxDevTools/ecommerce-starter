// filename: app/admin/products/[id]/page.tsx
import { notFound } from "next/navigation";
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
import { ProductForm, VariantForm } from "@/admin/forms";
import { settings } from "@/modules/catalog/service";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { store } = await services(),
    product = id === "new" ? null : await store.get("Product", id);
  if (id !== "new" && !product) notFound();
  const categories = await all(store, "Category"),
    config = await settings(store),
    variants = product ? await all(store, "Variant", { productId: id }) : [];
  return (
    <>
      <a href="/admin/products">← Products</a>
      <h1>{product?.name || "A new everyday essential."}</h1>
      <ProductForm product={product} categories={categories} />
      {product && (
        <>
          <h2>Variants & inventory</h2>
          {variants.map((v) => (
            <VariantForm
              key={v.id}
              variant={v}
              productId={id}
              currency={config.currency}
            />
          ))}
          <VariantForm productId={id} currency={config.currency} />
        </>
      )}
    </>
  );
}
