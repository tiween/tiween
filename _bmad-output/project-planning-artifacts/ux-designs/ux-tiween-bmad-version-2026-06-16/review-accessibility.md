# Accessibility Review — Tiween B2C (WCAG 2.1 AA)

> **⚠️ SUPERSEDED 2026-06-16.** This review was run against the **retired** Tiween-Green + Yellow + Cobalt palette. The B2C identity was revised the same day to **Gold Leaf × Aubergine** (field `#241326`, action `#D4A24A`, link-text `#E0B563`, secondary `#E5478A`; cobalt dropped, single-accent system adopted). **Every contrast ratio and color pair below is computed against retired hexes and is no longer valid.** The headline cobalt-link CRITICAL finding is moot — cobalt no longer exists in the palette. For current, recomputed contrast values, **`DESIGN.md` is the source of truth** (all ratios there are computed against the live tokens). This file is retained as an audit trail of the prior-palette review only; do not action its findings. A fresh a11y pass against Gold Leaf × Aubergine should be run before handoff if one is needed.

> Reviewer lens: WCAG 2.1 AA for a consumer ticketing PWA handling payments.
> Scope: `DESIGN.md` (visual identity) + `EXPERIENCE.md` (behavior). Spines not edited.
> Date: 2026-06-16. All contrast ratios below computed with the WCAG 2.x relative-luminance formula (sRGB).

## Verdict

DESIGN.md's headline contrast claims for the **established** palette are sound (minor rounding). The **new cobalt `#2541E8` link color is a CRITICAL AA failure on every product surface** — it fails 4.5:1 for body text by a wide margin and must not ship as a link color on the dark field. Several behavioral a11y items are well-specified but incomplete on the "non-color cue" front for two-accent selection and for the full set of statuses.

---

## 1. Contrast — computed ratios

### Established palette (claims verified)

| Pair                                | DESIGN.md claim | Computed    | AA body (4.5) | AAA (7) |
| ----------------------------------- | --------------- | ----------- | ------------- | ------- |
| Yellow `#F8EB06` on field `#032523` | 12.5:1          | **13.06:1** | pass          | pass    |
| White `#FFFFFF` on field `#032523`  | 15.8:1          | **16.24:1** | pass          | pass    |
| Muted `#A0A0A0` on field `#032523`  | 5.2:1           | **6.21:1**  | pass          | (no)    |

Findings: the three claims are **plausible and conservative** — actual ratios are slightly _higher_ than stated (claims appear computed against a marginally lighter field or older formula). No action required, but for accuracy the spine could update to the computed values.

Caveat (MEDIUM, below): muted `#A0A0A0` is quoted "on field." On the actual card surface it sits on, the ratio drops.

| Muted `#A0A0A0` on `surface #0A3533` | — | **5.12:1** | pass | (no) |

Still AA for body, but only when ≥ this surface; do not place muted text on `surface-raised #0F4542` for long body copy without re-checking.

### NEW cobalt `#2541E8` as a LINK color — CRITICAL FAIL

| Pair                                         | Computed   | AA body (4.5) | AA large/UI (3.0) |
| -------------------------------------------- | ---------- | ------------- | ----------------- |
| Cobalt `#2541E8` on field `#032523`          | **2.32:1** | FAIL          | FAIL              |
| Cobalt `#2541E8` on `surface #0A3533`        | **1.91:1** | FAIL          | FAIL              |
| Cobalt `#2541E8` on `surface-raised #0F4542` | **1.54:1** | FAIL          | FAIL              |

`#2541E8` is a dark, saturated blue; against a near-black teal field it has almost no luminance separation. It fails **1.4.3 Contrast (Minimum)** for body link text (needs 4.5:1) AND fails **1.4.11 Non-text Contrast** (3:1) if used for any UI affordance. As a link role this is the single most serious issue in the contract.

Note: the reverse pairing **white on cobalt `#2541E8` = 7.00:1** (passes AAA) — so cobalt is fine as a _fill behind white text_ (`secondary` + `secondary-foreground`, e.g. an info chip/button), just not as foreground text/links on the dark field.

### Suggested accessible link tokens (computed, brand-adjacent)

Lighten the link/info accent. Candidates that keep the cobalt family and clear AA on both field and surface:

| Candidate | on field `#032523` | on `surface #0A3533` |
| --------- | ------------------ | -------------------- |
| `#7B9CFF` | 6.22:1             | 5.12:1               |
| `#8AB4FF` | 7.78:1             | 6.40:1               |
| `#93B5FF` | 7.96:1             | 6.56:1               |

