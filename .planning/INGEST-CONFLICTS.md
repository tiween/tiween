## Conflict Detection Report

Mode: new (re-run #2, full rewrite, 2026-10-18). Docs classified: 48 (ADR 12, SPEC 22, PRD 9, DOC 5). No ADR carries `locked: true`, so no LOCKED-vs-LOCKED contradiction exists. No document is classified UNKNOWN. Precedence applied: manifest `precedence` integer where present (lower wins; `.planning/ingest-resolutions.md` is 0 and is treated as owner-ratified, winning over every other source), then ADR > SPEC > PRD > DOC. Every conflict answered by ingest-resolutions.md is reported below as auto-resolved INFO, not as a warning.

Cycle-check method (same as the previous run): the graph is built from classifier `cross_refs` plus structural references verified in the actual files (markdown links and frontmatter refs such as `design:`/`design_ref:`), resolved against the 48 ingested paths. Looser prose mentions of a filename are listed separately as non-blocking INFO. Result this run: 22 structural edges, no cycle.

### BLOCKERS (0)

None. The previous blocker (2026-06-16 B2C DESIGN.md and EXPERIENCE.md cycle) is resolved and verified; see the INFO entry on cycle fixes.

### WARNINGS (1)

[WARNING] The B2C spine puts white text on the magenta secondary fill for info banners and tags, which fails the 4.5:1 contrast floor
Found: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Component Patterns, "Links & info") says info banners/tags use {secondary} (magenta) fill with white text. In DESIGN.md in the same folder, `secondary #E5478A` is documented as "Fill under white (3.75:1, large only - not body text)". The ratio was recomputed during this run: white on #E5478A = 3.75:1 (the spine's figure is correct). The spine's accessibility floor claims "all core pairs already AAA", and prd/non-functional-requirements.md NFR-A4 and prd/web-app-specific-requirements.md require 4.5:1 contrast (WCAG 2.1 AA). Banner and tag copy is normally small text, so it does not meet "large only".
Impact: Implementing the spine literally ships info banners and tags below AA, against the spine's own rule and NFR-A4; a downstream a11y check (axe-core is in the web-app requirements) would flag them.
→ Decide before the palette-rework phase (stories 1.3 and 1.4): (a) restrict magenta-fill + white text to large/bold text and give small info tags another treatment (for example a surface fill with `link #E0B563` text or a magenta border), or (b) use a darker magenta fill for small-text surfaces. The category use of magenta (theatre badge, text on the field at 4.68:1) is not affected.

### INFO (27)

[INFO] Auto-resolved by ingest-resolutions.md: brand palette is Gold Leaf x Aubergine (spines now extracted)
Note: ingest-resolutions.md (precedence 0) declares Gold Leaf x Aubergine current and the teal/yellow palette retired, so Epic 1 stories 1.3, 1.4 and 1.7 need rework; the owner's palette resolution also covers the Epic 2A additions, stories 2A.1 (BottomNav active color #F8EB06) and 2A.2 (Header background #032523). Sources still carrying the retired palette: epics/epic-1-project-foundation-infrastructure.md, epics/epic-2a-component-library-design-system-parallel-track-a.md, epics/epic-list.md (Epic 1 bullet) and epics/requirements-inventory.md (UX notes). The canonical spines (ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md and EXPERIENCE.md) are extracted this run: tokens, typography, daylight surfaces, category color-coding and logo in constraints.md section 7; behavior in constraints.md section 8 and requirements.md REQ-b2c-\*. Code reality (apps/client, 2026-10-18): 23 files still contain #F8EB06 or #032523 (theme.css, globals.css, public/manifest.json theme and background color, Storybook preview, landing and design-system pages).

[INFO] Auto-resolved by the canonical designation: B2C typography follows the 06-16 spine over Epic 1 story 1.3 and the inventory UX notes
Note: story 1.3 and requirements-inventory.md name Lalezar/Inter/Noto Sans Arabic with Lalezar for headings. The spine (canonical for the B2C visual identity per the owner) uses Lalezar for brand moments only, Inter 700 for Latin headings, IBM Plex Sans Arabic for Arabic headings and body (replacing Noto Sans Arabic), Cairo as the long-copy Arabic display fallback and JetBrains Mono for ticket IDs. apps/client/src/lib/fonts.ts loads only Inter, Lalezar and Noto_Sans_Arabic today. The spine wins (it states it wins over any upstream doc).

