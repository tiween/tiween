---
phase: 02-strapi-backed-shorts-pages
doc: DESIGN
status: draft
decided: 2026-11-10
decided_by: owner (smart discuss 2026-11-10)
mockups: []
visual_authority: apps/client/DESIGN.md (Gold Leaf × Aubergine)
brief: 02-DESIGN-BRIEF.md
experience: 02-EXPERIENCE.md
ui_spec: 02-UI-SPEC.md
---

# Strapi-backed shorts pages — visual design

Placement for the four public surfaces this phase touches. Tokens, type roles, radii and
named rules come from `apps/client/DESIGN.md`; this file only places them. Exact sizes,
spacing, colors, copy keys and state tables live in `02-UI-SPEC.md` (checker-approved);
where this file is silent, the UI-SPEC applies. Where the two disagree, the UI-SPEC wins
and this file is wrong.

Scope is the public site only (`apps/client`, Tiween DS, shadcn/ui new-york). No Strapi
admin surface is touched in this phase.

## Owner decisions this design applies

Locked in `02-CONTEXT.md` (smart discuss, 2026-11-10).

| #    | Decision                                                                   | Consequence here                                                                                  |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| D-01 | `/shorts` renders `ShortsDirectory` on the Strapi list                     | One 2:3 poster grid; no hero, no "Derniers ajouts" rail                                           |
| D-02 | `ShortsShowcase.tsx` is deleted                                            | No landscape rails, no left/right positioning, no raw black/white                                 |
| D-03 | Server-render page 1 (24), then "Load more" through a route handler        | Load more has four states (idle, loading, error, none); at 13 films no control renders            |
| D-04 | No filters, chips, search or sort UI this phase                            | Phase 3 (Meilisearch) owns facets. The page has intro, result line, grid only                     |
| D-05 | ISR `revalidate: 60` plus cache tags                                       | Failure UI must come from a thrown error and `error.tsx`, never a cached error shell              |
| D-07 | Error and not-found are different                                          | Two distinct blocks: retryable error (alert) and "introuvable" (404, plain content)               |
| D-09 | Crew role labels come from the client locale files                         | Unknown slug shows a humanized slug, never blank                                                  |
| D-10 | "Équipe artistique" lists every non-cast credit, grouped by department     | New detail section before Distribution; omitted when empty                                        |
| D-11 | Missing-translation fallback is silent                                     | No visible label. Fallback nodes carry `lang="fr"`, plus `dir="ltr"` inside an Arabic page        |
| D-12 | Initials disc instead of person photos                                     | Crew disc 40px, cast disc 88px; no photo branch, no gold                                          |
| D-13 | Card heart is its own 44px target at the top-end corner; duration moves    | Duration leaves the corner and becomes the second meta line `{year} · {duration}`                 |
| D-14 | Signed-out tap shows a toast, then redirects to sign-in with a return path | Heart stays enabled and unsaved when signed out; no local toggle                                  |
| D-15 | Offline taps reuse the events queue                                        | Optimistic fill, "queued" toast; no persistent pending marker on the heart                        |
| D-16 | One mixed watchlist list, short films with a "Court métrage" label         | No new section or heading; short films sort into "À venir" after dated events, newest saved first |

## Surface 1: Detail page `/[locale]/shorts/[slug]`

Reading column 920px, 16px gutter. Section order, top to bottom: hero, action row,
synopsis, distinctions, where to watch, **Équipe artistique (new)**, Distribution,
Dans la même veine, sticky bar. A section with no data is omitted, never an empty heading.

**Focal point:** the hero title with the single gold "Regarder le film" pill under it.
Everything added here stays secondary to that pair.

### Hero text stack (bottom of the hero, in order)

| #   | Element                       | Placement                                                                                                  |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Chip row                      | Unchanged                                                                                                  |
| 2   | `<h1>` title                  | Lalezar, unchanged                                                                                         |
| 3   | **Original-title line (new)** | "Titre original : …", Meta size, muted, 4px under the title. Only when it differs from the displayed title |
| 4   | Meta line                     | Unchanged: directors · year · duration · genres                                                            |
| 5   | **Origin line (new)**         | `{countries} · {languages}`, Meta size, muted, 4px under the meta line. Wraps on narrow widths, never cuts |

Country and language names are words in the page locale, never raw codes. Each group has
a visually hidden label ("Pays" / "Langue") for screen readers. An empty group is dropped
with its separator; two empty groups drop the line.

### Action row and heart

- The shipped 52px round heart stays where it is and becomes real.
- Unsaved: outline glyph in muted text on Surface. Saved: filled Gold Leaf glyph and a Gold
  Leaf border. The change is shape plus fill, never color alone.
