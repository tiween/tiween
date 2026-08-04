---
title: "Story 6.4: QR Code Ticket Generation"
type: "feature"
created: "2026-08-04"
status: "done"
baseline_revision: "babe606042b3594c375aa024f87c97e921ea6316"
final_revision: "f554687d3174e66d4a64985a34e771fd6bdd93e4"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** After Story 6.3 a buyer can pay, but the ticket they receive is worthless as an entry credential. `ticket.generateQRData` emits an unsigned `{"ticketNumber","type"}` JSON blob, and a `ticket` `afterCreate` lifecycle writes it **at order-creation time — before payment**, so a QR exists for abandoned/failed orders. Ticket numbers are sequential (`TW-…-1`, `-2`), so anyone can forge a valid-looking QR for any order. There is no signing secret, no way for a buyer to retrieve their tickets after the redirect (the success page shows only an order number and links to the homepage), and `/[locale]/tickets` — the destination of the bottom-nav "Billets" tab — is a 404.

**Approach:** Introduce an HMAC-SHA256-signed, versioned compact QR token (`TWQ1.<payload>.<sig>`) minted by a new ticketing `qr` service from a `TICKET_QR_SECRET`, carrying order number, ticket id, a per-ticket random nonce, event details and showtime. Move issuance off the create-time lifecycle onto the **exactly-once paid transition** in `reconcileFromGateway` (idempotent and self-healing on later confirms). Expose two narrowly-scoped read endpoints — `GET /my-tickets` (JWT-self-scoped) and `GET /order-tickets/:orderNumber?token=` (guest, order access token) — and render the real tickets with an offline-capable inline QR (`qrcode.react`, replacing the third-party `api.qrserver.com` image) on the payment result page and on a new minimal `/[locale]/tickets` "Mes Billets" page.

## Boundaries & Constraints

**Always:** Signing key comes from plugin config (`plugin::ticketing.qrSecret` ← `TICKET_QR_SECRET`), never a hardcoded literal; the config `validator` **warns, never throws** when it is unset (boot must not break), and QR issuance then fails closed with `QR_SIGNING_UNAVAILABLE` rather than emitting an unsigned token. Signature comparison uses `crypto.timingSafeEqual` on equal-length buffers. The payload is versioned (`v: 1`) and the token is prefixed `TWQ1.` so a future rotation/format change is detectable. Every ticket gets a fresh `crypto.randomBytes` nonce covered by the signature — uniqueness must not rest on the guessable `ticketNumber`. QR issuance happens **only** for orders whose payment is `paid`, and is idempotent: a ticket that already has a `qrCode` is never re-signed. QR issuance must never undo or block the paid transition (catch + log; a later confirm/webhook re-attempts). Error responses carry SCREAMING_SNAKE codes, never prose (`respondError` envelope in `controllers/order.ts`); the client translates them. Ticket reads are authorization-gated: JWT-derived `userId` for account orders, timing-safe `accessToken` compare for guest orders — never a bare order number. Returned ticket views are explicitly built (allow-list of fields), never a raw populated document: no `guestEmail`, `guestName`, `paymentReference`, `accessToken`, or `qrNonce` may leave the server. New endpoints reached through the Next proxy MUST be added to `ALLOWED_STRAPI_ENDPOINTS` in `apps/client/src/lib/strapi-api/request-auth.ts`, and — because matching is `startsWith` — MUST use prefixes that do not re-admit the deliberately-unlisted `GET api/ticketing/orders/:orderNumber` PII route. All user-facing strings come from the `ticketing` next-intl namespace (fr/ar/en); Arabic uses Western numerals.

**Block If:** Adding the `qrcode.react` dependency cannot be installed/lockfile-updated in this worktree (a QR that can only render via a third-party network image cannot satisfy the signed-ticket confidentiality or offline requirements). Adding `qrNonce`/`qrIssuedAt`/`accessToken` attributes breaks Strapi boot or schema sync.

**Never:** Do NOT build the full "Mes Billets" experience of Story 6.6 (grouping by event/date, QR preview → full-ticket modal, "Historique" past-tickets section, bottom-nav ticket-count badge) — 6.4 ships a minimal flat list only. Do NOT build ticket email (6.5), the confetti celebration (6.8), purchase history (6.9), or offline/service-worker caching (6.7 — inline SVG rendering is the enabler, not the cache). Do NOT build the scanner-side QR verification flow or change scanner UX (Epic 8) beyond exposing a reusable `qr.verify` and stopping the existing public `GET /tickets/validate/:ticketNumber` route from leaking the new secret material. Do NOT change `createOrder`'s inventory/transaction semantics, the reconcile CAS, or `adjustInventory`. Do NOT put the access token in a URL that leaves the origin (no Konnect success/fail query param) — the client stores it locally before redirecting. Do NOT add a GET allow-list entry under the `api/ticketing/orders` prefix.

## I/O & Edge-Case Matrix

