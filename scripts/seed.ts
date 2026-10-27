// filename: scripts/seed.ts
import project from "../project.json";
import { fileURLToPath } from "node:url";
import type { Store } from "../lib/repository";
import { OnyxStore } from "../lib/repository";
import { locked, now } from "../lib/data";
import { description } from "../modules/catalog/document";
export async function seed(store: Store) {
  return locked(store, async () => {
    if (!(await store.get("StoreSettings", "store")))
      await store.insert("StoreSettings", {
        id: "store",
        name: project.name,
        description: "Considered essentials for everyday living.",
        currency: "USD",
        shipping: 650,
        freeShipping: 10000,
        taxBasisPoints: 750,
        discountBasisPoints: 0,
        country: "US",
      });
    for (const [id, name] of [
      ["home", "At home"],
      ["everyday", "On the go"],
      ["desk", "At your desk"],
    ])
      if (!(await store.get("Category", id)))
        await store.insert("Category", { id, name, active: true });
    const products = [
      [
        "cup",
        "The morning cup",
        "A softer start to your daily ritual.",
        "home",
        2800,
        "Clay",
        "Chalk",
      ],
      [
        "lamp",
        "The reading lamp",
        "A warm pool of light, wherever you land.",
        "home",
        8900,
        "Forest",
        "Sand",
      ],
      [
        "tote",
        "The everyday tote",
        "Room for the day. And a little more.",
        "everyday",
        3800,
        "Natural",
        "Olive",
      ],
      [
        "notebook",
        "The open notebook",
        "A place for lists, plans, and possibilities.",
        "desk",
        1800,
        "Terracotta",
        "Forest",
      ],
      [
        "bottle",
        "The day bottle",
        "A daily companion, from desk to trail.",
        "everyday",
        3400,
        "Moss",
        "Clay",
      ],
      [
        "tray",
        "The little tray",
        "A home for the things you set down.",
        "home",
        2600,
        "Oak",
        "Walnut",
      ],
      [
        "pen",
        "The desk pen",
        "One smooth line at a time.",
        "desk",
        1600,
        "Forest",
        "Brass",
      ],
      [
        "pouch",
        "The carry pouch",
        "A small place for the small essentials.",
        "everyday",
        2200,
        "Sand",
        "Rust",
      ],
    ] as const;
    for (const [id, name, summary, categoryId, price, a, b] of products) {
      if (!(await store.get("Product", id)))
        await store.insert("Product", {
          id,
          name,
          slug: id,
          summary,
          categoryId,
          description: description(
            `${summary} Thoughtfully shaped for everyday use, with a simple finish and careful proportions. Keep clean with a soft cloth and store in a dry place. This representative sample product is part of the eCommerce Starter collection.`,
          ),
          images: JSON.stringify([
            `/products/${id}.webp`,
            `/products/${id}-detail.webp`,
          ]),
          active: true,
          updatedAt: now(),
        });
      for (const [i, name] of [a, b].entries()) {
        const vid = `${id}-${i}`;
        if (!(await store.get("Variant", vid)))
          await store.insert("Variant", {
            id: vid,
            productId: id,
            name,
            sku: vid.toUpperCase(),
            price: price + i * 200,
            currency: "USD",
            stock: 12,
            unlimited: false,
            active: true,
            updatedAt: now(),
          });
      }
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await seed(new OnyxStore());
  console.log(
    "Idempotent store seed complete. Existing records were preserved.",
  );
}
