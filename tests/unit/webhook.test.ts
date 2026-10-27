// filename: tests/unit/webhook.test.ts
import { it, expect, vi, afterEach } from "vitest";
import Stripe from "stripe";
const handler = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../lib/server", () => ({
  services: () => ({ orders: { webhook: handler } }),
}));
import { POST } from "../../app/api/stripe/webhook/route";
afterEach(() => {
  vi.unstubAllEnvs();
  handler.mockClear();
});
it("verifies the exact raw Stripe webhook body before invoking commerce", async () => {
  vi.stubEnv("CHECKOUT_MODE", "stripe");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  const payload = JSON.stringify({
    id: "evt_raw",
    type: "checkout.session.completed",
    data: { object: { id: "cs_raw" } },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_fixture",
  });
  const valid = await POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    }),
  );
  expect(valid.status).toBe(200);
  expect(handler).toHaveBeenCalledWith(
    "evt_raw",
    "cs_raw",
    "checkout.session.completed",
  );
  handler.mockClear();
  const tampered = await POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload.replace("cs_raw", "cs_changed"),
    }),
  );
  expect(tampered.status).toBe(400);
  expect(handler).not.toHaveBeenCalled();
});