| Scenario                          | Input / State                                         | Expected Output / Behavior                                                                                                   | Error Handling                            |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Issue on paid CAS win             | pending order, gateway `paid`, `res.count === 1`      | every ticket gets `qrCode` = `TWQ1.<b64url payload>.<sig>`, a unique `qrNonce`, `qrIssuedAt`; order stays `paid`             | No error expected                         |
| Reconcile runs again (idempotent) | order already `paid`, all tickets carry `qrCode`      | no re-signing, no writes, existing tokens unchanged                                                                          | No error expected                         |
| Self-heal after a failed issuance | order `paid` but some tickets have no `qrCode`        | a later confirm/webhook issues only the missing tickets                                                                      | No error expected                         |
| Issuance throws                   | signing/DB error during issuance                      | error logged; order remains `paid`; reconcile still returns `changed: true`                                                  | logged, not thrown                        |
| Secret unset                      | `TICKET_QR_SECRET` empty                              | boot warns; issuance throws + logs; NO unsigned token is ever written                                                        | `QR_SIGNING_UNAVAILABLE`                  |
| Verify a genuine token            | `qr.verify(validToken)`                               | `{ valid: true, payload }` with order/ticket/event/showtime fields                                                           | No error expected                         |
| Verify a tampered token           | payload edited, signature unchanged                   | `{ valid: false, code }` — no throw, constant-time compare                                                                   | `QR_SIGNATURE_INVALID`                    |
| Verify a malformed/other-version  | `"abc"`, `TWQ9.x.y`                                   | `{ valid: false, code }`                                                                                                     | `QR_MALFORMED` / `QR_UNSUPPORTED_VERSION` |
| Owner reads own tickets           | `GET /my-tickets` with a valid JWT                    | only that user's `paid` orders' tickets, sanitized views incl. `qrCode`                                                      | No error expected                         |
| Anonymous reads my-tickets        | `GET /my-tickets`, no JWT                             | 401, no data                                                                                                                 | `UNAUTHORIZED`                            |
| Guest reads by token              | `GET /order-tickets/:orderNumber?token=<accessToken>` | that order's sanitized ticket views                                                                                          | No error expected                         |
| Guest token wrong/absent          | bad or missing `token`, not the owner                 | 403, no data, no PII                                                                                                         | `FORBIDDEN`                               |
| Unknown order number              | `GET /order-tickets/UNKNOWN?token=x`                  | 403 (indistinguishable from a wrong token — no enumeration oracle)                                                           | `FORBIDDEN`                               |
| Unpaid order read                 | pending order, correct token                          | authorized, but tickets carry `qrCode: null`; UI shows the pending state, not a QR                                           | No error expected                         |
| Public validate route             | `GET /tickets/validate/:ticketNumber`                 | returns `{ valid, code?, ticket: { ticketNumber, type, status, scannedAt } }` only — never `qrCode`, `qrNonce`, or the order | code, not prose                           |

</intent-contract>

## Code Map

**Backend — `apps/strapi/src/plugins/ticketing/server/src/`:**

- `config/index.ts` -- ADD `qrSecret` (`process.env.TICKET_QR_SECRET || ""`), `qrPayloadVersion: 1`; `validator` warns when the secret is unset.
- `services/qr.ts` (NEW, service key `"qr"`) -- `sign`, `encode`, `verify`, `buildPayload`, `issueForOrder(orderNumber)`. Node `crypto` (`createHmac`, `randomBytes`, `timingSafeEqual`). Exports the `QR_*` error codes.
- `services/index.ts` -- register `qr`.
- `services/order.ts` -- `createOrder`: mint `accessToken` on the order. `initCheckout`: return `accessToken` alongside `{ orderNumber, payUrl }`. `reconcileFromGateway`: call `qr.issueForOrder` on the winning `paid` CAS **and** on the already-`paid` terminal early-return (self-heal), both wrapped in try/catch+log. ADD `findTicketsForUser(userId)` and `findTicketsForOrder(orderNumber, { userId?, accessToken? })` + a private `toTicketView` sanitizer.
- `services/ticket.ts` -- DELETE `generateQRData`; `validate` returns error CODES and a minimal ticket projection (no `qrCode`/`qrNonce`/order).
- `bootstrap.ts` -- REMOVE the `ticket` `afterCreate` QR lifecycle (QR must not exist pre-payment). Keep the `payments.payment.resolved` subscription.
- `controllers/order.ts` -- ADD `myTickets` (401 `UNAUTHORIZED` without `ctx.state.user`) and `orderTickets` (`?token=`); extend `STATUS_BY_CODE` with `UNAUTHORIZED: 401`, `FORBIDDEN: 403`, `QR_SIGNING_UNAVAILABLE: 500`.
- `controllers/ticket.ts` -- use `validation.code` instead of `validation.error` prose.
- `routes/content-api.ts` -- ADD `GET /my-tickets` (`policies: ["plugin::ticketing.is-ticket-owner"]`) and `GET /order-tickets/:orderNumber` (`policies: []`).
- `content-types/ticket/schema.json` -- ADD `qrNonce` (string, unique, private), `qrIssuedAt` (datetime); mark `qrCode` private.
- `content-types/ticket-order/schema.json` -- ADD `accessToken` (string, private).
- `__tests__/bootstrap.unit.test.ts` -- drop the lifecycle assertions; assert no `db.lifecycles.subscribe` for QR.
- `services/__tests__/qr.unit.test.ts`, `services/__tests__/order-tickets.unit.test.ts` (NEW) + `services/__tests__/order-checkout.unit.test.ts` (extend for issuance on paid/idempotent/self-heal/throw-safe) + `controllers/__tests__/order.unit.test.ts` (extend for the two read endpoints).
- `apps/strapi/.env.example` -- document `TICKET_QR_SECRET`.

**Frontend — `apps/client/`:**

