# UX Spec-Coverage Review — Pass 1

> **⚠️ PARTIALLY SUPERSEDED 2026-06-16.** Run against the **retired** Tiween-Green + Yellow + Cobalt palette. The B2C identity was revised the same day to **Gold Leaf × Aubergine** (single-accent gold `#D4A24A`; cobalt dropped; secondary = Magenta Rose `#E5478A`). The structural findings below (section order, `{token}` resolution, IA↔flow↔component coverage) remain valid. The **palette-specific findings are now moot**: M1 (two-accent under-documentation) and M2 (`secondary-foreground`/text-on-cobalt) are resolved by the single-accent revision; m1's cobalt `[NEEDS-HEX]` is closed (cobalt dropped — see EXPERIENCE.md Open items); m2's daylight pair is now aubergine `#241326` on white, not `#032523`. **`DESIGN.md` / `EXPERIENCE.md` are the source of truth** for current tokens.

Run: ux-tiween-bmad-version-2026-06-16 · Reviewer: spec-coverage (bmad-ux) · Date: 2026-06-16
Scope: DESIGN.md (visual spine) + EXPERIENCE.md (experience spine) vs .decision-log.md.
Method: section-order check · `{token}` resolution · cross-spine contradiction · declared-vs-used tokens · IA↔flow↔component coverage · 3-improvement consistency.

**Verdict: PASS with fixes.** Both spines are present, ordered, and internally coherent. No CRITICAL blockers. Issues below are MEDIUM (resolve before handoff) and MINOR (polish).

---

## CRITICAL

_None._ All required sections present and in canonical order; no dangling token refs; no hard contradictions between spines or against the decision log.

---

## MEDIUM

### M1 — `secondary` two-accent rule is under-applied in EXPERIENCE.md flows

**Where:** EXPERIENCE.md › Key Flows (Flows 1–2) and Component Patterns.
**Issue:** The two-accent improvement (yellow = action/active, cobalt `{secondary}` = link/info) is stated in DESIGN.md and named once in EXPERIENCE.md (Open items). But every interactive cue in the flows routes through yellow (`{primary}` CTA, yellow selected showtime, yellow ✲). No flow or component pattern exercises a `{secondary}` link/info surface, so the experience spine never demonstrates the split it inherited. Risk: a handoff tool reading EXPERIENCE.md alone sees a single-accent product.
**Fix:** In Component Patterns, add the link/info behavior to at least one pattern (e.g. "in-detail links, 'voir plus', info banners use `{secondary}`; never `{primary}`"), and reference `{secondary}` in a flow step where a link/info element appears (e.g. Film detail "Voir la bande annonce" or a synopsis "voir plus").

### M2 — `secondary-foreground` token declared but never used in either body

**Where:** DESIGN.md frontmatter (`secondary-foreground: "#FFFFFF"`) vs DESIGN.md body Colors table + EXPERIENCE.md.
**Issue:** `secondary` appears in the Colors table; its paired `secondary-foreground` is declared in frontmatter but never referenced in any body (the Colors table omits the row, and no `{secondary-foreground}` ref exists). Asymmetric with `primary`/`primary-foreground`, which are both in the table.
**Fix:** Add a `secondary-foreground` row to the DESIGN.md Colors table (text-on-cobalt) so declared tokens and documented tokens stay 1:1.

### M3 — Components declared in frontmatter with no behavioral spec

**Where:** DESIGN.md frontmatter `components:` list vs EXPERIENCE.md › Component Patterns.
**Issue:** Eight named components have a behavioral spec (`{EventCard}`, `{ShowtimeButton}`, `{TicketQR}`, `{BottomNav}`, Tabs). But `SeatSelector`, `FilmHero`, `Calendar`, `Select`, and `Form` are declared/visually specced yet have **no behavioral spec** in EXPERIENCE.md. `SeatSelector` is the highest risk: DESIGN.md says "arrow-key navigable" and Accessibility Floor implies a `radiogroup`-style pattern, but no state/focus/announce spec exists, and no flow reaches a seat-picking screen (see M4).
**Fix:** Add behavioral bullets for `SeatSelector` (states: available/selected/taken/accessible; focus traversal; SR announcements) and `FilmHero` (pager keyboard/swipe parity, already implied by Interaction Primitives — make it explicit). `Calendar`/`Select`/`Form` can be declared "inherit shadcn defaults, no behavioral delta" to close the gap explicitly rather than silently.

### M4 — `SeatSelector` is an IA/flow orphan

**Where:** DESIGN.md › Components + Shapes (SeatSelector) vs EXPERIENCE.md › IA (Ticketing flow 4-step) and Key Flows.
**Issue:** SeatSelector is a specced component but no flow reaches a seat-selection screen. Flow 2 (Ahmed) goes showtime → quantity → guest → checkout with no seat-map step, and the IA's "Ticketing flow (4-step)" never enumerates a seat-selection surface. Either seat selection is real (then a flow/IA step is missing) or it is not in B2C MVP scope (then SeatSelector is dead weight in the visual spine).
**Fix:** Decide scope. If seated venues are in scope, add the seat-selection step to the ticketing IA and to Flow 2 (between séance-select and quantity). If not, mark SeatSelector `[POST-MVP]` in DESIGN.md so the orphan is intentional. Note this likely ties to the Open-items `[ASSUMPTION]` about theater/concert detail (Epics 3 & 6).

