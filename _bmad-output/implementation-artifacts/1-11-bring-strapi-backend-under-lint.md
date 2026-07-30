# Story 1.11: Bring the Strapi Backend Under Lint

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

---

## Story

As a **developer**,
I want the Strapi backend (`apps/strapi`) linted by ESLint on a flat config, wired into the turbo graph and the CI `Lint` job,
so that backend code quality is a real gate — not silently unlinted — and the config is ESLint-10-ready.

---

## Acceptance Criteria

1. **Given** `apps/strapi` currently has a dormant legacy `.eslintrc.js`, no `lint` script, and no declared ESLint dependencies,
   **When** I migrate it to a flat config,
   **Then** `apps/strapi/.eslintrc.js` is **deleted** and replaced by `apps/strapi/eslint.config.mjs` (flat config, ESM), with **no `.eslintrc.*` file remaining** anywhere in `apps/strapi` (ESLint-10 drops legacy config formats).

2. **And** a `"lint"` script is added to `apps/strapi/package.json` so the app joins the turbo `lint` task graph — `yarn lint` (= `turbo lint` at repo root) then runs ESLint over `apps/strapi`, and the CI `Lint` job (`.github/workflows/ci.yml`, `run: yarn lint`) covers the backend automatically with no CI-file edit required.

3. **And** the backend config uses **node/Strapi-appropriate** rules and is **kept separate from the frontend config** — it must NOT pull in `@tiween/eslint-config/next` or `/react-internal` (those are browser/React/Next presets). Prettier compatibility is preserved via `eslint-config-prettier` (last in the config array) so lint never fights `yarn format`.

4. **And** the working tree lints **clean** — `yarn lint` exits 0 on the current `apps/strapi` tree — achieved by a **conscious per-rule baseline decision** (fix vs. deliberate downgrade/disable per rule, documented in Completion Notes), NOT by disabling linting wholesale. The script uses `eslint . --max-warnings=0` so, like the client after 1-10, CI and any local hook share one strictness level and a newly-introduced violation fails the gate.

5. **And** enforcement is demonstrably real: introducing a fresh unused variable (e.g. `const _probe = 1;` used nowhere, without an `^_`-style ignore match) in a backend `.ts` file makes `yarn lint` **fail**; reverting it makes `yarn lint` **pass**.

6. **And** no runtime regression: `yarn build:strapi` (`strapi build`) and `apps/strapi` tests (`yarn workspace @tiween/admin test`) still succeed — the lint migration is tooling-only and must not touch Strapi runtime behavior.

---

## Tasks / Subtasks

