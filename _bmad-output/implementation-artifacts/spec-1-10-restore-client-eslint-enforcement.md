---
title: "Story 1.10: Restore client ESLint enforcement"
type: "chore"
created: "2026-08-03"
status: "done"
baseline_revision: "6602af8079857259343734e19fe8b2535b710f78"
final_revision: "7aac8a3" # follow-up review pass commit; this line is recorded in the next commit
review_loop_iteration: 0
followup_review_recommended: false # follow-up pass converged: 4 localized patches (2 medium, 2 low), and 12 of 16 rejections were rediscoveries of already-open ledger entries
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md"
warnings: ["oversized"] # 20 file-scoped paydown decisions do not compress below the 1600-token target
---

<intent-contract>

## Intent

**Problem:** `eslint-plugin-only-warn` is registered in all three shared presets (`next.mjs`, `library.mjs`, `react-internal.mjs`), so every rule — however severe — is downgraded to a warning; `apps/client`'s `lint` script has no `--max-warnings=0`, so `turbo lint` and the CI `Lint` job exit 0 on the current 245 problems and can never fail. The pre-commit hook runs Prettier only and never lints, so no gate exists at any level.

**Approach:** Remove the blanket downgrade plugin from all three presets and drop its dependency, pay down the now-real 245-problem baseline with a conscious fix-or-downgrade decision **per rule** (never a blanket silence), add `--max-warnings=0` to the client `lint` script, and make the pre-commit hook run the same `yarn lint` command CI runs so local and CI verdicts are identical by construction.

## Boundaries & Constraints

**Always:**

- Every rule that ends up non-erroring must be an explicit, documented decision recorded in Design Notes / Completion Notes — never left silenced by accident.
- Prefer fixing violations over relaxing rules. Relaxation is allowed only where the violation is caused by a library/framework constraint or a legitimate documented React pattern, and it must be scoped as narrowly as possible (targeted `eslint-disable-next-line` with a `--` justification, or a `files:`-scoped override) rather than repo-wide.
- Tooling-only change: no runtime behaviour, no API contract, and no user-visible UI change. `console.*` call sites may change channel/removal, and unused code may be deleted, but rendered output must stay equivalent.
- `eslint-config-prettier` must remain last in each preset array so lint never fights `yarn format`.
- `yarn type-check` and `yarn test` must still pass after the paydown.

**Block If:**

- Paying down a rule would require changing rendered UI text, component structure, or data flow in a way a reviewer would call a behaviour change.
- The React Compiler `react-hooks/*` findings turn out to indicate a real runtime bug whose fix is a feature-level redesign rather than a local correction.

**Never:**

- Never disable linting wholesale, never add a repo-wide `--quiet`, never keep `only-warn` under another name, and never reintroduce a blanket severity downgrade.
- Do not touch `apps/strapi` lint wiring (that is Story 1.11) and do not add the i18n numeral rule (Story 1.12) or the UTF-8 CI guard (Story 1.13).
- Do not migrate story files off Storybook CSF or restructure components beyond what a lint fix requires.

## I/O & Edge-Case Matrix

| Scenario                             | Input / State                                                | Expected Output / Behavior                                                | Error Handling                            |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------- |
| Clean tree                           | `apps/client` after the paydown                              | `yarn lint` exits 0 with zero errors and zero warnings                    | No error expected                         |
| Newly introduced `any`               | `const x: any = 1` added to a client `.ts`/`.tsx` file       | `yarn lint` exits non-zero on `@typescript-eslint/no-explicit-any`        | Reverting the edit restores exit 0        |
| Newly introduced unused variable     | `const probe = 1` (no `_` prefix) added and never referenced | `yarn lint` exits non-zero on `@typescript-eslint/no-unused-vars`         | Reverting the edit restores exit 0        |
| Newly introduced warning-level issue | a violation of a rule deliberately kept at `warn`            | `yarn lint` still exits non-zero — `--max-warnings=0` makes warn == fail  | Reverting the edit restores exit 0        |
| Pre-commit vs CI                     | same working tree                                            | hook and CI run the same `yarn lint` and reach the same pass/fail verdict | Hook exits non-zero and aborts the commit |

</intent-contract>

## Code Map

