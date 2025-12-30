# Project Scoping & Phased Development

## MVP Strategy & Philosophy

**MVP Approach:** Revenue MVP + Platform MVP Hybrid

- Generate early revenue through ticketing to validate business model
- Build platform foundation for venue self-service to scale operations

**Project Context: Brownfield Migration**

- **Existing Strapi v4 backend** with established content models and data
- **Data migration required** from Strapi v4 → v5
- **Strong foundation** reduces backend development time
- **Focus shifts** to frontend rebuild (Next.js latest), new features, and migration

**Core Value Proposition for MVP:**
"Find any cultural event in Tunisia, buy tickets instantly" (B2C)
"Reach new audiences and sell tickets with lower fees" (B2B)

**Resource Requirements:**

- 2-3 full-stack developers (Next.js + Strapi v5 migration expertise)
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

## MVP Feature Set (Phase 1: Months 1-6)

**Core User Journeys Supported:**

| Journey                         | MVP Support | Deferred to Post-MVP  |
| ------------------------------- | ----------- | --------------------- |
| Yasmine (Discovery + Ticketing) | Full        | -                     |
| Karim (Regional + Offline)      | Full        | Push notifications    |
| Mounir (Venue Manager)          | Full        | Advanced analytics    |
| Ahmed (Anonymous Explorer)      | Full        | -                     |
| Rami (Scanner)                  | Full        | Offline sync          |
| Nadia (Admin)                   | Basic       | Advanced moderation   |
| Salma (Institutional)           | Partial     | Multi-space, bulk ops |

**Must-Have Capabilities (MVP):**

| Capability                               | B2C | B2B | Admin |
| ---------------------------------------- | --- | --- | ----- |
| Event discovery (browse, filter, search) | ✅  | -   | -     |
| Event details with media                 | ✅  | ✅  | ✅    |
| User registration/login                  | ✅  | ✅  | ✅    |
| Watchlist                                | ✅  | -   | -     |
| Guest checkout                           | ✅  | -   | -     |
| Ticket purchase + QR delivery            | ✅  | -   | -     |
| Venue registration + profile             | -   | ✅  | ✅    |
| Schedule management (CRUD)               | -   | ✅  | ✅    |
| Basic analytics (views)                  | -   | ✅  | -     |
| Ticketing setup + inventory              | -   | ✅  | -     |
| QR scanner app                           | -   | ✅  | -     |
| Venue approval workflow                  | -   | -   | ✅    |
| Manual data entry interface              | -   | -   | ✅    |
| PWA installable                          | ✅  | ✅  | -     |
| Offline cached listings                  | ✅  | -   | -     |
| Offline ticket display                   | ✅  | -   | -     |
| Multilingual (AR/FR/EN)                  | ✅  | ✅  | ✅    |

**Explicitly Excluded from MVP:**

- Credits system (Phase 2)
- Push notifications (Phase 2)
- AI-generated content (Phase 2)
- Advanced venue analytics (Phase 2)
- Multi-space management for institutions (Phase 2)
- Native mobile apps (Phase 3)
- AI recommendations (Phase 3)
- Physical POS integration (Phase 3)

## Post-MVP Features

**Phase 2: Growth (Months 6-12)**

| Feature                           | Value                           | Complexity |
| --------------------------------- | ------------------------------- | ---------- |
| Credits system                    | Recurring revenue, user lock-in | Medium     |
| Push notifications                | Engagement, reminders           | Low        |
| Regional expansion (Sfax, Sousse) | Market coverage                 | Low        |
| Advanced venue analytics          | B2B value, retention            | Medium     |
| AI-generated SEO content          | Organic traffic                 | Medium     |
| Multi-space venue management      | Institutional clients           | Medium     |
| Bulk event creation               | Institutional efficiency        | Low        |

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

- [ ] Event discovery with filtering (category, date, region)
- [ ] Event details with venue info
- [ ] User accounts (email + social)
- [ ] Watchlist functionality
- [ ] Guest checkout
- [ ] Payment integration (1 provider)
- [ ] QR ticket delivery
- [ ] Venue self-registration
- [ ] Venue event management
- [ ] Basic analytics dashboard
- [ ] Admin approval workflow
- [ ] PWA installable
- [ ] Offline listings cache
- [ ] AR/FR/EN languages
- [ ] 10+ venues with content
- [ ] Strapi v4 → v5 migration complete
- [ ] Data migration validated

**Can Launch Without (Add Week 1-4):**

- Scanner app (manual check-in initially)
- Push notifications
- Advanced moderation tools
- Data export features

---
