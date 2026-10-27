# Ecommerce Starter

A small, complete storefront and store desk in **one Next.js App Router / Node.js application**, backed by Onyx. The Fieldwork Supply showcase uses a warm ivory, forest-green and orange theme, original bundled product illustrations, responsive layouts and a focused eight-product collection.

![Fieldwork Supply storefront](public/template-preview.png)

## What is included

- Server-rendered category browsing, search, price filters, sorting and pagination.
- Product galleries, validated Tiptap rich descriptions, variants and availability.
- A request-scoped Zustand bag, accessible cart drawer, quantity updates and checkout.
- Guest checkout, secure order access, verified customer accounts and order history.
- Administration for products, variants, imagery, categories, inventory, orders, fulfillment and store settings.
- Onyx persistence for customers, carts, orders, immutable order lines, reservations, payment references, webhook attempts and email state.
- Optional Stripe hosted Checkout, signed webhooks and durable reconciliation.
- React Email confirmations, optional Nodemailer delivery and an authenticated preview outbox.
- Explicit demonstration checkout: **no payment, real shipment or outgoing email**.

This starter follows the sibling projects’ official Onyx SDK downloaded-config resolver, Firebase session cookies, schema scripts, local shadcn primitives and npm conventions. It has no runtime imports from another starter. It does not use a hosted CMS, additional database, separate backend, worker service or hosting adapter.

## Quick start

Use Node **24.12+** (`.nvmrc` pins the verified version), npm, an intended Onyx database with insert-only support (Onyx 4.2.9+), and an application Firebase project.

```sh
npm ci
cp .env.example .env.local
npm run template:init -- --name "Your Store" --slug your-store
```

Configure `.env.local`:

- `APP_ORIGIN`: exact trusted origin, including local port. It controls mutation origin checks, canonical URLs and payment return URLs.
- `APP_ENV`: `development`, `preview` or `production`. Nonproduction sites are noindex. Production disables demonstration checkout.
- `ONYX_CONFIG_PATH`: existing downloaded Onyx database configuration. The official SDK also supports its project/home resolver and environment configuration. Never put database credentials in `NEXT_PUBLIC_*` variables.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: application Firebase configuration, supplied at build time.
- `FIREBASE_PROJECT_ID` plus Application Default Credentials, or `FIREBASE_SERVICE_ACCOUNT_BASE64`: matching server credentials.
- `CHECKOUT_MODE`: explicitly select `demo` for local development, or `stripe` after configuring the provider. There is no automatic fallback.

Next loads `.env.local`; CLI scripts require an explicitly loaded environment:

```sh
node --env-file=.env.local --import tsx scripts/schema.ts validate
node --env-file=.env.local --import tsx scripts/schema.ts diff
# Review the schema diff in the intended database before publishing:
node --env-file=.env.local --import tsx scripts/schema.ts publish
node --env-file=.env.local --conditions=react-server --import tsx scripts/seed.ts
npm run dev
```

Visit http://127.0.0.1:3000. The idempotent seed creates eight representative products, sixteen variants, three categories and store settings. It preserves existing records and edits. Assets are already bundled; `node scripts/assets.mjs` regenerates the original vector illustrations locally.

Missing configuration produces setup guidance. The application never silently swaps Onyx for memory or browser storage. Builds and startup do not publish schemas, seed data or promote users.

### Isolated local preview

```sh
npm run test:preview
```

Requires Java 21+ for the **official Firebase Auth Emulator**. Runs an explicit test-only HTTP transport through the actual Onyx SDK, seeds it, builds the production application and serves http://127.0.0.1:3050. Authentication, server-side grants, cookies, authorization and SDK serialization all remain active.

- Store administrator: `admin@example.test`
- Customer: `customer@example.test`
- Password for these test identities only: `development-test-password`

The test transport lives solely under `tests/fixture/`, stores data in memory and loses it when the preview stops. It is not a runtime fallback and does not prove live Onyx durability or isolation. Emulator ports: auth 9399, hub 4437, logging 4537. Stop with Ctrl-C. Do not run this fixture in a public deployment.

## Authentication and access

Enable Email/Password sign-in and authorize your application domains in Firebase. Customers can register and verify their email; only verified, active Firebase users obtain customer order access. Registration creates a **customer**, never an administrator. Email matching alone never grants an order.

Create the initial administrator through a controlled Firebase account process and verify its email. Set `STORE_ADMIN_EMAIL`, then:

```sh
node --env-file=.env.local --conditions=react-server --import tsx scripts/bootstrap-admin.ts
```

Bootstrap grants that existing user an active Onyx Customer administrator role. It is idempotent for that user and refuses a different initial admin once one exists. Further grants and revocations are intentional operator operations on Customer records; no public elevation endpoint exists. Every admin read and mutation verifies the current Firebase user and active database grant. Disabling Firebase or the administrator grant revokes future admin access.

