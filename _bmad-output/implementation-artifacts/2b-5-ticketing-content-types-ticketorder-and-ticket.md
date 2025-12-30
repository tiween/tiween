# Story 2B.5: Ticketing Content-Types - TicketOrder and Ticket

Status: review

---

## Story

As a **developer**,
I want to create TicketOrder and Ticket content-types,
So that the platform can manage ticket purchases.

## Acceptance Criteria

1. **AC#1**: TicketOrder content-type is created with all required fields:

   - `orderNumber` (string, unique, auto-generated pattern)
   - `user` (relation to users-permissions user, optional for guest)
   - `guestEmail` (email, for guest checkout)
   - `guestName` (string, for guest checkout)
   - `event` (relation to Event)
   - `showtime` (relation to Showtime)
   - `totalAmount` (decimal)
   - `currency` (string, default: TND)
   - `paymentStatus` (enum: pending, paid, failed, refunded)
   - `paymentMethod` (string)
   - `paymentReference` (string)
   - `purchasedAt` (datetime)

2. **AC#2**: Ticket content-type is created with all required fields:

   - `ticketNumber` (string, unique)
   - `order` (relation to TicketOrder)
   - `type` (enum: standard, reduced, vip)
   - `price` (decimal)
   - `qrCode` (string, signed hash for validation)
   - `status` (enum: valid, scanned, cancelled, expired)
   - `scannedAt` (datetime)
   - `seatInfo` (json, optional seat details)

3. **AC#3**: Content-types are accessible via REST API at `/api/ticket-orders` and `/api/tickets`

4. **AC#4**: TicketOrder has relation to Event and Showtime

5. **AC#5**: Ticket has relation to TicketOrder (manyToOne)

6. **AC#6**: TypeScript types are generated via `strapi ts:generate-types`

## Tasks / Subtasks

- [x] **Task 1: Create TicketOrder Content-Type** (AC: #1, #4)

  - [x] 1.1 Create directory structure at `src/api/ticket-order/`
  - [x] 1.2 Create `content-types/ticket-order/schema.json` with all fields
  - [x] 1.3 Add relation to Event and Showtime
  - [x] 1.4 Add optional relation to users-permissions user
  - [x] 1.5 Create `controllers/ticket-order.ts` with core controller factory
  - [x] 1.6 Create `services/ticket-order.ts` with core service factory
  - [x] 1.7 Create `routes/ticket-order.ts` with core router factory

- [x] **Task 2: Create Ticket Content-Type** (AC: #2, #5)

  - [x] 2.1 Create directory structure at `src/api/ticket/`
  - [x] 2.2 Create `content-types/ticket/schema.json` with all fields
  - [x] 2.3 Add relation to TicketOrder (manyToOne)
  - [x] 2.4 Create `controllers/ticket.ts` with core controller factory
  - [x] 2.5 Create `services/ticket.ts` with core service factory
  - [x] 2.6 Create `routes/ticket.ts` with core router factory

- [x] **Task 3: Generate TypeScript Types** (AC: #6)
  - [x] 3.1 Run `yarn strapi ts:generate-types`
  - [x] 3.2 Verify types generated in `types/generated/`
  - [x] 3.3 Verify build succeeds

---

## Dev Notes

### TicketOrder Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "ticket_orders",
  "info": {
    "singularName": "ticket-order",
    "pluralName": "ticket-orders",
    "displayName": "Ticket Order"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "orderNumber": {
      "type": "string",
      "unique": true,
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event"
    }
  }
}
```

### Ticket Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "tickets",
  "info": {
    "singularName": "ticket",
    "pluralName": "tickets",
    "displayName": "Ticket"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "order": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::ticket-order.ticket-order",
      "inversedBy": "tickets"
    }
  }
}
```

### User Relation

For optional user relation (guest checkout support):

- Use `plugin::users-permissions.user` as target
- No `required: true` to allow guest orders

### Payment Status Flow

- `pending`: Order created, awaiting payment
- `paid`: Payment successful
- `failed`: Payment failed
- `refunded`: Payment was refunded

### Ticket Status Flow

- `valid`: Ticket is valid and can be scanned
- `scanned`: Ticket has been used
- `cancelled`: Ticket was cancelled
- `expired`: Event has passed

### QR Code Field

The `qrCode` field stores a signed hash for ticket validation:

- Generated server-side when ticket is created
- Contains: ticketNumber + orderNumber + eventId + timestamp
- Used by scanner to validate ticket authenticity

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.5]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Data Architecture]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **TicketOrder content-type created** with all required fields:

   - orderNumber (unique, required)
   - user (optional relation to users-permissions.user for guest checkout support)
   - guestEmail/guestName for guest checkout
   - event/showtime relations (manyToOne)
   - tickets (oneToMany to Ticket with mappedBy)
   - totalAmount, currency (default TND)
   - paymentStatus enum (pending, paid, failed, refunded)
   - paymentMethod, paymentReference, purchasedAt

2. **Ticket content-type created** with all required fields:

   - ticketNumber (unique, required)
   - order relation (manyToOne to TicketOrder with inversedBy)
   - type enum (standard, reduced, vip)
   - price (decimal, required)
   - qrCode (string for signed hash)
   - status enum (valid, scanned, cancelled, expired)
   - scannedAt (datetime)
   - seatInfo (json for optional seat details)

3. **Bidirectional relation** established between TicketOrder and Ticket:

   - TicketOrder.tickets (oneToMany, mappedBy: "order")
   - Ticket.order (manyToOne, inversedBy: "tickets")

4. **Draft & Publish disabled** for both content-types (transactional data)

5. **Build verified**: `yarn build` completes successfully

6. **TypeScript types generated**: ApiTicketOrderTicketOrder and ApiTicketTicket present in contentTypes.d.ts

### File List

**New Files Created:**

- `apps/strapi/src/api/ticket-order/content-types/ticket-order/schema.json`
- `apps/strapi/src/api/ticket-order/controllers/ticket-order.ts`
- `apps/strapi/src/api/ticket-order/services/ticket-order.ts`
- `apps/strapi/src/api/ticket-order/routes/ticket-order.ts`
- `apps/strapi/src/api/ticket/content-types/ticket/schema.json`
- `apps/strapi/src/api/ticket/controllers/ticket.ts`
- `apps/strapi/src/api/ticket/services/ticket.ts`
- `apps/strapi/src/api/ticket/routes/ticket.ts`

**Modified Files:**

- `apps/strapi/types/generated/contentTypes.d.ts` (auto-generated)
