# Epic 2B: Strapi v5 Migration & Backend Foundation (PARALLEL TRACK B)

Fully migrated Strapi v5 backend with all content-types, plugins, and data ready for frontend integration.

## Story 2B.1: Strapi v5 Upgrade and Project Setup

As a **developer**,
I want to upgrade the Strapi instance from v4 to v5,
So that the backend uses the latest Strapi features and architecture.

**Acceptance Criteria:**

**Given** the monorepo has a Strapi v4 instance in `apps/strapi`
**When** I perform the Strapi v4 to v5 upgrade
**Then** Strapi is upgraded to v5.x following the official migration guide
**And** `package.json` dependencies are updated for v5 compatibility
**And** configuration files are migrated to v5 format (`config/` structure)
**And** `strapi develop` starts without errors
**And** `strapi build` completes without errors
**And** Strapi admin panel is accessible at `/admin`
**And** database connection to PostgreSQL is verified
**And** breaking changes are documented in a migration notes file

---

## Story 2B.2: Core Content-Types - Event and CreativeWork

As a **developer**,
I want to create the Event and CreativeWork content-types,
So that the platform can store films, plays, and other creative works.

**Acceptance Criteria:**

**Given** Strapi v5 is running
**When** I create the Event and CreativeWork content-types
**Then** CreativeWork content-type is created with fields:

- `title` (string, required, i18n)
- `originalTitle` (string, optional)
- `slug` (uid, from title)
- `type` (enum: film, play, short-film, concert, exhibition)
- `synopsis` (rich text, i18n)
- `duration` (integer, minutes)
- `releaseYear` (integer)
- `genres` (relation to Genre)
- `directors` (relation to Person, many)
- `cast` (relation to Person, many)
- `poster` (media, single)
- `backdrop` (media, single)
- `trailer` (string, URL)
- `rating` (decimal)
- `ageRating` (enum: TP, 12+, 16+, 18+)
  **And** Event content-type is created with fields:
- `creativeWork` (relation to CreativeWork)
- `venue` (relation to Venue)
- `startDate` (datetime)
- `endDate` (datetime)
- `showtimes` (component, repeatable)
- `status` (enum: scheduled, cancelled, completed)
- `featured` (boolean)
  **And** content-types are accessible via REST API
  **And** i18n is enabled for translatable fields

---

## Story 2B.3: Core Content-Types - Venue and Showtime

As a **developer**,
I want to create the Venue and Showtime content-types,
So that the platform can manage venue information and screening times.

**Acceptance Criteria:**

**Given** Event and CreativeWork content-types exist
**When** I create Venue and Showtime content-types
**Then** Venue content-type is created with fields:

- `name` (string, required, i18n)
- `slug` (uid, from name)
- `description` (rich text, i18n)
- `address` (string)
- `city` (relation to City)
- `region` (relation to Region)
- `latitude` (decimal)
- `longitude` (decimal)
- `phone` (string)
- `email` (email)
- `website` (string)
- `images` (media, multiple)
- `logo` (media, single)
- `type` (enum: cinema, theater, cultural-center, museum, other)
- `capacity` (integer)
- `manager` (relation to User)
- `status` (enum: pending, approved, suspended)
  **And** Showtime component is created with fields:
- `time` (time)
- `format` (enum: VOST, VF, VO, 3D, IMAX)
- `language` (enum: ar, fr, en, other)
- `subtitles` (enum: ar, fr, en, none)
- `price` (decimal)
- `ticketsAvailable` (integer)
- `ticketsSold` (integer)
  **And** content-types are accessible via REST API

---

## Story 2B.4: Core Content-Types - Person and Genre

As a **developer**,
I want to create the Person and Genre content-types,
So that the platform can store filmmakers, actors, and categorize content.

**Acceptance Criteria:**

**Given** CreativeWork content-type exists
**When** I create Person and Genre content-types
**Then** Person content-type is created with fields:

- `name` (string, required)
- `slug` (uid, from name)
- `bio` (text, i18n)
- `photo` (media, single)
- `birthDate` (date)
- `nationality` (string)
- `roles` (json, array of roles played)
  **And** Genre content-type is created with fields:
- `name` (string, required, i18n)
- `slug` (uid, from name)
- `icon` (string, icon name)
- `color` (string, hex color)
  **And** seed data includes common genres:
