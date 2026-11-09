---
name: Tiween
description: Tunisia's cultural compass, a poster-led, trilingual discovery PWA in Gold Leaf on Midnight Aubergine.
colors:
  midnight-aubergine: "#241326"
  aubergine-deep: "#161015"
  surface: "#31203A"
  surface-raised: "#3E2A48"
  hairline: "#2E1D37"
  border: "#4A3556"
  foreground: "#FFFFFF"
  text-secondary: "#C9C0D0"
  muted-foreground: "#B0A6B8"
  gold-leaf: "#D4A24A"
  gold-ink: "#2A1A06"
  gold-tint: "#E0B563"
  magenta-rose: "#E5478A"
  destructive: "#FF8A8A"
  success: "#5BD08A"
  warning: "#E8B24C"
  cat-cinema: "#E0B563"
  cat-theatre: "#E5478A"
  cat-shorts: "#5FD0C2"
  cat-music: "#7B9CFF"
  cat-art: "#C98AE8"
  daylight-background: "#FFFFFF"
  daylight-foreground: "#241326"
typography:
  display:
    fontFamily: "Lalezar, IBM Plex Sans Arabic, Inter, sans-serif"
    fontSize: "clamp(44px, 8vw, 72px)"
    fontWeight: 400
    lineHeight: 0.98
  headline:
    fontFamily: "Inter, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
  title:
    fontFamily: "Inter, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-long:
    fontFamily: "Inter, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, IBM Plex Sans Arabic, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  chip: "8px"
  input: "8px"
  row: "12px"
  card: "16px"
  sheet: "24px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.gold-leaf}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.gold-tint}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-daylight:
    backgroundColor: "{colors.midnight-aubergine}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.pill}"
    size: "40px"
  chip-category:
    backgroundColor: "{colors.aubergine-deep}"
    textColor: "{colors.cat-shorts}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "4px 11px"
  card-poster:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
  info-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.row}"
    padding: "13px 15px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.input}"
    padding: "0 12px"
    height: "44px"
---

# Design System: Tiween

<!-- Scope: apps/client (public site) only. The Strapi admin uses apps/strapi/DESIGN.md (Strapi Design System v2); never mix the two. Canonical source: _bmad-output/project-planning-artifacts/ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md (spine wins on conflict). Tokens below are the spine values reconciled with the shipped shorts layer in src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css. -->

## Overview

**Creative North Star: "Aubergine Theatre with Gold Leaf Accent"**

A single deep-jewel dark theme in the register of a playbill or festival catalogue, not a streaming app. The Midnight Aubergine field recedes so that poster artwork is the hero of every discovery surface; burnished Gold Leaf appears only where the visitor can act. Category color-coding (cinema, théâtre, courts, concert, expo) turns a colorful feed into wayfinding, so the palette reads designed rather than noisy. The mood is premium, cultural and quietly confident: cultural excitement with effortless confidence.

Density is mobile-first and thumb-zone aware: primary actions sit in the bottom 60% of the screen, controls are at least 44px, and long pages end in a sticky action bar. Depth comes from stepping surface color, never from drop shadows in product chrome. Arabic, French and English are designed together; every layout uses logical properties and mirrors cleanly in RTL.

**Implementation status (2026-11-09).** This identity is now global. The shadcn variables in `src/styles/globals.css` (`--background`, `--card`, `--primary`, `--ring`, `--success`, …) and the `@theme` utilities in `src/styles/theme.css` (`bg-aubergine`, `bg-aubergine-deep`, `text-gold-leaf`, `text-gold-tint`, `bg-gold-ink`, `bg-surface`, `bg-surface-light`, `text-success`) carry the values in this file, so every page and every shadcn primitive (`src/components/ui/*`) reads Gold Leaf × Aubergine. The retired teal `#032523` + yellow `#F8EB06` tokens and their `tiween-green` / `tiween-yellow` utilities are deleted; do not reintroduce them. The short-film detail page keeps its route-scoped token block (`.root[data-tiween-shorts-detail]` in `ShortFilmDetail.module.css`) with the same values. Use semantic utilities, never raw hex, in components.

**Known drift in the shadcn primitives (2026-11-09 scan).** The colors are right everywhere, but four primitives in `src/components/ui/` still carry stock shadcn geometry that this file overrides. `Button` is `rounded-md` (6px), 40px tall, `font-medium`, with a `shadow`; the `outline` variant fills gold on hover. `Input` is 36px, 6px radius, `shadow-xs`. `Card` is `rounded-xl` (12px) with `shadow-sm`. The destructive `Badge` puts white text on #FF8A8A (about 1.9:1, fails AA). The shorts detail layer already matches this file. Until the primitives are fixed, new public screens apply the Components section below through `className` (pill, 48px or 44px, no shadow), and never copy the stock values.