- `packages/eslint-config/next.mjs` -- preset consumed by `apps/client`; registers `only-warn`. The only preset with measurable impact today.
- `packages/eslint-config/library.mjs`, `packages/eslint-config/react-internal.mjs` -- also register `only-warn`; currently unconsumed by any lint script, but must be cleaned so future consumers inherit real severities.
- `packages/eslint-config/package.json` -- declares `eslint-plugin-only-warn` in `devDependencies`; drop it here and from `yarn.lock`.
- `apps/client/eslint.config.mjs` -- client rule layer (`no-console`, `no-unused-vars`, a11y, `ui/*.tsx` override). Where per-rule baseline decisions and file-scoped overrides belong.
- `apps/client/package.json` -- `"lint": "eslint ."` becomes `eslint . --max-warnings=0`.
- `.husky/pre-commit` -- runs `lint-staged`; must also run `yarn lint` so the hook's verdict covers the same scope CI does.
- `.lintstagedrc.js` (repo root) -- Prettier-only; stays as-is.
- `apps/client/.lintstagedrc.js` -- **pre-existing** per-directory lint-staged config running `eslint --max-warnings=0 --no-warn-ignored` on staged client files. Discovered during verification; it means the hook already linted staged files (see Completion Notes → "Correction to the Intent problem statement"). Stays as-is.
- `.github/workflows/ci.yml` -- `Lint` job already runs `yarn lint`; no edit needed, it simply becomes a real gate.
- `apps/client/src/**/*.stories.tsx` -- 40 files import types from `@storybook/react` (an undeclared dependency) instead of the configured framework package `@storybook/nextjs-vite`.

## Tasks & Acceptance

**Execution:**

- [x] `packages/eslint-config/next.mjs`, `library.mjs`, `react-internal.mjs` -- remove the `onlyWarn` import and the `plugins: { "only-warn": onlyWarn }` block from each; keep `prettier` last -- restores each rule's configured severity.
- [x] `packages/eslint-config/package.json` -- remove the `eslint-plugin-only-warn` devDependency and run `yarn install` so the lockfile drops it -- the plugin must not be resolvable back into the graph.
- [x] `apps/client/src/**/*.stories.tsx` (40 files) -- replace `@storybook/react` type imports with `@storybook/nextjs-vite` -- fixes `storybook/no-renderer-packages` and removes reliance on an undeclared transitive package.
- [x] `apps/client/src/**` -- run `eslint . --fix` to clear the 57 autofixable `react/no-unescaped-entities` findings, then review the diff for unintended entity changes -- mechanical, rendered text must be unchanged.
- [x] `apps/client/src/**` -- clear the 41 `@typescript-eslint/no-unused-vars` findings by deleting genuinely dead bindings or `_`-prefixing intentionally-unused ones (destructuring rest, unused catch params) -- never by widening the ignore pattern.
- [x] `apps/client/eslint.config.mjs` -- add a `files: ["**/*.stories.@(ts|tsx)"]` override turning `no-console` off (Storybook arg handlers legitimately log), and extend the app-level allow list to `["warn", "error", "info"]` -- scopes the 89 `no-console` findings to a deliberate decision instead of a blanket downgrade.
- [x] `apps/client/src/app/api/newsletter/subscribe/route.ts`, `apps/client/src/app/api/shorts/suggest/route.ts` -- convert the 3 informational `console.log` calls to `console.info` -- preserves server-side observability while keeping stray `console.log` banned.
- [x] `apps/client/eslint.config.mjs` -- set `react-hooks/incompatible-library` to `"off"` with an inline comment naming react-hook-form as the cause and marking it for revisit -- the 5 findings are React Compiler advisories caused by a library choice, not fixable in application code.
- [x] `apps/client/src/features/contribute/components/PlayContributionWizard.tsx` -- add a targeted `eslint-disable-next-line react-hooks/refs` with a justification naming the React "adjust state during render" pattern -- the 3 findings are the documented React idiom for deriving animation direction from the previous step.
- [x] `apps/client/src/features/contribute/hooks/useLocalDraft.ts` -- add a targeted `eslint-disable-next-line react-hooks/set-state-in-effect` with a justification -- the mount effect reads `localStorage`, which cannot run during SSR render.
- [x] `apps/client/src/app/[locale]/desktop-prototypes/ticketing/page.tsx` -- resolve `react-hooks/preserve-manual-memoization` by removing or correcting the manual memo so the compiler can optimize; use a justified targeted disable only if the memo is load-bearing.
- [x] `apps/client/src/features/events/hooks/useNearbyEvents.ts`, `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx` -- fix the 2 `react-hooks/exhaustive-deps` findings by correcting the dependency arrays (stabilise the callback rather than suppressing) -- must not change fetch/pagination behaviour.
- [x] `apps/client/src/features/events/components/DateSelector/DateSelector.tsx`, `apps/client/src/features/search/components/SearchBar/SearchBar.tsx` -- fix the 2 `jsx-a11y/role-supports-aria-props` findings by correcting the role/aria pairing -- real accessibility defects.
- [x] `apps/client/src/stories/patterns/PageLayouts.stories.tsx`, `apps/client/src/features/contribute/components/credits/PersonSearchCombobox.tsx`, `apps/client/src/features/events/components/Map/MapMarker.tsx` -- resolve the 4 `@next/next/no-img-element` findings (use `next/image` where the source is a real asset; justify with a targeted disable where a raw `<img>` is required, e.g. dynamic map marker markup).
- [x] `apps/client/package.json` -- change `"lint"` to `"eslint . --max-warnings=0"` -- makes warning-severity rules block, so CI and the hook share one strictness level.
- [x] `.husky/pre-commit` -- append `yarn lint` after the `lint-staged` invocation -- the hook and the CI `Lint` job then run the identical command and cannot disagree.

