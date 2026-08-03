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
status: open

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
