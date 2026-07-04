---
title: "Sprint Change Proposal — Venues Plugin Admin UI (Venue + Property CRUD)"
date: "2026-06-16"
author: "Ayoub (via bmad-correct-course)"
trigger: "New feature request: Strapi user must be able to create venues and properties via a custom plugin UI"
change_scope: "Moderate (new mini-epic + backlog reorganization)"
status: "proposed"
mode: "Batch"
related_epics:
  ["epic-2c-plugin-architecture-decomposition", "epic-7-b2b-venue-management"]
related_plugins: ["venues", "events-manager"]
---

# Sprint Change Proposal — Venues Plugin Admin UI

## Section 1 — Issue Summary

**Trigger.** Ayoub requested a **new feature** (not a defect): a Strapi user must be
able to **create and manage venues and properties** through a **custom Strapi admin
plugin UI**, for **both** internal staff (Admin/Editor) and external Venue Managers.

**Context — how it surfaced.** Story 2C.1 (`Extract Venues Plugin`, status `review`)
created a dedicated `venues` plugin and moved three content-types into it:

- `plugin::venues.venue` — lean schema: `name`, `address`, `geo` (component),
  `capacity`, `slug`, `events` (oneToMany → `plugin::events-manager.event`).
- `plugin::venues.property-definition` — i18n field blueprint
  (`name`, `slug`, `description`, `type` enum [boolean/integer/string/enum],
  `icon`, `enumOptions`, `sortOrder`, `category` → property-category).
- `plugin::venues.property-category` — i18n hierarchical grouping
  (`name`, `slug`, `description`, `icon`, `sortOrder`, self-referential
  `parent`/`children`, `properties` → property-definition).

The plugin's **admin UI is a placeholder** — `admin/src/pages/HomePage.tsx` only
renders the text "Manage venues and their configurable properties." No create/edit
flow exists in the venues plugin.

**Evidence at time of discovery.**

- `apps/strapi/src/plugins/venues/admin/src/pages/HomePage.tsx` — placeholder only.
- `apps/strapi/src/plugins/venues/server/src/content-types/venue/schema.json` — lean
  5-field venue.
- A **richer venue model already exists** in the _events-manager_ plugin's admin UI
  (`components/VenueFormModal/index.tsx`, `hooks/useVenuesEnhanced.ts`) assuming
  fields the plugin schema does not have: `city`, `region`, `phone`, `email`,
  `website`, `type` (cinema/theater/cultural-center/museum/other), `status`
  (pending/approved/suspended), `logo`, `images`, `manager`. **This is a model
  mismatch** the new feature must resolve.
- **No existing story** covers a venues-plugin authoring UI. The 2C.1 sequencing note
  only "retargets the existing venues admin UI to `plugin::venues.*`" (hooks/paths),
  not a build-out. Epic 7.1/7.2 (venue registration / profile management) is the
  conceptually-adjacent work but is **explicitly deferred to Phase 2** and is framed
  as Venue-Manager _self-service_, not the staff authoring tool requested here.
- Property authoring (definitions + categories) currently relies entirely on Strapi's
  **default content-manager** — no custom UI.

**Decisions taken by Ayoub during this workflow (Batch mode):**

1. **Canonical venue model → extend the plugin schema to the rich model.**
   `plugin::venues.venue` gains the events-manager fields (city/region/contact/type/
   status/logo/images/manager). This makes the plugin the single source of venue truth
   and lets the new UI reuse the events-manager `VenueFormModal`/`useVenuesEnhanced`
   patterns.
2. **Scope → full CRUD for venues AND properties** (venue create/edit/delete +
   property-definition + property-category authoring + attaching property values to
   venues).
3. **Backlog home → a new standalone mini-epic** (not a 2C.6 story, not un-deferring
   Epic 7), because this is net-new product/admin surface rather than plugin-
   decomposition plumbing.

## Section 2 — Impact Analysis

