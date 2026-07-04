---
title: "Story Graphic Template Prompts — IG/FB Weekly Events Stories"
status: draft
created: 2026-06-18
author: Sally (UX Designer)
parent_prd: prd.md
realizes: [FR-7, FR-8, FR-9, FR-14]
brand_source: ../../ux-designs/ux-tiween-bmad-version-2026-06-16/DESIGN.md
---

# Story Graphic Template Prompts

> **Purpose.** Build-ready prompts for the **Branded Graphic Rendering** capability (PRD §4.3) at **story dimensions** (9:16, 1080×1920) for **Instagram + Facebook**. These are the design-build specs you hand to a designer (or a design-build tool / Placid–Bannerbear template editor) plus the **n8n merge-field JSON** that fills each template per event.
>
> **Load-bearing principle (PRD §11):** _facts are deterministic, prose is generative._ Every fact (title, venue, date, time, price) is a **fixed template slot filled from the Weekly List** — never drawn, re-typed, or re-styled by a model. A template that lets a model render a date is off-spec.
>
> **Brand tokens are quoted verbatim from** `DESIGN.md` (Gold Leaf × Aubergine, revised 2026-06-16). The spines win on conflict.

---

## 0. Shared Foundations (apply to every template below)

### Canvas & safe zones (one shared template, IG+FB union)

| Property                              | Value                                         | Source / reason                                               |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| Canvas                                | **1080 × 1920 px** (9:16)                     | IG/FB story native                                            |
| Top safe-zone (keep clear)            | **top 250 px**                                | profile chrome / username overlay (union of IG+FB)            |
| Bottom safe-zone (keep clear)         | **bottom 250 px**                             | reply bar / "Send message" / swipe-up CTA                     |
| Live content band                     | **y: 250 → 1670 px** (1420 px tall)           | all text + logo + fact block lives here                       |
| Side margins                          | **64 px** left/right (logical `ps`/`pe`)      | DESIGN.md spacing scale (64 = max step)                       |
| Sticker/CTA reserve (IG link sticker) | reserve a **180 px** clear zone near `y≈1450` | leaves room for the IG link/poll sticker the operator may add |

> **RTL is the default reading orientation.** Tiween is AR-first. The **logo anchors top-START (= top-RIGHT in RTL)**, the category badge sits top-START beneath it, and the fact block reads right-to-left. Use **logical properties** (`start`/`end`), never hard left/right, so the same template renders correctly for an Arabic-primary or French-primary slide. Directional glyphs (chevrons, the swipe arrow) **mirror** in RTL.

### Brand tokens (verbatim — do not improvise hexes)

```
FIELD          background        #241326   Midnight Aubergine
SURFACE        card/panel        #31203A   (white text 15:1)
SURFACE-RAISED elevated panel    #3E2A48
BORDER         hairline          #4A3556
TEXT           foreground        #FFFFFF   (17.6:1 AAA)
TEXT-MUTED     secondary         #B0A6B8   (7.5:1)
GOLD           primary action    #D4A24A   ← CTA fill, active, "recommended ✲"
GOLD-INK       on-gold text      #2A1A06   ← NEVER white on gold (2.3:1 fails)
GOLD-TINT      link/secondary    #E0B563   (9.2:1) ← text-safe gilt
MAGENTA        secondary accent  #E5478A   ← théâtre category + 2ndary highlight ONLY (never page bg, never body text)
```

**Category color-coding** (badge + accent line only — never overrides gold action):

```
cinema    #E0B563  gold
théâtre   #E5478A  magenta rose
courts    #5FD0C2  teal   (short films)
concerts  #7B9CFF  periwinkle
expo      #C98AE8  orchid
```

### Type (verbatim — embed these exact fonts in the render engine)

| Role                | Family                               | Weight  | Notes                                                                              |
| ------------------- | ------------------------------------ | ------- | ---------------------------------------------------------------------------------- |
| Brand moment (rare) | **Lalezar**                          | 400     | only big brand numerals / one-word hero; AR fallback → **Cairo** for multi-word AR |
| Headline (Latin)    | **Inter**                            | 700     | event title in FR/EN                                                               |
| Headline (Arabic)   | **IBM Plex Sans Arabic**             | 700     | event title in AR — **shaped, ligatured, RTL** (FR-8)                              |
| Body / fact labels  | **Inter** / **IBM Plex Sans Arabic** | 500–600 | venue, date, time                                                                  |
| Mono                | **JetBrains Mono**                   | 400     | (ticket-style accents only; rarely needed in story)                                |

