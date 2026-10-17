---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

<!-- refreshed: 2026-10-17 -->

# Testing Patterns

**Analysis Date:** 2026-10-17

## Test Framework

**Client (`apps/client`):**

- Vitest (config: `apps/client/vitest.config.ts`), jsdom environment, `globals: true`.
- Testing Library: `@testing-library/react` and `@testing-library/jest-dom/vitest` (registered in `apps/client/test/setup.ts`).
- Stubs: `apps/client/test/stubs/` (including a no-op `server-only` stub aliased in Vitest).
- Include list is explicit. `apps/client/vitest.config.ts` has an `include` array of globs. A new test file under a path not listed there will never run. Add its glob when you add a test area.

**Strapi (`apps/strapi`):**

- Jest (config: `apps/strapi/jest.config.cjs`), two projects:
  - `server`: node environment, `ts-jest` with `diagnostics: false` and `isolatedModules: true`.
  - `admin`: jsdom environment for `*.test.tsx`, with `tests/setup-jsdom.ts` and moduleNameMappers for CSS and `@strapi/strapi/admin`.
- Assertion library: Jest built-in `expect`. Mocks: `jest.fn`, `jest.mock`.

**Run commands:**

Root (Turbo, runs both apps):

```bash
yarn test                                   # turbo test -> vitest run (client) + jest unit gate (strapi)
```

Client:

```bash
cd apps/client && yarn test                 # vitest run (all)
cd apps/client && yarn test:watch           # vitest watch mode
cd apps/client && yarn vitest run <file>    # single file
```

Strapi:

```bash
yarn workspace @tiween/admin test                       # jest, default unit gate (*.unit.test.ts + admin *.test.tsx)
yarn workspace @tiween/admin test:coverage              # jest --coverage
yarn workspace @tiween/admin test:integration           # boot-based *.service.test.ts / *.controller.test.ts / tests/app.test.js
yarn workspace @tiween/admin jest <file>                # single file
```

Type-check (CI): `yarn type-check` (`tsc --noEmit`). Test files are excluded from client `tsconfig.json` (`"exclude": ["**/*.test.tsx", "**/*.test.ts"]`), so tests are not type-checked there.

**No E2E suite.** Do not invent a `test:e2e` script. Playwright is not a dependency.

**Install before testing in a worktree:** `yarn install --frozen-lockfile` (see `docs/context/kernel.md`).

## Test File Organization

**Location:**

- Client: co-located next to the source file (`EventCard.test.tsx` beside `EventCard.tsx`, `dates.test.ts` beside `dates.ts`). Never create `__tests__/` in `apps/client`.
- Strapi: two patterns coexist.
  - Co-located with `.unit.test.ts` next to the source: `apps/strapi/src/extensions/users-permissions/register.unit.test.ts`, `apps/strapi/src/bootstrap/social-providers.unit.test.ts`, `apps/strapi/src/lifeCycles/user.unit.test.ts`.
  - In `__tests__/` directories inside plugins: `apps/strapi/src/plugins/events-manager/server/src/__tests__/planning-surface-writes.service.test.ts`, `apps/strapi/src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts`, `apps/strapi/src/plugins/ticketing/server/src/services/__tests__/order.service.test.ts`, `apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/event-manager.controller.test.ts`.
- Shared Strapi helpers: `apps/strapi/tests/helpers/` and `apps/strapi/tests/fixtures/`. Global `tests/app.test.js`.

**Naming:**

- Client: `<Subject>.test.tsx` or `<subject>.test.ts`. Env-specific: `feature-flags.env.test.ts`. Route-specific: `proxy.flag.test.ts`.
- Strapi: `<subject>.unit.test.ts` (must-pass gate), `<subject>.service.test.ts` and `<subject>.controller.test.ts` (boot-based integration, opt-in). Admin components: `*.test.tsx`.

**Gate membership:**

- Strapi default `yarn test` runs only `**/*.unit.test.ts` (server project) plus admin `*.test.tsx`. Boot-based suites are excluded so a DB or boot failure cannot block CI. CI runs `yarn test`, so integration suites are skipped in CI. Run them explicitly with `test:integration`.
- The kernel rule: never report a story verified when its verification command could not run. Mark it blocked.

**Structure:**

```
apps/client/src/features/<feature>/components/<Component>/
├── <Component>.tsx
├── <Component>.test.tsx
├── <Component>.stories.tsx
├── <Component>Skeleton.tsx
└── index.ts
apps/strapi/src/plugins/<plugin>/server/src/
├── controllers/__tests__/<name>.controller.test.ts
└── services/__tests__/<name>.service.test.ts
```

## Test Structure

**Suite Organization (client):**

```typescript
describe("EventCard", () => {
  describe("Rendering", () => {
    it("renders event title", () => {
      render(<EventCard event={mockEvent} />)
      expect(screen.getByText("Test Event")).toBeInTheDocument()
    })
  })
})
```

