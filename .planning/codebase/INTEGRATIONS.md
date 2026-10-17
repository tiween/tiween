---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

# External Integrations

**Analysis Date:** 2026-10-17

## APIs & External Services

**Konnect (payments):**

- Used for ticket payment processing in the Strapi `payments` plugin (`apps/strapi/src/plugins/payments/`). Base API `https://api.konnect.network/api/v2`.
- SDK/Client: direct HTTP calls from the plugin service layer (no SDK package in manifests).
- Auth: `KONNECT_API_KEY`, `KONNECT_API_URL`, `KONNECT_WALLET_ID`, `KONNECT_CLIENT_URL`, `KONNECT_WEBHOOK_SECRET`.
- Gated by `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` on the client (purchase surfaces are hidden unless set to `true`).

**Brevo (transactional email and newsletter):**

- Strapi email provider `packages/strapi-provider-email-brevo/` (Brevo Transactional Email API, with attachment support and a console fallback in development). Wired in `apps/strapi/config/plugins.ts` (`email` plugin).
- Client newsletter signup: `apps/client/src/app/api/newsletter/subscribe/route.ts` uses `@getbrevo/brevo`.
- SDK/Client: `@getbrevo/brevo` `^3.0.x`.
- Auth: `BREVO_API_KEY` (Strapi and client), `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_LIST_ID` (client).

**TMDB (The Movie Database):**

- Movie and person metadata import in the Strapi `tmdb-integration` plugin (`apps/strapi/src/plugins/tmdb-integration/server/src/services/tmdb-client.ts`, `movie.ts`, `image.ts`).
- Image URLs use `https://image.tmdb.org/t/p/`.
- SDK/Client: `tmdb-ts ^2.0.0`.
- Auth: `TMDB_API_KEY`. Language: `TMDB_DEFAULT_LANGUAGE`.

**Algolia (search):**

- Client search for events and shorts. `apps/client/src/lib/algolia/events.ts`, `apps/client/src/lib/algolia/shorts.ts`. Uses `algoliasearch/lite` (client-side read-only search). Returns null when credentials are missing.
- SDK/Client: `algoliasearch ^5.46.3`.
- Auth: `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` (public search key).
- No indexing code was found in Strapi `src/`. The index is populated outside this repo or by a process not located in this analysis.

**Google Maps / OpenStreetMap / Apple Maps:**

- OpenStreetMap tiles `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` for Leaflet maps in `apps/client/src/features/events/components/Map/` and `apps/client/src/features/venues/components/VenueLocationPicker/`. Attribution links to `openstreetmap.org/copyright`.
- Apple Maps deep links (`https://maps.apple.com/?daddr=...`) for directions in venue/event UI.
- Nominatim (OpenStreetMap geocoder) is referenced by the Strapi venues geocoding code (`GEOCODE_*` status codes, `NOMINATIM` in `apps/strapi/src/plugins/venues/`). No API key is required. Exact endpoint configuration was not verified.

**Wikimedia / Wikipedia / teskerti.tn (content crawlers):**

- Scripts in `apps/strapi/scripts/crawlers/tunisian-plays/` fetch play metadata and images from `teskerti.tn`, `commons.wikimedia.org`, `fr.wikipedia.org`, `ar.wikipedia.org`. Run with `yarn crawl:plays` (`tsx`). Uses `cheerio` for HTML parsing.
- Run in CI by `.github/workflows/crawl-tunisian-plays.yml`.

**Google and Facebook OAuth (social login):**

- Configured as next-auth providers in `apps/client/src/lib/auth.ts`. Used by sign-in forms (`apps/client/src/app/[locale]/auth/signin/_components/SignInFormWithSocial.tsx`).
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`.

**Google reCAPTCHA v3 (bot protection):**

- Client: `next-recaptcha-v3 ^1.5.2` on forms. Server verification of the token via `RECAPTCHA_SECRET_KEY` in the client.
- Auth: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (public), `RECAPTCHA_SECRET_KEY` (server).

**Sentry (error tracking):**

- Strapi: `@strapi/plugin-sentry` configured in `apps/strapi/config/plugins.ts`. Disabled by default. DSN is set only when `NODE_ENV=production` (`SENTRY_DSN`).
- Client: `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (source map upload) are referenced in `apps/client/src/env.mjs` and `apps/client/next.config.mjs`. No `@sentry/*` package was found in `apps/client/package.json`, so client-side Sentry wiring should be verified before relying on it.