- `package.json` -- ADD `qrcode.react`.
- `src/features/tickets/components/TicketQR/TicketQR.tsx` -- render `<QRCodeSVG value={ticket.qrData} size={qrSize} level="H" />`; DELETE the `api.qrserver.com` `<Image>` (third-party leak of a signed credential + breaks offline). Add `TicketQR.test.tsx`.
- `src/features/tickets/utils/orderAccess.ts` (NEW) -- localStorage `tiween.order-access`: `saveOrderAccess`, `readOrderAccess`, `listOrderAccess` (newest-first, capped), SSR-safe.
- `src/features/tickets/hooks/useOrderTickets.ts`, `useMyTickets.ts` (NEW) -- react-query reads via `PublicStrapiClient` (`order-tickets`, `useProxy`) and `PrivateStrapiClient` (`my-tickets`, `useProxy`); user-scoped query keys.
- `src/features/tickets/types.ts` -- ADD `TicketView` (`ticketNumber`, `type`, `status`, `price`, `qrCode`, `scannedAt`, `orderNumber`, `eventTitle`, `startDateTime`, `venueName`).
- `src/features/tickets/components/TicketList/` (NEW) -- maps `TicketView[]` → `TicketQR` cards (locale-formatted date/time, i18n labels).
- `src/app/[locale]/tickets/[documentId]/[screeningId]/payment/PaymentStep.tsx` -- persist `{orderNumber, accessToken}` via `saveOrderAccess` before redirecting to `payUrl`.
- `src/app/[locale]/tickets/[documentId]/[screeningId]/payment/result/ResultView.tsx` -- on `paid`, render `TicketList` for the order; `page.tsx` -- point `viewOrderHref` at `/${locale}/tickets`.
- `src/app/[locale]/tickets/page.tsx` (NEW) + `MyTicketsView.tsx` -- minimal "Mes Billets": authenticated → `useMyTickets`; otherwise locally-stored guest orders → `useOrderTickets`; empty state.
- `src/lib/strapi-api/request-auth.ts` -- GET allow-list `api/ticketing/my-tickets` and `api/ticketing/order-tickets` (NOT `api/ticketing/orders`).
- `apps/client/locales/{fr,ar,en}.json` -- new `ticketing` keys.

## Tasks & Acceptance

**Execution:**

- [x] `.../ticketing/server/src/config/index.ts` -- add `qrSecret` + `qrPayloadVersion` with a warning-only validator, so the signing key is config/env-driven and boot never breaks.
- [x] `.../ticketing/server/src/services/qr.ts` + `services/index.ts` -- new `qr` service: versioned `TWQ1.<b64url(payload)>.<b64url(hmac)>` mint/verify with `timingSafeEqual`, per-ticket `randomBytes` nonce, and `issueForOrder` (paid-only, idempotent per ticket, writes `qrCode`/`qrNonce`/`qrIssuedAt`).
- [x] `.../ticketing/server/src/content-types/ticket/schema.json` + `ticket-order/schema.json` -- add `qrNonce`(unique, private)/`qrIssuedAt`, mark `qrCode` private, add order `accessToken`(private) so guests can retrieve their own tickets without an account.
- [x] `.../ticketing/server/src/services/order.ts` -- mint `accessToken` in `createOrder`; return it from `initCheckout`; hook `qr.issueForOrder` to the paid CAS winner **and** the already-paid early return (throw-safe); add `findTicketsForUser` / `findTicketsForOrder` with owner-or-token authorization and an explicit `toTicketView` allow-list.
- [x] `.../ticketing/server/src/bootstrap.ts` -- remove the `afterCreate` QR lifecycle so no QR exists before payment.
- [x] `.../ticketing/server/src/services/ticket.ts` + `controllers/ticket.ts` -- drop `generateQRData`; return error CODES and a minimal ticket projection from `validate` so the public route cannot leak `qrCode`/`qrNonce`/order PII.
- [x] `.../ticketing/server/src/controllers/order.ts` + `routes/content-api.ts` -- `GET /my-tickets` (JWT-self-scoped via `is-ticket-owner`) and `GET /order-tickets/:orderNumber?token=`, mapping `UNAUTHORIZED`/`FORBIDDEN` in `STATUS_BY_CODE`.
- [x] `apps/strapi/.env.example` -- document `TICKET_QR_SECRET` (generation hint + failure behaviour when unset).
- [x] `.../ticketing/server/src/**/__tests__/*` -- unit-test the I/O matrix: qr sign/verify/tamper/version/malformed/secret-unset, issuance on-paid/idempotent/self-heal/throw-safe, ticket-read authorization (owner, token, wrong token, unknown order, unpaid), the two controllers, and the updated bootstrap.
- [x] `apps/client/package.json` + `TicketQR.tsx` (+ `TicketQR.test.tsx`) -- add `qrcode.react` and render the QR inline as SVG, removing the third-party image request.
- [x] `apps/client/src/features/tickets/utils/orderAccess.ts` (+ test) -- SSR-safe localStorage store for `{orderNumber, accessToken}`.
- [x] `apps/client/src/features/tickets/hooks/{useOrderTickets,useMyTickets}.ts` (+ tests, barrel) and `types.ts` `TicketView` -- typed reads through the proxies with user-scoped query keys.
- [x] `apps/client/src/features/tickets/components/TicketList/` (+ test, barrel) -- render `TicketView[]` as localized `TicketQR` cards.
- [x] `apps/client/.../payment/PaymentStep.tsx` -- save the order access token before the Konnect redirect (never in the redirect URL).
- [x] `apps/client/.../payment/result/{ResultView.tsx,page.tsx}` (+ tests) -- show the issued tickets on success and point the CTA at `/[locale]/tickets`.
- [x] `apps/client/src/app/[locale]/tickets/page.tsx` + `MyTicketsView.tsx` (+ test) -- minimal "Mes Billets" list for account and guest (local-token) tickets, fixing the bottom-nav 404.
- [x] `apps/client/src/lib/strapi-api/request-auth.ts` (+ test) -- allow-list the two new GET prefixes without re-admitting `api/ticketing/orders`.
- [x] `apps/client/locales/{fr,ar,en}.json` -- `ticketing` keys for the tickets list, ticket card labels, and the new error codes (`UNAUTHORIZED`, `FORBIDDEN`); Western numerals in `ar`.