**Acceptance Criteria:**

- Given the three shared presets, when I grep the repo (including `yarn.lock`), then no reference to `eslint-plugin-only-warn` remains anywhere.
- Given the paid-down tree, when CI runs its `Lint` job (`yarn lint`), then it exits 0 with no `.eslintrc`-era warning noise and with no rule silenced by a blanket mechanism.
- Given every rule whose severity was lowered or whose violations were suppressed, when I read the Design Notes / Completion Notes, then each carries an explicit reason — the count of documented decisions matches the count of relaxations in the config and of `eslint-disable` comments added by this story.
- Given the change is tooling-only, when I run `yarn type-check` and `yarn test`, then both pass exactly as before.
- Given a developer commits a file containing a lint violation, when the pre-commit hook runs, then the commit is rejected with the same failure CI would report.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 2, low 2)
- defer: 3: (high 0, medium 2, low 1)
- reject: 16
- addressed_findings:
  - `[medium]` `[patch]` `DateSelector.tsx`: the previous pass fixed `role-supports-aria-props` by dropping `role="option"`/`aria-selected` from the custom-date chip — but the chip is still a direct child of the `role="listbox"` container, so the listbox now owned a non-`option` child (an `aria-required-children` / WCAG 4.1.2 failure, and AT may prune the chip from the option set entirely). The container was never a real listbox anyway: no roving tabindex, no arrow-key handling, no `aria-activedescendant`, each chip individually tabbable. Changed the container to `role="group"` and the date chips from `role="option"`/`aria-selected` to `aria-pressed`, making every chip a consistent toggle button. Zero rendered-visual change; lint still clean.
  - `[medium]` `[patch]` `.husky/pre-commit`: the skip guard covered `MERGE_HEAD` only. Rebase, cherry-pick and revert conflict-resolution commits replay someone else's work and hit the identical inherited-violation problem, so they would still have forced `--no-verify` — the escape hatch this gate exists to remove. Guard extended to `CHERRY_PICK_HEAD`, `REVERT_HEAD`, and the `rebase-merge` / `rebase-apply` state directories.
  - `[low]` `[patch]` `.husky/pre-commit`: on a fresh clone or a new git worktree (before `yarn install`), the hardcoded `node_modules/.bin/turbo` path aborted every commit with a bare "not found". Added an `-x` check that fails with an actionable "run 'yarn install' first" message.
  - `[low]` `[patch]` `apps/client/.storybook/preview.tsx` still imported `Preview` from `@storybook/react` — the same undeclared transitive package the 40-file story-file swap eliminated. `storybook/no-renderer-packages` does not reach it (not a `*.stories.*` file), so lint could not catch the leftover. Switched to `@storybook/nextjs-vite`; `tsc` resolves it and the error count is unchanged.

Deferred (new ledger entries): DW-169 (four pre-existing whole-file `eslint-disable` blocks the paydown could not see, because a file-level disable emits no finding), DW-170 (newsletter route logs subscriber emails, now via the config-approved `console.info` channel), DW-171 (Chromatic runs `exitZeroOnChanges`/`autoAcceptChanges`, so `addon-a11y` gates nothing).

