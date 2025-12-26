# Project Structure & Boundaries

## Complete Project Directory Structure

```
tiween/
├── README.md
├── package.json                    # Workspace root
├── turbo.json                      # Turborepo configuration
├── .gitignore
├── .nvmrc                          # Node 22
├── .env.example
├── docker-compose.yml              # Local development
├── docker-compose.prod.yml         # Production (Dokploy)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, type-check, test
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── apps/
│   ├── client/                     # Next.js 16.1 Frontend (PWA)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── components.json         # shadcn/ui config
│   │   ├── .env.local
│   │   ├── .env.example
│   │   ├── serwist.config.ts       # PWA configuration
│   │   ├── public/
│   │   │   ├── manifest.json       # PWA manifest
│   │   │   ├── sw.js               # Service worker (generated)
│   │   │   ├── icons/              # PWA icons
│   │   │   └── locales/            # Static i18n assets
│   │   ├── .storybook/
│   │   │   ├── main.ts
│   │   │   └── preview.ts
│   │   └── src/
│   │       ├── app/
│   │       │   ├── globals.css
│   │       │   ├── [locale]/
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── page.tsx                    # Home
│   │       │   │   ├── (public)/
│   │       │   │   │   ├── events/
│   │       │   │   │   │   ├── page.tsx            # Event listing
│   │       │   │   │   │   └── [slug]/
│   │       │   │   │   │       └── page.tsx        # Event detail
│   │       │   │   │   ├── movies/
│   │       │   │   │   │   ├── page.tsx
│   │       │   │   │   │   └── [slug]/page.tsx
│   │       │   │   │   ├── venues/
│   │       │   │   │   │   ├── page.tsx
│   │       │   │   │   │   └── [slug]/page.tsx
│   │       │   │   │   ├── search/page.tsx
│   │       │   │   │   └── showtimes/page.tsx
│   │       │   │   ├── (auth)/
│   │       │   │   │   ├── login/page.tsx
│   │       │   │   │   ├── register/page.tsx
│   │       │   │   │   ├── dashboard/
│   │       │   │   │   │   ├── page.tsx            # User dashboard
│   │       │   │   │   │   ├── watchlist/page.tsx
│   │       │   │   │   │   ├── tickets/page.tsx
│   │       │   │   │   │   └── settings/page.tsx
│   │       │   │   │   └── checkout/
│   │       │   │   │       ├── page.tsx
│   │       │   │   │       └── success/page.tsx
│   │       │   │   └── (venue)/                    # B2B Routes (limited)
│   │       │   │       └── scanner/page.tsx        # QR Scanner (mobile-friendly)
│   │       │   └── api/
│   │       │       ├── auth/[...nextauth]/route.ts
│   │       │       ├── webhooks/
│   │       │       │   ├── konnect/route.ts        # Payment webhooks
│   │       │       │   └── strapi/route.ts         # CMS webhooks
│   │       │       └── revalidate/route.ts         # ISR revalidation
│   │       ├── components/
│   │       │   ├── ui/                             # shadcn/ui components
│   │       │   │   ├── button.tsx
│   │       │   │   ├── card.tsx
│   │       │   │   ├── dialog.tsx
│   │       │   │   ├── skeleton.tsx
│   │       │   │   └── ...
│   │       │   ├── layout/
│   │       │   │   ├── Header/
│   │       │   │   │   ├── Header.tsx
│   │       │   │   │   ├── Header.test.tsx
│   │       │   │   │   ├── Header.stories.tsx
│   │       │   │   │   └── index.ts
│   │       │   │   ├── Footer/
│   │       │   │   ├── Navigation/
│   │       │   │   ├── MobileNav/
│   │       │   │   └── LanguageSwitcher/
│   │       │   └── common/
│   │       │       ├── ErrorBoundary/
│   │       │       ├── LoadingSpinner/
│   │       │       ├── EmptyState/
│   │       │       └── SEO/
│   │       ├── features/
│   │       │   ├── events/
│   │       │   │   ├── components/
│   │       │   │   │   ├── EventCard/
│   │       │   │   │   ├── EventList/
│   │       │   │   │   ├── EventFilters/
│   │       │   │   │   ├── EventDetail/
│   │       │   │   │   └── ShowtimeSelector/
│   │       │   │   ├── hooks/
│   │       │   │   │   ├── useEvents.ts
│   │       │   │   │   └── useEventDetail.ts
│   │       │   │   ├── types/
│   │       │   │   │   └── event.types.ts
│   │       │   │   └── utils/
│   │       │   │       └── eventHelpers.ts
│   │       │   ├── movies/
│   │       │   │   ├── components/
│   │       │   │   │   ├── MovieCard/
│   │       │   │   │   ├── MovieHeader/
│   │       │   │   │   ├── MovieCredits/
│   │       │   │   │   └── MovieTimetable/
│   │       │   │   ├── hooks/
│   │       │   │   └── types/
│   │       │   ├── venues/
│   │       │   │   ├── components/
│   │       │   │   │   ├── VenueCard/
│   │       │   │   │   ├── VenueMap/
│   │       │   │   │   └── VenueSchedule/
│   │       │   │   ├── hooks/
│   │       │   │   └── types/
│   │       │   ├── tickets/
│   │       │   │   ├── components/
│   │       │   │   │   ├── TicketCard/
│   │       │   │   │   ├── TicketQR/
│   │       │   │   │   ├── PurchaseForm/
│   │       │   │   │   └── SeatSelector/
│   │       │   │   ├── hooks/
│   │       │   │   │   ├── useTicketPurchase.ts
│   │       │   │   │   └── useTicketAvailability.ts
│   │       │   │   └── types/
│   │       │   ├── search/
│   │       │   │   ├── components/
│   │       │   │   │   ├── SearchBar/
│   │       │   │   │   ├── SearchResults/
│   │       │   │   │   └── AlgoliaHits/
│   │       │   │   └── hooks/
│   │       │   ├── auth/
│   │       │   │   ├── components/
│   │       │   │   │   ├── LoginForm/
│   │       │   │   │   ├── RegisterForm/
│   │       │   │   │   └── SocialLogin/
│   │       │   │   └── hooks/
│   │       │   ├── watchlist/
│   │       │   │   ├── components/
│   │       │   │   └── hooks/
│   │       │   └── scanner/                        # QR Scanner feature
│   │       │       ├── components/
│   │       │       │   └── TicketScanner/
│   │       │       └── hooks/
│   │       ├── hooks/                              # Shared hooks
│   │       │   ├── useAuth.ts
│   │       │   ├── useOffline.ts
│   │       │   ├── useLocalStorage.ts
│   │       │   └── useMediaQuery.ts
│   │       ├── stores/                             # Zustand stores
│   │       │   ├── cartStore.ts
│   │       │   ├── userStore.ts
│   │       │   ├── filterStore.ts
│   │       │   └── offlineStore.ts
│   │       ├── lib/
│   │       │   ├── api/
│   │       │   │   ├── strapi.ts                   # Strapi client
│   │       │   │   ├── konnect.ts                  # Payment client
│   │       │   │   └── algolia.ts                  # Search client
│   │       │   ├── auth/
│   │       │   │   ├── authOptions.ts              # NextAuth config
│   │       │   │   └── providers.ts
│   │       │   ├── utils/
│   │       │   │   ├── formatDate.ts
│   │       │   │   ├── formatCurrency.ts
│   │       │   │   ├── cn.ts                       # Tailwind merge
│   │       │   │   └── validation.ts
│   │       │   ├── constants/
│   │       │   │   ├── routes.ts
│   │       │   │   ├── config.ts
│   │       │   │   └── errorCodes.ts
│   │       │   └── offline/
│   │       │       ├── db.ts                       # IndexedDB wrapper
│   │       │       └── sync.ts                     # Offline sync logic
│   │       ├── types/
│   │       │   ├── strapi.types.ts                 # Strapi response types
│   │       │   ├── api.types.ts
│   │       │   └── common.types.ts
│   │       ├── messages/                           # i18n translations
│   │       │   ├── fr.json
│   │       │   ├── ar.json
│   │       │   └── en.json
│   │       └── styles/
│   │           └── globals.css
│   │
│   └── strapi/                     # Strapi v5 Backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env
│       ├── .env.example
│       ├── Dockerfile
│       ├── config/
│       │   ├── admin.ts
│       │   ├── api.ts
│       │   ├── database.ts
│       │   ├── middlewares.ts
│       │   ├── plugins.ts
│       │   └── server.ts
│       ├── database/
│       │   └── migrations/
│       ├── public/
│       │   └── uploads/
│       └── src/
│           ├── index.ts
│           ├── admin/
│           │   └── app.tsx                         # Admin customization
│           ├── api/
│           │   ├── event/
│           │   │   ├── content-types/
│           │   │   │   └── event/
│           │   │   │       └── schema.json
│           │   │   ├── controllers/
│           │   │   ├── routes/
│           │   │   └── services/
│           │   ├── showtime/
│           │   ├── venue/                          # (Medium → Venue)
│           │   ├── movie/                          # (MovieMeta → Movie)
│           │   ├── creative-work/
│           │   ├── person/
│           │   ├── ticket-order/                   # NEW
│           │   ├── ticket/                         # NEW
│           │   ├── user-watchlist/                 # NEW
│           │   ├── review/                         # NEW
│           │   └── venue-subscription/             # NEW (B2B)
│           ├── components/
│           │   ├── common/
│           │   │   ├── link.json
│           │   │   ├── video.json
│           │   │   └── award.json
│           │   └── creative-works/
│           │       ├── cast.json
│           │       └── credit.json
│           ├── plugins/
│           │   └── events-manager/                 # Custom plugin (recreate)
│           │       ├── package.json
│           │       ├── strapi-admin.js
│           │       ├── strapi-server.js
│           │       └── admin/
│           │           └── src/
│           ├── extensions/
│           │   └── users-permissions/              # Extended user model
│           └── middlewares/
│               └── rate-limit.ts
│
├── packages/
│   ├── shared-types/               # Shared TypeScript types
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── event.ts
│   │       ├── ticket.ts
│   │       ├── venue.ts
│   │       └── user.ts
│   ├── eslint-config/
│   │   ├── package.json
│   │   └── index.js
│   ├── prettier-config/
│   │   ├── package.json
│   │   └── index.js
│   └── typescript-config/
│       ├── package.json
│       ├── base.json
│       ├── nextjs.json
│       └── strapi.json
│
├── scripts/
│   ├── migrate-data.ts             # Legacy data migration
│   ├── seed-dev.ts                 # Development seeding
│   └── generate-types.ts           # Generate types from Strapi
│
└── docs/
    ├── architecture.md             # This document
    ├── api.md                      # API documentation
    ├── deployment.md               # Deployment guide
    └── development.md              # Developer onboarding
```

