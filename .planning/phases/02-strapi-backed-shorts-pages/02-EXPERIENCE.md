---
phase: 02-strapi-backed-shorts-pages
doc: EXPERIENCE
mockup_status: pending
mockups: []
mockups_outstanding:
  - 1. Detail FR 390, full data (hero with original title and origin line; heart unsaved and saved; Équipe artistique with three departments; access sub-label on two platforms)
  - 2. Detail AR 390 (RTL), full data
  - 3. Detail FR 390, sparse data (no original title, no crew beyond the director, no streaming link)
  - 4. Detail error FR 390
  - 5. Detail not found FR 390
  - 6. Card states sheet FR (390 close-ups and 1280 grid slice)
  - 7. Card states sheet AR (390 close-ups and 1280 grid slice)
  - 8. Directory FR 390, 13 films with the result line
  - 9. Directory AR 390 (RTL)
  - 10. Directory FR 1280
  - 11. Directory error FR 390
  - 12. Directory empty catalogue FR 390
  - 13. Directory Load more FR 390 (idle, loading, error)
  - 14. Watchlist FR 390, mixed list (events and short films in the one "À venir" section)
mockup_brief: 02-DESIGN-BRIEF.md
---

# Strapi-backed shorts pages — experience

Flows, rules, states and copy for the surfaces placed in `02-DESIGN.md`. Everything not
listed here follows `02-UI-SPEC.md` (Parts A to G and the copywriting contract). Copy is
referenced by key and table, not repeated.

`mockup_status` stays `pending` until the owner has reviewed and approved the Claude Design
mockups listed in the frontmatter. **No code before `mockup_status: approved`.**

## Core journeys

### 1. From Instagram to watching a film

| Step | What the visitor does                                       | What the page does                                                                                                        |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1    | Taps a Tiween link in an Instagram story or bio, on a phone | Opens `/fr/shorts/<slug>` (or `/ar`, `/en`) in the in-app browser. Server-rendered from the Strapi API, cached 60 seconds |
| 2    | Sees the film title and one gold pill                       | Hero shows title, original title, meta line, origin line; "Regarder le film" sits directly beneath                        |
| 3    | Taps "Regarder le film", or scrolls to "Où regarder"        | Opens the film on the platform. The sub-label tells them if it is free, on subscription or a rental before they tap       |
| 4    | Optionally reads the synopsis, distinctions and crew        | Sections appear only when they have data                                                                                  |
| 5    | Optionally taps the heart                                   | See journey 3                                                                                                             |

Success: the visitor reaches the platform in one tap from the hero, without signing in.

### 2. Directory to card to detail

| Step | What the visitor does            | What the page does                                                                                                       |
| ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | Opens `/fr/shorts`               | Intro, "13 courts métrages", first row of posters above the fold. Page 1 is real `<a>` links before JavaScript loads     |
| 2    | Scrolls the grid                 | 13 films at launch fit one page; no Load more. Beyond 24, "Afficher plus" (or the scroll observer) appends the next page |
| 3    | Taps a poster                    | Opens the detail page                                                                                                    |
| 4    | Taps the heart on a card instead | Heart acts on its own; the page does not navigate                                                                        |
| 5    | Reaches the end                  | The suggestion prompt, once the list is complete                                                                         |

### 3. The heart

One state machine for the card and the detail page (UI-SPEC Part E). Summary:

| Situation                 | What the visitor does | Result                                                                                                                                                  |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed out                | Taps the heart        | Toast "Connectez-vous pour enregistrer ce court métrage", then redirect to sign-in with the current page as the return path. Nothing is saved or queued |
| Back from sign-in         | Returns to the page   | Heart is unsaved; the visitor taps it again (owner question 6)                                                                                          |
| Signed in, unsaved        | Taps                  | Heart fills at once with a short pulse; POST; toast "Ajouté à la watchlist"                                                                             |
| Signed in, saved          | Taps                  | Heart empties at once; DELETE; toast "Retiré de la watchlist" with "Annuler le retrait", which re-adds                                                  |
| Request fails             | (nothing)             | Heart rolls back; destructive toast "Une erreur est survenue. Veuillez réessayer."; heart stays usable                                                  |
| Offline, unsaved          | Taps                  | Heart fills; saved to the offline queue; toast "Enregistré — la synchronisation se fera une fois en ligne"; syncs on reconnect                          |
| Offline, saved            | Taps                  | Heart empties; queued remove; "Retiré" toast with "Annuler le retrait"                                                                                  |
| Offline queue write fails | Taps                  | Error toast and no optimistic change. The page never claims "queued" for something that was not stored                                                  |
| Session still loading     | Taps                  | No-op; a hydrating signed-in visitor is never bounced to sign-in                                                                                        |
| Saved state not yet known | Taps                  | Ignored. Card shows the unsaved outline with `aria-busy`; the detail heart shows a spinner after 200ms                                                  |
| Toggle in flight          | Taps again            | Ignored until it settles (no double request, no racing an Undo)                                                                                         |

