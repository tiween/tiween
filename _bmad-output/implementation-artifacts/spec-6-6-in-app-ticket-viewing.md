---
title: "Story 6.6: In-App Ticket Viewing"
type: "feature"
created: "2026-08-06"
status: ready-for-dev
baseline_revision: "19a727207b1e941c2f616dabaca718df8e2bc339"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md"
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Story 6.4 shipped "Mes Billets" as a deliberately minimal FLAT list of full-size `TicketQR` cards: no grouping by event/date, no separation of past tickets, and every QR renders at full size all the time — on event night a buyer with several orders scrolls a wall of equal-weight cards to find tonight's ticket, and stale past tickets sit interleaved with live ones.

**Approach:** Rebuild the "Mes Billets" body as a grouped view: tickets grouped by event + showtime with one header (event title, date, time, venue, ticket count) per group, each ticket inside shown as a compact tappable preview with a small QR thumbnail; tapping opens the full `TicketQR` in a dialog. Groups whose showtime date (Africa/Tunis) is before today move to a separate "Historique" section below the upcoming ones. Pure client-side work over the existing 6.4 read hooks — no backend change.

## Boundaries & Constraints

**Always:** Grouping/partition logic lives in a pure, unit-testable util that takes `TicketView[]` and an injected `now` (no `Date.now()` inside the pure function body — callers pass it). Partition is by Africa/Tunis calendar date: a group is historical only when its showtime's Tunis date is strictly before today's Tunis date (event-night tickets stay upcoming all day); `startDateTime` null or unparseable ⇒ upcoming (never demote a possibly-live credential). Upcoming groups sort soonest-first (null-date groups last); Historique sorts most-recent-first. Group identity is event + showtime (`eventTitle` + `startDateTime` — the same event on two dates is two groups); venue comes from the group's tickets. Date/time formatting reuses the existing `formatShowtime` invariants (Western numerals via `toNumeralSafeLocale`, `DD/MM/YYYY`, 24h clock, `Africa/Tunis`) — export/extract it rather than duplicating. Every ticket preview is a real `<button>` (keyboard + screen-reader reachable) with a localized accessible name; the dialog uses the existing `components/ui/dialog` primitives with a `DialogTitle`, and renders `TicketQR` `size="large"` `showActions={false}` exactly as `TicketList` does today. A paid ticket whose `qrCode` is still null keeps the `qrPending` treatment (placeholder preview, no broken QR in the dialog). All new strings come from the `ticketing` next-intl namespace in fr/ar/en with identical key sets (extend `ticketingI18n.test.tsx`); Arabic uses Western numerals; "Historique" is the French section title per the epic. The 6.4 loading / error / partial-error / empty-state semantics of `MyTicketsView` (session-aware loading, guest 403 surfacing, account+guest dedupe by `ticketNumber`) must survive unchanged. `TicketList` itself keeps working — `ResultView` still renders it.

**Block If:** The grouped view cannot meet an acceptance criterion without new backend data (a field missing from `TicketView` that the ACs require).

**Never:** Do NOT touch the Strapi backend, the ticket-read endpoints, `TicketView`'s server shape, or the proxy allow-list. Do NOT build offline/service-worker caching or the "Works offline" badge behaviour (6.7), the purchase-confirmation celebration (6.8), or the "Mes achats" order-history page (6.9 — "Historique" here is past TICKETS inside Mes Billets, not orders). Do NOT add a bottom-nav ticket-count badge (not in this story's ACs; leave to a future story). Do NOT change `ResultView` or the payment result flow. Do NOT modify `TicketQR`'s rendering internals or `qrcode.react` usage beyond consuming it. Do NOT introduce new dependencies. Do NOT use `AppDialog` (starter-template component with `removeThisWhenYouNeedMe`) — use the `ui/dialog` primitives directly.

## I/O & Edge-Case Matrix

| Scenario              | Input / State                                          | Expected Output / Behavior                                                                                                                   | Error Handling    |
| --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Mixed upcoming + past | tickets for today, next week, and last month           | today + next week grouped under upcoming (soonest first); last month under "Historique"; each group header shows title/date/time/venue/count | No error expected |
| Same event, two dates | 2 tickets same `eventTitle`, different `startDateTime` | two distinct groups                                                                                                                          | No error expected |
| Event-night ticket    | showtime today 21:00, now today 23:30 (Tunis)          | still in upcoming — moves to Historique only after the Tunis date changes                                                                    | No error expected |
| Null/invalid showtime | `startDateTime: null` or garbage                       | grouped under upcoming, ordered after dated groups; header omits date/time, never "Invalid Date"                                             | No error expected |
| Tap a ticket preview  | click/Enter on a preview button                        | dialog opens with full `TicketQR` (large, no actions) for exactly that ticket; closing returns to the list                                   | No error expected |
| Pending QR            | paid ticket, `qrCode: null`                            | preview shows `qrPending` placeholder instead of a QR thumbnail; no dialog with an empty QR                                                  | No error expected |
| Only past tickets     | every group historical                                 | upcoming section shows the existing empty-state copy; Historique renders below with the tickets                                              | No error expected |
| No tickets at all     | both sources empty                                     | 6.4 empty state unchanged                                                                                                                    | No error expected |
| Guest read fails      | stored token 403s, account read succeeds               | 6.4 behaviour unchanged: partial list renders + `role="alert"` error line                                                                    | translated code   |
| Arabic locale         | `locale=ar`                                            | RTL layout intact, all strings from `ticketing` namespace, Western numerals in dates/times/counts                                            | No error expected |

