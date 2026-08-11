# Epic 2b Context: Strapi v5 Migration & Backend Foundation (Parallel Track B)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Bring the Strapi backend from v4 to a fully operational v5 foundation that the frontend can build against: the whole domain model (catalog, scheduling, venues, ticketing, user data, geography/reference data), the custom admin tooling venue managers need, role/permission boundaries, the third-party providers (media CDN, transactional email), API documentation, legacy data migration, and development seed data. Everything downstream (Epics 3–8) consumes this backend, so correctness of the schema, the permission model, and the API surface matters more here than polish.

**Important:** the implemented model deliberately diverged from the original story texts. The `Showtime` component was replaced by the schema.org-style sub-event redesign (screening / performance), and content types live in plugins under `src/plugins/`, never in `src/api/`. Field lists inside the story texts are historical record only — the current schema plus the architecture amendment are the source of truth. Structural follow-through continues in Epic 2C.

## Stories

- Story 2B.1: Strapi v5 upgrade and project setup
- Story 2B.2: Core content-types — Event and CreativeWork
- Story 2B.3: Core content-types — Venue and Showtime
- Story 2B.4: Core content-types — Person and Genre
- Story 2B.5: Ticketing content-types — TicketOrder and Ticket
- Story 2B.6: User content-types — UserWatchlist and user preferences
- Story 2B.7: Reference content-types — Region, City, Category
- Story 2B.8: Events Manager plugin recreation for v5
- Story 2B.9: User roles and permissions configuration
- Story 2B.10: Redis integration for sessions and caching — **deferred post-v1**
- Story 2B.11: ImageKit provider configuration
- Story 2B.12: Email provider configuration (implemented with Brevo, not Resend)
- Story 2B.13: API documentation with OpenAPI
- Story 2B.14: Data migration scripts from legacy Strapi v4
- Story 2B.15: Database seeding for development
- Story 2B.16: Events Manager plugin — test coverage

## Requirements & Constraints

- **Roles and isolation.** Four access levels: Public (read published catalog, venues, reference data), Authenticated B2C (own watchlist, own orders), Venue Manager (own venue, own events, own sales only), Admin (full access). Venue-manager scoping to their own data is a security requirement, not a UI convenience.
- **i18n is first-class.** AR / FR / EN on every localized content type. Content-type work must preserve localization flags exactly; admin plugin translations for all three locales are mandatory.
- **Financial integrity.** Order creation must be atomic across order + tickets + inventory decrement. QR codes are cryptographically signed. Payment data is never stored locally.
- **Security floor.** bcrypt cost ≥ 12, rate limiting on auth endpoints, CORS restricted to approved domains, admin actions logged with user + timestamp.
- **Scale targets.** Database sized for ~100k events and 5k concurrent users in Phase 1; media served from a CDN capable of ~1M requests/day.
- **Provider fallbacks.** Media upload must fall back to local storage in development; email must fall back to console output in development.
- **Migration/seed hygiene.** Both legacy migration scripts and dev seeds must be idempotent; migrations need a report (migrated / skipped / errors) and rollback paths; seeds should use realistic Tunisian data (French and Arabic titles, real venues/cities).
- **Testing.** The events-manager test suite is the template for all custom plugins: SQLite test DB override, Supertest for controllers (including auth and role checks), React Testing Library for admin components, ≥80% coverage on plugin server code, TypeScript with no `any`.

## Technical Decisions

- **Plugin-per-bounded-context.** Domain code lives in `src/plugins/<name>/`: `creative-works` (catalog: creative-work with a type enum, person, character, credit-role, genre, category), `venues`, `events-manager` (scheduling only: event, screening, performance, feature, event-group), `ticketing`, `user-engagement`, `geography`, `tmdb-integration`. New plugins are sibling-clones of `geography`, never `@strapi/sdk-plugin init` layout, and are registered by path in `config/plugins.ts`.
- **Single catalog of record.** The unified `creative-work` (film / short-film / play) is the catalog. The legacy normalized `movie` / `play` types are retired; sub-events relate to `creative-work`. Cast, credits, and videos are repeatable components, not a dynamic zone.
- **Dependency direction is law.** Cross-plugin relations and service calls form one acyclic graph; a plugin may call another only along an edge that already exists in its schema, and only through the target's single `public-api` facade service. Never call another plugin's internal service or use a foreign UID with `strapi.documents()`.
- **Data access.** Document Service API only in business code. UIDs come from module-level constants, never inline strings. Services and controllers are hand-rolled `({ strapi }) => ({...})` factories, not `createCoreService/Controller`. Routes use string handler references. Controllers type `ctx: Context`, not `any`.
- **Transactions.** Any service method doing 2+ writes wraps them in `strapi.db.transaction`, with invariant checks re-read inside the transaction. Capacity-guarded inventory writes use an atomic conditional UPDATE at the query-builder level — the one sanctioned exception to Document-Service-only.
- **Validation and errors.** Zod schemas per controller under `server/src/validation/`, applied via a shared `validate()` helper. Error responses carry SCREAMING_SNAKE codes, never prose; translation happens client-side.
- **Shared kit.** `src/shared/` holds validation helpers, typed Context, policy helpers, error codes, and test utilities via relative imports. It is not a workspace package and must contain no domain logic.
- **No cache tier in v1.** Redis is deferred: sessions are stateless JWT, inventory locks are PostgreSQL-atomic, rate limiting and response caching run in-process. This is correct only because v1 deploys `replicas: 1` — horizontal scaling is blocked on Story 2B.10 and is a correctness change, not a capacity change.
- **Content-type moves** preserve `collectionName` (no table migrations); only relation target UIDs change, and each move requires re-seeding permissions, updating admin hooks, updating client route prefixes in the same PR, and grep-verifying zero stale UIDs.
- **Stack fixtures:** PostgreSQL 16, REST (not GraphQL), OpenAPI generated from content types, ImageKit for media, Brevo for transactional email, no hardcoded `"fr"` / `"TND"` defaults (use plugin config).

## Cross-Story Dependencies

- 2B.1 (v5 upgrade) gates every other story in the epic.
- Content-type stories build in relation order: reference data (2B.7) and Person/Genre (2B.4) underpin CreativeWork/Event (2B.2); Venue (2B.3) is needed before Event scheduling and before ticketing (2B.5); watchlist (2B.6) depends on the catalog.
- 2B.8 (events-manager plugin) requires all content types; 2B.16 (tests) requires 2B.8 and serves as the testing template for the other six plugins.
- 2B.9 (roles/permissions) must be re-verified after any content-type move, since permission seeds are UID-bound.
- 2B.13 (OpenAPI), 2B.14 (legacy migration), and 2B.15 (seeds) all depend on a stable final schema.
- Epic 2C's plugin decomposition continues this work and supersedes the original story-level structure; Epics 3–8 (frontend, ticketing, B2B venue management, scanner) consume this backend, and Venue Manager RBAC in particular is blocked until venue extraction lands.