Recommend a token like `secondary-link: #8AB4FF` (≥ 6.4:1 on both surfaces, comfortably AA, near-AAA) for the **text/link** role, while keeping `#2541E8` only as a **fill** under white text. (Hex still flagged `[NEEDS-HEX]` from brand vector — pin the link tint to ≥ 4.5:1 on `surface-raised` as the binding constraint.)

### Daylight surfaces (dark teal on white) — PASS

| Pair                                     | Computed    | AA   | AAA  |
| ---------------------------------------- | ----------- | ---- | ---- |
| Teal `#032523` on white `#FFFFFF` (text) | **16.24:1** | pass | pass |
| Black-on-white QR                        | ~21:1       | pass | pass |

Daylight checkout/QR pairings are excellent. One caution (MEDIUM): on the daylight surface, **yellow `#F8EB06` on white = ~1.1:1** — yellow CTAs/active states are invisible there. Checkout uses a primary CTA (`Acheter`/`Confirmer` per DESIGN.md button hierarchy). The spine must specify the CTA treatment on the daylight surface (e.g. dark-teal fill with white text, or yellow fill with a dark border/dark text) — a yellow-on-white pill would fail.

### Other semantic colors on field (for completeness)

| Pair                  | Computed   | AA body            |
| --------------------- | ---------- | ------------------ |
| Success `#22C55E`     | 7.13:1     | pass               |
| Warning `#F59E0B`     | 7.56:1     | pass               |
| Destructive `#EF4444` | **4.32:1** | **just under 4.5** |

MEDIUM: destructive red `#EF4444` as **text** on the field is 4.32:1 — marginally under AA for body. Fine for ≥18.66px bold or as an icon/border (passes 3:1), but error _body text_ in this red fails. Pair error text with white/`foreground` and reserve red for the icon + border (which also satisfies the not-by-color rule).

---

## 2. Status not by color alone — PARTIAL

DESIGN.md ("Status is always conveyed by icon + text, never color alone") and EXPERIENCE.md (sold-out, offline, error, recommended) state the rule. Gaps:

- **HIGH — "selected" / "recommended" not enumerated in the rule.** The behavioral list names "sold-out, offline, error, recommended" but the **selected showtime** (the two-accent climax) and **recommended** rely on color/fill. The rule must explicitly cover _every_ status the prompt lists: sold-out, offline, error, recommended, **selected**. See §5.
- **MEDIUM — offline badge `Fonctionne hors ligne` is defined as `{success}` green.** Color + text label is fine, but it shares green with the "valid ticket" success accent; ensure the _text label_ (not hue) carries the meaning, and that the badge has an icon, not just a colored pill.
- **MEDIUM — sold-out is `strikethrough + Complet + disabled`.** Good (text + style + state). Verify strikethrough alone is never the only signal at 200% zoom where the `Complet` label may truncate.

---

## 3. Focus visibility & keyboard operability — MOSTLY GOOD

- Focus ring spec (`{primary}` 3px outline + 2px offset) is strong and visible (yellow at 13:1 on field). PASS.
- **HIGH — focus ring contrast on yellow surfaces.** The selected ShowtimeButton is "yellow border + fill." A yellow focus ring on a yellow-filled tile is invisible. Spine must define a **distinct focus indicator for elements that are themselves yellow** (e.g. a dark-teal inner ring, or switch the focus outline to white/`foreground` on yellow backgrounds) to satisfy **2.4.7** and **1.4.11** (3:1 between focus indicator and adjacent colors).
- Showtime `radiogroup` (`role=radio`), seat grid (arrow-key navigable), tabs (arrows move, Enter/Space activate) are specified — roving-tabindex implied. GOOD. **MEDIUM:** specify that the radiogroup exposes a single tab stop and arrow keys wrap/stop consistently; seat grid needs 2-D arrow semantics (up/down across rows), not just left/right — make this explicit.
- **MEDIUM — sold-out radio is "focusable but announces indisponible."** A focusable-but-non-activatable radio can confuse SR users; ensure it is `aria-disabled="true"` (still focusable) rather than removed from the group, and is skipped by selection (not just announced).
- Sheets/dialogs "trap-and-restore focus" — explicitly specified. PASS for **2.4.3 / 2.1.2** (no trap). Confirm `Escape` closes and restores to the invoking control.

---

## 4. Touch targets & spacing — PASS (one watch)

- 44px min / 48px preferred, 8px min gap — meets **2.5.5 (AAA)** and **2.5.8 AA (24px)** comfortably. GOOD.
- **MEDIUM — EventCard nested target.** Whole card = tap target with an independent watchlist heart sub-target. Ensure the heart is ≥ 44px and has ≥ 8px separation so it isn't an accidental-activation hazard inside the card hit area; the heart must also stop propagation so it doesn't both toggle and navigate.
- Bottom nav 48px targets / 64px height — PASS.

