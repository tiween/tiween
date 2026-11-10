---
phase: 02-strapi-backed-shorts-pages
plan: 08
subsystem: frontend-shorts-directory
tags:
  [
    next-app-router,
    strapi,
    load-more,
    a11y,
    axe-core,
    vitest,
    next-intl,
    mock-isolation,
  ]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: "getShortFilmsPage and the strict /api/shorts load-more route (plan 01), shadcn Empty and the axe helper (plan 02), ShortsPageIntro, SHORTS_GRID_CLASS, SHORTS_PAGE_CLASS, ShortsStateBlock, error.tsx and loading.tsx (plan 06)"
provides:
  - "/[locale]/shorts reads the Strapi catalogue: connection() first, first 24 films server-rendered as real links, no try/catch so an outage reaches error.tsx"
  - "ShortsDirectory rewritten to { initialShorts, totalShorts, className }: intro, polite result line, sr-only h2 + 2:3 grid, Load more (idle, loading, error, none), empty-catalogue block, end-of-list suggestion prompt"
  - "ShortsShowcase and ShortsHero deleted with shorts.hero.* and six dead shorts.directory.* keys in fr, ar and en"
  - "mock-isolation.test.ts: no production file may reference mock-shorts or the features/shorts/data folder"
  - "rendering-rules.test.ts extended to the directory page and to the deleted components"
affects: [02-09, 02-10]

actuals:
  tokens: 8500
  tasks: 2
  commits: 2
plan_head_before: 8e4eaca6e2372c9c5099c85b22a20d77322e4509
plan_head_after: 300da4b5ae3343431a191059a58daefac3f6306b

tech-stack:
  added: []
  patterns:
    - "Single-flight ref + AbortController on unmount for Load more; observer is additive and disconnected while in error"
    - "Focus moves to the first appended card only when the button fetched the last page and then unmounted (observer-driven loads never move focus)"
    - "Source-level guards (mock-isolation, rendering-rules) instead of grep acceptance criteria"

key-files:
  created:
    - apps/client/src/app/[locale]/shorts/page.test.tsx
    - apps/client/src/features/shorts/mock-isolation.test.ts
  modified:
    - apps/client/src/app/[locale]/shorts/page.tsx
    - apps/client/src/app/[locale]/shorts/rendering-rules.test.ts
    - apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx
    - apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.test.tsx
    - apps/client/src/features/shorts/components/ShortsDirectory/index.ts
    - apps/client/src/features/shorts/components/index.ts
    - apps/client/src/features/shorts/index.ts
    - apps/client/src/features/shorts/i18n.test.ts
    - apps/client/locales/fr.json
    - apps/client/locales/ar.json
    - apps/client/locales/en.json
  deleted:
    - apps/client/src/app/[locale]/shorts/_components/ShortsShowcase.tsx
    - apps/client/src/features/shorts/components/ShortsHero/ShortsHero.tsx
    - apps/client/src/features/shorts/components/ShortsHero/index.ts

key-decisions:
  - "D-01/D-02/D-04: /shorts is one grid directory; the Showcase is deleted, ShortsHero goes with its only importer, ShortsFilters is neither rendered nor wired (it stays exported for Phases 3 and 4)"
  - "D-07: the page does not catch the fetch error; the empty-catalogue block is reachable only from an HTTP 200 with zero rows (T-02-20)"
  - "D-06: connection() is the first statement of the page; no force-dynamic, no static-params export"
  - "An empty 200 page from Load more ends the list (exhausted flag) instead of leaving a button that can never add films"

requirements-completed: []

duration: ~30min
completed: 2026-11-10
---

# Phase 2 Plan 08: Strapi-backed `/shorts` directory Summary

**`/fr|ar|en/shorts` now serves the real Strapi catalogue as one 2:3 poster grid with a one-line intro, a polite result line and a locale+page-only Load more; an outage throws to the retryable error block, the old mock Showcase and Hero are gone, and a guard test keeps mock data out of production code.**

## Performance

- **Duration:** about 30 min
- **Tasks:** 2 of 2 (2 task commits)
- **Files:** 2 created, 11 modified, 3 deleted

## Accomplishments