> **FR-8 hard rule:** the render engine MUST embed a brand-approved Arabic font that shapes Tunisian-Arabic with **zero `.notdef`/tofu boxes**. This is the §13 render-test go/no-go for choosing Placid vs Bannerbear — a golden-reference pixel-diff check, not an eyeball pass. Recommended embed: **IBM Plex Sans Arabic 700** (headline) + **600** (body); **Cairo 700** as the long-AR display fallback.

### Shapes & treatment

- Poster image renders **2:3 portrait** inside the story (the signature Tiween ratio) — never stretched to fill 9:16.
- Cards/panels: **16 px** radius. Badges/chips: **8 px**. Any pill CTA: **full-pill (9999px)**.
- **Elevation = surface-color shift, not shadow** in product chrome — BUT marketing collateral (these stories) **may use shadow** (DESIGN.md explicitly permits it on marketing surfaces). Use a soft scrim under text over photos for legibility.
- **Signature device:** the **duotone cut-out portrait** (B&W photo + taa-monogram carved in gold) is the hallmark editorial treatment — offer it as the featured-event variant.
- **Voice register = marketing voice** here (bold, playful, Tunisian-vernacular), not the calm in-app product voice. Stories are promo collateral.

---

## 1. Per-Event Story — photo-led (FR-7)

> The workhorse. One event, its poster/photo as hero, category-coded, with the fixed fact block.

### 1a. Template-build prompt (hand to designer / design-build tool / Placid editor)

```
Design a 1080×1920 px (9:16) Instagram/Facebook STORY template for "Tiween",
a Tunisian cultural-events brand. Dark, premium, festival-playbill register —
NOT a generic event-aggregator. Reuse the Gold Leaf × Aubergine identity exactly.

CANVAS & ZONES
- Background: solid Midnight Aubergine #241326. No gradients in the field.
- Keep the top 250px and bottom 250px clear of all critical content
  (story chrome safe zones).
- All content lives in the band y:250–1670, with 64px start/end margins.
- RTL-first: anchor the logo and category badge to the TOP-START corner
  (top-right for Arabic). Use logical start/end, never fixed left/right.

LAYERS (start → end, top → bottom):
1. LOGO — the circular taa (ت) monogram, GOLD #D4A24A on aubergine, ~96px,
   pinned top-START at (start:64, y:280). Optional small "tiween" wordmark in
   gold-tint #E0B563 beside it.
2. CATEGORY BADGE — a pill (8px radius) just below the logo, filled with the
   event's CATEGORY COLOR (cinema #E0B563 / théâtre #E5478A / courts #5FD0C2 /
   concerts #7B9CFF / expo #C98AE8). Label text in that color's safe ink.
   This is a MERGE FIELD (color + label set per event).
3. POSTER — the event photo as a 2:3 PORTRAIT card, 16px corner radius,
   centered horizontally, occupying roughly y:430–1180. NEVER stretch to fill;
   letterbox onto the aubergine field if the source isn't 2:3. Apply a soft
   bottom-to-transparent aubergine scrim over the lower third of the poster so
   text below stays legible.
4. ACCENT RULE — a 4px GOLD #D4A24A horizontal rule (the action signal) under
   the poster, start-aligned, ~120px wide. (Decorative-but-action-adjacent;
   gold is allowed because it leads the eye to the fact CTA.)
5. EVENT TITLE — the largest text. AR in IBM Plex Sans Arabic 700 (shaped, RTL);
   FR/EN in Inter 700. White #FFFFFF. Auto-fit: shrink-to-fit from 64px down to a
   44px floor, then ellipsis (the one explicit overflow rule, FR-8). MERGE FIELD.
6. FACT BLOCK — a surface panel #31203A, 16px radius, holding the deterministic
   facts as fixed rows, each with a thin-line monochrome icon + text:
     📍 venue • city     (icon mirrors in RTL)
     🗓 date             Western numerals, DD/MM/YYYY
     🕐 time             HH:MM
     🎟 price "12,20 DT" decimal comma, space before DT, isolated LTR run
   Wrap every Latin run (VOST/VF, DT, city) in dir-isolation so it doesn't
   reorder inside Arabic. ALL MERGE FIELDS. Labels white, values gold-tint
   #E0B563 for emphasis.
7. CTA STRIP — bottom of the live band (~y:1500), a gold-tint line
   "Réserve sur tiween.com" / "احجز على tiween.com" — gold-tint #E0B563 text,
   NOT a gold-filled button (the IG link sticker is the real tap target; reserve
   its 180px zone above this).

RULES (must hold):
- Never white text on a gold fill — gold fills always take dark ink #2A1A06.
- Magenta only as the théâtre category accent — never as a background.
- Status/category never by color alone — badge always carries its text label.
- Poster art is the hero; chrome supports it.
- Soft shadow under text panels is OK (marketing surface).
```

