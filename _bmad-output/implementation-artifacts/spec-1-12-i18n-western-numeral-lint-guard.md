---
title: "Story 1.12: i18n Western-numeral lint guard"
type: "chore"
created: "2026-08-03"
status: "done"
baseline_revision: "8bf5c6a71007db39969bbb7b1bc64f403eb423db"
final_revision: "d9f5762" # follow-up review pass; this line is recorded in the next commit
review_loop_iteration: 0
followup_review_recommended: false # follow-up pass found no intent gap and no spec defect; its 5 patches (1 medium, 4 low) are localized guard hardenings, each pinned by a new RuleTester case — the substantive remaining findings are deferred (DW-190…DW-195), not code awaiting another look
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The "Arabic must render Western numerals" rule (`project-context.md:110`, `:173`) is enforced only by convention plus six story-local unit tests, and it has already regressed twice (5.4, 5.5). Nothing mechanical stops a third recurrence: ~18 client call sites pass a raw/dynamic locale to `Intl.*` or `toLocale*String`, and `apps/client/locales/ar.json:438` still ships the exact 5.5 bug (an ICU `#` inside a plural). Worse, **the defect is invisible on this toolchain**: under Node 22 / ICU 77 both `ar` and `ar-TN` resolve to `numberingSystem: latn`, so every existing runtime test passes while the same code renders `٣` on an ICU/CLDR build where `ar` defaults to `arab`. A guard that only observes local runtime output is therefore worthless.

**Approach:** Enforce statically. Author the repo's first local ESLint rule, `@tiween/western-numerals`, which fails any `Intl.{NumberFormat,DateTimeFormat,RelativeTimeFormat,PluralRules,ListFormat}` construction or `toLocale{,Date,Time}String` call whose locale argument is not _provably_ numeral-safe, wire it as an **error** in `apps/client`, and pay the surfaced sites down through one new shared helper (`toNumeralSafeLocale`). Cover the second, AST-invisible surface (ICU messages) with a worst-case vitest gate that renders every `ar.json` message under a forced `ar-u-nu-arab` locale and rejects any Arabic-Indic output.

## Boundaries & Constraints

**Always:**

- The lint rule is **fail-closed**: a locale expression passes only if it is (a) a string literal or expression-free template whose primary language subtag is in an explicit allowlist option, (b) a literal/template whose static text contains `-u-nu-latn`, or (c) a direct call to an allowlisted helper identifier (`toNumeralSafeLocale`). Anything else — a bare identifier, a ternary, a template with an interpolation, or a **missing** locale argument — errors.
- Every paydown edit is **behavior-preserving**: the rendered _words_ must not change in any locale. Sites that today resolve `ar` to a French locale keep doing so (wrapped by the helper); sites that resolve `ar` to `ar-TN` keep Arabic words and gain a guaranteed `latn` numbering system.
- The rule is unit-tested with ESLint's `RuleTester`, covering both a valid and an invalid case for every branch of the safety check, and that test must run inside the existing CI `Test` job.
- The `ar.json` guard asserts against **`ar-u-nu-arab`**, not `ar` — a guard measured on a `latn`-defaulting ICU proves nothing.
- Zero `eslint-disable` comments for this rule. If a site cannot pass, it is fixed or the story blocks.

**Block If:**

- A surfaced call site cannot be made rule-clean without changing rendered words, changing a component's public props beyond an additive optional prop, or altering a non-display value (a cache key, a sort key, an API payload).
- `RuleTester` cannot be run in any workspace without adding a new third-party dependency.

**Never:**

- Do not extend the rule to `apps/strapi` in this story — its admin surface has ~7 unguarded sites, no React lint rules and no `tsc` coverage (DW-176/DW-177); record it as deferred work instead.
- Do not resolve the "HomePage prints French month names inside Arabic copy" product question — it is a wording decision, not a numeral decision. Preserve current wording and defer.
- Do not enable type-aware linting, edit `.github/workflows/ci.yml`, `turbo.json`, `.husky/pre-commit`, or `apps/strapi/**`.
- Do not migrate `formatDate`'s French-words-for-Arabic idiom, add `numberingSystem` to next-intl global `formats` (bare ICU args ignore named formats — measured), or reformat unrelated files with `yarn format` (see 1.11's note; use `npx prettier --write <paths>`).

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                                                         | Expected Output / Behavior                                | Error Handling                    |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| Allowlisted literal locale   | `new Intl.NumberFormat("fr-TN")`, `d.toLocaleDateString("en-CA")`     | No report — `fr`/`en` are in `allowedLanguageSubtags`     | No error expected                 |
| Explicit numbering extension | ``new Intl.DateTimeFormat(`${locale}-u-nu-latn`)``                    | No report — static text carries `-u-nu-latn`              | No error expected                 |
| Allowlisted helper call      | `new Intl.NumberFormat(toNumeralSafeLocale(locale))`                  | No report — callee matches `safeLocaleHelpers`            | No error expected                 |
| Raw dynamic locale (5.4 bug) | `new Intl.RelativeTimeFormat(locale)`                                 | **Error** `unsafeLocale`                                  | Non-zero lint exit is the outcome |
| Unsafe literal locale        | `d.toLocaleDateString("ar-TN")`                                       | **Error** — `ar` is not allowlisted, no `-u-nu-latn`      | Same                              |
| Ternary locale               | `d.toLocaleTimeString(l === "ar" ? "ar-TN" : l)`                      | **Error** — not a provably safe form                      | Same                              |
| Missing locale argument      | `count.toLocaleString()`                                              | **Error** `missingLocale` — falls back to runtime default | Same                              |
| ICU `#` in a plural (5.5)    | `ar.json` message containing `#`, rendered at `ar-u-nu-arab` with `3` | **Test fails** — output contains `٣`                      | Vitest assertion failure          |
| Pre-formatted ICU param      | Same message rewritten to `{display}` fed by `toNumeralSafeLocale`    | Test passes — Latin digits even under `ar-u-nu-arab`      | No error expected                 |

</intent-contract>

## Code Map

