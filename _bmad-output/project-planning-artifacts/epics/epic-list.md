# Epic List

## Epic 1: Project Foundation & Infrastructure

Development teams have a fully configured monorepo with Next.js 16.1, Strapi v5, and all tooling ready for parallel development.

**Scope:**

- Clone and configure starter template (notum-cz/strapi-next-monorepo-starter)
- Upgrade to Next.js 16.1 with Turbopack
- Configure Tailwind with Tiween theme (Dark teal #032523, Yellow #F8EB06)
- Setup shadcn/ui with brand customization
- Configure Storybook with Vite builder
- Setup Serwist (PWA service worker)
- Configure i18n (AR/FR/EN) with RTL support
- Docker/Dokploy configuration
- CI/CD pipeline basics (GitHub Actions)

**FRs covered:** Foundation for all FRs; directly FR54, FR55 (i18n/RTL structure)

---

## Epic 2A: Component Library & Design System (PARALLEL TRACK A)

Complete UI component library with Storybook stories, ready for integration. Designers and developers can review all components with dummy data.

**Scope:**

- **Layout Components:** BottomNav, Header, PageContainer, StickyFilters
- **Discovery Components:** EventCard, FilmHero, CategoryTabs, DateSelector, VenueCard, SearchBar, SearchResults
- **Ticketing Components:** ShowtimeButton, SeatSelector, TicketQR, QuantitySelector, OrderSummary, PaymentForm
- **User Components:** WatchlistButton, LoginForm, RegisterForm, ProfileForm, SocialLogin
- **Common Components:** EmptyState, ErrorBoundary, LoadingSpinner, Skeleton, Toast, Badge
- **Scanner Components:** TicketScanner, ValidationResult, AttendanceCounter
- All with `.stories.tsx` files and dummy data

**FRs covered:** UI foundation for FR1-FR66 (all components needed for features)
**NFRs addressed:** NFR-A1 to NFR-A9 (Accessibility), NFR-P3, NFR-P4 (Performance)

---

## Epic 2B: Strapi v5 Migration & Backend Foundation (PARALLEL TRACK B)

Fully migrated Strapi v5 backend with all content-types, plugins, and data ready for frontend integration.

**Scope:**

- Strapi v4 → v5 upgrade
- Content-type recreation/migration:
  - Event, Movie, CreativeWork, Person
  - Venue (formerly Medium), Showtime
  - TicketOrder, Ticket, UserWatchlist
  - Review, VenueSubscription
- Events Manager plugin recreation for v5
- User permissions extension (B2C user, B2B venue manager, Admin roles)
- Data migration scripts from legacy Strapi v4
- Redis integration (sessions, caching, rate limiting)
- ImageKit provider configuration
- Resend email configuration
- API documentation (OpenAPI)

**FRs covered:** FR57, FR58 (media handling); Backend foundation for FR32-FR53
**NFRs addressed:** NFR-S1 to NFR-S10 (Security), NFR-SC1 to NFR-SC6 (Scalability), NFR-R5 to NFR-R7 (Backups)

---

## Epic 3: Event Discovery & Browsing

Users can browse, filter, and search all cultural events across Tunisia without creating an account.

**Scope:**

- Homepage with curated event listings ("Ce soir", "Cette semaine", featured)
- Category filtering (Cinéma, Théâtre, Courts-métrages, Musique, Expositions)
- Date filtering (Aujourd'hui, Demain, Ce weekend, Custom range)
- Region/City filtering (Greater Tunis, Sfax, Sousse, etc.)
- Venue filtering
- Keyword search with Algolia integration
- Event detail pages with full information
- Map integration for venue location (Leaflet/Mapbox)
- Geolocation "near me" filtering
- Share functionality (Web Share API)
- SEO optimization (SSR, structured data)

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR56
**NFRs addressed:** NFR-P1, NFR-P2, NFR-P5, NFR-P9 (Performance)

---

## Epic 4: User Authentication & Profiles

Users can register, login, manage their profiles, and set preferences for language and region.

**Scope:**

- Email/password registration with validation
- Social login (Google, Facebook) via NextAuth.js
- Password reset flow with email
- Profile management (name, email, avatar)
- Language preference setting (AR/FR/EN)
- Default region setting for discovery
- Guest checkout capability (email-only for ticket purchase)
- Session management with Redis

**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR18
**NFRs addressed:** NFR-S2, NFR-S4, NFR-S8 (Security), NFR-IN4 (Social OAuth)

---

## Epic 5: Watchlist & Personalization

Authenticated users can save events to their watchlist, access it offline, and sync across devices.

**Scope:**

- Add to watchlist (one-tap heart animation)
- Remove from watchlist
- Watchlist view page with filtering
- Offline watchlist access (IndexedDB caching)
- Cross-device sync when online
- Schedule change notifications for watchlisted events

**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR65
**NFRs addressed:** NFR-R3 (Offline sync)

---

## Epic 6: B2C Ticketing & Purchases

Users can purchase tickets for events, receive QR codes, and access them offline on event night.

**Scope:**

- Ticket type and price display per showtime
- Quantity and ticket type selection
- Konnect payment gateway integration:
  - e-Dinar, Sobflous, D17, Flouci (local)
  - Visa, Mastercard (international)
- QR code ticket generation (HMAC-SHA256 signed)
- Email ticket delivery via Resend
- In-app ticket viewing ("Mes Billets")
- Offline QR access (IndexedDB)
- Purchase confirmation screen with celebration
- Purchase history view
- Real-time ticket availability (WebSocket/Socket.io)
- Checkout flow (3 steps max)

**FRs covered:** FR17, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR64
**NFRs addressed:** NFR-S3, NFR-S7 (Payment security, QR signing), NFR-P7, NFR-P8 (Performance), NFR-R2 (Payment success), NFR-IN1, NFR-IN3 (Integration)

---

## Epic 7: B2B Venue Management

Venue managers can register, manage their venue profile, create/edit events, configure ticketing, and view analytics via Strapi Admin.

**Scope:**

- Venue registration flow with admin approval
- Venue profile management (photos, description, location, contact)
- Event creation with rich details (title, description, dates, times, media)
- Event editing and deletion/cancellation
- Ticketing configuration (price tiers, quantities, sale dates)
- Multiple ticket types configuration (standard, reduced, VIP)
- Ticket sales reports dashboard
- Event analytics (views, saves, demographics)
- Real-time sales updates (WebSocket)
- Strapi Admin role configuration for venue managers

**FRs covered:** FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR66
**NFRs addressed:** NFR-S5 (Venue data isolation), NFR-D5 (Aggregated analytics)

---

## Epic 8: B2B Ticket Validation (Scanner)

Venue staff can scan and validate tickets at event entry, track attendance, and operate with intermittent connectivity.

**Scope:**

- QR scanner interface (mobile-optimized, high contrast)
- Camera access and QR decoding
- Validation result display (green valid / red invalid / yellow warning)
- Ticket details shown on successful scan
- Duplicate/reuse prevention with timestamp
- Real-time attendance counts per showtime
- Offline scanning with local cache
- Sync scanned tickets when connectivity restored
- Audio/visual feedback (beep on scan)
- Manual override with PIN for edge cases

**FRs covered:** FR41, FR42, FR43, FR44, FR45, FR46
**NFRs addressed:** NFR-P8 (QR scan speed <500ms)

---

## Epic 9: Platform Administration

Admins can moderate venues, manage content quality, view platform analytics, and manage users via Strapi Admin.

**Scope:**

- Venue approval/rejection workflow with email notifications
- Manual event creation and editing
- Event flagging for quality issues
- Platform-wide analytics dashboard (MAU, transactions, venues)
- User account management (view, suspend, delete)
- Content categories management
- Regions/cities management
- Admin action audit logging
- Data quality checks and flagging

**FRs covered:** FR47, FR48, FR49, FR50, FR51, FR52, FR53
**NFRs addressed:** NFR-S6 (Admin audit logging)

---

## Epic 10: PWA & Offline Experience

Users can install the app, browse cached content offline, access watchlist and tickets without connectivity, and sync when back online.

**Scope:**

- PWA manifest configuration (icons, theme, display)
- Service worker with Serwist
- Event listing caching strategy (stale-while-revalidate)
- Offline browsing of cached events
- Offline watchlist access
- Offline ticket QR display
- Background sync for queued actions
- Install prompts (custom banner, post-purchase)
- Offline status indicators
- Graceful degradation messaging

**FRs covered:** FR59, FR60, FR61, FR62, FR63
**NFRs addressed:** NFR-P6 (Offline load <1s), NFR-R3 (Sync success >95%), NFR-R8 (Graceful degradation)

---
