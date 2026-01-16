# Tiween Strapi Plugin Architecture

## Overview

Tiween uses a modular plugin-based architecture following Strapi v5 best practices. Each plugin has a **single responsibility** and is designed for maintainability, testability, and clear boundaries.

## Plugin Structure

```
apps/strapi/src/plugins/
├── creative-works/      # Content catalog (films, people, genres)
├── events-manager/      # Event scheduling and venue management
├── ticketing/           # Ticket sales and order processing
├── geography/           # Location hierarchy (regions, cities)
└── user-engagement/     # User interactions (watchlists)
```

## Design Principles

### 1. Single Responsibility

Each plugin owns ONE domain. No content type belongs to multiple plugins.

### 2. Explicit Dependencies

Plugins declare dependencies in `package.json`. Cross-plugin relations use full UIDs.

### 3. Service Layer Pattern

Business logic lives in services, not controllers. Controllers only handle HTTP.

### 4. Admin/Content-API Separation

Routes are split between admin panel and public API with distinct policies.

### 5. Lifecycle Hooks

Use `register` for setup, `bootstrap` for runtime initialization, `destroy` for cleanup.

---

## Plugin Specifications

### 1. creative-works

**Purpose:** Manage the content catalog - films, plays, concerts, and the people involved.

**Content Types:**
| Name | UID | Description |
|------|-----|-------------|
| Creative Work | `plugin::creative-works.creative-work` | Films, plays, concerts, exhibitions |
| Person | `plugin::creative-works.person` | Directors, actors, crew members |
| Genre | `plugin::creative-works.genre` | Content genres/categories |
| Category | `plugin::creative-works.category` | Content categories |

**Services:**

- `creative-work` - CRUD + search, filtering, recommendations
- `person` - Person management, filmography aggregation
- `tmdb` - TMDB API integration for movie metadata import

**Admin Features:**

- TMDB movie search and import
- Person filmography view
- Bulk genre/category management

**Dependencies:** None (base plugin)

---

### 2. events-manager

**Purpose:** Schedule events, manage venues, and handle showtimes.

**Content Types:**
| Name | UID | Description |
|------|-----|-------------|
| Event | `plugin::events-manager.event` | Events linking works to venues |
| Event Group | `plugin::events-manager.event-group` | Festivals, seasons, series |
| Venue | `plugin::events-manager.venue` | Physical locations |
| Showtime | `plugin::events-manager.showtime` | Individual screening times |

**Services:**

- `event` - Event CRUD, status management, recurrence
- `event-group` - Festival/season management
- `venue` - Venue CRUD, capacity management
- `showtime` - Showtime CRUD, bulk creation, availability
- `calendar` - Calendar view data aggregation

**Admin Features:**

- Calendar view for scheduling
- Bulk showtime creation with recurrence rules
- Venue capacity and availability management
- Event group (festival) management

**Dependencies:**

- `creative-works` (events reference creative works)
- `geography` (venues reference cities)

---

### 3. ticketing

**Purpose:** Handle ticket sales, orders, and validation.

**Content Types:**
| Name | UID | Description |
|------|-----|-------------|
| Ticket Order | `plugin::ticketing.ticket-order` | Purchase orders |
| Ticket | `plugin::ticketing.ticket` | Individual tickets with QR |

**Services:**

- `order` - Order creation, payment status, refunds
- `ticket` - Ticket generation, QR codes, validation
- `payment` - Payment gateway integration (abstract)
- `pricing` - Dynamic pricing, discounts

**Admin Features:**

- Order management dashboard
- Ticket validation interface
- Sales analytics
- Refund processing

**Policies:**

- `is-ticket-owner` - User can only access own tickets
- `can-validate-tickets` - Venue staff ticket scanning

**Dependencies:**

- `events-manager` (orders reference events/showtimes)

---

### 4. geography

**Purpose:** Manage location hierarchy for venues and users.

**Content Types:**
| Name | UID | Description |
|------|-----|-------------|
| Region | `plugin::geography.region` | Governorates/regions |
| City | `plugin::geography.city` | Cities within regions |

**Services:**

- `region` - Region CRUD
- `city` - City CRUD, geocoding
- `location` - Location search, nearby venues

