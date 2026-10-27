// filename: app/admin/products/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
import { AdminTable } from "@/admin/table";
export default async function Page() {
  const rows = await all((await services()).store, "Product");
  return (
    <>
      <div className="section-heading">
        <h1>The collection.</h1>
        <a className="button" href="/admin/products/new">
          Add product →
        </a>
      </div>
      <AdminTable
        kind="plain"
        filterField="status"
        fields={[
          { key: "name", label: "Product" },
          { key: "categoryId", label: "Category" },
          { key: "status", label: "Status" },
          { key: "updatedAt", label: "Updated" },
        ]}
        rows={rows.map((p) => ({
          ...p,
          active: String(p.active),
          status: p.active ? "Published" : "Draft",
          href: `/admin/products/${p.id}`,
        }))}
      />
    </>
  );
}