Rejected (16), the notable ones: the `ShortsDirectory` observer chain-load claim and the `next/image` `remotePatterns` gap were both re-raised and both remain rebutted on the same verified grounds as the first pass; the hook's working-tree-vs-staged scope is an accepted, documented consequence of running exactly the command CI runs; `no-console` being `warn`-severity rather than `error` is the deliberate design that `--max-warnings=0` completes; the `MobilePaymentFields` deleted local and the `useNearbyEvents` offset/abort concerns are behaviour-neutral or unreachable (`loadMore` returns early while `location` is null); the `api/**/*.ts` and `*.stories.@(ts|tsx)` glob-fragility findings describe files that do not exist in the repo. The remainder were rediscoveries of DW-160, DW-162, DW-164, DW-165, DW-166 and DW-167.

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 5, low 2)
- defer: 9: (high 0, medium 6, low 3)
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` `.husky/pre-commit`: the appended `yarn lint` ran unconditionally, bypassing the deliberate `MERGE_HEAD` skip — a merge/conflict-resolution commit inheriting a violation from either parent could only be made with `--no-verify`, reintroducing the exact escape hatch this story removes. Both steps are now inside a single `if MERGE_HEAD … else … fi`.
  - `[medium]` `[patch]` `.husky/pre-commit`: with a second command appended, the hook's exit status became `yarn lint`'s alone, silently swallowing a `lint-staged` failure. Added `set -e`.
  - `[medium]` `[patch]` `DateSelector.tsx`: the `role-supports-aria-props` fix deleted the static `aria-haspopup="dialog"`, but Radix's `PopoverTrigger asChild` injects it at runtime, so the invalid `role="option"` + `aria-haspopup` pairing persisted in the rendered DOM — a silenced rule, not a fixed defect. Dropped `role="option"`/`aria-selected` instead and conveyed selection with `aria-pressed`.
  - `[medium]` `[patch]` `apps/client/eslint.config.mjs`: `console.info` was allowed app-wide while the stated rationale covered only route handlers, letting browser-shipped components log unnoticed. Re-scoped under `files: ["src/app/api/**/*.ts"]`.
  - `[medium]` `[patch]` `desktop-prototypes/ticketing/page.tsx`: the `useMemo` was removed on the false premise that the React Compiler would memoize the call (no `reactCompiler` flag and no `babel-plugin-react-compiler` in this repo). Restored the `useMemo` around the extracted pure function; lint stays clean.
  - `[low]` `[patch]` `TicketScanner.tsx` / `MapMarker.tsx`: deleting the unused `onScan` / `isSelected` bindings removed the last automated signal that these still-declared public props do nothing. Documented the gap on each prop's JSDoc (the underlying features are deferred, below).
  - `[low]` `[patch]` Completion Notes reported `apps/client` `tsc --noEmit` as "92 before → 91 after"; the real current count is 61. Since that measurement was the sole stated evidence for the 40-file Storybook import swap, the figure was retracted, re-measured, and the swap re-evidenced (no module-resolution or `Meta`/`StoryObj` errors remain).

## Design Notes

**Measured true baseline** (with `only-warn` removed, `apps/client`, 2026-08-03): **245 problems = 142 errors + 103 warnings** — `no-console` 89 (warn), `react/no-unescaped-entities` 57 (error, autofixable), `@typescript-eslint/no-unused-vars` 41 (error), `storybook/no-renderer-packages` 40 (error), `react-hooks/incompatible-library` 5 (warn), `@next/next/no-img-element` 4 (warn), `react-hooks/refs` 3 (error), `react-hooks/exhaustive-deps` 2 (warn), `jsx-a11y/role-supports-aria-props` 2 (warn), `react-hooks/preserve-manual-memoization` 1 (error), `react-hooks/set-state-in-effect` 1 (error). The 2026-07-14 proposal quoted 266; the tree has since drifted. Re-measure before starting and reconcile any delta in Completion Notes — do not assume these exact counts.

**Why the hook runs `yarn lint` in addition to `lint-staged`:** `apps/client/.lintstagedrc.js` already lints **staged** files (this was missed during planning — see Completion Notes → "Correction to the Intent problem statement"). Staged-file linting cannot catch a change in file A that breaks a rule in an unstaged file B, so it does not reproduce CI's verdict. Running the repo-wide `yarn lint` — the exact command CI's `Lint` job runs — closes that scope gap by construction. Turborepo caches the task, so an unchanged tree re-lints in well under a second (~8s cold).

**Rule-relaxation ledger** (FINAL state as implemented; every entry carries a reason):

| Rule                               | Scope of relaxation                                                                                                                                                | Reason                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-console`                       | allow list widened to `["warn", "error", "info"]` **only** under `files: ["src/app/api/**/*.ts"]` (still `warn` severity, still blocking under `--max-warnings=0`) | Route handlers run on the server and have no structured logger yet, so `console.info` is their observability channel. Scoped to API routes in the review pass — an app-wide widening would have let browser-shipped components log unnoticed, which is broader than the rationale. |
| `no-console`                       | `"off"` in a `files: ["\*_/_.stories.@(ts                                                                                                                          | tsx)"]` override                                                                                                                                                                                                                                                                   | Storybook arg handlers demonstrate callbacks by logging them (the documented CSF idiom); story files never ship to production. 86 of the 89 findings live here.                  |
| `@next/next/no-img-element`        | `"off"` in the same `\*_/_.stories.@(ts                                                                                                                            | tsx)` override                                                                                                                                                                                                                                                                     | Stories are isolated fixtures rendered by Storybook, not Next.js pages — the LCP/bandwidth rationale does not apply, and the remote placeholder art has no intrinsic dimensions. |
| `@next/next/no-img-element`        | 1 targeted `eslint-disable-next-line` (`MapMarker.tsx:97`)                                                                                                         | Rendered inside a Leaflet popup portal; the logo is sized `h-12 w-auto` with unknown intrinsic dimensions, which `next/image` cannot express without changing rendered layout.                                                                                                     |
| `react-hooks/incompatible-library` | 5 targeted `eslint-disable-next-line` comments (rule stays **on**)                                                                                                 | `react-hook-form`'s `watch()` returns a fresh subscription the React Compiler cannot memoize. Matches the two suppressions the codebase already had. Revisit on a compiler-safe RHF API.                                                                                           |
| `react-hooks/set-state-in-effect`  | 1 targeted `eslint-disable-next-line` (`useLocalDraft.ts:43`)                                                                                                      | `localStorage` is browser-only, so the draft cannot be read during SSR render; a mount effect is the only place this state can be seeded.                                                                                                                                          |

