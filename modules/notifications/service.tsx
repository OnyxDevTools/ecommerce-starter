// filename: modules/notifications/service.tsx
import "server-only";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { OrderEmail } from "./order-email";
import { all, now, put } from "../../lib/data";
import type { Store } from "../../lib/repository";
import type { Rows } from "../../lib/domain";
export async function enqueue(store: Store, order: Rows["Order"]) {
  if (await store.get("Notification", order.id)) return;
  const lines = await all(store, "OrderLine", { orderId: order.id });
  await store.insert("Notification", {
    id: order.id,
    orderId: order.id,
    to: order.email,
    subject:
      order.mode === "demo"
        ? "Your demonstration order"
        : "Your order confirmation",
    html: await render(<OrderEmail order={order} lines={lines} />),
    state:
      order.mode === "stripe" &&
      process.env.EMAIL_MODE === "smtp" &&
      process.env.SMTP_URL
        ? "queued"
        : "preview",
    attempts: 0,
    updatedAt: now(),
  });
}
// SMTP has no exactly-once guarantee. Never retry an ambiguous sending result automatically.
export async function deliver(store: Store) {
  for (const n of await all(store, "Notification")) {
    if (n.state === "sending") {
      await put(store, "Notification", {
        ...n,
        state: "uncertain",
        updatedAt: now(),
      });
      continue;
    }
    if (
      n.state !== "queued" ||
      process.env.EMAIL_MODE !== "smtp" ||
      !process.env.SMTP_URL ||
      !process.env.MAIL_FROM
    )
      continue;
    await put(store, "Notification", {
      ...n,
      state: "sending",
      attempts: n.attempts + 1,
      updatedAt: now(),
    });
    try {
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
        from: process.env.MAIL_FROM,
        to: n.to,
        subject: n.subject,
        html: n.html,
        messageId: `<order-${n.id}@${new URL(process.env.APP_ORIGIN!).hostname}>`,
      });
    } catch {
      await put(store, "Notification", {
        ...n,
        state: "uncertain",
        attempts: n.attempts + 1,
        updatedAt: now(),
      });
      continue;
    }
    await put(store, "Notification", {
      ...n,
      state: "sent",
      attempts: n.attempts + 1,
      updatedAt: now(),
    });
  }
}