- While the saved state is being checked on a signed-in visit, the glyph is replaced by a
  small spinner after 200ms (no layout shift).
- The sticky bar and the related tiles carry no heart.

### Équipe artistique (crew grid)

- Title in Title role (same as the shipped `sectionTitle`), placed **before** Distribution so
  the two people sections stay together.
- Groups by department in a fixed order (directing first), a Label-role heading per group,
  24px between groups.
- Row (not interactive, people have no page): 40px initials disc, then name over role.
  Disc is Surface Raised with a hairline Border; no gold, no category hue, no photo.
- One column in the detail page's narrow container, two columns from `30rem`, filled row by
  row. In Arabic the disc sits at the right of its text and the columns fill right to left.
- Cast rail keeps its layout; its empty stripe avatar becomes the same disc at 88px.

### Where to watch

- Under each platform name, a one-line sub-label in Meta role, muted: the access type
  ("Gratuit", "Sur abonnement"…), then " · " and the editor's label (for example "VOST")
  when there is one. Plain text, no icon, never the teal category hue.
- No access type means no sub-label; the row still shows. The "Regarder" outlined pill and
  the logo tile are unchanged.

### Error and not found

Both sit in a full-height Midnight Aubergine field under the app header, content centered,
max 420px, built from shadcn `Empty`.

| Case      | Icon (48px)               | Headline                            | Action                                                   | Role    |
| --------- | ------------------------- | ----------------------------------- | -------------------------------------------------------- | ------- |
| Failure   | Alert circle, destructive | "Ce court métrage ne se charge pas" | Gold "Réessayer" pill, then a text link to the directory | `alert` |
| Not found | Film glyph, muted         | "Court métrage introuvable"         | Gold "Voir tous les courts métrages" pill                | none    |

The icon always sits beside text. No stack trace, status number or error code is shown.

### Silent French fallback

No visible marker anywhere. The page chrome stays in the page locale; only the nodes that
carry French text are tagged. On an Arabic page that text is left-aligned (start) in its
own direction. This is a markup rule, so the mockups show the French text in place and
nothing else.

### Loading

Hero-height Surface block with the reserved stripe, three skeleton bars for the title
block, a 52px round block for the heart. Static under reduced motion.

## Surface 2: `ShortFilmCard`

The 2:3 frame, `rounded-2xl`, grain, featured badge, category chip, hover overlay and
trailer button are unchanged (Phase 4 owns the card redesign).

| Element         | Placement                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Heart (new)** | Top-end corner, 4px inset. 44px target containing a centered 40px disc with a 20px glyph. Always visible at every breakpoint and input |
| Heart disc      | Aubergine Deep scrim at 80% with blur and a hairline Border. Unsaved: outline glyph in Foreground. Saved: filled Gold Leaf glyph       |
| Duration        | Leaves the top-end pill. Becomes the second meta line in the bottom scrim                                                              |
| Meta line 1     | Director, one line, truncates                                                                                                          |
| **Meta line 2** | `{year} · {duration}`, for example "2025 · 14 min". Each part is dropped when absent, with no lone separator                           |
| Title           | Two-line clamp, unchanged                                                                                                              |
| No poster       | `ReservedArtwork` stripe frame. This is the common case: all 13 launch films use it                                                    |

- The heart is a sibling of the card link, never inside it, so a tap on the heart never
  navigates. Each card has two controls in DOM order: the link, then the heart.
- Arabic: the heart is at the top-left of the poster (top-end), the featured badge top-right.
- Skeleton cards use the same 16px radius and render no heart.
- The mockup confirms the duration spot (owner question 5).

## Surface 3: Directory `/[locale]/shorts`

```
App header (global)
├─ Intro            h1 "Courts métrages" · one-sentence description (no CTA)
├─ Result line      "{n} courts métrages"
├─ Grid             2:3 ShortFilmCard, 16px gap
├─ Load more        only while more pages exist
└─ Suggestion prompt  existing inline prompt, only once the list is complete or empty
Bottom nav (global, under 1024px)
```

**Focal point:** the first row of posters, fully above the fold at 390 x 844. No element
above the grid carries a gold fill.

- Grid steps 2 / 3 / 4 / 5 / 6 columns at 0 / 640 / 768 / 1024 / 1280px; side gutter 16px
  under 768, 24px above; container max 1280px. Same as `04-DESIGN.md`, so Phase 4 adds
  chips and search without moving the grid.
- Vertical rhythm is the snapped set in the UI-SPEC (header to h1 16 / 32 / 48; grid to
  Load more 32 / 32 / 48). Phase 4 adopts these values.
