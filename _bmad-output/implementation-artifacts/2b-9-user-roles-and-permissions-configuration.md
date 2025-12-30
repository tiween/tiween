# Story 2B.9: User Roles and Permissions Configuration

Status: review

---

## Story

As a **developer**,
I want to configure user roles with appropriate permissions,
So that B2C users, venue managers, and admins have correct access.

## Acceptance Criteria

1. **AC#1**: Three roles are configured:

   - **Authenticated (B2C)**: Can read events/venues, manage own watchlist, create orders
   - **Venue Manager**: Authenticated permissions + manage own venue, own events, view own sales
   - **Admin**: Full access to all content-types

2. **AC#2**: Public role can:

   - Read published events, venues, creative works
   - Read categories, regions, cities, genres, persons

3. **AC#3**: Venue manager can only access their own venue data (documented for implementation)

4. **AC#4**: Permissions are documented in README

## Tasks / Subtasks

- [x] **Task 1: Document Public Role Permissions** (AC: #2)

  - [x] 1.1 List all public read endpoints
  - [x] 1.2 Document what unauthenticated users can access

- [x] **Task 2: Document Authenticated (B2C) Role Permissions** (AC: #1)

  - [x] 2.1 Define read permissions for events, venues, creative works
  - [x] 2.2 Define watchlist management permissions
  - [x] 2.3 Define order creation permissions
  - [x] 2.4 Define profile management permissions

- [x] **Task 3: Document Venue Manager Role** (AC: #1, #3)

  - [x] 3.1 Define all Authenticated permissions as base
  - [x] 3.2 Define venue management permissions
  - [x] 3.3 Define event management permissions
  - [x] 3.4 Define showtime management permissions
  - [x] 3.5 Document ownership filtering requirement

- [x] **Task 4: Create Permissions README** (AC: #4)

  - [x] 4.1 Create comprehensive permissions documentation
  - [x] 4.2 Include setup instructions for Strapi admin
  - [x] 4.3 Document content-type level permissions matrix

- [x] **Task 5: Add Manager Relation to Venue**

  - [x] 5.1 Add manager field to venue schema

- [x] **Task 6: Create Bootstrap Script for Venue Manager Role**

  - [x] 6.1 Create ensureVenueManagerRole function
  - [x] 6.2 Integrate with src/index.ts bootstrap

- [x] **Task 7: Verify Build**
  - [x] 7.1 Ensure no build errors
  - [x] 7.2 Generate TypeScript types

---

## Dev Notes

### Role Hierarchy

```
Admin (Super Admin)
    └── Full access to everything

Venue Manager (Custom Role)
    └── Authenticated permissions +
        └── Manage own venue
        └── Manage own events
        └── Manage own showtimes
        └── View own ticket orders

Authenticated (B2C User)
    └── Public permissions +
        └── Manage own profile
        └── Manage own watchlist
        └── Create orders
        └── View own orders/tickets

Public (Unauthenticated)
    └── Read published content only
```

### Public Role Permissions

| Content-Type  | find | findOne | create | update | delete |
| ------------- | ---- | ------- | ------ | ------ | ------ |
| Event         | ✅   | ✅      | ❌     | ❌     | ❌     |
| Venue         | ✅   | ✅      | ❌     | ❌     | ❌     |
| Creative Work | ✅   | ✅      | ❌     | ❌     | ❌     |
| Showtime      | ✅   | ✅      | ❌     | ❌     | ❌     |
| Person        | ✅   | ✅      | ❌     | ❌     | ❌     |
| Genre         | ✅   | ✅      | ❌     | ❌     | ❌     |
| Category      | ✅   | ✅      | ❌     | ❌     | ❌     |
| Region        | ✅   | ✅      | ❌     | ❌     | ❌     |
| City          | ✅   | ✅      | ❌     | ❌     | ❌     |

### Authenticated Role Permissions

Inherits Public + additional:

| Content-Type   | find | findOne | create | update | delete |
| -------------- | ---- | ------- | ------ | ------ | ------ |
| User Watchlist | ✅\* | ✅\*    | ✅     | ✅\*   | ✅\*   |
| Ticket Order   | ✅\* | ✅\*    | ✅     | ❌     | ❌     |
| Ticket         | ✅\* | ✅\*    | ❌     | ❌     | ❌     |

\*Own records only (requires policy/middleware)

### Venue Manager Role Permissions

Inherits Authenticated + additional:

| Content-Type | find | findOne | create | update | delete |
| ------------ | ---- | ------- | ------ | ------ | ------ |
| Venue        | ✅\* | ✅\*    | ✅     | ✅\*   | ❌     |
| Event        | ✅\* | ✅\*    | ✅     | ✅\*   | ✅\*   |
| Showtime     | ✅\* | ✅\*    | ✅     | ✅\*   | ✅\*   |
| Ticket Order | ✅\* | ✅\*    | ❌     | ❌     | ❌     |

\*Own venue/events only (requires policy/middleware)

### Ownership Filtering

Venue managers need custom policies to filter data:

- Can only see/edit venues they manage
- Can only see/edit events at their venues
- Can only see ticket orders for their events

This requires:

1. Adding `manager` relation to Venue content-type
2. Custom policies in controllers
3. Or middleware to filter queries

### Strapi Admin Configuration

Permissions are configured in Strapi Admin:

1. Settings → Users & Permissions Plugin → Roles
2. Edit each role and enable/disable permissions
3. For custom roles (Venue Manager), create via Admin API or UI

### Creating Venue Manager Role

Via Admin UI:

1. Settings → Users & Permissions Plugin → Roles
2. Click "Add new role"
3. Name: "Venue Manager"
4. Configure permissions as documented

Via API (bootstrap script):

```typescript
const role = await strapi.query("plugin::users-permissions.role").create({
  data: {
    name: "Venue Manager",
    description: "Venue managers can manage their own venues and events",
    type: "venue-manager",
  },
})
```

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.9]
- [Strapi Users & Permissions Documentation](https://docs.strapi.io/dev-docs/plugins/users-permissions)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Created comprehensive PERMISSIONS.md documentation covering all roles (Public, Authenticated, Venue Manager, Admin)
- Added `manager` relation to Venue content-type for venue ownership
- Created bootstrap script `ensureVenueManagerRole` to auto-create Venue Manager role on startup
- Integrated bootstrap with src/index.ts
- Role is created with type: "venue-manager" for programmatic identification
- Permissions are to be configured via Strapi Admin Panel as documented
- Build verified successfully
- TypeScript types generated

### File List

- `apps/strapi/docs/PERMISSIONS.md` - Comprehensive permissions documentation
- `apps/strapi/src/bootstrap/venue-manager-role.ts` - Bootstrap script for Venue Manager role
- `apps/strapi/src/index.ts` - Updated to call ensureVenueManagerRole on bootstrap
- `apps/strapi/src/api/venue/content-types/venue/schema.json` - Added manager relation
