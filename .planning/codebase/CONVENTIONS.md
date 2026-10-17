---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

<!-- refreshed: 2026-10-17 -->

# Coding Conventions

**Analysis Date:** 2026-10-17

## Naming Patterns

**Files:**

- React components: PascalCase file and folder pair, one component per folder with a barrel `index.ts`. Example: `apps/client/src/features/events/components/EventCard/EventCard.tsx`, `EventCardSkeleton.tsx`, `index.ts`, `EventCard.test.tsx`, `EventCard.stories.tsx`.
- Hooks: camelCase with `use` prefix, `.ts` extension. Example: `apps/client/src/hooks/useOnlineStatus.ts`, `apps/client/src/hooks/useUser.ts`.
- Utilities and lib modules: kebab-case or lowercase. Example: `apps/client/src/lib/feature-flags.ts`, `apps/client/src/lib/intl-locale.ts`, `apps/client/src/lib/sign-out.ts`.
- Zod/form schemas: camelCase suffixed with `Schema`. Example: `apps/client/src/features/auth/components/LoginForm/loginSchema.test.ts` tests a `loginSchema` module; `RegisterForm/registerSchema.test.ts`.
- Strapi plugin server code: kebab-case files. Example: `apps/strapi/src/plugins/events-manager/server/src/controllers/event-manager.ts`, `apps/strapi/src/extensions/users-permissions/password-reset.unit.test.ts`.
- Strapi plugin entry files use fixed names: `strapi-server.js`, `strapi-admin.js`, `server/src/index.ts`, `server/src/register.ts`, `server/src/bootstrap.ts`, `server/src/destroy.ts` (see `apps/strapi/src/plugins/events-manager/`).
- Type files suffixed `.types.ts`: `apps/client/src/features/events/types/event.types.ts`.

**Functions:**

- camelCase for functions and methods. Strapi controllers are factory functions returning object literals of async methods, e.g. `const eventManagerController = ({ strapi }) => ({ async createBulkScreenings(ctx) {...} })` in `apps/strapi/src/plugins/events-manager/server/src/controllers/event-manager.ts`.
- Client components use named function exports in feature folders (378 named `export function`/`export const` vs 30 default exports in `apps/client/src/features`). Prefer named exports for components.

**Variables:**

- camelCase for locals; UPPER_SNAKE_CASE for module constants where they are true constants (see `apps/client/src/lib/constants.ts`).
- Unused variables must be prefixed with `_` (ESLint `argsIgnorePattern`, `varsIgnorePattern`, `caughtErrorsIgnorePattern` all `^_`).

**Types:**

- TypeScript throughout both apps. Prefer `interface` for object shapes (see `interface MockCtx`, `interface Harness` in `apps/strapi/src/extensions/users-permissions/register.unit.test.ts`) and `type` for unions and aliases.
- Strapi v5 responses are flat. Never reintroduce an `attributes` wrapper (see the kernel landmine in `docs/context/kernel.md`).

## Code Style

**Formatting:**

- Prettier is the formatter. Root config: `packages/prettier-config/prettier.config.js` (shared as `@tiween/prettier-config`).
- Key settings: `semi: false`, `singleQuote: false` (double quotes), `tabWidth: 2`, `trailingComma: "es5"`, `endOfLine: "lf"`, no tabs.
- Client adds `prettier-plugin-tailwindcss` in `apps/client/prettier.config.js`. Tailwind class order is enforced by that plugin.
- Prettier is pinned to `3.3.2`. Do not bump it. Newer versions corrupt Strapi's generated TS schemas (kernel landmine).
- `.editorconfig`: LF, UTF-8, 2-space indent, final newline, trim trailing whitespace.

**Linting:**

- ESLint v9 flat config. Client: `apps/client/eslint.config.mjs` (Next preset + `typescript-eslint` recommended + `@tiween/eslint-config/plugin`). Strapi: `apps/strapi/eslint.config.mjs` (self-contained, `js.configs.recommended` + `tseslint.configs.recommended`, non-type-checked). Root `.eslintrc.js` only covers the package manager root.
- Lint runs with `--max-warnings=0` in both apps (`yarn lint`). Any warning fails CI.
- Notable rules in `apps/client/eslint.config.mjs`:
  - `@tiween/western-numerals: error`: every `Intl` formatter and `toLocale*String` call must receive a Latin-numeral locale (a `fr`/`en` literal, `-u-nu-latn`, or `toNumeralSafeLocale(...)` from `apps/client/src/lib/intl-locale.ts`).
  - `no-console`: warn, but `console.warn` and `console.error` are allowed.
  - `react/no-unstable-nested-components`: warn, with `allowAsProps: true`.
  - `jsx-a11y/alt-text` configured for `Image`, `Object`, `Area`, `InputImage`.
- Suppressions exist but are not the norm: about 30 `@ts-ignore` / `@ts-nocheck` / `eslint-disable` hits across non-test source in both apps. Add a reason comment whenever you suppress.

**Pre-commit and CI:**

- Husky (`.husky/pre-commit`) runs `lint-staged` (prettier `--write` plus `eslint --max-warnings=0`) and then `turbo lint`. Skipped during merge, rebase, cherry-pick, or revert.
- CI (`.github/workflows/ci.yml`) runs `yarn hygiene`, `yarn hygiene:test`, `yarn format:check`, `yarn lint`, `yarn type-check`, `yarn test`, `yarn build:client`, `yarn build:strapi`.
- Commits follow Conventional Commits (`commitlint.config.js`, `.czrc`, `yarn commit` via `git-cz`). No AI attribution trailers.

## Import Organization

**Order (enforced by `@ianvs/prettier-plugin-sort-imports`, see `packages/prettier-config/prettier.config.js`):**

