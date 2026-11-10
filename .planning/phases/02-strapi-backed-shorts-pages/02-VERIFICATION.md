---
phase: 02-strapi-backed-shorts-pages
verified: 2026-11-10T18:20:00Z
status: human_needed
score: 5/5 roadmap criteria verified in code and automation (criteria 1 and 4 each carry a live-environment half that only the owner manual checks can close)
covered_files:
  - .planning/phases/02-strapi-backed-shorts-pages/02-01-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-01-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-02-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-02-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-03-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-03-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-04-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-04-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-05-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-05-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-06-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-06-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-07-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-07-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-08-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-08-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-09-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-09-SUMMARY.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-10-PLAN.md
  - .planning/phases/02-strapi-backed-shorts-pages/02-10-SUMMARY.md
  - apps/client/scripts/shorts-probe/probe.mjs
  - "apps/client/src/app/[locale]/shorts/[slug]/layout.tsx"
  - "apps/client/src/app/[locale]/shorts/[slug]/page.tsx"
  - "apps/client/src/app/[locale]/shorts/page.tsx"
  - apps/client/src/app/api/shorts/route.ts
  - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx
  - apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx
  - apps/client/src/features/shorts/utils/shortMappers.ts
  - apps/client/src/features/watchlist/hooks/useShortFilmHeart.ts
  - apps/client/src/lib/strapi-api/content/shorts.ts
  - apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts
covered_digest: "v4:sha256:c740d73e90d1eb9b64eed28d602415dd7a810daa11831ac5481e8c0dcbad7341"
behavior_unverified: 3
behavior_unverified_items:
  - truth: "A signed-in user's heart state survives navigation and a second device, and the film appears on the watchlist page (SC4, FR19/FR20/FR21)"
    test: "Signed in on two browsers: save a film from /shorts and from a detail page, reload, open the other device and /watchlist"
    expected: "Heart filled on both devices, film listed on /watchlist, remove from one device clears it on the other"
    why_human: "State comes from the real user-watchlist API behind a NextAuth session. Unit tests mock the session and the probe has no signed-in session. The Strapi allowlist and add/remove paths are proven on a booted Strapi (78 passed per orchestrator), but the client-to-Strapi round trip with a real session is not exercised by any automated test."
  - truth: "Editing or unpublishing a film in the admin is reflected within the revalidation window (SC1)"
    test: "Production build and start; edit a film title in Strapi admin; wait over 60 seconds; load the detail twice"
    expected: "Second load shows the change"
    why_human: "Code sets next.revalidate = 60 with tags on every read (verified), but no test exercises Next's Data Cache expiry against a live Strapi edit."
  - truth: "Signed-out tap on a heart returns the visitor to the same page and locale after sign-in (SC4, D-14)"
    test: "Signed out, tap a heart on /ar, /en and /fr detail pages and on the directory; sign in"
    expected: "Redirect to /auth/signin?callbackUrl=<same page>, return to the same locale with no doubled prefix"
    why_human: "Redirect and safeCallbackUrl logic are unit tested; the full cross-page NextAuth round trip is not."
---

# Phase 2: Strapi-Backed Shorts Pages Verification Report

**Phase Goal:** A visitor opening `/shorts` or any short film page sees real catalog data in their language, on a complete detail page, and can save films to their real watchlist.
**Verified:** 2026-11-10 (re-checked after iteration-3 fixes 54e5b87 and be5e855 at HEAD be5e855)
**Status:** human_needed
**Re-verification:** No, initial verification

