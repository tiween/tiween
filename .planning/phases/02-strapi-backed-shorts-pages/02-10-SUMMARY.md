---
phase: 02-strapi-backed-shorts-pages
plan: 10
subsystem: verification-probe-and-gates
tags: [probe, production, next-start, stub-strapi, quality-gates, manual-checks]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: "all finished routes: directory, detail, load-more route, hearts, error and not-found boundaries (01-09), probe and stub (01)"
provides:
  - "probe.mjs: build with Strapi down, detail matrix, directory (fr, ar, en), outage and recovery, load-more matrix, request hygiene"
  - "stub-strapi.mjs: STUB_FILMS is now the total film count (default 30, two directory pages)"
  - "Recorded gate results and the owner manual-check list for /gsd-verify-work"
affects: [phase-6-smoke-checklist, gsd-verify-work]

actuals:
  tokens: 3500
  tasks: 2
  commits: 2
plan_head_before: 1922758792ae9780846b68f1827e99c244cdb06f
plan_head_after: 31ab4811151e088a751e3b17e178a591d309faff

tech-stack:
  added: []
  patterns:
    - "Outage is probed on a cache key no earlier request created (the Data Cache would otherwise serve a stale 200); the same URL is then re-requested at once to prove failures are not cached"
    - "Copy-presence assertions strip <script> flight payloads first, because the payload carries the whole message catalog"

key-files:
  created: []
  modified:
    - apps/client/scripts/shorts-probe/probe.mjs
    - apps/client/scripts/shorts-probe/stub-strapi.mjs

key-decisions:
  - "Kept the 429 check on the load-more route on a fresh page (4) and the outage check on page 3, because pages already fetched are served from the Data Cache and would hide the failure behind a 200"
  - "Signed-in network-count and signed-out heart redirect are NOT probed: they need a real NextAuth session or a browser click driver, neither of which the stub-only probe has. They stay covered by the Plan 09 unit and axe suites plus the owner manual list"

requirements-completed:
  [SPAGE-01, SPAGE-02, SPAGE-03, SPAGE-04, SPAGE-05, FR19, FR20, FR21, FR56]
---

# Phase 2 Plan 10: Production probe and quality gates Summary

**The finished shorts routes are proven against a built production server (next build with Strapi down, next start against the stub): 74 checks, `PROBE PASS (74 checks)`, zero requests rejected by the stub's strict query validation, and every automated gate is green.**

## Performance

- **Tasks:** 2 (Task 1 changed code; Task 2 ran gates and exposed no defect, so it changed no source)
- **Commits:** 2 task commits (`b2e0a77`, `31ab481`) plus the docs commit
- **Files modified:** 2

## Accomplishments

- **Probe extended without touching the detail matrix.** The stub now serves 30 films by default (`STUB_FILMS` is the total, 2 fixture films plus 28 generated), so `/shorts` has 24 films on page 1 and 6 on page 2. Note: the plan mentions a `--detail-only` flag but `probe.mjs` never implemented one (only `--skip-build` exists); nothing was changed for it.
- **Directory** in fr, ar and en: 200, first film title in the HTML, 24 distinct `/shorts/probe-*` anchors (real links before JavaScript), 24 heart buttons before JavaScript (card `watchlistAdd` template matched), the Load more label, `<html dir="rtl">` only in Arabic, `noindex, nofollow` on the directory and on the detail, no empty-catalogue copy while films exist.
- **Outage and recovery on the directory.** With the stub down and no `/fr` list entry in the Data Cache, `/fr/shorts` answers 200 (D-20, streamed inside the loading boundary), the response contains no film title and no "Le catalogue ouvre bientôt" copy (scripts stripped for the copy check), the stream carries the error marker rather than not-found, and the hydrated DOM (headless Chrome, `--accept-lang=fr`) shows the error headline, the retry label and `role="alert"`, with no films and no empty copy. Back to ok: the very next request shows 24 links, no 60 second wait.
- **Load-more route:** page 1 (24 films, hasMore true, total 30), page 2 (6 films, pageSize 24, hasMore false), 400 for an unknown key, a caller-chosen pageSize, page 0, 501, abc, locale de and a missing locale, 502 (no `shorts` key) on an outage and on a 429, 200 again on the next request.
- **Accept-Language:** unprefixed `/shorts` with `Accept-Language: fr` stays on the French page (200, no redirect); with `en` it answers 307 to `/en/shorts` (INFO, locale negotiation).
- **Hygiene:** `/__hits` reports `rejected: 0`, so no phantom query key reached Strapi from the pages or the route handler (SPAGE-02), and the pattern-failing slug produced zero upstream requests.

