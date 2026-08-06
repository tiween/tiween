---
status: done
baseline_revision: 66e9dde2210f2674c839e005b38e7909e8639564
review_loop_iteration: 0
followup_review_recommended: true
deferred:
  - summary: >-
      CI does not run the boot-based integration suite (yarn test:integration)
      in apps/strapi, so boot-level regressions (route wiring, extension
      instantiation) are only caught by the default-gate unit guard, not by an
      actual boot in CI.
    evidence: |-
      .github/workflows/ci.yml runs only the default `yarn test` gate
      (testMatch **/*.unit.test.ts); no workflow or merge gate invokes
      `test:integration` / the *.service.test.ts suites. The suite itself is
      green and self-contained (SQLite + build:test-dist), so wiring it into CI
      is feasible but is a CI-infrastructure decision beyond this story's ACs.
    location: >-
      .github/workflows/ci.yml
    severity: medium
  - summary: >-
      The two production-deploy actions from Behavior Activation (confirm
      BREVO_SENDER_EMAIL/BREVO_SENDER_NAME before setting BREVO_API_KEY in
      prod, and run the firstName-NULL backfill query + decision on the prod
      DB) are recorded only as prose in the story's Completion Notes; nothing
      tracks them to resolution.
    evidence: |-
      Dev Agent Record, "Task 3.3 — Behavior Activation findings": welcome
      emails go live the moment BREVO_API_KEY is set, and users registered
      through the stock path have first_name = NULL
      (`SELECT COUNT(*) FROM up_users WHERE first_name IS NULL AND provider = 'local'`).
      Neither action is executable from this environment (no prod access), and
      unlike the CI gap (DW-250) neither was entered anywhere a deploy
      checklist would surface it.
    location: >-
      _bmad-output/implementation-artifacts/4-7-fix-users-permissions-auth-controller-factory-wiring.md (Behavior Activation)
    severity: medium
---

# Story 4.7: Fix users-permissions Auth Controller Extension Factory Wiring

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

---

## Story

As a **developer**,
I want the `users-permissions` extension to override the **instantiated** `auth` controller rather than the exported factory function,
so that all six Epic-4 auth customizations actually run at runtime, Strapi boots, and the integration test suite (and the DW-4/DW-5/DW-86 bundle behind it) becomes runnable.

---

## Problem (confirmed 2026-07-31, empirically)

`@strapi/plugin-users-permissions` exports its two controllers in **different shapes**:

| Controller                   | Export shape                             |
| ---------------------------- | ---------------------------------------- |
| `server/controllers/auth.js` | **factory** — `({ strapi }) => ({...})`  |
| `server/controllers/user.js` | **plain object** — `module.exports = {}` |

Reproduced directly against `node_modules`:

```
auth export typeof = function
user export typeof = object
auth.register (as-exported) = undefined
instantiated auth.register = function
instantiated auth keys = callback,changePassword,resetPassword,refresh,logout,
                         connect,forgotPassword,register,emailConfirmation,
                         sendEmailConfirmation
```

`apps/strapi/src/extensions/users-permissions/strapi-server.ts` assigns every auth override
as `plugin.controllers.auth.<handler> = fn` — i.e. onto the **factory function object**. When
Strapi later _calls_ the factory to instantiate the controller, none of those handlers are on
the produced object. `user.updateMe` works precisely because `user` is a plain object.

Two knock-on effects:

1. `const originalRegister = plugin.controllers.auth.register` reads **`undefined`**, so the
   overrides cannot even delegate to the stock behavior — they must be restructured to close
   over the _instantiated_ originals, not merely re-homed.
2. The two routes appended at `strapi-server.ts:1166-1187` (`auth.changeEmail`,
   `auth.confirmEmailChange`) never resolve → **"Handler not found" hard-fails boot**.

### Blast radius — six inert handlers across Epic 4

| Handler              | Story | Runtime effect today                                                  |
| -------------------- | ----- | --------------------------------------------------------------------- |
| `register`           | 4.1   | firstName persistence + welcome email never run (stock register runs) |
| `callback`           | 4.2   | social-login account-linking + welcome email never run                |
| `forgotPassword`     | 4.3   | override never runs                                                   |
| `resetPassword`      | 4.3   | override never runs                                                   |
| `changeEmail`        | 4.4   | never resolves — **its route hard-fails boot**                        |
| `confirmEmailChange` | 4.4   | never resolves                                                        |

### Why the unit gate stayed green

All four auth unit tests build the plugin double as a **plain object**
(`controllers: { auth: { register: originalRegister } }` —
`register.unit.test.ts:61`), then read the handler straight back off it
(`wrapped.controllers.auth.register` — `:67`). The double never goes through Strapi's factory
instantiation, so the tests validate handler _logic_ while being structurally blind to the
wiring defect. This is the same "silent runtime no-op behind a green unit gate" class that
DW-86 warns about.

---

## Acceptance Criteria

1. **Given** `plugin.controllers.auth` is a factory function,
   **When** the extension applies its overrides,
   **Then** it **wraps the factory** — replacing it with a new factory that calls the original,
   takes the instantiated controller, and returns it with the six handlers overridden — rather
   than assigning onto the function object. The extension must **not** assume the factory shape
   blindly: it handles both shapes (`typeof auth === "function"` → wrap; object → assign), so a
   future upstream change in either direction does not silently re-break it.

2. **And** each override closes over the **instantiated** original, so delegation works:
   `originalRegister`, `originalCallback`, `originalResetPassword` (and any other delegated
   stock handler) resolve to real functions at call time, not `undefined`.

3. **And** `user.updateMe` and the three route registrations (`PUT /users/me` unshifted to index
   0, `POST /auth/change-email`, `POST /auth/confirm-email-change` appended) keep their existing
   behavior and ordering — `PUT /users/me` must still be matched before the stock
   `PUT /users/:id`.

4. **And** **Strapi boots**: `apps/strapi` starts with no "Handler not found" error, and
   `POST /auth/change-email` + `POST /auth/confirm-email-change` resolve to their handlers.

5. **And** the four auth unit tests
   (`register.unit.test.ts`, `social-login.unit.test.ts`, `password-reset.unit.test.ts`,
   `profile-management.unit.test.ts`) are updated to build their plugin double with `auth` as a
   **factory**, and to read handlers off the **instantiated** controller — so the suite would now
   **fail** against the pre-fix extension. Demonstrate this: state in Completion Notes that the
   updated tests were run against the old wiring and failed.

6. **And** a regression guard exists so this exact defect cannot return silently: a test that
   asserts the extension's overrides survive factory instantiation (e.g. instantiate the wrapped
   `plugin.controllers.auth` and assert all six handlers are own functions on the result).

7. **And** the newly-activated behaviors are verified rather than merely enabled — see
   **Behavior Activation** below. Each of the six handlers is exercised end-to-end at least once
   against a booting Strapi, and the outcomes recorded in Completion Notes.

8. **And** no regression: `yarn workspace @tiween/admin test` passes; `yarn build:strapi`
   succeeds.

---

## ⚠️ Behavior Activation — this story turns on dormant production behavior

This is **not** a pure refactor. Six handlers that have never executed in production start
executing. Treat these as behavior changes requiring review:

- **Welcome emails** begin sending on registration (4.1) and on social-login first sign-in (4.2).
  Confirm the email provider config, templates, and the fr/ar/en locale selection are correct
  _before_ this ships — a broken template now becomes a user-visible regression.
- **Social-login account linking** (4.2) begins running. Existing users created through the stock
  `callback` path may not carry the fields the override expects; confirm the linking logic is
  safe against already-provisioned accounts.
- **Password-reset customizations** (4.3) begin running on `forgotPassword`/`resetPassword`.
- **`firstName` persistence** (4.1) begins running on register.

**Any production data already created through the stock (un-overridden) path was created without
these customizations.** Check whether a backfill is needed for `firstName` on existing users, and
record the finding either way.

---

## Tasks / Subtasks

- [x] **Task 1: Restructure the extension** (AC: #1, #2, #3)

  - [x] 1.1 In `strapi-server.ts`, replace the six `plugin.controllers.auth.<handler> = fn`
        assignments with a single factory wrap: capture the original export, build the
        instantiated controller inside the new factory, and return `{ ...instantiated, ...overrides }`.
  - [x] 1.2 Move each override into that closure so it can reference the instantiated original.
  - [x] 1.3 Handle both export shapes (function → wrap, object → assign) per AC #1.
  - [x] 1.4 Update the `UsersPermissionsPlugin` TypeScript interface (`:540-560`) — `controllers.auth`
        is currently typed as a plain object, which is what made the defect type-invisible.
  - [x] 1.5 Leave the `user.updateMe` assignment and the route block (`:1160-1188`) functionally
        unchanged.

- [x] **Task 2: Fix the blind unit gate** (AC: #5, #6)

  - [x] 2.1 Update the shared plugin-double construction in all four auth unit tests to expose
        `auth` as a factory and resolve handlers through instantiation.
  - [x] 2.2 Run the updated tests against the **pre-fix** extension and confirm they fail; record
        the output in Completion Notes.
  - [x] 2.3 Add the factory-survival regression test (AC #6).

- [x] **Task 3: Verify boot + the six handlers** (AC: #4, #7)

  - [x] 3.1 Boot `apps/strapi`; confirm no "Handler not found".
  - [x] 3.2 Exercise register, social callback, forgotPassword, resetPassword, changeEmail,
        confirmEmailChange against the booting instance; record outcomes.
  - [x] 3.3 Record the welcome-email / social-linking / firstName-backfill findings from
        **Behavior Activation**.

- [x] **Task 4: Harness fixes that block the integration suite** (AC: #4) — carried over from the
      blocked `dw-integration-suite-boot-harness` bundle

  - [x] 4.1 `apps/strapi/tests/helpers/strapi.ts` boots from a prebuilt `dist/`, but `strapi build`
        sets `noEmitOnError: true` and there are **9 pre-existing, unrelated TS errors** in
        `src/plugins/user-engagement/` (`notification.ts`, `watchlist.ts`) — so a normal build
        **emits nothing** and `dist/` silently goes stale. Add a transpile-tolerant dist pretest
        build (e.g. `tsc --noEmitOnError false`, or swc). _(Fixing the 9 TS errors is out of scope
        here — the harness must not depend on them.)_
  - [x] 4.2 On boot failure `setupStrapi()` throws before `cleanupStrapi()` runs, leaking DB-pool
        handles ("Jest did not exit…"). Tear down on setup failure.
  - [x] 4.3 `dist/tests/__mocks__/*` produce jest-haste-map "duplicate manual mock" warnings
        (cosmetic — fix if cheap).

---

## Dev Notes

**Reference — the shape of the fix:**

```ts
type AuthFactory = (deps: { strapi: unknown }) => Record<string, unknown>

const authExport = plugin.controllers.auth as unknown as
  | AuthFactory
  | Record<string, unknown>

const applyAuthOverrides = (original: Record<string, unknown>) => ({
  ...original,
  register: makeRegister(original.register as RegisterController),
  callback: makeCallback(original.callback as CallbackController),
  forgotPassword: makeForgotPassword(),
  resetPassword: makeResetPassword(
    original.resetPassword as ResetPasswordController
  ),
  changeEmail: makeChangeEmail(),
  confirmEmailChange: makeConfirmEmailChange(),
})

plugin.controllers.auth =
  typeof authExport === "function"
    ? (((deps) => applyAuthOverrides(authExport(deps))) as never)
    : (applyAuthOverrides(authExport) as never)
```

Each `make*` returns the existing handler body, now taking its stock original as a parameter
instead of reading it from module scope.

**Key files**

- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (1191 lines) — overrides at
  `:563` register, `:623` callback, `:723` forgotPassword, `:784` resetPassword, `:958`
  user.updateMe, `:1010` changeEmail, `:1085` confirmEmailChange; interface at `:540`; routes at
  `:1160-1188`.
- `apps/strapi/src/extensions/users-permissions/{register,social-login,password-reset,profile-management}.unit.test.ts`
- `apps/strapi/tests/helpers/strapi.ts` (Task 4)

**Upstream reference:** `node_modules/@strapi/plugin-users-permissions/server/controllers/auth.js:40`
(factory) vs `.../user.js:37` (plain object).

---

## Unblocks

`dw-integration-suite-boot-harness` — the DW-4 / DW-5 / DW-86 bundle (live-DB transaction
re-confirm, un-skip `order.service.test.ts` + `status:published` fixture, guest-linking
integration coverage) all require a booting Strapi and were escalated as blocked by bmad-loop
run `20260712-090054-5834`. Re-run that bundle once this story lands; the original
"one shared harness touchpoint" scoping then holds.

---

## Dev Agent Record (2026-08-06)

### Completion Notes

**Implementation (AC #1–#3)**

- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` restructured:
  the six auth overrides are now module-level builders (`makeRegister`,
  `makeCallback`, `makeForgotPassword`, `makeResetPassword`) plus two locals
  (`changeEmail`, `confirmEmailChange`), composed by `applyAuthOverrides(original)`
  which spreads the **instantiated** controller and overrides the six handlers.
  The wiring handles both shapes: `typeof authExport === "function"` → wrap the
  factory (`(deps) => applyAuthOverrides(authExport(deps))`); plain object →
  `applyAuthOverrides(authExport)` directly.
- Delegating overrides (`register`, `callback`, `resetPassword`) now close over
  the instantiated originals passed into their builders — never read off the
  factory function object.
- `UsersPermissionsPlugin.controllers.auth` retyped as
  `AuthController | AuthControllerFactory` (union), so reading a handler off it
  no longer type-checks without discriminating the shape — the defect is
  type-visible again (Task 1.4).
- `user.updateMe`, the jwt.verify wrap, and the route block (unshift
  `PUT /users/me`, append the two `/auth/*` routes) are functionally unchanged.

**AC #5 — updated unit gate fails against the pre-fix wiring (Task 2.2)**

All four suites now build the plugin double with `auth` as a factory and read
handlers off the instantiated controller. Demonstrated by temporarily restoring
`git show HEAD:…/strapi-server.ts` (pre-fix) and re-running:

```
Test Suites: 5 failed, 5 total
Tests:       49 failed, 35 passed, 84 total
```

(failures of the form `TypeError: h.register is not a function` /
`h.confirmEmailChange is not a function` — the overrides are absent from the
instantiated controller under the old wiring). Fix restored; all 84 pass.

**AC #6 — regression guard**

`apps/strapi/src/extensions/users-permissions/factory-wiring.unit.test.ts`:
asserts (1) factory-shaped double → all six overrides are own functions on the
instantiated result, non-overridden stock handlers pass through; (2) delegation
actually reaches the instantiated stock `register`; (3) object-shaped double →
direct assignment still works; (4) the **real**
`@strapi/plugin-users-permissions` `auth` export is a factory and survives
wrapping+instantiation — an upstream shape change now fails loudly here.

**AC #4/#7 — boot + six handlers exercised end-to-end (Task 3)**

New opt-in integration suite
`apps/strapi/src/extensions/users-permissions/auth-wiring.service.test.ts`
(runs under `--testMatch='**\/*.service.test.ts' --runInBand`; excluded from the
default unit gate). Against a real booted Strapi (SQLite, fresh DB): 6/6 pass.

| Handler              | Outcome (override-only effects observed)                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| boot                 | `setupStrapi()` loads + mounts; no "Handler not found"; both appended `/api/auth/*` routes resolve (non-404/405)                                                                                                             |
| `register`           | weak password → 400 `PASSWORD_NO_UPPERCASE` (stock accepts ≥6 chars); valid → 200 with jwt, `firstName` persisted in DB and echoed in response; welcome email dispatched (provider in console/dev mode)                      |
| `callback`           | override executes: Google userinfo profile fetch observed via spied `global.fetch` before delegation; delegated stock rejects (grant disabled in pristine store). Full linking matrix covered by `social-login.unit.test.ts` |
| `forgotPassword`     | 200 `{ok:true}`; 128-hex token AND `resetPasswordTokenExpiresAt` stamped (stock never sets the expiry)                                                                                                                       |
| `resetPassword`      | weak password → 400 `PASSWORD_NO_UPPERCASE`; valid → 200 jwt, `passwordChangedAt` stamped, token cleared                                                                                                                     |
| `changeEmail`        | authed → 200 `{ok:true}`; `pendingEmail` + 128-hex `emailChangeToken` + expiry staged                                                                                                                                        |
| `confirmEmailChange` | public → 200 `{ok:true}`; email swapped to pending, all staging fields cleared                                                                                                                                               |

**Task 3.3 — Behavior Activation findings**

- **Welcome emails**: provider is `@ayhid/strapi-provider-email-brevo`; without
  `BREVO_API_KEY` it degrades to console logging (observed in the test run), so
  no accidental sends from non-prod envs. Templates are inline in
  `strapi-server.ts` (fr/ar/en, verified by the unit suites incl. region-variant
  and fallback locales). Prod ships real sends the moment `BREVO_API_KEY` is set —
  confirm `BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME` before deploy.
- **Social linking**: only triggers on the stock "already taken" rejection AND a
  provider-verified email, never overwrites `provider`, refuses blocked
  accounts; enrichment (firstName/avatarUrl) applies ONLY to brand-new accounts
  (pre-lookup found nothing), so already-provisioned accounts are not clobbered.
- **firstName backfill**: any production user registered through the stock path
  has `firstName = NULL`. No production DB is reachable from this environment —
  finding recorded as: run `SELECT COUNT(*) FROM up_users WHERE first_name IS NULL AND provider = 'local'`
  against prod; if non-zero, decide whether to backfill from `username` or leave
  null (the client tolerates a missing firstName). Nothing in this story breaks
  for null-firstName users.

**Task 4 — harness fixes**

- 4.1: added `yarn build:test-dist` (`tsc -p tsconfig.json --noEmitOnError false
--incremental false`) to `apps/strapi/package.json`; `tests/helpers/strapi.ts`
  header now points at it. NOTE: the "9 pre-existing TS errors in
  src/plugins/user-engagement" no longer exist — `tsc --noEmit` exits 0 on the
  current tree — but the transpile-tolerant build remains as the guard the
  harness depends on.
- 4.2: `setupStrapi()` now tears down (`destroy()`) the partially-booted app on
  load/mount failure and clears the cache before re-throwing, so a boot failure
  no longer leaks DB-pool handles.
- 4.3: no "duplicate manual mock" warnings observed — already suppressed by the
  existing `modulePathIgnorePatterns: ["<rootDir>/dist/"]` in both jest projects.

**AC #8 — regression gates**

- `yarn workspace @tiween/admin test`: 59 suites / 865 tests pass (server + admin).
- `yarn lint` (apps/strapi): clean, `--max-warnings=0`.
- `npx tsc --noEmit -p apps/strapi/tsconfig.json`: exit 0.
- `yarn build:strapi`: succeeds.

### File List

- `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (restructured)
- `apps/strapi/src/extensions/users-permissions/register.unit.test.ts` (factory double)
- `apps/strapi/src/extensions/users-permissions/social-login.unit.test.ts` (factory double)
- `apps/strapi/src/extensions/users-permissions/password-reset.unit.test.ts` (factory double)
- `apps/strapi/src/extensions/users-permissions/profile-management.unit.test.ts` (factory double)
- `apps/strapi/src/extensions/users-permissions/factory-wiring.unit.test.ts` (new — AC #6 guard)
- `apps/strapi/src/extensions/users-permissions/auth-wiring.service.test.ts` (new — AC #4/#7 boot verification, opt-in integration)
- `apps/strapi/tests/helpers/strapi.ts` (teardown-on-failure + dist guidance)
- `apps/strapi/package.json` (`build:test-dist` script)

### Review triage patches (2026-08-06, same session)

1. **Self-contained integration runner**: added `yarn test:integration`
   (`yarn build:test-dist && jest --selectProjects server
--testMatch='**/*.service.test.ts' --runInBand`) so the boot-based suite can
   never silently run against a stale `dist/`; run instructions in
   `auth-wiring.service.test.ts` and `tests/helpers/strapi.ts` now reference it
   (escaped-glob doc footgun removed). Verified end-to-end twice: 3 suites pass,
   1 skipped (the known DW-5 `order.service.test.ts`).
2. **Route↔handler mismatch guard in the DEFAULT gate**: new test in
   `factory-wiring.unit.test.ts` resolves EVERY `content-api` route handler
   string (`auth.<name>` / `user.<name>`) against the INSTANTIATED wrapped
   controllers — the exact "Handler not found" defect class now fails in
   `yarn test`, not only at opt-in boot.
3. **Integration-suite robustness**: all created-user emails now carry a unique
   per-run suffix (`pid + Date.now()`, computed once at module load) so re-runs
   against a persisted `.tmp/test.db` cannot collide with "Email is already
   taken"; added `expect(...).toBeTruthy()` guards before dereferencing every
   `findOne` result.

Gates re-run after patches: `yarn workspace @tiween/admin test` → 59 suites /
866 tests pass; `yarn lint` clean; `yarn test:integration` green (twice).

---

## Review Triage Log

### 2026-08-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 2, low 1)
- defer: 1: (high 0, medium 1, low 0)
- reject: 18: (high 0, medium 0, low 18)
- addressed_findings:
  - `[medium]` `[patch]` Task 4.1's dist "pretest" build was a manually invoked script referenced only in comments — added a self-contained `yarn test:integration` script (build:test-dist && jest service suites) and pointed all run docs at it, removing the escaped-glob doc footgun.
  - `[medium]` `[patch]` The route-string-to-handler mismatch class ("Handler not found") was uncovered by the default gate — added a default-gate unit test in factory-wiring.unit.test.ts resolving every registered content-api route handler against the instantiated wrapped controllers.
  - `[low]` `[patch]` auth-wiring.service.test.ts depended on a pristine store and dereferenced findOne results unguarded — unique per-run email suffix + toBeTruthy guards added.

### 2026-08-06 — Review pass (follow-up, second pass)

- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 3, low 2)
- defer: 1: (high 0, medium 1, low 0)
- reject: 19: (high 0, medium 0, low 19)
- addressed_findings:
  - `[medium]` `[patch]` `setupStrapi()`'s teardown-on-failure only covered failures after `load()` resolved — `booting` was assigned from `await createStrapi(...).load()`, so a rejection inside `load()` (the common boot-failure mode: bad dist/, schema error) left nothing to destroy and the DB-pool handle leak Task 4.2 targeted survived. Fixed by capturing the app object before `.load()` and best-effort `destroy()`-ing it in every failure path.
  - `[medium]` `[patch]` `test:integration` used `yarn build:test-dist && jest …`, but `tsc` exits non-zero on type errors even with `--noEmitOnError false` (while still emitting) — so the moment any TS error reappears, the `&&` short-circuits and the suite never runs, defeating the transpile-tolerant guard's exact purpose. Fixed with `(yarn build:test-dist || true) && jest …`: dist/ is still refreshed (tsc emits despite errors) and the suite always runs.
  - `[medium]` `[patch]` The documented boot-suite entry point (`yarn test:integration`) matched only `**/*.service.test.ts`, silently excluding the other boot-based suites (`event-manager.controller.test.ts`, `tests/app.test.js`) — they were executed by nothing (not the unit gate, not the script, not CI). Widened the script to three `--testMatch` globs covering `*.service.test.ts`, `*.controller.test.ts`, and `tests/app.test.js`; verified all 6 files are matched and the widened gate passes (5 suites green, 1 known-skip).
  - `[low]` `[patch]` `jest.config.cjs`'s header still carried the escaped-glob ad-hoc invocation the previous pass claimed to have removed (a third copy) — updated to point at `yarn test:integration`.
  - `[low]` `[patch]` The reset-password integration test read `staged.resetPasswordToken` unguarded — if forgot-password silently no-ops, the failure would be misattributed to the policy branch. Added an explicit `toBeTruthy()` guard on the token.

