// filename: app/api/store/[...operation]/route.ts
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actor, cartIdentity } from "@/lib/auth/identity";
import { services } from "@/lib/server";
import { problem, sameOrigin, limitedText } from "@/lib/http";
import { all, locked, put } from "@/lib/data";
import { ensure } from "@/lib/errors";
import { changeCart, readCart } from "@/modules/carts/service";
import {
  administrator,
  saveProduct,
  saveVariant,
  saveSettings,
  upload,
} from "@/modules/catalog/service";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operation: string[] }> },
) {
  try {
    const { operation } = await params;
    ensure(operation.join("/") === "cart", 404, "Not found.");
    return Response.json(
      await readCart(services().store, await cartIdentity(true)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return problem(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string[] }> },
) {
  try {
    sameOrigin(request);
    const op = (await params).operation.join("/"),
      { store, orders } = services();
    const user = await actor();
    if (op === "media") {
      administrator(user);
      ensure(
        Number(request.headers.get("content-length") || "0") <= 6 * 1024 * 1024,
        413,
        "Upload too large.",
      );
      const bytes = await (
        await import("@/lib/http")
      ).readBody(request, 6 * 1024 * 1024);
      const form = await new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: bytes,
      }).formData();
      const file = form.get("file");
      ensure(file instanceof File, 422, "Select an image.");
      return Response.json({
        path: await upload(
          store,
          user,
          String(form.get("productId")),
          String(form.get("alt") || ""),
          file,
        ),
      });
    }
    const body: unknown = JSON.parse(await limitedText(request, 100000));
    let result: unknown = { ok: true };
    if (op === "cart") {
      const b = z
        .object({
          variantId: z.string(),
          quantity: z.number(),
          version: z.string(),
        })
        .strict()
        .parse(body);
      result = await changeCart(
        store,
        await cartIdentity(true),
        b.variantId,
        b.quantity,
        b.version,
      );
    } else if (op === "checkout") {
      const b = z
        .object({
          address: z.unknown(),
          mode: z.enum(["demo", "stripe"]),
          version: z.string(),
        })
        .strict()
        .parse(body);
      result = await orders.checkout(
        await cartIdentity(true),
        user,
        b.address,
        b.mode,
        b.version,
      );
    } else if (op === "cancel") {
      const b = z.object({ id: z.string() }).parse(body);
      await orders.cancel(b.id, await cartIdentity(), user);
    } else {
      administrator(user);
      if (op === "product") result = await saveProduct(store, user, body);
      else if (op === "variant") await saveVariant(store, user, body);
      else if (op === "settings") await saveSettings(store, user, body);
      else if (op === "category") {
        const b = z
          .object({
            id: z.string().regex(/^[a-z0-9-]{1,80}$/),
            name: z.string().min(1).max(80),
            active: z.boolean(),
          })
          .strict()
          .parse(body);
        await locked(store, () => put(store, "Category", b));
      } else if (op === "fulfill") {
        const b = z
          .object({
            id: z.string(),
            status: z.enum([
              "unfulfilled",
              "processing",
              "shipped",
              "delivered",
            ]),
          })
          .parse(body);
        await orders.fulfill(user, b.id, b.status);
      } else if (op === "maintenance") result = await orders.maintain();
      else if (op === "outbox") {
        const b = z.object({ id: z.string() }).parse(body);
        const n = (await all(store, "Notification")).find((n) => n.id === b.id);
        ensure(n, 404, "Message not found.");
        result = n;
      } else ensure(false, 404, "Unknown operation.");
      revalidatePath("/", "layout");
    }
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return problem(e);
  }
}
