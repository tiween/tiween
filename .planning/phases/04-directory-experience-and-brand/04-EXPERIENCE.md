---
phase: 04-directory-experience-and-brand
doc: EXPERIENCE
mockup_status: pending
mockups: []
mockups_outstanding:
  - Directory FR 390 (default, 10 sample films, end-of-grid prompt)
  - Directory FR 1280 (plus optional variant with a Lalezar h1)
  - Directory AR 390 (RTL)
  - Empty after filters FR 390 (plus optional empty-catalogue variant)
  - Error FR 390
  - Filter sheet open FR 390
  - Optional card-states sheet and loading screen
mockup_brief: 04-DESIGN-BRIEF.md
roadmap_amendment: applied 2026-11-09 (ROADMAP Phase 4 summary and criterion 1, SDIR-01, SDIR-02, FR19)
---

# Short-film directory — experience

Flows, rules, states and copy for the layout in `04-DESIGN.md`. `mockup_status` stays
`pending` until the owner has reviewed and approved the Claude Design mockups listed in
the frontmatter. No code before that.

## Core journey: from Instagram to a film

| Step | What the visitor does                                                              | What the page does                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Taps a Tiween link in an Instagram story or bio, on a phone, in the in-app browser | Opens `/fr/shorts` (or `/ar`, `/en`), fully server-rendered: intro, chips, first page of cards. Works before JavaScript loads; links are real `<a>` |
| 2    | Reads one line and sees posters                                                    | h1, one-sentence description, "10 courts métrages", and the first poster row are all above the fold at 390 × 844                                    |
| 3    | Scrolls, or taps a chip ("Drame", "Jusqu'à 10 min")                                | Chip toggles instantly, grid refetches with skeleton cards, URL updates, count announced                                                            |
| 4    | Optionally types in search                                                         | 300ms debounce; Enter submits at once and closes the keyboard                                                                                       |
| 5    | Taps a poster                                                                      | Opens `/[locale]/shorts/[slug]`                                                                                                                     |
| 6    | Presses Back                                                                       | Returns to the same URL (filters intact), same number of loaded cards, same scroll position                                                         |
| 7    | Reaches the end                                                                    | Suggestion prompt; "Suggérer un court métrage" opens the existing dialog                                                                            |

Success: a first detail page opened within two minutes, with no dead control on the way.

### Secondary flows

- **Shared filtered link** (`/fr/shorts?genres=drame&durationMax=10`): server renders
  that result set with the matching chips selected.
- **Language switch** keeps the query string.
- **No results:** reset in one tap, or suggest the missing film.
- **API down:** error with retry; intro, search and chips remain usable.

## Interaction rules

### Chips versus sheet

|                       | Chip row                                                                                                                                                                                     | Filter sheet                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Covers                | Genres (up to 8) and three duration buckets                                                                                                                                                  | Sort, all genres, duration range, year range, awards, availability     |
| Applies               | Instantly, one tap                                                                                                                                                                           | On "Appliquer"; closing without it discards edits                      |
| Opening state         | n/a                                                                                                                                                                                          | Always starts from the applied filters, so chip choices appear checked |
| Sync                  | A bucket chip is selected only when the applied range equals that bucket exactly (≤10; 11–20; ≥21). A custom slider range selects no bucket and shows as a removable chip in the result line | Selecting a bucket chip sets the slider to that range                  |
| "Tous"                | Clears genres and duration; keeps search, sort and sheet-only filters                                                                                                                        | n/a                                                                    |
| "Effacer les filtres" | n/a                                                                                                                                                                                          | Clears everything except the search text; closes the sheet             |

Genres combine with OR; groups combine with AND; search combines with everything.

### URL state

- Single serializer (`filtersToParams`) for the API call and the address bar. Keys:
  `q`, `genres` (comma list of slugs), `durationMin`, `durationMax`, `yearMin`,
  `yearMax`, `hasAwards`, `availableOnline`, `sortBy` (omitted when `latest`).
  `rating` is removed from the URL contract and ignored if present in old links.
- The page reads these on the server and passes them as `initialFilters`, so a shared or
  reloaded URL renders the same results without a client refetch.
- Unknown or invalid values are dropped silently; the page never errors on a bad URL.

### Back-button behaviour

- Filter, chip, sort and search changes **replace** the history entry. Rationale: an
  Instagram visitor who taps four chips must reach Instagram again with one Back, not five.
