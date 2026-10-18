# Decisions (ADR-type sources)

Synthesized from the 12 ADR-typed sources (re-run #2, 2026-10-18; full rewrite). No ADR carries `locked: true` (classifier output), so every decision is ordered by manifest `precedence` (lower integer wins). The top-precedence source, `.planning/ingest-resolutions.md` (precedence 0), holds the project owner's explicit answers to the previous runs' conflicts and warnings (8 decisions, ADR-R1..R8) and is treated as owner-ratified: it wins over every other source. Sprint change proposals are recorded with their document status and whether the artifacts show them applied. Entries run in precedence order. Superseded parts are kept, marked, so the roadmapper does not re-adopt them.

Precedence key (from `.planning/ingest-manifest.yaml`; the classification JSONs carry stale integers offset by one and were not used): 0 ingest-resolutions.md, 1 project-context.md, 2 architecture.md (2026-06-12 amendment), 3 SCP 2026-08-11, 4 SCP 2026-08-06, 5 SCP 2026-07-14, 6 SCP 2026-07-05, 7 SCP 2026-06-16, 8 SCP 2026-06-15, 9 SCP 2026-06-12, 10 calendar build-vs-buy 2026-08-08, 11 baseline core-architectural-decisions.

---

# Owner-ratified resolutions (precedence 0, source: .planning/ingest-resolutions.md)

## ADR-R1: Brand palette is Gold Leaf x Aubergine; teal/yellow retired

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified, precedence 0; classifier locked=false)
- decision: Gold Leaf x Aubergine is the current Tiween B2C brand palette. The teal/yellow palette is retired. Epic 1 stories 1.3 (Tailwind theme / design tokens), 1.4 (dark theme / focus styling) and 1.7 (PWA manifest theme and background color) need rework, and the owner's palette resolution also covers the Epic 2A additions: stories 2A.1 (BottomNav active-tab color) and 2A.2 (Header background). The canonical B2C visual identity and behavior spines are `ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md` and `EXPERIENCE.md`. The reference cycle between them is fixed at source (DESIGN.md says "the behavior spine"; EXPERIENCE.md keeps `design: ./DESIGN.md`; verified in both files) and both spines are now extracted: tokens, typography, daylight surfaces, category color-coding and logo in constraints.md section 7 (UX-b2c-_), behavior in constraints.md section 8 and requirements.md (REQ-b2c-_).
- scope: B2C design system, Epic 1 (1.3, 1.4, 1.7), Epic 2A (2A.1, 2A.2). Code reality (apps/client, checked 2026-10-18): 23 files still carry the retired values; `src/styles/theme.css` defines `--color-tiween-green` #032523 and `--color-tiween-yellow` #F8EB06 and `--font-arabic: "Noto Sans Arabic"`; `public/manifest.json` has theme_color and background_color #032523; `src/lib/fonts.ts` loads Inter, Lalezar and Noto_Sans_Arabic (no IBM Plex Sans Arabic or Cairo). `epic-list.md` Epic 1 bullet and `requirements-inventory.md` UX notes restate the retired palette. Tech-version note: the spine frontmatter says "Next.js 15 App Router" but the repo is Next.js ^16.1.0 (apps/client/package.json) and Epic 1 and the baseline ADR say 16.1; the repo governs.

## ADR-R2: Brevo is the email provider; Resend references are obsolete

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified, precedence 0)
- decision: Brevo is ratified as the transactional email provider (matches the code: `packages/strapi-provider-email-brevo`). Resend references in the baseline architecture, structure-boundaries shard, and the Epic 2B story 2B.12 text are obsolete.
- scope: email / notifications

## ADR-R3: Social Content Studio is a separate project, excluded from this roadmap

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified, precedence 0)
- decision: The Social Content Studio is a separate project and is excluded from this roadmap. Its PRD and addendum were removed from the manifest; no Social Content Studio content is extracted into any intel file.
- scope: roadmap boundary

## ADR-R4: Events-manager admin calendar rebuild is its own early phase

