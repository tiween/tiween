---
title: "DW-17: run the Strapi admin .tsx component tests under a jsdom jest project"
type: "chore"
created: "2026-08-03"
status: "done"
baseline_revision: "f2b4b46131f8924a41d4030c1d4071cabcb17119"
final_revision: "de42252"
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `apps/strapi/jest.config.cjs` is a single node-environment config whose `testMatch` is `**/*.unit.test.ts`, so the four admin component tests (`VenueCard`, `MovieCard`, `EventCreationModal`, `ImportTab` under `src/plugins/events-manager/admin/src/components/__tests__/`) never execute — they are dead weight that CI reports as green.

**Approach:** Convert `jest.config.cjs` into a two-project config: the existing `server` project unchanged, plus a new `admin` project running `*.test.tsx` in `jsdom` with the already-committed `tests/setup-jsdom.ts` and `tests/__mocks__/` scaffolding, then fix the small number of assertions in those suites that are actually wrong so the new gate is green.

## Boundaries & Constraints

**Always:** Keep the `server` project's behaviour byte-for-byte equivalent (same `testMatch`, `testEnvironment`, transform, ignore patterns) so the existing unit gate cannot regress. Keep `yarn test` (plain `jest`) as the single command that runs both projects. Keep test-file edits minimal and justified by an inline comment.

**Block If:** Making a suite green would require changing production component source under `admin/src/components/` (rather than test/config code), or would require adding/removing a runtime dependency in `apps/strapi/package.json`.

**Never:** Do not touch the deferred-work ledger. Do not relax the `server` project. Do not add new `.tsx` test files or new components. Do not change the root `resolutions` pinning React 19. Do not delete or weaken assertions to force a pass — only correct assertions that are provably wrong.

## I/O & Edge-Case Matrix

| Scenario            | Input / State                                                    | Expected Output / Behavior                                                                                              | Error Handling                                                                                       |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Default run         | `yarn test` in `apps/strapi`                                     | Both `server` and `admin` projects run; 4 `.tsx` suites execute and pass alongside the existing `*.unit.test.ts` suites | Non-zero exit on any failure                                                                         |
| Compiled duplicates | `dist/` contains a previously compiled copy of `tests/__mocks__` | jest-haste-map raises no "duplicate manual mock" warning                                                                | `modulePathIgnorePatterns` excludes `<rootDir>/dist/`                                                |
| Admin shell import  | A test does `jest.requireActual("@strapi/strapi/admin")`         | Resolves to `tests/__mocks__/strapi-admin.ts`, not the real admin bundle                                                | Avoids `SyntaxError: Unexpected token 'export'` from the untransformed ESM dep `fractional-indexing` |
| Style import        | A component imports a `.css`/`.scss`/`.less` file                | Resolves to `tests/__mocks__/style-mock.ts`                                                                             | No parse error                                                                                       |
| Server suites       | `*.unit.test.ts` files                                           | Run in `node` env exactly as before                                                                                     | Unchanged                                                                                            |

</intent-contract>

## Code Map