## Probe result (real output, final run)

`node apps/client/scripts/shorts-probe/probe.mjs` exit 0, last line `PROBE PASS (74 checks)`. Chrome was installed, so every hydrated-DOM assertion ran (none skipped).

| Step                                           | Observed                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build with Strapi unreachable                  | PASS, exit 0                                                                                                                                     |
| `/[locale]/shorts/[slug]` in the route table   | `ƒ` (dynamic), absent from the prerender manifest. `/[locale]/shorts` is `ƒ` too (asserted by the second commit; the page awaits `connection()`) |
| Detail known slug fr, ar, en                   | 200, title of that locale found                                                                                                                  |
| Sparse film (ar)                               | 200                                                                                                                                              |
| Unknown slug fr, ar, en                        | HTTP 200 (INFO, D-22), noindex + not-found state, hydrated "introuvable" block in the page locale, no alert                                      |
| Pattern-failing slug                           | not-found state, 0 upstream requests                                                                                                             |
| Detail outage, 429, non-JSON 200, 10 s timeout | HTTP 200 (INFO), noindex + error state, hydrated error block with `role="alert"` in fr, ar, en                                                   |
| Detail recovery                                | next request renders the film (failure not cached)                                                                                               |
| Directory fr, ar, en                           | 200, 24 links, 24 hearts, Load more, noindex + nofollow, rtl only in ar                                                                          |
| Directory outage (fresh cache key)             | HTTP 200 (matches D-20, no deviation), no film title, no empty-catalogue copy, error state, hydrated retry block                                 |
| Directory recovery                             | 200 + 24 links on the very next request                                                                                                          |
| Detail fr robots                               | `noindex, nofollow`                                                                                                                              |
| Unprefixed `/shorts`, Accept-Language fr       | 200, no redirect                                                                                                                                 |
| Unprefixed `/shorts`, Accept-Language en       | 307 to `/en/shorts` (INFO)                                                                                                                       |
| `GET /api/shorts` page 1 / page 2              | 200, 24 films hasMore true total 30 / 200, 6 films pageSize 24 hasMore false                                                                     |
| `GET /api/shorts` bad input (7 cases)          | 400 each                                                                                                                                         |
| `GET /api/shorts` outage / 429                 | 502 each, no `shorts` key                                                                                                                        |
| `GET /api/shorts` recovery                     | 200                                                                                                                                              |
| Stub rejected-request counter                  | 0                                                                                                                                                |

A first run of the extended probe failed 3 checks (`directory ... 24 watchlist hearts ... got 0`); the probe asserted the wrong aria-label key (`shorts.watchlistAdd`, which carries no title) while the card heart uses `shorts.card.watchlistAdd` with the title. The assertion was corrected; no product code changed.

## Quality gates (real output)

