// filename: modules/orders/service.ts
import "server-only";
import { randomUUID } from "node:crypto";
import { Address, CartItems, type Actor, type Rows } from "../../lib/domain";
import { all, locked, now, put } from "../../lib/data";
import type { Store } from "../../lib/repository";
import { ensure } from "../../lib/errors";
import { quote } from "../carts/service";
import { settings, administrator } from "../catalog/service";
import { reserve, release, finalize } from "../inventory/service";
import { enqueue, deliver } from "../notifications/service";
import type { Payments, PaymentSession } from "../payments/provider";
import { applicationEnvironment } from "../../lib/config";
export class Orders {
  constructor(
    public store: Store,
    public payments: Payments,
  ) {}
  async access(id: string, cartId: string, actor: Actor | null) {
    const o = await this.store.get("Order", id);
    ensure(
      o &&
        (actor?.admin ||
          o.cartId === cartId ||
          (!!actor && o.customerId === actor.id)),
      404,
      "Order not found.",
    );
    return o;
  }
  async checkout(
    cartId: string,
    actor: Actor | null,
    input: unknown,
    mode: "demo" | "stripe",
    version: string,
  ) {
    const address = Address.parse(input);
    ensure(
      mode === "demo"
        ? process.env.CHECKOUT_MODE === "demo" &&
            applicationEnvironment() !== "production"
        : process.env.CHECKOUT_MODE === "stripe",
      409,
      "This checkout mode is not enabled. Demonstration checkout cannot run in production.",
    );
    return locked(this.store, async () => {
      const cart = await this.store.get("Cart", cartId);
      ensure(cart, 422, "Your bag is empty.");
      if (cart.orderId) {
        const previous = await this.access(cart.orderId, cartId, actor);
        return previous;
      }
      ensure(
        cart.version === version,
        409,
        "Your bag changed. Review the current totals.",
      );
      const q = await quote(
          this.store,
          CartItems.parse(JSON.parse(cart.items)),
        ),
        config = await settings(this.store);
      ensure(q.lines.length, 422, "Your bag is empty.");
      ensure(
        address.country === config.country,
        422,
        `This store currently ships only to ${config.country}.`,
      );
      ensure(
        q.total > 0 && q.total <= 1000000000,
        422,
        "Order total is outside supported limits.",
      );
      for (const l of q.lines) {
        ensure(
          l.available >= l.quantity,
          409,
          `${l.name} is out of stock in that quantity.`,
        );
        ensure(
          mode !== "stripe" || l.unlimited,
          409,
          "Live checkout for limited inventory is disabled pending live Onyx concurrency verification.",
        );
      }
      const id = randomUUID(),
        date = now();
      const order: Rows["Order"] = {
        id,
        cartId,
        customerId: actor?.id || "",
        email: address.email,
        address: JSON.stringify(address),
        currency: q.currency,
        subtotal: q.subtotal,
        discount: q.discount,
        shipping: q.shipping,
        tax: q.tax,
        total: q.total,
        mode,
        payment: "preparing",
        fulfillment: "unfulfilled",
        sessionId: "",
        sessionUrl: "",
        createdAt: date,
        updatedAt: date,
        expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
      };
      const lines: Rows["OrderLine"][] = q.lines.map((l, i) => ({
        id: `${id}-${i}`,
        orderId: id,
        productId: l.productId,
        variantId: l.variantId,
        name: l.name,
        variant: l.variant,
        sku: l.sku,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        total: l.total,
      }));
      await this.store.insert("Order", order);
      for (const l of lines) await this.store.insert("OrderLine", l);
      await reserve(this.store, order, lines);
      await put(this.store, "Cart", { ...cart, orderId: id, updatedAt: date });
      await put(this.store, "Order", { ...order, payment: "pending" });
      if (mode === "demo") {
        const ok = await finalize(this.store, id);
        const finished = {
          ...order,
          payment: ok
            ? ("simulated" as const)
            : ("inventory_exception" as const),
          updatedAt: now(),
        };
        await put(this.store, "Order", finished);
        if (ok) await this.complete(finished);
        return finished;
      }
      return this.createSession({ ...order, payment: "pending" }, lines);
    });
  }
  async createSession(order: Rows["Order"], lines: Rows["OrderLine"][]) {
    ensure(
      Date.now() - Date.parse(order.createdAt) < 23 * 3600000,
      409,
      "Checkout creation is outside the safe idempotency retry window. Reconcile with Stripe manually.",
    );
    const session = await this.payments.create(order, lines);
    ensure(
      session.orderId === order.id &&
        session.total === order.total &&
        session.currency === order.currency,
      503,
      "Payment provider returned inconsistent order details.",
    );
    const next = {
      ...order,
      sessionId: session.id,
      sessionUrl: session.url,
      updatedAt: now(),
    };
    await put(this.store, "Order", next);
    return next;
  }
  async complete(order: Rows["Order"]) {
    const cart = await this.store.get("Cart", order.cartId);
    if (cart?.orderId === order.id)
      await put(this.store, "Cart", {
        ...cart,
        items: "[]",
        orderId: "",
        version: randomUUID(),
        updatedAt: now(),
      });
    await enqueue(this.store, order);
  }
  async apply(order: Rows["Order"], session: PaymentSession) {
    ensure(
      session.id === order.sessionId &&
        session.orderId === order.id &&
        session.total === order.total &&
        session.currency === order.currency,
      503,
      "Payment reference or amount mismatch. Operator reconciliation required.",
    );
    if (order.payment === "paid" || order.payment === "simulated") {
      await this.complete(order);
      return order;
    }
    if (order.payment === "inventory_exception") return order;
    let next = order;
    if (
      session.payment === "paid" ||
      (session.status === "complete" &&
        session.payment === "no_payment_required")
    ) {
      const ok = await finalize(this.store, order.id);
      next = {
        ...order,
        payment: ok ? "paid" : "inventory_exception",
        updatedAt: now(),
      };
      await put(this.store, "Order", next);
      if (ok) await this.complete(next);
    } else if (session.status === "expired") {
      await release(this.store, order.id);
      next = { ...order, payment: "expired", updatedAt: now() };
      await put(this.store, "Order", next);
    }
    return next;
  }
  async processEvent(record: Rows["Webhook"]) {
    const current = {
      ...record,
      state: "pending" as const,
      attempts: record.attempts + 1,
      updatedAt: now(),
    };
    await put(this.store, "Webhook", current);
    try {
      const session = await this.payments.retrieve(record.sessionId);
      const order = await this.store.get("Order", session.orderId);
      if (order && order.mode === "stripe") {
        const result = await this.apply(order, session);
        if (
          record.eventType === "checkout.session.async_payment_failed" &&
          result.payment === "pending" &&
          session.payment === "unpaid"
        ) {
          await release(this.store, order.id);
          await put(this.store, "Order", {
            ...result,
            payment: "failed",
            updatedAt: now(),
          });
        }
      }
      await put(this.store, "Webhook", {
        ...current,
        orderId: session.orderId,
        state: "processed",
      });
    } catch (error) {
      await put(this.store, "Webhook", {
        ...current,
        state: "error",
        error: "Reconciliation failed; inspect payment and inventory.",
        updatedAt: now(),
      });
      throw error;
    }
  }
  async webhook(id: string, sessionId: string, eventType: string) {
    return locked(this.store, async () => {
      const old = await this.store.get("Webhook", id);
      if (old?.state === "processed") return;
      await this.processEvent(
        old || {
          id,
          eventType,
          sessionId,
          orderId: "",
          state: "pending",
          attempts: 0,
          error: "",
          updatedAt: now(),
        },
      );
    });
  }
  async cancel(id: string, cartId: string, actor: Actor | null) {
    return locked(this.store, async () => {
      const o = await this.access(id, cartId, actor);
      ensure(
        o.payment === "pending",
        409,
        "This order can no longer be cancelled.",
      );
      if (o.mode === "stripe" && o.sessionId) {
        const s = await this.payments.retrieve(o.sessionId);
        if (s.status !== "open") {
          await this.apply(o, s);
          return;
        }
        await this.payments.expire(o.sessionId);
        await this.apply(o, await this.payments.retrieve(o.sessionId));
      } else {
        await release(this.store, o.id);
        await put(this.store, "Order", {
          ...o,
          payment: "cancelled",
          updatedAt: now(),
        });
      }
    });
  }
  async fulfill(
    actor: Actor | null,
    id: string,
    status: Rows["Order"]["fulfillment"],
  ) {
    administrator(actor);
    return locked(this.store, async () => {
      const o = await this.access(id, "", actor);
      ensure(
        ["paid", "simulated"].includes(o.payment),
        409,
        "Only paid or clearly simulated orders can be fulfilled.",
      );
      const stages = ["unfulfilled", "processing", "shipped", "delivered"];
      ensure(
        stages.indexOf(status) >= stages.indexOf(o.fulfillment),
        409,
        "Fulfillment cannot move backwards.",
      );
      await put(this.store, "Order", {
        ...o,
        fulfillment: status,
        updatedAt: now(),
      });
    });
  }
  async maintain() {
    return locked(this.store, async () => {
      let count = 0;
      for (const event of await all(this.store, "Webhook"))
        if (event.state !== "processed") await this.processEvent(event);
      for (const o of await all(this.store, "Order")) {
        if (o.payment === "preparing") {
          await release(this.store, o.id);
          await put(this.store, "Order", {
            ...o,
            payment: "cancelled",
            updatedAt: now(),
          });
          count++;
        } else if (["paid", "simulated"].includes(o.payment)) {
          await this.complete(o);
        } else if (o.payment === "pending") {
          if (o.mode === "demo") {
            const ok = await finalize(this.store, o.id);
            const next = {
              ...o,
              payment: ok
                ? ("simulated" as const)
                : ("inventory_exception" as const),
              updatedAt: now(),
            };
            await put(this.store, "Order", next);
            if (ok) await this.complete(next);
          } else if (o.sessionId) {
            let s = await this.payments.retrieve(o.sessionId);
            if (s.status === "open" && Date.parse(o.expiresAt) <= Date.now()) {
              await this.payments.expire(o.sessionId);
              s = await this.payments.retrieve(o.sessionId);
            }
            await this.apply(o, s);
          } else if (Date.now() - Date.parse(o.createdAt) < 23 * 3600000) {
            await this.createSession(
              o,
              await all(this.store, "OrderLine", { orderId: o.id }),
            );
          }
          count++;
        }
      }
      await deliver(this.store);
      return { reconciled: count };
    });
  }
}