[INFO] Tech-version note: spine frontmatter says Next.js 15; the repo governs
Note: both 06-16 spines say "Next.js 15 App Router" in frontmatter. apps/client/package.json has next ^16.1.0 and Epic 1 and the baseline ADR say 16.1. Next.js 16.1 is the version of record; no other part of the spines depends on the version.

[INFO] Auto-resolved by ingest-resolutions.md: email provider is Brevo
Note: Brevo is ratified (matches the code, packages/strapi-provider-email-brevo). Resend wording in architecture/core-architectural-decisions.md (precedence 11), architecture/project-structure-boundaries.md and epics/epic-2b story 2B.12 is obsolete. The strict ADR-precedence outcome that would have favored Resend is overridden by precedence 0.

[INFO] Auto-resolved by ingest-resolutions.md: Social Content Studio excluded
Note: The Studio is a separate project; its PRD and addendum are not in the manifest and nothing from them was extracted. No intel file contains Studio requirements.

[INFO] Auto-resolved by ingest-resolutions.md: events-manager calendar phase is VERIFY + HARDEN, not rebuild (previous WARNING closed)
Note: The owner answer makes the calendar its own early phase before Epic 9 admin work, scoped as end-to-end showtime-entry verification followed by BigCalendar hardening (UTC rendering in the grid, RTL, tests, a11y, locale strings). The integration layer was already rebuilt in commit 9a75837 (2026-08-08), verified again this run: no `plugin::events-manager.showtime` reference remains under the plugin admin, useSubEvents/SubEventModal/subEventTransform/subEventPopulate and their tests exist, and BigCalendar/ still has no tests. Marked stale as a result: implementation-readiness-2026-08-08.md Finding 1 and the deferred-work.md "broken surface" ledger entry. The earlier "re-planned after 2C.3, no home" statements in epics/epic-dependencies.md and epics/epic-2c are superseded. requirements.md: REQ-admin-calendar-rebuild is renamed REQ-admin-calendar-verify-harden; decisions.md ADR-R4 and ADR-P9 updated.

[INFO] Auto-resolved by ingest-resolutions.md: ticketing-derived metrics trimmed from v1 (previous WARNING closed)
Note: Story 9.4 ships without total revenue, transactions and average order value; story 7.8 without the views-to-purchases conversion rate; story 7.4 without the refund step. The epic files still list these ACs verbatim (epic-9-platform-administration.md line 89 for revenue/transactions/average order value; epic-7-b2b-venue-management.md lines 97 for the refund process and 170 for the conversion rate), so the trim must be applied to the story ACs when the roadmap is written. Restore when ticketing is un-deferred. Recorded as decisions.md ADR-R8 and constraints.md RESOLUTION-v1-ticketing-metrics-trim.

[INFO] Auto-resolved by ingest-resolutions.md: post-v1 fee model deferred (open question)
Note: Competing models remain recorded: prd/success-criteria.md (commission 8-10% standard, 5-7% for subscribers; user-journeys.md cites 7%), research/competitive-summary-one-pager-2026-01-11.md (0% organizer fees, 3-5% buyer fees, max 5%), product brief (commission plus Culture Pass). The owner defers the decision until before any post-v1 ticketing phase. Tracked in context.md "Open questions carried forward" and decisions.md ADR-R5; it does not gate v1.

[INFO] Auto-resolved by ingest-resolutions.md: Epic 9 and Epic 10 v1 set
Note: IN v1: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.6. OUT: 10.4 (duplicates delivered 5.4). This overrides the "Phase 2 / Deferred" scope labels on 9.1, 9.3, 9.4, 9.5 and 10.6 in epics/epic-9-platform-administration.md, epics/epic-10-pwa-offline-experience.md and epic-list.md, and the sprint-status `backlog` entry for 10-4 should be dropped. Story 9.1 carries a note "B2B venue self-registration not in MVP. Admin creates venues directly" that contradicts story 7.1 being v1; the owner answer settles it by keeping 9.1 and requiring reconciliation with the Strapi admin surface. 10.6 keeps the SCP 2026-08-06 carve-out (ticket-queue part out of v1) and 10.5 stays deferred.