- Drame, Comédie, Action, Thriller, Horror, Documentary, Animation, Romance
  **And** content-types are accessible via REST API

---

## Story 2B.5: Ticketing Content-Types - TicketOrder and Ticket

As a **developer**,
I want to create TicketOrder and Ticket content-types,
So that the platform can manage ticket purchases.

**Acceptance Criteria:**

**Given** Event and Venue content-types exist
**When** I create TicketOrder and Ticket content-types
**Then** TicketOrder content-type is created with fields:

- `orderNumber` (string, unique, auto-generated)
- `user` (relation to User, optional for guest)
- `guestEmail` (email, for guest checkout)
- `event` (relation to Event)
- `showtime` (json, showtime details)
- `totalAmount` (decimal)
- `currency` (string, default: TND)
- `paymentStatus` (enum: pending, paid, failed, refunded)
- `paymentMethod` (string)
- `paymentReference` (string)
- `purchasedAt` (datetime)
  **And** Ticket content-type is created with fields:
- `ticketNumber` (string, unique)
- `order` (relation to TicketOrder)
- `type` (enum: standard, reduced, vip)
- `price` (decimal)
- `qrCode` (string, signed hash)
- `status` (enum: valid, scanned, cancelled, expired)
- `scannedAt` (datetime)
- `scannedBy` (relation to User)
- `seatInfo` (json, optional seat details)
  **And** content-types have appropriate permissions

---

## Story 2B.6: User Content-Types - UserWatchlist and UserPreferences

As a **developer**,
I want to extend user data with watchlist and preferences,
So that users can save events and configure their experience.

**Acceptance Criteria:**

**Given** Strapi users-permissions plugin is configured
**When** I create UserWatchlist and extend user preferences
**Then** UserWatchlist content-type is created with fields:

- `user` (relation to User, required)
- `creativeWork` (relation to CreativeWork)
- `addedAt` (datetime)
- `notifyChanges` (boolean, default: true)
  **And** User model is extended with:
- `preferredLanguage` (enum: ar, fr, en)
- `defaultRegion` (relation to Region)
- `avatar` (media, single)
- `role` (extended: authenticated, venue-manager, admin)
  **And** unique constraint on user + creativeWork combination
  **And** appropriate API permissions are set

---

## Story 2B.7: Reference Content-Types - Region, City, Category

As a **developer**,
I want to create Region, City, and Category content-types,
So that events can be organized by location and type.

**Acceptance Criteria:**

**Given** Strapi v5 is configured
**When** I create Region, City, and Category content-types
**Then** Region content-type is created with fields:

- `name` (string, required, i18n)
- `slug` (uid)
- `code` (string, e.g., "TUN", "SFX")
  **And** City content-type is created with fields:
- `name` (string, required, i18n)
- `slug` (uid)
- `region` (relation to Region)
- `latitude` (decimal)
- `longitude` (decimal)
  **And** Category content-type is created with fields:
- `name` (string, required, i18n)
- `slug` (uid)
- `icon` (string)
- `order` (integer, for sorting)
  **And** seed data includes:
- Regions: Grand Tunis, Sfax, Sousse, etc.
- Cities: Tunis, La Marsa, Sfax, etc.
- Categories: Cinéma, Théâtre, Concerts, etc.

---

## Story 2B.8: Events Manager Plugin Recreation for v5

As a **developer**,
I want to recreate the Events Manager plugin for Strapi v5,
So that venue managers have streamlined event management capabilities.

**Acceptance Criteria:**

**Given** all content-types are created
**When** I create the Events Manager plugin for v5
**Then** plugin is created at `src/plugins/events-manager/`
**And** plugin follows Strapi v5 plugin architecture
**And** plugin provides:

- Custom admin panel for event scheduling
- Bulk showtime creation
- Ticket inventory management
- Quick duplicate event functionality
  **And** plugin integrates with venue manager role permissions
  **And** plugin has proper TypeScript types
  **And** plugin is registered in `config/plugins.ts`

---

## Story 2B.9: User Roles and Permissions Configuration

As a **developer**,
I want to configure user roles with appropriate permissions,
So that B2C users, venue managers, and admins have correct access.

**Acceptance Criteria:**

**Given** users-permissions plugin is active
**When** I configure roles and permissions
**Then** three roles are configured:

