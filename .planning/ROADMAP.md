# Roadmap: Tiween

## Milestones

- 🚧 **v1.0 Shorts Directory** - Phases 1-6 (in progress)
- 📋 **v2+ Platform Backlog** - unplanned, parked as 999.x backlog phases (see Backlog)

## Overview

Tiween is a brownfield product: discovery, accounts, watchlist and the catalog/venue admin already ship. Milestone v1.0 is deliberately narrow and is done when the short-film directory is ready and finished. The journey runs back to front: first make short films real data (schema fields, admin entry, a public read API, a launch catalog), then move the existing shorts pages off mocks onto that data and finish the detail page and watchlist, then replace Algolia with a self-hosted Meilisearch that Strapi keeps in sync. With data and search in place, the directory page itself is finished on the Gold Leaf x Aubergine identity (filters, cards, a working suggestion form, trilingual, RTL, accessible), then SEO and the sitemap are added, and the milestone closes with verification and a production launch. Because `main` auto-deploys, the shorts pages stay noindex and unlinked until the final go-live switch. Everything else from the synthesized v1 set (calendar, venue-manager surface, Epic 9, Epic 10, app-wide palette, close-outs) is parked in the v2+ backlog.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- 999.x phases: Unsequenced backlog (see Backlog), promoted with `/gsd-review-backlog`

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Short-Film Catalog Backend** - Short films become real data: schema fields, admin entry, public read API, launch catalog
- [ ] **Phase 2: Strapi-Backed Shorts Pages** - Directory and detail read Strapi (DW-148 fixed), detail page completed, real watchlist, honest error states
- [ ] **Phase 3: Meilisearch Search** - Self-hosted Meilisearch kept in sync by Strapi, client search swapped, Algolia removed
- [ ] **Phase 4: Directory Experience and Brand** - Finished on-brand directory: hero, filters, cards, suggestion form, trilingual, RTL, accessible
- [ ] **Phase 5: Shorts SEO and Sitemap** - Localized metadata, canonical/hreflang, JSON-LD, sitemap, share previews
- [ ] **Phase 6: Verification and Production Launch** - Quality gates, production deploy and indexing, go-live switch

## Phase Details

### Phase 1: Short-Film Catalog Backend

**Goal**: An operator can enter, publish and manage short films in the Strapi admin, and anyone can read them through a public API that carries every field the directory needs, with the launch catalog loaded.
**Depends on**: Nothing (first phase)
**Requirements**: SDATA-01, SDATA-02, SDATA-03, SDATA-04, SDATA-05, FR57
**Success Criteria** (what must be TRUE):

