# Tiween

## What This Is

Tiween is Tunisia's cultural compass: a discovery-first, mobile-first, trilingual (FR/AR/EN, full RTL) PWA for cinema, theatre, short films, concerts and exhibitions. Visitors browse what is on and what to watch without an account; venues and operators supply content through the Strapi admin. It is a brownfield modernization of tiween.com (Next.js 16.1 App Router client, plugin-decomposed Strapi v5 backend, PostgreSQL), and much of it is already shipped: event discovery, accounts, watchlist, venue and catalog admin. Ticketing is built but dormant.

## Core Value

People in Tunisia can find what is happening and what to watch across film, theatre, shorts, concerts and exhibitions, in their own language, on their phone. If everything else fails, discovery has to work.

**Current milestone (v1.0 Shorts Directory):** v1 is ready when the short-film directory (`/[locale]/shorts` and `/[locale]/shorts/[slug]`) is ready and finished end to end: real Strapi data instead of mocks, working search, SEO, the Gold Leaf x Aubergine identity on shorts surfaces, and deployed to production.

## Business Context

- **Customer**: Tunisian culture-goers aged 18-34 (B2C discovery) and venues/organizers as the content-supply side.
- **Revenue model**: None in v1. Ticketing is dormant; the post-v1 fee model (commission vs buyer fees vs Culture Pass) is deferred by the owner (ADR-R5) and must be decided before any ticketing phase is planned.
- **Success metric**: v1.0 is done when the short-film directory is finished and live. Longer term (PRD): 1,000 MAU in the first 30 days, D7 retention above 20 percent, time to discovery under 2 minutes.
- **Strategy notes**: `_bmad-output/project-planning-artifacts/product-brief-tiween-bmad-version-2025-12-25.md` (historical reference, frozen).

## Requirements

### Validated

<!-- Inferred from the code and the completion snapshot in .planning/intel/context.md (sprint-status.yaml, 2026-08-11, plus the git history through 2026-10-17). Do not re-plan. -->

- ✓ Visitors browse cultural events without an account; category tabs, date, region and venue filters; event detail with map and share; trending/featured home — Epic 3 (3.9 geolocation deferred)
- ✓ Email/password and Google/Facebook auth, password reset, profile, language and region preferences, guest-checkout plumbing — Epic 4
- ✓ Watchlist add/remove/view, offline access, cross-device sync, schedule-change notifications, hardening — Epic 5
- ✓ Plugin-decomposed Strapi v5 backend: `creative-works` catalog of record (`creative-work` with `type` enum film | short-film | play, person/character/credit-role graph, `cast[]`, `credits[]`, `videos[]`, `distinctions[]`), `venues`, `events-manager` (screening/performance sub-events), `geography`, `user-engagement`, `payments`, `tmdb-integration` — Epics 2B, 2C.1, 2C.4
- ✓ Venue CRUD admin UI in the venues plugin and Venue Manager RBAC — Epic 2D (2D.1, 2D.2)
- ✓ Event creation through the Strapi admin Events section (7.3); events-manager planning integration layer rebuilt on screening/performance with UTC parsing and tests (commit 9a75837)
- ✓ Real lint gates (`--max-warnings=0`, both apps), Western-numeral lint guard, non-UTF-8 CI guard; Dokploy + GitHub Actions deploy pipeline — Epic 1 (1.8-1.13)
- ✓ Ticketing stack built and flag-gated off (6.1-6.5, 3.12): order Unit of Work, Konnect payments plugin, HMAC QR tickets, email delivery. Dormant, never deleted.
- ✓ Short-film detail page rebuilt to the 2026 design handoff (commit ead7b47): UI only, still fed by `mock-shorts.ts`

### Active

<!-- Milestone v1.0 Shorts Directory. Full list with IDs in REQUIREMENTS.md; phase mapping in ROADMAP.md. -->

- [ ] Short-film catalog backend: schema fields the directory needs, admin entry, public read API, launch catalog loaded (Phase 1)
- [ ] Shorts pages read real Strapi data, DW-148 fixed, detail page completed (crew grid, access type), real watchlist, honest error states (Phase 2)
- [ ] Meilisearch self-hosted on Dokploy, Strapi-side indexer, client search swapped, Algolia removed (Phase 3)
- [ ] Finished directory experience on Gold Leaf x Aubergine: hero, filters, sort, cards, suggestion form with a real backend, trilingual, RTL, accessible (Phase 4)
- [ ] Shorts SEO: localized metadata, canonical/hreflang, JSON-LD, sitemap (Phase 5)
- [ ] Verification and production launch of the directory (Phase 6)

### Out of Scope

