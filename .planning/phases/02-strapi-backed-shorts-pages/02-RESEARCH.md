# Phase 2: Strapi-Backed Shorts Pages - Research

**Researched:** 2026-11-10
**Domain:** Next.js 16.1 App Router rendering/caching + Strapi v5 public short-film API consumption + react-query watchlist integration (apps/client, one small apps/strapi change)
**Confidence:** HIGH (rendering/caching behaviour was reproduced on a throwaway Next 16.1.1 app; API contract read from source; two items MEDIUM, see Assumptions Log)

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Directory page in this phase

- **D-01:** `/shorts` renders the existing grid composition `ShortsDirectory` (uses `ShortFilmCard`, has built-in error + retry), fed by the Strapi list. Consistent with the 2026-11-09 owner decision: `/shorts` opens on one 2:3 poster grid, no featured hero, no latest row.
- **D-02:** Delete `app/[locale]/shorts/_components/ShortsShowcase.tsx` in this phase (it uses physical left/right positioning that breaks RTL, non-locale `next/link`, raw black/white and `shadow-lg`, and duplicates the card). Remove its tests/stories with it. This resolves the PROJECT.md open decision "ShortsShowcase vs ShortsDirectory" (ShortsDirectory wins).
- **D-03:** Paging: server-render the first page (API default `pageSize` 24), then a "Load more" button fetches the next page client-side through a Next.js route handler that calls the same server fetcher. Load-more failures show an inline retry and keep the films already shown.
- **D-04:** **No filters or genre chips in Phase 2** (owner: "use Meilisearch for facets"). Genre and every other facet arrive in Phase 3 through Meilisearch, so there is one filter engine. Any existing filter UI in `ShortsDirectory`/`ShortsFilters` is hidden or not rendered on the live page in this phase (do not wire it to the Strapi `genre` param). Sort UI is also not part of this phase; the list uses the API default `publishedAt:desc`.

#### Freshness, build and failures

- **D-05:** Time-based ISR: `revalidate: 60` on shorts fetches (matches events). Every shorts fetch carries cache tags (e.g. `short-films`, `short-film:<slug>`) so an on-demand revalidation webhook can be added later without rework. No webhook route in this phase.
- **D-06:** No build-time pre-rendering: drop the mock-based `generateStaticParams` on `[slug]`; pages render on first request and are cached (`dynamicParams` on). A deploy must never depend on Strapi being reachable.
- **D-07:** Error vs not-found are distinct. Only the API's `SHORT_FILM_NOT_FOUND` (404) maps to `notFound()`. Any other failure (network, 5xx, timeout) renders an error state with retry on both the detail page and the directory; an outage is never shown as "no short films" or as a 404. Copy follows the voice rules (calm, offers a next action, never apologises) via `t('errors.<CODE>')`.
- **D-08:** Rewrite `lib/strapi-api/content/shorts.ts` in place against the plugin routes (list, `/:slug`, `/:slug/related`; `/featured` only if a consumer remains). Fetchers raise typed errors (carrying the API's `error.details.code`) instead of returning empty/null. Send only allowlisted params (`locale`, `page`, `pageSize`, `sort`), since the API is `.strict()` and any unknown key is a 400. Delete functions with no consumer (`searchShortFilms`, genres fetcher, etc.); `lib/algolia/shorts.ts` is left for Phase 3 to remove.

#### Detail page content

- **D-09:** Crew role labels come from the client's `locales/{fr,ar,en}.json`, keyed by `creditRole.slug`; an editor's `customRole` wins when set. An unknown slug falls back to a humanized slug, never blank. No backend change.
- **D-10:** The "Equipe artistique" grid lists every non-cast credit, grouped in a fixed department order with directing first, sorted by `billing` within a department. Directors also stay in the hero meta line. The section is omitted when there are no credits.
- **D-11:** Missing-translation fallback is silent: the API already overlays title/synopsis/poster from the requested locale and reports the served locale in `item.locale`. When the served locale differs from the page locale, the fallback text nodes carry `lang="fr"` (and `dir="ltr"` inside an Arabic page) so screen readers and fonts switch correctly. No visible label.
- **D-12:** Cast and crew avatars are a brand-styled initials disc (no person photos; the API does not expose them). No API change this phase.

#### Watchlist on shorts

- **D-13:** Card heart: its own 44px button at the poster's top-end corner, stacked above the card `<Link>` as an independent target (the same pattern as the card's trailer button), filled Gold Leaf when saved, with an accessible label per state. **The current duration badge sits at the top-end corner; move it** (e.g. into the bottom meta row or the top-start stack under the featured badge). The planner picks the spot, and the card mockup confirms it.
- **D-14:** Signed-out tap reuses the events flow (`useAddToWatchlist`): a "sign in to save" toast, then redirect to `/${locale}/auth/signin?callbackUrl=<current page>`. Never a local toggle that forgets.
- **D-15:** Offline taps reuse the events offline queue, which syncs on reconnect, with optimistic UI.
- **D-16:** The watchlist page shows saved short films in the same list as events, with a "Court métrage" type label (translated), linking to `/[locale]/shorts/<slug>`.

#### Navigation (owner, mockup review 2026-11-10)

- **D-17:** Ticket features are not available at launch. Remove the "Billets" (tickets) entry from the public bottom nav (`src/components/layout/BottomNav/BottomNav.tsx`, today an unconditional tab) and from the desktop header links. Gate it behind a new client flag (e.g. `NEXT_PUBLIC_TICKETING_ENABLED`, default off) so ticketing can return without redesign. The `/tickets` route code stays, because ticketing is dormant and never deleted; it is just unlinked. The bottom nav becomes three tabs (Accueil, Recherche, Compte), as on the approved boards.

### Claude's Discretion

- Whether the watchlist hooks move from `features/events/hooks` to a shared `features/watchlist` module or are imported cross-feature (prefer moving if the diff stays small).
- The exact client `ShortFilm` type reshape (add `credits`, `videos`, `crew`, `accessType`, `country: string[]`, `language: string[]`, the full 10-value platform enum) and mapper structure, mirroring `features/events/utils/eventMappers.ts` (directors from `department === "directing"` credits by billing; trailer from `videos.find(videoType === "trailer")`).
- Country/language display names via `Intl.DisplayNames` in the page locale (Phase 1 D-01), with Western digits.

### Deferred Ideas (OUT OF SCOPE)

- Genre chips and all facets → Phase 3 via Meilisearch (owner decision 2026-11-10).
- On-demand revalidation webhook from Strapi on publish/unpublish → later. Cache tags are added now so it is a small follow-up.
- Person photos in the public API (real cast/crew avatars) → later.
- Visible "Version française" fallback label → not planned (silent lang-tagged fallback chosen).
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                                                                              | Research Support                                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPAGE-01 | `/[locale]/shorts` and `/[locale]/shorts/[slug]` read from Strapi; unknown/unpublished slug returns 404; `mock-shorts.ts` imported by no production path | Rendering model (dynamic route + `connection()` on the directory), layout-level 404 guard (a plain `loading.tsx` turns the 404 into a 200 soft-404, verified), mock-import guard test                            |
| SPAGE-02 | Mapper reads `credits[]`/`videos[]`; no phantom fields; no 400s; mapper unit tests                                                                       | Verified API contract + mapper skeleton + strict-param fetcher; vitest include-glob gap for `src/features/shorts/utils`                                                                                          |
| SPAGE-03 | "Equipe artistique" crew grid and access-type sub-label                                                                                                  | Credit/department/role contract, `t.has` humanized-slug fallback, `accessType` enum, 10-value platform enum                                                                                                      |
| SPAGE-04 | Original title, country, language on the detail hero                                                                                                     | `Intl.DisplayNames` behaviour probed on Node 22/ICU 77 (`aeb` missing in `ar`, `ber` unresolved, `none` throws)                                                                                                  |
| SPAGE-05 | Outages distinguishable from empty; error state with retry                                                                                               | Verified: first-render failure on an ISR route is a bare-text 500 (no UI); on a dynamic route the failed fetch is not cached and `error.tsx` renders after hydration; retry needs `router.refresh()` + `reset()` |
| FR19     | Signed-in user adds from detail and card; heart independent from link; signed-out invited to sign in                                                     | Watchlist hook reuse plan, one grid-level list query seeding per-card check keys, optimistic-add gap in `useAddToWatchlist`, open-redirect hardening                                                             |
| FR20     | Remove persists across navigation/devices                                                                                                                | `useRemoveFromWatchlist` (optimistic, Undo) reuse; list/check invalidation; sign-out cache prefix                                                                                                                |
| FR21     | Watchlisted short films appear on the watchlist page                                                                                                     | `GET /watchlist` already populates `creativeWork` scalars (slug, type, duration, releaseYear); client type + card branch; boot-test assertion; optional field allowlist                                          |
| FR56     | Locale content with French fallback, never blank                                                                                                         | API overlay semantics read from source; `item.locale` granularity limit (title and synopsis fall back independently, API reports one locale)                                                                     |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **GSD is the planning system.** `_bmad-output/` is a starting point only; do not run or recreate BMad workflows or `openspec/`. Delete matching BMad content once a decision is resolved in `.planning/`.
- **Plugin-first (owner directive 2026-10-22):** new Strapi backend/admin code goes in a local plugin under `apps/strapi/src/plugins/`, never `src/api/`. Exceptions need `plugin_waiver: "<reason>"` in plan frontmatter. The only backend touch this phase (watchlist payload hardening, optional) belongs in `user-engagement`.
- **Design docs before build:** `02-DESIGN.md` + `02-EXPERIENCE.md` exist and `mockup_status: approved` (EXPERIENCE frontmatter, 2026-11-10). Build may proceed. The public site uses the Tiween DS (`apps/client/DESIGN.md`), shadcn/ui new-york, never direct `@radix-ui` imports in app code (memory: "shadcn, not Radix").
- **Kernel (`docs/context/kernel.md`, read this session):** Yarn 1 only; lint is `--max-warnings=0`; co-located tests, never a `__tests__/` directory in `apps/client`; translations live in `apps/client/locales/`; Arabic uses Western digits and `DD/MM/YYYY`; APIs return error codes, translated with `t('errors.<CODE>')`; address documents by `documentId`; per-user query keys carry `userId` and logout clears via `signOutAndClearCache`; keep `import "server-only"` on Strapi fetchers; ship from `main`, no PRs; never delete dormant ticketing code; never add Redis or replicas > 1.
- **Strapi admin UI is en/fr only** (memory) and not touched in this phase.
- **Enforcement:** blocking gates exist in `tools/gsd-capabilities/tiween-build-rules/` after planning; plans must carry frontmatter that satisfies them (plugin waiver if any `src/api` change; design-doc approval already met).

