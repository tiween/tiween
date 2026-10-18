# Requirements (PRD-type sources)

Scope of this file: the Tiween platform only (cultural agenda PWA + Strapi backend). Sources: `_bmad-output/prd/*.md` shards, with the epic-level inventory (SPEC-typed) used for FR numbering and phase, plus B2C behavior requirements extracted from the 2026-06-16 B2C EXPERIENCE.md spine (REQ-b2c-\*, new in re-run #2; the visual-identity tokens are in constraints.md section 7), plus requirements derived from the owner's ratified resolutions (`.planning/ingest-resolutions.md`, ADR-R1..R8 in decisions.md). Re-run #2, full rewrite. The Social Content Studio is a separate project and is excluded from this roadmap by owner decision (ADR-R3): no Studio requirements are extracted.

Scope status note: v1 = multi-category aggregation, ticketing post-v1 (SCP 2026-08-06, see decisions.md ADR-P3). The v1 membership of Epic 9 and Epic 10 is fixed by ADR-R6 (IN: 9.1-9.6, 10.6; OUT: 10.4). Phase tags below follow ADR-R6 and ADR-R8 (ticketing-derived metrics trimmed), then `epics/epic-list.md` and `sprint-status.yaml`, not the older `[MVP]/[Phase 2]` tags in `prd/functional-requirements.md`.

Acceptance for FR entries is not stated in the PRD shards. The `acceptance:` line points at the story ACs in the epic that covers the FR (per the requirements-inventory FR Coverage Map).

---

# PART A: Tiween platform

## REQ-product-scope-v1

- source: \_bmad-output/prd/product-scope.md
- description: V1 is a multi-category content and event aggregation relaunch ("Aggregation-First Relaunch"): match legacy tiween.com on a modern stack, then iterate. Core value: "Find what's happening - films, theater, concerts, exhibitions - across Tunisia." Platform foundation: Next.js migration with new branding/logo, Strapi v4 to v5, PWA with offline cached listings, AR/FR/EN with RTL. Consumer: category browsing (cinema, theater, concerts, exhibitions), movie showtimes, filter by date / cinema-venue / region (Greater Tunis focus), film details (synopsis, trailer, duration, cast, rating), venue info (location, contact, map), accounts (email + social, basic profile), offline cached listings. Admin: manual data entry for showtimes, content management for films, venues, schedules. Explicitly descoped to post-v1: watchlist (delivered early 2026-07), ticketing/payment (partial build delivered 2026-07, dormant), QR ticket delivery (delivered, dormant), B2B ticketing config, QR scanner, ratings/reviews. Venue registration/profile/event management are IN v1 as the content-supply channel; only B2B ticketing features are post-v1. Phase 2 growth list: watchlist, ticketing+payment, B2B self-service dashboard, push notifications, Sfax/Sousse expansion, credits system, advanced venue analytics, AI SEO content, QR scanner. Vision: native apps, AI recommendations, physical POS, Maghreb expansion, cultural data API.
- acceptance: absent (scope statement). Launch checklist in project-scoping shard (see REQ-scoping-phased).
- scope: v1 product scope (revised 2026-08-06; Epic 9 and Epic 10 v1 membership fixed by ADR-R6)

## REQ-executive-summary

- source: \_bmad-output/prd/executive-summary.md
- description: Tiween is Tunisia's cultural agenda platform, a two-sided marketplace (consumers 18-34 and venue professionals) solving fragmented discovery (venue Facebook images, multiple ticketing platforms). Modernizes tiween.com (Next.js + Strapi v4) into a mobile-first PWA with offline support, integrated ticketing, professional venue dashboard. Differentiators listed: only unified agenda; discovery-first; Culture Pass subscription; two-sided value; end-to-end ticketing; cultural preservation mission.
- acceptance: absent
- scope: product vision (Culture Pass, ticketing are post-v1)

## REQ-project-classification

- source: \_bmad-output/prd/project-classification.md
- description: web_app (PWA, mobile-first); domain general (entertainment/cultural events); complexity medium (two-sided marketplace with ticketing); brownfield modernization of tiween.com. Technical considerations: PWA browser matrix, offline-first listings/watchlists/tickets, local payment gateways, real-time schedule updates, hybrid data strategy (automated aggregation + venue self-service + manual enrichment).
- acceptance: absent
- scope: classification

## REQ-scoping-phased

- source: \_bmad-output/prd/project-scoping-phased-development.md
- description: Phased plan. Parity-first relaunch; resource assumption 1-2 full-stack devs, 1 designer, 1 part-time data operator. Migration work items: Strapi v4 to v5 upgrade, schema migration, data migration scripts, plugin compatibility audit, API endpoint adjustments, admin customizations rebuild. Phase 2a (months 3-6): watchlist, ticketing+payment, B2B dashboard, theater/concerts, push notifications, regional expansion. Phase 2b (6-12): credits, QR scanner, advanced analytics, AI SEO, multi-space venue management, bulk event creation. Phase 3 (year 2+): native apps, AI recs, POS, Maghreb, cultural API, white-label ticketing. Risk table (v4-v5 migration, data corruption, plugin compat, WebSocket complexity "start with polling", offline sync conflicts, payment gateway, RTL; venue adoption "3-5 champion venues"). MVP launch checklist: showtimes by film and by venue, filter by date and Greater Tunis region, film and venue details, accounts, PWA installable, offline cache, AR/FR/EN, v4 to v5 migration complete and validated, all Greater Tunis cinemas with showtimes.
- acceptance: MVP launch checklist items above.
- scope: STALE in part. "Focus exclusively on cinema showtimes", "Theater/concerts/exhibitions" as descoped, and "B2B venue dashboard" as descoped are superseded by the 2026-08-06 scope (see conflicts report INFO). Migration work, risks, and Phase 2b/3 lists remain current.

## REQ-success-criteria-mvp

- source: \_bmad-output/prd/success-criteria.md
- description: MVP outcomes: discovery success rate >60% (sessions viewing film/showtime detail); time to discovery <2 min; return visits >3/month; MVP 30-day targets MAU 1,000+, D7 retention >20%, sessions/user 3+/month, 0 critical bugs. Go/No-Go for Phase 2: MAU trending to 5K, positive feedback, showtimes updated daily, error rate <1%. North star (MVP): weekly showtime lookups; (Phase 2+): weekly cultural discoveries. Technical success: page load <3s mobile 4G, uptime >99.5%, offline sync >95%, data freshness >90% within 48h, payment success >98% (Phase 2).
- acceptance: the numeric targets above.
- scope: success metrics; framed as "Cinema Showtimes" (stale framing, metrics still usable)

## REQ-success-criteria-phase2-business

- source: \_bmad-output/prd/success-criteria.md
- description: Phase 2 B2C: booking completion >70%, watchlist engagement >5/month, return visits >4/month, credits adoption >30%. B2B: weekly schedule publishing, reach multiplier >2x vs Facebook, ticketing adoption >50% of partners, dashboard engagement >2x/week, venue NPS >40. Revenue model: ticketing commission 8-10% standard / 5-7% for dashboard subscribers; credits system with 10-20% discount; B2B subscriptions (pricing TBD). Phase targets: Month 1 1,000 MAU no revenue; months 3-6 5,000 MAU first transactions; months 6-12 20,000 MAU 15,000 TND MRR; year 2 50,000+ MAU.
- acceptance: numeric targets above.
- scope: post-v1 business model. OPEN QUESTION (ADR-R5): the fee model is deferred and must be decided before any post-v1 ticketing phase. Competing figures: this PRD (8-10% standard commission, 5-7% for subscribers; user-journeys.md mentions 7%) versus competitive-summary-one-pager (0% organizer fees plus 3-5% buyer fees, max 5%) and the product brief (commission plus Culture Pass about 20 TND/month). Not blocking v1.

## REQ-web-rendering-seo

- source: \_bmad-output/prd/web-app-specific-requirements.md
- description: Multi-page app on Next.js App Router with RSC; SSR for SEO-critical pages, SSG for stable content, client hydration for interactivity, PWA shell. SEO priority: event details Critical (SSR, schema Event), venue profiles High (SSR, LocalBusiness/Event), category pages High (SSG+ISR, ItemList), search results Medium (SSR), homepage Medium (SSR, WebSite/ItemList), dashboard Low (CSR). AI-enhanced SEO (generated descriptions, automated meta, structured data). Long-tail programmatic pages (e.g. /cinema-tunis, /theatre-sousse, /concerts-this-weekend).
- acceptance: absent
- scope: web architecture / SEO

## REQ-web-browser-responsive-perf-a11y

- source: \_bmad-output/prd/web-app-specific-requirements.md
- description: Browser matrix: Chrome Android latest 2 (primary, ~65%), Chrome Desktop (primary), Safari iOS / Firefox (secondary), Samsung Internet (tertiary). Mobile-first mandate; breakpoints 320-480 / 481-768 primary, 769-1024 / 1025+ secondary; 44x44 px tap targets. Perf: LCP <2.5s, FID <100ms, CLS <0.1, TTI <3.5s, offline load <1s. A11y: WCAG 2.1 AA, keyboard nav, ARIA, contrast 4.5:1, focus indicators, alt text, form error association; axe-core automated + NVDA/VoiceOver manual testing. i18n: ar (RTL, primary), fr (LTR, primary), en (secondary), prefixes /ar/ /fr/ /en/, browser-language detection, profile-stored preference.
- acceptance: numeric targets above.
- scope: web non-functional

## REQ-web-pwa-offline-realtime

- source: \_bmad-output/prd/web-app-specific-requirements.md
- description: PWA manifest fields (display standalone, orientation portrait-primary, start_url /, scope /), maskable icons, custom install banner after 2nd visit, post-purchase install prompt, pull-to-refresh, bottom nav. Offline: browse cached events full, watchlist full, purchased tickets QR accessible, search limited to cached, purchases queued for sync. Service worker: cache-first static, network-first API with fallback, background sync, push support. Real-time: WebSocket for ticket availability, schedule changes (WebSocket + push), seat selection; polling for price (1 min) and new events (5 min).
- acceptance: absent
- scope: PWA/offline/real-time (ticket and real-time parts post-v1). Manifest note: PRD says background_color white; Epic 1 story 1.7 and the shipped `public/manifest.json` set the retired teal #032523. Per ADR-R1 story 1.7 needs rework to the Gold Leaf x Aubergine palette (see REQ-brand-palette-rework). The 06-16 spines do not state manifest theme_color or background_color explicitly (open item, context.md); the splash uses Lalezar plus the taa monogram (REQ-b2c-responsive-pwa).

## Functional requirements (canonical numbering = epics/requirements-inventory.md)

Numbering note: `prd/functional-requirements.md` uses a different FR order for FR1-FR8, FR48, FR50, FR57, FR60 (variants listed at the end of Part A). IDs below follow the inventory because the epic coverage map and all stories use it. v1 status reflects sprint-status as of 2026-08-11 plus file-system state.

## REQ-FR1

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Visitors can browse all cultural events without creating an account.
- acceptance: Epic 3 stories 3.1, 3.11 (see story ACs)
- scope: Epic 3, v1, done

## REQ-FR2

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can filter events by category (cinema, theater, concerts, exhibitions, etc.).
- acceptance: Epic 3 story 3.2 (tabs Cinema/Theatre/Courts-metrages/Musique/Expositions, URL reflects filter, "Tout" shows all)
- scope: Epic 3, v1 (un-deferred 2026-08-06), done

## REQ-FR3

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can filter events by date range (today, this week, this weekend, custom).
- acceptance: Epic 3 story 3.3
- scope: Epic 3, v1, done (open defect: date-range filter off by one day at positive UTC offsets, deferred-work)

## REQ-FR4

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can filter events by region/city (Greater Tunis, Sfax, Sousse, etc.).
- acceptance: Epic 3 story 3.4
- scope: Epic 3, v1 (Greater Tunis focus; regional expansion post-v1), done

## REQ-FR5

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can filter events by venue.
- acceptance: Epic 3 story 3.5
- scope: Epic 3, v1, done

## REQ-FR6

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can search events by keyword (title, artist, venue name).
- acceptance: Epic 3 story 3.6 (Algolia, 300ms debounce, results include events/works/venues/people)
- scope: Epic 3, v1, done

## REQ-FR7

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can view event details including times, venue, description, and media.
- acceptance: Epic 3 story 3.7
- scope: Epic 3, v1, done

## REQ-FR8

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can see event location on a map.
- acceptance: Epic 3 story 3.8
- scope: Epic 3, v1, done

## REQ-FR9

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can filter events by "near me" using geolocation.
- acceptance: Epic 3 story 3.9
- scope: Epic 3, post-v1, deferred

## REQ-FR10

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can share event details via standard share mechanisms.
- acceptance: Epic 3 story 3.10 (Web Share API, copy fallback, Open Graph)
- scope: Epic 3, v1, done

## REQ-FR11

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can register with email and password.
- acceptance: Epic 4 story 4.1
- scope: Epic 4, v1, done

## REQ-FR12

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can register/login with social providers (Google, Facebook).
- acceptance: Epic 4 story 4.2 (OAuth flow under 10s)
- scope: Epic 4, v1, done

## REQ-FR13

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can reset their password via email.
- acceptance: Epic 4 story 4.3
- scope: Epic 4, v1, done

## REQ-FR14

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can update their profile information.
- acceptance: Epic 4 story 4.4
- scope: Epic 4, v1, done

## REQ-FR15

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can set their preferred language (Arabic, French, English).
- acceptance: Epic 4 story 4.5
- scope: Epic 4, v1, done

## REQ-FR16

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can set their default region for event discovery.
- acceptance: Epic 4 story 4.5
- scope: Epic 4, v1, done

## REQ-FR17

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can view their purchase history.
- acceptance: Epic 6 story 6.9
- scope: post-v1, deferred

## REQ-FR18

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Guest users can complete purchases without creating an account.
- acceptance: Epic 4 story 4.6 (email only, tickets by email, offer account after purchase, link history on later signup)
- scope: Epic 4, story done but purchase surfaces dormant behind flag (post-v1 usage)

## REQ-FR19

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Authenticated users can add events to their watchlist.
- acceptance: Epic 5 story 5.1, hardened by 5.7 (unique (user, creativeWork) constraint, atomic upsert)
- scope: Epic 5, delivered early (done) although tagged Phase 2/post-v1 in PRD

## REQ-FR20

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Authenticated users can remove events from their watchlist.
- acceptance: Epic 5 story 5.2
- scope: Epic 5, done

## REQ-FR21

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can view their watchlist.
- acceptance: Epic 5 story 5.3, 5.8 (user-scoped query key, cache cleared on logout)
- scope: Epic 5, done

## REQ-FR22

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can access their watchlist offline.
- acceptance: Epic 5 story 5.4
- scope: Epic 5, done. Epic 10 story 10.4 duplicates it and is OUT of v1 (ADR-R6); no further work.

## REQ-FR23

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Watchlist syncs across devices when online.
- acceptance: Epic 5 story 5.5 (within 5s, last-write-wins)
- scope: Epic 5, done

## REQ-FR24

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can view available ticket types and prices for an event.
- acceptance: Epic 6 story 6.1
- scope: Epic 6, story done, surface gated off (dormant)

## REQ-FR25

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can select quantity and ticket type for purchase.
- acceptance: Epic 6 story 6.2
- scope: Epic 6, done, dormant

## REQ-FR26

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can complete payment via integrated payment gateway.
- acceptance: Epic 6 story 6.3 (Konnect via payments plugin; completes within 5s; failed payment shows retry and is not charged)
- scope: Epic 6, done, dormant

## REQ-FR27

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users receive QR code tickets via email after purchase.
- acceptance: Epic 6 stories 6.4 (HMAC-SHA256 QR) and 6.5 (email within 2 minutes)
- scope: Epic 6, done, dormant

## REQ-FR28

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can view purchased tickets in the app.
- acceptance: Epic 6 story 6.6
- scope: post-v1, deferred

## REQ-FR29

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can access purchased ticket QR codes offline.
- acceptance: Epic 6 story 6.7
- scope: post-v1, deferred

## REQ-FR30

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users receive booking confirmation with event details.
- acceptance: Epic 6 story 6.8
- scope: post-v1, deferred

## REQ-FR31

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Guest checkout users receive tickets via email without app access.
- acceptance: Epic 6 story 6.5 with Epic 4 story 4.6
- scope: dormant

## REQ-FR32

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can register their venue on the platform.
- acceptance: Epic 7 story 7.1 (pending venue + manager account, confirmation email, admin notified)
- scope: Epic 7, v1, awaiting-operator (credentials: emails, media upload token, reCAPTCHA). Surface and account-provisioning must be reconciled to the Strapi admin per ADR-R7 (see REQ-venue-manager-strapi-surface).

## REQ-FR33

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can manage their venue profile (photos, description, location, contact).
- acceptance: Epic 7 story 7.2 (epic text: logged into Strapi admin as venue manager, builds on Epic 2D admin)
- scope: Epic 7, v1, awaiting-operator. The delivered build lives on the Next.js client (`/venue` area) and is to be reworked or retired in favor of the Strapi admin (ADR-R7).

## REQ-FR34

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can create new events with details (title, description, dates, times, media).
- acceptance: Epic 7 story 7.3
- scope: Epic 7, v1, done (created through the Strapi admin Events section, consistent with ADR-R7)

## REQ-FR35

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can edit existing events.
- acceptance: Epic 7 story 7.4
- scope: Epic 7, v1, backlog; Strapi admin surface (ADR-R7)

## REQ-FR36

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can delete/cancel events.
- acceptance: Epic 7 story 7.4 (cancelling marks showtimes cancelled, notifies watchlisting users, edit history logged; the epic text also says it triggers a refund process, which ADR-R8 trims from v1)
- scope: Epic 7, v1, backlog; Strapi admin surface (ADR-R7). Refund step TRIMMED from v1 by ADR-R8 (restore when ticketing is un-deferred); the AC's other items (cancel marks showtimes cancelled, watchlist users notified, edit history logged) stay.

## REQ-FR37

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can set up ticketing for events (price tiers, quantities, sale dates).
- acceptance: Epic 7 story 7.5
- scope: post-v1, deferred

## REQ-FR38

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can view ticket sales reports.
- acceptance: Epic 7 story 7.7
- scope: post-v1, deferred

## REQ-FR39

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can view event analytics (views, demographics).
- acceptance: Epic 7 story 7.8 (aggregated, privacy-compliant per NFR-D5; the views-to-purchases conversion rate in the AC is TRIMMED from v1 by ADR-R8 and returns when ticketing is un-deferred)
- scope: Epic 7, v1, backlog; Strapi admin surface (ADR-R7)

## REQ-FR40

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers can configure multiple ticket types per event (standard, reduced, VIP).
- acceptance: Epic 7 story 7.6
- scope: post-v1, deferred

## REQ-FR41

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue staff can scan QR codes to validate tickets.
- acceptance: Epic 8 story 8.1
- scope: post-v1, deferred

## REQ-FR42

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Scanner displays validation result (valid/invalid/already used).
- acceptance: Epic 8 story 8.2
- scope: post-v1, deferred

## REQ-FR43

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Scanner shows ticket details on successful validation.
- acceptance: Epic 8 story 8.3
- scope: post-v1, deferred

## REQ-FR44

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Scanner prevents duplicate ticket usage.
- acceptance: Epic 8 story 8.4
- scope: post-v1, deferred

## REQ-FR45

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue staff can view real-time attendance counts per event.
- acceptance: Epic 8 story 8.5
- scope: post-v1, deferred

## REQ-FR46

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Scanner can operate with intermittent connectivity.
- acceptance: Epic 8 story 8.6
- scope: post-v1, deferred

## REQ-FR47

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can approve or reject venue registration requests.
- acceptance: Epic 9 story 9.1 (approval triggers welcome email and account activation; rejection sends reason)
- scope: Epic 9, IN v1 (ADR-R6 overrides the epic file's Phase 2 tag), sprint-status `backlog`. Approval flow must be reconciled to the Strapi admin venue-manager surface (ADR-R7); Epic 7.2 is blocked in practice until a human can approve venue-manager accounts.

## REQ-FR48

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can create and manage event listings manually.
- acceptance: Epic 9 story 9.2 (films with full details, showtimes linked to films and venues, featured flag, changes immediate)
- scope: Epic 9, v1, backlog; depends on the events-manager calendar verify + harden phase (ADR-R4, REQ-admin-calendar-verify-harden), which must land first (verify + harden per ADR-R4; the integration layer already targets screening/performance since commit 9a75837, so the older "surface requests a deleted content type" premise is stale)

## REQ-FR49

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can edit any event listing for quality control.
- acceptance: Epic 9 story 9.2
- scope: Epic 9, v1, backlog

## REQ-FR50

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can flag events for quality issues.
- acceptance: Epic 9 story 9.3
- scope: Epic 9, IN v1 (ADR-R6), sprint-status `backlog`

## REQ-FR51

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can view platform-wide analytics.
- acceptance: Epic 9 story 9.4
- scope: Epic 9, IN v1 (ADR-R6), sprint-status `backlog`. Ships WITHOUT total revenue, transactions and average order value (ADR-R8 trim; the epic AC text lists them, restore when ticketing is un-deferred).

## REQ-FR52

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can manage user accounts (view, suspend).
- acceptance: Epic 9 story 9.5 (also delete for GDPR, actions logged)
- scope: Epic 9, IN v1 (ADR-R6), sprint-status `backlog`

## REQ-FR53

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Admins can manage content categories and regions.
- acceptance: Epic 9 story 9.6
- scope: Epic 9, v1, backlog

## REQ-FR54

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: System supports multilingual content (Arabic, French, English).
- acceptance: Epic 1 story 1.6 (next-intl, /ar /fr /en)
- scope: Epic 1, v1, review

## REQ-FR55

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: System supports RTL layout for Arabic language.
- acceptance: Epic 1 story 1.6 (dir rtl, Tailwind rtl: variant)
- scope: Epic 1, v1, review

## REQ-FR56

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: System displays events in user's preferred language when available.
- acceptance: Epic 3 (coverage map)
- scope: Epic 3, v1

## REQ-FR57

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Events can have multiple images and media attachments.
- acceptance: Epic 2B (stories 2B.2, 2B.11 ImageKit)
- scope: Epic 2B, v1

## REQ-FR58

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue profiles can have multiple images.
- acceptance: Epic 2B / Epic 2D (venue `images` media field)
- scope: Epic 2B/2D, v1

## REQ-FR59

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can install the application on their device.
- acceptance: Epic 10 story 10.1
- scope: Epic 10, v1, backlog (Serwist foundation is story 1.7, review)

## REQ-FR60

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can browse cached events when offline.
- acceptance: Epic 10 stories 10.2, 10.3, 10.8
- scope: Epic 10, v1, backlog

## REQ-FR61

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can access their watchlist when offline.
- acceptance: Epic 10 story 10.4 (and Epic 5 story 5.4, done)
- scope: Epic 10 story 10.4 is OUT of v1 (ADR-R6): duplicates delivered Epic 5 story 5.4 (REQ-FR22). Satisfied by 5.4; sprint-status `backlog` entry for 10-4 is to be dropped.

## REQ-FR62

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users can view purchased tickets when offline.
- acceptance: Epic 10 story 10.5
- scope: post-v1, deferred

## REQ-FR63

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Application syncs data when connectivity is restored.
- acceptance: Epic 10 story 10.6 (queued actions sync, last-write-wins, retry with backoff)
- scope: Epic 10, IN v1 (ADR-R6), `backlog`; ticket-queue portion stays out of v1 (SCP 2026-08-06)

## REQ-FR64

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users see real-time ticket availability during purchase flow.
- acceptance: Epic 6 story 6.10 (WebSocket)
- scope: post-v1, deferred

## REQ-FR65

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Users receive notifications of schedule changes for watchlisted events.
- acceptance: Epic 5 story 5.6
- scope: Epic 5, done

## REQ-FR66

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: Venue managers see real-time sales updates on dashboard.
- acceptance: Epic 7 story 7.9
- scope: post-v1, deferred

## FR numbering variants from prd/functional-requirements.md (preserved, not merged)

## REQ-prd-FR1

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Visitors can browse movie showtimes without creating an account. (Cinema-only framing; inventory REQ-FR1 widens to all cultural events.)
- acceptance: absent
- scope: cinema-only variant of REQ-FR1

## REQ-prd-FR2

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Users can filter showtimes by date (today, tomorrow, specific date). Same capability as inventory REQ-FR3 under a different ID.
- acceptance: absent
- scope: ID collision with inventory FR2 (category filter)

## REQ-prd-FR3

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Users can filter showtimes by cinema/venue. Same capability as inventory REQ-FR5.
- acceptance: absent
- scope: ID collision with inventory FR3 (date range)

## REQ-prd-FR4

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Users can filter showtimes by region (Greater Tunis initially). Matches inventory REQ-FR4 (inventory is broader: Sfax, Sousse).
- acceptance: absent
- scope: partial variant

## REQ-prd-FR5

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Users can view film details including synopsis, trailer, duration, cast, and rating. Covered in inventory by REQ-FR7.
- acceptance: absent
- scope: ID collision with inventory FR5 (venue filter)

## REQ-prd-FR6

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Users can view venue details including location, contact, and map. Covered in inventory by REQ-FR8 / venue pages.
- acceptance: absent
- scope: ID collision with inventory FR6 (keyword search)

## REQ-prd-FR7

- source: \_bmad-output/prd/functional-requirements.md
- description: [MVP] Users can search films by title. Inventory REQ-FR6 broadens to events/artists/venues.
- acceptance: absent
- scope: ID collision with inventory FR7

## REQ-prd-FR8

- source: \_bmad-output/prd/functional-requirements.md
- description: [Phase 2] Users can filter events by category (cinema, theater, concerts, exhibitions). Superseded: category filtering is v1 per SCP 2026-08-06 (inventory REQ-FR2).
- acceptance: absent
- scope: ID collision with inventory FR8 (map); phase tag stale

## REQ-prd-FR48-FR50

- source: \_bmad-output/prd/functional-requirements.md
- description: FR48 "[MVP] Admins can create and manage film/showtime listings manually", FR49 "[MVP] edit any film/showtime listing", FR50 "[MVP] Admins can manage venue information" (inventory FR50 is instead "flag events for quality issues"), FR51 analytics [Phase 2], FR52 user accounts [Phase 2], FR53 categories and regions [MVP].
- acceptance: absent
- scope: FR50 semantic collision; "manage venue information" is covered in the inventory via Epic 9.2 / Epic 2D rather than a numbered FR

## REQ-prd-FR57-FR60

- source: \_bmad-output/prd/functional-requirements.md
- description: FR57 "[MVP] Films can have multiple images and media attachments (posters, trailers)"; FR58 venue images; FR60 "[MVP] Users can browse cached showtimes when offline" (inventory says events). Also phase tags in this shard: FR19-FR23 watchlist [Phase 2], FR17/FR18/FR24-FR46 [Phase 2], FR32-FR40 B2B [Phase 2] (stale vs ADR-P3 for FR32-FR36, FR39 and vs delivered watchlist).
- acceptance: absent
- scope: cinema-framed variants; phase tags stale

## Non-functional requirements (source: \_bmad-output/prd/non-functional-requirements.md; identical set in requirements-inventory.md)

## REQ-NFR-P

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Performance. P1 page load <3s (mobile 4G); P2 LCP <2.5s; P3 FID <100ms; P4 CLS <0.1; P5 TTI <3.5s; P6 offline content load <1s; P7 ticket purchase flow <60s end-to-end; P8 QR scan validation <500ms; P9 search results <1s with filters.
- acceptance: targets as listed
- scope: all; P7, P8 post-v1

## REQ-NFR-S

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Security. S1 HTTPS/TLS 1.3; S2 bcrypt cost >=12; S3 payment data never stored (PCI via provider); S4 session tokens expire after 30 days inactivity; S5 venue manager restricted to own venue data; S6 admin actions logged with user ID and timestamp; S7 QR codes cryptographically signed; S8 rate limiting on auth endpoints (max 10 attempts/minute); S9 CORS allowlist; S10 SQL injection and XSS prevention.
- acceptance: as listed
- scope: all; S3/S7 post-v1 usage; S6 deferred with Epic 9 audit logging

## REQ-NFR-SC

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Scalability. SC1 5,000 concurrent users (Phase 1); SC2 20,000 (Phase 2); SC3 10x traffic spikes; SC4 DB supports 100,000 events; SC5 image CDN 1M requests/day; SC6 WebSocket scale to 5,000 simultaneous.
- acceptance: as listed
- scope: all. Tension: v1 is single-instance (replicas 1, no Redis); SC1-SC3 are not provable at that topology (see conflicts report)

## REQ-NFR-R

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Reliability. R1 uptime >99.5%/month; R2 payment success >98%; R3 offline sync success >95%; R4 data freshness >90% listings updated within 48h; R5 daily backups, 30-day retention; R6 RTO <4h; R7 RPO <1h; R8 graceful degradation (core browsing works when payments unavailable).
- acceptance: as listed
- scope: all; R2 post-v1

## REQ-NFR-A

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Accessibility. A1 WCAG 2.1 AA; A2 keyboard navigation; A3 screen reader/ARIA; A4 contrast 4.5:1; A5 visible focus; A6 alt text; A7 programmatic form-error association; A8 no flashing >3/s; A9 touch targets >=44x44 px.
- acceptance: as listed
- scope: all public pages

## REQ-NFR-I

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Internationalization. I1 full RTL; I2 language switch without reload; I3 locale date/time formatting; I4 currency in TND; I5 fallback to French; I6 URL prefixes /ar/ /fr/ /en/. Binding project rule (kernel): Arabic uses Western digits and DD/MM/YYYY in all locales.
- acceptance: as listed
- scope: all

## REQ-NFR-IN

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Integration. IN1 payment gateway <5s timeout; IN2 Strapi API responses cached with 5-minute TTL; IN3 email delivery within 2 minutes; IN4 social login OAuth <10s; IN5 WebSocket reconnect within 5s; IN6 API backward compatibility for 6 months.
- acceptance: as listed
- scope: IN2 conflicts with "no cache tier in v1" (only in-process trending cache exists; see conflicts report INFO); IN1, IN5 post-v1

## REQ-NFR-D

- source: \_bmad-output/prd/non-functional-requirements.md
- description: Data and privacy. D1 user data exportable on request; D2 account deletion removes personal data within 30 days; D3 analytics anonymized after 90 days; D4 cookie consent before non-essential tracking; D5 venue analytics aggregated (no individual user data).
- acceptance: as listed
- scope: all; D1/D2/D4 have no covering story found in the epics

## Additional requirements carried in requirements-inventory (source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md)

## REQ-additional-from-architecture-and-ux

- source: \_bmad-output/project-planning-artifacts/epics/requirements-inventory.md
- description: From architecture: mandatory Next.js 16.1 with Turbopack and React Compiler; init from notum-cz/strapi-next-monorepo-starter; Strapi v4 to v5 migration with Events Manager plugin recreated; DB schema review and migration scripts; Storybook with @storybook/nextjs-vite; Serwist; Dokploy; Redis DEFERRED post-v1 (2026-08-11); Konnect (e-Dinar, Sobflous, D17, Flouci, Visa, Mastercard); Algolia ("evaluate vs native Strapi v5 search"); ImageKit; Socket.io (post-v1); HMAC-SHA256 QR; data migration scripts from legacy v4. From UX (B2C, legacy inventory text): dark-first single theme; the Tiween Green/Yellow values written in requirements-inventory.md are RETIRED (ADR-R1; the Gold Leaf x Aubergine spines are canonical, tokens now in constraints.md section 7), shadcn/ui on Radix, Lalezar/Inter display and body typography (superseded in part by the spine: Lalezar brand moments only, Inter headings and body, IBM Plex Sans Arabic for Arabic; constraints.md UX-b2c-typography), mobile-first (65% Chrome Android), 4-tab bottom nav (Home, Search, Tickets, Account), horizontal category tabs (Tout/Cinema/Theatre/Courts-metrages/Musique), sub-10-second discovery path, 30-second first-value, one-tap core actions, poster-forward cards, skeleton loading, celebration moments, 44px/48px targets, offline indicators, mixed AR/FR rendering. From PRD: brownfield migration; B2B dashboard via Strapi Admin (not custom frontend); guest checkout; Culture Pass (Phase 2), push notifications (Phase 2), native apps (Phase 3).
- acceptance: absent
- scope: architecture/UX carry-over. Colors and Arabic font named here are superseded by ADR-R1 and the 06-16 spine (UX-b2c-color-tokens, UX-b2c-typography); email provider named elsewhere is Brevo (ADR-R2).

---

## B2C behavior requirements (source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md; visual tokens in the DESIGN.md of the same folder, see constraints.md section 7)

Scope note: the spine covers the whole B2C product including ticketing. Under ADR-P3 (v1 = aggregation, ticketing post-v1 and flag-gated by story 3.12) the ticketing-facing parts (Billets tab ticketing entry, Flow 2 guest purchase, Flow 3 offline QR, ShowtimeButton/SeatSelector/TicketQR/daylight checkout) are post-v1 and dormant; the rest is in force for v1. The spine frontmatter says Next.js 15; the repo (16.1) governs. The spine states that spines win over any mock or import.

## REQ-b2c-information-architecture

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Information Architecture, Foundation)
- description: Four top-level destinations as the BottomNav tabs. (1) Accueil: discovery feed with top category tabs (Tout / Cinema / Theatre / Musique ...) and horizontal carousels ("Films a venir", "Films les mieux notes", "Selection musique", "Podcasts les mieux notes"), pre-filtered to what is on, never an empty cold start. (2) Recherche: instant search (300 ms debounce), recent searches, suggestions, filter by category / date / location / near me. (3) Billets: ticketing entry plus "Mes evenements" (A venir / Passes), each ticket's offline QR. (4) Compte: profile, watchlist, language, preferences, auth. Detail surfaces pushed on a tab stack: Film detail, Theater/Salle detail, Venue detail, Ticketing flow (4-step), Confirmation, Ticket-QR. Theater/Salle, Venue and Concert detail reuse the Film-detail structure (seances become run-dates/sessions). SeatSelector is reached only for assigned-seating venues (optional step); general admission skips it. Mobile-first installable PWA (Chrome Android about 65%); desktop is an enhanced secondary surface (adds, never subtracts). Server Components by default; `'use client'` only for interactive islands.
- acceptance: absent as testable criteria (design spec). Closure check in the spine: Discovery = Accueil/Recherche, Decide = detail, Act = ticketing/watchlist, Re-engage = Billets/Compte.
- scope: B2C client, v1 for Accueil, Recherche, Compte and detail surfaces; the ticketing half of Billets and the 4-step ticketing flow are post-v1 and flag-gated (ADR-P3). The "Podcasts" carousel has no matching content type or epic story (not in v1 scope). "Near me" is deferred (story 3.9).

## REQ-b2c-state-patterns

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (State Patterns, Voice and Tone)
- description: Every data surface defines five states. Loading: skeletons matching the final layout ({surface} blocks, subtle pulse), spinner only after 200 ms for actions. Empty: encouraging copy plus a next action, never a dead end. Error: translated code, retry affordance, no stack trace; inline for fields, toast for transient, full-screen only for route-level failure. Offline: cached content served, a `Fonctionne hors ligne` badge ({success}) marks what is usable, writes queue; tickets and watchlist fully usable. Success: confirmation with reassurance and celebratory moments for milestones. Errors are returned as codes and translated in-UI via next-intl (`t(error.code)`); never hardcode a message. Product voice is calm, clear, reassuring, French default; marketing voice (bold, Tunisian vernacular) is for promo collateral only.
- acceptance: absent as testable criteria beyond the state definitions above.
- scope: all B2C data surfaces, v1

## REQ-b2c-component-behavior

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Component Patterns)
- description: EventCard: whole card is the tap target to detail; watchlist heart is an independent sub-target (optimistic toggle, 0.5 s pulse on first save); `role="article"`; {primary} focus ring; skeleton while loading; reserve the 2:3 poster box so image load never shifts layout. ShowtimeButton: `role="radio"` inside a venue `radiogroup`; selecting enables the sticky `Choisir cette seance` CTA and shows a check glyph in addition to the gold fill; focus ring dark/white on the selected gold tile; unavailable is not focusable; sold-out is `aria-disabled` and announced "complet, indisponible", not removed from the tree; the recommended star is decorative with an accessible label. Links and info: link text uses {link} (gold-tint); info banners/tags use {secondary} (magenta) fill with white text; watchlist count, "voir plus", legal/help links and "Mes evenements" route through {link}. TicketQR: renders from cache, works offline, requests max brightness on mount, "Scanned at HH:MM" overlay when validated, Share / Add-to-Wallet secondary. BottomNav: persistent on the 4 roots, hidden during checkout and when the keyboard is open, active tab reflects the current root, badge dot on Billets. Tabs (category/date): horizontal scroll with momentum and snap, selected underline in {primary}, arrow keys move, Enter/Space activate.
- acceptance: absent as testable criteria beyond the behaviors above.
- scope: B2C component library (Epic 2A) and features; ShowtimeButton, TicketQR and the Billets badge are post-v1 and dormant

