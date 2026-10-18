# Constraints (SPEC-type sources, plus binding project kernel)

Entries come from SPEC-typed docs (baseline architecture shards, epic files, UX spines) and from the binding agent rules in `/Users/ayoub/projects/tiween-bmad-version/AGENTS.md` ("Project Kernel") and `docs/context/*.md` (captured here per orchestrator instruction; project-context.md is only a superseded pointer). Where a baseline SPEC statement is contradicted by the amendment, the kernel, or an owner-ratified resolution (decisions.md ADR-R1..R8), the entry notes it and the conflicts report logs the resolution. Epic/story scope and completion status are in context.md. Re-run #2 (full rewrite): the cycle between the 2026-06-16 B2C `DESIGN.md` and `EXPERIENCE.md` is fixed at source and verified, so both are now extracted: visual identity (Gold Leaf x Aubergine tokens, typography, daylight surfaces, category colors, logo) in section 7 and behavior in section 8.

---

# Section 1: Project kernel (binding, from AGENTS.md and docs/context/)

## KERNEL-landmines

- source: /Users/ayoub/projects/tiween-bmad-version/AGENTS.md (docs/context/redis-deferred.md, ticketing-dormant.md, entity-properties-vestigial.md)
- type: protocol
- content: Never add Redis or set `replicas` > 1 (deliberate post-v1 deferral). Never delete dormant Epic 6 ticketing code (feature-flagged off, not rolled back; applies to apps/strapi/src/plugins/ticketing/ and apps/client/src/features/tickets/). `legacy/` is frozen reference-only (CodeGraph indexes it; its symbols are false hits). Inert, never read or edit: `input/`, `design_handoff_tiween/`, root `progress.json`, root `status.json`. `apps/strapi/src/plugins/entity-properties/` is an empty shell awaiting deletion (story 2C.5); never build on it (its component namespace under src/components/entity-properties/ is live and unrelated). Never bump `prettier` past 3.3.2 (corrupts Strapi's generated TS schemas).

## KERNEL-commands-and-testing

- source: /Users/ayoub/projects/tiween-bmad-version/AGENTS.md (docs/context/test-layout.md, worktree-install.md)
- type: protocol
- content: Yarn 1 classic only (never npm/pnpm). `yarn test` runs Vitest in apps/client and Jest in apps/strapi. Strapi boot-based suites (`*.service.test.ts`, `*.controller.test.ts`) need `yarn workspace @tiween/admin test:integration`; both `yarn test` and CI skip them (green CI says nothing about the integration suite). Strapi Jest has two projects: `server` (`**/*.unit.test.ts`, mocked Strapi) and `admin` (`**/*.test.tsx`, jsdom). Single file: client `cd apps/client && yarn vitest run <file>`; strapi `yarn workspace @tiween/admin jest <file>`. No E2E suite exists (no Playwright dep, no `test:e2e`): never invent one. `yarn dev:strapi` runs `docker compose up -d db` first. Lint is `--max-warnings=0` in both apps. In a git worktree run `yarn install --frozen-lockfile` before any test/lint/build. Never report a story verified when its verification command could not execute (it is `blocked`, not `done`).

## KERNEL-process

- source: /Users/ayoub/projects/tiween-bmad-version/AGENTS.md (docs/context/commit-and-push-policy.md, sprint-status-hand-maintained.md)
- type: protocol
- content: Ship from `main` directly: no PRs, no feature branches; confirm branch is main before committing; never force-push. Conventional Commits `type(scope): subject`, lower-case subject, no trailing period, header <=100 chars; never add AI attribution trailers. Push only when verified done (never at `review`). `.husky/pre-commit` runs lint-staged plus turbo lint but skips during merge/rebase/cherry-pick/revert. `_bmad-output/` is frozen reference: never edit it or let a generator write it. Planning system is now GSD (`.planning/`); BMad tooling removed 2026-10-17; do not run or recreate BMad workflows or `openspec/`. sprint-status.yaml is hand-maintained and frozen (the generator would flatten `deferred`/`awaiting-operator` statuses and cannot parse Epics 2A-2D).

## KERNEL-strapi-backend

- source: /Users/ayoub/projects/tiween-bmad-version/AGENTS.md (docs/context/compass/strapi.md, plugin-dependency-rules.md)
- type: protocol
- content: New backend features are plugins under `apps/strapi/src/plugins/`, never `src/api/` (which holds only `health`). Cross-plugin calls go through the target's `services/public-api.ts` facade only; never `strapi.documents()` with a foreign UID (rules R1-R5; nothing lint-enforces them, review blocks). Document Service only; never reintroduce the Entity Service (zero call sites remain). Admin auth and public users-permissions auth are different systems: `tests/helpers/admin.ts` vs `tests/helpers/auth.ts` (the wrong one 401s silently). Admin routes use policies in `<plugin>/server/src/policies/` (e.g. `venues-admin-scope.ts` reads CASL ability from `ctx.state.userAbility`, fails closed, throws `PolicyError` with `details.code`). The regex in `src/shared/website-url.ts` is duplicated in a content-type `schema.json` and must stay byte-identical (a unit test fails on drift). `src/shared/` is a dependency-free kit: nothing in it may import a plugin. `creative-works` is the catalog of record; legacy `movie`/`play` are retired, never resurrect them. Trust the file tree over architecture.md's plugin inventory (stale: `payments` already exists, `entity-properties` still registered).

## KERNEL-client

- source: /Users/ayoub/projects/tiween-bmad-version/AGENTS.md (docs/context/strapi-v5-shape.md, arabic-western-numerals.md)
- type: protocol
- content: Strapi v5 responses are flat (`response.data.title`); there is no `attributes` wrapper; never remap one. Address documents by `documentId`, not `id`. Tests are co-located; never create `__tests__/` in apps/client (Strapi Jest does use `__tests__/` dirs; the ban is client-only). Translations live in `apps/client/locales/`, not under `src/`. Arabic uses Western digits and `DD/MM/YYYY`; never format with a raw `ar` locale (`apps/client/src/lib/dates.ts` formats Arabic through `fr`; `intl-locale.ts` forces `latn` numbering for RelativeTimeFormat). APIs return error codes, not prose; translate with `t('errors.<CODE>')`. Per-user query keys must carry `userId`; clear caches on logout via `signOutAndClearCache` in `src/lib/sign-out.ts`. Keep `import "server-only"` at the top of private Strapi fetchers.

---

# Section 2: Architecture amendment (2026-06-12) constraints (source: \_bmad-output/project-planning-artifacts/architecture.md)

## ARCH-plugin-ownership-map

- source: \_bmad-output/project-planning-artifacts/architecture.md
- type: schema
- content: Target plugin map (8 plugins): creative-works owns creative-work (type enum), person, character, credit-role, genre, category with cast[]/credits[]/videos[] components; venues owns venue + property-category + property-definition; events-manager is scheduling only (event, screening, performance, feature, event-group; `screening.movie` and `performance.play` relations point to creative-work); ticketing owns ticket-order, ticket (Unit-of-Work order creation, scanning); payments (Konnect ACL, no content types); user-engagement owns user-watchlist; geography owns region, city; tmdb-integration owns none. All moves preserve `collectionName` (no table migrations; only UID references change). Doc's plugin inventory is stale vs the tree (see KERNEL-strapi-backend).

## ARCH-dependency-rules-R1-R5

- source: \_bmad-output/project-planning-artifacts/architecture.md
- type: protocol
- content: R1 acyclic graph of cross-plugin relations and service calls; R2 service calls only along an existing schema-relation edge; R3 facade (`public-api`) only; R4 no foreign-UID `strapi.documents()`; R5 integration plugins (tmdb, payments) depend on nothing. Sanctioned edges: ticketing to events-manager (inventory), ticketing to payments (future), user-engagement to creative-works, events-manager to creative-works, venues from events-manager (event.venue), anything to users-permissions. Violations are review blockers. Use the strapi-plugin-dev strapi-reviewer agent on plugin server changes (tooling may no longer exist after BMad removal).

## ARCH-inventory-adjust-contract

- source: \_bmad-output/project-planning-artifacts/architecture.md and epic-2c-plugin-architecture-decomposition.md (Story 2C.4)
- type: api-contract
- content: `events-manager.public-api.adjustInventory(subEventId, kind, delta)` performs an atomic conditional UPDATE (`tickets_sold + qty <= tickets_available` in the WHERE clause; zero rows throws `TICKET_SOLD_OUT`); no own transaction (called inside ticketing's `strapi.db.transaction`); the single sanctioned Document-Service exception, commented as such. `order.createOrder` wraps availability + order + tickets + adjustInventory in one transaction; inputs validated with Zod via shared `validate()`; `defaultCurrency` plugin config replaces hardcoded "TND". Known gaps (CONCERNS): negative delta (refund) has no upper bound/idempotency and reuses TICKET_SOLD_OUT; order.service integration test is `describe.skip`; no DB CHECK constraint verified.

## ARCH-validation-and-error-pattern

- source: \_bmad-output/project-planning-artifacts/architecture.md
- type: protocol
- content: Zod schemas in `server/src/validation/<controller>.ts`; controllers call `validate(schema, body)` which throws a Strapi `ValidationError` carrying an error CODE. Responses carry SCREAMING_SNAKE codes (e.g. `TICKET_SOLD_OUT`), never prose; `ctx.badRequest("ERROR_CODE")`. `ctx: Context` (koa), not `any`. Any service method with 2+ writes wraps them in `strapi.db.transaction`; facades that write must not open their own transaction. Hardcoded `"fr"`/`"TND"` defaults must come from plugin config in `config/plugins.ts`.

## ARCH-content-type-move-mechanics

- source: \_bmad-output/project-planning-artifacts/architecture.md
- type: protocol
- content: When moving a content type between plugins: copy schema.json verbatim changing ONLY relation target UIDs (never `collectionName`, attribute names, localization flags); move lifecycle subscribers; re-seed permissions (remove old `plugin::<old>.<type>`, grant new to the same roles incl. Venue Manager); update admin hook UID constants and content-manager links; update client `lib/api/content/*` route prefixes in the same change; grep-verify zero references to the old UID. (The "one PR" framing is superseded by the kernel's no-PR main-only rule.)

## ARCH-v1-single-instance-invariant

- source: \_bmad-output/project-planning-artifacts/architecture.md; sprint-change-proposal-2026-08-11.md; docs/context/redis-deferred.md
- type: nfr
- content: v1 runs `replicas: 1` (docker-compose.prod.yml:39,104). In-process per-IP fixed-window limiter (`apps/strapi/src/shared/rate-limit.ts`) and 30s trending cache (`events-manager/server/src/utils/trending-cache.ts`) are correct only at one instance. Horizontal scaling is blocked on story 2B.10 (Redis). Code reality per CONCERNS: limiter keys on `ctx.state?.ip ?? ctx.ip` (needs Strapi `proxy` trust behind the reverse proxy); state is a plain Map per process.

## ARCH-venue-rich-model-schema

- source: \_bmad-output/project-planning-artifacts/architecture.md (addendum) and epics/epic-2d-venues-properties-admin-ui.md (Story 2D.1) and ux EXPERIENCE.md
- type: schema
- content: `plugin::venues.venue` fields: name, slug, description, address, `cityRef` (relation to geography per existing pattern), `geo` (`shared.geo-point` component {latitude, longitude}), phone, email, website, `type` enum (cinema/theater/cultural-center/museum/other), `status` enum (pending/approved/suspended, default pending), capacity, logo (single media), images (multiple media), `manager` relation, repeatable `properties` of `entity-properties.property-value`, `events`; i18n and draftAndPublish preserved. `property-category`: hierarchical (parent/children), i18n name/description, icon, sortOrder, has-many properties. `property-definition`: i18n name/description, type enum (boolean/integer/string/enum), icon, enumOptions (json), sortOrder, belongs-to category. Venue routes: content-api `/venues/*`.

## ARCH-catalog-schema

- source: \_bmad-output/project-planning-artifacts/architecture.md; epic-2c (Story 2C.3)
- type: schema
- content: `creative-work` `type` enum film | short-film | play; `cast[]` component (person, character); `credits[]` component (person, credit-role); `videos[]` with `videoType` enum (trailer/teaser/clip/...); no dynamic zone; new `credit-role` content type (never name it `role`: RBAC collision); `user-engagement.user-watchlist.creativeWork` unchanged; grep gate: zero `plugin::events-manager.(movie|play)` references.

---

# Section 3: Epic/story-level technical contracts (SPEC epics)

## EPIC-events-browse-api

- source: \_bmad-output/project-planning-artifacts/epics/epic-3-event-discovery-browsing.md (Story 3.1)
- type: api-contract
- content: Public content-api events endpoint returns published `event`s in Strapi v5 shape (`data`, `meta.pagination`); supports date-range filter on `startDateTime`, `eventStatus` filter, sorting, populate of `venue`, `screenings`, `screening.movie` (resolves to creative-work); additive `featured` boolean on `event`; custom `trending` service/endpoint ranking upcoming events by `sum(screening.ticketsSold)` desc; plugin routes are under the events-manager prefix; exercised against `yarn seed:fresh`. Public routes must not leak `ticketsSold`/`ticketsAvailable` or full venue records (avoid `populate: "*"`; DW-18).

## EPIC-ticketing-feature-flag

- source: \_bmad-output/project-planning-artifacts/epics/epic-3-event-discovery-browsing.md (Story 3.12)
- type: nfr
- content: Default-off, per-environment configurable flag (env var or Strapi config; not hardcoded) hides all ticket prices, quantity selectors, purchase CTAs and checkout routes. With flag off, direct navigation to checkout/purchase routes returns not-found/redirect; event and venue pages stay informational. Flag on restores the 6.1/6.2/6.3 surfaces without code changes; existing ticketing tests must pass with flag on. Story status: done.

## EPIC-payments-webhook

- source: \_bmad-output/project-planning-artifacts/epics/epic-6-b2c-ticketing-purchases.md (Story 6.3) and architecture.md (D5)
- type: api-contract
- content: Konnect via `payments` plugin; webhook route `/payments/konnect/webhook` with signature verification; ticketing calls `payments.public-api` only. Methods: e-Dinar, Sobflous, D17, Flouci, bank card. Payment completes <5s (NFR-IN1). QR tickets HMAC-SHA256 signed; email within 2 minutes (NFR-IN3). The baseline's `apps/client/src/app/api/webhooks/konnect/` location is superseded. Code reality (CONCERNS): webhook shared-secret gate is optional (only enforced when `plugin::payments.webhookSecret` set); should be mandatory in production.

## EPIC-sequencing-rules

- source: epics/epic-2c-plugin-architecture-decomposition.md, epics/epic-2d-venues-properties-admin-ui.md, epics/epic-dependencies.md
- type: protocol
- content: 2C.2 gates 2C.3; 2C.4 may precede 2C.3 but never concurrent; 2C.1 gates Epic 7; 2C.4 gates Epic 6 (satisfied; moot for v1); 2D.1 gates 2D.2/2D.3/2D.4; Epic 2D starts after 2C.1 stable; the events-manager admin calendar phase must target post-2C.3 UIDs (gate has fired; the integration layer already does since 9a75837) and, per ADR-R4, is its own early VERIFY + HARDEN phase before any Epic 9 admin work (BigCalendar, UTC-aware). MVP critical path (updated 2026-08-06, adjusted by ADR-R4/R6/R7): Epic 1 (palette rework of 1.3/1.4/1.7, plus 2A.1/2A.2), then 2A+2B in parallel, then Epic 3 (incl. 3.2, 3.12), Epic 4 in parallel, events-manager calendar verify + harden phase, Epic 2D + Epic 7 aggregation subset (7.1-7.4, 7.8) on the Strapi admin surface, Epic 9 (9.1-9.6), Epic 10 (10.1-10.3, 10.6-10.8; excluding 10.4 and 10.5).

## EPIC-lint-and-hygiene-gates

- source: \_bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md (Stories 1.10-1.13) and sprint-change-proposal-2026-07-14.md
- type: nfr
- content: `yarn lint` fails on violations in both apps (no `eslint-plugin-only-warn`, `--max-warnings=0`); CI Lint job covers apps/strapi on flat config; lint rejects Arabic-Indic digits in translation messages (names the key); CI repo-hygiene guard rejects non-UTF-8/control-byte files. All four stories done. Open adjacent gaps: client `typecheck` script is not wired to turbo `type-check` so CI never type-checks the client (46 TS errors pending; deferred-work).

## EPIC-baseline-stack-config

- source: \_bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md
- type: nfr
- content: Monorepo from notum-cz/strapi-next-monorepo-starter: `apps/client` (renamed from `apps/ui`), `apps/strapi`, `packages/eslint-config`, `packages/typescript-config`, `packages/shared-types` (the amendment says shared-types was deliberately deleted); Node 22 (`.nvmrc`); Yarn workspaces; Next.js 16.1 + Turbopack; Docker Compose (client, strapi, postgres; Redis AC removed 2026-08-11), prod compose with multi-stage builds and health checks; GitHub Actions CI (lint, type-check, test, build) with Turborepo caching. Brand tokens in story 1.3 (tiween-green #032523, tiween-yellow #F8EB06, surface #0A3533, surface-light #0F4542; Lalezar/Inter/Noto Sans Arabic; 4px spacing) and 1.4 (dark theme only, yellow 3px focus outline) are RETIRED by ADR-R1 and need rework to Gold Leaf x Aubergine (target values in section 7: UX-b2c-color-tokens, UX-b2c-typography; the focus ring becomes gold 3px + 2px offset). The 4px spacing base and dark-first single theme structure are confirmed by the spine (UX-b2c-layout-spacing-shape-elevation). i18n story 1.6 says translations under `src/messages/` (actual: `apps/client/locales/`). Story 1.7 manifest: name/short_name Tiween, standalone, icons 192/512; its theme/background #032523 is RETIRED (ADR-R1, rework; the spine does not name manifest colors, the dark field `background #241326` is the token to map, to be confirmed).

## EPIC-2B-historical-model

- source: \_bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md
- type: schema
- content: Story texts describe a DELETED model (Showtime component, monolithic content types in `src/api/`) and are historical record only; the implemented model is schema.org-style screening/performance sub-events in plugins. 2B.12 is titled "Email Configuration with Resend" but Brevo is the ratified provider (ADR-R2; `packages/strapi-provider-email-brevo`); the Resend wording is obsolete. 2B.10 deferred. 2B.13 (OpenAPI docs) and 2B.14 (v4 to v5 data migration scripts) are `ready-for-dev`, not started.

## EPIC-2A-component-library

- source: \_bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md
- type: protocol
- content: 22 stories delivering Storybook-documented components with dummy data. MVP: layout (BottomNav, Header, PageContainer, StickyFilters), discovery (EventCard, FilmHero, CategoryTabs, DateSelector, VenueCard, SearchBar, SearchResults, FilmCard), common (EmptyState, ErrorBoundary, LoadingSpinner, Skeleton, Toast, Badge), user (LoginForm, RegisterForm, ProfileForm, SocialLogin). Phase 2/dormant: ticketing (ShowtimeButton, SeatSelector, TicketQR, QuantitySelector, OrderSummary, PaymentForm), WatchlistButton, scanner (TicketScanner, ValidationResult, AttendanceCounter). Every component ships `.stories.tsx`. NFR-A1..A9, P3, P4 addressed. Stories 2A.1 (BottomNav active tab yellow #F8EB06) and 2A.2 (Header dark background #032523) hard-code the retired teal/yellow palette and are in the owner's ADR-R1 rework (2A.1: active tab becomes solid gold icon + label; 2A.2: header becomes the aubergine field with the gold taa lockup, per UX-b2c-components-visual); the dormant ticketing components (ShowtimeButton, TicketQR, etc.) stay but are flag-gated.

---

# Section 4: Baseline client/architecture patterns (source: \_bmad-output/architecture/implementation-patterns-consistency-rules.md, project-structure-boundaries.md)

## BASE-code-naming-and-structure

- source: \_bmad-output/architecture/implementation-patterns-consistency-rules.md
- type: protocol
- content: Components PascalCase (`EventCard.tsx`); hooks camelCase `use*`; utils camelCase; types PascalCase; constants SCREAMING_SNAKE_CASE; Zustand stores camelCase + `Store` suffix; feature folders kebab-case. Hybrid structure: shared `components/{ui,layout,common}` + domain `features/<name>/{components,hooks,types,utils}`, `hooks/`, `stores/`, `lib/{api,utils,constants}`. Co-locate `Component.test.tsx` and `Component.stories.tsx` next to the component. Flat Zustand stores with devtools + persist where appropriate; SWR for server state with consistent keys (note: code now uses react-query per sprint-status action item, so SWR statements are stale); Zod for runtime validation; date-fns + next-intl for date formatting.
- caveat: Statements in this shard that contradict the kernel are SUPERSEDED: `data.attributes` response access (kernel: flat), tests in `__tests__`-less co-location (client-only, consistent), `src/messages/` (actual `apps/client/locales/`), `apps/ui` path (actual `apps/client`), Playwright/`yarn test:e2e` (does not exist).

## BASE-date-and-error-format

- source: \_bmad-output/architecture/implementation-patterns-consistency-rules.md
- type: protocol
- content: API/storage dates ISO 8601 (`2025-12-25T19:30:00Z`); display `DD/MM/YYYY HH:mm` in all locales; Arabic uses Western numerals. (The 06-16 B2C spine additionally renders time as `15h00` in French and `HH:MM` in AR/EN; for B2C display the spine wins, see UX-b2c-bidi-and-currency-format.) Error shape `{ error: { code, details? } }`; codes TICKET_SOLD_OUT, PAYMENT_FAILED, INVALID_QR_CODE, SESSION_EXPIRED, RATE_LIMITED; client translates via next-intl `errors.<CODE>`; ErrorBoundary + skeleton loading states.

## BASE-project-structure-boundaries

- source: \_bmad-output/architecture/project-structure-boundaries.md
- type: schema
- content: Target directory layout (Next.js App Router `[locale]/(public|auth|venue)`, `features/`, `lib/offline/` IndexedDB, Strapi `src/api/*`, `plugins/events-manager`, `extensions/users-permissions`), boundaries (UI components props-only; feature components use hooks + Zustand; API layer in `lib/api/`; Strapi REST; Next.js API routes for auth/webhooks/revalidation; WebSocket in Strapi plugin), requirements-to-structure map, integrations (Konnect, Algolia, ImageKit upload provider, Resend email [obsolete: Brevo per ADR-R2], Sentry), and prod containers (client 3000, strapi 1337, postgres 5432, redis 6379). SUPERSEDED for backend module structure by the 2026-06-12 amendment (plugins not `src/api/`); Redis container and Redis ticket cache superseded by the 2026-08-11 deferral; `packages/shared-types`, `messages/`, Playwright e2e, Resend, Konnect webhook in Next.js are stale vs the tree.

---

# Section 5: UX spines for the Strapi venues admin (source: ux-designs/ux-tiween-bmad-version-2026-06-18/DESIGN.md and EXPERIENCE.md)

Scope: back-office admin only (Epic 2D). Not the B2C design system. Per ADR-R7 this Strapi admin is also the venue-manager surface, so these spines govern the Venue Manager experience. Cross-references are one-way (EXPERIENCE.md links DESIGN.md; DESIGN.md no longer links EXPERIENCE.md), so this pair is acyclic. The B2C brand in section 7 must not leak into this surface.

## UX-venues-admin-design-system

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-18/DESIGN.md
- type: nfr
- content: Inherit Strapi Design System v2 (`@strapi/design-system` v2.2.1, React 18 host); author no palette/font/type scale. Colors only as DS token names via props (or `var(--colors-<token>)` for raw SVG fill); status mapping pending=warning100/700, approved=success100/700, suspended=danger100/700, undefined=neutral150/600. Layout: `Layouts.Root` + SideNav + `Layouts.Header` + `Layouts.Content`; `Grid.Root gap={4}` with `Grid.Item col={6} s={12}`; numeric spacing props only. Forbidden: native HTML controls where DS exists, hex colors, px/rem spacing, inline layout style, styled-components for new styling, `ModalLayout` (removed in DS v2; use `Modal.*`), B2C Gold Leaf x Aubergine brand in the admin, Arabic-Indic numerals. Every input wrapped in `Field.Root`; every icon-only control has a label. Chrome language French-first with AR/FR/EN via `registerTrads`; Western numerals, DD/MM/YYYY.

## UX-venues-admin-behavior

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-18/EXPERIENCE.md
- type: protocol
- content: Surfaces: S0 shell (SideNav: Venues default, Properties [Admin/Editor only]), S1 venues list + form modal, S2 property authoring (category tree + definitions), S3 property-value attach. Venues list: search (300ms debounce), filters (status, type, city), sortable columns, page size 20, tri-state bulk select with Dialog-confirmed bulk delete/status. Venue form sections: general, location (address + Localiser geocode + draggable map pin; no raw decimal lat/lng entry; accessible non-pointer path), contact, details, media, properties (Accordion by category; type-adaptive inputs boolean=Toggle, integer=NumberInput, string=TextInput, enum=SingleSelect). Category parent picker excludes self and descendants (cycle-safe); type=enum requires >=1 enumOption (code `ENUM_OPTIONS_REQUIRED`); locale switch AR/FR/EN for localized fields. RBAC: Venue Manager sees only own venue, no create button, status read-only, Properties section hidden; enforced server-side. All async surfaces define loading/empty/error/permission/success states; no optimistic delete; Document Service with `documentId`; backend returns codes mapped to translated errors. Map provider choice open (OQ-1).

---

# Section 6: Constraints from owner resolutions (reworks and trims)

## RESOLUTION-venue-manager-surface-constraint

- source: .planning/ingest-resolutions.md; \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-18/EXPERIENCE.md
- type: protocol
- content: Venue-manager features are delivered inside the Strapi admin with server-side enforcement (`venues-admin-scope` policy reading CASL ability from `ctx.state.userAbility`, fail closed). Admin auth (admin users) and public users-permissions auth are different systems; users-permissions accounts created by story 7.1 cannot reach /admin, so provisioning of venue-manager admin accounts must be designed as part of the reconciliation. Do not extend the Next.js `/venue` surface.

## RESOLUTION-calendar-constraint

- source: .planning/ingest-resolutions.md; \_bmad-output/project-planning-artifacts/calendar-build-vs-buy-2026-08-08.md
- type: protocol
- content: Planning calendar = bespoke `BigCalendar` in events-manager admin, Strapi Design System components only, no external calendar library; UTC-aware transforms with unit tests at the transform boundary; known defects to fix in place (the ADR-R4 hardening scope): dead `timezone` prop, UTC vs browser-local rendering in the grid, RTL physical positioning, hardcoded fr-FR / ignored `locale` prop, incomplete a11y, no tests under BigCalendar/. The planning integration layer is already rebuilt and tested (commit 9a75837); the phase is verification of end-to-end showtime entry plus this hardening, not a rebuild. Admin runs React 18. Tunisia has no DST (abolished 2009).

## RESOLUTION-v1-ticketing-metrics-trim

- source: .planning/ingest-resolutions.md
- type: protocol
- content: Ticketing-derived metrics are removed from v1 story scope (ADR-R8). Story 9.4 (admin analytics): no total revenue, transactions or average order value. Story 7.8 (venue analytics): no views-to-purchases conversion rate. Story 7.4 (cancel event): no refund step. Restore each when ticketing is un-deferred. This is a trim of acceptance criteria, not a code deletion; dormant ticketing code stays (KERNEL-landmines).

---

# Section 7: B2C visual identity spine, Gold Leaf x Aubergine (source: ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md)

Canonical for the B2C visual identity per the owner (decisions.md ADR-R1). Status in the file: final, updated 2026-06-16; "the spines win on conflict" with any mock, import or upstream doc. Cycle with EXPERIENCE.md removed and verified (one-way: EXPERIENCE.md frontmatter `design: ./DESIGN.md`). Frontmatter `ui_system` says Next.js 15; the repo is 16.1 and governs. Scope: the B2C client only. The Strapi admin (Epic 2D, venue manager) uses the Strapi Design System and must not take this brand (section 5). Values below are verbatim from the spine; absent fields are marked absent.

## UX-b2c-color-tokens

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (frontmatter colors, Colors table)
- type: schema
- content: Single dark theme, dark-first, no light-mode toggle (daylight surfaces are a scoped exception). Core: background `#241326` (Midnight Aubergine page field); foreground `#FFFFFF` (17.6:1, AAA); surface `#31203A` (cards, modals; white text 15.0:1); surface-raised `#3E2A48` (hover / subtle elevation); border `#4A3556` (hairline dividers, chip borders on dark); muted-foreground `#B0A6B8` (secondary text, 7.5:1 on field, AA). Accent (Gold Leaf, the single action accent): primary `#D4A24A` (primary action, active/selected state, recommended star; as text on field 7.6:1); primary-foreground `#2A1A06` (dark ink on gold fill 7.3:1; white on gold fails at 2.3:1); gold-tint and link `#E0B563` (link / info / secondary text on dark, 9.2:1; gold `#D4A24A` is also valid as text). Secondary: secondary `#E5478A` (Magenta Rose, secondary highlight and theatre category; usable as a FILL under white text at 3.75:1 for large text only, not body text), secondary-foreground `#FFFFFF`. Semantic (tuned for the aubergine field): destructive `#FF8A8A` (7.7:1 on field, lightened from `#EF4444`), success `#5BD08A` (9.1:1), warning `#E8B24C` (amber). Daylight: daylight-background `#FFFFFF`, daylight-foreground `#241326`. Absent in the spine: destructive-foreground, success/warning foregrounds, a manifest theme_color mapping.

## UX-b2c-color-usage-rules

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (Colors, Do's and Don'ts, Components)
- type: protocol
- content: Single-accent rule: Gold Leaf carries action, active, selected and recommended; one signal, no collision; the recommended star is gold; never use gold for a non-actionable decorative highlight. Magenta is a secondary accent (category + occasional highlight), never a second action color and never in page chrome or as a background. Gold works as fill (with dark ink `#2A1A06`) and as text on the dark field; lighter link/secondary text uses `link #E0B563`. Hard rules: never white text on a gold fill (2.3:1); never a gold focus ring on a gold-filled control (use dark `#241326` or white there); never a gold CTA on a daylight/white surface (about 1.6:1). Status is never color alone: pair with icon + text (sold-out, offline, error, selected check, recommended). No drop shadows in product chrome; marketing collateral may use shadow. Button hierarchy: Primary = gold fill, ink `#2A1A06`, 48 px, full pill (9999 px), full-width on mobile; on daylight surfaces the primary becomes aubergine `#241326` fill with white text (same pill shape; gold only as a small accent icon/check). Secondary = gold outline + gold-tint text, 44 px. Tertiary = ghost muted-foreground text, 40 px. Link = `link #E0B563` text. Destructive = red fill and requires a confirm dialog. Focus ring = primary gold on dark controls, dark/white on gold-filled controls. States: hover = +brightness, pressed = scale 0.98, disabled = 50 percent opacity, loading = spinner replaces the label after 200 ms.

## UX-b2c-category-colors

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (frontmatter colors, Colors)
- type: schema
- content: Category color-coding for directory wayfinding (colorful feed reads as navigation, not noise): cat-cinema `#E0B563` (gold), cat-theatre `#E5478A` (magenta rose), cat-shorts `#5FD0C2` (teal, a cameo of the old Tiween-green DNA), cat-music `#7B9CFF` (periwinkle), cat-art `#C98AE8` (orchid). Used on the EventCard category badge and the filter-chip dot only; never overrides the gold action signal. The spine names five categories (cinema, theatre, shorts, music, art); Epic 3 story 3.2 tabs are Cinema / Theatre / Courts-metrages / Musique / Expositions, which map one-to-one (music = Musique and concerts, art = Expositions).

## UX-b2c-daylight-surfaces

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (Colors: Daylight CTA, Daylight surfaces); EXPERIENCE.md (State Patterns: Daylight state)
- type: protocol
- content: The Ticket-QR screen and Checkout render a high-brightness variant for outdoor scanning: daylight-background `#FFFFFF`, daylight-foreground `#241326`, black-on-white QR; everything else stays dark. The switch is instant on entering those surfaces. Primary CTA on them is the aubergine fill + white text (full pill). TicketQR requests max brightness on mount. Both surfaces are post-v1 and dormant (ticketing flag-gated, ADR-P3); the token pair stays defined. Open (spine): validate the daylight-checkout decision against Konnect's hosted payment UI, which may render its own theme in an iframe or redirect.

## UX-b2c-typography

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (frontmatter typography, Typography)
- type: schema
- content: Display = Lalezar 400, BRAND MOMENTS ONLY (splash, hero, empty states, marketing, large brand numerals; Arabic and Latin); never for routine in-app headers. Heading Latin = Inter 700; heading Arabic = IBM Plex Sans Arabic 700. Body Latin = Inter 400-700; body Arabic = IBM Plex Sans Arabic 300-700 (upgraded from Noto Sans Arabic; shares a humanist-geometric skeleton with Inter so mixed AR + Latin lines read as one system). Arabic display fallback = Cairo 700/900 for long or multi-word Arabic brand copy where Lalezar is illegible; Lalezar only for short AR brand marks. Font chains: Arabic `Lalezar -> Cairo -> IBM Plex Sans Arabic`; Latin `Lalezar -> Inter`. Mono = JetBrains Mono 400 (ticket IDs such as `TIW-2024-XXXX`, technical). Base 16 px, body line-height 1.5. Scale (px size/line-height): xs 12/16, sm 14/20, base 16/24, lg 18/28, xl 20/28, 2xl 24/32, 3xl 30/36, 4xl 36/40. Hierarchy L1 full-bleed hero, L2 section header, L3 card title/metadata, L4 secondary/timestamp. Supersedes Epic 1 story 1.3's Noto Sans Arabic and "Lalezar for headings" wording.

## UX-b2c-layout-spacing-shape-elevation

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (frontmatter rounded/spacing, Layout & Spacing, Elevation & Depth, Shapes)
- type: schema
- content: Spacing base 4 px, scale 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Touch target min 44 px, preferred 48 px (primary), 8 px min gap. Bottom nav 64 px fixed plus iOS safe-area, hidden during checkout and when the keyboard is open. Container max 1280 px. Breakpoints: mobile under 640 = 4 columns, gutter/margin 16/16; tablet 640-1024 = 8 columns, 24/24; desktop over 1024 = 12 columns, max 1280, 24/24. Mobile-first thumb-zone layout, primary actions in the bottom 60 percent. Radii: card 16 px, chip 8 px, input 8 px, CTA 9999 px (full pill), sheet 24 px top corners, monogram 9999 px. Elevation by surface-color shift (surface on field, hover to surface-raised), no drop shadows in product chrome; EventCard hover adds a subtle overlay gradient over the poster. SeatSelector glyphs: available circle, selected filled (gold), taken x (gray), accessible diamond.

## UX-b2c-components-visual

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (frontmatter components, Components)
- type: schema
- content: Component list (all extend shadcn/ui primitives): Button, Card, Badge, Tabs, Dialog, Sheet, Input, Select, Form, Toast, Skeleton, Calendar, EventCard, ShowtimeButton, TicketQR, BottomNav, SeatSelector, FilmHero. EventCard: poster 2:3 portrait, then category/rating badge, title, venue and date, watchlist heart (fills gold when saved) and price in DT; variants default | compact | featured; `surface` background, `card` radius; category badge uses the `cat-*` color; bidi: wrap Arabic title and Latin runs (`VOST`/`VF`, venue, `12,20 DT`) in `<bdi>`/`dir="auto"`. ShowtimeButton: selectable tile, format badge at the top-start corner (mirrors in RTL: VOST, VF, 3D, 2D), time (`15h00`/`15:00`), end time, venue, gold star marks the recommended showtime; states default (surface), hover (raised), selected (gold border + fill + dark ink + check glyph), unavailable (strikethrough), sold-out (`Complet`, aria-disabled); chip radius. TicketQR: daylight surface, large QR, ticket number in mono, title, date/time/venue, quantity, `Ajouter au Wallet` / `Partager`; states valid, scanned (check overlay), expired (dimmed), offline ("hors ligne - toujours valide"). BottomNav: 4 thin-line monochrome icons (`Accueil`, `Recherche`, `Billets`, `Compte`), active = solid gold icon + label, red dot for notification, 48 px targets, 64 px height. FilmHero: wide image pager (e.g. `01/05`), title + director, meta chips, `Reserver` pill (primary) + `Voir la bande annonce` (outline). SeatSelector: visual seat grid, arrow-key navigable. Badges/chips: format (VOST/VF/3D/2D), genre, duration, `Complet`, offline `Fonctionne hors ligne` (success green). Dormant/post-v1 components: ShowtimeButton, TicketQR, SeatSelector (Epic 2A phase 2 list). Currency `12,20 DT`.

## UX-b2c-logo-imagery

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (Brand & Style, Iconography & Imagery)
- type: schema
- content: Logo = circular taa (ta, Arabic letter) monogram, a gold-on-aubergine / aubergine-on-gold disc that also reads as a smiley; used as app avatar and favicon. Horizontal lockup `tiween.com` + monogram appears gold, centered, on the aubergine field in the app header. Reversible variants: aubergine-on-gold, gold-on-aubergine, white-on-aubergine, aubergine-on-white. A tiled-monogram pattern is a textile/background motif for marketing surfaces. Designed by Amen Okja / BLITS; replaces the original yellow-on-teal mark. Source assets named by the spine (not in the ingest set): imports/brandbook*tiween.pdf, imports/tiween_logo-composition.pdf, imports/TIWEEN*\*.png (28+ mockups); mocks lose to the spine. Imagery: poster-forward, posters 2:3 portrait in feeds and carousels (corrects legacy 16:9), film detail uses a wide hero pager, progressive load blur placeholder to sharp; signature device = duotone cut-out portrait (B&W photo with the monogram or brand shape carved in gold) for featured/hero content. Icons: thin-line monochrome set (home, search, ticket, account, map-pin, calendar, chevron, kebab); directional icons mirror in RTL. Brand direction: "Aubergine Theatre with Gold Leaf Accent", playbill / festival-catalogue register, culture-loud but disciplined by category color-coding.

## UX-b2c-dos-donts

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (Do's and Don'ts)
- type: protocol
- content: Do: reserve gold for actions and active state and route links/info through `link #E0B563`; use magenta only as a secondary/category accent; keep poster art the visual hero on every discovery surface; use the daylight surface for QR/checkout with the aubergine CTA and keep everything else dark; use logical properties and start/end corners and mirror directional icons; wrap mixed-script runs in `<bdi>`/`dir="auto"`; show Arabic with Western numerals and `DD/MM/YYYY`, time as `HH:MM` outside French (`15h00` is FR-only); pair status colors with icon + text. Don't: Lalezar for routine in-app headers; gold for non-actionable highlights; drop shadows in product chrome; color alone for status; magenta in page chrome or backgrounds; white text on a gold fill; gold focus ring on a gold-filled control; gold CTA on a daylight/white surface. Two voices: marketing (bold, playful, Tunisian vernacular, high saturation) lives on promo/social collateral; product voice (calm, clear, reassuring, French default) governs all in-app screens.

---

# Section 8: B2C behavior spine (source: ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md)

Product-level requirement forms are in requirements.md (REQ-b2c-\*); this section keeps the constraint-form technical rules. Same scope and status as section 7. Frontmatter says "Next.js 15 App Router"; the repo (16.1) governs.

## UX-b2c-foundation-stack

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Foundation)
- type: protocol
- content: UI system shadcn/ui + Tailwind v4; both spines inherit shadcn defaults and specify only the behavioral delta. Server Components by default; `'use client'` only for interactive islands (filters, carousels, seat picker, QR). Offline-first: Serwist service worker caches listings, the watchlist and purchased tickets; every async surface has explicit loading and error states. Mobile-first installable PWA; desktop adds, never subtracts. next-intl sets `dir` only; CSS logical properties and icon mirroring are the app's job. Tokens are referenced by name as `{token}`.

## UX-b2c-bidi-and-currency-format

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Foundation: Bidi); DESIGN.md (Components)
- type: protocol
- content: Mandatory `<bdi>` or `dir="auto"` isolation of foreign-script runs on EventCard, search results and ticket meta. Currency `12,20 DT`: decimal comma, space, `DT` isolated as a Latin run, trailing the price in both directions. Arabic: Western numerals, `DD/MM/YYYY`; time `HH:MM` in AR/EN and `15h00` in FR. Consistent with the kernel (KERNEL-client).

## UX-b2c-a11y-nfr

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Accessibility Floor)
- type: nfr
- content: WCAG 2.1 AA; focus ring `{primary}` 3 px + 2 px offset (dark/white on gold fills); logical tab order, no focus traps, dialogs/sheets trap and restore focus; touch targets at least 44 px with 8 px spacing; roles (EventCard article, ShowtimeButton radio, nav landmarks); live regions for async results and toasts; labelled icon-only buttons; 200 percent zoom without horizontal scroll; `prefers-reduced-motion` honored (static confirmation and check still render). Status never by color alone.

## UX-b2c-state-and-interaction-rules

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (State Patterns, Interaction Primitives, Component Patterns)
- type: protocol
- content: Five states per data surface (loading skeletons with 200 ms spinner rule, encouraging empty with next action, translated-code error without stack trace, offline badge with cached content and queued writes, success). Optimistic toggles with rollback toast. Debounce search 300 ms and validation 500 ms. Toasts: success 3 s, error 5 s, warning 4 s, info 3 s. Celebrations 2 s (purchase, account) and 0.5 s (first watchlist save). Gestures have button parity and are RTL-aware. Bottom sheet on mobile, dialog on desktop. Reserve the 2:3 poster box to avoid layout shift. BottomNav hidden during checkout and when the keyboard is open. Tabs: arrow keys move, Enter/Space activate, selected underline in `{primary}`.

## UX-b2c-open-items

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Open items)
- type: protocol
- content: [ASSUMPTION] Theater/Salle and Concert detail mirror the Film-detail structure (seances become run-dates/sessions); to confirm against epics 3 and 6 (Epic 3 delivered the generic event detail, story 3.7). [NOTE FOR UX] Confirm guest checkout is permitted by Epic 6 (answered in practice by story 4.6, guest email purchase; dormant). [RESOLVED 2026-06-16] Palette revised to Gold Leaf x Aubergine with pinned values gold `#D4A24A`, magenta `#E5478A`, gold-tint link `#E0B563`. [NOTE FOR UX] Validate daylight checkout against Konnect's hosted payment UI (post-v1).