Deviations from the pre-written ledger (both are strictly narrower / stronger):

- `react-hooks/incompatible-library` was **not** turned off repo-wide. The codebase already
  suppressed it per-site (`DataTable.tsx:59`, `MediaStep.tsx:146`); turning it off repo-wide made
  those two directives dead and widened the blast radius. Five targeted disables were used instead.
- `react-hooks/refs` needed **zero** disables. The three findings were fixed by switching
  `PlayContributionWizard` from a ref to the documented React "adjusting state when a prop changes"
  pattern with `useState`, which is behaviour-identical and removes the render-time ref read.

## Completion Notes

**Reconciled baseline.** Measured after removing `only-warn` from the three presets, in `apps/client`
(`npx eslint . -f json`): **245 problems = 143 errors + 102 warnings**. Every per-rule count matches
the Design Notes exactly; only the error/warning split differed (spec said 142/103), and the spec's
own per-rule table sums to 143/102 — the split in the prose was arithmetically off by one. No tree drift.

**Correction to a Design Notes assumption:** `react/no-unescaped-entities` is **not** autofixable —
`eslint . --fix` cleared zero of the 57. They were fixed by a scripted, position-driven character
replacement (`'` → `&apos;`, `"` → `&quot;`) driven off the ESLint JSON report, so only the exact
offending JSX text characters changed. The resulting diff was reviewed: every hunk is JSX text; no
attribute value, string literal, or i18n key was touched.

**Per-rule decision ledger (all 11 baseline rules):**