[INFO] Auto-resolved by ingest-resolutions.md: venue-manager surface is the Strapi admin
Note: epics/epic-7 story 7.2 and the 06-18 EXPERIENCE.md specify the Strapi admin; sprint-status.yaml (7-2 comment) and .planning/codebase/ARCHITECTURE.md show the delivered build lives on the Next.js client (/venue area) because story 7.1 accounts are users-permissions users that cannot reach /admin. The owner picks the Strapi admin (Epic 2D RBAC and the venues-admin-scope policy), to rework or retire the 7.2 client build and reconcile 7.2 to 7.8 and the 9.1 approval flow. Account provisioning is an open design item (context.md).

[INFO] Reference-cycle fixes verified in the files (resolutions B1, B2, B3)
Note: B1: the 2026-06-18 DESIGN.md does not link EXPERIENCE.md; the 06-18 EXPERIENCE.md keeps its one-way reference to DESIGN.md. B3: the 2026-06-16 DESIGN.md has no EXPERIENCE.md name or link (it says "the behavior spine"; the only "Experience" string is the heading "Experience principles"); the 06-16 EXPERIENCE.md keeps `design: ./DESIGN.md` (frontmatter line 5) and a link at line 15, so the pair is one-way. B2: prd/product-scope.md line 3 now reads "2026-08-06 scope change" (no filename), and epic-list, epic-3, epic-6, epic-7, epic-8 and epic-dependencies do the same, so the sprint-change-proposal-2026-08-06 to epic/product-scope back-references are gone. The only other structural link out of the 06-16 DESIGN.md is to producer-prompt.md, which is not in the ingest set.

[INFO] Auto-resolved: B2C spine ticketing content is post-v1 under the 2026-08-06 scope change (ADR-P3 over SPEC)
Note: the 06-16 EXPERIENCE.md specifies the full product including the Billets tab ticketing entry, Flow 1 step 6 (tap `Reserver` to enter ticketing), Flow 2 (guest purchase), Flow 3 (offline QR at the door), the 4-step ticketing flow, ShowtimeButton/SeatSelector/TicketQR and daylight checkout. ADR-P3 (precedence 4) and story 3.12 make all purchase surfaces post-v1 and flag-gated off; the spine's ticketing parts are kept in the intel but marked post-v1/dormant in requirements.md (REQ-b2c-\*). Flow 1 (discovery) and the non-ticketing components are in force for v1. Open design detail, not a source conflict: what the Billets tab (and its notification dot) shows in v1 while ticketing is off. BottomNav in apps/client still renders four tabs including tickets. Carried as an open question in context.md. The spine's "Podcasts les mieux notes" carousel has no content type or story (treated as out of v1).

[INFO] Auto-resolved: time display format, B2C spine over the baseline pattern doc
Note: the 06-16 spines render time as `15h00` in French and `HH:MM` in AR/EN; architecture/implementation-patterns-consistency-rules.md says `DD/MM/YYYY HH:mm` in all locales. Both agree on Western numerals and DD/MM/YYYY dates. The spine is the owner-designated canonical B2C source and states that it wins over upstream docs, so it governs B2C display; the baseline pattern doc is already superseded in several other respects (see the baseline-patterns entry). Check `apps/client/src/lib/dates.ts` when implementing.

[INFO] Spine contrast ratios re-verified; one narrative figure is off but the rule holds
Note: ratios recomputed from the hex values in 06-16 DESIGN.md: foreground on background 17.56 (stated 17.6), white on surface 15.02 (15.0), muted-foreground on background 7.52 (7.5), gold on background 7.58 (7.6), dark ink on gold 7.26 (7.3), white on gold 2.32 (2.3), gold-tint on background 9.16 (9.2), destructive on background 7.74 (7.7), success on background 9.06 (9.1), white on magenta 3.75 (3.75). The narrative "gold-on-white about 1.6:1" is actually 2.32:1; the rule (no gold CTA on white) still holds because 2.32 is below 3:1. The magenta-with-white-text issue is the WARNING above.