---

## Auto Run Result

Status: done (follow-up review pass, 2026-08-06)

**Summary of implemented change**: This run was a fresh follow-up review pass over the already-implemented Story 4.7 diff (baseline `66e9dde2210f2674c839e005b38e7909e8639564`, implementation commit `46fedaa`). Four parallel review layers (blind hunter, edge-case hunter, verification-gap, intent-alignment) produced 25 deduplicated findings; 5 were patched, 1 deferred, 19 rejected as noise. No intent gaps or spec defects — the wiring fix itself stands as implemented.

**Files changed in this pass**:

- `apps/strapi/tests/helpers/strapi.ts` — teardown-on-boot-failure now also covers rejections inside `load()` (app captured before `.load()`, best-effort `destroy()` in the catch).
- `apps/strapi/package.json` — `test:integration` no longer short-circuits on tsc's non-zero exit (`|| true`; tsc still emits) and now covers all boot-based suites (`*.service.test.ts`, `*.controller.test.ts`, `tests/app.test.js`).
- `apps/strapi/jest.config.cjs` — header doc points at `yarn test:integration` instead of the stale escaped-glob ad-hoc invocation.
- `apps/strapi/src/extensions/users-permissions/auth-wiring.service.test.ts` — `toBeTruthy()` guard on the reset token before use.

