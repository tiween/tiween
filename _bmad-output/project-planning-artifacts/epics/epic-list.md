# Epic List

> **Phase Tags:**
>
> - **[MVP]** = Relaunch scope (cinema showtimes)
> - **[MVP-partial]** = Some stories in MVP, others deferred
> - **[Phase 2]** = Post-relaunch features

---

## Epic 1: Project Foundation & Infrastructure [MVP]

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

## Epic 2A: Component Library & Design System (PARALLEL TRACK A) [MVP-partial]

Complete UI component library with Storybook stories, ready for integration. Designers and developers can review all components with dummy data.

**MVP Scope (Discovery + Layout only):**

- **Layout Components:** BottomNav, Header, PageContainer, StickyFilters
- **Discovery Components:** EventCard, FilmHero, CategoryTabs, DateSelector, VenueCard, SearchBar, SearchResults, FilmCard
- **Common Components:** EmptyState, ErrorBoundary, LoadingSpinner, Skeleton, Toast, Badge
- **User Components:** LoginForm, RegisterForm, ProfileForm, SocialLogin
- All with `.stories.tsx` files and dummy data

**Phase 2 Scope (Deferred):**

- **Ticketing Components:** ShowtimeButton, SeatSelector, TicketQR, QuantitySelector, OrderSummary, PaymentForm
- **User Components:** WatchlistButton
- **Scanner Components:** TicketScanner, ValidationResult, AttendanceCounter

**FRs covered:** UI foundation for MVP discovery features
**NFRs addressed:** NFR-A1 to NFR-A9 (Accessibility), NFR-P3, NFR-P4 (Performance)

---

## Epic 2B: Strapi v5 Migration & Backend Foundation (PARALLEL TRACK B) [MVP-partial]

Fully migrated Strapi v5 backend with core content-types ready for frontend integration.

**MVP Scope:**

- Strapi v4 → v5 upgrade
- Core content-type migration:
  - CreativeWork (films), Person, Genre
  - Venue, Showtime
  - Region, City, Category
- Events Manager plugin recreation for v5
- Basic user permissions (public, authenticated, admin)
- Data migration scripts from legacy Strapi v4
- Redis integration (sessions, caching)
- ImageKit provider configuration
- Brevo email configuration (basic)
- Database seeding for development

**Phase 2 Scope (Deferred):**

- Ticketing content-types: TicketOrder, Ticket
- User content-types: UserWatchlist, UserPreferences
- B2B venue manager role configuration
- Advanced permissions (venue data isolation)

**FRs covered:** FR57, FR58 (media handling); Backend foundation for discovery
**NFRs addressed:** NFR-S1 to NFR-S10 (Security), NFR-SC1 to NFR-SC6 (Scalability)

---

## Epic 2C: Plugin Architecture Decomposition (TRACK B continuation) [MVP-partial → Phase 2 gate]

The Strapi backend is decomposed into clean bounded-context plugins per the
architecture amendment (2026-06-12): new `venues` plugin, single catalog of
record in `creative-works`, scheduling-only `events-manager`, transactional
`ticketing`. Future `payments` plugin lands with Epic 6.

**Scope:**

- Extract `venues` plugin from events-manager (+ absorb entity-properties types) — gates Epic 7
- Catalog collision data audit (person/genre overlap; both catalogs empty)
- Consolidate catalog on `creative-works`: unified `creative-work` (type enum) wins,
  `movie`/`play` retired; `person`/`character`/`credit-role` + cast[]/credits[]/videos[]
  components (inverted 2026-06-15 — GTM = read-only directory)
- Ticketing Unit of Work transaction + atomic inventory facade — gates Epic 6
- Consolidation sweep (subEventStrategy map, public-api facades, shared kit, delete entity-properties)

**Sequencing:** 2C.2 gates 2C.3; 2C.4 may precede 2C.3 (never concurrent); the
events-manager admin UI rebuild (former OpenSpec change, retired) is re-planned
after 2C.3 against post-move UIDs.

**FRs covered:** structural enabler for FR24–31 (purchase integrity) and FR32–46 (B2B isolation)
**NFRs addressed:** NFR-S5 (venue data isolation), payment/financial integrity