- source: .planning/ingest-resolutions.md (with calendar-build-vs-buy-2026-08-08.md for the library choice)
- status: proposed (owner-ratified, precedence 0)
- decision: The events-manager admin calendar is its own phase, scheduled early and before any Epic 9 admin work, because showtime entry blocks v1. Phase scope is VERIFY + HARDEN, not rebuild: the planning integration layer was already rebuilt on screening/performance in commit 9a75837 (2026-08-08; spec `spec-events-manager-planning-surface-rebuild.md` status done). The phase is (1) end-to-end showtime-entry verification, then (2) BigCalendar hardening: UTC rendering in the grid, RTL, tests, a11y and locale strings (the open items listed in deferred-work.md). Built on the bespoke `BigCalendar` per ADR-P9 and UTC-aware. This supersedes the "re-planned after 2C.3, no home" state in epic-dependencies.md, epic-2c and implementation-readiness-2026-08-08.md. Stale as a result: implementation-readiness-2026-08-08 Finding 1 and the deferred-work.md "broken surface" ledger entry (both describe a surface requesting the deleted `plugin::events-manager.showtime`).
- scope: events-manager admin UI, showtime entry. Previous run's open scope WARNING is closed by this answer.

## ADR-R5: Post-v1 fee model deferred (open question)

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified deferral, precedence 0)
- decision: The post-v1 fee/commission model is deferred. It must be decided before any post-v1 ticketing phase is planned. Competing figures stay recorded in requirements.md (REQ-success-criteria-phase2-business) and context.md (competitive positioning). Tracked as an open question, not a conflict.
- scope: post-v1 monetization

## ADR-R6: Epic 9 / Epic 10 v1 set

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified, precedence 0)
- decision: IN v1: stories 9.1, 9.2, 9.3, 9.4, 9.5, 9.6 and 10.6. OUT: 10.4 (offline watchlist access; duplicates already-delivered story 5.4). The "Phase 2" scope labels on 9.1, 9.3, 9.4, 9.5 and 10.6 in the epic files and epic-list.md are overridden. Story 10.6 keeps its existing carve-out from SCP 2026-08-06: the ticket-queue portion stays out of v1. Story 10.5 (offline tickets) remains deferred per ADR-P3.
- scope: Epic 9, Epic 10 v1 scope

## ADR-R7: Venue-manager surface is the Strapi admin

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified, precedence 0)
- decision: The venue-manager surface is the Strapi admin, built on Epic 2D RBAC and the `venues-admin-scope` policy. The story 7.2 Next.js client build (the `/venue` area in apps/client) is to be reworked or retired. Epic 7 stories 7.2 to 7.8 and the story 9.1 approval flow must be reconciled to this surface (including how venue-manager accounts are provisioned so they can reach /admin).
- scope: Epic 7, Epic 2D, Epic 9.1

## ADR-R8: Ticketing-derived metrics trimmed from v1 stories

- source: .planning/ingest-resolutions.md
- status: proposed (owner-ratified, precedence 0)
- decision: Ticketing is dormant in v1 (ADR-P3), so ticketing-derived acceptance criteria are trimmed. Story 9.4 (platform analytics dashboard) ships WITHOUT total revenue, transactions and average order value; story 7.8 (venue event analytics) ships WITHOUT the views-to-purchases conversion rate; story 7.4 (cancel event) ships WITHOUT the refund step. Restore each when ticketing is un-deferred. The remaining ACs of those stories (for example 9.4 users/events/platform counts; 7.8 views and privacy-compliant aggregation per NFR-D5; 7.4 mark showtimes cancelled, notify watchlisting users, edit history) stay in force.
- scope: Epic 9 (9.4), Epic 7 (7.8, 7.4). Closes the previous run's ticketing-metrics WARNING.

---

# Pre-existing ADR-typed sources (ordered)

## ADR-P0: Agent rules moved out of project-context.md into the context bundle