- `packages/eslint-config/` -- shared flat-config presets (`library`/`next`/`react-internal`), `"type": "module"`, exports map, **no `scripts` block and no test runner today**. Host for the new rule.
- `apps/client/eslint.config.mjs` -- consumes `@tiween/eslint-config/next` + `tseslint.configs.recommended`; not type-aware. Wire the new plugin here (client-only).
- `apps/client/src/lib/dates.ts:145` -- `formatRelativeTime`; already correct (`ar → "ar-u-nu-latn"`) but via a local variable the rule cannot see. Also `formatDate:42-45`, the French-words-for-Arabic idiom (dayjs, out of the rule's scope).
- `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx:16-23` -- `formatCount`, 5.5's fix; correct but misplaced in a component file. Becomes the shared helper's first consumer.
- `apps/client/src/features/tickets/utils/formatShowtimeLabel.ts:16` -- already rule-clean (template ending `-u-nu-latn`); the golden example.
- Flagged, dynamic/absent locale (12 files, 18 sites): `src/features/contribute/hooks/useLocalDraft.ts:105`; `src/features/tickets/components/TicketingPageDesktop/TicketingPageDesktop.tsx:184,192`; `src/features/tickets/components/DateSelectorDesktop/DateSelectorDesktop.tsx:106-118`; `src/features/events/components/DateSelector/DateSelector.tsx:99,290`; `src/features/events/components/HomePage/{HomePage.tsx:367,HomePageWithCity.tsx:341}`; `src/features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx:702,711,745`; `src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx:511`; `src/features/scanner/components/AttendanceCounter/AttendanceCounter.tsx:172,176,233,236,277` (no locale arg at all; presentational, `labels` prop, no locale in scope).
- Rule-clean literals needing no edit: `EventCard.tsx:99,107`, `EventDateFilter.tsx:89`, `TicketQR.tsx:119`, `ValidationResult.tsx:126`, `lib/strapi-api/content/events-extended.ts:93` (`en-CA`, a **cache key** — must stay literal), `src/app/[locale]/desktop-prototypes/**`.
- `apps/client/locales/{ar,fr,en}.json:438` -- `search.resultsFor`, the single measured ICU violation (`#` inside a plural). Consumed at `src/app/[locale]/search/SearchPageClient.tsx:314` via `resultsLabels.resultsFor(count, q)`.
- `apps/client/vitest.config.ts:73+` -- `test.include` is an explicit allowlist; a new test file is invisible unless its glob is added.
- `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml}` -- ledger + story status.

## Tasks & Acceptance

**Execution:**

- [x] `packages/eslint-config/rules/western-numerals.mjs` -- **create** the rule (plain ESLint rule object, no `@typescript-eslint/utils` dependency): report `NewExpression`/`CallExpression` on the five `Intl.*` constructors and the three `toLocale*String` methods unless the locale argument is provably safe; options `{ allowedLanguageSubtags: string[] = ["fr","en"], safeLocaleHelpers: string[] = ["toNumeralSafeLocale"] }`; messages `unsafeLocale` and `missingLocale`, each naming the helper in its text -- one place expresses the whole invariant.
- [x] `packages/eslint-config/plugin.mjs` -- **create**; export `{ meta: { name: "@tiween" }, rules: { "western-numerals": rule } }` -- flat-config plugins must be objects, not module paths.
- [x] `packages/eslint-config/package.json` -- add `"./plugin": "./plugin.mjs"` to `exports`, `plugin.mjs`/`rules` to `files`, `"test": "node --test rules/*.test.mjs"`, and `eslint` to `devDependencies` -- `turbo test` (hence CI's Test job) runs any package that declares a `test` script; `eslint` must be declared because the test imports `RuleTester` from it.
- [x] `packages/eslint-config/rules/western-numerals.test.mjs` -- **create** a `node:test` + ESLint `RuleTester` suite covering every row of the I/O matrix (valid: allowlisted literal, `-u-nu-latn` template, helper call; invalid: bare identifier, unsafe literal, ternary, missing argument) plus one case per guarded API -- the rule is itself production code and must not regress silently.
- [x] `apps/client/src/lib/intl-locale.ts` -- **create** the single shared helper: `toNumeralSafeLocale(locale?: string, fallback = "fr-TN"): string`, returning the input untouched when it already carries `-u-nu-`, else appending `-u-nu-latn` -- gives every call site one rule-clean, self-documenting form. Co-locate `intl-locale.test.ts`.
- [x] `apps/client/eslint.config.mjs` -- register the plugin and set `"@tiween/western-numerals": "error"` for the whole workspace (no test/story exemption) -- `--max-warnings=0` already makes hook, `turbo lint` and CI share one strictness level.
- [x] `apps/client/src/lib/dates.ts` -- route `formatRelativeTime`'s locale through `toNumeralSafeLocale` -- preserves today's exact output while making the guarantee visible to the rule.
- [x] `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx` -- reimplement `formatCount` over `toNumeralSafeLocale` (keep the export and the `try/catch` fallback so its tests are untouched) -- removes the duplicated idiom 5.5 introduced.
- [x] `apps/client/src/features/contribute/hooks/useLocalDraft.ts`, `.../TicketingPageDesktop.tsx`, `.../DateSelectorDesktop.tsx`, `.../DateSelector.tsx`, `.../EventDetailPageDesktop.tsx`, `.../EventDetailPageWithMap.tsx` -- wrap each flagged locale expression in `toNumeralSafeLocale(...)`, keeping the existing expression (including `ar → "ar-TN"` ternaries) intact inside the call -- mechanical, word-preserving, and it upgrades six real Arabic-Indic exposures.
- [x] `apps/client/src/features/events/components/HomePage/{HomePage,HomePageWithCity}.tsx` -- wrap the existing `locale === "ar" ? "fr-TN" : \`${locale}-TN\``expression in`toNumeralSafeLocale(...)` **without** touching the French-words branch -- numerals are this story's scope; wording is not.
- [x] `apps/client/src/features/scanner/components/AttendanceCounter/AttendanceCounter.tsx` -- add an **optional** `locale?: string` prop (default `"fr-TN"`, matching the component's French `defaultLabels`) and replace all five bare `toLocaleString()` calls with the helper -- a no-locale call silently inherits the runtime default, the worst of the failure modes; the prop keeps the change additive.
- [x] `apps/client/locales/{ar,fr,en}.json` -- rewrite `search.resultsFor`'s ICU `#` to a pre-formatted `{display}` argument in all three locales (keep `{count}` for plural selection), following 5.5's `pendingChanges` precedent -- `#` is formatted by ICU with the message locale and cannot be made numeral-safe from inside the message.
- [x] `apps/client/src/app/[locale]/search/SearchPageClient.tsx` -- pass `display: toNumeralSafeLocale`-formatted count alongside `count` -- the only consumer of that message.
- [x] `apps/client/src/lib/icu-numerals.test.ts` -- **create** the catalog-wide gate: flatten `ar.json`, render every message through next-intl's `createTranslator` at locale `ar-u-nu-arab` feeding `3` for every `{param}`, assert no `[٠-٩۰-۹]` in any output -- catches any future ICU `#` or number-typed argument across all 568 messages regardless of the host ICU's defaults.
- [x] `apps/client/vitest.config.ts` -- add `src/lib/icu-numerals.test.ts` and `src/lib/intl-locale.test.ts` to `test.include` -- the allowlist makes new tests invisible otherwise.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- open DW entries for: the ~7 unguarded `apps/strapi` admin sites (rule not extended there), the HomePage French-month-names-in-Arabic wording question, and `formatDate`'s dayjs French-words idiom (outside any `Intl` AST the rule can see) -- each is a deliberate, named exclusion rather than an oversight.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- set `1-12-i18n-western-numeral-lint-guard` to `done` and flip the Epic 5 numeral action item's `status` from `specced` to `done`.

**Acceptance Criteria:**

- Given the wired rule, when I add `new Intl.NumberFormat(locale)` (a verbatim 5.4 reintroduction) to any `apps/client/src` file and run root `corepack yarn lint`, then it **fails** on `@tiween/western-numerals`; reverting makes it pass.
- Given the ICU gate, when I restore `#` into `ar.json`'s `search.resultsFor` and run `corepack yarn workspace @tiween/client test`, then `icu-numerals.test.ts` **fails**; reverting makes it pass.
- Given the paid-down tree, when I run root `corepack yarn lint`, then it exits 0 with `@tiween/client#lint` and `@tiween/admin#lint` both green and **zero** `eslint-disable` comments referencing `western-numerals` anywhere in the diff.
- Given the rule package, when I run root `corepack yarn test`, then `@tiween/eslint-config#test` appears in the task graph and its `RuleTester` suite passes alongside the client and admin suites.
- Given the change is tooling + hardening only, when I run `corepack yarn type-check` and the full client suite, then everything passes and `git diff --stat -- .github turbo.json .husky apps/strapi` is **empty**.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Follow-up review pass (independent, `followup_review_recommended: true`)

- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 1, low 4)
- defer: 6: (high 0, medium 3, low 3)
- reject: 10: (high 0, medium 3, low 7)
- addressed_findings:
  - `[medium]` `[patch]` **The options-bag `numberingSystem` check only read `Literal` values**, so ``new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: `arab` })`` — a template literal, the same request written differently — passed the guard the previous pass had just added to close exactly this hole. `unsafeNumberingSystem` now judges any statically known value via `staticParts` (string literal or expression-free template); a dynamic value is still left to the locale check. Two new RuleTester cases (one valid `` `latn` ``, one invalid `` `arab` ``), plus a valid case pinning that `` `${ns}` `` stays unjudged.
  - `[low]` `[patch]` **`Intl` reached off a global object walked past the guard entirely**: `guardedIntlName` required `callee.object` to be the bare identifier `Intl`, so `globalThis.Intl.NumberFormat(locale)` and `window["Intl"].DateTimeFormat(locale)` were never checked. Added `isIntlNamespace`, which accepts `Intl` bare or as a member of `globalThis` / `window` / `self`. No such site exists today — preventive, and cheap because it is pure syntax, unlike the binding-resolution limits recorded in DW-186. Three new invalid cases and one valid.
  - `[low]` `[patch]` **`toNumeralSafeLocale` threw a `TypeError` outside its own `try`** for a non-string argument (`locale?.trim()` on a number or object arriving from an `any`-typed boundary), defeating the totality the previous pass had established for it. Replaced with a `typeof locale === "string"` guard so a non-string degrades to the fallback like any other bad input.
  - `[low]` `[patch]` **`dates.ts:145` kept a dead double-normalization** — `const resolvedLocale = locale === "ar" ? "ar-u-nu-latn" : locale` feeding `toNumeralSafeLocale(...)`, which forces `latn` unconditionally. It reads as the load-bearing invariant it no longer is, and it is the last surviving copy of the duplicate the same story deleted from `WatchlistSyncStatus.tsx`. Removed; the helper call now takes `locale` directly, byte-identical output.
  - `[low]` `[patch]` **`icu-numerals.test.ts`'s docstring claimed coverage the gate does not have** — that feeding `3` to every argument means "any argument that ends up in a numeric position is actually formatted". Verified false: a bare `{v}` is stringified, not number-formatted, so only typed positions (`{n, number}`, `{n, plural}` / `#`, date/time) are measured, and a single numeric probe per argument only ever selects one `select` branch. The comment now states both limits accurately; closing them is DW-194.

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 6, low 4)
- defer: 5: (high 0, medium 4, low 1)
- reject: 8: (high 0, medium 2, low 6)
- addressed_findings:
  - `[medium]` `[patch]` **The allowlist short-circuited the numbering-system check**, so `new Intl.NumberFormat("fr-u-nu-arab")` — an allowlisted primary subtag explicitly requesting Arabic-Indic digits — passed the guard. The extension is now tested (`/-u-nu-(?!latn\b)/i`) _before_ the subtag allowlist. Verified by two new RuleTester cases.
  - `[medium]` `[patch]` **The `-u-nu-latn` check was an unanchored `includes` over concatenated quasis**, so `` `-u-nu-latn${locale}` `` and `"ar-u-nu-latn-u-ca-x"` passed. Replaced with an end-anchored check on the literal value / last template quasi.
  - `[medium]` `[patch]` **A literal `numberingSystem` in the options bag defeated the rule entirely** — `new Intl.NumberFormat(toNumeralSafeLocale(l), { numberingSystem: "arab" })` was lint-clean and rendered `٣`. New `unsafeNumberingSystem` message; a dynamic options object is still left to the locale check, so no false positives.
  - `[medium]` `[patch]` **Computed member access walked past the guard** — `Intl["NumberFormat"](locale)` and `d["toLocaleDateString"](locale)` were unreported. `memberName()` now resolves a string-literal computed key for both the constructor and the method match.
  - `[medium]` `[patch]` **`toNumeralSafeLocale` produced invalid BCP-47 for any tag already carrying a Unicode extension** — `"ar-u-ca-islamic"` became `"ar-u-ca-islamic-u-nu-latn"` (two `-u-` singletons), making every `Intl` constructor throw `RangeError` inside a React render, with no `try/catch` at most call sites. Rebuilt on `new Intl.Locale(tag, { numberingSystem: "latn" })` with a two-stage fallback, so the helper is now total for every input including `"en_US"` and a broken caller-supplied fallback.
  - `[medium]` `[patch]` **The helper honoured an incoming `-u-nu-arab` and a test enshrined it.** Since the lint rule accepts _any_ helper call as proof of safety, one externally-derived locale (URL segment, stored preference) carrying `-u-nu-arab` defeated both gates at once. `latn` is now forced unconditionally; the test that asserted Arabic-Indic output was inverted.
  - `[low]` `[patch]` **The ICU catalog gate rendered every message at a single count (`3`)**, so only the `few`/`other` plural branch was ever formatted — a `#` added to a `one`, `zero` or `=1` branch would have shipped undetected. Now probed at `[0, 1, 2, 3, 11, 100]`. Confirmed by injecting `#` into `search.resultsFor`'s `one` branch: caught as `search.resultsFor@1`, invisible at `@3`.
  - `[low]` `[patch]` **Nothing verified the rule was still wired into `apps/client`.** The registration lives in a Storybook-generated file that `storybook upgrade` rewrites; deleting the two wiring lines left all RuleTester cases green and `yarn lint` exit 0, turning every `toNumeralSafeLocale(...)` wrapper decorative. Added a `wiring` test that lints a probe through the client's _own_ resolved flat config via the ESLint Node API — placed in `packages/eslint-config` because that suite does run in CI. Verified it fails when the rule is set to `"off"`.
  - `[low]` `[patch]` **The `{display}` ICU contract was untested at the call site.** Dropping `display` does not throw — next-intl renders the raw message key — so the search header would silently read `search.resultsFor`. Added a per-locale assertion using exactly the arguments `SearchPageClient` passes.
  - `[low]` `[patch]` **`ARABIC_INDIC_DIGITS` omitted the Arabic separators** U+066B/U+066C, so a latn-digit / arab-separator mix (`١٬٢٣٤`'s `٬`) would pass. Added to the class. Also corrected two Completion Notes claims: `AttendanceCounter`'s rendered string _does_ change (`1,234` → `1 234`), and DW-185's "91 errors" is a line count (61 `error TS` lines).

## Design Notes

**Why static, not runtime — the measurement that drove the design.** On Node 22.22 / ICU 77:

```
ar              ns=latn   1,234   25‏/12‏/2025   قبل 3 أيام
ar-TN           ns=latn   1.234   25‏/12‏/2025   قبل 3 أيام
ar-EG / ar-SA   ns=arab   ١٬٢٣٤   ٢٥‏/١٢‏/٢٠٢٥   قبل ٣ أيام
```

`ar` and `ar-TN` are already `latn` _here_, so the existing story-local tests would pass even with the `-u-nu-latn` suffix deleted, and rendering `ar.json` at plain `ar` reports **0** vulnerable messages. Rendered at `ar-u-nu-arab` it reports exactly **1** (`search.resultsFor`). The numbering system is a CLDR-version- and host-dependent default; only an explicit `-u-nu-latn` (or a formatter that cannot receive an Arabic locale) is a guarantee. Hence: the primary gate is an AST rule, and the message gate forces the worst case.

**Measured ICU surface.** Only ICU `#` is vulnerable — a bare `{count}` argument is substituted as a string by `intl-messageformat`, not run through `NumberFormat` (verified across all 568 `ar.json` messages, 0 format errors). This is why the fix is one message, not seven, and why next-intl's global `formats` block is not a usable lever.

**Rule shape** (the whole safety predicate, ~15 lines):

```js
const isSafeLocale = (node, opts) => {
  if (!node) return false // missing arg → missingLocale
  const text = staticText(node) // Literal, or TemplateLiteral's cooked text
  if (text !== null)
    return (
      text.includes("-u-nu-latn") ||
      opts.allowedLanguageSubtags.includes(text.split("-")[0])
    )
  return (
    node.type === "CallExpression" &&
    opts.safeLocaleHelpers.includes(calleeName(node))
  )
}
```

A `TemplateLiteral` with interpolations still exposes its literal quasis, so `` `${locale}-u-nu-latn` `` passes on the `-u-nu-latn` check while `` `${locale}-TN` `` does not — exactly the discrimination `formatShowtimeLabel` (safe) vs. `HomePage` (unsafe) needs.

**Known over-reach, accepted:** the rule matches `.toLocaleString()` by member name, so it also fires on non-`Intl` receivers. That is the desired bias — every such call is locale-dependent display formatting — and it costs nothing: no client call site is affected beyond the five in `AttendanceCounter`.

**Naming:** the plugin is namespaced `@tiween` (matching the workspace scope), so the rule id is `@tiween/western-numerals`.

## Verification

**Commands:** (`yarn` is not resolvable via asdf in this workspace — use `corepack yarn`, per 1.11)

- `corepack yarn workspace @tiween/eslint-config test` -- expected: `RuleTester` suite passes, 0 failures.
- `corepack yarn lint` (root `turbo lint`) -- expected: exit 0, `@tiween/client#lint` + `@tiween/admin#lint` both successful.
- Inject `new Intl.NumberFormat(locale)` into a client source file, run `corepack yarn lint` -- expected: **fails** on `@tiween/western-numerals`; revert -- expected: passes. Record both in the Debug Log.
- Restore `#` into `ar.json`'s `search.resultsFor`, run `corepack yarn workspace @tiween/client test` -- expected: `icu-numerals.test.ts` **fails**; revert -- expected: passes. Record both.
- `corepack yarn test` (root) -- expected: `@tiween/eslint-config#test`, `@tiween/client#test`, `@tiween/admin#test` all green.
- `corepack yarn type-check` -- expected: exit 0.
- `npx prettier --check` over the touched paths -- expected: pass (CI runs `yarn format:check`; DW-175 covers the pre-existing repo-wide failures).
- `git diff HEAD --stat -- .github turbo.json .husky apps/strapi` -- expected: empty.
- `git diff HEAD | grep -c 'eslint-disable.*western-numerals'` -- expected: `0`.

**Manual checks (if no CLI):**

- Read the diff of every paydown site and confirm the pre-existing locale expression survives verbatim **inside** the `toNumeralSafeLocale(...)` call — no branch removed, no literal changed. Any site where that was not possible must be listed in Completion Notes with its reason.

## Completion Notes

### What landed

The repo now has its first **local ESLint rule**. `packages/eslint-config/rules/western-numerals.mjs` is a plain rule object (no `@typescript-eslint/utils`, no new third-party dependency) exported through `packages/eslint-config/plugin.mjs` as the `@tiween` plugin, registered as an **error** in `apps/client/eslint.config.mjs` for the whole workspace with no test/story exemption. Because the client's `lint` script is already `eslint . --max-warnings=0`, that single rule entry is the whole wiring: the pre-commit hook, `turbo lint` and the CI `Lint` job all inherit it with no workflow edit.

The rule is fail-closed exactly as the intent-contract specifies. A locale argument passes only if it is (a) a string literal or **expression-free** template whose primary language subtag is in `allowedLanguageSubtags` (default `["fr","en"]`), (b) a literal or template whose static quasi text contains `-u-nu-latn`, or (c) a direct call to a `safeLocaleHelpers` name (default `["toNumeralSafeLocale"]`). Everything else — bare identifier, member expression, ternary, non-allowlisted call, spread, or a **missing** argument — is reported.

The 21 surfaced sites were paid down through one shared helper, `apps/client/src/lib/intl-locale.ts`. `apps/client/src/lib/icu-numerals.test.ts` closes the second, AST-invisible surface by rendering all 568 flattened `ar.json` messages at a forced `ar-u-nu-arab` and rejecting any Arabic-Indic output.

### Decisions

- **`complete` vs. partial static text.** The spec's sketch ran both checks on any `staticText`. The implementation splits it: a template with interpolations exposes only its quasis, so only the `-u-nu-latn` check is trusted there; the language-subtag check requires an _expression-free_ literal/template. This is strictly stricter than the sketch (it closes `` `fr-${x}` ``, which the sketch's `text.split("-")[0]` would have admitted) and matches the **Always** list's wording verbatim. It preserves the discrimination the story needs: `formatShowtimeLabel`'s `` `${locale}-u-nu-latn` `` passes, `HomePage`'s `` `${locale}-TN` `` does not.
- **Two additions beyond the matrix, both fail-closed:** a `SpreadElement` first argument (`new Intl.NumberFormat(...args)`) reports `unsafeLocale`, and TS-only wrappers (`as`, `satisfies`, `!`) are unwrapped before judging so `locale as string` is judged on `locale`, not admitted as an opaque node.
- **`Intl.X(...)` without `new`** is guarded as well as `new Intl.X(...)` — `Intl.NumberFormat("ar")` is legal JS and equally unsafe.
- **The helper is hoist-hostile on purpose.** `AttendanceCounter` initially hoisted `const numberLocale = toNumeralSafeLocale(locale)` and the rule still flagged all five call sites — a bare identifier is not proof. That is the rule working, not a false positive (it is the same reason `dates.ts:145` was flagged despite already being correct). Resolved by keeping the helper call _at_ the call site, wrapped in a tiny local `formatCount(value)` closure so it is written once.
- **`RuleTester` + `node:test`.** ESLint 9's `RuleTester` delegates to `RuleTester.describe`/`RuleTester.it`; the suite assigns `node:test`'s pair, so the package needs no test runner at all. `eslint` was added to the package's `devDependencies` because the suite imports `RuleTester` from it — `yarn.lock` is unchanged (the `eslint@^9.39.0` descriptor already existed).
- **`search.resultsFor` `{display}` shape.** Follows the 5.5 `watchlist.pendingChanges` precedent exactly: `{count}` still drives plural selection, `{display}` carries the pre-formatted numeral. Rewritten in all three locales so the three catalogs stay structurally identical. `SearchPageClient` feeds it via a module-level `formatResultCount(count, locale)` using the file's existing `locale` prop (no `useLocale()` needed).

