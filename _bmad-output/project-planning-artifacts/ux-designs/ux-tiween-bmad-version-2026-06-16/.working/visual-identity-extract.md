# Tiween Visual Identity Extract

> Distilled by subagent from `_bmad-output/project-planning-artifacts/ux-design-specification.md` (2025-12-25, 1804 lines).
> Source of truth for the DESIGN.md spine. "NOT SPECIFIED" = genuine gap, do not invent.

## 1. Brand & Style

- Positioning: "Tunisia's cultural compass" — discovery-first, mobile-first PWA.
- Direction (verbatim): **"Dark Cinema Aesthetic with Yellow Accent Strategy."**
- Feel: dark-first, poster-forward (imagery leads, text supports), card-based, entertainment-app conventions (cinema/Netflix/Spotify).
- Signature emotion: **"Cultural Excitement + Effortless Confidence"** — "a secret weapon for cultural life in Tunisia."
- Emotions: confidence>confusion · trust>skepticism · excitement>anxiety · accomplishment>frustration · belonging>isolation.
- Experience principles: Discovery First · 30-Second Value · One-Tap Power · Offline Confidence · Bilingual Seamlessness · Cultural Preservation.
- Voice/tone adjective list: **NOT SPECIFIED** (only emotion words). UI copy FR-default.

## 2. Colors

| Color                  | Hex       | HSL         | Usage                         |
| ---------------------- | --------- | ----------- | ----------------------------- |
| Tiween Green (Primary) | `#032523` | 169 79% 8%  | Backgrounds, primary surfaces |
| Tiween Yellow (Accent) | `#F8EB06` | 56 97% 50%  | CTAs, highlights, focus       |
| White                  | `#FFFFFF` | 0 0% 100%   | Text on dark                  |
| Surface Light          | `#0A3533` | 169 60% 12% | Elevated cards, modals        |
| Surface Lighter        | `#0F4542` | 169 55% 16% | Hover, subtle elevation       |

Semantic: `--muted-foreground #A0A0A0` · `--destructive #EF4444` · `--success #22C55E` · `--warning #F59E0B` · `--card 169 60% 12%`. Info toast = "blue accent" (no hex). **Single dark theme — no light mode toggle.**

## 3. Typography

| Role        | Font                 | Weights         | Usage                             |
| ----------- | -------------------- | --------------- | --------------------------------- |
| Display     | **Lalezar**          | 400             | Headlines, brand, hero (AR+Latin) |
| Body Latin  | **Inter**            | 400/500/600/700 | Body, UI, forms                   |
| Body Arabic | **Noto Sans Arabic** | 400/500/600/700 | AR body/UI                        |
| Mono        | **JetBrains Mono**   | 400             | Ticket IDs, technical             |

Scale (px size/line): xs 12/16 · sm 14/20 · base 16/24 · lg 18/28 · xl 20/28 · 2xl 24/32 · 3xl 30/36 · 4xl 36/40. Min 16px base, 1.5 line-height body. Lalezar headlines only.

## 4. Layout & Spacing

- Spacing 4px base: 0,4,8,12,16,20,24,32,40,48,64.
- Grid: mobile 4col/16px gut/16px margin · tablet 8col/24px · desktop 12col/24px max **1280px**.
- Breakpoints: sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536.
- Containers: mobile 100%/16 · tablet 100%/24 · desktop 1280/24 · wide 1536/32.
- Touch: 44px min, 48px preferred, 8px min gap. Thumb-zone nav. 64px fixed bottom nav (+ iOS safe area).

## 5. Shapes & Rounding

- **NOT SPECIFIED** — no radius scale/values. shadcn/Tailwind defaults implied, never stated. **GAP.**
- Card-based architecture throughout. Seat glyphs: ○ available · ● selected · × taken · ◆ wheelchair.

## 6. Elevation & Depth

