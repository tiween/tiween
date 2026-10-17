---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

# Codebase Structure

**Analysis Date:** 2026-10-17

## Directory Layout

```
tiween-bmad-version/
├── apps/
│   ├── client/                 # @tiween/client — Next.js App Router frontend
│   │   └── src/
│   │       ├── app/            # routes ([locale]/*, api/*, sw.ts, sitemap, robots)
│   │       ├── components/     # shared UI (common, elementary, forms, layout, ui, ...)
│   │       ├── features/       # domain modules (events, venues, tickets, ...)
│   │       ├── hooks/          # cross-feature hooks
│   │       ├── lib/            # strapi-api, auth, i18n, feature-flags, seo, utils
│   │       ├── styles/         # globals.css, theme.css
│   │       ├── types/          # api types, strapi-openapi.d.ts, next-auth.d.ts
│   │       ├── stories/        # Storybook MDX docs
│   │       └── prototypes/     # static HTML design prototypes
│   │   └── locales/, public/, test/, docs/
│   └── strapi/                 # @tiween/admin — Strapi v5 backend
│       ├── config/             # plugins.ts, middlewares.ts, api.ts, database.ts, env/
│       ├── src/
│       │   ├── index.ts        # bootstrap entry
│       │   ├── api/health/     # core API (health check only)
│       │   ├── admin/          # admin panel customization
│       │   ├── bootstrap/      # ensure* seeders + unit tests
│       │   ├── components/     # Strapi components (common, creative-works, ticketing, ...)
│       │   ├── extensions/     # documentation, email, users-permissions
│       │   ├── lifeCycles/     # adminUser.ts, user.ts subscribers
│       │   ├── plugins/        # domain plugins (see below)
│       │   └── shared/         # rate-limit.ts, validation.ts, website-url.ts
│       ├── scripts/            # seeds/, crawlers/tunisian-plays/
│       ├── database/, types/, public/, tests/, docs/
│       └── dist/               # build output (generated; plugin shims load from here)
├── packages/
│   ├── eslint-config/          # @tiween/eslint-config
│   ├── prettier-config/        # @tiween/prettier-config
│   ├── typescript-config/      # @tiween/typescript-config
│   └── strapi-provider-email-brevo/  # Brevo email provider for Strapi
├── _bmad-output/               # BMad planning source of truth (PRD, architecture, epics)
├── design_handoff_tiween/      # design handoff assets
├── docs/                       # repo-level docs
├── scripts/                    # check-repo-hygiene.mjs and helpers
├── legacy/                     # retired backend/frontend (reference only)
├── input/                      # source material inputs
├── .github/workflows/          # CI (lint, build, test) and Chromatic
├── docker-compose.yml, docker-compose.prod.yml
├── turbo.json, package.json, tsconfig.json, .eslintrc.js
└── .env.example                # documented env vars (do not commit .env)
```

## Directory Purposes

**`apps/client/src/app/[locale]/`:**

- Purpose: Locale-prefixed App Router pages.
- Contains: `layout.tsx`, `page.tsx`, `page.city.tsx`, `page.venue.tsx`,
  `error.tsx`, `loading.tsx`, `not-found.tsx`, and route folders
  `auth/`, `contribute/`, `design-system/`, `events/`, `offline/`, `search/`,
  `shorts/`, `tickets/`, `venue/`, `venues/`, `watchlist/`.
- Key files: `apps/client/src/app/[locale]/layout.tsx`, `apps/client/src/app/[locale]/page.tsx`.

**`apps/client/src/app/api/`:**

- Purpose: Next.js route handlers (BFF/proxies, health, newsletter, preview).
- Contains: `asset/`, `auth/`, `contribute/`, `events/`, `health/`, `newsletter/`,
  `preview/`, `private-proxy/`, `public-proxy/[...slug]/`, `search/`, `shorts/`, `venues/`.

**`apps/client/src/features/`:**

- Purpose: Domain modules: `components/`, `hooks/`, `types/`, `schemas/`, `utils/`, `index.ts`.
- Subfolders: `auth`, `contribute`, `events`, `films`, `notifications`, `scanner`,
  `search`, `shorts`, `tickets`, `venues`, `watchlist`.

**`apps/client/src/lib/strapi-api/`:**

- Purpose: Strapi client layer.
- Key files: `base.ts` (abstract client + `API_ENDPOINTS`), `public.ts`,
  `private.ts`, `openapi-client.ts`, `request-auth.ts`, `content/events.ts`,
  `content/geography.ts`, `content/search.ts`.