### Deviations from the spec

1. **`AttendanceCounter` uses a local `formatCount` closure**, not five inline `toLocaleString(toNumeralSafeLocale(locale))` calls. Same semantics, one helper call in the source; the optional `locale?: string` prop defaulting to `"fr-TN"` is exactly as specified and is purely additive.
2. **`intl-locale.test.ts` needed one accommodation for the rule it tests.** Its worst-case control formats at `ar-u-nu-arab`, a literal the rule (correctly) rejects. Rather than an `eslint-disable`, the tag is passed through `toNumeralSafeLocale("ar-u-nu-arab")` — which the helper returns untouched, since it preserves an explicit `-u-nu-` extension. Zero disables in the diff.
3. **`icu-numerals.test.ts` resolves `ar.json` via `process.cwd()`**, not `import.meta.url`. Under vitest's `jsdom` environment `import.meta.url` is not a `file:` URL and `fileURLToPath` throws; `process.cwd()` is the vitest root (`apps/client`).
4. **`apps/client/eslint.config.mjs` was reformatted by prettier** as a side effect of touching it (the storybook-generated file was already prettier-dirty at `8bf5c6a`, part of DW-175). Same for the import order in `WatchlistSyncStatus.tsx`. Only files this story edited were formatted, via `npx prettier --write <paths>` — `yarn format` was never run.
5. **Four DW entries opened, not three.** The spec asked for three (strapi, HomePage wording, `formatDate`); a fourth (DW-185) records that `apps/client` is absent from the `turbo type-check` graph, discovered while verifying that this story introduced no type errors.

