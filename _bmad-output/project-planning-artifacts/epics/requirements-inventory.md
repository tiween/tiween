# Requirements Inventory

## Functional Requirements

**Event Discovery & Browsing (FR1-FR10)**
- FR1: Visitors can browse all cultural events without creating an account
- FR2: Users can filter events by category (cinema, theater, concerts, exhibitions, etc.)
- FR3: Users can filter events by date range (today, this week, this weekend, custom)
- FR4: Users can filter events by region/city (Greater Tunis, Sfax, Sousse, etc.)
- FR5: Users can filter events by venue
- FR6: Users can search events by keyword (title, artist, venue name)
- FR7: Users can view event details including times, venue, description, and media
- FR8: Users can see event location on a map
- FR9: Users can filter events by "near me" using geolocation
- FR10: Users can share event details via standard share mechanisms

**User Accounts & Profiles (FR11-FR18)**
- FR11: Users can register with email and password
- FR12: Users can register/login with social providers (Google, Facebook)
- FR13: Users can reset their password via email
- FR14: Users can update their profile information
- FR15: Users can set their preferred language (Arabic, French, English)
- FR16: Users can set their default region for event discovery
- FR17: Users can view their purchase history
- FR18: Guest users can complete purchases without creating an account

**Watchlist & Personalization (FR19-FR23)**
- FR19: Authenticated users can add events to their watchlist
- FR20: Authenticated users can remove events from their watchlist
- FR21: Users can view their watchlist
- FR22: Users can access their watchlist offline
- FR23: Watchlist syncs across devices when online

**Ticketing & Purchases - B2C (FR24-FR31)**
- FR24: Users can view available ticket types and prices for an event
- FR25: Users can select quantity and ticket type for purchase
- FR26: Users can complete payment via integrated payment gateway
- FR27: Users receive QR code tickets via email after purchase
- FR28: Users can view purchased tickets in the app
- FR29: Users can access purchased ticket QR codes offline
- FR30: Users receive booking confirmation with event details
- FR31: Guest checkout users receive tickets via email without app access

**Venue Management - B2B (FR32-FR40)**
- FR32: Venue managers can register their venue on the platform
- FR33: Venue managers can manage their venue profile (photos, description, location, contact)
- FR34: Venue managers can create new events with details (title, description, dates, times, media)
- FR35: Venue managers can edit existing events
- FR36: Venue managers can delete/cancel events
- FR37: Venue managers can set up ticketing for events (price tiers, quantities, sale dates)
- FR38: Venue managers can view ticket sales reports
- FR39: Venue managers can view event analytics (views, demographics)
- FR40: Venue managers can configure multiple ticket types per event (standard, reduced, VIP)

**Ticket Validation - B2B (FR41-FR46)**
- FR41: Venue staff can scan QR codes to validate tickets
- FR42: Scanner displays validation result (valid/invalid/already used)
- FR43: Scanner shows ticket details on successful validation
- FR44: Scanner prevents duplicate ticket usage
- FR45: Venue staff can view real-time attendance counts per event
- FR46: Scanner can operate with intermittent connectivity

**Platform Administration (FR47-FR53)**
- FR47: Admins can approve or reject venue registration requests
- FR48: Admins can create and manage event listings manually
- FR49: Admins can edit any event listing for quality control
- FR50: Admins can flag events for quality issues
- FR51: Admins can view platform-wide analytics
- FR52: Admins can manage user accounts (view, suspend)
- FR53: Admins can manage content categories and regions

**Content & Data Management (FR54-FR58)**
- FR54: System supports multilingual content (Arabic, French, English)
- FR55: System supports RTL layout for Arabic language
- FR56: System displays events in user's preferred language when available
- FR57: Events can have multiple images and media attachments
- FR58: Venue profiles can have multiple images

**PWA & Offline Capabilities (FR59-FR63)**
- FR59: Users can install the application on their device
- FR60: Users can browse cached events when offline
- FR61: Users can access their watchlist when offline
- FR62: Users can view purchased tickets when offline
- FR63: Application syncs data when connectivity is restored

