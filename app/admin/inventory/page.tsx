// filename: app/admin/inventory/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
import { available, usage } from "@/modules/inventory/service";
import { AdminTable } from "@/admin/table";
export default async function Page() {
  const { store } = await services(),
    variants = await all(store, "Variant");
  const rows = await Promise.all(
    variants.map(async (v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: v.unlimited ? "Unlimited" : String(v.stock),
      committed: String(await usage(store, v.id)),
      available: v.unlimited ? "Unlimited" : String(await available(store, v)),
      href: `/admin/products/${v.productId}`,
    })),
  );
  return (
    <>
      <h1>Inventory.</h1>
      <p>
        Held and finalized reservations consume stock. Edit total received units
        in the product’s variant.
      </p>
      <AdminTable
        kind="plain"
        fields={[
          { key: "name", label: "Variant" },
          { key: "sku", label: "SKU" },
          { key: "stock", label: "Total units" },
          { key: "committed", label: "Held / sold" },
          { key: "available", label: "Available" },
        ]}
        rows={rows}
      />
    </>
  );
}
