---
name: Tiween Admin (Strapi Design System v2)
description: The stock Strapi v5 light admin, extended by Tiween's local plugins for trilingual catalog and venue data entry.
colors:
  neutral0: "#ffffff"
  neutral100: "#f6f6f9"
  neutral150: "#eaeaef"
  neutral200: "#dcdce4"
  neutral300: "#c0c0cf"
  neutral400: "#a5a5ba"
  neutral500: "#8e8ea9"
  neutral600: "#666687"
  neutral700: "#4a4a6a"
  neutral800: "#32324d"
  neutral900: "#212134"
  neutral1000: "#181826"
  primary100: "#f0f0ff"
  primary200: "#d9d8ff"
  primary500: "#7b79ff"
  primary600: "#4945ff"
  primary700: "#271fe0"
  success100: "#eafbe7"
  success200: "#c6f0c2"
  success600: "#328048"
  success700: "#2f6846"
  warning100: "#fdf4dc"
  warning200: "#fae7b9"
  warning600: "#d9822f"
  warning700: "#be5d01"
  danger100: "#fcecea"
  danger200: "#f5c0b8"
  danger600: "#d02b20"
  danger700: "#b72b1a"
typography:
  alpha:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.25
  beta:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.22
  delta:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.25
  epsilon:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  omega:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  pi:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  sigma:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0em"
rounded:
  base: "4px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "32px"
  "8": "40px"
  "9": "48px"
  "10": "56px"
  "11": "64px"
components:
  button-default:
    backgroundColor: "{colors.primary600}"
    textColor: "{colors.neutral0}"
    typography: "{typography.pi}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "32px"
  button-default-hover:
    backgroundColor: "{colors.primary500}"
  button-default-active:
    backgroundColor: "{colors.primary600}"
  button-secondary:
    backgroundColor: "{colors.primary100}"
    textColor: "{colors.primary700}"
    typography: "{typography.pi}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.neutral0}"
  button-tertiary:
    backgroundColor: "{colors.neutral0}"
    textColor: "{colors.neutral800}"
    typography: "{typography.pi}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "32px"
  button-tertiary-hover:
    backgroundColor: "{colors.neutral100}"
  button-danger:
    backgroundColor: "{colors.danger600}"
    textColor: "{colors.neutral0}"
    typography: "{typography.pi}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "32px"
  button-disabled:
    backgroundColor: "{colors.neutral150}"
    textColor: "{colors.neutral600}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "32px"
  text-input:
    backgroundColor: "{colors.neutral0}"
    textColor: "{colors.neutral800}"
    typography: "{typography.omega}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "40px"
  form-section:
    backgroundColor: "{colors.neutral0}"
    textColor: "{colors.neutral800}"
    rounded: "{rounded.base}"
    padding: "24px"
  badge-published:
    backgroundColor: "{colors.success200}"
    textColor: "{colors.success700}"
    typography: "{typography.sigma}"
    rounded: "{rounded.base}"
    padding: "2px 8px"
  badge-modified:
    backgroundColor: "{colors.warning200}"
    textColor: "{colors.neutral800}"
    typography: "{typography.sigma}"
    rounded: "{rounded.base}"
    padding: "2px 8px"
  badge-draft:
    backgroundColor: "{colors.neutral150}"
    textColor: "{colors.neutral600}"
    typography: "{typography.sigma}"
    rounded: "{rounded.base}"
    padding: "2px 8px"
  subnav-link-active:
    backgroundColor: "{colors.primary100}"
    textColor: "{colors.primary700}"
    typography: "{typography.omega}"
    rounded: "{rounded.base}"
    padding: "8px 12px"
---

# Design System: Tiween Admin (Strapi Design System v2)

