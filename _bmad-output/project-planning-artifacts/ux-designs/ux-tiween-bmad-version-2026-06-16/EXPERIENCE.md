---
name: Tiween B2C — Experience
status: final
updated: 2026-06-16
design: ./DESIGN.md
ui_system: shadcn/ui + Tailwind v4, Next.js 15 App Router (RSC default), next-intl (AR/FR/EN)
sources:
  - ux-design-specification.md (legacy, 2025-12-25)
  - _bmad-output/prd/ (sharded PRD)
  - imports/TIWEEN_*.png (mockups)
---

# Tiween — Experience (EXPERIENCE.md)

> This spine owns _how it works_: information architecture, behavior, states, interaction, accessibility floor, and key flows. Visual identity lives in [DESIGN.md](./DESIGN.md); tokens are referenced by name as `{token}`. **Spines win on conflict** with any mock or import.

## Foundation

**Form-factor:** mobile-first installable PWA (Chrome Android primary, ~65% of users, variable 4G). Desktop web is a secondary enhanced surface (wider comparison views, 12-col layouts). The design baseline is the phone; desktop adds, never subtracts.

**UI system:** shadcn/ui + Tailwind v4. Both spines inherit shadcn defaults; this doc specifies only the behavioral delta. Server Components by default; `'use client'` only for interactive islands (filters, carousels, seat picker, QR).

**Offline-first:** service worker (Serwist) caches listings, the watchlist, and purchased tickets. Core discovery + ticket display must work with no network. Every async surface has explicit loading and error states (see State Patterns).

**Languages & direction:** AR / FR / EN via next-intl. French is the default product copy. Arabic flips to `dir="rtl"` instantly with no reload. Arabic uses **Western numerals** and `DD/MM/YYYY` (per project-context — overrides any legacy ambiguity). Time renders `HH:MM` in AR/EN and `15h00` in FR. next-intl sets `dir` only — **CSS logical properties and icon mirroring are our responsibility**, not automatic.

**Bidi / mixed-script (mandatory).** Any surface that places an Arabic string and a Latin string on the same line — EventCard (AR title + `VOST`/`VF` + venue + `12,20 DT`), search results, ticket meta — must isolate each foreign run with `<bdi>` or `dir="auto"`. Currency format: `12,20 DT` (decimal comma, space, `DT`), the `DT` isolated so it doesn't reorder in RTL. This is the most common Arabic-card bug; it is a requirement, not a "verify".

## Information Architecture

Four top-level destinations (the `{BottomNav}` tabs):

1. **Accueil (Home)** — discovery feed. Top category tabs (`Tout / Cinéma / Théâtre / Musique`…) + horizontal carousels ("Films à venir", "Films les mieux notés", "Sélection musique", "Podcasts les mieux notés"). Pre-filtered to "what's on" — never an empty cold-start.
2. **Recherche (Search)** — instant search (300ms debounce), recent searches, suggestions, filter by category / date / location / "near me".
3. **Billets (Tickets)** — the ticketing entry + `Mes événements` (À venir / Passés), each ticket's offline QR.
4. **Compte (Account)** — profile, watchlist, language, preferences, auth.