- `apps/strapi/jest.config.cjs` -- single-project config to convert into `projects: [server, admin]`; the only structural change.
- `apps/strapi/tests/setup-jsdom.ts` -- already committed; loads `@testing-library/jest-dom` matchers. Wire as the admin project's `setupFilesAfterEnv`.
- `apps/strapi/tests/__mocks__/strapi-admin.ts` -- already committed stand-in for `@strapi/strapi/admin` hooks. Wire via `moduleNameMapper`.
- `apps/strapi/tests/__mocks__/style-mock.ts` -- already committed CSS stub. Wire via `moduleNameMapper`.
- `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/EventCreationModal.test.tsx` -- the only suite needing assertion fixes (see Design Notes).
- `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/{VenueCard,MovieCard,ImportTab}.test.tsx` -- pass unmodified once the admin project exists.
- `apps/strapi/tsconfig.json` -- excludes `src/plugins/**/admin/**` and has no `jsx` setting, so the admin project must supply an inline `tsconfig` to `ts-jest`.
- `apps/strapi/package.json` -- `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`, `jsdom` are already devDependencies; no dependency change expected.
- `.github/workflows/ci.yml` -- the `test` job runs `yarn test`; it picks the new project up with no workflow change.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/jest.config.cjs` -- restructure into `module.exports = { projects: [serverProject, adminProject] }`, moving the current options verbatim into `serverProject` and adding `adminProject` (`displayName: "admin"`, `testEnvironment: "jsdom"`, `testMatch: ["**/*.test.tsx"]`, `setupFilesAfterEnv`, `moduleNameMapper`, `modulePathIgnorePatterns: ["<rootDir>/dist/"]`, `ts-jest` transform with an inline `tsconfig` supplying `jsx: "react-jsx"` and a DOM lib) -- so `.tsx` tests match a real environment while the node unit gate is untouched. Update the file header comment to describe both projects.
- [x] `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/EventCreationModal.test.tsx` -- stub `../ContentSearchPanel`, disambiguate the duplicated `"Create Event"` text by role, and replace the `toBeEmptyDOMElement()` closed-modal assertion -- so the suite asserts the modal shell correctly under React 19 + `DesignSystemProvider`.

**Acceptance Criteria:**

- Given the repo at `apps/strapi`, when `yarn test` runs, then both a `server` and an `admin` project appear in the output and the process exits 0.
- Given the `server` project, when `yarn test` runs, then exactly the same `*.unit.test.ts` suites run as before this change, with the same pass count.
- Given `apps/strapi/dist/` contains stale compiled test mocks, when `yarn test` runs, then no `jest-haste-map: duplicate manual mock` warning is emitted.
- Given `yarn type-check` in `apps/strapi`, when it runs, then it reports exactly the same errors as the pre-change baseline — i.e. this change introduces none (the admin tests remain excluded from the server tsconfig). Baseline is not clean: three pre-existing `TS2339` errors in `src/plugins/user-engagement/server/src/services/watchlist.ts:103-105`, verified identical with and without this change. Fixing them would mean editing production source, which the Block If clause forbids for this spec.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 2, low 3)
- defer: 8: (high 1, medium 4, low 3)
- reject: 5: (high 0, medium 1, low 4)
- addressed_findings:
  - `[medium]` `[patch]` A CLI `--testMatch` now applies to _both_ projects, so the documented way to run the opt-in boot suites would execute them twice against one DB (empirically confirmed: `--testMatch='**/website-url.unit.test.ts'` produced a PASS line under each project). Amended the `jest.config.cjs` header to require `--selectProjects server` alongside `--testMatch`.
  - `[medium]` `[patch]` `EventCreationModal.test.tsx`'s inline `jest.mock("@strapi/strapi/admin", ...)` shadowed the project-wide mapped mock and exposed only `useFetchClient`, so any hook the component later adopts would be `undefined`. Now spreads `jest.requireActual` (which the mapper routes to `tests/__mocks__/strapi-admin.ts`) before overriding.
  - `[low]` `[patch]` The `isOpen=false` test's replacement assertions could not distinguish "nothing rendered" from "backdrop/focus-trap leaked". Added `expect(screen.queryByRole("dialog")).not.toBeInTheDocument()` as the first assertion and dropped the assertion that duplicated the heading check.
  - `[low]` `[patch]` `MovieCard.test.tsx` header referenced `jest.config.ts`; corrected to `jest.config.cjs` (the config file's own header explains why it is `.cjs`).
  - `[low]` `[patch]` The new `admin` project copied ts-jest's deprecated top-level `isolatedModules` option, emitting a removal warning on every run. Moved it into the inline `tsconfig`. Verified: `--selectProjects admin` now emits zero such warnings; the `server` project's remaining warnings are pre-existing and left untouched to keep that gate verbatim.

## Design Notes

`tests/setup-jsdom.ts` and `tests/__mocks__/` were landed by commit `a50a733` but never wired to a jest project — this spec finishes that work rather than inventing new scaffolding.

Three findings drive the non-obvious parts of the config, each verified by running a throwaway config against the real suites:

1. `jest.requireActual("@strapi/strapi/admin")` in `ImportTab.test.tsx` drags in the whole admin bundle, which reaches the ESM-only `fractional-indexing` and dies with `SyntaxError: Unexpected token 'export'`. Mapping the specifier to `tests/__mocks__/strapi-admin.ts` (rather than widening `transformIgnorePatterns`) fixes it, and is exactly what that mock file was written for.
2. `apps/strapi/dist/` holds compiled copies of the mock files, which jest-haste-map flags as duplicate manual mocks. `modulePathIgnorePatterns: ["<rootDir>/dist/"]` is required; `testPathIgnorePatterns` alone does not suppress it.
3. The repo's root `resolutions` pin `react`/`react-dom` to 19, while `@strapi/ui-primitives` still ships `@radix-ui/react-compose-refs@1.0.1`. `ContentSearchPanel` hits the resulting ref-reattach loop and blows the React update-depth limit in jsdom. Stubbing that one child keeps `EventCreationModal`'s own suite meaningful without papering over a production issue — the underlying React 19 / design-system mismatch is pre-existing and out of scope here.

Implementation note: `modulePathIgnorePatterns: ["<rootDir>/dist/"]` had to be added to the **server** project too, not just `admin`. The duplicate-manual-mock warning originates from the server project's haste map (reproduced with `--selectProjects server` / `--selectProjects admin` in isolation) and is pre-existing on the baseline. It is behaviour-neutral for the gate — server counts stay at 42 suites / 529 tests, and `dist/` was already excluded from test discovery.

The other two `EventCreationModal` assertions are simply wrong, independent of environment: `"Create Event"` is both the modal title and the submit button label (so `getByText` finds two nodes), and `DesignSystemProvider` renders `aria-live` regions into the render container (so `toBeEmptyDOMElement()` can never hold).

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: exit 0; output shows both `server` and `admin` projects; the four `.tsx` suites listed as PASS; no `duplicate manual mock` warning.
- `cd apps/strapi && npx jest --selectProjects server` -- expected: exit 0 with the same suite/test counts as `git stash`-ed baseline.
- `cd apps/strapi && yarn type-check` -- expected: no errors beyond the three pre-existing `watchlist.ts` ones.
- `yarn lint` (repo root) -- expected: exit 0.

## Auto Run Result

Status: done
Blocking condition: none

### Summary

`apps/strapi/jest.config.cjs` is now a two-project config. The `server` project keeps the node/unit gate exactly as it was; a new `admin` project runs `*.test.tsx` in jsdom, wiring the `tests/setup-jsdom.ts` and `tests/__mocks__/` scaffolding that commit `a50a733` landed but never connected. The four admin component suites (`VenueCard`, `MovieCard`, `EventCreationModal`, `ImportTab`) execute for the first time — 4 suites / 32 tests — and `yarn test` in `apps/strapi` goes from 42/529 to 46/561. No dependency, lockfile, CI-workflow, or production-component change was needed.

### Files changed

- `apps/strapi/jest.config.cjs` — split into `projects: [serverProject, adminProject]`; header rewritten to document both projects, the `--selectProjects` requirement for CLI `--testMatch` overrides, and why `modulePathIgnorePatterns` / each `moduleNameMapper` entry exists.
- `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/EventCreationModal.test.tsx` — stubbed `../ContentSearchPanel` (React 19 ref-reattach loop), spread the mapped `@strapi/strapi/admin` mock, disambiguated the duplicated `"Create Event"` text by role, and replaced the unsatisfiable `toBeEmptyDOMElement()` assertion with dialog/heading/subtitle absence checks.
- `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/MovieCard.test.tsx` — one stale comment reference (`jest.config.ts` → `jest.config.cjs`).

### Review findings breakdown

5 patches applied (see Review Triage Log), 8 items deferred, 5 rejected as noise. No `intent_gap` and no `bad_spec` — one review pass, no loopback.

### Deferred findings — for the orchestrator to add to the ledger

This run was instructed not to edit `deferred-work.md`; these are recorded here for the orchestrator to file.

1. `[high]` React 19 vs Strapi design-system peer mismatch is a suspected **production** defect, not just a test artifact. Root `package.json` `resolutions` pin `react`/`react-dom` to 19.2.3, while `@strapi/design-system@2.0.1` declares `peerDependencies: react "^17 || ^18"` and `apps/strapi/package.json` itself still declares `react: "^18.0.0"`. `@strapi/ui-primitives` ships `@radix-ui/react-compose-refs@1.0.1`, whose ref-reattach behaviour loops under React 19 — `ContentSearchPanel` blows React's max update depth in jsdom, and the admin panel runs the same React 19 in the browser. Needs a real browser check of the venue-planning event-creation flow.
2. `[medium]` `EventCreationModal`'s suite is shell-only. With `ContentSearchPanel` stubbed, `selectedMovie` is permanently `null`, so `handleMovieSelect`, `isFormValid`, `handleSubmit`, and the two sequential event→showtime POSTs have zero coverage; the `DatePicker`/`TimePicker` stubs in the test are dead code for the same reason. Fix by making the stub controllable (a button that calls `onMovieSelect(fixture)`).
3. `[medium]` Nothing asserts the `admin` project collected any suites. Jest evaluates `passWithNoTests` across the aggregated multi-project run, so a project matching zero files exits 0 silently — reproduced by pointing `adminProject.testMatch` at a non-matching glob (42/529, exit 0, no warning). A separate `jest --selectProjects admin` invocation in CI would fail loudly instead.
4. `[medium]` Test-file routing is by filename suffix, not directory: an admin-tree test named `*.test.ts` (e.g. `useVenuesEnhanced.test.ts`) matches neither project and runs nowhere — the exact failure mode DW-17 fixed. Naming it `*.unit.test.ts` to get it collected lands it in the **node** project without jsdom or the JSX transform.
5. `[medium]` Four `*.test.ts` suites still run in neither project (`event-manager.controller`, `event-manager.service`, `seed.service`, `order.service`). Documented as opt-in boot suites, but nothing compiles or smoke-runs them, so they rot the same way the `.tsx` suites did.
6. `[low]` `tests/__mocks__/` is a haste-map-special-cased directory whose contents are only ever reached through `moduleNameMapper`. Renaming it to `tests/mocks/` would remove the duplicate-manual-mock warnings at the root and make `modulePathIgnorePatterns` unnecessary in both projects.
7. `[low]` Admin plugin sources and their tests are type-checked nowhere: `apps/strapi/tsconfig.json` excludes both `**/*.test.*` and `src/plugins/**/admin/**`, and the admin ts-jest transform sets `diagnostics: false`. The suites can drift out of sync with component props and stay green.
8. `[low]` Pre-existing `yarn type-check` failure in `apps/strapi`: three `TS2339` errors at `src/plugins/user-engagement/server/src/services/watchlist.ts:103-105`. Verified identical with and without this change.

Rejected as noise: scoping the admin project with `roots` (would make a future stray `.tsx` test silently _not_ run — worse than the status quo); replacing `<rootDir>/dist/` with a bare `/dist/` regex (would also ignore `node_modules/**/dist/`); speculative `transformIgnorePatterns` allowlists; `container`-scoping the negative assertions; the inert `jsdom: "^25"` devDependency pin.

### Verification performed

- `cd apps/strapi && npx jest` → exit 0, `Test Suites: 46 passed`, `Tests: 561 passed`, `Ran all test suites in 2 projects.`
- `npx jest --selectProjects server` → exit 0, 42 suites / 529 tests — identical to the `git stash`-ed pre-change baseline.
- `npx jest --selectProjects admin` → exit 0, 4 suites / 32 tests.
- `npx jest 2>&1 | grep -c "duplicate manual mock"` → `0`.
- `npx jest --selectProjects admin 2>&1 | grep -c isolatedModules` → `0` (the `server` project's pre-existing ts-jest deprecation warnings are untouched by design).
- `npx tsc --noEmit` in `apps/strapi` → same three pre-existing `watchlist.ts` errors as baseline; none introduced.
- `npx turbo lint` from the repo root → exit 0, 1 task successful. Note: `apps/strapi` has no `lint` script, so neither changed file is actually linted.

### Residual risks

- The admin gate protects the modal chrome, not the event-creation behaviour (deferred item 2), and the gate itself is not pinned against silently collecting zero suites (item 3).
- The React 19 workaround in `EventCreationModal.test.tsx` masks what may be a live admin-panel defect (item 1). It is documented in-place, but nothing yet verifies the browser behaviour.
- CI always runs with a populated `dist/` (`turbo.json` has `test` depend on `build`), so `modulePathIgnorePatterns` is load-bearing there, and no test asserts the no-warning criterion.
