---
title: "Story 7.2: Venue Profile Management"
type: "feature"
created: "2026-08-03"
status: "awaiting-operator"
baseline_revision: "72c4034"
final_revision: "7ca68e4" # this line is recorded in the next commit
review_loop_iteration: 0
followup_review_recommended: true # 17 patches in one pass (3 high, 9 medium), one of which was a boot-breaking route config the frozen intent-contract itself mandated; the pass also changed externally observable behaviour on a public read (the suspended-venue gate, localized amenity labels) and added the first authorization surface in the venues plugin
operator_actions:
  - "Approve at least one venue in the Strapi admin so this surface can be reached at all: unblock the venue-manager users-permissions account, set the venue's status to approved, and publish it. No code path does this until Epic 9 ships the approval workflow, and the dashboard is unreachable without it."
  - "Complete story 7.1's outstanding credential setup first (BREVO_API_KEY / BREVO_SENDER_EMAIL / BREVO_SENDER_NAME, ADMIN_NOTIFICATION_EMAIL, STRAPI_REST_CUSTOM_API_KEY, RECAPTCHA_SECRET_KEY + NEXT_PUBLIC_RECAPTCHA_SITE_KEY) — without them no venue application can be submitted, so no venue-manager account exists to approve."
  - "Boot Strapi once against each environment and confirm the API starts and the four new /venues routes register: no test in this repo boots Strapi, and this pass fixed a route config that would have prevented startup entirely."
  - "Verify in the Strapi admin that the Venue Manager role shows the three venue-profile permissions plus Upload enabled after boot; the bootstrap seeds them, but a pre-existing role in a long-lived environment should be confirmed rather than assumed."
  - "Sign in as the approved venue manager in staging and perform one real edit end to end — change a field, replace the logo, toggle an amenity, drag the map pin — then confirm the public /venues/<slug> page reflects it after the 5-minute cache window. No path in this story has ever met a live database."
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md"
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-7-1-venue-registration-flow.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** Story 7.1 provisions a `venue-manager` account and a `pending` venue, then stops. The manager has no surface to complete or correct that profile, no server-side authorization scoping them to their own venue exists (`policies/index.ts` is `export default {}`, nothing ever reads `venue.manager`), the `venue-manager` role carries **zero** seeded permissions, and there is no public venue page on which a change could be observed. Every later Epic 7 story assumes a manager can reach and edit their own venue.

**Approach:** Add a tenant-scoped self-service profile surface: an `is-venue-manager` policy plus `GET/PUT /venues/me` in the `venues` plugin that resolve the venue **from `ctx.state.user` via the `manager` relation only**, a bootstrap step that seeds the role's content-api permissions, an authenticated Next.js venue-dashboard page with a map-pin location picker and amenity editor, and a public `/[locale]/venues/[slug]` page fed by a new whitelisted `GET /venues/by-slug/:slug` read so edits are observable.

## Boundaries & Constraints

**Always:**

- **The venue is derived from the caller, never from the request.** `updateMyVenue` looks the venue up by `manager: { id: ctx.state.user.id }`; no documentId, slug or manager field is accepted from the body or path. Any client-supplied `manager`, `status`, `slug`, `events` or `documentId` key is stripped before the Document Service call.
- All new backend surface lives in `apps/strapi/src/plugins/venues` and follows the plugin conventions: hand-rolled factory controllers/services, Document Service API only, module-level UID constants, routes as `"controller.method"` strings, `validate(schema, data)` from `src/shared/validation.ts`.
- Zod validates both sides; every `message` is a stable SCREAMING_SNAKE code. Field codes are **reused verbatim** from `plugins/venues/server/src/validation/registration.ts` (`VENUE_NAME_TOO_LONG`, `VENUE_WEBSITE_INVALID`, `VENUE_GEO_INVALID`, …) — one vocabulary across registration and profile. `website` uses `isValidWebsiteUrl` from `src/shared/website-url.ts`, never `z.url()`.
- `status` is read-only for the manager. Update writes the **draft**; then republish **only if** `venue.status === "approved"`, so an approved venue's edits reach the public page and a `pending`/`suspended` venue stays invisible.
- New authenticated routes are placed **before** `/venues/:documentId` in `routes/index.ts` (literal segments are otherwise swallowed) and carry `auth: true` + `policies: ["plugin::venues.is-venue-manager"]`.
- Every new endpoint must be added to the client's `isStrapiEndpointAllowed` allowlist in `apps/client/src/lib/strapi-api/request-auth.ts`, or the private proxy rejects it before it leaves Next.
- The public projection (`toPublicVenue`) is an explicit **whitelist**; `manager`, `status` and internal ids never appear in a public response.
- Arabic copy uses Western numerals and DD/MM/YYYY; the `apps/client/src/lib/icu-numerals.test.ts` guard must stay green.

**Block If:** (nothing — the human-only steps are approval actions in the Strapi admin and are recorded as operator actions, not a block)

**Never:**

