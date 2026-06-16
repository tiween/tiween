---
name: Tiween B2C
status: final
updated: 2026-06-16
ui_system: shadcn/ui + Tailwind v4 (@theme), Next.js 15 App Router
sources:
  - ux-design-specification.md (legacy, 2025-12-25)
  - imports/brandbook_tiween.pdf
  - imports/tiween_logo-composition.pdf
  - imports/TIWEEN_*.png (28+ mockups)

colors:
  # Core product palette — dark-first single theme (REVISED 2026-06-16: Gold Leaf × Aubergine)
  background: "#241326" # Midnight Aubergine — page field
  foreground: "#FFFFFF" # primary text on dark (17.6:1 — AAA)
  surface: "#31203A" # cards, modals
  surface-raised: "#3E2A48" # hover / subtle elevation
  border: "#4A3556" # hairline dividers / chip borders on dark
  muted-foreground: "#B0A6B8" # secondary text (7.5:1 — AA)
  # Accent — GOLD LEAF (single action accent; replaces yellow+cobalt two-accent system)
  primary: "#D4A24A" # Gold Leaf — PRIMARY ACTION + ACTIVE/SELECTED STATE + recommended ✲
  primary-foreground: "#2A1A06" # dark ink on gold fill = 7.3:1 (white on gold FAILS at 2.3:1 — never use)
  gold-tint: "#E0B563" # lighter gilt for link/secondary TEXT on dark (9.2:1)
  link: "#E0B563" # gold-tint is the link/info text color (gold #D4A24A also valid as text, 7.6:1)
  # Secondary / category accent
  secondary: "#E5478A" # Magenta Rose — category(théâtre) + secondary highlight; FILL under white (3.75:1 large) — not body text
  secondary-foreground: "#FFFFFF"
  # Semantic (tuned for the aubergine field)
  destructive: "#FF8A8A" # 7.7:1 on field (lightened from #EF4444, which muddies on plum)
  success: "#5BD08A" # 9.1:1
  warning: "#E8B24C" # amber
  # Category color-coding (directory wayfinding — RA/Avignon discipline)
  cat-cinema: "#E0B563" # gold
  cat-theatre: "#E5478A" # magenta rose
  cat-shorts: "#5FD0C2" # teal (carries the old Tiween-green DNA as a category cameo)
  cat-music: "#7B9CFF" # periwinkle
  cat-art: "#C98AE8" # orchid
  # Daylight surfaces (QR / checkout high-brightness variant)
  daylight-background: "#FFFFFF"
  daylight-foreground: "#241326" # aubergine ink on white

typography:
  display: "Lalezar" # BRAND MOMENTS ONLY (splash, hero, empty states, marketing, big numerals)
  heading-latin: "Inter" # in-app screen headers (700) — approved over Lalezar for scannability
  heading-arabic: "IBM Plex Sans Arabic" # AR in-app headers (700) — geometric, pairs with Inter
  body-latin: "Inter" # 400/500/600/700
  body-arabic: "IBM Plex Sans Arabic" # 300–700 — upgraded from Noto (warmer, on-brand for AR-first)
  display-arabic-fallback: "Cairo" # long AR brand-moment copy where Lalezar is illegible
  mono: "JetBrains Mono" # ticket IDs, technical
  base-size: "16px"
  body-line-height: "1.5"

rounded:
  card: "16px"
  chip: "8px"
  input: "8px"
  cta: "9999px" # primary CTA = full pill
  sheet: "24px" # bottom-sheet top corners
  monogram: "9999px" # logo disc

spacing:
  base: "4px"
  scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
  touch-target-min: "44px"
  touch-target-preferred: "48px"
  bottom-nav-height: "64px"
  container-max: "1280px"

components:
  - Button
  - Card
  - Badge
  - Tabs
  - Dialog
  - Sheet
  - Input
  - Select
  - Form
  - Toast
  - Skeleton
  - Calendar
  - EventCard
  - ShowtimeButton
  - TicketQR
  - BottomNav
  - SeatSelector
  - FilmHero
---

# Tiween — Visual Identity (DESIGN.md)

> **Tiween is Tunisia's cultural compass** — a discovery-first, mobile-first PWA for cinema, theater, short films, concerts, and exhibitions. This spine owns _how it looks_. [EXPERIENCE.md](./EXPERIENCE.md) owns _how it works_ and references these tokens by name. **The spines win on conflict** with any mock, import, or upstream doc.
>
> Status: this is the locked identity a design-handoff tool will **refine, not replace**. It already carries three approved evolutions of the inherited brand (two-accent color system, restrained display-font usage, daylight surfaces). See [`producer-prompt.md`](./producer-prompt.md).

## Brand & Style

