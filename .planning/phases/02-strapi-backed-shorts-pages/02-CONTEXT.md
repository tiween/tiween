# Phase 2: Strapi-Backed Shorts Pages - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning

<domain>
## Phase Boundary

`/[locale]/shorts` and `/[locale]/shorts/[slug]` read real short films from the Phase 1 public API (`/api/creative-works/creative-works/short-films`), in the visitor's language with French fallback, on a complete detail page (crew grid, access-type sub-label, original title / country / language), with a real watchlist heart on the detail page and on directory cards, and honest error states. No production code path imports `mock-shorts.ts`.

Out of this phase: any filters or facets (Phase 3, Meilisearch), the finished directory visual pass, sort UI, suggestion form backend (Phase 4), SEO/metadata localization and sitemap (Phase 5), go-live linking and indexing (Phase 6, pages stay `noindex` and unlinked).

Requirements: SPAGE-01, SPAGE-02, SPAGE-03, SPAGE-04, SPAGE-05, FR19, FR20, FR21, FR56.

</domain>

<decisions>
## Implementation Decisions

### Directory page in this phase

- **D-01:** `/shorts` renders the existing grid composition `ShortsDirectory` (uses `ShortFilmCard`, has built-in error + retry), fed by the Strapi list. Consistent with the 2026-11-09 owner decision: `/shorts` opens on one 2:3 poster grid, no featured hero, no latest row.
- **D-02:** Delete `app/[locale]/shorts/_components/ShortsShowcase.tsx` in this phase (it uses physical left/right positioning that breaks RTL, non-locale `next/link`, raw black/white and `shadow-lg`, and duplicates the card). Remove its tests/stories with it. This resolves the PROJECT.md open decision "ShortsShowcase vs ShortsDirectory" (ShortsDirectory wins).
- **D-03:** Paging: server-render the first page (API default `pageSize` 24), then a "Load more" button fetches the next page client-side through a Next.js route handler that calls the same server fetcher. Load-more failures show an inline retry and keep the films already shown.
- **D-04:** **No filters or genre chips in Phase 2** (owner: "use Meilisearch for facets"). Genre and every other facet arrive in Phase 3 through Meilisearch, so there is one filter engine. Any existing filter UI in `ShortsDirectory`/`ShortsFilters` is hidden or not rendered on the live page in this phase (do not wire it to the Strapi `genre` param). Sort UI is also not part of this phase; the list uses the API default `publishedAt:desc`.

### Freshness, build and failures

- **D-05:** Time-based ISR: `revalidate: 60` on shorts fetches (matches events). Every shorts fetch carries cache tags (e.g. `short-films`, `short-film:<slug>`) so an on-demand revalidation webhook can be added later without rework. No webhook route in this phase.
- **D-06:** No build-time pre-rendering: drop the mock-based `generateStaticParams` on `[slug]`; pages render on first request and are cached (`dynamicParams` on). A deploy must never depend on Strapi being reachable.
- **D-07:** Error vs not-found are distinct. Only the API's `SHORT_FILM_NOT_FOUND` (404) maps to `notFound()`. Any other failure (network, 5xx, timeout) renders an error state with retry on both the detail page and the directory; an outage is never shown as "no short films" or as a 404. Copy follows the voice rules (calm, offers a next action, never apologises) via `t('errors.<CODE>')`.
- **D-08:** Rewrite `lib/strapi-api/content/shorts.ts` in place against the plugin routes (list, `/:slug`, `/:slug/related`; `/featured` only if a consumer remains). Fetchers raise typed errors (carrying the API's `error.details.code`) instead of returning empty/null. Send only allowlisted params (`locale`, `page`, `pageSize`, `sort`), since the API is `.strict()` and any unknown key is a 400. Delete functions with no consumer (`searchShortFilms`, genres fetcher, etc.); `lib/algolia/shorts.ts` is left for Phase 3 to remove.

### Detail page content

- **D-09:** Crew role labels come from the client's `locales/{fr,ar,en}.json`, keyed by `creditRole.slug`; an editor's `customRole` wins when set. An unknown slug falls back to a humanized slug, never blank. No backend change.
- **D-10:** The "Equipe artistique" grid lists every non-cast credit, grouped in a fixed department order with directing first, sorted by `billing` within a department. Directors also stay in the hero meta line. The section is omitted when there are no credits.
- **D-11:** Missing-translation fallback is silent: the API already overlays title/synopsis/poster from the requested locale and reports the served locale in `item.locale`. When the served locale differs from the page locale, the fallback text nodes carry `lang="fr"` (and `dir="ltr"` inside an Arabic page) so screen readers and fonts switch correctly. No visible label.
- **D-12:** Cast and crew avatars are a brand-styled initials disc (no person photos; the API does not expose them). No API change this phase.

### Watchlist on shorts

- **D-13:** Card heart: its own 44px button at the poster's top-end corner, stacked above the card `<Link>` as an independent target (the same pattern as the card's trailer button), filled Gold Leaf when saved, with an accessible label per state. **The current duration badge sits at the top-end corner; move it** (e.g. into the bottom meta row or the top-start stack under the featured badge). The planner picks the spot, and the card mockup confirms it.
- **D-14:** Signed-out tap reuses the events flow (`useAddToWatchlist`): a "sign in to save" toast, then redirect to `/${locale}/auth/signin?callbackUrl=<current page>`. Never a local toggle that forgets.
- **D-15:** Offline taps reuse the events offline queue, which syncs on reconnect, with optimistic UI.
- **D-16:** The watchlist page shows saved short films in the same list as events, with a "Court métrage" type label (translated), linking to `/[locale]/shorts/<slug>`.

