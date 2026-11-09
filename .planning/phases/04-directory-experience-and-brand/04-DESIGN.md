---
phase: 04-directory-experience-and-brand
doc: DESIGN
status: draft
decided: 2026-11-09
decided_by: owner (structure, ratings, suggestion placement, gold use, launch size, prototype retirement)
mockups: []
visual_authority: apps/client/DESIGN.md (Gold Leaf × Aubergine)
brief: 04-DESIGN-BRIEF.md
experience: 04-EXPERIENCE.md
---

# Short-film directory — visual design

Visual design for `/[locale]/shorts`. Tokens, type roles, radii and named rules come from
`apps/client/DESIGN.md`; this file only places them. Where this file and the existing
`ShortsDirectory` stack disagree, this file wins.

## Owner decisions this design applies (2026-11-09)

| #   | Decision                                                                                               | Consequence here                                                             |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | The page opens on **one 2:3 poster grid**: intro, then chips (with search and filter sheet), then grid | `ShortsHero` and the "Derniers ajouts" rail leave the directory              |
| 2   | **No ratings in v1**                                                                                   | No stars, no rating sort, no rating filter, anywhere                         |
| 3   | Suggestion trigger becomes an **end-of-grid prompt**, secondary weight                                 | The gold button beside the heading goes                                      |
| 4   | **Gold only for actions**                                                                              | No gold "À la une" badge; cards carry the teal category chip                 |
| 5   | **~10 films at launch**                                                                                | Layout must read finished at 10 cards and scale to hundreds                  |
| 6   | `ShortsShowcase.tsx` is **retired** when the directory mounts                                          | The mock route component and its mock data imports are removed from the page |

The ROADMAP and SDIR-01 were amended on 2026-11-09 to match decision 1 (no hero, no
latest-additions row); see `04-EXPERIENCE.md` § Open decisions, item 1.

## Page structure (all widths)

```
App header (global)
├─ Intro           h1 · description · (≥1024: search + filter at inline-end)
├─ Search row      search field · filter-sheet button        (<1024)
├─ Chip row        Tous · genres… │ durations…
├─ Result line     "{n} courts métrages"  (+ removable chips for sheet-only filters)
├─ Grid            2:3 poster cards
├─ Load more       only while more pages exist
└─ Suggestion prompt  only once the list is complete
Bottom nav (global, <1024)
```

There is no carousel, rail, featured slot or editorial row above the grid.

## Breakpoints

Grid steps follow DESIGN.md (2, 3, 4, 5, 6 columns, 16px gaps) and match the current
`GRID` constant in `ShortsDirectory.tsx` (Tailwind `sm` 640, `md` 768, `lg` 1024, `xl` 1280).

|                     | 390 (phone)                                                                        | 768 (tablet)                      | 1280 (desktop)                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Side gutter         | 16px                                                                               | 24px                              | 24px, container max 1280                                                                                           |
| Content width       | 358                                                                                | 720                               | 1232                                                                                                               |
| Columns             | 2 (3 from 640)                                                                     | 4                                 | 6 (5 at 1024–1279)                                                                                                 |
| Card size (approx.) | 171 × 256                                                                          | 168 × 252                         | 192 × 288                                                                                                          |
| Intro               | Stacked, full width                                                                | Stacked, description max 660px    | Intro at inline-start (max 660px); search (360px) + filter button at inline-end, bottom-aligned to the description |
| Search row          | Own row under the intro                                                            | Own row                           | Merged into the intro row                                                                                          |
| Chip row            | One row, scrolls horizontally, bleeds to the screen edges, 24px fade at inline-end | Same                              | Wraps; no scroll                                                                                                   |
| Filter sheet        | Bottom sheet, max 85dvh                                                            | Side sheet at inline-end, 400px   | Side sheet at inline-end, 400px                                                                                    |
| Suggestion prompt   | Stacked band                                                                       | Band, text and button on one line | Band, text and button on one line                                                                                  |
| Bottom padding      | 64px nav + safe area + 32px                                                        | Same                              | 64px                                                                                                               |

### Vertical rhythm (snapped to the 4px scale)

| Gap                       | 390 | 768 | 1280                |
| ------------------------- | --- | --- | ------------------- |
| Header → h1               | 20  | 32  | 40                  |
| h1 → description          | 8   | 8   | 8                   |
| Description → search row  | 16  | 20  | (same row)          |
| Search row → chip row     | 12  | 16  | 24 (from intro row) |
| Chip row → result line    | 16  | 20  | 24                  |
| Result line → grid        | 12  | 12  | 16                  |
| Grid → load more / prompt | 32  | 40  | 48                  |