---

## 5. Two-accent selected state for color-blind users — HIGH

The selected showtime = "yellow border + fill." For users who can't distinguish the yellow from the default `surface`, **fill + border is still a purely chromatic cue**. There is no guaranteed non-color differentiator in the contract.

Fix: add a **non-color selection cue** to `{ShowtimeButton}` selected state — e.g. a check glyph (✓) in the tile, a bold "Sélectionné" label, or `aria-checked` reflected visually with an icon. The recommended `✲` already proves the pattern works; mirror it for selection. This is required for **1.4.1 Use of Color**. (Yellow-vs-teal luminance is high — 13:1 — so most low-vision users _will_ see a difference, but protanopia/deuteranopia plus the fill-only state is the risk; an icon removes all doubt.)

---

## 6. Reduced motion, zoom, SR roles/live regions — GOOD with notes

- **Reduced motion:** confetti/heart-pulse/welcome all "respect `prefers-reduced-motion`," and the floor honors it for all motion. PASS (**2.3.3**). MEDIUM: specify the _reduced_ path still confirms success (static check + copy), so celebration suppression never removes the only confirmation of payment.
- **200% zoom:** "200% with no horizontal scroll" stated. PASS intent (**1.4.10 Reflow** technically requires 320px/400% — recommend extending the target to 400% reflow given the PWA mobile baseline; cheap to claim, future-proofs).
- **SR roles / live regions:** article/radio roles, nav landmarks, live regions for async results + toasts, labelled icon-only buttons — comprehensive. PASS. MEDIUM: payment/checkout errors must be announced — ensure the **inline field error** region is `aria-live="assertive"`/`role="alert"` and that the toast live-region politeness matches severity (errors assertive, info polite). Daylight-surface brightness jump should not be the only feedback.

---

## 7. RTL focus order — GOOD (high-level)

Logical properties (`ps/pe/ms/me`), mirrored directional icons, instant `dir="rtl"` flip, mixed AR/FR verification, Western numerals + DD/MM/YYYY. At the contract level this is correct: DOM order drives focus, and logical-property layout keeps visual order aligned with DOM order in both directions, so tab order stays coherent. MEDIUM watch: the horizontal showtime/seat grids and snap-scroll carousels must have arrow-key direction follow `dir` (in RTL, left-arrow should move to the _next_ logical item) — call this out so the radiogroup/seat-grid keyboard handler is direction-aware, not hard-coded LTR.

---

## Findings summary (severity → fix)

### CRITICAL

1. **Cobalt `#2541E8` link text fails AA on all surfaces** (2.32:1 field / 1.91:1 surface / 1.54:1 raised; needs 4.5:1). Fix: introduce a lighter link tint (e.g. `#8AB4FF` ≈ 6.4–7.8:1) for the text/link role; keep `#2541E8` only as a fill under white text (white-on-cobalt = 7.0:1). Pin the `[NEEDS-HEX]` to ≥ 4.5:1 on `surface-raised`.

### HIGH

2. **Selected ShowtimeButton has no non-color cue** (1.4.1). Add a check glyph / "Sélectionné" label / `aria-checked` visual icon, not fill+border alone.
3. **Focus ring invisible on yellow elements** (2.4.7 / 1.4.11). Define a dark/white focus indicator for yellow-filled controls (selected showtime, primary CTA).
4. **"Not by color alone" rule omits `selected`** (and under-specifies recommended). Make the rule explicitly enumerate sold-out, offline, error, recommended, selected.

### MEDIUM

5. Destructive red `#EF4444` text = 4.32:1, under AA for body — use red for icon/border, white for error body text.
6. Yellow CTA on daylight (white) surface = ~1.1:1 — specify a non-yellow CTA treatment for checkout/QR daylight surfaces.
7. Muted `#A0A0A0` is AA on `surface` (5.12:1) but tighter than the "on field" claim — don't place muted body text on `surface-raised`.
8. Sold-out radio: use `aria-disabled` (focusable, not removed); confirm Escape-close + focus restore on sheets/dialogs.
9. Seat grid needs explicit 2-D arrow semantics; radiogroup single tab stop + wrap behavior; RTL-aware arrow direction for grids/carousels.
10. EventCard watchlist heart: ≥ 44px, ≥ 8px gap, stop-propagation to avoid double-action inside card hit area.
11. Reduced-motion path must retain a static success/payment confirmation; checkout error region `role="alert"`/assertive live politeness by severity.
12. Extend zoom claim toward 400% reflow (1.4.10) given mobile PWA baseline.
