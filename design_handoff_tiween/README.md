# Handoff: Tiween — boussole culturelle (B2C)

## Overview

Tiween is a bilingual (FR / AR-RTL) cultural discovery + ticketing PWA for Tunisia: cinema, theatre, music, and a short-film / theatre-archive catalogue. This bundle covers the B2C screens: home feed, film detail, search, short-films directory, short-film detail, play booking detail, and the archival play record — plus the empty / loading / error / offline states for each.

## About the Design Files

The files in `design_files/` are **design references written in HTML** — prototypes that show the intended look, structure, and behavior. They are **not production code to copy**.

Your task is to **recreate these designs in the target codebase's existing environment** (React, Next.js, Vue, Flutter, SwiftUI, native — whatever the project uses) with its established patterns, component library, routing, and state layer. If no environment exists yet, pick the framework that best fits the product (a PWA with offline support and RTL is the stated target) and implement the designs there.

The `.dc.html` files use a small custom runtime (`support.js`, `<x-dc>`, `{{ }}` holes, `<sc-for>`, `<sc-if>`). **Ignore that runtime.** Read them for markup structure, exact inline style values, copy, and the logic class at the bottom of each file (it holds the mock data shape and interaction state). Open any file directly in a browser to see it running.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, iconography, motion, and copy are final. Recreate pixel-for-pixel using the codebase's own primitives. The only intentional placeholders are the artwork boxes (see _Assets_).

---

## Design Tokens

### Color

| Token             | Hex                                     | Use                                        |
| ----------------- | --------------------------------------- | ------------------------------------------ |
| `bg/root`         | `#161015`                               | App background, deepest surface            |
| `bg/surface`      | `#1C0F20`                               | Panels, sheets, desktop side rail          |
| `bg/raised`       | `#241326`                               | Cards, device body, raised surfaces        |
| `bg/control`      | `#31203A`                               | Icon buttons, chips, inputs (rest)         |
| `bg/control-alt`  | `#3A2742`                               | Control hover, poster placeholder stripe B |
| `border/hairline` | `#2E1D37`                               | Dividers, tab underline track              |
| `border/strong`   | `#4A3556`                               | Card outlines, dashed empty-state rings    |
| `gold/primary`    | `#D4A24A`                               | Primary CTA fill, saved heart, brand ت     |
| `gold/text`       | `#E0B563`                               | Gold on dark text: prices, ratings, links  |
| `gold/ink`        | `#2A1A06`                               | Text/icons **on** gold fills               |
| `text/primary`    | `#FFFFFF`                               | Titles, primary labels                     |
| `text/secondary`  | `#C9C0D0`                               | Card meta over scrim                       |
| `text/muted`      | `#B0A6B8`                               | Body copy, inactive tabs                   |
| `text/faint`      | `#8B7E94`                               | Section eyebrows                           |
| `text/dim`        | `#7B6E83`                               | Placeholder captions                       |
| `text/dimmest`    | `#6E6076`                               | Disabled, empty-state glyph                |
| `scrim/top`       | `rgba(12,6,14,.96)` → `rgba(12,6,14,0)` | Poster meta gradient (see below)           |
| `chip/glass`      | `rgba(18,9,20,.5)` – `rgba(18,9,20,.6)` | Badges & controls floating over artwork    |

Category accents (used on the dot + badge of each card/hero):

- Cinéma — gold `#D4A24A`
- Théâtre — magenta `#C2478E`
- Musique — teal `#3E9E96`

**Single dark theme only.** There is no light mode.

### Typography

Loaded from Google Fonts:

```
Lalezar
Inter:wght@400;500;600;700
IBM Plex Sans Arabic:wght@300;400;500;600;700
Cairo:wght@400;700;900
JetBrains Mono:wght@400;500
```

| Role               | Family                   | Notes                                                                                                                                                            |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display / titles   | **Lalezar**              | Hero titles, screen H1s, empty-state headlines. 34–62px mobile→desktop, `line-height: 1` (1.05 for Arabic). Also the source of the standalone **ت** brand glyph. |
| UI / Latin body    | **Inter**                | 400/500/600/700. Body `15px/1.6`. Card title `600 14px`. Section head `700 18px`. Eyebrow `600 12px`, `letter-spacing: .08em`, uppercase.                        |
| Arabic UI body     | **IBM Plex Sans Arabic** | Swaps in for Inter whenever `lang="ar"`. Same sizes/weights.                                                                                                     |
| Arabic display alt | **Cairo**                | 900 for heavy Arabic display where Lalezar is too decorative.                                                                                                    |
| Mono / metadata    | **JetBrains Mono**       | 10–11px, `letter-spacing: .08em–.12em`. Timecodes, durations, "5G", placeholder captions, archive reference numbers.                                             |

