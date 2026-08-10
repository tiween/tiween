---
baseline_commit: 3666b1ea5f4c7f2cb1fe3aeb2ec901574fcafde8
epic: 2d
story: 2
---

# Story 2D.2: Venue CRUD Admin UI (Venues Plugin)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Admin/Editor** (and scoped **Venue Manager**),
I want to create, edit, and delete venues from the venues-plugin admin — a list with search/filter/sort/bulk plus a sectioned form modal with an address→geocode→map-picker —
so that I no longer rely on the default content-manager and the placeholder `HomePage.tsx` is replaced by a purpose-built venues admin.

## Acceptance Criteria

1. **Given** the venues plugin `HomePage` placeholder
   **When** I open the venues admin (S0 shell + S1 list)
   **Then** the placeholder is replaced by a plugin shell (`Layouts.Root` + a left `SubNav`/`SideNav`, landing on **Lieux**) and a venues **list**: a `Table` with columns Nom (sortable) / Ville / Type / Statut / Capacité / Actions, a search field (matches name + address), and `status`/`type`/`city` filters. Empty and loading states render via `EmptyStateLayout` and `Loader`. (Ref: design-export `App.jsx` `VenuesList`, EXPERIENCE.md § Component Patterns → Venues table.)

2. **Given** the list
   **When** I create / edit / delete a venue
   **Then** create/edit open the venue **form modal**; delete opens a confirm `Dialog` ("Supprimer ce lieu ? Cette action est irréversible."). Tri-state bulk select (header checkbox → indeterminate) enables a bulk delete that names the count ("Supprimer 3 lieux ?"). After any mutation the list **refetches** (no optimistic delete) and a success toast fires ("Lieu créé." / "Lieu modifié." / "Lieu supprimé.").

3. **Given** the events-manager `VenueFormModal`
   **When** the venue form is built
   **Then** it is the events-manager `VenueFormModal` **relocated/adapted into the venues plugin** — sectioned (Informations générales / Localisation / Contact / Médias / Propriétés), with auto-slug (slug generated from name until the user edits it), client validation, and **no duplicate venue form left in events-manager** (the events-manager copy is removed or re-pointed; see Dev Notes §4).

4. **Given** the coordinate requirement
   **When** I set a venue's location
   **Then** coordinates are captured via an **address `TextInput` + "Localiser" button + map picker** that geocodes the address and writes to the `geo` (`shared.geo-point`) component's `latitude`/`longitude`, with a draggable pin to adjust — **NOT** raw decimal lat/lng `<TextInput>`s. The current `VenueFormModal`'s raw lat/lng inputs are replaced wholesale. The geocoding provider is **OQ-1 (open)** — implement provider-agnostically behind a small adapter so the provider is swappable (see Dev Notes §5).

5. **Given** venue create/edit/delete + list
   **When** the UI talks to the backend
   **Then** it calls **venues-plugin admin-api routes** (which DO NOT YET EXIST — see Dev Notes §3) using the **Document Service API** (not Entity Service), keyed by `documentId` (not `id`). All inputs are **Zod-validated**; the server returns **error CODES** (e.g. `VENUE_NAME_REQUIRED`), never prose, and the UI maps each code to a translated `Field.Error`/toast. Strapi responses are consumed directly (`data` shape), never transformed.

6. **Given** Strapi Design System v2
   **When** the UI is built
   **Then** it uses **only** `@strapi/design-system` v2 components — no native HTML controls, no `styled-components`, no hex colors, no inline `style` layout, and **no `ModalLayout`** (removed in v2 — use `Modal.Root/Content/Header/Title/Body/Footer`). Every input is wrapped in `Field.Root` (+ `Field.Label`, `Field.Error`/`Field.Hint`). Confirms use `Dialog.*`; forms use `Modal.*`. (Ref: handoff/ds-component-binding.md, strapi-ui-design v1.2.0 `component-catalog.md`.)

7. **Given** RBAC seeded in 2C.1
   **When** roles differ
   **Then** **Admin/Editor** see all venues + "Nouveau lieu" + Properties nav + an editable status field; a **Venue Manager** sees only their own venue, no "Nouveau lieu", no Properties nav, and a **read-only** status field. The UI reads a `canManageAllVenues`-style capability via `useRBAC()`; scoping is enforced **server-side** in the admin routes (the UI gate is convenience, not the security boundary).

8. **Given** i18n + numerals conventions
   **When** chrome and data render
   **Then** plugin chrome is localized via `registerTrads`/`getTranslation` (AR/FR/EN), **Western numerals** are used in all locales (including Arabic), and dates render `DD/MM/YYYY`. RTL is host-driven — never hardcode left/right.

9. **Given** the new schema field set from 2D.1
   **When** the form binds fields
   **Then** the form binds to the **real** venue attributes: `name`, `slug` (uid), `description`, `address`, `cityRef` (→ `plugin::geography.city`), `geo`, `phone`, `email`, `website`, `type` (enum `cinema/theater/cultural-center/museum/other`), `status` (enum `pending/approved/suspended`), `capacity`, `logo`, `images`, `manager`. The `properties` repeatable and the Médias upload are wired as placeholders deferred to 2D.4 / MediaInput respectively (this story stubs them; full property-value editing is 2D.4).