| Gate                                                                                                                                                 | Result                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node apps/client/scripts/shorts-probe/probe.mjs`                                                                                                    | exit 0, `PROBE PASS (74 checks)`                                                                                                                                                 |
| `yarn workspace @tiween/client eslint scripts/shorts-probe --max-warnings=0`                                                                         | exit 0                                                                                                                                                                           |
| `yarn workspace @tiween/client vitest run`                                                                                                           | exit 0, `Test Files 138 passed (138)`, `Tests 1767 passed (1767)`                                                                                                                |
| `yarn workspace @tiween/client type-check`                                                                                                           | exit 0, "Types generated successfully", 0 `error TS` lines                                                                                                                       |
| `npx tsc --noEmit` (apps/client)                                                                                                                     | exit 0, 0 `error TS` lines                                                                                                                                                       |
| `yarn workspace @tiween/client lint` (`eslint . --max-warnings=0`)                                                                                   | exit 0, no warning or error lines                                                                                                                                                |
| `yarn workspace @tiween/admin eslint src/plugins/user-engagement --max-warnings=0`                                                                   | exit 0                                                                                                                                                                           |
| `yarn workspace @tiween/admin jest src/plugins/user-engagement`                                                                                      | exit 0, `Test Suites: 4 passed`, `Tests: 88 passed`                                                                                                                              |
| `yarn workspace @tiween/admin build:test-dist`                                                                                                       | exit 0 (checked first)                                                                                                                                                           |
| Booted suites, `IMAGEKIT_* =` empty, `--runInBand`: `watchlist-payload.service.test.ts` and `short-films.service.test.ts` (Phase 1 regression guard) | exit 0, `Test Suites: 2 passed`, `Tests: 78 passed`, no "STALE" line, nothing skipped                                                                                            |
| Repo hygiene: tickets paths since the pre-plan-01 SHA (`b5420fe`)                                                                                    | no files listed (untouched)                                                                                                                                                      |
| Repo hygiene: `apps/strapi/src/api` since `b5420fe`                                                                                                  | no files listed (untouched)                                                                                                                                                      |
| Mock isolation                                                                                                                                       | `mock-isolation.test.ts` and `rendering-rules.test.ts` pass inside the full client run; the only `mock-shorts` references in `src` are the data barrel and those two guard tests |

## Task Commits

1. **Task 1: probe extended to directory, load-more, outage and recovery** - `b2e0a77` (test); `31ab481` (test) adds the missing `/[locale]/shorts` route-table assertion (the first run only asserted `[slug]`) and the final 74-check run passed after it
2. **Task 2: gates and manual list** - no source change (nothing in a gate failed); results are in this SUMMARY.

## Deviations from Plan

None - plan executed as written. Notes, not deviations:

- The directory-outage status is 200, as D-20 expects; nothing to record against it.
- Per D-22 (owner-accepted, 2026-11-10) unknown-slug and detail-outage statuses stay INFO at 200 with the rendered state asserted; the real 404/500 is Phase 5 criterion 5.
- SPAGE-01 wording says an unknown slug "returns 404": at the HTTP layer it is the accepted soft 404 above, so that clause is delivered as a rendered not-found state, not a status code.

### Out-of-scope observation

`git status` shows two working-tree edits in `apps/client/src/features/watchlist/hooks/useShortFilmHeart.ts` and `.test.tsx` that this plan did not make (they are formatting-only: an import moved and a boolean expression re-wrapped; they appeared during the run, not in the initial git status). They were not staged or committed and every gate above was green with them present. The owner should decide whether to keep or discard them.

## Known Stubs

None. `stub-strapi.mjs` is verification tooling with fictional fixtures, not shipped code.

## Threat Flags

None. The probe and stub bind 127.0.0.1, read no secret file, use placeholder env values inline, and `killAll()` runs in the finally path (T-02-24, T-02-25). No process was left listening on 3999, 4010 or 4020 after the run. No package installed (T-02-SC).

## Draft Arabic strings for the owner review (Phase 6)

All shorts Arabic copy is AI-drafted from the UI-SPEC and needs the owner's review before launch. Namespaces to review in `apps/client/locales/ar.json`:

- `shorts.crew.*` (department headings and role names) and `shorts.access.*` (`free` مجاني, `included` مشمول, `subscription` باشتراك, `rental` للإيجار; `included` is a placeholder pending UI-SPEC open question 2)
- `shorts.directory.*` (title, description, `loadMore` عرض المزيد, `loadMoreError`, `errorTitle` الكتالوج لا يستجيب, `retry` أعد المحاولة, `catalogEmptyTitle`, `catalogEmptyBody`, `suggestPrompt`)
- `shorts.detail.*` (`errorTitle`, `notFoundTitle`, `browseAll`, `loading`) and `errors.SHORT_FILM_NOT_FOUND`
- `shorts.card.watchlistAdd|watchlistRemove`, `shorts.watchlistAdd|watchlistRemove`, `shorts.originalTitle`, `countryLabel`, `languageLabel`, `languageNames.*` (including `ber`)

## Deferred items

- Future API `fallbackFields` for exact per-field French-fallback provenance (RESEARCH Open Question 2; today an English page detects fallback by served locale only).
- Watchlist locale overlay for D-18 (watchlist titles are served in the default locale).
- Person photos (the crew grid shows initials discs only).
- On-demand revalidation webhook (cache tags `short-films` and `short-film:<slug>` are already in place; today the 60 s window applies).
- Short-film posters on the watchlist (needs `poster` in `getUserWatchlist` fields plus an allowlist assertion; logged in `deferred-items.md`).
- `CategoryTabs` `aria-controls` pointing at a missing tabpanel (pre-existing, `deferred-items.md`).
- `ShortsWatchlistProvider` issues its list request for an empty catalogue when signed in (harmless).
- Probe gaps: a signed-out heart click to `/auth/signin?callbackUrl=...` and the signed-in network-count check (exactly one watchlist list request on `/shorts`, one check request on a detail) need a NextAuth session and a browser click driver; they are in the manual list below.

## Owner manual checks

These are NOT ticked. jsdom cannot perform them. Use the real catalogue (13 imported films) if available, otherwise `node apps/client/scripts/shorts-probe/stub-strapi.mjs` plus `next build && next start` (set `STRAPI_URL=http://127.0.0.1:4010`). Record each result against `/gsd-verify-work`.

