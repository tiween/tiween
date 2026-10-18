# Requirements: Tiween

**Defined:** 2026-10-18
**Core Value:** People in Tunisia can find what is happening and what to watch across film, theatre, shorts, concerts and exhibitions, in their own language, on their phone.
**Milestone:** v1.0 Shorts Directory (v1 is ready when the short-film directory is ready and finished)

## v1 Requirements

Requirements for milestone v1.0. Each maps to exactly one roadmap phase.

Numbering: inventory FR IDs (from `_bmad-output/project-planning-artifacts/epics/requirements-inventory.md`, canonical per the conflicts report) are used where an inventory requirement applies directly, scoped to short films. New IDs cover shorts and Meilisearch work. For FR entries, the events-side state is unchanged; only the short-film gap is in scope here.

### Short-Film Catalog and Admin Entry

- [x] **SDATA-01**: A `creative-work` of type `short-film` carries everything the directory and detail page display: country, language, a featured flag, structured streaming links (platform, URL, access type: free / included / subscription / rental), festival distinctions (existing `distinctions[]`), crew via `credits[]`, cast via `cast[]`, and trailer/full-length via `videos[]` with `videoType`. Schema changes are additive (no renamed attributes, `collectionName` preserved).
- [ ] **SDATA-02**: An admin can create, edit, publish and unpublish a short film in the Strapi admin in FR, AR and EN (title, synopsis, duration, year, genres, country, language, crew, cast, distinctions, videos, streaming links with access type, featured flag) from the existing events-manager Works form, without editing raw JSON.
- [ ] **SDATA-03**: A public, unauthenticated read API serves short films: list (genre filter, sort, pagination), detail by slug, featured, and related. Published records only, flat Strapi v5 shape, allowlisted query params with coded errors, locale with French fallback, no internal or ticketing fields. Facet filters (duration, year, country, language, has awards, available online, platform) are served by Meilisearch (SRCH-03), not this API (Phase 1 CONTEXT D-10).
- [ ] **SDATA-04**: The launch catalog exists in Strapi: the vetted short films from `mock-shorts.ts` (plus any additions the owner approves) are published records with posters, genres, crew, cast, distinctions and streaming links. The import can be re-run without creating duplicates.
- [ ] **SDATA-05**: Short-film public reads are covered by Strapi boot-integration tests against the real query engine (published vs draft, non-short works excluded, genre filter, each sort, pagination, featured order, related, locale fallback), closing the DW-258 gap for shorts.
- [ ] **FR57**: Short films can have multiple images and media attachments (poster, backdrop, photos) uploaded through the admin and served via ImageKit.

### Strapi-Backed Shorts Pages