<!-- Boundaries for milestone v1.0. Items deferred (not rejected) are parked as 999.x backlog phases in ROADMAP.md. -->

- Events-manager calendar verify + harden, Epic 7 v1 on the Strapi admin, Epic 9 platform admin, Epic 10 PWA/offline set, global palette rework, 2C/2D close-out — deferred to the v2+ backlog by the owner's shorts-first milestone scope (2026-10-18)
- Indexing events, venues or people in Meilisearch — events search keeps its working Strapi path until a later milestone; v1.0 indexes short films only
- Ticketing revival (Epic 6.6-6.10, 7.5-7.7, 7.9, 10.5), venue scanner (Epic 8), near-me geolocation (3.9) — post-v1 by ADR-P3
- Redis, replicas above 1, horizontal scaling — deliberate deferral (ADR-P2); v1 is single-instance
- Social Content Studio — separate project (ADR-R3)
- Algolia — replaced by Meilisearch; removed from the repo in Phase 3
- Resend email — Brevo is the provider (ADR-R2)
- Ratings and reviews, Culture Pass, native apps, AI recommendations, Maghreb expansion — PRD growth list, post-v1
- An E2E suite (Playwright/Cypress) — the kernel forbids inventing one; verification uses unit, Strapi boot-integration and manual passes
- Rebuilding shipped work (Epics 3, 4, 5, 6.1-6.5, 2C.1/2C.4, 2D.1/2D.2, 1.10-1.13, 7.3) — done; do not re-plan

## Context

**Code reality for the shorts surface (verified 2026-10-18):**

- Client feature `apps/client/src/features/shorts/`: `ShortsDirectory`, `ShortsHero`, `ShortsFilters`, `SuggestionForm`, `ShortFilmCard`, `ShortFilmDetail` (rebuilt to the 2026 handoff, route-scoped palette in `ShortFilmDetail.module.css`). Types in `types/shorts.types.ts`; `data/mock-shorts.ts` holds about 41 mock films.
- Routes: `app/[locale]/shorts/page.tsx` renders `_components/ShortsShowcase` (hard-codes the retired teal `#032523`, reads mocks, `robots: noindex`). `ShortsDirectory` is unreachable dead code today. `app/[locale]/shorts/[slug]/page.tsx` reads mocks (`generateStaticParams`, `generateMetadata`, hard-coded French metadata, noindex, no canonical/JSON-LD). `app/api/shorts/route.ts` and `app/api/shorts/suggest/route.ts` exist; suggest posts to a `short-film-suggestions` Strapi collection that does not exist and falls back to a log plus fake success.
- `lib/strapi-api/content/shorts.ts` calls `/creative-works` and requests `directors`, `facts`, `cast.person` and filters on `directors.name`, none of which exist on the schema (Strapi rejects unknown keys with 400). The mapper reads `trailer`, `country`, `language`, `featured`, which also do not exist (DW-148, 2C.3 AC9 gap). The creative-works plugin exposes no public list/detail route at all: only `featured`, `type/:type` and `search` custom routes.
- `lib/algolia/*` plus Algolia branches in `strapi-api/content/{search,shorts}.ts` and `SearchPageClient.tsx`. No indexer was ever built (DW-26), so every environment already runs the Strapi fallback; removing Algolia regresses nothing.
- Catalog model is ready for most of it: `creative-work` already has `distinctions[]`, `credits[]`, `cast[]`, `videos[]` (with `videoType`), `links[]`, `genres`, poster/backdrop/photos, and the events-manager admin Works form (`WorkForm`) already edits all of them for `short-film`. Missing: country, language, featured flag, structured streaming links with access type. `scripts/seeds/data/creative-works.json` seeds 10 short films with no crew or cast.
- Watchlist is `user-watchlist.creativeWork` (documentId-keyed hooks exist); the shorts heart is local-only state because data was mock.
- Sitemap (`app/sitemap.ts`) omits `/shorts` and short detail pages; the locale layout metadata is static English.

**Deployment cadence:** every push to `main` that passes CI deploys to production (`.github/workflows/deploy.yml`, Dokploy). Intermediate phase work therefore lands in production; shorts stay noindex and unlinked until Phase 6, and schema changes must be additive.

**Design references:** the B2C identity is the 2026-06-16 spine (`_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md` and `EXPERIENCE.md`), canonical per ADR-R1. The detail page's route-scoped handoff palette (bg root `#161015`, raised `#241326`) differs slightly from the spine tokens (field `#241326`, surface `#31203A`); the spine wins and Phase 4 reconciles them. `design_handoff_tiween/` is inert per the kernel and was not read.