- **ShortsDirectory (Task 1, `b375188`).** Props are `{ initialShorts, totalShorts, className }`. Inside `<main className={SHORTS_PAGE_CLASS}>`: `ShortsPageIntro` (default `restoreFocus`, so a successful retry lands on the h1), a Meta 14 `role="status"` result line from `shorts.filters.results` with `formatCount` (Western digits in Arabic), an sr-only `<h2>` "Tous les courts métrages" and the grid on `SHORTS_GRID_CLASS`. Mounting makes no request.
- **Load more.** Visible only while `shorts.length < total`. Secondary pill (44px, min 160px, 1.5px Gold Leaf border, Gold Tint label, transparent fill, no primary gold fill). Requests `/api/shorts?locale=..&page=..` and nothing else; non-2xx or a body without a `shorts` array throws and is shown as a failure, never "no more films". Single-flight ref, abort on unmount, de-duplication by `documentId`. Loading keeps the button mounted with `aria-disabled="true"` plus a spinner and "Chargement des courts métrages…" and a separate sr-only `role="status"`. Error keeps every card, shows one `role="alert"` ("La suite n'a pas pu être chargée.") above a "Réessayer" pill and disconnects the observer until retried; retry re-requests the same page.
- **Focus.** Button still present after an append: focus stays on it. Button fetched the last page and unmounted: focus moves to the link of the first appended card. Observer-driven loads never move focus.
- **Empty catalogue.** Zero films hides the result line and grid and renders `ShortsStateBlock` (shadcn Empty parts): Film icon, "Le catalogue ouvre bientôt", body, and the `SuggestionForm` trigger styled as the secondary pill. Plain content, not an alert. The end-of-list suggestion prompt follows the grid only once the list is complete.
- **Page (Task 2, `300da4b`).** `await connection()` first, then `params`, `setRequestLocale`, `getShortFilmsPage({ locale, page: 1, pageSize: 24 })` with no try/catch, metadata kept (noindex, nofollow).
- **Retired.** `ShortsShowcase.tsx`, the `ShortsHero` folder and its exports; locale keys `shorts.hero.*` and `shorts.directory.errorBody|latest|seeAll|emptyTitle|emptyBody|resetFilters` removed from all three catalogs after a repo-wide search showed no other reference. `shorts.filters.*` kept. `features/shorts/data/` untouched (fixture only).
- **Guards.** `mock-isolation.test.ts` walks `apps/client/src` and fails on any non-test, non-story file outside the data folder that mentions `mock-shorts` or the data module path (proven to fail by dropping a temporary importing file, then removed). `rendering-rules.test.ts` now covers `page.tsx` (no static params, no mock import, no force-dynamic, `connection()` awaited before params and the fetcher, no try/catch) and asserts the Showcase file and Hero folder no longer exist.

## Verification (real output)

| Verify                                                                                                                                               | Result                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1: `vitest run src/features/shorts/components/ShortsDirectory`                                                                                  | `Test Files 1 passed (1)`, `Tests 29 passed (29)`, exit 0                                                                                                                                                                        |
| Mutation check: add `pageSize` to the Load more query                                                                                                | 2 tests failed as expected ("requests exactly locale and page", "never sends pageSize..."); source restored                                                                                                                      |
| Task 2: `vitest run "src/app/[locale]/shorts" src/features/shorts src/lib/icu-numerals.test.ts`                                                      | `Test Files 23 passed (23)`, `Tests 351 passed (351)`, exit 0 (includes page.test, rendering-rules, mock-isolation, i18n)                                                                                                        |
| Full client suite `vitest run`                                                                                                                       | `Test Files 136 passed (136)`, `Tests 1672 passed (1672)`                                                                                                                                                                        |
| `test ! -e '.../ShortsShowcase.tsx' && test ! -e .../ShortsHero/ShortsHero.tsx`                                                                      | exit 0 (both existed at HEAD before the task)                                                                                                                                                                                    |
| `yarn workspace @tiween/client tsc --noEmit`                                                                                                         | exit 0, no `error TS` lines                                                                                                                                                                                                      |
| `eslint src/features/shorts/components/ShortsDirectory --max-warnings=0` and `eslint "src/app/[locale]/shorts" src/features/shorts --max-warnings=0` | exit 0 both                                                                                                                                                                                                                      |
| Mock-isolation guard proof: temporary `src/app/tmp-mock-probe.ts` importing the data folder                                                          | `expected [ 'src/app/tmp-mock-probe.ts' ] to deeply equal []`, `1 failed \| 2 passed`; file removed                                                                                                                              |
| `node apps/client/scripts/shorts-probe/probe.mjs` (full run, `next build` with Strapi unreachable, sends its own `--accept-lang`)                    | `PROBE PASS (33 checks)`, exit 0. The probe only asserts the detail routes and `/api/shorts`; it does not assert `/shorts` (Plan 10 owns that).                                                                                  |
| Manual smoke against the stub Strapi (`next start`, `x-forwarded-proto: https`, 32 films)                                                            | `/shorts`, `/ar/shorts`, `/en/shorts` all 200: h1 "Courts métrages" / "أفلام قصيرة" / "Short films", result line "32 courts métrages" / "32 فيلمًا قصيرًا" / "32 short films", server-rendered card links, one Load more control |
| Build with Strapi down                                                                                                                               | build succeeded inside the probe; no `fr/shorts.html` prerender output and no `shorts` entry in `.next/prerender-manifest.json`                                                                                                  |

