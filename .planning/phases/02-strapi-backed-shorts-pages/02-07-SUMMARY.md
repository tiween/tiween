---
phase: 02-strapi-backed-shorts-pages
plan: 07
subsystem: watchlist-short-film-entry
tags:
  [
    strapi-v5,
    user-engagement,
    document-service,
    populate-fields,
    eventcard,
    watchlist,
    next-intl,
    vitest,
    axe-core,
  ]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: "WatchlistItem optional slug/releaseYear/duration and the short-film variant of useRemoveFromWatchlist (plan 03), shorts.category / durationMinutes copy, ReservedArtwork, axe helper (plans 02, 05)"
provides:
  - "getUserWatchlist populates creativeWork through an explicit fields allowlist (title, slug, type, duration, releaseYear); booted-Strapi proof of the payload"
  - "EventCard optional shortFilm prop (2:3 frame, artwork fallback, no venue/date row, stretched locale-aware title link, heart above the link)"
  - "Short-film branch of WatchlistCard in the one mixed list (D-16), French titles on ar/en (D-18)"
affects: [02-08, 02-09, 02-10]

actuals:
  tokens: 11500
  tasks: 2
  commits: 2
plan_head_before: aac00e566ffbfdbc2fff7600d9a3cc2d7d399b45
plan_head_after: 63b21ccf75ad5fd6282db6b8ba45e3dc44fe6dd0

tech-stack:
  added: []
  patterns:
    - "Document Service populate object form with a fields allowlist as the explicit client contract for a relation"
    - "next-intl test mock switchable between key echo and real catalogs (createTranslator) inside one test file"

key-files:
  created:
    - apps/strapi/src/plugins/user-engagement/server/src/__tests__/watchlist-payload.service.test.ts
    - .planning/phases/02-strapi-backed-shorts-pages/deferred-items.md
  modified:
    - apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts
    - apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts
    - apps/client/src/features/events/components/EventCard/EventCard.tsx
    - apps/client/src/features/events/components/EventCard/EventCard.test.tsx
    - apps/client/src/features/events/components/EventCard/index.ts
    - apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx
    - apps/client/src/app/[locale]/watchlist/WatchlistPageClient.test.tsx
    - apps/client/src/app/[locale]/events/parameterizedLabelsBinding.test.tsx
    - apps/client/src/features/events/components/EventsListing/EventsListing.test.tsx

key-decisions:
  - "A1 settled: the bare populate returns slug and type (assumption true) but ALSO every other creative-work scalar (synopsis, country, language, featured, rank), so the allowlist is mandatory hardening, not optional"
  - "A short-film entry without a slug renders unlinked; a slug is trimmed and encodeURIComponent-ed before it becomes /shorts/<slug>"
  - "The heart gets z-20 only in short-film mode so event card markup stays byte-identical"

requirements-completed: []

duration: ~35 min
completed: 2026-11-10
---

# Phase 2 Plan 07: Short films on the watchlist page Summary

**A saved short film now shows up in the watchlist's one mixed list (after the dated events, newest saved first) as a 2:3 EventCard with the singular "Court metrage" badge, an optional "{year} · {duration}" line, a whole-card link to /shorts/<slug> and the existing heart with Undo; the Strapi payload behind it is an explicit five-field allowlist proven on a booted Strapi.**

## Performance

- **Duration:** about 35 min
- **Tasks:** 2 of 2 (2 commits)
- **Files:** 2 created, 9 modified (plus the phase `deferred-items.md`)

## Accomplishments

