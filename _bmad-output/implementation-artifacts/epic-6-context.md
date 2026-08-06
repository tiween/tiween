# Epic 6 Context: B2C Ticketing & Purchases [Phase 2]

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give consumers a complete, trustworthy path from choosing tickets to entering the venue: view ticket types and live availability for a showtime, select quantities, pay with familiar Tunisian methods via Konnect, and receive cryptographically signed QR tickets that work offline on event night. The epic turns discovery into revenue while upholding financial integrity (never charge on failure, never oversell) and the product's offline-first promise. It is Phase 2 work, gated on the ticketing Unit of Work and atomic inventory facade, and it introduces a dedicated `payments` plugin as an Anti-Corruption Layer around Konnect.

## Stories

- Story 6.1: View Ticket Types and Prices
- Story 6.2: Select Ticket Quantity
- Story 6.3: Konnect Payment Gateway Integration
- Story 6.4: QR Code Ticket Generation
- Story 6.5: Email Ticket Delivery
- Story 6.6: In-App Ticket Viewing
- Story 6.7: Offline QR Code Access
- Story 6.8: Purchase Confirmation with Celebration
- Story 6.9: Purchase History
- Story 6.10: Real-Time Ticket Availability

## Requirements & Constraints

- Ticket types are Plein tarif, Tarif réduit, VIP; prices display in TND formatted as "15,00 DT". Reduced-rate restrictions must be surfaced (e.g. "sur justificatif"). Availability ("X restants") is shown per type; sold-out types are indicated and not selectable.
- Order limits: 1–10 tickets per type, max 10 tickets per order; multiple types combinable in one order; subtotal and total update in real time.
- Payment methods: e-Dinar, Sobflous, D17, Flouci, Carte bancaire. Payment must complete within 5 seconds. Failed payments show a clear error with a retry path, and the user is never charged on failure.
- Financial integrity is non-negotiable: order + tickets + inventory must be written atomically, and concurrent buyers must never oversell the last seat.
- QR tickets are cryptographically signed (HMAC-SHA256), unique/non-duplicable, and carry order ID, ticket ID, event details, and showtime. They appear immediately in "Mes Billets" after a successful order.
- Confirmation email arrives within 2 minutes and includes order details, event info, one QR per ticket, and an add-to-calendar link; it goes to the account email or the guest email.
- Offline requirement: tickets viewed while online remain fully usable offline (QR renders from cache, "Works offline" badge, brightness boost, still scannable).
- Guest checkout (email only, no account required) is a first-class path; ticket viewing requires no login.
- Success targets: checkout completes in under 60 seconds, at most 3 taps from event detail to payment confirmation, ticket access in 1 tap.
- UI copy is French: "Mes Billets", "Mes achats", "Paiement validé!", "Complet", "Historique". Numbers must render with Western numerals in every locale (a standing i18n rule with its own lint guard).

## Technical Decisions

- **`payments` plugin (Anti-Corruption Layer, D5):** created when this epic starts, mirroring `tmdb-integration`. Owns no content types — only a `konnect-client` service, a status-mapping service, and a `public-api` facade, plus a content-api webhook route at `/payments/konnect/webhook` with signature verification isolated inside the plugin. As an integration plugin it depends on nothing and anyone may call it (rule R5); ticketing calls it only through `payments.public-api` (rule R3).
- **Ticketing Unit of Work (prerequisite, already landed as story 2C.4):** `order.createOrder` runs inside `strapi.db.transaction` — re-read availability → create order + tickets → decrement inventory via the events-manager facade — throwing the `TICKET_SOLD_OUT` code on failure to roll back. Cross-plugin facade calls that write happen inside the caller's transaction; facades never open their own.
- **Atomic inventory (concurrency floor):** `events-manager.public-api.adjustInventory(...)` performs a single conditional `UPDATE ... WHERE tickets_sold + qty <= tickets_available`; zero rows affected throws `TICKET_SOLD_OUT`. This is the one sanctioned exception to the Document-Service-only rule.
- **Facade pattern (D8):** every plugin exposes exactly one `public-api` service as its sole cross-plugin entry point; typed params/returns, no ctx, no Strapi internals leaked. Reaching into another plugin's content types with a foreign UID is a review blocker (rule R4).
- **Validation & errors:** Zod schemas in `server/src/validation/` invoked via the shared `validate()` helper; error responses carry SCREAMING_SNAKE codes (never prose) and are translated client-side.
- **Config, not constants:** currency comes from plugin config (`defaultCurrency`), never a hardcoded "TND"/"fr" literal.
- **Plugin conventions:** hand-rolled `({ strapi }) => ({...})` service/controller factories, module-level UID constants (never inline UID strings), Document Service API only, string route handlers, and mandatory `admin/src/translations/{en,fr,ar}.json`. A new plugin is a sibling-clone of `geography`, never the SDK init layout.
- **Real-time availability (6.10):** WebSocket-based live "X remaining" updates with graceful degradation on disconnect. This falls under the deferred real-time requirement cluster built on top of the inventory facade; the original architecture's WebSocket decision governs it.
- **Quality gate:** each PR must pass lint (`eslint . --max-warnings=0`, both apps), type-check, tests, grep gates, and the strapi-reviewer pass. Real lint enforcement was restored specifically because unverified `any`-laden code is most expensive in this epic's backend work — no `ctx: any`, no `--no-verify` commits.

## UX & Interaction Patterns

- Ticketing is a 4-step flow with visible progress indicators, favouring a single page with expandable sections over multi-page checkout.
- Domain components: `ShowtimePicker`, `QuantitySelector`, `TicketQR`/`TicketCard`, and shadcn-based checkout forms; the app shell uses a persistent bottom tab bar (Accueil / Recherche / Billets / Compte).
- Confirmation moment is a deliberate celebration: confetti + checkmark animation, "Paiement validé!" message, order summary, a prominent "View my tickets" CTA, add-to-calendar, and share.
- "Mes Billets" groups upcoming tickets by event/date with a QR preview; tapping opens the full `TicketQR`; past tickets live in a separate "Historique" section. Purchase history ("Mes achats") lists orders by date with status and links refund requests to support.
- Ticket display targets event-night reliability: no login to view, offline QR from cache, high-contrast/brightness boost for scanning.
- Emotional design goals: trust via clear DT pricing, familiar payment UX, and progress indicators; reassurance on errors via clear messaging, recovery paths, and offline fallbacks.

## Cross-Story Dependencies

- **Hard prerequisite:** the ticketing Unit of Work + atomic inventory facade (story 2C.4) must exist before stories 6.1 and 6.3 begin — it is tracked done in sprint status; story 6.10 builds directly on the `events-manager.public-api` inventory facade.
- The `payments` plugin is created as the first infrastructure task when the epic starts (arch migration "With Epic 6" checklist); Konnect work is independent of the venues/catalog migration steps.
- Auth (Epic 4) is done; the guest-checkout path lets purchases proceed with email only.
- Internal flow order: 6.1 → 6.2 feed the selection step; 6.3 (payment) gates 6.4 (QR generation), which feeds 6.5 (email), 6.6 (in-app viewing), 6.7 (offline access), and 6.8 (confirmation). 6.9 (history) consumes completed orders; 6.10 (real-time availability) underlies the 6.1/6.2 selection experience.