All code-observable truths are verified against the repository, not the SUMMARY claims. No gaps. Status is `human_needed` because three truths have a live-environment half (real session, real cache expiry, real sign-in round trip) that no automated test exercises, plus five visual/accessibility checks the owner listed.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| #   | Truth                                                                                                                                                                                         | Status                                                                                       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/fr\|ar\|en/shorts/<slug>` shows Strapi data; revalidates; unknown slug shows not-found (noindex, 200 per D-22 / amended criterion); missing translation falls back to French                | VERIFIED (revalidation window: PRESENT_BEHAVIOR_UNVERIFIED, human item 2)                    | `shorts.ts` fetches `/creative-works/creative-works/short-films/<slug>` with `{locale}` only, `next: {revalidate: 60, tags}`; layout `[slug]/layout.tsx` calls `getShortFilm` and `notFound()` on SHORT_FILM_NOT_FOUND, rethrows other errors; `page.tsx` has `robots: {index:false}` and no static params; `fallbackTextAttrs` tags French fallback (ShortFilmDetail.tsx:267-268). Probe (re-run by me) asserts detail 200 in fr/ar/en, unknown slug renders hydrated not-found in page locale with noindex, pattern-failing slug makes 0 upstream calls. D-22 honored: 200 status not flagged.                                                                                                            |
| 2   | Director and trailer come from `credits[]`/`videos[]`; no phantom field reaches Strapi, no 400s                                                                                               | VERIFIED                                                                                     | `shortMappers.ts:365-420`: directors from `isDirectingCredit` credits de-duplicated by person; trailer from `videos` where `videoType === "trailer"` through `toSafeHttpsUrl`. Fetchers send only `locale` / `locale,page,pageSize`; no filters/populate. Probe: stub's strict validator `rejected: 0` over the full run (re-run by me).                                                                                                                                                                                                                                                                                                                                                                    |
| 3   | Detail shows "Équipe artistique" grid and access-type sub-label when data exists, omits them otherwise                                                                                        | VERIFIED                                                                                     | `ShortFilmDetail.tsx`: `crewGroups.length > 0 &&` guards the crew `<h2>` section (line 765); `accessType` resolved against `SHORT_FILM_ACCESS_TYPES` and rendered only when matched (715-734). Mapper builds `crew` from credits with department/customRole/billing. Component and axe tests pass (954 tests in shorts/watchlist/strapi-api/app slices re-run by me).                                                                                                                                                                                                                                                                                                                                       |
| 4   | Signed-in user can heart a film on detail page and directory card (independent target), state persists across navigation/devices, appears on watchlist page; signed-out is invited to sign in | VERIFIED in code (real-session round trip: PRESENT_BEHAVIOR_UNVERIFIED, human items 1 and 3) | `useShortFilmHeart` state machine: unauthenticated calls `add()` (toast + sign-in redirect, no local toggle), authenticated optimistic add/remove with `variant: "short-film"`, server-sourced saved state (card via `ShortsWatchlistProvider` mounted in `ShortsDirectory.tsx:242`, detail via check request). `ShortFilmCard.tsx:266-285`: `<Link>` and heart `<button>` are siblings. `ShortFilmDetail.tsx:163` uses the same hook. Strapi `watchlist.ts` carries an explicit `WATCHLIST_CREATIVE_WORK_FIELDS` allowlist (title, slug, type, duration, releaseYear) and keys by creative-work documentId; `WatchlistPageClient.tsx` renders `type === "short-film"` entries linking to `/shorts/<slug>`. |
| 5   | Strapi unreachable shows an error state with retry (not an empty directory), recovers; no production path imports `mock-shorts.ts`                                                            | VERIFIED                                                                                     | `shorts/page.tsx` deliberately does not catch the fetch error so `error.tsx` renders the retryable block; fetchers throw typed `ShortFilmApiError`, never return empty. Probe (re-run by me): directory outage returns no film title and no empty-catalogue copy, hydrated DOM shows error headline, retry label and `role="alert"`; next request recovers with 24 links (no 60 s wait); `/api/shorts` returns 502 (no `shorts` key) on outage and 429. Mock isolation: `grep -rnE "features/shorts/data\|mock-shorts" src` outside tests/stories matches only `features/shorts/data/index.ts` itself; `mock-isolation.test.ts` enforces this and passes.                                                   |

**Score:** 5/5 criteria verified in code; 3 truths carry a behavior-unverified live half (see Human Verification).

### Plan-level must-haves spot checks

| Must-have                                                                                                         | Status                | Evidence                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directory server-renders first 24 as links, `connection()` so build never calls Strapi, no static params (08, 10) | VERIFIED              | `page.tsx` awaits `connection()`, `pageSize: 24`; probe: build succeeds with Strapi unreachable, both routes dynamic `ƒ`, 24 anchors + 24 hearts before JS in fr/ar/en |
| Load-more route strict (400 on bad input, 502 on upstream failure) (01, 10)                                       | VERIFIED              | Probe: page 1/2 200 with correct counts, 7 bad-input cases 400, outage/429 502, recovery 200                                                                           |
| Tickets tab hidden unless `NEXT_PUBLIC_TICKETING_ENABLED === true` (04, D-17)                                     | VERIFIED              | `lib/feature-flags.ts:34` strict `=== true`; used by `BottomNav.tsx` and `DesktopNav.tsx`; env/flag tests in the green suite. `/tickets` route untouched               |
| Copy parity fr/ar/en (02)                                                                                         | VERIFIED              | `features/shorts/i18n.test.ts` passes in the re-run                                                                                                                    |
| Watchlist payload allowlist proven on booted Strapi (07)                                                          | VERIFIED (not re-run) | Allowlist present in `watchlist.ts`; orchestrator reports booted Strapi suites 78 passed. I did not boot Strapi                                                        |

