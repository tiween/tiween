---
phase: 02-strapi-backed-shorts-pages
plan: 09
subsystem: frontend-shorts-watchlist-heart
tags: [watchlist, optimistic-update, react-query, next-auth, a11y, rtl, vitest]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: "watchlist hooks with options and ShortsWatchlistProvider (03), sign-in callback guard (04), detail page and fallbackTextAttrs (05), retryFocus (06), directory and focus-after-append (08), shorts.card.watchlistAdd/Remove and shorts.watchlistAdd/Remove (02)"
provides:
  - "useShortFilmHeart(documentId, { surface }): the one guard matrix for card and detail hearts"
  - "WatchlistButton overlay variant on Tiween tokens plus a busy state"
  - "ShortFilmHeart: card heart, a sibling of the card link"
  - "ShortFilmCard with heart, relocated duration and silent French-fallback tagging"
  - "ShortsDirectory wrapped in ShortsWatchlistProvider (one list request for the grid)"
  - "ShortFilmDetail on the real watchlist, spinner after 200ms, retry focus on the h1"
affects: [02-10]

actuals:
  tokens: 19000
  tasks: 3
  commits: 3
plan_head_before: 0b712bb114b0d8438d32f34bc7901fc2f5f38a2e
plan_head_after: 7d73e91c1ac2b49b396e1e6cfeb7e1a53abefabb

tech-stack:
  added: []
  patterns:
    - "Heart state machine composes the shipped add/remove hooks and only decides when to call them; their guard matrices are untouched"
    - "Card heart reads the grid provider (zero per-card check requests); detail heart runs one check"
    - "Overlay control = transparent 44px target around a centered 40px disc, aria-busy + aria-disabled instead of disabled"
    - "Pulse only on the visitor's own unsaved to saved change: hydration (resolved flips in the same render) never pulses"

key-files:
  created:
    - apps/client/src/features/watchlist/hooks/useShortFilmHeart.ts
    - apps/client/src/features/watchlist/hooks/useShortFilmHeart.test.tsx
    - apps/client/src/features/shorts/components/ShortFilmHeart/ShortFilmHeart.tsx
    - apps/client/src/features/shorts/components/ShortFilmHeart/ShortFilmHeart.test.tsx
    - apps/client/src/features/shorts/components/ShortFilmHeart/index.ts
  modified:
    - apps/client/src/features/watchlist/components/WatchlistButton/WatchlistButton.tsx
    - apps/client/src/features/watchlist/index.ts
    - apps/client/src/features/shorts/components/index.ts
    - apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCard.tsx
    - apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCard.test.tsx
    - apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx
    - apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.test.tsx
    - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx
    - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css
    - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.test.tsx
    - apps/client/src/features/shorts/i18n.test.ts
    - apps/client/src/styles/globals.css
    - apps/client/locales/fr.json
    - apps/client/locales/ar.json
    - apps/client/locales/en.json

key-decisions:
  - "D-13/D-14/D-15: one hook for both hearts; signed-out delegates to add() so the shipped toast and sign-in redirect run, with no local toggle and no queue write; offline reuses the events queue through the same hooks"
  - "Session loading is a silent no-op and is not marked aria-busy (plan behaviour wins over the Part E 'same as Unresolved' row, so cached HTML never ships aria-busy to every anonymous visitor)"
  - "isBusy is true for an authenticated heart that is unresolved OR mid-write, so the Pending row of Part E (aria-busy, no spinner) holds on the card"
  - "A settled lookup with no answer (error or paused) resolves to unsaved, so a heart is never permanently busy"

patterns-established:
  - "The heart is a sibling of the link inside the card article; the article stays the single direct child of the grid per card"

requirements-completed: []

duration: ~45 min
completed: 2026-11-10
---

# Phase 2 Plan 09: Real watchlist hearts on the card and the detail page Summary

**One tested state machine (`useShortFilmHeart`) now drives both hearts on the shipped watchlist machinery: a Tiween-token overlay heart on every directory card (a sibling of the link, resolved from one list request) and the 52px detail heart, with the duration moved into the card's second meta line and the French-fallback title tagged silently.**

## Performance

- **Duration:** about 45 min
- **Tasks:** 3 of 3 (3 task commits)
- **Files:** 5 created, 15 modified (20 changed in the plan range, +1959 / -265)

## Accomplishments

