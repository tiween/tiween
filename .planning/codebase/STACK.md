---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

# Technology Stack

**Analysis Date:** 2026-10-17

## Languages

**Primary:**

- TypeScript 5.x - All product code: `apps/client/src/`, `apps/strapi/src/`, `apps/strapi/config/`, `apps/strapi/scripts/`, `packages/strapi-provider-email-brevo/` (plain JS entry `index.js`)
- JavaScript (ESM/CJS mix) - Config and tooling: `apps/client/next.config.mjs`, `apps/client/src/env.mjs`, `.eslintrc.js`, `.lintstagedrc.js`, `scripts/check-repo-hygiene.mjs`

**Secondary:**

- SQL - Schema managed by Strapi migrations against PostgreSQL (no hand-written SQL found in analysis)
- YAML - GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`, `chromatic.yml`, `crawl-tunisian-plays.yml`), Docker Compose (`docker-compose.yml`, `docker-compose.prod.yml`)
- CSS (Tailwind v4 utilities) - `apps/client/src/styles/`, `apps/client/postcss.config.js`

## Runtime

**Environment:**

- Node.js 22.21.1 - pinned in `.nvmrc` and `.tool-versions` (`nodejs 22.21.1`). `engines` require `>=22` in `apps/client/package.json` and `apps/strapi/package.json` (root requires `>=20`).
- Docker base image `node:22-alpine` in `apps/client/Dockerfile` and `apps/strapi/Dockerfile`.

**Package Manager:**

- Yarn 1.22.22 (classic), pinned via `packageManager` in root `package.json`. A `preinstall` hook enforces yarn via `npx only-allow yarn`.
- Lockfile: `yarn.lock` present at repo root (CI uses `yarn install --frozen-lockfile`).
- Workspaces: `apps/*`, `packages/*` (root `package.json`). `legacy/frontend` and `legacy/backend` exist but are outside the workspace globs.
- Monorepo task runner: Turborepo `^2.0.9` (`turbo.json`, pipeline tasks build/lint/type-check/test/dev/start/storybook).

## Frameworks

**Core:**

- Next.js `^16.1.0` - Client app `@tiween/client` (`apps/client`). App Router under `apps/client/src/app/[locale]/` and `apps/client/src/app/api/`. Turbopack is the default bundler (`turbopack` key in `apps/client/next.config.mjs`). `output` is driven by `NEXT_OUTPUT`. `reactStrictMode: true`.
- React `^19.0.0` (client; enforced via root `resolutions`) - `react`, `react-dom`.
- Strapi `^5.51.2` - Headless CMS and API backend `@tiween/admin` (`apps/strapi`), `@strapi/strapi` plus `@strapi/plugin-users-permissions`, `@strapi/plugin-documentation`, `@strapi/plugin-sentry`, `@strapi/provider-upload-aws-s3`, `@strapi/provider-email-mailgun`.
- Strapi admin still declares React `^18.0.0` and `react-router-dom ^6`, `styled-components ^6` (`apps/strapi/package.json`), which is separate from the client's React 19.
- next-intl `4.6.1` - i18n. Locales `fr` (default), `ar`, `en`. Plugin configured in `apps/client/next.config.mjs` (`./src/lib/i18n.ts`). Strapi i18n locales match (`apps/strapi/config/plugins.ts`).
- next-auth `^4.24.12` - Session/auth in the client (`apps/client/src/lib/auth.ts`, route `apps/client/src/app/api/auth/[...nextauth]/route.ts`).
- Serwist `^9.4.2` (`@serwist/next`) - Service worker / PWA. Source `apps/client/src/app/sw.ts`, output `public/sw.js`, disabled in development.

**Styling / UI:**

- Tailwind CSS `^4.0.9` with `@tailwindcss/postcss`, `tailwind-merge`, `tailwindcss-animate`, `tw-animate-css`, `class-variance-authority`, `clsx`.
- Radix UI primitives (`@radix-ui/react-*` dialog, select, tabs, tooltip, etc.) for accessible components.
- Icons: `@phosphor-icons/react`, `lucide-react` (`optimizePackageImports` in next config).

**State / Data:**

- `@tanstack/react-query ^5.59.16` - server-state fetching in the client.
- `@tanstack/react-table ^8.20.5` - tables.
- `zustand ^5.0.14` - client state.
- `react-hook-form ^7.53.1` with `@hookform/resolvers ^5.2.2` and `zod ^3.25.76` - forms and validation.
- `openapi-fetch ^0.17.0` + `openapi-typescript ^7.13.0` - typed REST calls against Strapi's generated OpenAPI schema (`gen:strapi-types` script writes `apps/client/src/types/strapi-openapi.d.ts`).

**Maps / Media:**

- `leaflet ^1.9.4`, `react-leaflet ^5.0.0` - venue/event maps.
- `@plaiceholder/next` / `plaiceholder` `^3.0.0` - blur placeholders for images.
- `sharp 0.33.5` - image processing (pinned via `resolutions` `**/sharp`, `trustedDependencies`).
- `embla-carousel-react`, `embla-carousel-autoplay` - carousels.
- `qrcode.react` (client), `qrcode` (Strapi ticketing).

**Search:**

- `algoliasearch ^5.46.3` - client uses `algoliasearch/lite` (`apps/client/src/lib/algolia/`).

**Testing:**

- Client: Vitest `2.1.9` (`apps/client/vitest.config.ts`, script `test: vitest run`), `@testing-library/react ^16.3.2`, `@testing-library/jest-dom ^6.9.1`, `jsdom ^29.1.1`.
- Strapi: Jest `^29` with `ts-jest ^29`, `jest-environment-jsdom ^29`, `supertest ^7`, `@types/supertest`. Integration subset via `yarn test:integration`. Uses `better-sqlite3 ^12.10.0` as a dev DB option.
- Storybook `10.1.11` (`storybook`, `@storybook/nextjs-vite`, `@storybook/addon-a11y`, `@storybook/addon-docs`) in `apps/client`. Visual regression via `chromatic ^13.3.4` (`.github/workflows/chromatic.yml`).

**Build / Dev:**

- Turborepo `^2.0.9` - orchestrates all workspace scripts (`turbo.json`, root `package.json`).
- TypeScript `^5` - root config `packages/typescript-config/base.json`, `tsconfig.json` extends it.
- ESLint `^9.39.0` flat configs (`apps/client/eslint.config.mjs`, `apps/strapi/eslint.config.mjs`) with shared `@tiween/eslint-config` (`packages/eslint-config`). Includes `typescript-eslint ^8.33.1`, `eslint-plugin-jsx-a11y`, `eslint-plugin-storybook`.
- Prettier `3.3.2` with `@tiween/prettier-config` (`packages/prettier-config`), `prettier-plugin-tailwindcss ^0.6.11`. Root comment warns that bumping Prettier breaks Strapi-generated type schemas.
- Husky `^9.1.1` git hooks (`.husky/`), lint-staged `15.2.7` (`.lintstagedrc.js`), commitlint `19.3.0` with `config-conventional`, Commitizen `4.3.0` (`git-cz` script).
- semantic-release `^25.0.2` with changelog and git plugins (`.releaserc.json`, `release` script).
- `portless` - local dev hostnames (`tiween` and `api.tiween`) used by `apps/client` `dev` and `apps/strapi` `develop` scripts.
- `tsx ^4.19.0` - runs Strapi seed and crawler scripts (`apps/strapi/scripts/`).
- `openapi-typescript` (see above).

## Key Dependencies

**Critical:**

- `next@^16.1.0` and `react@^19` - client rendering and routing (`apps/client`).
- `@strapi/strapi@^5.51.2` - CMS core, content types, admin panel, REST API (`apps/strapi`).
- `pg@^8.13.1` - PostgreSQL driver used by Strapi (`apps/strapi/config/database.ts`).
- `next-auth@^4.24.12` - authentication for the client.
- `next-intl@4.6.1` - locale routing and messages. Pinned exactly.
- `@getbrevo/brevo ^3.0.1` - Brevo SDK used by both the Strapi email provider and the client newsletter route.
- `tmdb-ts ^2.0.0` - TMDB API client in Strapi (`apps/strapi/src/plugins/tmdb-integration/`).
- `rrule ^2.8.1` - recurrence rules for events (`apps/strapi`).
- `strapi-provider-upload-imagekit ^5.11.11`, `strapi-plugin-imagekit ^1.0.2`, `imagekit ^5.2.0` - ImageKit asset storage.
- `cheerio ^1.0.0`, `commander ^12.1.0`, `chalk ^5.3.0`, `fastest-levenshtein ^1.0.16` - crawler / seed tooling in `apps/strapi/scripts/`.
- `@t3-oss/env-nextjs ^0.11.1` - typed, validated environment variables for the client (`apps/client/src/env.mjs`).

**Infrastructure:**

- `@serwist/next ^9.4.2` - service worker generation (PWA).
- `@strapi/plugin-documentation ^5.51.2` - serves the OpenAPI spec consumed by the client's type generation.
- `@strapi/plugin-sentry ^5.51.2` - Sentry integration (disabled by default in `apps/strapi/config/plugins.ts`).
- `strapi-plugin-config-sync 2.1.0` - present, but `config-sync` is `enabled: false`.
- `@strapi/provider-email-mailgun` and `@strapi/provider-upload-aws-s3` - installed, but not the active providers in `apps/strapi/config/plugins.ts` (Brevo for email, ImageKit or local for upload).
- `@tiween/strapi-provider-email-brevo` - local workspace package at `packages/strapi-provider-email-brevo/`.
- `@tiween/eslint-config`, `@tiween/prettier-config`, `@tiween/typescript-config` - internal shared config packages.

## Strapi Custom Plugins

Local plugins under `apps/strapi/src/plugins/` registered in `apps/strapi/config/plugins.ts`:

- `geography` - regions and cities
- `venues` - venues, property categories and definitions
- `entity-properties` - deprecated shell (content types moved to `venues`)
- `creative-works` - creative work catalogue
- `tmdb-integration` - TMDB movie and person lookup
- `events-manager` - events
- `ticketing` - orders, QR codes, order emails
- `payments` - Konnect payment flow
- `user-engagement` - watchlist and related engagement

## Configuration

**Environment:**

- Client env is validated in `apps/client/src/env.mjs` with `@t3-oss/env-nextjs` (`emptyStringAsUndefined: true`). Required server vars: `APP_PUBLIC_URL`, `STRAPI_URL`, `STRAPI_REST_READONLY_API_KEY`.
- Strapi config is read from `apps/strapi/config/*.ts` via the Strapi `env()` helper (`database.ts`, `plugins.ts`, `server.ts`, `admin.ts`, `api.ts`, `middlewares.ts`, `cron-tasks.ts`). Environment-specific overrides live in `apps/strapi/config/env/production/` and `apps/strapi/config/env/test/`.
- Templates: `.env.example` at root and `apps/strapi/.env.example` / `apps/client/.env.local.example` (CI copies these before running checks). `setup:apps` script copies every `*.example` to its real name when `yarn install` runs.
- Secrets live in `.env` files (not committed). Variable names are listed in INTEGRATIONS.md.
- `NEXT_PUBLIC_*` variables are inlined at build time (`NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` requires a rebuild to change).
- Turbo `globalEnv` in `turbo.json` declares the variables that affect task caching.

**Build:**

- `apps/client/next.config.mjs` - Next config: Serwist, next-intl, Plaiceholder wrappers; image formats `image/webp`, `minimumCacheTTL` 900s; Turbopack filesystem cache enabled.
- `apps/strapi/config/*.ts` - Strapi runtime config.
- `turbo.json` - task graph.
- `tsconfig.json` (root) extends `@tiween/typescript-config/base.json`; `apps/client/tsconfig.json` and `apps/strapi/tsconfig.json` also present.
- `apps/client/postcss.config.js`, `apps/client/components.json` (shadcn-style config), `apps/client/prettier.config.js`.
- `.editorconfig`, `.prettierignore`, `.dockerignore`, `.gitignore`.

## Database

- Production and development target: PostgreSQL 16 (`postgres:16-alpine` in `docker-compose.yml` and `docker-compose.prod.yml`).
- Strapi also supports SQLite (`DATABASE_CLIENT=sqlite`, file `.tmp/data.db`) and uses `better-sqlite3` for dev and test.
- Connection pool: `DATABASE_POOL_MIN` (default 2), `DATABASE_POOL_MAX` (default 10).
- Redis is not used. The `.env.example` states it is deferred post-v1.

## Platform Requirements

**Development:**

- Node.js 22.21.1 (`.nvmrc`), Yarn 1.22.x.
- Docker, for PostgreSQL (`yarn run:db` runs `docker compose up -d db`) or the full stack via `docker-compose.yml`.
- `portless` for local `*.localhost` hostnames (ports 1355 in the OpenAPI server URL).
- Client dev server defaults to port 3000, Strapi to 1337, Storybook to 6006.

**Production:**

- Docker Compose (`docker-compose.prod.yml`): `client` (512 MB limit), `strapi` (1 GB limit), `postgres` (512 MB limit). `replicas: 1`, rolling `order: start-first` with rollback.
- Health checks: client `GET /api/health`, Strapi `GET /_health`.
- Images are built and pushed to GitHub Container Registry (`ghcr.io`) by `.github/workflows/deploy.yml`, then deployed through Dokploy's API (see INTEGRATIONS.md).
- Production public URLs: `https://api.tiween.tn/api` (Strapi, per `plugins.ts` documentation servers). The client `APP_PUBLIC_URL` is set per environment.

---

_Stack analysis: 2026-10-17_
