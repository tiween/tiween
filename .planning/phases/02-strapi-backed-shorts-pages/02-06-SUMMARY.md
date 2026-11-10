---
phase: 02-strapi-backed-shorts-pages
plan: 06
subsystem: frontend-shorts-states
tags:
  [
    next-app-router,
    error-boundary,
    not-found,
    loading,
    a11y,
    axe-core,
    vitest,
    next-intl,
  ]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: "[slug] layout guard that throws notFound() or rethrows the outage (plan 01), Phase 2 copy in fr/ar/en, shadcn Empty and the axe helper (plan 02)"
provides:
  - "shorts/error.tsx: one retryable error boundary for the directory and the detail page, retry = refresh + reset in a transition"
  - "shorts/not-found.tsx: Court metrage introuvable block with one gold pill to /shorts, locale taken from the provider"
  - "shorts/loading.tsx and shorts/[slug]/loading.tsx: layout-matched, aria-busy, reduced-motion-safe skeletons"
  - "ShortsPageIntro, SHORTS_GRID_CLASS, SHORTS_PAGE_CLASS, ShortsStateBlock, ShortsWordmarkHeader"
  - "retryFocus.ts (markRetryPending / consumeRetryFocus) so a successful retry lands focus on the h1"
  - "shorts probe asserts the shorts error and not-found markup in the page locale"
affects: [02-08, 02-09, 02-10]

actuals:
  tokens: 14700
  tasks: 2
  commits: 3
plan_head_before: f7026a1cb6de4599f8d956ec3376d9aea8f0ab1d
plan_head_after: bdbd4b9b3c497214cac01f682cca8dbc85080688

tech-stack:
  added: []
  patterns:
    - "Error boundary picks copy from navigator.onLine through useSyncExternalStore (server snapshot online), never from the error"
    - "Retry hand-off through module state with a 15s expiry: the boundary marks, the next heading consumes, a remounted boundary reclaims focus for the button"
    - "Shared presentational state block (shadcn Empty parts) with explicit heading level, so error and not-found never fork"

key-files:
  created:
    - apps/client/src/app/[locale]/shorts/error.tsx
    - apps/client/src/app/[locale]/shorts/error.test.tsx
    - apps/client/src/app/[locale]/shorts/not-found.tsx
    - apps/client/src/app/[locale]/shorts/not-found.test.tsx
    - apps/client/src/app/[locale]/shorts/loading.tsx
    - apps/client/src/app/[locale]/shorts/loading.test.tsx
    - apps/client/src/app/[locale]/shorts/[slug]/loading.tsx
    - apps/client/src/app/[locale]/shorts/[slug]/loading.test.tsx
    - apps/client/src/features/shorts/components/shortsLayout.ts
    - apps/client/src/features/shorts/components/ShortsPageIntro/ShortsPageIntro.tsx
    - apps/client/src/features/shorts/components/ShortsPageIntro/ShortsPageIntro.test.tsx
    - apps/client/src/features/shorts/components/ShortsPageIntro/index.ts
    - apps/client/src/features/shorts/components/ShortsBoundary/ShortsStateBlock.tsx
    - apps/client/src/features/shorts/components/ShortsBoundary/ShortsWordmarkHeader.tsx
    - apps/client/src/features/shorts/components/ShortsBoundary/index.ts
    - apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCardSkeleton.test.tsx
    - apps/client/src/features/shorts/utils/retryFocus.ts
    - apps/client/src/features/shorts/utils/retryFocus.test.ts
  modified:
    - apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCardSkeleton.tsx
    - apps/client/scripts/shorts-probe/probe.mjs

key-decisions:
  - "D-07: only not-found.tsx says introuvable; everything else on the segment is the retryable alert. The directory variant keeps the intro, the detail variant sits under a wordmark header with a browse-all link"
  - "T-02-14: the DOM never carries error.message, digest, a status number or an API code; the body is errors.NETWORK_ERROR when offline, errors.INTERNAL_ERROR otherwise"
  - "RESEARCH Pitfall 5: retry is startTransition(() => { router.refresh(); reset() }); aria-disabled (not disabled) while pending so keyboard focus survives"
  - "ShortsPageIntro claims a pending retry focus by default (Plan 08 gets it free); the error boundary and the loading skeleton pass restoreFocus={false}"

requirements-completed: []

duration: 20min
completed: 2026-11-10
---

# Phase 2 Plan 06: Error, not-found and loading states Summary

**A Strapi outage on `/shorts` or `/shorts/<slug>` now renders a role-alert block with a gold Reessayer pill that really refetches (refresh + reset in one transition), an unknown slug renders its own plain Court metrage introuvable block, and both routes stream layout-matched, accessible skeletons; axe is clean in fr, ar and en and the production probe passes 33 of 33.**

## Performance

- **Duration:** about 20 min
- **Tasks:** 2 of 2, plus the probe update the orchestrator asked for (3 commits)
- **Files:** 18 created, 2 modified

## Accomplishments

