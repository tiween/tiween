---
phase: "1"
slug: "short-film-catalog-backend"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-18"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property                   | Value                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**              | Jest 29, two projects: `server` (ts-jest, node) and `admin` (jsdom, testing-library)                                                                                                     |
| **Config file**            | `apps/strapi/jest.config.cjs`                                                                                                                                                            |
| **Boot harness**           | `apps/strapi/tests/helpers/strapi.ts` (`setupStrapi`/`cleanupStrapi`), `tests/helpers/test-dist.ts`, `tests/helpers/admin.ts` (`createAdminSession`); SQLite `.tmp/test.db`, no Postgres |
| **Quick run command**      | `yarn workspace @tiween/admin jest <path>`                                                                                                                                               |
| **Full suite command**     | `yarn workspace @tiween/admin test && yarn workspace @tiween/admin lint`                                                                                                                 |
| **Boot suites (CI skips)** | `yarn workspace @tiween/admin test:integration`                                                                                                                                          |
| **Estimated runtime**      | unit ~30 s; boot ~20 s per suite file                                                                                                                                                    |

---

## Sampling Rate

- **After every task commit:** Run the relevant `yarn workspace @tiween/admin jest <file>`
- **After every plan wave:** Run `yarn workspace @tiween/admin test` + `lint`; after server waves also `test:integration`
- **Before `/gsd-verify-work`:** `test:integration` green with output captured, `test` green, `lint` green, manual admin UAT recorded
- **Max feedback latency:** 60 seconds (unit), boot suites per wave
- **Kernel rule:** never mark a task verified when its boot command could not execute

---

## Per-Task Verification Map

Filled by the planner/executor per task. Requirement-to-test map from research:

| Requirement | Behavior                                                                                                                                      | Test Type            | Automated Command                                                                                                | File Exists | Status     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| SDATA-01    | Schema attributes, non-localized flags, additive, `collectionName` preserved, component enums                                                 | unit                 | `yarn workspace @tiween/admin jest src/plugins/creative-works --testPathPattern schema`                          | ❌ W0       | ⬜ pending |
| SDATA-01    | Country/language Zod (ISO codes, curated language list, `none`)                                                                               | unit                 | `yarn workspace @tiween/admin jest src/shared/short-film-rules.unit.test.ts`                                     | ❌ W0       | ⬜ pending |
| SDATA-01    | Round trip of new fields through Document Service                                                                                             | boot                 | `yarn workspace @tiween/admin test:integration` (`short-films.service.test.ts`)                                  | ❌ W0       | ⬜ pending |
| SDATA-02    | Publish rules evaluator (poster, director, watch source, slug; >40 min warns)                                                                 | unit                 | `yarn workspace @tiween/admin jest src/shared/short-film-rules.unit.test.ts`                                     | ❌ W0       | ⬜ pending |
| SDATA-02    | Server guard blocks content-manager publish (single, bulk, `status:'published'` create), allows drafts                                        | boot                 | `yarn workspace @tiween/admin test:integration`                                                                  | ❌ W0       | ⬜ pending |
| SDATA-02    | WorkForm payload/form-values round trip for new fields; `WORK_POPULATE` gains `streamingLinks`                                                | unit                 | `yarn workspace @tiween/admin jest src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts` | ✅ extend   | ⬜ pending |
| SDATA-02    | Streaming-links editor, short-film-only sections, pinned TN/aeb, locale tabs, publish bar                                                     | admin jsdom          | `yarn workspace @tiween/admin jest --selectProjects admin src/plugins/events-manager/admin`                      | ❌ W0       | ⬜ pending |
| SDATA-03    | Published-only list, genre filter, 8 sorts, pagination (max 48), featured order, detail 200/404, related, locale fallback, no internal fields | boot                 | `yarn workspace @tiween/admin test:integration`                                                                  | ❌ W0       | ⬜ pending |
| SDATA-03    | Unknown/invalid params → 400 `VALIDATION_FAILED`, never 500                                                                                   | unit + boot          | `yarn workspace @tiween/admin jest src/plugins/creative-works`                                                   | ❌ W0       | ⬜ pending |
| SDATA-03    | D-09 routes removed (404); `/persons/search` and facade `searchWorks` intact                                                                  | boot + unit          | `yarn workspace @tiween/admin jest src/plugins/creative-works`                                                   | partial     | ⬜ pending |
| SDATA-04    | Pure import mapping (schema keys, ISO mapping, Western digits)                                                                                | unit                 | `yarn workspace @tiween/admin jest scripts/seeds/utils/short-film-import.unit.test.ts`                           | ❌ W0       | ⬜ pending |
| SDATA-04    | Import run twice: counts and `publishedAt` unchanged                                                                                          | boot                 | `yarn workspace @tiween/admin test:integration` (`short-film-import.service.test.ts`)                            | ❌ W0       | ⬜ pending |
| SDATA-05    | Boot suite itself, incl. non-short fixture                                                                                                    | boot                 | `yarn workspace @tiween/admin test:integration`                                                                  | ❌ W0       | ⬜ pending |
| FR57        | Media payload uses real upload ids; `photos` multi                                                                                            | admin jsdom + manual | `yarn workspace @tiween/admin jest --selectProjects admin MediaInput`                                            | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `yarn install --frozen-lockfile`, then prove an existing boot suite passes (`tests/app.test.js`, `venue-admin-crud.service.test.ts`) and record output
- [ ] Spike answering research assumptions A1, A2, A3, A5 (middleware sees content-manager publish; republish `publishedAt`; `?locale=` PUT create; nested credits filter)
- [ ] `apps/strapi/tests/fixtures/short-films.ts` — published/draft shorts, published non-short work, genres, persons, credit-roles, AR/EN rows, controllable `publishedAt`
- [ ] `en` locale created in test setup (and the bootstrap fix)
- [ ] `tests/__mocks__/strapi-admin.ts` gains `useStrapiApp`
- [ ] New unit files listed in the map above

---

## Manual-Only Verifications

| Behavior                                                                                                                          | Requirement    | Why Manual                                  | Test Instructions                                                        |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Works pages routed and reachable; media-library picker returns real ids; FR/AR/EN entry, publish, edit, unpublish in a real admin | SDATA-02, FR57 | No E2E suite (kernel forbids inventing one) | Admin UAT checklist in the plan                                          |
| Real ImageKit upload + Postgres import run                                                                                        | SDATA-04, FR57 | Needs credentials                           | `yarn workspace @tiween/admin seed:shorts` on dev/staging, record output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
