# Tiween - Ralph Fix Plan

> Priority order based on epic dependencies and parallel tracks

## ✅ Critical Priority (Epic 1: Foundation) - COMPLETE

All foundation tasks are implemented and operational.

- [x] 1.1: Initialize monorepo from starter template (notum-cz/strapi-next-monorepo-starter)
- [x] 1.2: Upgrade to Next.js 16.1 with Turbopack
- [x] 1.3: Configure Tiween design tokens and Tailwind theme (Dark teal #032523, Yellow #F8EB06)
- [x] 1.4: Setup shadcn/ui with brand customization (29 components installed)
- [x] 1.5: Configure Storybook with Vite builder
- [x] 1.6: Configure i18n with RTL support (AR/FR/EN)
- [x] 1.7: Setup Serwist PWA configuration
- [x] 1.8: Configure Docker and Dokploy deployment
- [x] 1.9: Setup CI/CD pipeline with GitHub Actions

## ✅ High Priority - Parallel Track A (Epic 2A: Component Library) - COMPLETE

All frontend components are implemented and ready for integration.

### Layout Components

- [x] 2A.1: BottomNav component
- [x] 2A.2: Header and PageContainer components
- [x] 2A.3: StickyFilters component

### Discovery Components - COMPLETE

- [x] 2A.4: EventCard component (with skeleton and stories)
- [x] 2A.5: FilmHero component (with stories)
- [x] 2A.6: CategoryTabs and DateSelector components (with stories)
- [x] 2A.7: VenueCard and SearchBar components (with stories)
- [x] 2A.8: SearchResults component (with stories)
- [x] 2A.22: FilmCard component (with skeleton and stories)

### Ticketing Components - COMPLETE

- [x] 2A.9: ShowtimeButton component (with stories)
- [x] 2A.10: QuantitySelector and OrderSummary components (with stories)
- [x] 2A.11: TicketQR component (with stories)
- [x] 2A.12: SeatSelector component (with stories)
- [x] 2A.13: PaymentForm component (with stories)

### User Components - COMPLETE

- [x] 2A.14: LoginForm and RegisterForm components (SignInForm exists)
- [x] 2A.15: ProfileForm and SocialLogin components (with stories)
- [x] 2A.16: WatchlistButton component (integrated in EventCard)

### Common Components - COMPLETE

- [x] 2A.17: EmptyState and ErrorBoundary components
- [x] 2A.18: LoadingSpinner, Skeleton, Toast components
- [x] 2A.19: Badge variants (4 variants)

### Scanner Components - COMPLETE

- [x] 2A.20: TicketScanner and ValidationResult components (with stories)
- [x] 2A.21: AttendanceCounter component (with stories)

## ✅ High Priority - Parallel Track B (Epic 2B: Strapi v5 Backend) - MOSTLY COMPLETE

Backend infrastructure is implemented. Strapi v5.33.1 with 7 custom plugins and 15 content types.

### Core Setup - COMPLETE

- [x] 2B.1: Strapi v5 upgrade and project setup (v5.33.1 installed, PostgreSQL, i18n, CORS configured)
- [x] 2B.9: User roles and permissions configuration (Public, Authenticated, Venue Manager, Admin)

### Content Types - COMPLETE (via existing plugins)

- [x] 2B.2: Core content types (Event, CreativeWork) - in events-manager & creative-works plugins
- [x] 2B.3: Core content types (Venue, Showtime) - in events-manager plugin
- [x] 2B.4: Core content types (Person, Genre) - in creative-works plugin
- [x] 2B.5: Ticketing content types (TicketOrder, Ticket) - in ticketing plugin
- [x] 2B.6: User content types (UserWatchlist, UserPreferences) - in user-engagement plugin
- [x] 2B.7: Reference content types (Region, City, Category) - in geography plugin

### Plugins & Integrations - MOSTLY COMPLETE

- [x] 2B.8: Events Manager plugin recreation for v5 (existing plugin with admin routes)
- [x] 2B.10: Redis integration for sessions and caching (configured with rest-cache plugin)
- [x] 2B.11: ImageKit provider configuration (strapi-provider-upload-imagekit configured)
- [x] 2B.12: Email configuration with Brevo/Resend (@ayhid/strapi-provider-email-brevo)
- [ ] 2B.13: API documentation with OpenAPI (optional, can defer)

### Data Migration

- [ ] 2B.14: Data migration scripts from legacy Strapi v4 (optional, for production)
- [x] 2B.15: Database seeding for development (yarn seed commands + test fixtures)

## 🟡 Medium Priority (Epic 3: Event Discovery) - IN PROGRESS

Requires Epic 2A (UI) and Epic 2B (API) to be substantially complete.

- [x] 3.1: Homepage with curated event listings
- [x] 3.2: Category filtering (Cinema, Theatre, Music, Exhibitions)
- [x] 3.3: Date filtering (Today, Tomorrow, This Week, Weekend, Custom date)
- [x] 3.4: Region/City filtering
- [x] 3.5: Venue filtering
- [ ] 3.6: Keyword search with Algolia integration
- [x] 3.7: Event detail pages
- [ ] 3.8: Map integration (Leaflet)
- [ ] 3.9: "Near me" geolocation filtering
- [x] 3.10: Share functionality (Web Share API) - integrated in detail page
- [x] 3.11: SEO optimization (SSR, structured data, sitemap)

## 🟡 Medium Priority (Epic 4: User Authentication)

- [ ] 4.1: Email/password registration with validation
- [ ] 4.2: Social login (Google, Facebook) via NextAuth.js
- [ ] 4.3: Password reset flow with email
- [ ] 4.4: Profile management
- [ ] 4.5: Language/region preferences
- [ ] 4.6: Guest checkout capability
- [ ] 4.7: Session management with Redis

## 🟢 Lower Priority (Epic 5: Watchlist)

- [ ] 5.1: Add/remove from watchlist
- [ ] 5.2: Watchlist view page
- [ ] 5.3: Offline watchlist access (IndexedDB)
- [ ] 5.4: Cross-device sync

## 🟢 Lower Priority (Epic 6: B2C Ticketing)

- [ ] 6.1: Ticket type and price display
- [ ] 6.2: Quantity selection
- [ ] 6.3: Konnect payment integration
- [ ] 6.4: QR code ticket generation (HMAC-SHA256)
- [ ] 6.5: Email ticket delivery via Resend
- [ ] 6.6: In-app ticket viewing ("Mes Billets")
- [ ] 6.7: Offline QR access (IndexedDB)
- [ ] 6.8: Purchase confirmation with celebration
- [ ] 6.9: Purchase history view
- [ ] 6.10: Real-time ticket availability (WebSocket)

## 🔵 Future (Epic 7-10)

### Epic 7: B2B Venue Management

- [ ] 7.1: Venue registration with admin approval
- [ ] 7.2: Venue profile management
- [ ] 7.3: Event creation/editing via Strapi Admin
- [ ] 7.4: Ticketing configuration
- [ ] 7.5: Sales reports dashboard
- [ ] 7.6: Event analytics

### Epic 8: B2B Ticket Validation (Scanner)

- [ ] 8.1: QR scanner interface
- [ ] 8.2: Validation result display
- [ ] 8.3: Duplicate prevention
- [ ] 8.4: Real-time attendance counts
- [ ] 8.5: Offline scanning with sync

### Epic 9: Platform Administration

- [ ] 9.1: Venue approval workflow
- [ ] 9.2: Content moderation
- [ ] 9.3: Platform analytics dashboard
- [ ] 9.4: User management

### Epic 10: PWA & Offline Experience

- [ ] 10.1: PWA manifest configuration
- [ ] 10.2: Service worker (Serwist)
- [ ] 10.3: Event caching (stale-while-revalidate)
- [ ] 10.4: Offline browsing
- [ ] 10.5: Background sync
- [ ] 10.6: Install prompts

## ✅ Completed

- [x] Project initialization (monorepo exists)
- [x] BMAD planning documentation complete
- [x] PRD and epic definitions
- [x] Tech specs for all stories
- [x] Epic 1: Foundation (all 9 tasks)
- [x] Epic 2A: Component Library COMPLETE (all 22 tasks)
  - Layout components (BottomNav, Header, PageContainer, StickyFilters)
  - Discovery components (EventCard, FilmCard, FilmHero, CategoryTabs, DateSelector, VenueCard, SearchBar, SearchResults)
  - Ticketing components (ShowtimeButton, QuantitySelector, OrderSummary, TicketQR, SeatSelector, PaymentForm)
  - User components (SignInForm, RegisterForm, WatchlistButton, ProfileForm, SocialLogin)
  - Common components (ErrorBoundary, Spinner, Skeleton, Toast, Badge)
  - Scanner components (TicketScanner, ValidationResult, AttendanceCounter)
- [x] Epic 2B: Strapi v5 Backend (13/15 tasks complete)
  - Core setup: Strapi v5.33.1, PostgreSQL, i18n (ar/fr/en), CORS
  - 7 custom plugins: geography, entity-properties, creative-works, tmdb-integration, events-manager, ticketing, user-engagement
  - 15 content types with Draft & Publish, i18n support
  - Redis caching with rest-cache plugin
  - ImageKit upload provider
  - Brevo email provider
  - User roles: Public, Authenticated, Venue Manager, Admin
  - Database seeding: yarn seed / seed:clear / seed:fresh + test fixtures
- [x] Epic 3.1: Homepage with curated event listings
  - Server-side data fetching (getFeaturedEvents, getUpcomingEvents, getTodayEvents)
  - EventSection component with horizontal scrolling
  - HomePage component with hero carousel and event sections
  - Category tabs integration
  - Bottom navigation
- [x] Epic 3.2: Category filtering
  - URL-based state management (?category=cinema)
  - Server-side filtering in all API functions (getFeaturedEvents, getUpcomingEvents, getTodayEvents)
  - CategoryTabs synced with URL state
  - Filters all event sections (hero, today, featured, upcoming)
- [x] Epic 3.3: Date filtering
  - DateFilterType: today, tomorrow, this-week, weekend, YYYY-MM-DD
  - URL-based state management (?date=tomorrow, ?date=2025-01-20)
  - Server-side filtering with date range calculation
  - DateSelector component integrated in sticky filter bar
  - Dynamic section titles based on selected date
  - Smart UX: hides Today/Featured sections when date filter active
- [x] Epic 3.4: Region/City filtering
  - RegionCitySelector component with grouped regions and cities
  - Geography API endpoints for regions and cities
  - URL-based state management (?city=documentId)
  - Server-side filtering with city documentId
  - HomePageWithCity variant for city filtering
- [x] Epic 3.5: Venue filtering
  - VenueSelector component for venue selection
  - Venue API with city-based filtering
  - URL-based state management (?venue=documentId)
  - Server-side filtering with venue documentId
  - HomePageWithVenue variant for venue filtering
- [x] Epic 3.7: Event detail pages
  - EventDetailPage component with full event info
  - Hero section with backdrop, title, metadata
  - Synopsis with expand/collapse
  - Showtimes grouped by date with ShowtimeButton
  - Directors and cast sections
  - Related events section
  - Sticky buy tickets CTA
  - Dynamic SEO metadata (generateMetadata)
  - Loading and not-found states
  - Updated dates utility for Tunisia timezone
- [x] Epic 3.10: Share functionality (Web Share API)
  - Integrated in EventDetailPage hero section
- [x] Epic 3.11: SEO optimization
  - JSON-LD structured data for events (schema.org Event, ScreeningEvent, etc.)
  - Breadcrumb JSON-LD for navigation
  - Enhanced meta tags (canonical, hreflang, robots directives)
  - Open Graph with locale and siteName
  - Twitter Card with site handle
  - Dynamic sitemap with events and category pages
  - robots.txt configured for production

## 📝 Notes

- **Remaining Epic 2B work** (optional):
  - 2B.13: OpenAPI documentation (can defer)
  - 2B.14: Data migration scripts (only needed for production with legacy data)
- **Event discovery progress**: 9/11 tasks complete (82%)
- **Next priority**: 3.8 Map integration or Epic 4 (User Authentication)
- **Seed data**: Run `cd apps/strapi && yarn seed` to populate test data
- **Tech specs**: Detailed specs for each story in `_bmad-output/implementation-artifacts/`
- **Focus**: MVP includes Epics 1-6 (Foundation through Ticketing)
- **B2B features** (Epics 7-9) come after MVP consumer features work