- **Error boundary (Task 1, `e7bdd8b`).** One `shorts/error.tsx` for the segment, branching on the locale-less pathname. Directory: the real intro (h1 + description) above an alert block "Le catalogue ne repond pas". Detail: a 56px wordmark header, the alert block "Ce court metrage ne se charge pas" and a "Voir tous les courts metrages" link to `/shorts`. Body copy is chosen by `navigator.onLine` (read through `useSyncExternalStore` with an online server snapshot, so SSR and hydration agree and a connection change updates the text live). The error is only `console.error`ed.
- **Retry.** `startTransition(() => { router.refresh(); reset() })`, refresh first. While pending the button is `aria-busy` and `aria-disabled` (not `disabled`, so focus stays), a `Loader` spinner replaces the icon only after 200ms, and a second click is ignored. The click calls `markRetryPending()`; if the retry fails and the boundary mounts again, a mount effect hands focus back to the button, and if it succeeds the page heading takes the mark (`ShortsPageIntro` by default, detail h1 in Plan 09).
- **Not found.** `shorts/not-found.tsx`: wordmark header, Film glyph in the muted token, h1 "Court metrage introuvable", `errors.SHORT_FILM_NOT_FOUND`, exactly one primary pill to `/shorts`, no alert role. It is a client component so copy comes from the layout's `NextIntlClientProvider` rather than a server-side `getTranslations()` with no locale.
- **Shared pieces.** `ShortsPageIntro` (h1 `tabIndex -1`, 660px description), `ShortsStateBlock` (shadcn `Empty` parts, max 420px, 48px vertical padding, explicit h1/h2), `ShortsWordmarkHeader`, `SHORTS_GRID_CLASS` (the existing 2/3/4/5/6 grid) and `SHORTS_PAGE_CLASS` (16/24px gutter, 1280px, 16/32/48 top rhythm, bottom nav clearance).
- **Loading (Task 2, `bebf928`).** Directory: real intro, a 120px result-line bar and 12 `ShortFilmCardSkeleton` in the shared grid. Detail: a `clamp(440px, 62vw, 580px)` Surface hero with the `ReservedArtwork` stripe, three title bars and a 52px round block. Both are `aria-busy` with a visually hidden `role="status"`, static under reduced motion (`motion-reduce:[&_*]:animate-none` on the root), no spinner and no gold. The card skeleton radius is now `rounded-2xl` (16px) to match the loaded card.
- **Probe (`bdbd4b9`).** `expectHydrated` now asserts the shorts boundaries: not-found = introuvable headline and body in the page locale, no `role="alert"`, no generic or error copy; error = `role="alert"`, the detail error headline and the retry label in the page locale, no not-found copy, no generic copy, nothing from another locale. HTTP status stays INFO under D-22.

## Verification (real output)

| Verify                                                                                                     | Result                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Task 1: `vitest run error.test.tsx not-found.test.tsx retryFocus.test.ts` (the plan's command)             | Test Files 3 passed (3), Tests 43 passed (43), exit 0                                                              |
| RED before implementing                                                                                    | error test file failed on the missing `./error` module ("no tests"), retryFocus ran green after its implementation |
| Mutation check on error.tsx (reset before refresh, focus effect removed)                                   | 2 tests failed as expected, file restored from the committed version                                               |
| Task 2: `vitest run loading.test.tsx [slug]/loading.test.tsx src/features/shorts/components/ShortFilmCard` | Test Files 4 passed (4), Tests 21 passed (21), exit 0                                                              |
| Baseline for Task 2: neither `loading.tsx` existed at HEAD (`test -e` exit 1 before), both exist now       | confirmed                                                                                                          |
| `yarn workspace @tiween/client tsc --noEmit`                                                               | exit 0, `grep -c "error TS"` prints 0                                                                              |
| `eslint "src/app/[locale]/shorts" src/features/shorts --max-warnings=0`                                    | exit 0                                                                                                             |
| `vitest run "src/app/[locale]/shorts"`                                                                     | Test Files 7 passed (7), Tests 83 passed (83)                                                                      |
| `vitest run src/features/shorts`                                                                           | all green (Test Files 20 passed, Tests 302 passed in the combined run before the probe edit)                       |
| `node apps/client/scripts/shorts-probe/probe.mjs --detail-only` (full run, builds with Strapi down)        | `PROBE PASS (33 checks)`; hydrated-DOM checks all PASS; status lines INFO (200 under D-22)                         |
| Pre-commit hook (lint-staged) on all three commits                                                         | passed                                                                                                             |

Acceptance points covered by tests: refresh before reset on one click; `role="alert"`; a secret-looking message, a digest, status numbers and `UPPER_SNAKE` codes are absent from the DOM on both variants; offline versus online body key and a live `offline` event; aria-busy, aria-disabled and no second call while pending; spinner absent at 199ms and present after 200ms; focus returns to the button when the boundary remounts after a failed retry and is not stolen on a first render; directory variant has the h1, description and block, detail variant has the wordmark and a browse-all link whose href is `/shorts`; not-found has exactly one link (to `/shorts`) and no alert; axe passes for the directory error, detail error, not-found, both loading screens and the intro in fr, ar and en.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, in own design] The intro must not claim the retry focus in every state**