## Summary

The phase is mostly client work against an API that is already finished and strict. The API contract (read from `apps/strapi`) is flat Strapi-v5 JSON with an allowlist projection: summary items carry derived `directors`, `availableOnline`, `hasAwards`; detail adds `credits`, `cast`, `distinctions`, `videos`, `streamingLinks`. Any unknown query key is a coded 400, so the rewritten fetchers must send exactly `locale`, `page`, `pageSize`, `sort` and never Strapi-style nested `pagination`/`filters`/`populate`. The old fetcher failed for exactly that reason.

The most consequential finding is about **how Next 16.1 renders and caches** these pages, because D-05/D-06/D-07 and SPAGE-05 all hinge on it. I reproduced the behaviours on a throwaway Next 16.1.1 app (webpack build; evidence in "Verified Next.js behaviour"). Four results change the plan: (1) a statically-eligible `/shorts` page that fetches Strapi makes `next build` fail when Strapi is down, so the directory must opt into request-time rendering with `await connection()`; the fetch Data Cache with `revalidate: 60` still works on a dynamic route. (2) Adding `generateStaticParams(){return []}` to get full-route ISR is a trap: a cold-cache failure then returns a bare `text/plain` 500 with no `error.tsx` UI. (3) A segment `loading.tsx` (which the UI-SPEC requires) turns `notFound()` inside the page into HTTP 200 + `noindex`, so SPAGE-01's "404" fails; running the existence check in `[slug]/layout.tsx` (outside the loading boundary) yields a real 404 and a real 500 on outage. (4) In production the client never sees the error message, only a digest, so `error.tsx` cannot pick copy from the API code; it picks `NETWORK_ERROR` vs `INTERNAL_ERROR` from `navigator.onLine`.

Watchlist reuse is feasible with small, additive changes to the events hooks: an `enabled` option on `useWatchlistCheck`, a non-polling list-membership hook, an `optimistic` option on `useAddToWatchlist` (today the online add is not optimistic, but the UI-SPEC requires an instant fill), and message-key overrides for the short-film copy. One grid-level list query seeds every card's check key, so a 24-card grid issues one request. The backend `GET /watchlist` already returns `creativeWork` scalar fields via `populate: ["creativeWork"]` (documented Strapi behaviour), so `slug`, `type`, `releaseYear` and `duration` are likely already on the wire and the "planner blocker" may be a client-type gap only; a boot assertion settles it and an explicit field allowlist is the optional hardening.

**Primary recommendation:** Build both routes as dynamic (`ƒ`) pages with per-fetch `revalidate: 60` + tags, never `generateStaticParams`; do the detail existence check in `shorts/[slug]/layout.tsx` via a React-`cache()`d typed fetcher; put one `error.tsx` and one `not-found.tsx` at the `shorts/` segment; reuse the events watchlist hooks through thin option extensions and a grid-level seeding provider; and ship the tiny `safeCallbackUrl` hardening alongside the heart's sign-in redirect.

## Architectural Responsibility Map

| Capability                                                                       | Primary Tier                                                        | Secondary Tier                                                | Rationale                                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Short-film catalog read (list, detail, related), locale overlay, French fallback | API / Backend (Strapi `creative-works` plugin, finished in Phase 1) | —                                                             | Allowlist projection, locale overlay and error codes already live there; client must not re-implement                       |
| Fetch, typed errors, DTO to `ShortFilm` mapping, 60s Data Cache + tags           | Frontend Server (RSC, `lib/strapi-api/content/shorts.ts`)           | —                                                             | Needs the read-only API key (server only); caching is a Next server concern                                                 |
| 404 vs outage decision and HTTP status                                           | Frontend Server (`[slug]/layout.tsx`)                               | Browser (`error.tsx`, `not-found.tsx` render after hydration) | Status must be set before streaming starts, so the check sits above the `loading.tsx` boundary                              |
| Directory first page (24)                                                        | Frontend Server                                                     | Browser                                                       | Real `<a>` links before JS; page forced to request-time render                                                              |
| Load-more paging                                                                 | Frontend Server route handler `GET /api/shorts`                     | Browser (button, observer, dedupe by `documentId`)            | Keeps API key off the client and the `.strict()` allowlist in one place; the public proxy does not allowlist creative-works |
| Crew grouping, role labels, country/language names, initials                     | Frontend Server mapper + Browser render                             | —                                                             | Pure functions on mapped data; labels from `locales/*.json`                                                                 |
| Silent French fallback tagging (`lang`, `dir`)                                   | Browser/RSC markup                                                  | API (`item.locale`)                                           | API reports one served locale per item (granularity limit, see Pitfall 11)                                                  |
| Watchlist state, optimistic toggle, offline queue, sign-in redirect              | Browser (react-query, NextAuth session, localStorage queue)         | API (user-engagement, JWT self-scoped)                        | Per-visitor state; ISR HTML always ships the unsaved heart                                                                  |
| Watchlist list payload (slug/type for shorts)                                    | API / Backend (`user-engagement`)                                   | —                                                             | One service, one populate clause                                                                                            |
| Ticketing tab gating (D-17)                                                      | Browser/RSC (`feature-flags.ts`, `env.mjs`)                         | —                                                             | `NEXT_PUBLIC_*` is inlined at build time                                                                                    |
| Post-sign-in redirect safety                                                     | Browser (auth forms)                                                | —                                                             | `callbackUrl` is user-controlled query input                                                                                |

## Standard Stack

### Core (all already installed; no new runtime dependency)

| Library               | Version                                                                                     | Purpose                                                                | Why Standard                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| next                  | 16.1.1 [VERIFIED: `node_modules/next/package.json`]                                         | App Router, data cache, `connection()`, route handlers                 | In use                                                                                          |
| react                 | 19.2.3 [VERIFIED: `node_modules/react/package.json`]                                        | RSC, `cache()` request dedupe                                          | In use                                                                                          |
| next-intl             | 4.6.1 [VERIFIED: `node_modules/next-intl/package.json`]                                     | Messages, `Link`/`useRouter`, `t.has(key)` for the role-label fallback | In use; `has(key: string): boolean;` at `use-intl/dist/types/core/createTranslatorImpl.d.ts:16` |
| @tanstack/react-query | 5.74.11 [VERIFIED: `node_modules/@tanstack/react-query/package.json`]                       | Watchlist list/check queries and mutations                             | Existing watchlist hooks are built on it                                                        |
| next-auth             | 4.24.12 [VERIFIED]                                                                          | Session status for the heart guard matrix                              | In use                                                                                          |
| zod                   | 3.25.76 [VERIFIED]                                                                          | Strict query schema for the load-more route handler                    | Already used in the repo                                                                        |
| lucide-react          | 0.487.0 [VERIFIED]                                                                          | New icons (AlertCircle, RotateCw, Film, Heart)                         | Project icon library for new work                                                               |
| vitest                | 2.1.9 [VERIFIED: `apps/client/package.json`] + @testing-library/react 16.3.2 + jsdom 29.1.1 | Unit, component, route tests                                           | Client test runner (kernel: Vitest in apps/client)                                              |

### Supporting

| Library                                         | Version                                                                    | Purpose                                                             | When to Use                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| shadcn `avatar` (adds `@radix-ui/react-avatar`) | 1.3.1 latest on registry                                                   | Initials disc (UI-SPEC A2)                                          | Install via the shadcn CLI, see audit flag below                                                |
| shadcn `empty`                                  | registry component, no new package expected                                | Error / not-found / empty blocks (UI-SPEC C4, A5)                   | Install via the shadcn CLI                                                                      |
| axe-core                                        | 4.10.3 present (hoisted, transitive); 4.14.0 latest [VERIFIED: `npm view`] | a11y assertions in component tests (UI-SPEC Part G wants axe-clean) | Declare as `devDependency` of `@tiween/client` (it is currently only hoisted by something else) |

### Alternatives Considered

| Instead of                                            | Could Use                                                      | Tradeoff                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET route handler for load-more                       | Server Action                                                  | Action is POST-only, serialized, not cacheable; D-03 already chose a route handler                                                                                     |
| Dynamic route + fetch-level cache                     | Full-route ISR via `generateStaticParams(){return []}`         | Verified: cold-cache failure returns a bare-text 500 with no UI; unknown slug with `loading.tsx` is a cached 200 soft-404. Do not use                                  |
| `export const dynamic = "force-dynamic"` on `/shorts` | `await connection()`                                           | Docs state `force-dynamic` sets `no-store`/`revalidate 0` semantics for the route's fetches (would kill the 60s cache); `connection()` verified to keep the Data Cache |
| Move hooks into `features/watchlist` now              | Thin wrappers in `features/watchlist` importing `events/hooks` | Moving touches ~15 files plus the explicit vitest include globs; wrappers keep the diff small and the 14 existing hook tests untouched                                 |

