---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

<!-- refreshed: 2026-10-17 -->

# Architecture

**Analysis Date:** 2026-10-17

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                 Next.js 15 client  `apps/client`                     │
│  App Router `src/app/[locale]/*`  · features `src/features/*`        │
│  Route handlers `src/app/api/*`   · proxy `src/proxy.ts`             │
└──────────┬───────────────────────────────────────┬───────────────────┘
           │ server-side fetch (REST, read-only    │ /api/public-proxy,
           │ + private token)  `src/lib/strapi-api`│ /api/private-proxy
           ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│             Strapi v5 backend  `apps/strapi`  (REST /api)            │
│  core: `src/index.ts` bootstrap · `config/*` · `src/api/health`      │
├──────────────────────────────────────────────────────────────────────┤
│  Custom plugins `src/plugins/*` (9 dirs, 8 enabled in config/plugins) │
│  geography · venues · entity-properties · creative-works ·           │
│  tmdb-integration · events-manager · ticketing · payments ·          │
│  user-engagement                                                     │
│  + core users-permissions extension `src/extensions/users-permissions`│
└──────────┬───────────────────────────────────────────────────────────┘
           ▼
   PostgreSQL (`docker-compose.yml`) · ImageKit / local uploads
   External: Brevo (`packages/strapi-provider-email-brevo`), TMDB,
   Konnect (payments client), Algolia (client search), Sentry (disabled)
