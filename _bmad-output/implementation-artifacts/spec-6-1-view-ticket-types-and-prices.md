---
title: "Story 6.1: View Ticket Types and Prices"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "67b5044592de15d40d7ff2e5a3d20d8743cde933"
final_revision: "23ab7d15165e725e87e0a4600be937b941fa8cec"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** A visitor on an event detail page can tap a showtime, but the ticketing destination is a dead link (404) and there is no data model, API, or UI to show the ticket types on offer. Sub-events (`screening`/`performance`) carry only a single `price` + `ticketsAvailable`, so tiered pricing (Plein tarif, Tarif réduit, VIP) with per-type availability and restrictions cannot be displayed — the visitor cannot understand their options before deciding to buy.

**Approach:** Add a repeatable `ticketing.ticket-tier` component to `screening`/`performance`, seed realistic tiers, expose a public read endpoint that returns a sub-event's tiers with computed availability, and build the `/[locale]/tickets/[documentId]/[screeningId]` view that lists each type with its translated label, TND-formatted price, remaining count, sold-out state, and restriction note. This is READ-ONLY presentation — selection/quantity (6.2) and purchase (6.3) are out of scope.

## Boundaries & Constraints

**Always:**

- Use Strapi v5 Document Service API only; module-level UID constants (never inline UID strings); one repeatable component `ticketing.ticket-tier` embedded on both `screening` and `performance`.
- Currency comes from plugin config (`strapi.config.get("plugin::ticketing.defaultCurrency", "TND")`), never a hardcoded literal on the backend. The display symbol "DT" is a frontend formatting concern.
- Ticket-type LABELS (Plein tarif / Tarif réduit / VIP) are produced by frontend i18n keyed on the `type` enum (`standard`/`reduced`/`vip`) — not stored strings.
- Error responses return SCREAMING_SNAKE codes (e.g. `SUB_EVENT_NOT_FOUND`), never prose; validate inputs with Zod; the endpoint is public (`auth: false`) and returns the Strapi v5 `{ data, meta }` shape untransformed.
- Frontend: React Server Component page threading localized `labels`; interactive/dynamic tier data fetched client-side with `@tanstack/react-query` (factory query keys); every async path has loading + error + empty states using the Epic-2A common components.
- i18n strings added to all three `locales/{fr,ar,en}.json`; Arabic uses Western (Latin) numerals for prices and counts.
- Co-locate Vitest `*.test.tsx` and Storybook `*.stories.tsx` with new components.

**Block If:**

- Displaying tiers would require changing the contract or write semantics of `events-manager.public-api.adjustInventory` or the atomic-inventory / Unit-of-Work write path (it must not — this story is read-only).
- The intended tier model cannot be expressed as an additive component without breaking the existing single-`price`/`ticketsAvailable` inventory used by the current event-detail flow.

**Never:**

- Modify `adjustInventory`, `order.createOrder`, or any inventory/order write path.
- Implement ticket selection, quantity stepping (6.2), payment (6.3), QR generation (6.4), or wire a real "Continue/Buy" action.
- Reach into another plugin's content types with a foreign UID; tier reads live in `events-manager` (which owns sub-events).
- Introduce a new `packages/shared-types` package (it does not exist here — co-locate types in the feature).

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                                                                    | Expected Output / Behavior                                                                                                                                                          | Error Handling                        |
| ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| All tiers available      | `GET /events-manager/showtimes/:documentId/ticket-tiers`, screening with 3 tiers | `200 { data: { subEventId, kind:"screening", startDateTime, currency:"TND", tiers:[{type,price,ticketsAvailable,ticketsSold,remaining,soldOut:false,restrictionNote}] }, meta:{} }` | No error expected                     |
| Tier sold out            | tier where `ticketsSold >= ticketsAvailable`                                     | that tier returns `remaining:0, soldOut:true`; frontend renders it disabled + "Complet" badge, non-selectable                                                                       | No error expected                     |
| Restriction present      | tier with `restrictionNote:"sur justificatif"`                                   | note returned verbatim and shown under the tier                                                                                                                                     | No error expected                     |
| Performance sub-event    | documentId belongs to a `performance` not a `screening`                          | resolves via fallback; `kind:"performance"`, tiers returned                                                                                                                         | No error expected                     |
| Unknown / unpublished id | documentId matches no published screening or performance                         | `404`                                                                                                                                                                               | `ctx.notFound("SUB_EVENT_NOT_FOUND")` |
| No tiers configured      | screening exists, `ticketTiers` empty                                            | `200 { data: { tiers: [] } }`; frontend shows empty state                                                                                                                           | No error expected                     |
| Arabic locale            | page rendered with `locale=ar`                                                   | price "15,00 DT" and "12 restants" use Western numerals                                                                                                                             | No error expected                     |

