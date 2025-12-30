# Tiween User Roles and Permissions

This document describes the user roles and their permissions for the Tiween platform.

## Role Hierarchy

```
Super Admin (Strapi Admin)
    └── Full access to Admin Panel and all content

Venue Manager (Custom Role)
    └── Authenticated permissions +
        └── Manage own venue
        └── Manage own events/showtimes
        └── View own ticket orders

Authenticated (B2C User)
    └── Public permissions +
        └── Manage own profile
        └── Manage own watchlist
        └── Create and view own orders

Public (Unauthenticated)
    └── Read published content only
```

## Public Role Permissions

Unauthenticated users can only read published content.

| Content-Type   | find | findOne | create | update | delete |
| -------------- | :--: | :-----: | :----: | :----: | :----: |
| Event          |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Venue          |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Creative Work  |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Showtime       |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Person         |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Genre          |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Category       |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| Region         |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| City           |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   |
| User Watchlist |  ❌  |   ❌    |   ❌   |   ❌   |   ❌   |
| Ticket Order   |  ❌  |   ❌    |   ❌   |   ❌   |   ❌   |
| Ticket         |  ❌  |   ❌    |   ❌   |   ❌   |   ❌   |

## Authenticated (B2C) Role Permissions

Regular authenticated users (B2C customers) can manage their own data.

**Inherits all Public permissions plus:**

| Content-Type   | find | findOne | create | update | delete | Notes            |
| -------------- | :--: | :-----: | :----: | :----: | :----: | ---------------- |
| User Watchlist |  ✅  |   ✅    |   ✅   |   ✅   |   ✅   | Own records only |
| Ticket Order   |  ✅  |   ✅    |   ✅   |   ❌   |   ❌   | Own records only |
| Ticket         |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   | Own records only |
| User Profile   |  -   |   ✅    |   -    |   ✅   |   ❌   | Own profile only |

### Ownership Filtering

For content marked "Own records only", the API automatically filters results to show only records belonging to the authenticated user.

## Venue Manager Role Permissions

Venue managers can manage their assigned venue and its events.

**Inherits all Authenticated permissions plus:**

| Content-Type | find | findOne | create | update | delete | Notes                    |
| ------------ | :--: | :-----: | :----: | :----: | :----: | ------------------------ |
| Venue        |  ✅  |   ✅    |   ❌   |   ✅   |   ❌   | Own venue only           |
| Event        |  ✅  |   ✅    |   ✅   |   ✅   |   ✅   | Own venue events only    |
| Showtime     |  ✅  |   ✅    |   ✅   |   ✅   |   ✅   | Own venue showtimes only |
| Ticket Order |  ✅  |   ✅    |   ❌   |   ❌   |   ❌   | Own venue orders only    |
| Ticket       |  ✅  |   ✅    |   ❌   |   ✅   |   ❌   | Can scan tickets         |

### Venue Assignment

- Each venue has a `manager` relation to a User
- Venue managers are assigned via the Strapi Admin Panel
- A user can manage multiple venues

### Events Manager Plugin Access

Venue managers have access to the Events Manager plugin features:

- Bulk showtime creation for their events
- Event duplication
- Ticket inventory management
- Event statistics for their events

## Admin Role Permissions

Administrators (Super Admin) have full access to all content-types and the Strapi Admin Panel.

## Setting Up Permissions

### Via Strapi Admin Panel

1. Navigate to **Settings → Users & Permissions Plugin → Roles**
2. Click on a role to edit its permissions
3. Enable/disable permissions for each content-type
4. Click **Save**

### Creating the Venue Manager Role

1. Go to **Settings → Users & Permissions Plugin → Roles**
2. Click **Add new role**
3. Enter:
   - Name: `Venue Manager`
   - Description: `Venue managers can manage their own venues and events`
4. Configure permissions as documented above
5. Click **Save**

### Assigning Users to Roles

1. Go to **Content Manager → User**
2. Edit the user
3. Change the **Role** field to the desired role
4. Click **Save**

### Assigning Venue Managers to Venues

1. Go to **Content Manager → Venue**
2. Edit the venue
3. Set the **Manager** field to the user
4. Click **Save**

## API Permissions

### Public Endpoints (No Authentication)

```
GET /api/events
GET /api/events/:id
GET /api/venues
GET /api/venues/:id
GET /api/creative-works
GET /api/creative-works/:id
GET /api/showtimes
GET /api/showtimes/:id
GET /api/persons
GET /api/persons/:id
GET /api/genres
GET /api/genres/:id
GET /api/categories
GET /api/categories/:id
GET /api/regions
GET /api/regions/:id
GET /api/cities
GET /api/cities/:id
```

### Authenticated Endpoints (Requires JWT)

```
# User Profile
GET /api/users/me
PUT /api/users/me

# Watchlist
GET /api/user-watchlists
POST /api/user-watchlists
DELETE /api/user-watchlists/:id

# Orders
GET /api/ticket-orders
POST /api/ticket-orders
GET /api/ticket-orders/:id

# Tickets
GET /api/tickets
GET /api/tickets/:id
```

### Venue Manager Endpoints (Requires JWT + Venue Manager Role)

```
# Venue Management
PUT /api/venues/:id (own venue only)

# Event Management
POST /api/events
PUT /api/events/:id (own events only)
DELETE /api/events/:id (own events only)

# Showtime Management
POST /api/showtimes
PUT /api/showtimes/:id (own showtimes only)
DELETE /api/showtimes/:id (own showtimes only)

# Events Manager Plugin
POST /events-manager/bulk-showtimes
POST /events-manager/duplicate-event
PUT /events-manager/ticket-inventory
GET /events-manager/event-stats/:eventId
```

## Security Notes

1. **JWT Tokens**: All authenticated requests require a valid JWT token in the Authorization header
2. **Ownership Validation**: Policies/middleware validate ownership before allowing modifications
3. **Published Content**: Public users can only see content with `publishedAt` set
4. **Sensitive Fields**: Password, tokens, and other sensitive fields are never exposed via API