```

## Pattern Overview

**Overall:** Monorepo with a headless CMS backend organized as a set of
Strapi v5 **domain plugins**, consumed by a Next.js App Router frontend over
REST. The backend is a plugin monolith: one Strapi process, many plugins with
their own content types, services, controllers and routes, wired together by
schema relations and the Document Service API.

**Key Characteristics:**

- Yarn workspaces + Turborepo (`package.json`, `turbo.json`); workspaces are
  `apps/*` and `packages/*`.
- Frontend never talks to the database; it reads Strapi REST endpoints,
  mainly via server components and route handlers.
- Each backend domain lives in `apps/strapi/src/plugins/<name>/` and is
  registered in `apps/strapi/config/plugins.ts` by path (`resolve: "./src/plugins/<name>"`).
- Plugin entry files (`strapi-server.js`, `strapi-admin.js`) are thin
  shims that `require` compiled output from `apps/strapi/dist/src/plugins/<name>/...`
  (see `apps/strapi/src/plugins/ticketing/strapi-server.js`,
  `apps/strapi/src/plugins/payments/strapi-server.js`). Build order matters:
  `strapi build` must run before the server boots from dist.
- Backend-for-frontend style proxies exist in the client to keep private
  tokens off the browser (`apps/client/src/app/api/public-proxy/[...slug]`,
  `apps/client/src/app/api/private-proxy`).

## Layers

**Client presentation (routes):**

- Purpose: Locale-scoped pages, SEO metadata, layouts.
- Location: `apps/client/src/app/[locale]/`
- Contains: `page.tsx`, `page.city.tsx`, `page.venue.tsx`, route folders
  (`events`, `venues`, `venue`, `tickets`, `watchlist`, `auth`, `search`,
  `shorts`, `contribute`, `offline`, `design-system`).
- Depends on: `src/features/*`, `src/components/*`, `src/lib/strapi-api`.
- Used by: Next.js router directly.

**Client features (domain UI + hooks):**

- Purpose: Domain modules grouping components, hooks, types and schemas.
- Location: `apps/client/src/features/{auth,contribute,events,films,notifications,scanner,search,shorts,tickets,venues,watchlist}`
- Contains: e.g. `features/events/{components,filters,hooks,types,utils}`, `features/venues/schemas`.
- Depends on: `src/lib/*`, `src/components/ui`.
- Used by: `src/app/[locale]` pages.

**Client data access (Strapi API layer):**

- Purpose: Single place to call Strapi with locale, auth and error handling.
- Location: `apps/client/src/lib/strapi-api/`
- Contains: `base.ts` (abstract `BaseStrapiClient` with `fetchAPI`, and the
  `API_ENDPOINTS` map from content-type UID to REST path), `public.ts`,
  `private.ts`, `openapi-client.ts` (typed client generated from the Strapi
  OpenAPI spec), `request-auth.ts`, and `content/*.ts` domain modules
  (`events.ts`, `events-extended.ts`, `geography.ts`, `search.ts`).
- Depends on: `src/types/strapi-openapi.d.ts`, `src/lib/general-helpers.ts`.
- Used by: server components, `src/app/api/*` route handlers, features.

**Client edge/proxy:**

- Purpose: Locale routing, auth gating, feature flags at the edge.
- Location: `apps/client/src/proxy.ts` (combines `next-auth/middleware` with
  `next-intl/middleware` from `src/lib/navigation`).
- Auth-gated prefixes: exact `/auth/change-password`, `/auth/signout`,
  `/venue/profile`, and prefix `/venue` (venue-manager surfaces). Public
  `/venues/*` is intentionally not matched.
- Feature flags: `src/lib/feature-flags.ts` (e.g. `isTicketPurchaseEnabled`).

**Backend core (Strapi app):**

- Purpose: Boot, global config, cross-cutting lifecycle hooks, minimal core API.
- Location: `apps/strapi/src/index.ts`, `apps/strapi/config/`, `apps/strapi/src/api/health/`.
- Contains: `bootstrap()` runs `ensureVenueManagerRole`, `ensureAdminUser`,
  `ensureI18nLocales`, `ensureSocialProviders` (`src/bootstrap/*`), and
  registers subscribers from `src/lifeCycles/{adminUser,user}.ts`.
- Config: `config/plugins.ts` enables and orders plugins (comment requires
  geography before users-permissions because the user extension references
  geography content types); `config/middlewares.ts` sets CSP (allows
  `ik.imagekit.io`, OpenStreetMap tiles for the venues map picker);
  `config/api.ts` sets REST defaults (`defaultLimit: 25`, `maxLimit: 100`).

**Backend domain plugins:**

- Purpose: One bounded domain per plugin.
- Location: `apps/strapi/src/plugins/<name>/`
- Standard internal shape (see `apps/strapi/src/plugins/ticketing/server/src/`):
  - `content-types/<type>/schema.json` (+ `index.ts`)
  - `services/` (business logic; `order.ts`, `ticket.ts`, `qr.ts`, `*-email.ts`)
  - `controllers/` (HTTP adapters; `order.ts`, `ticket.ts`)
  - `routes/` split into `content-api.ts`, `admin-api.ts`/`admin.ts`, `index.ts`
  - `policies/`, `middlewares/`, `validation/`, `config/`, `__tests__/` where used
- Depends on: other plugins by UID (e.g. ticketing → `plugin::events-manager.event`,
  `plugin::events-manager.screening`, `plugin::events-manager.performance`).
- Used by: client via `/api/<plugin>/<resource>` endpoints.

**Data store and external services:**

- Purpose: Persistence and third-party integrations.
- Location: PostgreSQL via `apps/strapi/config/database.ts` and
  `docker-compose.yml` (service `postgres`); media via `config/plugins.ts`
  (ImageKit when configured, otherwise local upload); email via
  `packages/strapi-provider-email-brevo`; TMDB via `src/plugins/tmdb-integration`.

## Plugin Map (as implemented)

| Plugin              | Path                                        | Role                                        | Notes from code                                                                                     |
| ------------------- | ------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `geography`         | `apps/strapi/src/plugins/geography`         | regions, cities                             | base plugin, loaded first; has `policies/`                                                          |
| `venues`            | `apps/strapi/src/plugins/venues`            | venue + property CRUD                       | new plugin, has `validation/`, `__tests__/`; admin map picker under `admin/`                        |
| `entity-properties` | `apps/strapi/src/plugins/entity-properties` | shared property model                       | no `services` tests                                                                                 |
| `creative-works`    | `apps/strapi/src/plugins/creative-works`    | film/play catalog (`creative-work`)         | catalog target for user-engagement                                                                  |
| `tmdb-integration`  | `apps/strapi/src/plugins/tmdb-integration`  | TMDB sync                                   | controllers, routes, services only                                                                  |
| `events-manager`    | `apps/strapi/src/plugins/events-manager`    | events, showtimes, screenings, performances | has `utils/`, `validation/`, `__tests__/`                                                           |
| `ticketing`         | `apps/strapi/src/plugins/ticketing`         | orders, tickets, QR, emails                 | `strapi-server.js` loads from `dist/`                                                               |
| `payments`          | `apps/strapi/src/plugins/payments`          | Konnect payments                            | `services/konnect-client.ts`, `public-api.ts`, `status-mapping.ts`; no content types or middlewares |
| `user-engagement`   | `apps/strapi/src/plugins/user-engagement`   | watchlists                                  | content-type `user-watchlist`                                                                       |

Plugin enablement and order are authoritative in `apps/strapi/config/plugins.ts`.
The 2026-06-12 amendment (`_bmad-output/project-planning-artifacts/architecture.md`)
describes the target decomposition (new `venues` plugin, `payments` ACL,
creative-work as catalog of record). The code reflects the `venues` and
`payments` plugins existing, but `ticketing` still targets
`events-manager.event`/`screening`/`performance` and `events-manager` still
holds show-scheduling content types; treat the amendment as the direction, the
code as the current state.

## Data Flow

### Primary Read Path (public pages)

1. Request hits `apps/client/src/proxy.ts` (locale routing, auth check for `/venue`).
2. Server component under `apps/client/src/app/[locale]/...` calls a module in
   `apps/client/src/lib/strapi-api/content/*.ts`.
3. `BaseStrapiClient.fetchAPI` (`apps/client/src/lib/strapi-api/base.ts`)
   resolves the UID to a path via `API_ENDPOINTS` and sends the request with
   locale params.
4. Strapi route in `apps/strapi/src/plugins/<plugin>/server/src/routes/content-api.ts`
   → controller → service (Document Service API) → PostgreSQL.

### Mutation Path (e.g. ticket order)

1. Client route handler `apps/client/src/app/api/*` or feature hook posts to
   `/api/public-proxy/[...slug]` or the private proxy.
2. Strapi `ticketing` controller `server/src/controllers/order.ts` delegates to
   `server/src/services/order.ts`, which uses `qr.ts`, `ticket.ts` and sends
   email through `order-email.ts` / `confirmation-email.ts`.
3. Payment status is reconciled through `payments` plugin services
   (`konnect-client.ts`, `status-mapping.ts`).

**State Management:**

- Server state: Strapi/PostgreSQL is the source of truth; the client uses
  TanStack-style query client (`apps/client/src/lib/query-client.ts`).
- Auth state: NextAuth session (`apps/client/src/lib/auth.ts`,
  `src/types/next-auth.d.ts`); Strapi role checks on every privileged call.
- Client-side notification/offline state under `features/notifications` and
  `hooks/useOnlineStatus.ts`.

## Key Abstractions

**`BaseStrapiClient` / `API_ENDPOINTS` (client):**

- Purpose: Uniform, locale-aware access to every Strapi content type.
- Examples: `apps/client/src/lib/strapi-api/base.ts`, `public.ts`, `private.ts`.
- Pattern: abstract base class + per-domain function modules in `content/`.

**Strapi plugin factory (server):**

- Purpose: Each plugin exposes `({ strapi }) => ({ ... })` factories for
  services and controllers.
- Examples: `apps/strapi/src/plugins/ticketing/server/src/services/index.ts`,
  `apps/strapi/src/plugins/ticketing/server/src/controllers/index.ts`.
- Pattern: Document Service API only; module-level UID constants; string route handlers.

**Feature modules (client):**

- Purpose: Co-locate UI, hooks, schemas and types per domain.
- Examples: `apps/client/src/features/venues/{components,hooks,schemas}`.

## Entry Points

**Strapi bootstrap:**

- Location: `apps/strapi/src/index.ts`
- Triggers: `yarn develop` / `yarn start` (`apps/strapi/package.json`).
- Responsibilities: register lifecycle subscribers; seed roles, admin, locales, social providers.

**Strapi plugin server/admin entries:**

- Location: `apps/strapi/src/plugins/<name>/strapi-server.js` and `strapi-admin.js`
- Triggers: Strapi plugin loader per `config/plugins.ts`.

**Client root layout and middleware:**

- Location: `apps/client/src/app/[locale]/layout.tsx`, `apps/client/src/proxy.ts`
- Triggers: every request.

**Client route handlers:**

- Location: `apps/client/src/app/api/{asset,auth,contribute,events,health,newsletter,preview,private-proxy,public-proxy,search,shorts,venues}`
- Triggers: HTTP calls from client components and external callers.

**Service worker:**

- Location: `apps/client/src/app/sw.ts` (Serwist, `src/types/serwist.d.ts`).

**Compose/CI:**

- `docker-compose.yml` / `docker-compose.prod.yml` define `client`, `strapi`, `postgres` on `tiween-network`.
- `.github/workflows/` runs Chromatic (Storybook) and CI lint (`yarn hygiene`, install, build, test).

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop for Strapi; Next.js server
  components/route handlers run per request. No worker threads detected.
- **Global state:** Module-level UID constants and `API_ENDPOINTS` in
  `apps/client/src/lib/strapi-api/base.ts`; Strapi plugin singletons via `strapi` instance.
- **Build coupling:** Plugin server entries require `apps/strapi/dist/`, so
  Strapi must be built before those plugins load in production.
- **Plugin ordering:** `geography` must precede `users-permissions` (noted in `config/plugins.ts`).
- **Client/server UID coupling:** endpoint prefixes are hardcoded in
  `apps/client/src/lib/strapi-api/base.ts`; plugin moves require client changes in the same step.
- **Circular imports:** None documented; cross-plugin references are one-way by
  schema relation (e.g. ticketing → events-manager, user-engagement → creative-works).

## Anti-Patterns

### Hardcoded plugin UIDs and endpoint paths in the client

**What happens:** `apps/client/src/lib/strapi-api/base.ts` maps
`plugin::venues.venue` → `/venues/venues` and similar by hand.
**Why it's wrong:** Moving a content type between plugins (as the amendment
plans) silently breaks endpoints; the type assertion comment shows plugin types
are not in `UID.ContentType`.
**Do this instead:** Add the new UID/path pair to `API_ENDPOINTS` in the same
change as the server move, and add a test in `apps/client/src/lib/strapi-api/`.

### Plugin entry shims depending on dist

**What happens:** `apps/strapi/src/plugins/ticketing/strapi-server.js` and
`payments/strapi-server.js` `require` from `dist/src/plugins/...`.
**Why it's wrong:** Running against stale or missing `dist` loads old or no code;
`src/` edits do not take effect until a build.
**Do this instead:** Run `yarn build` in `apps/strapi` (or `yarn develop`) after
server edits; verify the `dist` path matches the plugin folder.

## Error Handling

**Strategy:** Typed result objects on the client (`Result`, `AppError` from
`@tiween/admin` and `src/types/general.ts`); Strapi errors via `strapi::errors`
middleware (`apps/strapi/config/middlewares.ts`).

**Patterns:**

- Client fetch wrappers return `Result` values rather than throwing (`base.ts`).
- Strapi services throw Strapi `ApplicationError`/`ValidationError` style errors; validation lives in plugin `validation/` folders (`events-manager`, `ticketing`, `venues`).

## Cross-Cutting Concerns

**Logging:** Strapi logger and `console.info` at boot (`config/plugins.ts`); Sentry configured but disabled.
**Validation:** Zod on the client (`features/venues/schemas`, `hooks/useTranslatedZod.ts`); plugin `validation/` modules on the server; shared helpers in `apps/strapi/src/shared/validation.ts`.
**Authentication:** NextAuth on the client (`apps/client/src/lib/auth.ts`, `proxy.ts`); users-permissions with Google/Facebook providers (`src/bootstrap/social-providers.ts`) and a custom venue-manager role (`src/bootstrap/venue-manager-role.ts`).
**Rate limiting:** `apps/strapi/src/shared/rate-limit.ts`; `apps/client/src/lib/rate-limit.ts`.
**Localization:** i18n plugin with `fr` default, `ar` and `en`; client `apps/client/locales/` and `src/lib/i18n.ts`.

---

_Architecture analysis: 2026-10-17_