</intent-contract>

## Code Map

- `apps/strapi/src/components/ticketing/ticket-tier.json` -- NEW component (create; mirror an existing component under `apps/strapi/src/components/*`).
- `apps/strapi/src/plugins/events-manager/server/src/content-types/screening/schema.json` -- add `ticketTiers` repeatable component field.
- `apps/strapi/src/plugins/events-manager/server/src/content-types/performance/schema.json` -- add `ticketTiers` repeatable component field.
- `apps/strapi/src/plugins/events-manager/server/src/services/ticket-tiers.ts` -- NEW read service (mirror `services/events.ts` idiom).
- `apps/strapi/src/plugins/events-manager/server/src/services/index.ts` -- register `ticket-tiers`.
- `apps/strapi/src/plugins/events-manager/server/src/controllers/ticket-tiers.ts` -- NEW controller (mirror `controllers/events.ts`).
- `apps/strapi/src/plugins/events-manager/server/src/controllers/index.ts` -- register `ticket-tiers`.
- `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts` -- add content-api `GET /showtimes/:documentId/ticket-tiers`.
- `apps/strapi/src/shared/validation.ts` -- existing shared `validate()`/Zod helper to reuse.
- `apps/strapi/src/plugins/ticketing/server/src/config/index.ts` -- source of `defaultCurrency`.
- `apps/strapi/scripts/seeds/index.ts` -- `seedEvents` (~line 353): populate `ticketTiers` on screenings/performances.
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/page.tsx` (+ `loading.tsx`) -- NEW route; the destination `EventDetailPage.handleShowtimeSelect` already links to.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- existing navigation source (reference only; do not change behavior).
- `apps/client/src/features/tickets/components/TicketTypeList/` -- NEW component (`.tsx`, `.test.tsx`, `.stories.tsx`, `index.ts`).
- `apps/client/src/features/tickets/components/index.ts` -- export `TicketTypeList`.
- `apps/client/src/features/tickets/hooks/useTicketTiers.ts` (+ `.test.ts`) -- NEW react-query hook + key factory.
- `apps/client/src/features/tickets/utils/formatPrice.ts` (+ `.test.ts`) -- NEW shared TND formatter ("15,00 DT").
- `apps/client/src/features/tickets/types.ts` -- NEW co-located `TicketTier` / `TicketTiersResponse` types.
- `apps/client/src/lib/strapi-api/{base.ts,public.ts}` -- `PublicStrapiClient`; add the ticket-tiers path/endpoint if the client requires a registered endpoint.
- `apps/client/src/features/tickets/components/OrderSummary/OrderSummary.tsx` -- reference for the "15,00 DT" format (dedup deferred, see Design Notes).
- `apps/client/locales/{fr,ar,en}.json` -- add `ticketing` namespace strings.
- `apps/client/src/components/common/Skeleton/` (`TicketCardSkeleton`), `EmptyState`, `ErrorBoundary`; `apps/client/src/lib/dates.ts` -- Western-numeral pattern for Arabic.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/components/ticketing/ticket-tier.json` -- create repeatable component with fields: `type` (enumeration `standard|reduced|vip`, required), `price` (decimal, required, default 0), `ticketsAvailable` (integer, required, default 0), `ticketsSold` (integer, default 0), `restrictionNote` (string, optional) -- the tier catalog per sub-event.
- [x] `.../content-types/screening/schema.json` & `.../content-types/performance/schema.json` -- add `"ticketTiers": { "type": "component", "repeatable": true, "component": "ticketing.ticket-tier" }` -- attach tiers to both sub-event kinds without touching existing `price`/`ticketsAvailable`/`ticketsSold`.
- [x] `.../services/ticket-tiers.ts` -- `findSubEventTicketTiers(documentId, kind?)`: read published screening (fallback performance when `kind` absent/unmatched) via Document Service populating `ticketTiers`; return `null` when neither exists; map each tier to `{ type, price, ticketsAvailable, ticketsSold, remaining: max(0, available - sold), soldOut: remaining <= 0, restrictionNote: restrictionNote ?? null }`; attach `currency` from config and `subEventId`, `kind`, `startDateTime` -- single source of the read shape.
- [x] `.../services/index.ts` -- register `"ticket-tiers"`.
- [x] `.../controllers/ticket-tiers.ts` -- `findTicketTiers(ctx)`: Zod-validate `documentId` param (non-empty) and optional `kind` (`screening|performance`); on invalid `ctx.badRequest("INVALID_PARAMS")`; call service; `null` → `ctx.notFound("SUB_EVENT_NOT_FOUND")`; else `ctx.body = { data, meta: {} }` -- public read controller.
- [x] `.../controllers/index.ts` -- register `"ticket-tiers"`.
- [x] `.../routes/index.ts` -- add content-api route `GET /showtimes/:documentId/ticket-tiers` → `ticket-tiers.findTicketTiers` with `auth: false` (no ordering conflict with `/events/*`).
- [x] `apps/strapi/scripts/seeds/index.ts` -- in `seedEvents`, add `ticketTiers` to each created screening/performance: three tiers (`standard`, `reduced`, `vip`) with distinct prices; at least one sold-out tier (`ticketsSold >= ticketsAvailable`) and the `reduced` tier carrying `restrictionNote: "sur justificatif"` -- realistic data to test against.
- [x] `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/ticket-tiers.test.ts` -- unit-test the I/O matrix: remaining/soldOut computation, restriction passthrough, performance fallback, not-found → null, currency sourced from config.
- [x] `apps/client/src/features/tickets/utils/formatPrice.ts` (+ `.test.ts`) -- `formatPrice(amount: number, currency = "TND"): string` → `"15,00 DT"` (2 decimals, comma separator, `TND`→`DT` symbol); test the DT mapping and comma formatting.
- [x] `apps/client/src/features/tickets/types.ts` -- export `TicketTier` and `TicketTiersResponse` interfaces matching the endpoint shape.
- [x] `apps/client/src/features/tickets/hooks/useTicketTiers.ts` (+ `.test.ts`) -- `ticketTierKeys.list(subEventId)` factory + `useTicketTiers(subEventId)` querying `GET /events-manager/showtimes/:documentId/ticket-tiers` via `PublicStrapiClient`, returning typed `TicketTiersResponse`; mock the client in the test.
- [x] `apps/client/src/features/tickets/components/TicketTypeList/TicketTypeList.tsx` (+ `index.ts`, `.stories.tsx`, `.test.tsx`) -- props `{ tiers, currency, labels }`; render one row per tier: label `labels[type]`, price `formatPrice(price, currency)`, availability `labels.remaining(remaining)` → "12 restants", sold-out rows with a `Complet` badge + `aria-disabled` and non-selectable styling, restriction note shown when present; list semantics + RTL-aware. Test: renders all tiers, sold-out disabled, restriction shown, price formatted.
- [x] `apps/client/src/features/tickets/components/index.ts` -- export `TicketTypeList`.
- [x] `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/page.tsx` (+ `loading.tsx`) -- RSC that reads the event (existing `getEventByDocumentId`) for header context, builds localized `labels` via `getTranslations`, and renders a client child that calls `useTicketTiers(screeningId)` and shows `TicketTypeList` with loading (`TicketCardSkeleton`), error, and empty (`EmptyState`) states.
- [x] `apps/client/locales/{fr,ar,en}.json` -- add a `ticketing` namespace: type labels (`standard`→"Plein tarif"/…/EN/AR), `remaining` ("{count} restants"), `soldOut` ("Complet"), `restrictionPrefix`/note display, and page title; Western numerals in `ar.json`.