---

## Epic 3: Event Discovery & Browsing [MVP]

Users can browse and search cinema showtimes across Tunisia without creating an account.

**MVP Scope (Cinema Focus):**

- Homepage with movie listings ("À l'affiche", "Prochainement")
- Date filtering (Aujourd'hui, Demain, specific date)
- Cinema/venue filtering
- Region filtering (Greater Tunis)
- Film detail pages with synopsis, trailer, cast, duration
- Venue detail pages with location, contact, map
- Keyword search (film titles)
- Share functionality (Web Share API)
- SEO optimization (SSR, structured data)

**Phase 2 Scope (Deferred):**

- Category filtering (theater, concerts, exhibitions)
- Regional expansion (Sfax, Sousse)
- Geolocation "near me" filtering

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR7, FR10
**NFRs addressed:** NFR-P1, NFR-P2, NFR-P5, NFR-P9 (Performance)

---

## Epic 4: User Authentication & Profiles [MVP-partial]

Users can register, login, and set basic preferences.

**MVP Scope:**

- Email/password registration with validation
- Social login (Google, Facebook) via NextAuth.js
- Password reset flow with email
- Basic profile management (name, email)
- Language preference setting (AR/FR/EN)
- Default region setting
- Session management with Redis

**Phase 2 Scope (Deferred):**

- Guest checkout capability
- Purchase history view
- Advanced profile features

**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16
**NFRs addressed:** NFR-S2, NFR-S4, NFR-S8 (Security), NFR-IN4 (Social OAuth)

---

## Epic 5: Watchlist & Personalization [Phase 2]

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

## Epic 6: B2C Ticketing & Purchases [Phase 2]

Users can purchase tickets for events, receive QR codes, and access them offline on event night.

**Scope:**

- Ticket type and price display per showtime
- Quantity and ticket type selection
- Konnect payment gateway integration:
  - e-Dinar, Sobflous, D17, Flouci (local)
  - Visa, Mastercard (international)
- QR code ticket generation (HMAC-SHA256 signed)
- Email ticket delivery via Brevo
- In-app ticket viewing ("Mes Billets")
- Offline QR access (IndexedDB)
- Purchase confirmation screen with celebration
- Purchase history view
- Real-time ticket availability (WebSocket/Socket.io)
- Checkout flow (3 steps max)
- Guest checkout capability

**FRs covered:** FR17, FR18, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR64
**NFRs addressed:** NFR-S3, NFR-S7 (Payment security, QR signing), NFR-P7, NFR-P8 (Performance)

---

## Epic 7: B2B Venue Management [Phase 2]

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

## Epic 8: B2B Ticket Validation (Scanner) [Phase 2]

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

## Epic 9: Platform Administration [MVP-partial]

Admins can manage content and moderate the platform via Strapi Admin.

**MVP Scope:**

- Manual film/showtime creation and editing
- Venue information management
- Content categories management
- Regions/cities management

**Phase 2 Scope (Deferred):**

- Venue approval/rejection workflow
- Event flagging for quality issues
- Platform-wide analytics dashboard (MAU, transactions)
- User account management (view, suspend)
- Admin action audit logging

**FRs covered:** FR48, FR49, FR50, FR53
**NFRs addressed:** NFR-S6 (Admin audit logging) - Phase 2

---

## Epic 10: PWA & Offline Experience [MVP-partial]

Users can install the app and browse cached content offline.

**MVP Scope:**

- PWA manifest configuration (icons, theme, display)
- Service worker with Serwist
- Event listing caching strategy (stale-while-revalidate)
- Offline browsing of cached showtimes
- Install prompts (custom banner)
- Offline status indicators
- Graceful degradation messaging

**Phase 2 Scope (Deferred):**

- Offline watchlist access
- Offline ticket QR display
- Background sync for queued actions
- Post-purchase install prompts

**FRs covered:** FR59, FR60, FR63
**NFRs addressed:** NFR-P6 (Offline load <1s), NFR-R8 (Graceful degradation)

---
