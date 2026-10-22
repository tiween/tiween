# Strapi Design System — foundations

From the Claude Design kit's `readme.md` (Content fundamentals, Visual foundations,
Iconography). Source of truth upstream: `strapi/design-system`
(`packages/design-system/src/themes`, `packages/icons`).

## Content fundamentals

- **Voice:** clear, direct, developer-respectful. Confident and friendly, never cute or salesy in-product.
- **Person:** product UI is imperative and second-person: "Create new entry", "Save", "Add another field to this collection type".
- **Casing:** sentence case everywhere (buttons, headings, menu items). Exception: uppercase overlines/section labels ("COLLECTION TYPES", "PLUGINS") in the `sigma` role.
- **Tone:** empty state "You don't have any content yet…" + one primary action; success toast short ("Saved", "Published"); errors specific and actionable ("This attribute must be unique", "2 required fields are empty").
- **Terminology:** Collection type, Single type, Component, Dynamic zone, Entry, Draft & Publish, Internationalization (i18n), Content-Type Builder.
- **No emoji in-product.** Density over decoration.

## Visual foundations

- **Color:** neutral cool-gray (`neutral-0 → neutral-1000`) with one indigo accent `primary-600 #4945ff` (primary buttons, active nav as `primary-100` pill, focus rings, links, selection). Status: green success, red danger, orange warning; blue (secondary) and purple (alternative) are rare. No gradients.
- **Backgrounds:** app `neutral-100` (`#f6f6f9`); cards, tables, nav, panels white `neutral-0`. No imagery in chrome.
- **Typography:** native system stack. Ramp 11/12/14/16/18/20/28/32px mapped to roles alpha→sigma. Weights 400/500/600. Body 14px; titles 32px bold.
- **Spacing:** 4px grid (0,4,8,12,16,20,24,32,40,48,56,64). Page gutters 56px; card padding 20–24px; control gaps 8px.
- **Radius:** 4px on virtually everything; pill only for avatars, status dots, toggle tracks.
- **Borders:** 1px `neutral-150`/`neutral-200` on cards, tables, inputs, dividers. Borders do more work than shadows.
- **Shadows:** cool-tinted `rgba(33,33,52,…)`. `filter`/`table` `0 1px 4px /.1`; `popup` `0 2px 15px /.1` for menus, popovers, modals.
- **Hover:** neutral controls one step darker; primary button lightens (600→500); cards/assets gain indigo border + popup shadow; nav items get a `neutral-100` wash.
- **Press:** filled buttons one step darker (600→700); light buttons keep white fill, take accent border + text. No squish.
- **Focus:** 2px `primary-600` outline at 2px offset (or inset 2px ring on fields). Mouse focus shows nothing extra.
- **Active nav:** `primary-100` pill, `primary-700` text, `primary-600` icon; sub-nav active adds a 3px left accent bar.
- **Overlays:** flat ~20% black scrim, no blur.
- **Motion:** 120/200/320ms, easeOutQuad `cubic-bezier(.25,.46,.45,.94)`; fades on hover, slide-down + fade for menus, pop-in (scale 0.8→1) for modals. No bounces; respect `prefers-reduced-motion`.
- **Cards:** white, 1px `neutral-150` border, 4px radius, no shadow or the soft `filter` shadow; clickable cards add indigo border on hover.

## Iconography

- Strapi's own set, `@strapi/icons`: solid-fill, `0 0 32 32` viewBox, no hard-coded fill (inherit `currentColor`).
- Sizes: 16px in dense UI (buttons, table actions, fields), 20px in alerts, 24–28px in empty/media states.
- Tint by context: `neutral-500/600` at rest, `primary-600` active, white on filled buttons, status colors in alerts.
- No emoji, no Unicode-character icons, no other icon family.

## Kit caveats (relevant to mockups)

- Light theme only (Strapi ships a dark theme; the kit does not yet).
- The kit implements 37 of 46 upstream components; missing: Combobox, DatePicker, DateTimePicker, TimePicker, JSONInput, CarouselInput, LiveRegions, RawTable, BaseLink. Mock those with care; production gets them from `@strapi/design-system`.
- Kit overlays (Modal, Dialog, Popover, SimpleMenu, Accordion) have no portal or focus trap; production uses the Radix-based v2 components.