| Area                  | Finding                                                                                                                                                                                                                                                                | Status          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Epic impact           | **New mini-epic added** (proposed: **Epic 2D — Venues & Properties Admin UI**). No existing epic is rescoped. Epic 7 stays Phase 2; Epic 2C stays as-is (decomposition plumbing).                                                                                      | Action-needed   |
| Story impact          | **New stories created** under the mini-epic (see §4). No existing stories renumbered or deleted.                                                                                                                                                                       | Action-needed   |
| Prerequisite          | Depends on **2C.1** (venues plugin exists). 2C.1 is `review`. Recommend it reach `done` (or at least stable) before this mini-epic starts, since the schema extension edits the plugin 2C.1 created.                                                                   | Action-needed   |
| Content-type / schema | **`plugin::venues.venue` schema extension** (rich model) — a content-type change. Both catalogs/venues are dev-only at this stage; treat as additive schema (new optional fields). i18n + draftAndPublish already on venue.                                            | Action-needed   |
| Architecture (3.2)    | Architecture amendment (2026-06-12) already mandates the venues plugin + property types. The schema **extension** and a custom admin UI are **consistent with**, not contradicting, it. A short addendum noting the rich-model decision is warranted.                  | Action-needed   |
| Model reconciliation  | `events-manager` `VenueFormModal`/`useVenuesEnhanced` target the rich model; the new UI should **reuse/relocate** these into the venues plugin rather than duplicate. Avoids two divergent venue forms.                                                                | Action-needed   |
| Property value attach | A `property-value` **component** exists (`components/entity-properties/property-value.json`: `definition` rel + boolean/integer/string/enum value). To attach properties to a venue, the venue needs a `repeatable property-value component` field (currently absent). | Action-needed   |
| PRD (3.1)             | PRD does not describe a venues-plugin admin authoring tool. This is admin/back-office tooling; PRD text change is **optional** (flag as follow-up, not blocking).                                                                                                      | N/A (follow-up) |
| UI/UX (3.3)           | No UX spec for this admin surface. It lives in Strapi admin using the Strapi Design System (not the B2C design system). UX spec change **not required**; follow Strapi DS conventions.                                                                                 | N/A             |
| Epic 7 interaction    | Epic 7.2 (Venue Profile Management, Phase 2) overlaps conceptually. Note added so Epic 7.2 builds on this mini-epic's plugin UI rather than re-deriving it.                                                                                                            | Action-needed   |
| RBAC                  | Feature serves **both** Admin/Editor and Venue Manager. Venue Manager permissions on `plugin::venues.venue` were seeded in 2C.1. UI must respect role scoping (managers see only their venue) — wire to existing role.                                                 | Action-needed   |
| Technical / build     | New schema fields → `yarn generate:types` must boot clean. New admin pages compiled by Vite admin build (not ts:generate-types). No data migration (dev-only data).                                                                                                    | Action-needed   |

## Section 3 — Recommended Approach

**Option 1 — Direct Adjustment (add a mini-epic + stories).** Effort: **Medium**.
Risk: **Low–Medium**.

Rationale: Nothing needs to be rolled back (Option 2 N/A) and the MVP is not
redefined (Option 3 N/A — this is additive admin tooling, and Epic 7 self-service
stays Phase 2). The clean path is to add a small, well-scoped epic that (a) extends
the venue schema to the rich model, (b) adds a property-value attachment field to
venue, and (c) builds the custom plugin admin UI for venue + property CRUD, reusing
the events-manager form/hook patterns. Risk is Medium-not-Low only because of the
schema extension + the events-manager/venues model reconciliation; both are
contained and dev-only.

**Sequencing guardrails:**

- Mini-epic starts **after 2C.1 is stable** (it edits the plugin 2C.1 created).
- The schema extension story gates the UI stories (UI binds to the rich fields).
- Reconcile/relocate the events-manager venue form into the venues plugin **once**,
  rather than maintaining two venue forms.

## Section 4 — Detailed Change Proposals