**Installation:**

```bash
cd apps/client
npx shadcn@latest add avatar empty      # adds components/ui/avatar.tsx (+ @radix-ui/react-avatar), components/ui/empty.tsx
yarn add -D axe-core                    # Yarn 1 only (kernel). Pin to a version already in yarn.lock if one resolves (4.10.3)
```

**Version verification:** `npm view axe-core version` returned 4.14.0 (2026-11-10); hoisted copy is 4.10.3. `npm view @radix-ui/react-avatar time` shows 1.3.1 published 2026-10-12 (new `1.3.2-rc` builds appeared 2026-10-13/14; do not take an `-rc`).

## Package Legitimacy Audit

| Package                | Registry | Age                                           | Downloads  | Source Repo                    | Verdict                                                               | Disposition                                                                                                                                                        |
| ---------------------- | -------- | --------------------------------------------- | ---------- | ------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| axe-core               | npm      | multi-year (latest 2026-10-05)                | ~110.9M/wk | github.com/dequelabs/axe-core  | OK                                                                    | Approved (devDependency)                                                                                                                                           |
| @radix-ui/react-avatar | npm      | multi-year package; latest version 2026-10-12 | ~57.4M/wk  | github.com/radix-ui/primitives | SUS (reason: `too-new`, i.e. the newest release is under 30 days old) | Flagged: planner adds a `checkpoint:human-verify` before the shadcn `avatar` install; accept `^1.3.1` or an earlier stable already in the lockfile; never an `-rc` |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@radix-ui/react-avatar` (established Radix primitive, flagged only by recency; install is a shadcn registry component in an already-Radix repo). Checked `scripts.postinstall` for `@radix-ui/react-avatar`: none.
Source of the verdicts: `gsd-tools query package-legitimacy check --ecosystem npm axe-core @radix-ui/react-avatar` run this session. The `empty` component is a shadcn registry file (UI-SPEC Registry Safety records `shadcn view` resolved it on 2026-11-10); no new npm package is expected from it.

## Architecture Patterns

### Verified Next.js behaviour (evidence for the rendering decisions)

Reproduced on a scratch Next 16.1.1 app at `/private/tmp/claude-501/-Users-ayoub-projects-tiween-bmad-version-apps-client/07932d38-3f82-4fab-a434-721ef5c19fe7/scratchpad/isr-probe` (production build with `--webpack`, because Turbopack refused the symlinked `node_modules`; server runtime is the same). Backend was a flag-controlled route that returns ok / 404 / 500 / slow. Hydrated DOM checked with headless Chrome `--dump-dom`.

| #   | Setup                                                                              | Observed                                                                                                                                                                                                                                                                                                                                         | Consequence                                                                                                               |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| E1  | Dynamic-segment route, **no** `generateStaticParams`, fetch with `revalidate`      | Build lists the route as `ƒ` (dynamic). Page is `Cache-Control: private, no-cache, no-store`; the fetch Data Cache still serves the same data across requests                                                                                                                                                                                    | Matches events pages (`/[locale]/events/[documentId]` is absent from the existing `.next/prerender-manifest.json`)        |
| E2  | Same route with `generateStaticParams(){return []}`                                | Route becomes `●`; real ISR (`x-nextjs-cache: MISS/HIT/STALE`, `s-maxage=…, stale-while-revalidate=31535995`). **Cold-cache upstream failure: HTTP 500, `Content-Type: text/plain`, body `Internal Server Error`, no `error.tsx` UI**; not cached, next request recovers. Stale entry + upstream failure: serves `STALE` content, recovers later | A hard failure on a never-rendered slug shows a plain-text page. Violates SPAGE-05. Do not add `generateStaticParams`     |
| E3  | `loading.tsx` present, `notFound()` called inside the page (both E1 and E2 setups) | **HTTP 200** + `<meta name="robots" content="noindex"/>` (soft 404); in E2 that 200 is also cached                                                                                                                                                                                                                                               | SPAGE-01 "404" fails. Docs: status cannot change after streaming starts [CITED: nextjs docs `loading.mdx` "Status Codes"] |
| E4  | `loading.tsx` present, existence fetch + `notFound()` in `[slug]/layout.tsx`       | **HTTP 404** before streaming. Segment-level `[slug]/not-found.tsx` is not used; the **parent** segment's `not-found.tsx` renders after hydration (Chrome-verified); server HTML shell is empty                                                                                                                                                  | Put `not-found.tsx` at the `shorts/` segment                                                                              |
| E5  | Same layout guard, upstream 500                                                    | **HTTP 500** before streaming; after hydration the **parent** segment's `error.tsx` renders (Chrome-verified). A layout error does not reach `[slug]/error.tsx`                                                                                                                                                                                  | Put `error.tsx` at `shorts/` and branch on pathname (directory vs detail)                                                 |
| E6  | Dynamic route, failing upstream then recovered                                     | A non-OK fetch response is not stored in the Data Cache: the very next request after recovery renders fresh data                                                                                                                                                                                                                                 | Retry works with no 60s outage window                                                                                     |
| E7  | Statically-eligible page (no dynamic API) fetching an unreachable backend          | **`next build` fails:** `Error occurred prerendering page "/dir"… exiting the build.`                                                                                                                                                                                                                                                            | `/shorts` would break deploys when Strapi is down (violates D-06)                                                         |
| E8  | Same page with `await connection()` (from `next/server`)                           | Build succeeds with the backend down; route is `ƒ`; Data Cache still serves stable data (3 requests, one backend hit)                                                                                                                                                                                                                            | Use `connection()` on the directory page                                                                                  |
| E9  | `signal: AbortSignal.timeout(2500)` on the fetch                                   | Data Cache still works (stable data); a 6s-slow backend becomes HTTP 500 after ~2.7s                                                                                                                                                                                                                                                             | Use a timeout on every shorts fetch; `BaseStrapiClient` spreads `requestInit` into `fetch` so it passes through           |
| E10 | Data Cache after expiry                                                            | Stale-while-revalidate: the first request after the TTL still gets the old data and triggers the refresh; the next gets the new data                                                                                                                                                                                                             | UAT for "reflected within the revalidation window" must hit the page twice                                                |

Docs cross-checks [CITED: nextjs.org docs via Context7 /vercel/next.js v16.1.6]: `error` props are sanitized in production (message differs from dev); `router.refresh()` "does not affect Data Cache or Full Route Cache"; `reset()` only re-renders the boundary's children; the lowest `revalidate` across a route's fetches sets its ISR frequency, and a fetch with `revalidate: 0` makes the route dynamic.

### System Architecture Diagram

```
Visitor (phone, Instagram in-app browser)
  |
  | GET /fr|ar|en/shorts            GET /…/shorts/<slug>              click "Afficher plus"
  v                                  v                                  |
+--------------------------+   +-------------------------------+        |
| app/[locale]/shorts/     |   | app/[locale]/shorts/[slug]/   |        |
|  page.tsx (RSC)          |   |  layout.tsx (RSC)  <- GUARD   |        |
|  await connection()      |   |   getShortFilm(slug,locale)   |        |
|  getShortFilmsPage(p=1)  |   |    404 -> notFound()  (HTTP 404)       |
|  loading.tsx             |   |    other -> throw     (HTTP 500)       |
+------------+-------------+   |  page.tsx (RSC)  (same cached call)    |
             |                 |   + related (soft-fail) -> ShortFilmDetail
             |                 |  loading.tsx                  |        |
             |                 +---------------+---------------+        |
             |                                 |                        |
             |   lib/strapi-api/content/shorts.ts (server-only)         |
             |    React cache() -> PublicStrapiClient.fetchAPI          |
             |    { next:{revalidate:60,tags}, signal: timeout }        |
             |    errors -> ShortFilmApiError{code,status,kind}         |
             |    DTO -> mapper -> ShortFilm                            |
             |                                 |          GET /api/shorts?locale&page
             |                                 |                        v
             |                                 |            +------------------------+
             |                                 |            | app/api/shorts/route.ts |
             |                                 |            | zod .strict(): locale,page
             |                                 |            | pageSize fixed 24       |
             |                                 |            | -> same fetcher         |
             v                                 v            +-----------+------------+
         Strapi  GET /api/creative-works/creative-works/short-films[/:slug[/related]]
         (public, auth:false, 600 req/60s per IP bucket, .strict() params, coded errors)

Browser after hydration
  ShortsDirectory (client)  -- cards -> ShortFilmCard + ShortFilmHeart (sibling of the Link)
  ShortsWatchlistProvider --one GET /user-engagement/watchlist (via private-proxy, no polling)
        |-> seeds watchlistKeys.check(userId, documentId) for every visible card
  Heart tap -> useAddToWatchlist / useRemoveFromWatchlist (guard matrix, offline queue, toasts)
  Failure of the page render -> shorts/error.tsx (client) : retry = startTransition(router.refresh + reset)
  Unknown slug               -> shorts/not-found.tsx