**Detail surfaces** (pushed onto a tab's stack): Film detail, Theater/Salle detail, Venue detail, Ticketing flow (4-step), Confirmation, Ticket-QR.

**Closure check:** Discovery → Accueil/Recherche. Decide → detail. Act → ticketing/watchlist. Re-engage → Billets/Compte. The three Key Flows below cover Film discovery→purchase→door. **Theater/Salle, Venue, and Concert detail reuse the Film-detail structure** (séances become run-dates/sessions) and inherit Flow 1–3; their dedicated flows are deferred to Update once Epics 3 & 6 confirm the séance model. **SeatSelector** is only reached for assigned-seating venues — an optional step between showtime-select and quantity in Flow 2; for general-admission (the mockup default) it is skipped.

## Voice and Tone (microcopy)

Product voice = **calm, clear, reassuring, French-default** (brand voice lives in DESIGN.md › Brand & Style). Confirmations thank and reassure ("_Merci de votre confiance ! Votre paiement a bien été validé._"). Errors are returned as **codes** and translated in-UI via next-intl (`t(error.code)`) — never hardcode a message, never expose a stack trace. Empty states are encouraging, not apologetic, and always offer a next action. Offline copy is confident: "_Vous êtes hors ligne — vos billets restent valides._"

## Component Patterns (behavioral)

> Visual specs in DESIGN.md › Components. Here: states, focus, interaction.

- **{EventCard}** — whole card is the tap target → detail. Watchlist heart is an independent sub-target (toggles optimistically; pulses 0.5s on first save). `role="article"`, `{primary}` focus ring. Loading → skeleton; never layout-shift on image load (reserve the 2:3 box).
- **{ShowtimeButton}** — `role="radio"` within a venue's `radiogroup`. Selecting enables the sticky `Choisir cette séance` CTA and shows a **check glyph ✓** (non-color cue) in addition to the gold fill. Focus ring is dark/white on the selected (gold) tile. Unavailable = not focusable; sold-out = `aria-disabled` (announced "complet, indisponible"), not removed from the tree. The recommended star is decorative with an accessible label.
- **Links & info** — link text uses `{link}` (the gold-tint); info banners/tags use `{secondary}` (magenta) fill with white text. Watchlist count, "voir plus", legal/help links, and the confirmation's "Mes événements" link all route through `{link}`.
- **{TicketQR}** — renders from cache; works offline. Auto-requests max screen brightness on mount (daylight surface). "Scanned at HH:MM" overlay appears when validated. Share / Add-to-Wallet are secondary actions.
- **{BottomNav}** — persistent on the 4 roots; **hidden during checkout and when the keyboard is open** (reclaims thumb space). Active tab reflects the current root. Badge dot on Billets for new ticket / reminder.
- **Tabs (category / date)** — horizontal scroll, momentum, snap. Selected underline in `{primary}`. Keyboard: arrow keys move, Enter/Space activate.

## State Patterns

Every data surface defines all five:

| State       | Behavior                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading** | Skeletons matching final layout ({surface} blocks, subtle pulse). Spinner only after 200ms for actions.                                                 |
| **Empty**   | Encouraging copy + a next action (e.g. "Aucun favori — explorez ce qui passe ce soir →"). Never a dead end.                                             |
| **Error**   | Translated code, retry affordance, no stack trace. Inline for fields; toast for transient; full-screen only for route-level failure.                    |
| **Offline** | Cached content served; an offline badge (`Fonctionne hors ligne`, {success}) marks what's still usable; writes queue. Tickets + watchlist fully usable. |
| **Success** | Confirmation with reassurance; celebratory moment for milestones (see Interaction Primitives).                                                          |

**Daylight state (scoped):** {TicketQR} and Checkout switch to the {daylight-background}/{daylight-foreground} variant for outdoor scanning; the rest of the app stays dark. Transition is instant on entering those surfaces. **The CTA on these white surfaces is the aubergine fill + white text** (the gold CTA is unreadable on white — DESIGN.md). {TicketQR} requests max brightness on mount.

## Interaction Primitives

- **Optimistic toggles** — watchlist + similar reflect instantly, reconcile in background, roll back with a toast on failure.
- **Celebrations** (respect `prefers-reduced-motion` — when reduced, the static confirmation + check still render; only the confetti/pulse is suppressed): ticket purchased → confetti + check, 2s; first watchlist save → heart pulse, 0.5s; account created → welcome + confetti, 2s.
- **Gestures with button parity** — pull-to-refresh (feeds), swipe-to-dismiss (sheets/toasts), swipe between date/category tabs. **Swipe direction is RTL-aware** (next/prev follow reading direction). Every gesture has a visible button equivalent.
- **Debounce** — search 300ms; field validation 500ms.
- **Sheets vs dialogs** — bottom sheet (slide-up) on mobile, centered dialog (fade) on desktop. Toast durations: success 3s / error 5s / warning 4s / info 3s.

## Accessibility Floor (behavioral)

WCAG 2.1 **AA** baseline (visual contrast handled in DESIGN.md — all core pairs already AAA).

- **Focus visible everywhere** — `{primary}` 3px outline + 2px offset (DESIGN.md), logical tab order, no traps; sheets/dialogs trap-and-restore focus.
- **Status never by color alone** — always icon + text (sold-out, offline, error, recommended).
- **Touch targets** ≥ 44px ({touch-target-min}), 8px min spacing.
- **Screen reader** — semantic roles ({EventCard}=article, {ShowtimeButton}=radio, nav landmarks), live regions for async results + toasts, labelled icon-only buttons.
- **RTL** — logical properties so layout mirrors; directional icons flip; verify mixed AR/FR strings render correctly.
- **Zoom** — 200% with no horizontal scroll.
- **Motion** — honor `prefers-reduced-motion` for all of the above.

## Key Flows

### Flow 1 — Yasmine finds something for tonight (the heartbeat)

_Yasmine, 26, in Tunis, on the métro home, wants a film tonight — under 30 seconds._

1. Opens Tiween → **Accueil** loads instantly from cache, "Films à venir" already populated (no empty state, no spinner).
2. Taps `Cinéma` category tab → feed filters in place.
3. Scans 2:3 posters, spots _Bullet Train_ with a high rating badge → taps the {EventCard}.
4. **Film detail**: title, director, meta chips, wide hero pager. Scrolls to **séances** grouped by venue; `Aujourd'hui` tab is preselected.
5. Sees _Ciné Alhambra Zéphyr · 19h30 · VF_ with the gold ✲ recommended marker. **← climax: the city's showtimes, side-by-side across venues, in one glance — the thing Facebook pages can't do.**
6. Taps `Réserver` (full-pill {primary} CTA) → enters ticketing.

### Flow 2 — Ahmed buys as a guest (frictionless conversion)

_Ahmed, first-time visitor, no account, doesn't want one._

1. From a showtime → **Billetterie › Choix des billets**. Selected film summarized at top.
2. Picks the séance ({ShowtimeButton} → gold selected state); sticky `Choisir cette séance` enables.
3. Quantity → guest path (email only, no forced signup) → **Checkout (daylight surface)** → Konnect payment.
4. Errors return as codes, translated inline; sold-out mid-flow surfaces a clear recovery, not a dead end.
5. **← climax: `Paiement validé !`** — gold check disc, confetti (2s), reassurance copy, and the ticket is already in **Billets** offline. `Retour à la page d'accueil` pill.

### Flow 3 — Karim pulls up his ticket at the door, offline

_Karim, in a regional town, weak signal, at the cinema entrance._

1. Opens **Billets › Mes événements › À venir** — loads from cache despite no network.
2. Taps his _Bullet Train_ ticket → **{TicketQR}** opens on the **daylight surface**, screen brightness jumps, black-on-white QR.
3. An offline badge confirms "_hors ligne — toujours valide_". **← climax: the door scanner reads it on the first try in daylight, no signal needed.** Karim walks in.

## Responsive & Platform

- **Mobile (primary):** single-column feeds, bottom nav, thumb-zone CTAs, sheets.
- **Desktop (enhanced):** 12-col, max {container-max} 1280px; film detail becomes hero + sidebar; cross-venue showtime comparison gets more horizontal room; bottom nav becomes a top/side nav.
- **PWA:** installable, splash uses {display} Lalezar + monogram; offline shell precached.

## Open items

- `[ASSUMPTION]` Theater/Salle and Concert detail mirror Film detail's structure (séances→run-dates/sessions); confirm against epics 3 & 6.
- `[NOTE FOR UX]` Confirm guest-checkout is permitted by the ticketing epic (Epic 6) or whether auth is mandatory before payment.
- `[RESOLVED 2026-06-16]` Palette revised to Gold Leaf × Aubergine — the old cobalt `[NEEDS-HEX]` item is moot (cobalt dropped). All accents now have computed contrast (DESIGN.md). Gold `#D4A24A`, magenta `#E5478A`, gold-tint link `#E0B563` are pinned.
- `[NOTE FOR UX]` Validate the daylight-checkout decision against Konnect's hosted payment UI (it may render its own theme inside an iframe/redirect).