- **Task 1 (`3359ae8`), A1 settled by a red-first boot test.** `watchlist-payload.service.test.ts` creates a published short film, seeds a user, calls the plugin's `add` and `getUserWatchlist`, and asserts slug, type, title, documentId, duration, releaseYear, the nullable enrichment fields, no `dedupeKey`, and the absence of synopsis, country, language, featured, featuredRank, rating, ageRating, originalTitle plus an exact key list for `creativeWork`. Run against the unchanged service it FAILED on `synopsis` (after the slug/type matcher had already passed): **assumption A1 is true, and the bare `populate: ["creativeWork"]` leaks every scalar of the work to the browser.** `getUserWatchlist` now populates `{ creativeWork: { fields: [title, slug, type, duration, releaseYear] } }` (exported as `WATCHLIST_CREATIVE_WORK_FIELDS`); sort, `dedupeKey` strip, events-manager facade enrichment and its try/catch are untouched. The unit suite gained one case pinning the populate argument (no existing unit assertion touched `populate`, so nothing had to change). Nothing under `apps/strapi/src/api`.
- **Task 2 (`63b21cc`).** `EventCard` gets an optional `shortFilm` prop `{ href?, metaLine?, posterFallback? }`. Absent: identical markup (tested by comparing innerHTML, and the heart's `z-20` is short-film-only). Present: the image frame is `aspect-[2/3]`, the fallback node replaces the Next image when there is no poster (never `/images/placeholder-poster.jpg`; a real poster gets `alt=""` because the title link names the film), the venue/date block is not rendered, the meta line renders only when non-empty, the title is a locale-aware `Link` inside the `h3` with `after:absolute after:inset-0 after:z-10`, the article gets no click handler or pointer cursor, and the heart sits at `z-20` as its own target. `WatchlistCard` branches on `type === "short-film"`: `useRemoveFromWatchlist(id, { variant })` is called unconditionally, the badge is `shorts.category` (singular), the meta line joins `positiveNumber(year)` and the `shorts.durationMinutes` ICU message with `formatCount` using `·` (parts omitted when absent, no `0`, no lone separator), href is `/shorts/<encoded slug>` only when a trimmed slug exists, no `onClick`. Events, `partitionWatchlist`, `filterByCategory`, offline logic, the seed effect and all page copy are unchanged.

## Verification (real output)

| Verify                                                                                                                                                 | Result                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Task 1: `yarn workspace @tiween/admin jest .../watchlist.unit.test.ts`                                                                                 | `Tests: 40 passed, 40 total`, exit 0                                                     |
| Task 1: `yarn workspace @tiween/admin build:test-dist` (exit checked, 0) then boot test, empty ImageKit env, `--runInBand`                             | `Tests: 1 passed, 1 total`, exit 0                                                       |
| RED before the allowlist (same boot test)                                                                                                              | failed on `Expected path: not "synopsis"`, i.e. the unfiltered populate leaks            |
| `yarn workspace @tiween/admin jest src/plugins/user-engagement`                                                                                        | `Test Suites: 4 passed`, `Tests: 88 passed`                                              |
| `yarn workspace @tiween/admin eslint src/plugins/user-engagement --max-warnings=0`                                                                     | exit 0                                                                                   |
| `yarn workspace @tiween/admin type-check` (and `tsc --noEmit` in apps/strapi)                                                                          | exit 0                                                                                   |
| `git log --name-only aac00e5..HEAD -- apps/strapi/src/api`                                                                                             | lists no file                                                                            |
| Task 2: `vitest run "src/app/[locale]/watchlist" src/features/events/components/EventCard src/features/events/utils/watchlistView.test.ts`             | `Test Files 3 passed (3)`, `Tests 85 passed (85)`, exit 0                                |
| RED before implementing EventCard / WatchlistCard                                                                                                      | 5 EventCard cases and 14 page cases failed, then green                                   |
| `yarn workspace @tiween/client tsc --noEmit`                                                                                                           | exit 0, `grep -c "error TS"` prints 0                                                    |
| `eslint src/features/events/components/EventCard "src/app/[locale]/watchlist" --max-warnings=0` (and `src/features/events`, `src/app/[locale]/events`) | exit 0                                                                                   |
| Full client suite `vitest run`                                                                                                                         | `Test Files 134 passed (134)`, `Tests 1627 passed (1627)`                                |
| Pre-commit hooks (lint-staged, commitlint) on both commits                                                                                             | passed (first attempt of commit 2 was rejected for a body line over 100 chars, reworded) |

Axe passes on the list sections of the mixed list (a dated event plus two short films, one with year and duration, one bare) with the REAL fr, ar and en catalogs; the case also asserts the translated singular label per locale and a Western-digit "2012 · 30 ..." meta line in Arabic. jsdom has no layout engine, so "390px" is not literally simulated and colour contrast stays the manual pass already scheduled for Plan 10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing short-film badge assertion contradicts the plan's own requirement**

- **Found during:** Task 2
- **Issue:** `WatchlistPageClient.test.tsx` "resolves a localized category badge for each creative-work type" expected the short-film badge to be `categories.shorts` (the plural tab label). The plan and UI-SPEC Part D require the singular `shorts.category`.
- **Fix:** that one case now expects `category` for `short-film`; film and play cases are unchanged. Every other pre-existing test passes unchanged.
- **Files modified:** `WatchlistPageClient.test.tsx`
- **Commit:** 63b21cc

**2. [Rule 3 - Blocking] EventCard importing `@/lib/navigation` broke two unrelated suites**

- **Found during:** full client run after Task 2
- **Issue:** the real `@/lib/navigation` imports `env.mjs`, which rejects vitest's `NODE_ENV=test`. `parameterizedLabelsBinding.test.tsx` and `EventsListing.test.tsx` render/import `EventCard` without mocking navigation ("Invalid environment variables").
- **Fix:** added a minimal `vi.mock("@/lib/navigation")` (Link only) to those two test files, the repo's existing convention. No production code changed for it.
- **Files modified:** `parameterizedLabelsBinding.test.tsx`, `EventsListing.test.tsx`
- **Commit:** 63b21cc

**3. [Rule 2 - Missing critical] Decorative poster alt and slug encoding**

- With a real poster the Next image would repeat the title next to the title link, so the short-film poster gets `alt=""`. The slug is trimmed and `encodeURIComponent`-ed before it becomes `/shorts/<slug>` (T-02-17 hardening); a blank slug counts as no slug.

### Scope boundary note

- The axe case runs on the list `section` elements, not the whole page: the shared `CategoryTabs` strip has a pre-existing `aria-controls` pointing at a tabpanel that is never rendered (critical `aria-valid-attr-value`). Logged in `deferred-items.md`, not fixed here.

**Total deviations:** 3 (1 bug in an old assertion, 1 blocking test wiring, 1 hardening), none touched the plan's architecture.

## Known Stubs

None. The reserved artwork for a missing poster is the specified design, not a stub. Note (also in `deferred-items.md`): the server never populates the nested `poster` media, so every watchlist short film currently shows the reserved artwork (RESEARCH Pitfall 18, accepted: no launch film has a 2:3 poster).

## Threat Flags

None. T-02-16 is mitigated (allowlist plus booted absence assertions); T-02-17 is mitigated (no link without a slug, href built only from the encoded slug through the locale-aware Link). No new endpoint, auth path or schema.

## Findings for later plans

- **Plan 09/10:** the Strapi boot suite `watchlist-payload.service.test.ts` is skipped by CI; run it explicitly (`build:test-dist` first, empty ImageKit env, `--runInBand`) as part of the Plan 10 gate.
- **Page copy** that says "evenements" is untouched by design (UI-SPEC open question 9, Phase 6).
- Not touched: the old `lint-staged automatic backup` stash entry and the untracked `.impeccable/` folders.

## Self-Check: PASSED

- Created files exist: `watchlist-payload.service.test.ts`, `deferred-items.md`, this SUMMARY.
- Commits `3359ae8` and `63b21cc` are ancestors of HEAD.