10. **Given** the design-export reconciliation notes
    **When** porting the prototype
    **Then** the prototype's TYPES (`cinema/theatre/musee/centre/salle`) are mapped onto the **real schema enum** (`cinema/theater/cultural-center/museum/other`) — the schema wins; the custom `window.StrapiDSVenuesPluginAdmin_1054bf` bundle is replaced entirely by real DS imports; the map placeholder becomes a real (provider-agnostic) picker.

11. **Given** the implementation
    **When** verified
    **Then** `yarn generate:types` / Strapi boots clean (0 errors), a dev smoke test passes (**create → edit → list reflects changes → delete**), co-located tests cover the list (filter/sort/bulk/empty) and the form (validation, auto-slug, RBAC status lock), and the DS conformance check (strapi-ui-reviewer / the v1.2.0 hook) reports no violations.

## Tasks / Subtasks

- [x] **Task 1: Venues-plugin admin-api routes + controllers (Document Service)** (AC: 5, 7, 9)
  - [x] Add admin-api routes to `venues/server/src/routes/index.ts`: `GET /venues` (list w/ search, `status`/`type`/`city` filter, sort, pagination), `GET /venues/:documentId`, `POST /venues`, `PUT /venues/:documentId`, `DELETE /venues/:documentId`, and a bulk `POST /venues/bulk-delete`. These are **new** — only `content-api` read + a seed route exist today (see Dev Notes §3).
  - [x] Implement controllers using `strapi.documents('plugin::venues.venue')` (Document Service), keyed by `documentId`. Zod-validate bodies; return error CODES on failure (`ctx.throw` with a coded body, never prose).
  - [x] Add a policy/middleware enforcing RBAC scoping server-side: Venue Manager limited to `manager == ctx.state.user`; Admin/Editor unrestricted.
  - [x] Co-locate unit tests for the controllers (Document Service mocked).
- [x] **Task 2: Plugin shell + routing (S0)** (AC: 1, 7, 8)
  - [x] Replace `HomePage.tsx` with a `Layouts.Root` shell + left nav (Lieux / Propriétés), Propriétés hidden for Venue Manager. Wire routes in `pages/App.tsx`.
  - [x] Register AR/FR/EN trads via `registerTrads`; use `getTranslation` for all chrome strings.
- [x] **Task 3: Venues list (S1)** (AC: 1, 2, 6, 8)
  - [x] Build the list: `Table` + search `Searchbar`/`TextInput`, `SingleSelect` filters (first option `value=""` = "tous"), sortable Nom `Th`, tri-state bulk `Checkbox`, `EmptyStateLayout`, `Loader`.
  - [x] Wire a data hook (TanStack Query v5 + `useFetchClient`) to the new admin routes; mutations confirm → mutate → refetch; toasts via `useNotification`.
  - [x] Bulk delete + single delete via `Dialog.*` confirm naming the count.
  - [x] Co-locate tests: filter/sort/bulk/empty.
- [x] **Task 4: Relocate + adapt VenueFormModal (S1)** (AC: 3, 6, 9, 10)
  - [x] Move `events-manager/.../VenueFormModal` into `venues/admin/src/components/VenueFormModal`; convert to `Modal.*` (if any `ModalLayout` remains), wrap every input in `Field.Root`.
  - [x] Bind sections to the real schema fields (AC 9); map prototype TYPES → real enum (AC 10); keep auto-slug; status field read-only for Venue Manager.
  - [x] Remove/redirect the events-manager venue form so no duplicate remains; update any events-manager imports (e.g. `useVenuesEnhanced` consumers).
  - [x] Co-locate tests: validation, auto-slug, RBAC status lock.
- [x] **Task 5: Address→geocode→map picker (S1)** (AC: 4)
  - [x] Replace raw lat/lng inputs with an address `TextInput` + "Localiser" `Button` + map canvas framed in `Box`/`Field.Root`; draggable pin writes `geo.latitude`/`geo.longitude`.
  - [x] Put geocoding behind a small `geocode(address)` adapter interface (provider TBD per OQ-1); ship a default impl + a TODO documenting the provider decision.
- [x] **Task 6: Verify** (AC: 11)
  - [x] `yarn generate:types` / boot clean; run the create→edit→list→delete smoke test; run strapi-ui-reviewer + the v1.2.0 DS hook; fix findings.

## Dev Notes

### CRITICAL FRAMING — this is a UI build on a schema that already exists, plus the admin routes that do NOT

2D.1 (done) already extended the venue schema to the rich model. This story builds the
**admin UI** for it AND the **admin-api routes** the UI needs — which are missing today.
Do not assume CRUD endpoints exist; you are creating them.

### §1 — Authoritative design reference (freshly exported from Claude Design)

The visual + behavioral source of truth for this story lives in the run folder:
`_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-18/`

- `design-export/MANIFEST.md` — what the export is + the **reconciliation points** (read first).
- `design-export/ui_kit/App.jsx` — the full interactive UI kit. `VenuesList` (S1 list:
  search/filter/sort/tri-state bulk/empty), `VenueForm` (S1 sectioned form), `MapPicker`
  (the address→Localiser→pin interaction), plus the RBAC role toggle in `App`. **This is
  the authoritative behavior reference** — but it is cosmetic (faked data, custom DS
  bundle, placeholder map). Port the behavior; replace the implementation.