**`apps/client/src/lib/`:**

- Key files: `auth.ts`, `feature-flags.ts`, `navigation.ts`, `i18n.ts`,
  `query-client.ts`, `rate-limit.ts`, `recaptcha.ts`, `dates.ts`, `intl-locale.ts`,
  `seo/`, `metadata/`, `storybook/`, `geolocation/`, `algolia/`.

**`apps/strapi/src/plugins/<name>/`:**

- Purpose: One bounded domain per plugin.
- Standard layout:
  ```
  <name>/
  ├── package.json
  ├── strapi-server.js          # shim → dist/src/plugins/<name>/server/src
  ├── strapi-admin.js           # admin entry
  ├── admin/src/               # admin UI (components, pages, translations)
  └── server/src/
      ├── index.ts              # plugin assembly
      ├── content-types/<type>/schema.json (+ index.ts)
      ├── services/             # business logic
      ├── controllers/          # request adapters
      ├── routes/               # content-api.ts, admin-api.ts/admin.ts, index.ts
      ├── policies/, middlewares/, validation/, utils/, config/   (where present)
      └── __tests__/            # colocated unit tests (where present)
  ```
- Plugins present: `geography`, `venues`, `entity-properties`, `creative-works`,
  `tmdb-integration`, `events-manager`, `ticketing`, `payments`, `user-engagement`.

**`apps/strapi/src/components/`:**

- Purpose: Reusable Strapi components (schema-level), grouped by domain:
  `common`, `creative-works`, `entity-properties`, `seo-utilities`, `shared`, `ticketing`, `utilities`.

**`apps/strapi/config/`:**

- Key files: `plugins.ts` (enable + resolve each plugin), `middlewares.ts`,
  `api.ts`, `database.ts`, `admin.ts`, `server.ts`, `cron-tasks.ts`, `env/`, `sync/`, `typescript.ts`.

**`apps/strapi/scripts/`:**

- Purpose: Operational scripts. `seeds/` (`index.ts`, `clear.ts`) and `crawlers/tunisian-plays/` (`cli.ts`).

**`packages/*`:**

- Purpose: Shared tooling configs consumed by the apps (`@tiween/eslint-config`,
  `@tiween/prettier-config`, `@tiween/typescript-config`) and the Brevo email provider.

**`legacy/`:**

- Purpose: Retired backend (`legacy/backend`) and frontend (`legacy/frontend`). Not part of the workspaces; do not add code here.

## Key File Locations

**Entry Points:**

- `apps/strapi/src/index.ts`: Strapi bootstrap and lifecycle.
- `apps/client/src/app/[locale]/layout.tsx`: client root layout.
- `apps/client/src/proxy.ts`: edge auth and locale middleware.

**Configuration:**

- `package.json` (root): workspaces, scripts, resolutions.
- `turbo.json`: task graph and global env list.
- `apps/strapi/config/plugins.ts`: plugin registry and order.
- `apps/strapi/config/middlewares.ts`: CSP and middleware stack.
- `apps/client/next.config.mjs`, `apps/client/vitest.config.ts`, `apps/client/eslint.config.mjs`.
- `apps/strapi/jest.config.cjs`, `apps/strapi/tsconfig.json`.
- `.env.example`: documented environment variables.

**Core Logic:**

- `apps/strapi/src/plugins/ticketing/server/src/services/order.ts`
- `apps/strapi/src/plugins/events-manager/server/src/services/`
- `apps/strapi/src/plugins/venues/server/src/services/`
- `apps/strapi/src/plugins/payments/server/src/services/konnect-client.ts`
- `apps/client/src/lib/strapi-api/base.ts`

**Testing:**

- Client: `apps/client/test/`, colocated `*.test.ts(x)` under `src/` (e.g. `src/lib/strapi-api/request-auth.test.ts`), `vitest.config.ts`.
- Strapi: `apps/strapi/tests/`, `apps/strapi/src/__tests__/`, colocated `__tests__/` in plugins, `*.unit.test.ts` in `src/bootstrap` and `src/lifeCycles`, `jest.config.cjs`.

## Naming Conventions

**Files:**

