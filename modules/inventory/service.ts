// filename: modules/inventory/service.ts
import "server-only";
import type { Store } from "../../lib/repository";
import { all, put } from "../../lib/data";
import { ensure } from "../../lib/errors";
import type { Rows } from "../../lib/domain";
export async function usage(store: Store, variantId: string) {
  return (await all(store, "Reservation", { variantId }))
    .filter((r) => r.state !== "released")
    .reduce((n, r) => n + r.quantity, 0);
}
export async function available(store: Store, v: Rows["Variant"]) {
  return v.unlimited
    ? 99999
    : Math.max(0, v.stock - (await usage(store, v.id)));
}
// Call only under the durable commerce lock. IDs are deterministic for replay.
export async function reserve(
  store: Store,
  order: Rows["Order"],
  lines: Rows["OrderLine"][],
) {
  for (const line of lines) {
    const v = await store.get("Variant", line.variantId);
    ensure(v, 422, "Variant no longer exists.");
    ensure(
      order.mode !== "stripe" || v.unlimited,
      409,
      "Live checkout for limited inventory is disabled until Onyx concurrency is qualified. Choose demonstration checkout.",
    );
    const existing = await store.get("Reservation", line.id);
    if (existing) continue;
    ensure(
      (await available(store, v)) >= line.quantity,
      409,
      `${line.name} is no longer available in that quantity.`,
    );
  }
  for (const line of lines)
    if (!(await store.get("Reservation", line.id)))
      await store.insert("Reservation", {
        id: line.id,
        orderId: order.id,
        variantId: line.variantId,
        quantity: line.quantity,
        state: "held",
        expiresAt: order.expiresAt,
      });
}
export async function release(store: Store, orderId: string) {
  for (const r of await all(store, "Reservation", { orderId }))
    if (r.state === "held")
      await put(store, "Reservation", { ...r, state: "released" });
}
export async function finalize(store: Store, orderId: string) {
  const rows = await all(store, "Reservation", { orderId });
  const lines = await all(store, "OrderLine", { orderId });
  if (
    !rows.length ||
    rows.length !== lines.length ||
    rows.some(
      (r) =>
        r.state === "released" ||
        !lines.some(
          (l) =>
            l.id === r.id &&
            l.quantity === r.quantity &&
            l.variantId === r.variantId,
        ),
    )
  )
    return false;
  for (const row of rows)
    if (row.state !== "finalized")
      await put(store, "Reservation", { ...row, state: "finalized" });
  return true;
}