- [ ] **1. Contrast (WCAG AA), 390px.** Check the Gold Leaf saved-heart glyph over the stripe artwork and over a light real poster (at least 3:1 non-text); crew initials on Surface Raised `#3E2A48` (at least 4.5:1, spec 12.9:1); muted `#B0A6B8` metadata, department headings, crew role and the access sub-label on the page field `#241326` and on Surface `#31203A` (at least 4.5:1, spec 6.3:1 or better); muted original-title and origin lines over the worst-case bright backdrop scrim; the white outline heart glyph on the 80% Aubergine Deep disc over a light poster (spec predicts 4.2:1 filled gold, 9.7:1 white). Expected: all meet the UI-SPEC Color figures. If a real poster breaks the heart disc, darken the disc scrim stop, not the glyph. Record the disc stroke `#4A3556` value.
- [ ] **2. RTL.** Open `/ar/shorts` and `/ar/shorts/<slug>` at 390px. Expected: the heart at the top-left of the poster, the first card top-right, the crew grid filling right to left with the disc at the right of its text, Western digits, a French fallback block inside an Arabic page left-aligned, no horizontal scroll at 320px and at 200% zoom.
- [ ] **3. Offline queue replay.** Signed in, go offline (browser offline toggle or a real device), tap a heart. Expected: the heart fills and the toast says it will sync once online; reconnect, then confirm the film appears on `/watchlist` and the heart is still filled.
- [ ] **4. Revalidation window.** Production build and start (not dev): edit a film's title in the Strapi admin, wait more than 60 seconds, load the detail twice. Expected: the second load shows the change (stale-while-revalidate serves the old title once).
- [ ] **5. Sign-in return path.** Signed out, tap a heart on `/ar/shorts/<slug>`, on `/en/shorts/<slug>` and on a French `/shorts/<slug>` page, then sign in. Expected: you land back on the same page in the same locale (no doubled locale prefix), with the heart unsaved. Also tap a heart on the `/shorts` directory and confirm the toast then `/auth/signin?callbackUrl=%2Fshorts`.
- [ ] **6. Keyboard and focus.** Tab through a directory card (link, then heart). Activate the heart with Enter and with Space. Stop the stub, trigger the error block, press Retry (fails), restart the stub, press Retry again. Expected: a visible 3px gold focus ring (including the corner of the 44px heart target, which must not be clipped by the card frame), no navigation on heart activation, focus on the h1 after a successful retry and staying on the button after a failed one.
- [ ] **7. In-app browser.** Open a detail link inside the Instagram in-app browser. Expected: the page hydrates; note whether the pre-hydration blank shell on layout-level failures (RESEARCH assumption A7) is acceptable.
- [ ] **8. Signed-in network counts (from the Plan 09 handoff).** Signed in, open DevTools Network on `/shorts`: exactly one `.../user-engagement/watchlist` request and no `/watchlist/check/` requests; on a detail page exactly one check request. Also confirm the 200 ms spinner on a slow connection and the pulse on a real signed-in save.

## Self-Check: PASSED

- FOUND: `apps/client/scripts/shorts-probe/probe.mjs`, `apps/client/scripts/shorts-probe/stub-strapi.mjs`
- FOUND commit `b2e0a77` (ancestor of HEAD); `git rev-list --count 1922758..HEAD` = 2 at SUMMARY time (before this docs commit); `31ab481` also an ancestor
