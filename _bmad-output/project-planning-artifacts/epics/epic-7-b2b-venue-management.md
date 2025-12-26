# Epic 7: B2B Venue Management

Venue managers can register, manage their venue profile, create/edit events, configure ticketing, and view analytics via Strapi Admin.

## Story 7.1: Venue Registration Flow

As a **venue owner**,
I want to register my venue on Tiween,
So that I can list my events and sell tickets.

**Acceptance Criteria:**

**Given** I am a new venue owner
**When** I submit the venue registration form
**Then** I provide: venue name, address, type, description, contact info
**And** I upload venue photos and logo
**And** I provide my personal details for the manager account
**And** submission creates a pending venue and venue-manager account
**And** I receive a confirmation email that application is under review
**And** admin is notified of the new registration

---

## Story 7.2: Venue Profile Management

As a **venue manager**,
I want to manage my venue's profile,
So that visitors see accurate and attractive information.

**Acceptance Criteria:**

**Given** I am logged into Strapi admin as venue manager
**When** I edit my venue profile
**Then** I can update: name, description, address, contact info
**And** I can upload/replace photos and logo
**And** I can set capacity and amenities
**And** I can update location on map (lat/long)
**And** changes are reflected on the public venue page

---

## Story 7.3: Event Creation

As a **venue manager**,
I want to create new events at my venue,
So that visitors can discover and attend.

**Acceptance Criteria:**

**Given** I am in the Strapi admin Events section
**When** I create a new event
**Then** I can select or create the creative work (film, play, etc.)
**And** I can set event dates (start/end of run)
**And** I can add multiple showtimes with times and formats
**And** I can set featured flag for promotion
**And** event is created as draft until published
**And** I can preview how the event will appear

---

## Story 7.4: Event Editing and Cancellation

As a **venue manager**,
I want to edit or cancel events,
So that I can keep information accurate.

**Acceptance Criteria:**

**Given** I have an existing event
**When** I edit the event
**Then** I can modify all event details
**And** I can add/remove showtimes
**And** I can change the status to cancelled
**And** cancelling an event:
- Marks all showtimes as cancelled
- Triggers notification to users with watchlisted events
- Triggers refund process for purchased tickets
**And** edit history is logged

---

## Story 7.5: Ticketing Configuration

As a **venue manager**,
I want to configure ticketing for my events,
So that I can sell tickets through Tiween.

**Acceptance Criteria:**

**Given** I am creating or editing an event
**When** I configure ticketing
**Then** I can enable/disable ticketing per showtime
**And** I can set ticket types (standard, reduced, VIP)
**And** I can set prices for each type
**And** I can set available quantity per type
**And** I can set sale start/end dates
**And** I can preview the ticket selection UI

---

## Story 7.6: Multiple Ticket Types Configuration

As a **venue manager**,
I want to offer different ticket categories,
So that I can serve different audience segments.

**Acceptance Criteria:**

**Given** I am configuring ticketing
**When** I add ticket types
**Then** I can create: Plein tarif, Tarif réduit, VIP, Groupe, etc.
**And** each type has: name, price, quantity, description
**And** I can specify eligibility requirements
**And** I can set a maximum per customer
**And** types are displayed in configured order

---

## Story 7.7: Ticket Sales Reports

As a **venue manager**,
I want to view sales reports for my events,
So that I can track revenue and attendance.

**Acceptance Criteria:**

**Given** I am in the venue dashboard in Strapi
**When** I view sales reports
**Then** I see total revenue per event
**And** I see tickets sold by type
**And** I see sales over time (chart)
**And** I can filter by date range
**And** I can export reports as CSV
**And** I only see data for my venue's events

---

## Story 7.8: Event Analytics

As a **venue manager**,
I want to see analytics for my events,
So that I can understand audience engagement.

**Acceptance Criteria:**

**Given** I am in the venue dashboard
**When** I view event analytics
**Then** I see page views per event
**And** I see watchlist adds/removes
**And** I see conversion rate (views → purchases)
**And** I see demographic breakdown (aggregated, not individual)
**And** I can compare performance across events
**And** data is privacy-compliant (NFR-D5)

---

## Story 7.9: Real-Time Sales Updates

As a **venue manager**,
I want to see sales updates in real-time,
So that I can monitor demand as it happens.

**Acceptance Criteria:**

**Given** I am viewing the sales dashboard
**When** a ticket is purchased
**Then** the sales count updates within 2 seconds
**And** a notification toast appears for new sales
**And** the revenue total updates
**And** real-time updates use WebSocket connection
**And** dashboard remains responsive with many updates

---
