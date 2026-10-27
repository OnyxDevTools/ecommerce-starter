// filename: modules/carts/service.ts
import "server-only";
import { randomUUID } from "node:crypto";
import type { Store } from "../../lib/repository";
import { CartItems, type CartItem } from "../../lib/domain";
import { ensure } from "../../lib/errors";
import { locked, now, put } from "../../lib/data";
import { catalog, settings } from "../catalog/service";
import { available } from "../inventory/service";
import { totals } from "../../lib/money";
export async function quote(
  store: Store,
  items: CartItem[],
  allowUnavailable = false,
) {
  const config = await settings(store),
    data = await catalog(store);
  const lines = [];
  for (const item of CartItems.parse(items)) {
    const v = data.variants.find((v) => v.id === item.variantId),
      p = data.products.find((p) => p.id === v?.productId);
    if (allowUnavailable && (!v || !p)) {
      lines.push({
        variantId: item.variantId,
        productId: "",
        name: "Unavailable item",
        variant: "Remove this item before checkout",
        sku: "",
        unitPrice: 0,
        quantity: item.quantity,
        total: 0,
        available: 0,
        image: "/products/cup.webp",
        unlimited: false,
      });
      continue;
    }
    ensure(
      v && p,
      422,
      "A product in this bag is no longer available. Remove it before checkout.",
    );
    ensure(
      v.currency === config.currency,
      422,
      "Product currency no longer matches this store.",
    );
    lines.push({
      variantId: v.id,
      productId: p.id,
      name: p.name,
      variant: v.name,
      sku: v.sku,
      unitPrice: v.price,
      quantity: item.quantity,
      total: v.price * item.quantity,
      available: await available(store, v),
      image: JSON.parse(p.images)[0] as string,
      unlimited: v.unlimited,
    });
  }
  return { lines, currency: config.currency, ...totals(lines, config) };
}
export async function readCart(store: Store, id: string) {
  const cart = await store.get("Cart", id);
  const items = cart ? CartItems.parse(JSON.parse(cart.items)) : [];
  return {
    items,
    version: cart?.version || "",
    orderId: cart?.orderId || "",
    ...(await quote(store, items, true)),
  };
}
export async function changeCart(
  store: Store,
  id: string,
  variantId: string,
  quantity: number,
  expected: string,
) {
  ensure(
    Number.isInteger(quantity) && quantity >= 0 && quantity <= 20,
    422,
    "Quantity must be between 0 and 20.",
  );
  return locked(store, async () => {
    const cart = await store.get("Cart", id);
    ensure(
      (cart?.version || "") === expected,
      409,
      "Your bag changed. Reload it and retry.",
    );
    if (cart?.orderId) {
      const order = await store.get("Order", cart.orderId);
      ensure(
        !order || !["preparing", "pending"].includes(order.payment),
        409,
        "Finish or cancel your pending checkout first.",
      );
    }
    const items = cart ? CartItems.parse(JSON.parse(cart.items)) : [];
    const updated = CartItems.parse([
      ...items.filter((x) => x.variantId !== variantId),
      ...(quantity ? [{ variantId, quantity }] : []),
    ]);
    if (quantity) await quote(store, [{ variantId, quantity }]);
    await put(store, "Cart", {
      id,
      items: JSON.stringify(updated),
      version: randomUUID(),
      orderId: "",
      updatedAt: now(),
    });
    return readCart(store, id);
  });
}