**Real-Time Updates (FR64-FR66)**
- FR64: Users see real-time ticket availability during purchase flow
- FR65: Users receive notifications of schedule changes for watchlisted events
- FR66: Venue managers see real-time sales updates on dashboard

## Non-Functional Requirements

**Performance**
- NFR-P1: Page load time <3 seconds (Mobile 4G connection)
- NFR-P2: Largest Contentful Paint (LCP) <2.5 seconds (Mobile 4G)
- NFR-P3: First Input Delay (FID) <100ms (All devices)
- NFR-P4: Cumulative Layout Shift (CLS) <0.1 (All devices)
- NFR-P5: Time to Interactive (TTI) <3.5 seconds (Mobile 4G)
- NFR-P6: Offline content load <1 second (Cached content)
- NFR-P7: Ticket purchase flow completion <60 seconds (End-to-end)
- NFR-P8: QR code scan validation <500ms (Real-time response)
- NFR-P9: Search results display <1 second (With filters applied)

**Security**
- NFR-S1: All data transmission encrypted via HTTPS/TLS 1.3
- NFR-S2: User passwords hashed with bcrypt (minimum cost factor 12)
- NFR-S3: Payment data never stored on Tiween servers (PCI-DSS compliance via payment provider)
- NFR-S4: Session tokens expire after 30 days of inactivity
- NFR-S5: Venue manager access restricted to their own venue data
- NFR-S6: Admin actions logged with user ID and timestamp
- NFR-S7: QR codes cryptographically signed to prevent forgery
- NFR-S8: Rate limiting on authentication endpoints (max 10 attempts per minute)
- NFR-S9: CORS configured to allow only approved domains
- NFR-S10: SQL injection and XSS prevention via parameterized queries and output encoding

**Scalability**
- NFR-SC1: Support 5,000 concurrent users (Phase 1)
- NFR-SC2: Support 20,000 concurrent users (Phase 2)
- NFR-SC3: Handle 10x traffic spikes (Major event announcements)
- NFR-SC4: Database supports 100,000 events (2-year content growth)
- NFR-SC5: Image CDN handles 1M requests/day (Peak traffic scenario)
- NFR-SC6: WebSocket connections scale to 5,000 simultaneous (Real-time ticket updates)

**Reliability & Availability**
- NFR-R1: Platform uptime >99.5% (Monthly measurement)
- NFR-R2: Payment processing success rate >98% (Excluding user errors)
- NFR-R3: Offline sync success rate >95% (When connectivity restored)
- NFR-R4: Data freshness >90% listings updated within 48 hours
- NFR-R5: Automated backup frequency daily (With 30-day retention)
- NFR-R6: Recovery Time Objective (RTO) <4 hours (Critical system failure)
- NFR-R7: Recovery Point Objective (RPO) <1 hour (Maximum data loss)
- NFR-R8: Graceful degradation - Core browsing works when payments unavailable

**Accessibility**
- NFR-A1: WCAG 2.1 Level AA compliance across all public pages
- NFR-A2: Keyboard navigation for all interactive elements
- NFR-A3: Screen reader compatibility with proper ARIA labels
- NFR-A4: Color contrast ratio minimum 4.5:1 for text
- NFR-A5: Focus indicators visible on all interactive elements
- NFR-A6: Alt text for all meaningful images
- NFR-A7: Form error messages programmatically associated with inputs
- NFR-A8: No content that flashes more than 3 times per second
- NFR-A9: Touch targets minimum 44x44 pixels on mobile

**Internationalization**
- NFR-I1: Full RTL layout support for Arabic language
- NFR-I2: Language switching without page reload
- NFR-I3: Date/time formatting per locale (Arabic, French, English)
- NFR-I4: Currency display in Tunisian Dinar (TND)
- NFR-I5: Content fallback to French when translation unavailable
- NFR-I6: URL structure supports language prefixes (/ar/, /fr/, /en/)

