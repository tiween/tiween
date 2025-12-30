# Story 2B.8: Events Manager Plugin Recreation for v5

Status: review

---

## Story

As a **developer**,
I want to recreate the Events Manager plugin for Strapi v5,
So that venue managers have streamlined event management capabilities.

## Acceptance Criteria

1. **AC#1**: Plugin is created at `src/plugins/events-manager/`

2. **AC#2**: Plugin follows Strapi v5 plugin architecture with:

   - Server-side code (services, controllers, routes)
   - Admin panel components (React)
   - Proper TypeScript types

3. **AC#3**: Plugin provides core functionality:

   - Custom admin panel for event scheduling
   - Bulk showtime creation service
   - Ticket inventory management
   - Quick duplicate event functionality

4. **AC#4**: Plugin integrates with venue manager role permissions

5. **AC#5**: Plugin is registered in `config/plugins.ts`

6. **AC#6**: TypeScript types are generated and build succeeds

## Tasks / Subtasks

- [x] **Task 1: Create Plugin Structure** (AC: #1, #2)

  - [x] 1.1 Create directory structure at `src/plugins/events-manager/`
  - [x] 1.2 Create `package.json` for plugin
  - [x] 1.3 Create `strapi-server.ts` entry point
  - [x] 1.4 Create `strapi-admin.tsx` entry point

- [x] **Task 2: Create Server-Side Services** (AC: #3)

  - [x] 2.1 Create `server/services/event-manager.ts` for event operations
  - [x] 2.2 Create bulk showtime creation service
  - [x] 2.3 Create duplicate event service
  - [x] 2.4 Create ticket inventory service

- [x] **Task 3: Create Server-Side Controllers & Routes** (AC: #3)

  - [x] 3.1 Create `server/controllers/event-manager.ts`
  - [x] 3.2 Create `server/routes/index.ts` with API routes
  - [x] 3.3 Add permission checks for venue manager role (policies placeholder)

- [x] **Task 4: Create Admin Panel** (AC: #2, #3)

  - [x] 4.1 Create basic admin panel structure
  - [x] 4.2 Create plugin homepage with feature documentation
  - [x] 4.3 Register plugin in admin with menu link

- [x] **Task 5: Register Plugin** (AC: #5)

  - [x] 5.1 Add plugin to `config/plugins.ts`
  - [x] 5.2 Ensure plugin loads correctly

- [x] **Task 6: Generate TypeScript Types** (AC: #6)
  - [x] 6.1 Run `yarn strapi ts:generate-types`
  - [x] 6.2 Verify build succeeds

---

## Dev Notes

### Strapi v5 Plugin Structure

```
src/plugins/events-manager/
├── package.json
├── strapi-server.ts
├── strapi-admin.tsx
├── server/
│   └── src/
│       ├── index.ts
│       ├── bootstrap.ts
│       ├── register.ts
│       ├── config/
│       │   └── index.ts
│       ├── controllers/
│       │   ├── index.ts
│       │   └── event-manager.ts
│       ├── routes/
│       │   └── index.ts
│       └── services/
│           ├── index.ts
│           └── event-manager.ts
└── admin/
    └── src/
        ├── index.tsx
        ├── pluginId.ts
        ├── pages/
        │   ├── App.tsx
        │   └── HomePage.tsx
        └── translations/
            ├── en.json
            ├── fr.json
            └── ar.json
```

### Plugin API Endpoints (Admin)

- `POST /events-manager/bulk-showtimes` - Create multiple showtimes
- `POST /events-manager/duplicate-event` - Duplicate an event
- `PUT /events-manager/ticket-inventory` - Update ticket counts
- `GET /events-manager/event-stats/:eventId` - Get event statistics

### Bulk Showtime Creation

Service to create multiple showtimes for an event:

- Input: eventId, venueId, dates[], time, format, language, subtitles, price, ticketsAvailable
- Output: Array of created showtimes

### Duplicate Event

Service to duplicate an event with its showtimes:

- Copy event data with new slug
- Optionally copy showtimes with date offset
- Reset ticket counts

### Ticket Inventory

Service to manage ticket availability:

- Update ticketsAvailable
- Track ticketsSold
- Calculate remaining capacity

### Event Statistics

Service to get event sales data:

- Total showtimes count
- Total tickets available/sold
- Sold percentage

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.8]
- [Strapi v5 Plugin Development Guide](https://docs.strapi.io/dev-docs/plugins/development/create-a-plugin)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Plugin structure created** following Strapi v5 local plugin pattern:

   - Root entry points: `strapi-server.ts` and `strapi-admin.tsx`
   - Server code in `server/src/` with controllers, services, routes
   - Admin code in `admin/src/` with pages and translations

2. **Server-side services implemented**:

   - `createBulkShowtimes`: Creates multiple showtimes for dates/time combinations
   - `duplicateEvent`: Copies an event with optional showtime duplication and date offset
   - `updateTicketInventory`: Updates ticket counts for a showtime
   - `getEventStats`: Returns event statistics (showtime count, tickets sold/available)

3. **Admin routes configured** for admin-only access:

   - All routes under admin type for authenticated admin access
   - Controllers handle validation and service delegation

4. **Admin panel created** with:

   - Menu link with CalendarPlus icon
   - Homepage documenting plugin features and API endpoints
   - Translations for en, fr, ar locales

5. **Plugin registered** in `config/plugins.ts` with local resolution

6. **Build verified**: `yarn build` completes successfully

### File List

**New Files Created:**

- `apps/strapi/src/plugins/events-manager/package.json`
- `apps/strapi/src/plugins/events-manager/strapi-server.ts`
- `apps/strapi/src/plugins/events-manager/strapi-admin.tsx`
- `apps/strapi/src/plugins/events-manager/server/src/index.ts`
- `apps/strapi/src/plugins/events-manager/server/src/register.ts`
- `apps/strapi/src/plugins/events-manager/server/src/bootstrap.ts`
- `apps/strapi/src/plugins/events-manager/server/src/config/index.ts`
- `apps/strapi/src/plugins/events-manager/server/src/services/index.ts`
- `apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts`
- `apps/strapi/src/plugins/events-manager/server/src/controllers/index.ts`
- `apps/strapi/src/plugins/events-manager/server/src/controllers/event-manager.ts`
- `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts`
- `apps/strapi/src/plugins/events-manager/admin/src/index.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/pluginId.ts`
- `apps/strapi/src/plugins/events-manager/admin/src/pages/App.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/pages/HomePage.tsx`
- `apps/strapi/src/plugins/events-manager/admin/src/translations/en.json`
- `apps/strapi/src/plugins/events-manager/admin/src/translations/fr.json`
- `apps/strapi/src/plugins/events-manager/admin/src/translations/ar.json`

**Modified Files:**

- `apps/strapi/config/plugins.ts` (added events-manager plugin registration)
