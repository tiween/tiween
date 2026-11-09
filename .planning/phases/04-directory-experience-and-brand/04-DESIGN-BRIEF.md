---
phase: 04-directory-experience-and-brand
source: Impeccable shape session; decisions supplied by the owner 2026-11-09 (no interview round)
status: confirmed
feeds: 04-DESIGN.md, 04-EXPERIENCE.md, then Claude Design mockups
visual_authority: apps/client/DESIGN.md (Gold Leaf × Aubergine)
---

# Short-film directory — design brief and mockup brief

Part 1 is the shape brief. Part 2 is what Claude Design draws. Mockups are reviewed by
the owner; `04-EXPERIENCE.md` moves to `mockup_status: approved` only after that review.

## Part 1 — Shape brief

### 1. Job and audience

- Tunisian culture-goers 18–34 on a phone, usually arriving from an Instagram or TikTok
  link (in-app browser, patchy data). Some come from search or the detail page.
- Mode: **browse and pick**. They want a film to watch in under two minutes, in their language.

### 2. Outcome and proof

- Success: the visitor sees posters on the first screen, narrows by genre or length in
  one tap, and opens a detail page.
- Proof is the catalogue itself: about **10 real short films at launch**, growing to hundreds.
  The page must look deliberate with 10 cards and still work with 400.
- Product truth: a regional catalogue (Maghreb and Arab world), curated from Tunisia.
  The intro says that in one line (`shorts.directory.description`).

### 3. Direction

- Visual authority: Gold Leaf × Aubergine (`apps/client/DESIGN.md`). No new visual world.
- Thesis: **a catalogue page, not a streaming home.** One intro, one row of chips, one
  2:3 poster grid. The posters are the only spectacle.
- Sequence: intro (title, one-line positioning, count) → search + filter sheet → genre and
  duration chips → grid → end-of-grid suggestion prompt.
- Focal moment: the first row of posters, visible without scrolling on a 390px phone.
- What it replaces: the mock prototype (backdrop carousel, five landscape rails, star
  ratings, dead genre pills, French in every locale, a link back to the prototypes).

### 4. Scope and boundaries

- In: `/[locale]/shorts` directory surface, the poster card, filter chips, filter sheet,
  suggestion prompt and dialog entry, all states, FR / AR / EN.
- Untouched: `/shorts/[slug]` detail page (only its card links in), global header and
  bottom nav, the suggestion form's fields and backend.
- Anti-goals: carousel or rails on the opening; ratings anywhere; a gold "featured"
  badge; gold on anything that is not an action or a selected state; mock films
  presented as real; ticketing or prices.

### 5. States and ranges

- Catalogue: 0 (pre-launch), ~10 (launch), hundreds later. Page size 24.
- Genres with at least one film: 3–8 at launch.
- Durations: about 3–40 minutes. Titles: 1–80 characters, Latin or Arabic, sometimes both.
- States: first load (server-rendered), refetch skeleton, empty after filters, empty
  catalogue, error with retry, load-more, load-more error, end of list.

### 6. Interaction and layout

- Chips apply instantly; the sheet stages edits until "Appliquer".
- URL holds search, filters and sort; Back from a detail page returns to the same list
  and scroll position.
- Grid 2 → 3 → 4 → 5 → 6 columns at 640 / 768 / 1024 / 1280.

### 7. Constraints and open decisions

- WCAG 2.1 AA; 44px targets; full RTL; Western digits; `<bdi>` on mixed-script runs.
- Reuse the existing `ShortsDirectory` stack (`apps/client/src/features/shorts/components/`).
- Resolved 2026-11-09 (see `04-EXPERIENCE.md` § Open decisions): no hero or latest row
  (ROADMAP amended); 3px gold focus ring with 2px offset; IBM Plex Sans Arabic for Arabic
  body and headings; no watchlist heart on cards this phase (deferred to Phase 2).

## Part 2 — Mockup brief for Claude Design

### Ground rules for every artboard

- Tokens, type and radii only from `apps/client/DESIGN.md`. Midnight Aubergine field,
  Surface cards, Gold Leaf only on actions and selected chips, Gold Ink on gold.
- Every artboard carries a small label in its top margin: **"Contenu d'exemple — pas le
  catalogue réel"** (AR artboard: "محتوى تجريبي — ليس الكتالوج الحقيقي").
- Posters: abstract placeholder posters (flat color fields, no real film art, no faces)
  or the reserved stripe artwork. Never a real film's poster.
- Show the global app header and, at 390, the bottom nav (Accueil, Recherche, Billets,
  Compte; none active on this route).
- No star, no rating, no price, no carousel dots, no "À la une" badge, no watchlist
  heart on cards (deferred to Phase 2).
- Arabic text in IBM Plex Sans Arabic; focus rings 3px Gold Leaf with 2px offset.

### Sample catalogue (use exactly; 10 films)

