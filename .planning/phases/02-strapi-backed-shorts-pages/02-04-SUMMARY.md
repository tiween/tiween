---
phase: 02-strapi-backed-shorts-pages
plan: 04
subsystem: frontend-nav-and-auth
tags: [feature-flag, navigation, open-redirect, next-intl, next-auth, vitest]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: vitest globs for src/lib (plan 01)
provides:
  - isTicketingEnabled() backed by NEXT_PUBLIC_TICKETING_ENABLED (default off)
  - BottomNav with three tabs by default and DesktopNav without a tickets link
  - safeCallbackUrl(raw) and toRouterPath(path) in src/lib/safe-callback-url.ts
  - callbackUrl sanitized at every read in SignInForm, SignInFormWithSocial, RegisterForm, ResetPasswordForm
affects: [02-09]

actuals:
  tokens: 9600
  tasks: 2
  commits: 2
plan_head_before: 24676b6ee5bffc0357c9228061b9b32c78f66c3b
plan_head_after: 8702b0c8c02ce46f18b94ff030fa004396831b1e

tech-stack:
  added: []
  patterns:
    - "Navigation entries gated through the single feature-flags seam; the dormant route and components stay in the tree"
    - "Sanitize a user-controlled redirect once where it is read, then strip the locale only for the next-intl router push"

key-files:
  created:
    - apps/client/src/lib/safe-callback-url.ts
    - apps/client/src/lib/safe-callback-url.test.ts
    - apps/client/src/app/[locale]/auth/signin/_components/SignInForm.test.tsx
  modified:
    - apps/client/src/env.mjs
    - apps/client/.env.local.example
    - apps/client/src/lib/feature-flags.ts
    - apps/client/src/lib/feature-flags.test.ts
    - apps/client/src/lib/feature-flags.env.test.ts
    - apps/client/src/components/layout/BottomNav/BottomNav.tsx
    - apps/client/src/components/layout/BottomNav/BottomNav.test.tsx
    - apps/client/src/components/layout/DesktopNav/DesktopNav.tsx
    - apps/client/src/components/layout/DesktopNav/DesktopNav.test.tsx
    - apps/client/src/app/[locale]/events/parameterizedLabelsBinding.test.tsx
    - apps/client/src/app/[locale]/auth/signin/_components/SignInForm.tsx
    - apps/client/src/app/[locale]/auth/signin/_components/SignInFormWithSocial.tsx
    - apps/client/src/app/[locale]/auth/signin/_components/SignInFormWithSocial.test.tsx
    - apps/client/src/app/[locale]/auth/register/_components/RegisterForm.tsx
    - apps/client/src/app/[locale]/auth/register/_components/RegisterForm.test.tsx
    - apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.tsx

key-decisions:
  - "D-17: only the navigation entry is gated; /tickets, ticketing components and the narrower NEXT_PUBLIC_TICKET_PURCHASE_ENABLED flag are untouched and not reused"
  - "D-14: safeCallbackUrl is the ResetPasswordForm logic moved verbatim; toRouterPath is a correctness helper applied only where the next-intl router consumes the path, so OAuth signIn and window.location keep the prefixed path"
  - "The locale list in safe-callback-url.ts is a local constant mirroring routing.locales, because importing @/lib/navigation pulls env.mjs and createNavigation into every consumer and breaks the form suites that mock it"

requirements-completed: []

completed: 2026-11-10
---

# Phase 2 Plan 04: Tickets nav gate and safe sign-in return path Summary

**The tickets tab and link are hidden by default behind `NEXT_PUBLIC_TICKETING_ENABLED`, and one `safeCallbackUrl` now guards every post-login redirect in the four auth forms, with the locale prefix stripped only for the next-intl router push so a return from sign-in on /ar, /en or /fr lands on the right page.**

## Accomplishments

- `NEXT_PUBLIC_TICKETING_ENABLED` added to `env.mjs` (client block plus `runtimeEnv`, `optionalZodBoolean`) and documented in `.env.local.example`; `isTicketingEnabled()` sits next to `isTicketPurchaseEnabled()` in `feature-flags.ts`. Absent, empty or any non-"true" value is off.
- `BottomNav` filters `tickets` out of its tab order when the flag is off (three tabs: home, search, account; account badge unchanged); `DesktopNav` filters the tickets item the same way. `TabType`, `NavItemType`, props and callers are unchanged.
- `safe-callback-url.ts` holds `safeCallbackUrl` (moved from `ResetPasswordForm`, which now imports it) and `toRouterPath` (strips exactly one leading `/ar`, `/en` or `/fr` segment when followed by `/`, `?`, `#` or end).
- `SignInForm` and `SignInFormWithSocial` sanitize once, pass the result to `signIn` (credentials and OAuth) and call `router.push(toRouterPath(callbackUrl))`. `RegisterForm` sanitizes once for `signIn(provider)` and `window.location.href`. `ResetPasswordForm` deletes its private copy.
- No file under `src/app/[locale]/tickets` or `src/features/tickets` changed (`git log --name-only` over the plan range prints nothing).

