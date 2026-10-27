// filename: app/api/stripe/webhook/route.ts
import { stripe } from "@/modules/payments/provider";
import { readBody, problem } from "@/lib/http";
import { ensure } from "@/lib/errors";
import { services } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensure(
      process.env.CHECKOUT_MODE === "stripe" &&
        process.env.STRIPE_WEBHOOK_SECRET,
      503,
      "Stripe webhooks are not configured.",
    );
    const signature = request.headers.get("stripe-signature");
    ensure(signature, 400, "Missing signature.");
    const raw = Buffer.from(await readBody(request, 1024 * 1024));
    let event;
    try {
      event = stripe().webhooks.constructEvent(
        raw,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      ensure(false, 400, "Invalid webhook signature.");
    }
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
      ].includes(event.type)
    ) {
      const session = event.data.object;
      ensure("id" in session, 400, "Invalid session.");
      await services().orders.webhook(event.id, String(session.id), event.type);
    }
    return Response.json({ received: true });
  } catch (e) {
    return problem(e);
  }
}
