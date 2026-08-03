---
title: "DW-15: URL validation for the venue `website` field"
type: "bugfix"
created: "2026-08-03"
status: "done"
baseline_revision: "efbb659f0d66603d85340be8cd9b9e31b9285ecd"
review_loop_iteration: 0
final_revision: "cc49c58"
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `plugin::venues.venue.website` is a bare `string` attribute with no validator, so any value (`"pas de site"`, `javascript:alert(1)`, a stray paste) is accepted on write and later rendered/linked as a venue website.

**Approach:** Introduce one canonical URL pattern in the shared server kit and enforce it on every venue write path — the content-type schema (`regex`, covers content-API + publish + admin client validation), a `venues` plugin DB lifecycle subscriber (covers draft saves, Document Service and seed writes, which the schema validator skips for drafts), and the custom `VenueFormModal` admin form (inline field error before submit).

## Boundaries & Constraints

**Always:** One pattern string is the single source of truth (`apps/strapi/src/shared/website-url.ts`); the schema `regex` must equal it byte-for-byte and a unit test asserts that. Rejections throw a Strapi `ValidationError` carrying error CODE `INVALID_WEBSITE_URL` (project rule: codes, not prose). Absent / `null` / empty-string `website` stays valid — this field is optional and never becomes required. Partial updates that do not carry a `website` key are untouched.

**Block If:** the shared module cannot be imported from the events-manager admin bundle without a build/type error — then HALT rather than silently duplicating the pattern.

**Never:** do not normalize, trim, or rewrite the stored value server-side (no silent mutation of user data — the form trims before submit instead); do not add a scheme when one is missing; do not backfill or migrate existing malformed rows; do not touch the deferred-work ledger.

## I/O & Edge-Case Matrix

| Scenario                            | Input / State                          | Expected Output / Behavior               | Error Handling                          |
| ----------------------------------- | -------------------------------------- | ---------------------------------------- | --------------------------------------- |
| Valid https                         | `https://cinemamadart.tn`              | write proceeds                           | No error expected                       |
| Valid with port/path/query/fragment | `http://www.abc.com.tn:8080/a/b?x=1#f` | write proceeds                           | No error expected                       |
| Uppercase scheme                    | `HTTPS://Cinema.TN`                    | write proceeds (scheme case-insensitive) | No error expected                       |
| Absent key                          | update payload without `website`       | write proceeds, value untouched          | No error expected                       |
| Empty / null                        | `""`, `null`                           | write proceeds (field treated unset)     | No error expected                       |
| Missing scheme                      | `cinemamadart.tn`                      | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |
| Non-http scheme                     | `javascript:alert(1)`, `ftp://a.tn`    | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |
| No dotted TLD                       | `http://localhost`, `https://intranet` | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |
| Whitespace in value                 | `https://a b.tn`, `" https://a.tn"`    | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |
| Free text                           | `pas de site`                          | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |
| Over 255 chars                      | `https://a.tn/` + 250 chars            | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |
| Non-string                          | `42`, `{}`                             | write rejected                           | `ValidationError` `INVALID_WEBSITE_URL` |

</intent-contract>

## Code Map

