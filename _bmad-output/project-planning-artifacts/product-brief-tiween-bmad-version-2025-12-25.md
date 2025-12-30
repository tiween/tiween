---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: "product-brief"
lastStep: 5
project_name: "tiween-bmad-version"
user_name: "Ayoub"
date: "2025-12-25"
---

# Product Brief: Tiween

## Executive Summary

**Tiween** is Tunisia's first comprehensive cultural agenda platform, serving as the single destination to discover and access cinema, theater, concerts, exhibitions, and cultural events across the country. The platform addresses a fundamental gap in Tunisia's cultural ecosystem: fragmented event information scattered across venue Facebook pages and siloed ticketing systems, forcing culture enthusiasts to hunt across multiple sources to answer "what's on, where, and when?"

The project involves modernizing the existing tiween.com platform (Next.js frontend refresh + Strapi v4 to v5 migration) while expanding capabilities to include a mobile-first PWA with offline support, an integrated ticketing system, and a professional venue dashboard. The two-sided marketplace model serves both **consumers** seeking unified cultural discovery and **professionals** needing modern tools to manage events, reach audiences, and sell tickets.

A key innovation is the proposed **"Culture Pass"** - a subscription model allowing users discounted access to partner venues, creating recurring revenue while incentivizing venue partnerships and driving consistent cultural engagement.

---

## Core Vision

### Problem Statement

Tunisians interested in cultural events face a frustrating, fragmented experience. To find what's showing at cinemas, theaters, or concert halls, they must:

- Check individual venue Facebook pages (where schedules are often posted as images)
- Navigate multiple ticketing platforms with poor UX
- Piece together information with no unified view by date, region, or category

There is no single, reliable source for Tunisia's complete cultural agenda.

### Problem Impact

**For Culture Enthusiasts:**

- Missed events due to discovery friction
- Time wasted hunting across platforms
- No way to track interests (watchlists) or share opinions (reviews)
- Limited visibility into events outside Greater Tunis

**For Cultural Professionals:**

- Administrative burden managing presence across multiple channels
- Limited audience reach beyond existing followers
- No unified analytics on audience behavior
- Dependence on ticketing platforms with high fees and poor tools

### Why Existing Solutions Fall Short

| Solution             | Limitation                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- |
| Venue Facebook Pages | Venue-centric only, schedules as images, no search/filter, no ticketing integration |
| Eazytick / Teskerti  | Ticketing-focused, not discovery platforms; fragmented coverage; higher fees        |
| No unified platform  | No cross-venue discovery by film, date, region, or category                         |

The market lacks a **user-centric, discovery-first platform** that aggregates all cultural offerings while providing modern tools for professionals.

### Proposed Solution

**Tiween** delivers a unified cultural platform with three interconnected pillars:

**1. Consumer Platform (B2C)**

- Comprehensive cultural agenda: cinema, theater, concerts, exhibitions, museums
- Flexible multi-entry discovery: by event, venue, date, region, category
- Community features: ratings, reviews, watchlists
- Integrated ticketing with seamless purchase flow
- Mobile-first PWA with offline access (cached listings, saved tickets, watchlist)

**2. Professional Dashboard (B2B)**

- Venue self-service: schedule management, event publishing
- Integrated ticketing solution (physical + digital, end-to-end)
- Audience analytics and performance insights
- Lower fees with better service than competitors
- Aggregated audience reach through Tiween's consumer platform

**3. Culture Pass (Subscription Model)**

- Consumer subscription for discounted access to partner venue events
- Similar to UGC Unlimited in France
- Creates recurring revenue stream
- Incentivizes venue partnerships
- Drives consistent user engagement and loyalty

**Data Strategy:** Hybrid approach combining automated aggregation (parsing venue Facebook posts/images) with venue self-service dashboard and manual verification/enrichment.

### Key Differentiators