- Back from a detail page restores: the URL (filters), the number of loaded pages, and
  the scroll position. The loaded page count and scroll offset are kept in
  `history.state` for that entry; if the client cache is gone, the list re-requests
  pages 1..n before restoring the scroll. No flash of the unfiltered list.
- The sheet is not a history entry. On Android, the system Back closes the open sheet
  or dialog first (Radix behaviour), then navigates.

### Search

- Debounce 300ms, max 100 characters, trimmed. Clear button empties and refetches.
- Search field keeps focus while results update; results are announced, never stolen focus.

### Focus after updates

- Chip tap: focus stays on the chip.
- "Appliquer": sheet closes, focus returns to the filter button; if the grid top is
  above the viewport, scroll it into view (instant under reduced motion).
- "Réinitialiser les filtres" in the empty state: focus moves to the "Tous" chip.
- "Réessayer": focus moves to the first card when results arrive, or stays on the button
  if the retry fails again.
- Load more: newly appended cards do not take focus; the count is announced.

### Pagination

- Page size 24. Infinite scroll with a visible "Afficher plus" button as the keyboard
  and no-observer path. De-duplicated appends (existing).
- At launch (~10 films) the whole catalogue is one page: no load-more control renders.

### Reduced motion (`prefers-reduced-motion: reduce`)

- No card lift or press scale; hover only changes the cursor.
- Skeletons are static Surface blocks (no shimmer or pulse).
- Sheet and dialog appear without slide (opacity only, or instant).
- Programmatic scrolls (grid into view, Back restoration) are instant.
- Nothing on this page auto-advances or autoplays, with or without the preference.

## States

| State               | Trigger                                    | Copy (FR)                                          | Next action                                                                          |
| ------------------- | ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Loading (refetch)   | Chip, search, sort, apply                  | sr-only "Chargement des courts métrages…"          | —                                                                                    |
| Results             | ≥1 film                                    | "{n} courts métrages"                              | Open a card                                                                          |
| Empty after filters | 0 films, something applied                 | "Rien ne correspond à cette recherche" + emptyBody | "Réinitialiser les filtres" (or "Effacer la recherche"), "Suggérer un court métrage" |
| Empty catalogue     | 0 films, nothing applied                   | "Le catalogue ouvre bientôt" + body (new)          | "Suggérer un court métrage"                                                          |
| Error               | First page fails or is malformed           | "Le catalogue ne répond pas" + errorBody           | "Réessayer"                                                                          |
| Load-more error     | Later page fails                           | "La suite n'a pas pu être chargée."                | "Réessayer" (cards kept)                                                             |
| Search service down | Meilisearch unavailable (Phase 3 fallback) | No special copy: list still renders from Strapi    | Chips still work                                                                     |
| End of list         | Last page loaded                           | Suggestion prompt                                  | "Suggérer un court métrage"                                                          |

Never an apology, never a fake success, never mock films.

## Copy inventory

### Existing keys used (no change)

