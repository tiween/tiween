---
title: "Story 6.2: Select Ticket Quantity"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "8d3ebc376beb35250bd4d603e938ee60c09c65a9"
final_revision: "d10b98eae56939f24ff8946a885da2fc26301717"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** Story 6.1 renders ticket tiers read-only — a visitor sees the types/prices/availability for a showtime but cannot pick quantities, see a running total, or advance toward payment. The `QuantitySelector` and `OrderSummary` primitives exist but are unwired, carry duplicated local `formatCurrency`, and ignore the `ticketing` i18n namespace; there is no client selection state and Continue leads nowhere.

**Approach:** Turn the tickets route into an interactive selection step: a flat Zustand store holds per-tier quantities (clamped to 1–10 per type and 10 per order, capped by each tier's live `remaining`), an interactive `TicketSelectionList` drives one `QuantitySelector` per available tier, `OrderSummary` shows the live subtotal/total, and a sticky Continue button (showing the formatted total, disabled at zero) persists the selection and navigates to a minimal payment placeholder that Story 6.3 replaces.

## Boundaries & Constraints

**Always:** Enforce 1–10 tickets per type AND ≤10 tickets per order, additionally capped by `tier.remaining`; sold-out tiers (`tier.soldOut`) are never selectable. Subtotal/total recompute live from the store on every quantity change. Currency comes from the tiers response (`currency`, e.g. `"TND"`); all money is formatted through the shared `formatPrice` (`"15,00 DT"`). All user-facing strings come from the `ticketing` next-intl namespace (fr/ar/en); Arabic uses Western numerals. Follow the project-context Zustand pattern (flat store, `create()(devtools(persist(...)))`, `SCREAMING_SNAKE` limit constants); the store must not cause an SSR/client hydration mismatch (selection UI is client-only and reads the store after mount). Keep selection read-only against inventory — 6.2 reads `remaining` but never writes tier/sub-event inventory.

**Block If:** The tiers response shape or `remaining`/`soldOut`/`currency` semantics from Story 6.1 turn out to differ from `TicketTiersResponse`. Adding the `zustand` dependency fails to install or resolve.

**Never:** Do not build the real Konnect payment step or any payment form/order-write path (Story 6.3) — only a labelled placeholder. Do not decrement or reconcile per-tier inventory on selection (stays deferred to 6.3). Do not touch the Story 6.1 read-only `TicketTypeList` behavior/tests, the tiers backend, or unrelated desktop-prototype `formatCurrency` copies. Do not add a `vitest.config.ts` include entry — new tickets tests already match existing globs.

## I/O & Edge-Case Matrix

| Scenario                | Input / State                                             | Expected Output / Behavior                                          | Error Handling    |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | ----------------- |
| Increment within limits | standard qty 1, remaining 12, order total 3               | qty→2, subtotal + total recompute live                              | No error expected |
| Per-type cap            | standard qty 10                                           | increment button disabled / no-op                                   | No error expected |
| Order cap reached       | order total = 10                                          | every tier's increment disabled; helper shows `orderLimitReached`   | No error expected |
| Capped by remaining     | tier remaining 3, qty 3                                   | increment disabled at 3 (below the 10 per-type cap)                 | No error expected |
| Sold-out tier           | `tier.soldOut === true`                                   | no `QuantitySelector`; disabled/`Complet` row; excluded from totals | No error expected |
| Multi-type total        | standard×2 @15 + vip×1 @40                                | subtotal `"70,00 DT"`, Continue shows `"70,00 DT"`                  | No error expected |
| Empty selection         | all quantities 0                                          | Continue disabled; `OrderSummary` renders nothing                   | No error expected |
| Sub-event change        | store holds a selection for sub-event A, open sub-event B | store resets to zero for B                                          | No error expected |

</intent-contract>

## Code Map

- `apps/client/package.json` -- add `zustand` dependency (mandated client-state lib, not yet installed).
- `apps/client/src/features/tickets/stores/ticketSelectionStore.ts` (+ `.test.ts`) -- NEW flat Zustand store: `subEventId`, `quantities: Partial<Record<TicketTierType, number>>`, actions `setQuantity(type, qty)`, `hydrateFor(subEventId)` (reset when it changes), `clear()`; exported `MAX_TICKETS_PER_TYPE = 10`, `MAX_TICKETS_PER_ORDER = 10`; derived selectors `selectTotalCount`, `selectSubtotal(tiers)`.
- `apps/client/src/features/tickets/components/QuantitySelector/QuantitySelector.tsx` (+ NEW `QuantitySelector.test.tsx`) -- replace local `formatCurrency` with shared `formatPrice`; keep controlled `+/-` API; add the missing co-located test.
- `apps/client/src/features/tickets/components/OrderSummary/OrderSummary.tsx` (+ NEW `OrderSummary.test.tsx`) -- replace local `formatCurrency` with shared `formatPrice`; add the missing co-located test.
- `apps/client/src/features/tickets/components/TicketSelectionList/` -- NEW interactive component (`.tsx`, `.test.tsx`, `.stories.tsx`, `index.ts`): one row per tier reusing the 6.1 tier presentation; available tiers render a `QuantitySelector` bounded by `min(MAX_TICKETS_PER_TYPE, tier.remaining, orderRemainingCapacity)`; sold-out tiers render a disabled `Complet` row.
- `apps/client/src/features/tickets/components/index.ts` -- export `TicketSelectionList` (+ props).
- `apps/client/src/features/tickets/utils/formatPrice.ts` -- shared formatter (reuse; do not change).
- `apps/client/src/features/tickets/types.ts` -- `TicketTier`/`TicketTiersResponse`/`TicketTierType` (reuse).
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/TicketTypesSection.tsx` (+ update `.test.tsx`) -- wire the store: render `TicketSelectionList` + `OrderSummary` + a sticky Continue bar (formatted total, disabled at 0); on Continue navigate to the payment step. Accept `documentId`, `locale`, `eventTitle`, `showtimeLabel` props.
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/page.tsx` -- pass `documentId`, `locale`, `event.title`, and a showtime label to `TicketTypesSection`; update the docstring (selection now in scope, payment still 6.3).
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/payment/page.tsx` + `PaymentStepPreview.tsx` -- NEW minimal placeholder: client child reads the store, renders an `OrderSummary` recap + a labelled "payment arrives in 6.3" notice (kills the dead link, per Story 6.1's mandate; 6.3 replaces this route).
- `apps/client/locales/{fr,ar,en}.json` -- extend the `ticketing` namespace (see Tasks).
- Reference: `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx:229` -- existing `router.push(\`/${locale}/tickets/...\`)` navigation idiom to mirror.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/package.json` -- add `zustand` to dependencies and install.
- [x] `.../features/tickets/stores/ticketSelectionStore.ts` -- flat Zustand store per project-context pattern with `MAX_TICKETS_PER_TYPE`/`MAX_TICKETS_PER_ORDER`; `setQuantity` clamps to `[0, MAX_TICKETS_PER_TYPE]` and to the remaining order capacity; `hydrateFor` resets state when `subEventId` changes; expose `selectTotalCount`/`selectSubtotal`. No SSR hydration mismatch.
- [x] `.../stores/ticketSelectionStore.test.ts` -- unit-test the I/O matrix logic: clamping per-type, order-cap blocking, subtotal/total math across multiple types, reset on sub-event change, ignoring sold-out/absent tiers.
- [x] `.../components/QuantitySelector/QuantitySelector.tsx` -- swap local `formatCurrency` for shared `formatPrice`; unchanged controlled API.
- [x] `.../components/QuantitySelector/QuantitySelector.test.tsx` -- test increment/decrement `onChange`, min/max disabling, `formatPrice` output, aria labels.
- [x] `.../components/OrderSummary/OrderSummary.tsx` -- swap local `formatCurrency` for shared `formatPrice`; unchanged rendering (still returns null when no active items).
- [x] `.../components/OrderSummary/OrderSummary.test.tsx` -- test subtotal/total computation, zero-item null render, optional service-fee row, `formatPrice` output.
- [x] `.../components/TicketSelectionList/TicketSelectionList.tsx` (+ `index.ts`, `.stories.tsx`, `.test.tsx`) -- props `{ tiers, currency, quantities, orderRemainingCapacity, labels, onQuantityChange }`; one row per tier (label/price/remaining/restriction like 6.1); available tier → `QuantitySelector` with `max = min(MAX_TICKETS_PER_TYPE, tier.remaining, quantities[type] + orderRemainingCapacity)`; sold-out tier → disabled `Complet` row, no selector. Test: renders a selector per available tier, disables at caps, hides selector for sold-out, forwards `onQuantityChange`.
- [x] `.../components/index.ts` -- export `TicketSelectionList` and its props.
- [x] `.../[screeningId]/TicketTypesSection.tsx` -- in the populated state render `TicketSelectionList` + `OrderSummary` + a sticky Continue bar showing `formatPrice(subtotal, currency)` and disabled when total count is 0; build all labels from the `ticketing` namespace; call `hydrateFor(screeningId)` on mount; on Continue `router.push(\`/${locale}/tickets/${documentId}/${screeningId}/payment\`)`.
- [x] `.../[screeningId]/TicketTypesSection.test.tsx` -- extend: quantities update totals, Continue disabled at 0 / enabled and shows total when >0, sold-out excluded; keep loading/error/empty routing green.
- [x] `.../[screeningId]/page.tsx` -- thread `documentId`, `locale`, `event.title`, and a showtime label into `TicketTypesSection`; refresh docstring.
- [x] `.../[screeningId]/payment/page.tsx` + `PaymentStepPreview.tsx` -- RSC route with a client child that reads the store and renders an `OrderSummary` recap plus a translated placeholder notice; no payment logic.
- [x] `apps/client/locales/{fr,ar,en}.json` -- add to `ticketing`: `quantity`, `decrease`, `increase`, `subtotal`, `serviceFee`, `total`, `continue`, `orderLimitReached` (with `{max}`), `paymentComingTitle`, `paymentComingDescription`. Western numerals in `ar.json`.

**Acceptance Criteria:**

- Given a showtime with available tiers, when I increase a tier's quantity with the `QuantitySelector`, then I can pick 1–10 of that type, the `OrderSummary` subtotal/total update in real time, and the Continue button shows the formatted total.
- Given I combine multiple tiers, when the order reaches 10 tickets total, then every increment control is disabled and an order-limit message is shown; I am never allowed to exceed 10 per order or a tier's `remaining`.
- Given a sold-out tier, when the selection step renders, then it shows `Complet`, exposes no quantity control, and is excluded from the totals.
- Given no tickets are selected, when the step renders, then Continue is disabled and no order summary is shown; given ≥1 ticket, when I tap Continue, then the selection persists and I navigate to the payment step (placeholder in this story).
- Given `locale=ar`, when quantities, prices, and totals render, then Western (Latin) numerals are used and all labels come from the `ticketing` namespace.
- Given I return to the same showtime after navigating away client-side, when the step re-renders, then my selection is preserved; given I open a different showtime, then the selection resets.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-10 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 2, low 4)
- defer: 5: (high 0, medium 3, low 2)
- reject: 11: (high 0, medium 0, low 11)
- addressed_findings:
  - `[medium]` `[patch]` `selectTotalCount` counted sold-out/foreign-sub-event phantom quantities while subtotal excluded them → Continue could enable on a 0,00 DT cart and phantoms consumed order capacity. Fixed: `TicketTypesSection` now derives `selectedCount`/`subtotal`/`orderRemainingCapacity` from the priced (non-sold-out) `items` and gates the persisted `quantities` on `subEventId === screeningId`; Continue disables on `selectedCount === 0`.
  - `[medium]` `[patch]` The new `formatShowtimeLabel` ignored the app's fixed `Africa/Tunis` timezone (wrong hour on non-Tunis servers), was duplicated verbatim in both route files, and lacked an invalid-date guard. Fixed: extracted `features/tickets/utils/formatShowtimeLabel.ts` with `timeZone: "Africa/Tunis"` + Latin numerals + NaN-date guard; both `page.tsx` files import it.
  - `[low]` `[patch]` `PaymentStepPreview` recapped the persisted selection without checking it belonged to the current screening (deep-linked/refreshed payment URL priced another showtime's cart against these tiers). Fixed: gate reads on `subEventId === screeningId`.
  - `[low]` `[patch]` Payment placeholder route shipped untested. Fixed: added `PaymentStepPreview.test.tsx` (recap filter + cross-screening gate).
  - `[low]` `[patch]` The `orderLimitReached` message / `isOrderFull` branch was unverified. Fixed: added a `TicketTypesSection` test asserting the message + zero remaining capacity at the cap.
  - `[low]` `[patch]` The caller-computed `orderRemainingCapacity` wiring was unasserted. Fixed: the new at-cap and phantom tests assert the value passed to the list.

### 2026-07-10 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 2: (high 0, medium 1, low 1)
- reject: 11: (high 0, medium 1, low 10)
- addressed_findings:
  - none
- notes: Fresh independent review pass over the committed change (Blind Hunter + Edge Case Hunter + Verification Gap). No new patch/bad_spec/intent_gap surfaced. Two new, distinct deferrals recorded (see deferred-work ledger): (1) `[medium]` the store's `setQuantity` order-capacity accounting (`otherTotal`) sums phantom quantities on now-sold-out/absent tiers while the UI derives capacity from filtered priced items — on a persisted same-screening cart whose tier later goes sold-out, this silently no-ops another tier's `+` button (dead increment; subtotal/count stay correct, no over-sell). Reconciling persisted quantities against live tier inventory is the 6.3-deferred inventory work, and the store deliberately holds no tier data, so not a trivial patch. (2) `[low]` the showtime label is sourced server-side from `event.screenings?.find(...)` only, so a valid `performance`-kind sub-event (and the authoritative `startDateTime` that already lives in the client `TicketTiersResponse`) yields a blank showtime; performances are not yet plumbed into the client `Event` model, so no live impact today; robust fix (source the label from client `data.startDateTime`) is a cross-file refactor. Rejected 11: already-deferred rehydration/persist-versioning concern, dead-but-tested `selectSubtotal`/`selectTotalCount` selectors (acknowledged residual risk), cosmetic a11y (sticky-bar total label), speculative-future subtotal-vs-total-with-service-fee divergence, hydration-guard inconsistency (correct today), unused `clear()`, empty/foreign payment-placeholder deep-link, latent no-impact `MAX_TICKETS_PER_TYPE` (equal caps), redundant React key, and label-verbosity/duplicate-`type` nits.

## Design Notes

- **Inventory stays read-only.** 6.2 reads `tier.remaining` to bound selectors but never writes tier/sub-event inventory; per-tier inventory reconciliation with the atomic purchase write path remains deferred to 6.3 (deferred-work entry from 6.1). No backend change in this story.
- **State survives Continue without persistence gymnastics.** Next App-Router soft navigation preserves module-level store state, so the selection carries into the payment placeholder even before `persist` rehydrates. Follow the mandated `devtools`+`persist` pattern but guard against SSR/client mismatch (client-only consumers reading after mount); prefer resetting stale selections via `hydrateFor` over trusting persisted cross-session carts.
- **Two list variants on purpose.** `TicketTypeList` (6.1) stays as the pure read-only display primitive with its green tests; `TicketSelectionList` is the interactive variant used in the funnel. This keeps 6.1's blast radius untouched. Golden total: `formatPrice(2*15 + 1*40)` → `"70,00 DT"`.
- **Formatter dedup, scoped.** This story resolves the `formatCurrency`→`formatPrice` dedup only for `QuantitySelector`/`OrderSummary` (the components it wires); the desktop-prototype copies remain in the 6.1 deferred-work entry.
- **Continue is not a dead end.** Mirroring Story 6.1's mandate (its whole reason was killing a 404), Continue lands on a real, labelled placeholder route that Story 6.3 overwrites with the Konnect payment step.

## Verification

**Commands:**

- `pnpm --filter @tiween/client test` -- expected: all tickets store/component/section tests pass (new tests match existing `src/features/tickets/**` and `src/app/**/tickets/**` globs).
- `pnpm --filter @tiween/client typecheck` -- expected: no type errors (store, props, new route typed; no `any`).
- `pnpm --filter @tiween/client lint` -- expected: clean.

**Manual checks:**

- Open `/[locale]/tickets/[documentId]/[screeningId]`, adjust quantities across tiers: subtotal/total update live, per-type and 10-per-order caps hold, sold-out tiers are inert, Continue shows the total and reaches the payment placeholder.

## Auto Run Result

Status: done

### Summary

Turned the read-only tickets route into an interactive ticket-quantity selection step: a flat Zustand `ticketSelectionStore` (clamped 1–10 per type, ≤10 per order, capped by each tier's `remaining`) drives an interactive `TicketSelectionList` (one `QuantitySelector` per available tier, sold-out tiers inert), a live `OrderSummary`, and a sticky Continue bar that shows the formatted total and navigates to a minimal payment placeholder (which Story 6.3 replaces). Wired the pre-existing `QuantitySelector`/`OrderSummary` primitives (swapping their local `formatCurrency` for the shared `formatPrice`) and added the missing tests.

### Files changed

- `apps/client/package.json` (+ `yarn.lock`) — added `zustand` (yarn workspace).
- `apps/client/src/features/tickets/stores/ticketSelectionStore.ts` (+ `.test.ts`) — flat `devtools+persist` store, `MAX_TICKETS_PER_TYPE`/`MAX_TICKETS_PER_ORDER`, `setQuantity` clamping, `hydrateFor` reset, `clear`, `selectTotalCount`/`selectSubtotal`.
- `apps/client/src/features/tickets/components/TicketSelectionList/*` — new interactive list (component, index, test, stories).
- `apps/client/src/features/tickets/components/QuantitySelector/QuantitySelector.tsx` + `OrderSummary/OrderSummary.tsx` (+ new `.test.tsx` each) — use shared `formatPrice`.
- `apps/client/src/features/tickets/components/index.ts` — export `TicketSelectionList`.
- `apps/client/src/features/tickets/utils/formatShowtimeLabel.ts` (+ `.test.ts`) — shared, `Africa/Tunis`, Latin-numeral, invalid-date-guarded showtime formatter (review patch).
- `apps/client/src/app/[locale]/tickets/[documentId]/[screeningId]/TicketTypesSection.tsx` (+ `.test.tsx`) — store wiring, sticky Continue, priced-count consistency + sub-event gate (review patch).
- `.../[screeningId]/page.tsx` — threads context; uses shared showtime formatter.
- `.../[screeningId]/payment/page.tsx` + `PaymentStepPreview.tsx` (+ `.test.tsx`) — minimal placeholder; recap gated on matching `subEventId` (review patch).
- `apps/client/locales/{fr,ar,en}.json` — `ticketing` namespace keys (quantity/subtotal/serviceFee/total/continue/orderLimitReached/paymentComing\*).

### Review findings breakdown

- Patches applied (6): sold-out/foreign phantom-count fix (medium), showtime timezone+dedupe+guard (medium), payment cross-screening gate (low), plus 3 test-coverage additions (payment route, order-limit branch, capacity wiring).
- Deferred (5): per-tier `remaining` re-clamp on rehydrate (→ 6.3 inventory reconciliation); locale-aware router migration (app-wide); `persist` versioning/partialize; `screeningId ∈ documentId` scoping (→ 6.3); `formatPrice` TND-millimes precision.
- Rejected (11): speculative-future SSR/prop-default concerns, placeholder error-state, controlled-input NaN guards, cosmetic a11y, all-sold-out messaging (already visible via `Complet`), and low-value throwaway-route tests.

### Verification

- `yarn vitest run src/features/tickets src/app` → 24 files / 191 tests pass (incl. new store, TicketSelectionList, QuantitySelector, OrderSummary, TicketTypesSection, PaymentStepPreview, formatShowtimeLabel tests).
- `yarn typecheck` → 64 pre-existing errors (all in untouched files), 0 in any created/edited file.
- `yarn eslint` on all touched files → clean.

### Residual risks

- Persisted selection can display a quantity above a tier's live `remaining` until Story 6.3 reconciles per-tier inventory (deferred).
- Default-locale (`fr`) Continue incurs a next-intl redirect hop due to the app-wide raw-router navigation pattern (deferred).
- `selectTotalCount`/`selectSubtotal` remain exported and unit-tested but are no longer consumed in production after the count-consistency patch.
- Follow-up review recommended: the patches changed money/count/navigation behavior across several files.

### Follow-up review pass (2026-07-10)

An independent follow-up review (Blind Hunter + Edge Case Hunter + Verification Gap, over the committed diff) confirmed the change is well covered and found **no** new patch/bad_spec/intent_gap. Two new, distinct issues were deferred (see the `follow-up code review of 6-2-select-ticket-quantity (2026-07-10)` ledger section):

- `[medium]` Store order-capacity accounting (`otherTotal`) counts phantom quantities on now-sold-out/absent tiers while the UI derives capacity from filtered priced items → on a persisted same-screening cart whose tier later sells out, another tier's `+` button silently no-ops (dead increment). Subtotal/count stay correct (no over-sell); proper fix is the 6.3-deferred per-tier inventory reconciliation.
- `[low]` Showtime label is sourced from `event.screenings` only, so a `performance`-kind sub-event renders a blank showtime; the authoritative `startDateTime` already lives in the client tiers response. No live impact today (performances not yet plumbed into the client Event model); robust fix is a cross-file refactor.

Eleven findings were rejected (already-deferred rehydration/persist-versioning; dead-but-tested `selectSubtotal`/`selectTotalCount` selectors; cosmetic a11y; speculative service-fee divergence; hydration-guard inconsistency correct today; unused `clear()`; empty/foreign payment deep-link; latent no-impact equal-caps `MAX_TICKETS_PER_TYPE`; nits). No code changed in this pass, so no further independent follow-up is warranted (`followup_review_recommended: false`).
