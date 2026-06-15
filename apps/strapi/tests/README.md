# Strapi Test Suite

Tests for the `apps/strapi` Strapi v5 application, with a focus on the
`events-manager` plugin. This document is the **template** for adding test
coverage to the other custom plugins (`creative-works`, `geography`,
`ticketing`, `entity-properties`, `tmdb-integration`, `user-engagement`).

## Running the suite

From `apps/strapi/`:

```bash
yarn test                   # full suite (server + admin projects)
yarn test:watch             # watch mode
yarn test:coverage          # coverage report
yarn test <path-glob>       # run a single file or pattern
```

Required env: none — the test runner sets `NODE_ENV=test`,
`DATABASE_CLIENT=sqlite`, and `DATABASE_FILENAME=.tmp/test.db` automatically
via `tests/helpers/strapi.ts`.

## Architecture

Two Jest projects coexist (see `jest.config.ts`):

| Project  | Environment | Pattern                                                                | Used for                                                                     |
| -------- | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `server` | node        | `tests/**/*.test.ts`, `src/plugins/*/server/**/__tests__/**/*.test.ts` | Boots a real Strapi instance against SQLite; runs service + controller tests |
| `admin`  | jsdom       | `src/plugins/*/admin/**/__tests__/**/*.test.tsx`                       | Renders admin React components via @testing-library/react                    |

This separation matters: server tests need ~20s to boot Strapi and run in a
node env with no DOM globals. Admin tests run in jsdom and never touch a
database — they're fast (~3–5s per file) and isolated.

## Shared infrastructure

- **`tests/helpers/strapi.ts`** — `setupStrapi()` / `cleanupStrapi()` /
  `getStrapi()`. Reuses a single Strapi instance across `describe` blocks
  in the same file (Strapi boot is 15–20s per file). Calls
  `strapi.destroy()` to cancel `node-schedule` cron jobs before tearing
  down the DB pool, otherwise a fired job throws `ERR_UNHANDLED_ERROR`
  during shutdown and breaks the exit code.
- **`tests/helpers/auth.ts`** — `seedUserAndJwt()` for users-permissions
  users. Note: **admin** users (which the events-manager plugin's routes
  require) need a different helper that issues a Strapi admin JWT, not a
  users-permissions JWT — see "Deviations" below.
- **`tests/fixtures/events.ts`** — `seedVenue()`, `seedEvent()`,
  `seedShowtime()`, `cleanupContent()`. All seeders use the v5 Document
  Service API (`strapi.documents(uid)`) — never the deprecated v4 Entity
  Service — so lifecycle hooks fire the same way as production.
- **`tests/__mocks__/strapi-admin.ts`** — minimal jest mocks for the
  hooks exported by `@strapi/strapi/admin` (`useFetchClient`,
  `useNotification`, `useTracking`, `useRBAC`, `useAuth`, `Page`,
  `Layouts`). Only the surface that components actually pull is mocked;
  add to it as you cover more components.
- **`tests/__mocks__/style-mock.ts`** — stub for `.css/.less/.scss`
  imports in admin tests.
- **`tests/setup-jsdom.ts`** — extends `expect` with
  `@testing-library/jest-dom` matchers (`toBeInTheDocument`,
  `toHaveAttribute`, …) for the admin project.

## Template for adding tests to another plugin

Adding test coverage for, say, `creative-works`:

1. **Services**: create
   `src/plugins/creative-works/server/src/services/__tests__/<service>.service.test.ts`

   - Import `setupStrapi`, `cleanupStrapi` from `tests/helpers/strapi.ts`
   - Boot once with `beforeAll`, cleanup with `afterAll`
   - Reach services via `strapi.plugin('creative-works').service('<name>')` —
     never `require()` the source directly (bypassing the registry hides
     wiring bugs)
   - Add per-plugin fixtures alongside the existing
     `tests/fixtures/events.ts`, keyed by plugin name

2. **Controllers**: create
   `src/plugins/creative-works/server/src/controllers/__tests__/<controller>.controller.test.ts`

   - Build a minimal Koa-like `ctx` stub (see
     `events-manager.controller.test.ts` for the pattern) — this isolates
     controller logic from HTTP transport without needing Supertest +
     admin auth plumbing
   - Or, once an admin-auth helper exists, layer Supertest tests on top

3. **Admin components**: create
   `src/plugins/creative-works/admin/src/components/__tests__/<Component>.test.tsx`
   - Mount via `<DesignSystemProvider theme={lightTheme}>` (real components
     — they're presentational and the design system has no fetch deps)
   - For components that pull `@strapi/strapi/admin` hooks, the
     module-name-mapper in `jest.config.ts` automatically swaps in
     `tests/__mocks__/strapi-admin.ts`

## Known caveats

### SQLite vs Postgres divergence

Tests run against SQLite for speed and isolation. Production runs Postgres.
A handful of behaviors differ:

| Behavior          | SQLite                        | Postgres                         | Notes                                                         |
| ----------------- | ----------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Default collation | case-sensitive                | locale-aware (collate "default") | `ORDER BY name` may sort differently                          |
| JSONB queries     | falls back to JSON1 functions | native JSONB                     | nested `?` / `@>` operators may not exist in SQLite           |
| `ILIKE`           | not supported                 | case-insensitive `LIKE`          | Strapi's query builder normalizes this, but raw queries break |
| Boolean columns   | INTEGER 0/1                   | true/false                       | usually transparent via knex                                  |

When in doubt about a database-edge case, write the test, run it, AND spot-
check the same scenario manually against Postgres. The SQLite suite catches
~90% of regressions cheaply; the remainder need integration in a Postgres
test container (future story).

### Per-file Strapi boot is slow

Each server test file boots a fresh Strapi instance (~15–20s). The
`instance` cache in `tests/helpers/strapi.ts` reuses across `describe`
blocks within a file, but not across files. **Prefer fewer, larger test
files over many small ones** — coverage is per-test, not per-file.

### Plugin admin routes need an admin JWT

Strapi v5 plugin routes typed `admin` (see
`server/src/routes/index.ts`) mount at `/admin/<plugin>/...` and require
an admin user JWT (not a users-permissions JWT). The current suite tests
the controller surface via `ctx` stubs to avoid this plumbing — see the
Deviations section in story 2B.16 for the rationale and the follow-up
required to add full end-to-end Supertest tests.

## CI

CI integration for `yarn test` is **explicitly out of scope** for the
initial coverage story (2B.16). When wiring CI:

- Run `yarn test` in `apps/strapi` after `yarn build` (so `dist/` exists)
- Each server test file adds ~20s to wall clock — budget accordingly
- Set `CI=true` to disable color output in winston logger
