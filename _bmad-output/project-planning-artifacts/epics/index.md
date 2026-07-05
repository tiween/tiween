# Tiween - Epic Breakdown

> **MVP Scope:** Cinema showtimes discovery (parity with legacy tiween.com)
> **Phase 2:** Watchlist, Ticketing, B2B features

## Table of Contents

- [Tiween - Epic Breakdown](#table-of-contents)
  - [Overview](./overview.md)
  - [Requirements Inventory](./requirements-inventory.md)
    - [Functional Requirements](./requirements-inventory.md#functional-requirements)
    - [Non-Functional Requirements](./requirements-inventory.md#non-functional-requirements)
    - [Additional Requirements](./requirements-inventory.md#additional-requirements)
    - [FR Coverage Map](./requirements-inventory.md#fr-coverage-map)
  - [Epic List](./epic-list.md)
    - [Epic 1: Project Foundation & Infrastructure [MVP]](./epic-list.md#epic-1-project-foundation-infrastructure)
    - [Epic 2A: Component Library & Design System [MVP-partial]](./epic-list.md#epic-2a-component-library-design-system-parallel-track-a)
    - [Epic 2B: Strapi v5 Migration & Backend Foundation [MVP-partial]](./epic-list.md#epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b)
    - [Epic 2C: Plugin Architecture Decomposition [MVP-partial → Phase 2 gate]](./epic-list.md#epic-2c-plugin-architecture-decomposition-track-b-continuation-mvp-partial--phase-2-gate)
    - [Epic 2D: Venues & Properties Admin UI [MVP-back-office]](./epic-list.md#epic-2d-venues-properties-admin-ui-mvp-back-office)
    - [Epic 3: Event Discovery & Browsing [MVP]](./epic-list.md#epic-3-event-discovery-browsing)
    - [Epic 4: User Authentication & Profiles [MVP-partial]](./epic-list.md#epic-4-user-authentication-profiles)
    - [Epic 5: Watchlist & Personalization [Phase 2]](./epic-list.md#epic-5-watchlist-personalization)
    - [Epic 6: B2C Ticketing & Purchases [Phase 2]](./epic-list.md#epic-6-b2c-ticketing-purchases)
    - [Epic 7: B2B Venue Management [Phase 2]](./epic-list.md#epic-7-b2b-venue-management)
    - [Epic 8: B2B Ticket Validation (Scanner) [Phase 2]](./epic-list.md#epic-8-b2b-ticket-validation-scanner)
    - [Epic 9: Platform Administration [MVP-partial]](./epic-list.md#epic-9-platform-administration)
    - [Epic 10: PWA & Offline Experience [MVP-partial]](./epic-list.md#epic-10-pwa-offline-experience)
  - [Epic Dependencies](./epic-dependencies.md)

---

## MVP Epics (Detailed)

- [Epic 1: Project Foundation & Infrastructure](./epic-1-project-foundation-infrastructure.md) **[MVP]**

  - [Story 1.1: Initialize Monorepo from Starter Template](./epic-1-project-foundation-infrastructure.md#story-11-initialize-monorepo-from-starter-template)
  - [Story 1.2: Upgrade to Next.js 16.1 with Turbopack](./epic-1-project-foundation-infrastructure.md#story-12-upgrade-to-nextjs-161-with-turbopack)
  - [Story 1.3: Configure Tiween Design Tokens and Tailwind Theme](./epic-1-project-foundation-infrastructure.md#story-13-configure-tiween-design-tokens-and-tailwind-theme)
  - [Story 1.4: Setup shadcn/ui with Brand Customization](./epic-1-project-foundation-infrastructure.md#story-14-setup-shadcnui-with-brand-customization)
  - [Story 1.5: Configure Storybook with Vite Builder](./epic-1-project-foundation-infrastructure.md#story-15-configure-storybook-with-vite-builder)
  - [Story 1.6: Configure i18n with RTL Support](./epic-1-project-foundation-infrastructure.md#story-16-configure-i18n-with-rtl-support)
  - [Story 1.7: Setup Serwist PWA Configuration](./epic-1-project-foundation-infrastructure.md#story-17-setup-serwist-pwa-configuration)
  - [Story 1.8: Configure Docker and Dokploy Deployment](./epic-1-project-foundation-infrastructure.md#story-18-configure-docker-and-dokploy-deployment)
  - [Story 1.9: Setup CI/CD Pipeline with GitHub Actions](./epic-1-project-foundation-infrastructure.md#story-19-setup-cicd-pipeline-with-github-actions)

- [Epic 2A: Component Library & Design System](./epic-2a-component-library-design-system-parallel-track-a.md) **[MVP-partial]**

  - [Story 2A.1: Layout Components - BottomNav](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a1-layout-components-bottomnav) [MVP]
  - [Story 2A.2: Layout Components - Header and PageContainer](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a2-layout-components-header-and-pagecontainer) [MVP]
  - [Story 2A.3: Layout Components - StickyFilters](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a3-layout-components-stickyfilters) [MVP]
  - [Story 2A.4: Discovery Components - EventCard](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a4-discovery-components-eventcard) [MVP]
  - [Story 2A.5: Discovery Components - FilmHero](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a5-discovery-components-filmhero) [MVP]
  - [Story 2A.6: Discovery Components - CategoryTabs and DateSelector](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a6-discovery-components-categorytabs-and-dateselector) [MVP]
  - [Story 2A.7: Discovery Components - VenueCard and SearchBar](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a7-discovery-components-venuecard-and-searchbar) [MVP]
  - [Story 2A.8: Discovery Components - SearchResults](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a8-discovery-components-searchresults) [MVP]
  - [Story 2A.9: Ticketing Components - ShowtimeButton](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a9-ticketing-components-showtimebutton) [Phase 2]
  - [Story 2A.10: Ticketing Components - QuantitySelector and OrderSummary](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a10-ticketing-components-quantityselector-and-ordersummary) [Phase 2]
  - [Story 2A.11: Ticketing Components - TicketQR](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a11-ticketing-components-ticketqr) [Phase 2]
  - [Story 2A.12: Ticketing Components - SeatSelector](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a12-ticketing-components-seatselector) [Phase 2]
  - [Story 2A.13: Ticketing Components - PaymentForm](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a13-ticketing-components-paymentform) [Phase 2]
  - [Story 2A.14: User Components - LoginForm and RegisterForm](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a14-user-components-loginform-and-registerform) [MVP]
  - [Story 2A.15: User Components - ProfileForm and SocialLogin](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a15-user-components-profileform-and-sociallogin) [MVP]
  - [Story 2A.16: User Components - WatchlistButton](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a16-user-components-watchlistbutton) [Phase 2]
  - [Story 2A.17: Common Components - EmptyState and ErrorBoundary](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a17-common-components-emptystate-and-errorboundary) [MVP]
  - [Story 2A.18: Common Components - LoadingSpinner, Skeleton, Toast](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a18-common-components-loadingspinner-skeleton-toast) [MVP]
  - [Story 2A.19: Common Components - Badge Variants](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a19-common-components-badge-variants) [MVP]
  - [Story 2A.20: Scanner Components - TicketScanner and ValidationResult](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a20-scanner-components-ticketscanner-and-validationresult) [Phase 2]
  - [Story 2A.21: Scanner Components - AttendanceCounter](./epic-2a-component-library-design-system-parallel-track-a.md#story-2a21-scanner-components-attendancecounter) [Phase 2]

- [Epic 2B: Strapi v5 Migration & Backend Foundation](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md) **[MVP-partial]**

  - [Story 2B.1: Strapi v5 Upgrade and Project Setup](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b1-strapi-v5-upgrade-and-project-setup) [MVP]
  - [Story 2B.2: Core Content-Types - Event and CreativeWork](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b2-core-content-types-event-and-creativework) [MVP]
  - [Story 2B.3: Core Content-Types - Venue and Showtime](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b3-core-content-types-venue-and-showtime) [MVP]
  - [Story 2B.4: Core Content-Types - Person and Genre](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b4-core-content-types-person-and-genre) [MVP]
  - [Story 2B.5: Ticketing Content-Types - TicketOrder and Ticket](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b5-ticketing-content-types-ticketorder-and-ticket) [Phase 2]
  - [Story 2B.6: User Content-Types - UserWatchlist and UserPreferences](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b6-user-content-types-userwatchlist-and-userpreferences) [Phase 2]
  - [Story 2B.7: Reference Content-Types - Region, City, Category](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b7-reference-content-types-region-city-category) [MVP]
  - [Story 2B.8: Events Manager Plugin Recreation for v5](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b8-events-manager-plugin-recreation-for-v5) [MVP]
  - [Story 2B.9: User Roles and Permissions Configuration](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b9-user-roles-and-permissions-configuration) [MVP-partial]
  - [Story 2B.10: Redis Integration for Sessions and Caching](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b10-redis-integration-for-sessions-and-caching) [MVP]
  - [Story 2B.11: ImageKit Provider Configuration](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b11-imagekit-provider-configuration) [MVP]
  - [Story 2B.12: Email Configuration with Brevo](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b12-email-configuration-with-resend) [MVP]
  - [Story 2B.13: API Documentation with OpenAPI](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b13-api-documentation-with-openapi) [MVP]
  - [Story 2B.14: Data Migration Scripts from Legacy Strapi v4](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b14-data-migration-scripts-from-legacy-strapi-v4) [MVP]
  - [Story 2B.15: Database Seeding for Development](./epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#story-2b15-database-seeding-for-development) [MVP]

- [Epic 2C: Plugin Architecture Decomposition](./epic-2c-plugin-architecture-decomposition.md) **[MVP-partial → Phase 2 gate]**

  - [Story 2C.1: Extract Venues Plugin](./epic-2c-plugin-architecture-decomposition.md#story-2c1-extract-venues-plugin) [gates Epic 7]
  - [Story 2C.2: Catalog Collision Data Audit](./epic-2c-plugin-architecture-decomposition.md#story-2c2-catalog-collision-data-audit) [gates 2C.3]
  - [Story 2C.3: Catalog Move into Creative-Works](./epic-2c-plugin-architecture-decomposition.md#story-2c3-catalog-move-into-creative-works)
  - [Story 2C.4: Ticketing Unit of Work and Atomic Inventory](./epic-2c-plugin-architecture-decomposition.md#story-2c4-ticketing-unit-of-work-and-atomic-inventory) [gates Epic 6]
  - [Story 2C.5: Consolidation Sweep](./epic-2c-plugin-architecture-decomposition.md#story-2c5-consolidation-sweep)

- [Epic 2D: Venues & Properties Admin UI](./epic-2d-venues-properties-admin-ui.md) **[MVP-back-office]**

  - [Story 2D.1: Extend Venue Schema to Rich Model](./epic-2d-venues-properties-admin-ui.md#story-2d1-extend-venue-schema-to-rich-model) [gates 2D.2/2D.3/2D.4]
  - [Story 2D.2: Venue CRUD Admin UI (Venues Plugin)](./epic-2d-venues-properties-admin-ui.md#story-2d2-venue-crud-admin-ui-venues-plugin)
  - [Story 2D.3: Property Authoring UI (Definitions + Categories)](./epic-2d-venues-properties-admin-ui.md#story-2d3-property-authoring-ui-definitions--categories)
  - [Story 2D.4: Attach Properties to a Venue](./epic-2d-venues-properties-admin-ui.md#story-2d4-attach-properties-to-a-venue)

- [Epic 3: Event Discovery & Browsing](./epic-3-event-discovery-browsing.md) **[MVP]**

  - [Story 3.1a: Public Events Browse API & Data Foundation](./epic-3-event-discovery-browsing.md#story-31a-public-events-browse-api--data-foundation) [MVP] (sprint key `3-1`; split from 3.1 on 2026-07-05)
  - [Story 3.1b: Homepage with Curated Event Listings](./epic-3-event-discovery-browsing.md#story-31b-homepage-with-curated-event-listings) [MVP] (sprint key `3-11`; depends on 3.1a)
  - [Story 3.2: Category Filtering](./epic-3-event-discovery-browsing.md#story-32-category-filtering) [Phase 2 — deferred]
  - [Story 3.3: Date Range Filtering](./epic-3-event-discovery-browsing.md#story-33-date-range-filtering) [MVP]
  - [Story 3.4: Region and City Filtering](./epic-3-event-discovery-browsing.md#story-34-region-and-city-filtering) [MVP]
  - [Story 3.5: Venue Filtering](./epic-3-event-discovery-browsing.md#story-35-venue-filtering) [MVP]
  - [Story 3.6: Keyword Search with Algolia](./epic-3-event-discovery-browsing.md#story-36-keyword-search-with-algolia) [MVP]
  - [Story 3.7: Event Detail Page](./epic-3-event-discovery-browsing.md#story-37-event-detail-page) [MVP]
  - [Story 3.8: Venue Location on Map](./epic-3-event-discovery-browsing.md#story-38-venue-location-on-map) [MVP]
  - [Story 3.9: Geolocation "Near Me" Filtering](./epic-3-event-discovery-browsing.md#story-39-geolocation-near-me-filtering) [Phase 2 — deferred]
  - [Story 3.10: Share Event Details](./epic-3-event-discovery-browsing.md#story-310-share-event-details) [MVP]

- [Epic 4: User Authentication & Profiles](./epic-4-user-authentication-profiles.md) **[MVP-partial]**

  - [Story 4.1: Email and Password Registration](./epic-4-user-authentication-profiles.md#story-41-email-and-password-registration) [MVP]
  - [Story 4.2: Social Login with Google and Facebook](./epic-4-user-authentication-profiles.md#story-42-social-login-with-google-and-facebook) [MVP]
  - [Story 4.3: Password Reset Flow](./epic-4-user-authentication-profiles.md#story-43-password-reset-flow) [MVP]
  - [Story 4.4: Profile Management](./epic-4-user-authentication-profiles.md#story-44-profile-management) [MVP]
  - [Story 4.5: Language and Region Preferences](./epic-4-user-authentication-profiles.md#story-45-language-and-region-preferences) [MVP]
  - [Story 4.6: Guest Checkout Capability](./epic-4-user-authentication-profiles.md#story-46-guest-checkout-capability) [Phase 2]

- [Epic 9: Platform Administration](./epic-9-platform-administration.md) **[MVP-partial]**

  - [Story 9.1: Venue Approval Workflow](./epic-9-platform-administration.md#story-91-venue-approval-workflow) [Phase 2]
  - [Story 9.2: Manual Event Creation and Editing](./epic-9-platform-administration.md#story-92-manual-event-creation-and-editing) [MVP]
  - [Story 9.3: Event Flagging for Quality Issues](./epic-9-platform-administration.md#story-93-event-flagging-for-quality-issues) [Phase 2]
  - [Story 9.4: Platform Analytics Dashboard](./epic-9-platform-administration.md#story-94-platform-analytics-dashboard) [Phase 2]
  - [Story 9.5: User Account Management](./epic-9-platform-administration.md#story-95-user-account-management) [Phase 2]
  - [Story 9.6: Categories and Regions Management](./epic-9-platform-administration.md#story-96-categories-and-regions-management) [MVP]

- [Epic 10: PWA & Offline Experience](./epic-10-pwa-offline-experience.md) **[MVP-partial]**
  - [Story 10.1: PWA Installation](./epic-10-pwa-offline-experience.md#story-101-pwa-installation) [MVP]
  - [Story 10.2: Event Listing Caching](./epic-10-pwa-offline-experience.md#story-102-event-listing-caching) [MVP]
  - [Story 10.3: Offline Browsing](./epic-10-pwa-offline-experience.md#story-103-offline-browsing) [MVP]
  - [Story 10.4: Offline Watchlist Access](./epic-10-pwa-offline-experience.md#story-104-offline-watchlist-access) [Phase 2]
  - [Story 10.5: Offline Ticket Display](./epic-10-pwa-offline-experience.md#story-105-offline-ticket-display) [Phase 2]
  - [Story 10.6: Background Sync](./epic-10-pwa-offline-experience.md#story-106-background-sync) [Phase 2]
  - [Story 10.7: Install Prompts](./epic-10-pwa-offline-experience.md#story-107-install-prompts) [MVP]
  - [Story 10.8: Offline Status Indicators](./epic-10-pwa-offline-experience.md#story-108-offline-status-indicators) [MVP]

---

## Phase 2 Epics (Deferred)

- [Epic 5: Watchlist & Personalization](./epic-5-watchlist-personalization.md) **[Phase 2]**

  - All stories deferred to Phase 2

- [Epic 6: B2C Ticketing & Purchases](./epic-6-b2c-ticketing-purchases.md) **[Phase 2]**

  - All stories deferred to Phase 2

- [Epic 7: B2B Venue Management](./epic-7-b2b-venue-management.md) **[Phase 2]**

  - All stories deferred to Phase 2

- [Epic 8: B2B Ticket Validation (Scanner)](./epic-8-b2b-ticket-validation-scanner.md) **[Phase 2]**
  - All stories deferred to Phase 2
