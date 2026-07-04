# Claude Design — launch kit (Venues plugin admin)

Operator guide for prototyping the Venues plugin admin in **Claude Design**
(Anthropic Labs), then handing off to Claude Code.

## 1. What to attach (Import button)

Attach these **folders** (not the whole monorepo — Chrome chokes on huge trees;
exclude `.git`, `node_modules`, `dist`):

- `apps/strapi/src/plugins/venues/` — server schemas (venue, property-definition,
  property-category) + the admin skeleton being targeted.
- `apps/strapi/src/plugins/events-manager/admin/` — the brownfield reference:
  VenueFormModal, StatusBadge, ConfirmDialog, bulk actions — the real DS
  components to reuse.
- `_bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-18/`
  — the UX run: `DESIGN.md` (visual tokens + Strapi theme reference values),
  `EXPERIENCE.md` (behavior/IA/flows), `handoff/`, `mockups/`.

## 2. Launch prompt (paste into the first conversation)

```
Build the Strapi v5 admin UI for the Venues plugin. This is an INTERNAL admin
panel inside the Strapi admin host — NOT a B2C / marketing surface.

Authoritative spec (read first; spines win over everything else):
- DESIGN.md  — visual tokens. The admin inherits the Strapi Design System v2
  theme: indigo accent #4945ff (the ONLY accent), greyscale neutrals, semantic
  success/danger/warning, 4px corners, 4px-step spacing, neutral sans, no
  gradients. The "theme reference values" appendix lists the exact Strapi hex
  palette (light + dark) — match that look.
- EXPERIENCE.md — IA, states, interactions, and 4 user flows.
- handoff/ds-component-binding.md — element → DS-v2-component cheatsheet.
- handoff/reference-map.md — which events-manager components to reuse vs build new.

Hard constraints (auto-fail if violated):
- Look like the Strapi admin: dense, flat, utilitarian. Indigo #4945ff is the only
  accent; everything else greyscale + semantic status colors. 4px corners. No
  gradients, no pill buttons, no display/serif fonts, no hero/marketing sections.
- Use Strapi Design System v2 component patterns — Modal.* for forms, Dialog.* for
  confirms, Field.Root wrapping every input, Table for lists, SubNav for the side
  nav. Reuse the events-manager components named in the reference map.
- Western numerals + DD/MM/YYYY even in Arabic. Never show backend error codes.
- Do NOT apply any B2C brand (no Gold Leaf × Aubergine). This is the admin.

Build all 4 surfaces:
- S0 — plugin shell + left SubNav (RBAC-aware: Venue Manager sees only their venue,
  no Properties nav, read-only status).
- S1 — Venues list (search, status filter, sort, pagination, bulk select, empty +
  loading states) and the Venue form modal, with address → geocode → MAP PICKER
  (not raw lat/lng entry).
- S2 — Property authoring: category tree (cycle-safe parent picker) + type-aware
  definition form (boolean/integer/string/enum), with i18n AR/FR/EN.
- S3 — Attach properties to a venue: Accordion grouped by category, type-adaptive
  value inputs (Toggle/NumberInput/TextInput/SingleSelect).

Start with the S1 Venues list, then the venue form. Show empty, loading, and
no-permission states for every surface.
```

## 3. Before you hand off to Claude Code

- Ask Claude Design to show **empty / loading / error** states (already specified in
  EXPERIENCE.md § State Patterns) so engineering gets the full picture.
- Name components clearly in the conversation — those names carry into the handoff.
- **Open questions to settle** (won't block the prototype, but flag them):
  - **Geocoding provider** for the map picker — spec is provider-agnostic; say
    "visual map picker, provider TBD" or pick Nominatim/OSM.
  - **Venue Manager identity** — users-permissions user vs admin user (RBAC is
    assumed server-side via a `canManageAllVenues` flag).

## 4. Handoff back

Export → **Hand off to Claude Code**. It bundles the design + chat + a README and
gives you a prompt with a bundle URL. Paste that here (or into Claude Code Web) and
the implementer continues — using DS **token names** (`primary600`, `neutral150`),
not the literal hex, since the host theme supplies them.

> The skill **strapi-ui-design v1.2.0** (PostToolUse hook + strapi-ui-reviewer
> agent + component-catalog.md) will enforce DS v2 conformance during that
> implementation step.
