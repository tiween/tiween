---
phase: 02-strapi-backed-shorts-pages
source: Impeccable shape session from 02-UI-SPEC.md (checker-approved) and 02-CONTEXT.md (D-01 to D-16, owner, smart discuss 2026-11-10)
status: draft
feeds: 02-DESIGN.md, 02-EXPERIENCE.md, then Claude Design mockups
visual_authority: apps/client/DESIGN.md (Gold Leaf × Aubergine)
---

# Strapi-backed shorts pages — design brief and mockup brief

Part 1 is the shape brief. Part 2 is what Claude Design draws. Mockups are reviewed by the
owner; `02-EXPERIENCE.md` moves to `mockup_status: approved` only after that review.

## Part 1 — Shape brief

### 1. Job and audience

- Tunisian culture-goers 18–34 on a phone, usually arriving from an Instagram or TikTok link
  (in-app browser, patchy data), often straight onto a film's detail page.
- Mode: **decide and watch**. They want to know what the film is, where it comes from, who
  made it, whether it is free, and to press play in under a minute, in their language.
- Secondary: browse the catalogue, and save a film for later with the heart.

### 2. Outcome and proof

- Success: a visitor lands on a film page, understands it (title, original title, country,
  language, crew), sees "Gratuit" or "Sur abonnement" before tapping, and reaches the
  platform in one tap. A second visitor opens the directory, sees posters on the first
  screen, and saves a film without leaving the page.
- Proof is the catalogue itself: **13 real approved short films** (below). Every one of
  them has no 2:3 poster, so the reserved stripe artwork is the normal card, not an edge case.
- Honest states: when the catalogue service is down the page says so and offers a retry; it
  never says "no short films" and never shows a 404 for an outage.

### 3. Direction

- Visual authority: Gold Leaf × Aubergine (`apps/client/DESIGN.md`). No new visual world.
- Thesis: **the data is now real, so the page must be honest about it.** The detail page
  gets quieter metadata (original title, origin, crew, access type) around the same hero and
  the same single gold pill. The directory stays one intro and one poster grid.
- Gold is reserved for: the saved heart, the primary retry and browse pills, the secondary
  Gold Leaf-outline pills, and the focus ring. Nothing else is gold.

### 4. Scope and boundaries

- In: detail page `/[locale]/shorts/[slug]` (hero lines, crew grid, access sub-label, heart,
  error, not found), `ShortFilmCard` (heart, duration moved), directory `/[locale]/shorts`
  (grid, Load more, error, empty), the short-film entry on the watchlist page. FR / AR / EN,
  with Arabic RTL boards.
- Untouched: the global header and bottom nav, the suggestion form, the cast rail's layout
  (only its avatar becomes an initials disc), everything Strapi admin.
- Anti-goals: filter row, chips, sort control, search field, hero, "Derniers ajouts" rail on
  `/shorts`; ratings; a gold "featured" badge; person photos; a visible "version française"
  label; ticketing or prices; the `mock-shorts.ts` films shown as real.

### 5. States and ranges

- Catalogue: 0 (pre-launch), 13 (launch), later hundreds. Page size 24, so no Load more at launch.
- Titles: 5–25 characters in the real set, Latin and Arabic, often both. A stress title is
  allowed only when marked as a stress string.
- Countries per film: 1–4. Languages: Tunisian Arabic (`aeb`) or French.
- Crew: the real data carries a director per film; other departments are not in the seed.
- States: detail (full, sparse, error, not found, loading), card (unsaved, saved, pending,
  focus, featured, no poster, no year or duration), directory (results, error, empty,
  loading, Load more idle / loading / error), watchlist (mixed list).

### 6. Interaction and layout

- The heart is an independent target on the card (never inside the link) and a 52px round
  control on the detail page. One state machine for both (`02-EXPERIENCE.md`).
- Grid 2 → 3 → 4 → 5 → 6 columns at 640 / 768 / 1024 / 1280.
- Detail: 920px reading column, crew in one column under 30rem of container width, two above.

### 7. Constraints and open decisions

