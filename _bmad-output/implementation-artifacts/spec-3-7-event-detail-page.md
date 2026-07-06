---
title: "Event Detail Page (Story 3.7)"
type: "feature"
created: "2026-07-06"
status: "done"
review_loop_iteration: 0
followup_review_recommended: true
baseline_revision: "0478ff8edfe688761466dc7ea0be354da53645c1"
sprint_key: "3-7-event-detail-page"
depends_on: ["3-1-public-events-browse-api-and-data-foundation"]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-6-keyword-search-with-algolia.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** A full event-detail feature already exists (route `[locale]/events/[documentId]`, `getEventByDocumentId` fetcher, `EventDetailPage` component, SEO metadata + JSON-LD) but is built entirely on the **pre-3.1a legacy schema** — it reads the removed `event.creativeWork`, `event.showtimes`, `event.startDate/endDate`, `venue.city` relations that the real events-manager plugin no longer exposes. Against the real 3.1a backend the page therefore renders an empty hero, no synopsis, no cast/crew, and no showtimes. Separately, the backend `findEvent` endpoint reuses the shallow list populate (`venue`, `screenings`, `images`), so even the real relations a detail page needs (`screenings.movie` with poster/synopsis/cast/crew, `venue.cityRef`) are never populated; and `EventDetailPage` calls `ShowtimeButton` with a stale prop API (`format`/`isAvailable`/`onClick`, no `venueName`) so showtimes are broken.

**Approach (cross-layer, fix-and-wire — do NOT rebuild):** **Backend** — add a detail-only deep `DETAIL_POPULATE` used solely by `findEvent` (keep list `EVENT_POPULATE` shallow for browse perf) reaching `screenings.movie.{poster,backdrop,videos,genres,cast.person,cast.character,credits.person,credits.creditRole}`, `venue.{cityRef.region,geo}`, `images`. **Frontend** — align the client `StrapiEvent`/`StrapiCreativeWork` types to the real movie/cast/credits/video shapes; add a pure `toEventDetail(event, locale)` detail mapper that reads `screenings[0].movie` (film), builds the showtime list from `screenings` (with a derived VF/VOST/3D format badge from `videoFormat`+`audioLanguage`+`subtitleLanguage`), extracts cast (`movie.cast[].person`) and directors (`movie.credits` where `creditRole.department === "directing"`), and resolves venue address/city/region; rewrite `EventDetailPage` and the route's `generateMetadata`/breadcrumb to consume the real data via that mapper; fix the `ShowtimeButton` call to the real `formats`/`status`/`onSelect`/`venueName` API; drop the dead legacy `populate` from `getEventByDocumentId` (the backend owns populate) and realign `getRelatedEventsByParams` to real fields; thread next-intl `events.*` labels into the route so the page is no longer French-hardcoded.

## Boundaries & Constraints

**Always:**

