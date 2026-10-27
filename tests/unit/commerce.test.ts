// filename: tests/unit/commerce.test.ts
import { beforeEach, describe, it, expect } from "vitest";
import { MemoryStore } from "../fixture/memory";
import { seed } from "../../scripts/seed";
import { Orders } from "../../modules/orders/service";
import { changeCart, readCart, quote } from "../../modules/carts/service";
import {
  saveProduct,
  saveVariant,
  saveSettings,
  administrator,
  settings,
} from "../../modules/catalog/service";
import { available, usage } from "../../modules/inventory/service";
import { locked, all, put } from "../../lib/data";
import { totals, formatMoney } from "../../lib/money";
import { CartItems, type Actor, type Rows } from "../../lib/domain";
import { parseDocument } from "../../modules/catalog/document";
import type { Payments, PaymentSession } from "../../modules/payments/provider";
class Provider implements Payments {
  sessions = new Map<string, PaymentSession>();
  creates = 0;
  async create(o: Rows["Order"]) {
    this.creates++;
    const s: PaymentSession = {
      id: `cs_${o.id}`,
      url: "https://checkout.stripe.com/test",
      orderId: o.id,
      status: "open",
      payment: "unpaid",
      total: o.total,
      currency: o.currency,
    };
    this.sessions.set(s.id, s);
    return s;
  }
  async retrieve(id: string) {
    const s = this.sessions.get(id);
    if (!s) throw Error("Provider outage");
    return s;
  }
  async expire(id: string) {
    this.sessions.set(id, { ...(await this.retrieve(id)), status: "expired" });
  }
  paid(id: string) {
    this.sessions.set(id, {
      ...this.sessions.get(id)!,
      status: "complete",
      payment: "paid",
    });
  }
}
const admin: Actor = {
    id: "admin",
    name: "Admin",
    email: "admin@example.test",
    admin: true,
  },
  alice: Actor = {
    id: "alice",
    name: "Alice",
    email: "alice@example.test",
    admin: false,
  },
  bob: Actor = { ...alice, id: "bob" };