- **State machine (Task 1, `108db23`).** `useShortFilmHeart` implements the Part E rows in order: loading is a no-op; unauthenticated calls `add()` (shipped `loginRequiredShort` toast, redirect to `/<locale>/auth/signin?callbackUrl=<path>`, nothing saved or queued); signed in but unresolved or with an add/remove/Undo in flight is a no-op; saved removes (Undo toast); unsaved adds optimistically. The card surface reads `useShortsWatchlistResolved()` and issues zero check requests; the detail surface runs its own `useWatchlistCheck` observer (same key, deduplicated) to learn when the check settled (answer, error or paused).
- **WatchlistButton overlay.** Transparent 44px target around a centered 40px disc (Aubergine Deep 80%, 12px blur, 1px Border, no shadow), 20px glyph; outline in Foreground, filled Gold Leaf when saved; hover lifts the disc to 92%; press scales 0.95; focus is the global 3px gold ring with 2px offset. New `busy` prop sets `aria-busy` + `aria-disabled`, ignores taps, stays focusable, no spinner. The click stops propagation and prevents default. No `bg-black/50` and no raw white utility remain in its output. The pulse is skipped under reduced motion (matchMedia in the component, plus an explicit `animation: none` guard in `globals.css`).
- **ShortFilmHeart.** Pinned `end-1 top-1 z-20` (top-left in Arabic), label `shorts.card.watchlistAdd|Remove` with the film title, always agreeing with `aria-pressed`.
- **ShortFilmCard (Task 2, `d563e63`).** Heart rendered after the link and before the trailer button (DOM order link, heart, trailer), never inside the link; optional `hideHeart`. The top-end duration pill and the Clock import are gone. One shared fragment feeds the mobile and desktop overlays: line 1 the director, line 2 `{year} · {duration}` with each part omitted when absent. Title `<bdi>` (both overlays and the link's screen-reader text) spreads `fallbackTextAttrs(title, locale, film.locale)`.
- **ShortsDirectory.** Wrapped in `ShortsWatchlistProvider` with every loaded `documentId` (appended pages extend it). Each card is still exactly one `<article>` direct child of the grid, so the Plan 08 focus-after-append lookup (`children[previousLength].querySelector("a")`) is unchanged and now covered by a test.
- **ShortFilmDetail (Task 3, `7d73e91`).** Local saved/pulse state replaced by `useShortFilmHeart(film.documentId, { surface: "detail" })`. Labels `shorts.watchlistAdd|Remove` (no title). Saved: filled Gold Leaf glyph and the border steps to Gold Leaf (`--sfd-gold`, no raw hex). Unresolved on a signed-in visit: `aria-busy` and a 16px static-under-reduced-motion spinner after 200ms. Pulse (300ms) only on the visitor's own unsaved to saved change. The h1 has `tabIndex -1`, a ref and `consumeRetryFocus` in a mount effect (Plan 06 handoff).
- **Keys.** `shorts.watchlist` and `shorts.removeFromWatchlist` deleted from fr, ar and en after a repo search found no other user; `i18n.test.ts` now asserts they are absent.

## Verification (real output)

| Verify                                                                                                                                                               | Result                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1: `yarn workspace @tiween/client vitest run src/features/watchlist src/features/shorts/components/ShortFilmHeart`                                              | `Test Files 4 passed (4)`, `Tests 53 passed (53)`, exit 0                                                                                          |
| Task 2 tests: `vitest run src/features/shorts/components/ShortFilmCard src/features/shorts/components/ShortsDirectory src/features/shorts/components/ShortFilmHeart` | `Test Files 4 passed (4)`, `Tests 86 passed (86)`, exit 0                                                                                          |
| Task 2 types: `yarn workspace @tiween/client tsc --noEmit`                                                                                                           | exit 0, no `error TS` lines                                                                                                                        |
| Task 3 tests: `vitest run src/features/shorts src/features/watchlist src/lib/icu-numerals.test.ts`                                                                   | `Test Files 19 passed (19)`, `Tests 360 passed (360)`, exit 0                                                                                      |
| Task 3 types: `tsc --noEmit`                                                                                                                                         | exit 0, no `error TS` lines                                                                                                                        |
| Plan verification: `vitest run src/features src/lib/icu-numerals.test.ts "src/app/[locale]"`                                                                         | `Test Files 111 passed (111)`, `Tests 1390 passed (1390)`, exit 0                                                                                  |
| `eslint src/features src/lib --max-warnings=0`                                                                                                                       | exit 0                                                                                                                                             |
| `eslint src/features/watchlist src/features/shorts/components/ShortFilmHeart --max-warnings=0`                                                                       | exit 0                                                                                                                                             |
| `tsc --noEmit` after the last edit                                                                                                                                   | exit 0 (stays at 0 errors)                                                                                                                         |
| Mutation: drop the `!isResolved \|\| isPending` guard in `toggle()`                                                                                                  | "fills at once ... second tap" test failed as expected; source restored                                                                            |
| Mutation: put the heart inside the card `<Link>`                                                                                                                     | "renders the heart as a sibling ... never inside" failed as expected; source restored                                                              |
| Mutation: drop the resolved check from the pulse effect, and drop `consumeRetryFocus`                                                                                | "does not pulse when a saved film arrives with the check answer" and "focuses the h1 after a successful retry" failed as expected; source restored |

Acceptance points covered by tests: the hook suite (16 cases) covers every behavior line including zero check GETs on the card surface and exactly one on the detail surface, optimistic fill before the POST settles, rollback plus destructive toast on a failed POST or DELETE, ignored taps during an add and during an Undo re-add, the offline queued add/remove and a failed queue write leaving the heart unchanged. A class-output test proves no `black/50` and no raw white utility in the overlay heart. Axe passes for the heart (saved, unsaved, busy), the card (with and without the trailer button) and the detail page (heart unsaved, saved, busy with the spinner shown) in fr, ar and en. The existing card tests (no rating text, neutral featured chip, availability text) still pass; the card renders `2021 · 18 min` for the FILM fixture in both overlays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Global reduced-motion guard for the pulse class**

- **Found during:** Task 1 (the plan asked to verify the global rule and add a guard if missing)
- **Issue:** the global rule shortens animations to 0.01ms rather than disabling the class, and `animate-watchlist-pulse` is unlayered.
- **Fix:** added an explicit `@media (prefers-reduced-motion: reduce) { .animate-watchlist-pulse { animation: none } }` next to the class, and the button also skips adding the class when `matchMedia` reports reduced motion.
- **Files modified:** `apps/client/src/styles/globals.css`, `WatchlistButton.tsx`
- **Commit:** 108db23

**2. [Rule 1 - Bug, test-driven] Pulse must not fire on hydration**

- **Found during:** Task 3 design
- **Issue:** a naive effect on `isSaved` would pulse the heart when a saved film's check answer arrives after mount, although the visitor did nothing.
- **Fix:** the effect pulses only when the previous render was already resolved; covered by "does not pulse when a saved film arrives with the check answer" (failed under mutation).
- **Files modified:** `ShortFilmDetail.tsx`, `ShortFilmDetail.test.tsx`
- **Commit:** 7d73e91

### Plan interpretation notes

- **Session loading and `aria-busy`.** UI-SPEC Part E says "Session loading: same as Unresolved" (which includes `aria-busy`), while the plan's behavior block says busy means authenticated and unresolved. I followed the plan: while the session is loading the heart is a silent no-op without `aria-busy`, so cached HTML does not ship `aria-busy="true"` hearts to every anonymous visitor.
- **`isBusy` also covers a toggle in flight**, so the Part E Pending row (aria-busy, no spinner, taps ignored) holds on the card as well as on unresolved.
- **Formatter noise.** Between my first and second commit the repo formatter reformatted four untouched lines in `ShortsDirectory.tsx` and `ShortsDirectory.test.tsx` (long calls wrapped); they ride along in the Task 2 commit because I edited those files anyway.
- **Test-file writes.** A harness gate blocked one long Python heredoc that rewrote `ShortFilmCard.test.tsx`; the file was written with the Write tool instead, no content difference.

**Total deviations:** 2 auto-fixed (1 critical-functionality, 1 bug), none changed the plan's architecture.

## Known Stubs

None. No placeholder text or mock data in any new or changed production file.

## Threat Flags

None. T-02-21 (callbackUrl): the heart only supplies the browser pathname and the sign-in forms validate it with Plan 04's `safeCallbackUrl`; the hook test asserts the exact redirect URL. T-02-22 (optimistic fill for a failed write): rollback plus destructive toast, and an offline queue failure leaves the heart unchanged (both tested). T-02-23 (racing taps): `toggle()` ignores taps while an add, remove or Undo re-add is in flight and while unresolved (tested, including the Undo case). No new endpoint, auth path or schema.

## Findings for Plan 10

- **Manual checks jsdom cannot do (390px, fr and ar):** contrast of the Gold Leaf filled glyph and the white outline glyph on the 80% Aubergine Deep disc over a real light poster (spec predicts 4.2:1 and 9.7:1); the heart at top-right in French and top-left in Arabic; the 3px focus ring on the 44px target not clipped by the card's `overflow-hidden` frame (the ring sits at a 4px inset with a 2px offset, so check the corner on a real device); the pulse on a real signed-in save; the 200ms spinner on a slow connection.
- **Browser flow for the probe:** signed-out tap shows the toast and lands on `/auth/signin?callbackUrl=%2Fshorts` (and the detail path), then the heart is unsaved after sign-in (owner answer 6). A signed-in `/shorts` visit should show exactly one `/api/.../user-engagement/watchlist` request and no `/watchlist/check/` requests; the detail page exactly one check request.
- **Shared state with the ISR page:** cached HTML ships the unsaved, enabled heart; a signed-in visit corrects it after hydration. The first paint of a saved film in a signed-in grid shows the outline until the list resolves (aria-busy during the wait).
- `ShortsWatchlistProvider` also runs its list request for an empty catalogue when signed in; harmless, but a candidate to skip when `documentIds` is empty.

## Self-Check: PASSED

- Created files exist: `useShortFilmHeart.ts`, `useShortFilmHeart.test.tsx`, `ShortFilmHeart.tsx`, `ShortFilmHeart.test.tsx`, `ShortFilmHeart/index.ts`, this SUMMARY.
- Commits `108db23`, `d563e63`, `7d73e91` are ancestors of HEAD; `git rev-list --count 0b712bb..HEAD` = 3 at SUMMARY time.
