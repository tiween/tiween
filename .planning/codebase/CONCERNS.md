---
last_mapped_commit: 673843900a643a5822fd23fa133c6fecdc62ac5d
last_mapped_at: 2026-10-17
---

# Codebase Concerns

**Analysis Date:** 2026-10-17

## Tech Debt

**Integration-suite boot harness (residual, post story 4.7):**

- Status: The users-permissions auth factory-wiring boot failure is FIXED. Story 4.7 is `done` (commits `46fedaa`, `0607ffe`). Overrides now attach to the instantiated controller in `apps/strapi/src/extensions/users-permissions/strapi-server.ts` and are covered by `factory-wiring.unit.test.ts` / `auth-wiring.service.test.ts`.
- Residual issue: DW-4 / DW-5 / DW-86 were blocked on this. Check whether they have been unblocked, and whether `tests/helpers/strapi.ts` still boots from a stale `dist/` (`strapi build` uses `noEmitOnError: true`, and any TS errors, e.g. in `apps/strapi/src/plugins/user-engagement/`, suppress emit).
- Files: `apps/strapi/tests/helpers/strapi.ts`, `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Fix approach: Confirm `tsc --noEmit` is clean for `apps/strapi`, then re-run the integration suites against a fresh build.

**Integration test for orders is skipped:**

- Issue: `order.service.test.ts` is `describe.skip` because of a `db.config.connection` env failure (originally also the now-fixed story 4.7 boot failure).
- Files: `apps/strapi/src/plugins/ticketing/server/src/services/` (order service tests)
- Impact: The atomic inventory path has no executed real-DB coverage. Ticketing is the highest-risk money path.
- Fix approach: Unskip after the boot fix; add a `status: published` screening fixture so inventory is exercised against a published row.

**Concurrency and inventory guards live in the service layer:**

- Issue: `updateTicketInventory` in `apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts` uses a read-then-update window. The ledger marks the TOCTOU race and oversell concurrency as resolved by sweep bundle `dw-inventory-oversell-concurrency`, but verify that a database-level `CHECK (tickets_sold <= tickets_available)` constraint or row locking exists in the migrations before relying on it.
- Files: `apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts`, `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts`
- Impact: Without an RDBMS-level guard, concurrent purchases can still exceed capacity under load.
- Fix approach: Enforce the invariant in PostgreSQL (check constraint or conditional `UPDATE ... WHERE tickets_sold + qty <= tickets_available`) and assert on affected row count.

**Refund path has no caller and shares a generic error code:**

- Issue: `adjustInventory` with a negative delta has no upper bound and no idempotency key; it reuses the `TICKET_SOLD_OUT` code. No refund caller is wired yet.
- Files: `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts`
- Fix approach: Give refunds a distinct error code and idempotency guard before Epic 6 refunds are built.

**Silently swallowed errors in lifecycle hooks:**

- Issue: Catch blocks log with `console.log` and drop the error, with `// TODO: handle error`.
- Files: `apps/strapi/src/lifeCycles/user.ts` (around line 101, account-creation email), `apps/strapi/src/lifeCycles/adminUser.ts` (around line 38)
- Impact: A user can be created without the welcome/activation email and nothing alerts operators. Logs go to stdout instead of `strapi.log`.
- Fix approach: Use `strapi.log.error` with context, and decide whether to retry or surface a failure.

**Swallowed errors in dev super-admin seeder (DW-16, open):**

- Files: dev seeder under `apps/strapi/` (locate via `grep -rn "super" apps/strapi/src/seed*` or the seed directory)
- Fix approach: Narrow the catch to expected "already exists" errors and rethrow the rest.

**Stale or incomplete admin UI stubs:**

- Issue: Several admin actions are placeholders.
  - `apps/strapi/src/plugins/events-manager/admin/src/components/ImportTab.tsx` (line ~34) and `apps/strapi/src/plugins/events-manager/admin/src/pages/Import/index.tsx` (line ~90): bulk import modal not opened.
  - `apps/strapi/src/plugins/events-manager/admin/src/components/ContentSearchPanel/index.tsx` (line ~129): shorts/plays not supported via creative-works API.
- Impact: Operators see non-functional controls.

**Client placeholders in the public site shell:**