- WCAG 2.1 AA; 44px targets; full RTL; Western digits; `<bdi>` on mixed-script runs.
- Reuse the shipped stack: `ShortFilmCard`, `ShortsDirectory`, `ShortFilmDetail`,
  `WatchlistButton`, `EventCard`, `ReservedArtwork`. New primitives are shadcn catalogue
  components (`avatar`, `empty`).
- Open decisions are the nine owner questions in `02-EXPERIENCE.md`. Mockups 6 and 7 test
  questions 4 and 5; mockup 14 tests question 1.

## Part 2 — Mockup brief for Claude Design

### Ground rules for every artboard

- **Mount the real Tiween DS.** Use the tokens, type roles, radii and named rules from
  `apps/client/DESIGN.md` by name: Midnight Aubergine field, Aubergine Deep, Surface,
  Surface Raised, Border, Gold Leaf, Gold Ink, Gold Tint, Foreground, Muted. No invented
  colors, no new shadows, no new radii.
- **Look like the shadcn components the site uses** (new-york style): `Button` re-skinned to
  the Tiween pill (stock geometry is wrong, see DESIGN.md "Known drift"), `Badge`, `Skeleton`,
  `Toast`, `Tooltip`, plus the catalogue `Empty` and `Avatar` (initials fallback). Do not
  hand-roll lookalikes with their own styles.
- Fonts: Inter (Latin), IBM Plex Sans Arabic (Arabic), Lalezar only for the existing
  detail-page hero title. Focus rings 3px Gold Leaf with 2px offset (dark ring on gold fills).
- Icons: lucide for new elements (heart, alert circle, rotate, film); the detail page keeps
  its Phosphor back, share, play, heart and trophy glyphs.
- Show the global app header on every artboard and, at 390, the bottom nav (none active on
  these routes except Watchlist on board 14).
- **Real content.** Use the 13 films below exactly: titles, original titles, directors,
  years, minutes, countries, languages, platforms, access types. Do not invent films,
  directors, festivals or posters. Do not use the older prototype films from `mock-shorts.ts`.
- **Posters.** None of the 13 has a 2:3 poster. Every card shows the reserved stripe artwork
  (`ReservedArtwork`, the taa glyph on the aubergine stripe frame). Do not draw fake posters.
- **Placeholder data** is allowed only where the real data does not exist (crew beyond the
  director, a second streaming platform, event cards on the watchlist, simulated page 2).
  Each such element carries a small visible tag "Exemple" (AR: "مثال") and the artboard
  carries the label "Contenu réel du catalogue, sauf éléments marqués Exemple"
  (AR: "محتوى الكتالوج الحقيقي، عدا العناصر المعلّمة «مثال»").
- Digits are Western (0–9) in every locale. Arabic boards are RTL, mirrored with logical
  alignment; Latin titles and director names inside Arabic lines are isolated runs.
- No star, rating, price, carousel dots, "À la une" gold badge, filter, chip, sort or search.

### The 13 films (use exactly)

Order is the seed order. Countries are shown as words in the page locale; the language
`aeb` is shown as "arabe tunisien" / "العربية التونسية" / "Tunisian Arabic".

