# RTL / i18n Review — Tiween B2C Design Contracts

**Reviewer:** RTL / i18n specialist
**Date:** 2026-06-16
**Scope:** `DESIGN.md` + `EXPERIENCE.md` audited against `_bmad-output/project-context.md` (authoritative i18n rules)
**Verdict:** Spines are largely sound on direction and numerals. Gaps cluster in the Arabic display-font story, mixed-script rendering, and currency direction-safety.

Severity key: **CRITICAL** (will produce wrong/broken rendering for a core locale) · **MEDIUM** (drift, ambiguity, or under-specification likely to cause inconsistent implementation) · **MINOR** (polish, future-proofing).

---

## 1. Numerals + date convention

**Status: PASS, consistent.**

- `DESIGN.md › Do's`: "Show Arabic with **Western numerals** and `DD/MM/YYYY` (per project-context)." ✓
- `EXPERIENCE.md › Foundation`: "Arabic uses **Western numerals** and `DD/MM/YYYY` (per project-context — overrides any legacy ambiguity)." ✓
- Matches `project-context.md › i18n Rules` ("Arabic uses Western numerals — `25/12/2025` not `٢٥/١٢/٢٠٢٥`"; "Date format: DD/MM/YYYY — French format for all locales") and Anti-Pattern #6. ✓

No drift on the rule itself. One sub-finding below.

### MEDIUM — 1a. Time-format locale variance not stated

Mockup copy uses 24h continental notation (`15h00`, `19h30`, `15h00` end-time, `HH:MM`). The `15h00` form is French; Arabic and English locales need an explicit rule (AR typically `15:00`, EN often `3:00 PM`). The spines fix the _date_ format across locales but are silent on _time_ format per locale.
**Fix:** Add to both spines' i18n line: "Time renders 24h `HH:MM` in all locales (AR/EN drop the French `h` separator → `15:00`); never localize to 12h AM/PM." If a single canonical form is intended, state it; if per-locale, state each. Pin it so `ShowtimeButton` and `TicketQR` don't hardcode `15h00`.

---

## 2. Direction handling

**Status: MOSTLY PASS.**

- Instant flip, no reload: `EXPERIENCE.md › Foundation` — "Arabic flips to `dir=\"rtl\"` instantly with no reload." ✓
- Logical properties: `DESIGN.md › Do's` — "Use logical properties (`ps/pe/ms/me`) so RTL flips cleanly." ✓ Also `EXPERIENCE.md › Accessibility Floor › RTL`. ✓
- Directional icon mirroring: `DESIGN.md › Iconography` — "Directional icons **mirror in RTL**" ✓; `EXPERIENCE.md › Accessibility Floor` — "directional icons flip." ✓

### MEDIUM — 2a. "RTL is automatic" overclaim creates a logical-property gap

`project-context.md` says "RTL is automatic — next-intl handles direction." next-intl/Next.js set the `dir` attribute, but **they do not convert `left/right` CSS or un-mirror icons** — that is on the component author via logical properties + RTL-aware icon swaps. The spines correctly mandate logical properties, but the authoritative context's "automatic" wording risks an implementer trusting the framework and shipping `left-*`/`right-*` utilities. The two spines should explicitly reconcile this.
**Fix:** In `EXPERIENCE.md › Foundation`, add: "`dir` is set automatically by next-intl; **physical-axis styling and icon mirroring are not** — author with logical Tailwind utilities (`ps-*/pe-*/ms-*/me-*`, `start-*/end-*`, `text-start`) only. No `left-*`/`right-*`/`pl-*`/`pr-*` in product chrome." This closes the gap between the context file's "automatic" and the actual implementation burden.

### MEDIUM — 2b. Gesture directions are not direction-aware

`EXPERIENCE.md › Interaction Primitives`: "swipe between date/category tabs" and "swipe-to-dismiss (sheets/toasts)." Horizontal swipe semantics invert under RTL (swipe-next goes the other way; sheet dismiss direction flips). Not addressed.
**Fix:** Add: "Horizontal swipe direction respects `dir` — next/previous and swipe-to-dismiss follow the start→end axis, not a hardcoded left→right." Tab momentum/snap (logical scroll) inherits `dir` automatically, but the gesture handlers must read direction.

---

## 3. Typography for Arabic

**Status: GAP — the Arabic display story is incoherent.**

The body/header split is coherent and well-specified: Noto Sans Arabic (body), Cairo (AR headers), Inter (Latin). The **display tier is the problem.**

- `DESIGN.md` typography table lists **Display: Lalezar (400) — "AR + Latin"** for "Splash, hero, empty states, marketing, large brand numerals," and the front-matter restricts it to "BRAND MOMENTS ONLY."
- Lalezar _does_ support Arabic/Persian script (it is an Arabic-script display face), so "AR + Latin" is not factually wrong. **But:**

### CRITICAL — 3a. Brand-moment surfaces are user-facing in AR, and Lalezar is a poor Arabic body/UI face by design