Source: `apps/client/src/features/events/components/EventCard/EventCard.test.tsx`. Group by behavior inside `describe` blocks, use `it` (not `test`) in client code. About 1,029 `it(` blocks exist in client source.

**Suite Organization (strapi unit):**

```typescript
import registerExtension from "./strapi-server"

interface Harness {
  register: (ctx: MockCtx) => Promise<unknown> /* mocks */
}

function buildHarness(opts = {}): Harness {
  /* build mocked strapi + ctx */
}
```

Source: `apps/strapi/src/extensions/users-permissions/register.unit.test.ts`. Build a harness per test with a helper function, not shared mutable state. Each file header states the I/O matrix it covers and whether it is part of the must-pass gate.

**Patterns:**

- Setup: `beforeEach` / `beforeAll` for shared Strapi boot (`setupStrapi()` in `apps/strapi/tests/helpers/strapi.ts`).
- Teardown: `afterAll(cleanupStrapi)`. `cleanupStrapi` calls `strapi.destroy()` first to cancel `node-schedule` jobs. Otherwise shutdown throws `ERR_UNHANDLED_ERROR`.
- Config sets `clearMocks: true` in Jest and tests should not depend on call counts leaking across files.
- Assertions: `toBeInTheDocument`, `toHaveAttribute`, `toBeDisabled` (jest-dom) in client and admin tests. `toEqual`, `toThrow`, `toHaveBeenCalledWith` in unit tests.

## Mocking

**Client (Vitest):**

- Use `vi.mock` with hoisted state via `vi.hoisted` for per-test flips:

```typescript
const { purchaseFlag } = vi.hoisted(() => ({ purchaseFlag: { enabled: true } }))
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => purchaseFlag.enabled,
}))
```

Source: `apps/client/src/features/events/components/EventCard/EventCard.test.tsx`.

- Mock `next-intl` by echoing the key so tests assert wiring, not copy:

```typescript
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.price === undefined ? key : `${key}:${values.price}`,
}))
```

- Mock `next/image` as a plain `<img>` with an `eslint-disable-next-line` comment for `@next/next/no-img-element`.
- The `server-only` import is aliased to `apps/client/test/stubs/server-only.ts`. Do not mock it per file.

**Strapi (Jest):**

- Build a mocked Strapi object with `jest.fn` for `plugin`, `service`, `log`, and the user service. Example in `apps/strapi/src/extensions/users-permissions/register.unit.test.ts` (`mockStrapi = { plugin: jest.fn(() => ...) }`).
- Boot-based tests use the real instance via `tests/helpers/strapi.ts`. Reach services with `strapi.plugin('<name>').service('<svc>')`, never `require()` the source directly.
- Admin auth and public auth are different systems. Use `tests/helpers/admin.ts` for admin routes and `tests/helpers/auth.ts` for users-permissions routes. The wrong one returns 401 silently.
- Admin React hooks are mocked centrally in `apps/strapi/tests/__mocks__/strapi-admin.ts` (`useFetchClient`, `useNotification`, `useTracking`, `useRBAC`, `useAuth`, `Page`, `Layouts`). Extend that file when a component needs another hook.

**What to Mock:**

- External services and network: Strapi fetchers in client tests, the Brevo email provider, Algolia, and reCAPTCHA.
- Feature flags (`@/lib/feature-flags`) when a test covers a gated path.
- `next/image`, `next-intl` (for key echoing), and `next/navigation` in component tests.
- The Strapi instance and services in unit tests (`strapi.plugin`, `strapi.log`, `strapi.documents`).

**What NOT to Mock:**

- The Document Service inside boot-based Strapi integration tests. Those tests exist to exercise lifecycle hooks against SQLite.
- Pure utilities (`dates.ts`, `intl-locale.ts`, schema validation). Test them directly.
- The Zod schemas used by forms. Test the schema file with its own `*Schema.test.ts`.

**Known pitfall:** Vitest resolves React through an alias pinned to the root hoisted React copy (`apps/client/vitest.config.ts`). Do not remove the `react`, `react-dom`, or `dedupe` entries, or component tests fail with element-shape or null-dispatcher errors. Vite string aliases prefix-match, so specific subpaths must precede bare `react` entries.

## Fixtures and Factories

**Strapi fixtures:**

- `apps/strapi/tests/fixtures/events.ts` exports `seedVenue()`, `seedEvent()`, `seedShowtime()`, `cleanupContent()`. All use the v5 Document Service (`strapi.documents(uid)`), never the Entity Service.
- `apps/strapi/tests/fixtures/index.ts` re-exports them.
- Add per-plugin fixtures next to the existing file, keyed by plugin name.

**Client fixtures:**