### M5 — IA Detail surfaces without a flow: Theater/Salle, Venue, Concert

**Where:** EXPERIENCE.md › IA "Detail surfaces" + Open items vs Key Flows.
**Issue:** The IA lists "Film detail, Theater/Salle detail, Venue detail" as detail surfaces, and Open items add Theater/Salle and Concert detail. All three flows are film-centric (Bullet Train ×3). No flow touches a Theater/Salle or Venue or Concert surface, and the IA's own "Closure check" claims "every surface is reached by a flow below" — which is not currently true for these three.
**Fix:** Either soften the Closure-check claim to "every surface type is reachable" and tag Theater/Venue/Concert detail as `[ASSUMPTION: mirrors Film detail]` (consistent with Open items), or add a short non-film flow beat. At minimum, reconcile the absolute "every surface is reached by a flow" wording with the actual flow set.

---

## MINOR

### m1 — `secondary` `[NEEDS-HEX]` is a known open item, not a defect

**Where:** DESIGN.md Colors (`#2541E8 [NEEDS-HEX]`) + EXPERIENCE.md Open items + decision-log "Cobalt blue — value note".
**Status:** Consistent across all three docs (sampled, flagged, pin pending). No action beyond pinning the hex from the brand vector. Listed only so it is not re-raised as a finding.

### m2 — `daylight-foreground` used; `daylight-background` used; both resolve — but daylight contrast not asserted

**Where:** DESIGN.md Colors (daylight surfaces) + EXPERIENCE.md State Patterns (Daylight state).
**Issue:** All core dark pairs carry AAA contrast notes; the daylight pair (`#032523` on `#FFFFFF`) has no contrast value, though it is the one outdoor-critical, brightness-boosted surface. (For reference it is ~15.8:1 — AAA — so this is a documentation gap, not a real a11y risk.)
**Fix:** Add the contrast ratio to the daylight row/paragraph in DESIGN.md for parity with the dark pairs.

### m3 — Lalezar-restraint is consistent; one tightening opportunity

**Where:** DESIGN.md Typography + Do/Don't vs EXPERIENCE.md Responsive & Platform (`{display}` Lalezar splash).
**Status:** Applied consistently in both spines — Lalezar scoped to brand moments (splash/hero/empty/marketing/numerals); routine headers use Inter 700 / Cairo. EXPERIENCE.md's only `{display}` use is the PWA splash, which is an approved brand moment. No conflict.
**Fix (optional):** EXPERIENCE.md Voice/empty-state copy never names the Lalezar treatment for empty states (DESIGN.md lists empty states as a Lalezar moment). A one-line cross-ref would make the restraint rule fully traceable from the experience side.

### m4 — `secondary-foreground`/`primary-foreground` are the only foreground tokens; daylight pair mirrors them but isn't named "\*-foreground"

**Where:** DESIGN.md frontmatter naming.
**Issue:** Cosmetic naming asymmetry: `daylight-background`/`daylight-foreground` follow the bg/fg convention, `primary`/`primary-foreground` follow accent/on-accent. Fine as-is; flagged only if a token-linter enforces a single naming scheme.
**Fix:** None required.

### m5 — Section order confirmed canonical (no action)

**DESIGN.md body order:** Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → (Iconography & Imagery) → Do's and Don'ts. The extra "Iconography & Imagery" section sits between Components and Do/Don'ts — additive, does not break canonical order.
**EXPERIENCE.md order:** Foundation → Information Architecture → Voice and Tone → Component Patterns → State Patterns → Interaction Primitives → Accessibility Floor → Key Flows → (Responsive & Platform, Open items). All required sections present, in order; Key Flows use named protagonists (Yasmine/Ahmed/Karim) each with an explicit "← climax" beat. PASS.

---

## Coverage matrix (summary)

| Check                                                     | Result                                                                                                                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required sections present + canonical order (both spines) | PASS                                                                                                                                                                                                     |
| `{token}` refs resolve to declared tokens                 | PASS — 0 dangling (BottomNav, primary, EventCard, ShowtimeButton, TicketQR, surface, success, daylight-background, daylight-foreground, touch-target-min, secondary, container-max, display all resolve) |
| Tokens declared but unused in body                        | `secondary-foreground` (M2)                                                                                                                                                                              |
| Tokens used but undeclared                                | None                                                                                                                                                                                                     |
| Cross-spine / spine-vs-log contradictions                 | None (M1 is under-application, not contradiction)                                                                                                                                                        |
| IA surface with no flow                                   | Theater/Salle, Venue, Concert detail (M5)                                                                                                                                                                |
| Flow naming a screen not in IA                            | None — all flow screens (Accueil, Film detail, Billetterie/Choix des billets, Checkout, Billets/Mes événements, TicketQR) are in the IA                                                                  |
| Component with no behavioral spec                         | SeatSelector, FilmHero, Calendar, Select, Form (M3)                                                                                                                                                      |
| Two-accent applied both spines                            | DESIGN ✓ / EXPERIENCE under-applied (M1)                                                                                                                                                                 |
| Lalezar-restraint applied both spines                     | PASS (m3)                                                                                                                                                                                                |
| Daylight surfaces applied both spines                     | PASS (DESIGN Colors + EXPERIENCE State Patterns/Responsive)                                                                                                                                              |