| Rule                                      | Count | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-console`                              | 89    | **Downgrade (scoped)** — 3 fixed (`console.log` → `console.info` in API routes), 86 covered by the stories override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `react/no-unescaped-entities`             | 57    | **Fixed** — all 57 escaped in place (17 files).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `@typescript-eslint/no-unused-vars`       | 41    | **Fixed** — 23 dead imports deleted, 8 dead locals deleted, 3 dead destructured bindings dropped, 3 array-destructure elisions, 2 args `_`-prefixed, 2 unused props dropped from destructuring. Ignore pattern untouched.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `storybook/no-renderer-packages`          | 40    | **Fixed** — `@storybook/react` → `@storybook/nextjs-vite` in all 40 story files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `react-hooks/incompatible-library`        | 5     | **Downgrade (targeted)** — 5 `eslint-disable-next-line` with justification; rule stays on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@next/next/no-img-element`               | 4     | **Mixed** — 1 fixed (`next/image` in `PersonSearchCombobox`), 1 targeted disable (`MapMarker`), 2 covered by the stories override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `react-hooks/refs`                        | 3     | **Fixed** — ref-during-render replaced with the documented `useState` "adjust state during render" pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `react-hooks/exhaustive-deps`             | 2     | **Fixed** — `useNearbyEvents` depends on primitive lat/lng; `ShortsDirectory.handleLoadMore` wrapped in `useCallback` and added to the observer effect deps. Fetch/pagination behaviour unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `jsx-a11y/role-supports-aria-props`       | 2     | **Fixed** — `SearchBar`: added `role="combobox"` to the search input that already carried `aria-expanded`/`aria-controls`/`aria-activedescendant`. `DateSelector`: dropped the invalid `role="option"`/`aria-selected` from the custom-date chip and conveyed selection with `aria-pressed`. (Review pass: the first attempt deleted the static `aria-haspopup` instead — but the chip is a Radix `PopoverTrigger asChild`, which injects `aria-haspopup`/`aria-expanded`/`aria-controls` at runtime, so the invalid `role="option"` + `aria-haspopup` pairing survived in the rendered DOM and only ESLint's static view changed. The role was the wrong half to keep.) |
| `react-hooks/preserve-manual-memoization` | 1     | **Fixed** — the lookup body was extracted to a module-level pure `findShowtimeDetails()` so the memo's only dependency is the id. (Review pass: the `useMemo` was initially dropped entirely on the false premise that the React Compiler would memoize it — the compiler is not enabled in this repo — and has been restored.)                                                                                                                                                                                                                                                                                                                                          |
| `react-hooks/set-state-in-effect`         | 1     | **Downgrade (targeted)** — 1 `eslint-disable-next-line` with justification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**`eslint-disable` comments added by this story (7 total):**

| File:line                                                                         | Rule                               | Reason                                                                                   |
| --------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/client/src/features/events/components/Map/MapMarker.tsx:97`                 | `@next/next/no-img-element`        | Leaflet popup portal; `h-12 w-auto` sizing has no intrinsic dimensions for `next/image`. |
| `apps/client/src/features/contribute/hooks/useLocalDraft.ts:43`                   | `react-hooks/set-state-in-effect`  | `localStorage` is browser-only; cannot be read during SSR render.                        |
| `apps/client/src/features/auth/components/RegisterForm/RegisterForm.tsx:169`      | `react-hooks/incompatible-library` | `react-hook-form` `watch()` is not compiler-memoizable.                                  |
| `apps/client/src/features/contribute/components/steps/BasicsStep.tsx:81`          | `react-hooks/incompatible-library` | same                                                                                     |
| `apps/client/src/features/contribute/components/steps/CreditsStep.tsx:119`        | `react-hooks/incompatible-library` | same                                                                                     |
| `apps/client/src/features/contribute/components/steps/ReviewStep.tsx:141`         | `react-hooks/incompatible-library` | same                                                                                     |
| `apps/client/src/features/contribute/components/steps/TheatreDetailsStep.tsx:153` | `react-hooks/incompatible-library` | same                                                                                     |

(The two pre-existing `react-hooks/incompatible-library` disables in `DataTable.tsx` and
`MediaStep.tsx` were left untouched; `--report-unused-disable-directives` confirms none of the
seven new directives is redundant.)

**Lockfile note.** `eslint-plugin-only-warn` was also present in the tracked (stale, npm-generated)
`package-lock.json`. The two entries were removed surgically so the plugin is unresolvable from
either lockfile; the rest of `package-lock.json` was not regenerated (npm is not this repo's package
manager — `only-allow yarn` is enforced).

**Verification results (2026-08-03):**

| Command                                                                | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn lint`                                                            | **exit 0**, `@tiween/client:lint: eslint . --max-warnings=0` → 0 problems.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `grep -rn "only-warn" --exclude-dir=node_modules --exclude-dir=.git .` | no hits outside `_bmad-output/` planning prose (verified with `--exclude-dir=_bmad-output` → exit 1).                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Enforcement probe (`const probe: any = 1`)                             | `yarn lint` **exit 1** citing `@typescript-eslint/no-explicit-any`; after revert **exit 0**. Confirmed directly in `apps/client` too (turbo cache miss).                                                                                                                                                                                                                                                                                                                                                              |
| Warning probe (`console.log("warn-probe")`, warn severity)             | `yarn lint` **exit 1** — `--max-warnings=0` is live; after revert **exit 0**.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `yarn type-check`                                                      | **exit 1 — pre-existing failure in `apps/strapi`**, 3 × TS2339 in `plugins/user-engagement/server/src/services/watchlist.ts`. Byte-identical on the stashed baseline tree. Not in scope (Story 1.11 territory); the client is not part of this turbo task.                                                                                                                                                                                                                                                            |
| `apps/client` `tsc --noEmit`                                           | ~~92 before → 91 after~~ — **those figures were wrong and are retracted** (see Review pass corrections). Actual, re-measured: **61 errors** (`npx tsc --noEmit --pretty false \| grep -c "error TS"`), all pre-existing and unrelated. The `@storybook/nextjs-vite` swap is confirmed sound: story files _are_ in the tsconfig `include`, and every remaining story-file error is content-level (props/types inside the story), with zero module-resolution or `Meta`/`StoryObj` errors.                              |
| `yarn test`                                                            | **exit 1 — pre-existing**: the turbo task depends on `@tiween/admin#build`, which fails on the same 3 Strapi TS2339 errors. The client suite itself: **63 files / 616 tests, all passing**, unchanged.                                                                                                                                                                                                                                                                                                                |
| `yarn workspace @tiween/client run build-storybook`                    | **exit 1 — pre-existing**: `SB_CORE-SERVER_0002 CriticalPresetLoadError` while loading `@storybook/addon-docs`; the committed `yarn.lock` pins `@storybook/addon-docs@10.4.6` against `storybook@10.1.11`, and `10.4.6`'s preset imports `Tag` from `storybook/internal/core-server`, which `10.1.11` does not export. Reproduced identically on the stashed baseline tree; it fails at preset load, before any story file is parsed. Import-swap soundness was instead proven via TypeScript resolution (see above). |
| `prettier --check` on changed files                                    | Clean except the 4 files already unformatted at baseline (`apps/client/eslint.config.mjs`, the 3 `packages/eslint-config/*.mjs`) — left as-is to avoid unrelated churn.                                                                                                                                                                                                                                                                                                                                               |

**Correction to the Intent problem statement (found during post-implementation verification).**
The Intent claims "the pre-commit hook runs Prettier only and never lints, so no gate exists at any
level." That is wrong: a **pre-existing** `apps/client/.lintstagedrc.js` (committed in `1dc248e`)
already ran `eslint --max-warnings=0 --no-warn-ignored` on staged client files, and lint-staged
resolves the nearest config per directory. The planning investigation only read the root
`.lintstagedrc.js` and missed it. What was actually true — and what the 2026-07-14 proposal
described correctly — is that the hook was the **sole** gate: because `only-warn` made every rule a
warning, `turbo lint`/CI (no `--max-warnings`) could not fail, while the hook's `--max-warnings=0`
did fail, which is why DW-21 needed `--no-verify`. The fix delivered here is unchanged and still
correct; only the "no gate exists at any level" phrasing was inaccurate. Consequences:

- The hook and CI now agree on **strictness** (both `--max-warnings=0`, real severities) and, thanks
  to the appended `yarn lint`, on **scope** as well. Staged-file linting alone cannot catch a change
  in file A that breaks a rule in unstaged file B, so the repo-wide run is not redundant — but it
  does add ~8s (cold; Turborepo-cached otherwise) on top of lint-staged's per-file pass.
- The intent-contract is read-only at this step; this correction is recorded here for the review pass.

**Post-implementation hook verification (end-to-end, run by the orchestrator):** staged a file
containing `export const hookProbe: any = 1` and ran a real `git commit`. Result: **exit 1**,
`husky - pre-commit script failed (code 1)`, ESLint reporting `@typescript-eslint/no-explicit-any`,
and `HEAD` unmoved at `6602af8`. The probe file was removed and unstaged afterwards.

**Open follow-ups surfaced (not fixed here, out of scope):**

- `apps/strapi` type errors block `yarn type-check` and `yarn test` repo-wide → Story 1.11.
- `apps/client` has 91 pre-existing `tsc --noEmit` errors that no CI task currently runs.
- `yarn.lock` pins an incompatible `@storybook/addon-docs` / `storybook` pair, so `build-storybook` cannot succeed on any commit.

## Verification

**Commands:**

- `yarn lint` -- expected: exit 0, `0 problems`, run from a clean tree after the paydown.
- `grep -rn "only-warn" --exclude-dir=node_modules --exclude-dir=.git .` -- expected: no hits outside `_bmad-output/` planning prose.
- Enforcement probe: add `const probe: any = 1` to a client `.tsx` file, run `yarn lint` -- expected: non-zero exit citing `@typescript-eslint/no-explicit-any`; revert and re-run -- expected: exit 0.
- Warning probe: temporarily set a paid-down rule back to `warn` and reintroduce one violation, run `yarn lint` -- expected: non-zero exit (proves `--max-warnings=0` is live); revert.
- `yarn type-check` -- expected: **unchanged from baseline** — currently exit 1 on 3 pre-existing `apps/strapi` TS2339 errors in `plugins/user-engagement/server/src/services/watchlist.ts`. No `apps/strapi` file is touched by this story, so any _new_ failure here is a regression.
- `yarn test` -- expected: **unchanged from baseline** — the root turbo task is exit 1 because it depends on `@tiween/admin#build`, which fails on the same 3 Strapi errors. The client suite run directly (`yarn workspace @tiween/client test`) must be exit 0 with 63 files / 616 tests passing.
- `yarn workspace @tiween/client run build-storybook` -- expected: **unchanged from baseline** — currently exit 1 with `SB_CORE-SERVER_0002` while loading `@storybook/addon-docs`, i.e. at preset load, before any story file is parsed (an incompatible lockfile pin, not a story-code problem). Because this cannot validate the import swap, validate it instead with `yarn workspace @tiween/client run typecheck` and confirm no `@storybook/nextjs-vite` module-resolution or `Meta`/`StoryObj` type errors appear.

**Manual checks (if no CLI):**

- Inspect the `--fix` diff for `react/no-unescaped-entities`: only apostrophes/quotes inside JSX text should change to entities; no attribute, string-literal, or translation-key content may be touched.

## Auto Run Result

Status: done

### Summary

Client ESLint enforcement is real. `eslint-plugin-only-warn` — which downgraded every rule in all
three shared presets to a warning — is gone, `apps/client`'s lint script runs
`eslint . --max-warnings=0`, and the pre-commit hook runs the same repo-wide lint task the CI `Lint`
job runs. The 245 violations that surfaced once severities became real were paid down: 148 fixed
outright, 97 covered by six narrowly-scoped, individually-justified relaxations. Introducing an
`any`, an unused variable, or any warning-severity violation now fails both the hook and CI.

This follow-up review pass applied 4 further patches. Two are consequential: the date-filter chip
strip's ARIA structure (the first pass's own fix left a `listbox` owning a non-`option` child) and
the pre-commit skip guard (it covered merges but not rebase / cherry-pick / revert, so conflict
resolution during those would still have forced `--no-verify`).