const address = {
  name: "Jamie Example",
  email: "jamie@example.test",
  line1: "123 Sample Street",
  city: "Portland",
  postal: "97201",
  country: "US",
};
let store: MemoryStore, payments: Provider, orders: Orders;
async function bag(id = "bag", quantity = 1) {
  return changeCart(store, id, "cup-0", quantity, "");
}
async function buy(
  id = "bag",
  mode: "demo" | "stripe" = "demo",
  user: Actor | null = null,
) {
  const b = await bag(id);
  return orders.checkout(id, user, address, mode, b.version);
}
async function unlimited() {
  const v = (await store.get("Variant", "cup-0"))!;
  await put(store, "Variant", { ...v, unlimited: true });
  process.env.CHECKOUT_MODE = "stripe";
}
beforeEach(async () => {
  process.env.APP_ENV = "preview";
  process.env.CHECKOUT_MODE = "demo";
  process.env.EMAIL_MODE = "preview";
  store = new MemoryStore();
  payments = new Provider();
  orders = new Orders(store, payments);
  await seed(store);
});
describe("authoritative commerce", () => {
  it("calculates whole minor units with explicit rounding, including zero- and three-decimal currencies", async () => {
    const s = await settings(store);
    const result = totals([{ unitPrice: 101, quantity: 1 }], {
      ...s,
      shipping: 0,
      freeShipping: 0,
      taxBasisPoints: 5000,
      discountBasisPoints: 0,
    });
    expect(result.tax).toBe(51);
    expect(formatMoney(1234, "JPY")).toContain("1,234");
    expect(formatMoney(1234, "KWD")).toContain("1.234");
    expect(formatMoney(1234, "USD")).toBe("$12.34");
  });
  it("recalculates current server prices and stores immutable historical lines", async () => {
    const b = await bag();
    const v = (await store.get("Variant", "cup-0"))!;
    await put(store, "Variant", { ...v, price: 4100 });
    const o = await orders.checkout("bag", null, address, "demo", b.version);
    expect(o.subtotal).toBe(4100);
    await put(store, "Variant", { ...v, price: 10 });
    expect(
      (await all(store, "OrderLine", { orderId: o.id }))[0].unitPrice,
    ).toBe(4100);
    expect(o.payment).toBe("simulated");
    expect((await store.get("Notification", o.id))?.state).toBe("preview");
  });
  it("rejects stale cart updates, bad quantities, missing variants and duplicate items", async () => {
    const b = await bag();
    await expect(changeCart(store, "bag", "cup-0", 2, "")).rejects.toThrow(
      "bag changed",
    );
    await expect(
      changeCart(store, "bag", "cup-0", -1, b.version),
    ).rejects.toThrow();
    await expect(
      quote(store, [{ variantId: "missing", quantity: 1 }]),
    ).rejects.toThrow();
    expect(
      CartItems.safeParse([
        { variantId: "x", quantity: 1 },
        { variantId: "x", quantity: 1 },
      ]).success,
    ).toBe(false);
  });
  it("allows an unavailable item to be removed from a cart", async () => {
    const b = await bag(),
      v = (await store.get("Variant", "cup-0"))!;
    await put(store, "Variant", { ...v, active: false });
    expect((await readCart(store, "bag")).lines[0].available).toBe(0);
    await expect(
      orders.checkout("bag", null, address, "demo", b.version),
    ).rejects.toThrow();
    const result = await changeCart(store, "bag", "cup-0", 0, b.version);
    expect(result.lines).toHaveLength(0);
  });
  it("persists quantity changes and removal", async () => {
    const b = await bag();
    const changed = await changeCart(store, "bag", "cup-0", 3, b.version);
    expect(changed.subtotal).toBe(8400);
    expect(
      (await changeCart(store, "bag", "cup-0", 0, changed.version)).items,
    ).toEqual([]);
  });
  it("never accepts extra client prices or shipping destinations", async () => {
    const b = await bag();
    await expect(
      orders.checkout("bag", null, { ...address, total: 1 }, "demo", b.version),
    ).rejects.toThrow();
    await expect(
      orders.checkout(
        "bag",
        null,
        { ...address, country: "GB" },
        "demo",
        b.version,
      ),
    ).rejects.toThrow("ships only");
  });
  it("keeps demo checkout explicitly opted in and unavailable in production", async () => {
    process.env.APP_ENV = "production";
    await expect(buy()).rejects.toThrow("not enabled");
    expect(await all(store, "Order")).toHaveLength(0);
  });
  it("blocks real Stripe checkout for finite inventory", async () => {
    process.env.CHECKOUT_MODE = "stripe";
    await expect(buy("bag", "stripe")).rejects.toThrow("limited inventory");
    expect(payments.creates).toBe(0);
    expect(await all(store, "Order")).toHaveLength(0);
  });
  it("enforces stock limits across competing service instances using durable insert exclusion", async () => {
    const v = (await store.get("Variant", "cup-0"))!;
    await put(store, "Variant", { ...v, stock: 1 });
    const a = await bag("a"),
      b = await bag("b"),
      other = new Orders(store, payments);
    const results = await Promise.allSettled([
      orders.checkout("a", null, address, "demo", a.version),
      other.checkout("b", null, address, "demo", b.version),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await usage(store, "cup-0")).toBe(1);
    const loser = results[0].status === "rejected" ? ["a", a] : ["b", b];
    await expect(
      other.checkout(
        loser[0] as string,
        null,
        address,
        "demo",
        (loser[1] as typeof a).version,
      ),
    ).rejects.toThrow("out of stock");
    expect(await available(store, { ...v, stock: 1 })).toBe(0);
  });
  it("retains uncertain locks rather than stealing them on a new instance", async () => {
    await expect(
      locked(store, async () => {
        throw Error("Ambiguous transport");
      }),
    ).rejects.toThrow();
    expect(await store.get("CommerceLock", "commerce")).not.toBeNull();
    await expect(locked(store, async () => 42)).rejects.toThrow("Duplicate");
  });
  it("recovers interrupted preparation and releases reservations after restart", async () => {
    await unlimited();
    const o = await buy("bag", "stripe");
    await put(store, "Order", { ...o, payment: "preparing" });
    await new Orders(store, payments).maintain();
    expect((await store.get("Order", o.id))?.payment).toBe("cancelled");
    expect(await usage(store, "cup-0")).toBe(0);
  });
  it("expires a pending provider session and releases stock idempotently", async () => {
    await unlimited();
    const o = await buy("bag", "stripe");
    await put(store, "Order", { ...o, expiresAt: new Date(0).toISOString() });
    await new Orders(store, payments).maintain();
    await orders.maintain();
    expect((await store.get("Order", o.id))?.payment).toBe("expired");
    expect(await usage(store, "cup-0")).toBe(0);
  });
  it("does not mark paid on checkout creation; duplicate and out-of-order events converge", async () => {
    await unlimited();
    const o = await buy("bag", "stripe");
    expect(o.payment).toBe("pending");
    payments.paid(o.sessionId);
    await orders.webhook("evt_paid", o.sessionId, "checkout.session.completed");
    await orders.webhook("evt_paid", o.sessionId, "checkout.session.completed");
    await orders.webhook("evt_old", o.sessionId, "checkout.session.expired");
    expect((await store.get("Order", o.id))?.payment).toBe("paid");
    expect((await all(store, "Reservation"))[0].state).toBe("finalized");
    expect(await all(store, "Notification")).toHaveLength(1);
    expect((await store.get("Webhook", "evt_paid"))?.attempts).toBe(1);
  });
  it("handles asynchronous pending, failure and a late payment as an inventory exception", async () => {
    await unlimited();
    const o = await buy("bag", "stripe");
    payments.sessions.set(o.sessionId, {
      ...(await payments.retrieve(o.sessionId)),
      status: "complete",
    });
    await orders.webhook(
      "evt_pending",
      o.sessionId,
      "checkout.session.completed",
    );
    expect((await store.get("Order", o.id))?.payment).toBe("pending");
    await orders.webhook(
      "evt_failed",
      o.sessionId,
      "checkout.session.async_payment_failed",
    );
    expect((await store.get("Order", o.id))?.payment).toBe("failed");
    payments.paid(o.sessionId);
    await orders.webhook(
      "evt_late",
      o.sessionId,
      "checkout.session.async_payment_succeeded",
    );
    expect((await store.get("Order", o.id))?.payment).toBe(
      "inventory_exception",
    );
    await expect(orders.fulfill(admin, o.id, "shipped")).rejects.toThrow();
  });
  it("records failed webhook attempts before provider reads and recovers after operator lock review", async () => {
    await unlimited();
    const o = await buy("bag", "stripe"),
      session = await payments.retrieve(o.sessionId);
    payments.sessions.delete(o.sessionId);
    await expect(
      orders.webhook("evt_outage", o.sessionId, "checkout.session.completed"),
    ).rejects.toThrow();
    expect((await store.get("Webhook", "evt_outage"))?.state).toBe("error");
    payments.sessions.set(o.sessionId, {
      ...session,
      payment: "paid",
      status: "complete",
    });
    await store.delete("CommerceLock", "commerce");
    await new Orders(store, payments).maintain();
    expect((await store.get("Webhook", "evt_outage"))?.state).toBe("processed");
    expect((await store.get("Order", o.id))?.payment).toBe("paid");
  });
  it("rejects provider amount mismatch and retains recovery state", async () => {
    await unlimited();
    const o = await buy("bag", "stripe");
    payments.sessions.set(o.sessionId, {
      ...(await payments.retrieve(o.sessionId)),
      total: 1,
      payment: "paid",
    });
    await expect(
      orders.webhook("evt_bad", o.sessionId, "checkout.session.completed"),
    ).rejects.toThrow("mismatch");
    expect((await store.get("Order", o.id))?.payment).toBe("pending");
    expect((await store.get("Webhook", "evt_bad"))?.state).toBe("error");
  });
  it("customer ownership and opaque guest identity protect order access", async () => {
    const o = await buy("secret-bag", "demo", alice);
    await expect(orders.access(o.id, "wrong", bob)).rejects.toThrow(
      "not found",
    );
    await expect(
      orders.access(o.id, "wrong", { ...bob, email: address.email }),
    ).rejects.toThrow();
    expect((await orders.access(o.id, "secret-bag", null)).id).toBe(o.id);
    expect((await orders.access(o.id, "", alice)).id).toBe(o.id);
  });
  it("requires verified administrator role for catalog, settings and fulfillment", async () => {
    expect(() => administrator(alice)).toThrow();
    await expect(saveProduct(store, alice, {})).rejects.toThrow();
    await expect(saveSettings(store, bob, {})).rejects.toThrow();
    const o = await buy();
    await expect(orders.fulfill(alice, o.id, "shipped")).rejects.toThrow();
    await orders.fulfill(admin, o.id, "shipped");
    expect((await store.get("Order", o.id))?.fulfillment).toBe("shipped");
  });
  it("cannot lower inventory below units already sold", async () => {
    await buy();
    const v = (await store.get("Variant", "cup-0"))!;
    const { updatedAt, ...input } = v;
    expect(updatedAt).toBeTruthy();
    await expect(
      saveVariant(store, admin, { ...input, stock: 0 }),
    ).rejects.toThrow("less than");
  });
  it("rejects executable description nodes and link attributes", () => {
    expect(() =>
      parseDocument(
        JSON.stringify({
          type: "doc",
          content: [{ type: "script", text: "alert(1)" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseDocument(
        JSON.stringify({
          type: "doc",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        }),
      ),
    ).toThrow();
  });
  it("seed is idempotent and preserves edits", async () => {
    const s = await settings(store);
    await put(store, "StoreSettings", { ...s, name: "Custom shop" });
    await seed(store);
    expect((await settings(store)).name).toBe("Custom shop");
    expect(await all(store, "Product")).toHaveLength(8);
  });
  it("cancel expires a hosted checkout without turning it paid", async () => {
    await unlimited();
    const o = await buy("bag", "stripe");
    await orders.cancel(o.id, "bag", null);
    expect((await store.get("Order", o.id))?.payment).toBe("expired");
    expect(await usage(store, "cup-0")).toBe(0);
  });
});
