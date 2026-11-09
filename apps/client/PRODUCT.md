# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first PWA, Next.js 16.1 App Router (this workspace, `apps/client`). Public site only. The internal Strapi admin has its own record in `apps/strapi/PRODUCT.md` and is out of scope here.

## Users

- **Primary: Tunisian culture-goers aged 18-34.** Digitally native, phone-first, heavy Instagram/TikTok users. Today they piece together "what's on, where, when" from venue Facebook pages and screenshot schedule images, and they often find out about a screening after it has ended. Their job is to find something worth seeing or watching, in their own language, in under two minutes.
- This audience is the primary user for the whole public site, including the v1 short-film directory. Shorts is one surface for these same people, not a separate audience.
- Visitors browse anonymously. Signed-in users are the same people with a watchlist and saved preferences, not a different segment.

## Product Purpose

Tiween is Tunisia's cultural compass. It is a single, discovery-first place to find cinema, theatre, short films, concerts and exhibitions across the country, browsable without an account. If everything else fails, discovery has to work.

- **v1.0 (current milestone):** a finished, live short-film directory (`/[locale]/shorts`, `/[locale]/shorts/[slug]`) on real Strapi data, with working search (Meilisearch), SEO, and the trilingual, RTL experience.
- **Longer-term success (PRD):** 1,000 MAU in the first 30 days, D7 retention above 20%, time to discovery under 2 minutes.

## Positioning

- The only unified cultural agenda in Tunisia: all disciplines and all regions in one place, organised by **what you want to see**, not by which venue is showing it.
- Fully trilingual (French default, Arabic with full RTL, English) on equal footing, not with Arabic bolted on later.
- **Short-film directory scope: Maghreb and Arab short films, curated from a Tunisian point of view.** The claim is a regional reference catalog. It is neither a Tunisia-only archive nor a general streaming catalog.
- A cultural-preservation mission: the catalog records Tunisian and regional works, people and credits, not just showtimes.

## Operating Context

- Used on phones, often outdoors or on the move. Mobile data and offline moments are normal.
- Visitors arrive from social links (Instagram, TikTok, Facebook) and search. Shareable, indexable detail pages matter.
- Browsing needs no account. An account adds a watchlist (synced across devices, available offline) and language/region preferences. Auth is email/password, Google or Facebook.
- Every push to `main` that passes CI deploys to production. Unfinished surfaces stay `noindex` and unlinked until their launch phase.

## Capabilities and Constraints

**Shipped:** event discovery (category tabs, date/region/venue filters, event detail with map and share, trending/featured home); accounts and profiles; watchlist; the short-film detail page UI (currently fed by mock data).

**In progress (v1.0):** real data on shorts pages from the short-film public API, Meilisearch search, a finished directory (hero, filters, sort, cards, a suggestion form with a real backend), shorts SEO, production launch.

**Dormant, never delete:** ticketing (orders, Konnect payments, QR tickets, email delivery) is built and feature-flagged off. Do not design ticket-buying flows into v1 surfaces.

**Constraints:**

- Catalog of record is the unified `creative-work` (type `film | short-film | play`) with a person / character / credit-role graph. A short film's data is credits, cast, videos, distinctions, links, genres, poster, backdrop and photos. There are no `directors` or `trailer` fields. Directors come from credits and trailers from videos.
- Arabic uses Western digits and `DD/MM/YYYY`. Format dates through `lib/dates.ts`, never a raw `ar` locale.
- User-facing errors are codes translated in the UI (`t('errors.<CODE>')`). Never hard-code messages or expose stack traces.
- Translations live in `apps/client/locales/{fr,ar,en}.json`.
- Single-instance backend (no Redis, no replicas above 1); the client must tolerate a slow or briefly unavailable API.

**Out of v1 (do not design for):** ratings and reviews, Culture Pass, near-me geolocation, native apps, AI recommendations, venue scanner, ticketing revival.

**Open product decisions:**

- Launch catalog size and poster/media sourcing and rights.
- Where the directory entry point sits in navigation (decided at go-live).
- Post-v1 fee model (commission vs buyer fees vs Culture Pass), to be decided before any ticketing work.

## Brand Commitments

- **Name:** Tiween (tiween.com).
- **Logo:** circular taa (ت) monogram that reads as both the Arabic letter and a smiley face, designed by Amen Okja / BLITS. Assets: `public/images/logo.svg`, `public/images/tiween-wordmark-gold.png`, PWA icons in `public/icons/`.
- **Identity (owner-ratified):** the Gold Leaf × Aubergine identity is binding for the public site. Canonical visual spines: `_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md` and `EXPERIENCE.md`; this workspace's `DESIGN.md` records it for Impeccable. Since 2026-11-08 it is the global theme: the retired teal and yellow tokens are deleted from the client.
- **Hard rules from the owner:** gold carries action only; never white text on gold; never a gold CTA on white.
- **Signature emotion:** cultural excitement with effortless confidence. Users should feel they have found a secret weapon for cultural life in Tunisia.
- **Voice:** calm, clear, reassuring, French by default. Empty states encourage and always offer a next action. They never apologise.

## Evidence on Hand

- `src/features/shorts/data/mock-shorts.ts`: about 41 **mock** films. This is placeholder content and must not appear as real catalog data or as proof.
- `scripts/seeds/data/creative-works.json` (repo root): 10 seeded short films with no crew or cast.
- Market context in the 2025 product brief (`_bmad-output/project-planning-artifacts/product-brief-tiween-bmad-version-2025-12-25.md`): population, mobile penetration, about 18 cinemas nationally.
- **Absent, do not fabricate:** user counts, testimonials, press, partner-venue logos, festival endorsements, ratings and reviews, usage metrics.

## Product Principles

1. **Discovery is the product.** Every surface answers "what can I see or watch?" fastest, before anything else.
2. **Three languages, one product.** French, Arabic (RTL) and English are designed together. A layout that only works left-to-right is unfinished.
3. **Phone first, outdoors, on patchy data.** Assume a small screen, bright light and a flaky connection.
4. **Honest states.** Never fake success, never show mock data as real, and every empty or error state offers a next step.
5. **The works lead.** Posters, credits and the people behind a work carry the experience. Interface chrome stays secondary.

## Accessibility & Inclusion

- WCAG 2.1 AA baseline.
- Focus visible everywhere, logical tab order, dialogs and sheets trap and restore focus.
- Status is never shown by color alone. Always pair an icon with text (sold-out, offline, error, recommended).
- Full RTL mirroring for Arabic, with Western digits.