**Direction:** _Aubergine Theatre with Gold Leaf Accent._ A single deep-jewel dark theme — Midnight Aubergine field, burnished Gold Leaf action — where poster artwork leads and gilt accents signal action. The register is **playbill / festival-catalogue**, not streaming-app: premium, cultural, theatrical. Competitive scan (2026-06-16: Letterboxd, Mubi, Dice, RA, Avignon, Teskerti, Fever) confirmed film/event listings cluster in "safe poster-led dark"; the culture-defining brands (RA, Avignon) go boldly editorial. Tiween claims the open **culture-loud** quadrant — disciplined by category color-coding so the palette reads designed, not noisy. _(Revised 2026-06-16 from the earlier Tiween-Green + Yellow identity; gold leaf is the matured, premium descendant of the brand yellow.)_

**Signature emotion:** _Cultural Excitement + Effortless Confidence_ — the user should feel they've found a secret weapon for cultural life in Tunisia. Confidence over confusion · trust over skepticism · excitement over anxiety · belonging over isolation.

**Logo.** A circular **taa (ت) monogram** — a gold-on-aubergine / aubergine-on-gold disc that reads as both an Arabic letter and a smiley face. Used as app avatar and favicon. The horizontal lockup `tiween.com` + monogram appears **gold, centered, on the aubergine field** in the app header. Reversible: aubergine-on-gold, gold-on-aubergine, white-on-aubergine, aubergine-on-white. A tiled-monogram pattern serves as a textile/background motif (marketing surfaces). Designed by Amen Okja / BLITS. _(Revised 2026-06-16 from the original yellow-on-teal mark; the gilt monogram is the matured form of the same shape.)_

**Two voice registers** (microcopy specifics live in EXPERIENCE.md):

- **Marketing voice** — bold, playful, Tunisian-vernacular ("_tiween el forja el lilla?_"). High-saturation, streetwear energy. Lives on promo/social/event collateral.
- **Product voice** — calm, clear, reassuring, French-default ("_Merci de votre confiance !_"). **Product voice governs all in-app screens.**

**Experience principles:** Discovery First · 30-Second Value · One-Tap Power · Offline Confidence · Bilingual Seamlessness · Cultural Preservation.

## Colors

Single **dark theme** — _Gold Leaf × Aubergine_ (revised 2026-06-16). No light-mode toggle (the _daylight surfaces_ below are a scoped exception, not a global theme). All ratios below are computed against the field/surface, not estimated.

| Token                | Hex       | Role                                                                                                             |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `background`         | `#241326` | Page field — Midnight Aubergine                                                                                  |
| `foreground`         | `#FFFFFF` | Primary text on dark (17.6:1 — AAA)                                                                              |
| `surface`            | `#31203A` | Cards, modals (white text 15.0:1)                                                                                |
| `surface-raised`     | `#3E2A48` | Hover / subtle elevation                                                                                         |
| `border`             | `#4A3556` | Hairline dividers, chip borders on dark                                                                          |
| `muted-foreground`   | `#B0A6B8` | Secondary text (7.5:1 on field — AA)                                                                             |
| `primary`            | `#D4A24A` | **Gold Leaf — primary action + active/selected + recommended ✲.** As text on field = 7.6:1 (AA)                  |
| `primary-foreground` | `#2A1A06` | Dark ink on gold fill = 7.3:1. **Never white on gold (2.3:1 — fails).**                                          |
| `gold-tint` / `link` | `#E0B563` | Link / info / secondary TEXT on dark (9.2:1 — AAA). The text-safe gilt.                                          |
| `secondary`          | `#E5478A` | Magenta Rose — secondary highlight + théâtre category. **Fill under white** (3.75:1, large only — not body text) |
| `destructive`        | `#FF8A8A` | Errors (7.7:1 on field — lightened from `#EF4444`, which muddies on plum)                                        |
| `success`            | `#5BD08A` | Confirmation (9.1:1)                                                                                             |
| `warning`            | `#E8B24C` | Alerts (amber)                                                                                                   |

**Single-accent rule.** Gold Leaf carries action/active/selected/recommended — one signal, no collision. The "recommended" ✲ star is gold (a promotion of the item, action-adjacent). Never use gold for a non-actionable decorative highlight. Magenta is a _secondary_ accent (category + occasional highlight), not a second action color.

**Gold has two uses, one rule.** `primary #D4A24A` works as **both** a fill (with dark `primary-foreground` ink) **and** as text on the dark field (7.6:1). For lighter link/secondary text use `gold-tint #E0B563` (9.2:1). The single hard rule: **never white text on a gold fill** (2.3:1) — gold fills always take the dark ink.