**Review findings breakdown**: 5 patches applied (3 medium, 2 low), 1 deferred (medium — the two prod-deploy actions from Behavior Activation, now in the frontmatter `deferred` list), 19 rejected (hypothetical-input guards, cosmetic test/doc completeness, workflow-bookkeeping noise such as the sprint-status/spec status skew inherent to the review process).

**Follow-up review recommendation**: true — patched counts: 0 high, 3 medium, 2 low; score = 3×3 + 1×2 = 11 (≥ 5).

**Verification performed**:

- `yarn test:integration` (widened): 5 suites passed, 1 skipped (known DW-5 `order.service.test.ts`), 34 tests passed — including the two suites previously executed by nothing (`event-manager.controller.test.ts`, `tests/app.test.js`).
- `yarn test` (apps/strapi, server + admin projects): 59 suites / 866 tests passed.
- `yarn lint` (`eslint . --max-warnings=0`): clean.
- `yarn type-check` (`tsc --noEmit`): exit 0.

**Residual risks**:

- If `build:test-dist` fails without emitting (e.g. tsc crashes outright, not a type error), `test:integration` now proceeds against a stale `dist/` — the trade accepted to keep the gate runnable in the presence of type errors, which is its stated purpose.
- The boot-based integration gate still does not run in CI (tracked as DW-250) and boots the transpile-tolerant `dist/`, not the production `strapi build` artifact.
- Behavior-activation deploy actions (Brevo sender config confirmation, firstName backfill decision) remain open — now tracked in this spec's `deferred` frontmatter.
