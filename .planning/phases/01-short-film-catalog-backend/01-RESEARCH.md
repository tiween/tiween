# Phase 1: Short-Film Catalog Backend - Research

**Researched:** 2026-10-18
**Domain:** Strapi v5 backend (Document Service, i18n, D&P), Strapi admin plugin UI (events-manager WorkForm), idempotent seed/import with ImageKit media
**Confidence:** MEDIUM-HIGH (in-repo facts HIGH, read this session; Strapi runtime semantics MEDIUM, because the booted harness could not run on this machine, see Environment Availability)

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Data model (SDATA-01)**

- **D-01:** `country` is a non-localized JSON array of ISO 3166-1 alpha-2 codes (`["TN","FR"]`) and supports co-productions. No country content type. Display names come from `Intl.DisplayNames` (client and admin). Applies to all work types. Reversibility: costly (the stored shape feeds the Phase 3 index and the Phase 4 filters).
- **D-02:** `language` is a non-localized JSON array of codes from a **curated** list: `aeb` (Tunisian Arabic), `ar`, `fr`, `en`, `ber` (Amazigh), `none` (silent/no dialogue), plus a short tail if needed. Validated server-side (Zod) against the list. Applies to all work types.
- **D-03:** New repeatable component `creative-works.streaming-link` with fields: `platform` enum (youtube, vimeo, artify, arte, mubi, netflix, other, ...; final list is Claude's discretion); `url`; `accessType` enum `free | included | subscription | rental`; optional `label`. Not localized. Existing `links[]` (`common.link`) is untouched; it stays for social/IMDb-style links. Additive only, `collectionName` preserved.
- **D-04:** "Available online" is **derived, never stored**: true when there is at least one streaming link OR a `videos[]` entry with `videoType=full-length`. "Has awards" is likewise derived from `distinctions[]`.
- **D-05:** `featured` boolean plus optional integer `featuredRank`. Ordered by rank ascending (nulls last), then newest. Shorts only in the admin UI.

**Public API (SDATA-03)**

- **D-06:** Dedicated content-API routes in the `creative-works` plugin: `GET /creative-works/short-films` (list), `GET /creative-works/short-films/featured`, `GET /creative-works/short-films/:slug` (detail, 404 if unknown or unpublished), `GET /creative-works/short-films/:slug/related`. Server-side, the type is forced to `short-film` and `status: 'published'` is always applied. The controller/service owns `populate` and a field allowlist, so no internal or ticketing fields are exposed. Flat Strapi v5 shape with `documentId`. Params are flat and Zod-allowlisted; an unknown or invalid param returns a coded 400 via `apps/strapi/src/shared/validation.ts`, never a 500. Locale param with French fallback. Exposed through the plugin's `public-api` facade for cross-plugin use. Reversibility: costly (Phase 2 and Phase 3 clients bind to this contract).
- **D-07:** List params: `locale`, `genre` (slug), `sort`, `page`, `pageSize`. Default sort is `publishedAt:desc`. Allowlisted sorts: `publishedAt`, `releaseYear`, `duration`, `title`, each asc or desc. `pageSize` defaults to 24, max 48.
- **D-08:** `related` in Phase 1 is deterministic: other published shorts by the same director(s) (directing credits), then shorts sharing a genre, newest first, excluding the film itself, capped at about 6. In **Phase 3 the same route switches to Meilisearch similar-documents** (owner's wish), with this logic kept as the fallback. The contract does not change.
- **D-09:** **Remove** the existing `/creative-works/featured`, `/creative-works/type/:type` and `/creative-works/search` content-API routes and their controller/service methods. They return drafts (no `status` arg) and the "featured" one has no filter. Audit callers first (`/persons/search` and the events-manager venue search are separate and stay).
- **D-10:** **Lean Strapi list (scope narrowing).** Facet filters (duration range, year range, country, language, has awards, available online, platform) are **not** implemented in Strapi. Meilisearch owns text search and facets in Phase 3 (SRCH-03). The Strapi list is the Phase 2 data source and the SRCH-05 fallback. SDATA-03, SDATA-05 and ROADMAP Phase 1 criteria 2-3 are amended to match. Reversibility: reversible.

**Launch catalog (SDATA-04, FR57)**

- **D-11:** Import runs as an idempotent step in the existing seed framework (`apps/strapi/scripts/seeds`): upsert keyed by `slug`; find-or-create `person`, `genre` and `credit-role` records; media uploaded to ImageKit through the upload provider, never hotlinked. Running it twice creates no duplicates. Data lives in a seed data file (alongside `seeds/data/creative-works.json`).
- **D-12:** Media sourcing: the YouTube/Vimeo thumbnail becomes the 16:9 **backdrop**. A real 2:3 **poster** is sourced from festival, distributor or director pages where one exists. Otherwise the poster is left empty, and the client placeholder covers it (Phase 2/4).
- **D-13:** Translations: French is the source. EN and AR title and synopsis are **AI-drafted** and imported published. The owner reviews the Arabic in the admin afterwards. Where `originalTitle` is Arabic, it seeds the AR title.
- **D-14:** Catalog size target is ~30-50 films before launch. Phase 1's done-gate is the 10 vetted mock films plus whatever candidates the owner has approved by then, with the pipeline proven. Reaching 30-50 is a **Phase 6 launch gate**.
- **D-15:** Curation: Claude researches candidates and produces a sheet (title, original title, year, director, duration, country, official link, poster source, distinctions, source URL). The owner approves the sheet before anything is imported.
- **D-16:** Eligibility: Tunisian (co-)production or Tunisian director, AND duration of about 40 minutes or less, AND either legally watchable online through an official channel or platform (no re-uploads) OR festival-selected/awarded, in which case it may be listed with a trailer only.

**WorkForm (SDATA-02)**

- **D-17:** Field visibility: `country` and `language` show for **all** work types. `streamingLinks`, `featured` and `featuredRank` show **only when type = short-film**, following the existing `isPlay -> TheatreDetailsFields` pattern.
- **D-18:** Country and language pickers are searchable Strapi DS multi-selects with names localized via `Intl.DisplayNames` in the admin locale. Tunisia (`TN`) and Tunisian Arabic (`aeb`) are pinned at the top.
- **D-19:** Short-film publish rules: **Block** publish without a poster. **Block** publish without at least one directing credit. **Block** publish without at least one streaming link or a `trailer` video. **Warn only** when duration is over 40 minutes. Draft saves stay permissive. Enforcement is in the form, and server-side on publish as well (exact mechanism is Claude's discretion).

### Claude's Discretion

- The exact `platform` enum values and the long tail of the language code list.
- How `related` combines director and genre matches, and the exact cap.
- Server-side publish enforcement mechanism (Document Service middleware vs lifecycle vs controller).
- Whether the seed data file is JSON or TS, and the media-upload helper design.
- Response envelope details (`meta.pagination`), provided they follow the flat v5 shape.

### Deferred Ideas (OUT OF SCOPE)

- Meilisearch similar-documents for `related` -> Phase 3 (swap the implementation behind the D-06 route; embedder choice decided there).
- Facet filters (duration, year, country, language, awards, online, platform) and text search -> Phase 3 via Meilisearch (already SRCH-03).
- Growing the catalog to 30-50 films -> Phase 6 launch gate (curation runs in parallel from Phase 1).
- Draft-leak audit of other public content-API reads (any `findMany` without `status`) -> hygiene backlog (999.6) if found outside creative-works.
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                                         | Research Support                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDATA-01 | `short-film` creative-work carries country, language, featured, streaming links (additive schema)                   | Schema delta + new `streaming-link` component; i18n flags must be explicit non-localized; `en` locale does not exist at boot (Pitfall 5)                                   |
| SDATA-02 | Admin can create/edit/publish/unpublish in FR, AR, EN from the events-manager Works form                            | **The Works pages are not routed, MediaInput is a URL stub, the form has no locale or publish handling** (Pitfalls 1-3); server-side rules via Document Service middleware |
| SDATA-03 | Public read API (list/genre/sort/pagination/detail/featured/related), published-only, coded errors, locale fallback | Service/controller/route design, overlay-based locale fallback, route URL prefix, cross-DB sort pitfalls                                                                   |
| SDATA-04 | Launch catalog imported, idempotent, ImageKit media                                                                 | Seed entry design, ImageKit fail-closed, upload service call shape, existing-row upsert, publish-bump pitfall                                                              |
| SDATA-05 | Boot-integration tests against real Strapi                                                                          | Harness facts, exact commands, fixture design, stale-install blocker                                                                                                       |
| FR57     | Poster/backdrop/photos uploaded through admin, served via ImageKit                                                  | Replace `MediaInput` stub with the Strapi `media-library` dialog component                                                                                                 |

</phase_requirements>

## Summary

The creative-works plugin already models almost everything a short film needs (credits, cast, distinctions, videos, genres, poster/backdrop/photos). Only four attributes and one component are missing (`country`, `language`, `streamingLinks`, `featured`/`featuredRank`). The public read API is a greenfield build on the proven pattern used by the events-manager plugin (`auth: false` route, Zod `safeParse`/`validate`, Document Service `findMany` + `count`, allowlist projection, `meta.pagination`). The server side is the lower-risk half of this phase.

The higher-risk half is the **admin entry path (SDATA-02, FR57)** and the **launch import**, where research found five facts that CONTEXT.md does not know: (1) `WorksListPage`/`WorkFormPage` exist but are **not routed** anywhere in the events-manager admin, so the WorkForm is currently unreachable; (2) `MediaInput` is a URL-paste stub that fabricates `id: Date.now()`, so nothing is ever uploaded (FR57 is not met by the current form); (3) the form has no locale switcher and no publish/unpublish control, and `poster` is a **localized** media field; (4) the `en` locale is never created by bootstrap (only `fr` and `ar`); (5) venue managers can already create and immediately publish `short-film` works through `createWork`, which would leak incomplete films into the new public API and collide with the D-19 rules. There is also a direct contradiction between D-12 (poster may be empty) and D-19 (publish blocked without a poster) that the import cannot satisfy as written.

**Primary recommendation:** Build the server contract first (schema, shared constants, Zod, service with default-locale base query plus localized-field overlay, controller, routes, Document Service publish-rule middleware) and pin it with a single boot-integration suite. Then fix the admin path (route the Works pages, real media-library picker, locale tabs, publish buttons, streaming-links editor). Then the import pipeline as a separate `seed:shorts` entry (not the existing full `yarn seed`). Resolve the five Open Questions below with the owner before planning the admin and import plans.

## Architectural Responsibility Map

| Capability                                                   | Primary Tier                                               | Secondary Tier                   | Rationale                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Schema (`country`, `language`, `streamingLinks`, `featured`) | Database / Storage (Strapi content-type JSON)              | API / Backend                    | Additive columns/tables created by Strapi schema sync at boot                                    |
| Public short-film reads                                      | API / Backend (creative-works plugin controller + service) | Database                         | Server forces `type`, `status`, populate and field allowlist (D-06)                              |
| Locale fallback (FR default)                                 | API / Backend                                              | -                                | Document Service has no fallback; service must overlay localized fields                          |
| Publish-rule enforcement                                     | API / Backend (Document Service middleware)                | Admin UI (pre-check)             | Server is the authority (covers Content Manager, bulk, releases); form only gives early feedback |
| Admin entry form, pickers, locale tabs                       | Admin UI (events-manager plugin, Strapi Design System)     | API (content-manager endpoints)  | Existing WorkForm lives in events-manager admin                                                  |
| Media upload / delivery                                      | API / Backend (upload plugin + ImageKit provider)          | CDN (ImageKit)                   | Admin picks assets via media-library; importer calls upload service                              |
| Launch import                                                | Backend script (`scripts/seeds`, boots Strapi)             | ImageKit, remote thumbnail hosts | Idempotent upsert by slug using Document Service                                                 |
| Facets, text search, similar                                 | Search (Meilisearch, Phase 3)                              | -                                | Out of scope here (D-10)                                                                         |

## Standard Stack

### Core

| Library                           | Version                                                                                                                      | Purpose                                      | Why Standard                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `@strapi/strapi`                  | lockfile 5.51.2 `[VERIFIED: yarn.lock]`; **installed copy is 5.33.1** `[VERIFIED: node_modules/@strapi/strapi/package.json]` | Document Service, i18n, D&P, content-manager | Project platform                                   |
| `zod`                             | ^3.25.67 `[VERIFIED: apps/strapi/package.json]`                                                                              | Query/body validation                        | Mandated by `src/shared/validation.ts`             |
| `strapi-provider-upload-imagekit` | 5.11.11 installed `[VERIFIED: node_modules]`                                                                                 | Upload provider (ImageKit)                   | Already configured in `config/plugins.ts`          |
| `supertest`                       | ^7 `[VERIFIED: package.json devDependencies]`                                                                                | HTTP assertions against booted Strapi        | Already used by `venue-admin-crud.service.test.ts` |
| `better-sqlite3`                  | 12.11.1 installed, native binding present `[VERIFIED]`                                                                       | Test DB                                      | `config/env/test/database.ts`                      |
| `tsx`                             | 4.22.4 `[VERIFIED: node_modules]` (devDependency)                                                                            | Runs `scripts/seeds/*.ts`                    | Existing `yarn seed`                               |

### Supporting

| Library                                       | Version                                          | Purpose                                          | When to Use                                             |
| --------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------- |
| `@strapi/design-system`, `@strapi/icons`      | via Strapi                                       | WorkForm UI (`MultiSelect`, `Combobox`, `Field`) | All new admin fields (project rule: Design System only) |
| `react-hook-form` + `@hookform/resolvers/zod` | already used in WorkForm                         | Form state                                       | Extend existing `workFormSchema`                        |
| Node `Intl.DisplayNames`                      | Node 22.21.1, ICU 77.1 `[VERIFIED: ran locally]` | Country and language labels                      | D-01/D-18                                               |

### Alternatives Considered

| Instead of                                    | Could Use                                                                          | Tradeoff                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document Service middleware for publish rules | DB lifecycles (`strapi.db.lifecycles.subscribe`, used by events-manager bootstrap) | Lifecycles fire on the row copy at publish time without populated components/relations, so structural rules cannot be evaluated reliably; middleware sees `publish` and can read the draft with populate |
| Vendored ISO 3166 code list                   | `i18n-iso-countries` npm package                                                   | Names are not needed (D-01 uses `Intl`), only 249 codes; avoids a new dependency. See Don't Hand-Roll                                                                                                    |
| Overlay locale fallback                       | Query the requested locale and fall back per row                                   | Per-row fallback breaks pagination/sort/count consistency; overlay keeps one authoritative page                                                                                                          |

**Installation:** No new packages are recommended. (`gsd_run query package-legitimacy check` was not needed: nothing new is installed.)

**Version verification:** `yarn.lock` pins `@strapi/strapi@^5.51.2` -> `version "5.51.2"` `[VERIFIED: yarn.lock]`. The machine's `node_modules` is stale (5.33.1, `qrcode` missing), see Environment Availability. API shapes below were read from the 5.33.1 sources and Context7 docs; they are stable across 5.x but should be re-confirmed by the Wave 0 spike after `yarn install`.

## Package Legitimacy Audit

No external packages are installed or added by this phase. Table intentionally empty.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
| ------- | -------- | --- | --------- | ----------- | ------- | ----------- |
| (none)  | -        | -   | -         | -           | -       | -           |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                        PUBLIC READ PATH (unauthenticated)
 Next.js SSR / any client
        |  GET /api/creative-works/creative-works/short-films[/featured|/:slug|/:slug/related]
        v                (plugin prefix: /api/<plugin>/<route path>)
 [route: auth:false + rate-limit middleware]
        v
 [controller short-film]  -- Zod strict allowlist (shared/validation.ts) --> 400 coded (VALIDATION_FAILED / INVALID_QUERY)
        v
 [service short-films]
   1. defaultLocale <- i18n locales service (never hardcode "fr")
   2. base query: findMany({ locale: defaultLocale, status:'published',
        filters:{ type:'short-film', genres.slug? }, sort, start/limit, populate(allowlist fields) }) + count()
   3. if requested locale != default: second findMany({ locale: requested, status:'published',
        filters:{ documentId $in ids }, fields:[title,synopsis], populate:{poster} }) -> overlay title/synopsis/poster
   4. projection (allowlist) + number coercion (pg decimal as string)
        v
 { data:[...flat v5...], meta:{ pagination } }   or  404 SHORT_FILM_NOT_FOUND

                        ADMIN WRITE PATH
 Strapi admin -> events-manager "Works" pages (NEW routes) -> WorkForm
   locale tabs (default=full form, others=localized fields only) ; media-library picker ; publish/unpublish buttons
        v  content-manager API  (/content-manager/collection-types/<uid>[/:id][?locale=])
 [Document Service]  <-- strapi.documents.use(): short-film publish-rule guard (publish, and create/update with status:'published')
        v                      issues -> ValidationError details.code (coded)
 creative-work rows (one row per locale; non-localized fields synced)

                        IMPORT PATH (operator, offline)
 data/short-films.json (owner-approved sheet) --> scripts/seeds/shorts.ts (boots Strapi, fail-closed on non-ImageKit provider)
   find-or-create genre/person/credit-role -> download thumbnail/poster (host allowlist) -> upload service -> ImageKit
   -> upsert creative-work by slug (create fr, update ar/en localized fields, publish only if changed)
```

### Recommended Project Structure

```
apps/strapi/src/components/creative-works/streaming-link.json     # NEW component (collectionName components_creative_works_streaming_links)
apps/strapi/src/shared/short-film-rules.ts                        # NEW pure: publish-rule evaluator + LANGUAGE_CODES + ISO codes (importable by admin, precedent: venues admin imports shared/website-url)
apps/strapi/src/plugins/creative-works/server/src/
  content-types/creative-work/schema.json                         # +country, language, streamingLinks, featured, featuredRank
  validation/short-films.ts                                       # Zod query schemas (strict) + country/language write schemas
  services/short-films.ts                                         # list / featured / findBySlug / related + overlay + projection
  controllers/short-film.ts                                       # HTTP + coded error envelope (pattern: venues controllers/venue-admin.ts STATUS_BY_CODE)
  routes/content-api.ts                                           # remove 3 routes, add 4 (+ keep /persons/search)
  middlewares/index.ts                                            # short-films rate limit (shared/rate-limit)
  register.ts                                                     # strapi.documents.use(shortFilmPublishGuard)
  services/public-api.ts                                          # +findShortFilms / findShortFilm / findFeaturedShortFilms / findRelatedShortFilms
apps/strapi/src/bootstrap/i18n-locales.ts                         # add "en"
apps/strapi/src/plugins/events-manager/admin/src/
  pages/App.tsx, components/SideNav/index.tsx, translations/{en,fr,ar}.json   # route + nav the Works pages
  components/WorkForm/*                                           # StreamingLinksEditor, CountryLanguageFields, locale tabs, publish bar
  components/MediaInput/index.tsx                                 # replace stub with media-library dialog
apps/strapi/scripts/seeds/
  shorts.ts                                                       # NEW entry: yarn seed:shorts
  data/short-films.json                                           # owner-approved catalog
  utils/short-film-import.ts (+ .unit.test.ts)                    # pure mapping, mirrors utils/creative-work-relations.ts
  utils/media-upload.ts                                           # download + upload service helper
apps/strapi/tests/fixtures/short-films.ts                         # NEW fixtures
apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts   # NEW boot suite
```

### Pattern 1: Public read route (copy of events-manager precedent)

**What:** `auth: false` content-api route, Zod validation, Document Service `findMany` + `count` with `start/limit`, `meta.pagination`.
**Example:**

```typescript
// Source: apps/strapi/src/plugins/events-manager/server/src/services/events.ts:329-352 (read this session)
const [data, total] = await Promise.all([
  strapi.documents(EVENT_UID).findMany({
    status: "published",
    locale,
    filters,
    sort: sort ?? "startDateTime:asc",
    populate: EVENT_POPULATE,
    start: (page - 1) * pageSize,
    limit: pageSize,
  } as never),
  strapi
    .documents(EVENT_UID)
    .count({ status: "published", locale, filters } as never),
])
// meta: { pagination: { page, pageSize, pageCount, total } }
```

Routes carry `config: { policies: [], auth: false }` (events-manager `routes/index.ts` read this session). Do NOT write `auth: true` (boot fails with `Invalid route config`, documented in that file).

### Pattern 2: Coded error envelope

`ValidationError` thrown by `validate()` surfaces over HTTP as `response.body.error.details.code === "VALIDATION_FAILED"` `[VERIFIED: venues/server/src/__tests__/venue-admin-crud.service.test.ts:125]`. For non-validation codes use the venues controller pattern (`STATUS_BY_CODE` map, unmapped codes collapse to 500 `INTERNAL_ERROR` and are logged) `[VERIFIED: venues/server/src/controllers/venue-admin.ts:28-96]`. Proposed codes: `VALIDATION_FAILED` (400, from `validate()`), `INVALID_QUERY` (400), `SHORT_FILM_NOT_FOUND` (404).

### Pattern 3: Default-locale base query + localized-field overlay (locale fallback)

**What:** Document Service has no locale fallback. A `findMany({locale:'ar', status:'published'})` returns only documents whose AR row is published. Per-row fallback would corrupt pagination/count/sort. Query the **default locale** for filtering, sorting and paging, then overlay only the localized fields (`title`, `synopsis`, `poster`) from the requested locale for the page's `documentId`s.
**Rules:**

- Default locale comes from `strapi.plugin("i18n").service("locales").getDefaultLocale()` (existing rule: "Locale codes are enumerated from the i18n plugin, never hardcoded", see `listLocaleCodes` in `services/creative-work.ts`).
- Contract to document: a short film is public iff its **default-locale row is published**.
- Do NOT overlay `genres`/`credits` from the AR row: populated relations follow the parent row's locale and genre/credit-role `name` are localized, so a missing AR genre row may populate empty `[ASSUMED]`. Keep relations from the base row; look genre names up separately in the requested locale with fallback.
- Surface the served locale per item (`locale` is already on each Document Service row) so Phase 2 FR56 can tell a fallback from a translation.
- Return `creditRole.slug` + `department` and let the client translate role labels by slug (role `name` is localized and the seed only writes FR).
  **Poster caveat:** `poster` is `"localized": true` `[VERIFIED: schema.json:104-111]`, so the AR/EN rows have their own (initially empty) poster. Overlay `poster` only when the requested-locale row has one; otherwise keep the base poster.

### Pattern 4: Publish-rule guard as Document Service middleware

**What:** Register in `creative-works/server/src/register.ts` via `strapi.documents.use((ctx, next) => ...)` `[CITED: docs.strapi.io Document Service middlewares; Context7 /strapi/documentation]`.
**Why a middleware:** The Content Manager `publish` and bulk `publishMany` both call `strapi.documents(uid).publish(...)` `[VERIFIED: node_modules/@strapi/content-manager/dist/server/services/document-manager.js:140-162]`, so one guard covers single publish, bulk publish and releases. Core `create`/`update` with `status:'published'` call the internal `publish` function directly (`@strapi/core .../repository.js:108,192`), which does **not** re-enter the middleware, so the guard must also inspect `create`/`update` actions where `params.status === 'published'`.
**Mechanics:**

- Guard only `uid === "plugin::creative-works.creative-work"`. Resolve `type` from `params.data.type` (create/update) or from the draft row (publish). Only `short-film` is checked.
- For `publish`, `params.locale` may be undefined (default locale only), a code, or `'*'` `[CITED: Document Service publish docs]`. Evaluate the **default-locale draft** (structural data is non-localized and synced; `poster` is localized so default-locale poster is the reference) with `populate: { poster, credits: { populate: ['creditRole'] }, streamingLinks, videos }`.
- Throw `new errors.ValidationError("Short film cannot be published", { code: "SHORT_FILM_PUBLISH_BLOCKED", issues: [{ path, code }] })` with issue codes `POSTER_REQUIRED`, `DIRECTOR_REQUIRED`, `WATCH_SOURCE_REQUIRED`, `SLUG_REQUIRED`. Duration > 40 is a **warning**, not an issue.
- Directing credit = credit whose `creditRole.slug` is in `DIRECTING_ROLE_SLUGS = ["director"]`. Slug evidence: `scripts/seeds/data/credit-roles.json:4` -> `"slug": "director"` (department `"directing"`). Match by slug, not the localized name (CONTEXT canonical rule).
- Watch source = at least one `streamingLinks` entry OR a `videos` entry with `videoType === "trailer"` (D-19). Note D-04's "available online" uses `full-length`; D-19 uses `trailer`. They are different predicates, keep both distinct.
- Provide a narrowly scoped bypass for the importer (see Open Question 1) rather than disabling the guard globally.
- Put the pure evaluator in `src/shared/short-film-rules.ts` so the WorkForm pre-check and the server share one implementation (precedent: `plugins/venues/admin/src/components/VenueFormModal/validate.ts:15` imports `shared/website-url`).

### Pattern 5: Cross-DB-safe ordering

Test DB is SQLite, production is Postgres. NULL ordering differs (SQLite sorts NULL first on ASC, Postgres last) `[ASSUMED, standard SQL engine behavior; tests/README.md documents other SQLite/Postgres divergences]`. Therefore:

- `featured`: filter `featured:true`, fetch (cap ~100), sort **in JavaScript**: `featuredRank` asc nulls last, then `publishedAt` desc. Never rely on DB null ordering for D-05.
- List sorts on nullable columns (`duration`, `releaseYear`): always append a deterministic tiebreaker (`id:desc`) and keep boot-test fixtures free of nulls for those sorts.
- `title` sort collation differs (case-sensitive in SQLite, locale-aware in Postgres, per `tests/README.md`); use lowercase ASCII titles in sort fixtures.

### Pattern 6: `related`

Two Document Service queries then in-memory merge: (1) published shorts excluding self whose `credits` contain a director credit by any of the film's director `person.documentId`s (`filters: { credits: { person: { documentId: { $in } }, creditRole: { slug: "director" } } }`), (2) published shorts sharing a genre (`genres.documentId $in`), each ordered `publishedAt:desc`, concatenated director-first, de-duplicated by `documentId`, capped (recommend 6). Nested component+relation filters are exactly the class of semantics DW-258 says were never exercised against a real query engine, so the boot suite must cover them; if nested component filtering misbehaves, fall back to fetching published shorts with minimal credits populate and matching in memory (catalog is tens of films).

### Anti-Patterns to Avoid

- **`strapi.documents(uid).findMany()` without `status`:** returns drafts. Every public read passes `status: "published"` (CONTEXT "Established Patterns", reason for D-09).
- **Reading the requested locale for paging/sort:** corrupts pagination when translations are partial.
- **Trusting DB null ordering** (see Pattern 5).
- **Extending `scripts/seeds/clear.ts` or running `yarn seed:fresh` against a real catalog:** `clear.ts` deletes every `creative-work` document (`CONTENT_TYPES` lists the type) and would wipe the launch catalog.
- **Cross-plugin `strapi.documents()` with a foreign UID** (kernel R4). Events-manager must reach shorts only via the creative-works `public-api` facade.
- **Hardcoding locale codes** (`"fr"`, `["fr","ar","en"]`).

### Suggested decomposition (for the planner)

1. **Wave 0:** `yarn install --frozen-lockfile`, prove an existing boot suite runs, run the spike probes (Assumptions Log items marked "spike").
2. **Wave 1 (parallel-safe):** schema + component + shared constants/rules + Zod; `en` locale bootstrap; D-09 route removal + doc updates.
3. **Wave 2:** short-film service/controller/routes/rate-limit/public-api; publish-rule middleware; boot-integration suite (SDATA-05) written alongside.
4. **Wave 3 (admin):** route the Works pages, real media-library picker, StreamingLinksEditor, country/language pickers, locale tabs, publish/unpublish bar, client-side rule pre-check, admin jsdom tests.
5. **Wave 4 (import):** curation sheet (blocks on owner approval, D-15), mapping + media helper (unit-tested), `seed:shorts`, idempotency test, dev run against ImageKit.

## Don't Hand-Roll

| Problem                        | Don't Build                              | Use Instead                                                                                                                                 | Why                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query validation + error codes | Ad-hoc `if (!x) ctx.badRequest("prose")` | `validate()` from `src/shared/validation.ts` with strict Zod                                                                                | Existing kit; yields `details.code`                                                                                                                                                   |
| Rate limiting                  | New limiter                              | `createRateLimit` from `src/shared/rate-limit.ts` via a named plugin middleware (see events-manager `middlewares/index.ts`)                 | Existing, tested                                                                                                                                                                      |
| Pagination envelope            | Custom meta shape                        | `{ page, pageSize, pageCount, total }` as in events `findEvents`                                                                            | Phase 2 client already expects Strapi shape                                                                                                                                           |
| Country names / language names | Name tables                              | `Intl.DisplayNames` (D-01/D-18)                                                                                                             | CLDR data. Exceptions below                                                                                                                                                           |
| ISO 3166 alpha-2 code list     | Regex-only validation                    | One vendored `ISO_3166_ALPHA2` constant (249 codes) in `src/shared/` plus a unit test that every entry resolves through `Intl.DisplayNames` | `Intl` cannot enumerate countries; 279 two-letter codes resolve in `en` (includes non-country regions) `[VERIFIED: ran on Node 22.21.1]`, so enumeration via `Intl` would over-accept |
| Media picker                   | Upload form with `fetch` + FormData      | Strapi `media-library` dialog component                                                                                                     | See Pitfall 2; same pattern Strapi's own WYSIWYG uses                                                                                                                                 |
| Slug generation                | Custom slugger in the form               | Content Manager uid service (`generateUIDField`) server-side, or explicit slug in imports                                                   | Document Service does not generate uids (Pitfall 6)                                                                                                                                   |
| Image hosting                  | Hotlinking or storing remote URLs        | Strapi upload service -> ImageKit provider                                                                                                  | D-11                                                                                                                                                                                  |
| Idempotent create              | "check then create" without a key        | Upsert keyed by `slug` (default-locale lookup via `findFirst`)                                                                              | Mirrors every existing seeder                                                                                                                                                         |

**Key insight:** every deceptively hard part here already has a house pattern (events public reads, venues error envelope, shared rate-limit, seed relation helpers). The new risk is not algorithmic, it is that three admin pieces the roadmap assumes exist (routes, uploader, locale/publish UI) do not.

## Runtime State Inventory

Not a rename/refactor phase; this is additive. Explicit answers for the migration-adjacent items:

| Category            | Items Found                                                                                                                                                                                                                                                                                                                                            | Action Required                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored data         | Existing `creative_works` rows (5 dev-seeded real shorts `khalaa`, `le-masseur`, `petit-frere`, `les-souliers-de-laid`, `comme-un-fils` and 5 fake shorts `fragments-tunis`, `derniere-vague`, `souvenirs-medina`, `cafe-nocturne`, `generation-z` in `creative-works.json` `[VERIFIED: ran python over the file]`) in any dev DB that ran `yarn seed` | Importer must **update** existing rows by slug (current seeders skip-if-exists and never update); decide fate of the 5 fake shorts (Open Question 7) |
| Live service config | Production Postgres schema: Strapi auto-syncs additive columns/tables at boot (`main` auto-deploys)                                                                                                                                                                                                                                                    | None beyond additive-only schema; no data migration                                                                                                  |
| OS-registered state | None                                                                                                                                                                                                                                                                                                                                                   | None                                                                                                                                                 |
| Secrets/env vars    | `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_FOLDER` `[VERIFIED: apps/strapi/.env.example, docker-compose.prod.yml:80-83]`. Unset keys silently fall back to local `public/uploads` (`config/plugins.ts` `prepareImageKitConfig`)                                                                                 | Importer must fail closed when provider is not ImageKit (non-dev)                                                                                    |
| Build artifacts     | `apps/strapi/dist/` must be rebuilt after any source change for boot suites (`assertTestDistFresh`); plugin `strapi-server.js` always loads from `dist/` `[VERIFIED: creative-works/strapi-server.js]`                                                                                                                                                 | `yarn build:test-dist` before every boot run                                                                                                         |

## Common Pitfalls

### Pitfall 1: The Works pages are not reachable

**What goes wrong:** SDATA-02 assumes "the existing events-manager Works form". `WorksListPage` and `WorkFormPage` are imported by nothing. `pages/App.tsx` routes only `dashboard`, `planning`, `import` plus a catch-all redirect; `SideNav` `NAV_ITEMS` has only dashboard/planning/import; `git log -S"WorkFormPage" -- pages/App.tsx` returns nothing, i.e. they were never routed `[VERIFIED: read pages/App.tsx, SideNav/index.tsx:21-23, git log -S]`.
**How to avoid:** Plan an explicit task: add `works`, `works/new`, `works/:documentId` routes (the pages already `navigate()` to `/plugins/events-manager/works[/...]` via `BASE_PATH`), a SideNav item, and `events-manager.sidenav.works` strings in `translations/{en,fr,ar}.json`. Note the translations file has only the three sidenav keys today.
**Warning signs:** a plan that only lists "add fields to WorkForm".

### Pitfall 2: `MediaInput` does not upload (FR57)

**What goes wrong:** `MediaInput` "Add from URL" builds `{ id: Date.now(), name, url, mime: "image/*" }` `[VERIFIED: MediaInput/index.tsx:89 "id: Date.now(), // Temporary ID"]`, and `workToApiPayload` sends `poster: values.poster?.id ?? null` `[VERIFIED: WorkForm/schema.ts:460]`. A fake id is posted as a media relation. Nothing reaches ImageKit.
**How to avoid:** Replace the modal with Strapi's media-library dialog: `const components = useStrapiApp('X', s => s.components); const MediaLibraryDialog = components['media-library']` rendered with `onClose` and `onSelectAssets(files)`; selected files carry the real `id`, `url`, `formats` `[VERIFIED: @strapi/content-manager/dist/admin/pages/EditView/components/FormInputs/Wysiwyg/Field.js:40-41,109-112; registered by @strapi/upload dist/admin/index.js:84-89]`. The jest mock `tests/__mocks__/strapi-admin.ts` must gain `useStrapiApp`.
**Warning signs:** MediaInput tests that only assert URL paste.

### Pitfall 3: Locale and publish are absent from the form

**What goes wrong:** `useWork`/`useWorkMutations` call `/content-manager/collection-types/<uid>[/:id]` with no `locale` param; `WorkFormPage` only saves (draft, default locale). `publishWork`/`unpublishWork` exist in the hook but nothing calls them (`grep publish pages/Works` finds only a "Published" badge). `title`, `synopsis` and `poster` are `localized: true`; everything else is shared. A save from this form can therefore never create the AR or EN row, and cannot publish.
**How to avoid:** Locale tabs in `WorkForm`. Default locale: full form, `?locale=<default>`. Other locales: show/edit only the localized fields and send **only** those (REST docs: "When creating a localization for existing localized entries, the body of the request can only accept localized fields" `[CITED: Context7 /strapi/documentation rest/locale]`). Publish/unpublish with `?locale=` (single) and a "publish all locales" action using `locale: '*'`. Whether content-manager `PUT ...?locale=ar` creates a missing locale row is a spike item (Assumptions A3). Fallback if it does not: admins use the native Content Manager for translations; the Document Service guard still applies.
**Also:** after server-side block, map `details.code` / `issues[].code` to translated notifications (error codes, not prose).

### Pitfall 4: Venue managers can publish short films today

**What goes wrong:** `POST /api/events-manager/venue/creative-works` accepts `type` in `["film","play","short-film"]` `[VERIFIED: events-manager/server/src/validation/venue-events.ts:40]` and `createWork` publishes immediately in all locales (`publish({ documentId, locale: "*" })`, `creative-work.ts:143-146`). The new public API would expose such an entry (no poster, no director, no slug since `createWork` never sets one), and the D-19 guard would break that flow with a `ValidationError`.
**How to avoid:** Decision needed (Open Question 2). Recommended: remove `short-film` from the venue-manager accepted types (server `CREATIVE_WORK_TYPES` in validation plus client schema `CREATIVE_WORK_TYPES`); shorts are operator-curated in v1. Venue managers can still schedule existing shorts (`TYPE_RULES` `"short-film"` stays).

### Pitfall 5: The `en` locale is never created

**What goes wrong:** `REQUIRED_LOCALES = [DEFAULT_LOCALE, { code: "ar", name: "Arabic (ar)" }]` `[VERIFIED: src/bootstrap/i18n-locales.ts:10]`. `config/plugins.ts` declares `locales: ["fr","ar","en"]` but the i18n plugin's `initDefaultLocale` only creates the default locale when zero locales exist `[VERIFIED: node_modules/@strapi/i18n/dist/server/services/locales.js:78-86]`; no config-driven creation. EN content cannot be written. In the boot-test DB `en` is also absent.
**How to avoid:** Add `{ code: "en", name: "English (en)" }` to `REQUIRED_LOCALES` and extend the bootstrap unit coverage. The standalone seed boots with `distDir: process.cwd() + "/.build"` (`seeds/index.ts:753`, directory does not exist), so app-level `src/index.ts` bootstrap likely does not run there: the new `seed:shorts` must call `ensureI18nLocales` itself `[ASSUMED]`.

### Pitfall 6: Slug is never generated server-side

**What goes wrong:** `slug` is a non-required `uid` with `targetField: "title"` (`schema.json:36`). uid generation exists only behind the content-manager `uid/generate` endpoint (`@strapi/content-manager/dist/server/services/uid.js` `generateUIDField`), which the admin UI calls interactively. The form sends `slug: orNull(values.slug)` `[VERIFIED: WorkForm/schema.ts:397]` and its placeholder promises "Generated from the title when empty". A published short with a null slug is unreachable by `/:slug` and listed with `slug: null`.
**How to avoid:** Make slug a publish rule (`SLUG_REQUIRED`) and have the form call the uid generator (or generate on blur); importer sets explicit slugs. Optionally generate server-side in the middleware for `create`/`update` of short films `[ASSUMED]` that `strapi.service("plugin::content-manager.uid")` is callable.

### Pitfall 7: D-12 versus D-19 (import cannot publish posterless films)

**What goes wrong:** D-12 leaves the poster empty when no real 2:3 source exists; D-19 blocks publish without a poster; D-11/D-13 import films as **published**; ROADMAP criterion 4 says published "with posters". In the mock file only a thumbnail exists per film (all `poster.url` are `i.ytimg.com` stills or `artify.tn`) `[VERIFIED: mock-shorts.ts read]`.
**How to avoid:** Owner/planner decision (Open Question 1). Mechanically the importer must either bypass the guard explicitly or import posterless films as draft with a report.

### Pitfall 8: Re-publish bumps `publishedAt` (default sort churn)

**What goes wrong:** D-07's default sort is `publishedAt:desc`. A second import run that blindly `update` + `publish`es every film resets publish time `[ASSUMED, spike]`, reordering the directory. `firstPublishedAt` exists in core only behind `features.future.experimental_firstPublishedAt` `[VERIFIED: @strapi/utils content-types hasFirstPublishedAtField]`, do not use it.
**How to avoid:** Importer computes a deep-equal of mapped payload vs existing and skips unchanged films; idempotency test asserts `publishedAt` unchanged on re-run.

### Pitfall 9: Component arrays and relations on update

`update` replaces repeatable component arrays wholesale (the WorkForm comment says the same: "re-sends credits and cast wholesale and Strapi replaces component arrays on write"). The importer's update path must send the full arrays or it deletes manual edits. Also: populated relations on a **published** read only return **published** targets. `person` and `credit-role` are `draftAndPublish: true` `[VERIFIED: both schema.json]`, so a person created from the WorkForm combobox as a draft will silently vanish from the public `credits[].person`. The seed uses `status: "published"` for persons; `PersonCombobox`/`usePersonMutations.createPerson` does not publish. Fix: publish persons on create in the picker flow (hook `publishPerson` already exists) or populate fallback.

### Pitfall 10: Rate limiter behind the proxy

`config/server.ts` sets no `proxy`; `createRateLimit` keys on `ctx.state.ip ?? ctx.ip` and its own header says X-Forwarded-For trust is out of scope. Behind Dokploy/Traefik every request may share the proxy IP, making "per-IP" effectively global `[ASSUMED]`. Use a generous cap (events uses 100/min for a single SSR caller) or rely on the `pageSize` cap alone; do not set a low limit.

### Pitfall 11: Postgres returns `decimal`/`int` as strings

`rating` is `decimal`. `sanitize-public.ts` documents that `pg` returns decimals as strings. Coerce numerics in the projection.

### Pitfall 12: Route shape and ordering

Content-API plugin routes mount at `/api/<plugin>/<path>`: the real URLs are `/api/creative-works/creative-works/short-films...` `[VERIFIED: apps/client/src/lib/strapi-api/base.ts:23 maps "plugin::creative-works.creative-work" -> "/creative-works/creative-works"; docs/PERMISSIONS.md:138 lists /api/events-manager/venue/creative-works/search for route /venue/creative-works/search]`. Register `/short-films/featured` and `/short-films/:slug/related` **before** `/short-films/:slug`, and reserve the slug `featured`. Do not rely on `strapi::query` unknown-key handling; `.strict()` Zod rejects cache-busters, so the Phase 2 client must send only allowlisted params (D-06 mandates the coded 400; the events controller instead strips unknowns, so this is a deliberate difference).

## Code Examples

### Strict query schema (D-06/D-07)

```typescript
// Source: pattern from events-manager/server/src/controllers/events.ts (read this session) + shared/validation.ts
import { z } from "zod"

import { validate } from "../../../../../shared/validation"

export const SHORT_FILM_SORTS = [
  "publishedAt:asc",
  "publishedAt:desc",
  "releaseYear:asc",
  "releaseYear:desc",
  "duration:asc",
  "duration:desc",
  "title:asc",
  "title:desc",
] as const

export const shortFilmListQuerySchema = z
  .object({
    locale: z.string().min(2).max(10).optional(),
    genre: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(SHORT_FILM_SORTS).default("publishedAt:desc"),
    page: z.coerce.number().int().positive().max(10_000).default(1),
    pageSize: z.coerce.number().int().positive().max(48).default(24),
  })
  .strict()

// controller: const q = validate(shortFilmListQuerySchema, ctx.query)  -> throws ValidationError(details.code=VALIDATION_FAILED)
```

### Source of truth values quoted from the repo (for task actions)

- Creative-work UID: `plugin::creative-works.creative-work`; type enum `"enum": ["film", "play", "short-film"]` `[VERIFIED: schema.json:47]`.
- Video types: `"trailer","teaser","clip","featurette","interview","behind-the-scenes","full-length"` `[VERIFIED: src/components/common/video.json]`.
- Credit role slugs `"slug": "director"`, `"slug": "other"` `[VERIFIED: credit-roles.json]`; generic set `new Set(["other", "autre"])` `[VERIFIED: WorkForm/schema.ts:38]`.
- Distinction `result` enum: `selected, nominated, winner, special-mention, honorable-mention, grand-prize` `[VERIFIED: components/creative-works/distinction.json]` (mock `won: true/false` maps to `winner` / `nominated`, but owner approves facts per D-15).
- Existing content-API paths to remove: `"/creative-works/featured"`, `"/creative-works/type/:type"`, `"/creative-works/search"` (keep `"/persons/search"`) `[VERIFIED: routes/content-api.ts:6,14,22,30]`.

### New component (shape follows sibling components; enum membership beyond D-03 is discretion)

```json
{
  "collectionName": "components_creative_works_streaming_links",
  "info": {
    "displayName": "Streaming Link",
    "icon": "play",
    "description": "Where a short film can be watched online"
  },
  "options": {},
  "attributes": {
    "platform": {
      "type": "enumeration",
      "enum": [
        "youtube",
        "vimeo",
        "dailymotion",
        "artify",
        "arte",
        "mubi",
        "netflix",
        "other"
      ],
      "required": true
    },
    "url": { "type": "string", "required": true },
    "accessType": {
      "type": "enumeration",
      "enum": ["free", "included", "subscription", "rental"],
      "required": true,
      "default": "free"
    },
    "label": { "type": "string" }
  }
}
```

New attributes on `creative-work` follow the existing explicit style: `"pluginOptions": { "i18n": { "localized": false } }` on `country` (json), `language` (json), `streamingLinks` (component, repeatable), `featured` (boolean, default false), `featuredRank` (integer, min 1). Be explicit: an attribute with no flag is not guaranteed non-localized in the content-type builder UI.

### Seed upload call shape (media)

```typescript
// Source: node_modules/@strapi/upload/dist/server/services/upload.js:141-170 (read this session)
const [file] = await strapi
  .plugin("upload")
  .service("upload")
  .upload({
    data: {
      fileInfo: { name: `${slug}-backdrop.jpg`, alternativeText: `${title}` },
    },
    files: {
      filepath,
      originalFilename: `${slug}-backdrop.jpg`,
      mimetype: "image/jpeg",
      size,
    },
  })
// idempotency: look up first -> strapi.db.query("plugin::upload.file").findOne({ where: { name: `${slug}-backdrop.jpg` } })
```

The ImageKit provider uploads `file.hash + file.ext` into `params.folder` and stores `provider_metadata.fileId` `[VERIFIED: strapi-provider-upload-imagekit/lib/index.js]`. Strip `provider_metadata`, `hash`, `provider`, `folderPath` from public output by populating media with an explicit `fields` list (url, width, height, alternativeText, formats, mime).

### Import upsert sketch

```typescript
// Per film: find by slug in default locale -> create(status:'draft') or update; then fill ar/en localized fields; publish only when changed
const existing = await strapi
  .documents(UID)
  .findFirst({ filters: { slug }, locale: defaultLocale, status: "draft" })
// create: documents(UID).create({ data, locale: defaultLocale })           // data includes credits/cast/videos/streamingLinks/country/language/genres
// per other locale: documents(UID).update({ documentId, locale, data: { title, synopsis, poster } })   // localized fields only
// publish: documents(UID).publish({ documentId, locale: "*" })           // only if payload differs
```

## State of the Art

| Old Approach                                     | Current Approach                       | When Changed | Impact                        |
| ------------------------------------------------ | -------------------------------------- | ------------ | ----------------------------- |
| Entity Service                                   | Document Service (`strapi.documents`)  | Strapi v5    | Kernel forbids Entity Service |
| `data.attributes.x`                              | Flat `data.x`, address by `documentId` | v5           | Do not remap                  |
| Lifecycle hooks for publish validation           | Document Service middleware            | v5           | Use `strapi.documents.use`    |
| Config-driven locale creation (assumed v4 habit) | i18n creates only the default locale   | v5           | Bootstrap must create `en`    |

**Deprecated/outdated:** the three `creative-work` content-API routes (D-09); `entity-properties` plugin (never build on it); `common.video.type` legacy enum (use `videoType`).

## Assumptions Log

| #   | Claim                                                                                                                                                                                                                           | Section    | Risk if Wrong                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| A1  | `strapi.documents.use()` registered in the plugin `register()` receives `publish` calls from the content-manager and `create/update` with `status:'published'`, and `ValidationError` surfaces as HTTP 400 in the admin (spike) | Pattern 4  | Enforcement mechanism must change (controller wrapper or lifecycle)                 |
| A2  | `publish()` of an already-published document resets `publishedAt` (spike)                                                                                                                                                       | Pitfall 8  | If false, skip-if-unchanged is just an optimisation                                 |
| A3  | Content-manager `PUT /collection-types/:uid/:id?locale=ar` creates a missing locale row from localized fields only (spike)                                                                                                      | Pitfall 3  | Locale tabs need a different create path; fallback is native Content Manager        |
| A4  | Populating relations from an AR row may drop genres whose AR row is missing                                                                                                                                                     | Pattern 3  | Overlay design already avoids it; only affects whether extra safeguards are needed  |
| A5  | Nested `credits.person.documentId $in` + `creditRole.slug` filter works in the Document Service query engine on SQLite and Postgres                                                                                             | Pattern 6  | Use in-memory matching fallback                                                     |
| A6  | NULL ordering differs SQLite vs Postgres for ASC sorts                                                                                                                                                                          | Pattern 5  | JS-side sort and tiebreakers remain harmless                                        |
| A7  | Behind Dokploy, `ctx.ip` is the proxy IP (no `server.proxy`)                                                                                                                                                                    | Pitfall 10 | Limiter is more effective than assumed; generous limit still safe                   |
| A8  | `seed:shorts` booted with a non-existent `.build` distDir skips app-level `src/index.ts` bootstrap                                                                                                                              | Pitfall 5  | If bootstrap does run, calling `ensureI18nLocales` again is idempotent and harmless |
| A9  | `strapi.service("plugin::content-manager.uid").generateUIDField` is callable server-side from a middleware                                                                                                                      | Pitfall 6  | Generate slug with an in-repo slugifier instead                                     |
| A10 | Existing boot suites pass at HEAD on a correctly installed machine (not provable here)                                                                                                                                          | Validation | Wave 0 must prove it before any new suite is trusted                                |
| A11 | YouTube `maxresdefault.jpg` is absent for some videos (needs `hqdefault.jpg` fallback)                                                                                                                                          | Import     | Import marks the film for manual backdrop                                           |
| A12 | `Intl.DisplayNames` in the admin browser behaves like Node 22 for `aeb`                                                                                                                                                         | D-18       | Explicit i18n strings needed anyway for `aeb`/`ber`/`none` (verified gaps below)    |

## Open Questions

1. **D-12 vs D-19: how are posterless films published by the import?**
   - Known: mock data has only 16:9 thumbnails; D-19 blocks publish without poster; ROADMAP criterion 4 expects posters.
   - Recommendation: keep the guard strict for humans; give the importer an explicit, logged bypass (in-process context flag, importable only from `scripts/seeds`), and make Phase 4 client placeholder cover empty posters. Alternative: owner agrees "poster OR backdrop satisfies the rule". Needs an owner decision.
2. **Venue-manager `createWork` for `short-film`** (Pitfall 4). Recommendation: disallow `short-film` there.
3. **Locale scope of the WorkForm.** Recommendation: locale tabs (default full form; others localized-only) plus publish bar. Confirm the owner accepts translation via the native Content Manager as the fallback if spike A3 fails.
4. **`poster` is localized.** Recommendation: do not flip the `localized` flag on an existing attribute (data-behaviour risk, not additive); instead replicate the poster id to every locale on save/import and overlay-with-fallback on read.
5. **Launch data quality.** Two of the 10 mock films cannot satisfy D-19 as-is: `chrifa-bent-el-fadhel` lists `KDH Prod` (a production company) as director, and `tahtima` has `directors: []` `[VERIFIED: mock-shorts.ts]`. Facts such as Oscar/Sundance awards and countries are unverified; D-15's owner-approved sheet is the gate. Plan the curation task before import.
6. **Production import execution path.** `tsx` is a devDependency and the Dockerfile installs `--production`, so `yarn seed:shorts` cannot run inside the deployed container `[VERIFIED: Dockerfile, package.json]`. Phase 1 only needs the pipeline proven on dev/staging DB; make the importer a pure function of a booted `strapi`, so Phase 6 can run it from a developer machine against production env or via an admin-only route.
7. **The 5 fake dev shorts** in `creative-works.json` would appear in the new public API in dev and are referenced by `tests/fixtures/index.ts`. Recommendation: remove or retype them and update the fixture; keep `seed:clear` out of the loop.
8. **Genre list for Phase 2 filter UI.** No route exposes genres. Out of D-06's list; flag to Phase 2/3 (Meilisearch facets cover it later).

## Environment Availability

| Dependency                                      | Required By             | Available                                                                | Version                                                                                         | Fallback                                                                                     |
| ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Node                                            | everything              | yes                                                                      | v22.21.1 (engines >=22) `[VERIFIED: node --version]`                                            | -                                                                                            |
| Yarn 1                                          | scripts                 | yes                                                                      | 1.22.22                                                                                         | -                                                                                            |
| Installed `node_modules` matching lockfile      | boot suites, build      | **no**                                                                   | `@strapi/strapi` 5.33.1 vs lockfile 5.51.2; `qrcode` missing `[VERIFIED: ls, tsc error TS2307]` | `yarn install --frozen-lockfile` (Wave 0)                                                    |
| SQLite (`better-sqlite3` native binding)        | boot suites             | yes                                                                      | 12.11.1, `build/Release/better_sqlite3.node` present                                            | -                                                                                            |
| Postgres (dev DB via `docker compose up -d db`) | dev seed/import run     | Docker CLI present (29.7.2); daemon not confirmed                        | -                                                                                               | Run import against SQLite test DB for the idempotency test; Postgres only for manual dev run |
| `.env` for `apps/strapi`                        | boot (APP_KEYS etc.)    | yes locally (content not read, secret-guarded); CI copies `.env.example` | -                                                                                               | `cp .env.example .env`                                                                       |
| ImageKit credentials                            | real media import       | unknown (cannot read `.env`)                                             | -                                                                                               | Local provider for tests; **importer must refuse non-dev runs on local provider**            |
| `sharp`                                         | upload image processing | yes 0.33.5                                                               | -                                                                                               | -                                                                                            |
| Outbound network (thumbnails)                   | import                  | not probed                                                               | -                                                                                               | Unit tests inject a downloader stub                                                          |

**Verified failure (this session):** `yarn build:test-dist` emitted `dist/` with one error (`Cannot find module 'qrcode'`), then `jest --selectProjects server --testMatch='**/tests/app.test.js' --runInBand` failed during plugin config loading (`loadJsFile`, "Unknown error") before any Phase 1 code existed. The harness itself (SQLite, `dist/` freshness guard, supertest on `strapi.server.httpServer`) is read and sound; the failure is attributable to the stale install, not to the harness `[VERIFIED: command output]` but the exact root cause (missing `qrcode`) is **inferred** `[ASSUMED]`. Per the kernel rule, no Phase 1 task depending on a boot suite may be reported verified until Wave 0 shows an existing boot suite passing.

**Missing dependencies with no fallback:** correct install (blocks all boot-integration verification).
**Missing dependencies with fallback:** ImageKit credentials (use local provider for tests; fail closed for real imports).

## Validation Architecture

### Test Framework

| Property                       | Value                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                      | Jest 29 with two projects: `server` (ts-jest, node) and `admin` (jsdom, testing-library) `[VERIFIED: jest.config.cjs]`                                                  |
| Config file                    | `apps/strapi/jest.config.cjs`                                                                                                                                           |
| Boot harness                   | `apps/strapi/tests/helpers/strapi.ts` (`setupStrapi`/`cleanupStrapi`), `tests/helpers/test-dist.ts` (stale-dist guard), `tests/helpers/admin.ts` (`createAdminSession`) |
| Database for boot suites       | SQLite file via `config/env/test/database.ts` (`DATABASE_FILENAME` default `.tmp/test.db`), no Postgres needed. File deleted by `cleanupStrapi`                         |
| Auth helpers                   | public routes: none needed (`auth:false`); admin/content-manager: `createAdminSession` (not users-permissions JWT)                                                      |
| Quick run (unit + admin)       | `yarn workspace @tiween/admin jest <path>`                                                                                                                              |
| Full unit gate                 | `yarn workspace @tiween/admin test` (CI runs this; skips boot suites)                                                                                                   |
| Boot suites (opt-in, CI skips) | `yarn workspace @tiween/admin test:integration`                                                                                                                         |
| Single boot file               | `yarn workspace @tiween/admin build:test-dist; yarn workspace @tiween/admin jest --selectProjects server --testMatch='**/short-films.service.test.ts' --runInBand`      |
| Lint                           | `yarn workspace @tiween/admin lint` (`--max-warnings=0`; covers `scripts/`)                                                                                             |

Boot-suite file names must match `*.service.test.ts` or `*.controller.test.ts` (or `tests/app.test.js`) to be picked up by `test:integration`; `*.unit.test.ts` runs in the default gate; admin components use `*.test.tsx`.

**How to run boot suites locally (the prerequisite sequence):**

```bash
cd /Users/ayoub/projects/tiween-bmad-version
yarn install --frozen-lockfile                      # required here: node_modules is stale
yarn workspace @tiween/admin test:integration       # builds dist/ (tolerant), then runs all boot suites serially
```

Any source edit after the build makes `assertTestDistFresh` throw "dist/ is STALE"; re-run `build:test-dist` (the script does it). Never run boot files in parallel (`--runInBand`; SQLite locks, see DW-45). Set `process.env.DATABASE_FILENAME` to a suite-specific file at the top of the new suite to avoid reusing a leaked `.tmp/test.db`. Strapi writes `src/extensions/documentation/**` at boot; that is ignored by the freshness check by design.

### Phase Requirements -> Test Map

| Req ID   | Behavior                                                                                                                                                                                                                                       | Test Type                                                       | Automated Command                                                                       | File Exists?                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| SDATA-01 | Schema has the new attributes, explicit non-localized flags, additive only, `collectionName` preserved; component enums                                                                                                                        | unit (reads `schema.json` + `streaming-link.json`)              | `yarn workspace @tiween/admin jest src/plugins/creative-works --testPathPattern schema` | Wave 0 (new `schema.unit.test.ts`) |
| SDATA-01 | Country/language Zod: valid ISO codes, curated language list, `none`                                                                                                                                                                           | unit                                                            | `jest src/shared/short-film-rules.unit.test.ts`                                         | Wave 0                             |
| SDATA-01 | Round trip of all new fields through Document Service on a booted Strapi                                                                                                                                                                       | boot                                                            | `... short-films.service.test.ts`                                                       | Wave 0                             |
| SDATA-02 | Publish rules: poster, director (slug `director`), watch source, slug; duration>40 is a warning                                                                                                                                                | unit (pure evaluator)                                           | `jest src/shared/short-film-rules.unit.test.ts`                                         | Wave 0                             |
| SDATA-02 | Server guard blocks publish via content-manager HTTP with admin session, allows draft saves, covers bulk and `status:'published'` create                                                                                                       | boot (supertest + `createAdminSession`)                         | `... short-films.service.test.ts`                                                       | Wave 0                             |
| SDATA-02 | `workToApiPayload`/`workToFormValues` round trip incl. `country`, `language`, `streamingLinks`, `featured`, `featuredRank`; `WORK_POPULATE` pinned list gains `streamingLinks`                                                                 | unit                                                            | `jest src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts`     | exists, extend                     |
| SDATA-02 | Streaming-links editor / short-film-only sections render, pickers pin `TN`/`aeb`, locale tabs, publish bar                                                                                                                                     | admin jsdom                                                     | `jest --selectProjects admin src/plugins/events-manager/admin`                          | Wave 0                             |
| SDATA-02 | Works pages routed and reachable; media-library picker returns real ids; AR/EN entry in a real admin                                                                                                                                           | manual-only (no E2E suite exists, kernel forbids inventing one) | manual UAT checklist in plan                                                            | n/a                                |
| SDATA-03 | Anonymous list returns only published shorts (draft short and published film excluded)                                                                                                                                                         | boot                                                            | `... short-films.service.test.ts`                                                       | Wave 0                             |
| SDATA-03 | Genre filter; each of the 8 sorts; pagination (page/pageSize/pageCount/total, max 48); featured order (rank asc, nulls last, then newest); detail by slug 200/404 (unknown, draft); related (director first, genre second, self excluded, cap) | boot                                                            | same                                                                                    | Wave 0                             |
| SDATA-03 | Unknown param, bad sort, pageSize 49, page 0 -> 400 `VALIDATION_FAILED`, never 500                                                                                                                                                             | boot + unit (schema)                                            | same + `jest .../validation/short-films.unit.test.ts`                                   | Wave 0                             |
| SDATA-03 | Locale fallback: `ar` requested, only `fr` published -> FR content, `locale:"fr"` on item; AR published -> AR title/synopsis; AR draft only -> FR                                                                                              | boot                                                            | same                                                                                    | Wave 0                             |
| SDATA-03 | No internal fields (`provider_metadata`, `hash`, `createdBy`, `externalIds`) in any response                                                                                                                                                   | boot (key-set assertion) + unit (projection)                    | same                                                                                    | Wave 0                             |
| SDATA-03 | D-09 routes gone: the three old paths return 404; `/persons/search` still works; facade `searchWorks` still delegates                                                                                                                          | boot + existing unit (`public-api.unit.test.ts`)                | same + `jest src/plugins/creative-works`                                                | partly exists                      |
| SDATA-04 | Import mapping is pure and matches schema keys (extend the DW-13 style key-set assertion); ISO country/language mapping of the mock's free text; AR digits rule (reject Arabic-Indic digits)                                                   | unit                                                            | `jest scripts/seeds/utils/short-film-import.unit.test.ts`                               | Wave 0                             |
| SDATA-04 | Run import twice on a booted Strapi (downloader stubbed, local provider): document count, genre/person/credit-role counts and `publishedAt` unchanged on 2nd run                                                                               | boot                                                            | `... short-film-import.service.test.ts`                                                 | Wave 0                             |
| SDATA-04 | Real ImageKit upload and Postgres run                                                                                                                                                                                                          | manual (needs credentials)                                      | `yarn workspace @tiween/admin seed:shorts` documented in plan                           | n/a                                |
| SDATA-05 | The boot suite above itself, including a non-short creative work fixture                                                                                                                                                                       | boot                                                            | `yarn workspace @tiween/admin test:integration`                                         | Wave 0                             |
| FR57     | Media payload uses real ids; `photos` multi; ImageKit delivery URL host                                                                                                                                                                        | admin jsdom (picker returns asset) + manual                     | `jest --selectProjects admin ...MediaInput`                                             | Wave 0                             |

### Sampling Rate

- **Per task commit:** the relevant `yarn workspace @tiween/admin jest <file>` (unit/admin, seconds).
- **Per wave merge:** `yarn workspace @tiween/admin test` plus `lint`; after server waves also `test:integration` (about 20 s boot per file).
- **Phase gate:** `test:integration` green with output captured, `test` green, `lint` green, and a manual admin UAT pass for routing, media picker, locale tabs and publish blocking, before `/gsd-verify-work`. Do not mark verified if the boot suite could not execute (kernel rule).

### Wave 0 Gaps

- [ ] `yarn install --frozen-lockfile`, then prove an existing boot suite passes (`tests/app.test.js` and `venue-admin-crud.service.test.ts`) and record the output.
- [ ] Spike suite (throwaway or kept) answering A1, A2, A3, A5: middleware sees content-manager publish, republish `publishedAt`, `?locale=` PUT create, nested credits filter.
- [ ] `apps/strapi/tests/fixtures/short-films.ts`: seeds published/draft shorts, a published non-short work, genres, persons, credit-roles (published), AR/EN rows, with controllable `publishedAt` via `strapi.db.query(uid).update(...)` (Document Service strips `publishedAt`).
- [ ] `en` locale creation in the test setup (and the bootstrap fix).
- [ ] `tests/__mocks__/strapi-admin.ts` gains `useStrapiApp` for the media picker tests.
- [ ] New unit files listed in the map above.

## Security Domain

`security_enforcement` is not disabled (`.planning/config.json` is absent; treated as enabled).

### Applicable ASVS Categories

| ASVS Category           | Applies                                           | Standard Control                                                                                            |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| V2 Authentication       | no (public reads; admin uses existing admin auth) | -                                                                                                           |
| V3 Session Management   | no                                                | -                                                                                                           |
| V4 Access Control       | yes                                               | `status:'published'` and `type` forced server-side; admin publish guard; admin RBAC stays Strapi's          |
| V5 Input Validation     | yes                                               | Strict Zod allowlist on every query param; Zod on `country`/`language` writes                               |
| V6 Cryptography         | no                                                | -                                                                                                           |
| V8 Data Protection      | yes                                               | Response projection allowlist; media `fields` allowlist (no `provider_metadata`/`hash`)                     |
| V12 Files and Resources | yes                                               | Importer downloads remote images: host allowlist, size cap, content-type check, no redirects to private IPs |
| V13 API                 | yes                                               | Coded errors, `pageSize` cap 48, in-process rate limit (see Pitfall 10)                                     |

### Known Threat Patterns for this stack

| Pattern                                                             | STRIDE                   | Standard Mitigation                                                                                                         |
| ------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Draft/unpublished leak through omitted `status` (the D-09 defect)   | Information disclosure   | Single service entry point that always passes `status:'published'`; boot test with a draft fixture                          |
| Mass-field exposure (`createdBy`, `externalIds`, ImageKit `fileId`) | Information disclosure   | Explicit projection + populate `fields` lists                                                                               |
| Query-param abuse causing 500 or heavy queries                      | DoS / Tampering          | `.strict()` Zod, enum sorts, bounded `page`/`pageSize`                                                                      |
| SSRF in the importer fetching thumbnail URLs                        | Tampering / SSRF         | Hostname allowlist (`i.ytimg.com`, `artify.tn`, `vimeo` CDN hosts plus owner-approved poster hosts), `https` only, byte cap |
| Stored XSS via AI-drafted richtext synopsis                         | Tampering                | Client must treat `synopsis` as untrusted markdown (Phase 2); importer strips HTML                                          |
| Silent local-disk uploads in production                             | Integrity / Availability | Importer asserts the upload provider is `strapi-provider-upload-imagekit`                                                   |
| Incomplete films published by a low-privilege path                  | Tampering                | Document Service guard plus Pitfall 4 fix                                                                                   |
| Arabic-Indic digits in AR content                                   | Integrity (project rule) | Importer validation, kernel "Western digits in Arabic"                                                                      |

## Project Constraints (from CLAUDE.md and the kernel)

- Planning system is GSD under `.planning/`; BMad is retired. Do not run or recreate BMad or OpenSpec workflows. `_bmad-output/` content is reference; delete matching BMad content once a decision is resolved in `.planning/`.
- `_bmad-output/project-context.md` is **superseded** by `docs/context/kernel.md` (the file says so); the kernel is the binding rule set.
- Kernel rules that bind this phase `[VERIFIED: docs/context/kernel.md read this session]`: Yarn 1 only; Document Service only; new backend features are plugins under `src/plugins/`; cross-plugin calls through `services/public-api.ts` only; never delete dormant ticketing code; no Redis, no `replicas` > 1; lint `--max-warnings=0`; no E2E suite; boot-based suites need `yarn workspace @tiween/admin test:integration` and CI skips them; never report a story verified when its verification command could not execute; push straight to `main`, Conventional Commits, no AI attribution trailers; do not bump `prettier` past 3.3.2; client responses are flat and addressed by `documentId`; APIs return error codes, not prose; Arabic uses Western digits.
- Shorts stay noindex and unlinked until Phase 6 (STATE.md); schema changes must be additive because `main` auto-deploys to production.
- The working tree has unrelated uncommitted edits; do not stage them.

## Sources

### Primary (HIGH confidence)

- In-repo files read this session (cited inline with paths and lines): `creative-work/schema.json`, `routes/content-api.ts`, `controllers/creative-work.ts`, `services/creative-work.ts`, `services/public-api.ts`, `components/*/*.json`, `shared/validation.ts`, `shared/rate-limit.ts`, events-manager `services/events.ts`, `controllers/events.ts`, `routes/index.ts`, `middlewares/index.ts`, `validation/venue-events.ts`, `services/venue-events.ts`, WorkForm `index.tsx`/`schema.ts`, `hooks/useCreativeWorks.ts`, `pages/Works/*`, `pages/App.tsx`, `SideNav`, `MediaInput/index.tsx`, `tests/helpers/*`, `jest.config.cjs`, `scripts/seeds/*`, `config/plugins.ts`, `bootstrap/i18n-locales.ts`, `Dockerfile`, `docs/context/*`.
- Installed Strapi sources (5.33.1): `@strapi/core` document-service repository and `get-enabled-plugins.js`, `@strapi/content-manager` `document-manager.js` and Wysiwyg `Field.js`, `@strapi/upload` `services/upload.js` and admin `index.js`, `@strapi/i18n` `services/locales.js`, `strapi-provider-upload-imagekit/lib/index.js`.
- Context7 `/strapi/documentation` (Document Service `findMany`, `count`, `publish` locale semantics, middlewares, REST locale rules).
- Local runs: Node `Intl.DisplayNames` probe; `yarn build:test-dist` and the failed `app.test.js` boot.

### Secondary (MEDIUM confidence)

- `_bmad-output/implementation-artifacts/deferred-work.md` (DW-5, DW-45, DW-258, ImageKit fallback note) for history of the integration harness and production upload risk.

### Tertiary (LOW confidence)

- None used as authority. All `[ASSUMED]` items are listed in the Assumptions Log.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH, no new packages, everything read in-repo.
- Architecture: MEDIUM-HIGH, patterns mirror existing code; Strapi runtime behaviors (A1-A5) need the Wave 0 spike.
- Pitfalls: HIGH for items 1, 2, 3, 4, 5, 7 (read directly), MEDIUM for 8, 9, 10.

**Research date:** 2026-10-18
**Valid until:** 2026-11-17 (re-check if `@strapi/strapi` is bumped past 5.51.x)