| #   | Title (FR page)       | Title (AR page)                  | Original title                                     | Director (Latin, as stored) | Year | Min | Countries (FR)                | Language       | Genre              | Where to watch         |
| --- | --------------------- | -------------------------------- | -------------------------------------------------- | --------------------------- | ---- | --- | ----------------------------- | -------------- | ------------------ | ---------------------- |
| 1   | Khalâa                | Khalâa (French fallback)         | خلعة                                               | Maher Hasnaoui              | 2016 | 13  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 2   | Petit Frère           | Petit Frère (French fallback)    | قريد العش                                          | Oussama Boukhris            | 2013 | 20  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 3   | Les Souliers de l'Aïd | Les Souliers de l'Aïd (fallback) | صباط العيد                                         | Anis Lassoued               | 2012 | 30  | Tunisie, France               | arabe tunisien | Drame, Fantastique | Artify, Sur abonnement |
| 4   | Comme un fils         | مثل ابن                          | none                                               | Aymen Lajmi                 | 2013 | 13  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 5   | Brotherhood           | Brotherhood (French fallback)    | إخوان                                              | Meryam Joobeur              | 2018 | 25  | Tunisie, Canada, Qatar, Suède | arabe tunisien | Drame              | YouTube, Gratuit       |
| 6   | Ordure                | Ordure (French fallback)         | العز                                               | Lotfi Achour                | 2006 | 23  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 7   | Flashback             | Flashback (French fallback)      | فلاشباك                                            | Waheb Chargui               | none | 15  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 8   | Chrifa Bent El Fadhel | Chrifa Bent El Fadhel (fallback) | شريفة بنت الفاضل                                   | Kheyri Habboubi             | none | 17  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 9   | Bord à bord           | عالحافة                          | عالحافة (same as AR title: no original-title line) | Sahar El Echi               | 2024 | 18  | Tunisie                       | arabe tunisien | Drame              | none                   |
| 10  | Let Go                | التخلّي                          | none                                               | Kaiss Manachou              | 2014 | 9   | Tunisie, Canada               | français       | Drame              | none                   |
| 11  | Faracha               | فراشة                            | فراشة (same as AR title)                           | Issam Bouguerra             | 2017 | 16  | Tunisie                       | arabe tunisien | Drame              | YouTube, Gratuit       |
| 12  | Action figuration     | أكشن كومبارس                     | none                                               | Bilel Bali                  | 2014 | 22  | Tunisie                       | arabe tunisien | Drame              | none                   |
| 13  | Abderrahman           | عبد الرحمان                      | none                                               | Elias Sfaxi                 | 2013 | 20  | Tunisie                       | arabe tunisien | Drame              | none                   |

Notes for the artist:

- "French fallback" rows have no Arabic title in the data, so an Arabic page really shows the
  French title, silently, in a left-to-right run. Draw it that way; do not translate it and
  do not label it.
- On the FR page the original-title line shows only when the original title differs from the
  displayed title (rows 1, 2, 3, 5, 6, 7, 8). Row 4, 10, 12, 13 have none; rows 9 and 11 repeat the title, so no line.
- Film 1 Khalâa is the featured-badge sample for the card sheet (the badge is a state
  example, marked "Exemple").
- Film 7 Flashback and film 8 Chrifa Bent El Fadhel have no year: their second meta line
  reads "15 min" and "17 min" with no stray separator.
- Real synopsis text for the detail boards (use verbatim):
  - Les Souliers de l'Aïd (FR): "Nader, neuf ans, vit dans un petit village de la campagne tunisienne et adore courir. À l'approche de l'Aïd, il repère une paire de chaussures qu'il veut à tout prix, mais son père n'a pas les moyens de les lui offrir."
  - Les Souliers de l'Aïd (AR): "نادر طفل في التاسعة من عمره يعيش في قرية صغيرة في الريف التونسي ويعشق الجري. وبمناسبة العيد، يلمح حذاءً يتمنى اقتناءه، لكن والده لا يملك ما يكفي لشرائه له."
  - Action figuration (FR): "Feten, jeune figurante du cinéma et de la télévision, cache en elle un talent de comédienne qu'elle souhaite à tout prix révéler pour devenir célèbre, malgré les codes imposés par son petit frère. Les voisins du quartier ont aussi leur mot à dire."
- Real distinctions for the detail boards (show at most two, names verbatim):
  - Les Souliers de l'Aïd: "FESPACO - Festival panafricain du cinéma et de la télévision de Ouagadougou", 2013, Poulain d'Or; "AfryKamera - Festival du film africain de Pologne", 2013, Meilleur court métrage.
  - Action figuration: "Festival du cinéma d'Alexandrie", 2015, Prix du meilleur court-métrage de fiction arabe.