```

### Recommended Project Structure

```
apps/client/src/
├── lib/strapi-api/content/
│   ├── shorts.ts                      # rewritten: getShortFilmsPage, getShortFilm (cache()), getRelatedShortFilms
│   ├── shorts.errors.ts               # ShortFilmApiError + toShortFilmApiError(unknown)
│   └── shorts.test.ts                 # covered by existing glob src/lib/strapi-api/**/*.test.ts
├── lib/safe-callback-url.ts (+ .test.ts)   # extracted from ResetPasswordForm; add an include glob
├── lib/feature-flags.ts               # + isTicketingEnabled()
├── features/shorts/
│   ├── types/shorts.types.ts          # reshaped ShortFilm (+ ShortFilmPerson, ShortFilmCrewCredit, ShortFilmAccessType)
│   ├── utils/shortMappers.ts (+ .test.ts)   # DTO -> ShortFilm; pure, no server-only; needs include glob
│   ├── utils/crew.ts, placeNames.ts, initials.ts (+ tests)
│   └── components/ShortsDirectory, ShortFilmCard (+heart), ShortFilmDetail (+crew, origin line, access), ShortFilmHeart
├── features/watchlist/
│   ├── hooks/ useShortsWatchlist (grid provider), useWatchlistIds       # thin, import events hooks
│   └── components/ ShortsWatchlistProvider
├── features/events/hooks/             # additive options only (useWatchlistCheck enabled, useAddToWatchlist optimistic/variant, useRemove variant)
├── app/[locale]/shorts/
│   ├── page.tsx  loading.tsx  error.tsx  not-found.tsx
│   └── [slug]/ layout.tsx  page.tsx  loading.tsx  (page.test.tsx exists)
└── app/api/shorts/route.ts (+ route.test.ts rewritten)
apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts   # optional: explicit creativeWork field allowlist
```

### Pattern 1: Typed fetcher over the strict API (D-08)

**What:** One module, three exported reads, flat params only, tags + 60s, timeout, React `cache()` so `generateMetadata`, layout and page share one call.
**When to use:** every shorts read.
**Example:**

```typescript
// Source: lib/strapi-api/base.ts:55-60 (fetchAPI spreads requestInit and next), lib/strapi-api/public.ts:16 (prefixes /api)
import "server-only"

import { cache } from "react"

import { PublicStrapiClient } from "@/lib/strapi-api"

const BASE = "/creative-works/creative-works/short-films" // API_ENDPOINTS "plugin::creative-works.creative-work": "/creative-works/creative-works" + "/short-films"
const SLUG_RE = /^[A-Za-z0-9._~-]+$/ // mirrors the API slug schema (validation/short-films.ts)

export const getShortFilm = cache(async (slug: string, locale: Locale) => {
  if (slug.length > 200 || !SLUG_RE.test(slug)) {
    throw new ShortFilmApiError({ code: "SHORT_FILM_NOT_FOUND", status: 404 }) // never hits Strapi
  }
  try {
    const res = await PublicStrapiClient.fetchAPI(
      `${BASE}/${encodeURIComponent(slug)}`,
      { locale }, // ONLY allowlisted keys
      {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 60, tags: ["short-films", `short-film:${slug}`] },
      }
    )
    return toShortFilm(res.data, locale)
  } catch (e) {
    throw toShortFilmApiError(e)
  } // parses Error(JSON.stringify({name,message,details,status}))
})
```

`fetchAPI` throws `new Error(JSON.stringify(appError))` where `appError = {name, message, details, status}` [VERIFIED: `base.ts:71-76` (non-JSON body, `name: "Invalid response format"`) and `base.ts:91` (non-OK JSON body; the thrown shape is `throw new Error(JSON.stringify(appError))`)]. `toShortFilmApiError` must: `JSON.parse` the message safely; read `details.code`; map status 404 + `SHORT_FILM_NOT_FOUND` to the not-found kind; map `TypeError`/`AbortError`/`TimeoutError` to `NETWORK`; map a 429 body (`message: "RATE_LIMITED"`, no `details.code`) and everything else to `INTERNAL_ERROR`.

### Pattern 2: Detail 404/500 guard in the layout (verified E4, E5)

**What:** Existence check above the `loading.tsx` Suspense boundary.
**Example:**

```tsx
// app/[locale]/shorts/[slug]/layout.tsx
import { notFound } from "next/navigation"
import { connection } from "next/server"

export default async function ShortLayout({
  children,
  params,
}: LayoutProps<"/[locale]/shorts/[slug]">) {
  await connection()
  const { locale, slug } = await params
  try {
    await getShortFilm(slug, locale as Locale)
  } catch (e) {
    // React cache(): page reuses it
    if (isNotFound(e)) notFound()
    throw e
  }
  return children
}
```

The page then calls `getShortFilm` again (deduped) and fetches related with a soft failure (see Open Question 4). `generateMetadata` must call the same cached fetcher inside try/catch and return `{ robots: { index: false, follow: false } }` on any non-not-found error so a metadata throw never duplicates the failure.

### Pattern 3: One boundary for the whole `shorts/` segment

`app/[locale]/shorts/error.tsx` (`"use client"`) branches with `usePathname()`: directory path renders the h1 + description + the directory error block; a `/shorts/<slug>` path renders the detail error block. `app/[locale]/shorts/not-found.tsx` renders "Court métrage introuvable" with the single gold pill. Retry:

```tsx
const router = useRouter()
const [pending, start] = useTransition()
const retry = () =>
  start(() => {
    router.refresh()
    reset()
  }) // reset() alone never refetches a server error [CITED: nextjs docs error.mdx / caching.mdx]