**Acceptance Criteria:**

- Given a published event whose screening has ticket tiers, when I open `/[locale]/tickets/[eventDocumentId]/[screeningId]`, then I see every ticket type with its translated label, price formatted as "15,00 DT", and remaining availability as "X restants".
- Given a tier is sold out, when the page renders, then that tier shows a sold-out indicator ("Complet") and is not selectable.
- Given a tier has a restriction note, when the page renders, then the note (e.g. "sur justificatif") is displayed with that tier.
- Given the tier request is loading / errors / returns no tiers, when the page renders, then a skeleton / error state / empty state is shown respectively.
- Given `locale=ar`, when prices and counts render, then Western (Latin) numerals are used.
- Given the ticketing plugin `defaultCurrency` config, when the endpoint returns tiers, then `currency` derives from config and no currency literal is hardcoded on the backend.
- Given the endpoint receives an unknown sub-event documentId, when called, then it responds `404` with code `SUB_EVENT_NOT_FOUND`.

## Design Notes

- **Additive, read-only model.** The existing sub-event `price`/`ticketsAvailable`/`ticketsSold` and the `adjustInventory` write path are left untouched. `ticketTiers` becomes the display source of truth; reconciling per-tier inventory with the purchase write path is explicitly deferred to Stories 6.2/6.3 (record in `{implementation_artifacts}/deferred-work.md`). Because this story never writes inventory, no change to the atomic facade is needed.
- **Kind resolution.** The frontend link carries a sub-event documentId that may be a screening or a performance. The service resolves by kind when provided, else tries screening then performance — one extra Document Service read in the miss case is acceptable for a public read.
- **Currency vs symbol.** Backend returns the ISO-ish config code (`"TND"`); the frontend `formatPrice` maps `TND`→`DT` for display, keeping the backend config-driven per Epic-6 rules. Golden output: `formatPrice(15, "TND") === "15,00 DT"`.
- **Formatter dedup.** `OrderSummary.tsx` (and `QuantitySelector`, desktop prototypes) each re-implement `.toFixed(2).replace(".", ",")`. This story introduces the shared `formatPrice` and uses it in the new component; refactoring the existing components to consume it is deferred cleanup (log in `deferred-work.md`) to keep this pass's blast radius contained.
- **Selectability.** Non-sold-out rows render an enabled affordance but wire no selection handler — actual selection + quantity is Story 6.2. Only the "sold-out is not selectable" half of the AC is behaviorally enforced here.

