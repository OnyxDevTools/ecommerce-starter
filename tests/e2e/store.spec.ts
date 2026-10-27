// filename: tests/e2e/store.spec.ts
import { test, expect } from "@playwright/test";
async function signIn(
  page: import("@playwright/test").Page,
  email = "admin@example.test",
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("development-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/account/);
}
test("storefront browse, guest bag, demonstration purchase and private order", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Good things/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Find your everyday" }).click();
  await page.getByLabel("Search", { exact: true }).fill("morning");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("link", { name: /The morning cup/ }).click();
  await expect(
    page.getByRole("heading", { name: "The morning cup" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next image" }).click();
  await expect(page.getByText("View 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("The morning cup", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View full bag" }).click();
  await page
    .getByRole("spinbutton", { name: "Quantity for The morning cup" })
    .fill("2");
  await expect(page.getByText("$56.00").first()).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByLabel("Full name").fill("Guest Buyer");
  await page.getByLabel("Email address").fill("guest@example.test");
  await page.getByLabel("Street address").fill("123 Example Street");
  await page.getByLabel("City", { exact: true }).fill("Portland");
  await page.getByLabel("Postal code").fill("97201");
  await page.getByRole("button", { name: "Place demonstration order" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByText("Payment: simulated")).toBeVisible();
  await expect(page.getByText(/No money was charged/)).toBeVisible();
  const privateUrl = page.url();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const response = await otherPage.goto(privateUrl);
  expect(response?.status()).toBe(404);
  await expect(otherPage.getByText("Guest Buyer")).toHaveCount(0);
  await other.close();
});
test("administration creates a draft product, variant, publishes it and updates settings", async ({
  page,
}, info) => {
  await signIn(page);
  await page.getByRole("link", { name: "Open store administration" }).click();
  await page.getByRole("link", { name: "Add a product" }).click();
  const name = `Studio cup ${info.project.name}`,
    slug = `studio-${info.project.name}`;
  await page.getByLabel("Product name", { exact: true }).fill(name);
  await page.getByLabel("URL slug").fill(slug);
  await page
    .getByLabel("Short description")
    .fill("A considered piece for your daily ritual.");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\/(?!new)[^/]+$/);
  await page.getByLabel("Variant name", { exact: true }).fill("Clay");
  await page
    .getByLabel("SKU", { exact: true })
    .fill(`STUDIO-${info.project.name}`);
  await page.getByLabel("Price (USD minor units)").fill("3200");
  await page.getByLabel("Total inventory units").fill("8");
  await page.getByRole("button", { name: "Save variant", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Clay", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Visible in store").check();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Saved.");
  await page.goto(`/products/${slug}`);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText("From $32.00")).toBeVisible();
  await page.goto("/admin/settings");
  await page
    .getByLabel("Store name", { exact: true })
    .fill("eCommerce Starter");
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.goto("/admin");
  if (info.project.name === "desktop")
    await page.screenshot({ path: "public/admin-preview.png", fullPage: true });
});
test("customer orders, direct administration requests and cross-origin mutations are protected", async ({
  page,
}) => {
  await signIn(page, "customer@example.test");
  await page.goto("/account");
  await expect(
    page.getByRole("link", { name: "Open store administration" }),
  ).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const r = await fetch("/api/store/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return r.status;
  });
  expect(result).toBe(403);
  const cross = await page.request.post("/api/store/cart", {
    headers: { Origin: "https://untrusted.example" },
    data: { variantId: "cup-0", quantity: 1, version: "" },
  });
  expect(cross.status()).toBe(403);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/account/);
});
test("public pages contain server-rendered product metadata and remain usable without JavaScript", async ({
  browser,
  request,
}, info) => {
  const response = await request.get("/products/cup");
  const html = await response.text();
  expect(html).toContain("application/ld+json");
  expect(html).toContain("The morning cup");
  expect(html).toContain('rel="canonical"');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/shop?q=morning");
  await expect(
    page.getByRole("heading", { name: "Things for living." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /The morning cup/ }),
  ).toBeVisible();
  await context.close();
  const preview = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const shot = await preview.newPage();
  await shot.goto("/");
  await shot.locator("img").first().waitFor();
  if (info.project.name === "desktop")
    await shot.screenshot({
      path: "public/template-preview.png",
      fullPage: true,
    });
  await preview.close();
});

test("uploaded media stays private until explicitly published and rejects active content", async ({
  page,
  browser,
}, info) => {
  await signIn(page);
  const origin = "http://127.0.0.1:3051";
  const headers = { Origin: origin };
  const product = {
    id: "",
    name: "Media example",
    slug: `media-${info.project.name}`,
    summary: "An image visibility example.",
    categoryId: "home",
    active: false,
    images: '["/products/cup.webp"]',
    description: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "A safe product description." }],
        },
      ],
    }),
  };
  const created = await page.request.post("/api/store/product", {
    headers,
    data: product,
  });
  expect(created.ok()).toBeTruthy();
  const saved = await created.json();
  const { readFile } = await import("node:fs/promises");
  const upload = await page.request.post("/api/store/media", {
    headers,
    multipart: {
      productId: saved.id,
      alt: "A ceramic morning cup",
      file: {
        name: "cup.webp",
        mimeType: "image/webp",
        buffer: await readFile("public/products/cup.webp"),
      },
    },
  });
  expect(upload.status()).toBe(200);
  const { path } = await upload.json();
  expect((await page.request.get(path)).status()).toBe(200);
  const guest = await browser.newContext();
  expect((await guest.request.get(`${origin}${path}`)).status()).toBe(404);
  const svg = await page.request.post("/api/store/media", {
    headers,
    multipart: {
      productId: saved.id,
      alt: "Unsafe upload",
      file: {
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ),
      },
    },
  });
  expect(svg.status()).toBe(422);
  const published = await page.request.post("/api/store/product", {
    headers,
    data: {
      ...product,
      id: saved.id,
      active: true,
      images: JSON.stringify([path]),
    },
  });
  expect(published.ok()).toBeTruthy();
  expect((await guest.request.get(`${origin}${path}`)).status()).toBe(200);
  await page.request.post("/api/store/product", {
    headers,
    data: {
      ...product,
      id: saved.id,
      active: false,
      images: JSON.stringify([path]),
    },
  });
  expect((await guest.request.get(`${origin}${path}`)).status()).toBe(404);
  await guest.close();
});
test("signed-in purchases appear in customer history and admin fulfillment stays separate", async ({
  page,
}) => {
  await signIn(page, "customer@example.test");
  const headers = { Origin: "http://127.0.0.1:3051" };
  let bag = await (await page.request.get("/api/store/cart")).json();
  bag = await (
    await page.request.post("/api/store/cart", {
      headers,
      data: { variantId: "notebook-0", quantity: 1, version: bag.version },
    })
  ).json();
  const result = await page.request.post("/api/store/checkout", {
    headers,
    data: {
      mode: "demo",
      version: bag.version,
      address: {
        name: "Jamie Customer",
        email: "customer@example.test",
        line1: "123 Sample Street",
        city: "Portland",
        postal: "97201",
        country: "US",
      },
    },
  });
  expect(result.ok()).toBeTruthy();
  const order = await result.json();
  await page.goto("/account");
  await expect(
    page.getByRole("link", { name: new RegExp(order.id.slice(0, 8)) }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn(page);
  await page.goto("/admin/orders");
  const form = page.locator("form").filter({
    has: page.getByLabel(`Fulfillment for ${order.id.slice(0, 8)}`),
  });
  await form.getByRole("combobox").selectOption("shipped");
  await form.getByRole("button", { name: "Update fulfillment" }).click();
  await expect(form.getByRole("status")).toHaveText("Saved.");
  await page.goto(`/orders/${order.id}`);
  await expect(page.getByText("Fulfillment: shipped")).toBeVisible();
  await expect(page.getByText("Payment: simulated")).toBeVisible();
});

test("storefront and product interaction meet core accessibility checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const path of ["/", "/products/cup", "/sign-in"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});