Crew placeholders (the seed has directors only). Use these, each tagged "Exemple":
Directing: the real director. Image: "Prénom Nom d'exemple" (Direction de la photographie);
Montage: "Prénom Nom d'exemple" (Montage); Son: "Prénom Nom d'exemple" (Prise de son).
Arabic board: same names, role and department labels from the UI-SPEC Arabic columns.
Role and department labels come from `02-UI-SPEC.md` § Copywriting Contract.

### Boards to draw

Board numbers match `mockups_outstanding` in `02-EXPERIENCE.md`.

#### 1. Detail — FR, 390, full data

Film: Les Souliers de l'Aïd (row 3). Full-height scroll artboard. Draw two versions of the
action row side by side in a callout (heart unsaved, heart saved) on the same page.

- Hero over the reserved backdrop artwork (no real still): chip row, title "Les Souliers de
  l'Aïd" (Lalezar), "Titre original : صباط العيد" (Arabic run, `lang="ar"`), meta line
  "Anis Lassoued · 2012 · 30 min · Drame, Fantastique", origin line
  "Tunisie, France · arabe tunisien", then the single gold "Regarder le film" pill.
- Action row: share, 52px heart (unsaved outline / saved filled Gold Leaf with gold border).
- Synopsis (FR text above), two distinctions, "Où regarder": Artify with sub-label
  "Sur abonnement" (real); a second row YouTube with sub-label "Gratuit · VOST", tagged
  "Exemple" (shows the editor label).
- **Équipe artistique** with three departments: Réalisation (the real director), Image,
  Montage (placeholders). 40px initials discs (AL, then "PN" style placeholders).
- Distribution rail with 88px initials discs (placeholder names, tagged "Exemple"), then
  "Dans la même veine" with three related cards (real films 1, 2, 4).
- Fixed sticky bar. Note the single gold pill remains the focal point.

#### 2. Detail — AR, 390 (RTL)

Same film. Title falls back to French (a left-to-right run, left-aligned inside the RTL
page); "العنوان الأصلي: صباط العيد"; meta line with the director in a Latin run; origin line
"تونس، فرنسا · العربية التونسية"; Arabic synopsis (real); crew grid with the disc at the
right of its text; heart at its mirrored position. Page chrome in Arabic. No fallback label.

#### 3. Detail — FR, 390, sparse data

Film: Action figuration (row 12). No original title line, no streaming section (no link),
one distinction, crew shows only Réalisation (real director) with the placeholders omitted,
no cast. Hero still reads complete: title, meta line "Bilel Bali · 2014 · 22 min · Drame",
origin line "Tunisie · arabe tunisien", heart. With no streaming link there is no "Où regarder"
section and no "Regarder le film" pill (shipped rule: no usable URL, no button); show the hero
without it and keep the heart and share as the action row, so the owner can judge that the page
still looks deliberate.

#### 4. Detail error — FR, 390

App header, then a centered Midnight Aubergine block: alert-circle icon (destructive) beside
text, "Ce court métrage ne se charge pas", body "Le catalogue met un moment à répondre.
Réessayez dans un instant.", gold "Réessayer" pill with rotate icon, text link "Voir tous les
courts métrages". Add a small second callout of the busy state (spinner in the pill).

#### 5. Detail not found — FR, 390

Film glyph (muted) beside text, "Court métrage introuvable", "Ce court métrage n'existe pas
ou n'est plus en ligne.", gold "Voir tous les courts métrages" pill. Calm, no alert styling.

#### 6. Card states sheet — FR (390 close-ups, plus a 1280 grid slice)

All cards 2:3 with the stripe artwork. Show, labelled:

- Default unsaved: Les Souliers de l'Aïd, director line, second line "2012 · 30 min".
- Saved: heart filled Gold Leaf. Pending (busy). Keyboard focus ring on the heart target.
- Featured badge plus heart together (Khalâa, tagged "Exemple").
- No year: Flashback, second line "15 min". No year and no duration: stress card tagged "Exemple".
- Long title: Les Souliers de l'Aïd on two lines at 171px.
- Desktop hover overlay at 1280 with the heart still on top.
- Skeleton card (no heart).
- Callout: the 44px heart target around the 40px disc, 4px inset, on the stripe artwork.
- Callout: alternative heart disc (full Gold Leaf disc, dark heart) for owner question 4, and
  alternative duration spot (top-start stack) for question 5, both clearly marked "Variante".