1. **Only unified cultural agenda in Tunisia** - All disciplines, all regions, one platform
2. **Discovery-first, not venue-first** - Find by what you want to see, not where
3. **Culture Pass subscription** - Unique value prop for users and partnership incentive for venues
4. **Two-sided value creation** - Consumer audience powers B2B value; B2B tools sustain free consumer access
5. **End-to-end ticketing** - Physical + digital solution with lower fees and better analytics
6. **Community-driven** - Ratings, reviews, watchlists transform passive consumers into engaged contributors
7. **Cultural preservation mission** - Archiving Tunisian artistic works for collective memory
8. **10+ years digital expertise** - Team with proven track record in web/mobile solutions and data aggregation

---

## Target Users

### Market Context

_Based on market research (sources: DataReportal, Statista, UNESCO, Fanack):_

- **Tunisia population:** ~12.3M, median age 32.5 years
- **Digital penetration:** ~10M internet users (79.6%), highly mobile-first
- **Social media:** 7.12M users; TikTok reaches 5.32M adults (60% of 18+)
- **Cinema infrastructure:** Only ~18 theaters for 12M people (severely limited vs. 100 at independence)
- **Cinema attendance:** 2.6M admissions in 2019 (recovering post-revolution)
- **Cultural venue challenges:** Lack of spaces, limited digital tools, fragmented information, no distribution network
- **Youth profile:** 18-34 demographic is digitally native, 98% literacy rate, mobile-first behavior

**Key Insight:** Tunisia has a passionate but underserved cultural audience, constrained by infrastructure gaps and information fragmentation. The 18-34 demographic is highly connected digitally but cultural discovery remains offline/Facebook-dependent.

### Primary Users

#### Persona 1: Yasmine - "The Urban Culture Explorer"

**Demographics:** 26 years old, marketing coordinator in Tunis, lives in La Marsa

**Context:** Yasmine is part of Tunisia's young professional class. She finished her studies and now works in digital marketing. She's culturally curious - enjoys cinema, occasionally attends theater, loves discovering new music. She spends ~3 hours daily on her phone, primarily Instagram and TikTok.

**Current Behavior:**

- Checks 4-5 cinema Facebook pages weekly to see what's playing
- Screenshots schedule images to compare showtimes
- Often misses events because she discovered them too late
- Has no way to save films she wants to see or track what she's watched
- Buys tickets at the venue (cash) because online options are clunky

**Frustrations:**

- "I found out about that amazing Tunisian film screening the day after it ended"
- "Why can't I just search 'what's playing near me tonight'?"
- "I want to know what my friends thought before I commit to a 2-hour film"

**Success Vision:** A single app where she can browse everything cultural happening in Greater Tunis, see ratings/reviews, save a watchlist, and book tickets in 30 seconds.

**Culture Pass Appeal:** At ~20 TND/month, unlimited access would fit her budget and encourage more frequent cultural outings.

---

#### Persona 2: Karim - "The Regional Culture Enthusiast"

**Demographics:** 22 years old, university student in Sfax

**Context:** Karim studies engineering but is passionate about cinema and music. Living outside Tunis, he feels culturally isolated - most events and premieres happen in the capital. He relies heavily on mobile internet (4G) since fixed broadband is limited.

**Current Behavior:**

- Follows artist and venue accounts on Instagram/Facebook for updates
- Travels to Tunis occasionally for major events (festivals, special screenings)
- Frustrated that regional listings don't exist - has to ask friends
- Consumes a lot of content about films (reviews, trailers) but sees few in theaters

**Frustrations:**

- "Nothing ever happens in Sfax - or maybe it does and I just don't know"
- "I have to rely on word of mouth to know what's showing at our one cinema"
- "I want to feel connected to Tunisia's cultural scene even from here"

**Success Vision:** An app that shows him what's playing in Sfax AND lets him track national cultural events, build a watchlist, read reviews, and feel part of the Tunisian cinema community even when he can't attend.