| Purpose                            | Key                                                                                                                              | FR                                                                                              | AR                                                           | EN                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Intro description                  | `shorts.directory.description`                                                                                                   | Courts métrages du Maghreb et du monde arabe, choisis depuis la Tunisie.                        | أفلام قصيرة من المغرب الكبير والعالم العربي، مختارة من تونس. | Short films from the Maghreb and the Arab world, picked from Tunisia.             |
| Grid heading (sr-only h2)          | `shorts.directory.all`                                                                                                           | Tous les courts métrages                                                                        | كل الأفلام القصيرة                                           | All short films                                                                   |
| Result count                       | `shorts.filters.results`                                                                                                         | {n} courts métrages                                                                             | (ICU, dual)                                                  | {n} short films                                                                   |
| Search label / placeholder / clear | `shorts.filters.search`, `.searchPlaceholder`, `.clearSearch`                                                                    | Rechercher un court métrage / Titre, réalisateur… / Effacer la recherche                        | ابحث عن فيلم قصير / العنوان، المخرج… / امسح البحث            | Search short films / Title, director… / Clear search                              |
| Filter button                      | `shorts.filters.open`, `.openWithCount`                                                                                          | Filtrer et trier (+ count)                                                                      | التصفية والترتيب                                             | Filter and sort                                                                   |
| Chip group labels, sheet sections  | `shorts.filters.genres`, `.duration`, `.year`, `.sortBy`                                                                         | Genres / Durée / Année / Trier par                                                              | الأنواع / المدة / السنة / ترتيب حسب                          | Genres / Length / Year / Sort by                                                  |
| Middle duration chip               | `shorts.filters.durationRange` (min 11, max 20)                                                                                  | 11 à 20 min                                                                                     | من 11 إلى 20 دقيقة                                           | 11 to 20 min                                                                      |
| Sort options                       | `shorts.filters.sort.latest`, `.year`, `.duration`, `.title`                                                                     | Plus récents / Année / Durée / Titre                                                            | الأحدث / السنة / المدة / العنوان                             | Newest / Year / Length / Title                                                    |
| Sheet                              | `shorts.filters.title`, `.apply`, `.clear`, `.hasAwards`, `.availableOnline`, `.removeFilter`, `.yearRange`, slider thumb labels | Filtres / Appliquer / Effacer les filtres / …                                                   | المرشحات / طبّق / امسح المرشحات / …                          | Filters / Apply / Clear filters / …                                               |
| Card category chip                 | `shorts.category`                                                                                                                | Court métrage                                                                                   | فيلم قصير                                                    | Short film                                                                        |
| Card availability                  | `shorts.filters.availableOnline`                                                                                                 | Disponible en ligne                                                                             | متاح على الإنترنت                                            | Available online                                                                  |
| Card duration unit                 | `shorts.minutes`                                                                                                                 | min                                                                                             | دقيقة                                                        | min                                                                               |
| Load more / loading / errors       | `shorts.directory.loadMore`, `.loading`, `.loadMoreError`, `.retry`, `.errorTitle`, `.errorBody`                                 | Afficher plus / … / Réessayer / Le catalogue ne répond pas / …                                  | عرض المزيد / …                                               | Show more / …                                                                     |
| Empty after filters                | `shorts.directory.emptyTitle`, `.emptyBody`, `.resetFilters`                                                                     | Rien ne correspond à cette recherche / … / Réinitialiser les filtres                            | لا شيء يطابق هذا البحث / …                                   | Nothing matches this search / …                                                   |
| Suggestion prompt body             | `shorts.suggestion.description`                                                                                                  | Vous connaissez un court métrage qui mérite d'être vu ? Partagez-le, notre équipe le vérifiera. | تعرف فيلمًا قصيرًا يستحق المشاهدة؟ شاركه وسيراجعه فريقنا.    | Know a short film that deserves to be seen? Share it and our team will review it. |
| Suggestion trigger                 | `shorts.suggestion.trigger`                                                                                                      | Suggérer un court métrage                                                                       | اقترح فيلمًا قصيرًا                                          | Suggest a short film                                                              |
| Sheet / dialog close               | `general.close`                                                                                                                  | Fermer                                                                                          | (existing)                                                   | (existing)                                                                        |

### New keys the build needs (not added yet)

| Key                                   | FR                                                                          | AR                                                                     | EN                                                            |
| ------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `shorts.directory.title`              | Courts métrages                                                             | أفلام قصيرة                                                            | Short films                                                   |
| `shorts.directory.suggestPromptTitle` | Un court métrage manque ?                                                   | هل ينقصنا فيلم قصير؟                                                   | Missing a short film?                                         |
| `shorts.directory.catalogEmptyTitle`  | Le catalogue ouvre bientôt                                                  | الكتالوج يفتح قريبًا                                                   | The catalog opens soon                                        |
| `shorts.directory.catalogEmptyBody`   | Les premiers courts métrages arrivent. Vous en connaissez un ? Suggérez-le. | أولى الأفلام القصيرة في الطريق. تعرف فيلمًا؟ اقترحه.                   | The first short films are on their way. Know one? Suggest it. |
| `shorts.filters.all`                  | Tous                                                                        | الكل                                                                   | All                                                           |
| `shorts.filters.durationUpTo`         | Jusqu'à {max} min                                                           | `{max, plural, few {حتى {max} دقائق} other {حتى {max} دقيقة}}`         | Up to {max} min                                               |
| `shorts.filters.durationOver`         | Plus de {min} min                                                           | `{min, plural, few {أكثر من {min} دقائق} other {أكثر من {min} دقيقة}}` | Over {min} min                                                |

Arabic strings above are drafts for the owner's Arabic review. Bucket bounds (10, 20)
are product constants passed as ICU parameters, not baked into the strings.

### Keys that become unused (delete in FR, AR, EN at build time, if still present)

