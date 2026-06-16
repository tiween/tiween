# Design-Handoff Producer Prompt — Tiween B2C

Paste the **prompt block** below into your chosen tool. It anchors on the locked identity in `DESIGN.md` and asks the tool to _render screens + resolve open detail_, not reinvent the brand.

- **Google Stitch** (https://stitch.withgoogle.com) → returns a DESIGN.md-style doc + per-screen HTML. Best if you want a full visual spec back. Save its output into this folder (`mockups/` for HTML).
- **Vercel v0** (https://v0.dev) → returns React + Tailwind + shadcn components — matches your real stack (Next 15 / Tailwind v4 / shadcn). Best if you want code you can drop into `apps/client`. Save generated components for reference; reconcile against the spines.
- Attach the reference mockups in `imports/` (Homepage, Film, Ticketing 01/04, My events) and `imports/brandbook_tiween.pdf` if the tool accepts image/PDF input — they ground the result far better than text alone.

> After it returns: outputs land here, then run this skill again in **Update** mode to reconcile the tool's output into DESIGN.md/EXPERIENCE.md (spines win on conflict).

---

## PROMPT BLOCK (copy from here ↓)

You are designing the **Tiween** consumer app — _Tunisia's cultural compass_, a discovery-first, mobile-first PWA for cinema, theater, short films, concerts, and exhibitions. The visual identity is already decided; your job is to render polished, on-brand screens and resolve only the open details I list. Do not invent a new look.

### Non-negotiable identity (do not change)

- **Single dark theme.** Page field **Tiween Green `#032523`**, text **white**, cards **`#0A3533`**, hover **`#0F4542`**, secondary text **`#A0A0A0`**.
- **Two-accent system — apply strictly:**
  - **Yellow `#F8EB06`** = primary action + active/selected state ONLY (CTAs, active bottom-nav tab, selected showtime, recommended star). The selected state also carries a **check glyph** (never color alone).
  - **Cobalt** in two shades: **`#2541E8` as a FILL only** (white text on it = 7.0:1) for info banners/tags; **`#8AB4FF` for link/info TEXT** on the dark field (the dark cobalt as text is unreadable at 2.3:1). Never use yellow for a non-actionable highlight; never use cobalt as page background.
- **Daylight surfaces:** the **Ticket-QR screen and Checkout** invert to a white field with dark-teal text and black-on-white QR (for outdoor scanning). Everything else stays dark. **On these white surfaces the primary CTA is a dark-teal fill + white text** — the yellow CTA is unreadable on white (1.1:1).
- **Focus rings:** yellow `#F8EB06` on dark controls; **dark/white on yellow-filled controls** (a yellow ring is invisible on yellow).
- **Bidi:** Arabic titles share lines with Latin badges/venue/currency — wrap foreign runs in `<bdi>`/`dir="auto"`; format currency `12,20 DT`.
- **Type:** **Lalezar** for brand moments only (splash, hero, empty states, big numerals) — NOT routine headers. In-app headers use **Inter 700** (Latin) / **IBM Plex Sans Arabic 700** (Arabic). Body: **Inter** (Latin), **IBM Plex Sans Arabic** (Arabic — geometric, pairs with Inter so AR+Latin on one line read as one system). Long AR brand-moment copy may fall back to **Cairo**. Ticket IDs: **JetBrains Mono**. Min body 16px, line-height 1.5.
- **Shape:** cards 16px radius, chips/inputs 8px, **primary CTA = full pill**, bottom sheets 24px top corners. **No drop shadows** — express elevation by surface-color shift only.
- **Logo:** circular taa (ت) monogram; in-app header = the yellow `tiween.com` + monogram lockup, centered, on dark teal. Monogram = avatar/favicon.
- **Posters:** 2:3 portrait in feeds/carousels. Signature hero treatment = **duotone cut-out portrait** (B&W photo with a brand shape carved out in yellow).
- **Spacing:** 4px base scale; 44–48px touch targets; 64px bottom nav.

### Internationalization

- Trilingual AR / FR / EN; **French is the default UI copy**. Provide **RTL (Arabic) and LTR** versions of at least the home and a detail screen. Mirror directional icons in RTL; use logical spacing. Arabic uses **Western numerals** and `DD/MM/YYYY`.

### Accessibility

- WCAG 2.1 AA. Visible focus = 3px yellow outline + 2px offset. Status by **icon + text, never color alone**. Thin-line monochrome icon set (home, search, ticket, account, map-pin, calendar, chevron). Active bottom-nav icon is solid yellow.

### Screens to produce (mobile first; desktop variant for ★)

1. **Splash** — brand moment, Lalezar + monogram.
2. **Accueil / Home ★** — top category tabs (Tout / Cinéma / Théâtre / Musique), horizontal carousels ("Films à venir", "Films les mieux notés", "Sélection musique"), 2:3 poster EventCards with rating badge, bottom nav.
3. **Film detail ★** — wide hero image pager (01/05), title + director, meta chips (genre · duration · date), `Réserver` pill + `Voir la bande annonce` outline, Synopsis, Équipe artistique, Distribution avatar row, **séances grouped by venue** with date tabs (Aujourd'hui / Demain / dated) and format-badged showtime tiles (VOST/VF/3D), yellow ✲ on the recommended one.
4. **Ticketing — Choix des billets** — film summary, venue cards, format-badged ShowtimeButtons, sticky `Choisir cette séance` (disabled→active).
5. **Checkout (daylight surface)** — quantity, guest/login, Konnect payment, price in **DT**.
6. **Confirmation** — `Paiement validé !`, yellow check disc, reassurance copy, `Retour à la page d'accueil` pill, confetti moment.
7. **Ticket QR (daylight surface)** — large black-on-white QR, ticket # in mono, event meta, Add-to-Wallet / Share, offline badge.
8. **Mes événements** — À venir / Passés tabs, ticket cards (poster, title, director, date, venue pin, qty × price DT, `Télécharger mes billets`).
9. **Search** — instant results, recent searches, filters.
10. **Empty + Offline states** — for the watchlist and a feed (encouraging copy + next action; offline = `Fonctionne hors ligne` badge).

### What to resolve (the only open decisions)

- Pin the **exact cobalt** if `#2541E8` reads off against the teal — propose a value that holds AA on dark.
- Propose the **duotone cut-out** hero treatment applied to one real featured film.
- Show **both** a Lalezar header and an Inter-700 header on one in-app screen so I can compare scannability.
- Propose the **elevation** read for a stack of overlapping surfaces using color-shift only (no shadow).

Deliver each screen as a self-contained artifact (HTML for Stitch / React+Tailwind+shadcn for v0), dark theme except the two daylight surfaces, with the AR-RTL variant for Home and Film detail.

## PROMPT BLOCK (↑ copy to here)

---

### After the tool returns

1. Save outputs into this run folder (HTML → `mockups/`, components → a `components/` subfolder or keep as reference).
2. Re-run **bmad-ux** in **Update** mode: I'll reconcile the tool's output into `DESIGN.md` / `EXPERIENCE.md`, surface any drift from the locked identity, and promote keeper artifacts.
3. Pin the cobalt `[NEEDS-HEX]` and clear the EXPERIENCE.md open items.