## REQ-b2c-i18n-bidi

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Foundation: Languages and direction, Bidi); DESIGN.md (Components, Do's and Don'ts)
- description: AR / FR / EN via next-intl; French is the default product copy; Arabic flips to `dir="rtl"` instantly with no reload. Arabic uses Western numerals and `DD/MM/YYYY`; time renders `HH:MM` in AR/EN and `15h00` in FR. next-intl sets `dir` only: CSS logical properties (`ps/pe/ms/me`, start/end corners) and icon mirroring are the app's responsibility. Mandatory bidi isolation: any surface that puts an Arabic string and a Latin string on one line (EventCard with AR title + `VOST`/`VF` + venue + price, search results, ticket meta) wraps each foreign run in `<bdi>` or `dir="auto"`. Currency format `12,20 DT` (decimal comma, space before DT, DT isolated as a Latin run, trailing the price in both directions). Directional icons mirror in RTL; swipe direction is RTL-aware. The spine states this as a requirement, not a "verify".
- acceptance: absent as testable criteria; the spine calls bidi isolation mandatory and names it the most common Arabic-card bug.
- scope: all B2C surfaces, v1. Consistent with the kernel (Western digits, DD/MM/YYYY). Note the FR time format `15h00` versus the baseline pattern doc's `DD/MM/YYYY HH:mm` in all locales (conflicts report INFO).

