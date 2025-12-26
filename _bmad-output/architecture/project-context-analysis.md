# Project Context Analysis

## Requirements Overview

**Functional Requirements:**
66 functional requirements spanning 10 domains, representing a comprehensive cultural events platform with integrated ticketing. Key architectural groupings:

| Domain | FR Count | Architectural Impact |
|--------|----------|---------------------|
| Event Discovery | 10 | Search/filter infrastructure, SEO, geolocation |
| User Accounts | 8 | Auth system, profile management, social login |
| Watchlist | 5 | User data persistence, offline sync |
| B2C Ticketing | 8 | Payment gateway, QR generation, inventory |
| B2B Venue Management | 9 | Multi-tenant dashboard, RBAC |
| B2B Ticket Validation | 6 | Scanner app, real-time validation |
| Platform Admin | 7 | Admin dashboard, content moderation |
| Content Management | 5 | i18n, media handling, RTL support |
| PWA/Offline | 5 | Service workers, IndexedDB, sync |
| Real-Time | 3 | WebSocket/SSE, live updates |

**Non-Functional Requirements:**
- **Performance:** <3s page load on mobile 4G, <2.5s LCP, <100ms FID
- **Security:** HTTPS/TLS 1.3, bcrypt (cost 12+), PCI-DSS via provider, cryptographic QR signing
- **Scalability:** 5K → 20K concurrent users, 10x traffic spikes, 100K events database
- **Reliability:** 99.5% uptime, 98% payment success, 95% offline sync success
- **Accessibility:** WCAG 2.1 AA compliance
- **i18n:** Trilingual (AR/FR/EN) with full RTL support

**Scale & Complexity:**

- Primary domain: Full-Stack PWA (Two-Sided Marketplace)
- Complexity level: HIGH
- Estimated architectural components: 15-20 major modules

## Technical Constraints & Dependencies

**Brownfield Constraints (from Legacy Analysis):**
- Strapi v4.25.19 → v5 migration required (breaking changes in plugin system)
- Next.js 12 Pages Router → App Router migration
- Existing PostgreSQL database with established schema
- Algolia search integration to evaluate/migrate
- ImageKit media storage to preserve
- Existing i18n locales: ar-TN, fr, en

**External Dependencies:**
- **Payment Gateway:** Konnect Network (https://konnect.network/)
  - Local methods: e-Dinar, Sobflous, D17, Flouci
  - International: Visa, Mastercard
  - Currency: TND (Tunisian Dinar)
  - Integration: REST API + webhooks
- Email: Resend (already configured)
- Media: ImageKit (already configured)
- Search: Algolia (evaluate vs native Strapi search for v5)

**Technical Constraints:**
- Mobile-first for 65% Chrome Android users on 4G
- PWA installability requirements (manifest, service worker, HTTPS)
- Offline-first architecture for regional connectivity issues
- RTL layout system throughout

## Cross-Cutting Concerns Identified

| Concern | Impact Areas | Architectural Approach Needed |
|---------|--------------|------------------------------|
| **Authentication/Authorization** | All protected routes, B2B/B2C/Admin roles | Unified auth with role-based access |
| **i18n/RTL** | All UI components, content, dates/times | Localization strategy, logical CSS |
| **Offline Sync** | Watchlist, tickets, cached listings | Service worker + IndexedDB + conflict resolution |
| **Real-Time Updates** | Ticket availability, schedule changes, sales | WebSocket/SSE infrastructure |
| **Error Handling** | All API calls, payments, offline states | Consistent error boundaries and recovery |
| **Logging/Monitoring** | All services, especially payments | Observability strategy (Sentry already present) |
| **Data Validation** | All user inputs, API payloads | Shared validation schemas |

---
