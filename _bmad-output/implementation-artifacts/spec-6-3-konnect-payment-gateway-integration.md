---
title: "Story 6.3: Konnect Payment Gateway Integration"
type: "feature"
created: "2026-07-10"
status: "in-progress"
baseline_revision: "3f528bda69a323c46e80d12060a1492f3488c3c5"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** Story 6.2 ends at a labelled payment _placeholder_: a shopper can pick tickets and reach `/tickets/[documentId]/[screeningId]/payment`, but there is no way to actually pay. There is no `payments` plugin, no HTTP route that turns a selection into an order + payment, and no Konnect integration — so the funnel cannot produce revenue. The ticketing `order.createOrder` Unit of Work exists (reserves inventory atomically, writes a `pending` order) but is unreachable from the client.

**Approach:** Stand up the dedicated `payments` plugin as an Anti-Corruption Layer around the Konnect Network API (mirroring `tmdb-integration`: no content types; `konnect-client` + `status-mapping` + `public-api` services; config+validator; a public `/api/payments/konnect/webhook` route whose authenticity is verified by re-querying Konnect). Add a ticketing checkout endpoint that runs `createOrder` then `payments.public-api.initPayment`, persists the Konnect reference, and returns a hosted `payUrl` the browser is redirected to. Add an idempotent ticketing reconciliation (`order.updatePaymentStatus` + release reserved inventory on failure) driven by both a client-triggered confirm endpoint and the webhook (via a decoupled event, so `payments` never imports `ticketing`). Replace the frontend placeholder with a real payment step (method selection + guest contact → redirect) and a result page that confirms status and offers retry on failure.

## Boundaries & Constraints

**Always:** The `payments` plugin follows the sibling-clone + ACL conventions (hand-rolled `({ strapi }) => ({...})` factories, module-level UID/const, Document Service only, string route handlers, `admin/src/translations/{en,fr,ar}.json`, config `default`+`validator` warning on missing `KONNECT_API_KEY`/`KONNECT_WALLET_ID`, registered in `apps/strapi/config/plugins.ts`). All cross-plugin calls go through a `public-api` facade (D8): ticketing calls `strapi.plugin("payments").service("public-api")` only (R3). Konnect API keys/secret live server-side only (never in client). Money owed to Konnect is sent in **millimes** (`Math.round(amountTND * 1000)`); the order's `totalAmount` decimal in TND stays the source of truth. Error responses carry SCREAMING_SNAKE codes, never prose; translate client-side. `userId` is derived server-side (validated JWT when the request is authenticated) and never trusted from the client body; unauthenticated checkout requires `guestEmail`+`guestName`. Reconciliation is idempotent and inventory-safe: an order paid/failed exactly once; on payment failure/init-failure, the inventory reserved by `createOrder` is released exactly once via `events-manager.public-api.adjustInventory(subEventId, kind, -qty)`. Konnect init runs under a ~4.5s timeout (NFR-IN1); on timeout/error the reservation is released and the order marked `failed` before surfacing the error. New POST/GET checkout endpoints reached through the Next proxy MUST be added to `ALLOWED_STRAPI_ENDPOINTS` in `apps/client/src/lib/strapi-api/request-auth.ts` (else 403). All user-facing strings come from the `ticketing` next-intl namespace (fr/ar/en); Arabic uses Western numerals; money via the shared `formatPrice`.

**Block If:** Konnect's init-payment / payment-details request or response contract materially differs from the documented Network API shape captured in Design Notes in a way that cannot be absorbed by plugin config (endpoint paths, `x-api-key` auth, `payUrl`/`paymentRef` fields, `status` vocabulary). Adding the `payments` plugin or wiring `config/plugins.ts` breaks Strapi boot. `strapi.eventHub` (or an equivalent in-process decoupling mechanism) is unavailable for the webhook→ticketing hop.

