# Design-Handoff Producer Prompt — Tiween B2C

Paste the **prompt block** below into your chosen tool. It anchors on the locked identity in `DESIGN.md` and asks the tool to _render screens + resolve open detail_, not reinvent the brand.

- **Google Stitch** (https://stitch.withgoogle.com) → returns a DESIGN.md-style doc + per-screen HTML. Best if you want a full visual spec back. Save its output into this folder (`mockups/` for HTML).
- **Vercel v0** (https://v0.dev) → returns React + Tailwind + shadcn components — matches your real stack (Next 15 / Tailwind v4 / shadcn). Best if you want code you can drop into `apps/client`. Save generated components for reference; reconcile against the spines.
- Attach the reference mockups in `imports/` (Homepage, Film, Ticketing 01/04, My events) and `imports/brandbook_tiween.pdf` if the tool accepts image/PDF input — they ground the result far better than text alone.

> After it returns: outputs land here, then run this skill again in **Update** mode to reconcile the tool's output into DESIGN.md/EXPERIENCE.md (spines win on conflict).

---

## PROMPT BLOCK (copy from here ↓)

You are designing the **Tiween** consumer app — _Tunisia's cultural compass_, a discovery-first, mobile-first PWA for cinema, theater, short films, concerts, and exhibitions. The visual identity is already decided; your job is to render polished, on-brand screens and resolve only the open details I list. Do not invent a new look.

The direction is **Aubergine Theatre with Gold Leaf Accent** — a single deep-jewel dark theme where poster artwork leads and burnished gilt signals action. Register: playbill / festival-catalogue, not streaming-app.

### Non-negotiable identity (do not change)

- **Single dark theme.** Page field **Midnight Aubergine `#241326`**, text **white** (17.6:1), cards **`#31203A`**, hover/raised **`#3E2A48`**, hairline borders **`#4A3556`**, secondary text **`#B0A6B8`** (7.5:1).
- **Single action accent — Gold Leaf, applied strictly:**
  - **Gold Leaf `#D4A24A`** = primary action + active/selected state + recommended ✲ ONLY (CTAs, active bottom-nav tab, selected showtime, recommended star). Gold has two uses, one rule: it works **as a fill** (always with dark ink `#2A1A06` on it = 7.3:1) **and as text** on the dark field (7.6:1). **Never white text on a gold fill** (2.3:1 — fails). The selected state also carries a **check glyph** (never color alone).
  - For link / info / secondary **text** on the dark field, use **`#E0B563`** (gold-tint, 9.2:1).
  - Never use gold for a non-actionable decorative highlight.
- **Secondary accent — Magenta Rose `#E5478A`.** A _secondary_ highlight + the théâtre category color — NOT a second action color and never page chrome. Fill under white only (3.75:1, large text), not body text.
- **Category color-coding** (directory wayfinding — appears on card badge + filter-chip dot only, never overrides the gold action signal): `cat-cinema #E0B563` (gold) · `cat-theatre #E5478A` (magenta) · `cat-shorts #5FD0C2` (teal — a cameo of the retired Tiween-green DNA) · `cat-music #7B9CFF` (periwinkle) · `cat-art #C98AE8` (orchid).
- **Daylight surfaces:** the **Ticket-QR screen and Checkout** invert to a white field (`#FFFFFF`) with aubergine text (`#241326`) and black-on-white QR (for outdoor scanning). Everything else stays dark. **On these white surfaces the primary CTA is an aubergine `#241326` fill + white text** — the gold CTA is unreadable on white (~1.6:1); reserve gold there for a small accent/check only.
- **Focus rings:** gold `#D4A24A` on dark controls; **dark `#241326` / white on gold-filled controls** (a gold ring is invisible on gold).
- **Semantic:** errors `#FF8A8A` (7.7:1), success `#5BD08A` (9.1:1), warning amber `#E8B24C` — all tuned for the aubergine field.
- **Bidi:** Arabic titles share lines with Latin badges/venue/currency — wrap foreign runs in `<bdi>`/`dir="auto"`; format currency `12,20 DT`.
- **Type:** **Lalezar** for brand moments only (splash, hero, empty states, big numerals) — NOT routine headers. In-app headers use **Inter 700** (Latin) / **IBM Plex Sans Arabic 700** (Arabic). Body: **Inter** (Latin), **IBM Plex Sans Arabic** (Arabic — geometric, pairs with Inter so AR+Latin on one line read as one system). Long AR brand-moment copy may fall back to **Cairo**. Ticket IDs: **JetBrains Mono**. Min body 16px, line-height 1.5.
- **Shape:** cards 16px radius, chips/inputs 8px, **primary CTA = full pill**, bottom sheets 24px top corners. **No drop shadows** — express elevation by surface-color shift only.
- **Logo:** circular taa (ت) monogram; in-app header = the gold `tiween.com` + monogram lockup, centered, on the aubergine field. Monogram = avatar/favicon (reversible gold-on-aubergine / aubergine-on-gold).
- **Posters:** 2:3 portrait in feeds/carousels. Signature hero treatment = **duotone cut-out portrait** (B&W photo with the taa-monogram or a brand shape carved out in gold).
- **Spacing:** 4px base scale; 44–48px touch targets; 64px bottom nav.

### Internationalization

- Trilingual AR / FR / EN; **French is the default UI copy**. Provide **RTL (Arabic) and LTR** versions of at least the home and a detail screen. Mirror directional icons in RTL; use logical spacing. Arabic uses **Western numerals** and `DD/MM/YYYY`.

### Accessibility

- WCAG 2.1 AA. Visible focus = 3px gold `#D4A24A` outline + 2px offset (dark/white outline on gold-filled controls). Status by **icon + text, never color alone**. Thin-line monochrome icon set (home, search, ticket, account, map-pin, calendar, chevron). Active bottom-nav icon is solid gold.

### Screens to produce (mobile first; desktop variant for ★)

1. **Splash** — brand moment, Lalezar + monogram.
2. **Accueil / Home ★** — top category tabs (Tout / Cinéma / Théâtre / Musique), horizontal carousels ("Films à venir", "Films les mieux notés", "Sélection musique"), 2:3 poster EventCards with rating badge, bottom nav.
3. **Film detail ★** — wide hero image pager (01/05), title + director, meta chips (genre · duration · date), `Réserver` pill + `Voir la bande annonce` outline, Synopsis, Équipe artistique, Distribution avatar row, **séances grouped by venue** with date tabs (Aujourd'hui / Demain / dated) and format-badged showtime tiles (VOST/VF/3D), gold ✲ on the recommended one.
4. **Ticketing — Choix des billets** — film summary, venue cards, format-badged ShowtimeButtons, sticky `Choisir cette séance` (disabled→active).
5. **Checkout (daylight surface)** — quantity, guest/login, Konnect payment, price in **DT**.
6. **Confirmation** — `Paiement validé !`, gold check disc (or success-green per the icon+text status rule), reassurance copy, `Retour à la page d'accueil` pill, confetti moment.
7. **Ticket QR (daylight surface)** — large black-on-white QR, ticket # in mono, event meta, Add-to-Wallet / Share, offline badge.
8. **Mes événements** — À venir / Passés tabs, ticket cards (poster, title, director, date, venue pin, qty × price DT, `Télécharger mes billets`).
9. **Search** — instant results, recent searches, filters.
10. **Empty + Offline states** — for the watchlist and a feed (encouraging copy + next action; offline = `Fonctionne hors ligne` badge).

### What to resolve (the only open decisions)

- Judge whether the gold CTA `#D4A24A` needs a **hairline or subtle contrast aid** when it sits directly on the aubergine field vs. on a `#31203A` card — propose the treatment that keeps the pill crisp without adding a shadow.
- Propose the **duotone cut-out** hero treatment (taa-monogram or brand shape carved in gold) applied to one real featured film.
- Show **both** a Lalezar header and an Inter-700 header on one in-app screen so I can compare scannability.
- Propose the **elevation** read for a stack of overlapping surfaces (`#241326` field → `#31203A` card → `#3E2A48` raised) using color-shift only (no shadow).
- Demonstrate the **daylight aubergine CTA** (aubergine fill + white text) on Checkout/QR so I can confirm it reads as clearly as the gold CTA does on dark.

Deliver each screen as a self-contained artifact (HTML for Stitch / React+Tailwind+shadcn for v0), dark theme except the two daylight surfaces, with the AR-RTL variant for Home and Film detail.

## PROMPT BLOCK (↑ copy to here)

---

### After the tool returns

1. Save outputs into this run folder (HTML → `mockups/`, components → a `components/` subfolder or keep as reference).
2. Re-run **bmad-ux** in **Update** mode: I'll reconcile the tool's output into `DESIGN.md` / `EXPERIENCE.md`, surface any drift from the locked identity, and promote keeper artifacts.
3. Clear the remaining EXPERIENCE.md open items (theater/concert detail structure, guest-checkout permission, Konnect hosted-payment theming). _(The palette open item is resolved — Gold Leaf × Aubergine is pinned; cobalt was dropped.)_