- source: \_bmad-output/project-context.md
- status: proposed (document status "superseded"; classifier confidence low; precedence 1)
- decision: project-context.md is now a pointer only. Binding agent rules live in AGENTS.md (project kernel) and docs/context/ (kernel.md, index.md, compass/strapi.md). Prior contents were dropped because they contradicted the code (a `yarn test:e2e` command and Playwright dependency that do not exist; blanket "never create `__tests__`" that holds only for apps/client; translations under `src/messages/` instead of `apps/client/locales/`).
- scope: agent rules / developer guidance. Rules themselves are captured in constraints.md (section "Project kernel").

## ADR-P1-D1: Extract a `venues` plugin from events-manager

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (architecture status "complete" 2026-06-12; implemented, story 2C.1 done)
- decision: Create `plugins/venues` (sibling-clone of `geography`), move `venue` plus entity-properties' `property-category` and `property-definition` into it, retarget `event.venue` to `plugin::venues.venue`, re-seed permissions, move client paths `/events-manager/venues` to `/venues`. Unblocks Epic 7 Venue Manager RBAC.
- scope: backend module structure (Strapi plugins)

## ADR-P1-D2: creative-works' unified `creative-work` is the single catalog of record

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (REVISED 2026-06-15; inverts the earlier "normalized movie/play wins" direction; implemented, 2C.3 in review)
- decision: `creative-work` (type enum film | short-film | play) is the catalog. events-manager `movie`/`play` are retired. People graph = `person` + `character` content types + NEW `credit-role` content type (named to avoid the Strapi RBAC `role` collision). `cast[]` (to person, character) and `credits[]` (to person, credit-role) are repeatable components on creative-work; `videos[]` gains a `videoType` enum. No dynamic zone. Both catalogs were empty, so schema-only change.
- scope: catalog data model

## ADR-P1-D3: Ticketing order creation is a Unit of Work with atomic inventory

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (implemented, story 2C.4 done)
- decision: `strapi.db.transaction` wraps availability check, order+tickets create, and inventory decrement via `events-manager.public-api.adjustInventory`. Validation amendment: capacity-guarded writes use an atomic conditional UPDATE at query-builder level (`UPDATE screenings SET tickets_sold = tickets_sold + :qty WHERE id = :id AND tickets_sold + :qty <= tickets_available`; zero rows throws `TICKET_SOLD_OUT`). This is the one sanctioned exception to "Document Service only", confined to `adjustInventory`.
- scope: ticketing / inventory integrity

## ADR-P1-D4: Dependency-direction rules R1-R5 (acyclic, facade-only)

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (violations are review blockers; no lint enforcement exists)
- decision: R1 cross-plugin relations and service calls form one acyclic graph; R2 a plugin may call another's services only along an existing schema-relation edge; R3 cross-plugin service calls go through the target's facade only; R4 no `strapi.documents()` with a foreign UID; R5 integration plugins (tmdb, payments) depend on nothing. Sanctioned edges: ticketing to events-manager (inventory), ticketing to payments, user-engagement to creative-works, events-manager to creative-works, events-manager.event.venue to venues, everything to users-permissions.
- scope: cross-plugin boundaries

## ADR-P1-D5: `payments` plugin as an Anti-Corruption Layer for Konnect

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (plugin exists in tree; ticketing dormant)
- decision: Dedicated `payments` plugin (konnect-client, webhook, status mapping) mirroring tmdb-integration; created when Epic 6 starts. Konnect webhook signature verification isolated there; ticketing calls `payments.public-api` only.
- scope: payment integration

## ADR-P1-D6: entity-properties folds into venues; shell deleted in step 4 (story 2C.5, still backlog)

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed
- decision: property-category/property-definition live in `venues`; `entity-properties` plugin shell is deleted (2C.5). The `entity-properties` component namespace under `src/components/` is unrelated and live.
- scope: venues / properties model

## ADR-P1-D7: screening/performance stay separate; shared logic via `subEventStrategy` map

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (2C.5, not done)
- decision: `events-manager/server/src/strategies/sub-event.ts` exports `subEventStrategy: Record<"screening" | "performance", SubEventStrategy>`; services resolve behavior through the map with no `if (kind === ...)` branching.
- scope: events-manager scheduling