### Per-site paydown ledger

Every pre-existing locale expression survives **verbatim inside** the `toNumeralSafeLocale(...)` call — no branch removed, no literal changed, no rendered word altered in any locale. Confirmed by reading each diff hunk.

| #     | Site                                                               | Pre-existing expression (preserved verbatim)                         | Edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `src/lib/dates.ts:145` `formatRelativeTime`                        | `locale === "ar" ? "ar-u-nu-latn" : locale` (local `resolvedLocale`) | wrapped: `toNumeralSafeLocale(resolvedLocale)`. `ar` already ended in `-u-nu-latn`, so the helper returns it untouched — byte-identical output, now visible to the rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2     | `.../profile/_components/WatchlistSyncStatus.tsx:19` `formatCount` | `locale === "ar" ? "ar-u-nu-latn" : locale`                          | **replaced** by `toNumeralSafeLocale(locale)` — the one intentional expression change. It is the duplicate of the shared helper that 5.5 introduced in a component file; `ar → ar-u-nu-latn` and `fr`/`en → fr-u-nu-latn`/`en-u-nu-latn` are numeral-identical. Export and `try/catch` fallback kept, so `WatchlistSyncStatus.test.tsx` is untouched and still green.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3     | `src/features/contribute/hooks/useLocalDraft.ts:105`               | `locale` (param, default `"en"`)                                     | wrapped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 4–5   | `.../TicketingPageDesktop.tsx:185,193`                             | `locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-TN" : "en-US"`    | wrapped, both ternaries intact. **Real Arabic-Indic exposure closed** (`ar-TN`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6–7   | `.../DateSelectorDesktop.tsx:116,118`                              | `localeCode` (local, `ar → "ar-TN"`)                                 | wrapped, local kept. **Real exposure closed.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 8–9   | `.../events/components/DateSelector.tsx:99,290`                    | `locale` (raw)                                                       | wrapped. **Real exposure closed.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 10    | `.../HomePage/HomePage.tsx:368`                                    | `` locale === "ar" ? "fr-TN" : `${locale}-TN` ``                     | wrapped; **French branch untouched** (wording deferred → DW-183).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 11    | `.../HomePage/HomePageWithCity.tsx:342`                            | same as #10                                                          | same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 12–14 | `.../EventDetailPageDesktop.tsx:703,712,746`                       | `locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-TN" : "en-US"`    | wrapped ×3, ternaries intact. **Real exposure closed.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 15    | `.../EventDetailPage/EventDetailPageWithMap.tsx:512`               | same ternary                                                         | wrapped. **Real exposure closed.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 16–20 | `.../AttendanceCounter.tsx:172,176,233,236,277`                    | **no locale argument at all**                                        | new optional `locale?: string` prop (default `"fr-TN"`, matching the component's French `defaultLabels`) + a local `formatCount(value)` that inlines `toNumeralSafeLocale(locale)`. Additive: no existing caller passes it, no caller exists outside the barrel export. This is the only behavioral change in the story — previously the digits came from the _ambient runtime locale_, which is the worst failure mode. **The rendered string does change**: `(1234).toLocaleString()` on an `en` host produced `1,234`, while the new `"fr-TN"` default produces `1 234` (narrow no-break space). That is a deliberate trade of nondeterminism for determinism — but `ar` and `en` both group with a comma, so the default is only right for French until a caller threads the real locale (tracked in DW-189). |
| 21    | `src/lib/intl-locale.test.ts:52` (new file)                        | n/a — self-inflicted by the new test                                 | routed through the helper (see deviation 2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Rule-clean and deliberately **not** edited, verified still passing: `formatShowtimeLabel.ts:16` (the golden `-u-nu-latn` template), `EventCard.tsx:99,107`, `EventDateFilter.tsx:89`, `TicketQR.tsx:119`, `ValidationResult.tsx:126`, `desktop-prototypes/**`, and — importantly — `lib/strapi-api/content/events-extended.ts:93`, whose `"en-CA"` is a **cache key**, not display output, and stays a bare literal.

No site required a **Block If** violation: nothing needed a rendered-word change, a non-additive prop change, or a change to a cache/sort/payload value.

### Residual risks

- `corepack yarn type-check` exits 0 but **does not cover `apps/client`** (script named `typecheck`, task named `type-check` — DW-185). The client's own `tsc --noEmit` was therefore diffed manually: **91 output lines before, 91 after** (61 of which are `error TS…` lines; the rest are the surrounding source excerpts), differing only by line-number shifts from added import lines. Zero introduced.
- `corepack yarn test` reports `Failed: @tiween/client#build` — pre-existing at `8bf5c6a` (`desktop-prototypes/ticketing-quantity/page.tsx:146: Object is possibly 'undefined'`), reproduced on a stashed tree. The client's own `vitest run` is 65 files / 626 tests green.
- The helper **preserves** an explicit `-u-nu-` extension, so `toNumeralSafeLocale("ar-u-nu-arab")` is a deliberate escape hatch. Specified behavior; the rule cannot distinguish it from a safe helper call. No production call site uses it.
- The `.toLocaleString()` member-name match is the accepted over-reach from the Design Notes. Measured cost after paydown: zero additional sites.
- CI runs plain `yarn`; every command here ran through `corepack yarn` (1.22.22, the pinned version) because `yarn` is not resolvable via asdf on this machine.

## Debug Log

### Probe 1 — inject `new Intl.NumberFormat(locale)` into a client source file

Appended to `apps/client/src/lib/dates.ts`:

```ts
// --- NEGATIVE CONTROL PROBE (story 1.12) — reverted immediately after ---
export function __probeRegression(locale: string, n: number): string {
  return new Intl.NumberFormat(locale).format(n)
}
```

`corepack yarn lint` — **FAILS**, as required:

```
@tiween/client:lint: /Users/ayoub/projects/tiween-bmad-version/apps/client/src/lib/dates.ts
@tiween/client:lint:   198:32  error  `Intl.NumberFormat` receives a locale that is not provably Western-numeral. Arabic locales can default to the `arab` numbering system, which this project forbids. Wrap the expression in `toNumeralSafeLocale(...)`, or use a literal ending in `-u-nu-latn`  @tiween/western-numerals
@tiween/client:lint:
@tiween/client:lint: ✖ 1 problem (1 error, 0 warnings)
@tiween/client:lint:
@tiween/client:lint: error Command failed with exit code 1.
@tiween/client#lint: command (/Users/ayoub/projects/tiween-bmad-version/apps/client) …/yarn run lint exited (1)

 Tasks:    1 successful, 2 total
Cached:    1 cached, 2 total
  Time:    9.755s
Failed:    @tiween/client#lint

 ERROR  run failed: command  exited (1)
error Command failed with exit code 1.
```

Probe reverted; `corepack yarn lint` — **PASSES**:

```
reverted
@tiween/client:lint:   Why you should do it regularly: https://github.com/browserslist/update-db#readme
@tiween/client:lint: Done in 7.60s.

 Tasks:    2 successful, 2 total
Cached:    2 cached, 2 total
  Time:    989ms >>> FULL TURBO

Done in 1.68s.
```

### Probe 2 — restore ICU `#` into `ar.json`'s `search.resultsFor`

`locales/ar.json:438` reverted to the 5.5 shape (`one {# نتيجة …} other {# نتائج …}`), then `corepack yarn workspace @tiween/client test` — **FAILS**:

```
probe applied
 ❯ src/lib/icu-numerals.test.ts (3 tests | 1 failed) 54ms
   × ar.json renders Western numerals under a forced arab numbering system > renders no Arabic-Indic digit in any message 52ms
     → expected [ Array(1) ] to deeply equal []

 FAIL  src/lib/icu-numerals.test.ts > ar.json renders Western numerals under a forced arab numbering system > renders no Arabic-Indic digit in any message
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   "search.resultsFor → ٣ نتائج لـ «3»",
+ ]

 ❯ src/lib/icu-numerals.test.ts:117:23
    115|
    116|     expect(unrenderable).toEqual([])
    117|     expect(offenders).toEqual([])
       |                       ^
    118|   })
    119|
```

Note the offender string is the _exact_ defect the story exists to prevent: `٣` (Arabic-Indic three) where `3` belongs. Probe reverted; same command — **PASSES**:

```
probe reverted

 Test Files  65 passed (65)
      Tests  626 passed (626)
   Start at  16:06:45
   Duration  8.20s (transform 3.39s, setup 5.49s, collect 11.62s, tests 13.17s, environment 30.19s, prepare 2.77s)

Done in 8.62s.
Done in 8.72s.
```

### Baseline comparisons (proving pre-existing failures are pre-existing)

`git stash -u` → `cd apps/client && npx tsc --noEmit`: **91 errors** at `8bf5c6a`; identical 91 after the change, `diff` showing only line-number shifts in `EventDetailPageWithMap.tsx`, `HomePage.tsx` and `HomePageWithCity.tsx` (each +1, from the added import).

`git stash -u` → `cd apps/client && npx next build`:

```
Failed to compile.
./src/app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx:146:21
Type error: Object is possibly 'undefined'.
```

— i.e. `@tiween/client#build` was already red before this story.

## Verification Results

| Command                                                                            | Expected                                                   | Actual                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack yarn workspace @tiween/eslint-config test`                               | RuleTester suite passes, 0 failures                        | **PASS** — `# tests 51 / # pass 51 / # fail 0`, 3 suites                                                                                                                                                                                                                                                                     |
| `corepack yarn lint` (root `turbo lint`)                                           | exit 0, `@tiween/client#lint` + `@tiween/admin#lint` green | **PASS** — `2 successful, 2 total`                                                                                                                                                                                                                                                                                           |
| Probe: inject `new Intl.NumberFormat(locale)` → lint                               | fails on `@tiween/western-numerals`; revert → passes       | **PASS** — see Debug Log probe 1                                                                                                                                                                                                                                                                                             |
| Probe: restore `#` in `ar.json` → client test                                      | `icu-numerals.test.ts` fails; revert → passes              | **PASS** — see Debug Log probe 2                                                                                                                                                                                                                                                                                             |
| `corepack yarn test` (root)                                                        | `@tiween/eslint-config#test` in graph, all suites green    | **PARTIAL** — `@tiween/eslint-config#test` **is** in the graph and green (51/51); `@tiween/admin#test` green (46 suites / 561 tests). `@tiween/client#test` never runs because turbo's `test` task `dependsOn: ["build"]` and `@tiween/client#build` is **red at baseline** (pre-existing, DW-185). `3 successful, 4 total`. |
| `cd apps/client && npx vitest run`                                                 | client suite green                                         | **PASS** — 65 files / 626 tests, incl. the 2 new files (7 + 3 tests)                                                                                                                                                                                                                                                         |
| `corepack yarn type-check`                                                         | exit 0                                                     | **PASS** — `2 successful, 2 total` (covers `@tiween/admin` only; DW-185)                                                                                                                                                                                                                                                     |
| `cd apps/client && npx tsc --noEmit` (not in the spec; run to prove no regression) | no _new_ errors                                            | **PASS** — 91 before / 91 after, byte-identical modulo line shifts                                                                                                                                                                                                                                                           |
| `npx prettier --check <touched paths>`                                             | pass                                                       | **PASS** — all 26 touched source/config/ledger paths clean                                                                                                                                                                                                                                                                   |
| `git diff HEAD --stat -- .github turbo.json .husky apps/strapi`                    | empty                                                      | **PASS** — empty                                                                                                                                                                                                                                                                                                             |
| `git diff HEAD \| grep -c 'eslint-disable.*western-numerals'`                      | `0`                                                        | **PASS** — `0`                                                                                                                                                                                                                                                                                                               |
| `git diff --stat -- yarn.lock`                                                     | (implied) unchanged                                        | **PASS** — empty                                                                                                                                                                                                                                                                                                             |

## File List

**Created (6)**

- `packages/eslint-config/rules/western-numerals.mjs` — the rule; the whole safety predicate in one place.
- `packages/eslint-config/rules/western-numerals.test.mjs` — `node:test` + `RuleTester`, 51 cases.
- `packages/eslint-config/plugin.mjs` — the `@tiween` flat-config plugin object.
- `apps/client/src/lib/intl-locale.ts` — `toNumeralSafeLocale(locale?, fallback = "fr-TN")`.
- `apps/client/src/lib/intl-locale.test.ts` — helper contract + forced-`ar-u-nu-arab` `Intl` assertions.
- `apps/client/src/lib/icu-numerals.test.ts` — catalog-wide ICU gate over `ar.json` at `ar-u-nu-arab`.

**Modified — tooling / wiring (3)**

- `packages/eslint-config/package.json` — `./plugin` export, `plugin.mjs` + `rules` in `files`, `"test": "node --test rules/*.test.mjs"`, `eslint` devDependency.
- `apps/client/eslint.config.mjs` — plugin registered, `"@tiween/western-numerals": "error"` workspace-wide (file also prettier-normalized).
- `apps/client/vitest.config.ts` — `src/lib/intl-locale.test.ts` + `src/lib/icu-numerals.test.ts` added to `test.include`.

**Modified — paydown, locale wrapped in `toNumeralSafeLocale` (11)**

- `apps/client/src/lib/dates.ts`
- `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx`
- `apps/client/src/features/contribute/hooks/useLocalDraft.ts`
- `apps/client/src/features/tickets/components/TicketingPageDesktop/TicketingPageDesktop.tsx`
- `apps/client/src/features/tickets/components/DateSelectorDesktop/DateSelectorDesktop.tsx`
- `apps/client/src/features/events/components/DateSelector/DateSelector.tsx`
- `apps/client/src/features/events/components/HomePage/HomePage.tsx`
- `apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx`
- `apps/client/src/features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx`
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx`
- `apps/client/src/features/scanner/components/AttendanceCounter/AttendanceCounter.tsx` _(also: new optional `locale?: string` prop)_

**Modified — ICU message paydown (4)**

- `apps/client/locales/ar.json` — `search.resultsFor`: `#` → `{display}`
- `apps/client/locales/fr.json` — same
- `apps/client/locales/en.json` — same
- `apps/client/src/app/[locale]/search/SearchPageClient.tsx` — feeds `display` via `formatResultCount(count, locale)`

**Modified — BMad artifacts (3)**

- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-182 … DW-185 opened.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story → `done`; Epic 5 numeral action item `specced` → `done`.
- `_bmad-output/implementation-artifacts/spec-1-12-i18n-western-numeral-lint-guard.md` — checklist ticked; these sections appended. `status:` frontmatter untouched.

**Deleted:** none.

**Not modified (verified empty diff):** `.github/**`, `turbo.json`, `.husky/**`, `apps/strapi/**`, `yarn.lock`.

### Files changed during the 2026-08-03 review pass (10 patches, 6 files)

- `packages/eslint-config/rules/western-numerals.mjs` — non-`latn` extension rejected before the subtag allowlist; `-u-nu-latn` check end-anchored (`endsWithLatn`); new `unsafeNumberingSystem` check on the options bag; `memberName()` resolves computed string-literal keys; `Intl.DurationFormat` guarded; header documents the accepted syntax-not-bindings limits.
- `packages/eslint-config/rules/western-numerals.test.mjs` — 13 new cases for the closed holes, plus a `wiring` suite that lints a probe through `apps/client`'s own resolved flat config (64 tests total, from 51).
- `apps/client/src/lib/intl-locale.ts` — rebuilt on `Intl.Locale(tag, { numberingSystem: "latn" })`; `latn` now forced over an incoming `-u-nu-arab`; total for unparseable tags via a two-stage fallback.
- `apps/client/src/lib/intl-locale.test.ts` — the "leaves an explicit extension untouched" assertion inverted to "overrides"; new cases for an existing `-u-ca-` extension and for unparseable tags.
- `apps/client/src/lib/icu-numerals.test.ts` — every message probed at `[0, 1, 2, 3, 11, 100]` so all plural branches render; Arabic separators U+066B/U+066C added to the digit class; new per-locale `search.resultsFor` call-site contract assertion.
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-186 … DW-189 appended.

### Review-pass verification

| Command                                                                                             | Result                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack yarn workspace @tiween/eslint-config test`                                                | **PASS** — 64 tests / 4 suites, 0 fail                                                                                                                                    |
| `corepack yarn lint` (root `turbo lint`)                                                            | **PASS** — 2 successful, 2 total                                                                                                                                          |
| `cd apps/client && npx vitest run`                                                                  | **PASS** — 65 files / 629 tests                                                                                                                                           |
| wiring probe: set the rule to `"off"` in `apps/client/eslint.config.mjs`                            | **FAILS** as required (`not ok 1 - is enabled as an error in apps/client's resolved config`, `expected @tiween/western-numerals to fire, got: []`); restored → 64/64 pass |
| plural-branch probe: `#` injected into `search.resultsFor`'s **`one`** branch only                  | **FAILS** as required (`search.resultsFor@1 → ١ نتيجة لـ «1»`) — and would have been invisible at the previous single `count: 3` probe; reverted → pass                   |
| helper totality probe: `ar`, `ar-TN`, `ar-u-nu-arab`, `ar-u-ca-islamic`, `en_US`, `""`, `undefined` | **PASS** — every tag resolves to `numberingSystem: latn`, none throws                                                                                                     |
| `npx prettier --check` over the touched paths                                                       | **PASS**                                                                                                                                                                  |
| `git diff HEAD --stat -- .github turbo.json .husky apps/strapi`                                     | **PASS** — empty                                                                                                                                                          |

### Files changed during the 2026-08-03 follow-up review pass (5 patches, 5 files)

- `packages/eslint-config/rules/western-numerals.mjs` — `unsafeNumberingSystem` judges any statically known value (literal **or** expression-free template) via `staticParts`; new `isIntlNamespace` recognises `Intl` off `globalThis` / `window` / `self`; header and helper docstrings corrected to match.
- `packages/eslint-config/rules/western-numerals.test.mjs` — 7 new cases (template `latn` valid, interpolated `numberingSystem` valid, `globalThis.Intl` with a safe locale valid; template `arab`, `globalThis.Intl`, `window["Intl"]`, `self.Intl` with no locale invalid). 64 → 71.
- `apps/client/src/lib/intl-locale.ts` — `typeof locale === "string"` guard so a non-string cannot throw outside the `try`.
- `apps/client/src/lib/dates.ts` — dead `resolvedLocale` ternary removed; `toNumeralSafeLocale(locale)` called directly.
- `apps/client/src/lib/icu-numerals.test.ts` — `argumentNames` docstring corrected to state the gate's two real coverage limits.
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-190 … DW-195 appended.

### Follow-up-review-pass verification

| Command                                                         | Result                                          |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `corepack yarn workspace @tiween/eslint-config test`            | **PASS** — 71 tests / 4 suites, 0 fail (was 64) |
| `corepack yarn lint` (root `turbo lint`)                        | **PASS** — 2 successful, 2 total                |
| `cd apps/client && npx vitest run`                              | **PASS** — 65 files / 629 tests, unchanged      |
| `npx prettier --check` over the touched paths                   | **PASS**                                        |
| `git diff HEAD --stat -- .github turbo.json .husky apps/strapi` | **PASS** — empty                                |
| `grep -rn "eslint-disable.*western-numerals" apps packages`     | **PASS** — none                                 |

## Auto Run Result

Status: done

### Summary

An independent follow-up review pass over the frozen 1.12 diff (`8bf5c6a..HEAD`), run because the previous pass set `followup_review_recommended: true`. Three reviewers (adversarial, edge-case, verification-gap) ran without prior context; 21 distinct findings survived deduplication. **No intent gap and no spec defect** — the implementation matches the frozen spec, so no loopback was triggered and `review_loop_iteration` stayed at 0.

Five patches landed, all inside the guard itself: one medium (a template-literal `numberingSystem: `arab``walked past the options-bag check the *previous* pass added to close exactly that hole) and four low (an`Intl`-off-`globalThis`bypass, a`TypeError`the helper could throw outside its own`try`, a dead double-normalization in `dates.ts`, and a docstring that overstated the ICU gate's coverage). Six findings were deferred as DW-190 … DW-195; ten were rejected as already-tracked or noise.

The most consequential finding is deferred, not patched: safety condition (b) certifies `` `${locale}-u-nu-latn` `` — string concatenation, which throws `RangeError` if the interpolated locale already carries a `-u-` extension, and which `formatShowtimeLabel.ts:16` uses live. The spec's design sections name that site "the golden example" and require no report, so tightening the condition is a spec-level decision (DW-190), not a patch this pass may make.

### Files changed

Five source files plus the ledger — see _Files changed during the 2026-08-03 follow-up review pass_ above.

### Review findings

- **Patches applied: 5** (medium 1, low 4) — itemised in the triage log.
- **Deferred: 6 new** — DW-190 (interpolated `-u-nu-latn` concatenation is certified but can throw `RangeError`; live at `formatShowtimeLabel.ts:16`), DW-191 (turbo caches `@tiween/eslint-config#test` against inputs excluding `apps/client/eslint.config.mjs`, so the wiring guard can replay a stale PASS), DW-192 (the helper's `latn` extension is silently dropped for well-formed but unsupported tags), DW-193 (`{display}` is a required ICU argument with no compile-time or call-site test — demonstrated by deleting it and watching every gate stay green), DW-194 (the ICU gate reads only `ar.json` and exercises one `select`/`plural` branch per message), DW-195 (an object-spread `numberingSystem` still bypasses the options check).
- **Rejected: 10** — `AttendanceCounter`'s `"fr-TN"` default and the `["fr","en"]` allowlist incentive (both DW-189); `safeLocaleHelpers` name-only trust including the namespaced form (DW-186); the eslint-config test's hardcoded `../../../apps/client` path and its tests shipping in `files` (rejected in the previous pass, unchanged); the client suite being unreachable in CI and the `typecheck`/`type-check` script-name mismatch (both DW-185, and already a stated residual risk); `.mjs` being outside the lint/format gates (DW-188); `WatchlistSyncStatus`'s now-unreachable `catch` (deliberately kept per the Spec Change Log, to leave its test untouched); the absence of `noInlineConfig` enforcement against `eslint-disable` (the story verifies this by grep, which still returns none); and a hypothetical `select` message with no `other` branch throwing into `unrenderable`.

### Verification

`@tiween/eslint-config` **71/71** (was 64 — 7 new RuleTester cases, each of which fails without its patch); root `corepack yarn lint` **2 successful, 2 total**; `apps/client` vitest **65 files / 629 tests**, unchanged; prettier `--check` clean on all five touched paths; `git diff HEAD --stat -- .github turbo.json .husky apps/strapi` **empty**; zero `eslint-disable` comments referencing the rule.

### Residual risks

All residual risks recorded by the previous pass still stand unchanged — the client test task remains unreachable in CI (DW-185), so `icu-numerals.test.ts` and `intl-locale.test.ts` are still gated only by a local `vitest run`; the rule still reads syntax rather than bindings (DW-186); `useFormatter()` is still unguarded (DW-187); and `AttendanceCounter` still defaults to `"fr-TN"` with no consumer (DW-189). This pass adds two of consequence:

- **The wiring guard is cacheable against the wrong inputs** (DW-191). The one test standing between a `storybook upgrade` and a silently disabled rule can replay a cached PASS, because the file it guards is not among its turbo inputs. Fixing it requires a `turbo.json` edit, which this story's scope forbids.
- **Condition (b) blesses string concatenation** (DW-190) — the construction the helper exists to replace, live and unguarded at `formatShowtimeLabel.ts:16`. Low likelihood while next-intl constrains the route locale to `ar`/`fr`/`en`, but it is a genuine `RangeError` path in a render with no `try/catch`.