- `apps/client/src/app/[locale]/layout.tsx` (lines ~111, ~121): Navbar and Footer components are not yet added.
- `apps/client/src/components/elementary/forms/NewsletterForm.tsx` (line ~21): submit logic missing. The form renders but does nothing.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx` (line ~229): state persisted nowhere until auth lands.
- `apps/client/src/features/contribute/components/steps/MediaStep.tsx` (line ~286): file upload not implemented; the selected file is not sent.
- `apps/client/src/lib/metadata/index.ts` (line ~42): Strapi SEO fetching not implemented.

**Type-unsafe Strapi client base:**

- Issue: `apps/client/src/lib/strapi-api/base.ts` (line ~16) notes plugin content types (events-manager, ticketing) are not in `UID.ContentType`. `apps/client/src/lib/strapi-helpers.ts` (line ~35) has a non-generic helper.
- Impact: Plugin API responses are loosely typed on the client, so schema drift will not be caught at compile time.

**Other deferred ledger items still open:**

- DW-9: `entity-properties` component namespace tripwire; the decision is to defer to Story 2C.5 (the ledger also records a relocation decision, reconcile these).
- DW-14: `cast` component billing semantics undecided.
- DW-16: dev seeder error swallowing (above).

**Unused legacy and generated artifacts:**

- `yarn-error.log` (about 900 KB) is at the repo root and tracked by the working tree; `apps/client/debug-storybook.log` is untracked. Remove or ignore both.
- `apps/client/.next/` build output exists in the working tree; confirm it is gitignored.

## Known Bugs

**Sentry disabled in error boundaries:**

- Symptoms: Client errors are not reported to Sentry.
- Files: `apps/client/src/app/[locale]/error.tsx` (line ~19), `apps/client/src/components/elementary/ErrorBoundary.tsx` (line ~106)
- Trigger: Any runtime error in a route segment.
- Workaround: None; re-enable once Sentry supports Next.js 16.

**Venue website URL validation (resolved, verify):**

- DW-15 is marked done (sweep `dw-venue-website-url-validation`). Confirm the client route `apps/client/src/app/api/venues/register/route.ts` rejects non-http(s) schemes; its test lists `javascript:` and `ftp://` cases.

## Security Considerations

**Payment webhook is unauthenticated unless a shared secret is configured:**

- Risk: Konnect's webhook is unsigned. The controller accepts any request with `payment_ref`, then re-queries Konnect server-to-server, so forged refs cannot change state directly. But the shared-secret gate is optional and only enforced when `plugin::payments.webhookSecret` is set. An unauthenticated caller can still trigger outbound status lookups (amplification/abuse).
- Files: `apps/strapi/src/plugins/payments/server/src/controllers/webhook.ts`, `apps/strapi/src/plugins/payments/server/src/config/index.ts`
- Current mitigation: Server-to-server re-verification of status; event-hub decoupling to ticketing.
- Recommendations: Make the webhook secret mandatory in production (fail startup if unset). Rate-limit the endpoint. Verify the expected secret is set in the production environment without copying its value into any document.

**Rate limiter trusts Koa's client IP and is in-memory:**

- Risk: The per-IP fixed-window limiter keys on `ctx.state?.ip ?? ctx.ip ?? "unknown"`. Behind a reverse proxy without trusted-proxy configuration, `ctx.ip` may be the proxy address, so all users share one bucket (or a spoofed header is trusted if a layer sets `ctx.state.ip`). State is a plain `Map` per process, so limits do not hold across replicas.
- Files: `apps/strapi/src/shared/rate-limit.ts` (line ~21, ~50, ~76), `apps/strapi/src/plugins/events-manager/server/src/middlewares/rate-limit.ts`
- Current mitigation: Bounded `maxKeys` sweep; documented as single-instance stopgap.
- Recommendations: Configure Strapi `proxy` trust for the deployed proxy only; move counters to Redis (Redis is already used in `apps/strapi/src/plugins/events-manager/server/src/utils/trending-cache.ts` context) before running multiple replicas.

**Trending endpoint is unauthenticated, uncached at the edge, and unrate-limited on the query path:**

- Risk: DW-19 notes an in-JS cap-then-rank over up to 500 fully populated events. Marked done, but the endpoint remains a resource-exhaustion surface if the rate limiter is bypassed.
- Files: `apps/strapi/src/plugins/events-manager/server/src/utils/trending-cache.ts`, `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts`
- Recommendations: Keep the per-IP limiter on this route and document the cache TTL.