**Acceptance Criteria:**

- Given a paid order, when reconciliation settles it, then every ticket carries a `TWQ1.` HMAC-SHA256-signed token containing the order number, ticket id, a unique per-ticket nonce, event details and showtime — and no two tickets share a token.
- Given an order that is not `paid` (pending, failed, abandoned), when its tickets are inspected, then no `qrCode` has ever been written for them.
- Given a signed token whose payload has been altered, when `qr.verify` runs, then it reports invalid via a code and never returns a payload.
- Given I am the buyer (signed in, or a guest with my order access token), when I land on the payment result page after a successful payment, then my tickets render as scannable inline QR codes without any request to a third-party host, and the CTA takes me to `/[locale]/tickets` where they are listed.
- Given I am not the buyer, when I request another order's tickets with a wrong/missing token or an unknown order number, then I get a 403 with no ticket data and no way to distinguish "wrong token" from "no such order".
- Given `locale=ar`, when the tickets list and ticket cards render, then all strings come from the `ticketing` namespace and numerals are Western.

## Spec Change Log

## Review Triage Log

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 1, medium 7, low 3)
- defer: 4: (high 0, medium 2, low 2)
- reject: 5: (high 0, medium 1, low 4)
- addressed_findings:
  - `[high]` `[patch]` The pre-existing public `GET /orders/:orderNumber` route assigns a raw populated document to `ctx.body`, and custom controllers run no `sanitize.contentAPI.output` — so `private: true` stripped nothing and this story's two new credentials (the order `accessToken` and every ticket's signed `qrCode`/`qrNonce`) plus guest PII were returned for a short, enumerable order number. Fixed: `findByOrderNumber` now emits an explicit allow-list (`orderNumber`, `paymentStatus`, `currency`, `totalAmount`, `purchasedAt`, `ticketCount`); added a controller test asserting the serialized body carries none of the secrets; corrected the comments claiming the route "was removed" (it was only removed from the Next proxy allow-list).
  - `[medium]` `[patch]` QR issuance was not exactly-once: `issueForOrder` read `ticket.qrCode` then wrote via the Document Service, and the new already-`paid` self-heal path is reachable concurrently from the public confirm endpoint and the webhook — two racers could mint two signature-valid tokens for one ticket while the row kept only the last nonce. Fixed: the per-ticket write is now a CAS (`db.query(TICKET_UID).updateMany({ where: { documentId, qrCode: { $null: true } } })`), counted as issued only on `count === 1`; the loser discards its unpersisted token. Comments corrected; CAS-loser tests added.
  - `[medium]` `[patch]` The guest access token travelled as `?token=` and the proxy forwards the query verbatim, writing a never-expiring bearer credential into Next/Strapi/CDN access logs — contradicting the "never in a URL, never logged" rationale written in the code itself. Fixed: moved to an `x-order-access-token` request header (the public proxy already forwards client headers); the controller reads `ctx.request.header` and ignores a `?token=` query; hook and controller tests cover the header, an array header, and the ignored query.
  - `[medium]` `[patch]` `findTicketsForUser` used the default 25-row REST limit, so a frequent buyer silently lost older paid orders from "Mes Billets", and `sort: purchasedAt:desc` was unstable for a paid order with a null `purchasedAt`. Fixed: `pagination: { limit: -1 }` (matching the user-engagement convention) plus a `createdAt:desc` sort fallback; unbounded-page test added.
  - `[medium]` `[patch]` A stale 30s-fresh my-tickets cache could hide the just-purchased tickets on the success page. Fixed: `ResultView` invalidates `myTicketKeys.all` once the confirm settles `paid` (the query client is held in a ref so the single-run confirm effect is not torn down); positive and negative tests added.
  - `[medium]` `[patch]` "Mes Billets" swallowed every guest read failure — a 403 from a stale token made the order vanish and rendered "no tickets yet" to someone who had paid — and the empty state could flash while the session or the guest reads were still in flight. Fixed: guest reads report their error code upward and render an alert mapped through `extractErrorCode` (so the already-translated `FORBIDDEN`/`UNAUTHORIZED` copy is actually used); `sessionStatus === "loading"` and unsettled guest reads count as loading. Four tests added.
  - `[medium]` `[patch]` Signing out cleared the query cache but not the stored guest order tokens, so the next person on a shared device could open `/tickets` and see the previous buyer's scannable QRs. Fixed: `signOutAndClearCache` now calls `clearOrderAccess()`; test added.
  - `[medium]` `[patch]` Three verification gaps let core behaviour regress silently: deleting `PaymentStep`'s `saveOrderAccess` call broke no test (the mock returned no `accessToken`), `MyTicketsView`'s "signed-in buyer" test ran with an unauthenticated session, and nothing resolved the ~20 new `ticketing` keys against the real locale catalogs. Fixed: PaymentStep asserts the token is stored before the redirect, `useSession` is per-test with real authenticated coverage, and `ticketingI18n.test.tsx` resolves every new key for fr/ar/en via `createTranslator` (including `ticketCard.tickets` with counts and a Western-numerals assertion).
  - `[low]` `[patch]` Anonymous `GET /my-tickets` answered Strapi's generic 403 because the route policy rejected before the handler, making the specified 401 `UNAUTHORIZED` dead on the wire. Fixed: dropped the policy from that route (the handler self-scopes from `ctx.state.user` and returns 401 with no data — the real, unit-tested gate); the policy file stays registered.
  - `[low]` `[patch]` `orderAccess.isOrderAccess` accepted a non-numeric `savedAt`, making the newest-first comparator arbitrary so the 20-entry cap could evict the newest order. Fixed: `savedAt` is coerced to a finite number (0 otherwise) rather than trusted; tests added.
  - `[low]` `[patch]` The desktop nav's "Mes Billets" item still pointed at `/auth/profile`. Fixed: it now routes to `/[locale]/tickets` (the mobile path already did).