> Batch mode — all proposals presented together for a single review. No edits are
> applied until you approve.

### 4.1 New Epic file — `epics/epic-2d-venues-properties-admin-ui.md`

```md
# Epic 2D: Venues & Properties Admin UI [MVP-back-office]

> Source: New feature (2026-06-16) — see sprint-change-proposal-2026-06-16.md.
> Prerequisite: Epic 2C.1 (venues plugin extraction) stable. Builds the custom
> admin UI for the placeholder venues plugin HomePage. Serves both Admin/Editor
> and Venue Manager roles (RBAC seeded in 2C.1).

The venues plugin gains a first-class admin UI for creating and managing venues
and their configurable properties, replacing the placeholder HomePage. The venue
content-type is extended to the rich model and the events-manager venue form is
relocated into the venues plugin (single source of venue truth).

## Story 2D.1: Extend Venue Schema to Rich Model

As a developer, I want plugin::venues.venue extended with the rich venue fields,
so that the venues plugin is the single source of venue truth and the admin UI has
a complete model to bind to.

Acceptance Criteria:

- Given the lean venue schema (name, address, geo, capacity, slug, events)
- When I extend it
- Then venue gains: city/region (relations to geography or string per existing
  cityRef pattern), phone, email, website, type (enum: cinema/theater/
  cultural-center/museum/other), status (enum: pending/approved/suspended,
  default pending), logo (media), images (multiple media), manager (relation to
  admin user or users-permissions user per RBAC design)
- And a repeatable `property-value` component field is added so properties can be
  attached to a venue
- And new fields are additive/optional (no destructive change; dev-only data)
- And i18n + draftAndPublish behavior is preserved
- And `yarn generate:types` boots Strapi clean
- And the events-manager useVenuesEnhanced interface reconciles to the real schema

## Story 2D.2: Venue CRUD Admin UI (Venues Plugin)

As an Admin/Editor (and scoped Venue Manager), I want to create, edit, and delete
venues from the venues plugin admin, so that I no longer rely on the default
content-manager and the placeholder HomePage is replaced.

Acceptance Criteria:

- Given the venues plugin HomePage placeholder
- When I open the venues admin
- Then I see a venues list (search/filter by status, type, city) and can
  create/edit/delete a venue via a form modal
- And the form is the events-manager VenueFormModal relocated/adapted into the
  venues plugin (no duplicate venue form remains in events-manager)
- And venue create/edit/delete call venues-plugin admin routes (Document Service,
  not Entity Service), with Zod validation and error codes
- And Strapi Design System v2 components are used (no native HTML, no styled-
  components, no hex colors)
- And RBAC: Venue Managers see/edit only their own venue; Admin/Editor see all
- And dev smoke test: create → edit → list reflects changes → delete

## Story 2D.3: Property Authoring UI (Definitions + Categories)

As an Admin/Editor, I want to author property-definitions and property-categories
in the venues plugin admin, so that the reusable property vocabulary is managed
with a purpose-built UI instead of the default content-manager.

Acceptance Criteria:

- Given property-category (hierarchical) and property-definition content-types
- When I open the properties section of the venues admin
- Then I can create/edit/delete categories (with parent/child nesting) and
  definitions (with type, icon, enumOptions, sortOrder, category assignment)
- And i18n fields (name, description) are editable per locale (AR/FR/EN)
- And the UI prevents invalid states (e.g. enumOptions required when type=enum)
- And Strapi Design System v2 components are used throughout
- And dev smoke test: author a category tree + definitions, see them available
  for attachment in 2D.4

## Story 2D.4: Attach Properties to a Venue

As an Admin/Editor (and scoped Venue Manager), I want to attach property values to
a venue from the venue form, so that venues carry their configurable amenities.

Acceptance Criteria:

- Given a venue and the authored property definitions/categories
- When I edit a venue
- Then I can add property-value entries (definition + typed value: boolean/
  integer/string/enum) via the repeatable component added in 2D.1
- And the value input adapts to the definition's type (e.g. enum → select from
  enumOptions)
- And properties are grouped/sorted by their category and sortOrder in the UI
- And saved values persist on the venue and round-trip on reload
- And RBAC scoping matches 2D.2
```