| #   | Title (FR artboards)                                        | Title (AR artboard)                       | Director               | Year | Min | Genre        | Notes                                                        |
| --- | ----------------------------------------------------------- | ----------------------------------------- | ---------------------- | ---- | --- | ------------ | ------------------------------------------------------------ |
| 1   | Court d'exemple 01                                          | فيلم تجريبي 01                            | Réalisatrice Exemple A | 2025 | 14  | Drame        | Available online                                             |
| 2   | Court d'exemple 02                                          | فيلم تجريبي 02                            | Réalisateur Exemple B  | 2024 | 8   | Animation    | Available online                                             |
| 3   | Court d'exemple 03, un titre long qui passe sur deux lignes | فيلم تجريبي 03 بعنوان طويل يمتد على سطرين | Réalisatrice Exemple C | 2024 | 22  | Documentaire | Tests 2-line clamp                                           |
| 4   | Court d'exemple 04                                          | فيلم تجريبي 04                            | Réalisateur Exemple D  | 2023 | 17  | Drame        | Arabic original title "عنوان أصلي تجريبي" under the FR title |
| 5   | Court d'exemple 05                                          | فيلم تجريبي 05                            | Réalisatrice Exemple E | 2025 | 6   | Comédie      | No poster: reserved stripe                                   |
| 6   | Court d'exemple 06                                          | فيلم تجريبي 06                            | Réalisateur Exemple F  | 2022 | 29  | Fiction      | Not available online (no availability line)                  |
| 7   | Court d'exemple 07                                          | فيلم تجريبي 07                            | Réalisatrice Exemple G | 2025 | 11  | Expérimental | Available online                                             |
| 8   | Court d'exemple 08                                          | فيلم تجريبي 08                            | Réalisateur Exemple H  | 2023 | 19  | Drame        | Available online                                             |
| 9   | Court d'exemple 09                                          | فيلم تجريبي 09                            | Réalisatrice Exemple I | 2024 | 34  | Documentaire | Available online                                             |
| 10  | Court d'exemple 10                                          | فيلم تجريبي 10                            | Réalisateur Exemple J  | 2021 | 9   | Animation    | No poster: reserved stripe                                   |

AR artboard: directors "مخرجة تجريبية أ" … "مخرج تجريبي ي"; genres دراما, رسوم متحركة,
وثائقي, كوميديا, خيال, تجريبي. Years and minutes in Western digits.

Genre chips (order): Tous · Drame · Documentaire · Animation · Comédie · Fiction ·
Expérimental. Duration chips: Jusqu'à 10 min · 11 à 20 min · Plus de 20 min.
AR: الكل · دراما · وثائقي · رسوم متحركة · كوميديا · خيال · تجريبي; حتى 10 دقائق ·
من 11 إلى 20 دقيقة · أكثر من 20 دقيقة.

### Screens to mock

| #   | Artboard                 | Width      | Content and state                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Directory — FR           | 390        | Full-height scroll artboard. h1 "Courts métrages", description, count "10 courts métrages", search empty, filter button with no badge, "Tous" chip selected, 10 cards (2 cols, 5 rows), end-of-grid suggestion prompt, bottom nav. Mark the 844px fold line.                                                                                                                                                                         |
| 2   | Directory — FR           | 1280       | Same content. Intro at inline-start, search + filter button at inline-end on the h1 row, chips on one row, 6-column grid (6 + 4), suggestion prompt band. Mark the 800px fold.                                                                                                                                                                                                                                                       |
| 2b  | Directory — FR, variant  | 1280       | Optional: identical to 2 but h1 in Lalezar 36/40, for the owner's call on a brand moment (see 04-DESIGN.md § Intro).                                                                                                                                                                                                                                                                                                                 |
| 3   | Directory — AR (RTL)     | 390        | Mirror of 1 in Arabic: "أفلام قصيرة", "أفلام قصيرة من المغرب الكبير والعالم العربي، مختارة من تونس.", count "10 أفلام قصيرة". Chips start at the right; grid flows right to left; category chip top-right of each card. Card 4 shows a Latin original title "Titre original d'exemple" isolated with `bdi`.                                                                                                                          |
| 4   | Empty after filters — FR | 390        | Chips "Animation" and "Plus de 20 min" selected, "Tous" not selected, filter badge "2". Count "Aucun court métrage". Empty block: "Rien ne correspond à cette recherche" (Lalezar 30/36), body `shorts.directory.emptyBody`, primary gold pill "Réinitialiser les filtres", secondary pill "Suggérer un court métrage".                                                                                                              |
| 4b  | Empty catalogue — FR     | 390        | Optional: zero films, no filters. Chip row hidden. "Le catalogue ouvre bientôt" + body + secondary "Suggérer un court métrage".                                                                                                                                                                                                                                                                                                      |
| 5   | Error — FR               | 390        | Intro, search and chips stay; grid area replaced by: alert-circle icon (destructive) + "Le catalogue ne répond pas", body `shorts.directory.errorBody`, gold pill "Réessayer" with rotate icon. No count line.                                                                                                                                                                                                                       |
| 6   | Filter sheet open — FR   | 390        | Bottom sheet over a dimmed directory, 24px top corners, drag handle, title "Filtres", close disc. Sections: "Trier par" radio rows (Plus récents selected · Année · Durée · Titre); "Genres" checkboxes (Drame checked); "Durée" range slider 0–60 showing "11 à 20 min"; "Année" range slider 1990–2026; toggles "Films primés uniquement" and "Disponible en ligne". Sticky footer: ghost "Effacer les filtres", gold "Appliquer". |
| 7   | Card states sheet        | 390 + 1280 | Optional close-ups: default; long title; Arabic original title; no poster; keyboard focus ring on the card; hover lift (1280); skeleton card.                                                                                                                                                                                                                                                                                        |
| 8   | Loading — FR             | 390        | Optional: intro and chips real, count line replaced by a 120px skeleton bar, 6 skeleton cards (16px radius).                                                                                                                                                                                                                                                                                                                         |

### What the owner checks on review

1. Posters visible above the fold at 390 (screen 1).
2. Ten cards read as a finished, intentional page at 390 and 1280.
3. Gold appears only on: selected chips, the filter-count badge, primary pills, focus
   rings. The category chip is teal. Nothing else is gold.
4. The suggestion prompt reads as secondary, not as the page's main action.
5. Arabic artboard mirrors cleanly with Western digits.