- notes (pass 1): Parallel Blind Hunter + Edge Case Hunter + Verification Gap pass over the full baseline diff. Two reviewer claims were checked and rejected on the evidence: the mobile "Billets" tab already routes to `/[locale]/tickets` (`HomePage.tsx:290`), and the ticketing config validator's bare `strapi.log.warn` mirrors the `payments` pattern verified to boot in Story 6.3. Also rejected: adding an ICU plural to `ar.json` (the bare `{count}` form is required by the repo's numerals lint gates and matches the existing `remaining` key), the `viewOrderHref` prop name, and `qrIssuedAt` not being `private`. Four deferrals recorded in the ledger (DW-237 role grant + historical backfill; DW-238 QR key rotation / `iat` / access-token hashing; DW-239 guest recovery when the local token is lost — Story 6.5; DW-240 no polling while a paid ticket's QR is still pending).

### 2026-08-04 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 3, low 4)
- defer: 4: (high 0, medium 1, low 3)
- reject: 13: (high 0, medium 2, low 11)
- addressed_findings:
  - `[medium]` `[patch]` `useMyTickets` fired on `enabled: isAuthenticated` alone, but `Session["user"].userId` is optional — an authenticated session whose id had not materialised ran a REAL fetch parked on the shared `UNRESOLVED_USER_ID` scope, where the next account on a shared device could match it (the hook's own docstring claimed the opposite, and `useWatchlist` gates on `isAuthenticated && !!userId`). Fixed: gate added, comment corrected, and two tests (authenticated-without-id, session loading) added.
  - `[medium]` `[patch]` `signOutAndClearCache` evicted the watchlist cache and the stored guest tokens but not the ticket query caches, so the outgoing user's ticket rows — carrying their signed `qrCode` strings — stayed resident until `gcTime`. Fixed: `myTicketKeys.all` and `orderTicketKeys.all` are now removed too; test added. Both key factories moved to `features/tickets/utils/ticketQueryKeys.ts` (the `watchlistKeys` precedent) so `lib/sign-out.ts` can import them without dragging in the Strapi clients, and re-exported from the hooks.
  - `[medium]` `[patch]` `ResultView` consulted only `guestTickets.data`, never `isError`: a stale stored token (403) or a 5xx left the buyer on a success page showing an order number, no tickets and no explanation — the exact failure that was patched in `MyTicketsView` during pass 1. Fixed: read errors are mapped through the now-shared `toKnownTicketErrorCode` and rendered as a translated alert; positive and negative tests added.
  - `[low]` `[patch]` The neutral "verifying" branch still labelled its CTA `viewOrder` ("Voir ma commande") while `viewOrderHref` had been repointed at "Mes Billets", promising an order page the app does not have. Only the `paid` branch was switched. Fixed: label is `viewMyTickets`; test asserts the label and href.
  - `[low]` `[patch]` `ticketingI18n.test.tsx` could not actually detect a missing key: `createTranslator` echoes the key path for an unresolved message, so `expect(t(key).length).toBeGreaterThan(0)` passed for a key absent from `ar.json` — contradicting pass 1's claim that it "resolves every new key for fr/ar/en". Fixed: each key is looked up in the catalog before rendering, the rendered value must differ from the key path, and a new test asserts the `ticketing` key SET is identical across fr/ar/en.
  - `[low]` `[patch]` Two AC-bearing destinations had no test: `result/page.tsx` computes `viewOrderHref`, but every `ResultView` test injects it as a literal prop, and `DesktopNav`'s "Billets" href (changed off `/auth/profile`) had no test file at all. Reverting either left the suite green. Fixed: `page.test.tsx` asserts the computed href per locale, `DesktopNav.test.tsx` asserts both nav destinations.
  - `[low]` `[patch]` The `order.create` controller docstring still said it returns `{ orderNumber, payUrl }` after `initCheckout` began returning the guest `accessToken`. Fixed: comment now documents the token and its "never in the redirect URL" rule.
- notes (pass 2): Second parallel Blind Hunter + Edge Case Hunter + Verification Gap pass over the same baseline diff. Findings checked and rejected on the evidence: the `x-order-access-token` header does survive the proxy hop (`public-proxy/[...slug]/route.ts` forwards client headers verbatim); minting an `accessToken` for authenticated buyers too is spec-mandated in `createOrder`; the token in the react-query key is required for scope correctness (a different token is a different authorization) and is not persisted or logged; the now-routeless `is-ticket-owner` policy was deliberately detached in pass 1 and documented; `findByOrderNumber`'s narrowed projection was pass 1's fix, not a new break; `clearOrderAccess()` on sign-out destroying guest tokens is DW-239's subject; a pending/abandoned order rendering the `qrPending` state is the behaviour the I/O matrix specifies; the Arabic `{count}` form was rejected in pass 1 on numerals-lint grounds; and `addToWallet`/`share` are pre-existing `TicketQR` labels whose buttons are intentionally off (`showActions={false}`). Also rejected as unreachable-or-cosmetic: a react-query `isPaused` offline spinner, a non-ISO `scannedAt` (backend-controlled), a silent no-op when `createOrder` omits `accessToken`, and a one-frame empty-state flash before the mount effect reads `localStorage`. Four new deferrals recorded (DW-241 legacy unsigned `qrCode` rows that issuance can never replace — this also corrects DW-237's premise; DW-242 cancelled tickets shown as "Event passed"; DW-243 up-to-20 parallel guest reads per mount; DW-244 unmeasured QR payload density).

### 2026-08-04 — Review pass (follow-up 2)

- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 3, low 4)
- defer: 5: (high 0, medium 2, low 3)
- reject: 14: (high 0, medium 3, low 11)
- addressed_findings:
  - `[medium]` `[patch]` `result/page.test.tsx` — the test pass 2 recorded as applied for the AC-bearing "Mes Billets" destination — was never actually in the change: it is untracked and matched by the bare `result` pattern in this worktree's `.git/.../info/exclude` (the nix build-symlink rule), so `git diff babe606..HEAD` never contained it and the story would have merged with the coverage its own record claimed. Verified via `git ls-files --error-unmatch` (fails) and `git check-ignore -v` (line 6 of the exclude file); it is the only source file in the story silently ignored this way. Fixed: force-tracked with `git add -f`. It was already running locally (vitest does not consult git), which is why the suite count never revealed the gap.
  - `[medium]` `[patch]` The QR payload's `et` carried the admin-authored event title with no bound, and `qrcode.react` THROWS "Data too long" rather than degrading once a value exceeds QR capacity — measured empirically against the installed `qrcode.react@4.2.0` at `level="H"`: 1600 chars render, 2000 throw. `TicketList` maps tickets inline with no error boundary, so one pathological title would blank the entire "Mes Billets" page AND the payment success page, not just that card. DW-244 recorded the density concern but framed the consequence as scannability, missing the render-crash mode. Fixed: `MAX_EVENT_TITLE_LENGTH = 80`, truncated (never rejected — failing issuance would leave a PAID ticket with no QR at all); three tests, including a worst-case token asserted under 800 chars.
  - `[medium]` `[patch]` Both ticket-read responses carry signed entry credentials and are authorized by a request HEADER (the JWT for `my-tickets`, `x-order-access-token` for `order-tickets`), but emitted no cache directives — and every hop in front of Strapi keys its cache on the URL alone, so a shared `/order-tickets/TW-…` entry could hand one buyer's QR to the next requester. Fixed: `Cache-Control: private, no-store` plus `Vary` on both handlers; controller tests assert the headers.
  - `[low]` `[patch]` `findTicketsForUser` passed `pagination: { limit: -1 }`, which the Document Service does not understand: `@strapi/utils`' `Params` type (`convert-query-params.d.ts`) takes `limit`/`start` at the TOP level and has no `pagination` key at all, so the parameter was spread through to the db query untouched and the unbounded-page intent was never applied — while the test asserted that exact meaningless shape. (Behaviourally the read was already unbounded, since an absent limit and `limit: -1` both convert to "no limit" — so pass 1's stated defect and its stated fix were both fiction.) Fixed: top-level `limit: -1`; the test now asserts the working shape AND that no `pagination` key is passed. The `user-engagement` precedent this copied carries the same unverified shape.
  - `[low]` `[patch]` `config/index.ts` declared `qrPayloadVersion: 1` commented "bump to rotate the token format", but `services/qr.ts` hardcodes `QR_PAYLOAD_VERSION` and derives both the minted `TWQ<n>` prefix and the single version `verify` accepts from that constant — a repo-wide grep found no reader. A rotation lever wired to nothing is worse than no lever. Fixed: config key removed, with a comment recording that the version is a code-level decision because bumping it must also decide which older versions stay verifiable.
  - `[low]` `[patch]` The QR's accessible name was a hardcoded English template (`` `QR code for ticket ${ticket.id}` ``), contradicting the spec's "all user-facing strings come from the `ticketing` next-intl namespace" — Arabic and French screen-reader users got English. Fixed: new `ticketCard.qrAlt` key in fr/ar/en, threaded through `TicketQRLabels` / `buildTicketListLabels`; the ticket number stays announced because it is already visible text directly below the code. Eight assertions across four suites plus two Storybook label sets updated.
  - `[low]` `[patch]` `TicketQR.test.tsx`'s "encodes the opaque qrData token, not the ticket id" could not fail: it asserted `path` count `> 0` (true for ANY encoded value) and that the SVG's `textContent` omits the token (vacuous — an SVG QR has no text nodes). Swapping `value={ticket.qrData}` for `value={ticket.id}` — putting the guessable ticket number on the wire instead of the signed token — left it green. Fixed: the test now compares real rendered module geometry across three distinct values.