[INFO] Auto-resolved: Redis deferred (ADR-P2) over baseline Redis everywhere
Note: sprint-change-proposal-2026-08-11.md (precedence 3) and the amendment note in architecture.md (precedence 2) defer Redis post-v1; architecture/core-architectural-decisions.md (precedence 11: Redis 7 for sessions, ticket locks, rate limiting), project-structure-boundaries.md (Redis container, Redis ticket cache), requirements-inventory.md original line and NFR-IN2 (5-minute response caching) lose. .planning/codebase/CONCERNS.md recommends Redis-backed limiting and claims Redis context in trending-cache; the deferral and docs/context/redis-deferred.md are authoritative. Single-instance (replicas 1) is a binding invariant.

[INFO] Auto-resolved: catalog model, creative-work wins
Note: architecture.md D2 (REVISED 2026-06-15) and sprint-change-proposal-2026-06-15.md (precedence 8) invert the earlier "normalized movie/play wins" decision in the 2C.2 audit and original architecture text; epic-2b story texts (Showtime component, src/api/ content types) are historical. Winner: unified creative-work, movie/play retired.

[INFO] Auto-resolved: v1 scope is multi-category aggregation without ticketing
Note: sprint-change-proposal-2026-08-06.md (precedence 4) overrides cinema-only framing in prd/project-scoping-phased-development.md, prd/success-criteria.md ("MVP Success - Cinema Showtimes"), prd/functional-requirements.md phase tags (FR8 category filter [Phase 2], watchlist/B2B [Phase 2]), epic-4/5 "Phase 2" notes, and the "Epic 7 stays Phase 2" line in sprint-change-proposal-2026-06-16.md. Only prd/product-scope.md was updated by the proposal; the other PRD shards are stale. See requirements.md scope lines.

[INFO] Auto-resolved: Epic 7 split
Note: 7.1-7.4 and 7.8 are v1 (content supply); 7.5, 7.6, 7.7, 7.9 post-v1, per SCP 2026-08-06 over the older "Epic 7 Phase 2" statements (SCP 2026-06-16, FR shard FR32-FR40 tags). The v1 stories run on the Strapi admin surface (ADR-R7), with 7.4 and 7.8 trimmed by ADR-R8.

[INFO] Auto-resolved: baseline SPEC patterns vs the binding kernel and the amendment
Note: implementation-patterns-consistency-rules.md (`data.attributes` access, Playwright E2E, `__tests__`-free structure, SWR) and project-structure-boundaries.md (`apps/ui`, `src/api/` types, `messages/`, `packages/shared-types`, Konnect webhook under Next.js, Resend, Redis) lose to the AGENTS.md kernel plus the architecture.md amendment plus the tree: flat Strapi v5 shape, `apps/client/locales/`, plugins under `src/plugins/`, no E2E suite, payments webhook at `/payments/konnect/webhook`. Details in constraints.md section 4 caveats.

