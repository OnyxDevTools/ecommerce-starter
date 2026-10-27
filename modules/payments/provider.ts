// filename: modules/payments/provider.ts
import "server-only";
import Stripe from "stripe";
import { z } from "zod";
import type { Rows } from "../../lib/domain";
import { ensure } from "../../lib/errors";
export type PaymentSession = {
  id: string;
  url: string;
  orderId: string;
  status: "open" | "complete" | "expired";
  payment: "paid" | "unpaid" | "no_payment_required";
  total: number;
  currency: string;
};
export interface Payments {
  create(
    order: Rows["Order"],
    lines: Rows["OrderLine"][],
  ): Promise<PaymentSession>;
  retrieve(id: string): Promise<PaymentSession>;
  expire(id: string): Promise<void>;
}
export function stripe() {
  ensure(process.env.STRIPE_SECRET_KEY, 503, "Stripe is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 0,
    timeout: 12000,
  });
}
function mapped(s: Stripe.Checkout.Session): PaymentSession {
  return {
    id: s.id,
    url: s.url || "",
    orderId: s.metadata?.orderId || "",
    status: z.enum(["open", "complete", "expired"]).parse(s.status),
    payment: z
      .enum(["paid", "unpaid", "no_payment_required"])
      .parse(s.payment_status),
    total: s.amount_total ?? -1,
    currency: (s.currency || "").toUpperCase(),
  };
}
export class StripePayments implements Payments {
  async create(order: Rows["Order"]) {
    const origin = process.env.APP_ORIGIN;
    ensure(origin, 503, "Configure APP_ORIGIN.");
    const s = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        customer_email: order.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: order.currency.toLowerCase(),
              unit_amount: order.total,
              product_data: {
                name: `Order ${order.id.slice(0, 8)}`,
                description:
                  "Items, configured shipping, discount and tax as shown in your order summary.",
              },
            },
          },
        ],
        success_url: `${origin}/orders/${order.id}`,
        cancel_url: `${origin}/orders/${order.id}?cancelled=1`,
        expires_at: Math.floor(new Date(order.expiresAt).getTime() / 1000),
      },
      { idempotencyKey: `checkout-${order.id}` },
    );
    return mapped(s);
  }
  async retrieve(id: string) {
    return mapped(await stripe().checkout.sessions.retrieve(id));
  }
  async expire(id: string) {
    await stripe().checkout.sessions.expire(
      id,
      {},
      { idempotencyKey: `expire-${id}` },
    );
  }
}