- [ ] **Task 1: Measure the true baseline first** (AC: #4) — _measure before enforcing; this is the central risk-control step_

  - [ ] 1.1 With a candidate flat config, run ESLint over `apps/strapi/{src,config,scripts,tests}` and record the raw problem count + per-rule breakdown (expected starting point ≈ **72 errors + 38 stale-`eslint-disable` warnings** — see Dev Notes → Measured Baseline).
  - [ ] 1.2 For each surfaced rule, decide **fix vs. downgrade/disable** and write the decision into Completion Notes. Do not blanket-silence.

- [ ] **Task 2: Add ESLint dependencies to `apps/strapi/package.json`** (AC: #1, #3)

  - [ ] 2.1 Add `devDependencies`: `eslint`, `typescript-eslint`, `@eslint/js`, `eslint-config-prettier`, `globals` (all already resolvable at repo root — match the versions in `packages/eslint-config/package.json`: `@eslint/js ^9.39.0`, `typescript-eslint ^8.33.1`, `eslint-config-prettier ^10.1.5`, `globals ^16.2.0`, `eslint ^9.39.0`).
  - [ ] 2.2 Run `yarn install` and confirm the lockfile updates cleanly.

- [ ] **Task 3: Create `apps/strapi/eslint.config.mjs`** (AC: #1, #3) — see the reference config in Dev Notes

  - [ ] 3.1 Base: `@eslint/js` recommended + `typescript-eslint` **recommended (non-type-checked)** + `eslint-config-prettier` last.
  - [ ] 3.2 Server globals for `src/**`, `config/**`, `scripts/**` (node); jest globals for `tests/**` + `**/*.test.*` + `**/*.unit.test.*`; browser+React globals for `src/admin/**`.
  - [ ] 3.3 `ignores`: `dist/**`, `build/**`, `.cache/**`, `.tmp/**`, `.strapi/**`, `node_modules/**`, `types/generated/**`, `public/**`, `coverage/**`.
  - [ ] 3.4 Rule baseline (preserve legacy intent): keep `@typescript-eslint/no-explicit-any: "off"`, `explicit-function-return-type: "off"`, `explicit-module-boundary-types: "off"`; drop the deprecated `interface-name-prefix` rule (removed upstream). Add the `^_` ignore pattern for `no-unused-vars` (mirrors client) and relax `no-require-imports` for CJS/test surfaces (see Dev Notes).

- [ ] **Task 4: Delete legacy config** (AC: #1)

  - [ ] 4.1 `git rm apps/strapi/.eslintrc.js`. Confirm no other `.eslintrc.*` remains under `apps/strapi`.

- [ ] **Task 5: Wire the `lint` script** (AC: #2, #4)

  - [ ] 5.1 Add to `apps/strapi/package.json` scripts: `"lint": "eslint . --max-warnings=0"`.
  - [ ] 5.2 Confirm `turbo lint` (from repo root, `yarn lint`) now discovers and runs the backend lint task (turbo picks up any workspace exposing a `lint` script; `turbo.json`'s `lint` task already exists — no edit needed).

- [ ] **Task 6: Pay down to a clean tree** (AC: #4) — execute the Task 1 decisions

  - [ ] 6.1 Run `eslint . --fix` in `apps/strapi` for the auto-fixable set (e.g. `prefer-const`), then hand-resolve the rest per the baseline decisions.
  - [ ] 6.2 Remove now-stale `// eslint-disable ... no-explicit-any` directives in test files (they trigger the 38 "unused eslint-disable directive" reports once `no-explicit-any` is `off`).
  - [ ] 6.3 Confirm `yarn workspace @tiween/admin lint` exits 0 with 0 errors / 0 warnings.

- [ ] **Task 7: Prove enforcement + no regression** (AC: #5, #6)

  - [ ] 7.1 Add a throwaway unused `const x = 1;` (no `_` prefix) to a backend `.ts` file → `yarn lint` fails → revert → passes. Record in Debug Log.
  - [ ] 7.2 Run `yarn build:strapi` and `yarn workspace @tiween/admin test` → both green.
  - [ ] 7.3 Run root `yarn lint` (full turbo graph) → both client and strapi lint pass.

- [ ] **Task 8 (OPTIONAL, recommended): Extend the pre-commit hook to the backend** (supports AC #2 intent)
  - [ ] 8.1 Add `apps/strapi/.lintstagedrc.js` mirroring `apps/client/.lintstagedrc.js`: `module.exports = { "*.{js,ts}": ["eslint --max-warnings=0 --no-warn-ignored"] }`. Root husky `pre-commit` already runs `npx lint-staged`, which applies the nearest config to each staged file — so staged backend files get gated too. Skip only if it destabilizes the paydown; note the decision.

---

## Dev Notes

### Why this story exists (source of truth)

This story is **not in the base epic file** (`epic-1-*.md`, which ends at Story 1.9). It was added by the **Correct Course** sprint change proposal after DW-21 shipped with `--no-verify`. The authoritative spec is:
[Source: _bmad-output/project-planning-artifacts/sprint-change-proposal-2026-07-14.md#Story 1-11]

Problem in one line: **`apps/strapi` is unlinted end-to-end** — dormant legacy `.eslintrc.js`, **no `lint` script, no declared eslint deps, not in the turbo graph** — so no CI or local gate ever sees backend issues. [Source: sprint-change-proposal-2026-07-14.md §1 Evidence]

**Sequencing.** Proposal order is 1-10 → **1-11** → 1-12 → 1-13. 1-11 has **no hard dependency on 1-10** (1-10 fixes the _client_ preset's `only-warn`; the backend gets a _fresh_ config here and must not consume the client presets anyway). 1-11 can proceed independently. Do NOT reintroduce `eslint-plugin-only-warn` in the backend config — it is the exact anti-pattern 1-10 is removing. [Source: sprint-change-proposal-2026-07-14.md §4]

### Measured Baseline (run 2026-07-14, candidate config)

Running `typescript-eslint` **recommended (non-type-checked)** + `no-explicit-any: off` over `apps/strapi/{src,config,scripts,tests}` produced **✖ 110 problems (72 errors, 38 warnings)**. Per rule:

| Count | Sev  | Rule                                    | Disposition guidance                                                                                                                                                                                          |
| ----- | ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 55    | err  | `@typescript-eslint/no-unused-vars`     | **Mostly evaporates** — many are intentional `_url` / `_body` params. Apply the client's ignore config: `argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern: "^_"`. Fix the genuine remainder. |
| 38    | warn | _unused `eslint-disable` directive_     | Not real code issues — stale `// eslint-disable @typescript-eslint/no-explicit-any` comments in test files that report nothing once `no-explicit-any` is `off`. **Delete the stale directives.**              |
| 15    | err  | `@typescript-eslint/no-require-imports` | Strapi + jest use CommonJS `require()` (e.g. `tests/app.test.js`, mocks). **Relax for CJS/test surfaces**: turn off for `**/*.js`, `**/*.cjs`, and `tests/**`; keep it on for ESM `.ts` source.               |
| 2     | err  | `prefer-const`                          | Auto-fixable via `--fix`.                                                                                                                                                                                     |

**Takeaway:** despite 72 raw errors, the true hand-work is small and mostly mechanical (one ignore pattern + directive cleanup + a rule relax + `--fix`). A clean, `--max-warnings=0` tree is realistically achievable. **Non-type-checked linting hit zero parser errors** across `src`/`config`/`scripts`/`tests` — no "file not in tsconfig project" failures. Prefer it over `recommendedTypeChecked` (type-aware linting would need `parserOptions.project`/`projectService`, is far slower over ~356 files, and errors on files outside the TS project such as `config/**` and `scripts/**`). Type-checked rules are **deferred** future work, not in scope.

### Reference flat config (`apps/strapi/eslint.config.mjs`)

Adapt as the baseline decisions dictate; this is the shape verified against the measured baseline. Keep the backend **self-contained** (do not import `@tiween/eslint-config/next`).

```js
import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended, // NON-type-checked on purpose (see Dev Notes)
  {
    languageOptions: {
      globals: { ...globals.node, strapi: "readonly" },
    },
    rules: {
      // Preserve legacy .eslintrc.js intent — Strapi + generated types make `any` pervasive
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Mirror client's underscore-ignore convention
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
    // CommonJS surfaces: Strapi config/scripts and jest tests legitimately use require()
    files: ["**/*.js", "**/*.cjs", "tests/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Jest/test globals
    files: ["tests/**", "**/*.test.*", "**/*.unit.test.*"],
    languageOptions: { globals: { ...globals.jest } },
  },
  {
    // Admin panel is React in the browser
    files: ["src/admin/**"],
    languageOptions: {
      globals: { ...globals.browser, React: "readonly", JSX: "readonly" },
    },
  },
  prettier, // MUST be last — turns off formatting rules that fight `yarn format`
  {
    ignores: [
      "dist/**",
      "build/**",
      ".cache/**",
      ".tmp/**",
      ".strapi/**",
      "node_modules/**",
      "types/generated/**",
      "public/**",
      "coverage/**",
    ],
  },
]
```

> Note the `TypeScript config` rule about strict mode / `no any` in `project-context.md` targets the **frontend** (`apps/client`). The backend `tsconfig.json` runs `strict: false` and the legacy lint config explicitly set `no-explicit-any: off`; preserving that here is intentional and not a violation of the client-facing rule.

### Architecture Compliance

- **CI gate wiring:** CI's `Lint` job is `run: yarn lint` = `turbo lint`. Turbo runs the `lint` task for **every workspace that declares a `lint` script**; adding the script is the entire wiring. No `.github/workflows/ci.yml` edit needed. [Source: .github/workflows/ci.yml:64; turbo.json `tasks.lint`]
- **Architecture doc follow-up (NOT this story):** `architecture.md:515–516` PR-gate line omits ESLint; the proposal says update it to `lint (eslint . --max-warnings=0, both apps) + type-check + …` **only after 1-10 + 1-11 land**. Leave it to the Architect step; do not edit here. [Source: sprint-change-proposal-2026-07-14.md §4 Architecture doc change]
- **Keep configs separate** is an explicit constraint: frontend uses `@tiween/eslint-config/next`; backend gets its own node config. [Source: sprint-change-proposal-2026-07-14.md §4 Story 1-11]

### Existing legacy config being replaced (read before deleting)

`apps/strapi/.eslintrc.js` (current) — type-aware (`parserOptions.project: "tsconfig.json"`), `env: { node, jest }`, extends `@typescript-eslint/recommended` + `prettier/recommended`, rules off: `interface-name-prefix`, `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any`. The flat config above carries every one of these intents forward **except** `interface-name-prefix` (deprecated/removed upstream — drop it) and the type-aware parser (intentionally swapped for non-type-checked; see baseline rationale). It is Strapi-runtime-inert (Strapi never loads it), so deletion is safe for the build.

### Source tree to touch

```
apps/strapi/
├── .eslintrc.js          # DELETE
├── eslint.config.mjs     # CREATE
├── package.json          # MODIFY: add lint script + eslint devDeps
└── .lintstagedrc.js      # CREATE (optional, Task 8)
```

Backend surface being linted (~356 TS/JS files): `src/**` (314, incl. 9 local plugins + `src/admin` React panel), `scripts/**` (20 — crawlers/seeds/tsx CLIs), `config/**` (11, ESM `export default`), `tests/**` (8, jest).

### Regression safety

Tooling-only change. Zero runtime files edited except mechanical lint paydown (unused-var removal, `let`→`const`, stale-comment deletion) — each must be behavior-preserving. Verify with `yarn build:strapi` + `yarn workspace @tiween/admin test` (Task 7). The backend test runner is **jest** (`ts-jest`), unaffected by ESLint. Do not migrate tests to Vitest here — that is separate deferred `project-context.md` drift. [Source: sprint-change-proposal-2026-07-14.md §5 Deferred]

### Previous Story Intelligence

Story files 1-10 / 1-12 / 1-13 are not yet created (siblings from the same proposal). The **client** parallel (Story 1-10) establishes the target pattern this story mirrors on the backend: remove `only-warn`, run to a conscious per-rule baseline, and end at `eslint . --max-warnings=0` so hook + CI agree. The client's own flat config (`apps/client/eslint.config.mjs`) is the canonical example of the `no-unused-vars` `^_` ignore block and prettier-last ordering — copy those conventions. [Source: apps/client/eslint.config.mjs; apps/client/.lintstagedrc.js]

### Testing Requirements

No unit tests are added (lint config is not application code). Verification is behavioral (Task 7):

1. `yarn workspace @tiween/admin lint` → 0 problems on clean tree.
2. Inject an unused var → `yarn lint` fails → revert → passes (proves the gate has teeth).
3. `yarn build:strapi` + backend jest suite → green (no regression).
4. Root `yarn lint` → both apps pass (turbo graph includes strapi).

---

### References

- [Source: _bmad-output/project-planning-artifacts/sprint-change-proposal-2026-07-14.md#Story 1-11] — authoritative spec, ACs, deferred scope
- [Source: _bmad-output/project-planning-artifacts/sprint-change-proposal-2026-07-14.md#§1-§2] — problem evidence, backend-unlinted findings
- [Source: apps/strapi/.eslintrc.js] — legacy config intent to preserve
- [Source: apps/strapi/package.json] — no lint script / no eslint deps today
- [Source: apps/client/eslint.config.mjs] — flat-config conventions to mirror (no-unused-vars `^_`, prettier last)
- [Source: apps/client/.lintstagedrc.js] — pre-commit pattern for optional Task 8
- [Source: turbo.json] — `tasks.lint` already defined; auto-includes any workspace lint script
- [Source: .github/workflows/ci.yml:59-64] — CI `Lint` job runs `yarn lint`
- [Source: _bmad-output/project-context.md] — TS strict/`no any` rule scoped to frontend; Strapi v5 conventions

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