1. Node built-ins (`node:*`)
2. Blank line
3. `react`, then `next`, then `@strapi/*`
4. Third-party modules
5. Blank line
6. Type imports (`import type`)
7. Blank line
8. `@/config`, `@/lib`, `@/utils`, `@/hooks`, `@/components`, `@/app` aliases
9. Blank line
10. Relative imports (`./`, `../`), then `@/styles`, then CSS

Example from `apps/client/src/features/events/components/EventCard/EventCard.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { EventCardEvent } from "../../types/event.types"

import { EventCard } from "./EventCard"
import { EventCardSkeleton } from "./EventCardSkeleton"
```

**Path Aliases:**

- Client: `@/*` maps to `apps/client/src/*` (`apps/client/tsconfig.json`).
- Strapi: plugin code imports relatively. Cross-plugin access goes through the target's `services/public-api.ts` facade (see `docs/context/kernel.md` and `docs/context/compass/strapi.md`).

## Error Handling

**Strapi backend:**

- Controllers wrap logic in `try/catch` and map failures to Strapi HTTP helpers: `ctx.badRequest(...)` for validation, `ctx.send(...)` for success. Example: `apps/strapi/src/plugins/events-manager/server/src/controllers/event-manager.ts` (`createBulkScreenings`).
- Validation failures return early with a message string before calling services: `if (!eventId || ...) return ctx.badRequest("Missing required fields: ...")`.
- Services throw `Error` (or Strapi `ApplicationError`/`ValidationError`), and controllers translate them. Some controllers still use `catch (error: any)` and forward `error.message`; prefer typing the catch as `unknown` and narrowing for new code.
- Extension wrappers must not fail the primary action on secondary side effects. Registration still succeeds when the welcome email throws (`apps/strapi/src/extensions/users-permissions/register.unit.test.ts` pins this behavior).
- Strapi error codes, not prose, are returned to the client. Stable codes are asserted in unit tests.

**Client (Next.js):**

- Strapi fetch errors are thrown as `Error` with a JSON-serialized `AppError` payload (`{ name, message, details, status }`). Source: `apps/client/src/lib/strapi-api/base.ts` (around lines 60-95). The base client logs with `console.error("[BaseStrapiClient] ...")` before throwing.
- The API returns error codes, not prose. Translate them in the UI with `t('errors.<CODE>')` (next-intl). Do not display raw `message` text to users.
- Keep `import "server-only"` at the top of private Strapi fetchers (`apps/client/src/lib/strapi-api/private.ts`).
- Address documents by `documentId`, never by numeric `id`.

## Logging

**Client:**

- `console.error` and `console.warn` only. Lint warns on other `console` calls.
- Prefix log messages with a bracketed module tag, e.g. `"[BaseStrapiClient] Strapi API request error: "`.

**Strapi:**

- Use `strapi.log.*` in plugin and service code (about 0 direct `console.*` calls in product code is the target; check before adding).
- Scheduled jobs and lifecycle hooks log through `strapi.log` so failures show in Strapi's logger.

## Comments

**When to Comment:**

- Explain why, not what. The codebase uses long rationale comments for non-obvious decisions, e.g. the Vitest alias ordering note in `apps/client/vitest.config.ts` and the Jest `dist/` ignore note in `apps/strapi/jest.config.cjs`.
- Reference story IDs when a rule comes from a specific BMad story, e.g. `(Story 5.8)`, `(Story 3.12)`.
- Story-tagged comments are common in tests and config. Keep them, but do not add temporal narrative ("used to", "previously").

**JSDoc/TSDoc:**

- Used on exported service methods and controllers in Strapi (e.g. `/** Create bulk screenings for an event */`) and on test files as a header block describing scope and gate membership (see `apps/strapi/src/extensions/users-permissions/register.unit.test.ts`).
- Client components rarely use JSDoc. Use it for exported utilities whose contract is non-obvious.

## Function Design

**Size:** Keep controllers thin. Business logic belongs in services under `server/src/services/`. Several controller methods exceed 40 lines today; treat that as debt, not a template.

**Parameters:**

- Destructure options objects for functions with more than two arguments, e.g. `createBulkScreenings({ eventId, movieId, dates, ... })`.
- Strapi factories take `{ strapi }` and return the object of methods.

**Return Values:**

- Services return data directly. Controllers call `ctx.send({ message, data })` for success envelopes.
- Client fetchers return the flat Strapi payload (`response.data.title`), not an `attributes` remap.

## Module Design

**Exports:**

- Client feature components: named exports from `index.ts` barrels (for example `apps/client/src/features/events/components/EventCard/index.ts`). Use the barrel as the import surface.
- Strapi plugins: export from `server/src/index.ts` (lifecycle functions and the `services`/`controllers`/`routes` maps). Cross-plugin consumers import only the target's `services/public-api.ts`.

**Barrel Files:**

- Used in `apps/client/src/features/*/components/*/index.ts` and `apps/client/src/features/events/components/index.ts`.
- Do not add barrels that re-export across feature boundaries; it creates cycles.

## Client Content and Locale Rules

- Translations live in `apps/client/locales/` (not under `src/`). Use `next-intl` (`useTranslations`) in components. About 77 files use `useTranslations`.
- Arabic uses Western digits and `DD/MM/YYYY`. Never format with a raw `ar` locale. Use `toNumeralSafeLocale` from `apps/client/src/lib/intl-locale.ts`.
- Per-user TanStack query keys must include `userId`. Clear per-user caches on logout through `signOutAndClearCache` in `apps/client/src/lib/sign-out.ts`.

---

_Convention analysis: 2026-10-17_