## ADR-P1-D8: Facade convention (`public-api` service per plugin)

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed
- decision: Each plugin exposes exactly one service named `public-api` as its sole cross-plugin entry point (`strapi.plugin("events-manager").service("public-api")`). First implementations: `events-manager.public-api.adjustInventory`, `creative-works.public-api.findWork`.
- scope: cross-plugin API

## ADR-P1-A1: Redis deferred post-v1 (amendment to the architecture doc)

- source: \_bmad-output/project-planning-artifacts/architecture.md (amendment note 2026-08-11) and \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-08-11.md
- status: proposed (SCP status "proposed"; architecture.md, requirements-inventory, sprint-status and AGENTS landmine all reflect it as applied)
- decision: No cache tier in v1. Sessions are stateless JWT, inventory locks are PostgreSQL-atomic, rate limiting (apps/strapi/src/shared/rate-limit.ts) and trending cache are in-process.
- scope: caching / sessions / rate limiting

## ADR-P1-A2: v1 constraint, single instance (`replicas: 1`)

- source: \_bmad-output/project-planning-artifacts/architecture.md and sprint-change-proposal-2026-08-11.md
- status: proposed (treated as binding invariant)
- decision: v1 runs `replicas: 1` (docker-compose.prod.yml lines 39 and 104). Horizontal scaling is blocked on story 2B.10 (Redis). At N instances: per-IP limits multiply by N, trending caches diverge, cache invalidation reaches only the handling instance. Scaling the deployment is a correctness change, not a capacity change.
- scope: deployment topology

## ADR-P1-A3: Venues plugin rich venue model and canonical admin UI (addendum 2026-06-16)

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed (consistent with, not superseding, the amendment; 2D.1 and 2D.2 done)
- decision: `plugin::venues.venue` extends to city/region, phone, email, website, type enum, status enum, logo/images media, manager relation, and a repeatable `property-value` component. venues plugin owns the single canonical venue admin UI; events-manager `VenueFormModal` + `useVenuesEnhanced` are relocated, not duplicated. Tracked as Epic 2D. (Reinforced by ADR-R7: this Strapi admin is the venue-manager surface.)
- scope: venues plugin

## ADR-P1-P1: Plugin implementation patterns (hand-rolled factories, UID constants, Zod validation, shared kit, sibling-clone scaffold)

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed
- decision: Hand-rolled `({ strapi }: { strapi: Core.Strapi }) => ({...})` factories (not createCore\*); module-level UID constants, no inline UID strings; Document Service only; string route handlers in `routes/{content-api,admin-api}.ts`; `ctx: Context` not `any`; Zod schemas per controller via shared `validate()` throwing a Strapi `ValidationError` carrying an error CODE; any 2+ write method wrapped in `strapi.db.transaction`; shared server kit in `apps/strapi/src/shared/` (not a workspace package; `packages/shared-types` deliberately deleted); new plugins by sibling-clone of `geography`, not `@strapi/sdk-plugin init`; admin translations `en/fr/ar.json` mandatory; plugin config over hardcoded `"fr"`/`"TND"`.
- scope: Strapi plugin layer

## ADR-P1-M1: Migration plan (4 steps + payments) and content-type move mechanics

- source: \_bmad-output/project-planning-artifacts/architecture.md
- status: proposed
- decision: Step 1 extract venues; Step 2 consolidate catalog on creative-works; Step 3 ticketing Unit of Work (may precede step 2, never concurrent); Step 4 consolidation sweep (subEventStrategy, public-api facades, shared kit, delete entity-properties); payments plugin with Epic 6. Move mechanics: copy schema.json verbatim changing only relation target UIDs; never touch `collectionName`, attribute names, localization flags; move lifecycle subscribers with the type; re-seed permissions; update admin hooks UID constants; update client `lib/api/content/*` prefixes in the same change; grep-verify zero remaining references to old UIDs. Rationale: `collectionName` preserved, so no table migrations.
- scope: backend refactor sequencing

