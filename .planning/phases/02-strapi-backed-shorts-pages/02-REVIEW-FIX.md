---
phase: 02-strapi-backed-shorts-pages
fixed_at: 2026-11-10T00:00:00Z
review_path: .planning/phases/02-strapi-backed-shorts-pages/02-REVIEW.md
iteration: 3
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-11-10
**Source review:** .planning/phases/02-strapi-backed-shorts-pages/02-REVIEW.md
**Iteration:** 3

**Summary:**

- Findings in scope: 7 (iteration 1: CR-01, WR-01..WR-04; iteration 3: re-review WR-01 and IN-06)
- Fixed: 7
- Skipped: 0

Finding ids in the Iteration 1 section below refer to the first review. The iteration 3 re-review
overwrote REVIEW.md and reuses WR-01 for a new finding; it is labelled "iteration-3 WR-01" here.
IN-01 to IN-05 remain open in REVIEW.md (out of scope for `critical_warning`; IN-06 was requested).

Edits and commits were made directly on `main` in the main working tree (no isolated
worktree), as the caller instructed. Verification below ran in that same tree, so it is
reproducible from the current checkout.

## Fixed Issues

### Iteration 1

### CR-01: `openExternal` always navigates the current tab away as well as opening a new one

**Files modified:** `apps/client/src/features/shorts/utils/index.ts`, `apps/client/src/features/shorts/utils/openExternal.test.ts` (new)
**Commit:** dd3da0d
**Applied fix:** `openExternal` now opens the validated URL through a synthetic
`<a target="_blank" rel="noopener noreferrer">` click and no longer reads the (always `null`
under `noopener`) return value of `window.open`, so it never assigns `window.location.href`.
The new test asserts the anchor attributes, that the current location and jsdom's navigation
channel are untouched even when `window.open` returns `null`, and that unsafe or blank URLs
open nothing. Both behavioural tests fail against the old implementation and pass now.

Follow-up commit **c4d97ef** (`test(02): follow the anchor-based external open in detail tests`)
updated `ShortFilmDetail.test.tsx`, whose watch-target tests asserted `window.open` and broke
after the CR-01 change. They now record the anchor click instead. This was a miss in the CR-01
commit (only the new test file was run at that point), found by the broader run.

### WR-01: `/shorts` title is suffixed twice

**Files modified:** `apps/client/src/app/[locale]/shorts/page.tsx`, `apps/client/src/app/[locale]/shorts/page.test.tsx`
**Commit:** e36ce0d
**Applied fix:** `metadata.title` is now `"Courts Métrages"`; the locale layout template appends
`| Tiween`. Added a test on the exported title (it fails against the old literal).

### WR-02: Raw hex `#FF8A8A` instead of the destructive token

**Files modified:** `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx`, `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.test.tsx`
**Commit:** e1c048a
**Applied fix:** The load-more error icon uses `text-destructive`. The existing load-more
failure test now asserts the icon carries `text-destructive` and no hex colour (fails before).

### WR-03: Any `TypeError` is classified as a `NETWORK_ERROR`, which masks mapper bugs

**Files modified:** `apps/client/src/lib/strapi-api/content/shorts.ts`, `apps/client/src/lib/strapi-api/content/shorts.test.ts`
**Commit:** a749425
**Applied fix:** Added `mapPayload()`, which wraps every mapper call (detail, list, related)
and rethrows a failure as `ShortFilmApiError` `INTERNAL_ERROR`/`UPSTREAM` with the original as
`cause`, after logging `unexpected API shape while mapping <payload>`. The error is already a
`ShortFilmApiError`, so `toShortFilmApiError` no longer reclassifies it. `NETWORK_ERROR_NAMES`
is unchanged, so real fetch failures still map to `NETWORK_ERROR`. Three regression tests (one
per fetcher) fail against the old code (verified: 3 failures before, pass after).
Status: fixed (behaviour change in error classification; worth a quick human glance).

### WR-04: Summary mapper falls back to `documentId` as the slug, producing dead links

**Files modified:** `apps/client/src/features/shorts/utils/shortMappers.ts`, `apps/client/src/features/shorts/utils/shortMappers.test.ts`, `apps/client/src/lib/strapi-api/content/shorts.ts`, `apps/client/src/lib/strapi-api/content/shorts.test.ts`
**Commit:** a4f8ad5
**Applied fix:** Chose omission over an unlinked card. New `mapShortFilmSummaries()` drops films
whose slug is null or blank and warns server-side with their documentIds; `getShortFilmsPage` and
`getRelatedShortFilms` use it. `mapShortFilmSummary` keeps its `documentId` fallback only for the
detail mapper (the film was fetched by slug) and its comment now says so. Rationale: `ShortFilm.slug`
is a required `string` across the cards, share URL, hearts and related shelf, so rendering unlinked
would have meant making it optional through many consumers; an unreachable card is also a worse
dead end than an absent one. Trade-off: `total` still counts a slug-less film, so the displayed
count can exceed the visible cards by that number. Tests cover the mapper and both fetchers (fail
against the old code).
Status: fixed: requires human verification (product choice: omit vs. show unlinked).

### Iteration 3

#### Iteration-3 WR-01: Omitting slug-less films desynchronises the client's `hasMore` and result count

**Files modified:** `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx`, `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.test.tsx`, `apps/client/src/app/[locale]/shorts/page.tsx`, `apps/client/src/app/[locale]/shorts/page.test.tsx`
**Commit:** 54e5b87
**Applied fix:** The directory now pages on the server's `hasMore` (`page < pageCount`), which
`getShortFilmsPage` and `/api/shorts` already returned. The server page passes it as the new
`initialHasMore` prop (falling back to `shorts.length < total` only when absent), `fetchShortsPage`
carries `hasMore` through (a body without it is treated as the last page), and the `exhausted`
state and the `shorts.length < total` check are gone. Only a failed request stops the pager; an
empty page never does. Result count: kept the server `total` as-is (simpler than the server
reporting an omitted count); documented on the `totalShorts` prop, so the line can exceed the
visible cards by the number of omitted films. New tests: the last page hides Load more when `total`
counts an omitted film (both after a load and on the first page via `initialHasMore: false`), an
all-omitted middle page still lets paging continue to page 3, and the page hands `hasMore` to the
directory. The old "stops offering Load more on an empty page" test encoded the behaviour the
re-review flagged and was replaced; the three new directory tests fail against the old component.
Status: fixed: requires human verification (paging logic).

#### IN-06: `mapShortFilmSummaries` warns on every render of an affected list

**Files modified:** `apps/client/src/features/shorts/utils/shortMappers.ts`, `apps/client/src/features/shorts/utils/shortMappers.test.ts`
**Commit:** be5e855
**Applied fix:** A module-level `Set` of reported documentIds makes each slug-less film log once
per process; a call with only already-reported films logs nothing. The new test fails against the
previous version.

## Skipped Issues

None.

## Verification

Run in `apps/client` on `main` (main working tree):

- `yarn vitest run`: `Test Files  139 passed (139)`, `Tests  1782 passed (1782)` (iteration 3; iteration 1 was 1778)
- `npx tsc --noEmit`: no output, clean
- `yarn lint` (`eslint . --max-warnings=0`): `Done in 25.10s.`, no warnings

Each commit also passed the repo's lint-staged ESLint and commitlint hooks.

---

_Fixed: 2026-11-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
