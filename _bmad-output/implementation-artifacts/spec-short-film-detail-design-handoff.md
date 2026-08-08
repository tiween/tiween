---
title: "Short-film detail page — 2026 design handoff"
type: "feature"
created: "2026-08-08"
status: "done"
review_loop_iteration: 0
baseline_commit: "72a6d38e4589944717fdfb670cfb576c5d29ae19"
context:
  - "{project-root}/design_handoff_tiween/README.md"
  - "{project-root}/design_handoff_tiween/design_files/Court Métrage Détail.dc.html"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/{locale}/shorts/{slug}` renders a poster-beside-backdrop layout with hardcoded French strings, no Arabic copy, and a sidebar fact block — none of which matches the approved `Court Métrage Détail` handoff, which specifies a player-first page. The feature also carries two divergent implementations of the same screen, only one of which is reachable.

**Approach:** Rebuild `features/shorts/components/ShortFilmDetail` to the handoff at high fidelity, resolving all copy from a new `shorts` i18n namespace (FR/AR/EN); delete the unreachable route-level duplicate and render the feature component from `page.tsx`. Carry the handoff palette as route-scoped CSS variables.

## Boundaries & Constraints

**Always:**

- Every user-visible string resolves through `useTranslations("shorts")`. No hardcoded FR.
- CSS logical properties only (`start`/`end`, `ms-`/`me-`, `ps-`/`pe-`) so AR-RTL mirrors with zero direction overrides.
- `<bdi>` around every mixed-script or numeral-bearing run; Arabic uses Western numerals.
- Sections whose data is absent do not render — no empty shells, no placeholder rows.
- Touch targets ≥ 44×44; 2px gold focus ring on every interactive element; `prefers-reduced-motion` honored.
- Follow `EventDetailPage` as the structural precedent.

**Ask First:**

- Wiring the watchlist heart to `useAddToWatchlist`/`useRemoveFromWatchlist`. Shorts are mock-backed with synthetic `documentId`s, so a real POST would write garbage. Ship local optimistic state.
- Any change to `apps/client/src/styles/theme.css` or `globals.css` `:root` — the global rebrand was split into its own story.
- Adding an in-page FR/ع locale toggle. The design shows one, but locale switching is a next-intl routing concern no other page duplicates.

**Never:**

- Do not port the `.dc.html` runtime (`support.js`, `<x-dc>`, `<sc-for>`, `<sc-if>`) or ship the Phosphor webfont — use `@phosphor-icons/react`.
- Do not ship striped placeholder fills as production artwork; they render only when real media is absent.
- Do not build the "Équipe artistique" crew grid or the streaming access sub-label — both are deferred (they need `ShortFilm.crew` / `StreamingLink.accessType`, see `deferred-work.md` 2026-08-08).
- Do not touch the Strapi backend, `features/events`, `ShortFilmCard`, `ShortsDirectory`, `ShortsHero`, `ShortsFilters`, or any other screen.

## I/O & Edge-Case Matrix

| Scenario                    | Input / State                                 | Expected Output / Behavior                                                                                | Error Handling                                        |
| --------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Full record, FR             | poster, awards, streamingLinks, cast, related | All sections render in handoff order; "Primé" chip present; sticky bar shows title + availability         | N/A                                                   |
| AR locale                   | `locale === "ar"`                             | `dir="rtl"`; hero glyph, back caret, chips and scrim mirror; Arabic font stack; Western numerals          | N/A                                                   |
| No awards                   | `awards` empty/undefined                      | Distinctions section and "Primé" chip both omitted                                                        | N/A                                                   |
| No streaming links          | `streamingLinks` empty                        | "Où regarder" omitted; watch CTA and sticky bar fall back to trailer, or are omitted if no trailer either | N/A                                                   |
| No trailer, no streaming    | both absent                                   | No hero play affordance; no sticky bar                                                                    | N/A                                                   |
| No cast / no related        | either empty                                  | That section omitted                                                                                      | N/A                                                   |
| Missing poster and backdrop | no media                                      | Striped placeholder + ت glyph renders in hero                                                             | N/A                                                   |
| Heart toggle                | user taps heart                               | Fill crossfades ≤160ms, pulse plays once, no layout shift, `aria-pressed` flips                           | N/A                                                   |
| Share, no Web Share API     | `navigator.share` undefined                   | URL copied to clipboard                                                                                   | Clipboard rejection swallowed; no unhandled rejection |
| Share cancelled             | user dismisses sheet                          | No error surfaced                                                                                         | `AbortError` swallowed                                |
| Unknown slug                | slug not in mock data                         | `notFound()` → 404                                                                                        | N/A                                                   |

</frozen-after-approval>

## Code Map

**Rebuild / delete**

- `features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx` -- 433 lines, exported from the feature barrel but **zero consumers**. This is the file to rebuild.
- `app/[locale]/shorts/[slug]/ShortFilmDetailPage.tsx` -- 488 lines, the _reachable_ duplicate. Delete.
- `app/[locale]/shorts/[slug]/page.tsx` -- server component. `generateStaticParams` + `generateMetadata` off mock data (21-56), `notFound()` (67). Only the render call at 77-82 changes.

**Structural precedent — mirror this**

- `features/events/components/EventDetailPage/EventDetailPage.tsx:1-70` -- `"use client"`, `useTranslations` + `useLocale`, `labels` override for static strings only (its comment at 56-64 explains why parameterized labels must not cross the RSC boundary — commit `9dc7fc8`), co-located `.test.tsx`.
- `features/events/components/ShareDialog` + `buildEventShareUrl` (`features/events/utils`) -- reusable share affordance.

**Data**

- `features/shorts/types/shorts.types.ts:48-77` -- `ShortFilm`. Has `awards`, `cast`, `directors`, `streamingLinks`, `ageRating`, `genres`, `rating`. Read-only in this spec — `crew` and `accessType` are deferred.
- `features/shorts/data/mock-shorts.ts` -- 41 films; films 2/4/5 already carry `awards` + `cast`.

**Styling / tokens (read-only)**

- `styles/theme.css:6-11` -- brand tokens are green/yellow (`#032523`/`#F8EB06`). Do not modify.
- `styles/globals.css:16-100` -- `:root` shadcn HSL vars. Do not modify. Already provides `no-scrollbar` (the handoff's `.hsc`), `.animate-watchlist-pulse`, and a global `prefers-reduced-motion` block.
- `lib/fonts.ts` -- `fontInter`/`fontLalezar`/`fontNotoSansArabic`, wired in `app/[locale]/layout.tsx:95-102`. Use the existing **Noto Sans Arabic**, not the handoff's IBM Plex Sans Arabic.

**i18n**

- `locales/{fr,ar,en}.json` -- **no `shorts` namespace exists**; all three need one. Exact FR + AR copy is in the `STR` object at `Court Métrage Détail.dc.html:180-183`.

**Deliberately untouched**

- `features/events/hooks/useAddToWatchlist.ts`, `useRemoveFromWatchlist.tsx` -- real watchlist, keyed by Strapi `creativeWorkId`. Not wired here.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/package.json` -- add `@phosphor-icons/react` -- handoff icon set; the file already has an unrelated uncommitted edit (`typecheck` → `type-check`), do not revert it.
- [x] `apps/client/locales/fr.json`, `ar.json`, `en.json` -- add a `shorts` namespace -- FR/AR verbatim from the handoff `STR`; EN a faithful translation.
- [x] `features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx` -- rebuild to the handoff: sticky header (back / wordmark / share), hero (media or striped+ت placeholder, scrim, play affordance, category + Primé + age chips, Lalezar title, meta line), action row (heart / watch / trailer), Synopsis, Distinctions, Où regarder, Distribution, Dans la même veine, sticky watch bar -- the deliverable.
- [x] `features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css` -- declare the handoff palette as local custom properties -- keeps the rebrand off `theme.css`.
- [x] `features/shorts/components/ShortFilmDetail/ShortFilmDetail.test.tsx` -- cover every I/O matrix row -- conditional-section omission and share fallbacks are the regression-prone paths.
- [x] `features/shorts/components/ShortFilmDetail/ShortFilmDetail.stories.tsx` -- full / minimal / AR-RTL -- `.storybook/preview.tsx:63-71` already wraps in `NextIntlClientProvider`.
- [x] `app/[locale]/shorts/[slug]/page.tsx` -- render `ShortFilmDetail`; leave `generateStaticParams`, `generateMetadata`, `notFound()` unchanged.
- [x] `app/[locale]/shorts/[slug]/ShortFilmDetailPage.tsx` -- delete -- removes the duplicate implementation.
- [x] `app/[locale]/shorts/[slug]/page.test.tsx` -- added during the step-03 matrix audit -- the unknown-slug `notFound()` row is route-owned and unreachable from the component suite.

**Acceptance Criteria:**

- Given a film with awards, streaming links, cast and related shorts, when the FR page renders, then every in-scope handoff section appears in the handoff's order with the handoff's copy.
- Given `locale === "ar"`, when the page renders, then direction is RTL, copy is Arabic, numerals are Western, and no element uses a physical `left`/`right` property.
- Given the component source, when grepped for user-visible French literals, then none are found.
- Given `yarn type-check`, `yarn lint` and `yarn test`, then all pass with no new warnings.
- Given the diff, when inspected, then `styles/theme.css` and `styles/globals.css` are unmodified and `shorts.types.ts` gains no new fields.

## Spec Change Log

## Design Notes

**Why route-scoped tokens.** The handoff palette contradicts the live brand tokens; the global rebrand is a separate deferred story. Declaring the palette on the detail page's root means that story deletes this block and inherits from `theme.css` with no markup change:

```css
[data-tiween-shorts-detail] {
  --sfd-bg-raised: #241326;
  --sfd-control: #31203a;
  --sfd-border-strong: #4a3556;
  --sfd-gold: #d4a24a;
  --sfd-gold-text: #e0b563;
  --sfd-gold-ink: #2a1a06;
  --sfd-accent: #5fd0c2; /* shorts category accent */
}
```

**Shorts accent is teal, not gold.** The handoff README assigns gold to Cinéma — but `Court Métrage Détail.dc.html:55` uses teal `#5FD0C2` for the "Court métrage" chip. Follow the file, not the README table.

**Heart pulse.** Reuse `.animate-watchlist-pulse` (`globals.css`) rather than porting `@keyframes pulseHeart` — same shape, already reduced-motion-guarded. Both glyphs stack absolutely inside one 52px control (outline at rest, fill crossfading over it) so toggling causes no layout shift.

## Verification

**Commands:**

- `yarn type-check` -- expected: exits 0, no new errors
- `yarn lint` -- expected: exits 0, no new warnings
- `yarn test` -- expected: all pass, including the new `ShortFilmDetail.test.tsx`
- `git diff --stat -- apps/client/src/styles/ apps/client/src/features/shorts/types/` -- expected: empty output
- `git diff -- apps/client/package.json` -- expected: exactly one added dependency line beyond the pre-existing `type-check` rename

**Manual checks:**

- `/fr/shorts/khalaa` and `/ar/shorts/khalaa` side by side: hero glyph, back caret, chips, scrim direction and sticky-bar CTA all mirror; no horizontal overflow at 390px.
- Keyboard-only traversal reaches back, share, heart, watch, trailer, every streaming CTA and both horizontal scrollers, each with a visible gold focus ring.

## Suggested Review Order

**Page composition — start here**

- Entry point: the whole handoff screen, all copy via `useTranslations("shorts")`.
  [`ShortFilmDetail.tsx:114`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx#L114)

- Route now renders the feature component; `notFound()` and SEO left untouched.
  [`page.tsx:77`](../../apps/client/src/app/[locale]/shorts/[slug]/page.tsx#L77)

**External-link safety — highest risk**

- Single chokepoint: non-blank + `http(s)` only, gating both `window.open` and `href`.
  [`ShortFilmDetail.tsx:63`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx#L63)

- Watch target resolution: first valid streaming URL, else trailer, else nothing.
  [`ShortFilmDetail.tsx:176`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx#L176)

- Share: only `AbortError` is a dismissal; every other rejection falls to clipboard.
  [`ShortFilmDetail.tsx:193`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx#L193)

**Truthfulness of the awarded chip**

- "Primé" now requires an actual win, not a mere festival selection.
  [`ShortFilmDetail.tsx:169`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx#L169)

- Unmapped CMS platform values fall back rather than rendering a blank name.
  [`ShortFilmDetail.tsx:34`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx#L34)

**Route-scoped palette — the deferred rebrand hinges on this**

- Every literal lives in this one block, so the rebrand story deletes exactly it.
  [`ShortFilmDetail.module.css:18`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css#L18)

- Outline-only focus ring; a radius here would square off the pill controls.
  [`ShortFilmDetail.module.css:91`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css#L91)

- Bottom reserve accounts for the sticky bar's safe-area inset.
  [`ShortFilmDetail.module.css:162`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css#L162)

- Reduced motion preserves the play disc's centering translate, in both directions.
  [`ShortFilmDetail.module.css:773`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css#L773)

**Supporting**

- New `shorts` namespace; FR/AR verbatim from the handoff, EN translated.
  [`fr.json:1152`](../../apps/client/locales/fr.json#L1152)

- 30 tests: every I/O matrix row, plus FR/AR/EN key-resolution coverage.
  [`ShortFilmDetail.test.tsx:1`](../../apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.test.tsx#L1)

- 7 route tests: unknown-slug 404, and the related shelf excluding its own film.
  [`page.test.tsx:1`](../../apps/client/src/app/[locale]/shorts/[slug]/page.test.tsx#L1)