**Admin Features:**

- Hierarchical location management
- Map visualization

**Dependencies:** None (base plugin)

---

### 5. user-engagement

**Purpose:** Track user interactions and preferences.

**Content Types:**
| Name | UID | Description |
|------|-----|-------------|
| User Watchlist | `plugin::user-engagement.user-watchlist` | Saved items |

**Services:**

- `watchlist` - Add/remove items, notifications
- `notification` - User notification preferences
- `analytics` - Engagement metrics

**Admin Features:**

- User engagement dashboard
- Notification management

**Policies:**

- `is-owner` - Users can only access their own data

**Dependencies:**

- `creative-works` (watchlist references creative works)

---

## Standard Plugin Structure

Each plugin follows this structure:

```
plugin-name/
├── package.json                 # Plugin metadata & dependencies
├── strapi-admin.tsx            # Admin panel entry (re-exports)
├── strapi-server.ts            # Server entry (re-exports)
├── admin/
│   └── src/
│       ├── index.tsx           # Admin registration
│       ├── pluginId.ts         # Plugin ID constant
│       ├── pages/
│       │   ├── App.tsx         # Main router
│       │   └── HomePage.tsx    # Dashboard/home
│       ├── components/         # Reusable UI components
│       └── translations/
│           ├── en.json
│           ├── fr.json
│           └── ar.json
└── server/
    └── src/
        ├── index.ts            # Server exports
        ├── register.ts         # Plugin registration
        ├── bootstrap.ts        # Runtime initialization
        ├── destroy.ts          # Cleanup
        ├── config/
        │   └── index.ts        # Plugin configuration
        ├── content-types/
        │   ├── index.ts        # Content type exports
        │   └── [type-name]/
        │       ├── index.ts
        │       └── schema.json
        ├── controllers/
        │   ├── index.ts
        │   └── [name].ts
        ├── services/
        │   ├── index.ts
        │   └── [name].ts
        ├── routes/
        │   ├── index.ts
        │   ├── admin.ts        # Admin-only routes
        │   └── content-api.ts  # Public API routes
        ├── policies/
        │   ├── index.ts
        │   └── [name].ts
        └── middlewares/
            ├── index.ts
            └── [name].ts
```

---

## Cross-Plugin Relations

When a content type references another plugin's content type:

```json
{
  "creativeWork": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "plugin::creative-works.creative-work"
  }
}
```

**Rules:**

1. Always use full UID: `plugin::[plugin-name].[content-type]`
2. Dependent plugin must list dependency in `package.json`
3. Use `manyToOne` for references to avoid circular dependencies
4. Never create bidirectional relations across plugins

---

## Service Pattern

Services encapsulate business logic and are the primary way to interact with content types:

```typescript
// server/src/services/creative-work.ts
import type { Core } from "@strapi/strapi"

const creativeWorkService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async findFeatured(limit = 10) {
    return strapi.documents("plugin::creative-works.creative-work").findMany({
      filters: { featured: true },
      limit,
      populate: ["poster", "genres"],
    })
  },

  async importFromTMDB(tmdbId: number) {
    // Business logic for TMDB import
  },
})

export default creativeWorkService
```

**Access from other plugins:**

```typescript
strapi.plugin("creative-works").service("creative-work").findFeatured()
```

---

## Controller Pattern

Controllers handle HTTP requests and delegate to services:

```typescript
// server/src/controllers/creative-work.ts
import type { Core } from "@strapi/strapi"

const creativeWorkController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async findFeatured(ctx) {
    const limit = ctx.query.limit || 10
    const data = await strapi
      .plugin("creative-works")
      .service("creative-work")
      .findFeatured(limit)

    ctx.body = { data }
  },
})

export default creativeWorkController
```

---

## Route Configuration

Split routes between admin and content-api:

```typescript
// server/src/routes/index.ts
import admin from "./admin"
import contentApi from "./content-api"

export default {
  admin,
  "content-api": contentApi,
}
```

```typescript
// server/src/routes/content-api.ts
export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/featured",
      handler: "creative-work.findFeatured",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}
```