## Test results

- `feature-flags` unit and unmocked-env suites cover the new flag, including independence from the purchase flag.
- `BottomNav` (three tabs in order with the flag off, four with it on, account badge still works with tickets hidden) and `DesktopNav` (no tickets link off, link to `/fr/tickets` on).
- `safe-callback-url.test.ts`: 31 cases (every hostile shape returns `/`, safe paths unchanged, locale stripping and its non-matches).
- Form suites: hostile values (protocol-relative, backslash, absolute, `javascript:`, control character) reach `router.push` / `signIn` / `window.location.href` only as `/`; a safe `/ar/shorts/x` reaches the router as `/shorts/x` and the OAuth `signIn` / `window.location` as `/ar/shorts/x`. New `SignInForm.test.tsx` covers the fourth form, which had no test file.
- Mutation check: replacing `toRouterPath(callbackUrl)` with `callbackUrl` in `SignInFormWithSocial` makes the doubled-prefix test fail (1 failed, 22 passed); the change was reverted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stub update needed in one nav-rendering suite**

- **Found during:** Task 1 verify run
- **Issue:** `parameterizedLabelsBinding.test.tsx` stubs `@/lib/feature-flags` with only `isTicketPurchaseEnabled`; `BottomNav` now calls `isTicketingEnabled` and the suite threw. It asserts the tickets badge label, so the stub returns `true`.
- **Fix:** added `isTicketingEnabled: () => true` to that stub, in the same commit as the nav change. `parameterizedLabelsI18n.test.tsx` and the home `page.test.tsx` needed no change (they passed unmodified).
- **Commit:** 6f29eff

### Additions beyond the plan's file list

- `SignInForm.test.tsx` (new) so the credentials-only form has a regression guard for the same hostile and locale-prefixed cases; the plan listed only the social and register suites.

### Notes

- `tsc --noEmit` reports 0 errors across the client app (the STATE note about 46 pre-existing errors is no longer true at this HEAD).
- The Task 1 and Task 2 baselines ("four tabs at HEAD", "grep -c safeCallbackUrl prints 0 in SignInForm.tsx") were confirmed from the source before editing; tests were written alongside the implementation rather than as a separate failing-first commit.
- REQUIREMENTS.md was not touched: FR19 needs the heart UI plans (05-09), which are not done.

## Verification run

| Verify            | Command                                                                                                                       | Result                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Task 1 (focused)  | `yarn workspace @tiween/client vitest run src/lib/feature-flags src/components/layout "src/app/[locale]/events" ... HomePage` | Test Files 9 passed (9), Tests 67 passed (67)     |
| Task 1 (wider)    | `yarn workspace @tiween/client vitest run src/app src/features/events/components`                                             | Test Files 52 passed (52), Tests 474 passed (474) |
| Full client suite | `yarn workspace @tiween/client vitest run` (before commit 1)                                                                  | Test Files 121 passed, Tests 1364 passed          |
| Task 2 (tests)    | `yarn workspace @tiween/client vitest run src/lib/safe-callback-url.test.ts "src/app/[locale]/auth"`                          | Test Files 16 passed (16), Tests 165 passed (165) |
| Task 2 (types)    | `yarn workspace @tiween/client tsc --noEmit`                                                                                  | Done, no `error TS` lines                         |
| Lint              | `eslint src/lib src/components/layout "src/app/[locale]/auth" --max-warnings=0`                                               | exit 0                                            |
| Plan verification | `vitest run src/lib src/components/layout "src/app/[locale]/auth" "src/app/[locale]/events" src/features/events/components`   | Test Files 48 passed (48), Tests 500 passed (500) |

## Known Stubs

None.

## Threat Flags

None. T-02-10 (open redirect) is mitigated at all four forms; T-02-11 accepted (boolean visibility flag, no secret). No endpoint, auth path or schema was added.

## Self-Check: PASSED

- FOUND: safe-callback-url.ts, safe-callback-url.test.ts, SignInForm.test.tsx, feature-flags.ts (`isTicketingEnabled`)
- FOUND commits: 6f29eff, 8702b0c (ancestors of HEAD)