### Files changed

- `packages/eslint-config/{next,library,react-internal}.mjs` — `only-warn` plugin removed from all three presets.
- `packages/eslint-config/package.json`, `yarn.lock`, `package-lock.json` — `eslint-plugin-only-warn` dropped from the dependency graph.
- `apps/client/package.json` — `lint` script gains `--max-warnings=0`.
- `apps/client/eslint.config.mjs` — stories override (`no-console`, `@next/next/no-img-element` off) and an API-routes-only `console.info` allowance.
- `.husky/pre-commit` — `set -e`; `lint-staged` and the repo-wide lint run inside one guard that now skips merge, rebase, cherry-pick and revert; turbo resolved via the repo-local binary with an actionable missing-binary message.
- `apps/client/.storybook/preview.tsx` — `@storybook/react` → `@storybook/nextjs-vite` (the leftover the 40-file story swap missed).
- 40 `*.stories.tsx` — `@storybook/react` → `@storybook/nextjs-vite` type imports.
- `DateSelector.tsx` — chip strip is a `role="group"` of `aria-pressed` toggle buttons rather than a listbox it never implemented; `SearchBar.tsx` — `role="combobox"` added to the input already carrying the combobox ARIA props.
- 17 files — JSX apostrophes/quotes escaped; ~25 files — unused bindings removed or `_`-prefixed.
- `useNearbyEvents.ts`, `ShortsDirectory.tsx`, `desktop-prototypes/ticketing/page.tsx`, `PlayContributionWizard.tsx`, `useLocalDraft.ts` — React-hooks findings fixed or justifiably suppressed.
- `PersonSearchCombobox.tsx` (`next/image`), `MapMarker.tsx`, `TicketScanner.tsx` — image and dead-prop handling.
- `_bmad-output/implementation-artifacts/{epic-1-context.md,deferred-work.md,sprint-status.yaml}` — epic context compiled, 12 deferred entries added across both passes, story marked done.