```typescript
// server/src/routes/admin.ts
export default {
  type: "admin",
  routes: [
    {
      method: "POST",
      path: "/import-tmdb",
      handler: "creative-work.importFromTMDB",
      config: {
        policies: ["admin::isAuthenticatedAdmin"],
      },
    },
  ],
}
```

---

## Policy Pattern

Policies guard routes with authorization logic:

```typescript
// server/src/policies/is-owner.ts
export default (policyContext, config, { strapi }) => {
  const { user } = policyContext.state
  const { id } = policyContext.params

  if (!user) return false

  // Check ownership logic
  return true
}
```

---

## Lifecycle Hooks

### register

Called before Strapi boots. Use for:

- Extending core functionality
- Registering custom field types

```typescript
// server/src/register.ts
import type { Core } from "@strapi/strapi"

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // Register custom field types, extend core
}
```

### bootstrap

Called after all plugins are registered. Use for:

- Subscribing to lifecycle events
- Seeding initial data
- Setting up external connections

```typescript
// server/src/bootstrap.ts
import type { Core } from "@strapi/strapi"

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Subscribe to content type lifecycle events
  strapi.db.lifecycles.subscribe({
    models: ["plugin::ticketing.ticket"],
    async afterCreate(event) {
      // Generate QR code after ticket creation
    },
  })
}
```

### destroy

Called on shutdown. Use for:

- Cleaning up connections
- Saving state

```typescript
// server/src/destroy.ts
import type { Core } from "@strapi/strapi"

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Cleanup resources
}
```

---

## Dependency Graph

```
                    ┌─────────────────┐
                    │    geography    │
                    │ (region, city)  │
                    └────────┬────────┘
                             │
┌─────────────────┐          │         ┌─────────────────┐
│ creative-works  │          │         │ user-engagement │
│ (creative-work, │          │         │  (watchlist)    │
│  person, genre) │          │         └────────┬────────┘
└────────┬────────┘          │                  │
         │                   │                  │
         │      depends on   │     depends on   │
         └───────────┬───────┴──────────────────┘
                     │
              ┌──────▼──────┐
              │   events-   │
              │   manager   │
              │(event,venue,│
              │ showtime)   │
              └──────┬──────┘
                     │
              depends on
                     │
              ┌──────▼──────┐
              │  ticketing  │
              │(order,ticket)│
              └─────────────┘
```

---

## Plugin package.json

Each plugin must have a `package.json`:

```json
{
  "name": "creative-works",
  "version": "1.0.0",
  "description": "Content catalog management for Tiween",
  "license": "MIT",
  "strapi": {
    "displayName": "Creative Works",
    "name": "creative-works",
    "description": "Manage films, plays, people, and genres",
    "kind": "plugin",
    "required": false
  },
  "peerDependencies": {
    "@strapi/strapi": "^5.0.0"
  },
  "dependencies": {}
}
```

For plugins with dependencies:

```json
{
  "name": "events-manager",
  "strapi": {
    "displayName": "Events Manager",
    "name": "events-manager",
    "description": "Event scheduling and venue management",
    "kind": "plugin"
  },
  "dependencies": {
    "creative-works": "1.0.0",
    "geography": "1.0.0"
  }
}
```

---

## Best Practices Checklist

### Content Types

- [ ] Use singular names for content types (`creative-work` not `creative-works`)
- [ ] Include `description` in schema info
- [ ] Use appropriate `draftAndPublish` setting
- [ ] Configure i18n per field, not globally
- [ ] Use components for repeated field groups

### Services

- [ ] One service per content type + domain-specific services
- [ ] Return raw data, let controllers handle response formatting
- [ ] Use strapi.documents() for queries (v5 Document Service)
- [ ] Handle errors with proper error types

### Controllers

- [ ] Thin controllers - delegate to services
- [ ] Validate input with policies or middleware
- [ ] Use consistent response format

### Routes

- [ ] Separate admin and content-api routes
- [ ] Apply appropriate policies
- [ ] Use RESTful naming conventions

### Admin Panel

- [ ] Register menu links in `register()`
- [ ] Use Strapi Design System components
- [ ] Support i18n with translations
- [ ] Lazy load pages for performance