### 4.2 Epic list — `epics/epic-list.md`

- Add **Epic 2D** entry after Epic 2C with its scope line and the 4 stories above.

### 4.3 Epic index — `epics/index.md`

- Add Epic 2D to the index with its story list (mirror the format used for 2C).

### 4.4 Sprint status — `implementation-artifacts/sprint-status.yaml`

- Add an `epic-2d` block after `epic-2c`:
  ```yaml
  # Epic 2D: Venues & Properties Admin UI (new feature 2026-06-16)
  # Prereq: 2c-1 stable. Source: sprint-change-proposal-2026-06-16.
  epic-2d: backlog
  2d-1-extend-venue-schema-to-rich-model: backlog
  2d-2-venue-crud-admin-ui: backlog
  2d-3-property-authoring-ui: backlog
  2d-4-attach-properties-to-venue: backlog
  epic-2d-retrospective: optional
  ```
- **No changes** to existing epic/story statuses.

### 4.5 Architecture addendum — `project-planning-artifacts/architecture.md`

- Append a short note (tagged `2026-06-16`): the venues plugin venue content-type is
  **extended to the rich model** (city/region/contact/type/status/media/manager +
  repeatable property-value component), the venues plugin owns the canonical venue
  admin UI, and the events-manager venue form is **relocated** into the venues plugin
  (single source of venue truth). Consistent with the 2026-06-12 amendment.

### 4.6 Epic 7 cross-reference — `epics/epic-7-b2b-venue-management.md`

- Add a prerequisite note to Epic 7.2: when Phase 2 begins, the Venue Manager
  self-service profile UI **builds on Epic 2D's venues-plugin admin** rather than
  re-deriving a venue form.

### 4.7 (Optional follow-up, not in this proposal)

- PRD note formalizing "venues/properties are authored via a custom Strapi admin
  plugin" — admin tooling, low priority; run a separate correct-course if desired.

## Section 5 — Implementation Handoff

**Scope classification: Moderate** (a new epic + four new stories → backlog
reorganization). Per the workflow, Moderate routes to **Product Owner / Developer**.

**Routing:**

- **PO/SM:** approve the new mini-epic (Epic 2D), then create the story files via
  `bmad-create-story` (or `create-epics-and-stories`) so each gets full
  implementation context. Sequence: 2D.1 → (2D.2, 2D.3) → 2D.4.
- **Developer:** implement after 2C.1 is stable, starting with the schema extension
  (2D.1) which gates the UI stories.

**Deliverables (on approval):**

- This proposal (`sprint-change-proposal-2026-06-16.md`).
- New epic file `epic-2d-venues-properties-admin-ui.md`.
- Edits to `epic-list.md`, `epics/index.md`, `sprint-status.yaml`,
  `architecture.md` (addendum), `epic-7-b2b-venue-management.md` (cross-ref).

**Success criteria:**

- Venues plugin HomePage placeholder replaced by a working venue list + CRUD form.
- A single canonical venue form (events-manager duplicate removed/relocated).
- Property definitions/categories authored via custom UI; values attachable to
  venues.
- `yarn generate:types` boots clean after the schema extension; unit suite green.
- RBAC respected for both Admin/Editor and Venue Manager.

**Open risks / notes:**

- Venue schema extension + events-manager model reconciliation is the main risk;
  contained and dev-only (no data migration).
- `manager` relation target (admin user vs users-permissions user) and city/region
  representation (relation vs string) are design points to settle in 2D.1.

## Approval

Pending Ayoub's review. Decisions (rich model, full CRUD, standalone mini-epic)
pre-made during this workflow. On approval, route to PO/SM + Developer as above.