- h1 is Heading role at every width, in Inter (IBM Plex Sans Arabic in Arabic). No Lalezar;
  whether `/shorts` earns it is the Phase 4 mockup 2b decision.
- No hero, rail, search field, chips, filter button or sort control on this page.
- At launch the 13 films are one page of 24, so no Load more control renders. A ragged last
  row stays start-aligned.

### Load more

| State       | Placement and look                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Idle        | Centered secondary pill "Afficher plus", 44px, Gold Leaf outline, Gold Tint label, below the grid                   |
| Loading     | Same footprint (no shift): spinner plus "Chargement des courts métrages…"                                           |
| Error       | Cards stay. Small alert icon plus "La suite n'a pas pu être chargée." under them, then a secondary "Réessayer" pill |
| End of list | No control. The existing suggestion prompt follows; nothing else is printed                                         |

### Error (first page fails)

Same intro stays. The result line and grid are replaced by one error block (shadcn
`Empty`, max 420px): alert icon, "Le catalogue ne répond pas", a calm body line, gold
"Réessayer" pill (48px). `role="alert"`. An outage is never shown as an empty catalogue.
On recovery the grid replaces the block and focus moves to the h1.

### Empty catalogue

Only when the API answers with zero films. Result line and grid hidden; shadcn `Empty`
with a muted film glyph, "Le catalogue ouvre bientôt", one body sentence, and the existing
suggestion trigger as a secondary pill. Plain content, not an alert.

### Loading

Real intro text, a skeleton bar for the result line, 12 skeleton cards in the same grid.

## Surface 4: Watchlist entry (short film)

- A saved short film is the existing `EventCard` default variant, adapted: 2:3 poster
  (stripe when absent), "Court métrage" in the category `Badge`, title (two lines), an
  optional `{year} · {duration}` line, and the existing filled heart at the top-end corner
  with the existing Undo toast.
- **No venue row, no date row, no placeholder dash.**
- The whole card links to the film's detail page.
- **One list, same grid** (D-16). Events and short films are mixed. Short films have no
  screening date, so they fall into "À venir" after every dated event, newest saved first.
  No new section, heading or partition.
- Page-level copy that still says "événements" is not touched this phase.
- Offline: cached list stays visible; the heart is disabled with the existing tooltip.

## Heart state at a glance

Behavior and the full state machine are in `02-EXPERIENCE.md` and UI-SPEC Part E. Visually
there are only two looks, on every heart:

| Look        | When                                                          |
| ----------- | ------------------------------------------------------------- |
| Outline     | Signed out, loading, unresolved, unsaved, after a failed save |
| Filled gold | Saved (including an optimistic or queued save)                |

Gold is reserved for: the saved heart, the primary retry and browse pills, the secondary
Gold Leaf-outline pills (Load more, inline retry, suggestion trigger), and the focus ring.
Nothing else in this phase is gold.

## Responsive and RTL

| Surface   | 390                                  | 768                    | 1280                              |
| --------- | ------------------------------------ | ---------------------- | --------------------------------- |
| Detail    | One column, crew in one column       | 920px column           | 920px column, crew in two columns |
| Card      | 171 x 256 approx., heart 44px target | 168 x 252 approx.      | 192 x 288 approx.                 |
| Directory | 2 columns, 16px gutter               | 4 columns, 24px gutter | 6 columns, container max 1280     |
| Watchlist | Existing grid                        | Existing grid          | Existing grid                     |

RTL: logical properties only. The heart moves to the top-left, the first grid card is
top-right, crew discs sit at the right of their text, directional chevrons mirror, heart,
retry, alert and film glyphs do not. Digits are Western in all three locales. Every title,
director, country, language, platform name and editor label is isolated (`<bdi>` or
`dir="auto"`). Arabic crew, role, access-type and error strings are drafts for the owner's
Arabic review.

## Component and token sources

| Need                                    | Source                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Colors, type, radii, named rules        | `apps/client/DESIGN.md`                                                                                               |
| Spacing, sizes, copy keys, state tables | `02-UI-SPEC.md`                                                                                                       |
| Components                              | shadcn/ui catalogue (`button`, `skeleton`, `badge`, `tooltip`, toast; add `avatar`, `empty`). No direct Radix imports |
| Icons                                   | lucide for new work; the detail page keeps its shipped Phosphor glyphs                                                |
| Detail page colors                      | Route-scoped `--sfd-*` block; new colors are declared there, never as raw hex                                         |

## Not designed here

Filters, chips, sort, search, genre facets (Phase 3); the finished directory visual pass,
card redesign, suggestion form backend (Phase 4); metadata and sitemap (Phase 5); linking
and indexing (Phase 6). Pages stay `noindex` and unlinked until Phase 6.