## Architectural Boundaries

**API Boundaries:**

| Boundary | Location | Purpose |
|----------|----------|---------|
| **Strapi REST API** | `apps/strapi/src/api/` | Content management, CRUD operations |
| **Next.js API Routes** | `apps/client/src/app/api/` | Auth, webhooks, revalidation |
| **Konnect Webhooks** | `apps/client/src/app/api/webhooks/konnect/` | Payment confirmations |
| **WebSocket Server** | `apps/strapi` (plugin) | Real-time ticket availability |

**Component Boundaries:**

| Layer | Boundary | Communication |
|-------|----------|---------------|
| **UI Components** | `components/ui/` | Props only, no business logic |
| **Feature Components** | `features/*/components/` | Use hooks for data, Zustand for state |
| **Stores** | `stores/` | Single source of truth for client state |
| **API Layer** | `lib/api/` | All external API calls |

**Data Boundaries:**

| Data Type | Source | Cache | Offline |
|-----------|--------|-------|---------|
| Events/Movies | Strapi → SWR | 1 min | IndexedDB |
| User Data | NextAuth + Strapi | Session | - |
| Cart | Zustand (persist) | LocalStorage | ✓ |
| Tickets | Strapi | Redis | IndexedDB |
| Search | Algolia | Client-side | - |