**Offline Features Appeal:** Cached listings and saved watchlists critical given variable connectivity.

---

### Secondary Users

#### Persona 3: Mounir - "The Venue Manager"

**Demographics:** 45 years old, manages a small independent theater in Tunis

**Context:** Mounir runs a 150-seat theater that hosts plays, concerts, and occasional film screenings. He's passionate about culture but overwhelmed by administrative work. He manages everything: programming, ticketing (manual/cash), promotion (Facebook posts), and venue operations.

**Current Behavior:**

- Posts schedule images on Facebook 1-2 times per week
- Handles ticket sales manually (door sales, phone reservations)
- Has no audience analytics - doesn't know who attends or how they found out
- Competes blindly with other venues for the same audience
- Pays high commissions to ticketing platforms when he uses them

**Frustrations:**

- "I spend hours posting on Facebook but have no idea if it works"
- "Ticketing platforms take 15% and give me nothing useful in return"
- "I don't know who my audience is or how to grow it"
- "I'm a cultural curator, not a digital marketer - I need help"

**Success Vision:** A simple dashboard where he can publish schedules once (and Tiween syndicates everywhere), sell tickets with lower fees, see who's buying, and reach audiences beyond his Facebook followers.

**B2B Value Prop:** Lower fees than Eazytick/Teskerti, better analytics, access to Tiween's aggregated audience, reduced admin burden.

---

#### Persona 4: Salma - "The Cultural Institution Director"

**Demographics:** 52 years old, programming director at a major cultural center (like Cité de la Culture)

**Context:** Salma oversees programming for a prestigious venue with multiple spaces. She has a small team but still relies on outdated processes. Her institution has budget for tools but decision-making is slow.

**Current Behavior:**

- Team manually updates website and social media
- Uses a mix of internal ticketing and third-party platforms
- Produces reports manually for ministry/sponsors
- Wants digital transformation but lacks internal expertise

**Frustrations:**

- "We need professional tools but building custom systems is expensive"
- "I can't prove our cultural impact because we don't have good data"
- "We're leaving money on the table with inefficient ticketing"

**Success Vision:** An integrated platform that handles ticketing, provides audience insights for reporting, and positions the institution as modern and accessible.

**Culture Pass Partnership:** Could drive consistent attendance and provide predictable audience flow.

---

### User Journey

#### Consumer Journey (Yasmine/Karim)

| Stage          | Current State                      | With Tiween                                                             |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| **Discovery**  | Fragmented FB pages, word of mouth | Single app, personalized recommendations, search by date/location/genre |
| **Evaluation** | No reviews, can't compare options  | Ratings, reviews, trailers, friends' opinions                           |
| **Decision**   | Mental notes, forgotten            | Watchlist, notifications for saved events                               |
| **Purchase**   | Cash at door, clunky websites      | Seamless in-app ticketing                                               |
| **Experience** | Paper ticket, no record            | Digital ticket, offline access                                          |
| **Post-Event** | Nothing                            | Rate, review, share, build profile                                      |
| **Loyalty**    | None                               | Culture Pass subscription, community belonging                          |

**Consumer "Aha" Moment:** "I found 3 events happening this weekend that I would have missed, booked tickets in 30 seconds, and my friend's review convinced me which one to choose."

#### Professional Journey (Mounir/Salma)

| Stage          | Current State                | With Tiween                                     |
| -------------- | ---------------------------- | ----------------------------------------------- |
| **Onboarding** | Manual setup everywhere      | Single dashboard, import existing data          |
| **Publishing** | Post images on FB            | Structured schedule entry, auto-syndication     |
| **Ticketing**  | Manual or high-fee platforms | Integrated, lower fees, physical+digital        |
| **Promotion**  | Organic FB reach only        | Access to Tiween's audience, featured placement |
| **Analytics**  | None                         | Who bought, when, demographics, trends          |
| **Growth**     | Guesswork                    | Data-driven programming decisions               |

