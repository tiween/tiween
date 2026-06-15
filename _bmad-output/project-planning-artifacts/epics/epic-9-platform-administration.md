# Epic 9: Platform Administration [MVP-partial]

Admins can manage content and moderate the platform via Strapi Admin.

> **MVP Scope:** Manual content management (films, showtimes, venues). Advanced features deferred to Phase 2.

## Story 9.1: Venue Approval Workflow [Phase 2]

> **Deferred:** B2B venue self-registration not in MVP. Admin creates venues directly.

As an **admin**,
I want to approve or reject venue registrations,
So that only legitimate venues are listed.

**Acceptance Criteria:**

**Given** a new venue registration is submitted
**When** I review it in Strapi admin
**Then** I can see all submitted information and documents
**And** I can approve the venue (sets status to approved)
**And** I can reject with a reason
**And** approval triggers welcome email to venue manager
**And** rejection triggers rejection email with reason
**And** venue manager account is activated on approval

---

## Story 9.2: Manual Event Creation and Editing [MVP]

As an **admin**,
I want to create and edit films and showtimes,
So that users see accurate cinema listings.

**Acceptance Criteria:**

**Given** I am in Strapi admin
**When** I create or edit content
**Then** I can create films with full details (title, synopsis, trailer, cast, duration)
**And** I can create showtimes linked to films and venues
**And** I can edit any film or showtime
**And** I can manage venue information (name, location, contact)
**And** I can set featured films for homepage promotion
**And** changes are reflected on the platform immediately

---

## Story 9.3: Event Flagging for Quality Issues [Phase 2]

> **Deferred:** Quality flagging workflow added when B2B venues can create their own events.

As an **admin**,
I want to flag events with quality issues,
So that venue managers can correct problems.

**Acceptance Criteria:**

**Given** I notice an event with issues
**When** I flag the event
**Then** I can select issue type: incomplete info, wrong dates, inappropriate content
**And** I can add a note explaining the issue
**And** flag notification is sent to venue manager
**And** event shows "needs attention" status
**And** I can track resolution status

---

## Story 9.4: Platform Analytics Dashboard [Phase 2]

> **Deferred:** Analytics dashboard added in Phase 2 when there's meaningful data to analyze.

As an **admin**,
I want to view platform-wide analytics,
So that I can monitor growth and performance.

**Acceptance Criteria:**

**Given** I am in the admin dashboard
**When** I view analytics
**Then** I see: total users, new registrations, MAU
**And** I see: total events, events this week, featured events
**And** I see: total revenue, transactions, average order value
**And** I see: venue count, pending approvals
**And** I can filter by date range
**And** I can export data for reporting

---

## Story 9.5: User Account Management [Phase 2]

> **Deferred:** User management added in Phase 2 when user base grows.

As an **admin**,
I want to manage user accounts,
So that I can handle support issues and policy violations.

**Acceptance Criteria:**

**Given** I am in user management
**When** I view/manage users
**Then** I can search users by email or name
**And** I can view user details and activity
**And** I can suspend accounts (with reason)
**And** I can reactivate suspended accounts
**And** I can delete accounts (GDPR compliance)
**And** all actions are logged with timestamp

---

## Story 9.6: Categories and Regions Management [MVP]

As an **admin**,
I want to manage content categories and regions,
So that the platform organization stays current.

**Acceptance Criteria:**

**Given** I am in content management
**When** I manage categories
**Then** I can add new event categories
**And** I can edit category names (with translations)
**And** I can set category order/priority
**When** I manage regions/cities
**Then** I can add new regions and cities
**And** I can edit translations
**And** changes reflect immediately on the platform

---