## Requirements to Structure Mapping

**Feature Mapping:**

| PRD Domain | Frontend Location | Backend Location |
|------------|-------------------|------------------|
| Event Discovery (FR1-10) | `features/events/`, `features/search/` | `api/event/`, `api/showtime/` |
| User Accounts (FR11-18) | `features/auth/`, `app/(auth)/` | `extensions/users-permissions/` |
| Watchlist (FR19-23) | `features/watchlist/` | `api/user-watchlist/` |
| B2C Ticketing (FR24-31) | `features/tickets/`, `app/(auth)/checkout/` | `api/ticket-order/`, `api/ticket/` |
| B2B Venue (FR32-40) | **Strapi Admin Panel** (roles: Venue Manager) | `api/venue-subscription/`, `plugins/events-manager/` |
| Ticket Validation (FR41-46) | `features/scanner/`, `app/(venue)/scanner/` | `api/ticket/` (validation endpoint) |
| PWA/Offline (FR59-63) | `lib/offline/`, `serwist.config.ts` | - |
| Real-Time (FR64-66) | WebSocket hooks | `plugins/events-manager/` (Socket.io) |

**Cross-Cutting Concerns:**

| Concern | Locations |
|---------|-----------|
| **Authentication** | `lib/auth/`, `hooks/useAuth.ts`, `app/api/auth/` |
| **i18n** | `messages/`, `app/[locale]/` routing |
| **Error Handling** | `components/common/ErrorBoundary/`, `lib/constants/errorCodes.ts` |
| **Offline** | `lib/offline/`, `stores/offlineStore.ts`, `serwist.config.ts` |
| **Analytics** | `lib/utils/analytics.ts` (Sentry) |