- [ ] **SPAGE-01**: `/[locale]/shorts` and `/[locale]/shorts/[slug]` read short films from Strapi (static params, metadata inputs, featured, latest, related all come from the API). An unknown or unpublished slug returns 404. `mock-shorts.ts` is imported by no production code path (it may remain a test/Storybook fixture).
- [ ] **SPAGE-02**: The client mapper reads `credits[]` and `videos[]`: directors derive from directing credits, the trailer from the `videoType=trailer` video. Phantom fields (`directors`, `facts`, `trailer`, `cast.person` populate keys and the `directors.name` filter) are no longer requested; no short-film read produces a 400. Mapper unit tests included (DW-148, 2C.3 AC9).
- [ ] **SPAGE-03**: The detail page renders the "Equipe artistique" crew grid (role plus name from credits) and the access-type sub-label under each streaming platform, completing the 2026 handoff deferrals. Sections with no data stay omitted.
- [ ] **SPAGE-04**: The detail page surfaces original title, country and language (hero meta line), resolving the deferred product decision.
- [ ] **SPAGE-05**: Strapi failures are distinguishable from empty results: shorts pages show an error state with retry and never present an outage as "no short films".
- [ ] **FR19**: A signed-in user can add a short film to their watchlist from the detail page (real `user-watchlist` keyed by the creative work's documentId), with optimistic toggle; a signed-out user is invited to sign in instead of seeing a fake toggle.
- [ ] **FR20**: A signed-in user can remove a short film from their watchlist, and the state persists across navigation and devices.
- [ ] **FR21**: Watchlisted short films appear on the watchlist page.
- [ ] **FR56**: Short-film content is shown in the visitor's language when a translation exists and falls back to French otherwise, never blank.

### Meilisearch Search

- [ ] **SRCH-01**: Meilisearch runs self-hosted beside Strapi on the Dokploy VPS (staging and production) with a persistent volume, a master key held as a secret, a health check, and deployment through the existing GitHub Actions to Dokploy flow. Browsers only ever hold a search-only key. Strapi stays at one replica and no Redis is introduced.
- [ ] **SRCH-02**: A Strapi-side indexer reflects short-film create, update, publish, unpublish and delete in the index automatically, with FR/AR/EN content. A full reindex command rebuilds the index from Strapi and is idempotent. Indexing failures are logged and never block a content save.
- [ ] **SRCH-03**: Index settings support the directory: searchable (title, original title, directors, cast, synopsis, genres), filterable (genre, duration, year, country, language, has awards, available online, platform, locale), sortable (latest, rating, year, duration, title), typo tolerance, Arabic and French normalization. The short-film `related` route (Phase 1) is served from Meilisearch similar-documents, keeping the Phase 1 deterministic logic as fallback; the embedder (local vs hosted) is decided in Phase 3.
- [ ] **FR6**: A visitor can search short films by keyword (title, original title, director, cast, synopsis), typo-tolerant and in FR, AR or EN, from the directory search box and from the global `/search` page.
- [ ] **SRCH-04**: Algolia is removed: the `algoliasearch` dependency, `apps/client/src/lib/algolia/*`, the Algolia branches in `strapi-api/content/{search,shorts}.ts` and `SearchPageClient.tsx`, and its env vars and docs. Events search continues through the existing Strapi path unchanged.
- [ ] **SRCH-05**: If Meilisearch is unreachable, shorts pages still render from the Strapi list (without text search or facets) and the failure is logged.

### Directory Experience

- [ ] **SDIR-01**: `/shorts` is a finished directory: hero of featured shorts, latest-additions row, filter bar and sort, results grid with pagination or load-more. Filter, search and sort state live in the URL (shareable, back-button safe). Every data surface has a skeleton that matches the layout, an encouraging empty state with a next action, and an error state with retry.
- [ ] **SDIR-02**: The short-film card shows a reserved 2:3 poster, title (and original title), duration, year, genres, director, an availability badge and an independent watchlist heart; the whole card navigates to the detail page.
- [ ] **SDIR-03**: The suggestion form works end to end: validated input, spam protection (reCAPTCHA v3 plus rate limiting), stored as a pending suggestion in a Strapi content type that admins can review in the Strapi admin, with translated success and error states. No log-and-pretend-success path remains.

### Brand and Accessibility on Shorts Surfaces

- [ ] **SBRAND-01**: Shorts surfaces (directory, cards, hero, filters, suggestion form, detail page) use Gold Leaf x Aubergine from the 06-16 spine through an additive, shorts-scoped token layer: field `#241326`, surface `#31203A`, gold `#D4A24A` with ink `#2A1A06`, link `#E0B563`, `cat-shorts` `#5FD0C2`. No `#032523` or `#F8EB06` remains on shorts surfaces; the detail page's route-scoped handoff palette is reconciled to the spine tokens; other pages are visually unchanged and the retired tokens are not removed.
- [ ] **SBRAND-02**: Typography on shorts surfaces follows the spine: Inter for Latin, IBM Plex Sans Arabic for Arabic headings and body, Cairo as the long Arabic display fallback, Lalezar for brand moments only. Adding the fonts does not degrade other pages' loading.
- [ ] **SBRAND-03**: The magenta small-text contrast question (white on `#E5478A` is 3.75:1) is decided in the Phase 4 UI-SPEC and implemented: no small text on shorts surfaces is below 4.5:1.
- [ ] **SBRAND-04**: The accessibility floor holds on shorts surfaces: 3px gold focus ring with 2px offset (dark or white ring on gold fills), targets at least 44px with 8px spacing, status never by color alone, `prefers-reduced-motion` honored, a forced-colors fallback, semantic roles and labelled icon buttons, 200 percent zoom without horizontal scroll.
- [ ] **FR54**: Shorts surfaces are fully trilingual (AR, FR, EN): directory, filters, cards, suggestion form, error and empty states and detail page resolve all copy through the `shorts` i18n namespace, with no hard-coded strings.
- [ ] **FR55**: Arabic renders RTL on all shorts surfaces: CSS logical properties, mirrored directional icons, Western numerals and `DD/MM/YYYY`, `<bdi>` isolation of mixed-script runs, RTL-aware scroll and swipe direction.

### Shorts SEO and Metadata

- [ ] **SSEO-01**: `/shorts` and `/shorts/[slug]` emit locale-correct title, description and Open Graph/Twitter tags in FR, AR and EN (from the translation catalog and content), with the poster or backdrop as the share image and coded not-found metadata for unknown slugs.
- [ ] **SSEO-02**: Shorts pages carry canonical and hreflang alternates (including x-default). The canonical equals the URL the share button publishes. Indexability (robots) is driven by one environment switch that defaults to noindex outside production.
- [ ] **SSEO-03**: Each detail page emits valid schema.org JSON-LD (title, duration, director, genre, year, image) and the directory emits an `ItemList`; both pass a structured-data validator.
- [ ] **SSEO-04**: `sitemap.xml` lists `/shorts` and every published short in all three locales with hreflang alternates. It pages through the whole catalog (no silent truncation) and logs failures instead of dropping them.
- [ ] **SSEO-05**: Social share previews for a short film show its title and poster at a correct size in each locale.

### Verification and Launch

- [ ] **LNCH-01**: Quality gates pass: lint with `--max-warnings=0` in both apps, type-check with no TypeScript errors in shorts code, unit tests, and the Strapi boot-integration suite for short-film reads (run explicitly, since CI skips it). CI is green on `main`.
- [ ] **LNCH-02**: Strapi, client and Meilisearch are deployed to production through GitHub Actions to Dokploy at `replicas: 1`; the production catalog is imported and indexed; a smoke checklist (list, filter, search, detail, watchlist, suggestion, sitemap) passes.
- [ ] **LNCH-03**: Quality targets are verified on a production-like environment: LCP under 2.5 s and CLS under 0.1 on shorts pages (mobile 4G profile), axe-core with no serious or critical violations in FR, AR and EN, and recorded manual RTL and keyboard passes.
- [ ] **LNCH-04**: Go-live: the directory is linked from the app's navigation, shorts pages are indexable in production (staging and dev stay noindex), the sitemap is live, and any consciously deferred findings are logged as backlog items.

## v2 Requirements

Deferred to later milestones. Tracked, not in the current roadmap; each is parked as a `999.x` backlog phase in ROADMAP.md. Inventory FR IDs are kept.

### Admin Calendar (backlog 999.1)

- **CAL-01** (REQ-admin-calendar-verify-harden, ADR-R4): Verify end-to-end showtime entry through the events-manager planning surface, then harden BigCalendar in place: UTC rendering in the grid, RTL, tests, a11y, locale strings, dead `timezone` prop. Must land before Epic 9 admin work.

### Venue-Manager Surface on the Strapi Admin (backlog 999.2)

- **VMGR-01** (REQ-venue-manager-strapi-surface, ADR-R7): Rework or retire the Next.js `/venue` build; design venue-manager admin-account provisioning so approved managers can reach `/admin`.
- **FR32, FR33, FR34, FR35, FR36, FR39**: Venue registration (7.1), profile (7.2), event create (7.3, done), edit and cancel (7.4, without the refund step per ADR-R8), venue analytics (7.8, without conversion rate per ADR-R8), all on the Strapi admin.

### Platform Administration (backlog 999.3)

- **FR47, FR48, FR49, FR50, FR51, FR52, FR53**: Epic 9 stories 9.1-9.6 (venue approval, manual listings, quality flags, platform analytics without revenue/transactions/AOV per ADR-R8, user management, categories and regions).

### PWA and Offline (backlog 999.4)

- **FR59, FR60, FR63**: Epic 10 stories 10.1-10.3 and 10.6-10.8 (install prompt, offline shell and cached listings, sync on reconnect without the ticket queue). 10.4 is out (duplicates delivered 5.4); 10.5 stays deferred.

### Brand Rollout (backlog 999.5)

- **BRAND-02** (REQ-brand-palette-rework): Apply Gold Leaf x Aubergine app-wide: stories 1.3, 1.4, 1.7, 2A.1, 2A.2, `theme.css`, `globals.css`, Storybook preview, landing and design-system pages (23 files carry `#F8EB06` or `#032523`), PWA manifest theme and background colors, global fonts. Includes deciding what the Billets tab holds while ticketing is off.

### Catalog, Venues and Hygiene Close-out (backlog 999.6)

- **HYG-01**: 2C.3 review close-out, 2C.5 consolidation sweep (delete the `entity-properties` shell), 2D.3 and 2D.4 property authoring and attach, 2B.13 OpenAPI, 2B.14 v4-to-v5 data migration scripts, wire client `type-check` into CI (46 TypeScript errors outside shorts), date-range off-by-one at UTC+1, review-status backlog in Epics 1, 2A, 2B.

### Search Beyond Shorts (backlog 999.7)

- **SRCH-06**: Index events (and venues, people) in Meilisearch and retire the Strapi `$containsi` fallback as the primary events search path. Supersedes DW-27 multi-entity search.

### Cleanup (backlog 999.8)

- **CLEAN-01**: Delete superseded `_bmad-output/` content once each decision is recorded in `.planning/`.

### Post-v1: Ticketing, Scanner, Scale (backlog 999.9 to 999.12)

- **FR17, FR28, FR29, FR30, FR37, FR38, FR40, FR62, FR64, FR66**: Epic 6.6-6.10, 7.5-7.7, 7.9, 10.5 (ticketing revival). Preconditions: fee model decided (ADR-R5) and the four ticketing integrity defects in the deferred-work ledger closed.
- **FR41, FR42, FR43, FR44, FR45, FR46**: Epic 8 scanner.
- **REDIS-01**: Story 2B.10 and horizontal scaling (replicas above 1).
- **FR9**: Near-me geolocation (story 3.9).

## Out of Scope

| Feature                                                            | Reason                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Social Content Studio                                              | Separate project (ADR-R3)                                                       |
| Algolia                                                            | Replaced by Meilisearch; removed in Phase 3                                     |
| Resend email                                                       | Brevo is the ratified provider (ADR-R2)                                         |
| Redis, replicas above 1                                            | Deliberate post-v1 deferral; v1 is single-instance (ADR-P2)                     |
| Deleting dormant ticketing code                                    | Kernel landmine; ticketing is flag-gated, not rolled back                       |
| E2E suite (Playwright/Cypress)                                     | Kernel forbids inventing one; verification is unit, boot-integration and manual |
| Story 10.4 offline watchlist                                       | Duplicates delivered story 5.4 (ADR-R6)                                         |
| "Podcasts les mieux notes" carousel                                | No content model or story; out of v1                                            |
| Ratings and reviews, Culture Pass, native apps, AI recommendations | PRD growth list, post-v1                                                        |
| Indexing events/venues/people in Meilisearch                       | v1.0 indexes short films only; later milestone (backlog 999.7)                  |
| Global palette rework                                              | Shorts surfaces only in v1.0; app-wide rollout is backlog 999.5                 |

## Traceability

Which phases cover which requirements. Every v1 requirement maps to exactly one phase.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| SDATA-01    | Phase 1 | Complete |
| SDATA-02    | Phase 1 | Pending  |
| SDATA-03    | Phase 1 | Pending  |
| SDATA-04    | Phase 1 | Pending  |
| SDATA-05    | Phase 1 | Pending  |
| FR57        | Phase 1 | Pending  |
| SPAGE-01    | Phase 2 | Pending  |
| SPAGE-02    | Phase 2 | Pending  |
| SPAGE-03    | Phase 2 | Pending  |
| SPAGE-04    | Phase 2 | Pending  |
| SPAGE-05    | Phase 2 | Pending  |
| FR19        | Phase 2 | Pending  |
| FR20        | Phase 2 | Pending  |
| FR21        | Phase 2 | Pending  |
| FR56        | Phase 2 | Pending  |
| SRCH-01     | Phase 3 | Pending  |
| SRCH-02     | Phase 3 | Pending  |
| SRCH-03     | Phase 3 | Pending  |
| FR6         | Phase 3 | Pending  |
| SRCH-04     | Phase 3 | Pending  |
| SRCH-05     | Phase 3 | Pending  |
| SDIR-01     | Phase 4 | Pending  |
| SDIR-02     | Phase 4 | Pending  |
| SDIR-03     | Phase 4 | Pending  |
| SBRAND-01   | Phase 4 | Pending  |
| SBRAND-02   | Phase 4 | Pending  |
| SBRAND-03   | Phase 4 | Pending  |
| SBRAND-04   | Phase 4 | Pending  |
| FR54        | Phase 4 | Pending  |
| FR55        | Phase 4 | Pending  |
| SSEO-01     | Phase 5 | Pending  |
| SSEO-02     | Phase 5 | Pending  |
| SSEO-03     | Phase 5 | Pending  |
| SSEO-04     | Phase 5 | Pending  |
| SSEO-05     | Phase 5 | Pending  |
| LNCH-01     | Phase 6 | Pending  |
| LNCH-02     | Phase 6 | Pending  |
| LNCH-03     | Phase 6 | Pending  |
| LNCH-04     | Phase 6 | Pending  |

**Coverage:**

- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

**Phase totals:** Phase 1: 6, Phase 2: 9, Phase 3: 6, Phase 4: 9, Phase 5: 5, Phase 6: 4.

### Inventory FR cross-reference (capabilities already delivered; no new requirement)

| FR                           | Relationship to v1.0                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| FR1 (browse without account) | Shorts directory and detail are public; covered by SPAGE-01 and SDIR-01                    |
| FR2 (category filter)        | Courts-metrages tab (story 3.2) is done and untouched; the directory is a separate surface |
| FR7 (view details)           | Short-film detail delivered by SPAGE-01, SPAGE-03, SPAGE-04                                |
| FR10 (share)                 | Share button exists on the detail page; canonical alignment in SSEO-02                     |

### Deferred-work ledger items absorbed by v1.0

| Ledger item                                                                              | Requirement                                        |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| DW-148 client reads dropped `trailer`/`directors`                                        | SPAGE-02                                           |
| 2C.3 AC9 shorts client queries nonexistent fields (400s)                                 | SPAGE-02, SDATA-03                                 |
| Crew grid and `StreamingLink.accessType` deferred 2026-08-08                             | SDATA-01, SPAGE-03                                 |
| `originalTitle`/`country`/`language` dropped from detail page                            | SPAGE-04                                           |
| Watchlist heart on shorts is local-only                                                  | FR19, FR20, FR21                                   |
| Fetch failures swallowed into empty results                                              | SPAGE-05                                           |
| DW-26 Algolia indexer never built                                                        | SRCH-02 (Meilisearch replaces it), SRCH-04         |
| DW-258 no integration coverage for `?category=shorts` and public reads                   | SDATA-05 (shorts reads; events part stays backlog) |
| `/shorts` has no `generateMetadata`; hard-coded French metadata, no canonical or JSON-LD | SSEO-01, SSEO-02, SSEO-03                          |
| Sitemap omits `/shorts`, no x-default, 500-item truncation                               | SSEO-04                                            |
| `ShortsDirectory` unreachable dead code                                                  | SDIR-01                                            |
| No forced-colors handling on the detail page                                             | SBRAND-04                                          |
| Handoff palette scoped to the route, global rebrand split out                            | SBRAND-01 (shorts only), BRAND-02 (rest)           |

---

_Requirements defined: 2026-10-18_
_Last updated: 2026-10-18 after roadmap creation (shorts-first milestone scope, Meilisearch decision)_