Application identities are separate from Onyx platform/private-workspace credentials. Existing downloaded workspace/database identity is used only server-side for persistence; it never becomes a public session or role. No public development-auth bypass is introduced.

Guest bags are protected by a random 256-bit, HTTP-only, SameSite cookie; only its SHA-256 digest is stored as the cart ID. The same browser can access its guest orders. Signed-in customers can access only orders placed with their verified identity. Guest purchases are not attached later based on email. Losing the guest cookie loses self-service access; add a reviewed verified recovery flow for a production store.

## Architecture and commands

| Location                             | Responsibility                                                    |
| ------------------------------------ | ----------------------------------------------------------------- |
| `app/(shop)/`                        | Public SSR catalog, bag, checkout, protected account/order pages  |
| `app/admin/`, `admin/`               | Verified store desk and lazy Tiptap editing                       |
| `app/api/store/`                     | Same-origin mutation boundaries and service delegation            |
| `modules/catalog/`                   | Product/category validation, descriptions and Onyx media          |
| `modules/carts/`                     | Authoritative cart quantities and current server quotes           |
| `modules/inventory/`                 | Durable reservation ledger, release and finalization              |
| `modules/orders/`                    | Immutable snapshots, payment/fulfillment transitions and recovery |
| `modules/payments/`                  | Small payment interface and Stripe adapter                        |
| `modules/notifications/`             | React Email rendering and persisted outbox delivery state         |
| `lib/repository.ts`                  | Server-only official Onyx SDK adapter                             |
| `lib/auth/`                          | Firebase session verification and opaque guest identity           |
| `lib/domain.ts`, `api/`, `lib/onyx/` | Runtime schemas, database schema and generated types              |

```sh
npm run check           # lint, types, formatting, unit tests, production build
npm run test:e2e        # complete guest purchase and admin workflows, desktop/mobile
npm run schema:generate
npm run schema:validate
npm run maintenance    # explicitly load environment for CLI use
```

`project.json` names the generated application; `template.json` provides local starter metadata. Theme tokens live at the top of `app/globals.css`. Generated documentation and application identity can be adapted independently.

## Prices, shipping, tax and inventory

The server chooses all prices, discounts, shipping, taxes and totals. Checkout revalidates current products and variants; authoritative client price/total fields are not accepted. Orders store immutable names, SKU, unit prices, quantities, currency, shipping address and calculated totals. Subsequent catalog edits do not change historical orders.

Amounts are integer minor units. Supported example currencies are USD, EUR, GBP, JPY (zero decimals) and KWD (three decimals); add currencies deliberately to the schema and exponent map. Decimal performs fractional discount/tax arithmetic using explicit half-up rounding to whole minor units. Currency is configured per store, and all variants must match. Cross-currency price conversion is not implemented.

The example supports one shipping country, a flat shipping amount, a free-shipping threshold after discount, a store-wide percentage discount and a single configured tax rate on discounted merchandise plus shipping. It is **not a tax-compliance, promotion-code or international shipping engine**. Integrate jurisdiction-specific rules before using it for those purposes.

Inventory is total received units, with held and finalized reservations deducted. Receiving more stock means increasing that total; sold units remain represented by finalized reservations. Unlimited variants deliberately opt out of physical stock constraints. Product changes cannot lower total units below already-held/sold units. Cart quantities alone do not reserve stock.

### Concurrency guarantee and its limit

Onyx’s installed SDK and official documentation specify that insert-only creation rejects duplicate identifiers with HTTP 409. All cooperating commerce mutations acquire the same durable `CommerceLock` record with insert-only creation before reading or writing stock. The lock has **no expiry**, lease takeover or in-process substitute. Unknown outcomes retain it, prioritizing safety over availability.

Reservation rows have deterministic order-line identifiers and explicit `held`, `finalized`, `released` states. Preparation writes the order, immutable lines and reservations before marking it pending. Concurrent fixture tests demonstrate that competing services cannot reserve more than available stock, and a losing request is rejected rather than queued. This depends on the database’s actual uniqueness/read visibility contract and every writer observing the protocol. Graph-save atomicity and filtered-update CAS are **not assumed**.

**Live Stripe checkout for finite-stock variants is disabled.** Tests against an isolated transport do not establish the complete live Onyx guarantee. Catalog and explicitly selected demonstration checkout remain functional. Stripe is wired for deliberately unlimited variants; do not falsely label scarce physical items unlimited to bypass the restriction. Enabling finite-stock live payments requires a reviewed implementation and integration tests against the actual database, including failure and concurrent-writer behavior.

### Recovery and scheduling

Reservations expire after one hour. Expiration is durable state, not an in-process timer. Maintenance reconciles Stripe before release, expires open sessions when appropriate, finishes interrupted confirmed orders, abandons incomplete preparations, retries durable webhook work and processes the outbox. Asynchronous pending payments remain pending until verified success/failure; time alone does not release those paid-or-pending obligations.