Rules:

- Cached (ISR) HTML always ships the unsaved, enabled heart. A signed-in visit corrects it
  after hydration with no layout shift.
- The directory resolves every heart from one watchlist query, not one request per card.
- Feedback is a polite toast plus the `aria-pressed` change. There is no persistent
  "pending sync" marker on the heart.
- Removal is reversible, so there is no confirm dialog.

### 4. Outage, retry, recovery

| Step | What happens                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Strapi is unreachable, slow, returns 5xx, or returns a malformed body                                                                                              |
| 2    | The fetcher throws a typed error; `error.tsx` renders. Directory: intro stays, error block replaces result line and grid. Detail: error block under the app header |
| 3    | Visitor taps "Réessayer". The button is `aria-busy`, with a spinner after 200ms; the page refreshes without a full reload                                          |
| 4a   | Success: the content replaces the block, scroll stays at the top, focus moves to the h1                                                                            |
| 4b   | Failure again: the block stays, focus stays on the button                                                                                                          |
| 5    | A failed Load more keeps the cards already shown and offers an inline "Réessayer"                                                                                  |

An outage is never shown as "Aucun court métrage", an empty grid, or a 404. A deploy never
depends on Strapi being reachable (no build-time pre-rendering).

### 5. Unknown slug

`/fr/shorts/<unknown>` resolves to the API's `SHORT_FILM_NOT_FOUND` only, which becomes a
real 404 with the "Court métrage introuvable" block and one gold pill back to the directory.
Any other failure is journey 4.

### 6. Missing translation

A visitor on `/ar/shorts/<slug>` where the film has no Arabic title or synopsis sees the
French text in place, with no label and no notice. The page chrome stays Arabic. The French
nodes carry `lang="fr"` (and `dir="ltr"` on the Arabic page) so screen readers switch voice
and fonts switch correctly. A title is never blank; a missing synopsis omits the section.

## Interaction rules

### Paging

- Page size 24. Server-render page 1; "Afficher plus" fetches the next page client-side
  through a route handler. The scroll observer (400px margin) is an additive path; the button
  is the keyboard and no-observer path. Appends are de-duplicated by `documentId`.
- Appended cards never take focus. If the control survives, focus stays on it; if the list is
  now complete and the button unmounts, focus moves to the first newly appended card's link.
- The result line is a polite live region and announces the count after Load more.

### Focus and order

- Each card has two controls in DOM order: the whole-card link, then the heart (then the
  desktop trailer button, unchanged). The heart is never inside the link.
- Global 3px Gold Leaf focus ring with 2px offset; dark ring on gold-filled pills. Tab order
  equals visual order in both directions.
- Retry: focus stays on the button if it fails again; on success focus moves to the h1
  (`tabindex="-1"`).

### Reduced motion (`prefers-reduced-motion: reduce`)

No pulse on save, no heart crossfade, no card lift, static skeletons, static spinner glyph
(busy state still conveyed by `aria-busy`), instant scroll and focus moves.

### Data rules the design depends on

| Rule                                                                                      | Why it matters to the design                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Only allowlisted params reach the API (`locale`, `page`, `pageSize`, `sort`)              | No filter UI can exist this phase                                              |
| List sort is the API default `publishedAt:desc`                                           | No sort control                                                                |
| `WatchlistItem.creativeWork` must also return `slug` (optional `releaseYear`, `duration`) | Without it the watchlist entry cannot link. Planner blocker, not a UI fallback |
| `aeb` (Tunisian Arabic) needs a three-locale display-name override                        | The origin line must never print a raw code                                    |

## States

| Surface           | Loading                                        | Empty                                               | Error                                                     | Partial                                                                              |
| ----------------- | ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Directory grid    | `loading.tsx` skeleton grid; Load more spinner | Empty-catalogue block (only on HTTP 200, zero rows) | Intro plus error block with retry; inline load-more error | Missing poster = stripe; missing director, year or duration = that part omitted      |
| Card              | Skeleton, no heart                             | n/a                                                 | n/a                                                       | No year and no duration = no second meta line; no director = line 1 omitted          |
| Heart             | Unresolved (outline, `aria-busy`)              | n/a                                                 | Rollback plus toast                                       | n/a                                                                                  |
| Detail hero       | Hero skeleton                                  | No backdrop = reserved artwork                      | Error block                                               | No original title, country or language = those lines absent                          |
| Équipe artistique | Part of the page render                        | No non-cast credit = section omitted                | Part of the page error                                    | Unknown slug = humanized slug; unknown department = "Autres"; no billing = API order |
| Where to watch    | Part of the page render                        | No streaming links = section omitted                | Part of the page error                                    | No or unknown `accessType` = no sub-label; unusable URL = no "Regarder" button       |
| Watchlist entry   | Existing page skeleton                         | Existing empty state                                | Existing page error                                       | No year or duration = no meta line                                                   |