**Professional "Aha" Moment:** "I published my schedule once and reached 10x more people than my Facebook post. And I finally know who's actually coming to my shows."

---

## Success Metrics

### North Star Metric

**"Weekly Cultural Discoveries"** - The number of unique event discoveries (view event detail) that lead to a meaningful action (save to watchlist, share, or purchase ticket) per week.

This metric captures:

- User engagement with content
- Value delivery (finding relevant events)
- Pathway to monetization (actions that lead to purchases)
- Platform health (requires fresh, complete listings)

### User Success Metrics (B2C)

_For Yasmine (Urban Explorer) & Karim (Regional Enthusiast):_

| Metric                       | What It Measures                                     | Target         |
| ---------------------------- | ---------------------------------------------------- | -------------- |
| **Discovery Success Rate**   | % of sessions where user finds an event of interest  | >60%           |
| **Time to Discovery**        | Average time from app open to finding relevant event | <2 minutes     |
| **Booking Completion Rate**  | % of users who start booking and complete purchase   | >70%           |
| **Watchlist Engagement**     | Average events saved to watchlist per active user    | >5/month       |
| **Review Contribution Rate** | % of ticket buyers who leave a rating/review         | >15%           |
| **Return Visit Frequency**   | Average app visits per active user per month         | >4 visits      |
| **Offline Feature Usage**    | % of users accessing cached content                  | Track adoption |

**User "Success Moment":** User discovers an event they wouldn't have found otherwise, books tickets in under 60 seconds, and returns to rate it afterward.

### User Success Metrics (B2B)

_For Mounir (Venue Manager) & Salma (Institution Director):_

| Metric                            | What It Measures                               | Target           |
| --------------------------------- | ---------------------------------------------- | ---------------- |
| **Schedule Publishing Frequency** | How often venues update their listings         | Weekly updates   |
| **Audience Reach Multiplier**     | Tiween-driven views vs. organic Facebook reach | >2x              |
| **Ticketing Adoption Rate**       | % of partner venues using Tiween ticketing     | >50% of partners |
| **Dashboard Login Frequency**     | How often venue managers access analytics      | >2x/week         |
| **Time Saved**                    | Estimated admin hours saved per month          | >5 hours/month   |
| **Venue NPS**                     | Net Promoter Score from venue partners         | >40              |

**Professional "Success Moment":** Venue manager sees their event reach 3x more people than usual, sells out through Tiween, and can finally see exactly who attended.

### Business Objectives

#### Phase 1: Foundation (Months 1-6)

- Relaunch platform with upgraded tech stack (Next.js latest, Strapi v5)
- Restore active user base from existing tiween.com
- Onboard 10+ venue partners with dashboard access
- Achieve 5,000 monthly active users (MAU)
- Process first ticketing transactions through platform

#### Phase 2: Growth (Months 6-12)

- Scale to 20,000 MAU
- Expand venue network to 30+ partners across cinema, theater, concerts
- Launch Culture Pass pilot with 5+ partner venues
- Achieve 500 Culture Pass subscribers
- Generate first B2B subscription revenue from venue dashboards

#### Phase 3: Market Leadership (Year 2)

- Become recognized as Tunisia's #1 cultural agenda platform
- Scale to 50,000+ MAU
- Expand beyond Greater Tunis to Sfax, Sousse, other regions
- 2,000+ Culture Pass subscribers
- Sustainable revenue covering operational costs

### Key Performance Indicators

#### Growth KPIs

| KPI                            | Measurement                            | Phase 1 Target | Phase 2 Target |
| ------------------------------ | -------------------------------------- | -------------- | -------------- |
| **Monthly Active Users (MAU)** | Unique users with 1+ session/month     | 5,000          | 20,000         |
| **New User Acquisition**       | New registrations per month            | 1,000/month    | 3,000/month    |
| **User Retention (M1)**        | % of new users returning after 30 days | 30%            | 40%            |
| **Venue Partners**             | Active venues publishing on platform   | 10             | 30             |
| **Geographic Coverage**        | Regions with active listings           | Greater Tunis  | +2 regions     |