Brand moments enumerated include **empty states** and **large numerals** that appear inside the running app, not just marketing collateral. Lalezar is a heavy, single-weight (400 only) decorative display face with **limited Arabic legibility at small/medium sizes and no weight range** — fine for a hero word, risky for an empty-state sentence in Arabic. The spine treats "brand moment" as font-agnostic across scripts, but an Arabic empty-state headline in Lalezar will read very differently (and worse) than a Latin one. PWA splash (`EXPERIENCE.md › Responsive` — "splash uses {display} Lalezar + monogram") is the one safe brand-moment use; multi-word AR empty-state copy is not.
**Fix:** Scope Lalezar's AR usage explicitly: "Lalezar (AR + Latin) is permitted only for **single-word / short hero lockups and large numerals**. AR empty-state and multi-word brand copy fall back to **Cairo (700)**, not Lalezar." This keeps the brand moment without sacrificing AR legibility.

### MEDIUM — 3b. No AR brand-moment fallback font named; no Latin↔AR display pairing declared

The table says "Lalezar … AR + Latin" but never states what happens if Lalezar's Arabic shaping is rejected at QA, nor whether a different face carries AR brand moments. There is no `font-family` fallback chain and no statement that Cairo is the AR display fallback. Single point of failure for the entire AR display tier.
**Fix:** Declare the fallback stack per script: Latin display `Lalezar, Inter, system-ui`; **AR display `Lalezar, Cairo, 'Noto Sans Arabic', sans-serif`.** State Cairo (700) as the sanctioned AR brand-moment substitute (resolves 3a too).

### MINOR — 3c. "Large brand numerals" in Lalezar vs. the Western-numerals rule

Brand numerals (e.g. FilmHero pager `01/05`, "big numerals") rendered in Lalezar must still be **Western digits** in the AR locale (finding 1). Lalezar's digit glyphs are Western by default, so this is low-risk, but the intersection of "large brand numerals" (display tier) and "Western numerals in AR" (i18n rule) is never stated together.
**Fix:** One line: "Brand numerals use Western digits in all locales, including AR — consistent with the numerals rule."

---

## 4. Mixed-script rendering (AR title + FR/Latin metadata on one card)

**Status: GAP — only partially addressed.**

- `EXPERIENCE.md › Accessibility Floor › RTL`: "verify mixed AR/FR strings render correctly" — acknowledges the problem but only as a _verification_ note, with **no rendering rule**.
- `EventCard` (DESIGN.md) stacks AR title + `venue • date` + format badges (`VOST`/`VF`/`3D`) + price — a guaranteed mixed-script row in the AR locale. The Latin tokens (`VF`, `VOST`, venue names, `DT`) inside an RTL line will hit bidi reordering and the `•` separator can jump sides.

### CRITICAL — 4a. No bidi isolation rule for embedded Latin runs

A `VOST` badge or Latin venue name inside an RTL Arabic line, separated by `•`, will reorder unpredictably without explicit isolation (`bdi`/`unicode-bidi: isolate` / `dir="auto"` on the embedded run). The spine says "verify," not "isolate." This is the single most common Arabic-card rendering bug.
**Fix:** Add a rendering rule to both spines: "Embedded Latin runs inside an RTL string (format badges, venue names, IDs, `DT`) are wrapped in `<bdi>` / `dir=\"auto\"` isolation so bidi reordering and separator placement stay correct. The `•` metadata separator uses a bidi-neutral layout (flex with logical gap), not an inline literal that can flip sides." Promote the existing "verify mixed AR/FR" note from accessibility-only to a DESIGN.md rendering rule.

### MINOR — 4b. Format/genre badges: localize or lock as Latin tokens?