### Required Artifacts / Key Links

| Artifact / link                                                                                             | Status   | Details                                                                         |
| ----------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `src/lib/strapi-api/content/shorts.ts` (typed fetchers, `cache()`, timeout 8 s)                             | VERIFIED | Substantive, imported by layout, page, directory page and `/api/shorts` route   |
| `[slug]/layout.tsx` guard above `loading.tsx`                                                               | VERIFIED | Present; status behavior is D-22 (Phase 5 SC5), not a gap                       |
| `shortMappers.ts`                                                                                           | VERIFIED | Wired through the fetchers; drops summaries with no slug (review-fix `a4f8ad5`) |
| `ShortFilmHeart` -> `useShortFilmHeart` -> `useAddToWatchlist`/`useRemoveFromWatchlist` -> Strapi watchlist | WIRED    | Hooks compose the shipped events hooks with `variant: "short-film"`             |
| `ShortsDirectory` -> `ShortsWatchlistProvider` -> one list request                                          | WIRED    | Provider mounted with the grid's documentIds                                    |
| `WatchlistPageClient` short-film entry                                                                      | WIRED    | Branches on `creativeWork.type`                                                 |

### Data-Flow Trace (Level 4)

| Artifact          | Data variable            | Source                                          | Real data                                                          | Status                 |
| ----------------- | ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| `ShortsDirectory` | `initialShorts`, `total` | `getShortFilmsPage` -> Strapi list endpoint     | Yes (probe renders stub catalogue, outage renders error not empty) | FLOWING                |
| `ShortFilmDetail` | `film`, `relatedShorts`  | `getShortFilm`, `getRelatedShortFilms`          | Yes; related shelf omitted softly on failure by design (D-20)      | FLOWING                |
| Hearts            | saved state              | Strapi `user-watchlist` via check/list requests | Yes in code; live session untested                                 | FLOWING (human item 1) |

### Behavioral Spot-Checks and Probe Execution

| Check                                                                                                  | Command                                                                                               | Result                                                                                          | Status          |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------- |
| Production probe, re-run after 54e5b87 and be5e855 (build with Strapi down, `next start`, stub Strapi) | `node apps/client/scripts/shorts-probe/probe.mjs`                                                     | exit 0, `PROBE PASS (74 checks)`; I re-ran it myself (needs Google Fonts, ports 3999/4010/4020) | PASS            |
| Phase test slices                                                                                      | `yarn vitest run src/features/shorts src/features/watchlist src/lib/strapi-api src/app`               | 70 files, 954 tests passed (before iteration 3)                                                 | PASS            |
| Post-iteration-3 slice                                                                                 | `yarn vitest run src/features/shorts "src/app/[locale]/shorts" src/app/api/shorts src/lib/strapi-api` | 31 files, 583 tests passed; orchestrator full run 1782 passed, `tsc` 0 errors                   | PASS            |
| Full client vitest, `tsc --noEmit`, lint                                                               | Orchestrator, on HEAD                                                                                 | 1778 passed, 0 type errors, lint clean (not re-run by me)                                       | PASS (reported) |
| Booted Strapi suites                                                                                   | Executor/orchestrator                                                                                 | 78 passed (not re-run by me)                                                                    | PASS (reported) |

### Requirements Coverage

All nine IDs are declared in plan frontmatter and map to Phase 2 in REQUIREMENTS.md; no orphans.

| Requirement | Source plans       | Status            | Evidence                                                                                                            |
| ----------- | ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| SPAGE-01    | 01, 06, 08, 10     | SATISFIED         | Strapi-backed list/detail, unknown slug renders not-found (status carried to Phase 5 per D-22), mock isolation test |
| SPAGE-02    | 01, 10             | SATISFIED         | credits/videos mapping, zero rejected requests in probe                                                             |
| SPAGE-03    | 02, 05, 10         | SATISFIED         | Crew grid and access sub-label conditional rendering                                                                |
| SPAGE-04    | 02, 05, 10         | SATISFIED         | Original title, country, language in hero (`ShortFilmDetail.tsx:271-293`)                                           |
| SPAGE-05    | 01, 02, 06, 08, 10 | SATISFIED         | Error blocks with refetching retry; outage never rendered as empty (probe)                                          |
| FR19        | 02, 03, 04, 09, 10 | SATISFIED in code | Hearts on card and detail; live-session round trip is a human item                                                  |
| FR20        | 03, 07, 09, 10     | SATISFIED in code | Optimistic remove with Undo; cross-device persistence is a human item                                               |
| FR21        | 07, 10             | SATISFIED         | Watchlist page short-film entry; Strapi allowlist                                                                   |
| FR56        | 01, 02, 05, 09, 10 | SATISFIED         | API locale fallback + silent `lang` tagging of fallback text                                                        |

