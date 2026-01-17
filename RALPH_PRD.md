# Tiween - Consolidated PRD for Ralph

> Tunisia's first comprehensive cultural agenda platform - a two-sided marketplace connecting culture enthusiasts with cultural venues and professionals.

## Executive Summary

**Tiween** solves the fundamental problem of fragmented cultural event discovery in Tunisia, where information is scattered across venue Facebook pages (posted as images), multiple ticketing platforms with poor UX, and no unified view by date, region, or category.

The platform modernizes the existing tiween.com (Next.js + Strapi v4) while expanding capabilities to include a mobile-first PWA with offline support, integrated ticketing, and a professional venue dashboard.

### Target Users

- **B2C Consumers**: 18-34 digitally-native Tunisians seeking unified cultural discovery
- **B2B Professionals**: Venue managers and cultural institutions needing modern tools to manage events, reach audiences, and sell tickets

### What Makes This Special

1. **Only unified cultural agenda in Tunisia** - All disciplines (cinema, theater, concerts, exhibitions), all regions, one platform
2. **Discovery-first, not venue-first** - Find events by what you want to see, when, and where
3. **Two-sided value creation** - Consumer audience powers B2B value; B2B tools sustain free consumer access
4. **End-to-end ticketing** - Physical + digital solution with lower fees than competitors (Eazytick, Teskerti)

---

## Technology Stack

| Category           | Technology           | Version     | Notes                     |
| ------------------ | -------------------- | ----------- | ------------------------- |
| **Frontend**       | Next.js (App Router) | 16.1        | RSC by default, Turbopack |
| **Backend**        | Strapi               | v5.x        | Document Service API      |
| **Language**       | TypeScript           | strict mode | No `any` types            |
| **Styling**        | Tailwind CSS         | v4          | + shadcn/ui               |
| **State (client)** | Zustand              | latest      | With devtools + persist   |
| **State (server)** | SWR                  | latest      | For Strapi data fetching  |
| **Auth**           | NextAuth.js          | latest      | JWT strategy              |
| **i18n**           | next-intl            | latest      | AR/FR/EN locales          |
| **PWA**            | Serwist              | latest      | Offline support           |
| **Testing**        | Vitest + Playwright  | latest      | Co-located tests          |
| **Database**       | PostgreSQL           | 16.x        | Via Strapi                |
| **Cache**          | Redis                | 7.x         | Sessions, rate limiting   |
| **Monorepo**       | Turborepo            | latest      | Yarn workspaces           |

### External Services

| Service            | Provider        | Purpose                               |
| ------------------ | --------------- | ------------------------------------- |
| **Payment**        | Konnect Network | Tunisian payments (e-Dinar, cards)    |
| **Email**          | Resend          | Transactional emails, ticket delivery |
| **Media**          | ImageKit        | Image storage, optimization, CDN      |
| **Search**         | Algolia         | Full-text search, instant results     |
| **Error Tracking** | Sentry          | Error monitoring                      |

---

## Project Structure

```
tiween-bmad-version/
├── apps/
│   ├── client/          # Next.js 16.1 frontend
│   │   └── src/
│   │       ├── app/[locale]/    # Pages (App Router)
│   │       ├── components/      # Shared UI only
│   │       ├── features/        # Domain logic + components
│   │       ├── hooks/           # Shared hooks
│   │       ├── stores/          # Zustand stores
│   │       ├── lib/             # Utilities, API clients
│   │       └── messages/        # i18n translations
│   └── strapi/          # Strapi v5 backend
├── packages/
│   └── shared-types/    # Shared TypeScript types
├── _bmad-output/        # PRD and planning docs
└── docs/                # Project documentation
```

---

## MVP Scope (Phase 1)

### Platform Foundation

- [x] Monorepo setup with Turborepo
- [ ] Next.js 16.1 upgrade with Turbopack
- [ ] Strapi v4 → v5 migration
- [ ] PWA with offline support (Serwist)
- [ ] i18n setup (AR/FR/EN with RTL)
- [ ] Docker/Dokploy deployment config
- [ ] CI/CD pipeline (GitHub Actions)

### Consumer Features (B2C)

- [ ] Event discovery: browse by category, filter by date/location/genre, search
- [ ] Event details: times, venue, description, media
- [ ] User accounts: registration, login (email + social)
- [ ] Watchlist: save events for later (with offline access)
- [ ] Basic ticketing: purchase flow, payment, QR ticket delivery