**Integration**
- NFR-IN1: Payment gateway integration with <5 second timeout
- NFR-IN2: Strapi API responses cached with 5-minute TTL
- NFR-IN3: Email delivery within 2 minutes of transaction
- NFR-IN4: Social login OAuth flow completes in <10 seconds
- NFR-IN5: WebSocket reconnection within 5 seconds after disconnect
- NFR-IN6: API versioning supports backward compatibility for 6 months

**Data & Privacy**
- NFR-D1: User data exportable on request (GDPR-style compliance)
- NFR-D2: Account deletion removes personal data within 30 days
- NFR-D3: Analytics data anonymized after 90 days
- NFR-D4: Cookie consent required before non-essential tracking
- NFR-D5: Venue analytics show aggregated demographics (no individual user data)

## Additional Requirements

**From Architecture Document:**

- **MANDATORY: Next.js 16.1** - Must use Next.js 16.1 (latest stable version as of December 2025) instead of Next.js 15 referenced in starter template. Includes Turbopack as default bundler, React Compiler support (stable), and critical security fixes.
- **Starter Template:** Project must be initialized using notum-cz/strapi-next-monorepo-starter (upgrade Next.js to 16.1 after cloning)
- **Strapi v5 Migration:** Backend requires Strapi v4 → v5 migration with breaking changes in plugin system
- **Database Schema Migration:** Existing PostgreSQL schema needs review and migration scripts
- **Events Manager Plugin:** Custom Strapi plugin must be recreated for v5
- **Storybook Integration:** Add Storybook with `@storybook/nextjs-vite` to client app
- **Serwist PWA Configuration:** Configure Serwist for PWA/service worker (next-pwa successor)
- **Dokploy Deployment:** Configure for Dokploy self-hosted deployment
- **Redis Integration:** Required for session management, ticket inventory locks, rate limiting
- **Konnect Payment Gateway:** Integrate with Konnect Network for Tunisian payments (e-Dinar, Sobflous, D17, Flouci, Visa, Mastercard)
- **Algolia Search:** Evaluate vs native Strapi v5 search, configure if retained
- **ImageKit Media:** Preserve existing ImageKit integration for media storage/CDN
- **WebSocket (Socket.io):** Implement for real-time ticket availability and live sales
- **QR Ticket Signing:** HMAC-SHA256 cryptographic signing for ticket verification
- **Data Migration Scripts:** Create scripts to migrate legacy data from Strapi v4

**From UX Design Document:**

