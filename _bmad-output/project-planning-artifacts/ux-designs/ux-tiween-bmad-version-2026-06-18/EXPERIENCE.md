---
name: Venues Plugin Admin
status: final
updated: 2026-06-19
design_ref: ./DESIGN.md
ui_system: Strapi Design System v2 (@strapi/design-system) + @strapi/strapi/admin (Layouts)
sources:
  - epics/epic-2d-venues-properties-admin-ui.md
  - apps/strapi/src/plugins/venues (server schemas + admin skeleton)
  - apps/strapi/src/plugins/events-manager/admin (brownfield behavioral reference)
---

# Venues Plugin Admin — Experience

How the venues plugin admin **works**: information architecture, behavior, states,
interactions, accessibility, and the journeys that land each surface. Visual identity
lives in [DESIGN.md](./DESIGN.md); this file references its tokens by name as
`{colors.status_approved}` etc. Both spines win over any mock on conflict.

Scope = the four Epic 2D surfaces:
**S1** Venues list + form modal (2D.2) · **S2** Property authoring (2D.3) ·
**S3** Attach properties to a venue (2D.4) · **S0** Plugin shell / landing.

---

## Foundation

- **Form factor**: desktop web, inside the **Strapi v5 admin panel**. No mobile target
  (admin users work on laptops/desktops). Responsive only insofar as DS `Grid`
  collapses two-up rows to single column on `s` breakpoint.
- **UI system**: **Strapi Design System v2**. Both spines inherit it; this file
  specifies only the **behavioral delta** on top of DS defaults. When a need maps to a
  DS component, use it (see DESIGN.md § Components + the binding cheatsheet).
- **Data model** the UI binds to (server, already defined):
  - `plugin::venues.venue` — rich model (name, slug, description, address, `cityRef`,
    `geo` `{latitude, longitude}`, phone, email, website, `type` enum, `status` enum,
    capacity, logo, images, `manager`, repeatable `properties` of
    `entity-properties.property-value`, `events`).
  - `plugin::venues.property-category` — hierarchical (`parent`/`children`), i18n
    `name`/`description`, `icon`, `sortOrder`, has-many `properties`.
  - `plugin::venues.property-definition` — i18n `name`/`description`, `type` enum
    (`boolean`/`integer`/`string`/`enum`), `icon`, `enumOptions` (json), `sortOrder`,
    belongs-to `category`.
- **API contract**: venues-plugin admin routes via **Document Service API** (Strapi
  v5), `documentId` not `id`, Zod-validated inputs, **error codes not prose**
  (translated in UI). No Entity Service. No response transformation.
- **Roles**: `Admin`/`Editor` (full) and `Venue Manager` (own venue only). The UI
  reads a capability flag (assume `canManageAllVenues: boolean`); RBAC is enforced
  server-side regardless.

---

## Information Architecture

```
Venues plugin (menu: "Venues", icon Store, /plugins/venues)
└── Layouts.Root  (SideNav + content)
    ├── SideNav
    │   ├── Venues            → /plugins/venues/venues      (S1, default)
    │   └── Properties        → /plugins/venues/properties  (S2)  [Admin/Editor only]
    │       ├── Categories tab
    │       └── Definitions tab
    │
    ├── /venues                 S1  Venues list
    │   └── (Modal) Venue form  S1  create / edit  ── contains ──▶ S3 properties section
    │   └── (Dialog) confirm    delete / bulk delete / bulk status
    │
    └── /properties             S2  Property authoring
        ├── Categories          tree (parent/children) + create/edit/delete
        └── Definitions         list grouped by category + create/edit/delete
            └── (Modal) definition form  (type-aware: enumOptions when type=enum)
```

**Routing**: mirror events-manager `App.tsx` — `<Routes>` inside a `PluginLayout`
(`Layouts.Root sideNav={<SideNav/>}` + `<Outlet/>`), `index` redirects to `venues`.

**Surface closure**: every 2D stated need has a surface, and every surface has a flow
that lands there (§ Key Flows). The plugin landing is not a separate dashboard screen —
opening the plugin lands on **S1 Venues** (the default route); S0 is the shell + nav
that frames all surfaces.

**Nav visibility**: the **Properties** SideNav item is hidden when
`canManageAllVenues === false` (Venue Managers author no vocabulary). See § State Patterns.

---

## Voice and Tone

Operational, terse, French-first (chrome runs through `registerTrads`; AR/FR/EN
provided). Brand voice is **not** present — this is tooling.

- **Labels**: noun or short verb. "Nouveau lieu", "Enregistrer", "Supprimer". Reuse the
  existing `VenueFormModal` French strings.
