# Verification

Verified October 27, 2026.

| Check                        | Result                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| Unit tests                   | 24 passed                                                          |
| Desktop/mobile browser tests | 14 passed                                                          |
| TypeScript and ESLint        | Passed                                                             |
| Production build             | Passed (standalone check and browser fixture)                      |
| WCAG A/AA automated checks   | Passed on home, product and sign-in, desktop/mobile                |
| Public script inspection     | 12 loaded scripts; no Tiptap/ProseMirror or privileged SDK markers |
| Mobile layout                | Visually inspected at 390 px; no horizontal overflow               |
| Production dependency audit  | Zero known vulnerabilities                                         |

The full development dependency audit reports five moderate findings in the Firebase CLI dependency chain (OpenTelemetry/uuid and their dependents). They are not in the production dependency audit. The suggested automatic fix downgrades firebase-tools across a major version; it was not applied blindly.

Verification uses Node 24.22.1, an isolated test transport exercised through the official Onyx SDK, and the official Firebase Auth Emulator. Live Onyx database isolation/durability, production Firebase, real Stripe charges and real SMTP delivery are not claimed.

Unit coverage includes server-authoritative totals, integer rounding, zero/three-decimal currencies, immutable line snapshots, stale cart versions, inactive variants, removal, shipping boundaries, explicit demo mode, the constrained-stock live-payment guard, concurrent service instances, retained uncertain locks, restart recovery, reservation expiration, duplicate/out-of-order and asynchronous webhooks, amount mismatches, persisted failed attempts, private customer/guest access, administrator permissions, stock adjustments, unsafe descriptions, idempotent seeding, cancellation, raw webhook signature/tampering checks and isolated Zustand providers.

Browser coverage exercises the complete guest demonstration purchase, anonymous order rejection, product/variant creation and publication, settings, customer restrictions, cross-origin denial, gallery controls, server-rendered metadata and no-JavaScript catalog browsing on desktop and mobile.

These checks published no schema to a live database, sent no real payments or emails, and performed no application deployment. See README.md for the deliberate live-checkout inventory limitation and operator recovery procedure.