- `apps/strapi/src/shared/website-url.ts` -- NEW: dependency-free canonical pattern + predicate (importable from both server and admin bundles).
- `apps/strapi/src/shared/validation.ts` -- existing shared-kit precedent: throws Strapi `ValidationError` with `details.code`.
- `apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json:44` -- the bare `website` string attribute to constrain.
- `apps/strapi/src/plugins/venues/server/src/bootstrap.ts` -- currently an empty stub; host for the venue DB lifecycle subscriber.
- `apps/strapi/src/plugins/events-manager/server/src/bootstrap.ts:95` -- precedent for `strapi.db.lifecycles.subscribe({ models: [...] })` in a plugin bootstrap.
- `apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx:186` -- `validate()` with the existing email-regex precedent; `website` input at :410.
- `apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenuesEnhanced.ts:270` -- the form's write path (content-manager REST → draft, hence the lifecycle need).
- `apps/strapi/jest.config.cjs` -- unit gate is `**/*.unit.test.ts` via ts-jest.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/shared/website-url.ts` -- create with `WEBSITE_URL_PATTERN` (string), `WEBSITE_URL_MAX_LENGTH = 255`, `isValidWebsiteUrl(value: unknown): boolean` (true for `undefined`/`null`/`""`), and `INVALID_WEBSITE_URL` code constant -- zero imports so both the server and the admin (Vite) bundle can consume it.
- [x] `apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json` -- add `regex` (identical string to `WEBSITE_URL_PATTERN`) and `maxLength: 255` to `website` -- enforces on content-API writes and on publish, and drives the built-in admin field validation.
- [x] `apps/strapi/src/plugins/venues/server/src/bootstrap.ts` -- subscribe a `plugin::venues.venue` `beforeCreate`/`beforeCreateMany`/`beforeUpdate`/`beforeUpdateMany` lifecycle that runs `isValidWebsiteUrl` on each entry only when the `website` key is present, throwing `ValidationError("Invalid website URL", { code: "INVALID_WEBSITE_URL", field: "website" })` -- covers draft saves, Document Service/seed writes the entity validator skips, and the `strapi import` bulk path.
- [x] `apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx` + `validate.ts` -- extract the form rules into a pure `validateVenueForm` (so the `*.unit.test.ts` gate can cover them), add the website check, and submit the trimmed value as `""` rather than `undefined` when empty so clearing the field actually reaches the server -- inline field feedback beside the existing email check.
- [x] `apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/validate.unit.test.ts` -- pin the editor-facing contract: blocks on malformed, tolerates surrounding whitespace, keeps the field optional.
- [x] `apps/strapi/src/shared/__tests__/website-url.unit.test.ts` -- unit-test every I/O matrix row against `isValidWebsiteUrl`, plus a sync assertion that `venue/schema.json` `attributes.website.regex` equals `WEBSITE_URL_PATTERN` and its `maxLength` equals `WEBSITE_URL_MAX_LENGTH`.
- [x] `apps/strapi/src/plugins/venues/server/src/__tests__/bootstrap.unit.test.ts` -- unit-test the subscriber with a mocked strapi: valid value passes, malformed throws with code `INVALID_WEBSITE_URL`, payload without a `website` key passes, subscription targets `plugin::venues.venue`.

**Acceptance Criteria:**

- Given the venues plugin is bootstrapped, when `strapi.db.lifecycles` fires `beforeCreate` or `beforeUpdate` for `plugin::venues.venue`, then a malformed `website` throws before any DB write and a valid or absent one is a no-op.
- Given the same pattern must hold at both layers, when the schema `regex` and `WEBSITE_URL_PATTERN` diverge, then `yarn test` fails on the sync assertion.
- Given an editor uses the custom venue form, when they submit a malformed website, then the modal shows a field-level error and no request is sent.
- Given no other behavior changes, when `yarn test` and `yarn type-check` run in `apps/strapi`, then both pass with no new failures.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 3, low 5)
- defer: 1: (high 0, medium 1, low 0)
- reject: 5: (high 0, medium 1, low 4)
- addressed_findings:
  - `[medium]` `[patch]` Bulk write paths bypassed the subscriber — `createMany`/`updateMany` emit `beforeCreateMany`/`beforeUpdateMany` (the `strapi import` path), which had no handler. Both hooks now subscribed, array and shared-payload shapes handled, two tests added.
  - `[medium]` `[patch]` The form submitted `undefined` for an emptied website, so the key was dropped from the JSON body and the key-presence rule treated a clear as "untouched" — an editor clearing a malformed legacy URL was told it saved while the old value survived. Now submits `""`.
  - `[medium]` `[patch]` No executing test could cover the admin layer (`testMatch` is `*.unit.test.ts`, node env), leaving AC-3 verifiable only by inspection. Rules extracted to `VenueFormModal/validate.ts` (the `WorkForm/schema.ts` precedent) with a unit suite.
  - `[low]` `[patch]` `ValidationError` used the raw code as its message, so the built-in content-manager would show `INVALID_WEBSITE_URL` to an editor. Now a human message plus `details.code`, matching `src/shared/validation.ts`.
  - `[low]` `[patch]` Host pattern accepted underscores and leading/trailing hyphens in labels (not resolvable hostnames). Tightened to the DNS label shape; three rejection cases added.
  - `[low]` `[patch]` `new RegExp(...)` was rebuilt on every call; hoisted to a module-level compiled constant.
  - `[low]` `[patch]` Nothing pinned that the plugin actually registers this `bootstrap`; added an assertion against the plugin's server entry.
  - `[low]` `[patch]` The Verification section claimed `yarn type-check` proved the admin→shared import resolves; it does not (the root tsconfig excludes `src/plugins/**/admin/**`). Replaced with the esbuild bundle check that was actually run.

### 2026-08-03 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 3, low 3)
- defer: 3: (high 0, medium 3, low 0)
- reject: 6: (high 0, medium 1, low 5)
- addressed_findings:
  - `[medium]` `[patch]` The pattern tail `[^\s]` accepted C0 control characters, DEL and Unicode bidi controls. A NUL in a path never reaches our `ValidationError` — the Postgres driver aborts first with an opaque `22021` — and a bidi override lets rendered link text disagree with the URL it resolves to. Tail class tightened to exclude `\x00-\x1F`, `\x7F`, `\u202A-\u202E` and `\u2066-\u2069` in both the pattern and the schema `regex`; five rejection cases plus a "non-ASCII paths still valid" case added.
  - `[medium]` `[patch]` The form submitted `""` for an empty website, so venues created through the modal stored `''` where every other write path stores NULL — `filters[website][$null]` silently missed them. Now submits `formData.website.trim() || null`, which still carries the key (so clearing works) but keeps one representation of "no website". `VenueInput.website` widened to `string | null`.
  - `[medium]` `[patch]` The `bootstrap.ts` comment and a test name both claimed the `*Many` hooks cover `strapi import`. They do not: `@strapi/data-transfer`'s local-destination provider calls `strapi.db.lifecycles.disable()` for the whole restore and writes via `db.query().create`, so NO lifecycle fires and the entity validator is bypassed too — the import path is unvalidated at all three layers. Comment rewritten to state the real reason for the `*Many` hooks (future bulk callers) plus an explicit KNOWN GAP note for import; the misleading test renamed.
  - `[low]` `[patch]` The `^$|` rationale was wrong — Strapi applies the regex as `matches(re, { excludeEmptyString: !attr.required })`, so `""` is already skipped for this optional field. Comment corrected to say the alternation is belt-and-braces at the schema layer and load-bearing only for standalone consumers of the exported pattern.
  - `[low]` `[patch]` The `details: { field }` comment claimed the content-manager highlights the field. It does not — the admin needs the `details.errors[].path` shape, not a flat object. Comment corrected to scope `field` to API consumers.
  - `[low]` `[patch]` The sync test asserted only string equality of the two patterns, never that the layers reach the same verdict — the length bound lives in the predicate and in a separate schema `maxLength`, outside the pattern. Added a parity test reconstructing the schema layer as Strapi applies it (`new RegExp(regex)` + `maxLength`) and asserting it agrees with `isValidWebsiteUrl` on 20 inputs.

### 2026-08-03 — Review pass (follow-up 2)

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 1: (high 0, medium 1, low 0)
- reject: 14: (high 0, medium 4, low 10)
- addressed_findings:
  - `[low]` `[patch]` The invisible-character exclusion did not match its own rationale: the tail class blocked only the bidi _overrides_ (`U+202A`-`U+202E`, `U+2066`-`U+2069`), so LRM, RLM, ALM, ZWSP, ZWNJ, word-joiner and BOM were all accepted — verified directly against the shipped predicate. Bidi marks steer rendering exactly like the overrides the comment names, and the zero-width family lets two visually identical URLs be stored as different values. Class widened to `؜`, `​-‏`, `⁠-⁤` and `﻿` in both the pattern and the schema `regex`; seven rejection cases added and three added to the schema↔predicate parity list, with the non-ASCII-path acceptance kept.

## Design Notes

Canonical pattern (identical string in `website-url.ts` and `schema.json`):

```
^$|^(?:[Hh][Tt][Tt][Pp][Ss]?)://(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?::\d{1,5})?(?:[/?#][^\s\x00-\x1F\x7F؜​-‏‪-‮⁠-⁤⁦-⁩﻿]*)?$
```

Character-class scheme instead of an `i` flag: Strapi builds `new RegExp(attr.regex)` with **no flags**, so case-insensitivity must live in the pattern itself. The `^$|` alternative keeps an empty string valid — belt-and-braces at the schema layer, where Strapi already applies `matches(re, { excludeEmptyString: !attr.required })` and `website` is optional, but load-bearing for any consumer using the exported pattern standalone.

The path/query/fragment tail excludes control and invisible characters as well as whitespace. Beyond the C0 range and DEL, the exclusion covers the whole invisible family rather than only the bidi overrides: bidi marks (`U+200E`, `U+200F`, `U+061C`) steer rendering the same way, and the zero-width characters (`U+200B`-`U+200D`, `U+2060`-`U+2064`, `U+FEFF`) let two URLs that look identical be stored as different values. A NUL never reaches our `ValidationError` — the Postgres driver aborts first with an opaque `22021` — and Unicode bidi controls let rendered link text disagree with the URL it resolves to. Non-ASCII paths (`https://a.tn/café`) stay valid.

Why both layers: `@strapi/core`'s entity validator applies attribute `regex` only when the entry is **not a draft** (`node_modules/@strapi/core/dist/services/entity-validator/validators.js:34`), and `venue` has `draftAndPublish: true` — so a draft save from the admin would bypass the schema regex entirely. The DB lifecycle subscriber sits below every write path and closes that hole.

Host labels use the DNS shape (alphanumeric ends, hyphens only inside), so `https://sub_domain.tn` and `https://-a.tn` are rejected.

Known, accepted limits: non-punycode IDN hosts (`https://موقع.تونس`), bare-host intranet URLs, IP-literal hosts and `user:pass@` credentials are rejected; an out-of-range port (`:0`, `:99999`) is accepted — this is a shape check, not a reachability check. Existing malformed rows are left as-is and will only surface an error when that venue is next saved or published (the form can clear the field, since it submits `null` rather than an omitted key).

**`strapi import` is NOT covered — deliberate.** `@strapi/data-transfer`'s local-destination provider calls `strapi.db.lifecycles.disable()` for the whole restore and writes through `db.query().create`, so neither the subscriber nor the schema `regex` (the entity validator is bypassed too) runs. A data transfer is an operator restoring a trusted export, not user input; covering it would need a separate pre-import check, out of scope here. The `*Many` hooks remain subscribed so a future bulk caller is validated by default — nothing in the repo writes venues that way today.

The form submits `formData.website.trim() || null` — `null`, not `""`, so that "no website" has one representation in the column and a `filters[website][$null]` query still finds venues created through the modal. The key is always present, which is what makes clearing a stored value actually reach the server.

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: full unit gate green, including the three new suites. Actual (follow-up pass 2): 42 suites / 529 tests passed.
- `cd apps/strapi && yarn type-check` -- expected: no NEW errors (3 pre-existing `watchlist.ts` errors remain). Note: the root tsconfig excludes `src/plugins/**/admin/**`, so this does NOT cover the admin bundle.
- `cd apps/strapi && npx esbuild src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx --bundle --platform=browser --loader:.tsx=tsx --external:react --external:react-dom --external:@strapi/'*' --outfile=/dev/null` -- expected: bundles cleanly; this is what actually proves the admin→`src/shared` import resolves (a full `strapi build` cannot: it aborts earlier on the pre-existing `watchlist.ts` TS errors).
- `npx prettier --check <touched files>` (repo root) -- expected: no formatting violations in the touched files.

## Auto Run Result

Status: done — second follow-up review pass on an already-`done` spec. No intent gap, no spec repair; 1 patch applied, 1 finding deferred, 14 rejected (11 of them already tracked in the ledger or explicitly accepted in the intent contract).

**Change (cumulative):** the venue `website` field is validated from one canonical pattern at three layers — `apps/strapi/src/shared/website-url.ts` (dependency-free, importable from both the server and the admin Vite bundle), the content-type `regex` + `maxLength`, a `plugin::venues.venue` DB lifecycle subscriber (the only layer covering draft saves, which the entity validator skips), and the custom `VenueFormModal` for inline editor feedback. **This pass** closed one hole: the tail's invisible-character exclusion covered only the bidi overrides, so bidi marks and the zero-width family still passed.

**Files changed this pass:**

- `apps/strapi/src/shared/website-url.ts` — tail class widened to `U+061C`, `U+200B`-`U+200F`, `U+2060`-`U+2064` and `U+FEFF` on top of the existing overrides; rationale comment corrected to describe what is actually excluded.
- `apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json` — `regex` re-synced byte-for-byte (the sync test would otherwise fail).
- `apps/strapi/src/shared/__tests__/website-url.unit.test.ts` — 7 new rejection cases (LRM, RLM, ALM, ZWSP, ZWNJ, word joiner, BOM), 3 added to the schema↔predicate parity list; the non-ASCII-path acceptance still passes.

**Findings breakdown:** 1 patched (low). 1 deferred as DW-158 (`strapi import` bypasses every validation layer repo-wide, tracked only by a code comment). 14 rejected: modal swallows server rejections (already DW-155), five other form fields not clearable (DW-156), admin `.tsx` runs under no runner so AC-3 and the `null`-payload semantics are inspection-only (DW-157), admin code not typechecked (DW-144), legacy malformed rows blocking unrelated edits (explicitly accepted in the intent contract, rejected on the previous pass too), `""` still valid on non-form write paths (accepted — the contract makes empty valid), over-255 message wording, French form vs English server message, no punycode hint for IDN hosts, parity-test input list maintained by copy-paste, `values.website.trim()` on a non-string (unreachable — `formData` is initialized from `initialFormData` with `""` and every setter writes a string), `subscribe` called-once assertion brittleness, non-object entry inside a `createMany` array (no such caller exists), and `maxLength: 255` needing deploy verification (Strapi's default column is already `varchar(255)`).

**Verification:** `yarn test` in `apps/strapi` — 42 suites / 529 tests passed (was 522; +7 cases). `yarn type-check` — 3 errors, all pre-existing in `watchlist.ts`, none new. `npx esbuild` on `VenueFormModal/index.tsx` — bundles at 34.6kb, the real proof the admin→`src/shared` import resolves. `npx prettier --check` on the three touched files — clean. The bidi/zero-width gap was confirmed empirically against the shipped `isValidWebsiteUrl` before patching (LRM/RLM/ALM/ZWSP/ZWNJ/WJ accepted, RLO rejected, `café` path accepted), not taken from reviewer assertion.

**Residual risks:** `strapi import` remains unvalidated at every layer by design (now DW-158). Pre-existing rows with a malformed `website` still fail on next save or publish — deliberate per the intent contract, blast radius still unmeasured. The editor-facing half is verified only through the pure `validateVenueForm` module; no runner loads the `.tsx`, so the `Field.Root error` wiring and the submit payload shape remain proven by inspection only (DW-157). A server-side rejection still reaches no editor on this surface (DW-155).