Acceptance points covered by tests: the Load more URL parses to exactly the keys `locale` and `page` and never carries `pageSize`, `q`, `genre`, `sort`; a rejected request, a 502 and a malformed body each leave the earlier cards in the DOM with exactly one `role="alert"` and a retry control; the observer is disconnected while in error and retry re-requests page 2; 13 films with total 13 render no button and no observer; the empty block has no alert and no status; the h1 consumes a pending retry mark; axe passes in fr, ar and en for the results (Load more), complete-list and empty states.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Empty Load more page must end the list**

- **Found during:** Task 1
- **Issue:** If `/api/shorts` answered 200 with an empty `shorts` array while `total` was still higher, the button would stay forever and never add a film.
- **Fix:** an `exhausted` flag set by an empty 200 page removes the control (and then the suggestion prompt follows). A 502 or malformed body is still a failure, not an end.
- **Files modified:** `ShortsDirectory.tsx`, `ShortsDirectory.test.tsx`
- **Commit:** b375188

**2. [Rule 3 - Blocking] Index exports and the legacy-key test**

- **Issue:** removing `ShortsDirectoryLabels` and `ShortsHero` broke the three barrels, and `i18n.test.ts` ("keeps the legacy keys until the plans that stop using them remove them") still required `shorts.hero` and `shorts.directory.emptyTitle`.
- **Fix:** pruned the exports in the same commits; the test no longer lists those two keys and a new case asserts every removed key is absent in all three catalogs.
- **Files modified:** `components/ShortsDirectory/index.ts`, `components/index.ts`, `features/shorts/index.ts`, `i18n.test.ts`
- **Commit:** b375188, 300da4b

**3. [Rule 1 - Bug, test-driven] Guard tripped on its own comment**

- The rendering-rules `force-dynamic` check matched the word inside the page's explanatory comment; the comment was reworded (no behavior change).

### Plan interpretation notes

- The Load more "focus moves to the first appended card" rule is applied only when the button (not the scroll observer) triggered the last page. Moving focus after a silent scroll-triggered load would be a surprise jump; the UI-SPEC wording describes the activating control surviving or not.
- The probe was not part of the plan's verify; it was run anyway as a regression for `connection()`/build with Strapi down and passed.

**Total deviations:** 3 (1 critical-functionality, 1 blocking, 1 test-only), none touched the plan's architecture.

## Known Stubs

None. No placeholder text or mock data is rendered by any new or changed file.

## Threat Flags

None. No new endpoint, auth path or file access; T-02-18 (mock isolation test), T-02-19 (locale+page only, single-flight, observer off in error) and T-02-20 (page does not catch; empty block only from a 200 with zero rows) are mitigated and tested.

## Findings for later plans

- **Plan 09:** each card is currently a direct child of the grid (`<article>` from `ShortFilmCard`). The focus-after-append effect reads `gridRef.current.children[previousLength].querySelector("a")`; if Plan 09 wraps cards (heart provider, positioning), keep one wrapper per card as a direct grid child or update that lookup. The watchlist provider should wrap the `<main>` content in `ShortsDirectory` or the page.
- **Plan 09 dead key:** `shorts.watchlist` / `shorts.removeFromWatchlist` are still kept by `i18n.test.ts` until the heart work replaces them.
- **Plan 10 probe:** the probe does not yet assert `/shorts`. Useful checks: `/shorts` renders the intro and a card link in each locale (needs `x-forwarded-proto: https` and `Accept-Language` when hitting the app directly with curl), an outage on the list reaches the directory error block (HTTP 200 under D-22), and `/shorts` is not in the prerender manifest.
- **Manual contrast pass (jsdom cannot assert contrast), 390px in fr and ar:** muted `#B0A6B8` result line and body on the field, Gold Tint label on the transparent secondary pill, destructive `#FF8A8A` 16px icon beside the load-more error, the 3px focus ring on the pill. The spec's reading color `#C9C0D0` is still approximated by `text-muted-foreground` (see 02-06).
- Pre-existing, not touched: the old `lint-staged automatic backup` entry in `git stash list`; untracked `.impeccable/` directories.

## Self-Check: PASSED

- Created files exist: `page.test.tsx`, `mock-isolation.test.ts`, this SUMMARY.
- Deleted files are gone: `ShortsShowcase.tsx`, `ShortsHero/ShortsHero.tsx`, `ShortsHero/index.ts`.
- Commits `b375188` and `300da4b` are ancestors of HEAD; `git rev-list --count 8e4eaca..HEAD` = 2 at SUMMARY time.