- notes (pass 3): Third parallel Blind Hunter + Edge Case Hunter + Verification Gap pass over the same baseline diff. Every load-bearing claim was re-verified in the repo before triage rather than taken at face value — the `qrcode.react` capacity throw was reproduced empirically, the `pagination` shape checked against `@strapi/utils`' own type declaration, and the excluded test file confirmed with `git check-ignore`. Rejected on the evidence: the `qrCode: ""` pre-filter/CAS asymmetry (nothing writes an empty string, and DW-241's proposed widening subsumes it); refunded tickets still scanning and the `scan` handler's 400-vs-404 (Epic 8 scanner scope, and no cancellation flow exists); repeated-confirm read amplification (the pre-filter already skips issued tickets); a `dateUnknown` fallback for an unparseable showtime (cosmetic, and needs three locales of copy for a state the backend does not produce); `orderAccess` duplicate-`orderNumber` dedupe and a null-`ticketNumber` issuance guard (both require corrupt state that nothing produces); `addToWallet`/`share` as dead translations (they are live `TicketQR` labels — `showActions` defaults true and Storybook exercises them); `MyTicketsView`'s reference-compare `handleSettled` guard (no behavioural effect); `respondError`'s static `CheckoutError`/"Checkout failed" prose (deliberately non-semantic — the client keys off `details.code`); the `ORDER_ACCESS_LIMIT` cap and silent save failure (already DW-239); the unreachable-on-the-wire 401 and the registered-but-unattached `is-ticket-owner` policy (the handler guard is correct defense-in-depth; the wire status is the permission-grant matter now split across DW-237 and DW-245); and `tickets/page.tsx` having no test of its own (file-based routing makes its removal self-evident, and the reviewer raising it did not treat it as a gap). Five new deferrals recorded (DW-245 the public proxy substitutes a read-only API token that cannot reach a custom action, which also makes `findTicketsForOrder`'s `isOwner` branch unreachable — a different defect from DW-237, whose role-grant fix would not help; DW-246 sign-out destroying guest order tokens beyond the shared-device case; DW-247 the offline indefinite spinner, reachable because react-query PAUSES offline queries; DW-248 the sibling `GET /orders/:orderNumber` still being a public existence/payment-status oracle on Strapi directly; DW-249 the un-pluralized Arabic `tickets` key, deferred rather than patched because Arabic's six plural categories need a native-speaker decision).

