// filename: app/admin/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
import { Maintenance } from "@/admin/forms";
export default async function Page() {
  const { store } = await services(),
    [products, orders, reservations] = await Promise.all([
      all(store, "Product"),
      all(store, "Order"),
      all(store, "Reservation"),
    ]);
  return (
    <>
      <span className="eyebrow">A LITTLE ORDER BEHIND THE EVERYDAY</span>
      <h1>Your store, at a glance.</h1>
      <div className="stats">
        {[
          ["Products", products.length],
          ["Orders", orders.length],
          [
            "Awaiting fulfillment",
            orders.filter(
              (o) =>
                ["paid", "simulated"].includes(o.payment) &&
                o.fulfillment === "unfulfilled",
            ).length,
          ],
          [
            "Held units",
            reservations
              .filter((r) => r.state === "held")
              .reduce((n, r) => n + r.quantity, 0),
          ],
        ].map(([label, n]) => (
          <div className="panel" key={label}>
            <span>{label}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Make room for the next good thing.</h2>
        <p>
          Manage your collection, keep inventory up to date, and follow each
          order from checkout to delivery.
        </p>
        <a className="button" href="/admin/products/new">
          Add a product →
        </a>
      </div>
      <section className="panel">
        <h2>Recovery & maintenance</h2>
        <p>
          Reconcile pending payments, abandoned preparations and the email
          outbox. Unknown write outcomes may require operator lock recovery
          first.
        </p>
        <Maintenance />
      </section>
    </>
  );
}
