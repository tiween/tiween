---
status: blocked
bundle: integration-suite-boot-harness
dw_ids: [DW-4, DW-5, DW-86]
warnings: [out-of-scope-boot-blocker]
---

# BMad Dev Auto Result

Status: **blocked**

Blocking condition: **The bundle's named boot blocker (`db.config.connection`) is already
resolved; the _actual_ current blocker is an out-of-scope users-permissions auth-controller
extension bug that hard-fails Strapi boot and cannot be fixed within this test-infrastructure
bundle's scope. All three DW items require a booting Strapi and are therefore blocked behind it.**

## Summary

This bundle (DW-4, DW-5, DW-86) asks to fix the boot-based integration harness so opt-in
suites run, then use the booted suite to re-confirm order/ticket transaction threading (DW-4)
and add guest-order-linking integration coverage (DW-86). Investigation shows the premise is
stale and the real blocker is a different, larger, cross-cutting bug.

## Key findings (evidence gathered)

### 1. DW-5's named cause (`db.config.connection`) is already fixed

A boot probe against a freshly-emitted `dist/` progresses through DB connection and migrations
all the way to route composition — the failure now surfaces in `initRouting`
(`@strapi/core/.../register-routes.ts` → `compose-endpoint.ts`), far past database setup. The
test DB config (`apps/strapi/config/env/test/database.ts`, SQLite `.tmp/test.db`) loads cleanly.
No `db.config.connection` / "Cannot destructure property 'client'" error occurs anymore.

### 2. The actual current boot blocker (root cause, proven)

Boot aborts with:
`Error creating endpoint POST /auth/change-email: Handler not found "auth.changeEmail"`.

Root cause: `@strapi/plugin-users-permissions` exports its **`auth` controller as a factory
function** (`node_modules/@strapi/plugin-users-permissions/server/controllers/auth.js:40` →
`module.exports = ({ strapi }) => ({...})`), while its **`user` controller is a plain object**
(`.../user.js:37`). The project extension
`apps/strapi/src/extensions/users-permissions/strapi-server.ts` assigns handlers via
`plugin.controllers.auth.<handler> = fn` — i.e. onto the factory **function object**. When
Strapi later _calls_ the factory to instantiate the controller, those assigned handlers are not
on the produced object → "Handler not found". `user.updateMe` (unshifted to route index 0)
resolves fine precisely because `user` is a plain object.

Empirical proof (temporary diagnostic at extension entry, since reverted):
`[EXT-DIAG] typeof auth= function  typeof user= object  auth.register type= undefined`.

Because `const originalRegister = plugin.controllers.auth.register` reads `undefined` from the
factory, the auth overrides could not be trivially "activated" either — they must be
restructured to close over the _instantiated_ originals.

### 3. Blast radius — six inert auth handlers across Epic 4

Every `plugin.controllers.auth.*` customization is silently inert at runtime (it passes the
mocked unit gate, which reads handlers off an object, never through Strapi's factory
instantiation):

| Handler              | Story | Runtime effect today                                                  |
| -------------------- | ----- | --------------------------------------------------------------------- |
| `register`           | 4.1   | firstName persistence + welcome email never run (stock register runs) |
| `callback`           | 4.2   | social-login account-linking + welcome email never run                |
| `forgotPassword`     | 4.3   | override never runs                                                   |
| `resetPassword`      | 4.3   | override never runs                                                   |
| `changeEmail`        | 4.4   | never resolves — **its route hard-fails boot**                        |
| `confirmEmailChange` | 4.4   | never resolves                                                        |

This is the same class of "silent runtime no-op that passes the green unit gate" that DW-86
itself warns about — here in the auth layer, and severe enough to break app boot.

### 4. Why the whole bundle is blocked

DW-4 (live-DB transaction re-confirm), DW-5 (un-skip `order.service.test.ts` + `status:published`
fixture), and DW-86 (guest-linking integration coverage) all require a **booting** Strapi to be
runnable/verifiable. None can be delivered as a hardened, verified artifact while boot fails.
Writing tests that cannot be executed would violate the workflow's testable/verified standard.

### 5. Secondary harness observations (for the follow-up story, not fixed here)

- The harness (`apps/strapi/tests/helpers/strapi.ts`) boots from a **prebuilt `dist/`**, but
  `strapi build` sets `noEmitOnError: true` in `tsconfig.json` and there are 9 pre-existing,
  unrelated TS errors in `src/plugins/user-engagement/` (notification.ts, watchlist.ts) — so a
  normal build **emits nothing** and `dist/` silently goes stale. Integration runs need a
  transpile-tolerant dist build step (e.g. `tsc --noEmitOnError false`, or swc) as a pretest.
- On boot failure, `setupStrapi()` throws before `cleanupStrapi()` runs, leaving open DB-pool
  handles ("Jest did not exit…"). The harness should tear down on setup failure.
- `dist/tests/__mocks__/*` cause jest-haste-map "duplicate manual mock" warnings (cosmetic).

## Why this is blocked rather than expanded in-place

The correct fix — wrap the `auth` controller factory, restructure all six handlers to close
over the instantiated originals, update every Epic-4 auth unit test (register/social/reset/
profile-management) to instantiate the factory, and **activate previously-dead production
behavior** (welcome emails, social-login linking, password-reset customizations) — is a
cross-cutting Epic-4 auth change with real production blast radius. This test-infrastructure
bundle scoped "one shared harness touchpoint"; silently ballooning it into a multi-story auth
refactor with live behavior changes in an unattended run is not safe.

## Recommended resolution path (for the orchestrator / human)

1. Create a dedicated Epic-4 story: **"Fix users-permissions auth controller extension factory
   wiring"** — wrap the `auth` factory so all six overrides live on the instantiated controller;
   update the affected auth unit tests; verify boot + auth flows end-to-end. Treat the newly
   activated behaviors (welcome email, social linking) as behavior changes requiring review.
2. Add the transpile-tolerant dist pretest build + setup-failure teardown to the harness (may
   fold into step 1 or a small harness story).
3. Once Strapi boots, **re-run this bundle** (DW-4/DW-5/DW-86) — the harness work (un-skip suite,
   `status:published` fixture, live-DB transaction re-confirm, guest-linking coverage) is then a
   genuinely small, verifiable "one shared harness touchpoint" as originally intended.

## Working-tree state

Clean. No source changes committed or left behind (diagnostic reverted; boot-probe test removed;
`apps/strapi/dist/` is gitignored). The deferred-work ledger was **not** edited, per instruction.