**Category color-coding (directory wayfinding).** A browse-first directory color-keys its taxonomy so a colorful feed reads as navigation, not noise (the RA/Avignon discipline): `cat-cinema #E0B563` (gold) · `cat-theatre #E5478A` (magenta) · `cat-shorts #5FD0C2` (teal — carries the old Tiween-green DNA as a cameo) · `cat-music #7B9CFF` (periwinkle) · `cat-art #C98AE8` (orchid). Category color appears on the card badge + filter-chip dot only; it never overrides the gold action signal.

**Daylight CTA.** On white daylight surfaces, the gold CTA loses contrast (gold-on-white ≈ 1.6:1). The primary CTA there is an **aubergine `#241326` fill with white text** (full pill, same shape); reserve gold for a small accent (icon/check) only.

**Daylight surfaces.** The **Ticket-QR screen and Checkout** render a high-brightness variant (`daylight-background #FFFFFF`, `daylight-foreground #241326`, black-on-white QR) for outdoor scanning. Everything else stays dark. See EXPERIENCE.md › State Patterns.

## Typography

Four families, two scripts. **Lalezar is reserved for brand moments** (approved improvement) — using a heavy display face for every in-app header hurts scannability when mixed with Inter body.

| Role             | Family                             | Use                                                                      |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Display          | **Lalezar** (400)                  | Splash, hero, empty states, marketing, large brand numerals. AR + Latin. |
| Heading (Latin)  | **Inter** (700)                    | Routine in-app screen headers                                            |
| Heading (Arabic) | **IBM Plex Sans Arabic** (700)     | Routine AR in-app headers                                                |
| Body (Latin)     | **Inter** (400–700)                | Body, UI, forms                                                          |
| Body (Arabic)    | **IBM Plex Sans Arabic** (300–700) | AR body & UI — geometric, pairs with Inter                               |
| Mono             | **JetBrains Mono** (400)           | Ticket IDs (`TIW-2024-XXXX`), technical                                  |

> **Arabic font upgraded** Noto Sans Arabic → **IBM Plex Sans Arabic** (approved). Plex shares a humanist-geometric skeleton with Inter, so AR + Latin runs on one line read as one type system — reinforcing the bidi/mixed-script rule. It carries the AR header weight too, so Cairo's only remaining role is the Lalezar brand-moment fallback below.

**Scale (px size/line-height):** xs 12/16 · sm 14/20 · base 16/24 · lg 18/28 · xl 20/28 · 2xl 24/32 · 3xl 30/36 · 4xl 36/40. Minimum 16px body; 1.5 line-height. Visual hierarchy: L1 full-bleed hero → L2 section header → L3 card title/metadata → L4 secondary/timestamp.

**Arabic display fallback.** Lalezar supports Arabic, but for AR brand moments with **multi-word or long copy** (empty states, hero sentences) prefer **Cairo 700/900** for legibility — reserve Lalezar (single weight, decorative) for short AR brand marks. AR font chain: `Lalezar → Cairo → IBM Plex Sans Arabic`. Latin chain: `Lalezar → Inter`.

## Layout & Spacing

4px base scale: `0 4 8 12 16 20 24 32 40 48 64`. Mobile-first thumb-zone layout — primary actions in the bottom 60% of the screen.

| Breakpoint      | Grid                   | Gutter / Margin |
| --------------- | ---------------------- | --------------- |
| Mobile <640     | 4 col                  | 16 / 16         |
| Tablet 640–1024 | 8 col                  | 24 / 24         |
| Desktop >1024   | 12 col, max **1280px** | 24 / 24         |

**Touch targets:** 44px min, 48px preferred for primary, 8px min gap. **Bottom nav:** 64px fixed + iOS safe-area; hidden during checkout and when the keyboard is open.

## Elevation & Depth

**Elevation is expressed by surface-color shift, not shadow.** `surface #31203A` cards sit on the `#241326` field; hover lifts to `surface-raised #3E2A48`. No drop shadows in product chrome. (Marketing collateral may use shadow freely.) EventCard hover adds a subtle overlay gradient over poster art.

## Shapes

Generous, soft geometry. Cards `16px`, chips/badges/inputs `8px`, **primary CTA = full pill (`9999px`)**, bottom sheets `24px` top corners, logo disc fully round. SeatSelector glyphs: ○ available · ● selected (gold) · × taken (gray) · ◆ wheelchair/accessible.

## Components

> Visual specs here; behavioral specs (states, focus order, interaction) live in [EXPERIENCE.md › Component Patterns](./EXPERIENCE.md). All extend shadcn/ui primitives.