Never an apology, never a fake success, never mock films shown as real.

## Copy references

All strings, keys and the FR / AR / EN values are in `02-UI-SPEC.md` § Copywriting Contract.
Do not duplicate them here; change them there.

| Need                                                                     | UI-SPEC table                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| Buttons, headings, heart labels, toasts, original-title and origin lines | Primary actions and labels                     |
| "Gratuit", "Inclus", "Sur abonnement", "À la location"                   | Access-type sub-label (`shorts.access.*`)      |
| Crew department headings (12)                                            | Crew departments (`shorts.crew.departments.*`) |
| Crew role labels (21 seeded slugs, `customRole` wins)                    | Crew roles (`shorts.crew.roles.<slug>`)        |
| Empty, error, not-found, load-more, end-of-list copy                     | States                                         |
| Keys removed or replaced                                                 | Note under States                              |

Voice: calm, clear, reassuring, French by default, never apologetic; every empty or error
state offers a next action. Errors render through `t('errors.<CODE>')`; the UI never prints
a code or a status number. The only error-code keys added are `errors.INTERNAL_ERROR`,
`errors.NETWORK_ERROR` and `errors.SHORT_FILM_NOT_FOUND`; `UNSUPPORTED_LOCALE`,
`VALIDATION_FAILED` and unknown codes resolve to `errors.INTERNAL_ERROR`.

## Accessibility checklist

- [ ] One `<h1>` per page (directory "Courts métrages"; detail = the film title); detail sections `<h2>`; crew departments `<h3>`; grid under an sr-only `<h2>`; cards are `<article>` with an `<h3>` title.
- [ ] Heart accessible name includes the film ("Ajouter « {title} » à ma watchlist"); `aria-pressed` and label always agree with the shown state.
- [ ] Every target at least 44px with at least 8px between targets (detail heart is 52px).
- [ ] Result line and load-more loading are `role="status"`; directory error, detail error and inline load-more error are `role="alert"`; empty catalogue and not found are plain content.
- [ ] Status is never color alone: saved vs unsaved is filled vs outline plus `aria-pressed`; every error icon sits beside text; the access type is text.
- [ ] 200% zoom and 320px width: no horizontal page scroll (rails scroll inside themselves).
- [ ] RTL: `dir="rtl"`, logical properties, Western digits, `<bdi>` on every title, name, country, language, platform and editor label.
- [ ] axe-core clean at 390px in fr, ar and en for: directory (results, empty, error), detail (full data, sparse data, error, not found), watchlist with a short-film entry.
- [ ] Manual contrast pass recorded (jsdom cannot compute it): initials on Surface Raised, muted text on Surface, the Gold Leaf heart glyph over real posters.

## Open questions for owner

None blocks the pipeline; each has a default the planner can build against. Settle them at
the mockup review.

1. **Section heading over the one mixed list.** One list is decided (D-16). Short films fall
   into "À venir" after dated events, which is slightly off for an undated film. Default:
   keep "À venir" with no new section. Alternative: a separate "À voir" section for short
   films (third partition, new key).
2. **Meaning of `accessType: included`.** Default: label "Inclus" as a placeholder. Say what
   it means for a visitor and the FR, AR and EN labels become exact.
3. **Show the streaming `label` (for example "VOST")?** Default: yes, after the access type,
   as editor-supplied untranslated text. Alternative: hide it, or make it a controlled value.
4. **Heart disc style.** Default: dark scrim disc with a filled Gold Leaf glyph. Alternative:
   a full Gold Leaf disc with a dark heart (louder on busy posters, but gold on every saved card).
5. **Duration and year placement on the card.** Default: second meta line "2025 · 14 min"
   under the director. Alternative: the top-start stack. The mockup confirms.
6. **Return after sign-in.** Default: back on the page, the visitor taps the heart again.
   Alternative: remember the intent and save automatically after sign-in.
7. **Terminology.** Default: "watchlist" everywhere (matches the shipped page title and
   Arabic "قائمة المتابعة"), replacing the shorts-only "Ma liste". Alternative: "Ma liste" site-wide.
8. **Arabic review.** The Arabic role, department, access-type and error strings are drafts.
   Default: the owner reviews them before launch (Phase 6 carries the Arabic review).
9. **Watchlist page copy that still says "événements"** (subtitle, empty state, "Aucun
   événement dans cette catégorie"). Default: deferred to Phase 6 so the shorts feature is
   not advertised while unlinked. Alternative: pull a neutral rewrite into this phase.