#### Engagement KPIs

| KPI                           | Measurement                        | Phase 1 Target | Phase 2 Target |
| ----------------------------- | ---------------------------------- | -------------- | -------------- |
| **Sessions per User**         | Average monthly sessions per MAU   | 3              | 5              |
| **Events Viewed per Session** | Content engagement depth           | 4 events       | 6 events       |
| **Watchlist Creation Rate**   | % of users with active watchlist   | 20%            | 35%            |
| **Review Submission Rate**    | % of ticket buyers leaving reviews | 10%            | 20%            |
| **Push Notification Opt-in**  | % of users accepting notifications | 40%            | 50%            |

#### Revenue KPIs

| KPI                                 | Measurement                   | Phase 1 Target | Phase 2 Target |
| ----------------------------------- | ----------------------------- | -------------- | -------------- |
| **Gross Merchandise Value (GMV)**   | Total ticket sales processed  | 50,000 TND     | 300,000 TND    |
| **Ticketing Revenue**               | Commission from ticket sales  | 5,000 TND      | 30,000 TND     |
| **B2B Subscriptions**               | Venue dashboard subscriptions | 5 venues       | 15 venues      |
| **Culture Pass Subscribers**        | Active monthly subscriptions  | Pilot          | 500            |
| **Monthly Recurring Revenue (MRR)** | Total recurring revenue       | 2,000 TND      | 15,000 TND     |

#### Platform Health KPIs

| KPI                       | Measurement                              | Target     |
| ------------------------- | ---------------------------------------- | ---------- |
| **Data Freshness**        | % of listings updated within 48 hours    | >90%       |
| **App Performance**       | Page load time (mobile)                  | <3 seconds |
| **Uptime**                | Platform availability                    | >99.5%     |
| **Offline Sync Success**  | Successful offline/online syncs          | >95%       |
| **Support Response Time** | Average time to respond to venue queries | <24 hours  |

---

## MVP Scope

### MVP Philosophy

Given that Tiween already exists with a working frontend and backend, this MVP is about **platform modernization + strategic feature additions** rather than building from scratch. The goal is to get back on track with a solid foundation that unlocks B2B revenue.

### Core Features

#### 1. Platform Foundation (Technical Upgrades)

- **Frontend Migration:** Refresh to latest Next.js with new branding/logo
- **Backend Upgrade:** Strapi v4 → Strapi v5 migration
- **PWA Implementation:** Mobile-first responsive design with installable app
- **Offline Support:** Cached event listings, saved watchlist, stored tickets

#### 2. Consumer Experience (B2C Core)

- **Event Discovery:**
  - Browse events by category (cinema, theater, concerts, exhibitions)
  - Filter by date, location/region, genre
  - Search functionality
  - Event detail pages with full information (times, venue, description, trailer/media)
- **User Accounts:**
  - Registration/login (email + social auth)
  - Personal watchlist (save events to see later)
  - View history (events attended)
- **Basic Community:**
  - Rate events (1-5 stars)
  - Simple reviews (text)

#### 3. Professional Dashboard (B2B Core)

- **Venue Onboarding:**
  - Self-registration for venues
  - Venue profile management (info, photos, location)
- **Schedule Management:**
  - Add/edit/delete events
  - Bulk schedule import (CSV/simple format)
  - Preview how events appear to users
- **Basic Analytics:**
  - Event views count
  - Audience demographics (age, location)
  - Comparison to previous periods

#### 4. Ticketing Foundation

- **Basic Online Ticketing:**
  - Ticket purchase flow (select showtime → select seats if applicable → payment)
  - Payment gateway integration (local Tunisian options)
  - Digital ticket delivery (QR code)
  - Email confirmation