## Integration Points

**Internal Communication:**

```
┌─────────────────┐     ┌─────────────────┐
│  Next.js Client │────▶│   Strapi API    │
│  (apps/client)  │◀────│  (apps/strapi)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
    ┌────▼────┐            ┌─────▼─────┐
    │ Zustand │            │ PostgreSQL │
    │ (client)│            │  + Redis   │
    └─────────┘            └───────────┘
```

**External Integrations:**

| Service | Integration Point | Data Flow |
|---------|-------------------|-----------|
| **Konnect** | `lib/api/konnect.ts` → Webhook | Payment initiation → Confirmation |
| **Algolia** | `lib/api/algolia.ts` | Index sync (Strapi) → Search (Client) |
| **ImageKit** | Strapi upload provider | Media upload → CDN delivery |
| **Resend** | Strapi email plugin | Transactional emails |
| **Sentry** | Both apps | Error reporting |

## File Organization Patterns

**Configuration Files:**

| File | Location | Purpose |
|------|----------|---------|
| `turbo.json` | Root | Turborepo pipeline |
| `docker-compose.yml` | Root | Local dev environment |
| `.env.example` | Root + each app | Environment template |
| `next.config.ts` | `apps/client/` | Next.js configuration |
| `serwist.config.ts` | `apps/client/` | PWA/Service worker |
| `components.json` | `apps/client/` | shadcn/ui config |

**Source Organization:**
- **Shared code** → `packages/` (shared-types, configs)
- **App-specific** → `apps/{app}/src/`
- **Feature code** → `src/features/{feature}/`
- **Shared UI** → `src/components/`
- **Business logic** → `src/lib/`

**Test Organization:**
- Co-located with source files
- `{Component}.test.tsx` for unit tests
- `{Component}.stories.tsx` for Storybook
- `apps/client/e2e/` for Playwright E2E tests

## Development Workflow Integration

**Development Commands:**

```bash
# Start all apps
yarn dev

# Start specific app
yarn dev:client
yarn dev:strapi

# Run Storybook
yarn storybook

# Run tests
yarn test
yarn test:e2e

# Type check
yarn type-check

# Lint
yarn lint
```

**Build Pipeline:**

```
yarn build
├── turbo run build
│   ├── packages/shared-types (first)
│   ├── apps/strapi
│   └── apps/client (last, depends on packages)
```

**Deployment Structure (Dokploy):**

```
Production Containers:
├── tiween-client    (Next.js, port 3000)
├── tiween-strapi    (Strapi, port 1337)
├── tiween-postgres  (PostgreSQL, port 5432)
└── tiween-redis     (Redis, port 6379)
```

---