### Navigation (owner, mockup review 2026-11-10)

- **D-17:** Ticket features are not available at launch. Remove the "Billets" (tickets) entry from the public bottom nav (`src/components/layout/BottomNav/BottomNav.tsx`, today an unconditional tab) and from the desktop header links. Gate it behind a new client flag (e.g. `NEXT_PUBLIC_TICKETING_ENABLED`, default off) so ticketing can return without redesign. The `/tickets` route code stays, because ticketing is dormant and never deleted; it is just unlinked. The bottom nav becomes three tabs (Accueil, Recherche, Compte), as on the approved boards.

### Resolved after research (orchestrator, 2026-11-10; owner asked not to be re-asked)

- **D-18:** Watchlist entries for short films show the default-locale (French) title on `/ar` and `/en` in this phase; a locale overlay is a later follow-up.
- **D-19:** Language display: `ber` gets explicit copy ("berbère" / "البربرية" / "Berber"); `aeb` uses the UI-SPEC override; the value `none` is dropped silently; never call `Intl.DisplayNames` with an unvalidated code (it throws on `none`).
- **D-20:** Directory outage renders the error UI after hydration with HTTP 200 (accepted); the detail page returns a true 500 from the layout-level fetch. A failing related-films shelf is omitted softly and never fails the page.
- **D-21:** No shadcn `avatar` install (its `@radix-ui/react-avatar` dependency was flagged too-new). The initials disc is a plain styled element; `empty` may be added from the official registry.

### Claude's Discretion

- Whether the watchlist hooks move from `features/events/hooks` to a shared `features/watchlist` module or are imported cross-feature (prefer moving if the diff stays small).
- The exact client `ShortFilm` type reshape (add `credits`, `videos`, `crew`, `accessType`, `country: string[]`, `language: string[]`, the full 10-value platform enum) and mapper structure, mirroring `features/events/utils/eventMappers.ts` (directors from `department === "directing"` credits by billing; trailer from `videos.find(videoType === "trailer")`).
- Country/language display names via `Intl.DisplayNames` in the page locale (Phase 1 D-01), with Western digits.

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `features/shorts/components/ShortsDirectory/ShortsDirectory.tsx`: grid plus error/retry UI (unused by any page today).
- `features/shorts/components/ShortFilmCard/ShortFilmCard.tsx`: 2:3 card; the whole card is one `<Link>` (l.256), and the trailer button is already an independent target above it. Duration badge at the top-end corner (l.152-158).
- `features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx` (749 lines): hero, synopsis, distinctions, where-to-watch, cast rail, related, sticky bar. Heart is local `useState` (l.102, 126-146). Crew grid and `accessType` marked "Deferred" (l.85-87). Reads `film.trailer` (l.162) and `film.directors` (l.292).
- `features/watchlist/components/WatchlistButton/WatchlistButton.tsx`: presentational heart (`isWatchlisted`, `isLoading`, `onToggle`, `size`, `variant`, `labels`).
- `features/events/hooks/useWatchlist.ts` (`useWatchlistCheck`, `useWatchlistToggle`, mutations), `useAddToWatchlist.ts` (signed-out → toast + sign-in redirect; offline → queue), `useRemoveFromWatchlist.tsx`.
- `features/events/utils/eventMappers.ts:377-387`: the credits→directors and videos→trailer mapper pattern.
- `app/[locale]/error.tsx` (boundary with reset), `components/common/EmptyState`.
- `features/shorts/components/ReservedArtwork.tsx`: stripe frame for posterless films (all 13 launch films have no 2:3 poster).

