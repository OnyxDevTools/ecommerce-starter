# Architecture

One Next.js App Router application on Node.js. Public pages render on the server; client islands provide a request-scoped Zustand cart, Embla gallery and administration forms. Firebase sessions identify customers and active Onyx Customer grants authorize administrators.

The repository is the only persistence adapter. Catalog owns product/category/media validation; carts owns authoritative quantities; inventory derives usage from durable reservations; orders owns immutable snapshots and transitions; payments adapts optional Stripe; notifications owns React Email rendering and a durable outbox.

All cooperating commerce mutations serialize through an insert-only durable CommerceLock. There is no lease expiry or automatic lock stealing. Unknown failures retain the lock. Inventory is a ledger of reservations, not a read-modify-write stock decrement. Held and finalized rows consume capacity; released rows do not. Unknown partial checkout rows stay reserved until explicit reconciliation. This deliberately prioritizes safety over availability. Tests establish behavior against a contract fixture, not live Onyx isolation; finite-stock Stripe checkout is disabled.

Order preparation writes immutable lines and reservation rows before exposing a pending order. Preparing orders and interrupted finalization are recoverable by maintenance under the same lock. Stripe session creation has a stable order idempotency key; after the provider retention window uncertain creation requires operator reconciliation. Webhooks persist attempts then retrieve current session state, making out-of-order deliveries converge. Maintenance reconciles provider state before releasing reservations. Paid-after-release becomes an inventory exception, never automatic fulfillment.

Public reads are dynamic with request-local deduplication only. No private data enters shared caches. Application product-image delivery rechecks publication each request; next/image uses unoptimized for these revocable assets, while bundled product assets use Next optimization. Mutations revalidate catalog paths. Search/listings are bounded for a small store and fail explicitly above the scan limit.