- No Strapi **admin-panel** surface for venue managers. See Design Notes: the accounts 7.1 creates are `plugin::users-permissions.user` records and physically cannot authenticate into `/admin` (that panel uses the separate `admin::user` store). The story text's "logged into Strapi admin" framing is stale.
- No approval/unblock flow, no `status` transitions, no admin review UI — Epic 9 owns those.
- No venue **creation** or deletion by a manager, no event/showtime/ticketing surface, no analytics — 7.3+.
- Do not modify `findVenues` / `findVenue` / `findVenuesForSelector`; 7.1's review pinned their `status` params against a data leak. Add the slug read alongside them.
- Do not touch `apps/strapi/src/extensions/users-permissions/strapi-server.ts` (inert factory overrides, story 4.7).
- No new runtime dependencies. Reuse `leaflet`/`react-leaflet` (already deps, see `features/events/components/Map/`), the existing `AppForm`/`AppField` kit, and `PrivateStrapiClient`.
- No address→lat/lng geocoding service (would need an external key). The pin is dragged manually.

## I/O & Edge-Case Matrix

| Scenario                      | Input / State                                                         | Expected Output / Behavior                                                                  | Error Handling                                  |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Read own profile              | `GET /venues/me`, JWT of a manager whose venue exists                 | 200 `{ data: <manager projection incl. status, properties, logo, images> }`                 | None                                            |
| Update own profile            | `PUT /venues/me` with a valid partial payload                         | 200 with the updated projection; only whitelisted fields written                            | None                                            |
| Approved venue republished    | Update on a venue with `status: "approved"`                           | Draft updated **and** published; `GET /venues/by-slug/:slug` reflects it                    | Publish failure logged, 200 still returned      |
| Pending venue not published   | Update on a venue with `status: "pending"`                            | Draft updated, publish skipped; venue still absent from all public reads                    | None                                            |
| Caller is not a venue manager | Authenticated user whose role `type !== "venue-manager"`              | 403, nothing read or written                                                                | `details.code = "NOT_VENUE_MANAGER"` (policy)   |
| No JWT                        | Missing/invalid Authorization header                                  | 401                                                                                         | users-permissions default                       |
| Manager has no venue          | Manager role but no venue with `manager` = caller                     | 404, nothing written                                                                        | `details.code = "VENUE_NOT_FOUND"`              |
| Tenant-isolation attempt      | Body contains `documentId` / `slug` / `manager` / `status` / `events` | Keys stripped; the caller's **own** venue updated with the remaining fields                 | None (silently ignored, asserted by test)       |
| Invalid payload               | `capacity: 0`, bad `website`, `latitude: 200`, `name` > 200 chars     | 400, nothing written                                                                        | `VALIDATION_FAILED` + per-field SCREAMING_SNAKE |
| Empty payload                 | `PUT /venues/me` with `{}`                                            | 400, nothing written                                                                        | `details.code = "NO_FIELDS_TO_UPDATE"`          |
| Amenity type mismatch         | `properties` entry sets `integerValue` on a `boolean` definition      | 400, nothing written                                                                        | `details.code = "PROPERTY_VALUE_TYPE_MISMATCH"` |
| Unknown amenity               | `properties` entry references a non-existent definition documentId    | 400, nothing written                                                                        | `details.code = "PROPERTY_DEFINITION_UNKNOWN"`  |
| Amenity catalog read          | `GET /venues/property-definitions` as a venue manager                 | 200 categories with nested definitions (`name`, `slug`, `type`, `enumOptions`, `sortOrder`) | None                                            |
| Public read, approved         | `GET /venues/by-slug/:slug`, venue approved **and** published         | 200 whitelisted projection (no `manager`, no `status`)                                      | None                                            |
| Public read, pending          | Same, venue `pending` (unpublished)                                   | 404                                                                                         | `ctx.notFound("VENUE_NOT_FOUND")`               |
| Public read, unknown slug     | Slug matches nothing                                                  | 404                                                                                         | `ctx.notFound("VENUE_NOT_FOUND")`               |

</intent-contract>

## Code Map

**Strapi — venues plugin (`apps/strapi/src/plugins/venues/server/src/`)**

- `content-types/venue/schema.json` -- target model. `manager` → `plugin::users-permissions.user`, `status` enum (pending/approved/suspended), `geo` (`shared.geo-point`), `properties` (repeatable `entity-properties.property-value`), `logo`/`images` media, `cityRef` → `plugin::geography.city`. **No schema change needed.**
- `policies/index.ts` -- currently `export default {}`; the slot reserved for `is-venue-manager`. Shape to copy: `plugins/user-engagement/server/src/policies/is-owner.ts`.
- `routes/index.ts` -- ordering is load-bearing; new literal segments go before `/venues/:documentId`.
- `controllers/index.ts` -- exports `{ venue, registration, seed }`; `registration`'s `STATUS_BY_CODE` + `respondError` (logs unmapped errors, withholds their `issues`) is the convention to copy.
- `services/index.ts` -- registry: `venue`, `public-api`, `registration`, `seed`.
- `services/venue.ts` -- `findVenues`/`findVenue` pin `status: "published"`; `findVenuesForSelector` filters the `status` enum `approved` and has the only existing output whitelist (`toSelectorVenue`). **Do not alter the existing three.**
- `validation/registration.ts` -- the field-code vocabulary to reuse; exports `VENUE_TYPES`.
- `content-types/property-definition/schema.json`, `property-category/schema.json` -- amenity catalog (`type` = boolean|integer|string|enum, `enumOptions` json, `sortOrder`, `category` manyToOne).
- `src/components/entity-properties/property-value.json` (repo `apps/strapi/src/components/…`) -- `{ definition (oneToOne → property-definition), booleanValue, integerValue, stringValue, enumValue }`.
- `services/seed.ts` -- `PROPERTY_CATEGORIES` / `PROPERTY_DEFINITIONS` seed data (wheelchair-accessible, seating-type enum, imax, …) — the amenity catalog the form renders.
- `apps/strapi/src/shared/website-url.ts` -- `isValidWebsiteUrl`, `WEBSITE_URL_MAX_LENGTH`.
- `apps/strapi/src/shared/validation.ts` -- `validate(schema, data)` → `ValidationError` with `details.code`.
- `apps/strapi/src/bootstrap/venue-manager-role.ts` -- creates the users-permissions role and **seeds no permissions** (explicit comment); called from `apps/strapi/src/index.ts:31`.
- `apps/strapi/docs/PERMISSIONS.md` -- the intended matrix, prose only.