Use an existing scheduler to run the authenticated administrator operation `POST /api/store/maintenance` with a verified session and exact Origin, or schedule `npm run maintenance` inside the same application environment. No new worker service or infrastructure is supplied. The operation is repeatable and serialized. Failed lock acquisition means retry after the current writer finishes, not force-delete the lock.

Unknown transport failures may leave partial records and a retained lock. Stop **all** app instances and maintenance writers. Inspect the lock, order lines, reservations, provider session and webhook state. Reconcile partial/ambiguous writes, then explicitly release only the reviewed lock:

```sh
node --env-file=.env.local --conditions=react-server --import tsx scripts/recover-lock.ts \
  --confirm-writers-stopped --confirm-state-reviewed
node --env-file=.env.local --conditions=react-server --import tsx scripts/maintenance.ts
```

Do not remove locks based on age. Direct database writers must follow the same protocol or run while application writers are stopped. A payment arriving after reservation release becomes `inventory_exception`; fulfillment is blocked pending manual review/refund/restocking. Refunds, returns and restock workflows are extension points, not invented automatic behavior.

Listings use bounded scans (up to 2,000 rows per collection) suited to a small store. They fail explicitly at the limit. Add indexed pagination, retention and catalog projections before scaling. A global lock limits write throughput; this is a clear starter architecture, not a high-volume commerce engine.

## Stripe payments

Set `CHECKOUT_MODE=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and an HTTPS `APP_ORIGIN` in the intended live environment. Keep keys server-only. Use Stripe test mode while adapting the store.

Register `/api/stripe/webhook` for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Sessions are created server-side with stable `checkout-ORDER_ID` idempotency keys. A session contains the server-calculated order total (including the configured shipping/discount/tax); itemized immutable lines remain in the application order summary. No second Stripe tax calculation is silently layered on top.

Webhooks verify the signature against bounded **raw request bytes**, persist attempts, retrieve the current provider session and validate its order, currency and amount before transitions. Duplicate and out-of-order events converge. A success redirect does not mark paid. Payment and fulfillment states remain separate; only verified paid or clearly simulated orders can be fulfilled.

Uncertain session creation can be retried with its original key inside a conservative 23-hour window. Beyond that, reconcile with Stripe manually; do not create a second session with a new key. The starter makes no exactly-once claim across external systems. No live charges were created during implementation or tests.

## Email and media

React Email renders order confirmations into Onyx Notification rows. `EMAIL_MODE=preview` is the default. Administrators can read them under `/admin/outbox`, in a sandboxed iframe. Demo orders always stay in the preview outbox, even when SMTP is configured.

For explicit delivery of real paid orders, configure `EMAIL_MODE=smtp`, `SMTP_URL`, and `MAIL_FROM`, then run maintenance. State moves through queued → sending → sent. Ambiguous SMTP outcomes become `uncertain` and are **not automatically resent**; inspect the provider before an operator changes the state. SMTP has no exactly-once delivery guarantee. No real email is sent by tests.

Product uploads use Onyx document APIs. Only still PNG/JPEG/WebP files up to 5 MiB and 4096×4096 are accepted after decoding and MIME validation. Sharp normalizes orientation, removes metadata and writes WebP. Required alt descriptions are stored with media. Upload creates a private image until the product gallery is explicitly saved and the product/category is public.

`/media/:id` rechecks public product references or administrator access for each request. Private/unpublished images never enter Next’s shared image cache. Bundled illustrations use optimized `next/image`; revocable Onyx images use the same dimensioned component with optimization disabled and no-store delivery. Stored documents are retained; an automatic purge/retention workflow is not included.

## SEO, extension points and verification

Public products are server-rendered with canonical metadata and Product/Offer JSON-LD matching displayed prices and availability. Published catalog pages enter the production sitemap. Nonproduction sites, account/order/cart/admin pages and APIs are noindex. Private responses are no-store. Public reads are dynamic, so separate instances consult current data; product mutations also revalidate public paths. In-flight readers may finish with the snapshot they already read.

Descriptions are validated, bounded Tiptap JSON and rendered with an explicit React allowlist. Arbitrary HTML, JavaScript, external embeds and unsafe link attributes are rejected. Extend the editor, runtime schema and static renderer together. Tiptap stays in lazy admin components; public product descriptions require no editor JavaScript.

See `docs/verification.md` for actual check results and limitations. Tests use a contract fixture and official Firebase Auth Emulator, not live Onyx persistence or live Stripe/SMTP accounts. Live schema compatibility, identity configuration and provider behavior still require authorized integration testing.

Official references: [Onyx SDK](https://onyx.dev/documentation/sdk-reference/typescript), [Next.js](https://nextjs.org/docs/app), [Zustand request scoping](https://zustand.docs.pmnd.rs/learn/guides/nextjs.html), [Stripe Checkout](https://docs.stripe.com/payments/checkout), [Stripe webhooks](https://docs.stripe.com/webhooks), [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests), [Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs), [React Email](https://react.email/docs/utilities/render).