- No formal shadow/dp system — **GAP**. Elevation = surface-color shift (#0A3533 cards, #0F4542 hover).
- Hierarchy: L1 full-bleed hero → L2 Lalezar section headers → L3 Inter card titles → L4 secondary text.

## 7. Components (anatomies)

- **EventCard** — poster 16:9 → category badge + rating → title → venue•date → watchlist heart + price. Variants default/compact/featured. States default/hover(elevation+gradient)/loading(skeleton)/watchlisted(filled heart). role=article, yellow focus ring.
- **ShowtimeButton** — time → venue → format badges [VOST][2D]. States default/hover/selected(yellow border+fill)/unavailable(strikethrough)/soldout("Complet" disabled). role=radio.
- **TicketQR** — large QR → ticket# (TIW-2024-XXXX) → title → date•time•venue → qty → [Add to Wallet][Share]. States valid(green)/scanned(check overlay)/expired(dim)/offline("still valid"). High-contrast QR, brightness boost.
- **BottomNav** — 4 tabs: Accueil 🏠 / Recherche 🔍 / Billets 🎟️ / Compte 👤. Active=yellow icon+text. 48px tap, 64px height. Hidden during checkout & keyboard-open.
- **SeatSelector** — ○●×◆ glyphs, arrow-key nav.
- Others (lighter spec): FilmHero, CategoryTabs, DateSelector, WatchlistButton(heart pulse), VenueCard, FilmCard, ShowtimeCard, QuantitySelector, CheckoutForm, OrderSummary, AnalyticsCard, EventForm, TicketScanner, VenueSettings, StickyHeader, PageContainer.
- **Buttons:** Primary yellow (bg-primary/text-primary-foreground, 48px, full-width mobile) · Secondary outline (44px) · Tertiary ghost (40px) · Destructive red (confirm dialog). Hover=brightness up · pressed=scale 0.98 · disabled=50% opacity · loading=spinner.
- shadcn used: Button,Card,Badge,Tabs,Dialog,Sheet,Input,Select,Form,Label,Checkbox,Radio,Switch,Toast,Skeleton,Progress,Calendar,Popover,Separator,ScrollArea.
- Badges: VOST/VF/3D/2D/duration, genre, "Complet", offline "Fonctionne hors ligne" (green).

## 8. Iconography & Imagery

- Poster-forward; EventCard 16:9; FilmHero full-bleed. Blur→sharp progressive load.
- Other aspect ratios (2:3): **NOT SPECIFIED — GAP.**
- Icon set/stroke: **NOT SPECIFIED — GAP** (emoji placeholders used). Directional icons mirror in RTL. Status = icon+text. QR black-on-white.

## 9. Motion

- Respect prefers-reduced-motion.
- Celebrations: ticket purchase confetti+check 2s · first watchlist heart pulse 0.5s · account created confetti 2s.
- Timings: button spinner 200ms delay · search 300ms debounce · validation 500ms debounce.
- Modal: slide-up mobile / fade desktop. Toasts: success 3s/error 5s/warn 4s/info 3s.
- Gestures: pull-to-refresh, swipe-dismiss, swipe-nav — all need button alternatives.

## 10. Key Screens (B2C — in-scope)

Homepage/Accueil · Category pages (Cinéma/Théâtre/Courts-métrages/Musique) · Search/Recherche · Film Detail · Theater/Salle detail · Film Desktop (12-col) · Ticketing flow (4-step: showtime→qty→login/guest→payment→confirmation) · Confirmation ("Paiement validé!") · My Tickets/Billets · Account/Compte · Watchlist · Splash · Loading/skeleton states.

## 11. A11y & i18n visual

- WCAG 2.1 AA. Contrast: yellow-on-teal 12.5:1, white-on-teal 15.8:1, muted 5.2:1.
- Focus: **3px yellow outline + 2px offset**, visible on all bg.
- Non-color status always icon+text.
- RTL: dir=rtl on html for AR, logical props (ps/pe/ms/me), mirrored icons, instant flip no reload, Noto Sans Arabic for AR. AR/FR/EN, Arabic-first→adapt LTR. Pricing in DT.
- Numeral convention (project-context says Arabic uses WESTERN numerals, DD/MM/YYYY) — legacy spec silent; project-context wins.
- 200% zoom no horizontal scroll.

## 12. Source assets cited

brandbook*tiween.pdf · tiween_compo.pdf (logos) · reponses_brief_crea.pdf (creative brief) · prd.md · product-brief · legacy/frontend/components · input/TIWEEN*\*.png (28 mockups, not enumerated).