**Client (`apps/client/src/`)**

- `lib/strapi-api/request-auth.ts` -- `isStrapiEndpointAllowed` (lines ~6-56): the hard allowlist gating `/api/private-proxy`; `createStrapiAuthHeader` attaches the users-permissions JWT from the NextAuth session.
- `lib/strapi-api/private.ts` -- `PrivateStrapiClient.fetchAPI(path, params, init, { useProxy: true })`.
- `app/api/private-proxy/[...slug]/route.ts` -- the forwarder.
- `app/[locale]/auth/profile/page.tsx` + `ProfilePageClient.tsx` + `_components/ProfileForm.tsx` -- the canonical authenticated page → guard → RHF form pattern.
- `hooks/useUser.ts` -- `useCurrentUser` / `useUserMutations` (`updateProfileMutation`, `uploadAvatarMutation` → `FormData` to `/api/upload`); the TanStack Query shape to mirror.
- `lib/auth.ts` -- `authOptions`, `getAuth()`; session carries `strapiJWT`, `userId`, `blocked`.
- `features/events/components/Map/` -- `VenueMap.tsx` (SSR-safe `dynamic(..., { ssr:false })` wrapper), `VenueMapClient.tsx` (react-leaflet island), `MapMarker.tsx`, `types.ts` (`TUNISIA_CENTER`, `DEFAULT_MAP_CONFIG`). Reuse for the picker; no geocoder exists.
- `features/venues/schemas/venue-registration.ts` -- the client mirror of the registration codes; the profile schema reuses its constants.
- `app/[locale]/venues/register/_components/VenueRegistrationForm.tsx` -- `AppForm`/`AppField`/`AppTextArea`/`AppSelect` usage, image pre-checks (`IMAGE_TOO_LARGE`, `IMAGE_TYPE_INVALID`, `IMAGES_TOO_MANY`), toast error mapping.
- `lib/strapi-api/content/venues.ts` -- `getVenueBySlug` currently sends `filters[slug]` to `GET /venues`, which **ignores query params** — it has no callers and cannot work; repoint it at the new slug route.
- `locales/{en,fr,ar}.json` -- catalogs.
- `vitest.config.ts` -- `test.include` is an explicit allowlist; new test paths must be added or they never run.

## Tasks & Acceptance

**Execution:**

_Backend — authorization & permissions_

- [x] `apps/strapi/src/plugins/venues/server/src/policies/is-venue-manager.ts` + `policies/index.ts` -- add a policy returning false unless `policyContext.state.user` exists and its `role.type === "venue-manager"`; register it as `"is-venue-manager"` -- the server-side tenant gate the epic marks P0; the UI check is convenience only.
- [x] `apps/strapi/src/bootstrap/venue-manager-role.ts` -- after ensuring the role, idempotently enable the role's users-permissions permissions for the new venue-profile actions and `plugin::upload.content-api.upload`, replacing the "configure in the Admin Panel" comment -- without this every new route 403s on a fresh database and the feature is unreachable without manual console clicks.

_Backend — profile read/write_