**Fold check at 390 × 844:** header 56 + intro ~150 + search 44 + chips 44 + result line
20 + gaps ≈ 400px, so the first row of posters (256px) is fully visible and the second
row starts. This is the decision's whole point: posters on the first screen.

**Ten cards:** 2 cols → 5 full rows; 4 cols → 2 rows + 2; 6 cols → 6 + 4. A ragged last
row stays start-aligned (never centred or stretched). The count line ("10 courts
métrages") and the closing suggestion band make the short list read as complete rather
than unfinished. Rejected: placing the prompt in the empty cells of the last row, because
it changes position at every breakpoint and competes with posters.

## Intro block

| Element     | Spec                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| h1          | New key `shorts.directory.title` ("Courts métrages"). Inter 700 (IBM Plex Sans Arabic 700 in AR): 24/32 at 390, 30/36 from 768. Foreground. `text-wrap: balance`. |
| Description | Existing `shorts.directory.description`. Body 16/24, Text Secondary, max 660px. One sentence, no CTA.                                                             |
| Count       | Lives in the result line, not in the intro, so it can update and be announced.                                                                                    |

The h1 is a routine screen header, so DESIGN.md's Brand Moment Rule puts it in Inter.
Artboard 2b in the brief tests Lalezar 36/40 for the owner, since dropping the hero
removes the page's only brand moment. Decide on the mockups; default is Inter.

## Search and filter controls

- **Search field:** existing `ShortsFilters` input. 44px, 8px radius, Surface fill, 1px
  Border, leading search icon (Muted), placeholder "Titre, réalisateur…", 44px clear
  button at inline-end when filled. Body 16 (prevents iOS zoom).
- **Filter-sheet button:** 44px square, 8px radius, Surface fill, 1px Border,
  sliders icon in Foreground. When sheet-only filters are active, a 20px Gold Leaf badge
  with Gold Ink count sits on its top inline-end corner (state, so gold is allowed). The
  count covers every applied filter except search.
- **Sort** lives in the sheet only: Plus récents (default), Année, Durée, Titre.

## Chip row

Two groups in one row, separated by a 1px × 24px Border divider with 4px margin each side.

| Group    | Chips                                                                                                                       | Selection                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Genre    | "Tous" + every genre with at least one published short, ordered by film count then name, max 8 (the rest live in the sheet) | "Tous" clears genres and duration. Genres multi-select (OR) |
| Duration | "Jusqu'à 10 min" · "11 à 20 min" · "Plus de 20 min"                                                                         | Single-select; tapping the selected one clears it           |

**Filter chip** (a control, so larger than DESIGN.md's 11px badge chip):

| Property        | Resting                     | Selected                           |
| --------------- | --------------------------- | ---------------------------------- |
| Height          | 44px (full target)          | 44px                               |
| Padding         | 0 14px                      | 0 12px 0 10px (room for the check) |
| Radius          | 8px                         | 8px                                |
| Fill            | Surface #31203A             | Gold Leaf #D4A24A                  |
| Stroke          | 1px Border #4A3556          | none                               |
| Label           | 14/20 Inter 600, Foreground | 14/20 600, Gold Ink #2A1A06        |
| Glyph           | none                        | 16px check, leading, Gold Ink      |
| Hover (pointer) | Surface Raised              | opacity 0.92                       |

Spacing between chips 8px. Chip labels are wrapped in `<bdi>`. Selection is never
shown by color alone: the check glyph and `aria-pressed` carry it.

## Result line

- "{n} courts métrages" via existing `shorts.filters.results`, 14/20, Muted Foreground,
  Western digits, at inline-start.
- After it, on the same line (wrapping below at 390), removable chips for filters that
  have **no** chip in the chip row: year range, "Films primés uniquement", "Disponible en
  ligne", and a custom duration range set with the sheet slider. Style: 32px visual /
  44px hit area, Surface, 1px Border, 12/16 label, trailing 16px × icon. Genre and bucket
  duration filters never appear here; their chips already show them.
- Hidden during first-load error; replaced by a skeleton bar while loading.

## Card anatomy (no ratings)

One 2:3 poster card (`ShortFilmCard`), same at every breakpoint. Title and meta are
always visible; nothing is revealed on hover.

```
┌──────────────────────────┐
│ [● Court métrage]        │  top: category chip (start); no heart this phase
│                          │
│        poster art        │
│                          │
│▒▒▒ Aubergine Deep scrim ▒│
│ Title, two lines max     │  14/20 600 Foreground
│ عنوان أصلي               │  12/16 Text Secondary, 1 line, only if it differs and is Arabic
│ Réalisatrice A           │  12/16 Muted, 1 line
│ Drame · 2025 · 14 min    │  12/16 Muted, 1 line (first genre only)
│ ▶ Disponible en ligne    │  12/16 Gold Tint + 12px icon, only when online
└──────────────────────────┘
```

| Part          | Spec                                                                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frame         | 2:3, 16px radius, Surface under the image, borderless, no shadow                                                                                                                                                           |
| Poster        | `next/image` fill, `alt=""` (the link names the film). Missing poster: `ReservedArtwork` stripe                                                                                                                            |
| Category chip | DESIGN.md `chip-category`: Aubergine Deep scrim at 80%, darkened teal border, 6px teal dot, "Court métrage" (`shorts.category`) in `cat-shorts` #5FD0C2, 11/600, 8px radius, 4px 11px. 8px inset from top and inline-start |
| Heart         | Not shipped in this phase (owner, 2026-11-09). The card heart arrives with the real watchlist (Phase 2, FR19); the top-end corner stays empty and nothing moves                                                            |
| Scrim         | Bottom-up gradient from Aubergine Deep 95% to transparent, 11px padding, starts 48px above the first text line                                                                                                             |
| Text          | All runs in `<bdi>`; original title gets `lang="ar" dir="rtl"`. Line clamp as listed                                                                                                                                       |
| Duration      | Moves from the top-end pill into the meta line (frees the corner for the later heart)                                                                                                                                      |
| Availability  | Only the positive case is shown. "Non disponible en ligne" is not printed on cards                                                                                                                                         |

**Removed from the current card:** star rating; gold "À la une" badge; desktop hover
overlay that hid the title, faded the poster to 40% and showed an uppercase gold
"Regarder" pill; the hover trailer play disc (the detail page owns the trailer); the
film-grain pseudo-element; black (`#000`) scrims (use Aubergine Deep).

**Card states**

| State                | Treatment                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hover (fine pointer) | Lift 2px, 220ms `cubic-bezier(0.2,0.7,0.3,1)`; poster unchanged                                                                                      |
| Press                | Scale 0.985                                                                                                                                          |
| Focus (card link)    | Global focus ring on the whole card frame (3px Gold Leaf + 2px offset, 16px radius)                                                                  |
| Skeleton             | Same 2:3 frame and **16px** radius (the current skeleton is 8px), Surface block, 3 text bars in the scrim zone, top-start chip bar; no duration pill |

## Load more and end of list

- **More pages exist:** infinite scroll (existing observer, 400px margin) plus a visible
  secondary pill "Afficher plus" (44px, Gold Leaf 1.5px border, Gold Tint label), centred.
  Loading: 20px spinner in Gold Tint + "Chargement des courts métrages…" 14/20 Muted.
  Error: destructive alert icon + `loadMoreError` text, secondary "Réessayer" pill.
- **List complete** (including the 10-film launch, which fits one page): the suggestion prompt.

### Suggestion prompt (end of grid)

| Property  | Spec                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container | Full content width, Surface fill, 1px Border, 12px radius (info-row family), padding 20px (390) / 24px 32px (≥768)                                                      |
| Title     | New key `shorts.directory.suggestPromptTitle`, Title 18/28 Inter 700                                                                                                    |
| Body      | Existing `shorts.suggestion.description`, 16/24 Text Secondary, max 560px                                                                                               |
| Action    | Existing `SuggestionForm` trigger, **secondary pill** (transparent, Gold Leaf border, Gold Tint label, 44px), leading plus or lightbulb icon. Opens the existing dialog |
| Layout    | 390: stacked, button full width. ≥768: text at inline-start, button at inline-end, vertically centred                                                                   |

No gold fill, so the band never competes with the posters or with primary actions.

## States

| State                                      | Above the grid                                                          | Grid area                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| First load                                 | Server-rendered with data; no skeleton                                  | Server-rendered cards                                                         |
| Refetch (filter, search, sort)             | Intro, search, chips stay interactive; result line → 120px skeleton bar | Skeleton cards, count = min(24, last known total), so 10 films never flash 12 |
| Empty after filters                        | Chips keep their selection                                              | Empty block (below) with reset                                                |
| Empty catalogue (0 films, nothing applied) | Chip row and result line hidden; search hidden                          | Empty block, catalogue variant                                                |
| Error (first page)                         | Intro, search, chips stay; result line hidden                           | Error block                                                                   |
| Load-more error                            | unchanged                                                               | Cards stay; inline error under them                                           |

**Empty block** (centred, max 420px, 48px vertical padding):

- 48px film icon in Muted.
- Headline: Lalezar 30/36 (empty states are a Brand Moment per DESIGN.md). Arabic:
  IBM Plex Sans Arabic 700 24/32 (long Arabic display copy drops out of Lalezar).
- Body 16/24 Text Secondary.
- Actions, 12px apart, stacked at 390, inline at ≥768:
  - after filters: primary gold pill "Réinitialiser les filtres" (or "Effacer la
    recherche" when only a search is active) + secondary pill "Suggérer un court métrage";
  - empty catalogue: secondary pill "Suggérer un court métrage" only.

**Error block:** 48px alert-circle in destructive #FF8A8A plus text (never icon alone),
Headline 24/32 Inter 700 "Le catalogue ne répond pas", body 16/24, primary gold pill
"Réessayer" with rotate icon. `role="alert"`.

## Filter sheet

- Below 768: bottom sheet, 24px top corners, Surface fill, 4 × 36px drag handle in
  Border, max height 85dvh, content scrolls, footer sticky. 768 and up: side sheet at
  inline-end (right in FR/EN, left in AR), 400px, full height.
- Header: "Filtres" Title 18/28, 44px close disc at inline-end.
- Sections, 24px apart, each with a 14/20 600 label:
  - **Trier par:** four 44px radio rows (replaces the Select; one tap on a phone).
  - **Genres:** checkbox rows, 44px, all genres (the chip row shows at most 8).
  - **Durée:** dual-thumb slider 0–60 min, step 5, value line "{min} à {max} min".
  - **Année:** dual-thumb slider 1990–current year.
  - **Films primés uniquement**, **Disponible en ligne:** 44px switch rows.
- Footer: ghost "Effacer les filtres" at inline-start, primary gold pill "Appliquer" at
  inline-end (full width at 390, ghost above it).
- No rating section.

## Color use on this surface

| Color                              | Where                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Gold Leaf fill + Gold Ink          | Selected chips, filter-count badge, "Appliquer", "Réessayer", "Réinitialiser les filtres" |
| Gold Leaf stroke + Gold Tint label | "Afficher plus", suggestion trigger, empty-state secondary pill                           |
| Gold Tint text                     | Availability line on cards                                                                |
| Courts teal #5FD0C2                | Category chip only                                                                        |
| Destructive #FF8A8A                | Error icons, always with text                                                             |
| Not used                           | Magenta, black scrims, white on gold, any gold decoration                                 |

## RTL mirroring (Arabic)

- Built with logical properties only; no per-direction overrides.
- Grid fills right to left; the first card is top-right.
- Chip row starts at the right edge and scrolls leftward; the fade sits at the left
  (inline-end) edge; the divider order is unchanged (genres first, in reading order).
- Card: category chip top-right; text right-aligned.
- Search icon on the right, clear button on the left. Filter badge on the top-left corner.
- Sheet slides from the left at ≥768; bottom sheet is unchanged.
- Sliders run right to left (min at the right).
- Chevrons and the "load more" direction mirror; check, play and search glyphs do not.
- Latin titles inside Arabic UI and Arabic titles inside French UI are `<bdi>`-isolated.
- Western digits and the existing ICU plurals (dual included) for every count.

## Type ramp used (all snapped to DESIGN.md)

| Role              | Size / line               | Weight    | Where                                                          |
| ----------------- | ------------------------- | --------- | -------------------------------------------------------------- |
| Display (Lalezar) | 30/36                     | 400       | Empty-state headline (FR/EN)                                   |
| Headline          | 24/32 (390), 30/36 (≥768) | 700       | h1; error headline 24/32                                       |
| Title             | 18/28                     | 700       | Sheet title, suggestion prompt title                           |
| Body              | 16/24                     | 400       | Description, search, empty/error body, prompt body             |
| Small             | 14/20                     | 600 / 400 | Chip labels, card title (600), result line (400), sheet labels |
| Meta              | 12/16                     | 400       | Card byline, meta, availability, removable chips               |
| Label             | 11/1.4                    | 600       | Category chip, filter-count badge                              |

## Focus and targets

- Focus ring: the global `:focus-visible` rule, 3px Gold Leaf with 2px offset (owner,
  2026-11-09; the site-wide rule moves from 2px to 3px). On
  gold-filled controls (selected chip, primary pills) the ring is dark
  #241326. Card ring follows the 16px card radius.
- Every interactive element is at least 44 × 44px with 8px between targets: chips,
  search clear, filter button, removable chips (via hit area), sheet rows, pills.

## Build notes for the planner

- Client only (`apps/client`); no Strapi code, so no plugin waiver is needed.
- Mount `ShortsDirectory` on `/[locale]/shorts/page.tsx` with real data and URL-derived
  `initialFilters`; delete `_components/ShortsShowcase.tsx` and the page's mock imports.
- Remove `ShortsHero` usage and the latest rail from `ShortsDirectory`. `ShortsHero` has
  no other importer today; delete it with its locale keys unless the plan names a reuse.
- Fix while here: skeleton radius 8 → 16px; card scrims to Aubergine Deep; stock shadcn
  `Button` geometry overridden per DESIGN.md (pill, 44/48px, no shadow).