```

Copy selection: production `error.message` is sanitized, so choose `errors.NETWORK_ERROR` when `typeof navigator !== "undefined" && !navigator.onLine`, else `errors.INTERNAL_ERROR`. Do not read an API code from the error.

### Pattern 4: Strict load-more route handler (D-03)

```typescript
// app/api/shorts/route.ts  (replaces the rating/search-era handler)
const querySchema = z
  .object({
    locale: z.enum(["fr", "ar", "en"]),
    page: z.coerce.number().int().min(1).max(500),
  })
  .strict()
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  )
  if (!parsed.success)
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 })
  try {
    const r = await getShortFilmsPage({
      locale: parsed.data.locale,
      page: parsed.data.page,
      pageSize: 24,
    })
    return NextResponse.json(r) // { shorts, total, page, pageSize, hasMore }
  } catch (e) {
    const err = toShortFilmApiError(e) // 502 for upstream failure, never 200 + empty
    return NextResponse.json(
      { error: err.code },
      { status: err.kind === "NOT_FOUND" ? 404 : 502 }
    )
  }
}
```

`pageSize` is fixed server-side: it removes a cache-key dimension a caller could vary. The client treats every non-2xx as failure (inline "Réessayer", cards kept).

### Pattern 5: Mapper shape (SPAGE-02; mirrors `eventMappers.ts:377-387`)

```typescript
// directors: the API already derives them on summary items; on detail also derive crew from credits
const dirs = credits.filter(
  (c) =>
    c.creditRole.department === "directing" || c.creditRole.slug === "director"
)
const trailer = videos.find((v) => v.videoType === "trailer")?.url
```

Keep API nullability (`string | null`) at the boundary, normalise to `undefined` in the client type. Never read `rating` (out of v1). Drop streaming links whose URL fails `toSafeExternalUrl` (the API already drops non-https rows server-side, defense in depth is cheap).

### Pattern 6: Watchlist reuse with a grid-level seed (FR19, FR20)

1. `useWatchlistCheck(id, { enabled })` adds one optional gate (default true, so events unchanged).
2. New `useWatchlistIds()` (in `features/watchlist`): `useQuery` on the **same** `watchlistKeys.list(scope)` key and a shared extracted `fetchWatchlist` function, `select: items => new Set(ids)`, **no `refetchInterval`** (the page-level `useWatchlist` polls every 5s; the directory should not), `staleTime` ~60s.
3. `ShortsWatchlistProvider` (client, wraps the grid): when the list resolves it `setQueryData(watchlistKeys.check(userId, id), { isInWatchlist: set.has(id) })` for every visible card id and exposes `isResolved`. Cards call `useAddToWatchlist(id, {…})`/`useRemoveFromWatchlist(id, {…})` with the check query disabled, so no per-card request fires.
4. `useAddToWatchlist(id, { optimistic: true, variant: "short-film" })`: before `addMutation.mutate`, write `check = true`; roll back to `false` in `onError`. Today's online add path (`useAddToWatchlist.ts:96`, `addMutation.mutate(creativeWorkId, {` with only toast callbacks) writes no optimistic cache entry; the check key is only invalidated by the mutation's `onSuccess`. Without this option the heart fills after the round trip, and the UI-SPEC requires an instant fill. Remove is already optimistic.
5. `variant: "short-film"` picks `watchlist.loginRequiredShort` (sign-in toast) and `watchlist.undoRemove` (Undo action) instead of the event-specific `watchlist.loginRequired` / `watchlist.undo` hard-wired in the hooks.
6. Detail page: one `useWatchlistCheck(documentId)` (a single request); the check spinner after 200ms is UI-only.

Query-key rule from the kernel is already satisfied: every new key reuses `watchlistKeys` (prefix `["watchlist"]` is what `signOutAndClearCache` evicts).

### Anti-Patterns to Avoid

- **`generateStaticParams` for shorts** (even `[]`): verified bare-text 500 on cold failure and cached soft-404.
- **`notFound()` inside `page.tsx` while `loading.tsx` exists:** 200 soft-404.
- **Catching a fetch failure in the page and rendering an error shell:** that render completes successfully, so any page-level cache (a future `generateStaticParams`, a CDN honouring `s-maxage`) would pin the outage for the whole revalidate window. This is the exact failure D-05 and UI-SPEC A5/C3 forbid; throw instead.
- **Strapi-style nested params** (`pagination[page]`, `filters`, `populate`, `sort[]`) against `.strict()` endpoints: all are 400s.
- **`useProxy: true` for shorts reads:** the public proxy only allows `api/pages`, `api/footer`, `api/navbar`… (`request-auth.ts` GET allowlist); creative-works is not on it.
- **A `useWatchlistCheck` per card without `enabled`:** 24 `GET /watchlist/check/:id` requests.
- **Reading an API error code in `error.tsx`:** sanitized in production.

## Don't Hand-Roll

| Problem                                      | Don't Build                            | Use Instead                                                                                                                    | Why                                                                                  |
| -------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Country/language names                       | Lookup tables of names                 | `Intl.DisplayNames` through `toNumeralSafeLocale` + `Intl.ListFormat`, plus a 3-locale override map for `aeb` (and `ber`)      | Probed below; ESLint rule `@tiween/western-numerals` requires the safe locale helper |
| Initials                                     | `name[0]`                              | `Intl.Segmenter` grapheme clusters + U+200C between two Arabic-script letters                                                  | UI-SPEC A2; UTF-16 slicing breaks combining marks                                    |
| Request dedupe between metadata/layout/page  | Manual module-level memo               | React `cache()` + Next fetch Data Cache                                                                                        | Per-request scope, no stale state                                                    |
| Retry after server error                     | `reset()` alone or `location.reload()` | `startTransition(() => { router.refresh(); reset() })`                                                                         | Keeps scroll/state, documented                                                       |
| Watchlist state machine, offline queue, Undo | A second implementation for shorts     | `useAddToWatchlist` / `useRemoveFromWatchlist` + `watchlistQueue` + `useWatchlistSync` (mounted app-wide in `ClientProviders`) | 14 existing tests, guard matrix, per-user queue; extend with options                 |
| Post-login redirect validation               | New regex                              | `safeCallbackUrl` already exists privately in `ResetPasswordForm.tsx:71`; extract and reuse                                    | Handles `//`, `/\`, control characters                                               |
| Role label fallback                          | try/catch around `t()`                 | `t.has("crew.roles." + slug)` then humanized slug                                                                              | `has` exists in use-intl 4.6.1                                                       |
| Slug validation                              | Ad-hoc                                 | The API's own pattern `^[A-Za-z0-9._~-]+$`, max 200                                                                            | Avoids a Strapi round trip (and a rate-limit hit) for junk URLs                      |
| Test the "no mock in production" rule        | Reviewer vigilance                     | A guard test that scans `src/` imports                                                                                         | Cheap, permanent                                                                     |

**Key insight:** every behaviour here already has a hardened sibling in the repo (events detail fetch, events watchlist hooks, `safeCallbackUrl`, `toSafeExternalUrl`, `toNumeralSafeLocale`). The work is wiring and adding options, not new machinery.

## Verified API Contract (read from source this session)

Route paths (`creative-works/server/src/routes/content-api.ts:5-6, 9, 26, 41, 57`): `// /api/creative-works/creative-works/short-films`; paths `"/creative-works/short-films"`, `"/creative-works/short-films/featured"`, `"/creative-works/short-films/:slug/related"`, `"/creative-works/short-films/:slug"`; every route `auth: false` with `plugin::creative-works.short-films-rate-limit` `config: { max: 600, windowMs: 60000 }`.

Validation (`validation/short-films.ts:16-25, 30-32, 55, 62, 69`):

```
export const SHORT_FILM_SORTS = ["publishedAt:asc","publishedAt:desc","releaseYear:asc","releaseYear:desc","duration:asc","duration:desc","title:asc","title:desc"] as const
export const SHORT_FILM_DEFAULT_PAGE_SIZE = 24
export const SHORT_FILM_MAX_PAGE_SIZE = 48
export const SHORT_FILM_MAX_PAGE = 10_000
```

List query = `locale?, genre?, sort, page, pageSize` `.strict()`; detail/related/featured accept only `locale` `.strict()`; slug param `^[A-Za-z0-9._~-]+$` (1-200).

Errors (`controllers/short-film.ts:27-31, 59`):

```
export const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  UNSUPPORTED_LOCALE: 400,
  SHORT_FILM_NOT_FOUND: 404,
}
        code: mappedStatus ? code : "INTERNAL_ERROR",
```

Envelope: `{ error: { status, name: "ShortFilmError", message, details: { code, issues? } } }`. The rate limiter answers `ctx.status = 429` with `message: "RATE_LIMITED"` and **no** `details.code` (`shared/rate-limit.ts:92-98`), keyed by `ctx.state?.ip ?? ctx.ip ?? "unknown"` (line 76): behind the Dokploy proxy all callers share one bucket (STATE.md blocker, `server.proxy` unset until Phase 6).

Response types (`services/short-films.ts:115-135, 137-181`): summary = `documentId, slug, locale, title, originalTitle, synopsis, duration, releaseYear, country: string[], language: string[], featured, featuredRank, publishedAt, poster, backdrop, genres, directors, availableOnline, hasAwards`; detail adds `rating, ageRating, photos, credits[{person, creditRole:{slug,department}, customRole, billing}], cast[{person, character:{documentId,name}|null, billing}], distinctions[{name, edition, year, section, category, result, awardName}], videos[{url, videoType}], streamingLinks[{platform, url, accessType, label}]`. Media = `{url, alternativeText, width, height, mime, formats: Record<string,{url,width,height}>|null}`. List body `{ data, meta: { pagination: { page, pageSize, pageCount, total } } }`; detail/related `{ data }`.

Vocabularies:

- `STREAMING_PLATFORMS` (`shared/short-film-rules.ts:298-309`): `"youtube","vimeo","dailymotion","artify","arte","mubi","netflix","shahid","tv5monde","other"`.
- `STREAMING_ACCESS_TYPES` (`:311-316`): `"free","included","subscription","rental"`.
- `DIRECTING_ROLE_SLUGS = ["director"] as const` (`:319`); `AWARD_RESULTS` (`:322-327`): `"winner","grand-prize","special-mention","honorable-mention"`; distinction `result` enum (`distinction.json:29-36`) additionally has `"selected","nominated"`.
- credit-role `department` enum (`credit-role/schema.json:42-55`): `directing, writing, production, camera, editing, sound, music, art, costume-makeup, lighting, stage, other`.
- video `videoType` enum (`video.json:26-34`): `trailer, teaser, clip, featurette, interview, behind-the-scenes, full-length`.
- `ageRating` enum (`creative-work/schema.json:157`): `["TP", "PG12", "PG16", "PG18"]`; `synopsis` is `richtext`, `country`/`language` are `json`.

Locale semantics (`services/short-films.ts:5-17` header contract, `:427-466` `overlayLocalizedFields`): "`locale` on each item is the locale actually served: the requested locale where a published translation exists, the default locale otherwise." Paging/sort/count read default-locale rows only; a localized row counts as a translation only with a non-empty title; then `title`, `synopsis` (line 461: `synopsis !== null && synopsis.trim() !== "" ? synopsis : item.synopsis`, so an empty translated synopsis keeps the **base** one), `poster` and `locale` are overlaid; genres/credits/directors/slug stay from the base row. Consequence: `item.locale === "ar"` can still carry a French synopsis (Pitfall 11).

Client call shape (verified): `PublicClient.prepareRequest` builds `/api${path}` + `qs.stringify(params)` (`public.ts:16-24`; line 16 is ``let url = `/api${path.startsWith("/") ? path : `/${path}`}` ``), and `fetchAPI` always merges `locale: params.locale` into the params (`base.ts:48`: `: { locale: params.locale }),`).

## Common Pitfalls

### Pitfall 1: Adding `generateStaticParams` to "get ISR"

**What goes wrong:** Cold-cache outage returns a bare `text/plain` 500; unknown slug caches a 200 soft-404 (verified E2/E3).
**Why:** Full-route ISR renders to completion before responding; a throw has no client boundary.
**How to avoid:** No `generateStaticParams` in shorts routes; per-fetch `revalidate: 60`.
**Warning signs:** `next build` output shows `●` for `/[locale]/shorts/[slug]`.

### Pitfall 2: `/shorts` prerendered at build

**What goes wrong:** `/fr|ar|en/shorts` is statically eligible (the existing build manifest lists it as prerendered), so `next build` calls Strapi and fails when it is down (verified E7).
**How to avoid:** `await connection()` as the first statement of the page; acceptance check: build with an unreachable `STRAPI_URL` and confirm `ƒ /[locale]/shorts`.

### Pitfall 3: Soft 404 from `loading.tsx`

**What goes wrong:** `notFound()` in the page yields HTTP 200 + noindex (verified E3). SPAGE-01 requires a real 404.
**How to avoid:** Guard in `[slug]/layout.tsx` (E4). Keep `loading.tsx` (UI-SPEC A7).

### Pitfall 4: Expecting the API code on the client

**What goes wrong:** Production sanitizes server errors to a digest; a planned `errors[error.code]` lookup always misses.
**How to avoid:** `NETWORK_ERROR` vs `INTERNAL_ERROR` from `navigator.onLine`; code-based copy only in the load-more path where the route handler returns `{ error: CODE }`.

### Pitfall 5: `reset()` does not refetch

**What goes wrong:** The "Réessayer" button re-renders the boundary but the server error persists.
**How to avoid:** `startTransition(() => { router.refresh(); reset() })`; failed upstream responses are not cached (E6) so the retry really hits Strapi.

### Pitfall 6: Dev mode hides all of this

`BaseStrapiClient` forces `revalidate: isDevelopment() ? 0 : … ?? 60` (`base.ts:59`), so in `next dev` there is no Data Cache. ISR/cache/404-status checks only mean something on `next build && next start` (`yarn preview`).

### Pitfall 7: Stale-while-revalidate surprises UAT

First visit after the 60s window still shows the old film (E10). Test "unpublish is reflected" with two requests, or wait 60s and reload twice.

### Pitfall 8: Non-allowlisted params

The old code sent `filters`, `populate`, `pagination`, `sort[]`, `directors.name`; all 400 on the strict API. Send only `locale`, `page`, `pageSize`, optional `sort`. Do not send `genre` (D-04). A unit test should assert the exact query string.

### Pitfall 9: vitest include globs silently skip new tests

`apps/client/vitest.config.ts` enumerates globs and warns about this in a comment (lines 75-79). Existing coverage: `src/lib/strapi-api/**/*.test.ts`, `src/app/api/**/*.test.ts`, `src/app/**/page.test.tsx`, `src/features/shorts/components/**/*.test.tsx`, `src/features/events/{hooks,utils}/**/*.test.ts`, `src/components/layout/**/*.test.tsx`, `src/lib/feature-flags*.test.ts`, `src/app/**/watchlist/**/*.test.tsx`, `src/app/**/signin/_components/**/*.test.tsx`, `src/app/**/register/_components/**/*.test.tsx`. **Not covered:** `src/features/shorts/utils/**`, `src/features/shorts/**/*.test.ts`, `src/features/watchlist/**`, `src/lib/safe-callback-url.test.ts`, `src/app/**/shorts/**/layout.test.tsx` and `error.test.tsx`/`not-found.test.tsx`. Add globs in Wave 0 and a one-off check that each new test file is picked up (`yarn vitest run --reporter verbose <file>` prints it).

### Pitfall 10: Type reshape breaks siblings

`lib/algolia/shorts.ts` reads `film.country`/`film.language` as strings and `film.directors?.map(d => d.name)` (lines 74-76, 84-85). Changing them to `string[]` / `{documentId,slug,name}` breaks it. Phase 3 deletes the file, so update `toAlgoliaRecord` minimally (`join`) rather than keep legacy fields. `features/shorts/data/mock-shorts.ts` is the other consumer: keep it compiling as a fixture or move it under a test-only path. Baseline: `npx tsc --noEmit` exits 0 with no errors today (run 2026-11-10; the "46 errors" in STATE.md is stale), so keep it at zero.

### Pitfall 11: Per-field fallback is invisible to the client

The overlay can serve a translated title with the French synopsis while `locale` says `ar`. D-11 tags by `item.locale`. For Arabic pages, additionally apply `isArabic(text)` (`lib/utils/isArabic.ts`: `/[؀-ۿ]/`) per text node: no Arabic script means French, tag `lang="fr" dir="ltr"`. English pages cannot be detected by script; accept the rare mis-tag or add a `fallbackFields` array to the API later (Open Question 2).

### Pitfall 12: `Intl.DisplayNames` quirks (Node 22.22.0, ICU 77.1, probed)

| code                | fr                                        | ar                        | en                             |
| ------------------- | ----------------------------------------- | ------------------------- | ------------------------------ |
| `aeb`               | "arabe tunisien"                          | **"aeb" (raw code)**      | "Tunisian Arabic"              |
| `ber`               | "ber" (raw)                               | "ber" (raw)               | "ber" (raw)                    |
| `none`              | **throws `RangeError: invalid_argument`** | throws                    | throws                         |
| regions TN/FR/DZ/MA | Tunisie/France/Algérie/Maroc              | تونس/فرنسا/الجزائر/المغرب | Tunisia/France/Algeria/Morocco |

So: wrap `of()` in try/catch, drop entries that throw or echo the code, keep the `aeb` override (needed in `ar` even on this ICU), and decide on `ber` (it is in `SHORT_FILM_LANGUAGE_CODES`, so a Berber film would silently lose its language; propose `languageNames.ber`: "berbère" / "البربرية" / "Berber", new copy for the owner). `Intl.ListFormat` narrow-unit in `ar` joins with "و" ("تونس وفرنسا"), which is fine. All formatters must receive `toNumeralSafeLocale(locale)` or the ESLint rule fails the build.

### Pitfall 13: Role labels and ICU

New ICU strings must use a pre-formatted `{display}` argument, not `#` (`icu-numerals.test.ts` renders every `ar.json` message at `ar-u-nu-arab`). Dynamic role keys: use `t.has`, never let a missing key log a runtime error.

### Pitfall 14: Rate-limit bucket is shared and 429 has no code

All Next-to-Strapi traffic is one IP bucket of 600/min for the route (STATE.md). Bots hitting random slugs or `?page=N` cache-miss every time (404s are never cached, E6). Mitigations in scope: the slug pre-check (Pattern 1), fixed `pageSize` and zod-clamped `page` on the route handler, the 60s Data Cache for real pages. A 429 maps to `INTERNAL_ERROR` (retryable). Setting `server.proxy` is Phase 6.

### Pitfall 15: Open redirect through `callbackUrl`

`SignInForm.tsx:30,48` and `SignInFormWithSocial.tsx:54,99,122` read `searchParams.get("callbackUrl")` raw into `router.push(callbackUrl)` and `signIn(provider, { callbackUrl })`; `RegisterForm.tsx:65,90,149` uses `window.location.href = callbackUrl` (also accepts `javascript:`). There is no custom NextAuth `redirect` callback (only `jwt`/`session` at `lib/auth.ts:93`), so credential sign-in with `redirect: false` is unguarded; the OAuth path relies on NextAuth's default same-origin guard. `ResetPasswordForm.tsx:71-80` already has the fix. The heart's redirect makes this link a first-class flow, so extract `safeCallbackUrl` to `src/lib/safe-callback-url.ts`, apply it in the three forms, test it.

### Pitfall 16: `callbackUrl` and the default-locale prefix

`localePrefix: "as-needed"`, default `fr`: French URLs are unprefixed. `useAddToWatchlist` builds `/${locale}/auth/signin?callbackUrl=${encodeURIComponent(pathname)}` (line 71-72) with the browser `pathname`, so the return path is already correct for `fr` (`/shorts/x`) and for `ar`/`en` (`/ar/shorts/x`). Keep that; do not rebuild it from `locale`.

### Pitfall 17: BottomNav/DesktopNav tab removal fan-out

`tabOrder = ["home","search","tickets","account"]` is hard-coded (`BottomNav.tsx:70`); `TabType` and label props flow from `HomePage*.tsx` (they also `router.push(/${locale}/tickets)`), `DesktopNav.tsx:64`, and the labels in `app/[locale]/page.tsx:86`. Gate via a new `isTicketingEnabled()` in `lib/feature-flags.ts` fed by a new `NEXT_PUBLIC_TICKETING_ENABLED` (`optionalZodBoolean`, `env.mjs` server-client block + runtimeEnv, `.env.local.example`). The existing `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` is a different, narrower flag (purchase routes 404 via `proxy.ts:75-80`; "Mes Billets" is explicitly outside it) so do not reuse it. Default off needs no Docker build arg; remember `NEXT_PUBLIC_*` is inlined at build time.

### Pitfall 18: Watchlist payload details

`getUserWatchlist` (`user-engagement/server/src/services/watchlist.ts:290-294`) queries with `populate: ["creativeWork"],` and `sort: { addedAt: "desc" },`, then adds screening enrichment. Media (`poster`) is a nested relation and is **not** populated, so shorts show the stripe artwork (acceptable: no launch film has a 2:3 poster). A relation to an unpublished work populates as `null`; `WatchlistPageClient` already filters `creativeWork != null`. The relation is populated from a non-localized parent, so titles are default-locale (French) on `/ar` and `/en` (Open Question 1). `partitionWatchlist` needs no change: undated items already land in the first section after dated ones, newest saved first (`watchlistView.ts`).

### Pitfall 19: Richtext synopsis

`synopsis` is Strapi `richtext`; the detail page strips HTML tags only (`stripHtmlTags`). Markdown syntax would show literally. The launch data is plain text (Phase 1 curation), so keep the helper and add a mapper test with a markdown-looking string only if the owner starts using formatting.

## Code Examples

### Grid-level watchlist seed

```tsx
// features/watchlist/components/ShortsWatchlistProvider.tsx   (client)
const { data: ids, isSuccess } = useWatchlistIds() // same key as useWatchlist, no polling
const qc = useQueryClient()
const { data: session } = useSession()
const userId = session?.user?.userId
React.useEffect(() => {
  if (!isSuccess || !ids || !userId) return
  for (const id of visibleIds)
    qc.setQueryData(watchlistKeys.check(userId, id), {
      isInWatchlist: ids.has(id),
    })
}, [isSuccess, ids, userId, visibleIds, qc])
// card: aria-busy while qc.getQueryData(check) === undefined and the visitor is authenticated; taps ignored then
```

### Safe redirect reuse

```typescript
// Source: ResetPasswordForm.tsx:71-80 (extract unchanged)
export function safeCallbackUrl(raw: string | null): string {
  if (raw && /^\/[^/\\]/.test(raw) && !/[\u0000-\u001f\u007f]/.test(raw))
    return raw
  return "/"
}
```

### Place names

```typescript
const list = new Intl.ListFormat(toNumeralSafeLocale(locale), {
  type: "unit",
  style: "narrow",
})
const names = (codes: string[], type: "region" | "language") => {
  const dn = new Intl.DisplayNames([toNumeralSafeLocale(locale)], { type })
  return codes.flatMap((c) => {
    try {
      const n = override(type, c, locale) ?? dn.of(c)
      return n && n !== c ? [n] : []
    } catch {
      return []
    }
  })
}
```

### Mock-import guard test

```typescript
// features/shorts/data/no-production-import.test.ts  (needs an include glob)
// readdirSync(src) walk; for every non-test, non-story .ts/.tsx file assert it does not match /mock-shorts|features\/shorts\/data/
```

## State of the Art

| Old Approach                                                | Current Approach                                         | When Changed                        | Impact                             |
| ----------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `generateStaticParams` + ISR for catalog pages              | Dynamic route + per-fetch `revalidate`/tags (Data Cache) | Next 15/16 behaviour; verified here | Honest errors, no build dependency |
| `export const dynamic = "force-dynamic"` to avoid prerender | `await connection()`                                     | Next 15+                            | Keeps fetch caching                |
| `reset()` for retry                                         | `router.refresh()` in `startTransition` + `reset()`      | App Router docs                     | Server errors actually refetch     |
| Strapi v4 `populate`/`filters` querystrings                 | Custom plugin routes with strict flat params             | Phase 1                             | Old fetcher 400s                   |

**Deprecated/outdated in this repo:** `shorts.ts` phantom fields (`directors`, `facts`, `trailer`, `cast.person`), `app/api/shorts/route.ts` search/rating/filter handling, `features/shorts/data/mock-shorts.ts` as a production source, `ShortsShowcase`, the local-state heart in `ShortFilmDetail.tsx` (l.102, 126-146), the English-only `PLATFORM_NAMES` map (5 of 10 platforms), the shipped `shorts.watchlist` / `removeFromWatchlist` keys ("Ma liste").

## Assumptions Log

| #   | Claim                                                                                                                                                                                                                                           | Section                       | Risk if Wrong                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A1  | `GET /watchlist` already returns `creativeWork.slug/type/duration/releaseYear` because Document Service `populate: ["creativeWork"]` returns the relation's scalar fields (documented Strapi behaviour; not proven by a boot test in this repo) | Pitfall 18, Standard approach | If wrong, the optional field-allowlist change in `user-engagement` becomes mandatory; one boot assertion settles it |
| A2  | Production Next with Turbopack (default `next build` in 16) behaves like the `--webpack` probe for dynamic/ISR status codes and caching                                                                                                         | Verified Next.js behaviour    | Status/caching assumptions shift; rerun the probe checklist on the real app (it is in Validation Architecture)      |
| A3  | next-intl's `useRouter().push("https://evil.com")` passes an absolute URL through to a hard navigation; the open-redirect severity rests on code reading, not an executed exploit                                                               | Pitfall 15                    | Lower severity, same fix; `RegisterForm`'s `window.location.href` sink is definite                                  |
| A4  | A related-shelf fetch failure should degrade silently (omit the shelf) rather than fail the page                                                                                                                                                | Pattern 2                     | If the owner wants every failure surfaced, wrap related in the same guard; small change                             |
| A5  | 24 simultaneous per-card hook instances (add + remove hooks, 3 mutation observers each) are acceptable                                                                                                                                          | Pattern 6                     | If sluggish on low-end phones, switch to one grid-level controller built on a single mutation set                   |
| A6  | New copy for `languageNames.ber` ("berbère"/"البربرية"/"Berber")                                                                                                                                                                                | Pitfall 12                    | Owner-approved copy needed; Arabic is a draft like the other Arabic strings                                         |
| A7  | The no-JS visitor sees a blank shell with the correct 404/500 status on layout-level failures (UI appears after hydration)                                                                                                                      | Verified E4/E5                | Matches the app's JS-dependent shell elsewhere; confirm acceptable for the Instagram in-app browser                 |

## Open Questions

1. **Watchlist title locale**
   - What we know: the list payload carries the default-locale (French) title; the page chrome is localized.
   - What's unclear: whether FR56 extends to the watchlist entry title.
   - Recommendation: accept French titles in Phase 2 (stated in the plan), or add an optional `?locale=` overlay in `user-engagement` later; do not block.
2. **Per-field fallback provenance**
   - What we know: the API reports one `locale`; synopsis and title can fall back independently.
   - Recommendation: ship the `item.locale` + Arabic-script heuristic (Pitfall 11); log a Phase 3+ API ticket for `fallbackFields`.
3. **Directory outage returns HTTP 200**
   - What we know: the directory fetch lives in the page inside the `loading.tsx` Suspense boundary, so an outage streams as 200 and the boundary renders after hydration. Detail returns a true 500 thanks to the layout guard.
   - Recommendation: acceptable (no SEO exposure, pages are `noindex`); say so in the plan.
4. **Related-shelf failure policy**
   - Recommendation: soft-fail (`catch → []`, `console.error`), per A4.
5. **`ber` and silent films (`none`)**
   - Recommendation: add the `ber` override; `none` is dropped silently (UI-SPEC rule). Ask the owner whether "Sans dialogue" should be shown for `none` (new copy).
6. **`included` access-type label, "VOST" label rendering**
   - Already answered in EXPERIENCE (defaults stand).

## Environment Availability

| Dependency        | Required By             | Available                                                                                                  | Version                           | Fallback                                                                                                                                                |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node              | build, tests            | yes                                                                                                        | 22.22.0 (ICU 77.1)                | —                                                                                                                                                       |
| Yarn 1            | installs                | yes                                                                                                        | 1.22.22                           | —                                                                                                                                                       |
| `tsc`             | type gate               | yes                                                                                                        | exit 0 baseline                   | —                                                                                                                                                       |
| Chrome (headless) | hydrated-DOM checks     | yes                                                                                                        | `/Applications/Google Chrome.app` | —                                                                                                                                                       |
| Strapi dev server | manual UAT of real data | **no** (probe to `api.tiween.localhost:1355` returned 404 from the portless proxy; nothing serving Strapi) | —                                 | Start it (`yarn dev:strapi`, Docker `db` first; Docker CLI present, daemon not checked) or use the node stub server proposed in Validation Architecture |
| Docker            | `yarn dev:strapi`       | CLI 29.7.2 present                                                                                         | —                                 | —                                                                                                                                                       |
| Playwright        | e2e                     | hoisted in root `node_modules`; no client config                                                           | —                                 | Not needed; jsdom + build probes suffice                                                                                                                |

**Missing dependencies with no fallback:** none for planning.
**Missing dependencies with fallback:** a live Strapi (use the stub for automated checks; real-data UAT needs the dev stack and the 13 imported films).

## Validation Architecture

### Test Framework

| Property           | Value                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework          | Vitest 2.1.9, jsdom 29.1.1, @testing-library/react 16.3.2 (+ `@testing-library/jest-dom/vitest` via `test/setup.ts`)                                                                                                                                                                                                                                   |
| Config file        | `apps/client/vitest.config.ts` (explicit `include` globs; `server-only` aliased to `test/stubs/server-only.ts`)                                                                                                                                                                                                                                        |
| Quick run command  | `cd apps/client && yarn vitest run src/lib/strapi-api src/features/shorts src/features/watchlist src/app/api/shorts`                                                                                                                                                                                                                                   |
| Full suite command | `cd apps/client && yarn test` (`vitest run`), plus `yarn lint` (max-warnings 0) and `npx tsc --noEmit`                                                                                                                                                                                                                                                 |
| Baseline           | `src/features/shorts` + `src/app/api/shorts` suites pass today (route 3, suggest 11, card 3, directory 8, suggestion 6; the detail and `[slug]/page.test.tsx` suites were not run). `npx tsc --noEmit` exits 0 (run without a prior `next typegen`; `yarn type-check` runs `next typegen` first, which `LayoutProps<"/[locale]/shorts/[slug]">` needs) |

### Phase Requirements to Test Map

| Req ID         | Behavior                                                                                                                                      | Test Type                                         | Automated Command                                                                        | File Exists?                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| SPAGE-01       | Pages read the fetcher; unknown slug triggers `notFound()`; no production import of mock data                                                 | unit/route + guard                                | `yarn vitest run src/app/[locale]/shorts src/features/shorts/data`                       | rewrite `[slug]/page.test.tsx`; new guard test |
| SPAGE-01       | Real HTTP 404 for unknown slug, 200 for known; build succeeds with Strapi down                                                                | build probe (scripted)                            | `yarn build` with unreachable `STRAPI_URL`; `yarn start` + `curl -I` against the stub    | Wave 0 script                                  |
| SPAGE-02       | credits→directors/crew, videos→trailer, access types, partial/empty data                                                                      | unit                                              | `yarn vitest run src/features/shorts/utils`                                              | Wave 0 (glob + file)                           |
| SPAGE-02       | Exact query string is `locale/page/pageSize` only; typed errors for 400/404/429/5xx/timeout/non-JSON                                          | unit (mock `PublicStrapiClient`)                  | `yarn vitest run src/lib/strapi-api/content/shorts.test.ts`                              | Wave 0                                         |
| SPAGE-03       | Crew grouping order, billing sort, humanized slug, `customRole` wins; access sub-label + label                                                | component                                         | `yarn vitest run src/features/shorts/components/ShortFilmDetail`                         | extend existing                                |
| SPAGE-04       | Original title (differs only), origin line, `aeb`/`ber`/`none` handling in fr/ar/en                                                           | unit + component                                  | `yarn vitest run src/features/shorts/utils/placeNames`                                   | Wave 0                                         |
| SPAGE-05       | Directory/detail error blocks, retry calls `router.refresh` + `reset`, `role="alert"`, never empty state on error                             | component                                         | `yarn vitest run src/app/[locale]/shorts`                                                | Wave 0 (`error.test.tsx` glob)                 |
| SPAGE-05       | Load-more route: 400 on unknown/invalid params, 502 on upstream failure, never 200-empty; client keeps cards + inline retry                   | route + component                                 | `yarn vitest run src/app/api/shorts src/features/shorts/components/ShortsDirectory`      | rewrite                                        |
| FR19           | Signed-out tap: toast key `loginRequiredShort` + redirect with callbackUrl; heart is a sibling of the link; optimistic add + rollback         | hook + component                                  | `yarn vitest run src/features/events/hooks src/features/shorts/components/ShortFilmCard` | extend `useAddToWatchlist.test.ts`             |
| FR19           | One list request per grid, zero per-card `check` requests                                                                                     | component (spy on `PrivateStrapiClient.fetchAPI`) | `yarn vitest run src/features/watchlist`                                                 | Wave 0                                         |
| FR20           | Remove optimistic, Undo re-adds, offline remove queues, cache cleared on sign-out prefix                                                      | hook                                              | `yarn vitest run src/features/events/hooks`                                              | existing + variant cases                       |
| FR21           | Short-film entry links to `/shorts/<slug>`, shows type label, no venue/date row; short films sort after dated events                          | component                                         | `yarn vitest run src/app/[locale]/watchlist`                                             | extend `WatchlistPageClient.test.tsx`          |
| FR21 (backend) | `GET /watchlist` row has `creativeWork.slug/type` (boot)                                                                                      | strapi integration                                | `yarn workspace @tiween/admin test:integration` (boots Strapi, not in CI)                | Wave 0 (optional if A1 holds)                  |
| FR56           | `lang="fr"`/`dir="ltr"` on fallback nodes when `item.locale !== page locale`; Arabic-script heuristic; title never blank                      | component                                         | `yarn vitest run src/features/shorts/components`                                         | extend                                         |
| D-17           | Tickets tab absent by default, present when flag true; DesktopNav likewise                                                                    | component + flag unit                             | `yarn vitest run src/components/layout src/lib/feature-flags`                            | extend                                         |
| Security       | `safeCallbackUrl` rejects `//x`, `/\x`, `https://x`, `javascript:`, control chars; forms use it                                               | unit + form tests                                 | `yarn vitest run src/lib src/app/[locale]/auth`                                          | Wave 0 (glob)                                  |
| a11y           | axe-core clean at 390px fr/ar/en for directory (results, empty, error), detail (full, sparse, error, not found), watchlist with a short entry | component + `axe-core`                            | `yarn vitest run src/features/shorts src/app/[locale]/shorts`                            | Wave 0                                         |

Manual-only (record in VERIFICATION): contrast pass (jsdom cannot compute it), RTL visual check, real-device offline-queue replay, the E1-E10 production probe on the real app against the stub.

### Sampling Rate

- **Per task commit:** the quick command scoped to the touched directory.
- **Per wave merge:** full `yarn test` + `yarn lint` + `npx tsc --noEmit`.
- **Phase gate:** all green, plus the scripted production probe below, before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `vitest.config.ts` `include`: add `src/features/shorts/**/*.test.{ts,tsx}`, `src/features/watchlist/**/*.test.{ts,tsx}`, `src/lib/safe-callback-url.test.ts`, `src/app/**/shorts/**/*.test.{ts,tsx}` (the file's own comment warns un-globbed tests silently never run).
- [ ] A small Node **stub Strapi** (http server) serving the verified contract with switchable ok / 404 / 500 / 429 / slow modes, used by the production probe and by manual UAT (adapt `isr-probe/app/api/flag/route.ts` and `probe.sh` from the scratchpad).
- [ ] Production probe script: `next build` with `STRAPI_URL` unreachable (expect success, `ƒ` for both routes), then `next start` against the stub: known slug 200; unknown 404; outage 500; recovery without waiting 60s; load-more route 502 on outage.
- [ ] `axe-core` as a devDependency and a shared `expectNoA11yViolations(container)` helper.
- [ ] shadcn `avatar` and `empty` added.
- [ ] i18n keys in all three locale files (fr/ar/en) for every key in the UI-SPEC Copywriting Contract, plus `languageNames.ber` if approved.

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies                     | Standard Control                                                                                                                                       |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | --- |
| V2 Authentication     | yes (sign-in redirect path) | Existing NextAuth flows; `safeCallbackUrl` on every post-login redirect                                                                                |
| V3 Session Management | yes                         | Existing NextAuth session; watchlist keys carry `userId`; `signOutAndClearCache`                                                                       |
| V4 Access Control     | yes                         | Watchlist routes are JWT self-scoped (`is-owner` policy); private-proxy allowlist already includes `api/user-engagement/watchlist` for GET/POST/DELETE |
| V5 Input Validation   | yes                         | zod `.strict()` on the load-more route; slug regex before any upstream call; `encodeURIComponent` for the path segment; locale restricted to `fr       | ar  | en` |
| V6 Cryptography       | no                          | No new crypto                                                                                                                                          |
| V7/V14 Config         | yes                         | `NEXT_PUBLIC_TICKETING_ENABLED` default off; no secrets in client                                                                                      |

### Known Threat Patterns

| Pattern                                                                                        | STRIDE               | Standard Mitigation                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Open redirect via `?callbackUrl=` (credentials sign-in, register, OAuth start)                 | Spoofing / Tampering | `safeCallbackUrl` (same-origin relative only, rejects `//`, `/\`, control chars); also covers `javascript:` in `RegisterForm`'s `window.location.href` |
| Cache-key and upstream amplification through the public route handler (`?page=…&locale=…&x=…`) | DoS                  | Strict allowlist (400 on unknown keys), fixed `pageSize`, `page` max clamp, locale enum, no echo of input                                              |
| Shared Strapi rate-limit bucket exhausted by junk slugs                                        | DoS                  | Slug pre-validation, 60s Data Cache for real pages, 429 handled as a retryable error; `server.proxy` in Phase 6                                        |
| Hostile `streamingLinks`/`videos` URLs rendered as links                                       | Tampering / XSS      | API drops non-https rows; client `toSafeExternalUrl` before any `href`/`window.open`; no `dangerouslySetInnerHTML` (synopsis is tag-stripped text)     |
| Information disclosure through error pages                                                     | Info disclosure      | Production sanitizes server errors; UI prints `t('errors.<CODE>')` only, never status numbers or codes                                                 |
| Cross-account watchlist cache leak on a shared device                                          | Info disclosure      | All new keys reuse `watchlistKeys` (user-scoped) so sign-out eviction covers them                                                                      |
| Stored watchlist data exposes extra creative-work fields                                       | Info disclosure      | Optional explicit `populate.creativeWork.fields` allowlist in `user-engagement` (no change to the public API)                                          |
| CSRF on the new route handler                                                                  | Tampering            | GET, read-only, no cookies used; nothing state-changing added                                                                                          |

## Sources

### Primary (HIGH confidence)

- Source files read this session: `apps/strapi/src/plugins/creative-works/server/src/{routes/content-api.ts, validation/short-films.ts, controllers/short-film.ts, services/short-films.ts, services/public-api.ts, middlewares/index.ts}`, `apps/strapi/src/shared/{short-film-rules.ts, rate-limit.ts}`, component schemas (`streaming-link`, `distinction`, `credit`, `video`), `creative-work/schema.json`, `credit-role/schema.json`, `user-engagement/server/src/{routes/content-api.ts, controllers/watchlist.ts, services/watchlist.ts, content-types/user-watchlist/schema.json}`, `apps/strapi/src/bootstrap/i18n-locales.ts`.
- Client files read: `lib/strapi-api/{base,public,private,request-auth,content/shorts}.ts`, `app/api/shorts/route.ts(+test)`, `app/[locale]/shorts/**`, `app/[locale]/{layout,error}.tsx`, `features/shorts/{types,components/*}`, `features/events/hooks/*`, `features/events/utils/{eventMappers,watchlistKeys,watchlistQueue,watchlistView,watchlistCache}.ts`, `app/[locale]/watchlist/*`, `components/layout/BottomNav`, `lib/feature-flags.ts`, `env.mjs`, `proxy.ts`, auth forms, `vitest.config.ts`, `eslint.config.mjs`.
- Scratch-app experiments (E1-E10) with headless Chrome hydration checks; Node 22.22.0 `Intl` probe; `npx tsc --noEmit` baseline; vitest baseline on shorts suites.
- Context7 `/vercel/next.js` v16.1.6: ISR guide, `route-segment-config` (`dynamicParams`, `revalidate`), `loading.mdx` (status codes), `not-found.mdx`, `error.mdx`, caching guide (`router.refresh`), `fetch.mdx`.
- Context7 `/websites/strapi_io_cms` (Document Service populate).
- `docs/context/kernel.md`, `apps/client/PRODUCT.md`, the phase CONTEXT/UI-SPEC/DESIGN/EXPERIENCE.

### Secondary (MEDIUM confidence)

- Registry data via `npm view` and the `gsd-tools` package-legitimacy seam.

### Tertiary (LOW confidence)

- None used as a basis for a recommendation.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH, nothing new beyond two shadcn components and one devDependency.
- Architecture (rendering, 404/500, caching): HIGH for Next 16.1.1 runtime behaviour as reproduced; MEDIUM on Turbopack parity (A2).
- API contract and mapper: HIGH, read from source.
- Watchlist integration: HIGH for hook reuse; MEDIUM on the payload contents (A1).
- Pitfalls: HIGH.

**Research date:** 2026-11-10
**Valid until:** 2026-12-10 (Next/Strapi pins are stable; revisit if Next is bumped past 16.1.x or the short-films API contract changes)