`shorts.hero.*` (8 keys), `shorts.directory.latest`, `shorts.directory.seeAll`,
`shorts.card.featured`, `shorts.card.watchNow`, `shorts.card.viewDetails`,
`shorts.card.playTrailer`, `shorts.filters.sort.rating`, `shorts.filters.rating`,
`.ratingMin`, `.ratingChip`, `.ratingAny` (the rating removal may already have taken these).

### Hard-coded strings to remove

- `page.tsx` metadata title and description are French in every locale. They must
  resolve per locale; the SEO phase owns the final wording and keys.
- The shadcn `Sheet` and `Dialog` close buttons carry an English sr-only "Close"; pass
  `general.close` instead.

## Accessibility checklist

- [ ] One `<h1>` ("Courts métrages"); grid under an sr-only `<h2>`; cards are `<article>` with an `<h3>` title.
- [ ] Each card has exactly one link (the whole card), named "{title}, {director}, {year}, {n} min". No heart on cards in this phase (deferred to Phase 2, FR19).
- [ ] Chip groups are `role="group"` with `aria-label` "Genres" / "Durée"; each chip is a `<button aria-pressed>`; selection also shown by the check glyph.
- [ ] Result count sits in a polite live region and is announced after every refetch and load-more; loading has an sr-only status.
- [ ] Error block is `role="alert"`; empty state is plain content (not an alert).
- [ ] Search is in a `<form role="search">` with a visible-label equivalent (`aria-label`) and `enterKeyHint="search"`.
- [ ] Sheet and dialog trap focus, close on Escape, restore focus to their trigger, and have localized titles and close labels.
- [ ] Every target ≥ 44 × 44px with ≥ 8px spacing (chips, clear, filter button, removable chips, sheet rows, pills).
- [ ] Focus ring (3px Gold Leaf, 2px offset) visible on every control and on the whole card; dark ring on gold fills.
- [ ] Contrast: all text ≥ 4.5:1 (Muted #B0A6B8 on Surface ≈ 6:1; Gold Ink on Gold Leaf 7.3:1; teal on Aubergine Deep scrim checked on real posters with the scrim).
- [ ] Horizontal chip row reachable and fully operable by keyboard (Tab through chips; the row scrolls the focused chip into view).
- [ ] 200% zoom and 320px width: no horizontal page scroll (the chip row scrolls inside itself).
- [ ] `forced-colors`: chips keep a border, selected chip keeps its check glyph, focus ring uses `Highlight`.
- [ ] Reduced motion honoured as listed above.
- [ ] Arabic: `dir="rtl"`, logical properties, mirrored chevrons, Western digits, `<bdi>` on every title, director and genre run; `lang="ar"` on Arabic original titles inside FR/EN.
- [ ] axe-core clean on `/fr/shorts`, `/ar/shorts`, `/en/shorts` in results, empty and error states.

## Open decisions

Items 1–4 resolved by the owner on 2026-11-09.

1. **ROADMAP and requirement wording — resolved 2026-11-09.** `/shorts` opens on one
   2:3 poster grid with a one-line catalogue intro and genre and duration chips; no
   featured hero, no latest-additions row. Amended: ROADMAP Phase 4 summary ("hero" →
   "catalogue intro"), Phase 4 criterion 1 ("…sees a one-line catalogue intro, genre and
   duration chips and a single 2:3 poster results grid;"), and SDIR-01 ("catalogue intro,
   genre and duration chips, filter sheet with sort"). "Hero" in Phase 4 criterion 2 and
   SBRAND-01 now reads "detail-page hero". Sort moves into the filter sheet.
2. **Focus-ring width — resolved 2026-11-09: 3px gold.** The requirement wording
   (ROADMAP criterion 5, SBRAND-04: 3px gold ring, 2px offset, dark ring on gold fills)
   stands; the site-wide `:focus-visible` rule changes to 3px.
3. **Arabic body face — resolved 2026-11-09: IBM Plex Sans Arabic app-wide.** SBRAND-02
   stands; the client switches from Noto Sans Arabic. Mockups use IBM Plex Sans Arabic.
4. **Card heart — resolved 2026-11-09: no heart on cards in this phase.** Cards ship
   without the watchlist heart (layout unchanged, top-end corner left empty). Wiring short
   films into the real watchlist, including the card heart, stays in Phase 2 (FR19 and
   Phase 2 criterion 4 now name the directory card). SDIR-02 no longer lists the heart.
5. **h1 typeface.** Inter by default (Brand Moment Rule); mockup 2b tests Lalezar.
6. **Genre chip cap.** Eight chips, then the sheet. Revisit when the catalogue passes
   ~100 films.
