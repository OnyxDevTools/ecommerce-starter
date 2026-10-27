// filename: app/(shop)/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { services } from "@/lib/server";
import { actor, cartIdentity } from "@/lib/auth/identity";
import { all } from "@/lib/data";
import { AppError } from "@/lib/domain";
import { Totals } from "@/components/cart";
import { CancelOrder } from "@/components/checkout";
export const metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { store, orders } = services();
  let order;
  try {
    order = await orders.access(
      (await params).id,
      await cartIdentity(),
      await actor(),
    );
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const lines = await all(store, "OrderLine", { orderId: order.id });
  return (
    <div className="container narrow">
      <span className="eyebrow">
        {order.mode === "demo" ? "DEMONSTRATION ORDER" : "YOUR ORDER"}
      </span>
      <h1>
        {["simulated", "paid"].includes(order.payment)
          ? "Good things are on the way."
          : "Your order, at a glance."}
      </h1>
      {order.mode === "demo" && (
        <p className="notice">
          This is a simulated purchase. No money was charged and nothing will be
          shipped.
        </p>
      )}
      <p>Order {order.id}</p>
      <div className="status-row">
        <span>Payment: {order.payment.replace("_", " ")}</span>
        <span>Fulfillment: {order.fulfillment}</span>
      </div>
      {order.payment === "inventory_exception" && (
        <p className="error">
          Payment needs review because the inventory reservation is no longer
          available. Contact the store before fulfillment.
        </p>
      )}
      {lines.map((l) => (
        <div key={l.id} className="order-line">
          <strong>
            {l.quantity} × {l.name}
          </strong>
          <span>{l.variant}</span>
        </div>
      ))}
      <Totals bag={order} />
      {order.payment === "pending" && (
        <>
          <p>
            Payment is confirmed by the provider, not this return page. Refresh
            to see its latest verified status.
          </p>
          {order.sessionUrl && (
            <a className="button" href={order.sessionUrl}>
              Continue payment
            </a>
          )}
          <CancelOrder id={order.id} />
        </>
      )}
      <a href="/shop">Back to the collection →</a>
    </div>
  );
}