**Public inventory leakage (resolved, keep guarded):**

- DW-18 addressed blanket `populate` exposing `ticketsSold`/`ticketsAvailable` and full venue records. Regression risk remains wherever `populate: "*"` is used. Grep for `populate: "*"` and for `ticketsSold` in public routes after each change.

**reCAPTCHA is not enforced on every public form:**

- Issue: `apps/client/src/features/contribute/components/steps/ReviewStep.tsx` (line ~172) has `// TODO: Get reCAPTCHA token here`, so the contribute submission path can proceed without a token. The server verifier `apps/client/src/lib/recaptcha.ts` returns false when the token is missing, so the server side is the real gate; confirm the contribute routes (`apps/client/src/app/api/contribute/play/route.ts`, `apps/client/src/app/api/contribute/person/route.ts`) reject missing tokens.
- Note: reCAPTCHA v3 score threshold is hard-coded at 0.5 in `apps/client/src/lib/recaptcha.ts`.

**Client-side reCAPTCHA global typing:**

- `apps/client/src/app/[locale]/venues/register/_components/VenueRegistrationForm.tsx` declares `window.grecaptcha` locally; keep the site key in public env only.

**Secrets and environment files:**

- `.env` exists in the working tree but is not tracked (good). Tracked templates are `.env.example`, `apps/strapi/.env.example`, `apps/client/.env.local.example`. Keep values out of templates.
- `.releaserc.json` and `.env` carry restrictive permissions; `yarn-error.log` may contain tokens from install output, so delete it.
- `apps/strapi/config/middlewares.ts` CSP `connect-src` allows `https:` broadly, and `script-src` includes `https://maps.googleapis.com`. Tightening to specific hosts is a hardening item.
- CORS allowlist in `apps/strapi/config/middlewares.ts` (around line 67-73) includes localhost origins; confirm production origins only in production env.

**Account-creation email carries a reset token in a link:**

- Files: `apps/strapi/src/lifeCycles/user.ts` (around line 95-100)
- Risk: The generated password is not sent, but a reset token is embedded in the welcome URL with the email and name in the query string. Tokens in URLs can leak through logs, referrers, and mail-client caching.
- Recommendations: Use a short TTL for the token and a POST-based activation page, or avoid putting the name in the query.

**Docker and CI:**

- `docker-compose.prod.yml` exposes services on host `ports:` (lines ~16, ~61). Confirm the Postgres and Redis services are not published to the public interface (line ~123 onward).
- `.github/workflows/deploy.yml` correctly gates `workflow_run` deploys on `head_repository.full_name == github.repository`. Keep that guard.

## Performance Bottlenecks

**Venue and event services are very large:**

- Problem: Single-file services carry many responsibilities.
- Files: `apps/strapi/src/plugins/events-manager/server/src/services/venue-events.ts` (~619 lines), `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` (~464 lines), `apps/strapi/src/plugins/ticketing/server/src/services/order.ts` (~731 lines)
- Cause: Mixed read, write, and orchestration logic in one module.
- Improvement path: Split read models from write commands; keep the inventory mutation path isolated and covered by tests.

**Fully populated list queries:**

- Problem: DW-18 and DW-19 show that list endpoints historically populated screenings and venues wholesale.
- Files: `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts`
- Improvement path: Use explicit `fields` and `populate` projections per endpoint, and add a cache keyed on query parameters.

**Client bundle and map:**

- Map code lives in `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx` and `apps/strapi/src/plugins/venues/admin/src/components/MapPicker/geocode.ts`. Ensure the map library is dynamically imported on routes that need it.

## Fragile Areas

**Users-permissions extension:**

