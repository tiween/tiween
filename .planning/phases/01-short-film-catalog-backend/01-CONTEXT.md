# Phase 1: Short-Film Catalog Backend - Context

**Gathered:** 2026-10-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Short films become real Strapi data. This phase delivers:

- the missing schema fields on `creative-work` (type `short-film`)
- entry and publishing through the existing events-manager WorkForm
- a lean, public, published-only read API under `/creative-works/short-films`
- an idempotent launch-catalog seed (the 10 mock films plus approved candidates)
- boot-integration tests against a real Strapi.

Search, facet filtering and "similar" recommendations are **not** built here. They belong to Meilisearch in Phase 3. The client is not touched here either: Phase 2 moves the pages off mocks.

Requirements: SDATA-01..05, FR57. SDATA-03 and SDATA-05 are **narrowed** by D-10 below (lean list).

</domain>

<decisions>
## Implementation Decisions

### Data model (SDATA-01)

- **D-01:** `country` is a non-localized JSON array of ISO 3166-1 alpha-2 codes (`["TN","FR"]`) and supports co-productions. No country content type. Display names come from `Intl.DisplayNames` (client and admin). Applies to all work types. — **Reversibility:** costly — the stored shape feeds the Phase 3 index and the Phase 4 filters
- **D-02:** `language` is a non-localized JSON array of codes from a **curated** list: `aeb` (Tunisian Arabic), `ar`, `fr`, `en`, `ber` (Amazigh), `none` (silent/no dialogue), plus a short tail if needed. Validated server-side (Zod) against the list. Applies to all work types.
- **D-03:** New repeatable component `creative-works.streaming-link` with fields:

  - `platform` enum (youtube, vimeo, artify, arte, mubi, netflix, other, …; final list is Claude's discretion)
  - `url`
  - `accessType` enum `free | included | subscription | rental`
  - optional `label`

  Not localized. Existing `links[]` (`common.link`) is untouched; it stays for social/IMDb-style links. Additive only, `collectionName` preserved.

- **D-04:** "Available online" is **derived, never stored**: it is true when there is at least one streaming link OR a `videos[]` entry with `videoType=full-length`. "Has awards" is likewise derived from `distinctions[]`.
- **D-05:** `featured` boolean plus optional integer `featuredRank`. Ordered by rank ascending (nulls last), then newest. Shorts only in the admin UI.

### Public API (SDATA-03)

- **D-06:** Dedicated content-API routes in the `creative-works` plugin:

  - `GET /creative-works/short-films`: list
  - `GET /creative-works/short-films/featured`
  - `GET /creative-works/short-films/:slug`: detail, 404 if unknown or unpublished
  - `GET /creative-works/short-films/:slug/related`

  Server-side, the type is forced to `short-film` and `status: 'published'` is always applied. The controller/service owns `populate` and a field allowlist, so no internal or ticketing fields are exposed. Flat Strapi v5 shape with `documentId`. Params are flat and Zod-allowlisted; an unknown or invalid param returns a coded 400 via `apps/strapi/src/shared/validation.ts`, never a 500. Locale param with French fallback. Exposed through the plugin's `public-api` facade for cross-plugin use. — **Reversibility:** costly — Phase 2 and Phase 3 clients bind to this contract

- **D-07:** List params: `locale`, `genre` (slug), `sort`, `page`, `pageSize`.
  - Default sort is `publishedAt:desc`.
  - Allowlisted sorts: `publishedAt`, `releaseYear`, `duration`, `title`, each asc or desc.
  - `pageSize` defaults to 24, max 48.
- **D-08:** `related` in Phase 1 is deterministic: other published shorts by the same director(s) (directing credits), then shorts sharing a genre, newest first, excluding the film itself, capped at about 6. In **Phase 3 the same route switches to Meilisearch similar-documents** (owner's wish), with this logic kept as the fallback. The contract does not change.
- **D-09:** **Remove** the existing `/creative-works/featured`, `/creative-works/type/:type` and `/creative-works/search` content-API routes and their controller/service methods. They return drafts (no `status` arg) and the "featured" one has no filter. Audit callers first (`/persons/search` and the events-manager venue search are separate and stay).
- **D-10:** **Lean Strapi list (scope narrowing).** Facet filters (duration range, year range, country, language, has awards, available online, platform) are **not** implemented in Strapi. Meilisearch owns text search and facets in Phase 3 (SRCH-03). The Strapi list is the Phase 2 data source and the SRCH-05 fallback ("without text search or facets"). This avoids two filter engines with diverging semantics. SDATA-03, SDATA-05 and ROADMAP Phase 1 criteria 2–3 are amended to match. — **Reversibility:** reversible — filters can be added to the list later without breaking the contract

### Launch catalog (SDATA-04, FR57)

- **D-11:** Import runs as an idempotent step in the existing seed framework (`apps/strapi/scripts/seeds`):

  - upsert keyed by `slug`
  - find-or-create `person`, `genre` and `credit-role` records
  - media uploaded to ImageKit through the upload provider, never hotlinked

  Running it twice creates no duplicates. Data lives in a seed data file (alongside `seeds/data/creative-works.json`).

- **D-12:** Media sourcing:
  - The YouTube/Vimeo thumbnail becomes the 16:9 **backdrop**.
  - A real 2:3 **poster** is sourced from festival, distributor or director pages where one exists.
  - Otherwise the poster is left empty, and the client placeholder covers it (Phase 2/4).
- **D-13:** Translations: French is the source. EN and AR title and synopsis are **AI-drafted** and imported published. The owner reviews the Arabic in the admin afterwards. Where `originalTitle` is Arabic, it seeds the AR title.
- **D-14:** Catalog size target is **~30–50 films before launch**. Phase 1's done-gate is the 10 vetted mock films plus whatever candidates the owner has approved by then, with the pipeline proven. Reaching 30–50 is a **Phase 6 launch gate** and does not block Phases 2–5.
- **D-15:** Curation: Claude researches candidates and produces a sheet (title, original title, year, director, duration, country, official link, poster source, distinctions, source URL). The owner approves the sheet before anything is imported.
- **D-16:** Eligibility: Tunisian (co-)production or Tunisian director, AND duration of about 40 minutes or less, AND either legally watchable online through an official channel or platform (no re-uploads) OR festival-selected/awarded, in which case it may be listed with a trailer only.

### WorkForm (SDATA-02)

- **D-17:** Field visibility: `country` and `language` show for **all** work types. `streamingLinks`, `featured` and `featuredRank` show **only when type = short-film**, following the existing `isPlay → TheatreDetailsFields` pattern.
- **D-18:** Country and language pickers are searchable Strapi DS multi-selects with names localized via `Intl.DisplayNames` in the admin locale. Tunisia (`TN`) and Tunisian Arabic (`aeb`) are pinned at the top.
- **D-19:** Short-film publish rules:

  - **Block** publish without a poster.
  - **Block** publish without at least one directing credit.
  - **Block** publish without at least one streaming link or a `trailer` video.
  - **Warn only** when duration is over 40 minutes.

  Draft saves stay permissive. Enforcement is in the form, and server-side on publish as well (exact mechanism is Claude's discretion).

### Post-research decisions (owner, 2026-10-18)

- **D-20:** D-12 vs D-19: the D-19 poster rule stays strict for humans. The launch importer gets an explicit, logged bypass (an in-process flag usable only from `scripts/seeds`), so posterless films can be imported published. The client placeholder (Phase 2/4) covers empty posters.
- **D-21:** Venue managers can no longer create `short-film` works. Remove `short-film` from the venue-manager accepted work types (`POST /api/events-manager/venue/creative-works`). Shorts are admin-entered only.
- **D-22:** The WorkForm gets locale tabs and a publish bar. The default locale (FR) gets the full form; AR/EN tabs edit only localized fields. If the Wave 0 spike shows that content-manager `PUT ?locale=` cannot create a missing locale, fall back to translating in the native Content Manager and document that.
- **D-23:** Curation gate: execution researches candidates, fixes the two mock films that fail D-19 (`chrifa-bent-el-fadhel` director is a production company; `tahtima` has no director), writes the candidate sheet, then **pauses at a human checkpoint for owner approval** before any import.
- Planner discretion, per research recommendations: keep `poster` localized and replicate the poster id across locales on save/import, with read-time fallback; prove the import on dev/staging only (the production run is Phase 6); remove or retype the 5 fake dev shorts and update `tests/fixtures/index.ts`; no genres list route in Phase 1.

### Claude's Discretion

- The exact `platform` enum values and the long tail of the language code list.
- How `related` combines director and genre matches, and the exact cap.
- Server-side publish enforcement mechanism (Document Service middleware vs lifecycle vs controller).
- Whether the seed data file is JSON or TS, and the media-upload helper design.
- Response envelope details (`meta.pagination`), provided they follow the flat v5 shape.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning

- `.planning/PROJECT.md` — locked decisions (binding kernel, ADR list, "decided in the phase" items)
- `.planning/REQUIREMENTS.md` — SDATA-01..05, FR57; SRCH-03/SRCH-05 (Phase 3 contract this phase hands off to)
- `.planning/ROADMAP.md` — Phase 1 success criteria (amended per D-10)
- `_bmad-output/project-context.md` — AI agent rules, always in force

### Architecture and kernel

- `_bmad-output/project-planning-artifacts/architecture.md` — 2026-06-12 plugin-decomposition amendment (supersedes the baseline for module structure)
- `_bmad-output/architecture/implementation-patterns-consistency-rules.md` — patterns and consistency rules
- `docs/context/kernel.md` — binding kernel
- `docs/context/strapi-v5-shape.md` — flat v5 response shape and `documentId`
- `docs/context/plugin-dependency-rules.md` — R1–R5, facade-only cross-plugin calls
- `docs/context/arabic-western-numerals.md` — digit rule for AR content
- `docs/context/entity-properties-vestigial.md` — do not build on `entity-properties`

### History and defects

- `_bmad-output/implementation-artifacts/deferred-work.md` §DW-148 (phantom `trailer`/`directors` fields), §DW-258 (no integration coverage for public reads)
- `_bmad-output/implementation-artifacts/2c-3-catalog-move-into-creative-works.md` — catalog move, credits/credit-role model, AC9

### Codebase maps

- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md`

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json`: already has `credits[]`, `cast[]`, `distinctions[]`, `videos[]` (`common.video.videoType` includes `trailer`, `full-length`), `poster`/`backdrop`/`photos`, `originalTitle`, `slug`, and `genres` relation. Only country, language, streaming links and featured are missing.
- `apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts`: the plugin facade, to be extended with short-film reads.
- `apps/strapi/src/shared/validation.ts` and `rate-limit.ts`: Zod and error-code kit plus the in-process limiter for public routes.
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/`: `CreditsEditor`, `DistinctionsEditor` and `VideosEditor` are templates for a `StreamingLinksEditor`; `schema.ts` (Zod form schema plus API mapping) is where the new fields go; `MediaInput` handles uploads.
- `apps/strapi/scripts/seeds/` (`index.ts`, `data/creative-works.json`, `data/persons.json`, `data/credit-roles.json`, `utils/creative-work-relations.ts`): the existing seed framework and relation helpers for the catalog import.
- `apps/strapi/tests/helpers/strapi.ts` and `tests/app.test.js`: the booted-Strapi harness for SDATA-05.
- `apps/client/src/features/shorts/data/mock-shorts.ts`: 10 source films (9 `i.ytimg.com` thumbnails, 1 artify.tn; country is free text like "Tunisie / France" and must be mapped to ISO codes).

### Established Patterns

- Type-specific form sections are conditional (`isPlay && <TheatreDetailsFields/>` in `WorkForm/index.tsx`).
- The generic credit role uses slug `other`/`autre` (`GENERIC_CREDIT_ROLE_SLUGS`). The directing role must be matched by credit-role **slug**, not by localized name.
- Locale codes are enumerated from the i18n plugin, never hardcoded (`listLocaleCodes` in `services/creative-work.ts`).
- The Document Service defaults to **draft** reads, so every public read must pass `status: 'published'`.

### Integration Points

- Client mapping `apps/client/src/lib/strapi-api/base.ts` (`plugin::creative-works.creative-work` → `/creative-works/creative-works`) and `lib/strapi-api/content/shorts.ts` are rewired in Phase 2, not here.
- `ContentSearchPanel` (events-manager admin) notes that shorts are unsupported via the creative-works API. Check it during the D-09 caller audit.
- Phase 3 indexer will hook the same content type and read the D-01..D-04 fields.

</code_context>

<specifics>
## Specific Ideas

- The owner wants Meilisearch to power recommendations ("related") and the shorts page's basic and faceted search. Captured as D-08/D-10 hand-offs to Phase 3.
- Phase 3 will need an embedder decision for similar-documents: local Hugging Face model in Meilisearch on the VPS vs a hosted model.

</specifics>

<deferred>
## Deferred Ideas

- **Meilisearch similar-documents for `related`** → Phase 3 (swap the implementation behind the D-06 route; embedder choice decided there).
- **Facet filters (duration, year, country, language, awards, online, platform) and text search** → Phase 3 via Meilisearch (already SRCH-03).
- **Growing the catalog to 30–50 films** → Phase 6 launch gate (curation runs in parallel from Phase 1).
- **Draft-leak audit of other public content-API reads** (any `findMany` without `status`) → hygiene backlog (999.6) if found outside creative-works.

</deferred>

---

_Phase: 01-short-film-catalog-backend_
_Context gathered: 2026-10-18_
