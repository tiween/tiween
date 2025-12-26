# Core Architectural Decisions

## Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database: PostgreSQL
- API Strategy: REST
- Authentication: NextAuth.js (JWT)
- Payment Integration: Konnect Network
- Real-Time: WebSockets (Socket.io)

**Important Decisions (Shape Architecture):**
- Caching: Redis + SWR + IndexedDB
- State Management: Zustand (client) + RSC (server)
- PWA: Serwist
- Search: Algolia
- Testing: Vitest + Playwright

**Deferred Decisions (Post-MVP):**
- Advanced analytics/observability (Grafana/Prometheus)
- AI-powered recommendations
- Physical POS ticketing integration

## Data Architecture

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **Primary Database** | PostgreSQL | 16.x | Continuity with legacy, Strapi default, robust relational support |
| **Cache Layer** | Redis | 7.x | Session management, ticket inventory locks, rate limiting |
| **Client Cache** | SWR | Latest | Stale-while-revalidate for API data, works with RSC |
| **Offline Storage** | IndexedDB | Native | PWA requirement for watchlist, tickets, cached listings |
| **Search Engine** | Algolia | Latest | Proven in legacy, fast typo-tolerant search, instant results |

**Data Flow:**
```
Browser (IndexedDB) ←→ Next.js (SWR) ←→ Redis (cache) ←→ Strapi ←→ PostgreSQL
```

## Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Auth Provider** | NextAuth.js | Included in starter, supports social + credentials |
| **Token Strategy** | JWT | Stateless, works with offline PWA |
| **Session Storage** | Redis | Centralized session management |
| **Password Hashing** | bcrypt (cost 12+) | Industry standard, per NFR-S2 |
| **API Security** | Rate limiting via Redis | Protect against abuse |
| **QR Ticket Signing** | HMAC-SHA256 | Cryptographic verification, prevent forgery |

**Auth Flows:**
- B2C: Email/password + Google/Facebook social login
- B2B: Email/password with venue role assignment
- Admin: Email/password with admin role
- Guest: Anonymous browsing, email-only checkout

## API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **API Style** | REST | Simpler caching, standard Strapi, sufficient for needs |
| **Real-Time** | WebSockets (Socket.io) | Bidirectional for ticket availability, live sales |
| **API Documentation** | Strapi built-in (OpenAPI) | Auto-generated from content types |
| **Error Format** | RFC 7807 Problem Details | Consistent error responses |

**Real-Time Use Cases:**
- Ticket availability updates during checkout
- Live sales dashboard for venues
- Schedule change notifications
- Scanner validation feedback

## Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Next.js 16.1 (App Router) | SSR/SSG for SEO, RSC for performance, Turbopack default |
| **Server Data** | React Server Components | No client JS for static content |
| **Client State** | Zustand | Simple, lightweight, DevTools support |
| **Server State** | SWR | Cache invalidation, optimistic updates |
| **Styling** | Tailwind v4 + shadcn/ui | Utility-first, accessible components |
| **Component Dev** | Storybook (Vite) | Isolated component development |
| **i18n** | next-intl | App Router compatible, included in starter |
| **PWA** | Serwist | Modern next-pwa successor, Next.js 16.1 compatible |

**Rendering Strategy:**

| Page Type | Strategy | Reason |
|-----------|----------|--------|
| Event listings | SSR + ISR | Fresh data, SEO |
| Event detail | SSR | SEO critical |
| Static pages | SSG | Performance |
| User dashboard | CSR | Authenticated, dynamic |
| Checkout | CSR | Interactive, real-time |

## Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Hosting** | Dokploy on VPS | Self-hosted, cost-effective |
| **Container** | Docker | Included in starter template |
| **CI/CD** | GitHub Actions | Included in starter template |
| **Reverse Proxy** | Handled by Dokploy | Built-in SSL, routing |
| **Monitoring** | Sentry | Error tracking, performance |

**Deployment Architecture:**
```
Dokploy (VPS)
├── Next.js Container (apps/ui)
├── Strapi Container (apps/strapi)
├── PostgreSQL Container
├── Redis Container
└── Nginx (reverse proxy, SSL)
```

## External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| **Payment** | Konnect Network | Tunisian payments (e-Dinar, cards) |
| **Email** | Resend | Transactional emails, ticket delivery |
| **Media** | ImageKit | Image storage, optimization, CDN |
| **Search** | Algolia | Full-text search, instant results |
| **Error Tracking** | Sentry | Error monitoring, performance |

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| **Unit** | Vitest | Utilities, hooks, pure functions |
| **Component** | Storybook + Vitest | UI components in isolation |
| **Integration** | Vitest + Supertest | API routes, services |
| **E2E** | Playwright | Critical user journeys |

**Testing Priorities:**
1. Payment flow (critical path)
2. Ticket purchase + QR generation
3. Auth flows (login, registration)
4. Event discovery + filtering
5. Offline functionality

## QR Ticket System

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Generation** | Server-side (qrcode npm) | Secure, consistent |
| **Signing** | HMAC-SHA256 | Cryptographic verification |
| **Storage** | ImageKit + IndexedDB | CDN delivery + offline access |
| **Validation** | Real-time API + offline cache | Works with intermittent connectivity |

**QR Flow:**
1. Purchase confirmed → Generate ticket ID
2. Sign ticket data with HMAC secret
3. Generate QR containing signed payload
4. Store QR image in ImageKit
5. Cache in user's IndexedDB for offline
6. Scan → Validate signature → Check against Redis → Update status

## Decision Impact Analysis

**Implementation Sequence:**
1. Project setup (clone template, configure)
2. Database schema (migrate/recreate from legacy)
3. Auth configuration (NextAuth + roles)
4. Core API routes (events, venues, showtimes)
5. Frontend components (port from legacy to shadcn/ui)
6. Payment integration (Konnect)
7. Ticketing system (QR generation, validation)
8. Real-time (WebSocket for availability)
9. PWA configuration (Serwist, offline)
10. Search integration (Algolia)

**Cross-Component Dependencies:**
- Auth → All protected routes and API calls
- Redis → Sessions, ticket locks, rate limiting, real-time
- Algolia → Event discovery, search results
- Konnect → Checkout, payment confirmation
- ImageKit → All media (posters, QR codes)
- Sentry → All apps for error tracking

---
