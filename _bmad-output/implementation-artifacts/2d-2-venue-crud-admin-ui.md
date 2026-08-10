---
baseline_commit: 1f4fb82
epic: 2d
story: 2
---

# Story 2D.2: Venue CRUD Admin UI (Venues Plugin)

Status: ready-for-dev

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

- [ ] **Task 1: Venues-plugin admin-api routes + controllers (Document Service)** (AC: 5, 7, 9)
  - [ ] Add admin-api routes to `venues/server/src/routes/index.ts`: `GET /venues` (list w/ search, `status`/`type`/`city` filter, sort, pagination), `GET /venues/:documentId`, `POST /venues`, `PUT /venues/:documentId`, `DELETE /venues/:documentId`, and a bulk `POST /venues/bulk-delete`. These are **new** — only `content-api` read + a seed route exist today (see Dev Notes §3).
  - [ ] Implement controllers using `strapi.documents('plugin::venues.venue')` (Document Service), keyed by `documentId`. Zod-validate bodies; return error CODES on failure (`ctx.throw` with a coded body, never prose).
  - [ ] Add a policy/middleware enforcing RBAC scoping server-side: Venue Manager limited to `manager == ctx.state.user`; Admin/Editor unrestricted.
  - [ ] Co-locate unit tests for the controllers (Document Service mocked).
- [ ] **Task 2: Plugin shell + routing (S0)** (AC: 1, 7, 8)
  - [ ] Replace `HomePage.tsx` with a `Layouts.Root` shell + left nav (Lieux / Propriétés), Propriétés hidden for Venue Manager. Wire routes in `pages/App.tsx`.
  - [ ] Register AR/FR/EN trads via `registerTrads`; use `getTranslation` for all chrome strings.
- [ ] **Task 3: Venues list (S1)** (AC: 1, 2, 6, 8)
  - [ ] Build the list: `Table` + search `Searchbar`/`TextInput`, `SingleSelect` filters (first option `value=""` = "tous"), sortable Nom `Th`, tri-state bulk `Checkbox`, `EmptyStateLayout`, `Loader`.
  - [ ] Wire a data hook (TanStack Query v5 + `useFetchClient`) to the new admin routes; mutations confirm → mutate → refetch; toasts via `useNotification`.
  - [ ] Bulk delete + single delete via `Dialog.*` confirm naming the count.
  - [ ] Co-locate tests: filter/sort/bulk/empty.
- [ ] **Task 4: Relocate + adapt VenueFormModal (S1)** (AC: 3, 6, 9, 10)
  - [ ] Move `events-manager/.../VenueFormModal` into `venues/admin/src/components/VenueFormModal`; convert to `Modal.*` (if any `ModalLayout` remains), wrap every input in `Field.Root`.
  - [ ] Bind sections to the real schema fields (AC 9); map prototype TYPES → real enum (AC 10); keep auto-slug; status field read-only for Venue Manager.
  - [ ] Remove/redirect the events-manager venue form so no duplicate remains; update any events-manager imports (e.g. `useVenuesEnhanced` consumers).
  - [ ] Co-locate tests: validation, auto-slug, RBAC status lock.
- [ ] **Task 5: Address→geocode→map picker (S1)** (AC: 4)
  - [ ] Replace raw lat/lng inputs with an address `TextInput` + "Localiser" `Button` + map canvas framed in `Box`/`Field.Root`; draggable pin writes `geo.latitude`/`geo.longitude`.
  - [ ] Put geocoding behind a small `geocode(address)` adapter interface (provider TBD per OQ-1); ship a default impl + a TODO documenting the provider decision.
- [ ] **Task 6: Verify** (AC: 11)
  - [ ] `yarn generate:types` / boot clean; run the create→edit→list→delete smoke test; run strapi-ui-reviewer + the v1.2.0 DS hook; fix findings.

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

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Version | Description                                                          | Author |
| ---------- | ------- | -------------------------------------------------------------------- | ------ |
| 2026-06-20 | 0.1     | Story created (ready-for-dev) with Claude Design export as reference | Ayoub  |