### Review findings

Two full review passes, each running the adversarial, edge-case and verification-gap reviewers in
parallel. **First pass:** 0 intent_gap, 0 bad_spec, 7 patches, 9 deferred (DW-159 … DW-168), 6
rejected. **Follow-up pass:** 0 intent_gap, 0 bad_spec, 4 patches, 3 deferred (DW-169 … DW-171), 16
rejected. Both passes are itemised in the Review Triage Log above.

The follow-up pass is notable mostly for what it did _not_ change: the two most-repeated findings
(the `ShortsDirectory` infinite-scroll chain-load and the `next/image` `remotePatterns` gap) were
re-raised independently by two reviewers and remain rejected on the same verified grounds as the
first pass. Twelve of the sixteen rejections were rediscoveries of already-open ledger entries.

### Verification

| Check                                                                                    | Result                                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `turbo lint --force` (== CI's `yarn lint`)                                               | exit **0**, 0 problems                                                                     |
| `apps/client` `npx tsc --noEmit`                                                         | **61 errors, all pre-existing and unchanged**; none in `preview.tsx` or `DateSelector.tsx` |
| `npx vitest run` in `apps/client`                                                        | **63 files / 616 tests passed**                                                            |
| `sh -n .husky/pre-commit`                                                                | syntax OK; `rebase-merge`/`rebase-apply` probes correctly report absent on a clean tree    |
| `npx prettier --check` on the changed `.tsx` files                                       | clean (`.husky/pre-commit` has no Prettier parser, as before)                              |
| Earlier-pass probes (enforcement `any`/unused/warn, real `git commit`, `grep only-warn`) | unchanged and still passing — see the first pass's table above                             |

### Residual risks

- **The gate covers `apps/client` only.** It is the sole workspace with a `lint` script, so the
  restored severities in `library.mjs` / `react-internal.mjs` enforce nothing until a consumer exists
  (DW-162). `apps/strapi` joins in story 1.11.
- **The a11y changes have no automated backstop.** `DateSelector` and `SearchBar` have no vitest
  tests, and Chromatic cannot fail a build (DW-171), so the `role="group"` / `aria-pressed` contract
  rests on manual reasoning about the ARIA spec. The change is attribute-only — no rendered visual or
  DOM-structure difference — which bounds the blast radius but does not verify the semantics.
- **The Storybook import swap is verified only by `tsc`**, run manually: `turbo type-check` skips the
  client (DW-159), vitest excludes story files, and `build-storybook` is broken (DW-163).
- **Commit latency.** Every non-replay commit runs ESLint twice: `lint-staged` per staged file plus
  the repo-wide lint (~8s cold, Turborepo-cached otherwise).
- **Unused-var paydown removed signals, not defects.** Six pre-existing dead code paths lost their
  last automated warning; each is recorded (DW-164 … DW-167) and the two misleading public props
  carry a "NOT WIRED UP" JSDoc note.
- **Blanket disables one scope level down survived both passes' automation** — they emit no ESLint
  finding, so only a deliberate audit will surface them (DW-169).
- **The Intent's problem statement was partly wrong** — a pre-existing `apps/client/.lintstagedrc.js`
  already linted staged files. The delivered fix is unaffected; see the correction in Completion Notes.