**ImageKit (image CDN and storage):**

- Strapi upload provider `strapi-provider-upload-imagekit` and `strapi-plugin-imagekit` (`apps/strapi/config/plugins.ts`, `prepareImageKitConfig`). Falls back to local upload when config is incomplete.
- SDK/Client: `imagekit ^5.2.0`.
- Auth: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` (for example `https://ik.imagekit.io/...`), `IMAGEKIT_FOLDER` (default `tiween`).

**QR codes:**

- Generated locally by `qrcode` in `apps/strapi/src/plugins/ticketing/server/src/services/qr.ts` and included in order emails. No external service.

**Dokploy (deployment orchestration):**

- `.github/workflows/deploy.yml` calls `POST ${DOKPLOY_URL}/api/application.deploy` for the client and Strapi applications.
- Auth: `DOKPLOY_URL`, `DOKPLOY_API_KEY` (sent as `x-api-key`), `DOKPLOY_CLIENT_APP_ID`, `DOKPLOY_STRAPI_APP_ID` (GitHub Actions secrets).

**Chromatic (visual regression):**

- `.github/workflows/chromatic.yml` builds Storybook and uploads via `chromaui/action`. Client `chromatic` package. Uses a project token stored as a GitHub secret.

**Mailgun and AWS S3 (installed, not active):**

- `@strapi/provider-email-mailgun` and `@strapi/provider-upload-aws-s3` are dependencies of `apps/strapi`. The `MAILGUN_*` variables appear in `docker-compose.prod.yml` as optional. The active email provider is Brevo and the active upload provider is ImageKit or local, so these are not active in configuration.

## Data Storage

**Databases:**

