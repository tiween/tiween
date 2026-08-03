---
title: "Story 1.11: Bring the Strapi backend under lint"
type: "chore"
created: "2026-08-03"
status: "done"
baseline_revision: "c23080dd8348401b704b9eb376ef309f12321b7c"
final_revision: "e9056d0" # this line is recorded in the next commit
review_loop_iteration: 0
followup_review_recommended: false # 5 localized patches (3 medium, 2 low) across 4 files, all config/type-level and each verified by a targeted probe; no behaviour, API, security or data impact
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md"
warnings: ["oversized"] # per-rule baseline ledger + measured evidence do not compress below the 1600-token target
---

<intent-contract>

## Intent

**Problem:** `apps/strapi` is unlinted end-to-end — it carries a dormant legacy `.eslintrc.js` (which ESLint 9 flat-config never loads and ESLint 10 drops entirely), declares no ESLint dependencies, and exposes no `lint` script, so it is absent from the turbo `lint` graph and the CI `Lint` job. No gate at any level has ever seen backend code. Separately, `yarn build:strapi` is **already red** on three pre-existing `TS2339` errors (DW-168), so the story's own no-regression check cannot pass until they are fixed.

**Approach:** Give the backend its own self-contained ESLint **flat** config (node/Strapi-appropriate, `eslint-config-prettier` last, deliberately non-type-checked), delete the legacy config, declare the ESLint devDependencies, and add `"lint": "eslint . --max-warnings=0"` so turbo and CI pick it up with no workflow edit. Pay the measured baseline down to a genuinely clean tree through an explicit fix-or-relax decision **per rule**, and fix DW-168 so `build`/`type-check` are green.

## Boundaries & Constraints

**Always:**

- Every rule that ends up non-erroring must be an explicit, documented decision in Completion Notes, scoped as narrowly as the cause justifies (a `files:`-scoped override or a targeted `eslint-disable-next-line` with a `--` justification), never a blanket silence.
- The backend config stays **self-contained**: it must not import `@tiween/eslint-config/next` or `/react-internal` (browser/React/Next presets), and must not register `eslint-plugin-only-warn` — that plugin is the exact anti-pattern story 1.10 removed.
- `eslint-config-prettier` must be last in the config array so lint never fights `yarn format`.
- Tooling-only: no Strapi runtime behaviour, API contract, or admin-panel UI change. Paydown edits (dead-binding deletion, `_`-prefixing, `let`→`const`, stale-directive removal) and the DW-168 fix must all be behaviour-preserving; the DW-168 fix must be **type-level only**.
- The `lint` script uses `--max-warnings=0`, so hook, `turbo lint`, and CI share one strictness level by construction.

**Block If:**

- Paying a rule down to zero would require changing Strapi runtime behaviour or a public API shape.
- The measured baseline diverges from the recorded shape by a new rule class whose only clean resolution is a repo-wide relaxation.

**Never:**

- Do not enable type-aware linting (`parserOptions.project` / `projectService`) — it is slow over ~373 files and errors on files outside the TS project (`config/**`, `scripts/**`). Type-checked rules are deferred, not in scope.
- Do not edit `.github/workflows/ci.yml` or `turbo.json` — the `lint` task and `run: yarn lint` already exist; adding the workspace script is the entire wiring.
- Do not edit `architecture.md`'s PR-gate line (Architect follow-up after 1.10 + 1.11 land), the repo-root `.eslintrc.js` (DW-161), or `apps/client`.
- Do not migrate backend tests from jest to Vitest.

## I/O & Edge-Case Matrix

| Scenario                               | Input / State                                                                  | Expected Output / Behavior                                                  | Error Handling                                       |
| -------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| Clean tree                             | `apps/strapi` after paydown                                                    | `eslint . --max-warnings=0` exits 0, 0 errors / 0 warnings                  | No error expected                                    |
| Fresh violation                        | `const probe = 1` (no `_`) added to a backend `.ts` file                       | `yarn lint` **fails** on `@typescript-eslint/no-unused-vars`; revert → pass | Non-zero exit is the expected, desired outcome       |
| Intentionally unused Strapi hook param | `({ strapi: _strapi }: { strapi: Core.Strapi })` in `register.ts`/`destroy.ts` | Silent — matched by `argsIgnorePattern: "^_"`                               | No error expected                                    |
| CommonJS surface                       | `require()` in `**/*.js`, `**/*.cjs`, `tests/**`                               | Silent — `no-require-imports` off for those files only                      | Same `require()` in an ESM `.ts` source still errors |
| Generated / build output               | `dist/`, `types/generated/`, `coverage/`, `.tmp/`, `.strapi/`                  | Not linted (ignored)                                                        | No error expected                                    |

</intent-contract>

## Code Map