## REQ-b2c-accessibility-floor

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Accessibility Floor); DESIGN.md (Colors, Layout)
- description: WCAG 2.1 AA baseline (all core color pairs are AAA/AA per the computed ratios in DESIGN.md). Focus visible everywhere: {primary} 3 px outline plus 2 px offset, logical tab order, no traps, sheets and dialogs trap and restore focus. Status never by color alone (icon + text for sold-out, offline, error, selected, recommended). Touch targets at least 44 px (preferred 48 px primary) with 8 px minimum spacing. Screen reader: semantic roles (EventCard=article, ShowtimeButton=radio, nav landmarks), live regions for async results and toasts, labelled icon-only buttons. RTL: logical properties, flipped directional icons, mixed AR/FR strings verified. Zoom to 200 percent with no horizontal scroll. Honor `prefers-reduced-motion` for all celebrations and transitions (the static confirmation and check still render; only confetti/pulse is suppressed).
- acceptance: the checklist above; aligns with NFR-A1..A9 (REQ-NFR-A).
- scope: all B2C surfaces, v1

## REQ-b2c-interaction-primitives

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Interaction Primitives)
- description: Optimistic toggles (watchlist and similar reflect instantly, reconcile in the background, roll back with a toast on failure). Celebrations: ticket purchased = confetti + check 2 s; first watchlist save = heart pulse 0.5 s; account created = welcome + confetti 2 s. Gestures always have a visible button equivalent: pull-to-refresh (feeds), swipe-to-dismiss (sheets/toasts), swipe between date/category tabs (RTL-aware). Debounce: search 300 ms, field validation 500 ms. Bottom sheet (slide-up) on mobile, centered dialog (fade) on desktop. Toast durations: success 3 s, error 5 s, warning 4 s, info 3 s.
- acceptance: values above.
- scope: B2C client, v1 (the ticket-purchased celebration is post-v1)