<!-- Scope: apps/strapi plugin admin UIs (src/plugins/*/admin/src/**) only. The public site uses apps/client/DESIGN.md (Tiween DS); never mix the two. Rules source: .claude/skills/strapi-design-system/ (SKILL.md, foundations.md, rules.md). Token values are the light theme of the installed @strapi/design-system 2.2.3. Production code imports components, never these hex values. -->

## Overview

**Creative North Star: "The Stock Strapi Workbench"**

Tiween's admin is not a branded product; it is Strapi. Every plugin screen should be indistinguishable in kind from Strapi's own Content Manager: a neutral cool-gray canvas, white cards and tables separated by hairline borders, one indigo accent for the primary action, focus and selection, and a native system font. Ambition here is precision and restraint. The editor's success is a complete, correctly translated record, and the interface earns trust by being predictable, dense and honest about what is missing.

Tiween extends the stock admin in three places only, and each extension is built from stock parts: locale tabs that show each language's publication status, a publish bar that lists in words what still blocks publication, and repeatable editors for the catalog graph (credits, cast, videos, distinctions, streaming links). Everything else (page shell, side nav, tables, forms, dialogs, notifications, empty and loading states) is the stock component used the stock way.

**Key Characteristics:**

- Light theme, neutral100 canvas, neutral0 cards; no imagery or gradients in chrome.
- One indigo accent (#4945ff); one primary button per view group.
- 4px radius on nearly everything; pills only for avatars, status dots, toggle tracks.
- Borders separate; three restrained, cool-tinted shadow levels.
- Native system font, weights 400/500/600, body 14px.
- Sentence case, imperative copy, no emoji; every interface string translated (en/fr). The admin UI is never Arabic; Arabic is content only (see Arabic (RTL) below).

## Colors

A cool-gray neutral ramp with one indigo accent and three status families; color is functional only.

### Primary

- **Strapi Indigo** (#4945ff, `primary600`): the primary (`default`) button, links such as "Back to list", focus outlines, the active nav icon and selection. Hover lightens to `primary500` (#7b79ff). `primary700` (#271fe0) is the focus-ring and secondary-label shade. `primary100` (#f0f0ff) is the active side-nav pill and the secondary-button fill, with `primary700` text.

### Secondary

- **Status: success** (`success100` #eafbe7 fill, `success700` #2f6846 text, `success600` #328048 icons): Published, Approved.
- **Status: warning** (`warning100` #fdf4dc, `warning200` #fae7b9, `warning700` #be5d01, `warning600` #d9822f): Modified, Pending, and advisory publish warnings. `warning700` is 4.4:1 on white but only 3.6:1 on `warning200` and 4.0:1 on `warning100`, so warning badges take `neutral800` text (see Chips). For borders and icons that must stand out against white, use `warning700`, not `warning600` (2.8:1).
- **Status: danger** (`danger100` #fcecea, `danger700` #b72b1a, `danger600` #d02b20): Suspended, destructive buttons, field errors, the "Before publishing" blocker list.

### Neutral

- **Canvas** (`neutral100` #f6f6f9): the app background behind `Layouts.Content`.
- **Card White** (`neutral0` #ffffff): cards, form sections, tables, side nav, modals.
- **Hairlines** (`neutral150` #eaeaef, `neutral200` #dcdce4): card, table, input and divider borders; `neutral150` is also the draft-badge fill.
- **Muted Text** (`neutral600` #666687): hints, subtitles, secondary copy (5.1:1 on canvas).
- **Body Text** (`neutral800` #32324d) and **Heading Text** (`neutral900` #212134).
- **Disabled** (`neutral400` #a5a5ba): disabled controls only (2.4:1, never readable text).

### Named Rules

**The Single Indigo Rule.** Indigo is the only accent. One `default` button per view group; everything else is `secondary`, `tertiary` or `ghost`.

**The Token Alias Rule.** Code passes DS token names (`background="neutral0"`, `textColor="neutral600"`, `backgroundColor="success100"`), never hex, never raw ramps in CSS, never `styled-components` for new code.

**The No Brand Leak Rule.** No Tiween gold, aubergine, magenta, category colors or Lalezar anywhere in the admin.

## Typography

**Display Font:** none; the native system stack throughout
**Body Font:** -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif

**Character:** the operating system's own UI face, chosen so the admin reads as a tool, not a brand. Oxygen is a system font, not a missing webfont.

### Hierarchy

- **Alpha** (600, 32px, 1.25; 28px on mobile): page titles via `Layouts.Header`.
- **Beta** (600, 18px, 1.22): modal and dialog titles, large section heads.
- **Delta** (500, 16px, 1.25): form-section titles (`Typography variant="delta" tag="h2"`).
- **Epsilon** (400, 16px, 1.5): lead paragraphs, rare.
- **Omega** (400, 14px, 1.43): body, field values, table cells, M and L button labels (bold); bold omega names the active locale in the publish bar.
- **Pi** (400, 12px, 1.33): hints and helper lines in `neutral600`; bold pi is the default S button label.
- **Sigma** (600, 11px, 1.45, uppercase): table column headers and section overlines only.

### Named Rules

**The Three Weights Rule.** 400, 500 and 600 only (the DS calls 600 `bold`). No custom webfont, ever.

**The Sentence Case Rule.** Buttons, headings, tabs and menu items are sentence case; uppercase is reserved for the `sigma` overline.

## Layout

Every plugin uses the same shell: `Layouts.Root` with the plugin's `SubNav` as `sideNav`, the routed page rendered into an `<Outlet/>`. A page is `<Main>` containing `Layouts.Header` (title, subtitle, `navigationAction` back link, one `primaryAction`) and then `Layouts.Content`, which sets the 56px page gutter. Chrome placed outside `Layouts.Content` (locale tabs, the publish bar) aligns to the same 56px gutter (`paddingLeft/Right={10}`).

Inside content, work is grouped into stacked white form sections (`Box background="neutral0" hasRadius shadow="filterShadow" padding={6} marginBottom={4}`), each with a delta title and an optional pi hint. Fields sit on `Grid.Root gap={4}` with 12-column items that collapse to full width on small screens (`col={6} s={12}`, `col={4} s={6}`). Spacing is the DS 4px grid (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64): 8px between controls, 16px between fields and sections, 24px card padding.

List pages are a toolbar (search form, filter selects), a `Table` with sigma column headers and a visually hidden actions column, and `Pagination` below.

## Elevation & Depth

A hybrid that leans flat: borders do most of the separating work, and shadows are cool-tinted and restrained to three levels. Cards, form sections and tables sit on the canvas with a hairline or the soft filter shadow; menus, popovers, modals and dialogs take the popup shadow over a flat scrim of about 20% black with no blur. Hover on a clickable card adds an indigo border plus the popup shadow.

### Shadow Vocabulary

- **filterShadow** (`box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1)`): form sections, the publish bar, filter bars.
- **tableShadow** (`box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1)`): tables.
- **popupShadow** (`box-shadow: 0px 2px 15px rgba(33, 33, 52, 0.1)`): menus, popovers, comboboxes, modals, dialogs, card hover.

### Named Rules

**The Borders Before Shadows Rule.** Separate with a 1px `neutral150` or `neutral200` border first; reach for `filterShadow` only on a card that must lift off the canvas.

## Shapes

One 4px radius (`hasRadius`) on buttons, inputs, cards, tables, badges, tabs and modals. Full pills only for avatars, status dots and toggle tracks. Borders are 1px. Icons are Strapi's solid-fill set (`@strapi/icons`) at 16px in buttons, fields and table actions, 20px in alerts, 24 to 28px in empty states, always inheriting `currentColor`.

## Components

### Buttons

- **Shape:** 4px radius, 16px side padding, 8px icon gap via `startIcon`. Default size S is 32px tall on desktop (40px below 768px) with a bold 12px pi label; M is 36px and L is 40px with a bold 14px omega label.
- **Primary (`variant="default"`):** indigo fill, white label; one per view group (Save, Publish, Add a work).
- **Hover / Focus:** the primary fill lightens 600 to 500 on hover and returns to 600 on press, with no scale; keyboard focus is a 2px `primary600` outline at 2px offset. `loading` replaces the start icon with a spinner and blocks the click. Disabled is `neutral150` fill, `neutral200` border, `neutral600` text.
- **Secondary:** `primary100` fill, `primary200` border, `primary700` label; hover turns the fill white, press adds a `primary600` border and label (Unpublish, the empty-state "Add a work").
- **Tertiary / Ghost:** tertiary is white with a `neutral200` border and `neutral800` label (hover `neutral100`, press `neutral150`); ghost is borderless and transparent with `neutral500` icons. The work-type switcher shows the chosen type as `default` and the others as `tertiary`.
- **Danger:** `danger600` fill, only inside a confirm dialog.

### Chips (status badges)

- **Style:** DS `Badge`, 4px radius, sigma label; size S in tables and tabs, M in the publish bar.
- **State:** Draft (neutral), Published (success), Modified (warning), Missing (secondary) for content; Pending (`warning200`/`neutral800`), Approved (`success100`/`success700`), Suspended (`danger100`/`danger700`) for venues. The label is always text from the translations, so status never relies on color.
- **How the DS colors a badge (2.2.3):** any `variant` paints a `{variant}200` fill behind `{variant}700` text and ignores the `textColor` and `backgroundColor` props. Every variant passes AA at the 11px sigma size except `warning`, at 3.6:1.

**The Warning Badge Rule.** Never use `<Badge variant="warning">`. Draw warning badges (Modified, Pending, "2 skipped") as `<Badge backgroundColor="warning200" textColor="neutral800">` with no `variant`, which gives about 10:1. Gap: the work form's locale tabs and publish bar still ship the Modified badge as `variant="warning"` (3.6:1), and the venues status badge draws Pending as `warning100`/`warning700` (4.0:1).

### Cards / Containers

- **Corner Style:** 4px (`hasRadius`).
- **Background:** `neutral0` on the `neutral100` canvas.
- **Shadow Strategy:** `filterShadow`; see Elevation & Depth.
- **Border:** none on form sections; `neutral150` on plain cards and tables.
- **Internal Padding:** 24px (`padding={6}`), 16px for the publish bar (`padding={4}`).

### Inputs / Fields

- **Style:** every input is composed as `Field.Root` > `Field.Label` > control > `Field.Hint` > `Field.Error`, with `required`, `hint` and `error` passed on `Field.Root`. Controls are `TextInput`, `Textarea`, `SingleSelect`, `Combobox`, `Toggle`, `NumberInput`, bound through react-hook-form `Controller` and validated by zod. 40px tall, white fill, 1px `neutral200` border, 4px radius.
- **Focus:** `primary600` border with an inset 2px ring.
- **Error / Disabled:** `hasError` on the control and a translated message in `Field.Error` (`danger600`); disabled fields take `neutral150` fill and `neutral600` text.
- **Arabic (RTL):** when the active content locale is `ar`, text controls and read-only previews carry `dir="rtl"` (or `dir="auto"` for mixed content) and right-aligned text, with Western digits. Gap: shipped plugin forms do not set `dir` yet, so Arabic titles and synopses are currently typed and shown left-to-right in an LTR admin.

### Navigation

- **Side nav:** `SubNav.Main` > `SubNav.Header` (plugin name) > `Divider` > `SubNav.Content` with a `Flex tag="nav"` of `SubNav.Link`s. Active link is a `primary100` pill with `primary700` text. Links the user's role cannot use are hidden, not shown disabled (venues hides Properties without `manage-all`).
- **Locale tabs:** `Tabs.Root variant="simple"`, one `Tabs.Trigger` per i18n locale (default first), each showing the locale name and an S status badge. Translation tabs are disabled until the work is first saved.
- **Back link:** `navigationAction` on `Layouts.Header` is a router link in omega `primary600` ("Back to list").

### Publish Bar (signature)

A white `filterShadow` card above the form: status badge, bold locale name and a pi scope line on the start side; Unpublish (secondary, only when published or modified) and Publish (default) on the end side. Below, "Before publishing" lists every blocking rule as a translated `danger600` line and disables Publish; warnings follow in `warning600`. The list is advisory; the server re-checks on publish.

### States

- **Loading:** a centered DS `Loader` with translated "Loading…" text inside `<Main>`, or `Page.Loading` for a whole page.
- **Empty:** `EmptyStateLayout` with a short content line ("No work found") and one secondary action that creates the first item.
- **Forbidden:** `Page.NoPermissions` when the user's scope allows nothing.
- **Errors and success:** `useNotification().toggleNotification({ type: "success" | "danger" | "warning", message })` with a translated message; never `alert()` and never a raw server error.
- **Destructive confirm:** DS `Dialog` (`Dialog.Root` > `Dialog.Content` > `Dialog.Header` / `Dialog.Body` / `Dialog.Footer`) with a `WarningCircle` icon; larger edits use `Modal.Root` > `Modal.Content` > `Modal.Header` > `Modal.Title`.

## Do's and Don'ts

### Do:

- **Do** import every component from `@strapi/design-system` v2, `Layouts`, `Page`, `SubNav` and `useNotification` from `@strapi/strapi/admin`, and icons from `@strapi/icons`.
- **Do** wrap every field in `Field.Root` with `Field.Label`, `Field.Hint` and `Field.Error`.
- **Do** use DS token props (`neutral0`, `neutral600`, `success100`) instead of colors in code.
- **Do** keep one `default` button per view group and put it in `Layouts.Header` `primaryAction`.
- **Do** give icon-only buttons a translated `label`.
- **Do** route every string through the plugin translations with an English default.
- **Do** set `dir="rtl"` on Arabic content inputs and previews.
- **Do** respect `prefers-reduced-motion`; DS motion is 120/200/320ms easeOutQuad with no bounce.

### Don't:

- **Don't** use native HTML controls, `styled-components`, raw hex colors, `alert()`, or the deprecated `ModalLayout`.
- **Don't** use `neutral400` (#a5a5ba) for readable text; low-emphasis copy is `neutral600`.
- **Don't** round anything beyond 4px except avatars, status dots and toggle tracks.
- **Don't** add a webfont or any weight above 600.
- **Don't** use emoji or Unicode-character icons.
- **Don't** bring in any Tiween B2C brand element (gold, aubergine, Lalezar, category colors, shadcn, Tailwind).
- **Don't** show a nav link to a page the user's role will always be refused.