- **Authenticated (B2C)**: Can read events/venues, manage own watchlist, create orders
- **Venue Manager**: Authenticated permissions + manage own venue, own events, view own sales
- **Admin**: Full access to all content-types
  **And** Public role can:
- Read published events, venues, creative works
- Read categories, regions, cities, genres
  **And** venue manager can only access their own venue data (content-type filter)
  **And** permissions are documented in README

---

## Story 2B.10: Redis Integration for Sessions and Caching

As a **developer**,
I want to integrate Redis for session management and caching,
So that the application has fast session handling and cache invalidation.

**Acceptance Criteria:**

**Given** Redis is available in Docker compose
**When** I configure Redis integration
**Then** Redis connection is configured in `config/database.ts` or `config/redis.ts`
**And** session store uses Redis
**And** cache middleware is configured for API responses
**And** cache invalidation hooks are set for content updates
**And** Redis health check is available at `/health/redis`
**And** environment variables document Redis configuration
**And** connection pooling is configured appropriately

---

## Story 2B.11: ImageKit Provider Configuration

As a **developer**,
I want to configure ImageKit as the media provider,
So that images are served via CDN with optimization.

**Acceptance Criteria:**

**Given** Strapi v5 is running
**When** I configure the ImageKit provider
**Then** `@strapi/provider-upload-imagekit` (or equivalent v5 provider) is installed
**And** ImageKit credentials are configured via environment variables
**And** uploaded images are stored in ImageKit
**And** image URLs use ImageKit CDN
**And** responsive image transformations are available
**And** existing legacy images migration path is documented
**And** fallback to local storage works in development

---

## Story 2B.12: Email Configuration with Resend

As a **developer**,
I want to configure Resend as the email provider,
So that transactional emails are delivered reliably.

**Acceptance Criteria:**

**Given** Strapi v5 is running
**When** I configure the Resend email provider
**Then** Resend provider plugin is installed and configured
**And** API key is configured via environment variable
**And** email templates are created for:

- Order confirmation
- Ticket delivery
- Password reset
- Venue approval/rejection
  **And** test email can be sent from admin panel
  **And** email sending is logged for debugging
  **And** fallback/development mode uses console output

---

## Story 2B.13: API Documentation with OpenAPI

As a **developer**,
I want to generate OpenAPI documentation for the API,
So that frontend developers have clear API reference.

**Acceptance Criteria:**

**Given** all content-types and endpoints are defined
**When** I configure OpenAPI documentation
**Then** `@strapi/plugin-documentation` is installed and configured
**And** OpenAPI spec is generated at `/documentation`
**And** Swagger UI is accessible for API exploration
**And** all endpoints are documented with:

- Request/response schemas
- Authentication requirements
- Example payloads
  **And** documentation updates automatically with schema changes

---

## Story 2B.14: Data Migration Scripts from Legacy Strapi v4

As a **developer**,
I want to create data migration scripts from the legacy system,
So that existing content is preserved in the new platform.

**Acceptance Criteria:**

**Given** legacy Strapi v4 database is accessible
**When** I create migration scripts
**Then** migration scripts are created at `scripts/migrations/`
**And** scripts handle:

- CreativeWork (films, plays) from legacy `Movie` / `Play` tables
- Venues from legacy `Medium` table
- Events and showtimes
- User accounts (password hashes preserved)
- Historical ticket orders
  **And** scripts are idempotent (can run multiple times safely)
  **And** scripts generate migration report with:
- Records migrated per type
- Skipped records with reasons
- Errors encountered
  **And** rollback scripts exist for each migration
  **And** data integrity validation runs post-migration

---

## Story 2B.15: Database Seeding for Development

As a **developer**,
I want to create database seeds for development and testing,
So that developers have realistic data to work with.

**Acceptance Criteria:**

**Given** all content-types are created
**When** I create database seeds
**Then** seed scripts are created at `scripts/seeds/`
**And** seeds create:

- 5 sample venues (different types and cities)
- 20 sample creative works (mix of films, plays, shorts)
- 50 sample events with showtimes
- 3 test users (regular, venue-manager, admin)
- Sample orders and tickets
  **And** seeds include realistic Tunisian data (French/Arabic titles, local venues)
  **And** seed command is added: `yarn seed`
  **And** seeds are idempotent
  **And** test fixtures use subset of seed data

---