## REQ-b2c-key-flows

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Key Flows)
- description: Flow 1 (v1, the heartbeat): a user finds something for tonight in under 30 seconds. Accueil loads instantly from cache with "Films a venir" already populated (no empty state, no spinner); tap the Cinema category tab (feed filters in place); scan 2:3 posters; open an EventCard; Film detail shows seances grouped by venue with "Aujourd'hui" preselected; cross-venue showtimes side by side are the climax ("the thing Facebook pages cannot do"), with the recommended showtime marked by the gold star. The spine's step 6 (tap `Reserver` to enter ticketing) is gated off in v1 by story 3.12 (ADR-P3). Flow 2 (post-v1, dormant): guest purchase: pick the seance, quantity, guest path with email only, Checkout on the daylight surface, Konnect payment, errors as translated codes, sold-out mid-flow gives a recovery path, climax "Paiement valide !" with gold check disc, 2 s confetti, reassurance copy, ticket already offline in Billets. Flow 3 (post-v1, dormant): ticket at the door offline: Billets > Mes evenements > A venir loads from cache, TicketQR opens on the daylight surface with brightness raised and a black-on-white QR, offline badge "hors ligne - toujours valide", first-time scan in daylight with no signal.
- acceptance: Flow 1 target: value in under 30 seconds on variable 4G (see also REQ-success-criteria-mvp, time to discovery under 2 minutes). Flows 2 and 3: acceptance absent here (post-v1).
- scope: Flow 1 v1; Flows 2 and 3 post-v1 (Epic 6 stories 6.6-6.10 and Epic 10.5 deferred)

