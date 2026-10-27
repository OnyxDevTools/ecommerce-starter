// filename: app/admin/orders/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
import { FulfillmentForm } from "@/admin/forms";
import { AdminTable } from "@/admin/table";
import { formatMoney } from "@/lib/money";
export default async function Page() {
  const rows = (await all((await services()).store, "Order")).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <>
      <h1>Orders.</h1>
      <AdminTable
        kind="plain"
        filterField="payment"
        fields={[
          { key: "name", label: "Order" },
          { key: "email", label: "Customer" },
          { key: "payment", label: "Payment" },
          { key: "mode", label: "Mode" },
          { key: "total", label: "Total" },
        ]}
        rows={rows.map((o) => ({
          id: o.id,
          name: o.id.slice(0, 8),
          email: o.email,
          payment: o.payment,
          mode: o.mode,
          total: formatMoney(o.total, o.currency),
          href: `/orders/${o.id}`,
        }))}
      />
      {rows
        .filter((o) => ["paid", "simulated"].includes(o.payment))
        .map((o) => (
          <div key={o.id} className="panel">
            <h2>
              {o.mode === "demo" ? "Demonstration order" : "Order"}{" "}
              {o.id.slice(0, 8)}
            </h2>
            <FulfillmentForm order={o} />
          </div>
        ))}
    </>
  );
}