### Professional Features (B2B)

- [ ] Venue self-registration and profile management
- [ ] Schedule management: add/edit/delete events
- [ ] Basic analytics: views, demographics
- [ ] Ticketing tools: inventory, sales reports, QR check-in

---

## Epic Breakdown

### Epic 1: Project Foundation & Infrastructure

Development teams have a fully configured monorepo with Next.js 16.1, Strapi v5, and all tooling ready for parallel development.

**Stories:**

- 1.1: Initialize monorepo from starter template
- 1.2: Upgrade to Next.js 16.1 with Turbopack
- 1.3: Configure Tiween design tokens and Tailwind theme
- 1.4: Setup shadcn/ui with brand customization
- 1.5: Configure Storybook with Vite builder
- 1.6: Configure i18n with RTL support
- 1.7: Setup Serwist PWA configuration
- 1.8: Configure Docker and Dokploy deployment
- 1.9: Setup CI/CD pipeline with GitHub Actions

### Epic 2A: Component Library & Design System (Parallel Track A)

Complete UI component library with Storybook stories, ready for integration.

**Component Groups:**

- Layout: BottomNav, Header, PageContainer, StickyFilters
- Discovery: EventCard, FilmHero, CategoryTabs, DateSelector, VenueCard, SearchBar
- Ticketing: ShowtimeButton, SeatSelector, TicketQR, QuantitySelector, PaymentForm
- User: WatchlistButton, LoginForm, RegisterForm, ProfileForm
- Common: EmptyState, ErrorBoundary, LoadingSpinner, Skeleton, Toast, Badge
- Scanner: TicketScanner, ValidationResult, AttendanceCounter

### Epic 2B: Strapi v5 Migration & Backend Foundation (Parallel Track B)

Fully migrated Strapi v5 backend with all content-types, plugins, and data ready.

**Stories:**

- 2B.1: Strapi v5 upgrade and project setup
- 2B.2: Core content types (Event, CreativeWork)
- 2B.3: Core content types (Venue, Showtime)
- 2B.4: Core content types (Person, Genre)
- 2B.5: Ticketing content types (TicketOrder, Ticket)
- 2B.6: User content types (UserWatchlist, UserPreferences)
- 2B.7: Reference content types (Region, City, Category)
- 2B.8: Events Manager plugin recreation for v5
- 2B.9: User roles and permissions configuration
- 2B.10: Redis integration for sessions and caching
- 2B.11: ImageKit provider configuration
- 2B.12: Email configuration with Brevo
- 2B.13: API documentation with OpenAPI
- 2B.14: Data migration scripts from legacy Strapi v4
- 2B.15: Database seeding for development

### Epic 3: Event Discovery & Browsing

Users can browse, filter, and search all cultural events across Tunisia without creating an account.

**Features:**

- Homepage with curated event listings
- Category filtering (Cinema, Theatre, Music, Exhibitions)
- Date filtering (Today, This Week, Custom range)
- Region/City filtering
- Keyword search with Algolia
- Event detail pages
- Map integration (Leaflet)
- Share functionality

### Epic 4: User Authentication & Profiles

Users can register, login, manage their profiles.

**Features:**

- Email/password registration
- Social login (Google, Facebook)
- Password reset flow
- Profile management
- Language/region preferences
- Guest checkout capability

### Epic 5: Watchlist & Personalization

Authenticated users can save events to their watchlist with offline access.

**Features:**

- Add/remove from watchlist
- Watchlist view page
- Offline watchlist access (IndexedDB)
- Cross-device sync

### Epic 6: B2C Ticketing & Purchases

Users can purchase tickets and receive QR codes.

**Features:**

- Ticket type and price display
- Quantity selection
- Konnect payment integration
- QR code ticket generation (HMAC-SHA256 signed)
- Email ticket delivery
- In-app ticket viewing
- Offline QR access
- Purchase history

### Epic 7: B2B Venue Management

Venue managers can manage events via Strapi Admin.

**Features:**

- Venue registration with admin approval
- Venue profile management
- Event creation/editing
- Ticketing configuration
- Sales reports dashboard
- Event analytics

### Epic 8: B2B Ticket Validation (Scanner)

Venue staff can scan and validate tickets.

**Features:**

- QR scanner interface
- Validation result display
- Duplicate prevention
- Real-time attendance counts
- Offline scanning with sync

### Epic 9: Platform Administration

Admins can moderate and manage the platform via Strapi Admin.

