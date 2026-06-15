# Project Scoping & Phased Development

## MVP Strategy & Philosophy

**MVP Approach:** Parity-First Relaunch

- Match legacy tiween.com functionality with modern tech stack
- Focus exclusively on **cinema showtimes** to validate platform
- Defer ticketing/payment complexity to Phase 2 after user validation

**Project Context: Brownfield Migration**

- **Existing Strapi v4 backend** with established content models and data
- **Data migration required** from Strapi v4 → v5
- **Strong foundation** reduces backend development time
- **Focus shifts** to frontend rebuild (Next.js latest) and migration

**Core Value Proposition for MVP:**
"Find what's playing at cinemas across Tunisia" (B2C)

**Phase 2 Value Proposition (Post-Relaunch):**
"Find any cultural event in Tunisia, buy tickets instantly" (B2C)
"Reach new audiences and sell tickets with lower fees" (B2B)

**Resource Requirements:**

- 1-2 full-stack developers (Next.js + Strapi v5 migration expertise)
- 1 designer (mobile-first, RTL experience)
- 1 part-time data operator (manual content enrichment)

**Migration-Specific Work:**

| Task                       | Complexity | Notes                                            |
| -------------------------- | ---------- | ------------------------------------------------ |
| Strapi v4 → v5 upgrade     | Medium     | Breaking changes in plugin system, content-types |
| Database schema migration  | Medium     | Strapi handles most; custom fields need review   |
| Data migration scripts     | Low-Medium | Depends on custom field complexity               |
| Plugin compatibility audit | Medium     | Some v4 plugins may not have v5 equivalents      |
| API endpoint adjustments   | Low        | Document API changes for frontend                |
| Admin panel customizations | Medium     | Rebuild any custom admin extensions              |

**Existing Assets to Leverage:**

- Content type definitions (events, venues, categories, regions)
- Existing data (events, venues, media)
- User accounts (if applicable)
- Relationships and taxonomies

## MVP Feature Set (Phase 1: Relaunch)

**MVP Focus: Cinema Showtimes Only**

The MVP matches legacy tiween.com functionality - cinema showtimes discovery with modern tech stack.

**Core User Journeys Supported:**

| Journey                    | MVP Support | Deferred to Phase 2  |
| -------------------------- | ----------- | -------------------- |
| Yasmine (Discovery)        | Partial     | Ticketing, Watchlist |
| Karim (Regional + Offline) | Partial     | Push notifications   |
| Ahmed (Anonymous Explorer) | Full        | -                    |
| Mounir (Venue Manager)     | None        | Full B2B dashboard   |
| Rami (Scanner)             | None        | Full scanner app     |
| Nadia (Admin)              | Basic       | Advanced moderation  |
| Salma (Institutional)      | None        | Full B2B features    |

**Must-Have Capabilities (MVP):**

| Capability                              | B2C | Admin |
| --------------------------------------- | --- | ----- |
| Movie showtimes discovery               | ✅  | -     |
| Filter by date                          | ✅  | -     |
| Filter by cinema/venue                  | ✅  | -     |
| Filter by region (Greater Tunis)        | ✅  | -     |
| Film details with media (trailer, cast) | ✅  | ✅    |
| Venue info (location, contact, map)     | ✅  | ✅    |
| User registration/login                 | ✅  | ✅    |
| Manual data entry interface             | -   | ✅    |
| Content management (films, venues)      | -   | ✅    |
| PWA installable                         | ✅  | -     |
| Offline cached listings                 | ✅  | -     |
| Multilingual (AR/FR/EN)                 | ✅  | ✅    |

**Explicitly Descoped from MVP (Moved to Phase 2):**

| Feature                      | Rationale                                  |
| ---------------------------- | ------------------------------------------ |
| Watchlist                    | Nice-to-have, not core discovery           |
| Ticketing/Payment            | Complex integration, validate demand first |
| QR ticket delivery           | Depends on ticketing                       |
| Guest checkout               | Depends on ticketing                       |
| B2B venue dashboard          | Focus on B2C relaunch first                |
| Venue self-registration      | Depends on B2B dashboard                   |
| QR scanner app               | Depends on ticketing                       |
| Theater/concerts/exhibitions | Cinema-first, expand categories later      |
| Ratings/reviews              | Community features after user base         |
| Push notifications           | Add after user base established            |
| Credits system               | Requires ticketing foundation              |
| AI-generated content         | Phase 2 optimization                       |
| Advanced venue analytics     | Phase 2 B2B feature                        |

