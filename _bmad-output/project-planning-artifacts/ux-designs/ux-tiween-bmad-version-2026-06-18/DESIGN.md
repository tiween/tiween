---
name: Venues Plugin Admin
status: final
updated: 2026-06-19
ui_system: Strapi Design System v2 (@strapi/design-system), Strapi v5 admin host
inherits: Strapi DS v2 theme (host-owned tokens — NOT re-authored here)
sources:
  - epics/epic-2d-venues-properties-admin-ui.md
  - events-manager plugin admin (brownfield DS reference)
colors:
  # We do NOT define a palette. We map domain semantics onto DS v2 tokens.
  status_pending: { background: warning100, text: warning700, icon: warning500 }
  status_approved:
    { background: success100, text: success700, icon: success500 }
  status_suspended: { background: danger100, text: danger700, icon: danger500 }
  status_undefined:
    { background: neutral150, text: neutral600, icon: neutral500 }
typography:
  # Inherited from DS v2 Typography variants. No custom type scale.
  page_title: { variant: alpha }
  section_title: { variant: delta, fontWeight: bold }
  body: { variant: omega }
  table_header: { variant: sigma, textColor: neutral600 }
rounded: inherited # DS v2 borderRadius tokens; never hardcode px
spacing: inherited # DS v2 spacing scale via padding/gap numeric props (1 = 4px)
components:
  shell: Layouts.Root + SideNav
  table: Table / Thead / Tbody / Tr / Th / Td
  form_modal: Modal.Root/Content/Header/Body/Footer
  confirm: Dialog.Root/Content/Header/Body/Footer
  field: Field.Root + Field.Label + Field.Error + Field.Hint
  grouping: Accordion.Root/Item/Header/Trigger/Content
  status: Badge (mapped via colors.status_* above)
---

# Venues Plugin Admin — Visual Identity

> **This spine inherits the Strapi Design System v2 and authors no custom visual
> identity.** Per Ayoub's direction ("stick as much as possible to Strapi DS"), the
> admin surface looks like Strapi. The sections below document only the **deltas**
> the venues plugin needs — domain-semantic token mappings, the icon vocabulary, and
> the do/don't guardrails that keep an implementing LLM inside DS conformance.
>
> Behavior, IA, and flows live in [EXPERIENCE.md](./EXPERIENCE.md). Both spines win
> over any mock on conflict. The HTML mocks in [`mockups/`](./mockups/) are
> **layout-only** — they approximate structure and reading order, not real DS pixels.
> Build against the DS, not the mock CSS.

---

## Brand & Style

There is no Tiween brand layer here. This is back-office tooling for Admins, Editors,
and Venue Managers, rendered inside the Strapi admin panel. The design goal is
**invisibility**: a venue manager should not be able to tell the venues plugin screens
from a native Strapi content-manager screen. Cohesion with the host > distinctiveness.

The B2C Tiween identity (Gold Leaf × Aubergine, in the sibling
`ux-tiween-bmad-version-2026-06-16` run) is **explicitly out of scope** and must not
bleed into the admin.

Voice in UI chrome is plain, operational French (the existing plugin chrome is
French; AR/FR/EN are wired through `registerTrads`). Microcopy rules live in
EXPERIENCE.md § Voice and Tone.

---

## Colors