### Epic 10: PWA & Offline Experience

Full offline support for critical features.

---

## Functional Requirements (FR1-FR66)

### Event Discovery (FR1-FR10)

- FR1: Browse all events without account
- FR2: Filter by category
- FR3: Filter by date range
- FR4: Filter by region/city
- FR5: Filter by venue
- FR6: Search by keyword
- FR7: View event details
- FR8: See event on map
- FR9: Filter by "near me"
- FR10: Share events

### User Accounts (FR11-FR18)

- FR11: Register with email/password
- FR12: Social login (Google, Facebook)
- FR13: Password reset
- FR14: Update profile
- FR15: Set language preference
- FR16: Set default region
- FR17: View purchase history
- FR18: Guest checkout

### Watchlist (FR19-FR23)

- FR19: Add to watchlist
- FR20: Remove from watchlist
- FR21: View watchlist
- FR22: Offline watchlist access
- FR23: Cross-device sync

### Ticketing B2C (FR24-FR31)

- FR24: View ticket types and prices
- FR25: Select quantity
- FR26: Complete payment
- FR27: Receive QR tickets via email
- FR28: View tickets in app
- FR29: Offline QR access
- FR30: Booking confirmation
- FR31: Guest checkout tickets via email

### Venue Management B2B (FR32-FR40)

- FR32: Venue registration
- FR33: Venue profile management
- FR34: Create events
- FR35: Edit events
- FR36: Delete/cancel events
- FR37: Set up ticketing
- FR38: View sales reports
- FR39: View analytics
- FR40: Configure ticket types

### Ticket Validation (FR41-FR46)

- FR41: Scan QR codes
- FR42: Display validation result
- FR43: Show ticket details
- FR44: Prevent duplicates
- FR45: Real-time attendance
- FR46: Offline scanning

### Administration (FR47-FR53)

- FR47: Approve/reject venues
- FR48: Manual event creation
- FR49: Edit any event
- FR50: Flag events
- FR51: Platform analytics
- FR52: Manage users
- FR53: Manage categories/regions

### Content & i18n (FR54-FR58)

- FR54: Multilingual content (AR/FR/EN)
- FR55: RTL layout for Arabic
- FR56: Display in user's language
- FR57: Multiple images per event
- FR58: Multiple images per venue

### PWA & Offline (FR59-FR63)

- FR59: Install as app
- FR60: Browse cached events offline
- FR61: Offline watchlist
- FR62: Offline tickets
- FR63: Sync when online

### Real-Time (FR64-FR66)

- FR64: Real-time ticket availability
- FR65: Schedule change notifications
- FR66: Real-time sales updates

---

## Critical Implementation Rules

### TypeScript

- Strict mode mandatory - No `any` types
- Use Zod for runtime validation
- Export types from `packages/shared-types/`

### Next.js App Router

- Server Components by default
- Use `generateMetadata` for SEO
- Route groups: `(public)`, `(auth)`, `(venue)`
- Co-locate loading.tsx and error.tsx

### Strapi v5

- Use Document Service API (not Entity Service)
- Use `documentId` not `id`
- Enable i18n on content types
- Use REST, not GraphQL

### Component Rules

- Feature components in `features/`
- Shared components in `components/`
- Co-locate tests and stories
- Use shadcn/ui primitives

### i18n Rules

- Arabic uses Western numerals (25/12/2025)
- Date format: DD/MM/YYYY for all locales
- Store translations in `messages/`

### Security

- Never expose API keys in client
- Validate all inputs with Zod
- Use HMAC-SHA256 for QR tickets
- Rate limit with Redis

---

## Commands

```bash
# Development
yarn dev              # Start all apps
yarn dev:client       # Next.js only
yarn dev:strapi       # Strapi only
yarn storybook        # Component dev

# Testing
yarn test             # Unit tests
yarn test:e2e         # Playwright

# Quality
yarn lint             # ESLint
yarn type-check       # TypeScript
```

---

## Current Status

The project has:

- Existing monorepo structure with `apps/client` and `apps/strapi`
- BMAD planning documentation complete
- 10 epics with detailed stories
- Tech specs for most stories in `_bmad-output/implementation-artifacts/`

**Priority Focus:**

1. Complete Epic 1 (Foundation) - unblock parallel development
2. Begin Epic 2A (Components) and Epic 2B (Backend) in parallel
3. Progress to Epic 3 (Discovery) once foundation is solid
