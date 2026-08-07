---
title: "Gate Ticketing Entry Points for V1 (Story 3.12)"
type: "feature"
created: "2026-08-07"
status: "done"
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: "e3c3f49f5bbfb221969e8be5cb391d7dbd9984db"
sprint_key: "3-12-gate-ticketing-entry-points-for-v1"
depends_on: []
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
warnings: ["oversized"]
deferred:
  - summary: >-
      Desktop-prototype mockup pages film-detail and theater-detail remain
      routable in production and render hardcoded ticket prices and dead
      "Réserver des billets" CTAs regardless of the purchase flag.
    evidence: |-
      apps/client/src/app/[locale]/desktop-prototypes/film-detail/page.tsx
      renders `{showtime.price} DT` (~line 445) plus a static reserve button
      (~line 464); theater-detail/page.tsx renders "25 TND" (~line 350) and the
      same dead CTA (~line 360). Static design mockups predating story 3-12;
      the middleware gate deliberately covers only desktop-prototypes/ticketing*.
      Broader question is whether any /desktop-prototypes route should ship in
      production builds at all.
    location: >-
      apps/client/src/app/[locale]/desktop-prototypes/{film-detail,theater-detail}/page.tsx
    severity: low
  - summary: >-
      `yarn workspace @tiween/client build` fails on pre-existing strict
      TypeScript errors unrelated to story 3-12; the failure reproduces
      identically at the story's baseline revision.
    evidence: |-
      At HEAD and at baseline e3c3f49 alike, the build's "Running TypeScript"
      phase stops — first on desktop-prototypes/ticketing-quantity/page.tsx
      (`quantities[type.id]` possibly undefined under noUncheckedIndexedAccess),
      then on events/[documentId]/page.tsx:211 (`EventSchema` not assignable to
      JsonLd's `Record<string, unknown>`). `tsc` reports the same 63
      pre-existing errors at HEAD and at the pre-patch state
      (strapi-api/content/venues.ts locale strings, apps/strapi types imports,
      EventDetailPageWithMap ShowtimeButton prop drift, …). The spec's
      originally recorded "build: compiles successfully" could not be
      reproduced in this environment. Surfaced by the 2026-08-07 follow-up
      review pass.
    location: >-
      apps/client (next build TypeScript phase)
    severity: medium
---

<intent-contract>

## Intent

**Problem:** v1 is an aggregation-only launch (sprint-change-proposal-2026-08-06), but Epic 6 stories 6.1/6.2/6.3 already shipped live purchase surfaces in the client: ticket prices, quantity selection, and Konnect checkout routes. An aggregation-only v1 must expose no checkout.

**Approach:** Introduce one default-off feature flag `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` (validated in `env.mjs` with the existing `optionalZodBoolean` pattern) plus a tiny `isTicketPurchaseEnabled()` helper. Gate: (1) purchase routes via middleware rewrite-to-404 + `notFound()` in the purchase pages; (2) the showtime grids, sticky buy CTAs, and price lines embedded in discovery pages; (3) the `/ticketing/orders` proxy path as defense in depth. Flag on restores everything with zero code changes.

## Boundaries & Constraints

**Always:**

- Flag default is OFF: absence/empty env var ⇒ purchase surfaces hidden. Read the flag through the single helper `isTicketPurchaseEnabled()` — never `process.env` directly at call sites.
- Do not remove, rewrite, or restructure any 6.1/6.2/6.3 code — gate at embed/route seams only (conditional render / early return). Dormant components stay intact and exported.
- Event and venue pages stay fully informational with the flag off: dates, times, showtime _information is allowed to disappear only where it is a purchase control_ (ShowtimeButton grid, buy CTA, prices); detail content, map, and share must remain.
- The BottomNav/DesktopNav "Billets" tab and `/[locale]/tickets` (exact — Mes Billets viewing, Story 6.4) are NOT purchase entry points — leave them untouched. Middleware must not match `/tickets` exact, only `/tickets/<id>/<screeningId>` and deeper.
- Existing ticketing tests must pass with the flag ON (stub/enable the flag in the affected suites); add flag-off tests for the new gating.
- Match repo conventions: strict TS (no `any`), Zod env validation, co-located vitest tests.

**Block If:**

- The gating cannot be made to work without modifying the Strapi `payments`/`ticketing` plugin behavior (backend is out of scope and dormant by decision — a required backend change means the plan is wrong).

**Never:**

- No rollback/deletion of ticketing code, stores, hooks, or tests. No `enabled: false` on the Strapi payments plugin (kills the webhook). No hiding of ticket _viewing_ (`/tickets` exact, TicketList/TicketQR/MyTicketsView). No new feature-flag framework/dependency — one env var + helper.

## I/O & Edge-Case Matrix

| Scenario                            | Input / State                                                       | Expected Output / Behavior                                                                        | Error Handling                                 |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Flag off (default), event detail    | Visitor loads `/[locale]/events/[documentId]`                       | No ShowtimeButton grid, no sticky buy CTA, no "À partir de …" price; dates/venue/map/share intact | No error expected                              |
| Flag off, direct checkout URL       | GET `/[locale]/tickets/<id>/<sid>`, `…/payment`, `…/payment/result` | 404 (middleware rewrite + `notFound()`); no payment flow reachable                                | Renders not-found page                         |
| Flag off, order API via proxy       | `POST /api/public-proxy/ticketing/orders`                           | 404/403 response, request never forwarded to Strapi                                               | Error code, no prose                           |
| Flag off, prototype ticketing pages | GET `/[locale]/desktop-prototypes/ticketing*`                       | 404 via middleware                                                                                | Renders not-found page                         |
| Flag on                             | Same pages loaded with `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED=true`   | 6.1/6.2/6.3 surfaces render exactly as before; checkout routes reachable                          | No error expected                              |
| Flag garbage value                  | `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED=banana`                        | `optionalZodBoolean` coercion ⇒ treated as false (off)                                            | Build-time env validation per existing pattern |

</intent-contract>

## Code Map

- `apps/client/src/env.mjs` -- `@t3-oss/env-nextjs` + Zod; `optionalZodBoolean` helper (lines 5–10). Add `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` in `client:` **and** `runtimeEnv:` (both mandatory).
- `apps/client/src/lib/feature-flags.ts` -- NEW: `isTicketPurchaseEnabled()` reading env once; the single flag seam.
- `apps/client/src/middleware.ts` -- existing gating seam: `authPages` (line 16), regex build (49–53), dispatch (56–58), matcher (64–76). Add purchase-route regex `/(tickets/[^/]+/[^/]+(/payment(/result)?)?|desktop-prototypes/ticketing[^/]*)$` (locale-prefixed) ⇒ rewrite to not-found when flag off.
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/page.tsx` (+ `payment/page.tsx`, `payment/result/page.tsx`) -- purchase pages (6.1/6.2 at line 58 `TicketTypesSection`; 6.3 `PaymentStep`; Konnect result). Add server-side `notFound()` guard at top (belt and braces under middleware).
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- production event detail: Showtimes section 393–432 (ShowtimeButton grid 411–424), `handleShowtimeSelect` router.push 227–229, sticky buy bar 524–558. Only production consumer: `app/[locale]/events/[documentId]/page.tsx:215`.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx` (grid 527–536, push 232–233, CTA 654–666) and `…/EventDetailPageDesktop/EventDetailPageDesktop.tsx` (buttons 746–802, push 198–199, CTA 807–810) -- shipped-but-unrouted variants; gate the same seams (cheap insurance).
- `apps/client/src/features/events/components/EventCard/EventCard.tsx` -- "À partir de …" price at 106–110 and 259–263; a ticket price on discovery surfaces ⇒ gate behind the flag.
- `apps/client/src/app/api/public-proxy/[...slug]/route.ts` -- generic Strapi proxy; block `ticketing/orders` path when flag off (defense in depth; `/ticketing/my-tickets` stays open).
- Tests: `EventDetailPage.test.tsx`, `EventDetailPage.noncinema.test.tsx`, `TicketTypesSection.test.tsx`, `PaymentStep.test.tsx`, `payment/result/*.test.tsx`, `features/tickets/**` suites — assert purchase surfaces ⇒ run with flag stubbed ON; `vitest.config.ts` for env stubbing.
- Read-only reference: BottomNav/DesktopNav (`DesktopNav.tsx:63–64` → `/tickets` viewing), venue page (`venues/[slug]/page.tsx` — no purchase CTA today, nothing to gate), no payment handlers under `app/api/**` besides the generic proxies.

## Tasks & Acceptance

**Execution:**

1. `apps/client/src/env.mjs` + root `.env.example` -- declare `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` (optionalZodBoolean, client + runtimeEnv) and document it default-off -- per-environment configurability AC.
2. `apps/client/src/lib/feature-flags.ts` -- add `isTicketPurchaseEnabled()` (+ unit test) -- single seam for all call sites.
3. `apps/client/src/middleware.ts` -- rewrite locale-prefixed purchase routes and `desktop-prototypes/ticketing*` to not-found when flag off -- checkout unreachable by URL.
4. `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/{page.tsx,payment/page.tsx,payment/result/page.tsx}` -- server-side `notFound()` guard when flag off -- gating holds even if middleware matcher misses.
5. `EventDetailPage.tsx`, `EventDetailPageWithMap.tsx`, `EventDetailPageDesktop.tsx` -- conditionally render showtime grid, sticky buy CTA, and price mentions on the flag; keep informational content -- no purchase control on event pages.
6. `EventCard.tsx` -- gate the "À partir de …" price line -- no ticket prices on discovery surfaces.
7. `apps/client/src/app/api/public-proxy/[...slug]/route.ts` -- reject `ticketing/orders` when flag off with an error code -- no live order creation path.
8. Tests -- stub flag ON in existing purchase-surface suites so they keep passing; add flag-off tests (event detail hides purchase UI; purchase pages `notFound`; proxy rejects orders; EventCard hides price) covering the I/O matrix -- both AC directions verified.

**Acceptance Criteria:**

- Given the flag is off (default), when a visitor browses any event, showtime, or venue page, then no ticket prices, quantity selectors, purchase CTAs, or checkout routes are rendered or reachable, and the pages remain fully informational (dates, times, details, map, share).
- Given the flag is off, when anyone navigates directly to a checkout/purchase route, then they get a not-found response and no live payment flow.
- Given `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED=true`, when the same pages load, then the 6.1/6.2/6.3 purchase surfaces are restored without code changes.
- Given the flag is on, when the existing ticketing unit/integration suites run, then they pass unchanged in substance.
- Given a deployment environment, when the operator sets or omits the env var, then the flag state follows that environment (not hardcoded).

## Spec Change Log

## Review Triage Log

### 2026-08-07 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 3, low 0)
- defer: 1: (high 0, medium 0, low 1)
- reject: 15: (high 0, medium 0, low 15)
- addressed_findings:
  - `[high]` `[patch]` With the flag off, event pages lost showtime **times** entirely (the whole ShowtimeButton grid vanished) — violating the story AC "remain fully informational (dates, times, …)"; on an aggregation-only launch showtimes are core discovery content. All three detail components now render each date group's screening times as plain non-interactive text chips when the flag is off (same formatters, no price, no buy label, no navigation); the flag-on ShowtimeButton path is unchanged. Two-direction test suite (`EventDetailPage.flag.test.tsx`) asserts times visible + purchase surfaces absent (off), and grid + sticky CTA restored (on).
  - `[medium]` `[patch]` Event JSON-LD (`generateEventJsonLd`) still emitted `offers` with ticket prices with the flag off — search engines could surface prices the UI hides. `offers` is now emitted only when `isTicketPurchaseEnabled()`; flag-on output unchanged; both directions unit-tested in `structured-data.test.ts`.
  - `[medium]` `[patch]` AC "flag on restores the 6.1/6.2/6.3 surfaces" had zero test coverage on `EventDetailPage` (flag-on suites mock `ShowtimeButton` to null and assert nothing about purchase surfaces). The new mutable-flag suite asserts the ShowtimeButton sentinel and sticky buy CTA render with the flag on.
  - `[medium]` `[patch]` The `notFound()` guards on the ticket-selection and payment pages had no flag-ON test — an accidentally unconditional `notFound()` would 404 checkout in production undetected. `purchase-pages.flag.test.tsx` now pins both directions (ON: `notFound` not called, `getEventByDocumentId` reached).
  - Deferred (1, see frontmatter `deferred`): desktop-prototypes `film-detail`/`theater-detail` mockups remain routable with hardcoded prices — pre-existing prototype exposure, not a 6.1/6.2/6.3 surface.
  - Rejected (15, all low): proxy error code has no client consumer (UI that calls it is hidden; repo-wide code-not-prose convention); no flag-off tests for the unrouted WithMap/Desktop variants (dead code, gated as insurance); prototype regex not covering hypothetical nested `ticketing/...` routes (none exist); sprint-status.yaml not updated (orchestrator-owned, never updated by build-auto); unlocalized 404 on the middleware rewrite for prototypes (accepted in Design Notes; real checkout routes get the localized `notFound()`); flag/navigation module coupling forcing test mocks (working test hygiene preference); spec matrix "404/403" vs implemented 404 (404 satisfies "404/403"); visually empty "Séances" section (resolved by the high patch's time chips); EventCard try/finally flag reset style; unstubbed global fetch in `route.flag.test.ts`; `as never` cast in a test fixture; no Dokploy rollout doc beyond `.env` examples (documented where operators look); template-mandated empty log sections/`oversized` warning; kill-switch blocking `orders/:n/confirm` mid-flight (impossible in v1 — checkout was never reachable; Strapi-side Konnect webhook still settles payments); runtime-vs-inlined env divergence if the var changes without rebuild (documented; Dokploy redeploys rebuild).

### 2026-08-07 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 3, low 1)
- defer: 1: (high 0, medium 1, low 0)
- reject: 15: (high 0, medium 0, low 15)
- addressed_findings:
  - `[medium]` `[patch]` The flag-off plain time chips dropped informational content that is not a purchase control: format badges (VOST/VF/3D/…) and sold-out state, both rendered by the flag-on ShowtimeButton path. All three detail components (`EventDetailPage`, `EventDetailPageWithMap`, `EventDetailPageDesktop`) now render the format badge(s) and, for sold-out screenings, a struck-through time plus the localized "Complet" badge on the non-interactive chips — still no price, no buy label, no navigation. `EventDetailPage.flag.test.tsx` extended with a formatted + a sold-out showtime and a test pinning badge/strike-through presence flag-off.
  - `[medium]` `[patch]` The real env chain (`process.env.NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` → `env.mjs` `optionalZodBoolean` → `isTicketPurchaseEnabled()`) had zero unmocked coverage — every suite stubbed either `@/env.mjs` or the helper, so a `runtimeEnv` typo would ship the flag permanently OFF with all tests green, and the I/O-matrix "garbage ⇒ off" row was never executed. New `src/lib/feature-flags.env.test.ts` (node environment, only `./navigation` mocked) asserts `"true"`/`"TRUE"` ⇒ on and absent/empty/`"banana"`/`"false"` ⇒ off through the real schema; registered in `vitest.config.ts`.
  - `[medium]` `[patch]` `config.matcher` — the precondition for the middleware running at all, and the ONLY gate for `desktop-prototypes/ticketing*` — was untested (the unit tests call `middleware()` directly). `middleware.flag.test.ts` gains a matcher-coverage suite that compiles each matcher pattern with Next's own compiled `path-to-regexp` and asserts every gated path (locale-prefixed and unprefixed) is matched, so an exclusion added to the catch-all negative lookahead cannot silently unship the gate.
  - `[low]` `[patch]` Design Notes implied real checkout routes normally render the localized `notFound()`; in fact the middleware's unlocalized rewrite answers first whenever the matcher covers the URL — the localized guard is the fallback layer. Design Notes corrected.
  - Deferred (1, see frontmatter `deferred`): `next build` fails on pre-existing strict-TS errors that reproduce identically at the story baseline (also at HEAD before this pass's patches); not caused by 3-12. Out-of-scope one-line fixes attempted in `desktop-prototypes/ticketing-quantity` were reverted to keep the change set clean.
  - Rejected (15, all low): spec-status vs sprint-status transient mismatch and the sprint-status edit itself (orchestrator-owned files, not build-auto's); DW-260 duplicated between spec frontmatter and ledger (by-design sync flow); triage-log rejection rationale wording vs the yaml edit (same ownership split); time-chip block duplicated across three components (variants are unrouted; a shared extraction risks the forbidden restructure); `route.flag.test.ts` NODE_ENV mutation / unrestored fetch stub (previously triaged test hygiene); per-suite `vi.mock("@/lib/feature-flags")` tax (pre-existing env.mjs-under-vitest coupling); hardcoded `/not-found-404` rewrite target with no shared constant (no colliding route exists); proxy 404 + `ticket_purchase_disabled` code semantics (matrix's "404/403 + error code" is satisfied); flag-ON purchase-page tests not asserting mocked children render (gate-level ON coverage exists); OpenGraph/Twitter/sitemap price-leak audit (verified: metadata emits title/synopsis/poster only, no prices); `.env` comment phrasing "anything other than true" vs "only literal true" (logically identical); `handleShowtimeSelect` early-return untested (unreachable with buttons hidden); venue-page AC arm untested (nothing to gate there — re-verified); WithMap/Desktop variant gating untested (unrouted dead code); film-detail/theater-detail prototype prices (already deferred as DW-260).

### 2026-08-07 — Review pass (second follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 0
- reject: 20: (high 0, medium 0, low 20)
- addressed_findings:
  - `[low]` `[patch]` Flag documentation contradicted tested behavior on case sensitivity: `.env.local.example`, the `feature-flags.ts` docblock, and the `env.mjs` comment all said only the _literal_ `"true"` enables, while `optionalZodBoolean` lowercases first (and `feature-flags.env.test.ts` pins `"TRUE"` ⇒ on). All four comment sites (including root `.env.example`) now say "true" (case-insensitive). Comment-only change; full suite (1022 tests), lint, and typecheck (63 pre-existing errors, 0 net-new) re-verified green.
  - Rejected (20, all low, deduped across reviewers): sprint-status `done` vs spec `in-review` transient (orchestrator-owned); `isTicketPurchasePath`/navigation module coupling and per-suite mock tax (previously triaged); hardcoded `/not-found-404` with no shared constant (previously triaged; no colliding route); redirect-to-event-detail instead of 404 for stale checkout links (the intent's I/O matrix mandates 404); time-chip block duplicated across three components (previously triaged; extraction risks the forbidden restructure); WithMap/Desktop variant gating untested (unrouted dead code, previously triaged); NODE_ENV mutation / unrestored fetch stub in node suites (previously triaged test hygiene; vitest isolates workers per file); no log/metric on gated proxy rejections (observability not required by the intent); `proxyRequest` typed via `Parameters<typeof POST>` but spread into `GET` (test typing nit, handlers share the signature); whitespace-only reflow in `structured-data.ts` (formatter output); purchase regex not matching hypothetical deeper routes (none exist; checkout pages carry `notFound()` guards); flag-ON purchase-page tests not distinguishing gate-`notFound` from missing-event `notFound` (gate direction is pinned; data path pre-exists); HTTPS-redirect × gate ordering untested in production mode (redirect answers first by construction, next request is HTTPS and gated); proxy slug with empty/duplicate segments evading the gate regex (the default-deny allow-list receives the same string and rejects it — no forward possible); percent-encoded pathname bypass of the middleware regex (speculative; worst case exposes a static prototype mockup, same class as DW-260, while real checkout keeps its server-side guard); non-"sold-out" unknown statuses rendering as plain chips (mirrors the flag-on ShowtimeButton's status handling — parity, not regression); matcher-coverage suite lacking `/ar`-prefixed cases (patterns are locale-agnostic, `fr`/`en` variants pin the shape); unit-surface vs deployed-HTTP-surface altitude of the whole test suite (repo convention is Playwright for critical paths only; the matcher suite uses Next's own compiled `path-to-regexp` as the closest proxy); build-time surface unverified (already ledgered as DW-261); I/O matrix not describing the flag-off time chips (intent-contract is immutable; the chips implement the Always clause's information-preservation requirement, triaged as the first pass's high patch).

## Design Notes

- `NEXT_PUBLIC_*` is inlined at build time — "configurable per environment" means per-environment build/deploy env, which matches how this repo deploys (Dokploy). This satisfies the "env var or Strapi config" AC via the env-var arm; no Strapi round-trip needed to render discovery pages.
- Middleware rewrite (not redirect) keeps the URL and returns the app's not-found UI; `notFound()` in the server components is the second layer since the middleware matcher excludes some paths and configs drift. Precisely: when the matcher covers a checkout URL, the middleware's (unlocalized) rewrite answers first and the pages' localized `notFound()` never runs — the localized layer is the fallback for matcher misses/drift, not the primary path. (This corrects an earlier triage-log rationale that implied checkout routes normally render the localized not-found.)
- The desktop-prototypes ticketing pages are static mockups but routable and show quantity selectors/prices — middleware-gating them is cheaper and less invasive than deleting prototype links.

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` -- expected: all suites pass (purchase suites with flag stubbed ON, new flag-off tests green).
- `yarn workspace @tiween/client typecheck` -- expected: 0 net-new errors vs baseline (repo carries pre-existing errors in unrelated files).
- `yarn workspace @tiween/client lint` -- expected: 0 errors.
- `yarn workspace @tiween/client build` -- expected: compiles successfully (env validation passes with the var unset ⇒ default off). **Amended 2026-08-07 (follow-up pass):** the build's TypeScript phase fails on pre-existing strict-TS errors that reproduce identically at the story baseline (see frontmatter `deferred`); the effective expectation is 0 net-new build failures vs baseline.

## Auto Run Result

Status: done (second follow-up review pass, 2026-08-07)

- **Summary:** Third review pass over the 3-12 purchase gate (invoked because the previous pass set `followup_review_recommended: true`). Four parallel reviewers (blind hunter, edge-case hunter, verification-gap, intent-alignment) re-audited the full diff since baseline `e3c3f49f`. The implementation held: no intent gaps, no spec defects, no new deferrals. One low-severity documentation patch was applied.
- **Files changed this pass:**
  - `apps/client/.env.local.example` — flag comment corrected to "true" (case-insensitive).
  - `apps/client/src/lib/feature-flags.ts` — docblock corrected likewise (schema lowercases first).
  - `apps/client/src/env.mjs` — inline comment corrected likewise.
  - `.env.example` — enable instruction notes case-insensitivity.
- **Review findings breakdown:** 1 patch applied (low: doc/behavior mismatch on flag case sensitivity), 0 deferred, 20 rejected (all low — mostly repeats of items triaged in the two prior passes; see triage log).
- **Follow-up review recommendation:** `false`. Patched counts: high 0, medium 0, low 1; score = 3×0 + 1×1 = 1 (< 5), no high patch.
- **Verification:** `yarn workspace @tiween/client test --run` — 98 files, 1022 tests, all pass. `lint` — clean. `typecheck` — 63 errors, exactly the pre-existing baseline set (0 net-new). `build` — not re-run this pass (comment-only changes cannot alter the outcome); remains as amended: fails on the pre-existing strict-TS errors ledgered as DW-261.
- **Residual risks:** the deployed-surface risks already ledgered — `next build` blocked by pre-existing strict-TS errors (DW-261) and the routable `film-detail`/`theater-detail` price-bearing prototypes (DW-260). Gate behavior itself is pinned in both flag directions at unit, page, proxy, middleware, and matcher levels.