**Key Characteristics:**

- Dark-only Midnight Aubergine field; one scoped daylight exception (QR ticket, checkout).
- Gold Leaf is the single action and selection signal.
- Posters at 2:3 portrait lead every feed; chrome stays secondary.
- Category colors key the taxonomy on badges and filter dots only.
- Elevation by surface-color shift, not shadow.
- Soft geometry: 16px cards, 8px chips, full-pill CTAs.
- RTL-first logical layout with mixed-script isolation.

## Colors

A deep plum-black field with one burnished gold action color, a magenta secondary, and five category hues used only for wayfinding.

### Primary

- **Gold Leaf** (#D4A24A): primary action fills (watch, reserve, confirm), active and selected states, the recommended star, the active bottom-nav icon, and focus rings on dark controls. Also legal as text on the field (7.6:1).
- **Gold Ink** (#2A1A06): the only text color allowed on a Gold Leaf fill (7.3:1).
- **Gold Tint** (#E0B563): the text-safe gilt for links, secondary-button labels and informational text on dark (9.2:1).

### Secondary

- **Magenta Rose** (#E5478A): secondary highlight and the théâtre category. Use as a fill under white text at large sizes only (3.75:1); never as body text and never as a page background.

### Tertiary

- **Category hues**: cinema Gold Tint (#E0B563), théâtre Magenta Rose (#E5478A), courts teal (#5FD0C2), concert periwinkle (#7B9CFF), expo orchid (#C98AE8). They appear on the card category badge and the filter-chip dot only. Courts teal carries the retired Tiween-green DNA as a cameo.

### Neutral

- **Midnight Aubergine** (#241326): the page field and sticky-bar base; also the daylight CTA fill and daylight ink.
- **Aubergine Deep** (#161015): behind hero media and as the base of translucent scrims over artwork (shipped shorts detail).
- **Surface** (#31203A): cards, info rows, icon-button discs, inputs.
- **Surface Raised** (#3E2A48): hover and subtle elevation over Surface.
- **Hairline** (#2E1D37): the faint divider under translucent headers.
- **Border** (#4A3556): chip borders, info-row strokes, the sticky-bar top rule.
- **Foreground** (#FFFFFF): primary text (17.6:1 on the field).
- **Text Secondary** (#C9C0D0): long-form reading text such as synopses (10:1).
- **Muted Foreground** (#B0A6B8): metadata, roles, timestamps, resting icons (7.5:1).
- **Semantic**: destructive #FF8A8A (7.7:1, lightened because #EF4444 muddies on plum), success #5BD08A (9.1:1), warning #E8B24C.
- **Daylight**: background #FFFFFF with Midnight Aubergine ink, for the QR ticket and checkout only.

### Named Rules

**The Gold Means Go Rule.** Gold Leaf marks something the visitor can act on, or the state they just chose. It never decorates a non-actionable highlight.

**The Dark Ink Rule.** A gold fill always takes Gold Ink (#2A1A06). White on gold is 2.3:1 and is banned.

**The Daylight CTA Rule.** On a white daylight surface the primary CTA becomes a Midnight Aubergine pill with white text; gold shrinks to a small icon or check accent (gold on white is about 1.6:1).

**The Category Cameo Rule.** Category hues live on the badge and the filter dot. They never tint page chrome and never override the gold action signal.

## Typography

**Display Font:** Lalezar 400 (Latin and Arabic subsets, `--font-lalezar`)
**Body Font:** Inter 400 to 700 for Latin (`--font-inter`); IBM Plex Sans Arabic 400 to 700 for Arabic (`--font-plex-arabic`, Arabic subset only). All three load through `next/font` in `src/lib/fonts.ts`, and their variables sit on `<html>` so the `:root` stacks in `theme.css` resolve them.

**Character:** a single-weight theatrical display face for brand moments, paired with a neutral humanist sans and an Arabic partner of matching weight and x-height, so mixed Arabic and Latin runs on one line read as one system.

As of 2026-11-09 (owner decision), IBM Plex Sans Arabic is the Arabic body and UI face app-wide, replacing Noto Sans Arabic, which is no longer loaded. Every page reads `Inter, IBM Plex Sans Arabic` (Arabic glyphs fall through to Plex); under `lang="ar"` the stack flips to `IBM Plex Sans Arabic, Inter` so Arabic copy leads in Plex and Latin runs stay in Inter. The spine also names Cairo 700/900 for long Arabic display copy; Cairo is not loaded, so it appears in no stack here.

### Hierarchy

- **Display** (Lalezar 400, clamp(44px, 8vw, 72px), 0.98): the work title on detail heroes, splash, empty-state headlines, big brand numerals. Brand moments only. Long Arabic display copy drops to IBM Plex Sans Arabic 700 at Headline size rather than stretching Lalezar.
- **Headline** (Inter 700, 24px, 32px): routine in-app screen headers. Arabic uses IBM Plex Sans Arabic 700.
- **Title** (Inter 700, 18px): section titles on detail pages (Synopsis, Cast, Awards, Where to watch).
- **Body** (Inter 400, 16px, 1.5): UI copy and forms; 16px is the body floor.
- **Body Long** (Inter 400, 15px, 1.65): synopses and editorial paragraphs, capped at 660px measure.
- **Label** (Inter 600, 11px, 1.4): chips and badges (format, genre, duration, category).

Scale steps in use (px size/line-height): 12/16, 14/20, 16/24, 18/28, 20/28, 24/32, 30/36, 36/40.

### Named Rules

**The Brand Moment Rule.** Lalezar appears only on heroes, splash, empty states and marketing. Routine headers are Inter (or IBM Plex Sans Arabic) 700.

**The One Line, One System Rule.** Every foreign-script run inside a line (an Arabic title with `VOST`, a venue, `12,20 DT`) is isolated in `<bdi>` or `dir="auto"` so it does not reorder.

## Layout

A 4px base scale (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64). Mobile under 640px: 4 columns, 16px gutters and margins. Tablet 640 to 1024px: 8 columns, 24px. Desktop above 1024px: 12 columns, max container 1280px, 24px gutters. Detail pages hold a narrower 920px reading column with a 16px side gutter; long text is capped at 660px.

Thumb-zone first: primary actions live in the bottom 60% of the screen. Touch targets are 44px minimum and 48px preferred for primary actions, with at least 8px between targets. The bottom nav is 64px fixed plus the iOS safe area, and hides during checkout and when the keyboard is open. Detail pages end in a fixed sticky action bar that respects `env(safe-area-inset-bottom)` and uses `100dvh`, not `100vh`.

Horizontal rails (cast, related works) scroll with inline scroll-snap; poster grids step 2, 3, 4, 5, 6 columns from mobile to wide desktop with 16px gaps.

All spacing and positioning use logical properties (`padding-inline`, `inset-inline-start`, `margin-inline-end`, start/end corners), so Arabic RTL mirrors with no per-direction overrides. Directional icons mirror; Arabic uses Western digits and `DD/MM/YYYY`; time is `HH:MM` outside French (`15h00` is French only).

## Elevation & Depth

Elevation is expressed by stepping surface color, not by shadow: Surface (#31203A) cards sit on the Midnight Aubergine field, and hover lifts them to Surface Raised (#3E2A48). Product chrome carries no drop shadows. The only depth effects in shipped code are functional: a translucent aubergine bar with a 12px backdrop blur for sticky headers and action bars, gradient scrims from Aubergine Deep over hero and poster art so text stays legible, a 1px inner edge on gold fills, a soft gold halo ring around the hero play disc, and the global focus ring (a 3px Gold Leaf ring at the control's edge with a 2px field-colored band beyond it, drawn with `box-shadow` in `globals.css`; shadcn primitives and feature components use `ring-3` to match). Marketing collateral may use shadow freely.

Motion is short and functional: color, background and opacity changes run 160ms ease; lifts and scales run 220ms `cubic-bezier(0.2, 0.7, 0.3, 1)`; the global duration tokens are 150, 200 and 300ms. Under `prefers-reduced-motion` every transition and animation collapses to 0.01ms.

### Named Rules

**The Flat Chrome Rule.** No `box-shadow` for elevation in product UI. If something needs to sit above, shift its surface color or put it on a translucent blurred bar. Rings (focus, gold inner edge, play-disc halo) are the only permitted `box-shadow` uses.

## Shapes

Generous, soft geometry. Poster cards and poster frames are 16px; info rows (awards, streaming providers) are 12px; chips, badges and inputs are 8px; bottom sheets take 24px on their top corners. Every primary and secondary CTA, icon-button disc, cast avatar and the taa monogram are fully round. Posters are 2:3 portrait in feeds and rails; detail heroes are wide. When a record has no media, a diagonal two-tone aubergine stripe fills the frame as reserved artwork instead of a fake image.

## Components

### Buttons

- **Shape:** full pill (9999px) for every CTA.
- **Primary:** Gold Leaf fill, Gold Ink label, 700 weight, 48px tall (52px in the detail action row), full-width on mobile, with a 1px inner Gold Ink edge at 22% opacity.
- **Hover / Focus:** hover drops opacity to 0.92; press scales to 0.98; focus is a 3px Gold Leaf ring against the control's edge, backed by a further 2px band of the field color (the global `:focus-visible` rule), but a 3px dark (#241326) or white ring on gold-filled controls. Loading swaps the label for a spinner after 200ms; disabled is 50% opacity.
- **Secondary:** transparent with a 1 to 1.5px Gold Leaf border and Gold Tint label, 44px; hover adds a 12% gold wash.
- **Tertiary / Ghost:** Muted Foreground text, 40px, no fill.
- **Daylight primary:** Midnight Aubergine fill with white text, same pill.
- **Destructive:** destructive fill, always behind a confirm dialog.

### Chips

- **Style:** 8px radius, 11px label at 600, padding 4px 11px. The category chip sits on a translucent Aubergine Deep scrim with a darkened category-hue border, a 6px category dot, and category-hue text.
- **State:** format chips (`VOST`, `VF`, `3D`, `2D`), genre, duration, `Complet` (sold out) and `Fonctionne hors ligne` (success). A selected filter chip takes Gold Leaf plus a check glyph, never color alone.

### Cards / Containers

- **Corner Style:** 16px on poster cards, 12px on info rows.
- **Background:** Surface (#31203A); hover to Surface Raised.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** info rows take a 1px Border (#4A3556) stroke; poster cards are borderless over the art.
- **Internal Padding:** info rows 13px by 15px; poster cards overlay a bottom scrim with 11px padding for title and meta.
- **EventCard / ShortFilmCard:** 2:3 poster, then category badge, title, venue and date (or director and year), then the watchlist heart (fills gold when saved) and price in `12,20 DT` form. Variants default, compact, featured. Related-work cards lift 2px on hover and press to 0.985.

### Inputs / Fields

- **Style:** Surface fill, 1px Border stroke, 8px radius, 44px tall, Foreground text, Muted Foreground placeholder. The shadcn `Input` takes its colors from the global tokens but is still 36px with a 6px radius, so set `h-11 rounded-lg` (44px, 8px) where it is used until the primitive is fixed.
- **Focus:** 3px Gold Leaf ring.
- **Error / Disabled:** destructive text with an icon and a translated `t('errors.<CODE>')` message; disabled at 50% opacity.

### Navigation

- **Bottom nav (mobile):** four thin-line monochrome icons, Accueil, Recherche, Billets, Compte, 48px targets in a 64px bar. Active is a solid Gold Leaf icon with its label; a red dot marks notifications.
- **Header:** sticky translucent aubergine bar with a 12px blur and a hairline bottom rule; the gold horizontal lockup sits centered; 40px icon discs inside 44px targets.

### Short-Film Detail Hero (signature)

A wide hero (clamp 440 to 580px) of the backdrop over Aubergine Deep, with a bottom-up scrim, a 74px Gold Leaf play disc with a 10px soft gold halo, the category chip row, and the Lalezar title. When artwork is missing, an oversized gold taa glyph sits at the inline end over the reserved stripe. Below it: primary watch pill, secondary trailer pill and a 52px round watchlist heart; then sections for synopsis, awards, where to watch, cast rail and related works; a fixed sticky bar repeats the watch CTA.

### Ticket QR (dormant)

Daylight surface: white field, black-on-white QR, mono ticket ID. Ticketing is feature-flagged off; do not surface it in v1.

## Do's and Don'ts

### Do:

- **Do** reserve Gold Leaf (#D4A24A) for actions and active state, and route links and info text through Gold Tint (#E0B563).
- **Do** keep poster art the visual hero of every discovery surface, at 2:3 portrait in feeds.
- **Do** use logical properties and start/end corners so RTL flips cleanly, and mirror directional icons.
- **Do** wrap mixed-script runs in `<bdi>` or `dir="auto"`.
- **Do** show Arabic with Western digits and `DD/MM/YYYY`, formatted through `lib/dates.ts`.
- **Do** pair every status color with an icon and text (sold out, offline, error, selected check, recommended star).
- **Do** declare new shorts-surface colors inside the scoped token block, never as raw hex in rules.

### Don't:

- **Don't** use Lalezar for routine in-app headers.
- **Don't** let gold signal a non-actionable highlight.
- **Don't** add drop shadows to product chrome; shift surface color instead.
- **Don't** rely on color alone for status.
- **Don't** bring magenta into page chrome or use it as body text.
- **Don't** put white text on a gold fill (2.3:1).
- **Don't** put a gold focus ring on a gold-filled control, or draw any focus ring thinner than 3px.
- **Don't** use a gold CTA on a daylight or white surface (about 1.6:1).
- **Don't** use Strapi Design System components, indigo #4945FF, or the 4px-everything radius here; that is the admin's system.
- **Don't** extend the retired teal #032523 and yellow #F8EB06 tokens to new work.