### Established Patterns

- `BaseStrapiClient.fetchAPI` (`lib/strapi-api/base.ts:36-94`): `next.revalidate` default 60 (0 in dev); passes `requestInit.next` through, so tags work. Throws `Error(JSON.stringify({name,message,details,status}))` on non-OK.
- `PublicClient` (`lib/strapi-api/public.ts`) hits `${STRAPI_URL}/api…` with a read-only auth header; `/api/public-proxy` when `useProxy`.
- Event detail wraps its fetcher in React `cache()` and sends `locale` (`content/server.ts:165-184`). Note it maps any error to `notFound()`, which D-07 deliberately does not copy.
- Dates through `lib/dates.ts`; minute counts via `formatCount` + ICU `durationMinutes`; Arabic uses Western digits.

### Integration Points

- Public API contract (Phase 1): list `?locale&page&pageSize(≤48)&sort(publishedAt|releaseYear|duration|title :asc|:desc)` (+ `genre`, unused here), detail `/:slug?locale`, related `/:slug/related?locale` (≤6), featured `/featured?locale` (≤12). Error envelope `error.details.code`: `VALIDATION_FAILED`, `UNSUPPORTED_LOCALE` (400), `SHORT_FILM_NOT_FOUND` (404), `INTERNAL_ERROR` (500). Summary items include derived `directors`, `availableOnline` and `hasAwards`; detail adds `credits`, `cast`, `distinctions`, `videos`, `streamingLinks{platform,url,accessType,label}`, `photos`, `rating` and `ageRating`.
- Strapi watchlist (`user-engagement` plugin): `GET/POST /watchlist`, `POST /watchlist/toggle`, `DELETE /watchlist/:creativeWorkId`, `GET /watchlist/check/:creativeWorkId`, keyed by creative-work `documentId`; any creative-work type.
- `app/api/shorts/route.ts` is the only consumer of the old fetchers; it becomes the load-more handler (or is replaced by one).
- Translations: `apps/client/locales/{fr,ar,en}.json` (`shorts` namespace; add crew-role keys, the access-type labels, the `Court métrage` label and error codes).

</code_context>

<specifics>
## Specific Ideas

- Pages stay `noindex` and unlinked from navigation until the Phase 6 go-live switch (`main` auto-deploys to production).
- Every UI change needs owner-approved mockups before code (project build rule: phase `DESIGN.md` + `EXPERIENCE.md` with `mockup_status: approved`). Surfaces touched: detail page (crew grid, access-type sub-label, hero meta line with original title/country/language, real heart, error state), card (heart plus relocated duration badge), directory (error state, load more), watchlist page (short-film entry with type label).
- Tiween DS (Gold Leaf × Aubergine, `apps/client/DESIGN.md`) applies; gold marks the heart only in the saved/active state. Use logical properties for RTL.

</specifics>

<deferred>
## Deferred Ideas

- Genre chips and all facets → Phase 3 via Meilisearch (owner decision 2026-11-10).
- On-demand revalidation webhook from Strapi on publish/unpublish → later. Cache tags are added now so it is a small follow-up.
- Person photos in the public API (real cast/crew avatars) → later.
- Visible "Version française" fallback label → not planned (silent lang-tagged fallback chosen).

</deferred>