## ADR-P2: Defer Redis (story 2B.10) to post-v1

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-08-11.md
- status: proposed (SCP header "proposed"; applied in practice, sprint-status `2b-10: deferred`)
- decision: Story 2B.10 descoped; formally deferred post-v1. No code change (nothing ever imported a Redis client; the story's checked tasks 3 and 4 were false). Doc/config reconciliation: sprint-status, epic-2b, epics/index.md ([POST-V1]), epic-list, requirements-inventory, epic-1 (Redis container AC removed), project-context, architecture.md, `.env.example` (REDIS\_\* and CACHE_ENABLED stripped), docs/dokploy-setup.md, deferred-work.md. In-process limiter and trending cache are the sanctioned v1 design and must not be touched. Re-entry trigger: horizontal scaling, or Epic 6 un-deferred with checkout reservations (FR64) needing distributed locks.
- scope: infrastructure, Epic 2B.10

## ADR-P3: V1 is a multi-category content and event aggregation platform; ticketing is post-v1

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-08-06.md
- status: proposed (header "APPROVED by Ayoub 2026-08-06 - all section 4 edits applied same day")
- decision: V1 scope widens from cinema-only to cinema, theater, concerts, exhibitions. All ticketing/purchase functionality deferred post-v1. Epic 3: 3-2 category filtering back in v1; new story 3-12 gates shipped purchase surfaces (6-1/6-2/6-3) behind a default-off feature flag. Epic 6: 6-6..6-10 deferred; 6-1..6-5 stay done and dormant, no rollback. Epic 7 split: 7-1/7-2/7-3/7-4/7-8 stay v1; 7-5/7-6/7-7/7-9 deferred. Epic 8 entirely post-v1 (8-1..8-6). Epic 10: 10-5 deferred; 10-6 stays but ticket-queue part is out. Architecture unchanged (ticketing dormant, not removed). Core value: "Find what's happening - films, theater, concerts, exhibitions - across Tunisia." (Epic 9 and Epic 10 v1 membership is further fixed by ADR-R6.)
- scope: product scope / phasing (v1 vs post-v1)

## ADR-P4: Restore real ESLint enforcement

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-07-14.md
- status: proposed (no explicit approval line; stories 1-10..1-13 all `done`)
- decision: Remove `eslint-plugin-only-warn` from all three shared presets; add `--max-warnings=0` to lint scripts; bring apps/strapi under lint via flat config; add i18n Western-numeral lint guard (1-12) and a non-UTF-8/control-byte CI guard (1-13). Pending doc edit: architecture.md PR-gate line should add lint (`eslint . --max-warnings=0`, both apps) once 1-10 and 1-11 landed (they have). Out of scope: foreign-UID dependency-rule lint, integration-seam test tier, Strapi Jest to Vitest migration.
- scope: tooling / quality gates (Epic 1)

## ADR-P5: Split Story 3.1; defer Phase-2 discovery stories

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-07-05.md
- status: proposed (header "proposed"; approval section records Ayoub approval 2026-07-05)
- decision: Story 3.1 split along data/presentation seam: 3.1 (key `3-1`) public events browse API + `featured` boolean + trending (`sum(screening.ticketsSold)`), and 3.11 (key `3-11`) homepage wire-up (depends on 3.1). Sub-story sprint keys must be numeric (loop `STORY_RE`). 3-2 and 3-9 deferred (3-2 later returned to v1 by ADR-P3; 3-9 still deferred).
- scope: Epic 3 delivery

## ADR-P6: New Epic 2D, venues and properties admin UI

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-06-16.md
- status: proposed (header "proposed", approval "pending"; Epic 2D exists, 2d-1 and 2d-2 done)
- decision: Add standalone mini-epic 2D: extend venue schema to the rich model, venue CRUD admin UI (relocate events-manager VenueFormModal), property-definition/category authoring UI, attach property values to venues. Serves Admin/Editor and scoped Venue Manager. Uses Strapi Design System v2, not the B2C design system. Epic 7.2 builds on it. (The proposal's "Epic 7 stays Phase 2" statement is superseded by ADR-P3.)
- scope: venues plugin admin

## ADR-P7: Invert catalog direction; GTM = read-only directory

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-06-15.md
- status: proposed (header status "approved"; approved by Ayoub 2026-06-15)
- decision: Invert the 2C.2 decision: unified `creative-work` wins; `movie`/`play` retired; 2C.2 doc kept as superseded history; 2C.3 spec rewritten; user-engagement watchlist relation unchanged. Follow-up flagged: formalize "GTM = read-only directory; ticketing post-GTM" in PRD text (later done by ADR-P3 for product-scope.md).
- scope: catalog model (restates ADR-P1-D2)

## ADR-P8: Introduce Epic 2C; retire OpenSpec

- source: \_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-06-12.md
- status: proposed (header "Approved by Ayoub (2026-06-12, batch review)")
- decision: New Epic 2C with 5 stories mapping 1:1 to the amendment's migration steps (venues extraction, collision audit, catalog move, ticketing UoW, consolidation sweep). Epic 6 6-3 uses `payments` plugin and needs 2C.4; Epic 7 needs 2C.1. Epic 2B story texts are historical record (Showtime component and `src/api/` model deleted by the schema.org redesign). OpenSpec retired entirely; BMad single source of truth (later itself superseded by GSD, see AGENTS.md/CLAUDE.md).
- scope: backlog structure

## ADR-P9: Build on bespoke `BigCalendar`; no third-party calendar library

- source: \_bmad-output/project-planning-artifacts/calendar-build-vs-buy-2026-08-08.md
- status: proposed (decision recorded 2026-08-08 by Ayoub)
- decision: Keep `events-manager/admin/.../BigCalendar` (1,811 LOC) and fix in place; the 2026-01 constraint (Strapi DS components only, no external calendar lib) stands. Rebuild the planning integration layer UTC-aware with unit tests at the transform boundary (done in commit 9a75837, 2026-08-08). Future direction (unscheduled): extract BigCalendar into a standalone OSS project. Known defects logged as deferred work: dead `timezone` prop, UTC vs browser-local rendering, RTL physical positioning, no tests, hardcoded fr-FR, incomplete a11y. Incidental: `rrule ^2.8.1` unused in apps/strapi and events-manager package.json, safe to remove. If replacement is ever revisited, Schedule-X was the leading candidate (Temporal polyfill and premium-tier checks outstanding). Phasing and scope of the remaining work are fixed by ADR-R4 (own early phase, verify + harden: UTC in-grid, RTL, tests, a11y, locale strings).
- scope: events-manager admin planning calendar

## ADR-P10-baseline: Original architecture decisions (still-valid and superseded parts)

- source: \_bmad-output/architecture/core-architectural-decisions.md
- status: proposed (baseline; precedence 11 is lowest, individual items overridden below)
- decision: Retained: PostgreSQL (doc says 16.x), REST API (Strapi), NextAuth.js with JWT, bcrypt cost 12+, HMAC-SHA256 QR signing, RFC 7807 style error codes (implemented as code-only errors), Next.js 16.1 App Router + RSC, Zustand + SWR client state, Tailwind v4 + shadcn/ui, Storybook (Vite), next-intl, Serwist PWA, Algolia search, ImageKit media, Konnect payments, Dokploy on VPS + Docker + GitHub Actions, Sentry (disabled in code today), IndexedDB offline storage, SSR/ISR/SSG/CSR rendering strategy per page type. Superseded/overridden: Redis 7 for sessions, ticket locks, rate limiting (ADR-P2); Redis session storage and "check against Redis" in QR flow; Playwright E2E (no E2E suite exists, kernel forbids inventing one); Socket.io real-time (deferred, FR64-66 post-v1); Resend for email (ADR-R2: Brevo ratified); `apps/ui` path (actual `apps/client`); `src/api/` content types (actual plugins); the teal/yellow brand tokens implied by Epic 1 (ADR-R1) and the Noto Sans Arabic body face (the 06-16 spine specifies IBM Plex Sans Arabic). Deferred in baseline: advanced analytics/observability, AI recommendations, POS ticketing.
- scope: stack-wide baseline