- `apps/strapi/.eslintrc.js` -- legacy eslintrc-era config, never loaded by ESLint 9 flat config and Strapi-runtime-inert. **DELETE**. Its rule intent (`no-explicit-any`, `explicit-function-return-type`, `explicit-module-boundary-types` all off) carries forward; `@typescript-eslint/interface-name-prefix` is dropped (removed upstream).
- `apps/strapi/eslint.config.mjs` -- **CREATE**. The whole backend rule surface.
- `apps/strapi/package.json` -- add `"lint": "eslint . --max-warnings=0"` and the ESLint devDependencies. Workspace name is `@tiween/admin`.
- `apps/strapi/.lintstagedrc.js` -- **CREATE**. Directory-scoped lint-staged config; must keep a `prettier --write` entry (a nearest-config match **shadows** the root `.lintstagedrc.js`, so omitting it would silently drop format-on-commit for backend files).
- `apps/client/eslint.config.mjs`, `apps/client/.lintstagedrc.js` -- read-only reference for the `^_` ignore block, prettier-last ordering and hook conventions.
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts:99-107` -- DW-168. `enrichment[key] ?? {}` widens `info` to `{}`, producing three `TS2339`s that fail `strapi build` and `tsc --noEmit`.
- `apps/strapi/src/plugins/*/server/src/{register,destroy,bootstrap}.ts` (17 sites) -- unused `{ strapi }` lifecycle params.
- `apps/strapi/src/plugins/events-manager/admin/src/**` -- the React/browser surface (`src/admin/**` also exists); needs browser + React globals.
- `.husky/pre-commit`, `turbo.json`, `.github/workflows/ci.yml` -- already correct; **no edits**. The hook runs the repo-local `turbo lint`, so the backend joins the pre-commit gate automatically once the script exists.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/package.json` -- add devDependencies `eslint@^9.39.0`, `typescript-eslint@^8.33.1`, `@eslint/js@^9.39.0`, `eslint-config-prettier@^10.1.5`, `globals@^16.2.0` (matching `packages/eslint-config/package.json`) and run `yarn install` -- the app must resolve its own linter rather than rely on root hoisting (root currently hoists `globals@13`, which lacks the v16 global sets).
- [x] `apps/strapi/eslint.config.mjs` -- create the flat config: `@eslint/js` recommended + `typescript-eslint` **recommended (non-type-checked)** + `eslint-config-prettier` last; node + `strapi` globals; jest globals for `tests/**`, `**/*.test.*`, `**/*.unit.test.*`; browser/React globals for `src/admin/**` and `src/plugins/*/admin/**`; `ignores` for `dist`, `build`, `.cache`, `.tmp`, `.strapi`, `node_modules`, `types/generated`, `public`, `coverage` -- see Design Notes for the rule baseline.
- [x] `apps/strapi/.eslintrc.js` -- `git rm`; verify no `.eslintrc.*` remains anywhere under `apps/strapi` -- ESLint 10 drops legacy formats.
- [x] `apps/strapi/package.json` -- add `"lint": "eslint . --max-warnings=0"` -- the entire turbo/CI wiring.
- [x] `apps/strapi/{src,config,scripts}/**` -- clear `@typescript-eslint/no-unused-vars` (54): delete genuinely dead imports/locals; `_`-prefix intentionally-unused Strapi lifecycle/policy/middleware params (`{ strapi: _strapi }`) -- never by widening the ignore pattern beyond `^_`.
- [x] `apps/strapi/src/**/*.test.ts`, `apps/strapi/tests/**` -- delete the 37 now-stale `eslint-disable ... no-explicit-any` directives (they report as unused once `no-explicit-any` is off) -- they are comment-only edits.
- [x] `apps/strapi/scripts/crawlers/tunisian-plays/{adapters/wikipedia-ar.ts,services/normalizer.ts}` -- resolve the 2 `prefer-const` findings via `eslint . --fix` -- mechanical.
- [x] `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` -- fix DW-168 by typing the enrichment fallback (extract the `{nextScreeningDate, lastScreeningDate, venueName}` shape and annotate `info` as a `Partial<…>`) so `?? {}` no longer collapses to `{}` -- **type-level only**, runtime output identical.
- [x] `apps/strapi/.lintstagedrc.js` -- create `{"*.{js,cjs,ts,tsx}": ["prettier --write --cache --ignore-unknown", "eslint --max-warnings=0 --no-warn-ignored"]}` -- fast staged-file feedback while preserving the root config's format-on-commit for backend files.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- mark DW-168 `status: resolved` with a pointer to this story -- the ledger assigned it here.

**Acceptance Criteria:**

- Given the migrated app, when I list `apps/strapi`, then `eslint.config.mjs` exists, no `.eslintrc.*` file remains anywhere under it, and the config imports neither `@tiween/eslint-config/*` nor `eslint-plugin-only-warn`.
- Given the paid-down tree, when I run `yarn workspace @tiween/admin lint`, then it exits 0 reporting 0 errors and 0 warnings.
- Given the new workspace script, when I run root `yarn lint` (`turbo lint`), then the task list includes `@tiween/admin#lint` and both apps pass — with no edit to `.github/workflows/ci.yml` or `turbo.json` in the diff.
- Given every rule left non-erroring and every `eslint-disable` this story adds, when I read Completion Notes, then each carries an explicit reason and the counts match the config and the diff exactly.
- Given the change is tooling-only, when I run `yarn build:strapi` and `yarn workspace @tiween/admin test`, then the build succeeds (DW-168 fixed) and all 46 suites / 561 tests still pass.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 3, low 2)
- defer: 9: (high 1, medium 5, low 3)
- reject: 7: (high 0, medium 2, low 5)
- addressed_findings:
  - `[medium]` `[patch]` The nested `apps/strapi/.lintstagedrc.js` glob (`*.{js,cjs,ts,tsx}`) is **narrower** than the root config it shadows (`*.{js,jsx,ts,tsx,md,css,scss}`), so backend `.md`/`.css`/`.scss` lost format-on-commit — the exact failure the file's own comment claimed to prevent, and one CI's `yarn format:check` would then report. Split into a wide `prettier --write` glob (`js,jsx,cjs,mjs,ts,tsx,md,css,scss`) and a code-only `eslint` glob. Verified empirically with a staged mis-formatted `apps/strapi/__probe.md`: prettier now rewrites it.
  - `[medium]` `[patch]` ESLint `ignores` were root-anchored (`dist/**`, `coverage/**`, …), so a **nested** build output would be linted and could turn `--max-warnings=0` red on generated code. Proven with a probe at `src/plugins/venues/dist/__probe.js`. Re-anchored to `**/dist/**` etc.
  - `[medium]` `[patch]` The DW-168 fix hand-copied the `ScreeningInfo` shape into `watchlist.ts` although `events-manager/server/src/services/public-api.ts:47` already **exports** an identical interface — the two could diverge silently and the consumer would compile while returning `null` forever. Replaced with `import type { ScreeningInfo }` from the producer (compile-time only; the runtime call still goes through the `strapi.plugin(...).service(...)` facade).
  - `[low]` `[patch]` The jest-globals and CommonJS-relax globs keyed on file _names_ (`**/*.test.*`), but the repo's convention is `__tests__/` directories — a future fixture in there would break the gate for an unguessable reason. Added `**/__tests__/**` to both. Also added `**/*.jsx` to the admin block: flat config discovers only `.js/.cjs/.mjs` by default and typescript-eslint's globs stop at `.ts/.tsx/.mts/.cts`, so a `.jsx` file would have been silently unlinted.
  - `[low]` `[patch]` Removing a stale `eslint-disable` directive left an orphan blank line **inside a type literal** in `events-manager/server/src/content-types/event/schedule-update-handler.ts`, splitting `before` from `row`. Collapsed.

## Design Notes

**Measured baseline** (re-measured 2026-08-03 against the candidate config, 373 files): **108 problems = 71 errors + 37 warnings**. The story file's 2026-07-14 figure was 110 (72/38); the two-finding delta is tree drift, not a methodology difference. Per rule:

| Rule                                    | Count | Sev  | Decision                                                                                                                                                                                             |
| --------------------------------------- | ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars`     | 54    | err  | **Fix.** 9 are already `_`-prefixed and evaporate under the ignore pattern. Of the remaining 45, ~20 are unused `{ strapi }` lifecycle params (`_`-prefix) and ~25 are dead imports/locals (delete). |
| _unused `eslint-disable` directive_     | 37    | warn | **Fix.** Stale `no-explicit-any` disables in test files; delete the comments.                                                                                                                        |
| `@typescript-eslint/no-require-imports` | 15    | err  | **Relax, scoped.** Off for `**/*.js`, `**/*.cjs`, `tests/**` only — Strapi plugin entrypoints (`strapi-server.js`) and jest mocks are legitimately CommonJS. Stays on for ESM `.ts`.                 |
| `prefer-const`                          | 2     | err  | **Fix** via `--fix`.                                                                                                                                                                                 |