### 1b. n8n merge-field JSON (filled per event from the Weekly List)

```json
{
  "template": "tiween-story-event-v1",
  "size": { "w": 1080, "h": 1920 },
  "layers": {
    "category_badge": {
      "text": "{{event.category_label}}",
      "fill": "{{event.category_color}}"
    },
    "poster_image": { "src": "{{event.image_url}}", "fit": "contain-2x3" },
    "event_title": {
      "text": "{{event.title}}",
      "font": "{{event.title_is_arabic ? 'IBM Plex Sans Arabic 700' : 'Inter 700'}}",
      "dir": "{{event.title_is_arabic ? 'rtl' : 'ltr'}}",
      "fit": "shrink-to-fit",
      "max_px": 64,
      "min_px": 44,
      "overflow": "ellipsis"
    },
    "fact_venue": { "text": "{{event.venue_name}} • {{event.city}}" },
    "fact_date": { "text": "{{event.date_ddmmyyyy}}" },
    "fact_time": { "text": "{{event.time_hhmm}}" },
    "fact_price": { "text": "{{event.price_dt}}" }
  },
  "_invariants": [
    "facts come straight from the Weekly List row — NEVER from generated text (FR-3)",
    "proper nouns (venue/artist/title) rendered verbatim, never transliterated (FR-6)",
    "category_color is deterministic from event.category (FR-7)"
  ]
}
```

---

## 2. Fallback Story — no usable photo (FR-9)

> Same skeleton, **no poster slot**. Replaces the photo hero with the **tiled taa-monogram pattern** in the event's category color, and is **visibly flagged as a fallback** in the Review Queue.

### Template-build prompt (delta from §1)

```
Same 1080×1920 Tiween story skeleton as the photo-led template, with these
changes for the NO-IMAGE fallback:

- DROP the poster card entirely.
- BACKGROUND becomes a TWO-TONE field: Midnight Aubergine #241326 overlaid with
  a large, low-opacity (8–12%) TILED taa-(ت)-MONOGRAM pattern in the event's
  CATEGORY COLOR. This is the brand textile motif — it signals "no photo" by
  design language, gracefully, instead of an empty box.
- Promote the EVENT TITLE to fill the space the poster vacated — set it in
  LALEZAR (brand moment) if it's a single short word/AR mark, else IBM Plex
  Sans Arabic 700 / Inter 700. Large, centered, white.
- A solid CATEGORY-COLOR band (full width, ~160px) behind the title gives the
  card weight the poster used to provide. Keep title ink legible on that band
  (white on magenta/periwinkle/orchid is fine large; on gold use dark ink).
- FACT BLOCK and CTA STRIP unchanged from §1.
- INTERNAL FALLBACK FLAG: render a tiny gold-tint dot or "•" token in a corner
  the Review Queue can detect — but this is for the operator, not the audience
  (the public graphic must still look fully branded, never "broken").
```

### Merge JSON delta

```json
{
  "template": "tiween-story-event-fallback-v1",
  "layers": {
    "monogram_pattern": { "tint": "{{event.category_color}}", "opacity": 0.1 },
    "title_band": { "fill": "{{event.category_color}}" },
    "event_title": { "text": "{{event.title}}" }
  },
  "flags": { "is_fallback": true }
}
```

---

## 3. Weekly Roundup Story (FR-14)

> The "this week in Tunisian culture" recap. Built **after** per-event content is approved so it reuses confirmed facts (no re-derivation). Two layout options below — pick per the open Q4 (one universal vs per-channel).

### 3a. Layout option A — single recap story (list style)

```
Design a 1080×1920 Tiween "WEEKLY ROUNDUP" story. Same brand foundations.

- HERO HEADER: a brand-moment headline in LALEZAR (Latin) / CAIRO 700 (AR long):
  "Cette semaine à Tiween" / "هاذ الجمعة في تيوين" / "This week on Tiween".
  Gold #D4A24A or white on aubergine. Pinned high in the live band (~y:300).
- WEEK RANGE chip below it: gold-tint #E0B563, "16–22 juin" (MERGE FIELD).
- EVENT LIST: 4–6 compact rows, each a surface #31203A panel (16px radius):
    [category color dot] · event title (Inter/Plex 600, white, 1 line ellipsis)
    venue • date • time  (muted #B0A6B8, smaller)
  The category DOT is the only color per row → the list reads as a color-keyed
  agenda (RA/Avignon wayfinding discipline), not noise. ALL ROWS ARE MERGE
  FIELDS (the engine repeats the row component N times).
- If more events than fit: last row = gold-tint "+8 autres → swipe / tiween.com".
- FOOTER: taa monogram (gold) + "tiween.com" wordmark, centered, in the live band
  (above the 250px bottom safe zone).
- RTL: rows read right-to-left; the category dot sits at the START (right) edge.
```