**Do not define or hardcode colors.** Every color is a DS v2 token name (e.g.
`neutral100`, `primary600`, `danger500`) passed via component props
(`backgroundColor`, `textColor`, `fill`) or the `var(--colors-<token>)` CSS custom
property when a raw SVG `fill` needs it (see `ConfirmDialog`'s warning icon).

The only domain-specific color decision is the **venue status badge mapping**, lifted
verbatim from the existing `events-manager/StatusBadge` so the two plugins stay
consistent:

| Venue status  | Badge background | Badge text   | Meaning                      |
| ------------- | ---------------- | ------------ | ---------------------------- |
| `pending`     | `warning100`     | `warning700` | Submitted, awaiting approval |
| `approved`    | `success100`     | `success700` | Live / visible               |
| `suspended`   | `danger100`      | `danger700`  | Disabled by an admin         |
| _(undefined)_ | `neutral150`     | `neutral600` | Not set                      |

Property-definition **type** chips, when shown, also use neutral DS tokens
(`secondary100`/`secondary600` or `neutral150`/`neutral600`) — never a custom hue.

---

## Typography

Inherited from DS v2 `Typography` `variant`s. No custom type scale, no font import
(the host loads its own font). Use:

| Role                | Component / prop                                         |
| ------------------- | -------------------------------------------------------- |
| Page title          | `Typography variant="alpha"` (or `Layouts.Header title`) |
| Section heading     | `Typography variant="delta" fontWeight="bold"`           |
| Body / cell text    | `Typography variant="omega"`                             |
| Table column header | `Typography variant="sigma" textColor="neutral600"`      |
| Subdued / hint      | `Field.Hint` (do not hand-roll grey text)                |

Numerals follow project rule: **Western numerals in all locales including Arabic**;
dates render `DD/MM/YYYY`.

---

## Layout & Spacing

- **Shell**: every page renders inside `Layouts.Root sideNav={<SideNav />}` with a
  `Layouts.Header` (title + primary action) and `Layouts.Content` body. This matches
  the events-manager `PluginLayout`.
- **Grid**: `Grid.Root gap={4}` with `Grid.Item col={6} s={12}` for two-up form rows,
  `col={12}` for full-width fields — exactly as the current `VenueFormModal`.
- **Spacing**: numeric DS props only (`padding={4}`, `gap={6}`, `marginBottom={3}`).
  The scale is 4px-based (`4` = 16px). **Never** hardcode `px`, `rem`, or margins via
  `style`.
- **Form section rhythm**: `Flex direction="column" gap={6}`, each section a `Box`
  with a `delta`-bold title then a `Grid.Root gap={4}`.

---

## Elevation & Depth

Inherited. `Modal`, `Dialog`, `Popover`, and `Card` carry DS elevation. Do not add
custom `box-shadow`. Surfaces use DS background tokens: page = `neutral100`, raised
panels/cards = `neutral0`, table rows alternate via DS defaults.

---

## Shapes

Inherited DS `borderRadius` tokens. Badges, buttons, inputs, cards keep their DS
radius. No custom corner values.

---

## Components

All UI is composed from `@strapi/design-system` and `@strapi/strapi/admin`
(`Layouts`). The exhaustive element→component binding is the **DS Component-Binding
Cheatsheet** in [`handoff/ds-component-binding.md`](./handoff/ds-component-binding.md);
EXPERIENCE.md § Component Patterns covers behavior. Canonical choices:

| Need                         | DS v2 component                                                     |
| ---------------------------- | ------------------------------------------------------------------- |
| Plugin shell + side nav      | `Layouts.Root`, `Layouts.Header`, `Layouts.Content`, `SideNav`      |
| Data table                   | `Table` + `Thead/Tbody/Tr/Th/Td`, `VisuallyHidden`                  |
| Search                       | `Searchbar` inside `SearchForm`                                     |
| Dropdown filter              | `SingleSelect` + `SingleSelectOption`                               |
| Pagination                   | `Pagination` (+ `PageLink`/`Dots` as needed)                        |
| Empty state                  | `EmptyStateLayout`                                                  |
| Loading                      | `Loader`                                                            |
| Create/edit form             | `Modal.*` wrapping a `<form>`                                       |
| Field wrapper                | `Field.Root` → `Field.Label` / input / `Field.Error` / `Field.Hint` |
| Text / number / long text    | `TextInput`, `NumberInput`, `Textarea`                              |
| Boolean input                | `Toggle` (preferred) or `Checkbox` (tri-state for trees)            |
| Choice input                 | `SingleSelect`; tags → `MultiSelect`                                |
| Destructive confirm          | `Dialog.*` (reuse `ConfirmDialog`)                                  |
| Status pill                  | `Badge` (status mapping above)                                      |
| Grouped collapsible sections | `Accordion.Root/Item/Header/Trigger/Content`                        |
| Icon button                  | `IconButton` (with required `label`)                                |
| Media upload                 | existing `MediaInput` (wraps the upload library)                    |
| Notification                 | `useNotification()` from `@strapi/strapi/admin`                     |

---

## Do's and Don'ts

**Do**

- Compose every screen from DS v2 compound components.
- Wrap **every** input in `Field.Root` so label/error/hint are associated and a11y-correct.
- Give every `IconButton` and icon-only control a `label` / `aria-label`.
- Use DS color **token names** via props; use `var(--colors-<token>)` only where a raw
  SVG `fill` is unavoidable.
- Reuse the events-manager components named in the reference map — relocate, don't rebuild.
- Show explicit loading, empty, and permission states for every async surface.

**Don't**

- ❌ Author a custom palette, font, or type scale — inherit DS v2.
- ❌ Use native HTML controls (`<button>`, `<input>`, `<select>`, `<table>`) where a DS
  component exists.
- ❌ Hardcode hex colors, `px`/`rem` spacing, or inline `style` for layout.
- ❌ Use `styled-components` for new styling.
- ❌ Use `ModalLayout` — it was **removed** in DS v2 (not just deprecated); use `Modal.*`.
- ❌ Apply the B2C Gold Leaf × Aubergine brand to the admin.
- ❌ Use Arabic-Indic numerals; use Western numerals and `DD/MM/YYYY`.

---

## Handoff Package

For an implementing LLM, build in this order using these artifacts:

| Artifact                                                             | Purpose                                                                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [EXPERIENCE.md](./EXPERIENCE.md)                                     | IA, behavior, states, and flows — the peer spine. Wins over mocks.                                                          |
| [handoff/ds-component-binding.md](./handoff/ds-component-binding.md) | Element → DS-v2-component cheatsheet, "never use" list, API binding rules.                                                  |
| [handoff/reference-map.md](./handoff/reference-map.md)               | Which events-manager components to relocate/copy vs. build net-new, plus build order.                                       |
| [mockups/](./mockups/)                                               | Per-screen layout-only HTML (s0 shell, s1 list, s1 form, s2 authoring). Structure & reading order only — **not** DS pixels. |

---

## Appendix — Strapi DS v2 theme reference values

> **What this is.** The literal token values of the Strapi admin theme, transcribed
> from `@strapi/design-system` **v2.2.1** source (`src/themes`). The implementation
> **inherits these via DS token names** — do NOT hardcode the hex. They are recorded
> here so a generator (e.g. Claude Design) or a reviewer can reason about the real
> Strapi look, and so the values survive without re-cloning the DS repo.

**Brand accent:** indigo `primary600 = #4945ff` (light) / `#7b79ff` (dark). The
**only** accent — everything else is greyscale + semantic. No gradients, 4px corners.

### Light mode

| Group     | Tokens (hex)                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| primary   | 100 `#f0f0ff` · 200 `#d9d8ff` · 500 `#7b79ff` · **600 `#4945ff`** · 700 `#271fe0`                                           |
| neutral   | 0 `#ffffff` · 100 `#f6f6f9` · 150 `#eaeaef` · 200 `#dcdce4` · 500 `#8e8ea9` · 600 `#666687` · 800 `#32324d` · 900 `#212134` |
| success   | 100 `#eafbe7` · 200 `#c6f0c2` · 600 `#328048` · 700 `#2f6846`                                                               |
| danger    | 100 `#fcecea` · 200 `#f5c0b8` · 600 `#d02b20` · 700 `#b72b1a`                                                               |
| warning   | 100 `#fdf4dc` · 200 `#fae7b9` · 600 `#d9822f` · 700 `#be5d01`                                                               |
| secondary | 100 `#eaf5ff` · 200 `#b8e1ff` · 600 `#0c75af` · 700 `#006096`                                                               |

### Dark mode

| Group        | Tokens (hex)                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| primary      | 100 `#181826` · 200 `#4a4a6a` · 500 `#4945ff` · **600 `#7b79ff`**                                                       |
| neutral      | 0 `#212134` · 100 `#181826` · 150 `#32324d` · 200 `#4a4a6a` · 600 `#a5a5ba` · 800 `#ffffff`                             |
| status (500) | success `#5cb176` · danger `#ee5e52` · warning `#f29d41` · secondary `#66b7f1` (bg 100 `#181826`, border 200 `#4a4a6a`) |

### Shape, spacing, type

- **Border radius:** `4px` everywhere. **Borders:** 1px `neutral150`/`neutral200`.
- **Spacing scale (px):** `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64`.
- **Type scale:** alpha `32px`/600 · beta `28px`/600 · delta `20px`/600 · epsilon `18px`/500 · body `14px`/400 · label `12px`/600 · header `11px`/600. Weights: 400 / 500 / 600 (none above 600). Neutral sans (system/Inter), no serif/display.

**Status → domain mapping:** `pending → warning`, `approved → success`, `suspended → danger` (render with the `Status` component).
