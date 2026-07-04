# Epic 2D: Venues & Properties Admin UI [MVP-back-office]

> **Source:** New feature (2026-06-16) — see
> `_bmad-output/project-planning-artifacts/sprint-change-proposal-2026-06-16.md`.
> **Prerequisite:** Epic 2C.1 (venues plugin extraction) stable. This epic builds
> the custom admin UI for the placeholder venues plugin `HomePage`, serving both
> Admin/Editor and Venue Manager roles (RBAC seeded in 2C.1).

The `venues` plugin gains a first-class admin UI for creating and managing venues
and their configurable properties, replacing the placeholder `HomePage.tsx`. The
`venue` content type is extended to the rich model and the events-manager venue
form is relocated into the venues plugin so there is a single source of venue truth.

**Sequencing rules:**

- Starts after 2C.1 is stable (this epic edits the plugin 2C.1 created).
- 2D.1 (schema extension) gates 2D.2/2D.3/2D.4 (UI binds to the rich fields).
- The events-manager venue form is relocated **once** into the venues plugin — no
  duplicate venue form remains in events-manager.

---

## Story 2D.1: Extend Venue Schema to Rich Model

As a **developer**,
I want `plugin::venues.venue` extended with the rich venue fields and a property-value attachment field,
So that the venues plugin is the single source of venue truth and the admin UI has a complete model to bind to.

**Acceptance Criteria:**

**Given** the lean venue schema (`name`, `address`, `geo`, `capacity`, `slug`, `events`)
**When** I extend it
**Then** venue gains: `city`/`region` (relations to geography per the existing
`cityRef` pattern, or string if geography lookup is out of scope), `phone`, `email`,
`website`, `type` (enum: `cinema`/`theater`/`cultural-center`/`museum`/`other`),
`status` (enum: `pending`/`approved`/`suspended`, default `pending`), `logo` (single
media), `images` (multiple media), `manager` (relation — admin user vs
users-permissions user decided in this story)
**And** a repeatable `property-value` component field is added so properties can be
attached to a venue
**And** new fields are additive/optional (no destructive change; dev-only data, no migration)
**And** i18n + draftAndPublish behavior on venue is preserved
**And** `yarn generate:types` boots Strapi clean
**And** the events-manager `useVenuesEnhanced` venue interface reconciles to the real
extended schema (no phantom fields)

---

## Story 2D.2: Venue CRUD Admin UI (Venues Plugin)

As an **Admin/Editor** (and scoped **Venue Manager**),
I want to create, edit, and delete venues from the venues plugin admin,
So that I no longer rely on the default content-manager and the placeholder HomePage is replaced.

**Acceptance Criteria:**

**Given** the venues plugin HomePage placeholder
**When** I open the venues admin
**Then** I see a venues list (search/filter by `status`, `type`, `city`) and can
create/edit/delete a venue via a form modal
**And** the form is the events-manager `VenueFormModal` relocated/adapted into the
venues plugin (no duplicate venue form remains in events-manager)
**And** coordinates are captured via an **address field + geocode + map picker** (geocode
the `address` into `geo.latitude`/`geo.longitude`, with a map to confirm/adjust the pin) —
NOT raw decimal `latitude`/`longitude` inputs (these were removed in 2D.1 as non-user-friendly;
the venue schema's single coordinate source is the `geo` `shared.geo-point` component). The
current `VenueFormModal`'s raw lat/lng `<TextInput>`s are replaced wholesale here.
**And** venue create/edit/delete call venues-plugin admin routes using the Document
Service API (not Entity Service), with Zod validation and error codes (no prose messages)
**And** Strapi Design System v2 components are used (no native HTML, no
styled-components, no hex colors, no deprecated ModalLayout)
**And** RBAC: Venue Managers see/edit only their own venue; Admin/Editor see all
**And** dev smoke test: create → edit → list reflects changes → delete

---

## Story 2D.3: Property Authoring UI (Definitions + Categories)

As an **Admin/Editor**,
I want to author property-definitions and property-categories in the venues plugin admin,
So that the reusable property vocabulary is managed with a purpose-built UI instead of the default content-manager.

**Acceptance Criteria:**

**Given** `property-category` (hierarchical) and `property-definition` content types
**When** I open the properties section of the venues admin
**Then** I can create/edit/delete categories (with `parent`/`children` nesting) and
definitions (with `type`, `icon`, `enumOptions`, `sortOrder`, `category` assignment)
**And** i18n fields (`name`, `description`) are editable per locale (AR/FR/EN)
**And** the UI prevents invalid states (e.g. `enumOptions` required when `type=enum`)
**And** Strapi Design System v2 components are used throughout
**And** dev smoke test: author a category tree + definitions, then see them available
for attachment in 2D.4

---

## Story 2D.4: Attach Properties to a Venue

As an **Admin/Editor** (and scoped **Venue Manager**),
I want to attach property values to a venue from the venue form,
So that venues carry their configurable amenities.

**Acceptance Criteria:**

**Given** a venue and the authored property definitions/categories
**When** I edit a venue
**Then** I can add `property-value` entries (`definition` + typed value:
boolean/integer/string/enum) via the repeatable component added in 2D.1
**And** the value input adapts to the definition's `type` (e.g. `enum` → select from
`enumOptions`)
**And** properties are grouped/sorted by their category and `sortOrder` in the UI
**And** saved values persist on the venue and round-trip on reload
**And** RBAC scoping matches 2D.2

---