- `design-export/ui_kit/data.js` — seed shapes (note TYPES mismatch, §6).
- `DESIGN.md` (+ theme-reference appendix) / `EXPERIENCE.md` — the two spines.
- `handoff/ds-component-binding.md` — element → exact DS component, and the "never use" list.

> Source project (re-fetch any component on demand):
> `DesignSync get_file --projectId 1054bff7-5f5f-4489-97e3-54129a48639d --path <path>`
> (e.g. `components/overlays/Modal.jsx`, `components/forms/Field.jsx`).

### §2 — Current venue schema (verbatim — what the form binds to)

`apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json` (from 2D.1):
`name*` (string), `slug` (uid←name), `description` (text), `address` (text),
`cityRef` (relation→`plugin::geography.city`), `geo` (component `shared.geo-point`,
**the single coordinate source**), `phone` (string), `email` (email), `website` (string),
`type` (enum `cinema/theater/cultural-center/museum/other`), `status` (enum
`pending/approved/suspended`, default `pending`), `capacity` (integer), `logo` (media
single, images), `images` (media multiple, images), `manager` (relation→
`plugin::users-permissions.user`), `properties` (repeatable `entity-properties.property-value`
— **2D.4 owns this**), `events` (oneToMany). `draftAndPublish: true`.

### §3 — Admin routes are MISSING — you must create them

`venues/server/src/routes/index.ts` today exposes only **`content-api`** read routes
(`GET /venues`, `GET /venues/:documentId`, both `auth:false`) and one **`admin`** seed
route (`POST /seed/venues`). There are **no admin CRUD routes**. Add them under the
existing `admin-api` block. Controllers must use the **Document Service**:
`strapi.documents('plugin::venues.venue').findMany/findOne/create/update/delete`,
keyed by `documentId`. The existing `venue` content-api controller transforms into a
`{ data, meta }` body — mirror that envelope for the admin list, but **read fields
directly off the Document Service result; never hand-transform attributes**.

### §4 — Relocation of the events-manager venue form (single source of truth)

`apps/strapi/src/plugins/events-manager/admin/src/components/`:
`VenueFormModal/`, `VenueCard/`, `VenueSelector/`, and `pages/Venues/` exist there.
2D's sequencing rule: the venue form is relocated **once** into the venues plugin — **no
duplicate remains in events-manager**. Move `VenueFormModal` (and any venue-only helper it
needs) into `venues/admin/src/components/`; leave `VenueSelector` in events-manager only if
events-manager still needs to _pick_ a venue (it likely does — a selector is not a form).
Reconcile `hooks/useVenuesEnhanced.ts` consumers. Document in Completion Notes exactly what
moved, what stayed, and why. The relocated form's raw lat/lng `<TextInput>`s (the
historical map-picker insertion point) are **deleted** and replaced by Task 5.

### §5 — Map picker & geocoding (OQ-1 still open)