## Design Notes

- **Token format.** `TWQ1.<base64url(JSON payload)>.<base64url(HMAC-SHA256(payloadSegment))>`. Payload keys are short to keep QR density low:
  ```json
  { "v": 1, "o": "TW-…", "t": "TW-…-1", "ti": "<ticket documentId>", "n": "<nonce>", "ty": "standard", "ev": "<eventId>", "et": "Titre", "st": "2026-08-20T19:30:00.000Z", "iat": 1785… }
  ```
  The signature is computed over the **encoded** payload segment (not the re-serialized object) so verification never depends on key ordering.
- **Why issuance moved to the paid CAS.** `reconcileFromGateway`'s `updateMany WHERE paymentStatus="pending"` is the one exactly-once transition in the system (Story 6.3). Hanging issuance off the `count === 1` winner gives "generated when payment succeeds" for free and makes double-issuance structurally impossible; the per-ticket `if (ticket.qrCode) continue` guard plus the already-`paid` self-heal path make the operation safe to repeat from either the webhook or the client confirm.
- **Why a per-order access token.** Guest ticket viewing must work without an account (epic constraint), but `orderNumber` is `TW-<ts36>-<4 random>` — weak enough to enumerate. A 24-byte random `accessToken` returned by `POST /orders` and kept in the buyer's own `localStorage` (never in the Konnect redirect URL, never in a server log) is the smallest thing that authorizes a guest read. Authenticated owners are authorized by JWT instead and need no token.
- **Why the route prefix matters.** `isStrapiEndpointAllowed` uses `startsWith`, and Story 6.3's review deliberately removed `GET api/ticketing/orders` because it exposed full guest PII by order-number enumeration. Hence `order-tickets/:orderNumber`, not `orders/:orderNumber/tickets`.
- **Third-party QR image.** `TicketQR` currently builds `https://api.qrserver.com/...?data=<qrData>`. Once `qrData` is a real entry credential this ships every buyer's signed ticket to an unrelated host on every render, and it cannot work offline (6.7). `qrcode.react`'s `QRCodeSVG` is a dependency-light inline replacement; `level="H"` keeps it scannable on a scratched/dimmed screen.
- **Scope line vs 6.6.** 6.4 delivers the data path and a flat list so the AC "tickets are immediately available in Mes Billets" is real and the bottom-nav tab stops 404-ing. Grouping by event/date, QR-preview → full-ticket interaction, and the "Historique" section are 6.6's job and are deliberately absent.

## Verification

**Commands:**