**Never:** Do NOT capture/transmit raw PAN/CVV to our own backend — Konnect's hosted page collects credentials; our step only selects a method + contact and redirects (the standalone card-capture `PaymentForm` fields are not on the submit path). Do NOT build QR generation (6.4), ticket email (6.5), in-app ticket viewing (6.6), or the confetti celebration (6.8) — 6.3's success screen is a minimal, status-driven confirmation only. Do NOT convert per-tier inventory into the source of truth — keep the existing shared sub-event pool model (`adjustInventory` on the sub-event's single counter by total ticket count); per-tier atomic reconciliation stays deferred. Do NOT make `payments` depend on `ticketing` (no import, no facade call, no foreign UID) — the webhook decouples via an event. Do NOT change `createOrder`'s inventory/transaction semantics or the events-manager `adjustInventory` implementation. Do NOT add an abandoned-cart reservation-expiry sweep (defer). Do NOT trust webhook body amounts/status — re-query Konnect for authoritative status.

## I/O & Edge-Case Matrix

| Scenario                       | Input / State                                            | Expected Output / Behavior                                                                                                                                                                                                  | Error Handling        |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Checkout happy path            | valid selection, `guestEmail`+`guestName`, method `card` | `createOrder` reserves inventory + writes `pending` order; Konnect init returns `payUrl`+`paymentRef`; order `paymentReference`/`paymentMethod` persisted; `{ orderNumber, payUrl }` returned; client redirects to `payUrl` | No error expected     |
| Konnect init fails / times out | Konnect 5xx or > ~4.5s                                   | reserved inventory released once; order marked `failed`; `KONNECT_UNAVAILABLE` returned; client shows error + retry                                                                                                         | `KONNECT_UNAVAILABLE` |
| Sold out at reservation        | `adjustInventory` throws                                 | no order persisted; no Konnect call; error surfaced                                                                                                                                                                         | `TICKET_SOLD_OUT`     |
| Webhook: payment completed     | POST `/payments/konnect/webhook?payment_ref=X`           | plugin re-queries Konnect → `completed`; emits decoupled event; ticketing sets order `paid` + `purchasedAt`; idempotent on repeat                                                                                           | No error expected     |
| Webhook: payment failed        | webhook for a `failed`/`expired` ref                     | status → `failed`; reserved inventory released exactly once; idempotent                                                                                                                                                     | No error expected     |
| Client confirm (paid)          | result page confirms `orderNumber`                       | reconcile via `payments.public-api.getPaymentStatus` → `paid`; UI shows success                                                                                                                                             | No error expected     |
| Client confirm (failed)        | result page confirms a failed order                      | reconcile → `failed`; UI shows clear error + retry back to payment step                                                                                                                                                     | No error expected     |
| Missing guest identity         | unauthenticated, no `guestEmail`                         | 400, no order created, no Konnect call                                                                                                                                                                                      | `VALIDATION_FAILED`   |
| Sub-event not in event         | `screeningId` whose parent ≠ `eventId`                   | 400, no order, no Konnect call                                                                                                                                                                                              | `INVALID_ORDER`       |
| Reconcile idempotency          | order already `paid`, webhook + confirm both fire        | status stays `paid`; inventory unchanged; no double release                                                                                                                                                                 | No error expected     |

</intent-contract>

## Code Map

**Backend — new `payments` plugin** (`apps/strapi/src/plugins/payments/`, sibling-clone geography skeleton, ACL like `tmdb-integration`):

- `package.json` -- identity `name/strapi.name/displayName = payments`, `kind: plugin`, peer `@strapi/strapi ^5.0.0`.
- `strapi-server.js` / `strapi-admin.js` -- entries mirroring tmdb (`require("../../../dist/src/plugins/payments/server/src").default`; `export { default } from "./admin/src/index"`).
- `admin/src/index.tsx` (+ `admin/src/translations/{en,fr,ar}.json`) -- service-only admin stub (no menu link) with `registerTrads`; translations mandatory.
- `server/src/index.ts` -- `register` (warn if `KONNECT_API_KEY` unset), `config`, `controllers`, `routes`, `services`; **no `contentTypes`**.
- `server/src/config/index.ts` -- `default` (apiBaseUrl, walletId, currency token, `konnectMethods` map, lifespan, url bases) + `validator` warning on missing `KONNECT_API_KEY`/`KONNECT_WALLET_ID`.
- `server/src/services/konnect-client.ts` -- factory: `initPayment(params)` → POST `/payments/init-payment` (`x-api-key`, amount in millimes, AbortController ~4.5s); `getPaymentDetails(paymentRef)` → GET `/payments/:paymentRef`; throws mapped `KONNECT_UNAVAILABLE`/`KONNECT_INIT_FAILED`.
- `server/src/services/status-mapping.ts` -- `toInternalStatus(konnectStatus) => "pending"|"paid"|"failed"`.
- `server/src/services/public-api.ts` -- facade: `initPayment({ orderNumber, amountTND, currency, methods, customer, successUrl?, failUrl? })` → `{ payUrl, paymentRef }`; `getPaymentStatus(paymentRef)` → `{ status, orderId, paymentRef }`. Builds success/fail/webhook URLs from config (never from client input — open-redirect safety).
- `server/src/services/index.ts` -- `export default { "konnect-client": …, "status-mapping": …, "public-api": … }` (dash keys, matching the events-manager `.service("public-api")` convention).
- `server/src/controllers/webhook.ts` (+ `controllers/index.ts`) -- `handle(ctx)`: extract `payment_ref`, optional shared-secret token check, call `public-api.getPaymentStatus`, emit decoupled `strapi.eventHub.emit("payments.payment.resolved", { orderId, status, paymentRef })`, return 200. Never imports ticketing.
- `server/src/routes/content-api.ts` (+ `routes/index.ts`) -- `{ type: "content-api", routes: [{ method: "POST", path: "/konnect/webhook", handler: "webhook.handle", config: { policies: [], auth: false } }] }` → `POST /api/payments/konnect/webhook`.

**Backend — ticketing wiring** (`apps/strapi/src/plugins/ticketing/server/src/`):

- `services/order.ts` -- ADD `initCheckout(input)` (calls existing `createOrder`, then `payments.public-api.initPayment`, persists `paymentReference`+`paymentMethod`; on init failure release inventory + mark `failed` + rethrow) and `reconcileFromGateway(orderNumber)` (idempotent: skip if already terminal; else `payments.public-api.getPaymentStatus(order.paymentReference)` → `updatePaymentStatus`; release inventory once on `failed`). Reuse `updatePaymentStatus`/`findByOrderNumber`; add sub-event↔event ownership guard (`INVALID_ORDER`). Keep `createOrder` unchanged.
- `controllers/order.ts` (+ `routes/content-api.ts`) -- ADD `create` (→ `initCheckout`, public/guest-capable, derives userId from JWT if present) at `POST /orders`, and `confirm` (→ `reconcileFromGateway`) at `POST /orders/:orderNumber/confirm`. Keep `GET /orders/:orderNumber`.
- `validation/order.ts` -- extend `createOrderSchema` with `paymentMethod` (enum of the 5 methods); server derives `tickets` price/type from trusted tiers where feasible (see Design Notes).
- `bootstrap.ts` (create/extend) -- subscribe `strapi.eventHub.on("payments.payment.resolved", …)` → `order.reconcileFromGateway`.
- `content-types/ticket-order/schema.json` -- reuse existing `paymentStatus`/`paymentMethod`/`paymentReference`/`purchasedAt` fields (no new fields required; `paymentReference` holds the Konnect `paymentRef`).
- `services/__tests__/order.unit.test.ts` (+ new test files) -- extend for `initCheckout` (happy, init-failure release, sold-out), `reconcileFromGateway` (paid, failed+release, idempotent), ownership guard.

**Backend — registration/config:**

- `apps/strapi/config/plugins.ts` -- add `payments: { enabled: true, resolve: "./src/plugins/payments" }`.
- `.env` / `.env.example` (if present) -- document `KONNECT_API_KEY`, `KONNECT_WALLET_ID`, `KONNECT_API_URL`, optional `KONNECT_WEBHOOK_SECRET`, url-base vars.

**Frontend** (`apps/client/`):

- `src/app/[locale]/tickets/[documentId]/[screeningId]/payment/page.tsx` + replace `PaymentStepPreview.tsx` with a real `PaymentStep.tsx` (`"use client"`) -- read store (`subEventId===screeningId` gate) + `useTicketTiers`; render `OrderSummary` recap, `PaymentMethodSelector`, and `GuestCheckoutForm` (guests) / session identity; on submit POST `/orders` then `window.location.assign(payUrl)`.
- `src/features/tickets/hooks/useCreateOrder.ts` (NEW) + `useOrderStatus.ts` (NEW) -- POST checkout via `PublicStrapiClient` (`useProxy`); confirm/poll order status.
- `src/app/[locale]/tickets/[documentId]/[screeningId]/payment/result/page.tsx` (+ client child) -- read `?status`/`?order`, call confirm/poll, render minimal success (status `paid`) or clear error + retry (`failed`); `clear()` the store on success.
- `src/lib/strapi-api/request-auth.ts` -- add `POST api/ticketing/orders`, `POST api/ticketing/orders/*/confirm`, and `GET api/ticketing/orders/*` to `ALLOWED_STRAPI_ENDPOINTS`.
- `apps/client/locales/{fr,ar,en}.json` -- extend `ticketing` namespace (see Tasks). Reuse the existing `PaymentMethodSelector`/`GuestCheckoutForm`/`OrderSummary`.

## Tasks & Acceptance

**Execution:**

- [ ] `apps/strapi/src/plugins/payments/**` -- scaffold the ACL plugin (package.json, strapi-server.js, strapi-admin.js, admin stub + `translations/{en,fr,ar}.json`, `server/src/index.ts` with no contentTypes, `config/index.ts` with default+validator).
- [ ] `.../payments/server/src/services/konnect-client.ts` -- `initPayment`/`getPaymentDetails` against the Konnect Network API (x-api-key, millimes conversion, ~4.5s AbortController), mapped errors.
- [ ] `.../payments/server/src/services/status-mapping.ts` -- Konnect status → `pending|paid|failed`.
- [ ] `.../payments/server/src/services/public-api.ts` -- facade `initPayment` (builds success/fail/webhook URLs from config) + `getPaymentStatus`; export as `"public-api"` service key.
- [ ] `.../payments/server/src/controllers/webhook.ts` + `routes/content-api.ts` -- public `POST /konnect/webhook`: re-query Konnect, optional secret check, emit `payments.payment.resolved`, 200; no ticketing import.
- [ ] `apps/strapi/config/plugins.ts` -- register `payments`.
- [ ] `.../ticketing/server/src/services/order.ts` -- add `initCheckout` + `reconcileFromGateway` (+ ownership guard) reusing `createOrder`/`updatePaymentStatus`; release inventory on failure via `adjustInventory(subEventId, kind, -qty)`.
- [ ] `.../ticketing/server/src/controllers/order.ts` + `routes/content-api.ts` -- `POST /orders` (initCheckout, guest-capable, JWT-derived userId) and `POST /orders/:orderNumber/confirm` (reconcile).
- [ ] `.../ticketing/server/src/validation/order.ts` -- extend schema with `paymentMethod`; server-trusted pricing per Design Notes.
- [ ] `.../ticketing/server/src/bootstrap.ts` -- subscribe to `payments.payment.resolved` → `reconcileFromGateway`.
- [ ] `.../ticketing/server/src/services/__tests__/*` -- unit-test the I/O matrix (initCheckout happy/init-failure-release/sold-out, reconcile paid/failed-release/idempotent, ownership guard); mock `strapi.plugin("payments").service("public-api")` and `adjustInventory`.
- [ ] `apps/client/src/lib/strapi-api/request-auth.ts` -- allow-list the new order POST/confirm/GET endpoints.
- [ ] `apps/client/.../payment/page.tsx` + `PaymentStep.tsx` -- real payment step (method + guest contact → POST /orders → redirect to payUrl); reuse `PaymentMethodSelector`, `GuestCheckoutForm`, `OrderSummary`, `useGuestCheckout`; store-gated recap.
- [ ] `apps/client/src/features/tickets/hooks/useCreateOrder.ts` + `useOrderStatus.ts` -- checkout POST + status confirm/poll via `PublicStrapiClient`.
- [ ] `apps/client/.../payment/result/page.tsx` (+ client child) -- minimal status-driven success / error+retry; `clear()` store on success.
- [ ] `apps/client/locales/{fr,ar,en}.json` -- `ticketing` keys: `payNow`, `paymentMethod`, `redirecting`, `paymentSuccessTitle`, `paymentPendingTitle`, `paymentFailedTitle`, `paymentFailedDescription`, `retryPayment`, `viewOrder`, `guestContactTitle`, and error codes (`KONNECT_UNAVAILABLE`, `TICKET_SOLD_OUT`, `INVALID_ORDER`, `VALIDATION_FAILED`). Western numerals in `ar.json`.
- [ ] Co-locate frontend tests for `PaymentStep`, result page, and the new hooks (mock the API client + store).

**Acceptance Criteria:**

- Given a selection at the payment step, when I choose a payment method (e-Dinar, Sobflous, D17, Flouci, or Carte bancaire) and confirm, then an order is created with reserved inventory and I am redirected to a Konnect hosted `payUrl` produced through `payments.public-api` — my card/CVV are never sent to our backend.
- Given Konnect confirms the payment (via `/payments/konnect/webhook` or the client confirm), when reconciliation runs, then the order's `paymentStatus` becomes `paid` exactly once with `purchasedAt` set, and repeated webhook/confirm calls do not double-apply.
- Given the payment fails or Konnect is unavailable/times out, when reconciliation/init-failure runs, then the order is `failed`, the reserved inventory is released exactly once, I am never charged, and the result page shows a clear error with a retry path back to the payment step.
- Given I am an unauthenticated guest, when I check out with only an email + name, then the order is created as a guest order; given no email is provided, then checkout is rejected with `VALIDATION_FAILED` and no order/Konnect call.
- Given `locale=ar`, when the payment step, amounts, and statuses render, then Western numerals and `ticketing`-namespace strings are used throughout.
- Given the `payments` plugin, when the codebase is inspected, then it owns no content types, imports no `ticketing` code, exposes only its `public-api` facade for callers, and boots with a config validator that warns (not throws) when Konnect env is unset.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

## Design Notes

- **Konnect Network API contract (build target).** Init: `POST {KONNECT_API_URL}/payments/init-payment`, header `x-api-key: {KONNECT_API_KEY}`, body `{ receiverWalletId: {KONNECT_WALLET_ID}, token: "TND", amount: <millimes>, type: "immediate", description, acceptedPaymentMethods: string[], lifespan: <minutes>, firstName, lastName, email, phoneNumber?, orderId: <orderNumber>, webhook: <configured URL>, silentWebhook: true, successUrl, failUrl, theme }` → `{ payUrl, paymentRef }`. Status: `GET {KONNECT_API_URL}/payments/{paymentRef}` (same header) → `{ payment: { status, orderId, amount, ... } }`. **TND is 3-decimal**: `amount_millimes = Math.round(totalAmountTND * 1000)` (e.g. `70.00 DT → 70000`). Konnect's webhook is an unsigned notification (`?payment_ref=…`) — "signature verification" is satisfied by re-querying Konnect server-to-server for the authoritative status (plus an optional `KONNECT_WEBHOOK_SECRET` token check); never trust the webhook body.
- **Payment-method mapping is config, not constants.** A plugin-config `konnectMethods` map (default `{ card:["bank_card"], "e-dinar":["e-DINAR"], flouci:["flouci"], sobflous:["wallet"], d17:["wallet"] }`, overridable via config/env) maps our 5 UI methods → Konnect `acceptedPaymentMethods` tokens; an unmapped method falls back to Konnect's full accepted set. Exact Konnect tokens are external — adjust via config without code change if they differ (a Block-If only if the whole contract diverges).
- **Dependency direction (R1/R3/R5).** `ticketing → payments` is the only static edge (init + confirm via `payments.public-api`). The webhook physically lives in `payments` (per arch D5) but must not reach back into `ticketing`; it emits a generic `strapi.eventHub` event that ticketing's bootstrap subscribes to and turns into `reconcileFromGateway`. Same idempotent reconcile function serves both the webhook backstop and the client-triggered `confirm` (which covers webhook lag/loss). This keeps `payments` dependency-free (R5) and the graph acyclic.
- **Inventory model stays shared-pool.** `createOrder` already reserves the sub-event's single `ticketsSold` counter by _total_ ticket count via `adjustInventory`; 6.3 does not touch that. Failure/init-failure release mirrors it with a negative delta. Per-tier atomic inventory remains the deferred (larger, orthogonal) inventory-model change — keep `ticketTiers` a display/pricing catalog.
- **Server-trusted pricing.** Do not trust client-sent prices blindly for money: the checkout controller should re-derive each ticket's `price`/`type` validity against the authoritative tiers service for the sub-event (reuse the events-manager ticket-tiers read) before `createOrder`, rejecting mismatches with `INVALID_ORDER`. This closes the "client posts an arbitrary price" hole; keep it proportionate (validate type∈tiers and price==tier.price).
- **Hosted-redirect flow, minimal success.** Because Konnect collects credentials on its hosted page, the in-app step is method-select + contact + redirect; the existing card-capture `PaymentForm` is intentionally off the submit path (its component stays in the library). 6.3's success screen is a minimal status confirmation — the celebration (6.8), QR (6.4), email (6.5), and in-app tickets (6.6) are out of scope and layer on later.

## Verification

**Commands:**

- `yarn workspace @tiween/strapi test` (or `pnpm --filter strapi test`) -- expected: ticketing order unit tests (existing + new `initCheckout`/`reconcileFromGateway`) pass; payments service tests pass.
- `yarn workspace @tiween/strapi build` / `strapi ts:generate-types` -- expected: `payments` plugin compiles; Strapi boots with `payments` registered (validator warns, does not throw, when Konnect env unset).
- `pnpm --filter @tiween/client test` -- expected: new `PaymentStep`, result page, and hook tests pass; existing tickets tests stay green.
- `pnpm --filter @tiween/client typecheck` -- expected: no new type errors in created/edited files (no `any`).
- `pnpm --filter @tiween/client lint` -- expected: clean on touched files.

**Manual checks:**

- With `KONNECT_*` env set to sandbox creds: open the payment step, pick a method + enter guest email, confirm → redirected to a Konnect `payUrl`; complete a sandbox payment → webhook + result page show `paid`; force a failure → order `failed`, inventory released, retry returns to the payment step. Confirm `POST /api/payments/konnect/webhook` re-queries Konnect and is idempotent on replay.
