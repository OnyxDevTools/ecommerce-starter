// filename: modules/catalog/service.ts
import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { access } from "node:fs/promises";
import { join } from "node:path";
import type { Store } from "../../lib/repository";
import { all, locked, now, put } from "../../lib/data";
import {
  AppError,
  ProductInput,
  VariantInput,
  SettingsInput,
  type Actor,
} from "../../lib/domain";
import { ensure } from "../../lib/errors";
import { parseDocument } from "./document";
import { usage } from "../inventory/service";
export function administrator(actor: Actor | null) {
  ensure(actor?.admin, 403, "Administrator access is required.");
}
export async function settings(store: Store) {
  const s = await store.get("StoreSettings", "store");
  ensure(
    s,
    503,
    "Configure Onyx, publish the schema and run the development seed.",
  );
  return s;
}
export async function catalog(store: Store) {
  const [products, variants, categories] = await Promise.all([
    all(store, "Product", { active: true }),
    all(store, "Variant", { active: true }),
    all(store, "Category", { active: true }),
  ]);
  return {
    products: products.filter((p) =>
      categories.some((c) => c.id === p.categoryId),
    ),
    variants,
    categories,
  };
}
export function images(raw: string) {
  return JSON.parse(raw) as string[];
}
export async function saveProduct(
  store: Store,
  actor: Actor | null,
  input: unknown,
) {
  administrator(actor);
  const p = ProductInput.parse(input);
  try {
    parseDocument(p.description);
  } catch {
    throw new AppError(422, "Description contains unsupported content.");
  }
  const paths: unknown = JSON.parse(p.images);
  ensure(
    Array.isArray(paths) &&
      paths.length > 0 &&
      paths.length <= 8 &&
      paths.every(
        (x) =>
          typeof x === "string" &&
          (/^\/products\/[a-z0-9-]+\.webp$/.test(x) ||
            /^\/media\/[a-f0-9-]{36}$/.test(x)),
      ),
    422,
    "Select approved product images.",
  );
  return locked(store, async () => {
    const id = p.id || randomUUID();
    ensure(
      await store.get("Category", p.categoryId),
      422,
      "Select an existing category.",
    );
    ensure(
      !(await all(store, "Product")).some(
        (x) => x.slug === p.slug && x.id !== id,
      ),
      409,
      "That product slug is already in use.",
    );
    for (const path of paths as string[])
      if (path.startsWith("/products/")) {
        try {
          await access(join(process.cwd(), "public", path));
        } catch {
          throw new AppError(422, "Bundled image does not exist.");
        }
      } else if (path.startsWith("/media/")) {
        const m = await store.get("Media", path.slice(7));
        ensure(
          m?.productId === id,
          422,
          "This image belongs to another product.",
        );
      }
    const product = { ...p, id, updatedAt: now() };
    await put(store, "Product", product);
    return product;
  });
}
export async function saveVariant(
  store: Store,
  actor: Actor | null,
  input: unknown,
) {
  administrator(actor);
  const v = VariantInput.parse(input);
  return locked(store, async () => {
    ensure(await store.get("Product", v.productId), 404, "Product not found.");
    const config = await settings(store);
    ensure(
      v.currency === config.currency,
      422,
      "Variant currency must match the store.",
    );
    const id = v.id || randomUUID(),
      old = await store.get("Variant", id);
    ensure(
      !old || old.productId === v.productId,
      422,
      "A variant cannot move between products.",
    );
    ensure(
      !(await all(store, "Variant")).some(
        (x) => x.sku === v.sku && x.id !== id,
      ),
      409,
      "SKU is already in use.",
    );
    ensure(
      v.unlimited || v.stock >= (await usage(store, id)),
      409,
      "Stock cannot be less than held and sold units.",
    );
    await put(store, "Variant", { ...v, id, updatedAt: now() });
  });
}
export async function saveSettings(
  store: Store,
  actor: Actor | null,
  input: unknown,
) {
  administrator(actor);
  const s = SettingsInput.parse(input);
  return locked(store, async () => {
    ensure(
      !(await all(store, "Variant")).some((v) => v.currency !== s.currency),
      409,
      "Migrate variant currencies before changing store currency.",
    );
    await put(store, "StoreSettings", { ...s, id: "store" });
  });
}
export async function upload(
  store: Store,
  actor: Actor | null,
  productId: string,
  alt: string,
  file: File,
) {
  administrator(actor);
  ensure(
    alt.trim().length > 0 && alt.length <= 200,
    422,
    "Image alt text is required.",
  );
  ensure(file.size <= 5 * 1024 * 1024, 413, "Images must be under 5 MiB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let output: Buffer, info: Metadata;
  try {
    info = await sharp(bytes, { limitInputPixels: 4096 * 4096 }).metadata();
    ensure(
      ["jpeg", "png", "webp"].includes(info.format || "") &&
        (info.pages || 1) === 1 &&
        file.type === `image/${info.format}`,
      422,
      "Upload a still JPEG, PNG or WebP with its correct MIME type.",
    );
    output = await sharp(bytes, { limitInputPixels: 4096 * 4096 })
      .rotate()
      .webp({ quality: 85 })
      .toBuffer();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(422, "Invalid image.");
  }
  return locked(store, async () => {
    ensure(
      await store.get("Product", productId),
      404,
      "Create the product before uploading images.",
    );
    const id = randomUUID();
    await store.saveDocument(id, "image/webp", output);
    const dimensions = await sharp(output).metadata();
    await store.insert("Media", {
      id,
      productId,
      documentId: id,
      alt: alt.trim(),
      width: dimensions.width!,
      height: dimensions.height!,
    });
    return `/media/${id}`;
  });
}