## Verification

**Commands:**

- `yarn type-check` -- expected: no TypeScript errors across client + strapi.
- `yarn lint` -- expected: clean.
- `yarn test` -- expected: new Vitest suites (formatPrice, useTicketTiers, TicketTypeList, ticket-tiers service) pass alongside existing tests.

**Manual checks:**

- Re-seed (`yarn dev:strapi` seed flow) and hit `GET /events-manager/showtimes/:documentId/ticket-tiers` for a seeded screening — confirm 3 tiers with `remaining`/`soldOut`/`restrictionNote` and `currency:"TND"`; unknown id returns `404 SUB_EVENT_NOT_FOUND`.
- Load `/[locale]/tickets/[eventDocumentId]/[screeningId]` in fr/ar/en — verify labels, "15,00 DT" pricing, "12 restants", "Complet" on the sold-out tier, restriction note on the reduced tier, and Western numerals under `ar`.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Empty until the first bad_spec loopback. -->

## Review Triage Log

### 2026-07-10 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 2, low 1)
- defer: 4: (medium 1, low 3)
- reject: 13
- addressed_findings:
  - `[high]` `[patch]` Postgres returns `decimal` (tier `price`) as a string; `toNumber` rejected strings and collapsed every price to `0` ("0,00 DT"). Widened `toNumber` to coerce numeric strings and added a service test feeding `price: "15.50"`.
  - `[medium]` `[patch]` Controller `findTicketTiers` (AC #7 404 code, `INVALID_PARAMS`, `{data,meta}` envelope) had no test — added `controllers/__tests__/ticket-tiers.unit.test.ts` (6 tests) mirroring the sibling `events` controller test.
  - `[medium]` `[patch]` `TicketTypesSection` loading/error/empty/populated routing (AC #4) was untested and outside the vitest include globs — added `TicketTypesSection.test.tsx` (4 tests) and an `src/app/**/tickets/**` include glob.
  - `[low]` `[patch]` Story-6.1 proxy allowlist entry (`api/events-manager/showtimes` GET) was unasserted despite the repo convention of pinning each addition — added a Story-6.1 block to `request-auth.test.ts`.

### 2026-07-10 — Follow-up review pass

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 2, low 0)
- defer: 3: (medium 1, low 2)
- reject: 13
- addressed_findings:
  - `[medium]` `[patch]` French `ticketing.remaining` used a non-plural `"{count} restants"` while sibling count keys use ICU plural, so a tier with exactly 1 ticket left rendered the ungrammatical "1 restants". Converted to `{count, plural, one {# restant} other {# restants}}` in `fr.json` (label already passes `count` as a named ICU arg).
  - `[medium]` `[patch]` The `ticket-tiers` service unit test's Strapi mock ignored `findOne` arguments, so neither the `status: "published"` filter (a draft-leak guard on this `auth:false` public endpoint) nor `populate: { ticketTiers: true }` (dropping it would empty every tier list) was verified — both regressions shipped green. Made the mock record every `findOne` call and added a test asserting the exact `{ documentId, status: "published", populate: { ticketTiers: true } }` args.

## Auto Run Result

Status: done

**Summary:** Delivered Story 6.1 (View Ticket Types and Prices) as a read-only vertical slice. Added a `ticketing.ticket-tier` repeatable component to the `screening`/`performance` sub-events, seeded tiered data, exposed a public read endpoint `GET /events-manager/showtimes/:documentId/ticket-tiers` (computed `remaining`/`soldOut`, currency from config), and built the `/[locale]/tickets/[documentId]/[screeningId]` page that lists each ticket type with its translated label, TND-formatted price ("15,00 DT"), remaining count ("12 restants"), non-selectable sold-out state ("Complet"), and restriction note. No inventory/order write path was touched.

**Files changed (one-line):**

- `apps/strapi/src/components/ticketing/ticket-tier.json` — new repeatable tier component (type/price/availability/sold/restriction).
- `apps/strapi/.../content-types/{screening,performance}/schema.json` — added `ticketTiers` component field (legacy inventory fields untouched).
- `apps/strapi/.../services/ticket-tiers.ts` (+ `services/index.ts`) — read service computing `remaining`/`soldOut`, currency from `plugin::ticketing.defaultCurrency`; coerces Postgres string-decimals.
- `apps/strapi/.../controllers/ticket-tiers.ts` (+ `controllers/index.ts`) — public controller: Zod-validated params, `SUB_EVENT_NOT_FOUND` 404, `{data,meta}` envelope.
- `apps/strapi/.../routes/index.ts` — content-api `GET /showtimes/:documentId/ticket-tiers` (`auth:false`).
- `apps/strapi/scripts/seeds/index.ts` — seeds 3 tiers/sub-event (a sold-out vip, a reduced tier with restriction).
- `apps/strapi/.../{services,controllers}/__tests__/ticket-tiers.unit.test.ts` — service (8) + controller (6) unit tests.
- `apps/client/src/features/tickets/{utils/formatPrice.ts,types.ts,hooks/useTicketTiers.ts,components/TicketTypeList/*}` — formatter, types, react-query hook, list component (+ co-located tests/stories).
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/{page.tsx,loading.tsx,TicketTypesSection.tsx,TicketTypesSection.test.tsx}` — RSC route + client state routing (loading/error/empty/populated) + test.
- `apps/client/locales/{fr,ar,en}.json` — `ticketing` namespace (Western numerals in `ar`).
- `apps/client/src/lib/strapi-api/request-auth.ts` (+ `.test.ts`) — allowlisted the public showtimes GET (+ assertions).
- `apps/client/vitest.config.ts` — include globs for the tickets feature + tickets route tests.

**Review findings breakdown:** 4 patches applied (1 high: Postgres decimal→string price coercion; 2 medium: controller-contract test, section state-routing test + include glob; 1 low: allowlist test). 4 deferred (event↔sub-event ownership mismatch [medium]; 404-vs-transient retry UX, public sold-count disclosure, seed-tier test coverage [low]) — logged in `deferred-work.md`. 13 rejected as noise/unreachable-given-contract/inherent. 0 intent gaps, 0 bad-spec loopbacks.

**Verification:** strapi `yarn test` 266/266 pass; client `yarn test` 520/520 pass (incl. all new suites). Type-check: new files clean; pre-existing baseline type errors remain in untouched Epic-2A components (`PaymentForm`, `SeatSelector`, `ShowtimeButton.stories`) — not caused by this story. Lint: new files clean.

**Residual risks:** (1) The Postgres decimal-string coercion is verified by a string-input unit test but not by a live-pg integration test (none exists in the repo). (2) Per-tier inventory is display-only and must be reconciled with the atomic purchase write path in Stories 6.2/6.3 (deferred). (3) An event↔sub-event URL mismatch renders incoherent context (deferred). A follow-up review is recommended given the high-severity price-correctness fix.

**Follow-up review (2026-07-10):** A fresh independent review pass (Blind Hunter, Edge Case Hunter, Verification Gap) ran against the full diff. Two medium patches applied: (1) French `ticketing.remaining` converted to ICU plural so a 1-ticket tier no longer renders "1 restants"; (2) the `ticket-tiers` service test mock now records `findOne` args and asserts `status: "published"` + `populate: { ticketTiers: true }`, closing a verification gap where a draft-leak or dropped-populate regression on the public endpoint would have shipped green. Verification: strapi ticket-tiers suites 14/14 pass; client tickets suites 30/30 pass; all locale JSON valid. Three new findings deferred (restriction-note i18n [medium]; error-state alert semantics [low]; proxy allowlist prefix breadth [low]) — appended to `deferred-work.md`. 13 findings rejected as spec-sanctioned/unreachable/noise. 0 intent gaps, 0 bad-spec loopbacks. Both fixes are localized (one locale string, one test), so no further independent follow-up review is recommended.