- PostgreSQL 16 (`postgres:16-alpine`).
  - Connection: `DATABASE_CLIENT=postgres`, `DATABASE_HOST`, `DATABASE_PORT` (5432), `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_SSL`, `DATABASE_SSL_CA`, `DATABASE_SSL_CERT`, `DATABASE_SSL_KEY`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_SCHEMA`. `DATABASE_URL` is also accepted.
  - Client: `pg` (`apps/strapi/config/database.ts`), via Strapi's ORM (Knex-based Document Service).
- SQLite (dev and test only): `DATABASE_CLIENT=sqlite`, `DATABASE_FILENAME` (default `.tmp/data.db`), driver `better-sqlite3`.

**File Storage:**

- ImageKit CDN when `IMAGEKIT_*` are configured. Otherwise the local Strapi upload directory.
- Static assets in the client: `apps/client/public/`.

**Caching:**

- None external. Redis is deferred post-v1 (see `.env.example`). Rate limiting and response caching run in process in the Strapi app.
- Next.js image cache (`minimumCacheTTL` 900 s) and Serwist service-worker cache in the client.

## Authentication & Identity

**Auth Provider:**

- Strapi `users-permissions` plugin for the API. JWT configured in `apps/strapi/config/plugins.ts` under `users-permissions.jwt`. Secrets: `JWT_SECRET`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `APP_KEYS`.
- Client: next-auth v4 with Credentials, Google and Facebook providers (`apps/client/src/lib/auth.ts`). Session secret `NEXTAUTH_SECRET`, base URL `NEXTAUTH_URL`.
- Client-to-Strapi API keys: `STRAPI_REST_READONLY_API_KEY` (required) and `STRAPI_REST_CUSTOM_API_KEY` (optional). Sent server-side from the Next.js app.
- Sessions are stateless JWT (per the `.env.example` note).

## Monitoring & Observability

**Error Tracking:**

- Strapi Sentry plugin (see above). Client Sentry DSN variable is present (see above).

**Logs:**

- Strapi `console.*` and Strapi logger. Client uses `console` and Next.js server logs. No structured log shipper was detected.

**Health checks:**

- Client: `GET /api/health` (route `apps/client/src/app/api/health/`), used by Docker healthcheck.
- Strapi: `GET /_health`, used by Docker healthcheck.

## CI/CD & Deployment

**Hosting:**

- Self-hosted Docker containers on a Dokploy-managed host, built from `apps/client/Dockerfile` and `apps/strapi/Dockerfile` (multi-stage, `node:22-alpine`, `turbo prune` then `yarn --frozen-lockfile`).
- Images pushed to `ghcr.io/${{ github.repository }}`, tagged `production` (main) or `staging` (develop).

**CI Pipeline:**

- GitHub Actions (`.github/workflows/`):
  - `ci.yml` - runs on push and PR to `main` and `develop`. Jobs: repo hygiene (`yarn hygiene`), format check, lint, type check, tests. Uses `actions/checkout@v4`, `actions/setup-node@v4` (Node 22), `nick-fields/retry@v3`.
  - `deploy.yml` - runs after a successful `CI` workflow on `main` or `develop`, or on manual dispatch (staging or production). Builds and pushes images to GHCR, then triggers Dokploy.
  - `chromatic.yml` - Storybook visual tests.
  - `crawl-tunisian-plays.yml` - scheduled or manual content crawl.
- Release: semantic-release (`.releaserc.json`) with `@semantic-release/changelog` and `@semantic-release/git`.
- Git hooks: Husky with lint-staged and commitlint.

## Environment Configuration

**Required env vars (names only, values are secret):**

- Database: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_SSL`
- Strapi: `STRAPI_URL` (also `APP_URL` inside Strapi), `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT`
- Client: `APP_PUBLIC_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `STRAPI_REST_READONLY_API_KEY`, `STRAPI_REST_CUSTOM_API_KEY`
- Preview: `CLIENT_URL`, `STRAPI_PREVIEW_ENABLED`, `STRAPI_PREVIEW_SECRET`
- Feature flag: `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED`
- Integrations (optional, enable when set): `IMAGEKIT_*`, `BREVO_*`, `MAILGUN_*`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `TMDB_API_KEY`, `KONNECT_*`, `NEXT_PUBLIC_ALGOLIA_*`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `GOOGLE_CLIENT_*`, `FACEBOOK_CLIENT_*`

**Secrets location:**

- Local: `.env` at repo root and per-app `.env` files (copied from `.env.example`). `.env` is present in the working tree and is git-ignored. Its contents were not read for this analysis.
- Production: environment variables set in the Dokploy application configuration. Deploy-time secrets are GitHub Actions secrets (`DOKPLOY_*`, `GITHUB_TOKEN` for GHCR).
- Local Docker dev values (`tiween_dev_password`, `devkey1..4`) are hard-coded in `docker-compose.yml` for development only.

## Webhooks & Callbacks

**Incoming:**

- Konnect payment result or webhook endpoints in the Strapi `payments` plugin (`apps/strapi/src/plugins/payments/routes/`), secured by `KONNECT_WEBHOOK_SECRET`. Exact route paths were not enumerated.
- Client route handlers: `/api/auth/[...nextauth]` (OAuth callbacks), `/api/venues/register`, `/api/contribute/person`, `/api/contribute/play`, `/api/newsletter/subscribe`, `/api/search`, `/api/preview`, `/api/private-proxy`, `/api/public-proxy`, `/api/asset`, `/api/shorts`, `/api/health`.
- Strapi preview: `STRAPI_PREVIEW_SECRET` is shared between Strapi and Next.js for draft preview.

**Outgoing:**

- Brevo transactional email on order and account events (`packages/strapi-provider-email-brevo/`, `apps/strapi/src/plugins/ticketing/server/src/services/order-email.ts`).
- Konnect payment initiation from the payments plugin.
- Dokploy deploy trigger from GitHub Actions.
- TMDB, Wikimedia, teskerti.tn and Nominatim HTTP fetches (on demand or by crawler).

---

_Integration audit: 2026-10-17_