1. An admin can create a short film in the Strapi admin in FR, AR and EN (title, synopsis, duration, year, genres, country, language, poster/backdrop/photos uploaded to ImageKit, crew credits with roles, cast, festival distinctions, trailer and full-length videos, streaming links with platform and access type, featured flag), publish it, then edit and unpublish it, without touching raw JSON.
2. An unauthenticated request for short films returns only published short-film records in flat Strapi v5 shape, with a genre filter, sort, pagination, detail by slug, featured and related reads (facet filters are Meilisearch's, Phase 3); an unsupported parameter gets a coded error rather than a 500, and no ticketing or internal fields appear.
3. Strapi boot-integration tests (run against a real booted Strapi, not mocks) seed published and draft short films plus a non-short creative work and prove that only the right rows come back for the genre filter and each sort, pagination, featured, related and locale-fallback case.
4. The launch catalog (the vetted short films from the mock file plus any the owner adds) exists as published Strapi records with posters, genres, directors/crew, cast, distinctions and streaming links; running the import twice creates no duplicates.
   **Plans:** 9/14 plans executed

   Plans:

   - [x] 01-01-PLAN.md — Wave 0: frozen-lockfile install, existing boot suites proven green, Strapi semantics spike (A1-A5, A13)
   - [x] 01-02-PLAN.md — Schema delta (country, language, streamingLinks, featured, featuredRank), `en` locale, shared short-film rules module
   - [x] 01-03-PLAN.md — Public read API: list and detail by slug, French-fallback locale overlay, allowlist projection, SDATA-05 boot suite
   - [x] 01-04-PLAN.md — Public read API: featured (D-05 order) and deterministic related (D-08), facade methods
   - [ ] 01-05-PLAN.md — Rate limiting on short-films routes, removal of the legacy draft-leaking routes (D-09), contract document
   - [x] 01-06-PLAN.md — Server-side publish guard (D-19), importer poster bypass (D-20), country/language write validation
   - [x] 01-07-PLAN.md — Admin: route the Works pages, real media-library picker (FR57)
   - [x] 01-08-PLAN.md — Admin WorkForm: streaming links, country/language pickers, featured and rank (D-17, D-18)
   - [x] 01-09-PLAN.md — Admin WorkForm: publish bar, pre-check and error-code mapping, slug generation, locale tabs (D-22)
   - [ ] 01-10-PLAN.md — Idempotent launch-catalog importer (`seed:shorts`), SSRF-safe ImageKit media, proven on a booted Strapi
   - [ ] 01-11-PLAN.md — Curation sheet and data file for the 10 mock films, the two D-19 mock fixes (D-23)
   - [ ] 01-12-PLAN.md — Capped new-candidate batch (at most 8), leads list, owner approval checkpoint (D-14, D-15, D-23)
   - [ ] 01-13-PLAN.md — Owner-approved dev import with ImageKit, second run proves idempotency, owner review list
   - [x] 01-14-PLAN.md — Venue managers can no longer create short films, server and client (D-21)

### Phase 2: Strapi-Backed Shorts Pages

**Goal**: A visitor opening `/shorts` or any short film page sees real catalog data in their language, on a complete detail page, and can save films to their real watchlist.
**Depends on**: Phase 1
**Requirements**: SPAGE-01, SPAGE-02, SPAGE-03, SPAGE-04, SPAGE-05, FR19, FR20, FR21, FR56
**Success Criteria** (what must be TRUE):

1. Opening `/fr|ar|en/shorts/<slug>` for a published short shows its Strapi data (title, synopsis, poster/backdrop, director, trailer, streaming links, distinctions, cast, original title, country, language); editing or unpublishing it in the admin is reflected within the revalidation window, an unknown or unpublished slug gives a 404, and a missing translation falls back to French instead of a blank.
2. The director and trailer shown come from `credits[]` and `videos[]` (DW-148): a short with a directing credit and a trailer video shows both, and no shorts request carries a phantom field, so Strapi logs show no 400s from shorts reads.
3. The detail page shows the "Equipe artistique" crew grid and the access-type sub-label under each streaming platform when the data exists, and omits those sections when it does not.
4. A signed-in user can tap the heart on a short film to add or remove it from the real watchlist; the state survives navigation and a second device and the film appears on the watchlist page; a signed-out user is invited to sign in rather than seeing a toggle that forgets.
5. When Strapi is unreachable the shorts pages show an error state with retry (not an empty directory) and recover when Strapi returns; no production code path imports `mock-shorts.ts`.
   **Plans**: TBD
   **UI hint**: yes

### Phase 3: Meilisearch Search

**Goal**: Short films are searchable and filterable through a self-hosted Meilisearch that Strapi keeps in sync, and Algolia is gone.
**Depends on**: Phase 2
**Requirements**: SRCH-01, SRCH-02, SRCH-03, FR6, SRCH-04, SRCH-05
**Success Criteria** (what must be TRUE):

1. A Meilisearch instance runs next to Strapi on the Dokploy VPS in staging and production with persistent storage and a secured master key; browsers only ever hold a search-only key; Strapi still runs as one replica and no Redis was added.
2. Publishing, editing, unpublishing or deleting a short film in the Strapi admin updates the index within seconds with no manual step, an indexing failure never blocks the save, and a single reindex command rebuilds the whole index (FR, AR, EN) and is safe to re-run.
3. Typing a title, an Arabic original title, a director or cast name, or a synopsis word, with a typo or missing diacritic, in FR, AR or EN returns the right short films from the directory search box and from the global `/search` page; the directory's filters and sorts are served by the index with counts that match the catalog.
4. Algolia is fully removed (dependency, `lib/algolia`, search-module branches, env vars, docs), the build is green, and events search on `/search` still works through the Strapi path.
5. With Meilisearch stopped, the shorts pages still render a Strapi-backed list (no text search or facets) and log the failure instead of erroring.
   **Plans**: TBD

### Phase 4: Directory Experience and Brand

**Goal**: `/shorts` is a finished, on-brand directory that a visitor can browse, filter, search and contribute to, in any of the three languages, with full accessibility.
**Depends on**: Phase 2, Phase 3
**Requirements**: SDIR-01, SDIR-02, SDIR-03, SBRAND-01, SBRAND-02, SBRAND-03, SBRAND-04, FR54, FR55
**Success Criteria** (what must be TRUE):

1. A visitor opens `/shorts` and sees a featured hero, a latest-additions row and a results grid; applying filters, search or sort updates the results and the URL (shareable, back-button safe); loading shows a layout-matched skeleton, no results shows an encouraging empty state with a next action, and a failure shows an error with retry. Cards show poster, title, duration, year, genres, director and availability, tapping a card opens the detail page, and the heart is an independent target.
2. Every shorts surface (directory, cards, hero, filters, suggestion form, detail page) renders in Gold Leaf x Aubergine per the 06-16 spine (aubergine field, gold actions with dark ink, teal shorts category cue, Inter / IBM Plex Sans Arabic type, Lalezar only for brand moments) with no teal `#032523` or yellow `#F8EB06` left on them, while every other page looks unchanged.
3. No small text on shorts surfaces is below 4.5:1: the magenta white-text decision is recorded in this phase's UI-SPEC and applied, and axe-core reports no contrast violations on `/shorts` and `/shorts/[slug]` in FR, AR and EN.
4. A visitor can suggest a short film from the directory: the form validates, is spam-protected, and the submission appears as a pending suggestion in the Strapi admin; the visitor sees a translated success or error, never a silent fake success.
5. In Arabic the pages are RTL with Western numerals and `DD/MM/YYYY`, mixed-script runs are isolated, and all copy is translated in FR, AR and EN with nothing hard-coded; a keyboard-only user can use filters, cards and the form with a visible 3px gold focus ring (dark on gold fills), 44px targets and reduced motion honored.
   **Plans**: TBD
   **UI hint**: yes

### Phase 5: Shorts SEO and Sitemap

**Goal**: Search engines and social platforms understand the shorts pages in all three languages, ready to be switched on at launch.
**Depends on**: Phase 2, Phase 4
**Requirements**: SSEO-01, SSEO-02, SSEO-03, SSEO-04, SSEO-05
**Success Criteria** (what must be TRUE):

1. View-source on `/fr|ar|en/shorts` and `/shorts/<slug>` shows locale-correct title, description, canonical, hreflang alternates (including x-default) and Open Graph/Twitter tags; an unknown slug has coded not-found metadata; the share button publishes the canonical URL.
2. Each detail page emits JSON-LD (title, duration, director, genre, year, image) and the directory emits an `ItemList`, and both pass a structured-data validator.
3. `sitemap.xml` lists `/shorts` and every published short in all three locales with hreflang alternates, covers the whole catalog (no truncation at a fixed page size) and logs failures instead of dropping them.
4. Pasting a short film link into a social app shows its title and poster at a correct size in the page's locale, and robots indexability is controlled by a single environment switch that defaults to noindex outside production.
   **Plans**: TBD

### Phase 6: Verification and Production Launch

**Goal**: The short-film directory is verified against the quality gates, deployed to production with Meilisearch, and switched on for real visitors and search engines.
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5
**Requirements**: LNCH-01, LNCH-02, LNCH-03, LNCH-04
**Success Criteria** (what must be TRUE):

1. CI is green on `main`, lint passes with `--max-warnings=0` in both apps, type-check shows no TypeScript errors in shorts code, and the Strapi boot-integration suite for short-film reads has been run explicitly and passes.
2. Production runs Strapi, the client and Meilisearch through GitHub Actions to Dokploy at one replica, the production catalog is imported and indexed, and a smoke checklist (list, filter, search, detail, watchlist, suggestion, sitemap) passes against production.
3. On a production-like environment shorts pages meet LCP under 2.5 s and CLS under 0.1 on a mobile 4G profile, axe-core finds no serious or critical violations in FR, AR and EN, and manual RTL and keyboard passes are recorded.
4. A real visitor on a phone can go from the home screen to the directory to a film to its watch link in a few taps, the pages are indexable in production while staging and dev stay noindex, and any findings consciously deferred are logged as backlog items.
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 (decimal insertions run between their surrounding integers)

| Phase                                 | Plans Complete | Status      | Completed |
| ------------------------------------- | -------------- | ----------- | --------- |
| 1. Short-Film Catalog Backend         | 9/14           | In Progress | -         |
| 2. Strapi-Backed Shorts Pages         | 0/TBD          | Not started | -         |
| 3. Meilisearch Search                 | 0/TBD          | Not started | -         |
| 4. Directory Experience and Brand     | 0/TBD          | Not started | -         |
| 5. Shorts SEO and Sitemap             | 0/TBD          | Not started | -         |
| 6. Verification and Production Launch | 0/TBD          | Not started | -         |

## Backlog

Later milestones (v2+). Unplanned and unsequenced: nothing here is committed, none of it blocks v1.0, and each item keeps its source IDs so it can be promoted with `/gsd-review-backlog` and planned then. Suggested order when promoted: calendar (999.1) before platform admin (999.3); venue-manager surface (999.2) before the 9.1 approval flow; brand rollout (999.5) once v1.0 proves the shorts token layer. Do not re-plan shipped work (Epics 3, 4, 5, 6.1-6.5, 2C.1/2C.4, 2D.1/2D.2, 1.10-1.13, 7.3 are done).

**Next-milestone candidates (v2)**

### Phase 999.1: Events-manager calendar verify and harden (BACKLOG)

**Goal:** Showtime entry works end to end for admins, and the bespoke BigCalendar is hardened in place (UTC rendering in the grid, RTL, tests, a11y, locale strings, dead `timezone` prop). Verify and harden, not rebuild (ADR-R4, ADR-P9).
**Requirements:** CAL-01 (REQ-admin-calendar-verify-harden). Must land before Epic 9 admin work.
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Venue-manager surface on the Strapi admin (BACKLOG)

**Goal:** Venue managers register, manage their venue and events, and see analytics inside the Strapi admin; the Next.js `/venue` build is reworked or retired and account provisioning is designed (ADR-R7). Stories 7.1-7.4 and 7.8, with 7.4 minus the refund step and 7.8 minus the conversion rate (ADR-R8).
**Requirements:** VMGR-01, FR32, FR33, FR34, FR35, FR36, FR39
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.3: Platform administration (BACKLOG)

**Goal:** Admins approve or reject venues, manage listings, flag quality issues, view platform analytics, manage users and manage categories and regions (Epic 9, stories 9.1-9.6; 9.4 without revenue, transactions and average order value per ADR-R8; 9.1 reconciled to the Strapi admin surface).
**Requirements:** FR47, FR48, FR49, FR50, FR51, FR52, FR53
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.4: PWA and offline experience (BACKLOG)

**Goal:** Installable app with offline shell and cached listings, and sync on reconnect without the ticket queue (Epic 10, stories 10.1-10.3 and 10.6-10.8; 10.4 is out, 10.5 stays deferred).
**Requirements:** FR59, FR60, FR63
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.5: Brand rollout across the app (BACKLOG)

**Goal:** Gold Leaf x Aubergine becomes the app-wide identity: stories 1.3, 1.4, 1.7, 2A.1, 2A.2, `theme.css`/`globals.css`, Storybook preview, landing and design-system pages (23 files carry the retired palette), manifest theme and background colors, global fonts; hoists the shorts-scoped token layer from v1.0. Includes deciding what the Billets tab holds while ticketing is off.
**Requirements:** BRAND-02 (REQ-brand-palette-rework)
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.6: Catalog, venues and hygiene close-out (BACKLOG)

**Goal:** Close the remaining Epic 1/2A/2B/2C/2D items: 2C.3 review close-out, 2C.5 consolidation sweep (delete the `entity-properties` shell), 2D.3 and 2D.4, 2B.13 OpenAPI, 2B.14 v4-to-v5 data migration scripts, wire client `type-check` into CI (46 TypeScript errors outside shorts), fix the date-range off-by-one at UTC+1, and clear the review-status backlog.
**Requirements:** HYG-01
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.7: Meilisearch for events, venues and people (BACKLOG)

**Goal:** Index events, venues and people in Meilisearch and retire the Strapi `$containsi` fallback as the primary events search; delivers true multi-entity search (DW-27). Builds on the Phase 3 infrastructure.
**Requirements:** SRCH-06
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.8: BMad content cleanup (BACKLOG)

**Goal:** Delete superseded `_bmad-output/` content now that decisions live in `.planning/` (per CLAUDE.md and the ingest resolutions). Never recreate BMad workflows or `openspec/`.
**Requirements:** CLEAN-01
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

**Further out (post-v1: ticketing, scanner, scale)**

### Phase 999.9: Ticketing revival (BACKLOG)

**Goal:** Un-defer ticketing: Epic 6 stories 6.6-6.10, Epic 7 stories 7.5-7.7 and 7.9, and 10.5. Preconditions: decide the fee model (ADR-R5), close the four ticketing integrity defects in the deferred-work ledger, and restore the ticketing-derived metrics trimmed by ADR-R8. Dormant code stays until then.
**Requirements:** FR17, FR28, FR29, FR30, FR37, FR38, FR40, FR62, FR64, FR66
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.10: Venue ticket scanner (BACKLOG)

**Goal:** Epic 8 scanner stories 8.1-8.6: QR validation, duplicate prevention, attendance counts, intermittent connectivity. Depends on ticketing revival.
**Requirements:** FR41, FR42, FR43, FR44, FR45, FR46
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.11: Redis and horizontal scaling (BACKLOG)

**Goal:** Story 2B.10 and `replicas` above 1. Re-entry trigger: horizontal scaling, or ticketing reservations needing distributed locks. Scaling is a correctness change (per-IP limits, trending cache, invalidation), not just capacity.
**Requirements:** REDIS-01
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.12: Near-me geolocation (BACKLOG)

**Goal:** Filter events by proximity using geolocation (story 3.9).
**Requirements:** FR9
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)