- **Venue Ticketing Tools:**
  - Ticket inventory management
  - Sales reporting
  - Check-in/validation system (scan QR)

#### 5. Data Pipeline (Automation Foundation)

- **Manual Data Entry:** Admin interface for Tiween team to input events
- **Venue Self-Service:** Dashboard for partners to manage their own data
- **Basic Automation:** Scheduled fetching from partner APIs (where available)

### Out of Scope for MVP

| Feature                          | Rationale                                                              | Target Phase |
| -------------------------------- | ---------------------------------------------------------------------- | ------------ |
| **Culture Pass Subscription**    | Requires venue partnerships established first; complex revenue sharing | Phase 2      |
| **Advanced Social Features**     | Follow friends, social feed, activity sharing                          | Phase 2      |
| **AI-Powered Recommendations**   | Need usage data first to train personalization                         | Phase 2      |
| **Push Notifications**           | Can add after user base established                                    | Phase 2      |
| **Multi-Region Expansion**       | Focus on Greater Tunis first                                           | Phase 2-3    |
| **Facebook Image Parsing (OCR)** | Complex automation; start with manual + venue self-service             | Phase 2      |
| **Physical Ticketing Hardware**  | Start with digital-only; add hardware integration later                | Phase 2      |
| **Advanced B2B Analytics**       | Predictive analytics, audience insights, export tools                  | Phase 2      |
| **API for Third Parties**        | Public API for integration                                             | Phase 3      |
| **White-Label Solution**         | Venue-branded booking widgets                                          | Phase 3      |
| **Mobile Native Apps**           | PWA first; native iOS/Android later if needed                          | Phase 3      |

### MVP Success Criteria

#### Launch Readiness Checklist

- Platform loads <3 seconds on mobile 4G
- PWA installable and works offline for core features
- 3+ venue partners onboarded with active listings
- End-to-end ticketing flow tested and functional
- Payment processing live with local gateway

#### 30-Day Post-Launch Success

- 1,000+ MAU achieved
- 50+ tickets sold through platform
- 3+ venues actively updating their own schedules
- User retention (D7) > 20%
- No critical bugs blocking core user journeys

#### MVP Validation Gates (Go/No-Go for Phase 2)

| Signal              | Threshold               | Decision                  |
| ------------------- | ----------------------- | ------------------------- |
| MAU Growth          | Trending toward 5K      | Continue investment       |
| Venue Adoption      | 5+ venues self-managing | Scale B2B outreach        |
| Ticketing Revenue   | Any transactions        | Refine and expand         |
| User Feedback       | NPS > 20                | Product-market fit signal |
| Technical Stability | <1% error rate          | Foundation solid          |

### Future Vision

#### Phase 2: Growth (Months 6-12)

- **Culture Pass Launch:** Subscription model with partner venues
- **Push Notifications:** Event reminders, new releases, personalized alerts
- **Social Features:** Follow friends, see their activity, share events
- **Regional Expansion:** Sfax, Sousse coverage
- **Data Automation:** Facebook schedule parsing, API integrations with venues
- **Advanced Analytics:** Deeper insights for venues, predictive tools

#### Phase 3: Market Leadership (Year 2)

- **Native Mobile Apps:** iOS and Android for premium experience
- **AI Recommendations:** Personalized "For You" feed based on behavior
- **B2B Premium Tiers:** Advanced venue tools, priority support, custom analytics
- **Physical Ticketing Integration:** POS systems, ticket printers for venues
- **Regional Domination:** All major Tunisian cities covered

#### Long-Term Vision (2-3 Years)

- **Tunisia's Cultural Infrastructure:** The default platform for cultural discovery and ticketing
- **Maghreb Expansion:** Adapt model for Algeria, Morocco
- **Cultural Data Platform:** Authoritative database of Tunisian cultural works
- **Industry Partnerships:** Official partner of film distributors, festivals, cultural institutions