## Post-MVP Features

**Phase 2a: Core Features (Months 3-6 Post-Relaunch)**

| Feature                           | Value                      | Complexity |
| --------------------------------- | -------------------------- | ---------- |
| Watchlist functionality           | User engagement, retention | Low        |
| Ticketing + Payment integration   | Revenue generation         | High       |
| B2B venue self-service dashboard  | Scalable data input        | Medium     |
| Expand to theater/concerts        | Category growth            | Low        |
| Push notifications                | Engagement, reminders      | Low        |
| Regional expansion (Sfax, Sousse) | Market coverage            | Low        |

**Phase 2b: Growth (Months 6-12)**

| Feature                          | Value                           | Complexity |
| -------------------------------- | ------------------------------- | ---------- |
| Credits system                   | Recurring revenue, user lock-in | Medium     |
| QR scanner for ticket validation | B2B operations                  | Medium     |
| Advanced venue analytics         | B2B value, retention            | Medium     |
| AI-generated SEO content         | Organic traffic                 | Medium     |
| Multi-space venue management     | Institutional clients           | Medium     |
| Bulk event creation              | Institutional efficiency        | Low        |

**Phase 3: Expansion (Year 2+)**

| Feature                    | Value              | Complexity |
| -------------------------- | ------------------ | ---------- |
| Native iOS/Android apps    | Premium experience | High       |
| AI-powered recommendations | Personalization    | High       |
| Physical POS integration   | Venue operations   | High       |
| Maghreb expansion          | Market growth      | High       |
| Cultural data API          | Platform play      | Medium     |
| White-label ticketing      | New revenue stream | High       |

## Risk Mitigation Strategy

**Technical Risks:**

| Risk                            | Impact | Mitigation                                                      |
| ------------------------------- | ------ | --------------------------------------------------------------- |
| Strapi v4 → v5 migration issues | High   | Test migration on staging first; document all breaking changes  |
| Data migration corruption       | High   | Full backup before migration; validation scripts post-migration |
| Plugin compatibility            | Medium | Audit all plugins early; identify v5 alternatives or rebuild    |
| Real-time WebSocket complexity  | Medium | Start with polling, upgrade to WS when validated                |
| Offline PWA sync conflicts      | Medium | Read-only offline initially; queue purchases for sync           |
| Payment gateway integration     | High   | Partner with established Tunisian provider early                |
| RTL layout complexity           | Medium | Use established RTL-first UI library                            |

**Market Risks:**

| Risk                      | Impact | Mitigation                                                 |
| ------------------------- | ------ | ---------------------------------------------------------- |
| Venue adoption resistance | High   | Start with 3-5 champion venues; prove value before scaling |
| Consumer habit change     | High   | Focus on discovery value; ticketing follows naturally      |
| Competitor response       | Medium | Move fast; focus on UX and comprehensive coverage          |
| Data freshness            | Medium | Hybrid strategy: manual + venue self-service + automation  |

**Resource Risks:**

| Risk               | Impact | Mitigation                                         |
| ------------------ | ------ | -------------------------------------------------- |
| Team availability  | Medium | Core MVP achievable with 2 developers              |
| Budget constraints | Medium | PWA-only (no native); defer credits system         |
| Timeline pressure  | Medium | Prioritize B2C discovery; B2B dashboard can follow |

## MVP Launch Checklist

**Must Launch With:**

- [ ] Movie showtimes discovery (browse films showing)
- [ ] Showtime listings by film
- [ ] Showtime listings by venue/cinema
- [ ] Filter by date
- [ ] Filter by region (Greater Tunis)
- [ ] Film details (synopsis, trailer, cast, duration, rating)
- [ ] Venue details (location, contact, map)
- [ ] User accounts (email + social login)
- [ ] PWA installable
- [ ] Offline cached listings
- [ ] AR/FR/EN languages
- [ ] Strapi v4 → v5 migration complete
- [ ] Data migration validated
- [ ] All Greater Tunis cinemas with showtimes

**Can Launch Without (Add in Phase 2):**

- Watchlist functionality
- Ticketing/Payment
- B2B venue dashboard
- Push notifications
- Theater/concerts/exhibitions categories
- Scanner app

---
