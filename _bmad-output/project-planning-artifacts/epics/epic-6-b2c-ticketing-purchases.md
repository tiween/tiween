# Epic 6: B2C Ticketing & Purchases

Users can purchase tickets for events, receive QR codes, and access them offline on event night.

## Story 6.1: View Ticket Types and Prices

As a **visitor**,
I want to see available ticket types and prices,
So that I can understand my options before purchasing.

**Acceptance Criteria:**

**Given** I am on an event detail page
**When** I tap on a showtime
**Then** I see all available ticket types (Plein tarif, Tarif réduit, VIP)
**And** each type shows the price in TND (e.g., "15,00 DT")
**And** availability is shown (e.g., "12 restants")
**And** sold out types are indicated and not selectable
**And** any restrictions are noted (e.g., "Tarif réduit: sur justificatif")

---

## Story 6.2: Select Ticket Quantity

As a **user**,
I want to select the number and type of tickets,
So that I can purchase for myself and my group.

**Acceptance Criteria:**

**Given** I am in the ticket selection step
**When** I adjust quantities using the QuantitySelector
**Then** I can select 1-10 tickets per type
**And** the subtotal updates in real-time
**And** total ticket count is limited (e.g., max 10 per order)
**And** I can select multiple ticket types (e.g., 2 adult + 1 child)
**And** "Continue" button shows total price

---

## Story 6.3: Konnect Payment Gateway Integration

As a **user**,
I want to pay using Tunisian payment methods,
So that I can complete my purchase with familiar options.

**Acceptance Criteria:**

**Given** I am on the payment step
**When** I select a payment method
**Then** I can choose from: e-Dinar, Sobflous, D17, Flouci, Carte bancaire
**And** selecting a method shows appropriate form fields
**And** payment is processed via Konnect Network API
**And** payment completes within 5 seconds (NFR-IN1)
**And** failed payments show clear error and retry option
**And** I am not charged if payment fails

---

## Story 6.4: QR Code Ticket Generation

As a **user**,
I want to receive QR code tickets after purchase,
So that I can enter the event venue.

**Acceptance Criteria:**

**Given** my payment is successful
**When** the order is confirmed
**Then** QR code tickets are generated for each ticket purchased
**And** QR codes are cryptographically signed (HMAC-SHA256)
**And** tickets contain: order ID, ticket ID, event details, showtime
**And** QR codes are unique and cannot be duplicated
**And** tickets are immediately available in "Mes Billets"

---

## Story 6.5: Email Ticket Delivery

As a **user**,
I want to receive my tickets via email,
So that I have a backup copy outside the app.

**Acceptance Criteria:**

**Given** my purchase is complete
**When** confirmation is processed
**Then** I receive an email within 2 minutes (NFR-IN3)
**And** email includes:

- Order confirmation details
- Event information (title, date, time, venue)
- QR code tickets (one per ticket purchased)
- Add to calendar link
  **And** email is sent to my account email or guest email

---

## Story 6.6: In-App Ticket Viewing

As a **user**,
I want to view my tickets in the app,
So that I can access them quickly on event night.

**Acceptance Criteria:**

**Given** I have purchased tickets
**When** I navigate to "Mes Billets" (via Tickets tab)
**Then** I see all my upcoming tickets
**And** tickets are grouped by event/date
**And** each ticket shows: event title, date, time, venue, QR code preview
**And** tapping a ticket shows full TicketQR component
**And** past tickets are in a separate "Historique" section

---

## Story 6.7: Offline QR Code Access

As a **user**,
I want to access my ticket QR codes offline,
So that I can enter the venue without internet.

**Acceptance Criteria:**

**Given** I have viewed my tickets while online
**When** I go offline
**Then** my tickets are still accessible
**And** QR codes display correctly from cache
**And** "Works offline" badge is shown
**And** brightness boost option works offline
**And** ticket remains valid for scanning

---

## Story 6.8: Purchase Confirmation with Celebration

As a **user**,
I want to see a satisfying confirmation after purchase,
So that I feel confident my purchase succeeded.

**Acceptance Criteria:**

**Given** my payment is successful
**When** the confirmation screen shows
**Then** I see a celebration animation (confetti, checkmark)
**And** I see "Paiement validé!" message
**And** order details are summarized
**And** "View my tickets" CTA is prominent
**And** "Add to calendar" option is available
**And** share option lets me tell friends

---

## Story 6.9: Purchase History

As a **user**,
I want to view my purchase history,
So that I can reference past orders.

**Acceptance Criteria:**

**Given** I am on my account page
**When** I view "Mes achats" / purchase history
**Then** I see all past orders sorted by date
**And** each order shows: date, event, amount, status
**And** I can tap to see order details
**And** I can view/download past tickets (for valid period)
**And** refund requests link to support

---

## Story 6.10: Real-Time Ticket Availability

As a **user**,
I want to see real-time ticket availability,
So that I don't try to buy tickets that are already sold.

**Acceptance Criteria:**

**Given** I am selecting tickets for an event
**When** tickets are being purchased by others
**Then** availability updates in real-time via WebSocket
**And** if tickets sell out while I'm selecting, I'm notified
**And** "X remaining" count updates live
**And** if all tickets sell, "Complet" badge appears
**And** graceful degradation if WebSocket disconnects

---
