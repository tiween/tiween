# Context (DOC-type sources and running notes)

Topic-keyed notes with source attribution. Completion status below is the single place the roadmap should read to avoid re-planning shipped work. Owner-ratified answers from `.planning/ingest-resolutions.md` (decisions.md ADR-R1..R8) override the document statements noted here. Re-run #2, full rewrite (2026-10-18).

---

## Topic: Completion status snapshot (do not re-plan done work)

- source: \_bmad-output/implementation-artifacts/sprint-status.yaml (last_updated 08-11-2026; file is hand-maintained and frozen; new work is tracked in GSD)
- Epic status keys in the file lag the stories (e.g. `epic-3: backlog` while all its stories are done). Trust story-level statuses.
- Status vocabulary: backlog, ready-for-dev, in-progress, review, done, plus project-local `deferred` (parked, loop skips) and `awaiting-operator` (blocked on a human action).
- Epic 1 Foundation: 1-1 done; 1-2..1-9 `review`; 1-10..1-13 done.
- Epic 2A Components: done 2a-5..2a-13, 2a-15, 2a-19..2a-22; `review` 2a-1..2a-4, 2a-14, 2a-16..2a-18.
- Epic 2B Strapi v5: 2b-15 done; 2b-13 (OpenAPI) and 2b-14 (v4 to v5 data migration scripts) `ready-for-dev`; 2b-10 (Redis) `deferred`; remaining 2b-1..2b-9, 2b-11, 2b-12, 2b-16 `review`.
- Epic 2C: 2c-1 done, 2c-2 done (superseded history), 2c-3 `review`, 2c-4 done, 2c-5 (consolidation sweep: subEventStrategy, facades, shared kit, delete entity-properties) `backlog`.
- Epic 2D: 2d-1 done, 2d-2 done, 2d-3 (property authoring UI) `backlog`, 2d-4 (attach properties to venue) `backlog`.
- Epic 3: all done (3-1, 3-11, 3-2 .. 3-8, 3-10, 3-12) except 3-9 geolocation `deferred`.
- Epic 4: 4-1..4-7 all done.
- Epic 5: 5-1..5-8 all done; retrospective done. Delivered ahead of its "Phase 2" label.
- Epic 6 (ticketing): 6-1..6-5 done and DORMANT (flag-gated by 3-12; no rollback); 6-6..6-10 `deferred`. Draft `spec-6-6-in-app-ticket-viewing.md` parked unstarted.
- Epic 7: 7-1 and 7-2 `awaiting-operator` (code complete and reviewed 2026-08-03; need provisioned credentials for emails, media upload token, reCAPTCHA, and a human to approve/unblock a venue-manager account). 7-2 was built on the Next.js client, which ADR-R7 retires in favor of the Strapi admin (rework or retire; reconcile 7.1-7.8). 7-3 done (Strapi admin Events section); 7-4 and 7-8 `backlog`; 7-5, 7-6, 7-7, 7-9 `deferred`.
- Epic 8 scanner: 8-1..8-6 all `deferred`.
- Epic 9: 9-1..9-6 all `backlog`; ALL SIX are IN v1 per ADR-R6 (the epic file's Phase 2 tags on 9-1, 9-3, 9-4, 9-5 are overridden).
- Epic 10: 10-1, 10-2, 10-3, 10-6, 10-7, 10-8 `backlog` and IN v1 (ADR-R6); 10-4 is OUT (duplicates delivered 5-4; its `backlog` entry should be dropped); 10-5 `deferred`.
- Action items: only open item is the integration-seam test tier decision (epic 5 retro). Others done.
- Stale note inside the file: the 7-2 comment says 2d-2 is "still ready-for-dev" but 2d-2 is now `done`. The same comment records why 7-2 landed on the Next.js client: the accounts 7.1 creates are users-permissions users and cannot reach /admin.

## Topic: Open v1-critical gaps and unplanned work

- source: \_bmad-output/project-planning-artifacts/implementation-readiness-2026-08-08.md (verdict CONCERNS) and deferred-work.md
- Finding 1 (medium-high at 2026-08-08; STALE per the owner answer in ADR-R4, which makes the work an own early VERIFY + HARDEN phase): the events-manager admin UI rebuild (planning calendar, showtime entry) had NO story home. The integration layer was rebuilt the same day in commit 9a75837 (spec-events-manager-planning-surface-rebuild.md, status done): useSubEvents/SubEventModal/subEventTransform target screening and performance, parse UTC explicitly and are tested; the file/line references below no longer exist. BigCalendar internals remain unfixed (the hardening scope of ADR-R4; deferred-work.md entries about BigCalendar remain `open`, while its "broken surface" entry is stale). Story 2C.3 deleted `plugin::events-manager.showtime` (split into `screening` with videoFormat/subtitleLanguage and `performance` with surtitleLanguage). As of the review (now fixed by 9a75837) it was still requesting the deleted type: `useShowtimes.ts:86`, `PlanningCalendarNew/index.tsx:173`, `EventEditModal/index.tsx:80,102,109`, `EventCreationModal/index.tsx:99`; reachable from `pages/Planning/index.tsx:158` and `components/PlanningTab.tsx:95`. The decision on how one calendar renders both sub-event kinds is embodied in the code (merged chronological grid with a kind badge; one SubEventModal for both kinds), but was not recorded as a decision. Calendar library decision is recorded (ADR-P9: build on BigCalendar; ADR-R4 sets the phasing and UTC-aware requirement).
- Finding 2 (low): `bmm-workflow-status.yaml` pointed at nonexistent `_bmad-output/prd.md`; real PRD is under `project-planning-artifacts/prds/prd-tiween-bmad-version-2026-06-17/` (now moot, BMad removed).
- Finding 3 (low): two UX sets (2026-06-16 B2C, 2026-06-18 venues admin) plus `ux-design-specification.md` with no recorded winner. Now resolved by scope: the 06-18 DESIGN.md states it is admin-only and the B2C identity must not bleed into it, and the owner declared the 06-16 set the canonical B2C identity (ADR-R1). `ux-design-specification.md` (legacy 2025-12-25) is not in the ingest set.
- Orphan stories done but absent from epic files at that time: 1-10..1-13, 4-7, 5-7, 5-8 (epics 1, 4, 5 now back-fill them as "Recorded retroactively (2026-08-11)").
- Open defects/gaps from the deferred-work ledger (about 322 entries marked `status: open`, 26 done; ledger is 2,679 lines and was only skimmed, not enumerated): client `typecheck` script name prevents CI from type-checking the client (46 TS errors incl. StrapiVenue lacking latitude/longitude, unexported VenueType, unnarrowed Locale); date-range filters off by one day at UTC+1 (`toISODate`/`getDateRange` in `apps/client/src/lib/strapi-api/content/server.ts`); DW-4/DW-5/DW-86 integration-suite boot harness follow-ups (order.service integration test `describe.skip`); DW-9 entity-properties component namespace; DW-14 cast billing semantics undecided; DW-16 dev seeder swallows errors.
- Open items in CONCERNS.md (code audit 2026-10-17): lifecycle hooks swallow email errors; admin import/content-search stubs non-functional; client Navbar/Footer/NewsletterForm placeholders; Sentry disabled in error boundaries; Konnect webhook secret optional; rate limiter IP trust behind proxy; reCAPTCHA token TODO in contribute flow; welcome email embeds reset token in URL; `yarn-error.log` (~900 KB) tracked in the working tree; `apps/client/debug-storybook.log` untracked.

## Topic: Code reality vs documents

- source: /Users/ayoub/projects/tiween-bmad-version/.planning/codebase/ARCHITECTURE.md and CONCERNS.md (mapped 2026-10-17)
- `apps/strapi/src/plugins/` has 9 dirs, 8 enabled: geography, venues, entity-properties (empty shell, still registered), creative-works, tmdb-integration, events-manager, ticketing, payments, user-engagement. `payments` already exists (amendment calls it future); it has konnect-client, public-api, status-mapping, no content types.
- Email provider is Brevo (`packages/strapi-provider-email-brevo`), ratified by ADR-R2; Resend references in the documents are obsolete. Auth is NextAuth on the client plus users-permissions with Google/Facebook providers and a custom venue-manager role. Search is Algolia (client). Serwist service worker at `apps/client/src/app/sw.ts`. Sentry configured but disabled.
- CONCERNS.md recommends moving rate limiting to Redis and says Redis "is already used" in trending-cache context; this contradicts the 2026-08-11 deferral (no Redis anywhere; in-process by design). Treat the deferral as authoritative.
- Ticketing plugin `strapi-server.js` loads compiled output from `dist/`; build order matters; TS errors can suppress emit and make boot tests run stale code.

## Topic: Product background (brief, executive summary, journeys)

- source: \_bmad-output/project-planning-artifacts/product-brief-tiween-bmad-version-2025-12-25.md; \_bmad-output/prd/executive-summary.md; \_bmad-output/prd/user-journeys.md
- Problem: Tunisian cultural information is fragmented (venue Facebook pages posting schedules as images, siloed ticketing: Eazytick, Teskerti). Solution pillars: consumer platform (cinema, theater, concerts, exhibitions, museums; multi-entry discovery; ratings/reviews/watchlists; ticketing; offline PWA), professional dashboard (venue self-service, ticketing, analytics, lower fees), Culture Pass subscription (about 20 TND/month, similar to UGC Illimite; post-v1). Data strategy: hybrid of automated aggregation, venue self-service, manual enrichment. Brief targets (Phase 2 oriented): booking completion >70%, review contribution, 500 then 2,000+ Culture Pass subscribers, ticketing revenue 5,000 to 30,000 TND.
- Market context in the brief: Tunisia about 12.3M people, 79.6% internet penetration, TikTok reaches 5.32M adults, only about 18 cinemas.
- Personas: Yasmine (urban explorer, La Marsa), Karim (regional, Sfax, offline/4G), Mounir (venue manager), Salma (institutional, multi-space), Ahmed (anonymous explorer, guest checkout), Nadia (admin), Rami (scanner). The 7 journeys include ticketing, watchlist, scanner steps that are post-v1; for v1 the active journeys are discovery (Yasmine/Karim/Ahmed browse parts), venue supply (Mounir registration and schedule entry), and admin data entry (Nadia).
- Brief and ratings/reviews: described as a pillar but descoped from MVP (post-v1).

## Topic: Competitive positioning (post-v1 monetization input)

- source: \_bmad-output/project-planning-artifacts/research/competitive-summary-one-pager-2026-01-11.md
- Market snapshot Jan 2026: Tunisia event ticketing about $12.4M (2027), 560K users, 4.2% penetration, 0.97% CAGR. Competitors: Teskerti (leader, 2014, 500K users, 13 cash locations, hidden fees), BIP Events (0% organizer fees, buyer fees 3.5-20%, music/nightlife), Eazytick (2020, AI claims, hidden pricing). Proposed Tiween position: 0% organizer fees, buyer fees 3-5% (cap 5%), Arabic-first, offline scanning, instant payouts, AI analytics; win first in theatre, independent cinema, art, traditional/cultural events. Action items: launch with 0% organizer + 5% max buyer fees; pilot with 3 theatre companies; win 1 major cultural venue; publish 3 case studies; partner for cash-payment locations; 50+ organizers this year. Conflicts with the PRD revenue model; the fee model is a deferred open question (ADR-R5): decide before any post-v1 ticketing phase. Full research docs referenced but not in the ingest set: market-tunisia-event-ticketing-competitors-research-2026-01-11.md, battle cards.

## Topic: Excluded scope

- source: .planning/ingest-resolutions.md
- The Social Content Studio is a separate project and is excluded from this roadmap (ADR-R3). Its documents were removed from the manifest; nothing from them is carried in any intel file.

## Topic: Design system status

- source: .planning/ingest-resolutions.md; \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-18/DESIGN.md; epic-1; epic-2a; epic-list; requirements-inventory
- Resolved by ADR-R1: Gold Leaf x Aubergine is the current B2C palette; the dark teal #032523 / yellow #F8EB06 palette in Epic 1 stories 1.3, 1.4, 1.7, Epic 2A stories 2A.1 and 2A.2, the epic-list Epic 1 bullet and the requirements-inventory UX notes is retired. The canonical B2C spines are `ux-tiween-bmad-version-2026-06-16/DESIGN.md` and `EXPERIENCE.md` (status final, 2026-06-16, cycle fixed and verified); both are extracted in this run: tokens, typography, category color-coding, daylight surfaces and logo in constraints.md section 7, behavior in constraints.md section 8 and requirements.md REQ-b2c-\*.
- Code reality of the identity (apps/client, checked 2026-10-18): the retired palette is still live in 23 files (`src/styles/theme.css` --color-tiween-green/-yellow, `public/manifest.json` theme and background #032523, Storybook preview, landing and design-system pages); fonts loaded are Inter, Lalezar and Noto_Sans_Arabic (spine wants IBM Plex Sans Arabic, Cairo fallback, JetBrains Mono; Lalezar brand moments only). The shipped Next.js version is ^16.1.0 although the spine frontmatter says Next.js 15; the repo governs.
- The spine documents a 28+ mockup set and brand-book PDFs in `ux-tiween-bmad-version-2026-06-16/imports/` (not in the ingest set; the spine wins over mocks) plus `producer-prompt.md`, `.decision-log.md` and review files in the same folder (not in the ingest set, not classified).
- The venues admin (Epic 2D, and per ADR-R7 the venue-manager surface) uses Strapi Design System v2 and must not take either B2C brand; see constraints.md section 5.

## Topic: Calendar and events-manager admin facts

- source: \_bmad-output/project-planning-artifacts/calendar-build-vs-buy-2026-08-08.md
- BigCalendar landed in commit 485ea10 (2026-01-16, 382-file commit mislabeled as a Prettier fix); FullCalendar-era components never reached git; retired OpenSpec proposal `add-strapi-calendar-component` is recoverable via `git show 2c37b78^:<path>`. Strapi admin runs React 18. Tunisia abolished DST in 2009, so DST drift is near-theoretical; UTC-vs-browser-local rendering is the real bug. Missing features accepted as non-goals: month/agenda views, drag-to-move, resize, all-day row, recurrence.

## Topic: Epics that exist only as stale historical records

- source: epics/epic-2b-_.md; epics/epic-2c-_.md; epics/epic-list.md
- Epic 2B story texts (2B.2 CreativeWork/Event, 2B.3 Venue/Showtime, 2B.4 Person/Genre, 2B.5 TicketOrder/Ticket, 2B.6 UserWatchlist/UserPreferences, 2B.7 Region/City/Category, 2B.8 events-manager plugin, 2B.9 roles/permissions, 2B.11 ImageKit, 2B.12 email) describe the pre-redesign model; use the amendment and the code tree instead. Epic 2C story 2C.2's decision section is superseded; keep only the "both catalogs empty" finding.
- OpenSpec was retired 2026-06-12; ledger `openspec-retirement-ledger-2026-06-12.md` exists but is not in the ingest set.

## Topic: Phasing language across documents

- source: epics/epic-list.md; prd/product-scope.md; epics/epic-dependencies.md
- Current legend (epic-list, 2026-08-06): [MVP] v1 aggregation scope; [MVP-partial] some stories v1; [Post-V1] deferred until after launch (formerly [Phase 2]). Older docs still say Phase 2 / Phase 3. Epic tags: 1 MVP; 2A/2B/2C MVP-partial; 2D MVP-back-office; 3 MVP; 4 MVP-partial; 5 labelled Phase 2 (but delivered); 6 Post-V1; 7 MVP-partial; 8 Post-V1; 9 MVP-partial (now 9.1-9.6 all v1 per ADR-R6); 10 MVP-partial (now all but 10.4 and 10.5 are v1).

## Topic: Open questions carried forward

- source: .planning/ingest-resolutions.md and sources named per item
- Post-v1 fee model (commission vs buyer fees vs credits/Culture Pass): deferred by owner (ADR-R5); decide before any post-v1 ticketing phase.
- Calendar phase design: one calendar for screening and performance with diverged fields; the code already merges them in one grid with a kind badge (implementation-readiness Finding 1 is stale, decision still unrecorded). Scope itself is settled: verify + harden (ADR-R4).
- Venue-manager account provisioning on the Strapi admin surface (ADR-R7): how the registration in 7.1 and approval in 9.1 produce an admin user with the Venue Manager role.
- Map provider for the venues admin form (OQ-1 in the 06-18 EXPERIENCE.md).
- Integration-seam test tier decision (epic 5 retro; only open action item in sprint-status).
- PWA manifest theme_color and background_color under the new palette: the 06-16 spines do not name them (the dark field token `background #241326` is the natural mapping); story 1.7 rework must decide. Also not specified in the spine: destructive/success/warning foreground colors.
- Whether Theater/Salle and Concert detail pages need dedicated structure beyond the generic event detail built in Epic 3 (spine [ASSUMPTION], EXPERIENCE open item).
- What the Billets tab (and its notification dot) shows in v1 while ticketing is flag-gated off: the B2C spine and apps/client BottomNav keep four tabs including tickets, ADR-P3 hides purchase surfaces; no source says what the tab holds in v1 (decide during the 2A.1 / palette rework).
- Magenta secondary fill with white text for small info banners/tags is 3.75:1 and fails the 4.5:1 floor (conflicts report WARNING); decide the small-text treatment before 1.3/1.4.
- The "Podcasts les mieux notes" carousel named in the B2C Accueil spec has no content model or story; confirm it is out of v1.

## Topic: Ticketing-derived metrics trimmed for v1 (ADR-R8)

- source: .planning/ingest-resolutions.md; epics/epic-9-platform-administration.md; epics/epic-7-b2b-venue-management.md
- 9.4 ships without revenue / transactions / average order value; 7.8 without conversion rate; 7.4 without the refund step. Restore when ticketing is un-deferred. Verified that the epic files still list these ACs (epic-9 lines about revenue, transactions, average order value; epic-7 conversion rate and refund process), so the trim is a roadmap-level edit to those stories' ACs.

## Topic: Reference-cycle status

- source: .planning/ingest-resolutions.md; classifications and source files
- Verified in the files on 2026-10-18: the 06-16 DESIGN.md no longer names or links EXPERIENCE.md (it says "the behavior spine"; the only "Experience" string is the heading "Experience principles"); the 06-16 EXPERIENCE.md keeps `design: ./DESIGN.md` and a link to it (one-way). The 06-18 pair is one-way as well. `prd/product-scope.md` line 3 now reads "2026-08-06 scope change" with no proposal filename, and epic-list, epic-3, epic-6, epic-7, epic-8 and epic-dependencies do the same. Structural graph (classifier cross_refs plus markdown links and frontmatter refs verified in files) is acyclic. Remaining filename mentions in prose are listed in the conflicts report as non-blocking INFO.