- **Dark-First Theme:** Single dark theme (no light mode toggle) with Tiween Green (#032523) and Yellow (#F8EB06)
- **shadcn/ui Component Library:** Use shadcn/ui with Radix UI primitives as component foundation
- **Typography:** Lalezar for display/headlines, Inter for body, Noto Sans Arabic for Arabic body text
- **Mobile-First Design:** 65% Chrome Android users - all features must work flawlessly on mobile before desktop
- **Bottom Tab Navigation:** 4 tabs (Home, Search, Tickets, Account) for mobile
- **Horizontal Category Tabs:** Tout / Cinéma / Théâtre / Courts-métrages / Musique
- **Discovery-First Experience:** Sub-10-second path from app open to relevant content
- **30-Second Value:** First-time users find something interesting within 30 seconds
- **One-Tap Actions:** Core actions require exactly one tap
- **Poster-Forward Cards:** Event visuals lead, text secondary
- **Skeleton Loading:** Card-shaped placeholders, never blank screens
- **Celebration Moments:** Confetti burst on ticket purchase, heart pulse on watchlist save
- **Touch Targets:** 44px minimum, 48px preferred for all tap targets
- **Offline Indicators:** Clear "offline mode" messaging with graceful degradation
- **Mixed AR/FR Content Support:** Correct rendering of Arabic/French mixed text

**From PRD Document:**

- **Brownfield Migration:** Modernizing existing tiween.com (not greenfield)
- **B2B Dashboard via Strapi Admin:** Venue managers use Strapi Admin panel with roles, not custom frontend
- **Guest Checkout:** Must support purchase without account creation
- **Culture Pass (Phase 2):** Subscription system deferred to post-MVP
- **Push Notifications (Phase 2):** Deferred to post-MVP
- **Native Apps (Phase 3):** iOS/Android deferred to Phase 3

## FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 3 | Browse events without account |
| FR2 | Epic 3 | Filter by category |
| FR3 | Epic 3 | Filter by date range |
| FR4 | Epic 3 | Filter by region/city |
| FR5 | Epic 3 | Filter by venue |
| FR6 | Epic 3 | Search by keyword |
| FR7 | Epic 3 | View event details |
| FR8 | Epic 3 | Event location on map |
| FR9 | Epic 3 | "Near me" geolocation filter |
| FR10 | Epic 3 | Share event details |
| FR11 | Epic 4 | Register with email/password |
| FR12 | Epic 4 | Social login (Google, Facebook) |
| FR13 | Epic 4 | Password reset |
| FR14 | Epic 4 | Update profile |
| FR15 | Epic 4 | Set preferred language |
| FR16 | Epic 4 | Set default region |
| FR17 | Epic 6 | View purchase history |
| FR18 | Epic 4 | Guest checkout |
| FR19 | Epic 5 | Add to watchlist |
| FR20 | Epic 5 | Remove from watchlist |
| FR21 | Epic 5 | View watchlist |
| FR22 | Epic 5 | Offline watchlist access |
| FR23 | Epic 5 | Watchlist sync across devices |
| FR24 | Epic 6 | View ticket types and prices |
| FR25 | Epic 6 | Select quantity and type |
| FR26 | Epic 6 | Complete payment |
| FR27 | Epic 6 | QR ticket via email |
| FR28 | Epic 6 | View tickets in app |
| FR29 | Epic 6 | Offline QR access |
| FR30 | Epic 6 | Booking confirmation |
| FR31 | Epic 6 | Guest ticket via email |
| FR32 | Epic 7 | Venue registration |
| FR33 | Epic 7 | Venue profile management |
| FR34 | Epic 7 | Create events |
| FR35 | Epic 7 | Edit events |
| FR36 | Epic 7 | Delete/cancel events |
| FR37 | Epic 7 | Ticketing setup |
| FR38 | Epic 7 | Sales reports |
| FR39 | Epic 7 | Event analytics |
| FR40 | Epic 7 | Multiple ticket types |
| FR41 | Epic 8 | QR code scanning |
| FR42 | Epic 8 | Validation result display |
| FR43 | Epic 8 | Ticket details on scan |
| FR44 | Epic 8 | Duplicate prevention |
| FR45 | Epic 8 | Real-time attendance |
| FR46 | Epic 8 | Intermittent connectivity |
| FR47 | Epic 9 | Venue approval workflow |
| FR48 | Epic 9 | Manual event creation |
| FR49 | Epic 9 | Edit any event |
| FR50 | Epic 9 | Flag events |
| FR51 | Epic 9 | Platform analytics |
| FR52 | Epic 9 | User management |
| FR53 | Epic 9 | Categories/regions management |
| FR54 | Epic 1 | Multilingual content |
| FR55 | Epic 1 | RTL layout |
| FR56 | Epic 3 | Display in preferred language |
| FR57 | Epic 2B | Multiple event images |
| FR58 | Epic 2B | Multiple venue images |
| FR59 | Epic 10 | Install application |
| FR60 | Epic 10 | Browse cached events offline |
| FR61 | Epic 10 | Offline watchlist |
| FR62 | Epic 10 | Offline tickets |
| FR63 | Epic 10 | Sync on connectivity restore |
| FR64 | Epic 6 | Real-time ticket availability |
| FR65 | Epic 5 | Schedule change notifications |
| FR66 | Epic 7 | Real-time sales updates |