- **Confirmations**: state the consequence and scope. "Supprimer ce lieu ? Cette action
  est irréversible." For bulk: name the count — "Supprimer 3 lieux ?".
- **Errors**: backend returns codes (e.g. `VENUE_NAME_REQUIRED`, `ENUM_OPTIONS_REQUIRED`);
  the UI maps each to a translated `Field.Error` string. **Never render a raw code or a
  backend prose message.** Unknown code → generic "Une erreur est survenue."
- **Empty states**: actionable, one sentence + the primary CTA. "Aucun lieu pour le
  moment." + "Créer un lieu".
- **Success**: DS `useNotification` toast, type `success`, brief — "Lieu créé."
- **Numerals/dates**: Western numerals, `DD/MM/YYYY`, even in Arabic.

---

## Component Patterns (behavioral)

Visual specs are in DESIGN.md § Components; this is behavior.

### Venues table (S1)

- Columns: select · Name · City · Type · Status (`Badge`) · Capacity · actions
  (edit/delete `IconButton`s). Mirrors the existing events-manager Venues page.
- **Search**: `Searchbar` in `SearchForm`, debounced 300ms (`use-debounce`), matches name/address.
- **Filters**: `SingleSelect` for `status` and `type` and `city`; empty option = "all".
- **Sort**: clickable `Th` toggles asc/desc (`CaretUp`/`CaretDown`); fields name/city/type/status/capacity.
- **Pagination**: `Pagination`, page size 20.
- **Bulk**: header `Checkbox` (tri-state) selects page; row `Checkbox`es; a
  `BulkActionsDropdown` exposes bulk delete + bulk status change → routed through a
  `Dialog` confirm.
- **Row click** opens edit modal; explicit edit `IconButton` does the same (a11y).

### Venue form (S1) — `Modal` wrapping a `<form>`

- Sections (`Box` + `delta` title + `Grid.Root`): **Informations générales**
  (name, slug auto-gen, type, status) · **Localisation** (address + **map picker**,
  city) · **Contact** (phone, email, website) · **Détails** (description, capacity) ·
  **Médias** (logo single, images multiple via `MediaInput`) · **Propriétés** (S3).
- **Slug**: auto-generated from name (diacritic-stripped), editable; once user edits,
  stop auto-overwriting. (Pattern already in `VenueFormModal`.)
- **Validation**: client Zod-shaped; name + type required; email format checked.
  Errors surface via `Field.Root error` + `Field.Error`. Submit disabled while `loading`.
- **Create vs edit**: same modal; title and submit label switch ("Nouveau lieu" /
  "Modifier {name}", "Créer" / "Enregistrer").

### Property category tree (S2)

- `parent`/`children` hierarchy shown as an indented list/tree. Each node: name, child
  count, edit/delete actions, drag-or-`sortOrder` ordering.
- Create/edit in a `Modal`: name (i18n), description (i18n), icon, parent (`SingleSelect`
  of existing categories, excluding self/descendants to prevent cycles), sortOrder.
- Delete guarded: if a category has children or attached definitions, the `Dialog`
  warns and blocks (or requires reassignment) — never silently orphan.

### Property definition form (S2) — type-aware `Modal`

- Fields: name (i18n), slug, description (i18n), `type` (`SingleSelect`), icon,
  category (`SingleSelect`), sortOrder.
- **Conditional**: when `type === "enum"`, reveal an **enumOptions editor** (add/remove
  string options; at least one required). When type changes away from enum, retain but
  hide; warn before discarding on save.
- Invalid-state prevention: cannot save `type=enum` with empty `enumOptions`
  (`Field.Error`, code `ENUM_OPTIONS_REQUIRED`).

### Property-value editor (S3) — inside the venue form

- Renders the venue's repeatable `properties`. **Grouped by category** in an
  `Accordion` (one `Accordion.Item` per category, ordered by category `sortOrder`);
  within a group, definitions ordered by definition `sortOrder`.
- "Ajouter une propriété": picker (`SingleSelect`/combobox) of definitions not yet
  attached; on pick, append a `property-value` row bound to that definition.
- **Type-adaptive value input** (the core S3 behavior):
  | definition.type | input component |
  | --------------- | ------------------------------------------------ |
  | `boolean` | `Toggle` (label = definition name) |
  | `integer` | `NumberInput` |
  | `string` | `TextInput` |
  | `enum` | `SingleSelect` from `definition.enumOptions` |
- Each row: definition name + icon, the typed input, a remove `IconButton`.
- Values round-trip: saved on the venue, rehydrated on reload (2D.4 AC).

### i18n locale editing (S2)

