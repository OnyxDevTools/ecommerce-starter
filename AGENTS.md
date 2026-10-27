# Ecommerce Starter engineering rules

Read README.md and docs/architecture.md before implementation. This is one independently runnable Next.js Node application.

- Keep catalog, cart, inventory, order, payment and notification responsibilities in their modules. Routes authenticate, validate, then delegate. Only the repository imports the Onyx data SDK.
- Use strict TypeScript, runtime Zod boundaries, integer minor units, and Decimal for fractional arithmetic. Clients never choose prices, totals, roles or payment outcomes.
- Keep Firebase Admin, Onyx credentials, Stripe and SMTP server-only. Use the official downloaded Onyx configuration resolver. No database initialization, seed, or schema publication during import/startup/build.
- Guests require opaque secret cookies; verified Firebase identity controls customer orders, active server-side grants control administration. Email alone never authorizes order access.
- Keep durable insert-only exclusion; no process-local locks, expiring lease takeover, assumed CAS or transaction claims. Unknown write outcomes retain locks. Recover only after all writers stop and state is inspected.
- Stripe checkout for finite stock stays disabled until an independently reviewed live-database reservation guarantee exists. Never turn demonstration orders into real payments. Payment and fulfillment states are separate.
- Verify raw Stripe signatures; persist attempts and reconcile current provider state. Stable outgoing idempotency keys and immutable order lines are required. Browser redirects never mark paid.
- Public images must be approved and referenced by active products. Private cart/order/admin responses are no-store. Render structured descriptions with an allowlist; no arbitrary HTML or scripts.
- Run check and relevant browser tests. Document test-only transports separately from live integration. Do not charge cards, send live mail, commit, push, publish or deploy without explicit authorization.
