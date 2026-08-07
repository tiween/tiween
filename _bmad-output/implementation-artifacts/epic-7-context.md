# Epic 7 Context: B2B Venue Management

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give venue managers a self-service back office to register their venue, maintain its public profile, create and manage events with showtimes, and see how their events perform. This supplies the event content that powers the v1 aggregation platform — venues publishing their own schedules is what makes Tiween "the place to find what's happening" across Tunisia. The epic was split on 2026-08-06: aggregation stories (7.1, 7.2, 7.3, 7.4, 7.8) are v1; ticketing-dependent stories (7.5, 7.6, 7.7, 7.9) are deferred post-v1 along with all purchase functionality.

## Stories

- Story 7.1: Venue Registration Flow — delivered, awaiting-operator
- Story 7.2: Venue Profile Management — delivered, awaiting-operator
- Story 7.3: Event Creation — v1
- Story 7.4: Event Editing and Cancellation — v1
- Story 7.5: Ticketing Configuration — deferred post-v1
- Story 7.6: Multiple Ticket Types Configuration — deferred post-v1
- Story 7.7: Ticket Sales Reports — deferred post-v1
- Story 7.8: Event Analytics — v1
- Story 7.9: Real-Time Sales Updates — deferred post-v1

## Requirements & Constraints

- Venue managers can register a venue, manage its profile (photos, description, location, contact), create events (title, description, dates, showtimes, media), edit events, and cancel events. Analytics show views, watchlist activity, and conversion.
- **Data isolation:** a venue manager may only see and modify their own venue's data — enforced via RBAC, not UI convention.
- **Privacy:** analytics demographics must be aggregated only; never expose individual user data. No planning artifact defines an aggregation threshold — 7.8 must pick and document one.
- **Operator-surface locale/formatting rules:** French-first operational copy, Western numerals and DD/MM/YYYY dates even in Arabic, prices in TND with comma decimals.
- **V1 must not expose any live purchase surface.** Shipped ticketing code stays in the codebase dormant behind a feature flag (default off). Event and venue pages are fully informational. Do not build on or reactivate ticketing paths in v1 work.
- All localized content must support AR/FR/EN; venue public pages are SSR with LocalBusiness/Event structured data for SEO.
- Registration creates a _pending_ venue plus a venue-manager account; admin approves or rejects (registration is not self-activating).
- Note for 7.4: the cancellation AC mentions triggering ticket refunds — in v1 ticketing is dormant, so implement cancellation status/notification mechanics without depending on live purchase flows.

## Technical Decisions

- **All venue work targets the `venues` plugin** (extracted from events-manager per the 2026-06-12 plugin-decomposition amendment, which supersedes the baseline architecture for backend module structure). Venue Manager RBAC seeds against `plugin::venues.*` UIDs. Content-api routes live under `/venues/*`.
- **Rich venue model** (2026-06-16 addendum): venue carries city/region, phone, email, website, type enum, status enum, logo/images media, manager relation, and a repeatable `property-value` component for amenities. Amenity vocabulary uses the property-category / property-definition types absorbed from the retired entity-properties plugin.
- **One venue form:** the venues plugin owns the canonical venue admin UI (Epic 2D relocated the events-manager venue form there). Story 7.2's self-service UI builds on that admin, never a re-derived form. `plugin::venues.venue` is the single source of venue truth.
- **Events stay in events-manager** (scheduling: event, screening, performance); the catalog is creative-works' unified `creative-work` (type enum film/short-film/play). Event creation selects/creates a creative work, then attaches showtimes. Sanctioned dependency edges: venues ← events-manager (event.venue), events-manager → creative-works.
- **Dependency rules:** cross-plugin access only via each plugin's single `public-api` facade service or existing schema relations — never `strapi.documents()` with a foreign UID. The plugin graph must stay acyclic.
- **Plugin code conventions:** hand-rolled `({ strapi }) => ({...})` service/controller factories; module-level UID constants (no inline UID strings); Document Service API only; Zod validation via the shared `validate()` helper; error responses carry codes (SCREAMING_SNAKE), never prose — translation happens client-side; `ctx: Context` typing; admin translations en/fr/ar required; multi-write operations wrapped in `strapi.db.transaction`.
- **Mutations by venue managers and admins must be attributable (actor + timestamp)** — this is what satisfies the "edit history is logged" expectation on 7.4's editing/cancellation. Strapi's `createdBy`/`updatedBy` cover admin-panel writes only; content-api writes made on behalf of a `users-permissions` manager (7.2 onward) carry no actor, so 7.4 owes an explicit attribution mechanism.
- New plugins/scaffolds follow the sibling-clone-of-geography pattern, not the official SDK layout.
- Real-time updates (7.9) are deferred; the baseline WebSocket decision (Socket.io with Redis backing) stands, but no channel model, connection auth, or per-venue scoping has been designed — 7.9 owes that design, and nothing in v1 builds it.

## UX & Interaction Patterns

- Venue manager journey (persona: small independent venue owner): register → admin approval queue → welcome email → first login → complete profile → add first event → publish → watch analytics. Keep each step simple enough for a non-technical operator who currently posts schedules to Facebook.
- Professional presentation is the retention hook: profile completion and event publishing should feel like an upgrade (preview how the event/venue will appear publicly).
- B2B milestone celebrations are part of the design language ("You're live!", "100 people discovered you") — analytics should surface reach, not just raw counts.
- Events are created as drafts and explicitly published; venue managers can preview before publishing.
- Success metric orientation: weekly schedule updates and >2x/week dashboard logins — flows should make routine updating fast.
- Every operator surface defines its loading, empty, error, and RBAC-variation states; errors are rendered from stable backend codes, never raw codes or backend prose.
- Still undesigned: sales reports, charts/CSV export, the real-time dashboard, and the analytics surfaces — those stories owe their own design.

## Cross-Story Dependencies

- **Epic prerequisite:** story 2C.1 (venues plugin extraction) must be stable before Epic 7 stories run (currently in review). Epic 7 RBAC and content types all assume the extracted plugin.
- 7.2 builds on Epic 2D's venues-plugin admin (2d-1 schema extension done; 2d-2 CRUD admin UI is the base for the self-service profile surface).
- 7.1 and 7.2 are code-complete (awaiting-operator: email delivery and human admin-approval walkthrough pending) — 7.3/7.4/7.8 build on their venue + manager-account foundation.
- 7.4 edits/cancels what 7.3 creates; cancellation notifies users who watchlisted the event (integration with Epic 5's user-engagement watchlist).
- 7.8 analytics consumes engagement signals from the public discovery surfaces (Epic 3 pages, watchlist adds) — conversion metrics involving purchases are moot until ticketing returns.
- Deferred 7.5–7.7/7.9 depend on the dormant ticketing plugin and Epic 6; do not partially implement them in v1 stories.
- Admin approval of registrations (7.1) intersects with Epic 9 admin workflows.