- Client components and modules: kebab-case files (e.g. `apps/client/src/lib/strapi-api/events-extended.ts`), `*.test.ts(x)` for tests.
- Next.js special files: lowercase per App Router (`page.tsx`, `layout.tsx`, `route.ts`), dynamic segments in brackets (`[locale]`, `[...slug]`).
- Strapi plugin entries: `strapi-server.js`, `strapi-admin.js`; schemas: `content-types/<kebab-type>/schema.json`.
- Strapi unit tests: `*.unit.test.ts` (bootstrap, lifecycles) or `__tests__/*.ts`.

**Directories:**

- Plugins: kebab-case (`user-engagement`, `entity-properties`).
- Strapi lifecycle folder is camelCase (`src/lifeCycles`) — existing exception; follow it.
- Client feature folders: lowercase singular/plural nouns (`features/venues`, `features/tickets`).

**Identifiers:**

- Strapi UIDs: `plugin::<plugin-name>.<content-type>` (e.g. `plugin::ticketing.ticket-order`).
- Client endpoint paths: `/<plugin-name>/<collection>` (e.g. `/ticketing/ticket-orders`).

## Where to Add New Code

**New Strapi domain feature (content type + logic):**

- Primary code: `apps/strapi/src/plugins/<plugin>/server/src/content-types/<type>/schema.json` plus `services/<type>.ts` and `controllers/<type>.ts`.
- Routes: add to `apps/strapi/src/plugins/<plugin>/server/src/routes/content-api.ts` (public) or `admin-api.ts`/`admin.ts` (admin).
- Register new service/controller in the plugin's `server/src/services/index.ts` and `controllers/index.ts`.
- Tests: `apps/strapi/src/plugins/<plugin>/server/src/__tests__/`.
- Endpoint for the client: add UID and path to `API_ENDPOINTS` in `apps/client/src/lib/strapi-api/base.ts`.

**New Strapi plugin (e.g. the planned `payments` follow-ups or other domains):**

- Copy the sibling plugin skeleton (the amendment recommends cloning `geography`), e.g. `apps/strapi/src/plugins/<name>/`.
- Register in `apps/strapi/config/plugins.ts` with `resolve: "./src/plugins/<name>"` and mind load order.
- Add translations under `admin/src/translations/{en,fr,ar}.json`.

**New client page:**

- Route: `apps/client/src/app/[locale]/<route>/page.tsx` (add `layout.tsx` or `loading.tsx` as needed).
- Domain UI: `apps/client/src/features/<domain>/components/`.
- If auth-protected, add the path to `authPages` or `authPrefixes` in `apps/client/src/proxy.ts`.

**New client feature module:**

- Implementation: `apps/client/src/features/<domain>/{components,hooks,types,schemas,utils}/`
- Export public surface from `apps/client/src/features/<domain>/index.ts`.

**Shared UI component:**

- Primitives: `apps/client/src/components/ui/` (shadcn-style, Radix-based).
- Composed/domain-agnostic: `apps/client/src/components/common/` or `elementary/`.
- Stories: colocated Storybook files under the component folder; patterns in `apps/client/src/stories/patterns/`.

**Shared utilities:**

- Client: `apps/client/src/lib/utils.ts`, `lib/general-helpers.ts`, `lib/dates.ts`.
- Server: `apps/strapi/src/shared/validation.ts`, `shared/website-url.ts`.

**Client route handler (BFF):**

- `apps/client/src/app/api/<name>/route.ts`.

## Special Directories

**`apps/strapi/dist/`:**

- Purpose: Compiled Strapi output; required by plugin `strapi-server.js` shims.
- Generated: Yes (`strapi build` / `tsc`).
- Committed: No.

**`apps/strapi/coverage/`, `apps/client/coverage/`, `.turbo/`:**

- Purpose: Test coverage and turbo cache.
- Generated: Yes. Committed: No.

**`apps/strapi/public/`, `apps/client/public/`:**

- Purpose: Static assets served as-is.
- Generated: No. Committed: Yes.

**`apps/strapi/database/`:**

- Purpose: Local database artifacts and migrations.
- Generated: Mixed. Committed: Verify before adding.

**`apps/strapi/strapi-export.tar.gz`:**

- Purpose: Content export used by `yarn import`. Generated: Yes (`yarn export:all`).

**`apps/client/src/prototypes/`:**

- Purpose: Static HTML design prototypes (not compiled into the app).

**`.playwright-mcp/`, `logs/`, `input/`:**

- Purpose: Tooling and working artifacts. Not product code.

---

_Structure analysis: 2026-10-17_