- Inline `const mockEvent: EventCardEvent = {...}` objects at the top of each test file. No shared factory module is in use for client tests.

**Location:**

- Strapi: `apps/strapi/tests/fixtures/`, `apps/strapi/tests/__mocks__/`.
- Client: `apps/client/test/` (setup and stubs) and inline in test files.

## Coverage

**Requirements:** None enforced. There is no `coverageThreshold` in `apps/strapi/jest.config.cjs` or `apps/client/vitest.config.ts`. CI does not fail on coverage.

**View Coverage:**

```bash
cd apps/strapi && yarn test:coverage                 # jest --coverage (writes apps/strapi/coverage/)
cd apps/client && yarn vitest run --coverage         # requires @vitest/coverage-* provider; not wired in package.json
```

## Test Types

**Unit Tests (client):**

- Utilities, schemas, hooks, and component rendering. About 113 `*.test.ts(x)` files under `apps/client/src`.
- Include lists in `vitest.config.ts` gate which globs run. Keep the list in sync when adding areas.

**Unit Tests (Strapi, must-pass gate):**

- `*.unit.test.ts` with mocked Strapi, no DB. About 74 files under `apps/strapi/src`. Covers extensions (`users-permissions/*`), bootstrap, lifecycles, and utilities such as `apps/strapi/src/shared/__tests__/website-url.unit.test.ts`.

**Integration Tests (Strapi, opt-in):**

- Boot-based `*.service.test.ts`, `*.controller.test.ts`, and `apps/strapi/tests/app.test.js`. They boot Strapi against SQLite (`.tmp/test.db`) via `tests/helpers/strapi.ts`. Set `NODE_ENV=test`, `DATABASE_CLIENT=sqlite`, `DATABASE_FILENAME=.tmp/test.db` (set automatically by the helper).
- Run with `yarn workspace @tiween/admin test:integration`. It runs `build:test-dist` first and uses `--runInBand`.
- Roughly 1,010 `it(` blocks exist across Strapi source, most in these suites.

**Admin Component Tests (Strapi plugins):**

- `*.test.tsx` under `apps/strapi/src/plugins/*/admin/` in jsdom with `@testing-library/react`. Example pattern: `apps/strapi/tests/setup-jsdom.ts`.

**Integration tests (client):**

- Not separate. Hooks and route-level components are tested with Testing Library and mocked fetchers.

**E2E Tests:**

- Not used. No Playwright or Cypress. Chromatic runs Storybook visual checks in CI (`.github/workflows/chromatic.yml`).

**Storybook:**

- Stories are co-located (`EventCard.stories.tsx`). About 58 story files under `apps/client/src`. Build with `yarn build-storybook` (client).

## Common Patterns

**Async Testing (Vitest):**

```typescript
it("registers and sends welcome email", async () => {
  const h = buildHarness()
  await h.register(ctx)
  expect(h.emailSend).toHaveBeenCalledTimes(1)
})
```

Use `async` test bodies and `await` the subject. Do not use `done` callbacks.

**Error Testing (Strapi unit):**

```typescript
it("does not fail registration when the welcome email throws", async () => {
  const h = buildHarness({
    emailSend: jest.fn(async () => {
      throw new Error("smtp down")
    }),
  })
  await expect(h.register(ctx)).resolves.toBeDefined()
  expect(h.logError).toHaveBeenCalled()
})
```

Assert stable error codes, not message prose, when the contract is a code.

**Error Testing (client):**

- Assert the rendered translation key (`errors.<CODE>`) through the `next-intl` echo mock rather than English copy.

**Story-tagged tests:**

- Tests and configs reference the BMad story they verify (`Story 5.8`). Keep those references so coverage can be traced in `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Known Gaps and Hygiene

- `apps/client/src/features/events/components/EventCard/EventCard.test.tsx` has a stale header telling the reader to install Vitest and uses `// @ts-nocheck`. Vitest is already installed and wired. Remove the stale header and `@ts-nocheck` when touching the file.
- Several client tests use `@ts-nocheck` (`apps/client/src/features/auth/components/RegisterForm/*.test.tsx`, `LoginForm/loginSchema.test.ts`). Tests are excluded from `tsc`, so type drift is not caught. Fix by typing fixtures against the real types.
- The Strapi README (`apps/strapi/tests/README.md`) references a `jest.config.ts`. The repo uses `jest.config.cjs`. Trust the file, not the README.
- Strapi plugins `creative-works`, `geography`, `ticketing`, `entity-properties`, `tmdb-integration`, and `user-engagement` have thin or no boot-based coverage. The README lists them as templates for future coverage.
- Admin component tests exist for only a few plugins (about 8 `*.test.tsx` under `apps/strapi/src`).
- Coverage is not measured in CI.

---

_Testing analysis: 2026-10-17_
