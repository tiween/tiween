# Epic 9: Platform Administration

Admins can moderate venues, manage content quality, view platform analytics, and manage users via Strapi Admin.

## Story 9.1: Venue Approval Workflow

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

## Story 9.2: Manual Event Creation and Editing

As an **admin**,
I want to create and edit any event,
So that I can ensure complete and accurate listings.

**Acceptance Criteria:**

**Given** I am in Strapi admin
**When** I create or edit events
**Then** I can create events for any venue
**And** I can edit any event regardless of owner
**And** I can add events without ticketing (free/informational)
**And** changes are logged with admin user ID
**And** I can set featured events for homepage promotion

---

## Story 9.3: Event Flagging for Quality Issues

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

## Story 9.4: Platform Analytics Dashboard

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

## Story 9.5: User Account Management

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

## Story 9.6: Categories and Regions Management

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
