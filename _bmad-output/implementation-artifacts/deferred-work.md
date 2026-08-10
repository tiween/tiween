# Deferred Work

### DW-1: Missing validation for date/time strings in service [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts]

origin: migrated from legacy ledger ("Deferred from: code review of 2b-16-events-manager-plugin-test-coverage.md (2026-06-08)"), 2026-07-12
location: apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts
reason: Missing validation for date/time strings in service [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — invalid inputs currently lead to 500 errors.
status: done 2026-06-11
resolution: Up-front validation of dates/time/price/ticketsAvailable added in `createBulkShowtimes` (no partial writes); clear error messages surfaced as 400 by the controller; 9 unit tests added.

### DW-2: Missing bounds check for ticket inventory [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts]

origin: migrated from legacy ledger ("Deferred from: code review of 2b-16-events-manager-plugin-test-coverage.md (2026-06-08)"), 2026-07-12
location: apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts
reason: Missing bounds check for ticket inventory [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — allows negative values (overselling).
status: done 2026-06-11
resolution: `updateTicketInventory` enforces non-negative integers and `ticketsSold <= ticketsAvailable` (including against already-sold tickets when only capacity changes); 7 unit tests added.

### DW-3: TOCTOU race in `updateTicketInventory` [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts]

origin: migrated from legacy ledger ("Deferred from: code review of event-manager validation fixes (2026-06-11)"), 2026-07-12
location: apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts
reason: TOCTOU race in `updateTicketInventory` [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — the read-then-update window allows a concurrent purchase to bump `ticketsSold` past the validated capacity. The service guard catches operator mistakes, not races. Follow-up: add a PostgreSQL `CHECK (tickets_sold <= tickets_available)` constraint via a Strapi database migration so the RDBMS is the final enforcer. Relevant when Epic 6 (B2C ticketing) makes concurrent purchases real.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-inventory-oversell-concurrency

### DW-4: Transaction threading of order/ticket Document Service writes rests on Strapi v5 AsyncLocalStorage auto-join (verified…

origin: migrated from legacy ledger ("Deferred from: code review of 2c-4-ticketing-unit-of-work (2026-06-15)"), 2026-07-12
location: n/a
reason: Transaction threading of order/ticket Document Service writes rests on Strapi v5 AsyncLocalStorage auto-join (verified documented-correct; execution proof is the skipped integration test). Re-confirm when integration suite boots. BLOCKED (2026-07-31) — do not re-attempt until story 4.7 lands: Strapi does not boot. The users-permissions extension assigns its auth overrides onto the exported `auth` FACTORY function, so `auth.changeEmail`/`auth.confirmEmailChange` never resolve and their routes hard-fail boot. Escalated by bmad-loop run 20260712-090054-5834; see `4-7-fix-users-permissions-auth-controller-factory-wiring.md`.
status: open

### DW-5: Integration test `order.service.test.ts` is `describe.skip` due to pre-existing `db.config.connection` env failure blocking all…

origin: migrated from legacy ledger ("Deferred from: code review of 2c-4-ticketing-unit-of-work (2026-06-15)"), 2026-07-12
location: n/a
reason: Integration test `order.service.test.ts` is `describe.skip` due to pre-existing `db.config.connection` env failure blocking all integration suites. When un-skipped, add a `status: published` screening fixture so the inventory path is exercised against a real published row. BLOCKED (2026-07-31) — do not re-attempt until story 4.7 lands: the `db.config.connection` failure is not the whole story. Strapi does not boot at all, because the users-permissions extension assigns its auth overrides onto the exported `auth` FACTORY function, so the change-email routes hard-fail boot. Two further harness defects are folded into 4.7 Task 4: `tests/helpers/strapi.ts` boots from a prebuilt `dist/` that silently goes stale (`strapi build` sets `noEmitOnError: true` and 9 unrelated TS errors in `src/plugins/user-engagement/` mean it emits nothing), and `setupStrapi()` throws before `cleanupStrapi()` runs, leaking DB-pool handles. Escalated by bmad-loop run 20260712-090054-5834; see `4-7-fix-users-permissions-auth-controller-factory-wiring.md`.
status: open

### DW-6: Refund path (delta<0) in adjustInventory: no upper bound / idempotency, shares TICKET_SOLD_OUT code. No refund caller wired yet (Epic 6)

origin: migrated from legacy ledger ("Deferred from: code review of 2c-4-ticketing-unit-of-work (2026-06-15)"), 2026-07-12
location: n/a
reason: Refund path (delta<0) in adjustInventory: no upper bound / idempotency, shares TICKET_SOLD_OUT code. No refund caller wired yet (Epic 6) — give a distinct code when implemented.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-inventory-service-hardening

### DW-7: draftAndPublish double-count

origin: migrated from legacy ledger ("Resolved + re-scoped 2026-06-15 (Ayoub: ticketing ships post-GTM)"), 2026-07-12
location: n/a
reason: draftAndPublish double-count — RESOLVED.
status: done 2026-07-12
resolution: already resolved: adjustInventory reads and writes with status:'published' on both sides (apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts:99-128), so the live row is the sole target and no draft/published double-count occurs. Fixed in commit 7bb47b8 (inventory via Document Service).

### DW-8: Concurrency NOT handled

origin: migrated from legacy ledger ("Resolved + re-scoped 2026-06-15 (Ayoub: ticketing ships post-GTM)"), 2026-07-12
location: n/a
reason: Concurrency NOT handled — deferred to Epic 6 (DEadline: before ticketing goes live).
status: done 2026-07-13
resolution: resolved by sweep bundle dw-inventory-oversell-concurrency

### DW-9: entity-properties component namespace is a 2C.5 tripwire

origin: migrated from legacy ledger ("Deferred from: code review of 2c-1-extract-venues-plugin (2026-06-20)"), 2026-07-12
location: n/a
reason: entity-properties component namespace is a 2C.5 tripwire.
status: open
decision: 2026-07-13 Relocate now — Rename the component category to venues.property-value, update the venue schema ref, and add a component-table migration so the venue.properties relation survives the eventual entity-properties plugin deletion.
decision: 2026-07-13 Defer to Story 2C.5

### DW-10: events-manager admin WorkForm is stale against the new catalog model

origin: migrated from legacy ledger ("Deferred from: 2c-3-catalog-move-into-creative-works (2026-06-16)"), 2026-07-12
location: n/a
reason: events-manager admin WorkForm is stale against the new catalog model.
status: done 2026-08-03
resolution: resolved by sweep bundle dw-catalog-admin-workform-rebuild

### DW-11: `common.video` carries both `type` (legacy FULL_LENGTH/TEASER/CLIP) and `videoType` (new trailer/teaser/clip/…) enums

origin: migrated from legacy ledger ("Deferred from: 2c-3-catalog-move-into-creative-works (2026-06-16)"), 2026-07-12
location: n/a
reason: `common.video` carries both `type` (legacy FULL_LENGTH/TEASER/CLIP) and `videoType` (new trailer/teaser/clip/…) enums.
status: done 2026-07-13
resolution: closed by human decision: Accept the dual-enum as intentional and document which is authoritative for which consumer.
decision: 2026-07-13 Keep both (document the split) — Accept the dual-enum as intentional and document which is authoritative for which consumer.

### DW-12: `credit-role` content-type lacks integrity guards

origin: migrated from legacy ledger ("Deferred from: code review of 2c-3-catalog-move-into-creative-works (2026-06-16)"), 2026-07-12
location: n/a
reason: `credit-role` content-type lacks integrity guards.
status: done 2026-08-03
resolution: resolved by sweep bundle dw-catalog-schema-and-seed-integrity

### DW-13: Seed `index.ts` writes phantom fields to creative-work (pre-existing at baseline 54c092c)

origin: migrated from legacy ledger ("Deferred from: code review of 2c-3-catalog-move-into-creative-works (2026-06-16)"), 2026-07-12
location: n/a
reason: Seed `index.ts` writes phantom fields to creative-work (pre-existing at baseline 54c092c).
status: done 2026-08-03
resolution: resolved by sweep bundle dw-catalog-schema-and-seed-integrity

### DW-14: `cast` component billing semantics

origin: migrated from legacy ledger ("Deferred from: code review of 2c-3-catalog-move-into-creative-works (2026-06-16)"), 2026-07-12
location: n/a
reason: `cast` component billing semantics.
status: open

### DW-15: `website` venue field is a plain `string` with no URL validation

origin: migrated from legacy ledger ("Deferred from: code review of 2d-1-extend-venue-schema-to-rich-model (2026-06-18)"), 2026-07-12
location: n/a
reason: `website` venue field is a plain `string` with no URL validation
status: done 2026-08-03
resolution: resolved by sweep bundle dw-venue-website-url-validation

### DW-16: Dev super-admin seeder swallows all errors

origin: migrated from legacy ledger ("Deferred from: code review of 2d-1-extend-venue-schema-to-rich-model (2026-06-18)"), 2026-07-12
location: n/a
reason: Dev super-admin seeder swallows all errors
status: open

### DW-17: `.tsx` admin component tests never run in jest

origin: migrated from legacy ledger ("Deferred from: code review of 2d-1 — jest .tsx test infrastructure gap (2026-06-18)"), 2026-07-12
location: n/a
reason: `.tsx` admin component tests never run in jest.
status: done 2026-08-03
resolution: resolved by sweep bundle dw-strapi-admin-jsdom-jest

### DW-18: The public events endpoints blanket-populate screenings/venue, exposing internal `ticketsSold`/`ticketsAvailable` (raw per-screening…

origin: migrated from legacy ledger ("Deferred from: code review of 3-1-public-events-browse-api-and-data-foundation (2026-07-05)"), 2026-07-12
location: n/a
reason: The public events endpoints blanket-populate screenings/venue, exposing internal `ticketsSold`/`ticketsAvailable` (raw per-screening sales) and full venue records to unauthenticated callers.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-public-inventory-leak-sanitization

### DW-19: Trending ranking is an in-JS cap-then-rank over up to 500 fully-populated upcoming events on an uncached, unauthenticated,…

origin: migrated from legacy ledger ("Deferred from: code review of 3-1-public-events-browse-api-and-data-foundation (2026-07-05)"), 2026-07-12
location: n/a
reason: Trending ranking is an in-JS cap-then-rank over up to 500 fully-populated upcoming events on an uncached, unauthenticated, unrate-limited endpoint — it can miss a top seller beyond the cap at scale and is a resource-exhaustion surface.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-trending-ranking-scalability

### DW-20: The homepage category/date/region/venue selectors render and mutate the URL but do not filter the four curated slices

origin: migrated from legacy ledger ("Deferred from: code review of 3-1-public-events-browse-api-and-data-foundation (2026-07-05)"), 2026-07-12
location: n/a
reason: The homepage category/date/region/venue selectors render and mutate the URL but do not filter the four curated slices — they are visually interactive yet inert.
status: open
decision: 2026-07-13 Deep-link to /events — Make the selectors navigate to /events with the chosen category/date/region/venue filters, reusing the working /events filter path rather than re-deriving the curated slices.

### DW-21: `StrapiEvent.startDate`/`endDate`/`status` are declared non-optional even though the Story 3.1a public browse API never returns them,…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-11-homepage-with-curated-event-listings (2026-07-06)"), 2026-07-12
location: n/a
reason: `StrapiEvent.startDate`/`endDate`/`status` are declared non-optional even though the Story 3.1a public browse API never returns them, giving unmigrated consumers false compile-time safety.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-strapi-event-optional-legacy-fields

### DW-22: The 3.1a public browse populate is too shallow for the homepage to render movie-level hero metadata or a complete JSON-LD `location`, so…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-11-homepage-with-curated-event-listings (2026-07-06)"), 2026-07-12
location: n/a
reason: The 3.1a public browse populate is too shallow for the homepage to render movie-level hero metadata or a complete JSON-LD `location`, so the flagship hero shows only a title/badge and event structured data omits city/region.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-browse-populate-hero-metadata

### DW-23: The `/[locale]/events` listing renders only the first page (`LISTING_PAGE_SIZE = 60`) with no load-more/pagination control and no…

origin: migrated from legacy ledger ("Deferred from: code review of 3-3-date-range-filtering (2026-07-06)"), 2026-07-12
location: n/a
reason: The `/[locale]/events` listing renders only the first page (`LISTING_PAGE_SIZE = 60`) with no load-more/pagination control and no total-count signal, so events beyond the cap in a busy date window are unreachable and the truncation is silent.
status: open

### DW-24: The events venue picker offers venues that can never match an MVP (cinema-only) event

origin: migrated from legacy ledger ("Deferred from: code review of 3-3-date-range-filtering (2026-07-06)"), 2026-07-12
location: n/a
reason: The events venue picker offers venues that can never match an MVP (cinema-only) event — non-cinema venue types, venues outside the active region/city, and a mislabeled "All venues" trigger for a URL-supplied venue beyond the 100-row `getVenuesForSelector` cap — all of which dead-end to an unexplained empty listing.
status: done 2026-07-31
resolution: resolved by sweep bundle dw-venue-selector-fixes

### DW-25: Two same-named venues (e.g

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-5-venue-filtering (2026-07-06)"), 2026-07-12
location: n/a
reason: Two same-named venues (e.g. a chain with locations in different cities) are indistinguishable in the venue combobox because each `CommandItem` renders only `venue.name`, with no city/context to disambiguate.
status: done 2026-07-31
resolution: resolved by sweep bundle dw-venue-selector-fixes

### DW-26: The Algolia indexing pipeline that populates the `tiween_events` index is not built

origin: migrated from legacy ledger ("Deferred from: 3-6-keyword-search-with-algolia (2026-07-06)"), 2026-07-12
location: n/a
reason: The Algolia indexing pipeline that populates the `tiween_events` index is not built — search runs on the read side only, gated by `isAlgoliaConfigured()`, and falls back to the real Strapi `fetchEvents({ q })` path when Algolia is unconfigured (the state of this environment, and of the sibling `tiween_shorts` directory which likewise ships with no committed indexer).
status: open
decision: 2026-07-13 Build the Algolia indexer — Build the Strapi-side indexing pipeline (lifecycle hook or scheduled/CLI job) that populates tiween_events and tiween_shorts via the existing mapper, and provision the Algolia admin credentials + index configuration.

### DW-27: Multi-entity search ("events, creative works, venues, people") is delivered as searchable attributes on the event record, not as…

origin: migrated from legacy ledger ("Deferred from: 3-6-keyword-search-with-algolia (2026-07-06)"), 2026-07-12
location: n/a
reason: Multi-entity search ("events, creative works, venues, people") is delivered as searchable attributes on the event record, not as distinct per-entity result cards/sections (a venue card, a person card) — a fuzzy match on a film/venue/person name surfaces the owning event rather than a dedicated entity result.
status: open
decision: 2026-07-13 Build per-entity cards — Add per-entity Algolia indices plus dedicated venue/person result cards and their entity detail pages.

### DW-28: The Algolia read path diverges from the Strapi path in several ways that only bite once the `tiween_events` index is populated

origin: migrated from legacy ledger ("Deferred from: code review of 3-6-keyword-search-with-algolia (2026-07-06)"), 2026-07-12
location: n/a
reason: The Algolia read path diverges from the Strapi path in several ways that only bite once the `tiween_events` index is populated — the search-time `locale` is not applied to the Algolia query, the card category label is frozen at index-time locale, load-more can mix Algolia and Strapi result sets across pages, and a genuine "zero hits" is indistinguishable from an empty/missing index (both fall through to Strapi).
status: open

### DW-29: Slug-canonical (human-readable) event URLs are NOT built

origin: migrated from legacy ledger ("Deferred from: 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: Slug-canonical (human-readable) event URLs are NOT built — the detail route stays keyed on `documentId` (`/{locale}/events/{documentId}`), which is already stable and shareable.
status: open

### DW-30: The interactive venue map is NOT rendered on the detail page

origin: migrated from legacy ledger ("Deferred from: 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: The interactive venue map is NOT rendered on the detail page — the venue block shows address/city/region text only. `venue.geo` ({ latitude, longitude }) IS now deep-populated by `DETAIL_POPULATE` and typed (`StrapiGeoPoint`) so the map can consume it, but the map itself is Story 3.8.
status: done 2026-07-12
resolution: already resolved: The interactive venue map now renders: apps/client/.../EventDetailPage/EventDetailPage.tsx:354-386 renders <VenueMap> plus a directions link, gated on venue lat/lng. Landed in Story 3.8 (commit c1f364f).

### DW-31: Watchlist persistence and the ticket purchase flow are NOT built

origin: migrated from legacy ledger ("Deferred from: 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: Watchlist persistence and the ticket purchase flow are NOT built — the watchlist toggle stays local `useState`, and a showtime tap only navigates to the ticketing entrypoint (`/{locale}/tickets/{eventDocumentId}/{screeningDocumentId}`).
status: done 2026-07-12
resolution: already resolved: Watchlist is now server-backed via useAddToWatchlist/useRemoveFromWatchlist (EventDetailPage.tsx:150-157, Epic 5), and a showtime tap navigates to the real ticketing entrypoint /{locale}/tickets/{eventId}/{screeningId} (EventDetailPage.tsx:227-230); Epic 6 Konnect checkout has landed (commits c94f41b/811fb81). The detail page's local-useState watchlist is gone.

### DW-32: The `EventDetailPageDesktop` and `EventDetailPageWithMap` variants still read the legacy `event.creativeWork` relation and will render…

origin: migrated from legacy ledger ("Deferred from: 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: The `EventDetailPageDesktop` and `EventDetailPageWithMap` variants still read the legacy `event.creativeWork` relation and will render an empty hero/synopsis/cast against the real `DETAIL_POPULATE` (`screenings[0].movie`) schema if ever wired into a route.
status: done 2026-07-13
resolution: closed by human decision: Remove both unrouted variant components; the stale legacy-relation read and local watchlist toggle (DW-87) go with them.
decision: 2026-07-13 Delete the variants — Remove both unrouted variant components; the stale legacy-relation read and local watchlist toggle (DW-87) go with them.

### DW-33: The sticky "Buy tickets" CTA scrolls to the first `<section>` on the page (Synopsis), not to the Showtimes section it advertises

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: The sticky "Buy tickets" CTA scrolls to the first `<section>` on the page (Synopsis), not to the Showtimes section it advertises.
status: open

### DW-34: The sticky-CTA screening count and "from" price include sold-out screenings, and the count label is never singularized ("1 Séances")

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: The sticky-CTA screening count and "from" price include sold-out screenings, and the count label is never singularized ("1 Séances").
status: open

### DW-35: `stripMarkup` strips HTML tags but does not decode HTML entities, so a richtext synopsis containing `&amp;`/`&#39;`/`&nbsp;` renders…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: `stripMarkup` strips HTML tags but does not decode HTML entities, so a richtext synopsis containing `&amp;`/`&#39;`/`&nbsp;` renders those literal entities in both the on-page synopsis and the SEO meta description.
status: open

### DW-36: Neither `DETAIL_POPULATE` nor the `toEventDetail` mapper filters past screenings, so a published event carrying elapsed screenings…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: Neither `DETAIL_POPULATE` nor the `toEventDetail` mapper filters past screenings, so a published event carrying elapsed screenings renders them as available and tappable into the ticketing entrypoint.
status: open

### DW-37: The related-events `EventSection` on the detail page is rendered with empty-string `seeAll`/`noEvents` labels, so any "see all"…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 3-7-event-detail-page (2026-07-06)"), 2026-07-12
location: n/a
reason: The related-events `EventSection` on the detail page is rendered with empty-string `seeAll`/`noEvents` labels, so any "see all" affordance or empty-state text in that section renders blank instead of localized copy.
status: open

### DW-38: The "nearby public transport (if available)" facet of the venue-location AC is NOT rendered

origin: migrated from legacy ledger ("Deferred from: 3-8-venue-location-on-map (2026-07-09)"), 2026-07-12
location: n/a
reason: The "nearby public transport (if available)" facet of the venue-location AC is NOT rendered — the venue schema has no transit field, so the conditional AC resolves to nothing to show and is omitted by design.
status: open

### DW-39: The Leaflet marker icons are fetched from the external `unpkg.com` CDN, so the venue marker breaks if unpkg is unreachable/blocked, and…

origin: migrated from legacy ledger ("Deferred from: 3-8-venue-location-on-map (2026-07-09)"), 2026-07-12
location: n/a
reason: The Leaflet marker icons are fetched from the external `unpkg.com` CDN, so the venue marker breaks if unpkg is unreachable/blocked, and it is an uncontrolled third-party request now shipped to users.
status: open

### DW-40: The `EventDetailPage` venue-map render wiring (coords gate branches, the directions `href` pointing at the venue's own lat/lng, and the…

origin: migrated from legacy ledger ("Deferred from: 3-8-venue-location-on-map (2026-07-09)"), 2026-07-12
location: n/a
reason: The `EventDetailPage` venue-map render wiring (coords gate branches, the directions `href` pointing at the venue's own lat/lng, and the localized label threading) has no render test — only the underlying `buildDirectionsUrl`/`toEventDetail` helpers are unit-tested in isolation.
status: open

### DW-41: `seed.unit.test.ts` asserts only `create` call counts, not that the new venue `geo` payload is actually written, so dropping `geo` from…

origin: migrated from legacy ledger ("Deferred from: 3-8-venue-location-on-map (2026-07-09)"), 2026-07-12
location: n/a
reason: `seed.unit.test.ts` asserts only `create` call counts, not that the new venue `geo` payload is actually written, so dropping `geo` from the seed (or a component-name mismatch that makes Strapi silently discard it) would not fail any test.
status: open

### DW-42: Add a jsdom render test for EventDetailPage's share wiring (native-vs-fallback branch, shareUrl call-site using the canonical URL not…

origin: migrated from legacy ledger ("Deferred from: 3-8-venue-location-on-map (2026-07-09)"), 2026-07-12
location: n/a
reason: Add a jsdom render test for EventDetailPage's share wiring (native-vs-fallback branch, shareUrl call-site using the canonical URL not window.location.href, and end-to-end label threading into ShareDialog), which requires adding the EventDetailPage component dir to the vitest `include` allowlist.
status: open

### DW-43: Redis-backed rate limiting for the authentication endpoints (NFR-S8 / Epic 4 constraint "max ~10 attempts/minute") is NOT implemented

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: Redis-backed rate limiting for the authentication endpoints (NFR-S8 / Epic 4 constraint "max ~10 attempts/minute") is NOT implemented — registration, login, change-password, forgot-password, and reset-password remain unthrottled, so credential-stuffing and registration-spam are unmitigated.
status: open
decision: 2026-07-13 Provision Redis + build — Provision Redis and build distributed rate limiting across all auth and profile-management endpoints per NFR-S8 (also covering the DW-68 profile endpoints and the DW-127 confirm/webhook throttle).

### DW-44: The Strapi test suite cannot boot via `cd apps/strapi && yarn test`

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: apps/strapi/package.json
reason: The Strapi test suite cannot boot via `cd apps/strapi && yarn test` — Jest fails to parse `jest.config.ts` because `ts-node` is not installed anywhere in the repo (it is absent from `apps/strapi/package.json` and from `yarn.lock`). This is pre-existing (reproduces on baseline `2a88d19`, unrelated to Story 4.1) and blocks the entire backend suite (2b-16, 2c-4, and 4.1's new `register.unit.test.ts`).
status: done 2026-07-12
resolution: already resolved: jest.config.ts was renamed to jest.config.cjs (commit f4bb4d7, the 4.1 finalize commit) fixing the ts-node parse failure; running `cd apps/strapi && yarn test` now boots 29 suites / 306 tests green, including register.unit.test.ts and social-login.unit.test.ts.

### DW-45: The Strapi boot-based integration suites (`*.service.test.ts`, `event-manager.controller.test.ts`, `tests/app.test.js`) are excluded…

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: tests/app.test.js
reason: The Strapi boot-based integration suites (`*.service.test.ts`, `event-manager.controller.test.ts`, `tests/app.test.js`) are excluded from the default `yarn test` (unit gate) because they fail without a live Postgres DB and a clean serial SQLite state — running them in parallel yields `table strapi_migrations already exists` / `database is locked`.
status: open

### DW-46: The client register `onError` handler only translates the duplicate-email case (a brittle English substring match on `"already taken"`);…

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: The client register `onError` handler only translates the duplicate-email case (a brittle English substring match on `"already taken"`); any other server-origin validation rejection (stable codes like `INVALID_EMAIL`, `PASSWORD_TOO_SHORT`, `NAME_REQUIRED`) falls through to a generic "unexpected error" toast instead of a translated message.
status: open

### DW-47: `firstName` persistence + the welcome email depend on the Strapi register controller returning `{ user: { id } }`, and the auto-login +…

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: `firstName` persistence + the welcome email depend on the Strapi register controller returning `{ user: { id } }`, and the auto-login + `callbackUrl` redirect is the core happy-path AC — but both are only exercised against hand-rolled mocks; no integration/contract test pins the real controller response shape or the client redirect.
status: open

### DW-48: Email/username are stored case-sensitively, so registering `Alice@x.com` and then `alice@x.com` can create two distinct accounts…

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: Email/username are stored case-sensitively, so registering `Alice@x.com` and then `alice@x.com` can create two distinct accounts (username uniqueness and the u-p `unique_email` check are case-sensitive).
status: open
decision: 2026-07-13 Make identity case-insensitive — Normalize email/username to lowercase on write, add a case-insensitive unique constraint, and run a backfill migration; align the login and social-link lookups accordingly.

### DW-49: The password mixed-case rule uses ASCII-only `/[A-Z]/` and `/[a-z]/` on both client and server, so a password composed solely of…

origin: migrated from legacy ledger ("Deferred from: 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: The password mixed-case rule uses ASCII-only `/[A-Z]/` and `/[a-z]/` on both client and server, so a password composed solely of non-ASCII letters (accented Latin, Cyrillic, etc.) plus a digit is rejected as "missing uppercase/lowercase".
status: open

### DW-50: The registration auto-login guarantee rests on `email_confirmation:false` and `default_role:authenticated`, but neither is pinned in…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: apps/strapi/config/plugins.ts
reason: The registration auto-login guarantee rests on `email_confirmation:false` and `default_role:authenticated`, but neither is pinned in versioned `apps/strapi/config/plugins.ts` — the `users-permissions` block there only sets `jwt.expiresIn`, so these advanced settings default to Strapi's implicit behavior / unversioned admin (config-sync is `enabled:false`) state.
status: open

### DW-51: The pre-existing `src/features/auth/` unit tests (`PasswordStrength.test.tsx`, `registerSchema.test.ts`, `LoginForm.test.tsx`,…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: The pre-existing `src/features/auth/` unit tests (`PasswordStrength.test.tsx`, `registerSchema.test.ts`, `LoginForm.test.tsx`, `loginSchema.test.ts`) match no glob in the vitest `include` allowlist so they never run in CI, and the new `useTranslatedZod` custom-code branches (`nameRequired`/`passwordUppercase`/`passwordLowercase`/`passwordDigit`/`passwordTooLong`) have no running test — so the localized validation-message mapping can regress to generic/blank Zod defaults with a green pipeline.
status: open

### DW-52: The Strapi `ensureSocialProviders` bootstrap enables the google/facebook `grant` entries unconditionally, so `GET…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: The Strapi `ensureSocialProviders` bootstrap enables the google/facebook `grant` entries unconditionally, so `GET /auth/:provider/callback` is live in every environment even where social login is meant to be off and no client OAuth credentials exist.
status: open

### DW-53: Each trusted social login makes two upstream provider profile calls

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: Each trusted social login makes two upstream provider profile calls — `fetchSocialProfile` in the callback wrapper plus the stock `connect`'s own `getProfile` — doubling latency and provider rate-limit consumption per login.
status: open

### DW-54: Cross-provider account linking looks up the existing user with a lowercased email against a case-sensitive column, so an account stored…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: Cross-provider account linking looks up the existing user with a lowercased email against a case-sensitive column, so an account stored with mixed-case email won't be found and linking silently falls back to the raw "Email is already taken" error.
status: open

### DW-55: New social sign-ups always receive a French welcome email

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: New social sign-ups always receive a French welcome email — no request locale is available at the OAuth callback and a brand-new user has no `preferredLanguage` yet — so AR/EN users who register via Google/Facebook get a FR email.
status: open
decision: 2026-07-13 Thread locale via OAuth state — Carry the UI locale through the NextAuth OAuth state parameter into the Strapi callback so the social welcome email is localized.

### DW-56: The NextAuth env-gated OAuth provider registration in `apps/client/src/lib/auth.ts` has no running test, and the page-level…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: apps/client/src/lib/auth.ts
reason: The NextAuth env-gated OAuth provider registration in `apps/client/src/lib/auth.ts` has no running test, and the page-level `enableGoogle`/`enableFacebook` flags use an independent copy of the same env expression, so a divergence (button shown but provider unregistered, or vice-versa) is unverified.
status: open

### DW-57: `avatarUrl` persistence (and the new `avatarUrl` schema attribute) is only asserted against a mocked user service

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-1-email-and-password-registration (2026-07-09)"), 2026-07-12
location: n/a
reason: `avatarUrl` persistence (and the new `avatarUrl` schema attribute) is only asserted against a mocked user service — no running test exercises the real Strapi write, so deleting the schema attribute would not fail the default unit gate even though the value would silently never persist.
status: open

### DW-58: Facebook `emailVerified` is inferred from mere email presence (`Boolean(data.email)`), so a Facebook account whose email is NOT…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-2-social-login-with-google-and-facebook (2026-07-09)"), 2026-07-12
location: n/a
reason: Facebook `emailVerified` is inferred from mere email presence (`Boolean(data.email)`), so a Facebook account whose email is NOT provider-verified could be auto-linked into an existing local/Google account with the same email — an account-takeover vector into the victim's account. HIGH severity — flagged independently by two reviewers.
status: open

### DW-59: The cross-provider linking branch guards only `!linkTarget.blocked`, not `linkTarget.confirmed`, so it drops the confirmed-account gate…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-2-social-login-with-google-and-facebook (2026-07-09)"), 2026-07-12
location: n/a
reason: The cross-provider linking branch guards only `!linkTarget.blocked`, not `linkTarget.confirmed`, so it drops the confirmed-account gate that stock repeat-login enforces. Zero impact today (email confirmation is off), but latent if confirmation is ever enabled.
status: open

### DW-60: `fetchSocialProfile` calls the Google/Facebook profile endpoints with bare `fetch` and no timeout, so a slow or hung provider endpoint…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 4-2-social-login-with-google-and-facebook (2026-07-09)"), 2026-07-12
location: n/a
reason: `fetchSocialProfile` calls the Google/Facebook profile endpoints with bare `fetch` and no timeout, so a slow or hung provider endpoint can stall the Strapi OAuth callback (and the upstream NextAuth `jwt` callback) indefinitely, past the AC's NFR-IN4 <10s budget.
status: open

### DW-61: forgot-password has a timing-oracle account-enumeration side channel

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md (2026-07-09)"), 2026-07-12
location: n/a
reason: forgot-password has a timing-oracle account-enumeration side channel — the known-email branch awaits a DB write plus a full email-send round-trip before returning `{ok:true}`, while the unknown-email branch returns after a single `findOne`, so response latency distinguishes registered emails despite the identical body.
status: open

### DW-62: repo-wide open-redirect pattern

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md (2026-07-09)"), 2026-07-12
location: n/a
reason: repo-wide open-redirect pattern — `callbackUrl` from the query string is assigned straight to `window.location.href` after auth in RegisterForm (Story 4.1) and other auth forms; only ResetPasswordForm is now guarded to internal paths.
status: open

### DW-63: the backend→client reset error-code contract (`RESET_TOKEN_EXPIRED`/`RESET_TOKEN_INVALID` surfaced inside `error.message` for…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md (2026-07-09)"), 2026-07-12
location: n/a
reason: the backend→client reset error-code contract (`RESET_TOKEN_EXPIRED`/`RESET_TOKEN_INVALID` surfaced inside `error.message` for `raw.includes(...)` mapping) is only asserted against hand-crafted errors; no test exercises the real Strapi `ValidationError` serialization through `useUserMutations` end-to-end.
status: open

### DW-64: JWT `iat` has whole-second granularity, so a pre-reset token issued in the same wall-clock second as the reset's new token is not…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md (2026-07-09)"), 2026-07-12
location: n/a
reason: JWT `iat` has whole-second granularity, so a pre-reset token issued in the same wall-clock second as the reset's new token is not revoked (up-to-~1s window).
status: open

### DW-65: session invalidation silently goes fully OPEN if users-permissions is switched to `jwtManagement: "refresh"` mode

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md — pass 2 (2026-07-09)"), 2026-07-12
location: n/a
reason: session invalidation silently goes fully OPEN if users-permissions is switched to `jwtManagement: "refresh"` mode — stock `verify` then returns `{id}` with no `iat`, so both the `passwordChangedAt` stamp and the stale-token check become no-ops.
status: open

### DW-66: the wrapped `jwt.verify` adds one `findOne` user lookup to EVERY authenticated request (on top of the strategy's own…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md — pass 2 (2026-07-09)"), 2026-07-12
location: n/a
reason: the wrapped `jwt.verify` adds one `findOne` user lookup to EVERY authenticated request (on top of the strategy's own `fetchAuthenticatedUser`), an app-wide throughput cost inherent to the stateless-JWT revocation approach.
status: open

### DW-67: the password-reset email never honors the current UI locale

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-3-password-reset-flow.md — follow-up pass (2026-07-09)"), 2026-07-12
location: n/a
reason: the password-reset email never honors the current UI locale — `forgotPasswordMutation` posts only `{ email }` (no `locale`), so the server's `requestLocale` branch in `sendPasswordResetEmail` is dead and the language always resolves via `user.preferredLanguage` (defaulting to `fr` when unset), so a visitor on the AR/EN forgot-password page whose stored preference is unset/differs receives a French reset email.
status: open

### DW-68: The new Story 4.4 authenticated write endpoints (`PUT /users/me`, `POST /auth/change-email`, `POST /auth/confirm-email-change`) are…

origin: migrated from legacy ledger ("Deferred from: 4-4-profile-management (2026-07-09)"), 2026-07-12
location: n/a
reason: The new Story 4.4 authenticated write endpoints (`PUT /users/me`, `POST /auth/change-email`, `POST /auth/confirm-email-change`) are unthrottled, extending the epic-wide auth rate-limiting gap (already recorded under 4.1) to the profile-management surface — change-email in particular can be used to spam arbitrary addresses with confirmation emails, and confirm-email-change is a public token-guessing surface.
status: open

### DW-69: An email change is confirmed without ever notifying the OLD email address, so a session-hijack that swaps the account email is invisible…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: An email change is confirmed without ever notifying the OLD email address, so a session-hijack that swaps the account email is invisible and unrecoverable to the legitimate owner.
status: open

### DW-70: `POST /api/upload` is allow-listed by path only, so the private proxy forwards any authenticated upload body (not just the avatar…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: `POST /api/upload` is allow-listed by path only, so the private proxy forwards any authenticated upload body (not just the avatar `files`-only shape), and Strapi's upload controller also handles file-replacement-by-id — the boundary rests entirely on the operator granting `Upload.upload` but NOT `Upload.update`.
status: open
decision: 2026-07-13 Constrain the proxy — Restrict the proxy to the avatar files-only upload shape and/or explicitly block the replace-by-id route at the proxy, rather than relying solely on Strapi permission config.

### DW-71: A user cannot REMOVE an already-saved avatar

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: A user cannot REMOVE an already-saved avatar — the `AvatarUpload` "Remove" control only clears a not-yet-uploaded pending selection; there is no path to unset a linked avatar (the form never sends a clear and `updateMeSchema.avatar` is `z.number().optional()`, which cannot carry `null`).
status: open

### DW-72: `POST /auth/change-email` is an account-enumeration oracle for authenticated users

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: `POST /auth/change-email` is an account-enumeration oracle for authenticated users — a distinct `EMAIL_TAKEN` code for an address registered to another account (vs `{ ok: true }` for a free one) lets any logged-in user probe which emails exist.
status: open
decision: 2026-07-13 Return uniform response — Return a uniform {ok:true} from change-email and surface any address conflict only via the confirmation step, removing the enumeration signal.

### DW-73: A failed profile save AFTER a successful avatar upload orphans the uploaded media file, and a retry re-uploads (another orphan) rather…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: A failed profile save AFTER a successful avatar upload orphans the uploaded media file, and a retry re-uploads (another orphan) rather than reusing the already-uploaded id.
status: open

### DW-74: The email-change confirmation email ignores the active UI locale

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: The email-change confirmation email ignores the active UI locale — the client `requestEmailChangeMutation` posts only `{ email }`, so the server's `requestLocale` branch is dead and the language always resolves via stored `preferredLanguage` (default `fr`).
status: open

### DW-75: The proxy allowlist matcher `isStrapiEndpointAllowed` uses `path.startsWith(endpoint)`, so the newly-added `api/upload` (POST) and…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: The proxy allowlist matcher `isStrapiEndpointAllowed` uses `path.startsWith(endpoint)`, so the newly-added `api/upload` (POST) and `api/users/me` (PUT) entries also match prefixed variants (e.g. `api/upload/files/1`, `api/users/mexyz`) rather than the exact path — a widening the `request-auth.test.ts` exact-string cases do not catch.
status: open

### DW-76: Three `ProfileForm` branches are untested

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: Three `ProfileForm` branches are untested — the post-save language-change redirect (`router.push(\`/${values.language}/auth/profile\`)`when the selected language differs from the active locale), the avatar-upload-failure abort (toast`unexpectedError`and return without saving), and the`defaultRegion`client payload path (tests render with`regions={[]}`, so the region field never mounts).
status: open

### DW-77: A stale `localStorage` location (a remembered region that no longer exists for the current locale) suppresses the profile…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: A stale `localStorage` location (a remembered region that no longer exists for the current locale) suppresses the profile `defaultRegion` seed for one `/events` visit — the restore-on-mount reconciles the saved location to empty, clears storage, and returns without falling through to the profile default.
status: open

### DW-78: The NextAuth `session`/`jwt` callback that exposes `session.user.preferredLanguage` (the sole producer of the field `PreferenceSync`…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: The NextAuth `session`/`jwt` callback that exposes `session.user.preferredLanguage` (the sole producer of the field `PreferenceSync` consumes) has no direct unit test — `PreferenceSync.test.tsx` injects the session value, so a regression that stops populating it (renamed/removed field) would ship green.
status: open

### DW-79: The `EventsListing` → `useCurrentUser` → `EventLocationFilter` wiring (reads `currentUser.defaultRegion`, threads it as the…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: The `EventsListing` → `useCurrentUser` → `EventLocationFilter` wiring (reads `currentUser.defaultRegion`, threads it as the `defaultRegion` prop, gated on `useSession` auth) has no integration test — `EventLocationFilter.test.tsx` supplies the prop directly, and there is no `EventsListing` test file, so disconnecting the seam would not fail any test.
status: open

### DW-80: Nothing pins that `<PreferenceSync />` is actually mounted in the `[locale]` layout

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: Nothing pins that `<PreferenceSync />` is actually mounted in the `[locale]` layout — the component is unit-tested standalone, so deleting its mount would silently disable login-time language application with a green suite.
status: open

### DW-81: Guest-order linking runs on every user `afterCreate` with no proof of email ownership

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: (HIGH) Guest-order linking runs on every user `afterCreate` with no proof of email ownership — when Epic 6 lands guest orders, an attacker who registers a victim's email would inherit the victim's guest purchases (guestName, paymentReference, tickets), instantly usable if email confirmation is disabled (the Strapi default). Gate linking on verified ownership: trigger it on the email-confirmation event (or an `afterUpdate` confirmed-transition) rather than raw `afterCreate`, and re-evaluate for admin-panel/seed-created users.
status: open
decision: 2026-07-13 Gate on verified-email event — Move the linking trigger from raw afterCreate to the email-confirmation / afterUpdate confirmed-transition, and handle admin-panel/seed-created users, so orders link only after ownership is proven.

### DW-82: `linkGuestOrders` links guest orders of ANY `paymentStatus` (including `pending`/`failed`)

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: `linkGuestOrders` links guest orders of ANY `paymentStatus` (including `pending`/`failed`) — an abandoned/failed guest checkout would surface in the account's "my orders" as a real purchase. Restrict linking to the appropriate status(es) (likely `paid`) once Epic 6 defines the order lifecycle and purchase-history view.
status: open

### DW-83: The per-order link updates run sequentially outside any transaction and the lifecycle swallows errors, so a mid-batch DB failure leaves…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: The per-order link updates run sequentially outside any transaction and the lifecycle swallows errors, so a mid-batch DB failure leaves the remaining matching orders permanently unlinked with no retry (afterCreate is one-shot) — silent partial linking. Wrap the batch in `strapi.db.transaction` and/or add per-order try/catch, and expose an idempotent re-run/backfill entry point.
status: open

### DW-84: `guestEmail` is persisted raw by `createOrder` (`guestEmail: data.guestEmail`) but the linker normalizes the read side (trim+lowercase);…

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: `guestEmail` is persisted raw by `createOrder` (`guestEmail: data.guestEmail`) but the linker normalizes the read side (trim+lowercase); a guest order stored with surrounding whitespace would never match and never link. Normalize `guestEmail` on write (in `createOrder`/validation) so read/write normalization agree — which also lets linking use `$eq` on a normalized column instead of the `LIKE`-based `$eqi`.
status: open

### DW-85: No DB index on `ticket_orders.guestEmail`; every account creation now runs a filtered scan over that column

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: (LOW) No DB index on `ticket_orders.guestEmail`; every account creation now runs a filtered scan over that column. Add an index once the orders table grows.
status: open

### DW-86: The new linking behavior is verified only by mocked unit tests

origin: migrated from legacy ledger ("Deferred from: code review of spec-4-4-profile-management.md (2026-07-09)"), 2026-07-12
location: n/a
reason: The new linking behavior is verified only by mocked unit tests — the real `$eqi` filter semantics, the Strapi v5 relation-write shape (`data: { user: documentId }`), and the `afterCreate` `event.result` wiring are never exercised by a booted-Strapi test (the sole integration suite `order.service.test.ts` is `describe.skip` and does not cover this). A silent runtime no-op (nothing links) would pass the green unit gate. Add boot-based integration coverage (seed a guest order, create a matching user, assert the order's `user` relation populates, incl. a mixed-case email) — fold into the existing skipped suite's un-skip follow-up. BLOCKED (2026-07-31) — do not re-attempt until story 4.7 lands: Strapi does not boot (users-permissions auth overrides assigned onto the exported `auth` FACTORY function; the change-email routes hard-fail boot). Note this entry's own warning proved literally true of the auth layer — all six Epic-4 auth handlers are silent runtime no-ops behind a green unit gate, because the four auth unit tests build their plugin double as a plain object and never instantiate the factory. Escalated by bmad-loop run 20260712-090054-5834; see `4-7-fix-users-permissions-auth-controller-factory-wiring.md`.
status: open

### DW-87: The `EventDetailPageDesktop` and `EventDetailPageWithMap` variants still use the local-only `useState(isWatchlisted)` toggle that Story…

origin: migrated from legacy ledger ("Deferred from: code review of 5-1-add-event-to-watchlist (2026-07-10)"), 2026-07-12
location: n/a
reason: The `EventDetailPageDesktop` and `EventDetailPageWithMap` variants still use the local-only `useState(isWatchlisted)` toggle that Story 5.1 replaced on the mobile `EventDetailPage`, so their heart would not persist if either variant were ever routed.
status: open

### DW-88: On reconnect the resumed `useWatchlistCheck` GET can complete after the drain's `check` invalidation and overwrite the optimistic…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-1-add-event-to-watchlist (2026-07-10, pass 2)"), 2026-07-12
location: n/a
reason: On reconnect the resumed `useWatchlistCheck` GET can complete after the drain's `check` invalidation and overwrite the optimistic `isInWatchlist:true` with the server's still-`false`, briefly emptying a heart for an add that IS now persisted (self-heals after staleTime/navigation).
status: open

### DW-89: An offline add is not reflected after an offline page reload

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-1-add-event-to-watchlist (2026-07-10, pass 2)"), 2026-07-12
location: n/a
reason: An offline add is not reflected after an offline page reload — the filled-heart state lives only in the react-query cache (lost on reload) and is never hydrated from the persisted pending-add queue.
status: open

### DW-90: The proxy allow-list matcher `isStrapiEndpointAllowed` uses `path.startsWith(endpoint)` with no path-segment boundary, so the new…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-1-add-event-to-watchlist (2026-07-10, pass 2)"), 2026-07-12
location: n/a
reason: The proxy allow-list matcher `isStrapiEndpointAllowed` uses `path.startsWith(endpoint)` with no path-segment boundary, so the new `api/user-engagement/watchlist` POST entry also reaches `/watchlist/toggle` (which can REMOVE) and any future prefix-sibling route; DELETE remains blocked but the "no removal in 5.1" boundary is not truly enforced.
status: open

### DW-91: When `watchlistDisabled` (an event with no resolvable creative-work), the FilmHero heart button renders with `aria-label={undefined}`,…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-1-add-event-to-watchlist (2026-07-10, pass 2)"), 2026-07-12
location: n/a
reason: When `watchlistDisabled` (an event with no resolvable creative-work), the FilmHero heart button renders with `aria-label={undefined}`, so screen readers announce an unnamed icon-only "button" (WCAG 4.1.2).
status: open

### DW-92: The core Story 5.1 integration seam

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-1-add-event-to-watchlist (2026-07-10, pass 2)"), 2026-07-12
location: n/a
reason: The core Story 5.1 integration seam — `EventDetailPage` passing `getEventFilm(event)?.documentId` and `watchlistDisabled={!canWatchlist}` into the heart — has no test; a regression passing `event.documentId` (wrong entity) or dropping the disabled gate would ship green.
status: open

### DW-93: Watchlist reconnect drain iterates a fixed snapshot and removes replayed ops by id only; a mid-drain network flap plus a concurrent…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-1-add-event-to-watchlist (2026-07-10, pass 2)"), 2026-07-12
location: n/a
reason: Watchlist reconnect drain iterates a fixed snapshot and removes replayed ops by id only; a mid-drain network flap plus a concurrent opposite-kind enqueue for an id still in the snapshot can drop the user's fresh op.
status: open

### DW-94: The watchlist page renders one `WatchlistCard` per saved item, each calling `useRemoveFromWatchlist` → `useWatchlistCheck(id)` (enabled…

origin: migrated from legacy ledger ("Deferred from: code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: The watchlist page renders one `WatchlistCard` per saved item, each calling `useRemoveFromWatchlist` → `useWatchlistCheck(id)` (enabled while authenticated), so an N-item watchlist fires N proxied `GET /user-engagement/watchlist/check/:id` requests on load; the per-card mount-time `setQueryData` seed runs after the query observer subscribes, so it cannot pre-empt the fetch.
status: open

### DW-95: Watchlist cards render the placeholder poster because `getUserWatchlist` populates only `["creativeWork"]` (no `creativeWork.poster`),…

origin: migrated from legacy ledger ("Deferred from: code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: Watchlist cards render the placeholder poster because `getUserWatchlist` populates only `["creativeWork"]` (no `creativeWork.poster`), and the watchlist controller ignores `ctx.query`, so the client `useWatchlist` populate list (`creativeWork.poster.formats`) is inert.
status: open

### DW-96: The remove-with-undo card-exit ANIMATION and wiring the shared undo affordance were scope-trimmed from the watchlist page; the card…

origin: migrated from legacy ledger ("Deferred from: code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: The remove-with-undo card-exit ANIMATION and wiring the shared undo affordance were scope-trimmed from the watchlist page; the card already leaves the list on refetch, but the epic UX calls for an animated exit.
status: open

### DW-97: The watchlist page has no navigation entry point

origin: migrated from legacy ledger ("Deferred from: code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: The watchlist page has no navigation entry point — BottomNav's "account" tab routes to a non-existent `/account`, and nothing links to `/watchlist`; the page is only reachable by direct URL.
status: open

### DW-98: Screening enrichment is film-only

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: Screening enrichment is film-only — the facade queries `screenings.movie` but never the sibling `performances.play` relation, so a watchlisted `play` (a first-class `creative-work.type`) never gets a next/last date or venue, always shows a blank meta line, and can never move into the "Past" section.
status: open

### DW-99: The (pass-1) localized category badge passes a translated label string to `EventCard`, whose `categoryVariants` color map is keyed on…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: The (pass-1) localized category badge passes a translated label string to `EventCard`, whose `categoryVariants` color map is keyed on the French display strings, so in ar/en every badge misses the lookup and falls back to the `secondary` variant (fr still matches, so it looked fine in the default locale).
status: open

### DW-100: Offline watchlist read is gated on `useSession()` resolving, which needs the network (or the Serwist SW)

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: Offline watchlist read is gated on `useSession()` resolving, which needs the network (or the Serwist SW) — on a full COLD offline reload the session may not resolve, so `userId` is undefined and the user falls through to the offline EmptyState instead of their cached list.
status: open

### DW-101: Durable cross-user snapshot persistence

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: Durable cross-user snapshot persistence — on a same-tab user switch (A signs out, B signs in without a hard reload), the module-level `QueryClient` still holds A's stale `["watchlist","list"]` data, so the persist effect can write A's rows under B's cache key.
status: open

### DW-102: The per-user watchlist snapshot (and the Story 5.1 pending-op queue) are never cleared on logout, so a user's saved-events list persists…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-3-view-watchlist-page (2026-07-10)"), 2026-07-12
location: n/a
reason: The per-user watchlist snapshot (and the Story 5.1 pending-op queue) are never cleared on logout, so a user's saved-events list persists in `localStorage` on a shared/public device after sign-out.
status: open

### DW-103: The watchlist `add` dedupe is non-atomic (read-before-write with no unique DB constraint), so two near-simultaneous cross-device adds of…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-5-watchlist-sync-across-devices (2026-07-10)"), 2026-07-12
location: n/a
reason: The watchlist `add` dedupe is non-atomic (read-before-write with no unique DB constraint), so two near-simultaneous cross-device adds of the same `(user, creativeWork)` can both observe an empty `findMany` and both `create`, yielding duplicate rows — the exact concurrent scenario Story 5.5 is about is unverified.
status: open

### DW-104: Bulk `updateMany` / non-scalar-`where` event schedule edits are not detected by the Story 5.6 lifecycle subscriber, so schedule changes…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 5-5-watchlist-sync-across-devices (2026-07-10)"), 2026-07-12
location: n/a
reason: Bulk `updateMany` / non-scalar-`where` event schedule edits are not detected by the Story 5.6 lifecycle subscriber, so schedule changes made via bulk tooling or data import notify no watcher.
status: open

### DW-105: source\*spec: `_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md`

origin: migrated from legacy ledger ("Deferred from: follow-up code review (pass 3) of 5-6-schedule-change-notifications (2026-07-10)"), 2026-07-12
location: \_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md
reason: source\*spec: `_bmad-output/implementation-artifacts/spec-5-6-schedule-change-notifications.md`
status: open

### DW-106: The Account-tab unread-badge wiring at the three `HomePage*` mount sites (the only places the badge is surfaced to users

origin: migrated from legacy ledger ("Deferred from: follow-up code review (pass 3) of 5-6-schedule-change-notifications (2026-07-10)"), 2026-07-12
location: n/a
reason: The Account-tab unread-badge wiring at the three `HomePage*` mount sites (the only places the badge is surfaced to users — the AC deliverable) has no test, so a broken/dropped `accountBadgeCount` prop would ship green.
status: open

### DW-107: The fan-out idempotency probe keys on exact `oldDateTime`/`newDateTime` string equality across a DB round-trip, so if Strapi normalizes…

origin: migrated from legacy ledger ("Deferred from: follow-up code review (pass 3) of 5-6-schedule-change-notifications (2026-07-10)"), 2026-07-12
location: n/a
reason: The fan-out idempotency probe keys on exact `oldDateTime`/`newDateTime` string equality across a DB round-trip, so if Strapi normalizes the stored `datetime` column differently from the incoming ISO snapshot the probe misses and a duplicate in-app notification + duplicate email slip through on the ordinary multi-fire (per-locale / draft→published) path.
status: open

### DW-108: Per-tier inventory (`ticketing.ticket-tier.ticketsAvailable`/`ticketsSold`) is a display-only additive model and is NOT reconciled with…

origin: migrated from legacy ledger ("Deferred from: 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: Per-tier inventory (`ticketing.ticket-tier.ticketsAvailable`/`ticketsSold`) is a display-only additive model and is NOT reconciled with the atomic purchase write path — the sub-event's legacy single `price`/`ticketsAvailable`/`ticketsSold` and `events-manager.public-api.adjustInventory` remain the only inventory the order flow reads/writes, so tier-level availability is not decremented on purchase.
status: open
decision: 2026-07-13 Derive tiers from sub-event — Keep sub-event inventory authoritative and derive/display tier availability from it, dropping the independent additive tier counts — avoids a second concurrent-write surface (pairs with inventory-service-hardening).

### DW-109: The TND price formatter is now re-implemented in four places

origin: migrated from legacy ledger ("Deferred from: 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: features/tickets/utils/formatPrice.ts
reason: The TND price formatter is now re-implemented in four places — the new shared `features/tickets/utils/formatPrice.ts` and the three pre-existing inline `.toFixed(2).replace(".", ",")` copies in `OrderSummary.tsx`, `QuantitySelector` (desktop prototypes), and the desktop ticketing prototypes.
status: open

### DW-110: source\*spec: `_bmad-output/implementation-artifacts/spec-6-1-view-ticket-types-and-prices.md`

origin: migrated from legacy ledger ("Deferred from: code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: \_bmad-output/implementation-artifacts/spec-6-1-view-ticket-types-and-prices.md
reason: source\*spec: `_bmad-output/implementation-artifacts/spec-6-1-view-ticket-types-and-prices.md`
status: open

### DW-111: The tickets page does not verify that `[screeningId]` belongs to `[documentId]` (the event), so a hand-crafted/stale URL…

origin: migrated from legacy ledger ("Deferred from: code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The tickets page does not verify that `[screeningId]` belongs to `[documentId]` (the event), so a hand-crafted/stale URL `/tickets/<eventA>/<sub-event-of-eventB>` returns 200 and renders event A's header above event B's ticket tiers — incoherent context in a purchase funnel.
status: open

### DW-112: The public, unauthenticated ticket-tiers endpoint discloses each tier's exact `ticketsSold` and `ticketsAvailable`, though the UI only…

origin: migrated from legacy ledger ("Deferred from: code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The public, unauthenticated ticket-tiers endpoint discloses each tier's exact `ticketsSold` and `ticketsAvailable`, though the UI only consumes the derived `remaining`/`soldOut` — leaking precise per-showtime sell-through to anonymous scrapers.
status: done 2026-07-13
resolution: resolved by sweep bundle dw-public-inventory-leak-sanitization

### DW-113: The seeded ticket tiers (the story's required "at least one sold-out tier" + `reduced` tier `restrictionNote: "sur justificatif"`) have…

origin: migrated from legacy ledger ("Deferred from: code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The seeded ticket tiers (the story's required "at least one sold-out tier" + `reduced` tier `restrictionNote: "sur justificatif"`) have no test assertions, so a regression dropping the sold-out/restriction seed data would surface only in the manual re-seed-and-hit check, never in `yarn test`.
status: open

### DW-114: source\*spec: `_bmad-output/implementation-artifacts/spec-6-1-view-ticket-types-and-prices.md`

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: \_bmad-output/implementation-artifacts/spec-6-1-view-ticket-types-and-prices.md
reason: source\*spec: `_bmad-output/implementation-artifacts/spec-6-1-view-ticket-types-and-prices.md`
status: open

### DW-115: The tickets page's error branch renders a passive `EmptyState` (`variant="custom"`) with no `role="alert"` / live region, so a…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The tickets page's error branch renders a passive `EmptyState` (`variant="custom"`) with no `role="alert"` / live region, so a screen-reader user is never notified that the ticket-tier load failed — the error is conveyed only visually.
status: open

### DW-116: The public-proxy allowlist entry `api/events-manager/showtimes` is matched by `startsWith`, so it opens the entire `showtimes/*` GET…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The public-proxy allowlist entry `api/events-manager/showtimes` is matched by `startsWith`, so it opens the entire `showtimes/*` GET namespace to unauthenticated callers — any GET route added under `showtimes` later (even one intended to require auth) would be silently auto-exposed.
status: open

### DW-117: The selection store never re-clamps a persisted/refetched quantity down to a tier's current `remaining`, so if inventory drops after a…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The selection store never re-clamps a persisted/refetched quantity down to a tier's current `remaining`, so if inventory drops after a quantity is stored the OrderSummary/subtotal can display more tickets than are actually available for that tier.
status: open

### DW-118: Ticket-funnel navigation uses raw `next/navigation` `useRouter` with a hand-built `/${locale}/...` path instead of the app's…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: Ticket-funnel navigation uses raw `next/navigation` `useRouter` with a hand-built `/${locale}/...` path instead of the app's locale-aware next-intl router, so on the default locale (`fr`, `localePrefix: "as-needed"`) the redundant prefix triggers a canonicalizing redirect hop.
status: open

### DW-119: The `ticket-selection-storage` Zustand `persist` has no `version`/`migrate`, no `partialize`, and no `skipHydration`, so the selection…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The `ticket-selection-storage` Zustand `persist` has no `version`/`migrate`, no `partialize`, and no `skipHydration`, so the selection (including `subEventId`) lingers in localStorage across unrelated sessions with no migration path if `quantities`/`TicketTierType` ever change shape.
status: open

### DW-120: The tickets and payment routes do not verify that `[screeningId]` belongs to `[documentId]`; a mismatched/stale URL renders a blank…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: The tickets and payment routes do not verify that `[screeningId]` belongs to `[documentId]`; a mismatched/stale URL renders a blank showtime label and empty event title rather than a 404.
status: open

### DW-121: `formatPrice` hard-codes `toFixed(2)`, so a TND price carrying millimes (3 decimal places, e.g

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-1-view-ticket-types-and-prices (2026-07-10)"), 2026-07-12
location: n/a
reason: `formatPrice` hard-codes `toFixed(2)`, so a TND price carrying millimes (3 decimal places, e.g. 12.750) is truncated/mis-rounded in displayed unit prices and totals.
status: open

### DW-122: The store's `setQuantity` order-capacity accounting (`otherTotal`) sums quantities on ALL persisted tiers including ones that are now…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-2-select-ticket-quantity (2026-07-10)"), 2026-07-12
location: n/a
reason: The store's `setQuantity` order-capacity accounting (`otherTotal`) sums quantities on ALL persisted tiers including ones that are now sold-out/absent, while the UI derives `orderRemainingCapacity` from filtered (non-sold-out) priced items — so a persisted same-screening cart whose tier later goes sold-out silently no-ops another tier's `+` button (dead increment) even though the UI enables it.
status: open

### DW-123: The order-summary showtime label is resolved server-side from `event.screenings?.find((s) => s.documentId === screeningId)` only, so a…

origin: migrated from legacy ledger ("Deferred from: follow-up code review of 6-2-select-ticket-quantity (2026-07-10)"), 2026-07-12
location: n/a
reason: The order-summary showtime label is resolved server-side from `event.screenings?.find((s) => s.documentId === screeningId)` only, so a valid `performance`-kind sub-event yields a blank showtime — and the authoritative `startDateTime` that already lives in the client `TicketTiersResponse` is ignored.
status: open

### DW-124: Reserved inventory leaks permanently when a checkout's single Konnect webhook delivery is lost/errored AND the buyer never lands on the…

origin: migrated from legacy ledger ("review of 6-3-konnect-payment-gateway-integration (2026-07-10)"), 2026-07-12
location: n/a
reason: (MEDIUM) Reserved inventory leaks permanently when a checkout's single Konnect webhook delivery is lost/errored AND the buyer never lands on the result page (abandoned tab) — there is no reservation-expiry sweep, so `ticketsSold` stays reserved forever, eroding real availability.
status: open

### DW-125: `POST /ticketing/orders` has no server-side idempotency key

origin: migrated from legacy ledger ("review of 6-3-konnect-payment-gateway-integration (2026-07-10)"), 2026-07-12
location: n/a
reason: (MEDIUM) `POST /ticketing/orders` has no server-side idempotency key — a retried checkout POST (lost response, double tap past the client `isSubmitting` guard) mints a second order + second inventory reservation + second Konnect pay link for the same selection.
status: open

### DW-126: The pre-existing public `GET /api/ticketing/orders/:orderNumber` (content-api, `auth: []`) returns the full order

origin: migrated from legacy ledger ("review of 6-3-konnect-payment-gateway-integration (2026-07-10)"), 2026-07-12
location: n/a
reason: (MEDIUM) The pre-existing public `GET /api/ticketing/orders/:orderNumber` (content-api, `auth: []`) returns the full order — `guestEmail`, `guestName`, `user`, `tickets` — with no field filtering; the order number is a low-entropy bearer capability (`TW-<base36 ts>-<4 base36 rand>`), so PII is harvestable by enumeration by anyone hitting Strapi directly.
status: open

### DW-127: `POST /orders/:orderNumber/confirm` and `POST /payments/konnect/webhook` are unauthenticated and unthrottled; the webhook shared-secret…

origin: migrated from legacy ledger ("review of 6-3-konnect-payment-gateway-integration (2026-07-10)"), 2026-07-12
location: n/a
reason: (LOW) `POST /orders/:orderNumber/confirm` and `POST /payments/konnect/webhook` are unauthenticated and unthrottled; the webhook shared-secret is only enforced when `KONNECT_WEBHOOK_SECRET` is configured — enabling order-status enumeration via confirm and outbound-Konnect request amplification via webhook flooding.
status: open

### DW-128: The webhook→ticketing reconciliation backstop silently drops the event when Konnect echoes `payment.orderId = null`

origin: migrated from legacy ledger ("review of 6-3-konnect-payment-gateway-integration (2026-07-10)"), 2026-07-12
location: n/a
reason: (LOW) The webhook→ticketing reconciliation backstop silently drops the event when Konnect echoes `payment.orderId = null` — the ticketing bootstrap handler no-ops on a missing `orderId`, so that order only ever settles via the client confirm.
status: open

### DW-129: The concurrency-safe inventory rewrite (adjustInventory raw-SQL increment + bootstrap CHECK constraint) has no DB-backed test — real column/table names, CHECK enforcement, trx rollback, and the oversell race are all mock-only

origin: follow-up review of spec-inventory-oversell-concurrency.md (2026-07-13)
location: apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts, apps/strapi/src/plugins/events-manager/server/src/bootstrap.ts
reason: (MEDIUM) `adjustInventory` was rewritten from a name-mapped Document Service call to raw knex against hardcoded physical names (`screenings`/`performances`, `document_id`, `published_at`, `tickets_sold`, `tickets_available`) plus `strapi.db.transaction().get()`, and the oversell backstop is a `bootstrap()`-installed Postgres `CHECK (tickets_sold <= tickets_available) NOT VALID`. Every test for both surfaces mocks knex/`raw`/`hasTable` and asserts the implementation's own string literals against a mock authored to match them — tautological. Nothing exercises a real (or in-memory) Postgres, so none of the load-bearing claims are verified: (a) the physical table/column names actually resolve and the guarded UPDATE mutates the right row; (b) the `NOT VALID` CHECK actually rejects an oversell write and rolls back the enclosing order transaction; (c) two concurrent transactions racing the last seat cannot both win (the headline "concurrency is now a contract" claim); (d) `ensureInventoryCheckConstraint`'s DDL is accepted by real Postgres and its `EXCEPTION WHEN duplicate_object` idempotency holds on a second boot. A schema/API drift (Strapi upgrade, `collectionName`/`columnName` rename) or a DDL that never installs (the catch is non-fatal by design) would break 100% of ticket purchases or leave the backstop silently absent — with a fully green suite. The generic "integration suites don't boot in this env" is already tracked (DW-5, DW-45); this entry pins the specific coverage this change needs: a booted-Postgres test that (1) seeds a published sub-event, runs a fitting sale + an oversell + a refund and asserts persisted `tickets_sold` and the `TICKET_SOLD_OUT` throw; (2) asserts an oversell write is rejected by the CHECK; (3) asserts a concurrent two-transaction race yields at most `ticketsAvailable` sold. Confirmed independently by all three review agents (Blind Hunter, Edge Case Hunter, Verification Gap). `followup_review_recommended` on the source spec was set for this reason.
status: open

### DW-130: The public events sanitizer is not fail-closed against the `eventGroup` relation — a future populate through it would re-leak raw per-showtime inventory

origin: follow-up review of spec-public-inventory-leak-sanitization.md (2026-07-13)
location: apps/strapi/src/plugins/events-manager/server/src/utils/sanitize-public.ts
reason: (LOW) `sanitizePublicEvent` recurses only into `venue`, `screenings`, and `performances`. The event content-type also has an `eventGroup` relation (`content-types/event/schema.json`) to another event whose `screenings`/`performances` carry raw `ticketsSold`/`ticketsAvailable`. `eventGroup` is spread through untouched (`clone = { ...raw }`), so if any future populate path pulls it (with its nested events/screenings), those raw counts and venue-internal fields re-leak on the public `/events`, `/events/trending`, and `/events/:documentId` responses. Not currently reachable — `eventGroup` is absent from both `EVENT_POPULATE` and `DETAIL_POPULATE` — so this is latent, not an active leak. It is called out because the sanitizer's own docstring claims it is "fail-closed... follows the schema, not whatever the current controller populate happens to include," and the prior review pass hardened the sibling `performances` relation and the embedded `ticketTiers[]` component on exactly this reasoning; `eventGroup` is the one inventory-bearing relation left uncovered. A proper fix needs a design decision (recurse `sanitizePublicEvent` into `eventGroup` — with a recursion/self-reference guard — vs. strip it from public bodies), which is why it is deferred rather than patched now. Surfaced by Blind Hunter and Edge Case Hunter.
status: open

### DW-131: The homepage `VenueSelector` was not brought along with the selector rework — it discards `truncated` and renders no city, so it silently caps its list and still cannot disambiguate same-named venues

origin: follow-up review of spec-dw-24-25-venue-selector-fixes.md (2026-07-31)
location: apps/client/src/features/events/components/VenueSelector/VenueSelector.tsx, apps/client/src/app/[locale]/page.tsx, apps/client/src/app/[locale]/page.venue.tsx
reason: (MEDIUM) The spec's "do not restyle or restructure `VenueSelector`" boundary kept the homepage picker out of scope, but the selector route change altered its data underneath it. (a) Truncation: `/venues/venues/selector` now honours pagination for real (the old `/venues` endpoint ignored `pageSize` and returned everything), so a city with >100 approved cinemas now yields an arbitrary alphabetical first page. Both homepages call `getVenuesForSelector` and consume only `venuesResult.venues` (`page.tsx:162`, `page.venue.tsx:231`), discarding `venuesResult.truncated`, and `VenueSelector` has neither a truncation affordance nor a search box — so the capped list is presented as complete, indistinguishable from "that venue does not exist". (b) DW-25: the fetcher now supplies `city` for every venue, but `VenueSelector` renders `{selectedVenue ? selectedVenue.name : labels.allVenues}` (`VenueSelector.tsx:176-178`) and name-only rows, so two identically-named "Pathé" venues remain indistinguishable on the homepage — the exact bug DW-25 exists to fix, now fixed on only one of the two pickers. `VenueSelector` also has no test and no story anywhere in the repo. Not reachable at current catalogue volume for (a); (b) is reachable today. Raised in the prior review pass as a deferred finding that was not written to the ledger (the run was invoked with a do-not-edit-ledger instruction); re-surfaced independently by Blind Hunter and the Verification Gap reviewer.
status: open

### DW-132: Venue-picker city names are not locale-aware — `city` is a localized content type reached through a non-localized `venue`, so Arabic visitors see Latin-script city names next to Arabic region names

origin: follow-up review of spec-dw-24-25-venue-selector-fixes.md (2026-07-31)
location: apps/strapi/src/plugins/venues/server/src/services/venue.ts, apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json
reason: (MEDIUM) `city` is i18n-enabled including its `name` (`plugins/geography/.../content-types/city/schema.json` — `pluginOptions.i18n.localized: true`), but `venue` has no `pluginOptions` block at all, so the venue UID is not localized. `findVenuesForSelector` populates `{ cityRef: true }` with no locale propagation, so `toSelectorVenue`'s `cityRef?.name` projects whichever locale the relation happens to resolve to. The DW-25 city suffix therefore renders in a fixed locale while the sibling `EventLocationFilter` — fed by `getRegions(locale)` — renders its region/city names in the active locale, producing mixed scripts inside a single filter bar for `ar` (and potentially `en`) visitors. Corollary: `locale` is threaded into the selector's `findMany`/`count`/`findOne` calls where it is a no-op against a non-localized UID, and it fragments the client's 1-hour `revalidate` cache three ways for byte-identical data. A proper fix needs a decision (localize the `venue` content type, or resolve `cityRef` in the requested locale via a second localized lookup), which is why it is deferred rather than patched. Surfaced by Blind Hunter.
status: open

### DW-133: The venue combobox scores opaque Strapi documentIds as search text, so typed queries match venues with no relationship to any visible text

origin: follow-up review of spec-dw-24-25-venue-selector-fixes.md (2026-07-31)
location: apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx
reason: (LOW) Each row is `<CommandItem value={venue.documentId} keywords={[name, city]}>` (`EventVenueFilter.tsx:284-289`). cmdk's default filter subsequence-scores the item `value` alongside `keywords`, so a query is matched against the 24-character opaque documentId as well as the name and city. Confirmed by probe during review: two venues named "Alpha"/"Beta" with opaque ids, typing a three-character fragment of Alpha's id surfaces Alpha and hides Beta — a match with no relationship to anything on screen. On real ids a short query subsequence-matches a large fraction of the catalogue, so the DW-25 promise ("typing a city name narrows the list") degrades into apparently-random results. Pre-existing (the `value={documentId}` pattern predates this change) but squarely inside DW-25's blast radius. Fix is a custom cmdk `filter` scoring only name+city, or moving the documentId off `value`; both need a check that `onSelect`'s payload still resolves. Surfaced by Blind Hunter. Note: this also made the DW-25 city-keyword test pass for the wrong reason — that half was patched in this pass by switching the fixture to opaque documentIds.
status: open

### DW-134: A URL venue the `include` hatch cannot supply (unapproved, suspended, or bogus documentId) leaves the events filter hidden or mislabeled "All venues" while the listing stays venue-filtered — an unclearable dead-end

origin: follow-up review of spec-dw-24-25-venue-selector-fixes.md (2026-07-31)
location: apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx
reason: (MEDIUM) `include` guarantees a labelable selection only for an _approved_ venue; the spec's I/O matrix deliberately makes an unknown/unapproved `include` a silent no-op (200, `data` unchanged) and says nothing about the trigger. Two residual states follow. (a) The venue resolves to nothing and the scoped list is non-empty: `selectedVenue` is `undefined`, so the trigger renders `labels.allVenues` (`EventVenueFilter.tsx:240`) while `filters.venue` still filters the listing — the precise mislabel DW-24 was raised about, just from a different cause. (b) The venue resolves to nothing and the scoped list is empty (a cinema-less city, or a suspended venue): `if (venues.length === 0) return null` (`EventVenueFilter.tsx:209`) hides the whole control, so the user cannot clear a filter that is producing zero events. The equivalent hole exists on the homepage `VenueSelector`. Fix needs new copy (an "unknown venue" label in fr/en/ar) plus a decision to keep a clear-only control alive when `value.venue` is set, which is why it is deferred rather than patched. Surfaced by the Edge Case Hunter.
status: open

### DW-135: Changing region or city keeps a now-out-of-scope venue selected, so the listing goes empty right after the user widens or moves their location filter

origin: follow-up review of spec-dw-24-25-venue-selector-fixes.md (2026-07-31)
location: apps/client/src/features/events/components/EventsListing/EventsListing.tsx
reason: (LOW) `handleLocationChange` pushes `{ ...latestFiltersRef.current, region, city }` (`EventsListing.tsx:146-158`) and never clears `venue`. Before this change the picker was unscoped, so a venue from another region was merely an odd pairing; now the picker is region/city-scoped, so after a location change the active venue is by construction outside the offered set — the `include` hatch keeps it correctly labeled, and the AND of location + venue yields an empty listing the user did not ask for. `EventLocationFilter` and the listing island were explicitly out of scope for this spec ("do not restyle or restructure"). Fix is a product decision: clear `venue` on a location change, or keep it and surface why the listing is empty. Surfaced by the Edge Case Hunter.
status: open

### DW-136: No test covers the events route's selector wiring — the scoping that _is_ the DW-24 fix, and the `scoped`/`truncated` props, can all be deleted with a fully green suite

origin: follow-up review of spec-dw-24-25-venue-selector-fixes.md (2026-07-31)
location: apps/client/src/app/[locale]/events/page.tsx
reason: (MEDIUM) `events/page.tsx:131-136,150,177-178` is the only production producer of the picker's feed and of `venuesScoped`/`venuesTruncated`, and there is no test of any kind under `src/app/[locale]/events` (no route test, no e2e layer in the repo). Every existing test observes the layers on either side but never this one: `venues.test.ts` asserts only that options _it passes in_ are forwarded as flat params, and the `EventVenueFilter` tests inject `scoped`/`truncated` directly. Two concrete regressions ship green: (a) deleting `regionDocumentId: filters.region` or the `type` scope restores the DW-24 bug (out-of-region / non-cinema venues back in the picker); (b) dropping the `venuesScoped` forward silently falls back to the prop default `false` — the props are optional, so it type-checks — and a saved venue outside the current scope is purged from `localStorage` again, exactly the behavior the spec added `scoped` to prevent. Related but distinct from the mock-only client↔Strapi contract gap for `/venues/venues/selector` (both sides fail soft: the fetcher returns an empty result and the filter renders `null`, so a wire-contract break makes the venue filter silently vanish site-wide with no failing test — the generic "integration suites don't boot in this env" limitation is already tracked as DW-5/DW-45). Fix is a vitest test that mocks `@/lib/strapi-api/content/venues` and awaits the route component, asserting the options object and the forwarded props. Surfaced by the Verification Gap reviewer.
status: open

### DW-137: Nothing seeds the `credit-role` vocabulary, so on a fresh environment the required `credit.creditRole` relation makes every crew credit unsaveable

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/scripts/seeds/index.ts
reason: (MEDIUM) `creative-works.credit.creditRole` is `required: true` since 2C.3, and the admin picker plus the contribute route are now the only writers of it — but no seed creates a single `credit-role` record. `scripts/seeds/index.ts` seeds genres, persons, cities, regions, categories and creative-works; `scripts/seeds/clear.ts:39` _deletes_ `plugin::creative-works.credit-role`, so the omission is asymmetric and looks like an oversight rather than a decision. Consequence on any freshly seeded environment: `useCreditRoles()` returns `[]`, the admin credits editor renders its "no credit roles available" banner with an inert picker, and no work carrying a crew credit can be saved at all. The DW-10 pass made the state visible and inert rather than silently broken, but the vocabulary itself still has to come from somewhere. Fix is a seed file (or a bootstrap in the creative-works plugin `register`) covering at least the slugs the contribution wizard collects — `THEATRE_ROLES` in `apps/client/src/features/contribute/schemas/play-contribution.ts` — plus the generic `other` record the form's customRole rule keys on. Surfaced by all three reviewers.
status: open

### DW-138: `GET /api/credit-roles` is not a registered route, so the contribute route's slug lookup 404s and every play submission is rejected

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts
reason: (MEDIUM) `fetchCreditRoleId` (`apps/client/src/app/api/contribute/play/route.ts`) resolves the wizard's role slug with `GET ${STRAPI_URL}/api/credit-roles?filters[slug][$eq]=…`, but the creative-works plugin declares only four custom GET routes in `content-api.ts` and exports controllers for `creative-work` and `person` only — there is no `credit-role` controller and no CRUD registration. `credit-role` is also `draftAndPublish: true`, so even with a route the default REST query would hide unpublished records. Both failure modes land in the same place: the lookup misses, `creditRole` is omitted, and the required relation makes Strapi reject the whole submission with a generic `SUBMISSION_FAILED`. Fix is either registering a read route + granting the REST token `credit-role.find`, or replacing the lookup with a server-side resolution that does not go through the public API. Same root cause as DW-139. Surfaced by all three reviewers.
status: open

### DW-139: The whole `POST /api/contribute/play` write path is non-functional — `POST /api/creative-works` and `/api/persons` are not registered routes

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts
reason: (MEDIUM) `creative-works/server/src/routes/content-api.ts` declares four custom GET routes and no write routes, so both `POST ${STRAPI_URL}/api/creative-works` (the submission itself) and `POST ${STRAPI_URL}/api/persons` (new-person creation) have no handler and no permission grant. The DW-10 pass corrected the _shape_ of that payload against the post-2C.3 catalog model — cast/crew split, `creditRole` relation, `videoType` — and explicitly scoped route creation out (recorded in the spec's Design Notes), so the contribution wizard still cannot persist anything. Fix needs public write routes, a permission policy, and a decision on how anonymous submissions are authorized and rate-limited. Pre-existing; carried forward here because the corrected payload is now the only thing standing between the wizard and a working submission. Surfaced by the Verification Gap reviewer.
status: open

### DW-140: The contribution wizard collects a character name for every actor and the route silently discards it

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/client/src/app/api/contribute/play/route.ts
reason: (MEDIUM) `creditSchema.character` is still a free-text field the wizard collects and `ReviewStep` displays, but since 2C.3 `creative-works.cast.character` is a relation to a `character` record and the route has no way to create one — the cast mapping emits `{person, billing}` and drops the text, with only a code comment recording it. The contributor fills in a field, sees it echoed on the review screen, gets a success response, and the data is gone: not stored, not logged, not stashed in `customRole` or the synopsis for an admin to reconcile from. Fix is a decision between find-or-create of `character` records from the route (which needs DW-138/DW-139's routing story) and removing the field from the wizard; either way the current state promises persistence it does not deliver. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-141: The admin cast editor can only link pre-existing `character` records, a net regression against the free-text character field it replaced

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/CharacterCombobox.tsx
reason: (LOW) `CharacterCombobox` is search-only over `plugin::creative-works.character`: no create-from-here affordance, no empty-state copy when the search returns nothing, and (per DW-137's sibling gap) no seeded characters. Before 2C.3 an editor typed the character name straight into the credit row; now, until someone creates the record in the content manager, cast rows can only be saved with `character: null`. `PersonCombobox` has the same shape, so this is a consistent plugin-wide limitation rather than a DW-10 defect, and it is genuinely lower stakes than the credit-role equivalent because `cast.character` is optional. Fix is an inline create mirroring the contribution wizard's new-person path, or a documented workflow pointing editors at the content manager first. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-142: The events-manager admin catalog hooks never pass `locale`, so localized content types are always read in the default locale

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
reason: (LOW) `credit-role`, `character`, `person` and `creative-work` all declare `pluginOptions.i18n.localized: true`, but no hook in `useCreativeWorks.ts` / `usePeople.ts` sends a `locale` param to the content-manager API — not the new `useCreditRoles()` / `useCharacterSearch()` and not the pre-existing list/search/detail hooks. Every picker therefore offers the default-locale records regardless of which locale of the work is being edited, and a picked record's `name` is the default-locale string. This is a plugin-wide pattern rather than something DW-10 introduced, and it is invisible while the catalog is single-locale, which is why it is deferred rather than patched: the fix is a locale-threading decision across the whole admin catalog surface (where does the active locale come from, and does the WorkForm edit one locale or all of them?). Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-143: A rejected play submission leaves orphan draft `person` records behind, and each retry creates more

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/client/src/app/api/contribute/play/route.ts
reason: (LOW) `resolvePersonId` creates every unknown contributor-named person in Strapi _before_ the work itself is POSTed, and there is no rollback, no reuse lookup and no transaction spanning the two. When the work POST fails — which per DW-138/DW-139 is currently the only outcome, and stays possible afterwards on any validation error — the draft persons already created stay in the catalog, and a contributor who fixes their form and resubmits creates a fresh duplicate of each. Fix is either creating persons only after the work lands (and patching the relations in), or a find-by-name lookup before create so retries converge instead of accumulating. Pre-existing (the create-then-post ordering predates DW-10) and only reachable once the write path works at all. Surfaced by the Blind Hunter.
status: open

### DW-144: No `.tsx` file under `apps/strapi` is typechecked — the admin plugin's entire React surface is compiled by nothing

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/tsconfig.json
reason: (MEDIUM) `apps/strapi/tsconfig.json` includes `./**/*.ts` and `./**/*.js` — no `.tsx` glob — and sets no `jsx` option, so `npx tsc --noEmit -p tsconfig.json` never sees a single admin component. Every `.tsx` file in `plugins/*/admin/src` (the WorkForm editors, the Catalog views, the venue and ticketing admin surfaces) is therefore verified by neither the type gate nor the jest gate, which is `testEnvironment: node` and collects `*.unit.test.ts` only. The DW-10 pass added ~305 lines of new components (`CastEditor`, `CharacterCombobox`, `CreditRoleSelect`) plus a rewritten `CreditsEditor` under exactly that blind spot: a wrong prop name, a missing required prop, or a `null` deref in those files ships green through `yarn test` and `yarn type-check` alike, and only surfaces when an editor opens the form. A prop-type break was in fact caught in an earlier pass only because it happened to also touch a `.ts` file. Fix is adding `./**/*.tsx` plus `"jsx": "react-jsx"` to the strapi tsconfig (or a dedicated admin tsconfig project) and fixing whatever backlog that first surfaces — the size of that backlog is unknown, which is why this is deferred rather than patched. Surfaced by the Blind Hunter.
status: open

### DW-145: The events-manager admin has no component/hook test harness, so every failure mode the DW-10 pass deliberately designed is unverified

origin: follow-up review of spec-dw-10-catalog-admin-workform-rebuild.md (2026-08-03)
location: apps/strapi/jest.config.cjs
reason: (MEDIUM) `schema.unit.test.ts` covers the pure functions (`workToApiPayload`, `workToFormValues`, the zod schemas, `clampBilling`, `WORK_POPULATE`) and nothing else, because the jest gate runs `testEnvironment: node` over `*.unit.test.ts`. The stateful behaviour added and hardened across the DW-10 passes therefore has no test at all: `useCreditRoles()`'s multi-page fetch loop, its `error`-vs-empty distinction and the new truncation signal; `CreditsEditor`'s two different danger banners; `CreditRoleSelect`'s inert-when-empty gating; the generic-role gating of the `customRole` input; and `useCharacterSearch`'s debounce. Collapsing any of them — a single-page fetch, `setCreditRoles([])` in place of `setError`, a dropped `disabled` — leaves all 428 strapi tests green while making a required relation unpickable. `@testing-library/react` and `jest-environment-jsdom` are already in `apps/strapi` devDependencies, so the fix is a jsdom-docblock test project plus a `useFetchClient` mock; it is deferred rather than patched because it is a new test-harness layer for the plugin rather than a change to this story's code. Surfaced by the Verification Gap reviewer and the Blind Hunter.
status: open

### DW-146: Follow-up review still recommended for dw-catalog-admin-workform-rebuild after the damping cap was spent

origin: review-budget-followup
location: n/a
source_spec: `spec-dw-10-catalog-admin-workform-rebuild.md`
severity: low
reason: The follow-up-review damping cap (limits.max_followup_reviews = 1) was spent with the story finalized (status: done, verify green) while the review pass still recommended an independent follow-up. The work was committed by bmad-loop run 20260712-090054-5834; this entry preserves the lingering recommendation for a deliberate later review.
status: open

### DW-147: The `credit-role` NOT NULL tightening ships with no backfill migration

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/database/migrations/
reason: (MEDIUM) `credit-role/schema.json` now declares `slug` and `department` as `required: true` (department defaulting to `other`), but `apps/strapi/database/migrations/` contains only `.gitkeep`, so the NOT NULL column sync is left entirely to Strapi's automatic schema sync at boot. Against the empty catalog this change targets that is harmless, but any environment already holding `credit_roles` rows with a NULL `slug` or `department` can fail the ALTER, and `seedCreditRoles` is slug-keyed skip-if-exists so it never backfills them. Fix is a migration that fills `department = 'other'` and derives a slug from `name` where either is NULL, landing before the schema tightening. Surfaced by all three reviewers.
status: open

### DW-148: The client shorts feature still reads the phantom `trailer` / `directors` fields the seed write path dropped

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/client/src/features/shorts/types/shorts.types.ts
reason: (MEDIUM) `shorts.types.ts` still declares and maps `trailer` and `directors` as top-level `creative-work` fields, consumed by `ShortsHero.tsx`, `ShortFilmDetail.tsx`, `ShortFilmDetailPage.tsx` and `shorts/[slug]/page.tsx`. Neither key has existed on the content type since 2C.3, and the seed runner no longer writes them, so those surfaces render empty director lists and no trailer for every seeded short. The events feature already does this correctly — `eventMappers.ts` derives directors from `credits[]` — so the fix is to follow that pattern and read `credits[]` / `videos[]` instead. Pre-existing (the read path was never migrated with the schema); out of scope for a seeds-and-schema spec. Surfaced by the previous review pass of this spec, not previously transcribed to the ledger.
status: open

### DW-149: Seeded trailers get the legacy `video.type` default `TEASER`, while the contribution wizard deliberately writes `type: null`

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/scripts/seeds/utils/creative-work-relations.ts
reason: (MEDIUM) `buildVideos` emits `{ url, videoType: "trailer" }` and omits the legacy `type` enum, exactly as the spec's I/O matrix prescribes — but `src/components/common/video.json` declares `"type": { ..., "default": "TEASER" }`, so Strapi stamps `TEASER` onto every seeded row. `apps/client/src/app/api/contribute/play/route.ts` takes the opposite approach with an explicit comment ("sent as an explicit null so the legacy enum's schema default is not stamped onto brand-new rows"), so the two write paths now produce different shapes for the same component. No consumer reads `type` (the component description marks it historic-rows-only), which is why this is deferred rather than patched — but the two paths cannot both be right, and the decision is which one to align. Not patched here because the emitted payload is fixed by the frozen intent contract's I/O matrix. Surfaced by the Blind Hunter and the Verification Gap reviewer.
status: open

### DW-150: No boot-level test proves a seed run actually persists non-empty `credits` / `cast` / `videos`

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/scripts/seeds/index.ts
reason: (MEDIUM) The DW-13 fix is verified entirely by pure unit tests over `buildCreativeWorkData`; nothing exercises `scripts/seeds/index.ts` itself. Moving `seedCreditRoles` below `seedCreativeWorks` in the pipeline, or renaming the `"director"` key it is looked up by, leaves `directorRoleId` undefined so every work is created with `credits: []` — and the run still prints `Created: 25` and exits 0 while all 35 unit tests pass. The write shape is equally unproven: the key-set guard compares key NAMES against the schema JSON and never demonstrates that Strapi accepts bare documentId strings for `credit.person` / `credit.creditRole` / `cast.person` rather than a `{ connect: [...] }` form. Fix is an opt-in boot-based suite in the existing `tests/` integration style that runs the credit-role + creative-work seeders against a live DB and re-reads one work with those relations populated. Deferred rather than patched because it is a new test harness (needs a database), not a change to this story's code. Surfaced by the Verification Gap reviewer and the Blind Hunter.
status: open

### DW-151: The wizard crew vocabulary guard is a hand-copied slug list, so cross-app drift fails nothing

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/scripts/seeds/utils/creative-work-relations.unit.test.ts
reason: (MEDIUM) `WIZARD_CREW_SLUGS` in the seed unit test is a literal array retyped from `roleInfo` in `apps/client/src/features/contribute/components/steps/CreditsStep.tsx` (currently identical minus `cast`). It only guards one direction: adding a role to the wizard adds nothing to the list and breaks no test, which is precisely the drift the guard was written to prevent. Because `credit.creditRole` is a required relation, a wizard role with no seeded credit-role makes every submission using it fail Strapi validation — and the client's own `route.test.ts` stubs the `/api/credit-roles` lookup with a per-test map, so it never sees the real vocabulary either. Fix is a shared vocabulary constant in a workspace package, or a client-side test that walks `roleInfo` against the seeded file. Cross-app import from `apps/strapi` is not currently possible, which is why this is a shared-package decision rather than a patch. Surfaced by all three reviewers.
status: open

### DW-152: `credit-roles.json` is French-only although `credit-role` is a localized content type

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/scripts/seeds/data/credit-roles.json
reason: (LOW) `credit-role` declares `pluginOptions.i18n.localized: true` and `name` is a localized field, but the seed file carries only French names and `seedCreditRoles` never passes a `locale`, so the `ar` and `en` locales listed in `scripts/seeds/config.ts` get no credit-role names at all. This matches every existing seeder — none of them runs a locale pass, and `creative-works.json` carries `title_ar`/`synopsis_ar` that the seeder discards for the same reason — so it is a seeder-wide gap rather than a defect this change introduced. Fix is a locale pass across the seed runner (decide the source-of-truth shape for translated seed data first), not a one-file edit. Related to DW-142 on the read side. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-153: Nothing typechecks `apps/strapi/scripts/` — the new seed helpers are compiled by no gate

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/tsconfig.json
reason: (LOW) `apps/strapi/tsconfig.json` excludes `scripts/`, and `jest.config.cjs` runs ts-jest with `diagnostics: false`, so neither `yarn type-check` nor `yarn test` type-checks a single line of `scripts/seeds/` — including the ~500 lines of new helper, seeder and test code this change added. The type annotations there are documentation, not enforcement; the only real gate is the runtime unit test. Fix is either adding `scripts/` to a typecheck project (and fixing whatever backlog that first surfaces, size unknown) or enabling ts-jest diagnostics for that path. Pre-existing config; same blind-spot family as DW-144, which covers `.tsx` under the same tsconfig. Surfaced by the Blind Hunter.
status: open

### DW-154: The seed corpus is too thin to exercise the catalog surfaces the DW-13 fix unblocked

origin: follow-up review of spec-dw-12-13-catalog-schema-and-seed-integrity.md (2026-08-03)
location: apps/strapi/scripts/seeds/data/creative-works.json
reason: (LOW) Of the 25 works in the corpus only 12 carry `directors`, 6 carry `cast` and 5 carry a `trailer`, so even with the mapping fixed 13 works seed with empty `credits[]`, 19 with empty `cast[]` and 20 with empty `videos[]`. The plumbing is correct and every referenced person/genre slug resolves (now asserted in the unit gate), but a seeded environment still cannot meaningfully exercise the admin WorkForm's cast/crew editors or the public detail pages. Fix is content work on the seed data, not code. Surfaced by the previous review pass of this spec, not previously transcribed to the ledger.
status: open

### DW-155: `VenueFormModal` silently swallows every server-side rejection

origin: follow-up review of spec-dw-15-venue-website-url-validation.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx
reason: (MEDIUM) The modal destructures only `{ createVenue, updateVenue, isLoading }` from `useVenueMutations()` and never reads the hook's `error`; both mutations in `useVenuesEnhanced.ts` catch, store the error internally and return `null`, and `handleSubmit` ends with a bare `if (result) onSuccess()` — no `else`. Any server rejection therefore produces nothing on screen: the spinner stops and the modal sits there. Reproduce by creating a venue whose name collides with an existing `slug` (a `uid` attribute, so unique): the POST 400s and the editor gets no toast, no field error, no message, and can only click Save forever. This is pre-existing behavior, not introduced by DW-15 — but it is the reason the DW-15 lifecycle's `ValidationError` (message + `details.code`) reaches no editor on this surface; only the new client-side check does. Fix is to surface the hook's `error` in the modal (banner or field-level mapping keyed on `details.code`), which is a change to the modal's error contract rather than to the website rule. Surfaced by all three reviewers.
status: open

### DW-156: Clearing `description`/`address`/`phone`/`email`/`capacity` in the venue form is silently ignored

origin: follow-up review of spec-dw-15-venue-website-url-validation.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx
reason: (MEDIUM) `handleSubmit` builds its payload with `description: formData.description || undefined` and the same `|| undefined` shape for `address`, `phone`, `email` and `capacity`. `undefined` is dropped by `JSON.stringify`, so an emptied field is simply absent from the PUT body, Strapi's partial update leaves the stored value in place, and `onSuccess()` still fires — the editor is told the save worked while the old value survives. Reproduce by deleting a venue's phone number and saving: the list refetches showing the old number. DW-15 fixed exactly this failure mode for `website` only (it now submits the trimmed value or `null`); the other five fields still exhibit it. Fix is to apply the same explicit-`null` treatment across the payload, which needs a per-field decision about whether `null` or omission is correct for each attribute — hence deferred rather than patched inside a website-validation story. Surfaced by the Blind Hunter.
status: open

### DW-157: Four events-manager admin component tests match no runner's glob and never execute

origin: follow-up review of spec-dw-15-venue-website-url-validation.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/components/**tests**/
reason: (MEDIUM) `VenueCard.test.tsx`, `MovieCard.test.tsx`, `EventCreationModal.test.tsx` and `ImportTab.test.tsx` are run by nothing: `apps/strapi/jest.config.cjs` sets `testMatch: ["**/*.unit.test.ts"]` in a `node` environment, and the only other config in the repo (`apps/client/vitest.config.ts`) scopes `include` to `apps/client/src`. They read as coverage of the venue/event admin surfaces while asserting nothing, which is worse than no tests — DW-15 had to route its form rules into a separate `.ts` module precisely because this gap makes `.tsx` logic unverifiable. Fix is either a jsdom project in the Strapi jest config that picks up `*.test.tsx` (and repairing whatever those four suites currently assert) or deleting them; same blind-spot family as DW-144. Surfaced by the Verification Gap reviewer.
status: open

### DW-158: The `strapi import` write path is unvalidated at every layer, tracked only by a code comment

origin: follow-up review of spec-dw-15-venue-website-url-validation.md (2026-08-03)
location: apps/strapi/src/plugins/venues/server/src/bootstrap.ts
reason: (MEDIUM) `@strapi/data-transfer`'s local-destination provider calls `strapi.db.lifecycles.disable()` for the whole restore and writes through `db.query().create`, so a `strapi import` bypasses the venues DB lifecycle subscriber, the content-type `regex` (the entity validator is bypassed too) and obviously the admin form. DW-15 deliberately scoped this out — a restore is an operator replaying a trusted export, not user input — and documented it in a "KNOWN GAP" block in `bootstrap.ts`. The gap itself is an accepted decision; what is missing is any tracking outside that one paragraph: nothing warns an operator, nothing re-validates after a restore, and the rest of the system now assumes venue `website` values cannot be malformed. This is not specific to `website` — the same disable applies to every lifecycle-enforced invariant in the repo (slug hooks, audit hooks, any future validation subscriber), so a restore can seed data no live write path would accept. Fix is a decision, not a patch: either a post-import validation pass over the affected content types, a pre-import check in the import wrapper, or an explicit written statement that imports are trusted and the invariants are advisory. Surfaced by the Blind Hunter.
status: open

### DW-159: `turbo type-check` never type-checks `apps/client` (script name mismatch), leaving 61 errors ungated

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/package.json, turbo.json
reason: (MEDIUM) `turbo.json` defines a `type-check` task and the CI `Type Check` job runs `yarn type-check` → `turbo type-check`, but `apps/client/package.json` names its script `typecheck` (no hyphen) while `apps/strapi` names it `type-check`. Turbo therefore silently skips the client, and `cd apps/client && npx tsc --noEmit` currently reports **61 errors** that no gate runs. This is also why story 1.10's 40-file `@storybook/react` → `@storybook/nextjs-vite` swap has no automated backstop: ESLint does not resolve imports (verified — a story importing from a nonexistent package still lints clean), vitest's `include` excludes story files, and Storybook's build is broken for unrelated reasons. Fix is a one-word rename, but it cannot land alone: it would immediately turn the CI Type Check job red on the 61 pre-existing errors, so the paydown must come first (same shape as 1.10's lint paydown). Surfaced by the Verification Gap reviewer.
status: open

### DW-160: Five `features/auth` test files match no vitest `include` glob and never execute

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/vitest.config.ts
reason: (MEDIUM) `include` is an explicit allowlist with no `src/features/auth/**` entry, so `RegisterForm.test.tsx`, `PasswordStrength.test.tsx`, `registerSchema.test.ts`, `LoginForm.test.tsx` and `loginSchema.test.ts` are never run (`npx vitest list` = 616 tests, zero under `features/auth`). They read as coverage of the registration/login surfaces while asserting nothing. Story 1.10 edited `RegisterForm.tsx` and `ProfileForm.tsx` with no test able to catch a regression. Fix is to add the glob and repair whatever those suites currently assert. Same blind-spot family as DW-157. Surfaced by the Verification Gap reviewer.
status: open

### DW-161: Root `.eslintrc.js` is dead, broken, and blocks ESLint 10

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: .eslintrc.js
reason: (LOW) The repo-root `.eslintrc.js` extends `@tiween/eslint-config/library.js`, which is not an export of that package (the `exports` map ships `./library` → `library.mjs`; no `.js` file exists). ESLint 9 flat config ignores it and no root lint script runs, so it is inert — but it is legacy eslintrc-era config that ESLint 10 drops entirely, and it is the only thing referencing the `library` preset. Story 1.10 left it alone to stay in scope; story 1.11 does the equivalent deletion for `apps/strapi`. Fix is to delete it (or give the root a real flat config if root-level linting is wanted). Surfaced by the Blind Hunter and the Verification Gap reviewer.
status: open

### DW-162: Two of the three shared ESLint presets are loaded by nothing, so their correctness is unverified

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: packages/eslint-config/library.mjs, packages/eslint-config/react-internal.mjs
reason: (LOW) `apps/client` is the only workspace with a `lint` script, and its config imports `@tiween/eslint-config/next` only. Nothing imports `library.mjs` or `react-internal.mjs` (the sole reference is the broken `.eslintrc.js` of DW-161), so a syntax error or a reintroduced severity downgrade in either would ship silently — `yarn lint` would still exit 0. Story 1.10's acceptance evidence is therefore about `next.mjs` alone. `packages/prettier-config` and `packages/typescript-config` are likewise unlinted. Fix is either a lint script per package or a smoke test that imports both presets and asserts they produce a valid flat config. Surfaced by the Verification Gap reviewer.
status: open

### DW-163: `yarn.lock` pins an incompatible `@storybook/addon-docs` / `storybook` pair, so `build-storybook` cannot succeed

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: yarn.lock, apps/client/package.json
reason: (MEDIUM) `apps/client/package.json` pins `storybook@10.1.11` and `@storybook/addon-docs@^10.1.11`, but the lockfile resolves the addon to `10.4.6`, whose preset imports `Tag` from `storybook/internal/core-server` — an export `10.1.11` does not have. `yarn workspace @tiween/client run build-storybook` therefore dies with `SB_CORE-SERVER_0002 CriticalPresetLoadError` at preset load, before any story file is parsed, on every commit (reproduced on the pre-1.10 baseline tree). Storybook is not in CI, so nothing reports it. Fix is to align the pins (exact-pin the addon to the storybook version, or upgrade storybook) and, ideally, add a Storybook build to CI so it cannot rot again. Surfaced during story 1.10 verification and confirmed by the Verification Gap reviewer.
status: open

### DW-164: `TicketScanner` never invokes its required `onScan` prop — scan results are never delivered

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/src/features/scanner/components/TicketScanner/TicketScanner.tsx
reason: (MEDIUM) `onScan: (qrData: string) => void` is a required prop, documented in the component's JSDoc usage example and supplied by six stories, but the component contains no call site — QR decoding is not implemented, so a caller's handler can never fire. This pre-dates story 1.10; what 1.10 changed is that the unused destructured binding was deleted to clear `@typescript-eslint/no-unused-vars`, removing the last automated signal (the prop's JSDoc now carries a "NOT WIRED UP" note instead). Fix is to implement decoding and call `onScan`, or make the prop optional until then. Epic 8 (B2B ticket validation scanner) is the natural home. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-165: `MapMarker` ignores its `isSelected` prop and venue-type marker colouring is dead

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/src/features/events/components/Map/MapMarker.tsx
reason: (LOW) `isSelected?: boolean` remains in the exported `MapMarkerProps` (documented "Whether this marker is currently selected/highlighted") but nothing in the component reads it, so callers passing it get no visual effect; the `VENUE_TYPE_COLORS` lookup that `createMarkerIcon`'s JSDoc still describes is likewise unused. Pre-dates story 1.10, which deleted the unused bindings and annotated the prop as "NOT WIRED UP". Fix is to implement selected/`venue-type` marker styling or remove the prop and the stale doc comment. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-166: A newly picked avatar file is stored in state that nothing reads, so avatar uploads are silently dropped

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/src/features/auth/components/ProfileForm/ProfileForm.tsx
reason: (MEDIUM) `handleAvatarSelect` writes the chosen `File` into `avatarFile` state, but `handleSubmit` submits only `name/language/region/avatarUrl/email` — the file is never uploaded or passed to the caller, so the user sees a local preview and their avatar silently never changes. Pre-dates story 1.10, which elided the unread binding to `const [, setAvatarFile]` to clear the unused-var error. Fix is to upload the file (or pass it through `onSubmit`) and drop the local-only state. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-167: Two contribution-flow error paths are captured and then discarded

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/src/features/contribute/components/steps/ReviewStep.tsx, apps/client/src/features/contribute/components/credits/PersonSearchCombobox.tsx
reason: (MEDIUM) `ReviewStep` sets reCAPTCHA `loaded`/`error` state from the script's `onLoad`/`onError` handlers but reads neither, so a script-load failure is invisible and the user submits with no captcha token (the live `// TODO: Get reCAPTCHA token here` is the other half of that gap). `PersonSearchCombobox` no longer reads the `error` that `usePersonSearch` still returns, so a failed search renders the "no person found" empty state — inviting the contributor to create a duplicate person record. Both pre-date story 1.10, which elided/dropped the unread bindings to clear unused-var errors. Fix is to render both error states (and block submit while the captcha script has not loaded). Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-168: Three Strapi type errors fail `yarn type-check` and `yarn test` repo-wide (CI Type Check likely red)

origin: review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts
reason: (MEDIUM) Three `TS2339` errors (`nextScreeningDate`, `lastScreeningDate`, `venueName` on type `{}`) at lines 103-105 make `@tiween/admin`'s `type-check` and `build` fail, which fails root `yarn type-check` and — because the turbo `test` task depends on `^build` — root `yarn test` too. The client suite itself is green (63 files / 616 tests). The generated Strapi types are committed, so this is not a local-environment artifact; the CI `Type Check` job runs the same command. Introduced no later than `66f15c0` (story 5.3). Story 1.10 left `apps/strapi` untouched by design. Fix belongs with the Strapi lint/type work in story 1.11. Surfaced during story 1.10 verification.
status: resolved
resolution: Fixed in story 1.11 (`_bmad-output/implementation-artifacts/spec-1-11-bring-strapi-backend-under-lint.md`). The enrichment record shape was extracted into a `ScreeningInfo` type and `info` annotated as `Partial<ScreeningInfo>`, so `?? {}` no longer widens to `{}`. Type-level only; runtime output identical. `corepack yarn build:strapi` and `npx tsc --noEmit` in `apps/strapi` are both green.

### DW-169: Four whole-file `eslint-disable` blocks survive the story-1.10 paydown as invisible blanket escape hatches

origin: follow-up review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/src/app/api/preview/route.ts, apps/client/src/components/elementary/ImageWith{Blur,Fallback,Plaiceholder}.tsx
reason: (MEDIUM) Story 1.10 removed the repo-wide severity downgrade and required every remaining relaxation to be narrowly scoped and justified, but four pre-existing file-level disables were never audited because a file-level disable produces no ESLint finding and so never appeared in the 245-problem baseline: `/* eslint-disable no-console */` in `api/preview/route.ts` (3 `console.log` calls, silenced for the whole file rather than the scoped `console.info` allowance the story introduced) and `/* eslint-disable jsx-a11y/alt-text */` in the three `ImageWith*` wrappers. They are exactly the class of blanket silencing the story's "Never" clause forbids, one scope level down. Fix is an audit: run `eslint --no-inline-config` (or grep for `eslint-disable ` without `-next-line`) to enumerate them, then convert each to a targeted `eslint-disable-next-line` with a `--` justification or fix the underlying violation. Surfaced by the Blind Hunter.
status: open

### DW-170: Newsletter subscriber email addresses are logged to stdout, now via a config-approved channel

origin: follow-up review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: apps/client/src/app/api/newsletter/subscribe/route.ts
reason: (MEDIUM) Lines 69 and 81 log the subscriber's email address (`[Newsletter] Successfully subscribed: ${email}` and `Contact already exists: ${email}`) into the server log stream. The PII exposure pre-dates story 1.10, but 1.10 converted both calls from `console.log` to `console.info` and added an `no-console` allow-list override scoped to `src/app/api/**/*.ts` that explicitly permits `info` — so what was previously a lint-flagged line is now a config-blessed one, and the lint gate will never raise it again. Fix is to drop the address from the message (log a hash, a truncated form, or nothing) and, when a structured logger lands, route it through a field the log pipeline can redact. Surfaced by the Blind Hunter.
status: open

### DW-171: Chromatic cannot fail a build, so Storybook's a11y addon gates nothing

origin: follow-up review of spec-1-10-restore-client-eslint-enforcement.md (2026-08-03)
location: .github/workflows/chromatic.yml, apps/client/.storybook/main.ts
reason: (LOW) `.github/workflows/chromatic.yml` sets `exitZeroOnChanges: true` and `autoAcceptChanges: main`, and there is no Storybook test-runner, so a visual or accessibility difference in any story can never turn a build red — `@storybook/addon-a11y` (registered at `main.ts:10`) reports interactively and enforces nothing. This is why story 1.10's ARIA edits to `DateSelector` and `SearchBar` had no gating verification available: the components have no vitest tests, and the stories that do exist are non-gating. Fix is either a `@storybook/test-runner` job with the a11y checks wired in, or dropping `exitZeroOnChanges` on PR builds so a diff must be reviewed. Distinct from DW-163 (the Storybook build itself is currently broken, which must be fixed first). Surfaced by the Verification Gap reviewer.
status: open

### DW-173: `is-ticket-owner` policy authorizes every authenticated user

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/src/plugins/ticketing/server/src/policies/is-ticket-owner.ts
reason: (HIGH) The policy rejects anonymous callers, short-circuits `true` for `strapi-super-admin`, and then unconditionally `return true` for every other authenticated user under the comment "This will be checked in the controller/service". No ownership check is performed, so any logged-in user passes a policy whose name asserts the opposite. Pre-dates this story — 1.11 only renamed the unused `config` / `{ strapi }` params to `_config` / `{ strapi: _strapi }` — but the rename removed the unused-parameter signal that hinted the policy never uses its inputs. Fix is to resolve the ticket/order by `policyContext.params` and compare its owner to `user.id`, plus a unit test for the non-owner path; if enforcement genuinely lives downstream, the policy should be deleted rather than left as a false guarantee. Epic 6 (B2C ticketing) is the natural home. Surfaced by the Edge Case Hunter.
status: open

### DW-174: `apps/client/.lintstagedrc.js` has no prettier entry, so the whole client lost format-on-commit

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/client/.lintstagedrc.js
reason: (MEDIUM) lint-staged applies only the _nearest_ config, so `apps/client/.lintstagedrc.js` (`{"*.{js,jsx,ts,tsx}": ["eslint --max-warnings=0 --no-warn-ignored"]}`) fully shadows the repo-root config for every staged file under `apps/client` — and it contains no `prettier --write`. Verified empirically: staging a mis-formatted `apps/client/__probe.ts` ran eslint only and left the file unformatted. Story 1.11 identified this shadowing hazard while writing the backend equivalent (and widened its own glob to a superset of the root's), but the spec forbade editing `apps/client`. Fix is to add the root's `prettier --write --cache --ignore-unknown` entry on a `*.{js,jsx,ts,tsx,md,css,scss}` glob. Surfaced by the Blind Hunter and the Verification Gap reviewer.
status: open

### DW-175: `yarn format:check` is red on 101 pre-existing files, so CI's Format check cannot pass

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: repo-wide (`.agents/skills/**`, `.claude/skills/**`, `apps/client/**`, `_bmad-output/**`)
reason: (MEDIUM) Running `yarn format:check` (`prettier --check "**/*.{js,jsx,ts,tsx,md,css,scss}"`, the same command the CI `Lint` job runs) reports **101 files** with style issues, none of them under `apps/strapi`. This is unrelated to story 1.11 and pre-dates it — it was measured on the untouched tree at `c23080d`. Almost certainly a consequence of DW-174 (client files never formatted on commit) plus skill/planning markdown written outside the hook. Fix is a one-shot `yarn format` landed as its own commit (it must be isolated: the script's glob is repo-wide, so folding it into a feature branch buries the real diff), after which the hook keeps it clean. Surfaced during story 1.11 verification.
status: open

### DW-176: Strapi admin React surface has neither React lint rules nor type-check coverage

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/src/admin/**, apps/strapi/src/plugins/\*/admin/**, apps/strapi/tsconfig.json
reason: (MEDIUM) Story 1.11 gave the backend a node-appropriate flat config, which by design registers no `eslint-plugin-react`, `react-hooks`, or `jsx-a11y` — but ~74 `.tsx` files under the plugins' `admin/` trees are real React. `apps/strapi/tsconfig.json` also **excludes** `src/admin/` and `src/plugins/**/admin/**`, so `tsc --noEmit` never sees them either. That surface now has a lint gate covering roughly syntax and unused bindings, and no type gate at all — precisely where this story was deleting stray `useEffect` imports. Fix is either a `files:`-scoped React rule block in `apps/strapi/eslint.config.mjs` (the backend must stay self-contained, so the plugins would be declared by `apps/strapi`, not imported from `@tiween/eslint-config`) or a second tsconfig that includes the admin trees in `type-check`. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-177: `no-undef` is inert on the TypeScript dirs that `tsc` also excludes

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/eslint.config.mjs, apps/strapi/tsconfig.json
reason: (MEDIUM) typescript-eslint's `eslint-recommended` turns `no-undef` off for all `.ts`/`.tsx` on the premise that the type-checker catches undefined identifiers. `apps/strapi/tsconfig.json` excludes `scripts/`, `src/admin/`, the plugins' `admin/` trees, and `**/*.test.*`, so for those files neither gate is active: a typo'd or removed identifier ships with lint green and `tsc --noEmit` green. Related to DW-176 but distinct — this one also covers `scripts/**` (crawlers and seed CLIs) and test files. Fix is a `files:`-scoped `no-undef: "error"` block for the tsconfig-excluded TS paths, or extending the TS project to cover them. Surfaced by the Edge Case Hunter.
status: open

### DW-178: Venue bulk-delete discards its `{ success, failed }` result, hiding partial failures

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/pages/Venues/index.tsx, apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenuesEnhanced.ts
reason: (MEDIUM) `useVenuesEnhanced.bulkDelete` returns `{ success: string[]; failed: string[] }` and swallows per-item errors internally, but the caller at `pages/Venues/index.tsx:214` awaits it, discards the value, then unconditionally closes the dialog, clears the selection, and refetches — so a venue that failed to delete reads to the operator as deleted until the refetch quietly puts it back. Pre-dates this story; 1.11's paydown dropped the unread `const result =` binding, which was the last static evidence of the gap (same shape as DW-167 from story 1.10). Fix is to branch on `failed.length` and surface a partial-failure notification. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-179: Three admin-panel props are declared and passed but never read; one export is now orphaned

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx, .../pages/Import/index.tsx, apps/strapi/scripts/crawlers/tunisian-plays/adapters/index.ts
reason: (LOW) `MediaInput`'s `allowedTypes?: ("images"|"videos"|"files"|"audios")[]` stays in the public prop type and `VenueFormModal/index.tsx:470,485` still passes `allowedTypes={["images"]}`, but the body never reads it — the picker only offers a URL field that fabricates `mime: "image/*"`. `StatCard`'s `color?: string` in `pages/Import/index.tsx` is dead with no caller. Both were `_`-prefixed by the 1.11 paydown, which is behaviour-preserving but converts an API lie into a permanently silenced finding. Separately, deleting the unused `createAllAdapters` import from `services/crawler.ts` left that export (`adapters/index.ts:52`) with zero callers. Fix is to delete the dead prop/export and either implement or remove `allowedTypes`. Surfaced by the Blind Hunter and the Edge Case Hunter.
status: open

### DW-180: Backend lint config has no `no-console` or undeclared-env-var rule, unlike the client

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/eslint.config.mjs, apps/strapi/config/cron-tasks.ts
reason: (LOW) `apps/client/eslint.config.mjs` warns on `no-console` (scoped allowances for API routes and stories) and the shared preset carries `turbo/no-undeclared-env-vars`. The backend config adopts neither, yet it logs via bare `console.log` (e.g. `config/cron-tasks.ts:5`) instead of Strapi's `strapi.log`, and reads `process.env` throughout against a `turbo.json` `globalEnv` list. Story 1.11 scoped itself to the legacy config's rule set, so this is a deliberate non-decision rather than a regression — but it is an unrecorded divergence between the two apps' gates. Fix is to add `no-console` (allowing `strapi.log` call sites to be migrated first) and `eslint-config-turbo` to the backend config. Surfaced by the Blind Hunter.
status: open

### DW-181: Two backend lint relaxations are backend-global with no scheduled revisit

origin: review of spec-1-11-bring-strapi-backend-under-lint.md (2026-08-03)
location: apps/strapi/eslint.config.mjs
reason: (LOW) Two decisions from story 1.11 are correct for the server but broader than their stated cause. (a) `@typescript-eslint/no-explicit-any: "off"` is justified by `strict: false` plus Strapi's generated types, yet applies to the admin React surface too, where neither rationale holds. (b) Type-aware linting was skipped for cost reasons, so `no-floating-promises` / `no-misused-promises` are absent from a backend that is almost entirely async service calls — a real class of bug on the exact surface this project cares about. Both were explicitly in-scope decisions of 1.11 (recorded in its Completion Notes), so this entry exists only to make the revisit trackable. Fix is to scope `no-explicit-any: "off"` to the server dirs, and to evaluate `projectService` on a `src/**` -only block where the cost is bounded. Surfaced by the Blind Hunter.
status: open

### DW-182: `apps/strapi` has 10 unguarded `Intl` / `toLocale*String` sites; `@tiween/western-numerals` was not extended there

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03)
location: apps/strapi/src/plugins/\*/admin/src/\*\*, packages/eslint-config/plugin.mjs, apps/strapi/eslint.config.mjs
reason: (MEDIUM) Story 1.12 wired `@tiween/western-numerals` as an **error** in `apps/client` only; the story's Boundaries block explicitly forbade extending it to `apps/strapi` in the same pass. The backend admin panel formats dates and counts through the same locale-sensitive APIs (`toLocaleDateString`, `toLocaleString`, `Intl.NumberFormat`) at 10 call sites (measured 2026-08-03 across `apps/strapi/src` + `apps/strapi/scripts`), none of which is covered by any numeral guarantee. Extending the rule there is cheap — `apps/strapi/eslint.config.mjs` is self-contained, so it would import `@tiween/eslint-config/plugin` and add one rule entry — but the admin surface is also the one DW-176/DW-177 show has no React lint rules and no `tsc` coverage, so the paydown needs its own verification story rather than riding along. The Strapi admin is an internal B2B surface with a French/English UI, which is why it was ranked below the public client. Fix is a follow-up story: register the plugin in the backend config, pay down the surfaced sites against a backend-local `toNumeralSafeLocale` equivalent (the client helper lives under `apps/client/src/lib` and must not be cross-imported), and verify with `corepack yarn workspace @tiween/admin lint`.
status: open

### DW-183: HomePage prints French month names inside Arabic copy (`locale === "ar" ? "fr-TN" : ...`)

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03)
location: apps/client/src/features/events/components/HomePage/HomePage.tsx, apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx
reason: (MEDIUM) Both HomePage variants format the active-date section title with a ternary that maps `ar` to `fr-TN` and every other locale to a `<locale>-TN` template, so an Arabic reader sees a French weekday and month ("vendredi 16 janvier") inside otherwise-Arabic copy. Story 1.12 wrapped the whole expression in `toNumeralSafeLocale(...)` **without touching the French branch**: the numeral guarantee was this story's scope, the wording is a product decision (its Boundaries block names this exclusion explicitly). The same file also hardcodes French strings for the `tomorrow` / `this-week` / `weekend` filter titles ("Demain", "Cette semaine", "Ce week-end"), which is the same untranslated-copy defect and should be fixed together. Fix is a product/UX decision — either translate the titles via next-intl and switch the formatter to `ar-TN` (Arabic words, `latn` digits, which the helper already guarantees), or keep French deliberately and document why. Note that `formatShowtimeLabel` and `formatRelativeTime` already take the Arabic-words path, so the app is currently inconsistent with itself.
status: open

### DW-184: `formatDate`'s dayjs "French words for Arabic" idiom is outside the lint rule's reach

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03)
location: apps/client/src/lib/dates.ts
reason: (LOW) `formatDate` (and its siblings in `lib/dates.ts`) render through **dayjs**, not `Intl`, using `d.locale(locale === "ar" ? "fr" : locale)` — so Arabic dates come out in French words. `@tiween/western-numerals` matches `Intl.*` constructions and `toLocale*String` member calls only; a dayjs call exposes no such AST, so this idiom is invisible to the guard and would stay invisible if someone changed it to `d.locale("ar")` (dayjs's `ar` locale ships Arabic-Indic digit output via its `preparse`/`postformat` hooks). The numeral risk is currently zero _because_ of the French substitution, which makes it a latent trap rather than a live defect. Fix options: migrate `formatDate` to `Intl.DateTimeFormat` (bringing it under the rule and letting Arabic keep Arabic words with `latn` digits — this is the same wording question as DW-183 and should land with it), or extend the rule with a `dayjs`-aware check. Deliberately excluded by story 1.12's Boundaries block ("Do not migrate `formatDate`'s French-words-for-Arabic idiom").
status: open

### DW-185: `apps/client` is absent from the `turbo type-check` graph and its `tsc --noEmit` is red on 91 pre-existing errors

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03)
location: apps/client/package.json, turbo.json
reason: (MEDIUM) The client declares its TypeScript gate as `"typecheck": "tsc --noEmit"` (no hyphen) while the turbo task — and the root `yarn type-check` script — is named `type-check`. Only `@tiween/admin` matches, so `corepack yarn type-check` reports "2 successful, 2 total" and exits 0 while never type-checking the client at all. Measured on the untouched tree at `8bf5c6a`, `cd apps/client && npx tsc --noEmit` emits **91 errors** (mostly `strictNullChecks` violations in `src/lib/strapi-api/**` and the `desktop-prototypes/**` pages); story 1.12 verified byte-for-byte that it introduced none of them (91 before, 91 after, differing only by line-number shifts from added import lines). Related but separate: `@tiween/client#build` also fails at baseline on `desktop-prototypes/ticketing-quantity/page.tsx:146` (`Object is possibly 'undefined'`), which makes the turbo `test` task — which `dependsOn: ["build"]` — red for the client even though `vitest run` itself passes 626/626. Fix is to rename the script to `type-check` (or alias it), then land the 91-error paydown as its own story; renaming alone would turn CI red immediately.
status: open

### DW-186: `@tiween/western-numerals` reads syntax, not bindings — aliased `Intl`, `.call`/`.bind`, and same-named helpers evade it

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), review pass
location: packages/eslint-config/rules/western-numerals.mjs
reason: (MEDIUM) The rule matches AST shapes without scope or import resolution, so several forms slip past a guard the spec calls "fail-closed". Verified as unreported: `const { NumberFormat } = Intl; new NumberFormat(locale)`; `Number.prototype.toLocaleString.call(n, locale)`; a `d.toLocaleDateString.bind(d)` reference invoked later; and a _locally shadowed_ `function toNumeralSafeLocale(l) { return l }`, which silences every call site because `safeLocaleHelpers` is matched by name alone. The review pass closed the two cheap cases (computed member access `Intl["NumberFormat"]` / `d["toLocaleDateString"]`, and an explicit non-`latn` `numberingSystem` in the options bag); these remaining ones need scope analysis via `context.sourceCode.getScope()` plus import-origin checking, or a type-aware rule. None is reachable by accident — they are all deliberate-looking constructs, and the rule's purpose is preventing accidental recurrence of the 5.4/5.5 pattern — so the residual risk is low, but the "fail-closed" claim is stronger than the implementation. Note DW-182 plans a second, backend-local `toNumeralSafeLocale`, which would inherit the same name-only trust across two divergent implementations.
status: open

### DW-187: next-intl's `useFormatter()` / `format.number` path is unguarded by the numeral rule

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), review pass
location: apps/client/src (no current usages), packages/eslint-config/rules/western-numerals.mjs
reason: (MEDIUM) next-intl's sanctioned formatting API — `useFormatter()` / `getFormatter()` returning `format.number(...)` / `format.dateTime(...)` — formats with the _message_ locale, so it renders Arabic-Indic digits wherever `ar` resolves to `arab`, exactly like a raw `Intl` call. The rule matches `Intl.*` constructors and `toLocale*String` members only, so this path is invisible to it. The repo has **zero** usages today (grep across `apps/client/src` finds only a comment in `types/global.d.ts`), which is why story 1.12 did not cover it — but it is the idiomatic next-intl approach a future developer would reach for first, and a `formats` block in `getRequestConfig` cannot fix it (a named number format cannot set a numbering system for bare ICU args; measured during 1.12 planning). Fix options: add `format.number` / `format.dateTime` member calls to the guarded set (imprecise — any object named `format` would match), prefer a type-aware rule, or forbid `useFormatter` outright in favour of the `toNumeralSafeLocale` helper.
status: open

### DW-188: the rule source in `packages/eslint-config` is neither linted, type-checked, nor format-checked

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), review pass
location: packages/eslint-config/, .github/workflows/ci.yml, package.json
reason: (LOW) Story 1.12 added ~250 lines of production rule logic plus its test suite to `packages/eslint-config`, which declares no `lint` and no `type-check` script — so `turbo lint` / `turbo type-check` never enter the package. Independently, CI's `yarn format:check` glob is `**/*.{js,jsx,ts,tsx,md,css,scss}`, which excludes `.mjs`, so `plugin.mjs`, `rules/western-numerals.mjs` and `rules/western-numerals.test.mjs` are outside the formatting gate too (the same blind spot applies to the three existing preset `.mjs` files, which predate this story). The `node --test` suite does run in CI, so the rule's _behaviour_ is gated; only its style and static analysis are not. Fix: give the package an `eslint.config.mjs` + `lint` script and add `mjs`/`cjs` to the root `format` / `format:check` globs — the glob widening will surface pre-existing unformatted `.mjs` files, so it pairs with DW-175.
status: open

### DW-189: hardcoded `"fr-TN"` display formatting renders French dates and currency inside the Arabic UI

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), review pass
location: apps/client/src/features/events/components/EventCard/EventCard.tsx, apps/client/src/features/events/components/EventDateFilter/EventDateFilter.tsx, apps/client/src/features/tickets/components/TicketQR/TicketQR.tsx, apps/client/src/features/scanner/components/ValidationResult/ValidationResult.tsx
reason: (MEDIUM) These five call sites pass a hardcoded `"fr-TN"` to `Intl.DateTimeFormat` / `Intl.NumberFormat` / `toLocaleTimeString`, so an Arabic or English reader sees French weekday, month and currency formatting. They are _numeral_-safe, so `@tiween/western-numerals` certifies them clean and story 1.12 correctly left them untouched — but that is worth naming explicitly: with `["fr","en"]` allowlisted, hardcoding `"fr-TN"` is the cheapest way to satisfy the new error rule, and it is the wrong fix. This is the same untranslated-copy defect class as DW-183, which names only the two HomePage files; DW-183 under-reports the surface. Fix these together: thread the active locale through `toNumeralSafeLocale(locale)` once the wording decision in DW-183 is made. Also relevant: `AttendanceCounter`'s new `locale` prop defaults to `"fr-TN"` and no caller passes it yet.
status: open

### DW-190: the rule certifies `` `${locale}-u-nu-latn` ``, which throws `RangeError` when `locale` already carries a `-u-` extension

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), follow-up review pass
location: packages/eslint-config/rules/western-numerals.mjs (`endsWithLatn`), apps/client/src/features/tickets/utils/formatShowtimeLabel.ts:16
reason: (MEDIUM) Safety condition (b) — a template whose last quasi ends in `-u-nu-latn` — is string concatenation, precisely the construction `intl-locale.ts:22-26` documents as unsafe and `toNumeralSafeLocale` was rebuilt (this story's own review pass) to avoid. If the interpolated value already carries a Unicode extension, the result has two `-u-` singletons and every `Intl` constructor throws: verified that `new Intl.DateTimeFormat("ar-u-ca-islamic-u-nu-latn")` raises `RangeError: Invalid language tag`. `formatShowtimeLabel.ts:16` is a live, lint-clean instance with no `try/catch`, so a locale carrying `-u-` (a URL segment, a stored preference) would crash the ticket/payment render. Likelihood is low today — next-intl constrains the route locale to `ar`/`fr`/`en` — which is why this is deferred rather than patched: the spec's design sections name this site "the golden example" and expect no report (`spec-1-12…:50, :67, :159, :195`), so tightening condition (b) is a spec-level decision, not a patch. Fix: require expression-free templates for condition (b) (matching the intent-contract's own "a template with an interpolation … errors" clause) and pay `formatShowtimeLabel` down through `toNumeralSafeLocale`.
status: open

### DW-191: turbo caches `@tiween/eslint-config#test` against inputs that cannot see the wiring it guards

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), follow-up review pass
location: turbo.json, packages/eslint-config/rules/western-numerals.test.mjs (the `wiring` suite)
reason: (MEDIUM) The `wiring` test exists to fail if `apps/client/eslint.config.mjs` stops registering the `@tiween` plugin — the story names `storybook upgrade` rewriting that generated file as the realistic accident. But `turbo test --filter=@tiween/eslint-config --dry=json` resolves the task's inputs to the `packages/eslint-config` files alone (`library.mjs`, `next.mjs`, `package.json`, `plugin.mjs`, `rules/*.mjs`); `apps/client` appears nowhere in inputs or dependencies. So a change that drops the wiring touches only `apps/client`, leaves the eslint-config package byte-identical, and CI (which restores `.turbo` via `restore-keys`) replays the cached PASS — the guard reports green while the rule is off. Not patched here because every available fix edits `turbo.json` (declare the client config as an input, or set `"cache": false` on that task), which the story verified it leaves untouched. Fix: add `apps/client/eslint.config.mjs` to the task's `inputs`, or disable caching for it.
status: open

### DW-192: `toNumeralSafeLocale`'s `-u-nu-latn` is silently dropped for well-formed but unsupported language tags

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), follow-up review pass
location: apps/client/src/lib/intl-locale.ts:43-62
reason: (LOW) The helper's two `catch` arms only fire on tags `Intl.Locale` rejects as malformed. A tag that is well-formed but unsupported (`"xx"`, `"und"`, a typo'd subtag) parses fine, so the helper returns e.g. `"xx-u-nu-latn"` — and `Intl` then falls back to the host default locale, which does not carry the requested numbering system. The guarantee the helper's whole design rests on is quietly void for that input class, with no signal. Unreachable today: the only producers are next-intl's route locale (`ar`/`fr`/`en`) and the `"fr-TN"` default. Fix: after `withLatn`, verify with `Intl.NumberFormat.supportedLocalesOf([tag])` and degrade to the fallback when empty.
status: open

### DW-193: `search.resultsFor`'s `{display}` is a required ICU argument with no compile-time or call-site verification

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), follow-up review pass
location: apps/client/locales/{ar,fr,en}.json (`search.resultsFor`), apps/client/src/app/[locale]/search/SearchPageClient.tsx:327-333
reason: (MEDIUM) Replacing the ICU `#` with a pre-formatted `{display}` argument moved the numeral guarantee from the catalog to the caller, and nothing verifies the caller holds up its end. `icu-numerals.test.ts:139` looks like coverage but re-declares the arguments inline, so it tests the catalogs, not `SearchPageClient`; there is no test importing `SearchPageClient`, and `vitest.config.ts`'s explicit `include` list has no glob matching `src/app/**/search/**`. next-intl does not type ICU argument names, and the client is absent from `turbo type-check` (DW-185). Demonstrated: deleting the `display:` line from `SearchPageClient.tsx:330` leaves lint, the RuleTester suite and the catalog gate all green, while the search header renders the literal key `search.resultsFor` in all three locales. The same trap awaits every future `#`-to-`{display}` conversion. Fix: add a `src/app/**/search/**` vitest glob and a case asserting the rendered label, or export the label factory and test it directly.
status: open

### DW-194: the ICU catalog gate reads only `ar.json` and only ever exercises `other`-style branches

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), follow-up review pass
location: apps/client/src/lib/icu-numerals.test.ts:60, :96-101
reason: (LOW) Two coverage limits, both now documented in the file but neither closed. (1) The catalog path is hardcoded to `locales/ar.json`, so a newly added Arabic-script catalog ships ungated — a `readdirSync` over `locales/` would gate every file for free. (2) Every ICU argument receives the same numeric probe, so a `{kind, select, movie {# séances} other {…}}` message is only measured through the branch the number selects; a raw `#` in an unselected `select` branch reports zero offenders. A bare `{name}` is also stringified rather than number-formatted, but that is correct to leave alone — its digits come from the caller, not the catalog. Fix: enumerate catalogs from disk, and type-probe arguments (string probes for `select`, numeric for `plural`/`number`/date-time) so each branch is rendered.
status: open

### DW-195: an object-spread `numberingSystem` still bypasses the options-bag check

origin: story 1-12-i18n-western-numeral-lint-guard (2026-08-03), follow-up review pass
location: packages/eslint-config/rules/western-numerals.mjs (`unsafeNumberingSystem`)
reason: (LOW) The check iterates the options object's own `Property` nodes and `continue`s past anything else, so `new Intl.NumberFormat(toNumeralSafeLocale(l), { ...{ numberingSystem: "arab" } })` is certified clean and renders Arabic-Indic digits. The follow-up review pass closed the sibling case (a template-literal value, ``{ numberingSystem: `arab` }``); the spread form needs the check to recurse into `SpreadElement` arguments whose argument is an `ObjectExpression`. Deliberate-looking rather than accidental — the same class as DW-186 — so it is recorded, not patched.
status: open

### DW-196: the repo-hygiene guard does not police UTF-8 BOMs

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03)
location: scripts/check-repo-hygiene.mjs (`checkBuffer`)
reason: (LOW) `EF BB BF` at the head of a file is well-formed UTF-8 that decodes to `U+FEFF`, which is neither a C0 control nor DEL, so the guard passes it. A BOM is measurably absent from the tree today (0 of 5561 tracked files at baseline), but it breaks shebangs, `JSON.parse` on some runtimes, and diffs on the first line only — a distinct failure class from the one this story exists to close. Deliberately excluded: the intent contract's "Never" clause forbids turning this guard into a general line-ending/BOM/whitespace policy. Note for whoever closes this (corrected during the 2026-08-03 review pass): `TextDecoder("utf-8")` defaults to `ignoreBOM: false`, i.e. it **strips** a leading `U+FEFF` before the character-class scan ever sees it, so a fix that merely adds `U+FEFF` to that class would catch interior BOMs and silently miss the leading one — the only case that matters. The guard now decodes with `ignoreBOM: true` (so line-1 columns are correct), which also means the character does reach the scan. Fix: add a dedicated `bom` violation kind checked on the decoded string's first character, with its own allowlist for files that genuinely need one.

### DW-197: line endings are unpoliced — CRLF and lone CR both pass the hygiene guard

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03)
location: scripts/check-repo-hygiene.mjs (`CONTROL_BYTE`), 19 tracked CRLF files under `legacy/` and `.claude/skills/**/*.csv`
reason: (LOW) `\r` (U+000D) is explicitly allowed so the 19 pre-existing CRLF files are not swept into this story, which also means a lone CR — a classic mac-classic-era line terminator that makes a file look like one enormous line in most tooling and reports every violation at `line 1` — is admitted. The guard's own `line:col` reporting degrades for such a file. Recorded as a named decision, not an oversight: normalising line endings is a separate invariant with its own paydown (a `.gitattributes` `text=auto` policy plus a one-time conversion), and doing it inside this story would have produced a 19-file diff unrelated to the control-byte defect. Fix: land a `.gitattributes` normalisation policy, convert the 19 files, then tighten the guard to reject lone CR.

### DW-198: the extension allowlist can be spoofed in both directions

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03)
location: scripts/check-repo-hygiene.mjs (`isBinaryPath`, `BINARY_EXTENSIONS`)
reason: (MEDIUM) Classification is by path extension only, never by content, so two blind spots exist by construction. (a) A text file named `logo.png` is skipped outright — anything at an allowlisted extension is unread, so a `.png` holding a shell script is invisible to the guard. (b) A binary payload named `handler.ts` still passes whenever its bytes happen to be valid UTF-8 with no control bytes (e.g. base64 or hex-armoured content), because the guard only asserts decodability, not that the file is plausible source. Direction (a) is the deliberate cost of an allowlist — the alternative, content sniffing, is precisely git's NUL heuristic, which would make the guard blind to its only real target (see the story's Design Notes). Direction (b) is inherent to a byte-level invariant. Fix (partial, if ever wanted): cross-check that files at allowlisted extensions carry the expected magic bytes, so a misnamed text file at a `.png` path is reported.

### DW-199: whole-repo mode cannot see untracked-but-unignored files

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03)
location: scripts/check-repo-hygiene.mjs (`trackedPaths`, `git ls-files -z`)
reason: (LOW) `yarn hygiene` enumerates the git index, so a file that exists in the working tree but has never been added is not checked. In practice the gap closes at the moment it matters — lint-staged runs the same script over the staged paths, so a new file is checked on the commit that introduces it, and CI then re-checks it as a tracked file. It does mean a local `yarn hygiene` reports green while a violating new file sits unstaged on disk, which can mislead a developer debugging a CI failure in reverse. Fix: add `git ls-files -z --others --exclude-standard` to the enumeration, behind a flag if the extra scan cost matters.

### DW-200: the repo-hygiene guard reads the working tree, not the committed blob

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), review pass
location: scripts/check-repo-hygiene.mjs (`checkPaths`)
reason: (LOW) The guard enumerates paths from the git index but reads their contents from disk with `readFileSync`, so what it judges is the working tree. Two consequences. (a) A file that is tracked but absent from the work tree — sparse checkout, partial clone, `skip-worktree` — is counted under `missing` and never inspected; the summary line now reports that count honestly, but a sparse CI checkout would still exit 0 having read a fraction of the tree. (b) Contents staged for commit but since modified on disk are judged in their on-disk form; lint-staged closes this at commit time (it stashes unstaged changes before running tasks) and CI checks out a clean tree, so no live gap exists. The review pass patched the loudest sub-case — symlinks, which git stores as a target _string_ but `readFileSync` follows through to arbitrary content — by skipping non-regular files. Fix: read blobs via `git cat-file --batch` against the index instead of the filesystem.

### DW-201: `hygiene:test` runs in CI and nowhere else in the local loop

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), review pass
location: package.json (`hygiene:test`), turbo.json (`test` task)
reason: (LOW) The guard's suite is a root-level script deliberately kept out of `turbo test` (the `test` task `dependsOn: ["build"]` and `@tiween/client#build` is red at baseline — DW-185 — and turbo input-scoping already produced a stale-cache guard hole, DW-191). The cost is that `yarn test` does not run it: a developer editing `scripts/check-repo-hygiene.mjs` can run `yarn lint && yarn type-check && yarn test` locally, see all green, and only learn of a break from the dedicated CI step. The same holds for `.mjs` being outside both the lint and the format globs (DW-188), so the guard's own two files have no static gate at all. Fix, once DW-185/DW-191 are closed: make the hygiene suite a turbo task with explicit `inputs` and no `build` dependency, and extend the format glob to `.mjs`.

### DW-202: lint-staged passes every staged path on one command line

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), review pass
location: .lintstagedrc.js (the `"*"` hygiene entry)
reason: (LOW) The `"*"` pattern matches every staged file, and lint-staged appends the matched absolute paths to the command as argv. A commit staging thousands of files (a generated-asset sweep, a bulk rename, an initial import) can exceed the platform `ARG_MAX` and fail the spawn with `E2BIG`, which surfaces as a confusing pre-commit failure rather than a hygiene violation. Not reachable at this repo's commit sizes, and the whole-repo CI run is unaffected because it enumerates internally rather than through argv. Fix: teach the script a `--stdin` mode reading NUL-separated paths, and have lint-staged pipe into it.

### DW-203: invisible-but-legal Unicode (bidi overrides, zero-width, C1) is not policed

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: scripts/check-repo-hygiene.mjs (`CONTROL_BYTE`)
reason: (MEDIUM) The guard's violation class is exactly C0-minus-tab/LF/CR plus DEL, as its intent contract specifies. Everything else that is invisible yet well-formed UTF-8 therefore passes: the bidirectional overrides `U+202A`-`U+202E` and isolates `U+2066`-`U+2069` (the Trojan Source attack — source that renders in one order and compiles in another), zero-width characters `U+200B`/`U+200C`/`U+200D`/`U+2060`, the C1 range `U+0080`-`U+009F`, and the line/paragraph separators `U+2028`/`U+2029`. Confirmed by measurement during the review pass: `checkBuffer` returns `null` for all of them. This is a scope boundary, not an oversight — the story exists to close the raw-control-byte class and its contract fixes the character class — but the guard is the natural home for the wider "invisible character in source" invariant, and a reader may reasonably assume a byte-level hygiene gate already covers Trojan Source. Fix: add a second, separately named violation kind (`suspicious-invisible`) with its own character class and its own allowlist, so the C0 invariant and the homoglyph/bidi invariant can fail independently and be reasoned about separately.
status: open

### DW-204: the pre-commit hygiene gate is off during merge, rebase, cherry-pick and revert

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: .husky/pre-commit (the merge/rebase skip branch), .lintstagedrc.js (the `"*"` hygiene entry)
reason: (LOW) `.husky/pre-commit` skips the entire `lint-staged` invocation while git is replaying or combining commits, so the hygiene guard — which is wired only through `lint-staged` — does not run on a conflict-resolution commit. That is precisely the commit where a human hand-edits a hunk and can paste or mangle a byte, and precisely where the pre-existing hook design turns the gate off. The skip predates this story and is deliberate (a conflict commit must not be blocked by violations inherited from the commits being replayed, which would force `--no-verify`), and CI still catches the result on push, so this is a latency gap rather than a hole. The misleading claim in `.lintstagedrc.js` that hook and CI enforce "identical strictness" was corrected in the review pass. Fix, if wanted: run the hygiene guard alone (not the whole lint-staged pipeline) inside the skip branch, restricted to paths the resolving commit actually touches, so inherited violations stay tolerated while newly introduced ones do not.
status: open

### DW-205: a tracked symlink's own blob is never validated

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: scripts/check-repo-hygiene.mjs (`checkPaths`, the non-regular skip)
reason: (LOW) `checkPaths` `lstat`s each path and skips anything that is not a regular file, which correctly stops the guard from reading through a symlink to out-of-repo content or blocking on a FIFO. The consequence is that the symlink's _own_ committed blob — which git stores as the raw bytes of the target path — is never checked, even though it is a tracked blob subject to the same invariant. A target path containing a control byte or invalid UTF-8 is a legal symlink and an illegal blob under this guard's rule, and it would be skipped silently. Narrower than DW-200 (which is about reading the work tree rather than the index generally) and vanishingly unlikely in this repo, which tracks no symlinks today. Fix: for a non-regular entry that `lstat` reports as a symlink, run `checkBuffer` over `readlinkSync`'s target bytes rather than skipping outright.
status: open

### DW-206: `getClientIp` trusts the left-most X-Forwarded-For hop

origin: story 7-1-venue-registration-flow (2026-08-03), review pass
location: apps/client/src/lib/rate-limit.ts (`getClientIp`)
reason: (MEDIUM) `getClientIp` returns the FIRST entry of `x-forwarded-for`, which is the client-supplied end of the chain and therefore fully attacker-controlled. Any caller rotating that header gets an unlimited number of rate-limit buckets, defeating the per-IP limiter for every route that uses it. This predates story 7.1 (the helper shipped with `contribute/play`), but 7.1 raises the stakes: the Next-layer limiter is now the ONLY per-applicant throttle on an unauthenticated endpoint that provisions a user row, a venue row and two outbound emails per accepted request — the Strapi backstop behind it is one global bucket (see the middleware docstring). Fix: trust only the right-most hop appended by the known proxy, or validate the header against a trusted-proxy allowlist, and pin it with a test.
status: open

### DW-207: uploaded files are trusted on the client-declared MIME type alone

origin: story 7-1-venue-registration-flow (2026-08-03), review pass
location: apps/client/src/app/api/venues/register/route.ts (`assertAcceptableImage`)
reason: (MEDIUM) The image gate checks `File.type` and `File.size`, both of which the caller controls. A direct multipart POST declaring `Content-Type: image/png` over arbitrary bytes will be written to the Strapi media library using the server write token, from an unauthenticated endpoint — up to 11 files x 5 MB per accepted request. Uploaded files are rolled back only when the downstream registration fails; a request that succeeds keeps them. Rate limiting bounds the volume but not the content. Fix: sniff magic bytes for the three accepted formats before uploading, and add a per-request aggregate size cap.
status: open

### DW-208: `verifyRecaptcha` does not verify the token's `action`

origin: story 7-1-venue-registration-flow (2026-08-03), review pass
location: apps/client/src/lib/recaptcha.ts (`verifyRecaptcha`)
reason: (LOW) The shared verifier checks only `success` and `score`, never the `action` field the siteverify response returns. Every reCAPTCHA-protected route in the app therefore accepts a token minted for any other action on the same site key — a token harvested from the public contribute form passes venue-registration verification and vice versa. Pre-existing and shared by all callers; 7.1 adds one more. Fix: give `verifyRecaptcha` a required `expectedAction` parameter and assert it, then thread the action name through each call site.
status: open

### DW-209: the client and Strapi registration Zod schemas are hand-duplicated with nothing pinning them together

origin: story 7-1-venue-registration-flow (2026-08-03), review pass
location: apps/client/src/features/venues/schemas/venue-registration.ts, apps/strapi/src/plugins/venues/server/src/validation/registration.ts
reason: (LOW) Both files declare the same fields, the same bounds and the same SCREAMING_SNAKE code vocabulary, and each docstring instructs the reader to keep the other in sync — but no test compares them. A backend-only tightening (a lower `name` max, a new required field) passes client validation, uploads the applicant's media, and only then 400s, after which the media is rolled back and the applicant sees a generic failure. The locale test pins codes to translations but says nothing about the two schemas agreeing. Cross-app, so a shared module is not trivial. Fix: extract the shared constants and code vocabulary into `packages/shared-types` (the project's designated home for cross-app types) and have both schemas build from it.
status: open

### DW-210: `rateLimit()` installs a never-cleared `setInterval` per limiter and has no tests

origin: story 7-1-venue-registration-flow (2026-08-03), review pass
location: apps/client/src/lib/rate-limit.ts
reason: (LOW) Each `rateLimit()` call registers a module-scope `setInterval` sweep that is never cleared, so every limiter keeps a timer alive for the process lifetime and holds its `Map` reachable; the module has no test file at all. Pre-existing (two limiters already), but 7.1 adds a third and makes the module load-bearing for an unauthenticated write endpoint. Fix: `unref()` the timer (or sweep lazily on `check`, as the Strapi-side `createRateLimit` does) and add a unit suite covering window reset, per-key isolation and `getClientIp` parsing.
status: open

### DW-211: seeded venues carry the default `pending` status enum, so the approved-only selector returns none of them

origin: story 7-1-venue-registration-flow (2026-08-03), review pass
location: apps/strapi/src/plugins/venues/server/src/services/seed.ts (`SEED_VENUES`), services/venue.ts (`findVenuesForSelector`)
reason: (MEDIUM) `SEED_VENUES` entries set only `name`/`slug`/`address`/`capacity`/`geo`, so every seeded venue takes the schema default `status: "pending"`, while `findVenuesForSelector` filters `status: { $eq: "approved" }`. On a freshly seeded database the venue picker is therefore empty. Surfaced while fixing the story-7.1 leak (the public `findVenues`/`findVenue` reads were gated on publication state rather than on the `status` enum precisely BECAUSE an `approved` filter would have emptied the public listing for seeded data). Pre-existing and independent of 7.1. Fix: set `status: "approved"` on the seed entries, and decide whether `findVenues`/`findVenue` should additionally enforce the enum once the seed is consistent.
status: open

### DW-212: seven ledger entries (DW-196 … DW-202) carry no `status:` field, so the sweep cannot see them

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: \_bmad-output/implementation-artifacts/deferred-work.md (entries DW-196 through DW-202)
reason: (MEDIUM) Every other entry in the ledger ends with a `status:` line; exactly these seven do not. `bmad-loop-sweep` partitions open work on that field, so seven recorded debts are invisible to the triage that is supposed to route them — they will never be bundled, closed or escalated. Not fixed in this pass by explicit instruction: the orchestrator owns entry status and this session appends only. Fix: append `status: open` to DW-196 … DW-202, or have the sweep treat a missing `status:` as `open` and say so.
status: open

### DW-213: `stats.failed` is excluded from the guard's printed skip breakdown

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: scripts/check-repo-hygiene.mjs (the `skipped` sum feeding the coverage line)
reason: (LOW) `skipped = stats.binary + stats.nonRegular + stats.missing` omits `stats.failed`, so `checked + skipped` does not reconcile against `paths.length` whenever a file was unreadable. It is harmless today only because `failed > 0` always implies at least one violation, and the coverage line now prints on both branches — but that coupling is undocumented and untested, and it is the same accounting-drift class two earlier passes already patched twice. Fix: include `failed` in the breakdown, or assert the invariant explicitly so the line cannot drift out of balance again.
status: open

### DW-214: the `undecodable-path` check runs before the binary allowlist, so an allowlisted asset with a non-UTF-8 filename is reported

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: scripts/check-repo-hygiene.mjs (`checkPaths`, the U+FFFD branch ordered ahead of `isBinaryPath`)
reason: (LOW) A tracked `.png`/`.pdf` whose filename bytes are not UTF-8 — common for imported media — never reaches the allowlist skip. It fails as `undecodable-path`, and the remediation footer bundles that kind with `unreadable` and talks about re-saving the file as UTF-8, which is not the fix (the _name_ is the problem). No test covers the interaction of the two branches. Fix: decide whether filename encoding is policed for allowlisted extensions, document the choice, and give `undecodable-path` its own remediation line naming the rename.
status: open

### DW-215: lint-staged invoked outside `.husky/pre-commit` runs concurrently, so the guard can read a buffer prettier is mid-rewrite

origin: story 1-13-repo-hygiene-encoding-ci-guard (2026-08-03), follow-up review pass
location: .lintstagedrc.js (the `"*"` hygiene entry overlapping the prettier entry), .husky/pre-commit
reason: (MEDIUM) The hygiene entry deliberately overlaps the prettier entry, and prettier rewrites in place; serial execution is the only thing keeping the guard off a half-written file. That serialism comes from `--concurrent false` on the husky hook alone. `npx lint-staged` run directly — GUI git clients, a future CI staged-only job, any wrapper — defaults to concurrent and reintroduces the race, producing intermittent bogus violations that push developers to `--no-verify`. This pass pinned the flag and the config key ORDER, which is as far as a patch reaches. Fix: move the hygiene command into the same task array as prettier for the overlapping extensions (lint-staged always runs an array serially, regardless of `--concurrent`), so the ordering holds under every invocation.
status: open

### DW-216: Follow-up review still recommended for 1-13-repo-hygiene-encoding-ci-guard after the damping cap was spent

origin: review-budget-followup
location: n/a
source_spec: `spec-1-13-repo-hygiene-encoding-ci-guard.md`
severity: low
reason: The follow-up-review damping cap (limits.max_followup_reviews = 1) was spent with the story finalized (status: done, verify green) while the review pass still recommended an independent follow-up. The work was committed by bmad-loop run 20260803-140539-83cd; this entry preserves the lingering recommendation for a deliberate later review.
status: open

### DW-217: `logo` / `images` accept any upload id, so a venue manager can attach another tenant's media

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/strapi/src/plugins/venues/server/src/validation/profile.ts, services/venue-profile.ts
reason: (MEDIUM) The profile schema validates media as `z.number().int().positive()` and the service copies the value straight into the update payload. The venue lookup is rigorously tenant-scoped, but the file ids in the body are not checked for existence or ownership, so a manager can publish any file in the shared media library — another venue's photo, an admin's upload — on their own public page. Same family as DW-207 (uploads trusted on client-declared MIME alone). Fix: verify each id resolves to a file uploaded by the calling user, or introduce a per-venue media folder.
status: open

### DW-218: a user may be `manager` of several venues, and the dashboard silently edits an arbitrary one

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/strapi/src/plugins/venues/server/src/services/venue-profile.ts (`findVenueDraftForManager`), content-types/venue/schema.json (`manager`)
reason: (MEDIUM) `venue.manager` is a `manyToOne` relation — many venues per user — but `findVenueDraftForManager` does a `findFirst` with no sort and no uniqueness guard, and the dashboard offers no venue selector. Epic 7 assumes one venue per manager and nothing enforces it; a second assignment makes one venue permanently unreachable from the only editing surface, with no warning. Fix: decide whether one-manager-one-venue is an invariant (enforce it in the schema/registration) or a multi-venue selector is owed, then make the lookup deterministic either way.
status: open

### DW-219: the partial `PUT /venues/me` has no optimistic concurrency control

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/strapi/src/plugins/venues/server/src/services/venue-profile.ts, apps/client/src/features/venues/hooks/useVenueProfile.ts
reason: (MEDIUM) The client sends a changed-fields-only diff computed against a venue cached with `staleTime: 60s`, and no `updatedAt` or version travels with the request or is checked on write. Two tabs, or a manager saving while an admin edits the same venue in the panel, silently overwrite each other — and because only changed fields are sent, the result can be an interleaved half-and-half record rather than a clean last-write-wins. Fix: send the read `updatedAt` and reject a stale write with a dedicated code the UI can offer to reload on.
status: open

### DW-220: upload size and MIME are enforced client-side only

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/client/src/app/[locale]/venue/profile/\_components/VenueProfileForm.tsx (`checkImage`), apps/strapi/config/plugins.ts
reason: (MEDIUM) `checkImage` is a pre-flight in the browser; a crafted POST to `/api/private-proxy/api/upload` with the manager's own JWT bypasses it entirely, bounded only by Strapi's global 250 MB limit. The `plugin::upload.content-api.upload` grant seeded in `src/bootstrap/venue-manager-role.ts` is unscoped, so every venue-manager account holds it. Same family as DW-207. Fix: enforce the allowlist and size cap in the upload provider config or a route-level middleware.
status: open

### DW-221: nothing unpublishes a venue when it is suspended

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/strapi/src/plugins/venues/server/src/services/venue.ts (`findVenueBySlug`), services/venue-profile.ts
reason: (MEDIUM) A venue that went approved → published → suspended keeps its published entry forever; no code path calls `unpublish` on a status transition. This pass added a `status: { $ne: "suspended" }` read filter so the public slug page hides it, but that is a read-side mask, not a takedown: any other consumer that queries on publication state alone still serves it, and the `status` state machine itself is unowned until the platform-administration epic ships approval/suspension. Fix: unpublish on the suspend transition when Epic 9 builds it, and keep the read filter as defence in depth.
status: open

### DW-222: leaflet marker images are fetched from unpkg.com at runtime

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/client/src/features/venues/components/VenueLocationPicker/VenueLocationPickerClient.tsx, apps/client/src/features/events/components/Map/MapMarker.tsx
reason: (LOW) The marker icon URLs point at a third-party CDN, so the map silently loses its pins if unpkg is unreachable or blocked by a CSP, and every venue-dashboard session leaks a request to an external host. Pre-existing in the events Map component and copied rather than fixed when the location picker was built on it. Fix: vendor the marker assets into `public/` and point both components at the local paths.
status: open

### DW-223: every venues-plugin persistence format is verified only against mocks

origin: story 7-2-venue-profile-management (2026-08-03), review pass
location: apps/strapi/src/plugins/venues/server/src/services/**tests**/\*.unit.test.ts
reason: (MEDIUM) `data.properties = [{ definition: "<documentId>", ... }]` (a relation embedded in a repeatable component, written by documentId), `publish({ documentId })` with no locale, and `filters: { manager: { id: { $eq } } }` have never met a real Document Service — the suites assert only that the service hands those literals to a `jest.fn()`. The same is true of story 7.1's registration service. A format error here passes every test and fails on the first real save. Fix: adopt the integration-seam test tier already recorded as an Epic 5 retrospective action, and cover at least the component-relation write against a live instance.
status: open

### DW-224: a NULL `dedupeKey` exempts any non-service writer from the watchlist unique constraint

origin: story 5-7-watchlist-atomic-dedupe (2026-08-04), review pass
location: apps/strapi/src/plugins/user-engagement/server/src/content-types/user-watchlist/schema.json, services/watchlist.ts (`add`)
reason: (MEDIUM) `dedupeKey` is stamped only by `watchlist.add`. A row created any other way — the Strapi admin content-manager, a seed script, a future service — gets NULL, and both Postgres and SQLite allow unlimited NULLs in a unique index, so those rows escape the constraint entirely and can re-introduce the duplicate pairs this story eliminated. Today `add` is the only writer, so the invariant holds in practice, but it rests on that staying true rather than on the schema. Fix: stamp `dedupeKey` in a `beforeCreate` lifecycle hook on the content type so every writer is covered, and make the column non-nullable once the backfill has run everywhere.
status: open

### DW-225: watchlist dedupe cleanup and its UNIQUE index are created in two non-atomic phases

origin: story 5-7-watchlist-atomic-dedupe (2026-08-04), review pass
location: apps/strapi/database/migrations/2026.08.04T00.00.00.watchlist-dedupe-key.js
reason: (MEDIUM) Strapi runs user migrations, commits them, and only then runs `syncSchema()` to add the UNIQUE index (`@strapi/database/dist/schema/index.js:69-73`). In a rolling deploy where old pods still serve `POST /watchlist`, a duplicate pair inserted in that window makes the index creation fail and boot crash — and because the migration is already recorded in `strapi_migrations` it will never re-run to re-clean, requiring manual DB surgery. Fix: create the unique index inside the migration itself (matching Strapi's generated index name so `diffTableIndexes` treats it as present), or gate the deploy so no writer is live across the boundary. Needs a real database to validate the index-name match, which is why it was not attempted in this pass.
status: open

### DW-226: the watchlist dedupe migration loads the whole table into memory unbatched

origin: story 5-7-watchlist-atomic-dedupe (2026-08-04), review pass
location: apps/strapi/database/migrations/2026.08.04T00.00.00.watchlist-dedupe-key.js
reason: (LOW) The backfill selects every `user_watchlists` row plus two joins into a single in-memory array, inside the migration's transaction. Watchlist is a Phase-2 feature with low volume today, so this is not a live risk, but at a few million rows the boot-time migration would allocate the whole result set at once and OOM inside a container memory limit, leaving a crash loop. Fix: page the select by primary key and process in batches.
status: open

### DW-227: the watchlist dedupe change has no integration-tier verification at either seam

origin: story 5-7-watchlist-atomic-dedupe (2026-08-04), follow-up review pass
location: apps/strapi/src/plugins/user-engagement/server/src/services/**tests**/watchlist.unit.test.ts, src/plugins/user-engagement/server/src/**tests**/watchlist-dedupe-migration.unit.test.ts
reason: (MEDIUM) Both halves of the story are verified alone and their seams never execute. (a) The migration creates `dedupe_key` itself and relies on `syncSchema()` then diffing it as an unchanged nullable `varchar(255)` and adding only the UNIQUE index — the migration tests drive `up()` against hand-built SQLite tables and never run Strapi's schema diff, so a column-shape mismatch or a future reordering of user migrations after `syncSchema()` would surface first on a production boot. (b) `isUniqueViolation` is only ever fed errors the tests construct themselves; the shape a real `pg`/better-sqlite3 driver error has once Strapi has wrapped it is never observed, so a Strapi or pg upgrade that rewraps it turns the "never a 500" race guarantee off with a green suite. This pass closed the cheap part of the gap (a schema-contract test now fails if `"unique": true` is dropped) but the seams need a live instance. Fix: use the opt-in boot-based tier (`*.service.test.ts` via `tests/helpers/strapi`) to seed a pre-5.7 duplicate pair, boot, and assert the index exists, a duplicate insert is rejected, and the rejection satisfies `isUniqueViolation`. Same tier DW-223 asks for.
status: open

### DW-228: `watchlist.add` never checks that `creativeWorkId` resolves, so a bogus id returns a lying 200

origin: story 5-7-watchlist-atomic-dedupe (2026-08-04), follow-up review pass
location: apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts (`add`), controllers/watchlist.ts
reason: (LOW) The controller checks `creativeWorkId` for truthiness only, and Strapi silently drops a relation it cannot resolve — so a POST with a well-formed but nonexistent documentId lands a "poisoned" row that holds the dedupe key with no `creativeWork` link. The client gets 200, the item never appears in `getUserWatchlist`, and `remove` cannot delete it (both filter on the relation). Story 5.7's key-lookup fallback stops that pair from becoming a permanent 500, but it returns the poisoned row as success rather than repairing it, so the silent-lie end state is unchanged. Only reachable from a client sending ids it did not get from the API, and the damage is confined to that user's own account, which is why it was not patched here. Fix: verify the creative work exists before creating and return a proper error code — that is a client-contract decision (a new 4xx on the add path) rather than an in-scope patch, so it needs a call rather than a quiet change.
status: open

### DW-229: the migration's test reaches it by a hardcoded six-level path and an undeclared `knex`

origin: story 5-7-watchlist-atomic-dedupe (2026-08-04), follow-up review pass
location: apps/strapi/src/plugins/user-engagement/server/src/**tests**/watchlist-dedupe-migration.unit.test.ts
reason: (LOW) The suite lives under the plugin but tests a file in `apps/strapi/database/migrations/`, reaching it through `require("../../../../../../database/migrations/2026.08.04T00.00.00.watchlist-dedupe-key.js")` — a dated filename embedded in a six-level relative path, so renaming or restamping the migration breaks the test by silent module-not-found rather than by a failing assertion. It also `require("knex")`, which is not a dependency of `apps/strapi/package.json` and resolves only via root hoisting; any hoisting change (pnpm, `nmHoistingLimits`, a nested install) breaks the suite for reasons unrelated to the code. Fix: co-locate migration tests next to `database/migrations/`, resolve the module by directory scan rather than by literal filename, and declare `knex` as a devDependency of `apps/strapi`.
status: open

### DW-230: `notificationKeys` are not user-scoped and survive sign-out

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), review pass
location: apps/client/src/features/notifications/hooks/useNotifications.ts
reason: (MEDIUM) `notificationKeys.list()` / `unreadCount()` are the bare `["notifications","list"|"unread-count"]` — no user id — and both queries are `enabled: isAuthenticated` with a staleTime, so on a shared device user B's first paint can read user A's cached notification list and unread badge. This is the exact leak Story 5.8 closed for the watchlist, in a file whose own comment says it "mirrors `watchlistKeys`". Story 5.8's spec explicitly ruled notifications out of scope ("Do NOT change ... the notifications keys"), so it was left untouched — and `sign-out.test.ts` now asserts a `["notifications",...]` entry SURVIVES the sign-out eviction, which pins the current shape and must be updated together with the fix. Fix: apply the same treatment — user-scoped keys, `enabled: isAuthenticated && !!userId`, `notificationKeys.all` added to `signOutAndClearCache`, plus the same-tab user-switch test.
status: open

### DW-231: `useUser`'s `["user","me"]` key is not user-scoped and survives sign-out

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), review pass
location: apps/client/src/hooks/useUser.ts
reason: (MEDIUM) The current-user query is cached under a global `["user","me"]` key gated only on `isAuthenticated`, and sign-out evicts only `watchlistKeys.all`. On a same-tab account switch without a full reload, user B's first paint can render user A's email, username and avatar out of the cache until the refetch lands — a higher-value leak than the watchlist rows Story 5.8 was scoped to. Not caused by this story and outside its stated boundaries. Fix: scope the key by `session.user.userId` and evict it on the shared sign-out path alongside the watchlist keys.
status: open

### DW-232: session terminations that bypass `signOutAndClearCache` leave the per-user cache resident

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), review pass
location: apps/client/src/lib/sign-out.ts, apps/client/src/components/providers/ClientProviders.tsx
reason: (MEDIUM) Eviction is bound to the sign-out FUNCTION, not to the session ending. A JWT expiring in place, a session invalidated in another tab, or a restored tab whose session is already gone all leave the outgoing user's watchlist entries in memory with nothing to clear them — only the user-scoped keys defend those paths, and only until a same-id collision. A lint guard now stops new code from calling NextAuth's `signOut` directly (added in this story), but it cannot cover terminations that never call sign-out at all. Fix: add a session-transition effect at the provider level — track the previous `userId` and `removeQueries` whenever it changes or clears — so eviction follows the session rather than the button.
status: open

### DW-233: the offline watchlist snapshot in localStorage is not cleared at sign-out

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), review pass
location: apps/client/src/features/events/hooks/useWatchlistSync.ts, apps/client/src/lib (watchlist offline storage from stories 5.1/5.4)
reason: (MEDIUM) Story 5.8 closed the in-memory react-query gap only; its spec explicitly forbade touching the localStorage layer. That layer is per-user keyed (`tiween:watchlist:pending-add:<userId>`), so it cannot be read under the wrong scope — but it is durable and never cleared, so the outgoing user's queued items (and any offline snapshot of their titles) remain on disk on a shared device after sign-out, readable by anyone with devtools or by a later session that resolves to the same id. Fix: decide the retention policy (clearing on sign-out costs the offline queue of a user who signs out while offline, which is why it is a call and not a patch), then clear or expire the outgoing user's entries on the shared sign-out path.
status: open

### DW-234: two divergent user-scope conventions for query keys now coexist

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), review pass
location: apps/client/src/features/venues/hooks/useVenueProfile.ts, apps/client/src/features/events/utils/watchlistKeys.ts
reason: (LOW) `venueProfileKeys` solved the same problem earlier with `UserScope = number | string` and an `"anonymous"` string sentinel; `watchlistKeys` (this story) uses a numeric-only scope with `UNRESOLVED_USER_ID = 0` and a docstring that forbids strings. Neither is wrong, but there is no shared helper, and `venueProfileKeys`' docstring claims "same rule as the watchlist keys" — which is now false. Cosmetic today; the cost is that the third feature to need user scoping has two contradictory templates to copy. Fix: extract one shared `userScope` helper with a single sentinel and have both factories use it, then correct the stale docstring.
status: open

### DW-235: `getQueryClient()` is per-call on the server, not request-scoped, so a future SSR prefetch would hydrate nothing

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), follow-up review pass
location: apps/client/src/lib/query-client.ts
reason: (LOW) The server branch returns a brand-new `QueryClient` on every call, which is exactly right for today's zero-prefetch setup and is what keeps concurrent SSR requests from sharing one cache. But TanStack's documented pattern memoizes it per request with React `cache()`, and the difference only shows up once someone adds a server-side `prefetchQuery` + `HydrationBoundary`: the prefetching component and `ClientProviders` would each get a _different_ client within the same request, so the dehydrated state would be empty and the page would silently fall back to a client fetch — a performance regression with no error and no failing test. The module docstring explains why there is no server singleton but never flags this consequence. Fix: wrap `makeQueryClient` in React `cache()` for the server branch (request-scoped rather than call-scoped) and note the prefetch contract in the docstring.
status: open

### DW-236: `useWatchlistToggle` is dead code, so its guards are unobservable

origin: story 5-8-user-scoped-watchlist-cache (2026-08-04), follow-up review pass
location: apps/client/src/features/events/hooks/useWatchlist.ts
reason: (LOW) A repo-wide grep for `useWatchlistToggle` across `apps/` matches only its own definition and docstring — it is not re-exported from `features/events/hooks/index.ts` and no component calls it; the detail-page and hero flows use `useAddToWatchlist` / `useRemoveFromWatchlist` instead. Story 5.8 hardened its `!userId` gate (a real defect had it been reachable), and its tests pass, but nothing it does is observable in the running app. Carrying an unused public-looking hook alongside the two real ones is a live trap: the next author may reasonably reach for it and inherit whatever drift it has accumulated. Fix: decide whether it is the intended public API (then export it and migrate the two call sites onto it) or vestigial (then delete it with its tests).
status: open

### DW-237: `GET /ticketing/my-tickets` has no users-permissions grant, and pre-existing paid orders get no QR backfill

origin: story 6-4-qr-code-ticket-generation (2026-08-04), review pass
location: apps/strapi/src/plugins/ticketing/server/src/routes/content-api.ts, apps/strapi/src/bootstrap/
reason: (MEDIUM) The new content-api routes need the corresponding users-permissions role permission enabled on deploy; there is no programmatic grant (compare `apps/strapi/src/bootstrap/venue-manager-role.ts`) and no config-sync entry, so "Mes Billets" can 403 on a fresh environment. Separately, every order created before this story has `accessToken = NULL` and every already-`paid` order has `qrCode = NULL`; the self-heal path only fires on a NEW confirm/webhook, which never arrives for a settled past order, so those tickets stay QR-less and guest-unreadable. Harmless today (ticketing is not live), but it must be handled before Epic 6 ships. Fix: add a bootstrap role grant for the ticketing read routes, and a one-shot migration that mints access tokens and issues QR for historical paid orders.
status: open

### DW-238: QR tokens have no expiry, no key id, and no rotation window; the order access token is stored in plaintext

origin: story 6-4-qr-code-ticket-generation (2026-08-04), review pass
location: apps/strapi/src/plugins/ticketing/server/src/services/qr.ts, apps/strapi/src/plugins/ticketing/server/src/content-types/ticket-order/schema.json
reason: (LOW) `qr.verify` checks prefix, version and HMAC only — the `iat` it signs is never enforced, and neither the payload nor the token carries a key id, so rotating `TICKET_QR_SECRET` invalidates every already-issued ticket at once with no dual-verify window. The per-order `accessToken` is stored unhashed, so a DB dump yields directly usable read credentials. Deliberately out of scope: the verification/rotation policy belongs with the scanner (Epic 8), which is the first real consumer of `verify`. Fix: add a `kid` to the token and accept the previous key during a rotation window, decide whether `iat` gets a max age, and store a hash of the access token instead of the token.
status: open

### DW-239: a guest who loses the locally stored order access token has no recovery path

origin: story 6-4-qr-code-ticket-generation (2026-08-04), review pass
location: apps/client/src/features/tickets/utils/orderAccess.ts, apps/strapi/src/plugins/ticketing/server/src
reason: (MEDIUM) The guest read credential lives only in that browser's `localStorage`: it is capped at 20 orders (oldest evicted), silently dropped when storage is blocked or in private mode, and lost entirely on a different device or an in-app webview that returns from Konnect in another browser. The buyer then has a paid order they cannot open. The intended recovery is Story 6.5 (email delivery of the tickets), which is not built yet, and account linking only covers a guest who later registers with the same email (`order.linkGuestOrders`). Fix: land 6.5's emailed ticket/retrieval link, and consider surfacing a "sent to your email" hint on the result page when a paid order has no locally stored token.
status: open

### DW-240: a paid ticket whose QR issuance has not landed shows a static placeholder with no refresh

origin: story 6-4-qr-code-ticket-generation (2026-08-04), review pass
location: apps/client/src/features/tickets/components/TicketList/TicketList.tsx, apps/client/src/features/tickets/hooks/useOrderTickets.ts
reason: (LOW) `toTicketView` returns `qrCode: null` until issuance runs, and `TicketList` renders the `qrPending` placeholder for it. There is no `refetchInterval`, so a buyer who lands on the result page in the window between the paid CAS and the ticket writes (or after a transient issuance failure) must manually reload before the QR ever appears. Fix: poll the ticket query while any returned ticket of a paid order still has `qrCode: null`, with a bounded number of attempts.
status: open

### DW-241: tickets created before this story keep an unsigned legacy `qrCode` that issuance can never replace

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/strapi/src/plugins/ticketing/server/src/services/qr.ts
reason: (MEDIUM) The `afterCreate` lifecycle removed by this story wrote an unsigned `{"ticketNumber","type"}` blob into `qrCode` for EVERY ticket at creation time (`git show babe606:.../bootstrap.ts`). `issueForOrder` treats any non-null `qrCode` as already issued — both in the cheap pre-filter (`if (ticket.qrCode) continue`) and in the CAS (`where: { qrCode: { $null: true } }`) — so those rows are skipped permanently, even on a fresh confirm. Meanwhile the new read endpoints serve that legacy blob to `TicketList`, which renders it as a scannable QR: the holder gets a forgeable code that `qr.verify` rejects as `QR_MALFORMED`. This also corrects the premise recorded in DW-237, which assumes historical paid orders have `qrCode = NULL`; they do not. Fix: have the backfill migration target legacy tokens explicitly (any `qrCode` not prefixed `TWQ1.`), or widen the pre-filter/CAS to treat a non-`TWQ1.` token as unissued so a later confirm self-heals it.
status: open

### DW-242: a cancelled ticket is displayed to its holder as "Event passed"

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/client/src/features/tickets/components/TicketList/TicketList.tsx, apps/client/src/features/tickets/components/TicketQR/TicketQR.tsx
reason: (LOW) The ticket content type has four statuses (`valid`/`scanned`/`cancelled`/`expired`) but the pre-existing `TicketQR` models only three, so `toQRStatus` folds `cancelled` into `expired`, whose label is "Événement passé" / "انتهى الحدث". A refunded or cancelled ticket therefore tells its holder the event has passed — wrong information, and the current `TicketList.test.tsx` codifies the mapping as intended. No cancellation flow exists yet, so nothing produces the status today. Fix: give `TicketQR` a fourth status with its own `ticketCard.cancelled` label in fr/ar/en when ticket cancellation/refunds land.
status: open

### DW-243: "Mes Billets" fans out one request per stored guest order on every mount

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/client/src/app/[locale]/tickets/MyTicketsView.tsx, apps/strapi/src/plugins/ticketing/server/src/routes/content-api.ts
reason: (LOW) `MyTicketsView` renders one `GuestOrderTickets` child — and therefore one `useOrderTickets` query — per entry from `listOrderAccess()`, capped only by `ORDER_ACCESS_LIMIT = 20`. A returning guest buyer issues up to 20 concurrent reads (plus react-query's default retries) against a public, un-rate-limited Strapi route on every visit to the page, with no batching or staggering. Fine at current volumes; it becomes a self-inflicted load pattern as guest purchase counts grow. Fix: add a batched "read these orders" endpoint, or bound the concurrent reads and load the rest on demand.
status: open

### DW-244: the QR payload's real-world density is never measured against the "scannable" design claim

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/strapi/src/plugins/ticketing/server/src/services/qr.ts, apps/client/src/features/tickets/components/TicketQR/TicketQR.tsx
reason: (LOW) The Design Notes justify the short payload keys and `level="H"` as keeping the code "scannable on a scratched/dimmed screen", but nothing bounds or asserts the result. A token built from realistic values (a normal `et` event title, real documentIds) measures ~376 characters, which `qrcode.react` renders at 97x97 modules — roughly 1.2px per module at the `small` (120px) size. `ti` (ticket documentId) is also redundant with `t` (ticket number), and `et` is an unbounded user-authored string that can push a ticket to a denser version still. Fix: cap or drop `et`, drop the redundant identifier, and add a test asserting a maximum token length (hence QR version) for a worst-case event title.
status: open

### DW-245: the guest ticket read is proxied with a READ-ONLY API token, which cannot reach a custom controller action

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/client/src/app/api/public-proxy/[...slug]/route.ts, apps/strapi/src/plugins/ticketing/server/src/routes/content-api.ts
reason: (MEDIUM) `useOrderTickets` calls `GET /ticketing/order-tickets/:orderNumber` with `useProxy: true`, and the public proxy REPLACES the client `Authorization` header with `createStrapiAuthHeader({ isPrivate: false })` — i.e. `STRAPI_REST_READONLY_API_KEY`. A Strapi read-only API token auto-grants the `find`/`findOne` actions only; `order.orderTickets` is a custom action and is not among them, so the guest read can 403 in a deployed environment no matter which users-permissions ROLE grant is added. That makes it a different defect from DW-237, whose proposed fix (a bootstrap role grant) would not help this route. The same substitution also means `ctx.state.user` is never a real user on this handler, so `findTicketsForOrder`'s `isOwner` branch — documented on the route, the controller and the service as one of two live authorization paths — is unreachable from the app; only the token path runs. Nothing in the change set exercises either route through a booted Strapi, so neither the 403 nor the dead branch is observable in the suite. Fix: verify the route end-to-end against a booted Strapi, and either grant the custom action to the token used by the public proxy (or a purpose-scoped token) or make the proxy forward the client's own headers for this endpoint; then either wire up or delete the `isOwner` branch and correct the three docstrings.
status: open

### DW-246: signing out destroys every stored guest order token, including ones sign-out has nothing to do with

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/client/src/lib/sign-out.ts, apps/client/src/features/tickets/utils/orderAccess.ts
reason: (MEDIUM) `signOutAndClearCache` calls `clearOrderAccess()`, which wipes the WHOLE `localStorage` store — not just the orders belonging to the session being ended. The shared-device rationale behind it (pass 1) is sound, but the blast radius is not bounded to that case: orders bought as a guest before the account existed, or under a different email so `order.linkGuestOrders` never claims them, lose their only read credential on an ordinary sign-out. Story 6.5 (emailed tickets) is the intended recovery path and is not built, so today this is permanent loss of access to a paid order. DW-239 covers losing the token to the 20-entry cap, blocked storage or a different device; it does not cover the app actively deleting it. Fix: scope the clearing to orders the signed-out account actually owns (the account link is known server-side), or keep the wipe but land 6.5's email retrieval first so there is a recovery path.
status: open

### DW-247: "Mes Billets" spins indefinitely when the device is offline

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/client/src/app/[locale]/tickets/MyTicketsView.tsx
reason: (LOW) react-query's default `networkMode: "online"` PAUSES a query while the device is offline — it neither resolves nor errors. `MyTicketsView` derives `isLoading` from the account query plus `hasPendingGuestRead`, and `hasPendingGuestRead` only clears when a `GuestOrderTickets` child observes `data` or `isError`, so an offline visit renders a `role="status"` spinner forever: no offline message, no timeout, no cached fallback. This is the scenario the inline-SVG QR was specifically introduced to serve (offline on event night, Design Notes / Story 6.7), so the page hangs precisely when it matters most. A pass-2 note rejected an offline branch as "unreachable-or-cosmetic"; the pause semantics make it reachable. Offline caching itself belongs to Story 6.7, but the indefinite spinner does not. Fix: treat `isPaused` as its own state with a translated offline message, and render tickets already in the react-query cache while offline.
status: open

### DW-248: `GET /ticketing/orders/:orderNumber` is still an existence + payment-status oracle on Strapi directly

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/strapi/src/plugins/ticketing/server/src/routes/content-api.ts, apps/strapi/src/plugins/ticketing/server/src/controllers/order.ts
reason: (LOW) Story 6.4 takes care that the new `order-tickets` route answers the SAME `FORBIDDEN` for a wrong token and an unknown order number, and both the controller and the service comment this as "no enumeration oracle". But the sibling `GET /orders/:orderNumber` route is still mounted with `policies: []` and needs no token: it answers 404 for an unknown order and 200 with `paymentStatus`, `totalAmount` and `purchasedAt` for a known one, over a short and guessable order number. It was only dropped from the NEXT proxy allow-list (Story 6.3) — anyone addressing Strapi directly still has the oracle, so the property the new route is careful to preserve does not actually hold for the order namespace. Pre-existing, and pass 1 correctly narrowed that route's projection rather than removing it. Fix: require the order access token on `findByOrderNumber` too (it is the same credential the result page already holds), or collapse it into the token-gated read.
status: open

### DW-249: Arabic `ticketCard.tickets` is not pluralized

origin: story 6-4-qr-code-ticket-generation (2026-08-04), follow-up review pass
location: apps/client/locales/ar.json
reason: (LOW) `fr`/`en` use ICU plurals (`{count, plural, one {# billet} other {# billets}}`) while `ar` ships the bare `"{count} تذكرة"`, so every count renders the singular noun ("5 تذكرة" instead of "5 تذاكر"). Passes 1 and 2 rejected a fix on the grounds that the bare `{count}` form is required by the repo's Western-numerals rule — that reasoning holds for `#` (which formats via CLDR and would emit Arabic-Indic digits) but NOT for an explicit `{count}` inside plural branches, which keeps Western numerals while still selecting the right form. `ticketingI18n.test.tsx` compares key SETS across locales, so it cannot see a value-shape divergence like this. Left deferred rather than patched because Arabic has six plural categories (`zero`/`one`/`two`/`few`/`many`/`other`) and choosing the noun form for each needs a native-speaker decision, not a mechanical edit. Fix: have an Arabic speaker supply the plural branches, apply the same treatment to any other counted `ar` key, and extend the i18n test to assert plural-shape parity rather than key-set parity alone.
status: open

### DW-250: CI does not run the boot-based integration suite (yarn test:integration) in apps/strapi, so boot-level regressions (route wiring, extension instantiation) are only caught by the default-gate unit guar

origin: spec-deferred e40dece0e02d
location: .github/workflows/ci.yml
source_spec: `4-7-fix-users-permissions-auth-controller-factory-wiring.md`
severity: medium
reason: .github/workflows/ci.yml runs only the default `yarn test` gate (testMatch `**/*.unit.test.ts`); no workflow or merge gate invokes `test:integration` / the `*.service.test.ts` suites. The suite itself is green and self-contained (SQLite + build:test-dist), so wiring it into CI is feasible but is a CI-infrastructure decision beyond this story's ACs.
status: open

### DW-251: The two production-deploy actions from Behavior Activation (confirm BREVO_SENDER_EMAIL/BREVO_SENDER_NAME before setting BREVO_API_KEY in prod, and run the firstName-NULL backfill query + decision on t

origin: spec-deferred 769f304d6ffe
location: \_bmad-output/implementation-artifacts/4-7-fix-users-permissions-auth-controller-factory-wiring.md (Behavior Activation)
source_spec: `4-7-fix-users-permissions-auth-controller-factory-wiring.md`
severity: medium
reason: Dev Agent Record, "Task 3.3 — Behavior Activation findings": welcome emails go live the moment BREVO_API_KEY is set, and users registered through the stock path have first_name = NULL (`SELECT COUNT(*) FROM up_users WHERE first_name IS NULL AND provider = 'local'`). Neither action is executable from this environment (no prod access), and unlike the CI gap (DW-250) neither was entered anywhere a deploy checklist would surface it.
status: open

### DW-252: CI does not run the boot-based integration suite (yarn test:integration) in apps/strapi, so boot-level regressions (route wiring, extension instantiation) are only caught by the default-gate unit guar

origin: spec-deferred e40dece0e02d
location: .github/workflows/ci.yml
source_spec: `4-7-fix-users-permissions-auth-controller-factory-wiring.md`
severity: medium
reason: .github/workflows/ci.yml runs only the default `yarn test` gate (testMatch `**/*.unit.test.ts`); no workflow or merge gate invokes `test:integration` / the `*.service.test.ts` suites. Duplicate of DW-250 (same spec-deferred source e40dece0e02d). The suite itself is green and self-contained (SQLite + build:test-dist), so wiring it into CI is feasible but is a CI-infrastructure decision beyond this story's ACs.
status: open

### DW-253: Follow-up review still recommended for 4-7-fix-users-permissions-auth-controller-factory-wiring after the damping cap was spent

origin: review-budget-followup
location: n/a
source_spec: `4-7-fix-users-permissions-auth-controller-factory-wiring.md`
severity: low
reason: The follow-up-review damping cap (limits.max_followup_reviews = 1) was spent with the story finalized (status: done, verify green) while the review pass still recommended an independent follow-up. The work was committed by bmad-loop run 20260806-161858-94c9; this entry preserves the lingering recommendation for a deliberate later review.
status: open

### DW-254: Pre-deploy migration rehearsal needed before shipping Strapi 5.51.2 to an environment with a pre-5.51 Postgres database

origin: review-defer
location: deployment process (no repo file)
source_spec: `spec-upgrade-strapi-5-51-2.md`
severity: medium
reason: The 5.33.1→5.51.2 upgrade was boot-verified against the dev Postgres container (migrations ran clean), but staging/production databases created under 5.33 with real rows were never exercised. The upgrade adds columns (admin api-token kind/owner relations, session metadata, user resetPasswordTokenExpiresAt, upload focalPoint) via boot-time schema sync, and rollback to 5.33 after that sync is non-trivial. Before deploying, restore a dump of the target database and boot 5.51.2 against it once.
status: open

### DW-255: strapi-plugin-config-sync pinned at 2.1.0 (disabled) — verify compatibility or upgrade to 3.x before re-enabling under Strapi 5.51

origin: review-defer
location: apps/strapi/package.json
source_spec: `spec-upgrade-strapi-5-51-2.md`
severity: low
reason: config-sync is exact-pinned at 2.1.0 and `enabled: false` in config/plugins.ts, so the 5.51.2 upgrade did not exercise it. Latest is 3.2.0 (major bump). The plugin serializes admin/permission schemas that changed in 5.51 (api-token kind, admin-scoped tokens), so whenever it is re-enabled it must first be validated or upgraded, and any committed sync export re-generated.
status: open

### DW-256: Regenerate apps/client/src/types/strapi-openapi.d.ts against the 5.51.2 server once in-flight schema work lands

origin: review-defer
location: apps/client/src/types/strapi-openapi.d.ts
source_spec: `spec-upgrade-strapi-5-51-2.md`
severity: low
reason: The committed client API types are generated from the running server's OpenAPI output (`yarn gen:strapi-types`), and @strapi/plugin-documentation jumped 5.33→5.51 (plus content-API surface additions like upload focalPoint). Regenerating now would also pull in uncommitted story-6.x schema changes (e.g. ticket-order confirmationEmailSentAt), tangling scopes — regenerate and diff after that work is committed.
status: open

### DW-257: The trending ranking metric (sum of screening.ticketsSold) is obsolete for the aggregation-only v1 and structurally biases against non-cinema events.

origin: spec-deferred 6e6dacafc464
location: apps/strapi/src/plugins/events-manager/server/src/services/events.ts (findTrending)
source_spec: `spec-3-2-category-filtering.md`
severity: low
reason: findTrending was widened to all categories (Story 3.2), but it still ranks by sum(screening.ticketsSold). Concerts/exhibitions have no screenings and always sum to 0, and in the aggregation-only v1 no tickets are sold at all, so every event sums 0 and the ranking degenerates to startDateTime order. The metric needs a post-pivot rethink (views, watchlist adds, or editorial curation) — related to the existing DW-19 durable-rollup deferral.
status: open

### DW-258: The public browse reads (findEvents/findEvent/findTrending) — including the new cinema/shorts nested relation filters — have no integration coverage against a real Strapi query engine.

origin: spec-deferred 76f0f42ce173
location: apps/strapi/src/plugins/events-manager/server/src/services/events.ts (CATEGORY_FILTERS/buildFilters)
source_spec: `spec-3-2-category-filtering.md`
severity: medium
reason: Every backend test mocks strapi.documents().findMany and asserts the built filter object's shape, which is self-referential: if the Document Service does not interpret `screenings: { movie: { type } }` as "has ≥1 matching screening" (or a Strapi upgrade changes deep-relation semantics — the repo just moved to 5.51.2), the Cinéma/Courts-métrages tabs return wrong rows while all suites stay green. The repo's opt-in boot integration suite (`yarn test:integration`, `*.controller.test.ts`) covers only the admin endpoints — no public-read case exists at all. Distinct from the generic "integration suites don't boot in this env" limitation (DW-5/DW-45): the fix is adding public findEvents cases (seed a film event, a short-film event, a screening-less movie_screening event; assert ?category=cinema and ?category=shorts each return exactly their own row) to the existing boot suite. Surfaced by the Verification Gap and Edge Case reviewers (2026-08-07 follow-up pass); a live curl check was not poss
status: open

### DW-259: Non-cinema event detail pages reuse the cinema-shaped "no screenings" empty state, which reads wrong for concerts/exhibitions.

origin: spec-deferred d24cb5d9a455
location: apps/client/src/features/events/components/EventDetailPage
source_spec: `spec-3-2-category-filtering.md`
severity: low
reason: The 3.2 widening deliberately makes screening-less concert/exhibition events reachable on the detail route, and EventDetailPage.noncinema.test.tsx locks in that they render the `noShowtimes` copy ("Aucune séance disponible") — semantically wrong for events that never have screenings. The 3.2 intent scopes the story to the listing and only requires the detail page to render (no cinema-only 404), so a category-aware detail treatment (neutral or per-category empty state/copy) is follow-up work. Surfaced by the Blind Hunter (2026-08-07 follow-up pass).
status: open

### DW-260: Desktop-prototype mockup pages film-detail and theater-detail remain routable in production and render hardcoded ticket prices and dead "Réserver des billets" CTAs regardless of the purchase flag.

origin: spec-deferred 8ae68dbf9f3b
location: apps/client/src/app/[locale]/desktop-prototypes/{film-detail,theater-detail}/page.tsx
source_spec: `spec-3-12-gate-ticketing-entry-points-for-v1.md`
severity: low
reason: apps/client/src/app/[locale]/desktop-prototypes/film-detail/page.tsx renders `{showtime.price} DT` (~line 445) plus a static reserve button (~line 464); theater-detail/page.tsx renders "25 TND" (~line 350) and the same dead CTA (~line 360). Static design mockups predating story 3-12; the middleware gate deliberately covers only desktop-prototypes/ticketing\*. Broader question is whether any /desktop-prototypes route should ship in production builds at all.
status: open

### DW-261: `yarn workspace @tiween/client build` fails on pre-existing strict TypeScript errors unrelated to story 3-12; the failure reproduces identically at the story's baseline revision.

origin: spec-deferred 7cbdae7ccc17
location: apps/client (next build TypeScript phase)
source_spec: `spec-3-12-gate-ticketing-entry-points-for-v1.md`
severity: medium
reason: At HEAD and at baseline e3c3f49 alike, the build's "Running TypeScript" phase stops — first on desktop-prototypes/ticketing-quantity/page.tsx (`quantities[type.id]` possibly undefined under noUncheckedIndexedAccess), then on events/[documentId]/page.tsx:211 (`EventSchema` not assignable to JsonLd's `Record<string, unknown>`). `tsc` reports the same 63 pre-existing errors at HEAD and at the pre-patch state (strapi-api/content/venues.ts locale strings, apps/strapi types imports, EventDetailPageWithMap ShowtimeButton prop drift, …). The spec's originally recorded "build: compiles successfully" could not be reproduced in this environment. Surfaced by the 2026-08-07 follow-up review pass.
status: open

### DW-262: Manager-supplied media ids (event `imageIds`, work `posterId`) are accepted as any positive integer and linked without an existence or ownership check.

origin: spec-deferred 503bacb6d76e
location: apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts
source_spec: `spec-7-3-event-creation.md`
severity: medium
reason: `validation/venue-events.ts` validates shape only, and the service writes the ids straight into the `images` / `poster` relations. A manager could guess an upload id belonging to another venue and attach it to their own public event. NOT caused by this story: `venues/validation/profile.ts` and `registration.ts` accept `fileId` the same way (7.1/7.2), so this is one platform-wide gap in the upload surface, best fixed once for all three callers alongside the scoped upload proxy `docs/PERMISSIONS.md` already records as owed.
status: open

### DW-263: Backend per-field `issues` are transported but never rendered as inline field errors — a VALIDATION_FAILED relay shows only a generic toast.

origin: spec-deferred 2ad2bfafefaa
location: apps/client/src/features/venues/schemas/venue-events.ts
source_spec: `spec-7-3-event-creation.md`
severity: medium
reason: The controller deliberately forwards `details.issues` for mapped codes, but `extractVenueEventErrorCode` keeps only the top-level code and the form has no path to attach the issues to fields. Any drift between the mirrored client/server schemas — the exact risk of maintaining two — is undiagnosable for the manager. Pre-existing shape: 7.2's `extractVenueProfileErrorCode` does the same.
status: open

### DW-264: `listMine` silently truncates at 200 events with no pagination and no signal to the manager.

origin: spec-deferred ffcee7042436
location: apps/strapi/src/plugins/events-manager/server/src/services/venue-events.ts
source_spec: `spec-7-3-event-creation.md`
severity: low
reason: Both Document Service reads pass `limit: 200`; a venue past that count loses its oldest events from the dashboard, and the `isPublished` flag derived from the second read could also miss rows. Not reachable for any current venue, so not worth blocking the story.
status: open

### DW-265: Event slug collisions surface as an opaque 500 rather than retrying.

origin: spec-deferred 3695677da150
location: apps/strapi/src/plugins/events-manager/server/src/services/venue-events.ts
source_spec: `spec-7-3-event-creation.md`
severity: low
reason: `generateEventSlug` appends 6 random base-36 chars and `slug` is a unique `uid` field; a collision fails the whole transactional create and the manager sees EVENT_CREATE_FAILED with no recourse but resubmitting. Astronomically unlikely per event, but the fix (retry on unique violation) is cheap and the failure is user-visible.
status: open

### DW-266: `VenueEventsList` is the only new component with no test.

origin: spec-deferred 982ea94498db
location: apps/client/src/app/[locale]/venue/events/\_components/VenueEventsList.tsx
source_spec: `spec-7-3-event-creation.md`
severity: low
reason: The form, preview, hooks and schemas all have suites; the list's empty state, draft/published badges, error-code translation and preview links are unexercised, as are the three `page.tsx` session guards.
status: open

### DW-267: Publishing invalidates only manager-scoped query keys, so public event caches stay stale in the same browser session.

origin: spec-deferred 34c4580c00a1
location: apps/client/src/features/venues/hooks/useVenueEvents.ts
source_spec: `spec-7-3-event-creation.md`
severity: low
reason: `publishEventMutation` invalidates the venue-events list and detail keys only. A manager who publishes and then browses to `/events` or the homepage featured slice can be served a cached response that omits the event they were just told is live.
status: open

### DW-268: `EventDetailPageDesktop` and `EventDetailPageWithMap` still declare function-typed label fields.

origin: spec-deferred spec-fix-rsc-function-labels
location: apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx
source_spec: `spec-fix-rsc-function-labels.md`
severity: low
reason: `EventDetailPageDesktop.tsx:56,64` and `EventDetailPageWithMap.tsx:66` keep `priceFrom`/`ticketsAvailable` as `(x) => string` in their own local label interfaces. Neither component is rendered anywhere (`grep '<EventDetailPageDesktop'` and `'<EventDetailPageWithMap'` return no hits), so neither sits behind an RSC boundary and neither can trigger the "Functions cannot be passed directly to Client Components" crash today. They were deliberately left out of the fix so the change stayed scoped to the three live routes; if either is ever wired to a server route it must move its parameterized lookups to `useTranslations` first. `EventDetailPageWithMap.tsx:702` also hardcodes French ("À partir de"), which the same pass would remove.
status: open

### DW-269: `events.ticketsAvailable` is now an orphaned message key in all three catalogs.

origin: review-deferred spec-fix-rsc-function-labels
location: apps/client/locales/fr.json:297
source_spec: `spec-fix-rsc-function-labels.md`
severity: low
reason: The RSC-serializability fix removed `ticketsAvailable` from `EventDetailPageLabels`, its `defaultLabels` and the `/[locale]/events/[documentId]` route label object — the field was declared and defaulted but never rendered. `events.ticketsAvailable` ("{count} billets disponibles" / "{count} tickets available" / "{count} تذكرة متاحة") now has no live consumer; the only remaining references are the hardcoded French defaults inside the unrendered `EventDetailPageDesktop` / `EventDetailPageWithMap` (see DW-268). Left in place because the spec forbade locale-file edits and the key should be re-wired, not deleted, if per-showtime availability wording is ever surfaced. Surfaced by the 2026-08-07 review pass.
status: open

### DW-270: Badge and availability counts use flat interpolation, not ICU plurals — grammar is wrong at count = 1 in every locale.

origin: review-deferred spec-fix-rsc-function-labels
location: apps/client/locales/fr.json:634
source_spec: `spec-fix-rsc-function-labels.md`
severity: medium
reason: `home.bottomNav.unscannedTickets`, `home.bottomNav.notifications` and `events.ticketsAvailable` are flat `{count} …` strings, so a single item reads "1 billets non scannés" / "1 unscanned tickets". Now that these resolve through next-intl's `t(key, { count })` on the client, the fix is a one-line catalog change per key to `{count, plural, one {…} other {…}}` — and Arabic needs the full `zero/one/two/few/many/other` set, which no current key exercises. NOT caused by the RSC fix: the same flat strings were passed to the same `t(key, {count})` call before, just from the server side. Deferred because the spec explicitly forbade locale-file edits.
status: open

### DW-271: `BottomNav`, a `components/layout` primitive, is now hard-coupled to the `home.bottomNav` message namespace.

origin: review-deferred spec-fix-rsc-function-labels
location: apps/client/src/components/layout/BottomNav/BottomNav.tsx
source_spec: `spec-fix-rsc-function-labels.md`
severity: low
reason: Resolving the count-interpolated badge labels inside the component (the RSC fix) means a shared layout primitive now reads `home.*` strings. If the bottom nav is ever mounted on a venue, tickets or account shell it still pulls the home namespace. Options: accept a `namespace` prop, hoist the badge lookup into the three `HomePage*` wrappers that already own the namespace, or relocate the keys to a shared `nav.*` namespace (a locale edit, hence deferred). No user-visible impact today — the nav renders only from the homepage islands.
status: open

### DW-272: Function-typed label fields remain across seven further components (extends DW-268).

origin: review-deferred spec-fix-rsc-function-labels
location: apps/client/src/features/events/components/FilmHero/FilmHero.tsx
source_spec: `spec-fix-rsc-function-labels.md`
severity: low
reason: Beyond the two dead components in DW-268, `(x) => string` label fields survive in `FilmHero.tsx:36` (`inVenues`), `VenueCard.tsx:31,33` (`eventsThisWeek`, `distanceAway`), `Footer.tsx:21` (`copyright`), `TicketQR.tsx:58` (`tickets`), `TicketTypeList.tsx:24` and `TicketSelectionList.tsx:24` (`remaining`), `SearchResults.tsx:19` (`resultsFor`), and `GroupedTicketList`/`TicketPreviewCard` (`viewTicket`). None is fed from a Server Component today — every current caller is a client component (e.g. `TicketTypesSection.tsx:84`, `WatchlistPageClient.tsx`, `SearchPageClient.tsx`), so none can trigger the crash. The three routes that DID cross the boundary are fixed and guarded. Wiring any of these to a server route without first moving the parameterized lookup to `useTranslations` reintroduces "Functions cannot be passed directly to Client Components". A lint rule or a `Serializable<T>` type helper on `*Labels` interfaces would make this structural rather than per-site.
status: open

### DW-273: The HTTPS-redirect layer in the Next proxy drops the query string and trusts the `Host` header.

origin: review-deferred spec-migrate-middleware-to-proxy
location: apps/client/src/proxy.ts
source_spec: `spec-migrate-middleware-to-proxy.md`
severity: medium
reason: Four defects in one seven-line block, all PRE-EXISTING — the middleware→proxy rename moved the code verbatim and did not touch this logic. (1) The target is built from `req.nextUrl.pathname` only, never `req.nextUrl.search`, so every production http→https bounce silently drops `?callbackUrl=`, Konnect payment-result params, and UTM tags. (2) The host comes from the unvalidated `req.headers.get("host")` with no allow-list, so a spoofed `Host` yields a 301 off-site — and browsers cache 301s. (3) `xForwardedProtoHeader.includes("https")` is a substring test, so `"httpsx"` and a chained-proxy list like `"http,https"` both pass as secure; the correct form splits on `,` and compares the first entry exactly. (4) A 301 downgrades POST to GET, losing the body — 308 is the method-preserving code. The layer is now test-pinned (`proxy.flag.test.ts`, "HTTPS redirect (production only)"), so any fix has a harness waiting; the existing cases deliberately use query-less paths, so adding a `?a=1` case will fail until (1) is fixed. Deferred, not fixed: the spec's Boundaries forbade behavioural changes to this block, and only Heroku production traffic reaches it.
status: open

### DW-274: `apps/client` is never type-checked in CI, and its `next build` is already red on main.

origin: review-deferred spec-migrate-middleware-to-proxy
location: apps/client/package.json
source_spec: `spec-migrate-middleware-to-proxy.md`
severity: high
reason: CI's "Type Check" job runs `yarn type-check` → `turbo type-check`, but `apps/client/package.json` names the script `typecheck` (no hyphen) while `apps/strapi` uses `type-check`. Turbo silently runs the task only where it exists, so the client's `tsc --noEmit` has never run in CI — verified locally: `yarn type-check` at the root exercises `@tiween/admin` alone. Behind that gap sit 63 real type errors, five of them in `src/app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx` (TS2532, `quantities[type.id]` possibly undefined), which make `yarn workspace @tiween/client build` fail outright — so CI's "Build all apps" job should also be red on main today. Fix is one word (rename the script to `type-check`), but it will surface all 63 errors at once, so it needs its own story.
status: open

### DW-275: `apps/client/tsconfig.json` still includes the dead `.next/types/**/*.ts` path.

origin: review-deferred spec-migrate-middleware-to-proxy
location: apps/client/tsconfig.json
source_spec: `spec-migrate-middleware-to-proxy.md`
severity: low
reason: Next 16.1 moved generated route types to `.next/dev/types/` — the tracked `next-env.d.ts` already points at `./.next/dev/types/routes.d.ts` — but `tsconfig.json:16` still includes `.next/types/**/*.ts`, a directory that no longer exists locally. Typed-route declarations are therefore outside the `tsc --noEmit` program, silently, with no error to notice. Fallout of the Next 16.1 upgrade, not of the proxy rename; the `next-env.d.ts` line appears in this story's diff only because Next regenerates that file on `next dev`. Pairs naturally with DW-274, since neither is observable until the client is actually type-checked in CI.
status: open

## Deferred from: code review of 1-1-initialize-monorepo-from-starter-template.md (2026-08-08)

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/lib/strapi-api/content/server.ts:37-39
  severity: medium
  summary: `getDateRange` shifts every date range back one day at positive UTC offsets.
  evidence: `today.setHours(0,0,0,0)` yields local midnight, then `.toISOString().split("T")[0]` converts to UTC — at UTC+1 (Tunisia) that resolves to yesterday. Affects every branch of `getDateRange` and `buildDateFilter`. Currently masked because its only callers are the three dead fetchers; becomes live the moment they are reused. A tested `@/lib/dates` module already exists and should be the route.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/lib/strapi-api/base.ts:153-182
  severity: medium
  summary: `fetchAll` fans out unbounded concurrent requests, crashes on missing pagination meta, and returns misleading synthetic meta.
  evidence: Every remaining page is requested at once via `Promise.all` with no concurrency cap and no per-page error handling, so one rejection loses all succeeded pages. `firstPage.meta.pagination.pageCount` is read unguarded. `pageCount === 1` should be `<= 1` so an empty result set short-circuits. The returned meta sets `pageSize` to the total row count.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/lib/strapi-api/base.ts:214
  severity: low
  summary: `fetchOneBySlug` returns the oldest matching entry rather than the newest.
  evidence: Sorts `publishedAt: "desc"` then calls `response.data.pop()`, taking the last element of a descending list — the opposite of its "return last published entry" comment. `fetchOneByFullPath` shares the bug but is masked by `pageSize: 1`. No consumers in `apps/client` today.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/components/elementary/ImageWithPlaiceholder.tsx:13,51,62
  severity: low
  summary: `ImageWithPlaiceholder` can never generate a placeholder for locally-uploaded media, and renders an unusable src in its error branch.
  evidence: `formatStrapiMediaUrl` returns a relative path for local uploads; Node's `fetch` throws `TypeError: Failed to parse URL` on relative input, so every local upload falls to the 50x50 fallback. `imageProps` is derived from raw `props`, so the `plaiceholderError` branch renders the unformatted Strapi path. No `response.ok` check and no fetch timeout. Component has zero importers.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/lib/strapi-api/
  severity: medium
  summary: No test coverage for `base.ts`, `content/server.ts`, or `sitemap.ts`.
  evidence: `getDateRange`/`buildDateFilter` (pure, five branches, carrying a timezone bug), `fetchAll` pagination, `fetchOneBySlug` ordering, and `buildUrl`/`buildAlternates` are all trivially unit-testable and all contain defects found in this review. The event detail page test mocks `content/server` wholesale, so query construction never executes.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/lib/strapi-api/content/server.ts:155,218,322,399
  severity: medium
  summary: Fetch failures are swallowed into empty results, making an outage indistinguishable from "no data".
  evidence: Every fetcher catches and returns `null`/`[]`/`{events: [], total: 0}` with only a `console.error`. The UI renders a confident empty state, pages cache as empty, and nothing reaches an error boundary or monitoring. This is exactly what hid the sitemap 400 for months.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/app/sitemap.ts
  severity: low
  summary: Sitemap coverage and correctness gaps beyond the 400-error bug.
  evidence: No `x-default` hreflang anchor; `venues/`, `venue/`, `shorts/`, and `events/` index routes are never listed; a hard `pageSize: 500` single request with no pagination loop silently truncates once the catalogue grows; category query-string URLs are emitted as distinct entries, inviting duplicate-content handling; rejected locale promises are dropped without logging.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/app/[locale]/layout.tsx:107-119
  severity: low
  summary: Document has no `<main>` landmark or skip-to-content link.
  evidence: Children are wrapped in `<div className="flex-1"><div>{children}</div></div>`. With navbar and footer still TODO at lines 108 and 118, the document currently has no landmarks at all. Worth fixing the `<main>` independently of the navbar work.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/lib/strapi-api/content/server.ts:266-408
  severity: medium
  summary: `getFeaturedEvents`, `getUpcomingEvents` and `getTodayEvents` send a query shape the backend rejects.
  evidence: All three send nested `filters`/`populate`/`pagination` plus an array-form `sort`, which the 3.1a browse endpoint strips or 400s on (verified live: the equivalent shape returns INVALID_QUERY). Their `filters.status`/`startDate`/`endDate` also target fields the event schema does not declare (`startDateTime`/`endDateTime` are the real ones). Zero consumers today — `events-extended.ts` (`fetchEvents`, `getFeaturedSlice`) already supersedes them with a working implementation, which is why the defect went unnoticed.
  reason_deferred: Superseded, zero consumers — delete as part of a dedicated cleanup pass, not a 7-month-old story.
  status: open

- source_spec: `1-1-initialize-monorepo-from-starter-template.md`
  location: apps/client/src/app/[locale]/layout.tsx:23-64
  severity: medium
  summary: The locale layout ships hardcoded English metadata to `ar` and `fr`, while a translated helper sits unused.
  evidence: `metadata` is a static object on a `[locale]` layout, so titles and OG/Twitter copy are English for every locale — violating the project-context i18n rule "Use `useTranslations` — Never hardcode strings". `getMetadataFromStrapi` (`lib/metadata/index.ts:13`) already reads the `seo` translation namespace but has zero callers. The object is also missing `metadataBase`, `alternates`, and any OG image. Routes without their own `generateMetadata` (`/search`, `/watchlist`, `/shorts`) are affected.
  reason_deferred: Superseded, zero consumers — belongs with the i18n metadata story rather than monorepo initialization.
  status: open

- source_spec: none
  summary: Rebrand the global theme to the 2026-08-08 design handoff palette (aubergine/gold) in apps/client/src/styles/theme.css.
  evidence: Split from the "Court Métrage Détail" design-handoff build on 2026-08-08. The handoff (design_handoff_tiween/README.md) specifies a single dark aubergine/gold system (bg/root #161015, bg/raised #241326, gold/primary #D4A24A, gold/text #E0B563) that contradicts the current Tiween brand tokens (--color-tiween-green #032523, --color-tiween-yellow #F8EB06) and the shadcn HSL mappings built on them. A global swap re-skins all ~10 client features plus every Storybook story, and only 5 B2C screens have handoff coverage — so it is independently shippable and needs its own visual review pass. The short-film detail page ships first with the palette scoped to its route; this story then hoists those declarations into theme.css and removes the local scope.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: Add the "Équipe artistique" crew grid and the streaming access sub-label to the short-film detail page.
  evidence: Split out on 2026-08-08 to bring the parent spec under the 1600-token scope ceiling. Both need a data-model extension that the page rebuild does not otherwise require - `ShortFilm` has no `crew` field (only `directors`), so the handoff's role/name grid (Réalisation, Scénario, Image, Montage, Musique - `Court Métrage Détail.dc.html:208-214`) has nothing to read; and `StreamingLink` has no access-type field, so the teal "Inclus / Gratuit / VOST" sub-label under each platform name (`:103`) cannot be rendered. Work: add `crew?: Array<{ role: string; person: StrapiPerson }>` to `ShortFilm` and `accessType?: "free" | "included" | "subscription" | "rental"` to `StreamingLink` (deprecating the hardcoded-FR `StreamingLink.label`), populate both on the mock films, add the `shorts.crew.*` and `shorts.access.*` i18n keys, and render the two sections in `ShortFilmDetail`.
  status: open

## Deferred from: code review (2026-08-08)

Adversarial review of Epic 2C — stories `2c-1-extract-venues-plugin` (commit
`446f578`) and `2c-3-catalog-move-into-creative-works` (commits `1058c76`,
`1f4fb82`) — run in no-spec mode. Findings were re-verified against HEAD
(`0b18c9d`); the majority of what the review layers raised had already been
fixed by later stories (2D-1, 7.2, 7.3) and was dismissed rather than logged.

- source_spec: n/a (no-spec code review of 2C.1 / 2C.3)
  location: apps/strapi/src/plugins/events-manager/admin/src/hooks/useShowtimes.ts:86, components/PlanningCalendarNew/index.tsx:173, components/EventEditModal/index.tsx:80,102,109, components/EventCreationModal/index.tsx:99
  severity: high
  summary: The admin planning surface is still built entirely on the retired `showtime` content type and cannot be mechanically retargeted.
  evidence: 2C.3 split `showtime` into `screening` + `performance` and dropped the `showtime` registration, but these four components still GET/PUT/POST `/content-manager/collection-types/plugin::events-manager.showtime`, which now 404s. This is not a UID swap - the whole field model changed: `datetime` -> `startDateTime`, `format` -> `videoFormat` (screening only, new enum values), `language` -> `audioLanguage`, `subtitles` -> `subtitleLanguage` (screening) / `surtitleLanguage` (performance), and `premiere` / `parentShowtimeId` / `event.creativeWork` are gone entirely. The venue link also moved: sub-events now reach a venue via `event.venue`, not a direct `venue` field. Reachable from the Planning page (`pages/Planning/index.tsx:158`) and `components/PlanningTab.tsx:95`. Fixing it requires product decisions - how one calendar renders two heterogeneous sub-event types, and which of the diverging fields each modal exposes - so it is a story, not a patch. The one unambiguous instance (the venue delete guard in `useVenuesEnhanced.ts`) was fixed during this review.
  status: open

- source_spec: n/a (no-spec code review of 2C.1 / 2C.3)
  location: apps/strapi/src/plugins/entity-properties/admin/src/pages/{App,HomePage,Categories,Definitions}.tsx
  severity: low
  summary: Placeholder admin UI still ships in the `entity-properties` plugin that 2C.5 deletes, while the `venues` admin has no replacement property management.
  evidence: 2C.1 added a SideNav plus three placeholder pages to a plugin its own config marks "DEPRECATED ... removed entirely in story 2C.5", and `HomePage`'s subtitle points at venues from the wrong plugin. The venues admin (`venues/admin/src/pages/App.tsx`) is a bare stub with no property-category/definition screens. Resolves itself when 2C.5 lands, provided the replacement screens are part of that story.
  status: open

- source_spec: n/a (no-spec code review of 2C.1 / 2C.3)
  location: apps/strapi/src/components/common/video.json
  severity: low
  summary: `video` carries two overlapping enums (`type` and `videoType`) with no backfill from the old to the new.
  evidence: 2C.3 added lowercase `videoType` alongside the legacy uppercase `type` (`FULL_LENGTH`/`TEASER`/`CLIP`), and `1f4fb82` dropped `videoType`'s default. Existing rows therefore read `videoType: null`. The schema description now documents this as deliberate ("kept for historic rows only; leave it as it is"), so this is planned debt rather than a defect - logged so the eventual backfill-and-drop is not forgotten.
  status: open

- source_spec: n/a (no-spec code review of 2C.1 / 2C.3)
  location: apps/strapi/src/plugins/venues/admin/src/index.tsx:14
  severity: low
  summary: The venues admin menu link declares `permissions: []`, making the plugin visible to every admin role.
  evidence: Copied from the `geography` sibling during the 2C.1 scaffold. Epic 7 gives Venue Manager a real permission boundary, so the menu entry should carry the matching RBAC condition rather than an empty allow-all array.
  status: open

- source_spec: n/a (no-spec code review of 2C.1 / 2C.3)
  location: apps/strapi/tests/fixtures/events.ts:155-160
  severity: low
  summary: `cleanupContent` can loop forever, and never cleans the person/genre documents its own factories create.
  evidence: The teardown re-queries `findMany({ limit: 100 })` inside `while (items.length > 0)` with no iteration cap and no per-item error handling, so a single undeletable document spins the loop indefinitely. The UID list also omits person and genre, which works created via the fixtures pull in - leaving cross-test residue and unique-slug collisions on repeated runs. Not yet biting because the boot-based suites that use these fixtures are opt-in (`yarn test:integration`).
  status: open

- source_spec: n/a (no-spec code review of 2C.1 / 2C.3)
  location: apps/strapi/scripts/seeds/index.ts
  severity: low
  summary: Seed data nits - constant sub-event `order` and a UTC/local hour skew.
  evidence: Every sub-event of an event is written with a hard-coded `order: 1` instead of an incrementing index, making the field useless for the ordering it exists for; and `setUTCHours` is used to build showtimes, putting Tunisian (UTC+1) times an hour off local. Dev-seed realism only - no production path.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: The short-film detail watchlist heart is local-only state and forgets on navigation.
  evidence: The spec Ask-First'd wiring the heart to `useAddToWatchlist`/`useRemoveFromWatchlist` and the human chose local optimistic state, because shorts run on `mock-shorts.ts` with synthetic `documentId`s that would POST garbage to the creative-work-keyed watchlist API. The heart therefore toggles, animates, and resets on every navigation or back-button return. `WatchlistButton` and the hooks already exist. Wire it when shorts move from mock data to Strapi creative works; until then a visibly-toggling heart that silently forgets is arguably worse than none.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: `/[locale]/shorts/[slug]` metadata is hardcoded French for every locale, with no canonical and no JSON-LD.
  evidence: The spec deliberately left `generateMetadata` untouched, so this is pre-existing. `page.tsx` emits "Court métrage non trouvé - Tiween" and "Découvrez {title}..." for `ar` and `en` alike, even though the page body is now fully translated through the new `shorts` namespace. It also sets `robots: { index: false, follow: false }` with no `alternates.canonical`, while the page's own share button publishes a canonical-looking URL. Event detail pages already emit JSON-LD via `src/lib/seo/structured-data.ts`; a Movie/ShortFilm schema is the obvious peer. Fix with `getTranslations` in the same pass.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: `originalTitle`, `country`, `language` and the film's own `rating` are no longer surfaced anywhere on the short-film detail page.
  evidence: The 2026 handoff has no "Informations" block, so the rebuild dropped the fields the previous implementation rendered (Langue / Pays / Année / Durée plus a rating star and the original title under the H1). All four remain populated on `ShortFilm` and in `mock-shorts.ts`. Note the inconsistency this creates: related cards show a rating but the film being viewed does not, and for a bilingual FR/AR site the Arabic `originalTitle` next to the French title is a plausible omission rather than dead data. Product decision - either fold them into the hero meta line or drop them from the type.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: `ShortsDirectory` is unreachable dead code, and its new router-push navigation is untested with no glob that would run a test.
  evidence: The spec asserted `ShortFilmDetail` had zero consumers; that was wrong - `ShortsDirectory` rendered it as a modal, so the rebuild forced a minimal change there (card tap now `router.push`es to `/{locale}/shorts/{slug}`, dead modal block removed). But no route renders `ShortsDirectory` - `/[locale]/shorts` renders `_components/ShortsShowcase` instead, and every other reference is a barrel re-export. There is no `ShortsDirectory` test and the vitest include added by this story is scoped to `ShortFilmDetail/**`, so a test placed there would silently never run. Either delete the component or wire it up, test it, and widen the glob to `src/features/shorts/components/**/*.test.tsx`.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: The short-film detail page has no forced-colors / Windows High Contrast handling.
  evidence: Every affordance in `ShortFilmDetail.module.css` is carried by a gradient or a translucent background - the hero placeholder stripes, the scrim, the streaming logo tile, the cast avatars, the related-card frame and its meta scrim. Under `forced-colors: active` all of them collapse to flat system colors and the card/hero structure disappears. The reduced-motion block is the file's only accessibility media query. The spec's accessibility floor covered contrast, focus rings, touch targets, bdi and reduced motion, but not forced colors.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-short-film-detail-design-handoff.md`
  summary: The client app now ships two icon libraries - `@phosphor-icons/react` alongside `lucide-react`.
  evidence: The human explicitly chose Phosphor for handoff fidelity (the design specifies Phosphor v2.1.1 and the handoff README prescribes the native package). But lucide-react is used across ~127 files and Phosphor is currently consumed by one component, so both now ship. Decide whether this is the start of a migration - in which case it needs a decision record and a plan - or whether Phosphor stays scoped to handoff-derived screens. Also note `vitest.config.ts` needed `/@phosphor-icons\//` added to `server.deps.inline` for the existing single-React aliasing scheme.
  status: open

## Deferred from: bmad-build pre-flight (2026-08-08, events-manager admin UI rebuild)

Found while committing the uncommitted client work that predated this story.

- source_spec: none (pre-flight of the events-manager admin UI rebuild)
  location: apps/client/package.json (`typecheck` script), .github/workflows/ci.yml:112
  severity: high
  summary: The client app has never been type-checked by CI, and now carries 46 TypeScript errors.
  evidence: Root `package.json:23` runs `turbo type-check` and `turbo.json:20` defines a
  `type-check` task, but the client workspace named its script `typecheck` (no hyphen), so
  turbo matched nothing and CI's `yarn type-check` step passed while skipping the client
  entirely. Renaming the script to `type-check` was staged in the working tree and is
  deliberately NOT committed here, because it turns CI red immediately: `tsc --noEmit` on the
  client reports 46 errors across ~25 files, overwhelmingly `noUncheckedIndexedAccess`
  fallout (`Object is possibly 'undefined'`, `string | undefined` not assignable), plus three
  real defects — `StrapiVenue` has no `latitude`/`longitude` yet `app/api/events/nearby/
route.ts` reads both; `Map/types.ts` declares `VenueType` without exporting it, breaking two
  importers; and `content/{geography,venues}.ts` pass unnarrowed `string` where the `Locale`
  union is required (the same bug `content/server.ts` just fixed via `asLocale`). This is the
  exact shape of the eslint-plugin-only-warn finding that became stories 1-10..1-13: a
  disabled gate hiding accumulated debt. Needs a story to fix the errors, then flip the script
  name in the same PR so the gate goes green and stays enforced.
  status: open

- source*spec: none (pre-flight of the events-manager admin UI rebuild)
  location: apps/client/src/lib/strapi-api/content/server.ts (`toISODate`)
  severity: medium
  summary: Date-range filters are off by one day at positive UTC offsets, including Tunisia (UTC+1).
  evidence: `getDateRange` builds local midnight (`today.setHours(0,0,0,0)`) then formats it
  through `toISOString()`, which converts to UTC and yields the \_previous* calendar day for
  any positive offset. So "today" / "tomorrow" / "this weekend" browse filters select a range
  starting a day early for the platform's primary market. The 2026-08-08 commit centralised
  the conversion in `toISODate` and preserved the existing semantics on purpose, to keep that
  change a pure type fix — the behavioural fix is this entry.
  status: open

## Deferred from: calendar build-vs-buy audit (2026-08-08)

Full evidence and the decision:
`_bmad-output/project-planning-artifacts/calendar-build-vs-buy-2026-08-08.md`.
Decision was to build on `BigCalendar` and, if it warrants investment, extract it
as a standalone open-source project rather than adopt a third-party library.
These entries are that project's roadmap, not plugin-local chores.

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/types.ts:107, BigCalendar.tsx:54-69
  severity: high
  summary: BigCalendar's `timezone` prop is declared and threaded through every view but never read, so the grid renders browser-local against UTC data.
  evidence: `types.ts:107` declares `timezone?: string` and `types.ts:138,148,161` thread it into DayView/WeekView/TimeGrid props, but `BigCalendar.tsx:54-69` never destructures it and no consumer reads it. All grid math anchors on wall-clock local time (`utils.ts:30-38 setTimeOnDate` via `setHours`). A showtime stored in UTC therefore renders at the wrong hour for any admin outside UTC+1. The planning-surface rebuild works around this by converting explicitly in its own transform layer; the component itself is unfixed.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/utils.ts:276,285-288,353-356
  severity: low
  summary: DST transition days misalign events and the now-indicator against the time ruler by roughly one slot.
  evidence: `utils.ts:276` computes `gridDuration` as an ms difference while slot boxes use fixed pixel heights (`types.ts:184`), and the slot loop (`utils.ts:148`) always emits a fixed count. On a 23- or 25-hour day the percentage-based positions from `calculateEventPosition` and `calculateNowIndicatorPosition` drift from the ruler and the shifted hour is unreachable. Severity is low for this product specifically: Tunisia abolished DST in 2009, so local admins never hit it. Raise the severity if the admin is ever used from a DST-observing timezone.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/{TimeGrid.tsx:143, WeekView.tsx:248, NowIndicator.tsx:43}
  severity: medium
  summary: BigCalendar cannot render right-to-left; all positioning is hard-coded to physical directions.
  evidence: Event columns position via `left: ${position.left}%` (`TimeGrid.tsx:143`, `WeekView.tsx:248`), with `border-right`/`padding-right` throughout (`WeekView.tsx:58,64,96,113`; `TimeGrid.tsx:47,54`) and a `left:-4px` now-dot (`NowIndicator.tsx:43`). No `dir` handling and no logical properties anywhere. The plugin registers `translations/ar.json`, so an Arabic admin gets a mirrored chrome with a non-mirrored grid. Fixing it means rewriting the positioning layer to logical properties.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/utils.ts
  severity: medium
  summary: 399 lines of pure date math in BigCalendar have zero test coverage.
  evidence: No test file exists anywhere under `BigCalendar/`, `PlanningCalendarNew/` or `Planning/`. `utils.ts` is entirely pure functions — overlap grouping, position math, slot generation, formatting — i.e. the cheapest possible thing to test and the highest-risk thing to leave untested. The rebuild adds tests at its own transform boundary only.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/{utils.ts:43,156, TimeSlot.tsx:67, NavigationBar.tsx:97,106,146}
  severity: medium
  summary: BigCalendar ignores its own `locale` prop and hardcodes French UI strings.
  evidence: `locale = "fr-FR"` is a hardcoded default across five signatures, and `formatTime` (`utils.ts:43`) is invoked with no locale at all from `utils.ts:156` and `EventBlock.tsx:82-83`, so slot and event times are always fr-FR regardless of the prop. UI strings are French literals rather than i18n keys: `"aujourd'hui"` (`TimeSlot.tsx:67`), `"Période précédente"` / `"Période suivante"` / `"Durée des créneaux"` (`NavigationBar.tsx:97,106,146`), `"Grille horaire"` (`TimeGrid.tsx:128`). No `useIntl`/`getTranslation` usage.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/{TimeGrid.tsx:128, TimeSlot.tsx:61-67, WeekView.tsx}
  severity: medium
  summary: The calendar grid has an invalid ARIA tree and no keyboard navigation.
  evidence: `TimeGrid.tsx:128` sets `role="grid"` but the tree contains only `role="gridcell"` (`TimeSlot.tsx:61-67`) with no intervening `role="row"`/`rowgroup`, which is not a valid grid. There is no roving tabindex, so every slot is a tab stop — a 30-minute 08:00–24:00 week grid is ~224 sequential stops. `WeekView.tsx` declares no `role="grid"` at all, and focus is not managed across view or date changes.
  status: open

- source_spec: none (incidental finding of the same audit)
  location: apps/strapi/package.json, apps/strapi/src/plugins/events-manager/package.json
  severity: low
  summary: `rrule ^2.8.1` is an unused dependency in two manifests.
  evidence: Added in commit `485ea10` alongside BigCalendar, with zero `.ts`/`.tsx`/`.js` references anywhere under `apps/strapi/src`. It was never paired with `@fullcalendar/rrule`, which was never installed in this app — the FullCalendar-era code lived in `legacy/backend`. Safe to remove; verify no seed or script imports it first.
  status: open

## Deferred from: code review (2026-08-08, planning surface rebuild)

Three-layer adversarial review of the events-manager planning surface rebuild.
Correctness findings were patched in the same pass; these are the ones judged
real but out of the story's scope.

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/{ContentSearchPanel,MovieCard}/, hooks/useTMDB.ts
  severity: low
  summary: `ContentSearchPanel`, `MovieCard` and `useTMDB` are orphaned now that `EventCreationModal` is deleted.
  evidence: `ContentSearchPanel/` has zero references anywhere in the plugin; `MovieCard/` is referenced only by its own `__tests__/MovieCard.test.tsx`, and `MovieCardData`'s only remaining consumer is that test. All three existed to serve the deleted `EventCreationModal`. They are the TMDB import path, so removing them is a scope call rather than a cleanup — either wire the TMDB search into the new `SubEventModal` work picker, or delete the three together with their tests.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/hooks/{subEventPopulate.ts,useCreativeWorks.ts,useVenuesEnhanced.ts}, components/Catalog/i18n.ts
  severity: low
  summary: Content-manager URL/UID knowledge now exists in three places, and the scoped-translator helper in two.
  evidence: `cmUrl` is defined in `subEventPopulate.ts` and again privately in `useCreativeWorks.ts:24`, while `useVenuesEnhanced.ts` hardcodes `SUB_EVENT_CM_PATHS` with the two full literal URLs that `SUB_EVENT_UID` + `cmUrl` now express. `subEventPopulate.ts` is the natural single source. Separately, `usePlanningT` is a verbatim copy of `Catalog/i18n.ts:useCatalogT` with one string changed — a shared `usePrefixedT(prefix)` would cover both. Consolidating touches files outside this story.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/index.tsx (delete path)
  severity: low
  summary: Deleting the last sub-event of an event leaves a container event with no showings.
  evidence: The delete path removes only the screening/performance. An event whose every sub-event has been deleted lingers with nothing to render, invisible on the planning grid and unreachable from it — so it can never be cleaned up through this surface. Whether the parent should be deleted, flagged, or deliberately kept (a venue may re-add showings later) is a product decision, so it was not inferred.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/hooks/subEventTransform.ts (KIND_COLORS)
  severity: low
  summary: Colouring blocks by kind lost the per-title colour that made adjacent different showings distinguishable.
  evidence: The old `transformShowtimesToEvents` used `generateColorFromString(title)`, so every distinct film got its own block colour. Blocks are now coloured per kind, so on a dense day every screening is the same colour and only the title text separates them. The spec asked for colour per kind, so this is spec-compliant rather than a defect — but blending kind hue with a per-title variation would keep both signals.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/server/src/content-types/event/schedule-update-handler.ts
  severity: medium
  summary: Rescheduling a showing from the planning grid does not notify watchers.
  evidence: The modal writes only the sub-event's `startDateTime` — deliberately, since one event can hold several sub-events and syncing the parent from one child would be wrong. But the watcher notification fan-out fires on `event` updates only, so a time change made on the planning grid reaches the public surface without notifying anyone who saved it. The deleted `EventEditModal` behaved the same way, so this is pre-existing rather than a regression, but nothing records the boundary. Epic 5's story 5-6 owns schedule-change notifications.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/PlanningCalendarNew/index.tsx (empty state)
  severity: low
  summary: A week whose rows are all unscheduled shows "no showings" while unreachable rows exist.
  evidence: Sub-events with a null `startDateTime` are kept by the transform but excluded from the grid, so `events.length === 0` while `subEvents.length > 0`. The empty-state message then claims nothing is scheduled, and the unscheduled rows cannot be reached or fixed from this surface. Distinguishing the two states needs a decision about where unscheduled rows should be edited.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/validate.ts (toStartDateTimeIso)
  severity: low
  summary: A wall-clock time that does not exist on a DST spring-forward day is silently shifted.
  evidence: `setHours` on a nonexistent local time rolls forward, so the stored instant differs from what the editor typed with no warning. Near-theoretical for this product — Tunisia abolished DST in 2009 — and it shares a root cause with the DST entry already logged against BigCalendar in the calendar build-vs-buy audit. Guard by re-reading `getHours()` after `setHours` if the admin is ever used from a DST-observing timezone.
  status: open

## Deferred from: integration verification (2026-08-09, planning surface writes)

Found by running the planning surface's real payloads against a booted Strapi
(`src/plugins/events-manager/server/src/__tests__/planning-surface-writes.service.test.ts`).
All four are server-side or product decisions outside the planning-surface spec.

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/server/src/content-types/sub-event-work-kind.ts (extractWorkDocumentId), bootstrap.ts:154-167
  severity: high
  summary: `assertSubEventWorkKind` has never fired — the work-kind guard is dead code, and a play can be attached to a screening.
  evidence: The guard is wired through `strapi.db.lifecycles.subscribe`, the database layer, which runs AFTER the Document Service has resolved the relation. The payload it inspects is therefore `movie: { set: [{ id: 2 }] }`. `extractWorkDocumentId` handles `string`, arrays, `{ connect }`, `{ documentId }` and `{ id }` only when `id` is a string — it has no `set` branch, and deliberately returns `undefined` for numeric ids ("skip rather than guess"), so the fail-open path is taken on every write. Verified end to end: a `play` linked to a `screening` is accepted (201) and persists, through both the content-manager and the Document Service. Its unit tests pass because they call the function directly with documentId-shaped payloads the DB layer never produces — the tests are at the wrong layer, not wrong in themselves. `findWork` resolves correctly; only the extraction is broken. Fix by either adding a `set` branch plus numeric-id resolution, or moving the guard to the Document Service middleware layer where documentIds are still present. Until then the client-side picker filter and `validateSubEventForm`'s `work.kindMismatch` rule are the ONLY protection, and the modal's server-error routing is correct but unreachable.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/server/src/content-types/event/schema.json
  severity: medium
  summary: `required: true` is not enforced on create, only on publish — a malformed row is accepted and stored empty.
  evidence: Posting the pre-2C.3 payload (`startDate`, no `category`) returns 201 and stores `category: null, startDateTime: null`; it fails only at the publish call. Two consequences. First, the publish step this rebuild added is not only about public visibility — it is the first moment the server validates the row at all, so a surface that skipped publishing would also skip validation. Second, any code path that creates events without publishing can silently accumulate invalid rows. Separately, `status: "scheduled"` fails earlier for an unrelated reason: `status` is a RESERVED content-manager parameter (draft/published selection), not an unknown field.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: content-manager write path (all events-manager admin hooks)
  severity: medium
  summary: The content-manager silently drops unknown fields instead of rejecting them.
  evidence: Posting the retired `datetime` / `format` keys returns 201 and discards them — a payload drifting from the schema announces nothing and writes a row quietly missing data. This is how the pre-2C.3 payload bugs survived unnoticed. It retroactively justifies keeping the whole request body inside one unit-tested builder: fields spliced in at a call site can never be caught by the server. Worth a lint or review convention that admin write payloads are constructed only in tested builders.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/spec-events-manager-planning-surface-rebuild.md`
  location: apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/index.tsx (publish path), useCreativeWorks (work picker)
  severity: medium
  summary: Publishing a showing whose creative-work is still a draft yields a public showing with no film attached.
  evidence: A published screening pointing at a draft `creative-work` is returned by the public API with no `movie` at all — a showing on the site with nothing to show. Publishing the work afterwards does NOT repair it: the published screening snapshotted a link to the draft entry. Publishing the work first works correctly. The planning surface publishes the sub-event and its container event but never the work, and the picker offers draft works, so an editor can today publish a filmless showing while every success indicator says it saved. Fix is a product decision — auto-publish the linked work on save, restrict the picker to published works, or warn — so it was not inferred. This is the gap between "saved successfully" and "correct on the site" and belongs in the next iteration of the planning spec.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/2d-2-venue-crud-admin-ui.md`
  location: .github/workflows/ci.yml (test job)
  severity: medium
  summary: `yarn test:integration` runs in no CI workflow, so every booted-Strapi integration suite — including 2D.2's new venue-admin HTTP CRUD test — never gates a merge.
  evidence: `jest.config.cjs` limits the default `yarn test` run to `**/*.unit.test.ts` + `**/*.test.tsx`; `.github/workflows/ci.yml` invokes only `yarn test`. The 2D.2 smoke test (`server/src/__tests__/venue-admin-crud.service.test.ts`) is the only end-to-end proof that the plugin's RBAC actions are registered and the admin routes answer, and it runs locally on demand only. Pre-existing condition, surfaced because 2D.2 is the first story to place a security-relevant gate in that suite.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/2d-2-venue-crud-admin-ui.md`
  location: apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json
  severity: medium
  summary: `status` is a reserved attribute name under `draftAndPublish`, colliding with Strapi's own draft/published selector.
  evidence: Surfaced by `yarn generate:types` during 2D.2 and worked around correctly in the admin service (the D&P `status` param is kept distinct from `filters.status`), but the collision is in the schema, not the workaround. The same reservation already bit the events-manager event schema (see the entry above: `status: "scheduled"` failing as a reserved content-manager parameter). A rename to `moderationStatus` is a 2D.1-owned schema change with a data migration, so it was flagged rather than smuggled into an additive-only story.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/2d-2-venue-crud-admin-ui.md`
  location: apps/strapi/src/plugins/venues/admin/src/pages/Venues/index.tsx
  severity: medium
  summary: Bulk approve/suspend moderation was retired with the events-manager venues page and has no replacement in the venues-plugin list.
  evidence: The deleted `events-manager/admin/src/pages/Venues/BulkActionsDropdown.tsx` offered a `bulkUpdateStatus` action; 2D.2's list ships bulk DELETE only, because AC 2 names only delete. Moderating a queue of `pending` venues now requires opening each one. Not a defect against the story's ACs — a capability the relocation dropped, which belongs in a follow-up (natural fit alongside 2D.3).
  status: open

- source_spec: `_bmad-output/implementation-artifacts/2d-2-venue-crud-admin-ui.md`
  location: apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts (tenant scoping)
  severity: high
  summary: Venue-manager tenant scoping joins on `manager.email` because `venue.manager` targets a users-permissions user while an admin route authenticates an `admin::user` — two tables, two id spaces.
  evidence: `buildScopeFilter` filters `manager: { email: { $eqi: scope.email } }` and `isRowInScope` compares lowercased emails, documented in the service header. Email is the only identifier shared between the two account systems, so it is correct today, but it makes the security boundary depend on an editable, non-unique-by-design field: an admin user whose email is changed silently loses access, and two accounts sharing an email would collide. The clean fix is an `adminUser` relation on the venue schema — a 2D.1 schema change, out of scope for an additive-only story.
  status: open

- source_spec: `_bmad-output/implementation-artifacts/2d-2-venue-crud-admin-ui.md`
  location: apps/strapi (tooling)
  severity: low
  summary: AC 11's DS conformance gate was never machine-verified — `strapi-ui-reviewer` and the strapi-ui-design v1.2.0 PostToolUse hook are not installed in this workspace.
  evidence: AC 11 requires the DS conformance check to report no violations. The tools do not exist here, so the constraint set (no `ModalLayout`, `Field.Root` around every input, no hex colours, no native controls) was applied by hand against `handoff/ds-component-binding.md`. Hand application is not the same evidence as a machine gate; either install the tooling or amend the AC in a follow-up.
  status: open