- [x] `apps/strapi/src/plugins/venues/server/src/validation/profile.ts` -- add `venueProfileUpdateSchema`: all venue fields optional (`name`, `description`, `address`, `type`, `phone`, `email`, `website`, `capacity`, `geo`, `logo`, `images`, `properties`), reusing registration's codes; `.strict()`-equivalent stripping plus a refine rejecting an empty object with `NO_FIELDS_TO_UPDATE`; `properties` entries as `{ definition: string, booleanValue?, integerValue?, stringValue?, enumValue? }` -- one accepted-input source of truth.
- [x] `apps/strapi/src/plugins/venues/server/src/services/venue-profile.ts` -- add `getMyVenue(user)` and `updateMyVenue(user, input)`: resolve the venue by `manager: { id: user.id }` with `status: "draft"`; strip `documentId`/`slug`/`manager`/`status`/`events` from the input; resolve and type-check `properties` against `property-definition` records (`PROPERTY_DEFINITION_UNKNOWN`, `PROPERTY_VALUE_TYPE_MISMATCH`); `documents(VENUE_UID).update(...)`; then `publish()` only when `status === "approved"`, wrapped in its own try/catch that logs and does not fail the request -- the whole tenant-scoped flow in one auditable service.
- [x] `apps/strapi/src/plugins/venues/server/src/services/venue.ts` -- add `findVenueBySlug(slug, locale?)` (`findFirst`/`findMany` with `filters: { slug }`, `status: "published"`, populating `geo`, `logo`, `images`, `cityRef`, `properties.definition`) and a `toPublicVenue()` whitelist projection that drops `manager` and `status` -- the existing three readers stay untouched so 7.1's leak fix cannot regress.
- [x] `apps/strapi/src/plugins/venues/server/src/services/property-catalog.ts` -- add `listPropertyCatalog(locale?)` returning categories sorted by `sortOrder` with their definitions (`documentId`, `name`, `slug`, `type`, `enumOptions`, `sortOrder`) -- the amenity editor needs the vocabulary.
- [x] `apps/strapi/src/plugins/venues/server/src/services/index.ts` -- register `venue-profile` and `property-catalog` -- wiring.
- [x] `apps/strapi/src/plugins/venues/server/src/controllers/index.ts` -- add a `venue-profile` controller (`getMine`, `updateMine`, `propertyDefinitions`) and a `venue.findVenueBySlug` handler, with a local `STATUS_BY_CODE` (`VALIDATION_FAILED`/`NO_FIELDS_TO_UPDATE`/`PROPERTY_*`→400, `NOT_VENUE_MANAGER`→403, `VENUE_NOT_FOUND`→404, `VENUE_PROFILE_UPDATE_FAILED`→500) reusing the `respondError` convention -- never leak internal exception text.
- [x] `apps/strapi/src/plugins/venues/server/src/routes/index.ts` -- add `GET /venues/me`, `PUT /venues/me`, `GET /venues/property-definitions` (all `auth: true`, `policies: ["plugin::venues.is-venue-manager"]`) and public `GET /venues/by-slug/:slug` (`auth: false`), **all before `/venues/:documentId`** -- literal segments are otherwise swallowed by the id route.

_Backend — tests_

- [x] `apps/strapi/src/plugins/venues/server/src/services/__tests__/venue-profile.unit.test.ts` -- cover every backend row of the matrix with a mocked `strapi` (documents, log), including the tenant-isolation strip, the approved-republish / pending-skip split, and a publish failure not failing the request -- these branches are unverifiable without a live DB.
- [x] `apps/strapi/src/plugins/venues/server/src/controllers/__tests__/venue-profile.unit.test.ts` -- assert code→status mapping, that no raw error text reaches the response, and the `findVenueBySlug` 404/projection shape.
- [x] `apps/strapi/src/plugins/venues/server/src/policies/__tests__/is-venue-manager.unit.test.ts` -- assert no user, wrong role type, and the happy path.
- [x] `apps/strapi/src/plugins/venues/server/src/routes/__tests__/routes.unit.test.ts` -- extend: the three authenticated routes carry the policy and `auth: true`, the slug route is public, and all four precede `/venues/:documentId`.
- [x] `apps/strapi/src/plugins/venues/server/src/__tests__/bootstrap.unit.test.ts` / a sibling for `venue-manager-role` -- assert the permission seeding is idempotent and grants exactly the intended action ids.

_Client — venue dashboard_

- [x] `apps/client/src/lib/strapi-api/request-auth.ts` -- allowlist `GET api/venues/venues/me`, `PUT api/venues/venues/me`, `GET api/venues/venues/property-definitions` -- the proxy rejects anything unlisted before it reaches Strapi.
- [x] `apps/client/src/features/venues/schemas/venue-profile.ts` -- mirror `venueProfileUpdateSchema` with the same codes, reusing the image constants from `venue-registration.ts` -- one vocabulary across the wire.
- [x] `apps/client/src/features/venues/hooks/useVenueProfile.ts` -- `useMyVenue()` + `useVenueProfileMutations()` (update, logo upload, photos upload) over `PrivateStrapiClient` with **user-scoped** query keys (`["venue-profile", userId]`) -- a bare key would leak one manager's venue across accounts on a shared device.
- [x] `apps/client/src/app/[locale]/venue/profile/page.tsx` -- server page: `setRequestLocale`, `generateMetadata`, `getServerSession` guard redirecting unauthenticated callers to `/auth/signin?callbackUrl=…`, rendering the client shell -- the manager's entry point.
- [x] `apps/client/src/app/[locale]/venue/profile/_components/VenueProfileForm.tsx` -- RHF form over `AppForm`/`AppField`/`AppTextArea`/`AppSelect`: name, description, address, type, phone, email, website, capacity; logo + photos pickers with the existing size/type/count pre-checks and current-media previews; amenity editor rendering the catalog by category with the control implied by each definition's `type`; a read-only `status` display; loading, empty (`VENUE_NOT_FOUND`), error and success states; destructive toast mapping error codes through `t()` -- the AC's single editing surface.
- [x] `apps/client/src/features/venues/components/VenueLocationPicker/VenueLocationPicker.tsx` -- an SSR-safe draggable-marker map built on the existing `Map/` island (`dynamic(..., { ssr: false })`, `TUNISIA_CENTER` fallback), writing `geo.latitude`/`geo.longitude` back into the form -- AC's "update location on map"; raw lat/lng number inputs are deliberately not offered.
- [x] `apps/client/src/middleware.ts` -- add `/venue/profile` to the `authPages` allowlist -- the page must not be reachable anonymously at the edge.

_Client — public venue page_

