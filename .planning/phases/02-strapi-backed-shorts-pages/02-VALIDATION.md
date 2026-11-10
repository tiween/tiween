---
phase: "2"
slug: "strapi-backed-shorts-pages"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-10"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property               | Value                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | Vitest 2.1.9 + jsdom + @testing-library/react (client); Jest (Strapi boot, optional)                                 |
| **Config file**        | `apps/client/vitest.config.ts` (explicit `include` globs — new dirs must be added in Wave 0)                         |
| **Quick run command**  | `cd apps/client && yarn vitest run src/lib/strapi-api src/features/shorts src/features/watchlist src/app/api/shorts` |
| **Full suite command** | `cd apps/client && yarn test && yarn lint && npx tsc --noEmit`                                                       |
| **Estimated runtime**  | ~90 seconds (full); ~20 seconds (quick)                                                                              |

---

## Sampling Rate

- **After every task commit:** quick command scoped to the touched directory
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green + scripted production probe (build with Strapi unreachable, then `next start` against the stub Strapi)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

Filled by the planner per task (each task carries an `<automated>` verify). Requirement → test map:

| Requirement | Behavior                                                                                                      | Test Type             | Automated Command                                                                                               | File Exists     | Status     |
| ----------- | ------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- | --------------- | ---------- |
| SPAGE-01    | Pages read the fetcher; unknown slug → `notFound()`; no production import of mock data                        | unit/route + guard    | `yarn vitest run src/app/[locale]/shorts src/features/shorts/data`                                              | ❌ W0           | ⬜ pending |
| SPAGE-01    | Real HTTP 404 unknown / 200 known; build passes with Strapi down                                              | build probe           | scripted probe (Wave 0)                                                                                         | ❌ W0           | ⬜ pending |
| SPAGE-02    | credits→directors/crew, videos→trailer, access types, sparse data                                             | unit                  | `yarn vitest run src/features/shorts/utils`                                                                     | ❌ W0           | ⬜ pending |
| SPAGE-02    | Query string only `locale/page/pageSize/sort`; typed errors 400/404/429/5xx/timeout/non-JSON                  | unit                  | `yarn vitest run src/lib/strapi-api/content/shorts.test.ts`                                                     | ❌ W0           | ⬜ pending |
| SPAGE-03    | Crew grouping/billing/humanized slug/customRole; access sub-label + label                                     | component             | `yarn vitest run src/features/shorts/components/ShortFilmDetail`                                                | extend          | ⬜ pending |
| SPAGE-04    | Original title (only if differs), origin line, `aeb`/`ber`/`none`                                             | unit + component      | `yarn vitest run src/features/shorts/utils`                                                                     | ❌ W0           | ⬜ pending |
| SPAGE-05    | Error blocks, retry = `router.refresh` + `reset`, never empty-state on error; load-more 400/502               | component + route     | `yarn vitest run src/app/[locale]/shorts src/app/api/shorts src/features/shorts/components/ShortsDirectory`     | ❌ W0 / rewrite | ⬜ pending |
| FR19        | Signed-out toast + safe redirect; heart sibling of link; optimistic add + rollback; one list request per grid | hook + component      | `yarn vitest run src/features/events/hooks src/features/shorts/components/ShortFilmCard src/features/watchlist` | extend / ❌ W0  | ⬜ pending |
| FR20        | Optimistic remove, undo re-add, offline queue                                                                 | hook                  | `yarn vitest run src/features/events/hooks`                                                                     | extend          | ⬜ pending |
| FR21        | Short-film entry links to `/shorts/<slug>`, type label, sorts after dated events                              | component             | `yarn vitest run src/app/[locale]/watchlist`                                                                    | extend          | ⬜ pending |
| FR56        | `lang="fr"`/`dir="ltr"` on fallback nodes; title never blank                                                  | component             | `yarn vitest run src/features/shorts/components`                                                                | extend          | ⬜ pending |
| D-17        | Tickets tab hidden by default in BottomNav and DesktopNav; shown when flag on                                 | component + flag unit | `yarn vitest run src/components/layout src/lib/feature-flags`                                                   | extend          | ⬜ pending |
| Security    | `safeCallbackUrl` rejects `//x`, `/\x`, absolute URLs, `javascript:`, control chars; all auth forms use it    | unit + form           | `yarn vitest run src/lib src/app/[locale]/auth`                                                                 | ❌ W0           | ⬜ pending |
| a11y        | axe-core clean at 390px fr/ar/en on directory, detail, watchlist states                                       | component + axe       | `yarn vitest run src/features/shorts src/app/[locale]/shorts`                                                   | ❌ W0           | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` `include`: add `src/features/shorts/**/*.test.{ts,tsx}`, `src/features/watchlist/**/*.test.{ts,tsx}`, `src/lib/safe-callback-url.test.ts`, `src/app/**/shorts/**/*.test.{ts,tsx}`
- [ ] Stub Strapi (small Node http server) with ok / 404 / 500 / 429 / slow modes, for the production probe and manual UAT
- [ ] Production probe script (build with unreachable `STRAPI_URL` → success; `next start` vs stub: 200 / 404 / 500 / recovery / load-more 502)
- [ ] `axe-core` devDependency + shared `expectNoA11yViolations(container)` helper
- [ ] shadcn `empty` from the official registry (no `avatar` — D-21)
- [ ] fr/ar/en keys for every UI-SPEC copy key (+ `languageNames.ber`)

---

## Manual-Only Verifications

| Behavior                        | Requirement | Why Manual                                    | Test Instructions                                                              |
| ------------------------------- | ----------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| Colour contrast on new surfaces | a11y        | jsdom cannot compute contrast                 | Check heart disc, access sub-label, crew text against DESIGN.md ratios         |
| RTL visual check                | FR56        | Visual                                        | `/ar/shorts` and `/ar/shorts/<slug>` at 390px; mirrors cleanly, Western digits |
| Offline queue replay            | FR19/FR20   | Needs a real device/network toggle            | Save offline, reconnect, confirm the save syncs                                |
| Revalidation window             | SPAGE-01    | Stale-while-revalidate; only `build && start` | Edit a film in admin, wait >60s, load twice; second load shows the change      |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