## REQ-b2c-responsive-pwa

- source: \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/EXPERIENCE.md (Responsive and Platform, Foundation: Offline-first)
- description: Mobile (primary): single-column feeds, bottom nav, thumb-zone CTAs, sheets. Desktop (enhanced): 12 columns, max container 1280 px; film detail becomes hero plus sidebar; cross-venue showtime comparison gets more horizontal room; bottom nav becomes top/side nav. PWA installable; splash uses Lalezar (display) plus the monogram; offline shell precached. Offline-first: Serwist service worker caches listings, the watchlist and purchased tickets; core discovery (and ticket display) work with no network.
- acceptance: absent as testable criteria beyond the above (see REQ-web-pwa-offline-realtime, REQ-FR59, REQ-FR60).
- scope: B2C client, v1 (ticket caching post-v1)

---

## Requirements derived from owner-ratified resolutions (source: .planning/ingest-resolutions.md)

## REQ-admin-calendar-verify-harden

- source: .planning/ingest-resolutions.md; \_bmad-output/project-planning-artifacts/calendar-build-vs-buy-2026-08-08.md; \_bmad-output/implementation-artifacts/deferred-work.md; \_bmad-output/project-planning-artifacts/implementation-readiness-2026-08-08.md (Finding 1, now stale)
- description: Own early phase, ahead of any Epic 9 admin work, because showtime entry blocks v1. Renamed and re-scoped from "REQ-admin-calendar-rebuild" per the owner's answer: VERIFY + HARDEN, not rebuild. Part 1, end-to-end showtime-entry verification: confirm an admin can create, edit and view screenings and performances for an event through the events-manager planning surface (useSubEvents, SubEventModal, subEventTransform, subEventPopulate), which commit 9a75837 (2026-08-08, spec `spec-events-manager-planning-surface-rebuild.md` status done) already rebuilt on screening/performance with explicit UTC parsing and tests (verified in the tree: no `plugin::events-manager.showtime` reference remains under the plugin admin; tests exist for subEventTransform, subEventPopulate, useSubEvents, PlanningCalendarNew, SubEventModal, EventBlock). Part 2, BigCalendar hardening (bespoke component kept per ADR-P9, no third-party calendar library, Strapi Design System components only): UTC rendering inside the grid (the grid renders browser-local today), RTL (physical positioning), tests (none under `BigCalendar/`), a11y (invalid ARIA tree), locale strings (ignored `locale` prop, hardcoded French/fr-FR; dead `timezone` prop). Stale and not to be acted on: implementation-readiness-2026-08-08 Finding 1 and the deferred-work.md "broken surface" ledger entry (both say the surface requests the deleted showtime type). Design decision still to record: one calendar renders both sub-event kinds with diverged fields (screening: videoFormat, subtitleLanguage; performance: surtitleLanguage); the code merges both into one chronological grid with a kind badge and one SubEventModal for both kinds.
- acceptance: UTC-aware behavior with unit tests at the transform boundary (calendar-build-vs-buy; already met for the transform layer). Part 1 pass condition: showtime entry works end to end (exact criteria absent). Part 2: the five hardening items above, each closed or consciously deferred.
- scope: events-manager admin UI; v1; own phase before Epic 9; scope settled by ADR-R4

