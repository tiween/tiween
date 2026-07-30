# Story 4.7: Fix users-permissions Auth Controller Extension Factory Wiring

Status: ready-for-dev

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

- [ ] **Task 1: Restructure the extension** (AC: #1, #2, #3)

  - [ ] 1.1 In `strapi-server.ts`, replace the six `plugin.controllers.auth.<handler> = fn`
        assignments with a single factory wrap: capture the original export, build the
        instantiated controller inside the new factory, and return `{ ...instantiated, ...overrides }`.
  - [ ] 1.2 Move each override into that closure so it can reference the instantiated original.
  - [ ] 1.3 Handle both export shapes (function → wrap, object → assign) per AC #1.
  - [ ] 1.4 Update the `UsersPermissionsPlugin` TypeScript interface (`:540-560`) — `controllers.auth`
        is currently typed as a plain object, which is what made the defect type-invisible.
  - [ ] 1.5 Leave the `user.updateMe` assignment and the route block (`:1160-1188`) functionally
        unchanged.

- [ ] **Task 2: Fix the blind unit gate** (AC: #5, #6)

  - [ ] 2.1 Update the shared plugin-double construction in all four auth unit tests to expose
        `auth` as a factory and resolve handlers through instantiation.
  - [ ] 2.2 Run the updated tests against the **pre-fix** extension and confirm they fail; record
        the output in Completion Notes.
  - [ ] 2.3 Add the factory-survival regression test (AC #6).

- [ ] **Task 3: Verify boot + the six handlers** (AC: #4, #7)

  - [ ] 3.1 Boot `apps/strapi`; confirm no "Handler not found".
  - [ ] 3.2 Exercise register, social callback, forgotPassword, resetPassword, changeEmail,
        confirmEmailChange against the booting instance; record outcomes.
  - [ ] 3.3 Record the welcome-email / social-linking / firstName-backfill findings from
        **Behavior Activation**.

- [ ] **Task 4: Harness fixes that block the integration suite** (AC: #4) — carried over from the
      blocked `dw-integration-suite-boot-harness` bundle

  - [ ] 4.1 `apps/strapi/tests/helpers/strapi.ts` boots from a prebuilt `dist/`, but `strapi build`
        sets `noEmitOnError: true` and there are **9 pre-existing, unrelated TS errors** in
        `src/plugins/user-engagement/` (`notification.ts`, `watchlist.ts`) — so a normal build
        **emits nothing** and `dist/` silently goes stale. Add a transpile-tolerant dist pretest
        build (e.g. `tsc --noEmitOnError false`, or swc). _(Fixing the 9 TS errors is out of scope
        here — the harness must not depend on them.)_
  - [ ] 4.2 On boot failure `setupStrapi()` throws before `cleanupStrapi()` runs, leaking DB-pool
        handles ("Jest did not exit…"). Tear down on setup failure.
  - [ ] 4.3 `dist/tests/__mocks__/*` produce jest-haste-map "duplicate manual mock" warnings
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
