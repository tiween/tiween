# Annotated Reference Map — clone/adapt, don't rebuild

**For the implementing LLM.** Epic 2D.2 is explicit: the venue form is the
events-manager `VenueFormModal` **relocated** into the venues plugin — no duplicate
remains. These sibling files already implement the DS v2 patterns the venues plugin
needs. Read them first; copy structure; change only what's noted.

All paths are relative to the repo root.

---

## Tier 1 — relocate into the venues plugin (move the source of truth)

### `VenueFormModal` → venues plugin

`apps/strapi/src/plugins/events-manager/admin/src/components/VenueFormModal/index.tsx`

- **What it gives you**: the full venue form — `Modal.*` shell, sectioned layout
  (Informations / Localisation / Contact / Détails / Médias), `Field.Root` wrapping,
  `Grid` two-up, slug auto-gen (`generateSlug`), client validation, create-vs-edit.
- **Change**:
  1. **Add the map picker** in the Localisation section. There's already a TODO marker
     at **`VenueFormModal/index.tsx:363`** where raw lat/lng was removed — that's the
     insertion point. Writes `geo.latitude`/`geo.longitude` (see EXPERIENCE.md §
     Interaction Primitives, cheatsheet § 6).
  2. **Add the Propriétés section** (S3 property-value editor — Accordion grouped by
     category, type-adaptive inputs).
  3. Point mutations at **venues-plugin** admin routes (Document Service), not
     events-manager's.
  4. RBAC: make **Statut** read-only for Venue Managers.

### `VenuesPage` → venues plugin `/venues` route

`apps/strapi/src/plugins/events-manager/admin/src/pages/Venues/index.tsx`

- **What it gives you**: the entire list screen — `Searchbar`+`SearchForm`, `SingleSelect`
  filters, sortable `Table`, tri-state bulk `Checkbox`, `Pagination`, `EmptyStateLayout`,
  `Loader`, modal/dialog orchestration. This is ~90% of S1.
- **Change**: filter set (status/type/**city**), scope list server-side for Venue
  Managers, hide "Nouveau lieu" when `!canManageAllVenues`.

### `BulkActionsDropdown`

`apps/strapi/src/plugins/events-manager/admin/src/pages/Venues/BulkActionsDropdown.tsx`

- Bulk delete + bulk status, routed through `Dialog`. Reuse as-is.

---

## Tier 2 — copy verbatim (shared building blocks)

### `StatusBadge`

`apps/strapi/src/plugins/events-manager/admin/src/components/StatusBadge/index.tsx`

- `Badge` + the exact status→DS-token mapping in DESIGN.md. Copy; also exports
  `STATUS_OPTIONS` for filters. **No change.**

### `ConfirmDialog`

`apps/strapi/src/plugins/events-manager/admin/src/components/ConfirmDialog/index.tsx`

- `Dialog.*` confirm with variant (danger/warning/success), `var(--colors-*)` icon fill.
  Use for every destructive action. **No change.**

### `PluginLayout` + `SideNav`

`.../components/PluginLayout/index.tsx` · `.../components/SideNav/index.tsx`

- `Layouts.Root sideNav={<SideNav/>}` + `<Outlet/>`. **Change**: SideNav links become
  Venues + Properties; hide Properties when `!canManageAllVenues`.

### `App.tsx` (routing)

`apps/strapi/src/plugins/events-manager/admin/src/pages/App.tsx`

- `<Routes>` inside `PluginLayout`, index redirect. **Change**: routes →
  `venues` (default) + `properties`.

### `MediaInput`

`apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx`

- Single/multiple media upload wrapper. Reuse for logo + gallery. **No change.**

### `CitySelector`

`apps/strapi/src/plugins/events-manager/admin/src/components/CitySelector/index.tsx`

- City relation picker (geography plugin). Reuse in Localisation. **No change.**

---

## Tier 3 — data hooks (clone the shape, repoint to venues plugin)

### `useVenuesEnhanced`

`apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenuesEnhanced.ts`

- `useVenuesList`, `useVenueMutations`, `useVenue`, and the `Venue`/`VenueInput`/
  `VenueStatus`/`VenueType` types. **Change**: repoint to venues-plugin Document
  Service routes; reconcile the `Venue` interface to the real extended schema (2D.1 AC —
  no phantom fields); add `properties` (property-values) to the type.

---

## Net-new (no sibling reference — build from the spines + cheatsheet)

| New piece                      | Built from                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Map picker** (Localisation)  | EXPERIENCE.md § Interaction Primitives + cheatsheet § 6                                            |
| **Property-value editor** (S3) | cheatsheet § 5 (Accordion + type-adaptive inputs)                                                  |
| **Property authoring** (S2)    | cheatsheet § 4 — category tree, type-aware definition form, enumOptions editor, i18n locale switch |
| **Properties data hooks**      | clone the `useVenuesEnhanced` pattern for `property-category` + `property-definition`              |

---

## Build order (respects 2D sequencing)

1. **Shell** (S0): relocate `PluginLayout`/`SideNav`/`App.tsx`; replace placeholder
   `HomePage.tsx`; wire routes. → plugin opens to a Venues list scaffold.
2. **Venues list** (S1): relocate `VenuesPage` + `BulkActionsDropdown` + `StatusBadge` +
   `ConfirmDialog`; repoint hooks. → list/filter/sort/paginate/bulk works.
3. **Venue form** (S1): relocate `VenueFormModal`; **add the map picker**. → create/edit
   works with geocoded coordinates.
4. **Property authoring** (S2): build categories + definitions UIs + hooks.
5. **Attach properties** (S3): add the property-value editor into the venue form.
6. RBAC pass: scope list + hide/disable per `canManageAllVenues`; status read-only for
   Venue Managers.

Smoke test per 2D ACs: create → edit → list reflects → delete (S1); author category
tree + definitions (S2); attach values, reload, confirm round-trip (S3).