- `yarn install --frozen-lockfile` (worktree has no `node_modules`; run before anything else — after `yarn add qrcode.react` updates the lockfile, re-run plain `yarn install`) -- expected: completes.
- `yarn workspace @tiween/admin test` -- expected: all ticketing/payments unit suites pass, including the new `qr` and ticket-read suites; no suite skipped. (The Strapi app's package name is `@tiween/admin`, not `@tiween/strapi`.)
- `yarn workspace @tiween/admin typecheck` -- expected: no new errors in touched files (9 pre-existing `user-engagement` baseline errors may remain). The script is `typecheck`, not `type-check`.
- `yarn workspace @tiween/client test` -- expected: new TicketQR / TicketList / hooks / orderAccess / MyTickets / ResultView / request-auth tests pass; existing tickets suites stay green.
- `yarn workspace @tiween/client typecheck` -- expected: no new errors versus the pre-existing baseline (69 errors at this revision, all in untouched stories/schemas/components).
- `yarn workspace @tiween/client lint` -- expected: clean on touched files.

**Manual checks:**

- With `TICKET_QR_SECRET` set, complete a sandbox checkout: before payment the tickets have no `qrCode`; after the confirm/webhook settles the order `paid`, each ticket has a distinct `TWQ1.` token, the result page renders inline SVG QRs (verify in devtools that no `api.qrserver.com` request is made), and `/fr/tickets` lists them. Re-trigger the confirm and verify the tokens are unchanged. Unset the secret and confirm boot only warns.

## Auto Run Result

Status: done — third (follow-up) review pass over the already-implemented Story 6.4 diff (`babe606..HEAD`). No intent gaps and no spec defects; 7 findings auto-patched, 5 deferred, 14 rejected.

**Change reviewed:** HMAC-signed QR ticket issuance on the exactly-once paid transition, two authorization-gated ticket read endpoints, inline `qrcode.react` rendering, and the minimal "Mes Billets" page. This pass made no change to the signing, issuance or authorization logic. Its fixes bound the QR payload, correct two parameters/config knobs that expressed an intent they never applied, harden the credential-bearing responses against shared caches, move the last hardcoded user-facing string into the `ticketing` namespace, and repair two tests that could not fail.

**Files changed in this pass:**

- `apps/strapi/.../services/qr.ts` — new `MAX_EVENT_TITLE_LENGTH = 80`; `buildPayload` truncates `et` so a pathological event title cannot exceed QR capacity (which `qrcode.react` answers by THROWING, blanking the whole page).
- `apps/strapi/.../services/order.ts` — `findTicketsForUser` uses a top-level `limit: -1`, the only shape the Document Service understands; docstring corrected.
- `apps/strapi/.../controllers/order.ts` — new `noStore()` helper; both `myTickets` and `orderTickets` now set `Cache-Control: private, no-store` and `Vary`.
- `apps/strapi/.../config/index.ts` — removed the dead `qrPayloadVersion` knob, with a comment on why the version belongs in code.
- `apps/client/.../TicketQR/TicketQR.tsx` — `aria-label` comes from a new `qrAlt` label instead of a hardcoded English template.
- `apps/client/.../utils/ticketLabels.ts` + `locales/{fr,ar,en}.json` — new `ticketCard.qrAlt` key in all three locales.
- `apps/client/.../result/page.test.tsx` — force-tracked (`git add -f`); it was untracked and git-excluded, so pass 2's recorded coverage was not actually in the change.
- Tests: `qr.unit.test.ts` (+3 payload-bound), `order.unit.test.ts` (cache headers), `order-tickets.unit.test.ts` (working pagination shape), `TicketQR.test.tsx` (rewritten — real module-geometry comparison + a localized-label test); `TicketList.test.tsx`, `MyTicketsView.test.tsx`, `ResultView.test.tsx`, `TicketQR.stories.tsx` updated for the new label.

**Review findings:** 7 patches applied (3 medium: an AC-covering test that was silently git-excluded, an unbounded QR payload field that can crash the whole page, missing cache directives on credential-bearing responses; 4 low: an inert `pagination` parameter, a rotation lever wired to nothing, a hardcoded English accessible name, a test that could not fail). 5 deferred (DW-245..DW-249). 14 rejected — each checked against the code rather than dismissed; see the pass-3 triage notes.

**Verification performed:**

- `yarn workspace @tiween/client test` — 86 files, 902 tests, all pass.
- `yarn workspace @tiween/admin test` — 58 suites, 861 tests, all pass (was 858; +3 new).
- `yarn workspace @tiween/client typecheck` — 69 errors, identical to the pre-existing baseline; the 2 errors this pass introduced (Storybook label sets missing the new key) were fixed before the count was re-measured.
- `yarn workspace @tiween/admin type-check` — 0 errors.
- `yarn workspace @tiween/client lint --max-warnings=0` and `yarn workspace @tiween/admin lint` — both clean.
- Prettier applied to every touched file, then all gates re-run.
- Empirical check backing the payload bound: `renderToString(<QRCodeSVG level="H" …/>)` against the installed `qrcode.react@4.2.0` renders 1600 chars and throws "Data too long" at 2000.
- Note: the repo's `yarn` shim is broken (asdf), so all gates were run as `node <nix yarn.js>` under asdf node 22.22.0. Correcting the pass-2 record: the Strapi workspace script is `type-check` (hyphenated) on `@tiween/admin`, not `typecheck`.

**Residual risks:**

- DW-245 is the sharpest new one: the guest ticket read is proxied with a read-only Strapi API token, which cannot reach a custom controller action — so `GET /order-tickets/:orderNumber` may 403 in a deployed environment regardless of the role grant DW-237 proposes, and `findTicketsForOrder`'s documented `isOwner` path is unreachable from the app. Neither new route is exercised through a booted Strapi anywhere in the suite.
- DW-241 remains open and unchanged: tickets created before this story carry an unsigned legacy `qrCode` that `issueForOrder` can never replace, and the read endpoints serve it as a scannable QR. It must be handled by a backfill before Epic 6 ships.
- The manual sandbox checkout described in the Verification block has still not been run in this worktree (no booted Strapi); backend behaviour is covered by unit tests only.

**Follow-up review recommendation: false.** Three consecutive passes have converged with declining consequence — 11 patches in pass 1, 7 in pass 2, 7 here, and this pass changed no signing, issuance or authorization logic. Its fixes are individually narrow and each is pinned by a gate-verified test: the payload bound by three new tests, the cache headers by controller assertions, the label change by four updated suites, the pagination shape by an assertion that now also rejects the old form. What remains genuinely open is deferred work (DW-245's proxy/API-token authorization and DW-241's legacy unsigned rows) that no static review pass can settle — it needs a booted Strapi and a deploy-time decision, not another read of the same diff.
