---
title: "Story 7.3: Event Creation"
type: "feature"
created: "2026-08-07"
status: "done"
baseline_revision: "609af8cce206835874acadecccbfb10692138258"
review_loop_iteration: 0
followup_review_recommended: true
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md"
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-7-2-venue-profile-management.md"
warnings: ["oversized"]
deferred:
  - summary: >-
      Manager-supplied media ids (event `imageIds`, work `posterId`) are
      accepted as any positive integer and linked without an existence or
      ownership check.
    evidence: |-
      `validation/venue-events.ts` validates shape only, and the service writes
      the ids straight into the `images` / `poster` relations. A manager could
      guess an upload id belonging to another venue and attach it to their own
      public event. NOT caused by this story: `venues/validation/profile.ts`
      and `registration.ts` accept `fileId` the same way (7.1/7.2), so this is
      one platform-wide gap in the upload surface, best fixed once for all
      three callers alongside the scoped upload proxy `docs/PERMISSIONS.md`
      already records as owed.
    location: >-
      apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts
    severity: medium
  - summary: >-
      Backend per-field `issues` are transported but never rendered as inline
      field errors — a VALIDATION_FAILED relay shows only a generic toast.
    evidence: |-
      The controller deliberately forwards `details.issues` for mapped codes,
      but `extractVenueEventErrorCode` keeps only the top-level code and the
      form has no path to attach the issues to fields. Any drift between the
      mirrored client/server schemas — the exact risk of maintaining two — is
      undiagnosable for the manager. Pre-existing shape: 7.2's
      `extractVenueProfileErrorCode` does the same.
    location: >-
      apps/client/src/features/venues/schemas/venue-events.ts
    severity: medium
  - summary: >-
      `listMine` silently truncates at 200 events with no pagination and no
      signal to the manager.
    evidence: |-
      Both Document Service reads pass `limit: 200`; a venue past that count
      loses its oldest events from the dashboard, and the `isPublished` flag
      derived from the second read could also miss rows. Not reachable for any
      current venue, so not worth blocking the story.
    location: >-
      apps/strapi/src/plugins/events-manager/server/src/services/venue-events.ts
    severity: low
  - summary: >-
      Event slug collisions surface as an opaque 500 rather than retrying.
    evidence: |-
      `generateEventSlug` appends 6 random base-36 chars and `slug` is a unique
      `uid` field; a collision fails the whole transactional create and the
      manager sees EVENT_CREATE_FAILED with no recourse but resubmitting.
      Astronomically unlikely per event, but the fix (retry on unique
      violation) is cheap and the failure is user-visible.
    location: >-
      apps/strapi/src/plugins/events-manager/server/src/services/venue-events.ts
    severity: low
  - summary: >-
      `VenueEventsList` is the only new component with no test.
    evidence: |-
      The form, preview, hooks and schemas all have suites; the list's empty
      state, draft/published badges, error-code translation and preview links
      are unexercised, as are the three `page.tsx` session guards.
    location: >-
      apps/client/src/app/[locale]/venue/events/_components/VenueEventsList.tsx
    severity: low
  - summary: >-
      Publishing invalidates only manager-scoped query keys, so public event
      caches stay stale in the same browser session.
    evidence: |-
      `publishEventMutation` invalidates the venue-events list and detail keys
      only. A manager who publishes and then browses to `/events` or the
      homepage featured slice can be served a cached response that omits the
      event they were just told is live.
    location: >-
      apps/client/src/features/venues/hooks/useVenueEvents.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** A venue manager can now register (7.1) and edit their venue profile (7.2), but there is no way for them to put an event on the platform — the only event-creating code paths are Strapi-admin-session routes with no tenant scoping and a dead admin modal that posts to a content type that does not exist. Without self-service event creation the aggregation platform has no venue-sourced content.

