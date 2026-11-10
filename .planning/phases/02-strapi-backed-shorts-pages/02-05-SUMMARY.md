---
phase: 02-strapi-backed-shorts-pages
plan: 05
subsystem: frontend-shorts-detail
tags: [next-intl, intl, rtl, a11y, axe-core, vitest]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: reshaped ShortFilm types and mapper (plan 01), Phase 2 copy and axe helper (plan 02)
provides:
  - crew.ts (groupCrewByDepartment, resolveRoleLabel, humanizeSlug, DEPARTMENT_ORDER)
  - placeNames.ts (countryNames, languageNames, joinNames)
  - initials.ts (getInitials) and the InitialsDisc element (40px crew, 88px cast)
  - fallbackLang.ts (fallbackTextAttrs), reusable on the card in plan 09
  - ShortFilmDetail with Equipe artistique, original-title line, origin line, access sub-label and silent French-fallback tagging
affects: [02-09, 02-10]

actuals:
  tokens: 19000
  tasks: 2
  commits: 2
plan_head_before: 706cae07016d5daef6bbe3c3fc4b9e335bfe3c35
plan_head_after: 3e15906ef192c902dd7dc6dab7b2f261e7075907

tech-stack:
  added: []
  patterns:
    - "Catalog-free pure utilities: the component builds the override map and passes a minimal translator (callable plus has)"
    - "Message with an embedded value split on a private-use sentinel so the value gets its own bdi"
    - "Fallback text tagged per node (lang, dir) with no visible label; Arabic pages add a script heuristic"

key-files:
  created:
    - apps/client/src/features/shorts/utils/crew.ts
    - apps/client/src/features/shorts/utils/crew.test.ts
    - apps/client/src/features/shorts/utils/placeNames.ts
    - apps/client/src/features/shorts/utils/placeNames.test.ts
    - apps/client/src/features/shorts/utils/initials.ts
    - apps/client/src/features/shorts/utils/initials.test.ts
    - apps/client/src/features/shorts/utils/fallbackLang.ts
    - apps/client/src/features/shorts/utils/fallbackLang.test.ts
    - apps/client/src/features/shorts/components/ShortFilmDetail/InitialsDisc.tsx
  modified:
    - apps/client/src/features/shorts/utils/index.ts
    - apps/client/src/features/shorts/types/shorts.types.ts
    - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx
    - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css
    - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.test.tsx

key-decisions:
  - "D-09: role label = trimmed customRole, else shorts.crew.roles.<slug> (slug limited to [a-z0-9-], checked with has), else humanized slug, else the department word; never blank"
  - "D-19: codes are shape-checked before Intl.DisplayNames; none never reaches Intl; aeb and ber come from caller overrides; an echoed code is dropped"
  - "D-11: Arabic page plus Arabic-script text is never tagged, whatever the served locale says (a French row can hold an Arabic string)"
  - "D-12 and D-21: people are a plain aria-hidden span; photo field removed from ShortFilmPerson; no avatar library"

requirements-completed: []

completed: 2026-11-10
---

# Phase 2 Plan 05: Detail page content from the real data Summary

**The short-film detail page now shows the Equipe artistique grid, original-title and origin lines, access-type sub-labels under ten platforms, and plain initials discs, with the French fallback tagged silently (`lang="fr"`, plus `dir="ltr"` on Arabic pages), all axe-clean in fr, ar and en.**

## Accomplishments

- **Utilities (Task 1, `788c758`).** Four pure, tested modules exported through `utils/index.ts`. Crew groups follow the fixed 12-department order and sort by billing (unbilled last, API order for ties) without merging a person's two roles. Place names go through `Intl.DisplayNames` only after a shape check, with `aeb` and `ber` supplied as overrides. Initials use `Intl.Segmenter` graphemes (with a code-point fallback for engines without it) and a U+200C between two Arabic letters. Fallback tagging implements RESEARCH Pitfall 11.
- **Detail page (Task 2, `3e15906`).**
  - Hero: the h1 title bdi carries the fallback attrs. The original-title line appears only when it differs from the title after NFD, mark stripping and lowercasing; it is built by formatting `shorts.originalTitle` with a sentinel and splitting, so the title sits in its own `bdi dir="auto"` (with `lang="ar"` only for Arabic script). The origin line joins country and language names, each group behind a visually hidden plural-aware label ("Pays:", "Langue:").
  - Equipe artistique: an h2 before Distribution, an h3 per department, a `ul role="list"` of rows (40px disc, name over role); one column, two from the 30rem `sfd-content` container, 16px column gap, 24px between groups, 8px between rows. Omitted without credits.
  - Where to watch: platform names extended to the ten values; the access sub-label (translated type, then the editor label verbatim in a bdi) shows only for one of the four known access types; the safe-href logic is untouched.
  - Cast rail: the 88px initials disc replaces the empty stripe avatar; the person-photo branch and the `photo` type field are gone.
  - The heart stays local state (plan 09 replaces it).

## Verification (real output)

| Verify                                                                                                                    | Result                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `yarn workspace @tiween/client vitest run src/features/shorts/utils` (Task 1)                                             | Test Files 5 passed (5), Tests 73 passed (73); the four new files are listed         |
| RED check before implementing                                                                                             | Test Files 4 failed (5) on missing modules, Tests 21 passed (the old mapper suite)   |
| `yarn workspace @tiween/client vitest run src/features/shorts` (Task 2)                                                   | Test Files 10 passed (10), Tests 207 passed (207); ShortFilmDetail.test.tsx 90 tests |
| `yarn workspace @tiween/client tsc --noEmit`                                                                              | exit 0, `grep -c "error TS"` prints 0                                                |
| `yarn workspace @tiween/client eslint src/features/shorts --max-warnings=0` (also `src/features/shorts/utils` for Task 1) | exit 0, no output besides the browserslist notice                                    |
| `prettier --check src/features/shorts`                                                                                    | All matched files use Prettier code style                                            |
| `vitest run "src/app/[locale]/shorts" src/app/api/shorts` (regression)                                                    | Test Files 2 passed, Tests 29 passed                                                 |
| Pre-commit hook (repo-wide lint) on both commits                                                                          | Tasks 2 successful, 2 total                                                          |