`VOST`/`VF`/`3D`/`2D` are French-cinema abbreviations. Decide whether they stay Latin tokens (then they're always embedded-Latin runs needing isolation per 4a) or get AR equivalents. Currently unspecified.
**Fix:** State the policy (recommend: keep as locked Latin tokens, isolated per 4a — they are domain-standard).

---

## 5. Currency — DT (Dinar Tunisien)

**Status: GAP — placement not direction-aware.**

- Pricing in DT is named in `EventCard` ("price (DT)") and the two-accent/components sections. **No format or placement rule exists.**

### MEDIUM — 5a. Currency placement is direction-unsafe and unspecified

"`price (DT)`" implies a trailing Latin `DT` suffix. In the AR/RTL line this is an embedded-Latin run (same class as finding 4a) and its visual side flips. Number/symbol order, decimal separator (TND is conventionally 3 decimals — _millimes_ — though events likely use whole dinars), and whether it's `12 DT` / `DT 12` / `12,000 DT` are all undefined.
**Fix:** Specify: "Price = Western numerals + `DT`, formatted via `Intl.NumberFormat(locale, { style: 'currency', currency: 'TND' })` (or a fixed `{amount} DT` token) and **isolated with `<bdi>`** so the symbol sits correctly on either side of the RTL line. Define decimal policy (whole-dinar vs. 3-decimal millime) once, in DESIGN.md." Cross-reference finding 4a.

---

## 6. French-default copy with AR/EN

**Status: PASS.**

- Default declared in 3 places: `DESIGN.md › Brand & Style` ("Product voice … French-default … governs all in-app screens"), `EXPERIENCE.md › Foundation` ("French is the default product copy"), `EXPERIENCE.md › Voice and Tone`. ✓
- Matches `project-context.md` ("Date format … French format for all locales"). ✓
- Switching: `EXPERIENCE.md › IA` places language in **Compte (Account)**; `EXPERIENCE.md › Foundation` covers the AR direction flip. ✓ Errors translated via `t(error.code)` ✓.

### MINOR — 6a. Switch entry-point and persistence under-specified

Language lives in Account, but there's no statement on: first-run locale detection (browser `Accept-Language` vs. forced FR default), persistence (Zustand `persist` per project-context), or whether the switcher is reachable pre-auth (it must be — guest checkout exists in Flow 2). EN's role beyond "exists" is never described.
**Fix:** One line in `EXPERIENCE.md › Foundation`: "Default locale = FR on first run (not browser-detected); user choice persists (Zustand persist) and is changeable from Account **and** without auth. AR triggers the RTL flip; EN stays LTR."

---

## 7. Direction-unsafe layout tokens

**Status: ONE concrete unsafe assumption + several at-risk specs.**

### MEDIUM — 7a. "Format badge top-left" is a hard physical-corner assumption

`DESIGN.md › ShowtimeButton`: "Format badge **top-left**." `EventCard`: "category/rating badge" placement implied top-corner. In RTL the format badge should sit **top-start (top-right)**, not top-left. "top-left" is a physical-axis spec that won't mirror.
**Fix:** Reword to logical: "Format badge **top-start**" (and any other corner spec → start/end). Audit all "left/right" corner language in DESIGN.md components.

### MINOR — 7b. Bottom-nav and thumb-zone assumptions are direction-safe, but icon order should be confirmed

`BottomNav` (`Accueil · Recherche · Billets · Compte`) — under RTL the tab **order mirrors** (Accueil at start = right edge). 64px fixed height + safe-area is vertical, so direction-safe. ✓ Just confirm the reading order is intended to flip (it should). No hard left/right found in nav spec itself.
**Fix:** Add a note: "BottomNav tab order follows reading direction (start→end); it mirrors in RTL." Prevents an implementer pinning Accueil to a fixed `left:0`.

### MINOR — 7c. Carousels / horizontal scroll initial position

Home carousels ("Films à venir" etc.) and category tabs scroll horizontally; initial scroll position and momentum must originate from the **start** edge (right in RTL). Logical scroll handles this if authored with `dir`, but worth stating since carousels are flagged `'use client'` islands where manual scroll math creeps in.
**Fix:** "Horizontal carousels/tab strips initialize and snap from the logical start edge; no hardcoded `scrollLeft: 0` assumptions."

---

## Summary table

| #   | Severity     | Area           | Issue                                                                                                    |
| --- | ------------ | -------------- | -------------------------------------------------------------------------------------------------------- |
| 3a  | **CRITICAL** | Typography     | Lalezar used for AR empty-states/brand copy — single-weight display face, poor AR legibility; no scoping |
| 4a  | **CRITICAL** | Mixed-script   | No bidi-isolation rule for Latin runs (badges/venue/`DT`) in RTL lines — only a "verify" note            |
| 1a  | MEDIUM       | Numerals/date  | Time format per-locale (`15h00` is FR-only) not specified                                                |
| 2a  | MEDIUM       | Direction      | "RTL is automatic" overclaim vs. real logical-property burden                                            |
| 2b  | MEDIUM       | Direction      | Swipe gesture directions not direction-aware                                                             |
| 3b  | MEDIUM       | Typography     | No AR display fallback chain; Cairo-as-fallback not declared                                             |
| 5a  | MEDIUM       | Currency       | DT placement/format direction-unsafe and unspecified                                                     |
| 7a  | MEDIUM       | Layout token   | "Format badge top-left" — hard physical corner, won't mirror                                             |
| 3c  | MINOR        | Typography     | Brand numerals × Western-numerals rule not stated together                                               |
| 4b  | MINOR        | Mixed-script   | VOST/VF token localization policy undefined                                                              |
| 6a  | MINOR        | French-default | Switch detection/persistence/pre-auth access under-specified                                             |
| 7b  | MINOR        | Layout token   | BottomNav mirror-order not stated                                                                        |
| 7c  | MINOR        | Layout token   | Carousel start-edge init not stated                                                                      |

**Top priorities:** Fix **4a** (bidi isolation) and **5a** (currency, a sub-case of 4a) first — these break the most-rendered surface (EventCard) in the AR locale. Then **3a/3b** (Arabic display font) and **7a** (logical corner). Numerals/date and French-default are clean.