**Approach:** Add a tenant-scoped event-creation surface on the Next.js client (the story text's "Strapi admin" framing is stale — 7.1's accounts are `users-permissions` users that cannot reach `/admin`, per 7.2's settled Design Note). New authenticated events-manager content-api routes under `/venue/*` (policy `plugin::venues.is-venue-manager`) let the manager search or create a creative work, create a draft event at **their own** venue with run dates, multiple showtimes (screenings for films, performances for plays) and a featured flag, preview it, and explicitly publish it. Cross-plugin access goes through facades only: venues' `public-api` gains `findVenueForManager`, and creative-works gains its first `public-api` facade.

## Boundaries & Constraints

**Always:**

- **The venue is derived from the caller, never from the request.** Every service method resolves the venue via the venues facade by `manager: { id: user.id }`; no venue documentId is accepted from body or path. Events are read/published only when `event.venue.documentId` equals the caller's venue.
- All new backend surface lives in `apps/strapi/src/plugins/events-manager` (plus the two facade additions) and follows plugin conventions: hand-rolled factories, Document Service API only, module-level UID constants, `validate(schema, data)` from `src/shared/validation.ts`, SCREAMING_SNAKE error codes mapped by a `STATUS_BY_CODE` record, `respondError`-style envelope that never leaks exception text.
- **Cross-plugin calls only via `strapi.plugin(x).service("public-api")`** — never `strapi.documents()` with a foreign UID from events-manager. Type imports across the tree use `import type` only (the `watchlist.ts:307` pattern).
- Authenticated routes **omit `config.auth`** (a literal `auth: true` throws `Invalid route config` at boot — 7.2's lead review finding) and carry `policies: ["plugin::venues.is-venue-manager"]`. Public routes stay exactly as they are.
- Events are created as **drafts**; all public reads are pinned `status: "published"`, so a draft is invisible everywhere until the manager publishes. Publishing requires `venue.status === "approved"` (`VENUE_NOT_APPROVED` otherwise) and cascades: event in **all locales**, then each screening/performance (not localized).
- Localized fields (`title`, `description`) are written in the request locale and **replicated verbatim to the other configured locales** (enumerate via the i18n plugin, never a hardcoded list) so the event is visible to AR/FR/EN readers alike. Same for a newly created creative work's localized fields.
- `category` is **derived** from the creative work's `type` (`film`/`short-film` → `movie_screening`, `play` → `theater_performance`), never accepted from the client. `slug` is generated service-side from the title (kebab-case + short uniqueness suffix) because the schema has no `targetField`.
- Showtime kind follows the work type: `film`/`short-film` → `screening` (with `videoFormat`), `play` → `performance` (with optional `surtitleLanguage`). Event + showtimes are created atomically inside `strapi.db.transaction`.
- Manager-created creative works are created **and published immediately** (catalog data, not a venue announcement; an unpublished work would vanish from the published event's populate).
- Every new endpoint is added to `isStrapiEndpointAllowed`; the `/venue/*` pages pass the three-gate doctrine (edge middleware, server session guard, Strapi policy); query keys are user-scoped.
- Arabic uses Western numerals; `icu-numerals.test.ts` must stay green; new client tests need `vitest.config.ts` include globs.

**Block If:** (nothing — approval of venues remains an operator action recorded at close, not a block)

**Never:**

- **No ticketing surface**: no price, ticket-tier, quantity or sale-date fields on any 7.3 form or payload — the ticketing plugin is dormant behind a default-off flag and this story must not surface it. `screening.price`/`ticketsAvailable` stay at schema defaults.
- No event editing, cancellation, or deletion (7.4), no analytics (7.8), no admin moderation surface (Epic 9).
- No `concert`/`exhibition` creation — the creative-work model cannot represent them; the category enum keeps them for admin-entered data only.
- Do not reuse, extend, or fix the admin `EventCreationModal` (posts to a nonexistent content type via the content-manager API); do not touch the Strapi-admin route block or the three pinned public readers (`findEvents`/`findEvent`/`findTrending`) and their populate/filter constants.
- Do not add a `venues → events-manager` package dependency (would invert the sanctioned direction); events-manager declaring `venues` is the correct new edge.
- No new runtime client dependencies — the combobox is built from the existing `cmdk`/`popover` primitives (see `EventVenueFilter`), dates from `calendar.tsx`/`DatePicker`.

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                                                                                                                                                                                                    | Expected Output / Behavior                                                                              | Error Handling                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Search works             | `GET /venue/creative-works/search?query=dune` as manager                                                                                                                                                         | 200 list (documentId, title, type, releaseYear, poster) via creative-works facade                       | None                                                 |
| Create work              | `POST /venue/creative-works` `{title, type, synopsis?, duration?, releaseYear?, posterId?}`                                                                                                                      | 201 work created + published, localized fields replicated to all locales                                | `VALIDATION_FAILED` + field codes                    |
| Create event (happy)     | `POST /venue/events` `{creativeWorkId, title, description?, startDateTime, endDateTime?, featured?, imageIds?, showtimes:[{startDateTime, videoFormat?, audioLanguage?, subtitleLanguage?, surtitleLanguage?}]}` | 201 draft event + showtime documents at the caller's venue, atomic; absent from every public read       | None                                                 |
| Unknown work             | `creativeWorkId` matches nothing                                                                                                                                                                                 | 404, nothing written                                                                                    | `CREATIVE_WORK_NOT_FOUND`                            |
| No showtimes             | `showtimes: []`                                                                                                                                                                                                  | 400, nothing written                                                                                    | `EVENT_SHOWTIMES_REQUIRED`                           |
| Showtime outside run     | showtime datetime before `startDateTime` day or after `endDateTime` day                                                                                                                                          | 400, nothing written                                                                                    | `SHOWTIME_OUTSIDE_EVENT_RANGE`                       |
| End before start         | `endDateTime` < `startDateTime`                                                                                                                                                                                  | 400, nothing written                                                                                    | `EVENT_DATES_INVALID`                                |
| List mine                | `GET /venue/events` as manager                                                                                                                                                                                   | 200 own venue's events (draft + published), newest first, with publication state                        | None                                                 |
| Read mine                | `GET /venue/events/:documentId`                                                                                                                                                                                  | 200 draft projection with populated work, showtimes, venue, images (preview feed)                       | `EVENT_NOT_FOUND` if not owned/absent                |
| Publish (approved venue) | `POST /venue/events/:documentId/publish`                                                                                                                                                                         | 200; event published in all locales + all its showtimes; public `GET /events/:documentId` now serves it | Cascade failure → 500 `EVENT_PUBLISH_FAILED`, logged |
| Publish (pending venue)  | Same, `venue.status !== "approved"`                                                                                                                                                                              | 409, event stays draft                                                                                  | `VENUE_NOT_APPROVED`                                 |
| Not a manager            | Any `/venue/*` route, role `type !== "venue-manager"`                                                                                                                                                            | 403 before the controller runs                                                                          | `NOT_VENUE_MANAGER` (policy)                         |
| Manager without venue    | Manager role, no venue with `manager` = caller                                                                                                                                                                   | 404, nothing written                                                                                    | `VENUE_NOT_FOUND`                                    |
| Foreign event            | `:documentId` belongs to another venue                                                                                                                                                                           | 404 (indistinguishable from absent)                                                                     | `EVENT_NOT_FOUND`                                    |

</intent-contract>

## Code Map

**Strapi — events-manager (`apps/strapi/src/plugins/events-manager/server/src/`)**

- `content-types/event/schema.json` -- target model: `title` (req, localized), `description` (localized), `category` enum **required**, `startDateTime` **required**, `endDateTime`, `eventStatus` (default `scheduled`), `featured` bool, `images` media[], `slug` uid **without `targetField`** (service must generate), `venue` manyToOne, `screenings`/`performances` oneToMany. `draftAndPublish: true`, plugin i18n on.
- `content-types/screening/schema.json` -- the film showtime: `startDateTime`, `videoFormat` enum `standard|threeD|imax|fourDX|format70mm`, `audioLanguage`, `subtitleLanguage`, `movie` → creative-work; **not localized**. `performance/schema.json` -- theatre analogue: no `videoFormat`, has `surtitleLanguage`, `play` → creative-work.
- `routes/index.ts` -- content-api block L2-58 is all-public reads; `GET /events/:documentId` at L36 means new literal routes use the distinct `/venue/*` prefix (no ordering conflict). Admin block L59+ untouched.
- `services/events.ts` -- read-only public readers, pinned `status: "published"` (L331, L369); `DETAIL_POPULATE` L154-194 is the projection shape the preview read mirrors. **Do not modify.**
- `services/event-manager.ts` -- module-scope validators to reuse: `assertValidDate` L44, `assertValidTime` L61. Its `createBulkScreenings` L88 is admin-only, no tenant check — reference, not reuse.
- `services/public-api.ts` L5-15 -- UID-constant convention; `services/index.ts` -- registry to extend with `venue-events`.
- `controllers/index.ts` -- exports `{"event-manager", events, seed, "ticket-tiers"}`; add `venue-events` (permission action ids track these keys).
- `package.json` -- `dependencies` currently `creative-works`, `geography`, `rrule`; add `venues`.
- `bootstrap.ts` L88+ -- event lifecycle subscriber early-returns on unpublished rows, so draft creation notifies nobody; no change needed.

**Strapi — facades & shared**

- `plugins/venues/server/src/services/public-api.ts` -- 23-line facade, only `findVenue`; add `findVenueForManager(userId)` delegating to the `venue-profile` internal lookup pattern (`findFirst`, `filters: { manager: { id: { $eq } } }`, `status: "draft"` — the draft carries `status` enum too).
- `plugins/venues/server/src/services/venue-profile.ts` L264-274 -- the lookup-not-check tenant pattern; `codedError` L75.
- `plugins/creative-works/server/src/services/index.ts` -- exports `{"creative-work", person}`; **no facade exists** — add `public-api.ts` (`searchWorks`, `findWork`, `createWork`) delegating to `services/creative-work.ts` (`search` L31, `findOneWithDetails` L47; no create exists — write it in the internal service, facade passes through).
- `plugins/creative-works/server/src/content-types/creative-work/schema.json` -- `title` req/localized, `slug` uid **with** `targetField: "title"`, `type` enum `film|play|short-film` req, `synopsis` localized richtext, `duration`, `releaseYear`, `poster` media.
- `plugins/venues/server/src/policies/is-venue-manager.ts` -- global id `plugin::venues.is-venue-manager`; throws `PolicyError` with `details.code = NOT_VENUE_MANAGER` → usable verbatim on events-manager routes.
- `src/shared/validation.ts` -- `validate(schema, data)` → `ValidationError` with `{code: VALIDATION_FAILED, issues}`.
- `src/bootstrap/venue-manager-role.ts` -- `VENUE_MANAGER_PERMISSION_ACTIONS` L37-42; append `plugin::events-manager.venue-events.<action>` ids; `ensureVenueManagerPermissions` is idempotent and runs on both branches.
- `plugins/venues/server/src/controllers/index.ts` L328-371 -- `PROFILE_STATUS_BY_CODE` + `respondProfileError` template to copy.
- `plugins/venues/server/src/routes/__tests__/routes.unit.test.ts` -- the route-table guard pattern (auth flags, policy strings resolve, ordering) to replicate for the new block.
- `docs/PERMISSIONS.md` L83-99 -- matrix to update with the new grants.
- Jest: unit gate is `**/*.unit.test.ts` (node, mocked strapi — see `venues/server/src/services/__tests__/venue-profile.unit.test.ts` L19-50 for the mock shape); tests live in `__tests__/` beside the code.

**Client (`apps/client/src/`)**

- `app/[locale]/venue/profile/page.tsx` -- the server-shell pattern (metadata + `robots noindex`, `setRequestLocale`, session guard with `callbackUrl`, three-gate doctrine L29-43) to copy for the three new pages.
- `app/[locale]/venue/profile/_components/VenueProfileForm.tsx` -- editor mechanics to reuse: translating resolver L365-382, editor keyed by documentId L235-239, `uploadOnce` File→id cache L328-339, media pre-flight `checkImage` L70, code-translating toasts.
- `features/venues/hooks/useVenueProfile.ts` -- user-scoped key factory L40-53, `enabled` gating, `uploadImageMutation` L147 (file-only FormData to `/api/private-proxy/upload`).
- `features/venues/schemas/venue-profile.ts` -- the three-shape doctrine L26-37 (form schema input≡output, wire schema, changed-fields converter — for creation the converter builds the full payload instead of a diff); `extractVenueProfileErrorCode` L589 shape to mirror.
- `lib/strapi-api/request-auth.ts` -- `ALLOWED_STRAPI_ENDPOINTS` L6-85 (prefix semantics, justification comments L37-43); add the `/venue/*` entries.
- `middleware.ts` -- `authPages` L20 with **exact-match** regex L79; the dynamic preview route cannot be enumerated, so extend the mechanism with a prefix-guarded `/venue` subtree (keep existing exact entries working; `middleware.flag.test.ts` and existing middleware tests pin current behavior).
- `features/events/components/EventVenueFilter/EventVenueFilter.tsx` L154 -- the working cmdk-in-popover combobox to model the creative-work picker on (incl. jsdom shims in its test L72-79).
- `components/elementary/DatePicker.tsx` L18 + `components/ui/calendar.tsx` -- date-picking raw material (not RHF-bound; bind via `Controller`). `AppField` spreads native attrs, so `type="time"`/`type="datetime-local"` inputs are available for showtime times.
- `features/events/components/EventDetailPage/EventDetailPage.tsx` -- the preview renderer: feed it a `StrapiEvent`-shaped object from the authenticated read; degrades gracefully without movie/screenings/venue. `features/events/types/strapi.types.ts` -- `StrapiEvent`/`StrapiScreening` wire shapes the manager read must match.
- `lib/strapi-api/content/events-extended.ts` -- public fetchers (read-only; `getEventsByVenue` L441 exists but is public/published-only — the manager list needs the new authenticated read instead).
- `lib/dates.ts` -- `DATE_FORMAT` DD/MM/YYYY, `TIME_FORMAT` HH:mm, TZ `Africa/Tunis`, `formatDate` (Arabic via French dayjs locale). `lib/intl-locale.ts` -- `toNumeralSafeLocale` mandatory for `Intl` sites.
- `locales/{en,fr,ar}.json` -- add `venues.events` namespace mirroring `venues.profile`'s structure (`errors.*` keyed by backend codes).
- `vitest.config.ts` -- `test.include` globs: `src/app/**/venue/profile/**` is pinned to profile only; add `src/app/**/venue/events/**/*.test.tsx`.
- `lib/feature-flags.ts` -- `isTicketPurchaseEnabled` L17; nothing in 7.3 may render behind-flag ticketing UI.

## Tasks & Acceptance

**Execution:**

_Backend — facades_

- [x] `apps/strapi/src/plugins/venues/server/src/services/public-api.ts` -- add `findVenueForManager(userId)` (draft lookup by `manager.id`, returns `documentId`, `status`, `name` or null) -- events-manager must resolve the caller's venue without a foreign-UID read.
- [x] `apps/strapi/src/plugins/creative-works/server/src/services/creative-work.ts` + new `services/public-api.ts` + `services/index.ts` -- add `createWork(input, locale)` (create draft, replicate localized fields to all configured locales, publish `locale: "*"`) to the internal service; expose `searchWorks`/`findWork`/`createWork` through a new registered `public-api` facade -- the sanctioned events-manager → creative-works call path does not exist yet.

_Backend — events-manager venue surface_

- [x] `apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts` -- new: Zod schemas for event creation (`creativeWorkId` xor handled client-side; `title` 1..200, ISO datetimes, `EVENT_DATES_INVALID` refine, `showtimes` min 1 with `EVENT_SHOWTIMES_REQUIRED`, per-row `SHOWTIME_OUTSIDE_EVENT_RANGE`, `videoFormat` enum, `featured` bool, `imageIds` int[]) and work creation (`title`, `type` enum, optional `synopsis`/`duration`/`releaseYear`/`posterId`) -- one accepted-input source of truth with stable field codes.
- [x] `apps/strapi/src/plugins/events-manager/server/src/services/venue-events.ts` -- new: `createEvent(user, input, locale)` (venue via venues facade → work via creative-works facade → derive `category`, generate `slug`, `strapi.db.transaction`: create draft event in request locale + replicate localized fields to other locales + create screenings **or** performances per work type); `listMine(user)`; `findMine(user, documentId)` (DETAIL-shaped draft projection, ownership by venue match, 404 otherwise); `publishEvent(user, documentId)` (`VENUE_NOT_APPROVED` gate, publish event `locale: "*"` then each showtime) -- the whole tenant-scoped flow in one auditable service.
- [x] `apps/strapi/src/plugins/events-manager/server/src/controllers/index.ts` -- add `venue-events` controller (`create`, `findMine`, `findOne`, `publish`, `searchCreativeWorks`, `createCreativeWork`) with its `STATUS_BY_CODE` (`VALIDATION_FAILED`→400, `EVENT_SHOWTIMES_REQUIRED`/`EVENT_DATES_INVALID`/`SHOWTIME_OUTSIDE_EVENT_RANGE`→400, `NOT_VENUE_MANAGER`→403, `VENUE_NOT_FOUND`/`EVENT_NOT_FOUND`/`CREATIVE_WORK_NOT_FOUND`→404, `VENUE_NOT_APPROVED`→409, `EVENT_CREATE_FAILED`/`EVENT_PUBLISH_FAILED`/`WORK_CREATE_FAILED`→500) and the `respondError` envelope -- never leak internal text.
- [x] `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts` -- add to the content-api block: `GET /venue/events`, `POST /venue/events`, `GET /venue/events/:documentId`, `POST /venue/events/:documentId/publish`, `GET /venue/creative-works/search`, `POST /venue/creative-works` — all omitting `config.auth`, all `policies: ["plugin::venues.is-venue-manager"]` -- the distinct prefix avoids the `/events/:documentId` swallow.
- [x] `apps/strapi/src/plugins/events-manager/package.json` -- add `"venues": "1.0.0"` to dependencies -- the runtime facade call must be a declared edge.
- [x] `apps/strapi/src/bootstrap/venue-manager-role.ts` -- append the six `plugin::events-manager.venue-events.*` action ids -- without seeding, every route 403s on a fresh database.
- [x] `apps/strapi/docs/PERMISSIONS.md` -- document the new grants and their tenant scoping -- the file is the declared source of truth.

_Backend — tests_

- [x] `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/venue-events.unit.test.ts` -- cover every backend matrix row with a mocked `strapi` (documents, plugin→facades, db.transaction, log): tenant lookup, category derivation, slug generation, locale replication, screening-vs-performance split, atomicity (transaction wraps the writes), publish gate + cascade, foreign-event 404 -- unverifiable without a live DB otherwise.
- [x] `apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/venue-events.unit.test.ts` -- code→status mapping, no raw error text, validation issues forwarded only for mapped codes.
- [x] `apps/strapi/src/plugins/events-manager/server/src/routes/__tests__/venue-routes.unit.test.ts` -- guard test: the six routes omit `auth` (fail on any other value), carry the policy string, and the policy id resolves against the venues plugin's exported policy map.
- [x] `apps/strapi/src/plugins/creative-works/server/src/services/__tests__/public-api.unit.test.ts` -- facade delegation + `createWork` replication/publish behavior.
- [x] `apps/strapi/src/bootstrap/venue-manager-role.unit.test.ts` -- extend: the new action ids are seeded idempotently.

_Client — event creation surface_

- [x] `apps/client/src/lib/strapi-api/request-auth.ts` -- allowlist `GET/POST api/events-manager/venue/events`, `GET api/events-manager/venue/creative-works/search`, `POST api/events-manager/venue/creative-works` (prefix semantics cover `/:documentId` and `/publish`) with the justification comment the file demands -- the proxy rejects anything unlisted.
- [x] `apps/client/src/features/venues/schemas/venue-events.ts` -- mirror the backend schemas (form schema with input≡output types and `""` select sentinels; wire payload builder; `VENUE_EVENT_ERROR_CODES` + extractor) -- one vocabulary across the wire.
- [x] `apps/client/src/features/venues/hooks/useVenueEvents.ts` -- `venueEventKeys` (user-scoped), `useMyEvents()`, `useMyEvent(documentId)`, `useCreativeWorkSearch(query)` (debounced, enabled ≥2 chars), `useVenueEventMutations()` (create event, create work, publish, image upload reusing the file-only upload shape) with invalidation of the user-scoped list -- TanStack Query layer.
- [x] `apps/client/src/app/[locale]/venue/events/page.tsx` + `_components/VenueEventsList.tsx` -- session-guarded list of the manager's events: title, run dates, per-event draft/published state, links to preview and to `/venue/events/new`; empty state inviting first creation -- the observable home of the story.
- [x] `apps/client/src/app/[locale]/venue/events/new/page.tsx` + `_components/VenueEventForm.tsx` -- the creation form: `CreativeWorkPicker` (cmdk combobox over the search hook + "create new" `Dialog` with the minimal work fields and optional poster upload), event title (prefilled from the selected work, editable), description, run start/end dates, a showtimes `useFieldArray` (date + time inputs, `videoFormat` select shown only for film/short-film, language fields per kind), featured `AppCheckbox`, optional event images (7.2's picker mechanics incl. pre-flight and upload-id retention); submit → create → toast → `router.push` to the preview page -- the AC's single creation surface.
- [x] `apps/client/src/app/[locale]/venue/events/[documentId]/page.tsx` + `_components/VenueEventPreview.tsx` -- session-guarded preview: map the authenticated read to the `StrapiEvent` shape and render `EventDetailPage` under a "draft preview" banner, with a Publish button (confirmation, `VENUE_NOT_APPROVED` toast path) and published-state display -- "preview how the event will appear" rendered by the real detail component.
- [x] `apps/client/src/app/[locale]/venue/profile/_components/VenueProfileForm.tsx` (header area) -- add a link to `/venue/events` -- discoverability between the two manager surfaces.
- [x] `apps/client/src/middleware.ts` -- extend the auth gate with a prefix-guarded `/venue` subtree (keeping existing exact entries and tests green) -- the dynamic preview route cannot be enumerated exactly.
- [x] `apps/client/locales/{en,fr,ar}.json` -- add the `venues.events` namespace (fields, placeholders, showtime labels, format/language options, buttons, draft/published badges, publish confirmation, `errors.*` for every backend code, success copy); Arabic with Western numerals -- no hardcoded strings.
- [x] `apps/client/vitest.config.ts` -- add `src/app/**/venue/events/**/*.test.tsx` to `test.include` -- otherwise the new page tests silently never run.
- [x] `apps/client/src/features/venues/schemas/venue-events.test.ts`, `apps/client/src/features/venues/hooks/useVenueEvents.test.ts`, `apps/client/src/app/[locale]/venue/events/new/_components/VenueEventForm.test.tsx`, `apps/client/src/app/[locale]/venue/events/[documentId]/_components/VenueEventPreview.test.tsx` -- schema edges (dates, showtime range, min-1), key scoping + proxy paths, form: validation blocks the POST before `fetch`, screening-vs-performance field switch, payload shape; preview: publish call + `VENUE_NOT_APPROVED` toast -- mock `next-intl`, toast, `PrivateStrapiClient`, `next-auth/react`, and the cmdk shims from `EventVenueFilter.test`.

**Acceptance Criteria:**

- Given a signed-in venue manager on `/[locale]/venue/events/new`, when they search the catalog, then matching creative works appear with title/type/year, and selecting one prefills the event title; and when no match exists, then they can create a new work (title, type, optional synopsis/duration/year/poster) without leaving the form.
- Given a completed form (work, run dates, ≥1 showtime with time and format, optional featured/images), when they save, then a draft event with its showtimes exists at **their** venue, they land on its preview page, and no public surface (`/events` list, `/events/:documentId`, trending, homepage slices) shows it.
- Given the preview page of a draft event at an **approved** venue, when the manager publishes, then `/[locale]/events/{documentId}` serves the event with its showtimes grouped by day in all three locales; and given a **pending** venue, publishing is refused with a translated message and the event stays draft.
- Given a signed-in user without the venue-manager role, when they call any `/venue/*` events-manager endpoint directly, then the request is refused server-side by the policy.
- Given a fresh database booted from scratch, when a venue manager first calls `GET /venue/events`, then the call succeeds — permissions were seeded at bootstrap.
- Given the full suite, when `corepack yarn workspace @tiween/admin test`, `corepack yarn workspace @tiween/client test`, both lints and both type-checks run, then all pass with zero new failures.

## Spec Change Log

_Empty._

## Review Triage Log

### 2026-08-07 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 1, medium 7, low 2)
- defer: 6: (high 0, medium 2, low 4)
- reject: 7: (high 0, medium 0, low 7)
- addressed_findings:
  - `[high]` `[patch]` Client and server disagreed on what a run-date "day" is: the form validated local `YYYY-MM-DD` strings then converted them to instants in the BROWSER's timezone, while the service compared UTC days. From Tunisia (UTC+1) a single-day event starting `00:00` local arrived as the previous UTC day, so every evening showtime on a one-day event was refused with `SHOWTIME_OUTSIDE_EVENT_RANGE` after the form had accepted it — no single-day event could be created at all. Both sides now resolve `Africa/Tunis`: new `toTunisIsoInstant` in `lib/dates.ts` feeds the payload builder, and the service compares days via an `Africa/Tunis` `Intl` formatter. Pinned on both sides with the exact instants (Tunisia is fixed UTC+1, no DST).
  - `[medium]` `[patch]` `publishEvent` published the event first and its showtimes after, so a mid-cascade failure left a publicly live event with missing or zero showtimes despite answering `EVENT_PUBLISH_FAILED` — a loud PARTIAL publish, which the docstring claimed could not happen. Showtimes now publish first and the event last: nothing is publicly reachable until the final write lands, so a failure leaves a retryable draft. Ordering is asserted explicitly.
  - `[medium]` `[patch]` The controller validated `?locale=` against a hardcoded `["en","fr","ar"]`, contradicting the spec boundary that locales be enumerated from the i18n plugin (which the service's replication already honored) — adding a deployment locale would have made the controller silently ignore it. Now checked against `listLocaleCodes(strapi)`.
  - `[medium]` `[patch]` `createWork` performed create + N locale replications + publish as separate writes, against the epic context's binding "multi-write operations wrapped in `strapi.db.transaction`" convention; a mid-sequence failure left a half-localized or unpublished catalog entry. Wrapped in one transaction, with the committed-state read left outside it.
  - `[medium]` `[patch]` The new `/venue` prefix auth gate in `middleware.ts` shipped with no test, while its regex carries two load-bearing claims (the dynamic preview route is gated; the PUBLIC `/venues/...` pages and the registration form are not). Either failure mode would have shipped green. Both halves are now asserted in `middleware.flag.test.ts`.
  - `[medium]` `[patch]` `findVenueForManager` — the one cross-plugin seam behind all six endpoints — was never executed by any test (events-manager mocks it wholesale). A dropped `status` would have refused publication for every approved venue with the suite green. Added `venues/server/src/services/__tests__/public-api.unit.test.ts` covering delegation shape, the projected fields, and both null branches.
  - `[medium]` `[patch]` The seeded permission ids and the route handlers were two hand-copied lists, each pinned only against its own literal — renaming a controller action would have 403'd every manager on every fresh database with both suites passing. The route test now derives one list from the other.
  - `[medium]` `[patch]` The epic-7 context refresh in this diff window dropped the "mutations must be attributable (actor + timestamp)" requirement that grounded 7.4's "edit history is logged" expectation. Restored, with an explicit note that content-api writes on behalf of a `users-permissions` manager carry no actor, so 7.4 owes the mechanism.
  - `[low]` `[patch]` The client form had no upper bound on `showtimes` while the backend enforces `MAX_SHOWTIMES = 100`, so the shipped `EVENT_SHOWTIMES_TOO_MANY` translations were unreachable and an over-limit form bounced as a generic `VALIDATION_FAILED`. Added the mirroring `.max()`.
  - `[low]` `[patch]` Creating a creative work did not invalidate the cached work searches (60s staleTime), so a manager who created a title and searched for it again would not find it. `createWorkMutation` now invalidates every work-search key in its user scope.

## Design Notes

**Why the write surface lives in events-manager, not venues.** The event and showtime content types are events-manager's; venues owns nothing here but the tenant identity. The sanctioned edges line up exactly: events-manager already relates to venues (`event.venue`) and already declares creative-works as a dependency, so events-manager is the only plugin that may orchestrate all three. The venues policy is referenced cross-plugin by its global id — the same string venues' own routes use — and the package dependency is added to make the runtime edge explicit.

**Locale replication instead of single-locale creation.** `event.title`/`description` are localized and every public read passes the request locale to the Document Service, so an event created only in `fr` would be invisible to `ar`/`en` readers. The service therefore writes the request locale first, then replicates the localized fields verbatim to the other configured locales (enumerated from the i18n plugin), and publishes with `locale: "*"`:

```ts
const created = await strapi
  .documents(EVENT_UID)
  .create({ data, locale, status: "draft" })
for (const other of otherLocales) {
  await strapi.documents(EVENT_UID).update({
    documentId: created.documentId,
    locale: other,
    data: { title: data.title, description: data.description },
  })
}
```

Verbatim replication is deliberate: an aggregation platform needs the event findable in every locale; translation quality is a later editorial concern.

**Publish cascades explicitly.** Screenings/performances are separate draft documents with their own `publishedAt`, and the public detail populate runs under a published root — so publishing the event alone would render an event with zero showtimes. `publishEvent` publishes the event (all locales) then each showtime; any cascade failure is a loud `EVENT_PUBLISH_FAILED`, not a silent partial publish.

**`featured` is manager-settable because the story AC says so** ("I can set featured flag for promotion"). It feeds the homepage featured slice, so this is a trust grant to venue managers; platform moderation of the flag belongs to Epic 9. The write whitelist includes it deliberately.

**Preview reuses the real detail component.** The authenticated `findMine` read returns the same projection shape as the public detail read, mapped client-side to `StrapiEvent` and rendered by `EventDetailPage` under a draft banner — the preview cannot drift from reality because it _is_ the production renderer.

## Verification

**Commands:**

- `corepack yarn workspace @tiween/admin test` -- expected: all Jest projects pass, new venue-events suites included.
- `corepack yarn workspace @tiween/admin lint` -- expected: exit 0 (`--max-warnings=0`).
- `corepack yarn workspace @tiween/admin type-check` -- expected: exit 0.
- `corepack yarn workspace @tiween/client test` -- expected: Vitest passes and the new venue-events specs appear in the run output.
- `corepack yarn workspace @tiween/client lint` -- expected: exit 0.
- `corepack yarn workspace @tiween/client typecheck` -- expected: no new error referencing this story's paths (baseline is non-zero and pre-existing).
- `corepack yarn hygiene` -- expected: 0 violations.
- `npx prettier --check` over touched files -- expected: exit 0 (never a repo-wide format).

**Manual checks (if no CLI):**

- An end-to-end create/publish is not verifiable in this run (needs an approved, unblocked venue-manager account — an operator action). Confirm instead that the routes register in the route table, the policy string resolves, and every matrix row is exercised by a unit test.

## Auto Run Result

Status: done
Blocking condition: none

### Summary

Venue managers can now put an event on the platform end to end, entirely from
the Next.js client. Six authenticated events-manager content-api routes under
`/venue/*` (policy `plugin::venues.is-venue-manager`, `config.auth` omitted)
let a manager search or create a creative work, create a DRAFT event with run
dates and multiple showtimes at **their own** venue, preview it in the real
production detail renderer, and explicitly publish it. The venue is always
LOOKED UP from `ctx.state.user` via the venues facade — no request ever names a
venue — and cross-plugin access goes exclusively through `public-api` facades
(`findVenueForManager` added to venues; creative-works gained its first facade).
Events are created as drafts, so they are invisible to every pinned public
reader until publication, which is gated on `venue.status === "approved"`.

The story is complete as far as an agent can take it: every acceptance
criterion is implemented and unit-verified, and no acceptance criterion
requires an action outside the repo, so this closes as `done` rather than
`awaiting-operator`. One operational follow-up is worth scheduling, though it
gates nothing here: an end-to-end create-and-publish has never run, because it
needs a venue-manager account whose venue an admin has moved to `approved` in
the Strapi admin. Doing that once and walking a real event from draft to
published is the cheapest way to convert the residual risks below into
observed behavior.

### Files changed

**Strapi — new tenant-scoped surface**

- `plugins/events-manager/server/src/services/venue-events.ts` — the whole flow: tenant lookup, category derivation from work type, slug generation, transactional event + showtime create with locale replication, owned-only reads, the publish gate and cascade.
- `plugins/events-manager/server/src/validation/venue-events.ts` — Zod schemas for event and work creation; one accepted-input source of truth with stable field codes.
- `plugins/events-manager/server/src/controllers/venue-events.ts` — the six actions, `STATUS_BY_CODE` mapping and the envelope that never echoes exception text.
- `plugins/events-manager/server/src/routes/index.ts` — the `/venue/*` block; `controllers/index.ts`, `services/index.ts` — registry entries; `package.json` — declares the `venues` dependency edge.
- `plugins/venues/server/src/services/public-api.ts` — `findVenueForManager(userId)`, the tenant seam.
- `plugins/creative-works/server/src/services/{creative-work,public-api,index}.ts` — transactional `createWork` plus the plugin's first facade.
- `src/bootstrap/venue-manager-role.ts` — the six permission grants, without which every route 403s on a fresh database.
- `docs/PERMISSIONS.md` — the new grants and their tenant scoping.

**Client — the creation surface**

- `app/[locale]/venue/events/{page.tsx,_components/VenueEventsList.tsx}` — the manager's event list with per-event publication state.
- `app/[locale]/venue/events/new/{page.tsx,_components/VenueEventForm.tsx}` — the creation form: creative-work combobox with inline "create new" dialog, run dates, showtime field array switching between screening and performance fields, featured flag, image upload.
- `app/[locale]/venue/events/[documentId]/{page.tsx,_components/VenueEventPreview.tsx}` — draft preview rendered by the production `EventDetailPage` under a draft banner, plus the publish action.
- `features/venues/schemas/venue-events.ts`, `features/venues/hooks/useVenueEvents.ts` — the mirrored schemas / payload builders and the user-scoped TanStack Query layer.
- `lib/strapi-api/request-auth.ts` — proxy allowlist entries; `middleware.ts` — the prefix-guarded `/venue` subtree; `lib/dates.ts` — `toTunisIsoInstant`; `locales/{en,fr,ar}.json` — the `venues.events` namespace; `vitest.config.ts` — the new test glob.
- `app/[locale]/venue/profile/_components/VenueProfileForm.tsx` — link between the two manager surfaces.

**Planning**

- `_bmad-output/implementation-artifacts/epic-7-context.md` — refreshed for the 2026-08-06 sprint change proposal; the attributability requirement dropped in that refresh was restored during review.

### Review findings

Four review layers ran (blind hunter, edge-case hunter, verification-gap,
intent-alignment). 10 patches applied, 6 items deferred, 7 rejected; no
intent_gap and no bad_spec, so no re-derivation loopback. Details in the Review
Triage Log above. The highest-severity finding was a real, fully blocking
timezone defect: no single-day event could have been created from Tunisia.

Follow-up review recommended: **true** — one patched finding was `high`
severity (patched counts: high 1, medium 7, low 2; score 3×7 + 1×2 = 23, well
over the threshold of 5).

### Verification

- `corepack yarn workspace @tiween/admin test` — 1028 passed, 69 suites, 0 failures. All new venue-events, route-guard and facade suites present and green.
- `corepack yarn workspace @tiween/admin lint` — exit 0 (`--max-warnings=0`).
- `corepack yarn workspace @tiween/admin type-check` — exit 0.
- `corepack yarn workspace @tiween/client test` — 1082 passed, 102 files, 0 failures, including the new schema, hook, form, preview, middleware-gate and `toTunisIsoInstant` specs.
- `corepack yarn workspace @tiween/client lint` — exit 0.
- `corepack yarn workspace @tiween/client typecheck` — non-zero as at baseline; every error is pre-existing (`lib/strapi-api/content/venues.ts` locale widening, `apps/strapi/types` module resolution). No error references this story's paths.
- `corepack yarn hygiene` — 4751 files read, 0 violations.
- `npx prettier --check` over all touched files — clean (4 files formatted during the pass, then re-linted and re-tested).

Manual inspection, in place of the end-to-end run that needs a live database:
the six routes are present in the route table with the policy string and no
`auth` key, the policy id resolves against the venues plugin's exported map,
each handler maps to an existing controller action, the seeded permission ids
are derived from the route handlers, and every row of the I/O matrix is
exercised by a unit test.

### Residual risks

- **Nothing has run against a live database.** Every backend test drives a mocked `strapi` (Document Service, facades, transaction, i18n). The Koa policy chain, the real permission minting at boot, draft invisibility in the pinned public readers, and post-publish public visibility are all argued from code shape and unit assertions rather than observed. The first real create/publish should be watched.
- Tenant isolation is asserted through a mocked venue lookup, not two real venues in one database.
- The six deferred items above remain open; the media-id ownership gap is the one worth scheduling, and it is best fixed once across 7.1/7.2/7.3 rather than here.
- `featured` is manager-settable by design (the story AC asks for it) and feeds the homepage featured slice — a trust grant to venue managers until Epic 9 adds moderation.