- Files: `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (~1200 lines)
- Why fragile: Large single-file override of core auth. Overrides must attach to the instantiated controller, not the factory (the story 4.7 regression). Unit tests alone did not catch the original bug.
- Safe modification: Add a boot-level smoke test that starts Strapi and asserts the auth routes resolve before merging.
- Test coverage: Integration suite skipped (see above).

**Strapi build depends on all plugins compiling:**

- Files: `apps/strapi/src/plugins/user-engagement/`, `apps/strapi/tsconfig.json`
- Why fragile: `strapi build` uses `noEmitOnError: true`; 9 TS errors in one plugin block emission of everything, and the test harness reads a stale `dist/`.
- Safe modification: Run `tsc --noEmit` in CI on the Strapi app and fix or exclude the `user-engagement` errors before touching shared types.

**Ticketing and payments coupling via events:**

- Files: `apps/strapi/src/plugins/payments/server/src/controllers/webhook.ts` (emits `payments.payment.resolved`), ticketing bootstrap subscriber.
- Why fragile: The contract is a string event name with an untyped payload. A rename silently breaks reconciliation.
- Safe modification: Export the event name and payload type from one module and import it in both plugins.

**Catalog schema migration (creative-work model):**

- Files: `apps/strapi/src/api/`, `apps/strapi/src/plugins/events-manager/`, `_bmad-output/implementation-artifacts/2c-3-catalog-move-into-creative-works.md`
- Why fragile: Legacy `common.video` carries two enums (`type` and `videoType`) by design (DW-11, documented as intentional). Seed and admin forms were rebuilt, but legacy field names persist.
- Safe modification: Read the documented authority split before writing new video consumers.

**Venue-to-property relation:**

- Files: venue schema and `entity-properties` component namespace (see DW-9).
- Why fragile: Renaming the component category without a migration breaks `venue.properties`.

## Scaling Limits

**Rate limiting and trending cache are per process:**

- Current capacity: One Strapi process; Maps bounded by `maxKeys`.
- Limit: Multiple replicas each keep separate counters and caches, multiplying effective limits.
- Scaling path: Redis-backed counters and cache (Redis is already in the stack for sessions per story 2B-10).

**Ticket inventory under concurrent purchase:**

- Current capacity: Unknown; no load test in the repo.
- Limit: Race-prone without a DB constraint or row lock (see Tech Debt).
- Scaling path: Database-enforced invariant plus a load test on the purchase endpoint before Epic 6 go-live.

## Dependencies at Risk

**Sentry integration:**

- Risk: Disabled pending Next.js 16 support (see Known Bugs).
- Impact: No production error telemetry on client.
- Migration plan: Track upstream Sentry support for Next.js 16 and re-enable in both error components.

**Yarn 1 lockfile and logs:**

- `yarn.lock` (~967 KB) with `yarn-error.log` committed-adjacent. Plan an update path and remove the stale error log.

## Missing Critical Features

**Newsletter subscription:**

- Problem: `NewsletterForm.tsx` has no submit logic.
- Blocks: Marketing email capture.

**Contribute file upload:**

- Problem: Media uploads in the contribute flow are not sent to the server.
- Blocks: Community-submitted media.

**Refund flow:**

- Problem: No caller for negative inventory adjustment.
- Blocks: Refunds and cancellations in Epic 6.

**Authenticated personalization persistence:**

- Problem: Event detail state (`EventDetailPageWithMap.tsx`) is not persisted to backend.
- Blocks: Watchlist sync across devices (Epic 5) on that surface.

## Test Coverage Gaps

**Ticketing order integration:**

- What's not tested: Real-DB order, inventory, and payment reconciliation flow.
- Files: `apps/strapi/src/plugins/ticketing/server/src/services/order.ts`, skipped `order.service.test.ts`
- Risk: Oversell or double-charge regressions go unnoticed.
- Priority: High

**Strapi boot:**

- What's not tested: Full server boot with all plugins and routes.
- Files: `apps/strapi/tests/helpers/strapi.ts`
- Risk: Boot regressions like story 4.7 only appear at runtime.
- Priority: High

**Payment webhook authentication:**

- What's not tested: Webhook behavior with secret configured vs. missing; a unit test exists at `apps/strapi/src/plugins/payments/server/src/controllers/__tests__/webhook.unit.test.ts`. Extend it to cover the production-missing-secret case.
- Priority: High

**Client reCAPTCHA gate on contribute:**

- What's not tested: Contribute routes rejecting submissions without a token.
- Files: `apps/client/src/app/api/contribute/play/route.ts`, `apps/client/src/app/api/contribute/person/route.ts`
- Priority: Medium

**Admin Import flow:**

- What's not tested: Bulk import UI (the modal is a TODO).
- Files: `apps/strapi/src/plugins/events-manager/admin/src/pages/Import/index.tsx`
- Priority: Low until the feature ships.

---

_Concerns audit: 2026-10-17_