- Localized fields (`name`, `description`) edited per locale. Provide a locale switch
  (`SingleSelect` AR/FR/EN) scoped to the form; non-localized fields (slug, type, icon,
  sortOrder, enumOptions) edit once and are shared across locales.

---

## State Patterns

Every async surface defines all of: **loading · empty · error · permission · success**.

| Surface               | Loading                                           | Empty                                        | Error                                                            | Permission                                                                            |
| --------------------- | ------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Venues list           | `Loader` in content body                          | `EmptyStateLayout` "Aucun lieu" + Créer CTA  | inline error region + retry; toast on action failure             | Venue Manager: list pre-filtered to own venue; "Créer" hidden/disabled                |
| Venue form            | submit button `loading`; fields disabled mid-save | n/a                                          | `Field.Error` per field (mapped codes) + toast on submit failure | Venue Manager editing own venue: status field read-only (only admins approve/suspend) |
| Categories            | `Loader`                                          | `EmptyStateLayout` + "Créer une catégorie"   | toast + inline                                                   | Venue Manager: **whole section hidden**                                               |
| Definitions           | `Loader`                                          | `EmptyStateLayout` grouped-by-category empty | toast + inline; block invalid enum save                          | Venue Manager: hidden                                                                 |
| Property-value editor | inherits form loading                             | "Aucune propriété" + add picker              | per-row `Field.Error`                                            | Venue Manager: editable for own venue                                                 |

**Optimism**: do **not** optimistically update on delete/bulk — confirm via `Dialog`,
mutate, then `refetch`. Mutations use Document Service; on success show a `success`
toast and refresh the list.

**Selection state** resets on page change and after a successful bulk action.

---

## Interaction Primitives

### Address → geocode → map picker (S1, the novel interaction — 2D.4/2D.2 AC)

Replaces the removed raw lat/lng inputs. The single coordinate source is the venue's
`geo` (`shared.geo-point`) component.

1. User types/edits **Adresse** (`TextInput`).
2. A **"Localiser"** action geocodes the address → candidate `{latitude, longitude}`.
3. A **map** renders inside the Localisation section with a **draggable pin** at the
   candidate; user drags to correct. Map pan/zoom supported.
4. Pin position writes back to `geo.latitude`/`geo.longitude` (read-only display of the
   resolved coordinates is fine; raw decimal **entry** is not offered).
5. No address / geocode fails → map centers on a sensible default (city centroid from
   `cityRef` if set, else country default) with a hint; pin still draggable.
6. Provider is implementation-chosen (OQ-1) — the spec is provider-agnostic. The map
   component must be DS-framed (sits in a `Box`/`Field.Root`); the map canvas itself is
   the one sanctioned non-DS visual element, kept inside DS chrome.

**A11y**: provide a text affordance to set/confirm coordinates without a mouse (e.g.
"Use this address" button after geocode), since pin-dragging is pointer-only.

### Type-adaptive value input (S3)

Switching the rendered input by `definition.type` (table above). When a definition's
type would change after values exist, the authoring UI warns (values may become
invalid). Within the venue form, the input is always derived from the **current**
definition type at render.

### Auto-slug (S1/S2)

Slug derives from name (lowercase, NFD diacritic strip, non-alphanumeric → `-`), stops
auto-deriving once the user edits the slug. (Existing `generateSlug`.)

### Cycle-safe parent picker (S2)

The category parent `SingleSelect` excludes the node itself and its descendants to
prevent hierarchy cycles.

### Bulk select (S1)

Tri-state header `Checkbox`: unchecked → none, checked → all on page, indeterminate →
some. Bulk actions act on the current selection only.

---

## Accessibility Floor (behavioral)

Visual contrast is the host theme's responsibility (DESIGN.md inherits DS v2). Behavior:

- Every input wrapped in `Field.Root` so `Field.Label`/`Field.Error`/`Field.Hint` are
  programmatically associated.
- Every icon-only control (`IconButton`, sort carets, remove-property) has a `label` /
  `aria-label`; decorative-only labels use `VisuallyHidden`.