- **Found during:** Task 1
- **Issue:** The plan has `ShortsPageIntro` consume the pending retry mark on mount. The same component is rendered inside the error block and inside the loading skeleton; in the first case it would steal focus from the retry button after a failed retry, in the second it would take the mark and then be replaced by the real page before focus could matter.
- **Fix:** `restoreFocus` prop, default `true` (so Plan 08's directory behaves as planned), passed as `false` by `error.tsx` and `loading.tsx`. The error file consumes the mark itself on mount to return focus to the button.
- **Files modified:** `ShortsPageIntro.tsx`, `error.tsx`, `loading.tsx`
- **Commit:** e7bdd8b, bebf928

**2. [Rule 1 - Bug] The "unprefixed French renders English" finding was a probe artefact; the probe now sends Accept-Language**

- **Found during:** probe update
- **Issue:** After the shorts boundaries existed, the probe still read English copy on the unprefixed French path. A manual check against the running app showed the cause: `curl -H "Accept-Language: en-US"` on `/shorts/no-such-film` answers `307` to `/en/shorts/no-such-film` (next-intl locale detection), while no header or `Accept-Language: fr` answers 200 with `<html lang="fr">` and "Court metrage introuvable" (and the generic French "Page non trouvee" too). Headless Chrome sends `en-US`, so it landed on the English page. The generic `[locale]/not-found.tsx` is therefore not shown to be broken on the unprefixed path for a French browser.
- **Fix:** the shorts `not-found.tsx` is still a client component that follows the provider locale (explicit, robust, tested in fr/ar/en, and a French provider can never show English copy), and the probe starts Chrome with `--accept-lang=<locale>` so the French assertion exercises the French path.
- **Files modified:** `not-found.tsx`, `not-found.test.tsx`, `probe.mjs`
- **Commit:** e7bdd8b, bdbd4b9

**3. [Rule 3 - Blocking] Loading imports the skeleton file directly**

- `shorts/loading.tsx` imports `ShortFilmCardSkeleton` from its own file, not the `ShortFilmCard` barrel, because the barrel pulls `ShortFilmCard` and `@/lib/navigation` (which validates env at import) into the loading bundle and into its test.

### Design notes

- **Body text colour.** UI-SPEC names the reading text `#C9C0D0`; the theme exposes no Tailwind token for it (`text-secondary` is the Surface fill). Error, not-found and intro description use `text-muted-foreground` (`#B0A6B8`, 6.3:1 on the field), the nearest token, rather than a raw hex. If the owner wants the exact `#C9C0D0`, add a `--color-reading` token and swap one class in `ShortsStateBlock` and `ShortsPageIntro`.
- **Focus ring on gold.** DESIGN.md allows a dark or white 3px ring on gold-filled controls; the pills use a white ring with the 2px field band because a dark ring is invisible against the Aubergine field.
- **Board versus spec.** The approved FR 390 error board still draws the older filter row and a 24px headline; the UI-SPEC (which wins per its own header) says no filters on `/shorts` and Title 18/700, so the build follows the spec.
- **Skeleton pulse.** The reduced-motion rule is one class on each loading root (`motion-reduce:[&_*]:animate-none`) instead of editing the shared `Skeleton` primitive used by other pages. The global reduced-motion CSS already collapses animation timing as a backstop.
- The card skeleton keeps its top-end duration-pill skeleton ("nothing else" in the plan); Plan 09 relocates duration on the loaded card.

**Total deviations:** 3 (2 bug, 1 blocking), none touched the plan's architecture.

## Known Stubs

None. No placeholder text or mock data is rendered by any new file.

## Threat Flags

None. No new endpoint, auth path or file access was introduced; T-02-14 (no leakage) and T-02-15 (outage never shown as empty or 404) are mitigated and tested.

## Findings for later plans

- **Plan 08:** `ShortsDirectory` should import `SHORTS_GRID_CLASS` and `SHORTS_PAGE_CLASS` and render `ShortsPageIntro` (default `restoreFocus`) so the loading skeleton, the error block and the page share one footprint; render the real directory inside `<main>` or inside `SHORTS_PAGE_CLASS` to match.
- **Plan 09:** call `consumeRetryFocus(h1Ref.current)` in a mount effect on the detail h1.
- **Plan 10 manual contrast pass** (jsdom cannot assert contrast), at 390px in fr and ar: destructive `#FF8A8A` 48px icon on the field; muted `#B0A6B8` body on `#241326`; Gold Ink `#2A1A06` on the Gold Leaf pill; gold-tint `#E0B563` browse-all link on the field; the white focus ring on the pill.
- **Probe note for Plan 10:** any hydrated-DOM assertion on the unprefixed French path needs `Accept-Language: fr`, otherwise next-intl detection redirects an English browser to `/en`.
- Pre-existing, not touched: an old `lint-staged automatic backup` entry sits in `git stash list` (2026-11-08); it is not from this plan.

## Self-Check: PASSED

- All created files exist (checked below) and the three commits `e7bdd8b`, `bebf928`, `bdbd4b9` are ancestors of HEAD.
