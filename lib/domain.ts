// filename: lib/domain.ts
import { z } from "zod";
import type { OnyxSchema } from "./onyx/generated";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const id = z.string().min(1).max(160),
  text = z.string().max(500),
  money = z.number().int().min(0).max(1000000000),
  time = z.string();
export const Currency = z.enum(["USD", "EUR", "GBP", "JPY", "KWD"]);
export const CartItems = z
  .array(
    z
      .object({ variantId: id, quantity: z.number().int().min(1).max(20) })
      .strict(),
  )
  .max(30)
  .refine(
    (items) => new Set(items.map((i) => i.variantId)).size === items.length,
    "Each variant must appear only once.",
  );
export type CartItem = z.infer<typeof CartItems>[number];
export const Address = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(200),
    line1: z.string().trim().min(3).max(160),
    city: z.string().trim().min(2).max(100),
    postal: z.string().trim().min(2).max(20),
    country: z.enum(["US", "GB", "DE", "JP", "KW"]),
  })
  .strict();
export const ProductInput = z
  .object({
    id: z.string().max(100),
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    summary: z.string().min(5).max(300),
    description: z.string().max(50000),
    categoryId: id,
    active: z.boolean(),
    images: z.string().max(4000),
  })
  .strict();
export const VariantInput = z
  .object({
    id: z.string().max(100),
    productId: id,
    name: z.string().min(1).max(100),
    sku: z.string().min(1).max(60),
    price: money,
    currency: Currency,
    stock: z.number().int().min(0).max(100000),
    unlimited: z.boolean(),
    active: z.boolean(),
  })
  .strict();
export const SettingsInput = z
  .object({
    name: z.string().min(2).max(80),
    description: text,
    currency: Currency,
    shipping: money,
    freeShipping: money,
    taxBasisPoints: z.number().int().min(0).max(3000),
    discountBasisPoints: z.number().int().min(0).max(5000),
    country: z.enum(["US", "GB", "DE", "JP", "KW"]),
  })
  .strict();
export const schemas = {
  Product: ProductInput.extend({ id, updatedAt: time }),
  Variant: VariantInput.extend({ id, updatedAt: time }),
  Category: z.object({
    id,
    name: z.string().min(1).max(80),
    active: z.boolean(),
  }),
  StoreSettings: SettingsInput.extend({ id }),
  Customer: z.object({
    id,
    email: z.email(),
    name: text,
    role: z.enum(["customer", "administrator"]),
    active: z.boolean(),
  }),
  Cart: z.object({
    id,
    items: z.string().max(10000),
    version: id,
    orderId: z.string(),
    updatedAt: time,
  }),
  Order: z.object({
    id,
    cartId: id,
    customerId: z.string(),
    email: z.email(),
    address: z.string(),
    currency: Currency,
    subtotal: money,
    discount: money,
    shipping: money,
    tax: money,
    total: money,
    mode: z.enum(["demo", "stripe"]),
    payment: z.enum([
      "preparing",
      "pending",
      "paid",
      "simulated",
      "failed",
      "expired",
      "cancelled",
      "inventory_exception",
    ]),
    fulfillment: z.enum(["unfulfilled", "processing", "shipped", "delivered"]),
    sessionId: z.string(),
    sessionUrl: z.string(),
    createdAt: time,
    expiresAt: time,
    updatedAt: time,
  }),
  OrderLine: z.object({
    id,
    orderId: id,
    productId: id,
    variantId: id,
    name: text,
    variant: text,
    sku: text,
    unitPrice: money,
    quantity: z.number().int().min(1).max(20),
    total: money,
  }),
  Reservation: z.object({
    id,
    orderId: id,
    variantId: id,
    quantity: z.number().int().positive(),
    state: z.enum(["held", "finalized", "released"]),
    expiresAt: time,
  }),
  Webhook: z.object({
    id,
    eventType: text,
    orderId: z.string(),
    sessionId: id,
    state: z.enum(["pending", "processed", "error"]),
    attempts: z.number().int().min(0),
    error: text,
    updatedAt: time,
  }),
  Notification: z.object({
    id,
    orderId: id,
    to: z.email(),
    subject: text,
    html: z.string().max(200000),
    state: z.enum(["preview", "queued", "sending", "sent", "uncertain"]),
    attempts: z.number().int().min(0),
    updatedAt: time,
  }),
  Media: z.object({
    id,
    productId: id,
    documentId: id,
    alt: z.string().min(1).max(200),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  CommerceLock: z.object({ id, owner: id, createdAt: time }),
};
export type Rows = {
  [K in keyof typeof schemas]: z.infer<(typeof schemas)[K]>;
};
export type Table = keyof Rows;
export type Actor = { id: string; email: string; name: string; admin: boolean };

// Compile-time compatibility with the official generated SDK types.
type Compatible<T extends { [K in keyof Rows]: OnyxSchema[K] }> = T;
export type DatabaseRows = Compatible<Rows>;