- [x] `apps/client/src/lib/strapi-api/content/venues.ts` -- repoint `getVenueBySlug` at `GET /venues/venues/by-slug/{slug}` (the `filters[slug]` form is a no-op against a handler that ignores query params) and keep it fail-soft -- the public page needs a read that actually works.
- [x] `apps/client/src/app/[locale]/venues/[slug]/page.tsx` (+ `not-found` handling) -- public server page with `generateMetadata`, rendering name, logo, description, address + city, contact info, website, capacity, amenities and the existing `VenueMap` when `geo` is present; `notFound()` when the read returns null -- AC's observable surface, and the reason an approved venue republishes on save.
- [x] `apps/client/locales/{en,fr,ar}.json` -- add the `venues.profile` and `venues.public` namespaces (fields, amenity category labels, buttons, `errors` keyed by the SCREAMING_SNAKE codes, success copy); Arabic uses Western numerals -- no hardcoded strings.
- [x] `apps/client/vitest.config.ts` -- extend `test.include` with the new venue globs -- otherwise the new tests silently never run.
- [x] `apps/client/src/features/venues/schemas/venue-profile.test.ts`, `apps/client/src/app/[locale]/venue/profile/_components/VenueProfileForm.test.tsx`, `apps/client/src/features/venues/hooks/useVenueProfile.test.ts` -- schema edge cases; a render/edit/submit test asserting a rendered validation message before asserting `fetch` was not called (the 7.1 review's lesson); and query-key scoping -- mock `next-intl`, `@/components/ui/use-toast`, the map island and `fetch`.

**Acceptance Criteria:**

- Given an approved venue manager signed in on `/[locale]/venue/profile`, when the page loads, then it shows their own venue's current name, description, address, contact info, capacity, amenities, logo and photos, a read-only `status`, and a map pin at the stored coordinates.
- Given that manager, when they change any subset of fields — including replacing the logo, adding photos, toggling amenities and dragging the map pin — and save, then only their own venue is written, `status`/`slug`/`manager` are unchanged, and a success state replaces the pending state.
- Given the saved changes on an **approved** venue, when `/[locale]/venues/{slug}` is requested afterwards, then the new values are rendered there; and given the same save on a **pending** venue, that page returns 404.
- Given a signed-in user without the `venue-manager` role, when they call any `/venues/me` endpoint directly, then the request is refused server-side by the policy regardless of what the UI does.
- Given a fresh database booted from scratch, when a venue manager first calls `GET /venues/me`, then the call succeeds — the role's permissions were seeded at bootstrap, not clicked in a console.
- Given the full suite, when `yarn workspace @tiween/admin test`, `yarn workspace @tiween/client test`, both lints and both type-checks run, then all pass with zero warnings.

## Spec Change Log

_No bad_spec loopback occurred. Empty._

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 3, medium 9, low 5)
- defer: 7: (high 0, medium 6, low 1)
- reject: 3: (high 0, medium 1, low 2)
- addressed_findings:
  - `[high]` `[patch]` The three authenticated routes were declared `config.auth = true`, which **is not a valid Strapi route config**: `routeSchema` accepts `auth` only as `false` or `{ scope: [...] }` and validates with `strict: true`, so the API would have thrown `Invalid route config` at boot. Every test was green because none of them boots Strapi, and `routes.unit.test.ts` actively pinned the broken value. The key is now omitted (the form that makes a route authenticated _and_ permission-checked), and a guard test fails on any route whose `config.auth` is anything but `false`. This came straight from the frozen `<intent-contract>`; see the correction in Design Notes.
  - `[high]` `[patch]` A `suspended` venue stayed fully public. `findVenueBySlug` gated on publication state only, and nothing anywhere unpublishes on a status transition — so approved → published → suspended kept serving the public page indefinitely, while three docstrings claimed the opposite. Added a `status: { $ne: "suspended" }` gate alongside the publication gate (not `$eq: "approved"`, which would have emptied the page for seeded venues — DW-211) and corrected the overclaiming docstrings. The underlying missing takedown is DW-221.
  - `[high]` `[patch]` The amenity write is a full replacement built only from the loaded catalog, and `listPropertyCatalog` omits categories with zero definitions while `property-definition.category` is nullable — so any stored amenity the catalog could not reach was **silently deleted** the first time the manager toggled anything. The outgoing entries are now seeded from the venue's stored properties and the edits overlaid on top.
  - `[medium]` `[patch]` Public amenity labels came out in the wrong language: `property-definition` is localized but `venue` is not, so populating through the venue yielded default-locale labels for every `fr`/`ar` visitor. The referenced definitions are now re-resolved in the requested locale and overlaid, fail-soft.
  - `[medium]` `[patch]` `buildPropertiesPayload` accepted a duplicated `definition` documentId (two component rows for one amenity, one of them invisible and permanent) and bounded its lookup with `limit: ids.length`, so a short read blamed a valid amenity for `PROPERTY_DEFINITION_UNKNOWN` and rejected the whole save. Duplicates are now rejected, the limit is raised, and completeness is asserted explicitly.
  - `[medium]` `[patch]` Media could be replaced but never removed — the payload builder never emitted `logo: null` or `images: []` although the wire supports both, so a wrong logo or an unwanted photo was permanent on the only editing surface the manager has. Added explicit remove controls, translated in all three locales.
  - `[medium]` `[patch]` Uploads happened before the PUT with no id retention, so a rejected save orphaned the files and pressing Save again re-uploaded them as fresh entries. Uploaded ids are now cached per file and reused on retry; state and the native file inputs are cleared only on success.
  - `[medium]` `[patch]` The map picker could emit a longitude outside ±180 after panning past the date line; the resolver then rejected `geo` and Save appeared dead with nothing rendered. Longitude is normalized where the picker writes into the form.
  - `[medium]` `[patch]` `getVenueBySlug` logged `console.error` on every legitimate 404, so ordinary crawler traffic against dead slugs would flood the logs. It now logs only genuine failures while staying fail-soft.
  - `[medium]` `[patch]` The success copy promised changes were "published as soon as they are saved" while the public read is pinned at `revalidate: 300` with nothing invalidating it — up to five minutes of apparent data loss. Copy corrected in en/fr/ar.
  - `[medium]` `[patch]` The public `findVenueBySlug` handler had no try/catch, so a Document Service throw surfaced as a raw 500 carrying internal detail. Wrapped, logged, and collapsed to a coded 500.
  - `[medium]` `[patch]` Four surfaces the change depends on had no test at all: the rewritten `getVenueBySlug` (reverting its path would 404 every public venue page with a green suite), the three new `isStrapiEndpointAllowed` entries (the proxy's enforcement point), `VenueLocationPickerClient` (the entire "update location on map" criterion, stubbed everywhere), and the public page's per-type amenity branching. All four are now covered — and `vitest.config.ts` was missing a `features/venues/**/*.test.tsx` glob, so a component test added there would silently never have run.
  - `[low]` `[patch]` Five localized cleanups: `locale` was forwarded from `ctx.query` into the Document Service unvalidated; `toVenueProfileFormValues` laundered an empty string through `"" as unknown as VenueType`; `isSaved` and `amenitiesTouched` never reset, leaving "saved" under the button while the manager edited on; the public page's `key={entry.label}` collided for two definitions sharing a label; and the `isStrapiEndpointAllowed` comment called its entries "literal paths" when they are `startsWith` prefixes.
  - `[low]` `[patch]` Blanking a required field (name, address, email, type) sent nothing — the payload is a changed-fields diff — and returned a success toast while the old value stayed published. A blanked required field now renders a validation error and blocks submit.
  - `[low]` `[patch]` `docs/PERMISSIONS.md` was headed "four grants" then said "three routes", its table columns were misaligned, and it framed `plugin::upload.content-api.upload` as a formality when it is an unscoped grant held by every venue manager. Count, alignment and the real scope of the upload grant are now stated plainly, and the same warning mirrored into the bootstrap docstring.

Deferred: DW-217 (media ids accepted without an ownership check), DW-218 (`manager` is `manyToOne`, so the dashboard edits an arbitrary venue), DW-219 (no optimistic concurrency on the partial PUT), DW-220 (upload size/MIME enforced client-side only), DW-221 (nothing unpublishes on suspension — the read filter is a mask, not a takedown), DW-222 (leaflet marker images fetched from unpkg.com), DW-223 (every persistence format verified only against mocks).

Rejected: passing `locale` to the non-localized `venue` type (matches what all three pre-existing readers already do, and is inert); the absence of an e2e suite (the repo has no e2e tier at all — that is the Epic 5 retrospective's open action, not this story's defect); the `request-auth` prefix-match widening (real, but consistent with every existing entry and not exploitable across the allowlisted paths — the misleading comment was patched instead).

## Design Notes

**Which panel a venue manager logs into — resolved against the shipped substrate, not the prose.** `epic-7-context.md` records this as an open question ("the epic must resolve which panel venue managers actually authenticate into before building 7.2+ surfaces"), and the two artifacts disagree: the story text and `project-context.md`'s B2B table say Strapi Admin, while the same epic context and `project-context.md`'s own route-group/feature-folder conventions imply a client dashboard. Story 7.1 settled it by shipping code: the account it creates is a `plugin::users-permissions.user` with role `type: "venue-manager"`, `blocked: true`, and `venue.manager` targets that store. Strapi's admin panel authenticates `admin::user` records — a disjoint table. There is no path by which a 7.1 account reaches `/admin` short of provisioning a second, parallel admin identity, which nothing does and which would break 7.1's "blocked is the approval gate" invariant. The Next.js client is therefore the only implementable surface. **The epic's "builds on Epic 2D's venues-plugin admin" prerequisite is stale on a second count too: `2d-2-venue-crud-admin-ui` is `ready-for-dev` and `2d-3`/`2d-4` are `backlog` — that admin form does not exist to build on.**

**Why the role's permissions are seeded in code.** `ensureVenueManagerRole` deliberately seeds none and defers to the admin panel. That makes every route added here 403 on any fresh environment until a human clicks through Settings → Roles, which is exactly the kind of undocumented manual step that makes a feature look broken. Seeding is idempotent and cheap; do it at bootstrap.

**Publish-on-save, conditioned on `status`.** 7.1's review pinned the public reads to `status: "published"` precisely because registration inserts drafts carrying the applicant's phone, email and address. `documents().update()` writes the draft only, so an approved venue's edits would never surface. Hence: update the draft always, `publish()` only when the enum says `approved`. A pending venue's edits stay invisible, which is the desired behavior, and the publish is non-fatal:

```ts
const updated = await strapi.documents(VENUE_UID).update({ documentId, data })
if (venue.status === "approved") {
  try {
    await strapi.documents(VENUE_UID).publish({ documentId })
  } catch (err) {
    strapi.log.error("[venues] publish after profile update failed", err)
  }
}
return updated
```

**Tenant isolation is a lookup, not a check.** Rather than accepting a documentId and then verifying ownership, the venue is _found_ by `manager: { id: user.id }`. There is no code path in which an id from the request reaches the Document Service, so there is no comparison to get wrong. Same shape as `user-engagement`'s watchlist controllers, which take the owner from `ctx.state.user.documentId` and never from the body.

**Correction: the authenticated routes omit `auth`, they do not set `auth: true`.** The `<intent-contract>` is frozen and still says the new routes "carry `auth: true`" (Boundaries → Always, and the corresponding task line). That instruction is wrong and the review pass caught it. `@strapi/core`'s `routeSchema` declares `auth: yup.lazy(v => v === false ? boolean().required() : object({ scope: array().of(string()).required() }))` and runs it with `strict: true` over every route, so `auth: true` is neither `false` nor a `{ scope }` object and throws `Invalid route config` **at boot** — the API would not start. Omitting `auth` is what makes a content-api route authenticated _and_ permission-checked against the users-permissions role, which is what the intent actually requires, and is what every other authenticated route in this repo does (`plugins/user-engagement/server/src/routes/content-api.ts`). The intent — authentication plus the `is-venue-manager` policy — has exactly one possible reading, so only the mechanism changed. A guard test in `routes/__tests__/routes.unit.test.ts` now fails on any route whose `config.auth` is anything other than `false`, so re-deriving the contract literally cannot silently reintroduce it.

## Verification

**Commands:**

- `corepack yarn workspace @tiween/admin test` -- expected: all Jest projects pass, including the new venues policy/service/controller suites.
- `corepack yarn workspace @tiween/admin lint` -- expected: exit 0 (`--max-warnings=0`).
- `corepack yarn workspace @tiween/admin type-check` -- expected: exit 0.
- `corepack yarn workspace @tiween/client test` -- expected: Vitest passes and the new venue specs appear in the run output (proves the `test.include` globs landed).
- `corepack yarn workspace @tiween/client lint` -- expected: exit 0.
- `corepack yarn workspace @tiween/client typecheck` -- expected: compare against the clean-tree baseline; no new error may reference this story's paths (the baseline is non-zero and pre-existing).
- `corepack yarn hygiene` -- expected: 0 violations.
- `npx prettier --check` over the touched files -- expected: exit 0. (Do **not** run a repo-wide `yarn format`; ~100 unrelated files are unformatted.)

**Manual checks (if no CLI):**

- An end-to-end edit is **not** verifiable in this run: it needs an approved, unblocked venue-manager account, which only a human can produce in the Strapi admin until Epic 9 ships approval. Confirm instead that the routes register at boot, the policy is reachable as `plugin::venues.is-venue-manager`, and every matrix row is exercised by a unit test.

## Auto Run Result

Status: awaiting-operator

### Summary

Story 7.2 gives a venue manager the first surface on which they can actually own their venue's public presence. An authenticated page at `/[locale]/venue/profile` reads and edits the manager's own venue — name, description, address, contact details, capacity, logo and photos, amenities, and location via a draggable map pin — and a public page at `/[locale]/venues/[slug]` renders the result, so an edit is observable rather than merely persisted.

Three things carry the story. **Tenant isolation is a lookup, not a check:** `updateMyVenue` _finds_ the venue by `manager: { id: user.id }` and strips `documentId`/`slug`/`manager`/`status`/`events` from the body, so no id from a request ever reaches the Document Service and there is no ownership comparison to get wrong. **The `venue-manager` role's permissions are seeded at bootstrap** rather than deferred to the admin panel — `ensureVenueManagerRole` previously created a role with _zero_ permissions, which would have made every new route 403 on any fresh environment until someone clicked through Settings → Roles. And **publication is conditioned on the `status` enum:** the update always writes the draft, then republishes only when the venue is `approved`, so an approved venue's edits reach the public page while a `pending` venue stays invisible — the same data-exposure concern story 7.1's review closed.

Two prerequisites recorded in the epic turned out to be stale, and the spec resolves both explicitly. The story text says the manager works "in the Strapi admin"; the accounts story 7.1 ships are `plugin::users-permissions.user` records, which cannot authenticate into `/admin` at all (a disjoint `admin::user` store) — so the Next.js client is the only implementable surface. And "builds on Epic 2D's venues-plugin admin" has nothing to build on: `2d-2-venue-crud-admin-ui` is still `ready-for-dev`, `2d-3`/`2d-4` are `backlog`.

### Files changed

**Strapi**

- `src/plugins/venues/server/src/policies/is-venue-manager.ts` (+ `index.ts`, tests) — new; the P0 server-side tenant gate the epic requires. The plugin's `policies/` slot was `export default {}` until now.
- `src/plugins/venues/server/src/validation/profile.ts` — new; the partial-update Zod contract, reusing registration's field codes verbatim.
- `src/plugins/venues/server/src/services/venue-profile.ts` — new; the scoped lookup, the field strip, amenity resolution and type-checking, and the conditional republish.
- `src/plugins/venues/server/src/services/property-catalog.ts` — new; the amenity vocabulary the editor renders.
- `src/plugins/venues/server/src/services/venue.ts` — adds `findVenueBySlug`, `toPublicVenue` (an explicit whitelist that never emits `manager` or `status`), and localized amenity-label resolution. The three pre-existing readers are untouched, so 7.1's leak fix cannot regress.
- `src/plugins/venues/server/src/controllers/index.ts` — the `venue-profile` controller, `venue.findVenueBySlug`, and the code→status map.
- `src/plugins/venues/server/src/routes/index.ts` — `GET`/`PUT /venues/me`, `GET /venues/property-definitions` (authenticated + policy), and public `GET /venues/by-slug/:slug`, all ordered before `/venues/:documentId`.
- `src/bootstrap/venue-manager-role.ts` (+ test) — idempotent permission seeding for the three routes plus `plugin::upload.content-api.upload`.
- `docs/PERMISSIONS.md` — documents the grants, including that the upload grant is unscoped.

**Client**

- `src/features/venues/schemas/venue-profile.ts` — new; the wire mirror, the form schema, and the changed-fields-only payload diff.
- `src/features/venues/hooks/useVenueProfile.ts` — new; user-scoped query keys (`["venue-profile", userId]`) and the update/upload mutations.
- `src/app/[locale]/venue/profile/` — new; the session-guarded page and the editor, with loading/empty/error/success states.
- `src/features/venues/components/VenueLocationPicker/` — new; the SSR-safe draggable-pin map built on the existing leaflet island. No geocoder, no new dependency, no raw lat/lng inputs.
- `src/app/[locale]/venues/[slug]/page.tsx` — new; the public venue page.
- `src/lib/strapi-api/request-auth.ts`, `middleware.ts`, `lib/strapi-api/content/venues.ts`, `vitest.config.ts` — the proxy allowlist, the edge auth gate, `getVenueBySlug` repointed at a route that actually honours it (the old `filters[slug]` form was a no-op with no callers), and the test globs.
- `locales/{en,fr,ar}.json` — the `venues.profile` and `venues.public` namespaces.

### Review findings

One review pass, three reviewers (adversarial, edge-case, verification-gap). 17 patches applied (3 high, 9 medium, 5 low), 7 deferred as DW-217 … DW-223, 3 rejected. No intent gaps and no spec-level defects outside the contract, so there was no repair loopback.

The lead finding is worth stating plainly: **the spec's own frozen `<intent-contract>` mandated `config.auth = true` on the new routes, and that config is invalid — Strapi would have refused to boot.** Every suite was green because no unit test boots Strapi, and the route test actively pinned the broken value. The other two high-severity patches were a `suspended` venue remaining publicly readable forever, and the amenity replacement silently deleting stored values the catalog could not reach. Full breakdown in the Review Triage Log.

### Verification

Re-run independently after the patch pass:

| Command                                            | Result                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `corepack yarn workspace @tiween/admin test`       | PASS — 54 suites, 760 tests (was 47/638 at baseline)                                            |
| `corepack yarn workspace @tiween/admin lint`       | PASS — `--max-warnings=0`                                                                       |
| `corepack yarn workspace @tiween/admin type-check` | PASS                                                                                            |
| `corepack yarn workspace @tiween/client test`      | PASS — 73 files, 812 tests; all new specs confirmed present in the run output                   |
| `corepack yarn workspace @tiween/client lint`      | PASS — `--max-warnings=0`                                                                       |
| `corepack yarn hygiene`                            | PASS — 5467 files, 0 violations                                                                 |
| `npx prettier --check` over the touched files      | PASS                                                                                            |
| `corepack yarn workspace @tiween/client typecheck` | 60 errors — **one fewer than the clean-tree baseline of 61**; none reference this story's paths |

Note: the bare `yarn` shim is broken in this environment (asdf reports no version set); `corepack yarn` is the working invocation. A repo-wide `yarn format` was deliberately not run — it would rewrite ~100 files untouched by this story.

### Residual risks

- **Nothing was exercised end to end**, and it cannot be from here: the surface needs an _approved, unblocked_ venue-manager account, and no code path produces one — approval is Epic 9's. Every backend persistence format (the component-embedded relation write, `publish({ documentId })`, the manager filter) is verified only against `jest.fn()` mocks (DW-223).
- **The boot path itself is still untested.** The `auth` defect was caught by reading Strapi's route schema, not by any suite; a guard test now pins that specific mistake, but no test actually starts Strapi, so a different invalid route config would still reach production the same way.
- **Media ids are accepted without an ownership check** (DW-217), so a venue manager can publish any file in the shared library on their own page, and the seeded upload grant is unscoped (DW-220).
- **`venue.manager` is `manyToOne`** and the lookup is a `findFirst` (DW-218) — a manager assigned two venues edits an arbitrary one, with no selector and no warning.
- **Concurrent saves silently interleave** (DW-219): the payload is a client-computed diff over a 60-second cache with no version check.
- **Suspension has no takedown** (DW-221). This pass added a read-side filter so the public page hides a suspended venue; the published entry still exists and any other consumer gating on publication state alone would still serve it.
- **Public edits take up to five minutes to appear** (`revalidate: 300`, nothing invalidates on save). The copy now says so rather than promising immediacy, but it is a real gap between the AC's "reflected on the public venue page" and what a manager observes.