#### 7. Card states sheet — AR (390 close-ups, plus a 1280 grid slice)

Mirror of board 6: heart at the top-left, featured badge top-right. Use real Arabic titles
(Comme un fils: مثل ابن, Faracha: فراشة, Action figuration: أكشن كومبارس) and one French
fallback card (Khalâa, left-to-right run). Long Arabic title stress card tagged "Exemple".
Western digits in "2013 · 13 دقيقة"-style second lines.

#### 8. Directory — FR, 390

Full-height scroll artboard. h1 "Courts métrages", the description (`shorts.directory.description`),
result line "13 courts métrages", 13 cards in two columns (6 full rows plus a ragged last card,
start-aligned), then the suggestion prompt (no Load more at 13 films). First poster row fully
above the fold (mark the 844px line). No chips, search, filter, sort or hero.

#### 9. Directory — AR, 390 (RTL)

Mirror of board 8: "أفلام قصيرة", description, "13 فيلمًا قصيرًا" result line, grid flowing
right to left (first card top-right), hearts at the top-left of each poster, real Arabic
titles where they exist and French fallback runs elsewhere, Western digits.

#### 10. Directory — FR, 1280

Same content: intro at inline-start, result line, 6-column grid (6 + 6 + 1), suggestion
prompt. Mark the 800px fold. Hearts visible on every card without hover.

#### 11. Directory error — FR, 390

Intro stays (h1 and description). Result line and grid replaced by: alert-circle icon beside
text, "Le catalogue ne répond pas", "Le catalogue met un moment à répondre. Réessayez dans un
instant.", gold "Réessayer" pill (48px). Second small callout: the no-connection body
("Vérifiez votre connexion, puis réessayez.").

#### 12. Directory empty catalogue — FR, 390

Zero films. Intro, no result line, no grid. Muted film glyph, "Le catalogue ouvre bientôt",
"Les premiers courts métrages arrivent. Vous en connaissez un ? Suggérez-le.", secondary
Gold Leaf-outline "Suggérer un court métrage" pill. No alert styling.

#### 13. Directory Load more — FR, 390

Three stacked crops of the bottom of the grid, tagged "Exemple — page 2 simulée avec les
13 films" (the real catalogue has no page 2 yet): idle ("Afficher plus", secondary pill),
loading (spinner plus "Chargement des courts métrages…", same footprint), error
("La suite n'a pas pu être chargée." plus secondary "Réessayer", cards kept above it).

#### 14. Watchlist — FR, 390

The existing watchlist page: title, category tabs (with "Courts-métrages" tab), then one
grid in the "À venir" section. Mixed list: two or three dated event cards (placeholders,
tagged "Exemple"), then short films (real: Khalâa "2016 · 13 min", Les Souliers de l'Aïd
"2012 · 30 min", Flashback "15 min") in newest-saved-first order. Short-film entries show
the stripe poster, the "Court métrage" badge, the title, the year and duration line, and the
filled heart at the top-end corner; **no venue row, no date row, no dash**. Add a small
callout of the Undo toast "Retiré de la watchlist · Annuler le retrait". A second small
callout shows the alternative separate "À voir" section for owner question 1, marked "Variante".

### What the owner checks on review

1. The detail hero stays calm: the gold "Regarder le film" pill is still the focal point
   after the original-title and origin lines are added.
2. The crew grid reads as secondary, with no gold and no photo, in FR and AR.
3. The access sub-label is plain text and tells free from subscription at a glance.
4. A card with the stripe artwork, a heart and a two-line meta block looks finished at 171px.
5. The heart is the only gold on a card, and only when saved.
6. The directory looks deliberate with 13 cards and no filters; posters are above the fold.
7. Error, empty and not-found read as three different situations, none of them apologetic.
8. Short films in the watchlist look native next to events, with no empty venue or date row.
9. Arabic boards mirror cleanly with Western digits and silent French fallback runs.
