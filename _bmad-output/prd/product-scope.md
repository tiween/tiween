# Product Scope

> **Revised 2026-08-06 (sprint-change-proposal-2026-08-06):** v1 is a
> multi-category **content & event aggregation platform** — cinema, theater,
> concerts, exhibitions. All ticketing/purchase functionality is post-v1; the
> partial ticketing build delivered 2026-07 (payments, QR, email) is held
> dormant behind a feature flag until then.

## MVP Strategy

**Aggregation-First Relaunch** - Match legacy tiween.com functionality with modern tech stack, then iterate. V1 aggregates **content and events across all categories**; ticketing follows post-v1 once aggregation demand is validated.

**Core Value (V1):**
"Find what's happening — films, theater, concerts, exhibitions — across Tunisia"

## MVP - Minimum Viable Product

**Platform Foundation:**

- Next.js latest migration with new branding/logo
- Strapi v4 → v5 backend upgrade
- PWA with offline support (cached listings)
- Multilingual (AR/FR/EN) with RTL support

**Consumer Features (B2C) - Multi-Category Aggregation:**

- Category browsing: cinema, theater, concerts, exhibitions (widened 2026-08-06)
- Movie showtimes: browse films currently showing
- Filter by date: select date to see showtimes
- Filter by cinema/venue: see what's playing where
- Filter by region: Greater Tunis focus
- Film details: synopsis, trailer, duration, cast, rating
- Venue info: location, contact, map
- User accounts: registration, login (email + social) - basic profile
- Offline support: cached listings

**Admin Features:**

- Manual data entry interface for showtimes
- Content management: films, venues, schedules

**Explicitly Descoped from MVP:**

| Feature              | Moved To | Rationale                                                                      |
| -------------------- | -------- | ------------------------------------------------------------------------------ |
| Watchlist            | Post-V1  | Nice-to-have, not core discovery (delivered early, 2026-07)                    |
| Ticketing/Payment    | Post-V1  | Aggregation-first; partial build (Konnect/QR/email) delivered 2026-07, dormant |
| QR ticket delivery   | Post-V1  | Depends on ticketing (delivered 2026-07, dormant)                              |
| B2B ticketing config | Post-V1  | Depends on ticketing; B2B venue/event management itself is in v1               |
| QR scanner           | Post-V1  | Depends on ticketing                                                           |
| Ratings/reviews      | Post-V1  | Community features after user base                                             |

_Removed from this table 2026-08-06: "Theater/concerts/exhibitions" — now in
v1 scope (multi-category aggregation). "B2B venue dashboard" — venue
registration/profile/event management is in v1 as the content-supply channel;
only its ticketing features are post-v1._

## Growth Features (Phase 2)

**Post-Relaunch (Months 3-6):**

- Watchlist functionality
- Ticketing + Payment integration
- B2B venue self-service dashboard
- Expand to theater/concerts/exhibitions
- Push notifications (event reminders)
- Regional expansion (Sfax, Sousse)

**Phase 2b (Months 6-12):**

- Credits system (prepaid balance with discount)
- Advanced venue analytics
- AI-generated content for SEO
- QR scanner for ticket validation

## Vision (Future)

**Phase 3+ (Year 2+):**

- Native mobile apps (iOS/Android)
- AI-powered recommendations
- Physical ticketing integration (POS, printers)
- Maghreb expansion
- Cultural data platform / API

---