Acceptance points covered by tests: Intl.DisplayNames is not called for `none` and no raw code reaches the output; the full fixture renders the Equipe artistique heading with groups Réalisation, Production, Image, Montage in the stated order; no `@radix-ui`, `components/ui/avatar` or `.photo` remains in the component (source-grep test plus tsc); axe passes for full, sparse and French-fallback records in fr, ar and en.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Intl.ListFormat` unit/narrow produced unreadable output**

- **Found during:** Task 1
- **Issue:** The plan and UI-SPEC say `{ type: "unit", style: "narrow" }`. On Node 22 / ICU 77 that joins Latin-script names with a bare space in fr and en ("Tunisie France", "Tunisia France"), which reads as a single name and contradicts the approved mockup ("Tunisie, France").
- **Fix:** `joinNames` uses `type: "unit", style: "short"`: en "Tunisia, France", fr "Tunisie et France", ar "تونس وفرنسا". Still `Intl.ListFormat` with the numeral-safe locale. Tests pin the three outputs.
- **Files modified:** `utils/placeNames.ts`, `utils/placeNames.test.ts`
- **Commit:** 788c758

**2. [Rule 2 - Missing critical functionality] Sticky bar title is tagged as well**

- **Issue:** The plan says to spread `fallbackTextAttrs` on the title bdi and the synopsis "and nowhere else". The sticky watch bar repeats the title as visible text, so on a fallback page it would be read in the wrong language.
- **Fix:** The same attrs are spread on the sticky-bar title bdi. No new visible text.
- **Commit:** 3e15906

**3. [Process] The `photo` type removal landed in the Task 2 commit, not Task 1**

- Removing `ShortFilmPerson.photo` breaks tsc until the component's photo branch is gone, so the type edit was committed together with that deletion to keep every commit type-clean.

**4. [Rule 1 - Bug, in own work] Arabic text on an Arabic page is never tagged**

- A French-row title can be an Arabic-script string; tagging it `lang="fr" dir="ltr"` would be wrong. `fallbackTextAttrs` returns `{}` for Arabic-script text on an Arabic page regardless of the served locale (the plan's behavior list already states "Arabic text on an ar page gives {}").

### Design notes

- UI-SPEC wins over the mockup board where they differ: crew name 16/700 and role 14/400 (board draws 14/600 and 12/400), one column at 390px (board draws two), department heading 14/700. The board's "Nouveau" markers are not shipped.
- When a link has an editor `label` but no valid `accessType`, no sub-label is shown (UI-SPEC A3: no sub-label without a known access type), so the label is dropped.
- The origin-line hidden labels render as "Pays: " (ASCII colon) in every locale.

**Total deviations:** 4 (1 bug, 1 missing-critical, 1 process, 1 in-work correction).

## Findings for later plans

- **English-page fallback is a heuristic gap.** The API reports one served locale per item, so an English page with a French synopsis under an English title cannot be told apart by script. The tagging relies on `item.locale` and accepts the rare mis-tag. Log a Phase 3+ API ticket: add a `fallbackFields` array to the short-film DTO (RESEARCH Open Question 2).
- **Plan 09** reuses `fallbackTextAttrs` on the card and edits the same `ShortFilmDetail.tsx` (heart); the local `saved` state and the `shorts.watchlist` keys are intentionally untouched.
- **Arabic copy** for departments, roles and access types is still the UI-SPEC draft awaiting the owner's review (Phase 6).

## Manual contrast pass for Plan 10 (jsdom cannot assert contrast)

From UI-SPEC Color, to be measured on the real page at 390px in fr and ar:

1. Initials (Foreground `#FFFFFF`) on the disc fill Surface Raised `#3E2A48`, 14/700 at 40px and 18/700 at 88px (spec figure 12.9:1).
2. Muted `#B0A6B8` on the page field `#241326`: department headings, crew role, access sub-label.
3. Muted `#B0A6B8` on Surface `#31203A` (the streaming row): the access sub-label (spec figure 6.3:1 or better).
4. Muted `#B0A6B8` over the real hero scrim: the original-title line and the origin line, worst case over a bright backdrop (darken the scrim stop, not the text, if it falls under 4.5:1).
5. Disc stroke `#4A3556` against the page field: non-text 3:1 is not required for a decorative disc, but record the value.
6. Visual RTL at 390px: crew rows fill right to left with the disc on the right; a French fallback block inside an Arabic page is left-aligned.

## Known Stubs

None. The heart is local state on purpose until plan 09; it is tracked by that plan, not a stub of this one.

## Threat Flags

None beyond the plan's register. T-02-12 (all editor text rendered as React text; hostile-markup test added) and T-02-13 (code shape validated before Intl, try/catch, raw codes never printed) are mitigated and tested; T-02-SC: no package installed.

## Self-Check: PASSED

- FOUND files: crew.ts, placeNames.ts, initials.ts, fallbackLang.ts (and their tests), InitialsDisc.tsx, ShortFilmDetail.tsx, ShortFilmDetail.module.css, ShortFilmDetail.test.tsx, shorts.types.ts
- FOUND commits: 788c758, 3e15906 (ancestors of HEAD)