[INFO] Auto-resolved: FR numbering, requirements-inventory over prd/functional-requirements
Note: both define FR1-FR66 but FR1-FR8, FR48, FR50, FR57, FR60 differ in meaning (for example FR2 is date filter in the PRD shard and category filter in the inventory). SPEC-typed inventory (used by every epic's coverage map and widened by SCP 2026-08-06) wins by precedence; the PRD shard variants are preserved in requirements.md as REQ-prd-\*. Any downstream REQUIREMENTS.md should use inventory IDs.

[INFO] Status vs plan: Epic 5 watchlist is delivered
Note: epic-5 file and epic-list.md label Epic 5 "Phase 2 / deferred"; sprint-status.yaml shows 5-1..5-8 done, retro done; product-scope.md says "delivered early, 2026-07". Do not re-plan Epic 5. Similarly Epic 6 6-1..6-5 are done and dormant (flag-gated by 3-12), not to be removed.

[INFO] Sprint change proposals with "proposed" status are applied in practice
Note: sprint-change-proposal-2026-08-11 (status "proposed"), 2026-07-05 and 2026-06-16 ("proposed"/"pending") have their effects reflected in sprint-status.yaml, epic files and architecture.md; treated as adopted ordered decisions, none locked. 2026-07-14 has no approval line but stories 1-10..1-13 are done. Pending small doc edit from 2026-07-14: architecture PR-gate line should add lint.

[INFO] project-context.md is a superseded pointer, yet AGENTS.md and CLAUDE.md still call it "mandatory AI agent rules (still in force)"
Note: \_bmad-output/project-context.md (status "superseded", classifier confidence low) says binding rules live in docs/context/ and AGENTS.md; its old contents were wrong in several places. Rules were taken from the AGENTS.md kernel (constraints.md section 1). The reference lines in AGENTS.md and CLAUDE.md are stale but harmless.

[INFO] Process rules superseded; AGENTS.md "frozen" vs CLAUDE.md "delete when resolved"
Note: architecture.md and SCP 2026-06-12 describe "one PR per migration step" and the strapi-reviewer agent; the kernel mandates main-only, no PRs (docs/context/commit-and-push-policy.md). BMad tooling was removed 2026-10-17 and OpenSpec retired 2026-06-12. AGENTS.md says `_bmad-output/` is frozen, never edit it; CLAUDE.md says to delete matching BMad content once a decision is resolved in .planning/, and ingest-resolutions.md "Cleanup" repeats that. The owner has also edited \_bmad-output files to break cycles. Treated as: edits to \_bmad-output are allowed for cycle fixes and post-landing cleanup, otherwise frozen. The roadmap should include a cleanup step.

[INFO] Other resolutions and exclusions
Note: (a) Story 3.7 AC "tap on a showtime to begin ticket purchase" is overridden by Story 3.12 flag gating; (b) NFR-SC1..SC3 (5,000 to 20,000 concurrent users) are not demonstrable at the mandated single-instance v1 topology, treat as aspirational until Redis or scaling is un-deferred; (c) ux-design-specification.md (legacy 2025-12-25), the 2025-12-26 readiness report, the retirement ledger, the 06-16 folder's imports/ mockups and PDFs, producer-prompt.md and review files, and companion files referenced by classifiers were not in the ingest set; (d) deferred-work.md (2,679 lines, about 322 open entries) was summarized from headings and samples, not exhaustively extracted.

[INFO] Non-blocking prose back-links between change records and the files they edit
Note: Below the structural-reference threshold used for cycles (not classifier cross_refs, not markdown links or frontmatter refs), these pairs cite each other by filename in prose, re-scanned this run: architecture.md with project-structure-boundaries.md and with SCP 2026-06-15, 2026-06-16 and 2026-08-11; SCP 2026-08-11 with deferred-work.md, epic-1, epic-2b, epic-list and requirements-inventory; SCP 2026-06-16 with epic-2d, epic-7 and epic-list; SCP 2026-06-15 with epic-2c; SCP 2026-07-05 with epic-3; sprint-status.yaml with SCP 2026-06-15, 06-16, 07-05, 07-14, 08-06 and 08-11. The SCP 2026-08-06 pairs with epic-list, epic-3, epic-6, epic-7, epic-8, epic-dependencies and prd/product-scope.md are no longer in this list (cleaned by the owner, verified). Zero-back-link strictness was not required for the remaining pairs and they were not treated as cycles.

[INFO] Classification precedence integers are stale; manifest values applied
Note: Several classification JSONs carry `precedence` values offset by one from .planning/ingest-manifest.yaml (for example project-context.md classified 0 but manifest 1; architecture.md classified 1 but manifest 2; the SCPs and the calendar doc likewise). The manifest, which places ingest-resolutions.md at 0, was used. The classifications for the B2C 06-16 spines carry no precedence and, as SPEC docs, rank below all ADRs; the owner's canonical designation (ADR-R1) governs the B2C visual identity and behavior.