### Iteration-3 re-check (54e5b87, be5e855)

- 54e5b87: `ShortsDirectory` now pages on the server `hasMore` (`page < pageCount`): `page.tsx` passes `initialHasMore`, `fetchShortsPage` reads `body.hasMore === true` (a body without it ends paging, so a malformed response cannot loop), and only a failed request keeps the pager from advancing. This removes a "Load more" that stayed up after the last page when slug-less films were omitted. Error-vs-empty behavior (SC5) is unchanged: the page still throws out of `getShortFilmsPage`, and the probe's outage checks still pass (no film title, no empty-catalogue copy, retry block, recovery on the next request). Load-more matrix unchanged (page 1 hasMore true total 30, page 2 six films hasMore false).
- be5e855: `shortMappers.ts` logs each slug-less film once per process via a module-level documentIds set; no change to what is mapped or rendered.
- Info (not a gap): if an entire first page were slug-less while `hasMore` is true, `isEmpty` would show the empty-catalogue copy. This needs 24 consecutive slug-less films, which the Phase 1 API should not produce; noted only for completeness.

### Anti-Patterns Found

None blocking. `TBD|FIXME|XXX` scan over the 73 non-test files touched by `(02-*)` commits matched only phone-number placeholders ("XX XXX XXX") in the three locale JSON files, which are not debt markers. `data/index.ts` still re-exports the mock fixture, but it is unreachable from production code and guarded by `mock-isolation.test.ts` (fixture allowed by SPAGE-01).

### Deferred Items

| #   | Item                                                                                                        | Addressed In | Evidence                                                       |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- |
| 1   | Real HTTP 404 for unknown slug and real 500 for detail outage (currently 200 + noindex with correct screen) | Phase 5      | Phase 5 success criterion 5; D-22; amended Phase 2 criterion 1 |

Not counted as a gap per owner decision D-22.

### Human Verification Required

The eight owner manual checks in `02-10-SUMMARY.md` are all unticked; none have been performed. Classification:

**Gate a truth (live behavior behind a success criterion):**

1. **Check 8, signed-in network counts and real save** (SC4 persistence, FR19/FR20/FR21). Signed in, `/shorts` issues exactly one watchlist list request and no per-card check requests; detail issues exactly one check; a real save persists and appears on `/watchlist`, ideally confirmed on a second device.
2. **Check 4, revalidation window** (SC1). Production build, edit a film title in the admin, wait over 60 s, load twice; second load shows the change.
3. **Check 5, sign-in return path** (SC4 signed-out invitation, D-14). Heart tap signed out on ar/en/fr detail pages and on the directory returns to the same page and locale after sign-in with no doubled prefix.
4. **Check 3, offline queue replay** (FR19/FR20 resilience, D-15). Offline tap fills the heart, reconnect syncs it to `/watchlist`.

**Quality/accessibility, not gating a success-criterion truth (but still outstanding):**

5. **Check 1, contrast at 390px** (heart glyph over real posters, crew initials, muted metadata). Jsdom axe cannot compute real contrast.
6. **Check 2, RTL layout** at 390px, 320px and 200% zoom (heart top-left, crew grid right-to-left, fallback block alignment).
7. **Check 6, keyboard and focus** (3px gold ring not clipped at the heart corner, Enter/Space on heart, retry focus behavior after failed and successful retry).
8. **Check 7, Instagram in-app browser** (hydration, and whether the pre-hydration blank shell on layout-level failures, RESEARCH A7, is acceptable). This one also records a product judgment.

### Gaps Summary

No code gaps. Every roadmap criterion is satisfied by code I read and by the production probe I re-ran (exit 0, 74 checks) plus the 954-test slice. The phase cannot be called `passed` because the real-session watchlist round trip, the 60 s revalidation behavior and the sign-in return path are behavior-dependent truths that only the unticked owner checks exercise.

---

_Verified: 2026-11-10_
_Verifier: Claude (gsd-verifier)_