### 3b. Layout option B — carousel cover (first slide)

```
Variant of 3a sized as a carousel/multi-slide COVER:
- Slide 1 = the hero header + week range + a 3-up grid of the week's top poster
  thumbnails (2:3 each, 8px radius) behind a light aubergine scrim, with
  "Glisse pour voir les 12 événements →" (arrow mirrors in RTL).
- Slides 2..N = one per-event mini-card (reuse §1 fact block, smaller poster).
- Keep slide count ≤ platform max; if a channel doesn't support carousels in
  stories, fall back to layout A automatically.
```

### Merge JSON (roundup, list style)

```json
{
  "template": "tiween-story-roundup-v1",
  "layers": {
    "week_range": { "text": "{{batch.week_range_label}}" },
    "events": {
      "repeat": true,
      "rows": "{{batch.events[0..5]}}",
      "row": {
        "dot": "{{row.category_color}}",
        "title": "{{row.title}}",
        "meta": "{{row.venue}} • {{row.date_ddmmyyyy}} • {{row.time_hhmm}}"
      }
    },
    "overflow_row": { "text": "+{{batch.overflow_count}} autres → tiween.com" }
  },
  "_invariants": [
    "reuses already-confirmed Batch facts — no re-derivation (FR-14)",
    "flows through the same Review Queue + approval gates as any Post"
  ]
}
```

---

## 4. Motion variant (light — NOT v2 video)

> PRD defers full video/Reels to v2. This is a **light motion layer** the story engine can apply to the static templates above — supported because stories accept short MP4/animated output. Keep it subtle and on-brand.

```
Apply a 5–7s subtle motion layer to any static story template above. No new
content — only animate existing layers:
- POSTER: slow Ken-Burns push-in (scale 1.0 → 1.06 over the full duration).
- FACT BLOCK: fade + 16px rise-in, staggered per row (venue → date → time →
  price), starting at ~0.8s.
- GOLD ACCENT RULE: a single left→right (START→END, mirrored in RTL) wipe-in.
- CTA STRIP: gentle gold-tint pulse (opacity 0.7 ↔ 1.0) on a slow loop.
- Hold the final frame for ≥2s so the static composition is always screenshot-clean.
Export 1080×1920, ≤10s, MP4 (H.264) + a static poster frame (the held end frame).
NO text typewriter effects, NO spinning logos, NO emoji — keep the playbill register.
```

---

## 5. How these map to the build (n8n + Placid/Bannerbear)

1. **Design each template once** in the chosen engine (§1–§3) with the layers above; mark every fact as a named merge field, every category color as a deterministic variable.
2. **n8n** fills the JSON payload per event from the Weekly List row (facts only — captions are a separate LLM step).
3. **FR-8 render test (the go/no-go):** before committing Placid vs Bannerbear, render a long Tunisian-Arabic title (e.g. `"مهرجان قرطاج الدولي للموسيقى — الدورة الثامنة والخمسون"`) on each candidate and pixel-diff against a golden reference. Zero tofu boxes, correct ligatures/RTL, or the engine is rejected (→ the §13 custom-HTML exception).
4. **Fallback** (§2) triggers automatically when `event.image_url` is null; the Review Queue surfaces the `is_fallback` flag.
5. **Roundup** (§3) renders after per-event approval, reusing confirmed facts.

## 6. Open items inherited from the PRD (flag at architecture)

- **Q4 (Roundup format):** §3a vs §3b — confirm one universal format or per-channel. _Recommendation: ship §3a (list) for both IG+FB first; add §3b carousel only if engagement data justifies it._
- **Q5 (Arabic register):** the title/headline AR copy register (derja vs MSA) is a **caption** decision, but it bleeds into the graphic when the title is AR — confirm before authoring AR title styling.
- **Q8 (Placid vs Bannerbear):** decided by the §5.3 render test above.
- **Per-event vs roundup posting cadence:** scheduling concern (FR-15), out of scope here.