Zero parse errors across `src`/`config`/`scripts`/`tests` with the non-type-checked parser — the reason type-aware linting is not needed here.

**`no-undef` is inert for `.ts`/`.tsx`** (typescript-eslint's `eslint-recommended` turns it off), so the globals blocks matter mainly for the `.js`/`.cjs` CommonJS surfaces. Configure them correctly anyway — they are load-bearing the moment a `.js` file is added.

**Config skeleton** (adapt as the paydown dictates; the full reference lives in the story file's Dev Notes):

```js
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended, // NON-type-checked on purpose
  {
    languageOptions: { globals: { ...globals.node, strapi: "readonly" } },
    rules: {
      "@typescript-eslint/no-explicit-any":
        "off" /* + the two explicit-*-types rules */,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.cjs", "tests/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  prettier, // MUST be last
  {
    ignores: [
      /* dist, build, .cache, .tmp, .strapi, node_modules, types/generated, public, coverage */
    ],
  },
]
```

**Why `no-explicit-any: off` here is not a `project-context.md` violation:** that rule targets the frontend. `apps/strapi/tsconfig.json` runs `strict: false`, Strapi's generated types make `any` pervasive, and the legacy config it replaces already set it off. Preserving that is intentional; tightening it is separate future work.

**Environment note:** `yarn` is not resolvable via asdf in this workspace. Run the `yarn …` commands as `corepack yarn …` (yarn 1.22.22, the version `.tool-versions` pins) or invoke `node_modules/.bin/turbo` directly, exactly as `.husky/pre-commit` does.

## Verification

**Commands:**

- `corepack yarn workspace @tiween/admin lint` -- expected: exit 0, "0 problems".
- `git ls-files apps/strapi | grep -c '\.eslintrc'` -- expected: `0`.
- Inject `const probe = 1` into a backend `.ts` file, run `corepack yarn lint` -- expected: **fails**; revert -- expected: passes. Record both in the Debug Log.
- `corepack yarn lint` (root `turbo lint`) -- expected: exit 0 with `@tiween/admin#lint` **and** `@tiween/client#lint` in the task list.
- `corepack yarn build:strapi` -- expected: exit 0 (currently red on 3 `TS2339`s; must be green after the DW-168 fix).
- `cd apps/strapi && npx tsc --noEmit` -- expected: no output.
- `corepack yarn workspace @tiween/admin test` -- expected: 46 suites / 561 tests passing, unchanged from baseline.
- `git diff --stat -- .github turbo.json apps/client` -- expected: empty.

## Completion Notes

### Per-rule decision ledger

Baseline re-measured with the final `apps/strapi/eslint.config.mjs` over **372 files**
(`npx eslint . --format json`): **91 problems = 52 errors + 39 warnings**.

| Rule                                    | Count (post-config)  | Decision                                                                                                         | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars`     | 45 err               | **Fix — all 45.** 27 `_`-prefixed (intentionally-unused params), 16 dead imports deleted, 2 dead locals removed. | Every finding was either a genuinely dead binding or a Strapi/React callback param the signature forces. Nothing widened beyond the client's `^_` convention (`argsIgnorePattern` / `varsIgnorePattern` / `caughtErrorsIgnorePattern`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| _unused `eslint-disable` directive_     | 39 warn              | **Fix — all 39** via `eslint . --fix`.                                                                           | Stale `@typescript-eslint/no-explicit-any` / `no-var-requires` / `no-require-imports` directives in test files that report nothing once `no-explicit-any` is `off`. Comment-only deletions; verified the diff for those files contains no non-comment line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `@typescript-eslint/no-require-imports` | 5 err (15 pre-scope) | **10 relaxed (scoped), 4 relaxed (scoped), 1 fixed.**                                                            | 10 were already absorbed by the `**/*.js` / `**/*.cjs` / `tests/**` override (Strapi plugin entrypoints + jest mocks are legitimately CommonJS). 4 more sat in **co-located** `*.test.ts` / `*.unit.test.ts` files under `src/**`, which the spec's glob list did not reach — the override was widened to `**/*.test.*` / `**/*.unit.test.*` (the exact globs the jest-globals block already uses). Those requires re-import a module after `jest.resetModules()`; there is no ESM equivalent under ts-jest's CJS transform. The 5th, `src/lifeCycles/user.ts:4` `const crypto = require("crypto")`, is a real ESM production source and was **fixed** to `import crypto from "node:crypto"`. The rule stays **erroring** for every non-test `.ts`. |
| `prefer-const`                          | 2 err                | **Fix** via `eslint . --fix`.                                                                                    | Mechanical `let`→`const` in `scripts/crawlers/tunisian-plays/{adapters/wikipedia-ar.ts:230, services/normalizer.ts:102}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Rules deliberately left non-erroring** (all inherited from the deleted legacy `.eslintrc.js`; scope = whole backend, which is the scope the legacy config had):

| Rule                                                | State       | Reason                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`                | `off`       | `apps/strapi/tsconfig.json` runs `strict: false` and Strapi v5's Document Service generics force `as any` casts throughout. The legacy config already set it off; preserving it is intentional. `project-context.md`'s no-`any` rule targets `apps/client`. Tightening is separate future work. |
| `@typescript-eslint/explicit-function-return-type`  | `off`       | Legacy intent carried forward; not in typescript-eslint `recommended` anyway (explicit for documentation).                                                                                                                                                                                      |
| `@typescript-eslint/explicit-module-boundary-types` | `off`       | Same.                                                                                                                                                                                                                                                                                           |
| `no-unused-vars` (base)                             | `off`       | Standard flat-config practice: superseded by the TypeScript-aware variant so enums/type-only imports are not double-reported. Mirrors `apps/client/eslint.config.mjs`.                                                                                                                          |
| `@typescript-eslint/interface-name-prefix`          | **dropped** | Removed upstream; keeping it would crash ESLint.                                                                                                                                                                                                                                                |

Type-aware linting (`parserOptions.project` / `projectService`) is **not** enabled — the non-type-checked parser hit **zero** parse errors across `src`/`config`/`scripts`/`tests`, so it buys nothing here and would error on files outside the TS project (`config/**`, `scripts/**`). Deferred, not in scope.

### `eslint-disable` directives added by this story

| file:line | rule | reason                                                                                           |
| --------- | ---- | ------------------------------------------------------------------------------------------------ |
| _(none)_  | —    | **Zero** `eslint-disable` comments were added. The paydown removed 39 stale ones and added none. |

### Baseline reconciliation

| Rule                                    | Story file (2026-07-14) | Spec (2026-08-03)      | Measured here (final config) | Note                                                                                                                                                                                                                                             |
| --------------------------------------- | ----------------------- | ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| files linted                            | ~356                    | 373                    | **372**                      | 372 = 373 − the deleted `.eslintrc.js` (which was itself lintable). Consistent.                                                                                                                                                                  |
| `@typescript-eslint/no-unused-vars`     | 55                      | 54 raw / 45 after `^_` | **45**                       | Exact match with the spec's prediction that 9 already-`_`-prefixed findings evaporate.                                                                                                                                                           |
| unused `eslint-disable` directive       | 38                      | 37                     | **39**                       | +2 vs. the spec. Both extra directives are the same class (stale `no-var-requires` / `no-require-imports` comments in test files, now also inert because of the scoped CJS relax) — tree drift, not a new rule class. No **Block If** triggered. |
| `@typescript-eslint/no-require-imports` | 15                      | 15                     | **5 after scoping**          | The spec's 15 is the pre-override raw count; 10 fall inside the `**/*.js`/`**/*.cjs`/`tests/**` override as designed.                                                                                                                            |
| `prefer-const`                          | 2                       | 2                      | **2**                        | Exact match.                                                                                                                                                                                                                                     |
| **total**                               | 110 (72/38)             | 108 (71/37)            | **91 (52/39)**               | The lower total is entirely the scoped `no-require-imports` override being applied _before_ measurement, plus the `^_` ignore pattern. No new rule class appeared, so neither **Block If** condition fired.                                      |

### Task 8 (`.lintstagedrc.js`) decision

**Done, not skipped.** It did not destabilize the paydown. `apps/strapi/.lintstagedrc.js` was created with **both** entries:

```js
module.exports = {
  "*.{js,cjs,ts,tsx}": [
    "prettier --write --cache --ignore-unknown",
    "eslint --max-warnings=0 --no-warn-ignored",
  ],
}
```

The `prettier --write` entry is load-bearing: lint-staged applies the **nearest** config to each staged file, so this file _shadows_ the repo-root `.lintstagedrc.js` (whose only entry is `"*.{js,jsx,ts,tsx,md,css,scss}": ["prettier --write --cache --ignore-unknown"]`) for everything under `apps/strapi`. Omitting it would silently drop format-on-commit for backend files. The glob adds `cjs` (Strapi/jest CommonJS surfaces) and drops `jsx` (the backend has none) relative to the client's.

### Deviations from the spec

1. **`no-require-imports` override glob widened** from `["**/*.js", "**/*.cjs", "tests/**"]` to additionally include `["**/*.test.*", "**/*.unit.test.*"]`. The spec's list assumed all jest code lives in `tests/**`, but 4 findings are in co-located test files under `src/**`. The alternative was 4 `eslint-disable-next-line` comments; a `files:`-scoped override matching the config's own existing jest-globals glob is the narrower, more consistent expression of the same decision. Production `.ts` remains covered.
2. **`src/lifeCycles/user.ts` converted `require("crypto")` → `import crypto from "node:crypto"`.** The spec listed `no-require-imports` as "relax, scoped", but this one site is genuine ESM production source, so it was fixed rather than relaxed (stricter than the spec, in the spec's own spirit).
3. **`ignores` block placed first** in the array rather than last. Functionally identical in flat config (global `ignores` are order-independent), and putting it first makes the file readable top-down.
4. **`base no-unused-vars: "off"`** added — not in the spec's skeleton but present in `apps/client/eslint.config.mjs`, which the spec names as the convention source.
5. **`apps/strapi/package.json` script keys got alphabetically re-sorted** by the repo's own prettier config (`sort-package-json`) when the touched files were formatted. Pure key ordering; no script body changed.
6. **`yarn.lock` is unchanged.** All five ESLint devDependencies already resolved to satisfying versions at the root, so declaring them in `apps/strapi/package.json` produced no lockfile delta. `apps/strapi/node_modules/globals` verified at **16.5.0** (not the root-hoisted v13), which is the outcome the task required.

## Debug Log

### Enforcement proof (AC #5)

**1. Clean tree — passes.**

```
$ corepack yarn workspace @tiween/admin lint
yarn workspace v1.22.22
yarn run v1.22.22
$ eslint . --max-warnings=0
Done in 4.53s.
Done in 4.70s.
exit=0
```

**2. Inject `const probe = 1` (no `_` prefix) at the end of `apps/strapi/src/lifeCycles/user.ts` — root `corepack yarn lint` FAILS.**

```
$ printf '\nconst probe = 1\n' >> apps/strapi/src/lifeCycles/user.ts
$ corepack yarn lint
@tiween/admin:lint: error Command failed with exit code 1.
@tiween/admin:lint: ERROR: command finished with error: command (…/apps/strapi) … yarn run lint exited (1)
@tiween/admin#lint: command (…/apps/strapi) … yarn run lint exited (1)

 Tasks:    0 successful, 1 total
Cached:    0 cached, 1 total
  Time:    2.836s
Failed:    @tiween/admin#lint

 ERROR  run failed: command  exited (1)
error Command failed with exit code 1.
```

The underlying finding:

```
$ npx eslint src/lifeCycles/user.ts
/…/apps/strapi/src/lifeCycles/user.ts
  106:7  error  'probe' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

**3. Revert the probe — root `corepack yarn lint` PASSES again.**

```
$ corepack yarn lint
 Tasks:    2 successful, 2 total
Cached:    2 cached, 2 total
  Time:    1.09s >>> FULL TURBO

Done in 1.78s.
```

### Verification results (all spec `## Verification` commands)

| Command                                                                   | Expected                                                                     | Actual                                                                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `corepack yarn workspace @tiween/admin lint`                              | exit 0, 0 problems                                                           | **PASS** — exit 0, no output                                                                  |
| `git ls-files apps/strapi \| grep -c '\.eslintrc'`                        | `0`                                                                          | **PASS** — `0`                                                                                |
| inject unused var → `corepack yarn lint` fails; revert → passes           | fail then pass                                                               | **PASS** — see above                                                                          |
| `corepack yarn lint` (root `turbo lint`)                                  | exit 0, both `@tiween/admin#lint` and `@tiween/client#lint` in the task list | **PASS** — `Tasks: 2 successful, 2 total`; both tasks listed                                  |
| `corepack yarn build:strapi`                                              | exit 0 (was red on 3 `TS2339`)                                               | **PASS** — `✔ Building admin panel (10492ms)`, `Tasks: 1 successful, 1 total`                |
| `cd apps/strapi && npx tsc --noEmit`                                      | no output                                                                    | **PASS** — no output, exit 0                                                                  |
| `corepack yarn workspace @tiween/admin test`                              | 46 suites / 561 tests                                                        | **PASS** — `Test Suites: 46 passed, 46 total` / `Tests: 561 passed, 561 total`                |
| `git diff --stat -- .github turbo.json apps/client`                       | empty                                                                        | **PASS** — empty (also verified empty for `architecture.md` and the repo-root `.eslintrc.js`) |
| `grep -E 'tiween/eslint-config\|only-warn' apps/strapi/eslint.config.mjs` | only the explanatory comment, no import/plugin registration                  | **PASS** — 2 comment-line hits, 0 code hits                                                   |

## File List

**Created (2)**

- `apps/strapi/eslint.config.mjs`
- `apps/strapi/.lintstagedrc.js`

**Deleted (1)**

- `apps/strapi/.eslintrc.js` (`git rm`)

**Modified — config / wiring (2)**

- `apps/strapi/package.json` (lint script + 5 ESLint devDependencies)
- `_bmad-output/implementation-artifacts/deferred-work.md` (DW-168 → `status: resolved`)

**Modified — DW-168 fix (1)**

- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts`

**Modified — lint paydown, `_`-prefix of intentionally-unused params (25)**

- `apps/strapi/config/cron-tasks.ts`
- `apps/strapi/config/typescript.ts`
- `apps/strapi/scripts/crawlers/tunisian-plays/adapters/wikipedia.ts` (also `catch (error)` → `catch (_error)`)
- `apps/strapi/src/plugins/creative-works/server/src/{bootstrap,destroy,register}.ts`
- `apps/strapi/src/plugins/entity-properties/server/src/{bootstrap,destroy,register}.ts`
- `apps/strapi/src/plugins/events-manager/server/src/{destroy,register}.ts`
- `apps/strapi/src/plugins/events-manager/server/src/middlewares/index.ts`
- `apps/strapi/src/plugins/geography/server/src/{bootstrap,destroy,register}.ts`
- `apps/strapi/src/plugins/ticketing/server/src/{destroy,register}.ts`
- `apps/strapi/src/plugins/ticketing/server/src/policies/is-ticket-owner.ts`
- `apps/strapi/src/plugins/user-engagement/server/src/{bootstrap,destroy,register}.ts`
- `apps/strapi/src/plugins/venues/server/src/{destroy,register}.ts`
- `apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/pages/Import/index.tsx`

**Modified — lint paydown, dead import / local deletion (14)**

- `apps/strapi/scripts/crawlers/tunisian-plays/services/crawler.ts`
- `apps/strapi/scripts/crawlers/tunisian-plays/services/normalizer.ts`
- `apps/strapi/scripts/crawlers/tunisian-plays/utils/dedup.ts`
- `apps/strapi/scripts/seeds/index.ts`
- `apps/strapi/src/lifeCycles/user.ts` (`require("crypto")` → `import crypto from "node:crypto"`)
- `apps/strapi/src/plugins/venues/server/src/services/public-api.ts`
- `apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/{BigCalendar,WeekView}.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/components/ContentSearchPanel/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/components/EventCreationModal/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/components/PlanningCalendarNew/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/components/VenueSelector/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenuesEnhanced.ts`
- `apps/strapi/src/plugins/events-manager/admin/src/pages/{Planning,Venues}/index.tsx`

**Modified — lint paydown, `let`→`const` (2)**

- `apps/strapi/scripts/crawlers/tunisian-plays/adapters/wikipedia-ar.ts`
- `apps/strapi/scripts/crawlers/tunisian-plays/services/normalizer.ts` _(also in the deletion group)_

**Modified — stale `eslint-disable` directive removal, comment-only (8)**

- `apps/strapi/src/bootstrap/social-providers.unit.test.ts`
- `apps/strapi/src/extensions/users-permissions/{password-reset,profile-management,register,social-login}.unit.test.ts`
- `apps/strapi/src/plugins/events-manager/server/src/content-types/event/schedule-update-handler.ts`
- `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/event-manager.service.test.ts`
- `apps/strapi/src/plugins/ticketing/server/src/services/__tests__/order.service.test.ts`
- `apps/strapi/tests/__mocks__/strapi-admin.ts`
- `apps/strapi/tests/helpers/auth.ts`
- `apps/strapi/tests/helpers/strapi.ts`

**Not modified (verified empty diff):** `.github/**`, `turbo.json`, `apps/client/**`, repo-root `.eslintrc.js`, `_bmad-output/project-planning-artifacts/architecture.md`, `.husky/pre-commit`, `yarn.lock`.

**Modified during the 2026-08-03 review pass (5 patches, 4 files)**

- `apps/strapi/.lintstagedrc.js` — prettier glob widened to a superset of the root config's (`js,jsx,cjs,mjs,ts,tsx,md,css,scss`); eslint split onto a code-only glob.
- `apps/strapi/eslint.config.mjs` — `ignores` re-anchored to `**/dist/**` etc.; `**/__tests__/**` added to the jest-globals and CommonJS-relax globs; `**/*.jsx` added to the admin block.
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` — local `ScreeningInfo` declaration replaced with `import type { ScreeningInfo }` from `events-manager/server/src/services/public-api`.
- `apps/strapi/src/plugins/events-manager/server/src/content-types/event/schedule-update-handler.ts` — orphan blank line inside a type literal collapsed.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story key set to `done`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-173 … DW-181 appended (9 deferred findings).

> **Note for future runs:** do **not** invoke `yarn format` to normalize a story's files. The script's glob is repo-wide (`**/*.{js,jsx,ts,tsx,md,css,scss}`) and rewrote 101 unrelated files when run during this pass; they were reverted. Use `npx prettier --write <paths>` instead. The repo-wide drift it exposed is now tracked as DW-175.

## Auto Run Result

Status: done

### Summary

`apps/strapi` is now linted end-to-end. It has a self-contained ESLint **flat** config (`@eslint/js` recommended + `typescript-eslint` recommended non-type-checked + node/`strapi`/jest/browser globals + `eslint-config-prettier` last), its own ESLint devDependencies, and a `"lint": "eslint . --max-warnings=0"` script — which is the entire turbo/CI wiring, so the CI `Lint` job (`run: yarn lint`) and the `.husky/pre-commit` hook now gate the backend with no workflow edit. The legacy `.eslintrc.js` is deleted (ESLint 10 drops the format). The 91-problem baseline was paid down to zero through a per-rule fix-or-scoped-relax decision, adding **zero** `eslint-disable` comments. DW-168's three `TS2339` errors were fixed type-level-only, turning `yarn build:strapi` and `tsc --noEmit` green for the first time since story 5.3.

### Files changed

- `apps/strapi/eslint.config.mjs` (new) — the whole backend rule surface; self-contained, no `@tiween/eslint-config/*`, no `only-warn`.
- `apps/strapi/.lintstagedrc.js` (new) — staged-file prettier + eslint; prettier glob is a superset of the root config it shadows.
- `apps/strapi/.eslintrc.js` (deleted) — legacy eslintrc-era config, Strapi-runtime-inert.
- `apps/strapi/package.json` — `lint` script + 5 ESLint devDependencies (no `yarn.lock` delta; all five ranges already present).
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` — DW-168 fix: `import type { ScreeningInfo }` + `Partial<ScreeningInfo>` annotation.
- 25 files — intentionally-unused Strapi lifecycle/policy/middleware params `_`-prefixed.
- 14 files — dead imports/locals deleted; `src/lifeCycles/user.ts` `require("crypto")` → `import crypto from "node:crypto"`.
- 2 files — `let` → `const`.
- 8 files — stale `eslint-disable` directives removed (comment-only).
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-168 resolved; DW-173…DW-181 opened.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `1-11-bring-strapi-backend-under-lint: done`.

### Review findings

- **Patches applied: 5** (medium 3, low 2) — narrowed lint-staged prettier glob; root-anchored ESLint `ignores`; duplicated `ScreeningInfo` type; `__tests__/`+`.jsx` glob gaps; orphan blank line inside a type literal.
- **Deferred: 9** (high 1, medium 5, low 3) — DW-173 (`is-ticket-owner` authorizes any authenticated user), DW-174 (client lint-staged has no prettier entry), DW-175 (`yarn format:check` red on 101 pre-existing files), DW-176 (admin React surface has no React lint rules and no `tsc` coverage), DW-177 (`no-undef` inert on tsconfig-excluded TS dirs), DW-178 (venue bulk-delete hides partial failures), DW-179 (dead props/exports made invisible by the paydown), DW-180 (no `no-console`/turbo-env parity with the client), DW-181 (two backend-global relaxations without a scheduled revisit).
- **Rejected: 7** — the `Partial<>` "symptom vs. cause" objection (resolved by the type import); the spec file being untracked (resolved by this commit); `typescript-eslint`/`@eslint/js` resolving through root hoisting (normal yarn-1 behaviour, and the `globals@16` requirement the task actually cared about is met — `apps/strapi/node_modules/globals` is 16.5.0); the deleted `.eslintrc.js` having carried `plugin:prettier/recommended` (dead config, no live gate lost); the nested lint-staged eslint entry being "redundant" with the hook's `turbo lint` (deliberate — per-file feedback lands before the full run); and two blank-line reports that are ordinary statement separators.

### Verification

All run after the review patches:

| Command                                                                                                   | Result                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `corepack yarn workspace @tiween/admin lint`                                                              | **PASS** — exit 0, 0 problems                                                                                                 |
| `corepack yarn lint` (root `turbo lint`)                                                                  | **PASS** — `2 successful, 2 total`; `@tiween/admin#lint` and `@tiween/client#lint` both in the graph                          |
| enforcement probe: `const probe = 1` → `corepack yarn lint`                                               | **FAILS** as required (`'probe' is assigned a value but never used … /^_/u`, `Failed: @tiween/admin#lint`); reverted → passes |
| nested-ignore probe: `src/plugins/venues/dist/__probe.js`                                                 | **PASS** — ignored after the patch (was linted before)                                                                        |
| lint-staged probe: staged `apps/strapi/__probe.md`                                                        | **PASS** — `prettier --write` runs and rewrites it after the patch (was `[SKIPPED] no tasks to run` before)                   |
| `corepack yarn build:strapi`                                                                              | **PASS** — exit 0 (was red on 3 `TS2339`)                                                                                     |
| `cd apps/strapi && npx tsc --noEmit`                                                                      | **PASS** — no output                                                                                                          |
| `corepack yarn workspace @tiween/admin test`                                                              | **PASS** — 46 suites / 561 tests, unchanged from baseline                                                                     |
| `npx prettier --check "apps/strapi/**/*.{js,jsx,cjs,mjs,ts,tsx,md,css,scss}"`                             | **PASS**                                                                                                                      |
| `git diff --stat HEAD -- .github turbo.json apps/client packages _bmad-output/project-planning-artifacts` | **PASS** — empty                                                                                                              |

### Residual risks

- **CI environment differs from local.** `yarn` is not resolvable via asdf on this machine, so every command was run through `corepack yarn` (yarn 1.22.22, the version `.tool-versions` pins). CI runs plain `yarn`; the scripts are identical, but the CI `Lint` job's first green run on the backend is the real confirmation.
- **`yarn.lock` is unchanged**, which is correct (all five ESLint ranges were already present via `packages/eslint-config`) but means `--frozen-lockfile` in CI is verified by reasoning plus the lockfile grep, not by an actual clean-install run.
- **CI's `Format check` step will still fail** on 101 pre-existing files outside `apps/strapi` (DW-175). Story 1.11 did not cause it and could not fix it without a repo-wide reformat commit, but it means the CI `Lint` job is not fully green yet for reasons unrelated to this story.
- **The admin React surface is gated only weakly** (DW-176/DW-177): no React/hooks/a11y rules and no `tsc` coverage. The lint gate is real but shallower there than the "backend is now linted" headline implies.
