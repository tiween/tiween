# E2E stack (Strapi + throwaway Postgres)

```bash
yarn workspace @tiween/admin e2e:up          # fresh DB, build, start, seed, admin
yarn workspace @tiween/admin e2e:seed-admin  # rerun only the admin upsert
yarn workspace @tiween/admin e2e:down        # stop Strapi, destroy the E2E DB
```

| What     | Value                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Strapi   | `http://localhost:1338` (override with `E2E_BASE_URL`)                                                                      |
| Admin    | `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (default `e2e-admin@tiween.local` / `E2eAdmin123!`), Super Admin, active           |
| Postgres | compose project `tiween-e2e`, service `db-e2e`, `127.0.0.1:5439`, db `tiween_e2e`, user/pass `e2e`/`e2e`, data on **tmpfs** |
| State    | `apps/strapi/.e2e/` (gitignored): `strapi.pid`, `strapi.log`, `seed-shorts.log`                                             |

Port 5438 is already taken on the owner's machine by another project, so the E2E DB uses 5439.

## What `e2e:up` does

1. Stops a previous E2E Strapi, then drops and recreates the E2E Postgres, so every run starts with an empty DB.
2. Runs `strapi build`, which builds the server into `dist/` and the admin bundle. Set `E2E_SKIP_BUILD=1` to reuse the last build.
3. Runs `strapi start` in the background with `nohup` and waits for `GET /_health` to return 204. It uses `start` rather than `develop` because `develop` watches the app directory and would restart whenever Playwright files or logs change.
4. Runs `scripts/seeds/shorts.ts --allow-local-uploads --verify` (the `seed:shorts` script) against the E2E DB.
5. Runs `scripts/e2e/seed-admin.ts`, which upserts the E2E admin.

All env vars come from `env.sh`. Strapi still loads `apps/strapi/.env` through dotenv, but dotenv never overrides a variable that is already set, even when it is set to an empty string. So every variable that could reach the dev DB, ImageKit, Brevo, Sentry or Konnect is set explicitly in `env.sh`. That includes `DATABASE_URL`, because pg gives the connection string priority over the host fields.

## Uploads

`env.sh` blanks `IMAGEKIT_*`, so `config/plugins.ts` falls back to the **local** upload provider. Production config is unchanged. Files go to `apps/strapi/public/uploads/`, which is gitignored and also used by local dev. The seed may download YouTube thumbnails as backdrops. A failed download only produces a per-film warning, so the seed also works offline and imports those films without media.

## Admin upsert and its guards

`upsert-e2e-admin.ts` is a pure service with unit tests in `upsert-e2e-admin.unit.test.ts`. It creates the account when it is missing. When the account already exists, it resets the password, sets `isActive` to true, unblocks the account and re-attaches Super Admin. It never reads or changes other admins. The dev bootstrap `src/bootstrap/admin-user.ts` is unchanged and still seeds `admin@test.com` on the empty DB.

It refuses to run (with a coded error) unless all of the following hold:

- `NODE_ENV` is not `production`
- `E2E=true`
- The DB host is local, the port equals `E2E_DATABASE_PORT` (default 5439, never 5437), and the database name equals `E2E_DATABASE_NAME` (default `tiween_e2e`, which must end in `_e2e`). A connection string is checked first, because it is what pg actually uses.

The CLI runs these checks on the raw env before booting Strapi, then again on Strapi's resolved DB config.

## Notes

- `strapi build` rewrites the shared `dist/`, with `STRAPI_ADMIN_BACKEND_URL` pointing at the E2E URL. `yarn develop` rebuilds `dist/` itself, so dev is unaffected. Run `yarn workspace @tiween/admin build:test-dist` before running the seed scripts against dev.
- `e2e:down` removes only compose project `tiween-e2e`. The dev `tiween` project and its `tiween_data` volume are never touched.