- `Modal` / `Dialog` trap focus, restore focus to trigger on close, close on Esc (DS
  defaults — don't break them).
- Table sort state announced (aria-sort on active `Th`).
- Keyboard: full create→edit→delete reachable without a mouse. The map picker provides a
  non-pointer path to set coordinates (see Interaction Primitives).
- Notifications via `useNotification` (DS handles live-region announcement); never
  `alert()`.
- RTL: Arabic locale flips direction via the host; don't hardcode `left`/`right`.

---

## Key Flows

Named protagonists; each flow has a climax beat (★).

### Flow 1 — Leïla (Editor) onboards a new cinema (S0→S1→S3)

1. Leïla opens **Venues** from the admin menu; lands on the venues list (S1).
2. List shows existing venues; she clicks **"Nouveau lieu"** → the form `Modal` opens.
3. She fills **Informations générales** — types "CinéMadart", the slug auto-fills
   `cinemadart`.
4. In **Localisation** she types the Carthage address and clicks **Localiser**.
   ★ **The map drops a pin slightly off the building; she drags it onto the entrance and
   the coordinates lock to the venue's `geo`** — no decimals typed.
5. She adds phone/email, a logo and three gallery images via `MediaInput`.
6. In **Propriétés** she opens the Accordion, adds "Accès PMR" (boolean→`Toggle` on),
   "Salles" (integer→`NumberInput` 4), "Climatisation" (boolean on).
7. **Créer** → success toast "Lieu créé"; modal closes; the new row appears with a
   `{colors.status_pending}` badge. Done.

### Flow 2 — Sami (Admin) builds the property vocabulary (S2)

1. Sami opens **Properties** in the SideNav (visible because he's an Admin).
2. **Categories** tab: he creates "Accessibilité" (sortOrder 1) and "Équipements"
   (sortOrder 2); under Équipements he nests "Audio/Vidéo" (parent = Équipements) — the
   parent picker won't let him pick a child of itself.
3. **Definitions** tab: he adds "Type d'écran" with `type = enum`.
   ★ **Choosing enum reveals the options editor; he adds "Standard", "IMAX", "4DX" — and
   the form refuses to save until at least one option exists** (`ENUM_OPTIONS_REQUIRED`).
4. He switches the form locale to AR and translates the name; FR/EN stay independent.
5. Saves. The definitions now appear, grouped under their categories, and are available
   to attach in any venue form (Flow 1 step 6).

### Flow 3 — Mounir (Venue Manager) updates his own venue (RBAC, S1→S3)

1. Mounir opens **Venues**; the list shows **only his venue** (server-scoped). There is
   no "Nouveau lieu" button and no **Properties** nav item.
2. He clicks his venue → edit `Modal`. The **Statut** field is read-only (only admins
   approve/suspend).
3. He updates capacity and toggles "Parking" on in **Propriétés**.
   ★ **He saves; values round-trip — on reload the Toggle is still on, capacity updated** —
   confirming persistence and that his scoped edit succeeded without touching others' venues.

### Flow 4 — Leïla cleans up duplicates (bulk, S1)

1. Leïla filters the list to `status = pending`, sees two test duplicates.
2. She selects both with the row `Checkbox`es (header checkbox goes indeterminate).
3. **Bulk actions → Supprimer**. ★ **A `Dialog` names the scope — "Supprimer 2 lieux ?
   Action irréversible." She confirms; both delete, the list refetches, selection clears,
   a success toast fires.**

---

## Inspiration & Anti-patterns

- **Inspiration**: the native Strapi **content-manager** list + edit experience, and the
  sibling **events-manager** plugin (Venues page, form modal, bulk actions) — the venues
  admin should feel indistinguishable from these.
- **Anti-patterns** (auto-fail in review): native HTML controls where DS exists; hex
  colors / `px` spacing / inline `style` layout; `styled-components`; deprecated
  `ModalLayout`; `alert()`/`confirm()`; raw decimal lat/lng entry; rendering backend
  error codes or prose to users; B2C brand bleed; Arabic-Indic numerals.

---

## Handoff Package

This spine is the behavior contract. Pair it with:

| Artifact                                                             | Purpose                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [DESIGN.md](./DESIGN.md)                                             | Visual spine — DS token mappings, icon vocabulary, do/don't guardrails.   |
| [handoff/ds-component-binding.md](./handoff/ds-component-binding.md) | Element → DS-v2-component cheatsheet and API binding rules.               |
| [handoff/reference-map.md](./handoff/reference-map.md)               | Brownfield reuse map (relocate/copy/build-new) + build order.             |
| [mockups/](./mockups/)                                               | Layout-only HTML per screen — reading order reference, **not** DS pixels. |

Per-screen mock ↔ flow mapping: [`s0-shell-and-rbac.html`](./mockups/s0-shell-and-rbac.html) (S0 + RBAC, Flow 3) · [`s1-venues-list.html`](./mockups/s1-venues-list.html) (S1 list, Flows 1 & 4) · [`s1-venue-form.html`](./mockups/s1-venue-form.html) (S1 form + map picker, Flows 1 & 3) · [`s2-property-authoring.html`](./mockups/s2-property-authoring.html) (S2 tree + definitions, Flow 2).