### Spacing

4px base. Used steps: 2, 3, 4, 6, 8, 11, 12, 14, 18, 22, 24, 26, 28, 30, 32, 44, 48, 56, 64, 80.
Mobile screen gutter: **18px**. Desktop content gutter: **32px**. Section stack gap: **64px** (board), **22–28px** (in-screen).

### Radius

- `4px` micro
- `8px` badges / glass chips
- `16px` poster cards
- `18px` hero blocks, panels
- `40px` device frame
- `9999px` pills, CTAs, icon buttons, avatars

### Elevation

- Device / floating panel: `0 24px 60px -24px rgba(0,0,0,.8)`
- Gold CTA inner edge: `inset 0 0 0 1px rgba(42,26,6,.22)`
- No other shadows. Depth comes from surface-color steps, not shadow stacks.

### Iconography

**Phosphor Icons v2.1.1**, three weights loaded: `regular`, `bold`, `fill`. ~110 glyphs in use.

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
/>
<link
  rel="stylesheet"
  href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css"
/>
<link
  rel="stylesheet"
  href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css"
/>
```

Usage in the mocks: `<i class="ph ph-heart">`, `<i class="ph-fill ph-star">`. In a real app use `@phosphor-icons/react` (or the platform equivalent) — **do not ship the icon webfont**, it is a mock convenience. Convention: outline (`ph`) for rest, `ph-fill` for active/selected. Ratings and saved-hearts are always `ph-fill`.

### Motion

Transitions are short and utilitarian: `160ms ease` for color/opacity, `220ms cubic-bezier(.2,.7,.3,1)` for transform/size. Nothing above 300ms. No parallax, no entrance choreography on lists. Skeletons use a 1.4s linear shimmer. Respect `prefers-reduced-motion: reduce` by dropping to opacity-only.

---

## The Poster Card — the core repeated component

Every film / play / short is rendered by one card pattern. Get this right first; most screens are compositions of it.

- **Frame**: `aspect-ratio: 2/3`, `border-radius: 16px`, `overflow: hidden`. Mobile carousel width **150px**; desktop grid card **~180px**; grid `gap: 14px`.
- **Artwork**: fills the frame, `object-fit: cover`. Placeholder while empty:
  `repeating-linear-gradient(135deg,#31203A 0,#31203A 9px,#3A2742 9px,#3A2742 18px)` with a centered `JetBrains Mono` 10px `#7B6E83` caption reading `AFFICHE 2:3`.
- **Category badge**: top / inset-inline-start `8px`, `z-index: 2`, `padding: 3px 8px`, `radius: 8px`, `background: rgba(18,9,20,.55)`, `600 11px Inter`, white — preceded by a 6px round dot in the category accent color.
- **Watchlist heart**: top / inset-inline-end `8px`, 28px circle, `background: rgba(18,9,20,.5)`. Outline `ph-heart` at `rgba(255,255,255,.9)`; when saved, a `ph-fill ph-heart` at `#D4A24A` renders on top. 15px glyph.
- **Meta block — inside the frame** (this is deliberate; it guarantees legibility over any artwork): absolutely positioned `inset-inline: 0; bottom: 0`, `padding: 30px 11px 11px`, over
  `linear-gradient(to top, rgba(12,6,14,.96) 0%, rgba(12,6,14,.84) 42%, rgba(12,6,14,0) 100%)`.
  Stack order: rating (`600 11px`, `#E0B563`, `ph-fill ph-star` at `0.95em`, `vertical-align:-1px`) → title (`600 14px` white, single line, ellipsis) → venue · date (`400 11px` `#C9C0D0`, ellipsis) → price (`700 13px` `#E0B563`, format `{n} DT`).
  Desktop bumps to `padding: 34px 12px 12px`, title `600 15px`, rating/price `12px`/`14px`.
- **Every text run that mixes scripts or embeds numerals is wrapped in `<bdi>`.** Titles, venues, dates, prices. This is not optional — it is what keeps `الرصاصة السريعة · 12 DT` from reordering wrongly.
- **States**: hover raises the card 2px and lifts the scrim opacity slightly; focus shows the global 2px gold ring; press scales to `.985`.

---

## Screens / Views

### 1. `Tiween Screens.dc.html` — Handoff board

Not a product screen. A labeled contact sheet embedding the live mobile-FR, mobile-AR-RTL, and desktop renderings of the core screens side by side, each in a scrollable 390px device frame with pinned bottom nav. **Read this first** — it is the map. Sections: Accueil, Film detail, Search, Empty, Offline.

### 2. Accueil (Home)

**Purpose**: browse what's on, by category.
**Layout (mobile, 390px)**: status bar → header (wordmark left, 38px circular notifications button right, `#31203A` bg) → horizontally scrolling category tabs (`Tout` / `Cinéma` / `Théâtre` / `Musique`, active `700 15px` white with a 2px gold underline, inactive `500 15px` `#B0A6B8`, `gap: 18px`, bottom hairline `#2E1D37`) → stacked shelves.
**Shelves**: `Films à venir`, `Les mieux notés`, `Sélection musique`. Each = header row (`700 18px` white title, baseline-aligned `600 13px` `#E0B563` "Voir plus") + a horizontal poster-card scroller (`gap: 14px`, `padding-inline: 18px`, scrollbars hidden via `.hsc`).
**Desktop**: hero block replaces the first shelf — 300px tall, `radius: 18px`, giant Lalezar **ت** in `#D4A24A` at 300px bleeding off the inline-end edge, a directional scrim `linear-gradient(90deg, rgba(20,9,22,.94) 28%, rgba(20,9,22,.55) 55%, rgba(20,9,22,.15))`, then category badge → 62px Lalezar title → `500 16px` `#B0A6B8` credit line → two pill CTAs. Shelves become 5-up grids.
**Bottom nav (mobile)**: 5 items, pinned, `#1C0F20` with top hairline. Active = gold glyph + gold label; inactive `#8B7E94`. Min 44px targets.

### 3. Film detail

Mobile: full-bleed `3/4` hero (artwork or the ت placeholder), a top-to-bottom scrim `linear-gradient(180deg, rgba(20,9,22,.55) 0, rgba(20,9,22,.05) 24%, rgba(20,9,22,.35) 62%, rgba(20,9,22,.96))`, floating 40px circular back and share buttons at `rgba(18,9,20,.55)`. Overlaid at the bottom: category badge → `Lalezar 44px` title → `500 14px` `#B0A6B8` director. Below the fold: synopsis, showtimes by venue/date, cast strip, related shelf. Desktop uses a `16/10` hero at `radius:18px` with a 90° scrim and 58px title, content in a two-column split.

### 4. Search

Rounded search field (`#31203A`, pill, `ph-magnifying-glass` leading, clear button trailing), recent-search chips, results as a 2-up poster grid. Empty result state uses the shared empty pattern.

### 5. `Courts Métrages.dc.html` — Short-films directory

Hero pager (swipeable featured shorts, dot indicators), filter row (duration / year / language / festival chips), then a poster grid. Contains **all five async states** inline for reference: loading skeleton, empty, error, offline, success. FR + AR-RTL variants both shown.

### 6. `Court Métrage Détail.dc.html` — Short-film detail

Full-screen player-first layout: watch / trailer primary actions, a "Distinctions" row (festival awards as glass chips), streaming-platform links, cast & crew list, technical fact block in JetBrains Mono.

### 7. `Pièce Détail.dc.html` — Play booking detail

Théâtre category (magenta `#C2478E` accent). Représentations grouped by venue then date, each row showing time, hall, price band, availability. A **sticky bottom `Réserver` bar** (gold pill CTA, price summary on the inline-start side) sits above the safe area on mobile.

### 8. `Pièce Archive.dc.html` — Archival play record

For plays no longer running — the preservation mission. Duotone hero photo **plus** a 2:3 play poster, a structured fact sheet (creation date, company, director, cast, venues toured), production history prose, a vertical timeline of stagings, press excerpts, and a **"Me prévenir en cas de reprise"** notify toggle in place of a booking CTA.

---

## Interactions & Behavior

- **Language toggle (FR / ع)**: present on every screen. Switching sets `lang` and `dir` on the document root and swaps the UI font stack from Inter to IBM Plex Sans Arabic. **All layout uses CSS logical properties** (`inset-inline-start/end`, `margin-inline-*`, `padding-inline-*`, `border-start-*`) so RTL mirrors with zero per-direction overrides. Preserve this — do not reintroduce `left`/`right`.
- **Watchlist heart**: optimistic toggle, fill crossfades over 160ms, no layout shift (both glyphs are absolutely stacked in the same 28px circle).
- **Category tabs**: client-side filter, underline slides between tabs.
- **Horizontal scrollers**: native overflow scroll, snap to card start, scrollbars hidden.
- **Sticky booking bar** (`Pièce Détail`): appears once the représentations section enters the viewport.
- **Notify toggle** (`Pièce Archive`): persists per-play; switches label to "Vous serez prévenu·e".
- **Navigation**: bottom nav on mobile, side rail on desktop. Detail screens push over and expose a back affordance.

### The five async states (every list/detail screen implements all of them)

1. **Loading** — poster-shaped skeletons at the real card dimensions, shimmer, never a spinner.
2. **Empty** — 96px circle with `2px dashed #4A3556`, a Lalezar **ت** in `#6E6076` centered, `Lalezar 34px` white headline, `400 15px/1.6` `#B0A6B8` body capped at 280px, then one gold pill CTA that routes somewhere useful. Copy is warm and specific ("Aucun favori… pour l'instant"), never "No data".
3. **Error** — same shell, `ph-warning-circle`, retry CTA.
4. **Offline** — same shell, `ph-cloud-slash`, plus a persistent slim banner; cached content stays browsable (this is a PWA — offline is a first-class state, not a failure page).
5. **Success** — the content itself.

---

## State Management

Per screen:

- `lang: 'fr' | 'ar'` + derived `dir` — app-level, persisted.
- `activeCategory: 'tout' | 'cinema' | 'theatre' | 'musique'` — Accueil.
- `saved: Set<id>` — watchlist, app-level, persisted, optimistic writes.
- `status: 'loading' | 'empty' | 'error' | 'offline' | 'success'` — per data-fetching surface.
- `query`, `recentSearches[]` — Search.
- `filters: { duration, year, language, festival }` — Courts Métrages.
- `selectedRepresentation` — Pièce Détail, drives the sticky bar.
- `notifyOnRevival: boolean` — Pièce Archive.

Data shapes are readable in each file's logic class (`class Component extends DCLogic`) at the bottom — the mock arrays there give you the exact fields each card and detail view consumes (`title`, `titleAr`, `venue`, `date`, `price`, `rating`, `category`, `saved`, …).

---

## Accessibility floor (already met — keep it)

- WCAG AA contrast throughout; all gold-on-dark text uses `#E0B563`, never `#D4A24A`, for body sizes.
- Visible focus: 2px gold ring, 2px offset, on every interactive element.
- Touch targets ≥ 44×44.
- `<bdi>` around every mixed-script or numeral-bearing run.
- Full keyboard traversal of carousels and tabs.
- `prefers-reduced-motion` honored.

---

## Assets

- `design_files/assets/tiween-wordmark-gold.png` — the **توين** wordmark, gold with the ت counter knocked out in aubergine. For dark surfaces. 46px tall in headers, 38px on mobile.
- `design_files/assets/tiween-wordmark-duo.png` — the light-surface variant.
- The standalone **ت** used as a brand device is live Lalezar text at 260–300px, not an image.
- **All poster / hero artwork is a placeholder.** Every image slot is a reserved 2:3 (posters) or 3:4 / 16:10 (heroes) box with the striped fill and a mono caption. Real artwork is ready to drop in — ask the design owner. Do not ship the stripes.
- Fonts: Google Fonts (self-host in production). Icons: Phosphor v2.1.1 (use the native package for your platform).

---

## Files

```
design_files/
  Tiween Screens.dc.html        · handoff board — Accueil, Film detail, Search, Empty, Offline
  Courts Métrages.dc.html       · short-films directory + all five states, FR & AR-RTL
  Court Métrage Détail.dc.html  · short-film detail
  Pièce Détail.dc.html          · play booking detail
  Pièce Archive.dc.html         · archival play record
  support.js                    · mock runtime — ignore, do not port
  assets/                       · wordmarks
```

Open any `.dc.html` in a browser to see the design running. Read the markup for exact values; read the logic class for data shape and interaction state.

## Not yet designed

Splash, Ticketing, Checkout, Confirmation, QR ticket, Mes événements. If you need them before the design catches up, follow the token table and the poster-card / empty-state patterns above rather than inventing new ones.