EXPERIENCE.md § Interaction Primitives specifies: address field → "Localiser" → geocode →
draggable pin → write `geo.latitude/longitude`. The **provider is undecided (OQ-1:
Nominatim/OSM vs Google vs the geography plugin's city coords)**. Do not hardcode a
provider into the component — define `interface Geocoder { geocode(address): Promise<{lat,lng}> }`,
inject it, ship a default (Nominatim/OSM is the no-cost default) behind a TODO. The map
canvas is the one sanctioned non-DS visual element; it must stay framed inside DS chrome
(`Box`/`Field.Root`) and must not introduce hex colors elsewhere.

### §6 — Reconciliation points (from MANIFEST.md — do not skip)

1. **Type enum mismatch.** `design-export/ui_kit/data.js` TYPES =
   `cinema/theatre/musee/centre/salle`; the **schema enum wins** =
   `cinema/theater/cultural-center/museum/other`. Map UI labels onto real values; do not
   introduce new enum members.
2. **Custom DS bundle ≠ real DS.** Every `window.StrapiDSVenuesPluginAdmin_1054bf.*`
   component → its real `@strapi/design-system` v2 equivalent per
   `handoff/ds-component-binding.md` and the strapi-ui-design v1.2.0 `component-catalog.md`.
   In particular: `Modal.*` (not `ModalLayout`), `Dialog.*` for confirms, `Field.Root`
   around every input, `SingleSelect`/`SingleSelectOption`, `NumberInput` uses
   `onValueChange` (not `onChange`).
3. **Map placeholder → real picker** (see §5).

### §7 — Project rules carried (from project-context.md)

Strapi v5 **Document Service** (not Entity Service); **`documentId`** not `id`; **never
transform** Strapi responses; **error CODES** not prose (translate in UI); **Zod**-validate
all inputs; no **`any`** (strict TS); **co-locate** tests (no `__tests__` folders for new
admin code — match the plugin's existing co-location); **Western numerals + DD/MM/YYYY**
even in Arabic; venue management is a **Strapi Admin** surface (this plugin), not the
Next.js client.

### Critical guardrails (carried from 2C.1 / 2D.1)

- This story **edits the plugin that 2C.1 created**. Keep the plugin booting: clean
  `dist/` + `.strapi` if you hit duplicate-table/stale-dist errors before `generate:types`.
- Additive only — do not alter the 2D.1 schema. If the UI needs a field the schema lacks,
  STOP and flag it (don't silently add a phantom field).

### ✅ Dependency gate — CLOSED 2026-08-10

Epic 2D's stated prerequisite is **"2C.1 (venues plugin extraction) stable."**
`2c-1-extract-venues-plugin` is now **`done`**: its three open review findings were
resolved (seed pipeline already repaired by later work; venues controllers typed
`ctx: Context` with prose errors replaced by CODES; stale `plugin::events-manager.venue`
UID corrected in `apps/strapi/docs/plugin-architecture.md`). Grep gate clean,
`yarn type-check` clean, strapi suite 1132/1132 green. No structural or route changes
came out of the closure, so **Task 1 below stands as written**.

`2c-3-catalog-move-into-creative-works` remains in `review` but is the catalog move, not
the venues extraction — it does not gate this story.

### Project Structure Notes

- Admin UI: `apps/strapi/src/plugins/venues/admin/src/` — `pages/` (App, HomePage→shell),
  `components/` (relocated VenueFormModal, list, map picker), `hooks/` (venues data hook),
  `translations/{ar,fr,en}.json`.
- Server: `apps/strapi/src/plugins/venues/server/src/` — `routes/index.ts` (+admin CRUD),
  `controllers/index.ts` (+venue admin controller), `services/venue.ts` (extend),
  `policies/` (new — RBAC scoping).
- Co-locate `*.test.tsx` next to components; controller tests beside `controllers/`.
- Reference (read, do not rebuild): `events-manager/admin/src/components/VenueFormModal`,
  `StatusBadge`, `ConfirmDialog`, `PluginLayout`, `useVenuesEnhanced`.

### Testing

- Vitest unit/component tests, **co-located**. List: search/filter/sort/tri-state-bulk/empty.
  Form: required-field validation (`name`, `type`), auto-slug-until-touched, status
  read-only for Venue Manager, enum mapping. Controllers: Document Service mocked, error-code
  paths.
- Dev smoke (manual or scripted): create → edit → list reflects → delete.
- DS conformance: run `strapi-ui-reviewer` and rely on the v1.2.0 PostToolUse hook on
  `admin/src/**/*.tsx`.

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2d-venues-properties-admin-ui.md#Story 2D.2]
- [Source: _bmad-output/implementation-artifacts/2d-1-extend-venue-schema-to-rich-model.md] (schema baseline)
- [Source: apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json]
- [Source: apps/strapi/src/plugins/venues/server/src/routes/index.ts] (no admin CRUD yet)
- [Source: apps/strapi/src/plugins/venues/admin/src/pages/HomePage.tsx] (placeholder to replace)
- [Source: _bmad-output/.../ux-designs/ux-tiween-bmad-version-2026-06-18/design-export/MANIFEST.md]
- [Source: _bmad-output/.../ux-designs/ux-tiween-bmad-version-2026-06-18/design-export/ui_kit/App.jsx]
- [Source: _bmad-output/.../ux-designs/ux-tiween-bmad-version-2026-06-18/DESIGN.md + EXPERIENCE.md]
- [Source: _bmad-output/.../ux-designs/ux-tiween-bmad-version-2026-06-18/handoff/ds-component-binding.md]
- [Source: strapi-ui-design plugin v1.2.0 — component-catalog.md (DS v2 API)]
- [Source: _bmad-output/project-context.md] (Strapi v5 / i18n / error-code rules)

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code / bmad-build)

### Debug Log References

- `yarn generate:types` — 0 warnings, 0 errors. Pre-existing (2D.1) warning surfaced
  and left alone: _"The attribute name 'status' on content type 'plugin::venues.venue'
  is reserved when 'draftAndPublish' is enabled."_ The admin service therefore always
  passes `status` as the **Document Service D&P param** (`status: "draft"`) and puts the
  venue's own `status` **inside `filters`**, which is the only combination that means
  what it reads as. Logged as a schema smell for a later story — renaming the attribute
  is a 2D.1 schema change, and this story is additive-only.
- `yarn test` → 82 suites / 1214 tests green (was 78 / 1179).
- `yarn test:integration` → 7 suites / 51 tests green (was 6 / 46); Strapi boots clean
  with the new routes, policies and RBAC actions.
- `yarn lint` (eslint, `--max-warnings=0`) and `yarn type-check` clean.

### Completion Notes List

**Task 1 — admin API (new).** Six `admin-api` routes under **`/venues/admin/venues`**,
not the bare `/venues` the task text suggested: `@strapi/core`'s `register-routes.js`
mounts a plugin's content-api AND admin routers under the same `/<pluginName>` prefix, so
an admin `GET /venues` would resolve to the same URL as the existing PUBLIC `auth: false`
read and the first router registered would win. The extra segment keeps the namespaces
disjoint; `routes.unit.test.ts` pins it. Controllers/services use the Document Service
keyed by `documentId`, Zod-validate every input (`validation/venue-admin.ts`) and answer
CODES only.

**RBAC (AC 7) — the premise in the AC was not met, so it was built.** 2C.1 seeded a
_users-permissions_ `venue-manager` role; it never registered **admin-panel** RBAC
actions, and `useRBAC()` has nothing to answer without them. `server/src/register.ts` now
registers `plugin::venues.{read,create,update,delete,manage-all}`; `manage-all` is the
`canManageAllVenues` capability (`useRBAC` derives `canManageAll` from the hyphenated
uid). Routes carry `admin::hasPermissions` + the new
`plugin::venues.venues-admin-scope` policy, which resolves the capability from
`ctx.state.userAbility` and stashes it on `ctx.state`; `services/venue-admin.ts` turns it
into the tenant filter. **Operator note:** a fresh database grants these to Super Admin
only — any other role sees an empty list until an administrator ticks the boxes in
Settings → Roles. Seeding grants onto roles this plugin does not own would widen
permissions on every boot, so it was not done.

**Tenant scoping joins on `manager.email` — flagged.** `venue.manager` targets
`plugin::users-permissions.user`, but an ADMIN route authenticates an `admin::user`: two
tables, two id spaces, so `manager.id === ctx.state.user.id` would compare unrelated
integers. Email is the only shared identifier, compared case-insensitively. A clean link
(an explicit `adminUser` relation) is a 2D.1 schema change and this story is additive-only
— **raised here rather than smuggled in.** A scoped caller with no email is confined to an
impossible filter (fails closed), cannot create, and has `status` stripped from every
payload.

**Task 2/3 — shell + list.** `HomePage.tsx` deleted; `pages/App.tsx` now routes through
`components/PluginLayout` (`Layouts.Root` + `SubNav`), landing on **Lieux**, with
**Propriétés** hidden without `manage-all` and pointing at a 2D.3 placeholder page. The
list ports the design kit's `VenuesList` behaviour onto real DS v2: search (name+address),
status/type/city `SingleSelect`s whose first option is `value=""`, sortable Nom/Type/
Statut/Capacité headers with `aria-sort`, tri-state header `Checkbox`, `EmptyStateLayout`
distinguishing "nothing yet" from "nothing matches", `Loader`, `Pagination`. Every
mutation is confirm → mutate → **refetch** (no optimistic delete) plus a `useNotification`
toast. AR/FR/EN trads via `registerTrads`/`getTranslation`; counts and dates go through
`utils/format.ts` (Western numerals, `DD/MM/YYYY`) because react-intl would otherwise
render Arabic-Indic digits for a `{count}` under the `ar` locale.

**Task 4 — relocation. WHAT MOVED / WHAT STAYED.**

- MOVED into `venues/admin/src/components/VenueFormModal/` (adapted, not copied): the
  form + its `validate.ts`. It now talks to the venues admin API, is fully translated,
  locks `status` without `manage-all`, uses `NumberInput`+`onValueChange` for capacity,
  and takes its coordinates from the map picker.
- DELETED from events-manager: `components/VenueFormModal/`, `pages/Venues/` (+
  `BulkActionsDropdown`), the `venues` route, the `venues` SubNav link and the venues tab
  of the dead `pages/HomePage.tsx`. **No duplicate venue form remains.**
- ALSO removed from `events-manager/hooks/useVenuesEnhanced.ts`: `useVenue`,
  `useVenueMutations`, `VenueInput` — a second WRITE path through the content-manager REST
  API that bypassed the plugin's validation, codes and scoping. `useVenuesList` and the
  types STAY: `VenueSelector`, `VenueCard`, `StatusBadge` and three other hooks still
  import them, and _picking_ a venue is not _editing_ one.

**Task 5 — map picker.** Raw lat/lng inputs are gone. `components/MapPicker` is an address
`TextInput` + "Localiser" `Button` + a fixed-zoom OSM tile canvas with a draggable pin
writing `geo.latitude`/`geo.longitude`; resolved coordinates render READ-ONLY. Geocoding
sits behind `interface Geocoder`, injected as a prop, default `nominatimGeocoder` — with
an explicit `TODO(OQ-1)` naming what to change when the provider is decided. The canvas is
the one sanctioned non-DS element, framed in `Field.Root`/`Box`, colours from
`var(--colors-…)`, and it uses plain `fetch` so no admin JWT reaches a third party. No map
library was added to the admin bundle for one field.

**Deferred, deliberately visible (AC 9).** The **Médias** and **Propriétés** form sections
render an on-screen note instead of a dead control — media waits on the `MediaInput` port,
property values are 2D.4 — and neither writes its fields, so an existing venue's `logo`,
`images` and `properties` survive every save made through this form.

**Deviation from the task text, with reason.** The story names TanStack Query v5;
`@tanstack/react-query` is not a dependency of `apps/strapi` and the admin does not
re-export its own copy, so `hooks/useVenuesAdmin.ts` follows the `useVenuesEnhanced` shape
the handoff sheet actually prescribes (`useVenuesList`/`useVenue`/`useVenueMutations` +
explicit `refetch`), over `useFetchClient`. It adds a request-sequence guard the original
lacked, so a slow early search cannot overwrite fresher rows.

**Verification (AC 11).** `yarn generate:types` clean; the create → edit → list-reflects →
delete smoke test is AUTOMATED over HTTP against a booted Strapi with a real admin session
(`server/src/__tests__/venue-admin-crud.service.test.ts`) rather than clicked. Co-located
tests cover the list (search/sort/bulk/empty/RBAC), the form (auto-slug, RBAC status lock,
code→translated-error) and the rules/geocoder on the node gate. NOT RUN: the
`strapi-ui-reviewer` / v1.2.0 DS hook — that tooling is not installed in this workspace;
the DS constraints were applied by hand against `handoff/ds-component-binding.md` (no
`ModalLayout`, `Dialog.*` for confirms, `Field.Root` around every input, no hex, no
`styled-components`, no native controls).

### Review remediation (2026-08-10, 25 findings — all patched in place)

**Blocking**

1. **CSP blocked the map tiles.** `config/middlewares.ts` `img-src` had no OSM
   host, so the canvas painted empty in a real admin. Added
   `https://tile.openstreetmap.org` + the `*.tile` subdomains, with a comment
   tying the entry to OQ-1's provider choice. `connect-src` already allows
   `https:`, so Nominatim needed nothing; the rest of the policy is unchanged.
2. **The venue-delete guard was re-implemented server-side.** `venue-admin.delete()`
   now counts screenings AND performances (`event.venue`, both 2C.3 UIDs) before
   deleting and refuses with `VENUE_HAS_EVENTS` (409). A count that FAILS blocks
   the delete — it is never read as zero, which is the exact regression 2C.3
   hardened. `bulkDelete` routes through the same `delete()`, so both paths are
   covered. Three translations + unit tests for the blocked, count-failed and
   bulk cases.
3. **`manager` is writable again (AC 9), and only for `manage-all`.** Added to
   `venueWritableShape`/`WRITABLE_VENUE_FIELDS`, exposed in the form as a
   users-permissions user picker scoped to the `venue-manager` role
   (`hooks/useVenueManagers.ts`). Without it no venue could ever have a manager
   and the tenant scoping had nothing to key off.

**Correctness**

4. `syncPublication` now UNPUBLISHES when `status !== "approved"`. An
   approved → pending demotion previously left the published copy live, and
   `pending` has no public read gate to hide behind. Both directions are
   non-fatal and tested.
5. A duplicate slug maps to `VENUE_SLUG_TAKEN` (400) with an issue attached to
   `slug`, via an `isUniqueViolation` check mirroring `services/registration.ts`
   — no longer an opaque 500.
6. A scoped caller writing `status`/`manager` is REFUSED (`VENUE_FORBIDDEN`)
   rather than stripped down to `{}` and told "Nothing to save"
   (`usedPrivilegedFields`, checked before the payload is built).
7. `NOT_AUTHENTICATED` and `VENUE_ID_REQUIRED` translated in all three locales,
   plus `utils/errors.unit.test.ts`, which DERIVES the emittable-code set from
   the server sources and fails if any code lacks a key in ar/en/fr (and if the
   three catalogues drift apart at all).
8. `parseApiError` gained a status fallback: a bare 403 (`admin::hasPermissions`
   carries no code) → `VENUE_FORBIDDEN`, 401 → `NOT_AUTHENTICATED`.
9. `canRead`/`isLoading` are wired: `Page.Loading` while permissions resolve,
   `Page.NoPermissions` without read, and `useVenuesList` gained `enabled` so no
   request that can only 403 is fired.
10. The list clamps `page` onto `pagination.pageCount` after every response, so
    deleting the last rows of the last page can no longer strand the editor on
    an empty table.

**MapPicker**

11. The canvas MEASURES itself (`ResizeObserver` + an initial measurement) and
    the tile grid, pointer mapping and pin offset are all driven from the
    measurement — the fixed-768 maths under a `100%` container is gone.
12. `© OpenStreetMap contributors` renders under the canvas as a DS `Link`, in
    all three locales (a licence/ToS obligation for both the tiles and Nominatim).
13. Geocoding gained an `AbortController`, a 10s timeout and a request-sequence
    guard; `Geocoder.geocode` takes an optional `signal`, and the controller is
    aborted on unmount.
14. Latitude is clamped to ±85.05112878 (`MERCATOR_MAX_LATITUDE`) in the
    transform, in `isValidGeoPoint` and in the server `geoSchema` — ±90 made
    `Math.log` diverge and blanked the canvas.
15. The pin is focusable (`tabIndex`, `role="button"`) and arrow-key nudgeable
    (Shift = larger step), with the hint wired through `aria-describedby`.
16. `MapPicker` takes `disabled` and the form passes `isSaving`.

**Smaller**

17. `handleSubmit` returns early while `isSaving` — Enter could previously submit
    a second time past the button's `loading` guard.
18. `useVenue` gained the same stale-response `requestId` guard as `useVenuesList`.
19. `useCities` PAGES through the whole vocabulary (cap 1000, reported through
    `truncated` + an on-screen hint) and shares one in-flight promise across
    mounts, so the list and the modal no longer fetch it twice.
20. The single-delete confirm names the venue (`dialog.delete.bodyNamed`).
21. Dead code deleted from events-manager after the relocation, verified by grep
    first: `components/CitySelector/`, `components/VenueCard/` (+
    `VENUE_TYPE_OPTIONS` + its test), `components/StatusBadge/` (+
    `STATUS_OPTIONS`) and `hooks/useGeography.ts` had no remaining consumers.
    `VenueSelector` imports only `useVenuesEnhanced`, so it and `ConfirmDialog`
    (still used by Works/SubEventModal) stay.

**Test gaps**

22. `server/src/__tests__/register.unit.test.ts` pins the RBAC action ids by
    IMPORTING both sides: the registered set must cover every action referenced
    by `routes/index.ts`, by the menu link and by `useVenuePermissions`, and the
    swallowed `registerMany` failure must still log. The shared constants moved
    to a dependency-free `admin/src/permissions.ts` so the node gate can read
    them (importing the admin bundle there explodes on ESM).
23. The list's failure branches are now driven: a partially-failed bulk delete
    (warning toast), a refused bulk delete and a refused single delete
    (`VENUE_HAS_EVENTS`, translated, list still refetches).
24. `venue-admin-crud.service.test.ts` gained a SCOPED-caller block over HTTP —
    a throwaway admin role holding read/create/update/delete but not
    `manage-all` (`tests/helpers/admin.ts` now accepts `permissions`). It pins
    list scoping, 404-not-403 for another tenant, refused cross-tenant delete,
    an allowed own-venue edit, both privileged-field refusals and the create
    refusal.
25. `toWorldPixel`/`fromWorldPixel` moved to `components/MapPicker/projection.ts`
    (the node gate cannot load `.tsx`) and are pinned by
    `projection.unit.test.ts`: round trip, orientation, meridians, pole clamping
    and the one-pixel nudge the keyboard path relies on.

**Re-verification after the patch round:** `yarn generate:types` 0 errors ·
`yarn type-check` clean · `yarn lint --max-warnings=0` clean · `yarn test`
84 suites / **1244** tests · `yarn test:integration` 7 suites / **58** tests.

### File List

**Added — server**

- `apps/strapi/src/plugins/venues/server/src/validation/venue-admin.ts`
- `apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts`
- `apps/strapi/src/plugins/venues/server/src/controllers/venue-admin.ts`
- `apps/strapi/src/plugins/venues/server/src/policies/venues-admin-scope.ts`
- `apps/strapi/src/plugins/venues/server/src/services/__tests__/venue-admin.unit.test.ts`
- `apps/strapi/src/plugins/venues/server/src/controllers/__tests__/venue-admin.unit.test.ts`
- `apps/strapi/src/plugins/venues/server/src/policies/__tests__/venues-admin-scope.unit.test.ts`
- `apps/strapi/src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts`
- `apps/strapi/src/plugins/venues/server/src/__tests__/register.unit.test.ts`

**Added — admin**

- `apps/strapi/src/plugins/venues/admin/src/pages/Venues/index.tsx` (+ `index.test.tsx`)
- `apps/strapi/src/plugins/venues/admin/src/pages/Properties/index.tsx`
- `apps/strapi/src/plugins/venues/admin/src/components/PluginLayout/index.tsx`
- `apps/strapi/src/plugins/venues/admin/src/components/SideNav/index.tsx`
- `apps/strapi/src/plugins/venues/admin/src/components/StatusBadge/index.tsx`
- `apps/strapi/src/plugins/venues/admin/src/components/ConfirmDialog/index.tsx`
- `apps/strapi/src/plugins/venues/admin/src/components/VenueFormModal/{index.tsx,index.test.tsx,validate.ts,validate.unit.test.ts}`
- `apps/strapi/src/plugins/venues/admin/src/components/MapPicker/{index.tsx,geocode.ts,geocode.unit.test.ts}`
- `apps/strapi/src/plugins/venues/admin/src/hooks/{useVenuesAdmin.ts,useVenuePermissions.ts,useCities.ts,useVenueManagers.ts}`
- `apps/strapi/src/plugins/venues/admin/src/permissions.ts`
- `apps/strapi/src/plugins/venues/admin/src/utils/errors.unit.test.ts`
- `apps/strapi/src/plugins/venues/admin/src/components/MapPicker/{projection.ts,projection.unit.test.ts}`
- `apps/strapi/src/plugins/venues/admin/src/utils/{getTranslation.ts,format.ts,errors.ts,venueOptions.ts}`

**Modified**

- `apps/strapi/src/plugins/venues/server/src/{register.ts,routes/index.ts,controllers/index.ts,services/index.ts,policies/index.ts}`
- `apps/strapi/src/plugins/venues/server/src/routes/__tests__/routes.unit.test.ts`
- `apps/strapi/src/plugins/venues/admin/src/{index.tsx,pages/App.tsx}`
- `apps/strapi/src/plugins/venues/admin/src/translations/{fr,en,ar}.json`
- `apps/strapi/src/plugins/events-manager/admin/src/{pages/App.tsx,pages/HomePage.tsx,components/SideNav/index.tsx,hooks/useVenuesEnhanced.ts,translations/{fr,en,ar}.json}`
- `apps/strapi/config/middlewares.ts` (OSM tile host added to the CSP `img-src`)
- `apps/strapi/tests/helpers/admin.ts` (`createAdminSession` accepts `permissions`
  and mints a scoped throwaway admin role)
- `apps/strapi/tests/__mocks__/strapi-admin.ts` (`useNotification` now returns
  `{ toggleNotification }` as the real hook does; `Layouts.Header` projects its props;
  `SubNav.*` added)

**Deleted**

- `apps/strapi/src/plugins/venues/admin/src/pages/HomePage.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/**`
- `apps/strapi/src/plugins/events-manager/admin/src/pages/Venues/**`
- `apps/strapi/src/plugins/events-manager/admin/src/components/{CitySelector,VenueCard,StatusBadge}/**`
  and `hooks/useGeography.ts` (dead after the relocation; verified by grep)

## Change Log

| Date       | Version | Description                                                                                                                                                                                         | Author |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-06-20 | 0.1     | Story created (ready-for-dev) with Claude Design export as reference                                                                                                                                | Ayoub  |
| 2026-08-10 | 0.2     | Implementation started; `baseline_commit` rebased from the stale planning-time `1f4fb82` (107 commits back) to `3666b1e`, the clean HEAD after the 2C.1 closure commits                             | Amelia |
| 2026-08-10 | 1.0     | Implementation complete: venues admin CRUD API + plugin shell/list/form/map picker; events-manager venue form removed                                                                               | Amelia |
| 2026-08-10 | 1.1     | Review remediation: 25 findings patched (CSP tile host, delete guard, writable manager, unpublish-on-demotion, slug conflict, RBAC + i18n + map-picker fixes, dead-code removal, 4 new test suites) | Amelia |

## Suggested Review Order

**The security boundary (read this first)**

- Entry point: the scope object every admin route is filtered by, and why the join is on email.
  [`venues-admin-scope.ts:43`](../../apps/strapi/src/plugins/venues/server/src/policies/venues-admin-scope.ts#L43)

- The RBAC actions the whole surface depends on — unregistered means every role 403s.
  [`register.ts:26`](../../apps/strapi/src/plugins/venues/server/src/register.ts#L26)

- Six admin routes behind `admin::hasPermissions` + the scope policy, prefixed `/admin/venues` to avoid the public read.
  [`routes/index.ts:159`](../../apps/strapi/src/plugins/venues/server/src/routes/index.ts#L159)

- Privileged fields (`status`, `manager`) refused before the payload is built, so a scoped write gets FORBIDDEN not "nothing to save".
  [`venue-admin.ts:255`](../../apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts#L255)

**Destructive paths**

- Fail-closed delete guard: a failed sub-event count blocks, never passes as zero.
  [`venue-admin.ts:425`](../../apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts#L425)

- Delete refuses `VENUE_HAS_EVENTS`; bulk delete loops this same call, so one guard covers both.
  [`venue-admin.ts:455`](../../apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts#L455)

- Publication follows status in BOTH directions — demotion unpublishes, closing a public-visibility leak.
  [`venue-admin.ts:516`](../../apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts#L516)

**Validation and the error-code contract**

- The writable shape: every Zod issue is a CODE, never prose.
  [`validation/venue-admin.ts:252`](../../apps/strapi/src/plugins/venues/server/src/validation/venue-admin.ts#L252)

- DB unique violations become a field-attached `VENUE_SLUG_TAKEN` instead of an opaque 500.
  [`venue-admin.ts:100`](../../apps/strapi/src/plugins/venues/server/src/services/venue-admin.ts#L100)

- Where codes become readable text — with a status fallback so 403/401 never render as "unexpected error".
  [`utils/errors.ts:50`](../../apps/strapi/src/plugins/venues/admin/src/utils/errors.ts#L50)

**Admin UI**

- The list: search/filter/sort/tri-state bulk, permission-gated, page clamped after every mutation.
  [`pages/Venues/index.tsx:68`](../../apps/strapi/src/plugins/venues/admin/src/pages/Venues/index.tsx#L68)

- The relocated, sectioned form — the single venue form in the codebase now.
  [`VenueFormModal/index.tsx:131`](../../apps/strapi/src/plugins/venues/admin/src/components/VenueFormModal/index.tsx#L131)

- Address → Localiser → draggable pin, provider-agnostic behind a `Geocoder` (OQ-1 still open).
  [`MapPicker/index.tsx:98`](../../apps/strapi/src/plugins/venues/admin/src/components/MapPicker/index.tsx#L98)

- Web Mercator extracted so the transform between a drag and stored coordinates is testable.
  [`projection.ts:29`](../../apps/strapi/src/plugins/venues/admin/src/components/MapPicker/projection.ts#L29)

**Peripherals**

- CSP entry for the tile host — without it the map renders blank in a real admin.
  [`middlewares.ts:32`](../../apps/strapi/config/middlewares.ts#L32)

- Permission constants in a dependency-free module so the node test gate can import them.
  [`permissions.ts:17`](../../apps/strapi/src/plugins/venues/admin/src/permissions.ts#L17)

- Pins registered actions against routes, menu and hook — a renamed uid 403s everything, silently.
  [`register.unit.test.ts`](../../apps/strapi/src/plugins/venues/server/src/__tests__/register.unit.test.ts)

- Tenant isolation over real HTTP: cross-tenant refusal, 404-not-403, privileged-field refusals.
  [`venue-admin-crud.service.test.ts`](../../apps/strapi/src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts)