## REQ-brand-palette-rework

- source: .planning/ingest-resolutions.md; \_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (canonical per owner)
- description: Rework the B2C client from the retired teal/yellow identity to the Gold Leaf x Aubergine identity in the 06-16 DESIGN.md. Affected stories: Epic 1 1.3 (Tailwind v4 `@theme` design tokens), 1.4 (dark-theme and focus styling: {primary} 3 px outline + 2 px offset), 1.7 (PWA manifest theme/background color), Epic 2A 2A.1 (BottomNav active icon and label become solid gold) and 2A.2 (Header becomes the aubergine field with the gold taa lockup), plus the epic-list.md and requirements-inventory.md UX notes. Concrete targets are in constraints.md section 7: color tokens (UX-b2c-color-tokens), category colors, daylight surfaces, typography (Lalezar for brand moments only; Inter for Latin headings and body; IBM Plex Sans Arabic for Arabic headings and body, replacing Noto Sans Arabic; Cairo as the long-copy Arabic display fallback; JetBrains Mono for ticket IDs), shapes, and the taa monogram logo (favicon, app avatar, header lockup). Code to change (apps/client, checked 2026-10-18): `src/styles/theme.css` (--color-tiween-green/-yellow, --font-arabic Noto Sans Arabic), `src/styles/globals.css`, `public/manifest.json` (theme_color and background_color #032523), `src/lib/fonts.ts` (loads Inter, Lalezar, Noto_Sans_Arabic only), `src/app/[locale]/layout.tsx`, `.storybook/preview.tsx`, landing and design-system pages; 23 files contain #F8EB06 or #032523. The spine's "Next.js 15 App Router" is stale; the repo is Next.js 16.1 and governs.
- acceptance: token values and contrast rules in UX-b2c-color-tokens and UX-b2c-color-usage-rules (for example never white on a gold fill; gold CTA never on a white daylight surface). Explicit per-story ACs for the rework: absent (derive from the spine).
- scope: Epic 1 / Epic 2A, v1

## REQ-venue-manager-strapi-surface

- source: .planning/ingest-resolutions.md; \_bmad-output/project-planning-artifacts/epics/epic-7-b2b-venue-management.md; \_bmad-output/project-planning-artifacts/epics/epic-2d-venues-properties-admin-ui.md; \_bmad-output/implementation-artifacts/sprint-status.yaml (7-2 comment); .planning/codebase/ARCHITECTURE.md
- description: The venue-manager surface is the Strapi admin (Epic 2D Venue Manager RBAC, `venues-admin-scope` policy), not the Next.js client. Rework or retire the delivered Next.js venue-manager build for story 7.2 (client `/venue` area and public-side venue-manager accounts), and reconcile stories 7.1 (registration), 7.2, 7.3, 7.4, 7.8 and the 9.1 approval flow to it, including how venue-manager accounts are provisioned so they can reach /admin (users-permissions users cannot). NFR-S5 (venue manager restricted to own venue data) must hold on this surface.
- acceptance: absent in the owner resolution. Story ACs for 7.2 ("logged into Strapi admin as venue manager") and 9.1 (approve/reject in Strapi admin, emails, account activation) already describe the target surface.
- scope: Epic 7, Epic 2D, Epic 9.1; v1