</intent-contract>

## Code Map

- `apps/client/src/features/tickets/utils/groupTickets.ts` (NEW) -- pure `groupTickets(tickets: TicketView[], now: Date)` → `{ upcoming: TicketGroup[]; history: TicketGroup[] }`; `TicketGroup` = `{ key, eventTitle, startDateTime, venueName, tickets }`. Tunis-date comparison via `Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" })`-style day extraction (the repo's fixed-timezone precedent is `formatShowtime` in `TicketList.tsx:53-83`).
- `apps/client/src/features/tickets/components/TicketList/TicketList.tsx` -- `formatShowtime` (L53) currently module-private; EXPORT it (or move to `features/tickets/utils/`) for reuse by the grouped components. `TicketList` component itself: read-only, still used by `ResultView`.
- `apps/client/src/features/tickets/components/GroupedTicketList/` (NEW: `GroupedTicketList.tsx`, `TicketPreviewCard.tsx`, test, stories, `index.ts` barrel; register in `components/index.ts`) -- renders upcoming groups then a "Historique" `<section>`; each group: header (event title, formatted date/time, venue, `tickets(count)` label) + preview buttons; holds `selectedTicket` state and the `Dialog` (from `@/components/ui/dialog`) rendering `TicketQR` — reuse the exact `TicketView → TicketQRTicket` mapping `TicketList.tsx:143-162` uses today (extract it alongside `formatShowtime` rather than copying). Preview thumbnail: `QRCodeSVG` at small size (import from `qrcode.react`, already a dependency) or `TicketQR size="small"` — implementer's choice, but the preview must NOT repeat the group header's event/date/venue text.
- `apps/client/src/app/[locale]/tickets/MyTicketsView.tsx` -- swap the `<TicketList>` render (L205-209) for `<GroupedTicketList>`; ALL other logic (guest reads L35-58, dedupe L119-134, loading/error L138-158, sign-in prompt) stays byte-identical. Its labels builder call gains the new labels.
- `apps/client/src/features/tickets/utils/ticketLabels.ts` -- extend `buildTicketListLabels` (or add a `buildGroupedTicketListLabels` superset) with the new keys; keep `TicketListLabels` satisfied for `ResultView`.
- `apps/client/src/features/tickets/components/TicketList/index.ts` + `components/index.ts` -- export surface updates.
- `apps/client/locales/{fr,ar,en}.json` -- new `ticketing.myTickets.*` keys: `historyTitle` (fr "Historique"), `upcomingTitle`, `viewTicket` (preview accessible name), `dialogTitle`; reuse existing `ticketCard.tickets` for counts. Arabic: Western numerals, bare `{count}` form (numerals-lint rule; ICU plural was explicitly rejected in 6.4 review — see DW-249).
- `apps/client/src/features/tickets/ticketingI18n.test.tsx` -- extend: every new key resolves in fr/ar/en, key sets identical, Western-numeral assertion.
- `apps/client/src/features/tickets/utils/groupTickets.test.ts`, `GroupedTicketList.test.tsx`, `MyTicketsView.test.tsx` (extend) -- cover the I/O matrix.
- Read-only references: `TicketQR.tsx:33-105` (props/labels), `ui/dialog.tsx` (primitives), `MyTicketsView.test.tsx` (existing behaviour pins to keep green), `lib/intl-locale` (`toNumeralSafeLocale`).

## Tasks & Acceptance

**Execution:**

- [ ] `apps/client/src/features/tickets/utils/groupTickets.ts` (+ `groupTickets.test.ts`) -- pure grouping/partition/sort util with injected `now`; unit-test every matrix row that concerns grouping (mixed, same-event-two-dates, event-night boundary, null showtime, only-past, empty) -- the testable core of the story.
- [ ] `apps/client/src/features/tickets/components/TicketList/TicketList.tsx` (+ shared util move) -- export `formatShowtime` and the `TicketView → TicketQRTicket` mapping for reuse; no behaviour change (existing `TicketList.test.tsx` stays green) -- avoids duplicated locale/timezone invariants.
- [ ] `apps/client/src/features/tickets/components/GroupedTicketList/GroupedTicketList.tsx` + `TicketPreviewCard.tsx` (+ barrel, stories) -- grouped sections, preview buttons, dialog with full `TicketQR`; `qrPending` placeholder for null-QR tickets -- the story's visible surface.
- [ ] `apps/client/src/features/tickets/components/GroupedTicketList/GroupedTicketList.test.tsx` -- component tests: sections render in order, header content, tap→dialog→exact ticket, keyboard activation, pending preview, Historique presence/absence -- pins the interaction ACs.
- [ ] `apps/client/src/features/tickets/utils/ticketLabels.ts` + `apps/client/locales/{fr,ar,en}.json` + `ticketingI18n.test.tsx` -- new labels + catalog keys in all three locales with key-set identity and Western-numeral tests -- i18n invariants.
- [ ] `apps/client/src/app/[locale]/tickets/MyTicketsView.tsx` (+ extend `MyTicketsView.test.tsx`) -- render `GroupedTicketList` instead of flat `TicketList`; assert grouping appears while every existing loading/error/dedupe/empty test still passes -- wires the feature in without regressing 6.4.

**Acceptance Criteria:**

- Given purchased tickets across several events and dates, when I open "Mes Billets", then tickets appear grouped by event/showtime, each group headed by event title, date, time and venue, upcoming groups sorted soonest-first.
- Given a group's ticket preview, when I tap it (pointer or keyboard), then the full `TicketQR` component for that exact ticket opens in a dialog, and closing it returns me to the intact list.
- Given tickets whose showtime's Africa/Tunis date is before today, when the page renders, then those tickets sit under a separate "Historique" section below the upcoming groups, most recent first — and a ticket for today never appears there.
- Given `locale=ar`, when the grouped view renders, then every string resolves from the `ticketing` namespace, numerals are Western, and the layout is usable in RTL.
- Given the 6.4 test suite, when this story lands, then every pre-existing `MyTicketsView`, `TicketList` and `ResultView` behaviour test still passes unmodified in intent (guest-error surfacing, dedupe, empty state, result-page flat list).

## Spec Change Log

- 2026-08-06 (escalation resolution, operator: Ayoub): The mid-run deferral race is resolved in favor of KEEPING the finished implementation. `sprint-change-proposal-2026-08-06` line "Untracked draft spec-6-6… is parked unstarted" was written before the operator knew this run had already completed the work; it is superseded for this story by the operator's explicit decision, which applies the proposal's own no-rollback stance (6-1→6-5 stay done/dormant) to 6-6: the implementation is exactly as dormant in v1 as the rest of the ticketing flow. Disposition: the story proceeds to the review pass on the changes already present in the working tree, then commits as normal. The story is active again for this run; Epic 6 remains deferred post-v1 for all OTHER stories (6-7…6-10). No intent, boundary, AC, or matrix row changes — the contract above is unchanged and remains the authoritative reading.

## Review Triage Log

## Design Notes

- **Why group identity is `eventTitle` + `startDateTime`, not event id.** `TicketView` deliberately exposes no event/document id (sanitized allow-list, 6.4). Title+showtime is the only stable group key available client-side and matches the epic's "grouped by event/date" wording. Adding an id to the server view is backend scope this story forbids.
- **Why calendar-date partition, not timestamp.** "Past" at `startDateTime < now` would move a 21:00 ticket to Historique at 21:01 — mid-event, exactly when it must be at hand. Tunis-date comparison keeps every ticket in upcoming through its event night; the trade-off (yesterday's 23:00 ticket is historical at 00:01) is the intended reading of "past tickets".
- **Why a dialog, not a route.** The epic AC says "tapping a ticket shows full TicketQR component" — an overlay keeps guest tickets (which exist only via localStorage tokens on this device) shareable-state-free and avoids inventing a per-ticket URL for data the server won't serve unauthenticated. Radix `Dialog` gives focus-trap/ESC/overlay-dismiss for free.
- **Scope line vs 6.7/6.9.** This story renders from the live hooks only. Offline rendering of previously-viewed tickets is 6.7 (service-worker/cache). "Historique" ≠ "Mes achats": 6.9's purchase history lists ORDERS with totals/status; this section lists past tickets.

## Verification

**Commands:**

- `yarn install --frozen-lockfile` (worktree has no `node_modules`; repo `yarn` shim is broken — run the nix `yarn.js` under asdf node 22, per project memory) -- expected: completes.
- `yarn workspace @tiween/client test` -- expected: new groupTickets/GroupedTicketList suites pass; all existing tickets suites (TicketList, MyTicketsView, ResultView, ticketingI18n, hooks) pass.
- `yarn workspace @tiween/client typecheck` -- expected: no new errors vs the pre-existing baseline (69 errors at the 6.4 revision, all in untouched files).
- `yarn workspace @tiween/client lint` -- expected: clean on touched files (`--max-warnings=0`).
- `yarn workspace @tiween/admin test` -- expected: unchanged, all pass (no backend files touched — this proves it).

**Manual checks (if no CLI):**

- With seeded paid orders spanning past and future showtimes, open `/fr/tickets`: verify grouping, section order, tap→dialog QR, Historique content; repeat on `/ar/tickets` for RTL + Western numerals.
