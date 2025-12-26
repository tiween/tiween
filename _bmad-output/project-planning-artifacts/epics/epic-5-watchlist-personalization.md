# Epic 5: Watchlist & Personalization

Authenticated users can save events to their watchlist, access it offline, and sync across devices.

## Story 5.1: Add Event to Watchlist

As an **authenticated user**,
I want to add an event to my watchlist,
So that I can easily find it later.

**Acceptance Criteria:**

**Given** I am logged in and viewing an event
**When** I tap the heart/watchlist button
**Then** the event is added to my watchlist
**And** the heart icon fills (yellow) with a pulse animation
**And** a toast confirms "Ajouté à la watchlist"
**And** the action is saved to Strapi
**And** if offline, the action is queued for sync

---

## Story 5.2: Remove Event from Watchlist

As an **authenticated user**,
I want to remove an event from my watchlist,
So that I can keep my saved items relevant.

**Acceptance Criteria:**

**Given** an event is in my watchlist
**When** I tap the filled heart icon
**Then** the event is removed from my watchlist
**And** the heart icon becomes outline
**And** a toast confirms with undo option
**And** the action is saved to Strapi
**And** the event card disappears from watchlist page (with animation)

---

## Story 5.3: View Watchlist Page

As an **authenticated user**,
I want to view all my saved events,
So that I can browse and plan my cultural activities.

**Acceptance Criteria:**

**Given** I navigate to my watchlist (via Account tab)
**When** the page loads
**Then** I see all my saved events as EventCards
**And** events are sorted by event date (soonest first)
**And** I can filter by category
**And** expired events are shown in a separate "Past" section
**And** empty state shows "Your watchlist is empty" with CTA

---

## Story 5.4: Offline Watchlist Access

As an **authenticated user**,
I want to access my watchlist when offline,
So that I can view saved events without internet.

**Acceptance Criteria:**

**Given** I have previously viewed my watchlist while online
**When** I go offline and access my watchlist
**Then** I see my cached watchlist items
**And** an "Offline" indicator is shown
**And** "Last synced: X minutes ago" is displayed
**And** I cannot add/remove items (disabled with tooltip)
**And** when I go back online, any pending actions sync

---

## Story 5.5: Watchlist Sync Across Devices

As an **authenticated user**,
I want my watchlist to sync across all my devices,
So that I see the same saved events everywhere.

**Acceptance Criteria:**

**Given** I am logged in on multiple devices
**When** I add an event to watchlist on one device
**Then** it appears on my other devices within 5 seconds (when online)
**And** conflict resolution uses "last write wins"
**And** offline changes sync when connection is restored
**And** sync status is visible in settings

---

## Story 5.6: Schedule Change Notifications

As an **authenticated user**,
I want to be notified when a watchlisted event's schedule changes,
So that I don't miss or arrive at the wrong time.

**Acceptance Criteria:**

**Given** an event in my watchlist has a schedule change
**When** the change is detected (showtime change, cancellation)
**Then** I receive a notification in the app
**And** the notification shows old vs. new time (or cancellation)
**And** notification badge appears on the Account tab
**And** I can view all notifications in a notifications list
**And** email notification is sent if enabled in preferences

---
