# Epic 7 Context: B2B Venue Management [Phase 2]

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give venue partners a self-service back office so they stop depending on platform admins for day-to-day operations. A venue owner registers and is approved, then manages their venue profile, authors events and showtimes, configures ticketing and ticket categories, and monitors sales and audience engagement — all scoped strictly to their own venue. This is the "professional dashboard" pillar of the product: it is what makes Tiween worth adopting for venues (lower fees, real analytics, direct publishing) instead of posting on social media, and it unlocks the downstream on-site scanner and platform-administration work.

## Stories

- Story 7.1: Venue Registration Flow
- Story 7.2: Venue Profile Management
- Story 7.3: Event Creation
- Story 7.4: Event Editing and Cancellation
- Story 7.5: Ticketing Configuration
- Story 7.6: Multiple Ticket Types Configuration
- Story 7.7: Ticket Sales Reports
- Story 7.8: Event Analytics
- Story 7.9: Real-Time Sales Updates

## Requirements & Constraints

- Covers the B2B functional set: venue registration and profile, event create/edit/cancel, ticketing setup and multiple ticket types, sales reporting, event analytics, and live sales updates on the dashboard.
- **Tenant isolation is the hard security requirement**: a venue manager may read and write only their own venue's data — venue record, events, showtimes, ticketing config, reports, analytics, and any real-time stream. This is a P0 authorization concern with per-role end-to-end coverage expected; the UI-level gate is convenience only, the boundary must be enforced server-side.
- **Analytics must be privacy-safe**: demographics are aggregated only, never per-user; respect the platform's anonymization window and consent rules for non-essential tracking. No artifact defines an aggregation threshold — pick and document one.
- Mutations by venue managers and admins must be attributable (actor + timestamp), which is what satisfies the "edit history is logged" expectation on cancellation/editing.
- Real-time sales feedback target is a sub-2-second update on the dashboard; no other latency budget applies to reports or analytics.
- Locale/formatting rules for any operator-facing surface: French-first operational copy, Western numerals and DD/MM/YYYY dates even in Arabic, prices in TND with comma decimals.

## Technical Decisions

- **Everything venue-related lives in the `venues` plugin** (extracted in Epic 2C.1). Its `policies/` slot is reserved for the `is-venue-manager` policy — that policy is Epic 7 work, not delivered by the extraction. Venue Manager permissions seed against the plugin's own permission UIDs; the epic cannot start before that re-seed lands.
- **Venue Manager identity is a users-permissions role, not an admin-panel user**, and the venue's `manager` relation targets a users-permissions user. The story text's "Strapi admin" framing conflicts with this; the epic must resolve which panel venue managers actually authenticate into before building 7.2+ surfaces.
- **Registration/approval rides on the venue `status` lifecycle** (pending → approved/suspended, default pending). `status` is read-only for venue managers; only platform admins transition it. Approval is the admin-side counterpart story in the platform-administration epic — coordinate, don't duplicate.
- **The venue form already exists.** The rich venue model (contact fields, type enum, logo/images, manager relation) and its admin CRUD with server-side scoping were built in Epic 2D, along with amenity authoring via property-category/property-definition and a repeatable property-value component. Story 7.2 extends that surface; do not re-derive a venue form. Location is captured via address + geocoding + map picker — raw lat/lng inputs are rejected.
- **Cross-plugin access goes through facades.** Each plugin exposes exactly one public-api service as its sole external entry point; never query another plugin's content types directly, and only traverse existing schema edges. Note the open design question: sales and analytics aggregation needs ticketing and event data from inside a venue-facing surface, and that edge is not currently sanctioned — decide and record where the aggregation service lives before building 7.7–7.9.
- **Plugin coding conventions are binding**: hand-rolled factory services/controllers (no core factories), UIDs as module-level constants only, Document Service API exclusively (no entity service, no raw db queries in business logic), routes declared as `"controller.method"` strings, and en/fr/ar translation files for every plugin surface.
- **Real-time is Socket.io with Redis backing**, and the live venue sales dashboard is a named use case — but no channel model, connection auth, or per-venue scoping has been designed. Story 7.9 must specify that, and it depends on the ticketing inventory facade existing.
- Cancellation is a fan-out, not a local state change: it cascades to showtimes and must trigger the watchlist notification path and the refund path owned by other epics rather than reimplementing them.
- Undesigned areas you will have to specify: ticket-type schema, CSV export format/encoding, analytics event collection and storage, and refund mechanics.

## UX & Interaction Patterns

- The canonical journey is: registration request → admin review (reject with reason, or approve + welcome email) → first login → guided onboarding → complete profile → create first event → ticketing yes/no → publish → monitor views/saves/sales. Success milestones (profile complete, first event published, first 100 views, first sale) are designed as celebratory moments; the onboarding tour and the recurring performance summary email are in the UX vision but have no story — flag rather than silently drop.
- Operator surfaces are designed to be **invisible inside the Strapi admin host**: use the admin design-system tokens and components, no B2C brand bleed, no custom hex/px or inline styles, no native HTML controls or browser dialogs.
- **Errors are codes, not prose**: the backend returns stable error codes and the UI maps them to translated field-level messages. Never render a raw code or backend sentence.
- Navigation and controls vary by role: a venue manager sees a pre-filtered list, no create action, no property-authoring nav, a read-only status field, and editable amenities. Every surface needs loading, empty, error, and RBAC-variation states defined.
- No design exists yet for sales reports, charts, CSV export, the real-time toast/dashboard, event/ticketing authoring forms, or the public registration form. Also unresolved: the UX component roadmap implies client-side React B2B components while the epic and architecture route B2B through the admin panel — settle this alongside the identity question above.

## Cross-Story Dependencies

- **Blocking prerequisites**: the venues-plugin extraction and permission re-seed (Epic 2C.1), the venue admin UI and property model (Epic 2D), event discovery/data model (Epic 3), and auth/sessions/roles (Epic 4).
- **Within the epic**: 7.1 establishes the pending-venue and manager-account substrate everything else assumes; 7.3 precedes 7.4; 7.5 precedes 7.6; 7.7 precedes 7.9 (real-time is a live view over the same aggregation).
- **Consumes other epics**: ticket-type vocabulary and the ticketing/inventory facade from the B2C ticketing epic; the watchlist notification path and refund flow triggered by cancellation; venue approval and content-flagging workflows from the platform-administration epic.
- **Blocks**: the ticket-validation/scanner epic and the parts of platform administration that assume venues author their own content.