**Intel and mapping:** `.planning/intel/` (SYNTHESIS, decisions, requirements, constraints, context), `.planning/ingest-resolutions.md` (owner answers, precedence 0), `.planning/INGEST-CONFLICTS.md`, `.planning/codebase/` (code map, 2026-10-17). The `_bmad-output/` tree is frozen reference; delete matching content only after a decision lands here (cleanup is a backlog item).

## Constraints

- **Topology**: Single Strapi instance, `replicas: 1`, no Redis — in-process rate limiting and trending cache are correct only at one instance (ADR-P2). Meilisearch is a separate service and does not violate this.
- **Dormant code**: Never delete the ticketing plugin or `apps/client/src/features/tickets/` — feature-flagged off, not rolled back.
- **Catalog**: `creative-work` is the catalog of record; never resurrect `movie`/`play`. Schema changes are additive (no renamed attributes, `collectionName` preserved) because pushes deploy to production.
- **Backend layout**: New backend features are plugins under `apps/strapi/src/plugins/`, never `src/api/`; cross-plugin calls only via `public-api` facades (rules R1-R5); Document Service only; `src/shared/` stays dependency-free; do not build on the empty `entity-properties` shell.
- **Strapi v5 shape**: Flat responses, no `attributes` wrapper, address by `documentId`.
- **Tooling**: Yarn 1 classic only; never bump `prettier` past 3.3.2 (corrupts generated Strapi TS schemas); lint is `--max-warnings=0` in both apps; tests are co-located and `apps/client` has no `__tests__/`; no E2E suite. Strapi boot-integration suites (`yarn workspace @tiween/admin test:integration`) are skipped by CI and must be run explicitly. Never report a story verified when its command could not execute.
- **Process**: Commit directly to `main`; no PRs or feature branches; Conventional Commits, lower-case subject, header at most 100 chars; no AI attribution trailers; push only when verified done. `_bmad-output/` is frozen except cycle fixes and post-landing cleanup. `legacy/`, `input/`, `design_handoff_tiween/`, root `progress.json`/`status.json` are inert.
- **i18n**: Arabic uses Western digits and `DD/MM/YYYY` (format through `lib/dates.ts`, never a raw `ar` locale); errors are codes translated by `t('errors.<CODE>')`; translations live in `apps/client/locales/`.
- **Brand**: Gold Leaf x Aubergine (ADR-R1). Token layer for shorts is additive and scoped; do not remove the retired tokens other pages still use. Gold carries action only; never white text on gold; no gold CTA on white. The Strapi admin uses the Strapi Design System and must not take the B2C brand.
- **Versions**: Next.js 16.1 (the spine's "Next.js 15" is stale); Node 22; Strapi 5.x; Brevo for email.

<decisions>
## Locked Decisions

Do not re-litigate. No ADR carries `locked: true`, so the owner resolutions and the binding kernel are treated as locked.

### Owner-ratified (ingest-resolutions.md, precedence 0)

- **ADR-R1** Gold Leaf x Aubergine is the B2C palette; teal/yellow retired. Canonical spines: `ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md` + `EXPERIENCE.md`. In v1.0 it is applied to shorts surfaces only; the global rework (1.3, 1.4, 1.7, 2A.1, 2A.2, manifest colors) is backlog.
- **ADR-R2** Brevo is the email provider; Resend references are obsolete.
- **ADR-R3** Social Content Studio is a separate project, excluded.
- **ADR-R4** Events-manager calendar is its own phase, scoped VERIFY + HARDEN (not rebuild), before any Epic 9 admin work. Scheduled in the v2+ backlog by the milestone scope.
- **ADR-R5** Post-v1 fee model deferred; decide before any ticketing phase.
- **ADR-R6** Epic 9 and Epic 10 v1 set: IN 9.1-9.6, 10.6; OUT 10.4. Scheduled in the v2+ backlog by the milestone scope.
- **ADR-R7** Venue-manager surface is the Strapi admin (Epic 2D RBAC, `venues-admin-scope`); the 7.2 Next.js `/venue` build is reworked or retired. Backlog.
- **ADR-R8** Ticketing-derived metrics trimmed: 9.4 without revenue/transactions/AOV, 7.8 without conversion rate, 7.4 without refund step.
- **Milestone scope (2026-10-18)** v1 is shorts-first: done when the short-film directory is ready and finished end to end. Everything else from the synthesized v1 set moves to v2+.
- **Search engine (2026-10-18)** Meilisearch replaces Algolia. Self-hosted beside Strapi on the Dokploy VPS; Strapi-side indexing (shorts first, events later); client read path swapped; Algolia removed. Supersedes "Algolia search" in the baseline architecture.

### Binding kernel (AGENTS.md, docs/context/)

- No Redis, no `replicas` above 1. Never delete dormant ticketing code. `prettier` <= 3.3.2. Main-only commits, no PRs, no AI trailers. Yarn 1 only. Document Service only. Flat Strapi v5 shape and `documentId`. Plugins under `src/plugins/`, facade-only cross-plugin calls (R1-R5). Arabic Western digits and `DD/MM/YYYY`. No E2E suite. `entity-properties` shell is dead (delete in 2C.5, never build on it). `legacy/`, `input/`, `design_handoff_tiween/` inert.

### Architecture and scope decisions in force

- **ADR-P3** v1 is a multi-category aggregation platform; ticketing is post-v1 and dormant behind the 3.12 flag.
- **ADR-P1-D2 / ADR-P7** Unified `creative-work` (type enum) is the catalog; people graph is `person` + `character` + `credit-role`; no dynamic zone.
- **ADR-P1-D4 / D8 / P1** Dependency rules R1-R5, one `public-api` facade per plugin, hand-rolled service factories, Zod validation with error codes, shared server kit in `apps/strapi/src/shared/`.
- **ADR-P2 / A1 / A2** Redis deferred; in-process limiter and trending cache are the sanctioned v1 design.
- **ADR-P9** Admin calendar stays on the bespoke `BigCalendar` (no third-party library). Backlog.
- **ADR-P4** Real ESLint enforcement stays on.

### Decided in the phase that owns them (not yet decided)

- Meilisearch integration shape: dedicated search plugin vs indexing hooks in `creative-works`; one index with a locale field vs one index per locale; whether browsers query Meilisearch directly with a search-only key or through a Next.js route (Phase 3).
- Poster/media sourcing and rights for the launch catalog, and the launch catalog size (Phase 1).
- Which public read endpoints and query-param allowlist the short-film API exposes, and the `short-film-suggestion` content type's home plugin (Phases 1 and 4).
- Magenta secondary small-text treatment (large-only + alternate small-tag style, or a darker magenta token) — decided in the Phase 4 UI-SPEC.
- Whether to ship `ShortsShowcase` or `ShortsDirectory` as the directory composition (the other is deleted) — Phase 4.
- schema.org type for short-film JSON-LD (Phase 5); navigation placement of the directory entry point (Phase 6, with the go-live switch).
  </decisions>

## Key Decisions

| Decision                                                                    | Rationale                                                                                                                                            | Outcome |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Shorts-first v1.0; everything else to a v2+ backlog                         | Owner wants one finished, shippable surface before widening; the rest of the synthesized v1 set is real but not on the critical path                 | Pending |
| Meilisearch replaces Algolia                                                | Algolia was read-side only with no indexer ever built; self-hosted Meilisearch removes a vendor and fits the VPS; single-Strapi invariant unaffected | Pending |
| Gold Leaf x Aubergine on shorts surfaces via an additive scoped token layer | Delivers the brand where users look first without a risky global re-skin of ~10 features and every Storybook story                                   | Pending |
| Phase 1 builds the public short-film read API                               | The creative-works plugin has no public list/detail route; the client fetchers currently hit nothing real                                            | Pending |
| Client reads `credits[]` and `videos[]` (events mapper pattern)             | The schema has no `directors`/`trailer`; DW-148 is a hard 400, not a soft degradation                                                                | Pending |
| Suggestion form gets a real Strapi backend                                  | The current route logs and returns fake success; a form that silently drops submissions is worse than none                                           | Pending |
| Shorts stay noindex and unlinked until Phase 6                              | `main` auto-deploys to production, so unfinished work must not be discoverable                                                                       | Pending |
| `creative-work` as unified catalog; movie/play retired (ADR-P7)             | Inverted 2026-06-15; both catalogs were empty so schema-only                                                                                         | Good    |
| Ticketing dormant, not removed (ADR-P3)                                     | Aggregation-first relaunch; avoids rollback risk and keeps 6.1-6.5 reusable                                                                          | Good    |
| Redis deferred, single instance (ADR-P2)                                    | Nothing imported a Redis client; in-process design is correct at replicas 1                                                                          | Good    |
| Brevo for email (ADR-R2)                                                    | Matches the code (`packages/strapi-provider-email-brevo`)                                                                                            | Good    |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**

1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions (and resolve the "Decided in the phase" list).
5. "What This Is" still accurate? Update if drifted.

**After each milestone:**

1. Full review of all sections.
2. Core Value check: still the right priority?
3. Business Context check: customer, revenue model, success metric still accurate?
4. Audit Out of Scope: reasons still valid? Promote backlog (999.x) items with `/gsd-review-backlog`.
5. Update Context with current state (users, feedback, metrics).

---

_Last updated: 2026-10-18 after ingest routing (shorts-first milestone scope and Meilisearch decision applied)_