- **EventCard** — discovery feed card. Poster **2:3 portrait** → category/rating badge → title → venue • date → watchlist heart + price (DT). Variants `default | compact | featured`. Dark `surface` bg, `card` radius. Watchlist heart fills gold when saved. Category badge uses the `cat-*` color for its type (cinema/théâtre/courts/concert/expo). **Bidi:** the title (Arabic) and Latin runs (`VOST`/`VF`, venue, `12,20 DT`) coexist on RTL lines — wrap each foreign run in `<bdi>` / `dir="auto"` so it doesn't reorder. **Currency:** `12,20 DT` — decimal comma, space before `DT`, isolated as a Latin run; trails the price in both directions.
- **ShowtimeButton** — selectable tile. Format badge at the **top-start** corner (mirrors in RTL) (`VOST` `VF` `3D` `2D`) → time (e.g. `15h00`/`15:00`) → end-time → venue. Gold star marks the recommended showtime. States: default (surface), hover (raised), **selected (gold border + fill + dark ink + a check glyph ✓ — never color alone)**, unavailable (strikethrough), sold-out (`Complet`, `aria-disabled`). On selected/gold-filled controls the focus ring is **dark `#241326` (or white), not gold** (a gold ring is invisible on gold). `chip` radius.
- **TicketQR** — **daylight surface** (white field, black-on-white QR) for scannability. Large QR → ticket # in mono → title → date • time • venue → qty → `Ajouter au Wallet` / `Partager`. States: valid (success accent), scanned (check overlay), expired (dimmed), offline ("hors ligne — toujours valide").
- **BottomNav** — 4 thin-line monochrome icons: `Accueil` · `Recherche` · `Billets` · `Compte`. Active = solid **gold** icon + label. Red dot = notification. 48px targets, 64px height.
- **FilmHero** — wide image pager (e.g. `01/05`), title + director, meta chips, `Réserver` pill (primary) + `Voir la bande annonce` (outline).
- **SeatSelector** — visual seat grid, glyphs above, arrow-key navigable.

**Button hierarchy.** Primary = gold fill, dark-aubergine ink (`primary-foreground #2A1A06`), **48px**, full-pill, full-width on mobile (`Réserver`, `Acheter`, `Confirmer`) — on daylight surfaces becomes aubergine fill + white text. Secondary = gold outline + `gold-tint` text, 44px. Tertiary = ghost `muted-foreground` text, 40px. Link = **`link #E0B563`** text (gold-tint). Destructive = red fill, requires confirm dialog. Focus ring = `primary` gold on dark controls, **dark/white on gold-filled controls**. States: hover = +brightness; pressed = scale 0.98; disabled = 50% opacity; loading = spinner replaces label (after 200ms).

**Badges/chips.** Format `VOST/VF/3D/2D`, genre, duration, `Complet` (sold-out), offline `Fonctionne hors ligne` (success green).

## Iconography & Imagery

**Poster-forward.** Film/event posters render **2:3 portrait** in feeds and carousels (corrects the legacy "16:9"); film-detail uses a wide hero pager. Progressive load: blur placeholder → sharp.

**Signature imagery device:** **duotone cut-out portrait** — a B&W photo with the taa-monogram or a brand shape carved out in gold (see brand book "Communion" poster). This is the hallmark editorial treatment for featured/hero content.

**Icons:** thin-line monochrome set (home, search, ticket, account, map-pin, calendar, chevron, kebab ⋮). Directional icons **mirror in RTL**. Status is always conveyed by **icon + text, never color alone**.

## Do's and Don'ts

**Do**

- Reserve gold for actions and active state; route links/info through `link #E0B563` (gold-tint text). Use `secondary #E5478A` (magenta) only as a secondary/category accent, never as a second action color.
- Keep poster art the visual hero on every discovery surface.
- Use the daylight surface for QR/checkout; keep everything else dark; use the **aubergine CTA** on those white surfaces.
- Use logical properties (`ps/pe/ms/me`) and **start/end corners** so RTL flips cleanly; mirror directional icons.
- Wrap mixed-script runs in `<bdi>`/`dir="auto"` (Arabic title + Latin badges/venue/currency on one line).
- Show Arabic with **Western numerals** and `DD/MM/YYYY` (per project-context); time as `HH:MM` outside French (`15h00` is FR-only).
- Pair status colors with an icon + text (sold-out, offline, error, **selected** ✓, recommended).

**Don't**

- Don't use Lalezar for routine in-app headers (brand moments only).
- Don't let gold signal a non-actionable highlight.
- Don't add drop shadows to product chrome — shift surface color instead.
- Don't rely on color alone for status.
- Don't bring magenta into page chrome — it's a secondary/category accent, not a background.
- Don't use white text on a gold fill (2.3:1) — gold fills always take the dark ink `#2A1A06`.
- Don't put a gold focus ring on a gold-filled control (invisible) — use dark/white there.
- Don't use a gold CTA on a daylight/white surface (1.6:1) — use the aubergine CTA.