- Backend change is additive and minimal: introduce a `DETAIL_POPULATE` constant next to `EVENT_POPULATE` and use it **only** in `findEvent`; `findEvents`/`findTrending`/`EVENT_POPULATE` and the shallow browse path stay unchanged. Keep `findEvent`'s existing post-fetch cinema scope (`category !== MVP_CATEGORY ⇒ null`), the `status: "published"` guard, the `locale` passthrough, and the `{ data, meta }` / `EVENT_NOT_FOUND` controller shape. No new route, no new endpoint, no by-slug route.
- Use the real relation paths only (verified against the schema): the film is `event.screenings[0].movie` (a movie_screening event = one film, many screenings/showtimes); event blurb is `event.description`; movie synopsis is `movie.synopsis`; classification is `movie.ageRating` (TP/PG12/PG16/PG18); critic score is `movie.rating`; trailer is a `movie.videos[]` entry with `videoType === "trailer"` (no scalar `trailerUrl`); cast is `movie.cast[].person` (+ `character`); directors are `movie.credits[]` where `creditRole.department === "directing"`; venue location is `venue.address` + `venue.cityRef.name` + `venue.cityRef.region.name`. Never a foreign-UID `strapi.documents()` call — deep populate through the event UID only (the sanctioned cross-plugin pattern, per architecture + `buildFilters` precedent).
- The detail mapper (`toEventDetail`) is pure, dependency-free (no `server-only`, no React — colocated with `eventMappers.ts`), and resilient: an event with no screenings / no movie / no venue / no cast maps without throwing (mirrors the existing mapper resilience contract). `EventDetailPage` keeps accepting a `StrapiEvent` prop and maps internally, so the route's `<EventDetailPage event={event} … />` wiring stays intact.
- `ShowtimeButton` must be called with its real API: `venueName` (required, the event's venue name), `formats` (array derived per screening), `status` (`"available"` | `"sold-out"` from `ticketsAvailable`), `onSelect`, `time`, `price`, `currency`. A showtime tap begins ticket purchase by navigating to the ticketing entrypoint (`/{locale}/tickets/{eventDocumentId}/{screeningDocumentId}`) — the purchase flow itself is Epic 6, out of scope here.
- SEO stays intact and real: `generateMetadata` sources `title`/`description`/`poster` from `screenings[0].movie` (falling back to `event.title`/`event.description`/`event.images`), preserving the canonical + `ar/fr/en` alternates, OpenGraph, Twitter, and robots blocks. Reuse `generateEventJsonLd` (already dual-schema-aware) unchanged; realign the `generateBreadcrumbJsonLd` inputs to the real movie title/type. SSR + JSON-LD render on the server.
- i18n: the route builds a `labels` bundle from `getTranslations({ locale, namespace: "events" })` and passes it to `EventDetailPage` (the existing `events.*` keys already exist in FR; ensure EN/AR parity, add any missing). All user-facing copy via next-intl; FR default; `ar ⇒ dir="rtl"` (inherited from the layout, plus the component's existing `isRTL` icon handling). No hardcoded French strings left in the rendered page or metadata.
- Fail soft: a missing/non-cinema event ⇒ `notFound()` (the existing `not-found.tsx`); a fetch error ⇒ the fetcher returns `null` ⇒ `notFound()`; partial data ⇒ the relevant section is omitted, never a whole-page crash.

**Block If:** (none expected — the endpoint, the deep-populate capability, the real relations, the `ShowtimeButton` real API, the JSON-LD dual-schema builder, and the `events.*` i18n keys all already exist and are precedented. Escalate rather than guess only if `screenings[0].movie` is NOT a reliable single-film source for a `movie_screening` event — i.e. seeded cinema events legitimately carry screenings of **different** movies — which would break the "one event = one film" detail assumption and require a product decision on how to present a multi-film event.)

**Never:**

- No slug-based routing in this pass. Every navigation call site (`HomePage*`, `EventsListing`, `EventGrid`, `EventSection`) and the existing route are keyed on `documentId`, and there is no by-slug backend route; the `documentId` URL is already stable and shareable, satisfying the "shareable URL" AC. Adding a by-slug service + route + rewiring all call sites is disproportionate and reversible — log slug-canonical URLs to `deferred-work.md`, do not build them.
- No interactive map. `venue.geo` is populated for it, but the map is Story 3.8; render venue address/city/region text only.
- No watchlist persistence and no ticket purchase flow. Watchlist stays local `useState` (auth is Epic 4, watchlist Epic 5); the showtime tap only navigates toward the ticketing entrypoint (Epic 6). Do not build either.
- Do not touch or reshape the shallow browse populate (`EVENT_POPULATE`), `findEvents`, `findTrending`, or the curated-slice / filter / search paths. Do not rebuild `EventDetailPage`, `FilmHero`, `ShowtimeButton`, `EventSection`, or `EventCard` — wire the real data into them.
- Do not reintroduce or newly read any legacy field (`creativeWork`, `showtimes`, `startDate`, `endDate`, `venue.city`, `status`); the detail surface must read the real schema. Leave the deprecated type fields in place only for other unmigrated surfaces.

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                                                | Expected Output / Behavior                                                                                                                                            | Error Handling              |
| ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Valid cinema event       | `/{locale}/events/{documentId}` (published, movie_screening) | Hero (movie backdrop/poster + title/genres/rating/duration/year), synopsis, cast + directors, showtimes from `screenings`, venue block, sticky buy CTA; SSR + JSON-LD | 200                         |
| Missing / non-cinema     | unknown documentId, or category ≠ movie_screening            | `findEvent ⇒ null ⇒ notFound()` renders `not-found.tsx`                                                                                                               | 404 page, no 500            |
| No screenings / no movie | event populated but `screenings` empty                       | Hero falls back to `event.images` + `event.title`/`description`; showtimes section shows `noShowtimes`; no cast/crew; no sticky CTA                                   | Graceful; no throw          |
| Sold-out screening       | `screening.ticketsAvailable <= 0`                            | `ShowtimeButton status="sold-out"`, non-selectable; others remain available                                                                                           | No error                    |
| Screening format badges  | `videoFormat=threeD`, `audioLanguage`/`subtitleLanguage`     | Derived `formats` (e.g. `["3D","VOST"]`) shown on the ShowtimeButton                                                                                                  | Unknowns omitted, no throw  |
| Showtime tap             | click an available `ShowtimeButton`                          | `onSelect ⇒ router.push(/{locale}/tickets/{eventDocumentId}/{screeningDocumentId})`                                                                                   | No error (target is Epic 6) |
| RTL locale               | `ar`                                                         | `dir="rtl"` (layout), localized `events.*` labels, direction-aware back arrow                                                                                         | No error                    |
| Related events           | same-venue upcoming events exist                             | `EventSection` of related cards (real `toEventCardEvent`), excluding the current event                                                                                | Empty ⇒ section omitted     |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` — add a `DETAIL_POPULATE` const (deep: `screenings.movie.{poster,backdrop,videos,genres,cast.person,cast.character,credits.person,credits.creditRole}`, `venue.{cityRef.region,geo}`, `images`) and use it **only** in `findEvent` (replace `populate: EVENT_POPULATE` there). `EVENT_POPULATE`/`findEvents`/`findTrending` untouched.
- `apps/strapi/.../events-manager/server/src/services/__tests__/events.unit.test.ts` — extend `findEvent` coverage: assert the deep `DETAIL_POPULATE` shape is passed to `findOne` (currently only `objectContaining` on documentId/status/locale); keep the non-cinema⇒null and absent⇒null cases.
- `apps/client/src/features/events/types/strapi.types.ts` — align to the real schema: add `StrapiCastEntry { person: StrapiPerson; character?; billing? }`, `StrapiCreditEntry { person: StrapiPerson; creditRole?: { name; slug; department? }; customRole?; billing? }`, `StrapiVideo { url; videoType?; type? }`, `StrapiGeoPoint { latitude; longitude }`; extend `StrapiCreativeWork` with real `synopsis`, `ageRating?`, `videos?: StrapiVideo[]`, and replace legacy `cast`/`directors` with real `cast?: StrapiCastEntry[]` + `credits?: StrapiCreditEntry[]`; extend `StrapiScreening` (already has `videoFormat`/`audioLanguage`/`subtitleLanguage`) and `StrapiVenue` with `geo?: StrapiGeoPoint`, `cityRef?.region`. Keep other legacy fields as deprecated.
- `apps/client/src/features/events/utils/eventMappers.ts` — add `EventDetailData` presentation type + a pure `toEventDetail(event, locale)` mapper (film = `screenings[0].movie`; showtimes from `screenings` sorted by `startDateTime` with a `deriveScreeningFormats` helper mapping `videoFormat`+audio/subtitle → `ShowtimeFormat[]`; cast from `movie.cast[].person`; directors from `movie.credits` filtered by directing department; synopsis; venue address/city/region; backdrop/poster resilient fallbacks). Update `toFilmHeroEvent` to read real `screenings[0].movie` (genres/rating/duration/year) instead of legacy `creativeWork`.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` — keep the `StrapiEvent` prop; internally `toEventDetail(event, locale)` and render hero (via `FilmHero` fed by `toFilmHeroEvent`), synopsis, venue block, showtimes (real `screenings` → `ShowtimeButton` with `venueName`/`formats`/`status`/`onSelect`), cast, directors, related, sticky CTA — all from the mapper. Remove all legacy `event.creativeWork`/`event.showtimes`/`event.startDate` reads and the hardcoded `defaultLabels` reliance (labels come from the route).
- `apps/client/src/lib/strapi-api/content/server.ts` — `getEventByDocumentId`: drop the dead legacy `populate` object (the endpoint ignores client populate; backend `DETAIL_POPULATE` owns it) — fetch `/events-manager/events/${documentId}?locale=…` and return `data`. `getRelatedEventsByParams`: realign to real fields (filter same-venue upcoming via `venue.documentId` + `startDateTime >= now`, `status: published`, sort `startDateTime:asc`; drop the legacy `creativeWork.type`/`endDate` filters).
- `apps/client/src/app/[locale]/events/[documentId]/page.tsx` — `generateMetadata`: source title/description/poster from `screenings[0].movie` (fallback `event.title`/`description`/`images`); keep canonical/alternates/OG/twitter/robots. Realign the `generateBreadcrumbJsonLd` inputs (movie title/type) to real fields; keep `generateEventJsonLd` as-is. Build a `labels` bundle from `getTranslations({ namespace: "events" })` and pass it to `<EventDetailPage>`; drop the `creativeWorkType` legacy arg to `getRelatedEventsByParams` (pass `venueDocumentId`).
- `apps/client/locales/{en,ar}.json` — ensure the `events.*` detail keys used by `EventDetailPageLabels` (back, share, addToWatchlist, removeFromWatchlist, synopsis, showMore, showLess, showtimes, noShowtimes, buyTickets, ticketsAvailable, soldOut, cast, directors, relatedEvents, minutes, venue, dateRange) exist in EN and AR at parity with FR; add any missing.
- `apps/client/src/features/events/utils/eventMappers.test.ts` (or the existing mapper test file) — unit-test `toEventDetail`: real `screenings[0].movie` → detail fields; cast/directors extraction (directing-department filter); `deriveScreeningFormats`; sold-out derivation; and no-screenings/no-movie/no-venue resilience.

## Tasks & Acceptance

**Execution:**

- [x] `events-manager/.../services/events.ts` — add `DETAIL_POPULATE` (deep) and use it only in `findEvent`; leave `EVENT_POPULATE`/`findEvents`/`findTrending` unchanged.
- [x] `events-manager/.../services/__tests__/events.unit.test.ts` — assert `findEvent` passes the deep `DETAIL_POPULATE` to `findOne`; keep non-cinema/absent ⇒ null.
- [x] `features/events/types/strapi.types.ts` — add real cast/credit/video/geo types and extend `StrapiCreativeWork`/`StrapiScreening`/`StrapiVenue` to the real detail shape (legacy fields kept deprecated).
- [x] `features/events/utils/eventMappers.ts` — add `EventDetailData` + `toEventDetail(event, locale)` (film/showtimes/format-badges/cast/directors/venue, resilient); migrate `toFilmHeroEvent` to real `screenings[0].movie`.
- [x] `features/events/components/EventDetailPage/EventDetailPage.tsx` — consume `toEventDetail`; render hero via `FilmHero`; fix `ShowtimeButton` to the real `venueName`/`formats`/`status`/`onSelect` API; showtimes from real `screenings`; remove all legacy-field reads.
- [x] `lib/strapi-api/content/server.ts` — drop the dead legacy populate from `getEventByDocumentId`; realign `getRelatedEventsByParams` to real same-venue-upcoming fields.
- [x] `app/[locale]/events/[documentId]/page.tsx` — real-field metadata + breadcrumb; thread `getTranslations("events")` labels into `<EventDetailPage>`; pass `venueDocumentId` (not `creativeWorkType`) to related-events fetch.
- [x] `locales/{en,ar}.json` — ensure/add the `events.*` detail-label keys at FR parity.
- [x] `features/events/utils/eventMappers.test.ts` (Vitest) — cover `toEventDetail` mapping, cast/director extraction, format derivation, sold-out, and partial-data resilience.

**Acceptance Criteria:**

- Given a visitor taps an EventCard, when the detail page loads for a published cinema event, then a FilmHero with the film's poster/backdrop, the synopsis, cast & directors, the venue with its address, and all screenings (as tappable showtimes) render — all sourced from the real `screenings[].movie` / `venue` schema, not legacy fields.
- Given the detail page renders, when a showtime is tapped, then ticket purchase is initiated by navigating to the ticketing entrypoint for that event + screening (the purchase flow itself is Epic 6).
- Given a request for an unknown or non-cinema documentId, when the route resolves, then `notFound()` renders the not-found page (never a 500 or an empty shell).
- Given the page is served, when its HTML is inspected, then SEO meta tags (title/description/canonical/OG/Twitter), event JSON-LD, and breadcrumb JSON-LD are present and derived from the real film/event fields; the URL (`/{locale}/events/{documentId}`) is stable and shareable.
- Given the `ar` locale, when the page renders, then layout is `dir="rtl"` with localized `events.*` labels and a direction-aware back control; no hardcoded French remains.
- Given an event with no populated movie or no screenings, when the page renders, then it degrades gracefully (event-image hero, no-showtimes state, omitted cast/crew) without throwing.

## Spec Change Log

(none — no bad_spec loopback)

## Review Triage Log

### 2026-07-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 2, low 2)
- defer: 1
- reject: 12
- addressed_findings:
  - `[medium]` `[patch]` **Synopsis rendered raw richtext markup on-page and in the share text.** The migration pointed `synopsis` at the real richtext `movie.synopsis` (HTML/markup) while `generateMetadata` stripped markup but the visible page + Web-Share `text` did not, so users saw literal `<p>…</p>` tags (and truncation counted markup chars / cut mid-tag). Fixed by adding a pure `stripMarkup` helper in `eventMappers.ts` and stripping inside `toEventDetail`, so `detail.synopsis` is always plain text for both the on-page render and the share payload; mapper test updated to assert the stripped output.
  - `[medium]` `[patch]` **Arabic-audio screenings mislabelled `VF` (Version Française).** `deriveScreeningFormats` treated Arabic (a "local" language) as a French dub, so a native Arabic film with no subtitles got a "French version" badge. Narrowed the dub set to French-only (`FRENCH_DUB_LANGUAGES`); non-French audio with no subtitles now correctly derives `VO` (original version). Codifying test updated (`Arabic → ["VO"]`).
  - `[low]` `[patch]` **Sticky-CTA price dropped the "from" qualifier.** The rewrite rendered a bare `12 TND`, implying a fixed price for multi-price events, while the existing `priceFrom` i18n key sat unused. Added `priceFrom` to `EventDetailPageLabels` + the route's next-intl bundle and used it in the CTA ("À partir de 12 TND" / "From 12 TND" / AR).
  - `[low]` `[patch]` **FilmHero rendered a bare, unlabelled "1" venue count.** Wiring `FilmHero` on a single-venue detail page surfaced a lone primary-colored "1". Fixed at the detail call site by passing `venueCount: undefined` (the venue has its own section below); the shared `toFilmHeroEvent` mapper is untouched so the homepage heroes keep their real venue counts.
  - Deferred (1): `EventDetailPageDesktop` / `EventDetailPageWithMap` still read the legacy `event.creativeWork` (which the new `DETAIL_POPULATE` no longer populates) — latent since the route renders neither; only type-patched for the `cast` shape change. Logged to `deferred-work.md`.
  - Rejected (12): `formatTime` ignores locale/timezone (uses the shared `dates.ts` helper; HH:mm Western numerals is project-compliant; the tz behavior is app-wide and unchanged from the prior `toLocaleTimeString` call, not this story's regression); showtimes grouped by UTC-date slice vs local display (pre-existing grouping pattern carried over, low near-midnight edge); `minPrice` can reflect a sold-out screening (pre-existing `getMinEventPrice`; low); sticky CTA active when every showtime is sold out (same gating as the prior implementation; the sold-out state is visible on each button); dead `ticketsAvailable`/`dateRange` labels (cosmetic dead plumbing); "event not found" title now generic-but-localized (acceptable trade-off over the old hardcoded French); `populate: DETAIL_POPULATE } as never` widens the cast (consistent with the established `findEvents … as never` precedent); one-film-per-event assumption in `getEventFilm` (spec-sanctioned by-design — the Block-If for mixed-movie events was not triggered by any evidence); related-events returns `[]` without a venue (spec by-design — same-venue-upcoming is the only real relation); undated-screening sort order (anomalous data — screenings carry `startDateTime`; low); duplicate director if the same person holds two directing credits (rare; low); dubbed-and-subtitled screening labelled `VOST` (reasonable nuance — subtitles present ⇒ VOST).

## Design Notes

**One event = one film, many screenings.** A `movie_screening` event points (via each `screening.movie`) at a single film; multiple screenings are its showtimes. So the detail "film" is `event.screenings[0].movie` and the showtime list is `event.screenings` sorted by `startDateTime`. The AC's "showtimes grouped by venue" collapses to one venue block (an event has exactly one `venue`, manyToOne) containing its screenings — cross-venue grouping is a list/aggregate concern, not a single-event detail. (Block only if seeded cinema events legitimately mix different movies across screenings.)

**Detail populate is separate from browse populate.** The browse list must stay shallow (`venue`, `screenings`, `images`) for performance across large result sets; only the single-event `findEvent` pays for the deep `screenings.movie.{cast,credits,poster,videos,…}` + `venue.cityRef.region` populate. Two constants, one used per path.

**Format badge derivation (screening → `ShowtimeFormat[]`):** map `videoFormat` (`threeD→3D`, `imax→IMAX`, `fourDX→4DX`, `standard→∅`) and the audio/subtitle pair (original audio + subtitles ⇒ `VOST`; local-dubbed ⇒ `VF`; original, no subs ⇒ `VO`) into the `ShowtimeButton` `formats` array. Best-effort: unknown values contribute no badge, never throw. Align the exact tokens to the real `ShowtimeFormat` union.

**Types-then-mapper decoupling.** Aligning `strapi.types.ts` to the real cast/credit/video shapes and funneling the view through a `toEventDetail` mapper (the `toEventCardEvent` precedent) means the `EventDetailPage` view never reads raw schema relations directly — future schema churn is absorbed in one mapper, and the mapper is unit-testable in isolation (no server/React deps).

**Directors from credits, not a relation.** The real creative-work has no `directors` relation; directors are `credits[]` entries whose `creditRole.department === "directing"` (or role slug `director`). Cast members are `cast[].person` with an optional `character`. The mapper flattens both into simple `{ name, photoUrl, role? }` lists for the view.

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. the new `toEventDetail` mapper tests.
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in story-changed files (known pre-existing repo baseline).
- `yarn workspace @tiween/client lint` — expected: exit 0, no new errors.
- `yarn workspace @tiween/client build` — expected: the `/[locale]/events/[documentId]` route still compiles.
- `cd apps/strapi && yarn type-check && yarn test --testPathPattern events.unit` — expected: PASS incl. the deep-populate `findEvent` assertion.

**Manual checks (if no CLI):**

- With Strapi running the 3.1a API (`cd apps/strapi && yarn seed:fresh && yarn develop`), `curl '/api/events-manager/events/<documentId>'` — expected: `data.screenings[].movie` populated with poster/synopsis/cast/credits and `data.venue.cityRef.region` present; unknown id ⇒ 404 `EVENT_NOT_FOUND`. In the browser, `/fr/events/<documentId>` and `/ar/events/<documentId>` — expected: hero with poster/backdrop, synopsis, cast/directors, tappable showtimes with format badges, venue address; RTL on `ar`; a bad id ⇒ the not-found page.

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.7 (Event Detail Page) as a cross-layer **fix-and-wire migration** onto the real Story-3.1a schema. The full detail feature already existed (route `[locale]/events/[documentId]`, `getEventByDocumentId`, `EventDetailPage`, SEO + JSON-LD) but read the removed legacy fields (`event.creativeWork`, `event.showtimes`, `event.startDate/endDate`, `venue.city`) and called `ShowtimeButton` with a stale prop API, so it rendered empty/broken against the real backend. **Backend:** added a deep, detail-only `DETAIL_POPULATE` used solely by `findEvent` (list `EVENT_POPULATE` stays shallow) reaching `screenings.movie.{poster,backdrop,videos,genres,cast.person,cast.character,credits.person,credits.creditRole}`, `venue.{cityRef.region,geo}`, `images`. **Frontend:** aligned `strapi.types.ts` to the real movie/cast/credit/video/geo shapes; added a pure, unit-tested `toEventDetail(event, locale)` mapper (film = `screenings[0].movie`; showtimes from `screenings` with a `deriveScreeningFormats` VF/VOST/VO + 3D/IMAX/4DX badge helper; cast from `movie.cast[].person`; directors from `movie.credits` filtered to the directing department; synopsis stripped of richtext markup; venue address/city/region; resilient fallbacks); rewired `EventDetailPage` to consume the mapper, render the hero via `FilmHero`, and drive `ShowtimeButton` with its real `venueName`/`formats`/`status`/`onSelect` API (a showtime tap navigates to the ticketing entrypoint); dropped the dead legacy populate from `getEventByDocumentId` and realigned `getRelatedEventsByParams` to same-venue-upcoming; migrated `generateMetadata`/breadcrumb to real fields and threaded next-intl `events.*` labels into the route (no hardcoded French). Slug-based routing, the interactive map (3.8), watchlist persistence (Epic 5), and the purchase flow (Epic 6) are out of scope and logged to `deferred-work.md`.

**Files changed.**

- [apps/strapi/.../events-manager/server/src/services/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/events.ts) — `DETAIL_POPULATE` (deep) used only by `findEvent`; browse populate/list/trending unchanged.
- [apps/strapi/.../events-manager/server/src/services/**tests**/events.unit.test.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/__tests__/events.unit.test.ts) — asserts `findEvent` passes the deep `DETAIL_POPULATE`.
- [apps/client/src/features/events/types/strapi.types.ts](../../apps/client/src/features/events/types/strapi.types.ts) (+ [types/index.ts](../../apps/client/src/features/events/types/index.ts)) — real cast/credit/video/geo types; `StrapiCreativeWork`/`StrapiVenue` extended.
- [apps/client/src/features/events/utils/eventMappers.ts](../../apps/client/src/features/events/utils/eventMappers.ts) (+ [utils/index.ts](../../apps/client/src/features/events/utils/index.ts)) — `EventDetailData` + `toEventDetail`, `deriveScreeningFormats`, `getEventFilm`, `stripMarkup`; `toFilmHeroEvent`/`getEventBackdropUrl` migrated to real `screenings[0].movie`.
- [apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx](../../apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx) — consumes `toEventDetail`; `FilmHero` hero; real `ShowtimeButton` API; markup-stripped synopsis; `priceFrom` CTA copy.
- [apps/client/src/lib/strapi-api/content/server.ts](../../apps/client/src/lib/strapi-api/content/server.ts) — `getEventByDocumentId` drops dead populate; `getRelatedEventsByParams` realigned to same-venue-upcoming.
- [apps/client/src/app/[locale]/events/[documentId]/page.tsx](../../apps/client/src/app/[locale]/events/[documentId]/page.tsx) — real-field metadata + breadcrumb; next-intl `events.*` labels; `venueDocumentId` related-events.
- Ripple (from the `cast` component-shape change): [EventDetailPageDesktop.tsx](../../apps/client/src/features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx), [EventDetailPageWithMap.tsx](../../apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx), [lib/seo/structured-data.ts](../../apps/client/src/lib/seo/structured-data.ts), [lib/algolia/events.ts](../../apps/client/src/lib/algolia/events.ts) (+ its test) — type-only, behavior-preserving.
- Tests: [eventMappers.test.ts](../../apps/client/src/features/events/utils/eventMappers.test.ts) — 31 mapper tests (`deriveScreeningFormats`, `toEventDetail` mapping/cast/directors/format/venue/resilience, `toFilmHeroEvent`).

**Review findings breakdown.** 4 patches applied (2 medium: on-page + share synopsis now markup-stripped; Arabic audio no longer mislabelled `VF` — French-dub-only, else `VO`. 2 low: `priceFrom` "from" qualifier restored on the sticky CTA; `FilmHero` no longer shows a bare "1" venue count on the single-venue detail). 1 deferred (legacy `creativeWork` reads still in the unused Desktop/Map detail variants — logged). 12 rejected as by-design / spec-sanctioned / pre-existing / consistent-with-codebase / low-consequence edges. No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0). `followup_review_recommended: true` — this is a broad (~1900-line) migration whose real-schema deep-populate + mapper path cannot be exercised without a live Strapi + seed, and the review surfaced real user-visible presentation issues (raw markup, wrong version badge) that mocked unit tests missed; an independent follow-up pass is warranted.

**Verification performed (all independently re-run post-patch).**

- `yarn workspace @tiween/client test --run` → PASS **146/146** (8 files; `eventMappers.test.ts` = 31).
- `yarn workspace @tiween/client typecheck` → **79** total vs **83** baseline (confirmed by a stash-based baseline diff): **0 net-new** in changed files, and 4 pre-existing `EventDetailPage.tsx` errors were _fixed_. Residual errors in touched files are pre-existing baseline (`server.ts` locale-union/coordinates typing untouched by this story; `page.tsx` the known `EventSchema`→`JsonLd.data` contract quirk).
- `yarn workspace @tiween/client lint` → **0 errors** (282 warnings, down from 284 baseline).
- `cd apps/strapi && yarn type-check` → exit 0.
- `apps/strapi` `events.unit` → PASS **50/50** (49 baseline + 1 new DETAIL_POPULATE assertion), run via a temporary CJS mirror of `jest.config.ts` since `ts-node` is absent in this environment (the documented Story-3.6 tooling gap; temp file removed).

**Residual risks.**

- Not exercised against a live Strapi + seed (not bootable here). The deep `DETAIL_POPULATE` and the real-schema mapper are covered only by mocked unit tests asserting the exact populate graph and field derivation. Recommend `yarn seed:fresh && yarn develop` + `curl '/api/events-manager/events/<documentId>'` (verify `screenings[].movie` cast/credits/poster and `venue.cityRef.region` populated) and a browser pass of `/fr/events/<id>` + `/ar/events/<id>` when an instance is available.
- The showtime "begin purchase" navigation targets a ticketing route that does not exist until Epic 6 (by design).
- `getEventFilm` assumes one film per `movie_screening` event (spec-sanctioned); if seed data mixes different movies across an event's screenings, the hero/cast reflect only the first — the escalation condition to revisit.
