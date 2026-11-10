---
phase: 02-strapi-backed-shorts-pages
fixed_at: 2026-11-10T00:00:00Z
review_path: .planning/phases/02-strapi-backed-shorts-pages/02-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-11-10
**Source review:** .planning/phases/02-strapi-backed-shorts-pages/02-REVIEW.md
**Iteration:** 1

**Summary:**

- Findings in scope: 5 (CR-01, WR-01, WR-02, WR-03, WR-04)
- Fixed: 5
- Skipped: 0

Out of scope for `fix_scope: critical_warning`: IN-01 to IN-05 remain in REVIEW.md.

Edits and commits were made directly on `main` in the main working tree (no isolated
worktree), as the caller instructed. Verification below ran in that same tree, so it is
reproducible from the current checkout.

## Fixed Issues

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

## Skipped Issues

None.

## Verification

Run in `apps/client` on `main` (main working tree):

- `yarn vitest run`: `Test Files  139 passed (139)`, `Tests  1778 passed (1778)`
- `npx tsc --noEmit`: no output, clean
- `yarn lint` (`eslint . --max-warnings=0`): `Done in 27.26s.`, no warnings

Each commit also passed the repo's lint-staged ESLint and commitlint hooks.

---

_Fixed: 2026-11-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
