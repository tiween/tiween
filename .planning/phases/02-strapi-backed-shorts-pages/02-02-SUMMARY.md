---
phase: 02-strapi-backed-shorts-pages
plan: 02
subsystem: frontend-i18n-and-test-infra
tags: [i18n, next-intl, shadcn, axe-core, vitest]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: vitest globs for shorts, test/helpers (plan 01)
provides:
  - full Phase 2 copy (shorts.*, watchlist.*, errors.*) in fr, ar and en with identical key sets
  - i18n.test.ts parity and placeholder guard
  - shadcn Empty block at @/components/ui/empty
  - expectNoA11yViolations(container) axe-core helper, proven both ways
affects: [02-03, 02-05, 02-06, 02-07, 02-08, 02-09]

actuals:
  tokens: 32000
  tasks: 2
  commits: 2
plan_head_before: e1f6af111a3539a80fca7d20682560c576571564
plan_head_after: 9db28b7be0529028bfe1a9365dc10fc26f0d0815

tech-stack:
  added: [axe-core (devDependency, 4.10.3 already in lockfile)]
  patterns:
    - "Locale parity test reads the real catalogs from disk and compares ICU placeholders across fr/ar/en"
    - "Violating a11y fixtures are injected as HTML strings so jsx-a11y does not reject the test file"

key-files:
  created:
    - apps/client/src/features/shorts/i18n.test.ts
    - apps/client/src/components/ui/empty.tsx
    - apps/client/test/helpers/axe.ts
    - apps/client/test/helpers/axe.test.tsx
  modified:
    - apps/client/locales/fr.json
    - apps/client/locales/ar.json
    - apps/client/locales/en.json
    - apps/client/package.json
    - yarn.lock

key-decisions:
  - "D-09: crew role labels live in the client locale files keyed by creditRole.slug; the test pins all 21 seeded slugs and 12 departments"
  - "D-19: languageNames.ber added (berbere / البربرية / Berber) beside aeb"
  - "D-21: only the empty shadcn block was added; no avatar, no @radix-ui/react-avatar"
  - "countryLabel in fr is an ICU plural with identical one/other branches so the {count} placeholder matches ar and en (parity test)"

requirements-completed: [SPAGE-03, SPAGE-04, SPAGE-05, FR19, FR56]

completed: 2026-11-10
---

# Phase 2 Plan 02: Copy, Empty block and axe helper Summary

**All UI-SPEC copy for the shorts pages exists in fr, ar and en behind a parity test, the shadcn Empty block is in place without a new runtime dependency, and a jsdom axe-core helper is proven to pass and to fail.**

## Accomplishments

- shorts.directory.{title,catalogEmptyTitle,catalogEmptyBody}, shorts.detail.\*, heart labels (detail and card with {title}), watchlist.{loginRequiredShort,undoRemove}, errors.{INTERNAL_ERROR,NETWORK_ERROR,SHORT_FILM_NOT_FOUND}, shorts.crew (title, 12 departments, 21 roles), originalTitle, countryLabel/languageLabel (ICU plural, no hash placeholder), languageNames.{aeb,ber}, access.{free,included,subscription,rental}.
- No existing key was removed or renamed (shorts.watchlist, removeFromWatchlist, hero.\*, directory.emptyTitle and friends remain for the plans that stop using them).
- i18n.test.ts (27 tests): non-empty string for every required key in every locale, exact department/role/access/languageNames key sets, placeholder identity across locales, legacy keys still present. icu-numerals.test.ts still passes.
- expectNoA11yViolations disables color-contrast and region by default (jsdom cannot compute them; contrast is a manual pass), accepts rule overrides, and throws a message listing rule id, impact and offending HTML.

## Task Commits

1. Task 1: copy and parity test: `7a02243` feat(02-02): add shorts, watchlist and error copy in fr, ar and en
2. Task 2: Empty block and axe helper: `9db28b7` feat(02-02): add shadcn empty block and axe-core test helper

## Verification

- `yarn workspace @tiween/client vitest run src/features/shorts/i18n.test.ts src/lib/icu-numerals.test.ts test/helpers/axe.test.tsx`: Test Files 3 passed (3), Tests 35 passed (35).
- Existing shorts, api/shorts and watchlist suites (8 files, 134 tests) passed after Task 1.
- `npx tsc --noEmit`: 0 errors. `eslint src/components/ui/empty.tsx test/helpers --max-warnings=0`: clean.
- File checks: empty.tsx present, avatar.tsx absent, no apps/client/package-lock.json, `grep -c '"axe-core"'` prints 1.
- `package.json` diff adds only the axe-core devDependency; `yarn install --frozen-lockfile` passes.

## Deviations from Plan

**1. [Rule 3 - Blocking] shadcn CLI would have installed an npm package named `cn`**

- **Found during:** Task 2
- **Issue:** `npx shadcn@latest add empty` (CLI 4.23.0) resolves the registry dependency "cn" as an npm package and stalled at "Installing dependencies". Installing a package named `cn` is an unvetted install and would change dependencies, which the plan forbids (T-02-06).
- **Fix:** Did not let the CLI install anything. Used `npx shadcn@latest add empty --view` to read the official registry file and wrote it to src/components/ui/empty.tsx, replacing only the bogus `import { cn } from "cn"` with the project's `@/lib/utils` (which is what the CLI does for every other component). Parts exported as generated: Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent. The registry markup already uses semantic tokens (bg-muted, text-muted-foreground) and no shadow, so no re-skin was needed. Prettier/eslint then normalised import and class order.
- **Files modified:** apps/client/src/components/ui/empty.tsx
- **Commit:** 9db28b7

**2. [Rule 3 - Blocking] `yarn add -D axe-core` rewrote the lockfile**

- **Found during:** Task 2
- **Issue:** Yarn re-resolved axe-core to 4.14.0 and pruned about 190 unrelated lockfile lines, violating "lockfile diff limited to the new workspace edge".
- **Fix:** Restored yarn.lock and made the one-line edit `axe-core@^4.10.0, axe-core@^4.10.3:` so the existing 4.10.3 entry is reused; verified with `yarn install --frozen-lockfile`.
- **Commit:** 9db28b7

**3. [Rule 1 - Bug] violating fixture tripped lint**

- **Issue:** `<img>` without alt in the helper test failed `jsx-a11y/alt-text` (eslint --max-warnings=0).
- **Fix:** The violating fixtures are injected as HTML strings into a rendered host element.
- **Commit:** 9db28b7

**4. [Rule 1 - Bug] fr countryLabel parity**

- **Issue:** UI-SPEC gives FR "Pays" as a plain string while ar/en are `{count, plural, ...}`, so placeholders differ across locales.
- **Fix:** fr is `{count, plural, one {Pays} other {Pays}}` (identical rendered text); the plan action itself says both labels are ICU plurals on count.
- **Commit:** 7a02243

## Known Stubs

None. The Arabic role, department, access and error strings are the UI-SPEC drafts and still need the owner's Arabic review before launch (Phase 6); `shorts.access.included` is a placeholder label pending UI-SPEC open question 2.

## Threat Flags

None. Dependency surface changed by one dev dependency only (axe-core, audit verdict OK); no shadcn-installed dependency, no avatar.

## Self-Check: PASSED

- FOUND: apps/client/src/features/shorts/i18n.test.ts, apps/client/src/components/ui/empty.tsx, apps/client/test/helpers/axe.ts, apps/client/test/helpers/axe.test.tsx
- FOUND commits: 7a02243, 9db28b7
