# Story 2B.14: Data Migration Scripts from Legacy Strapi v4

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create data migration scripts from the legacy Strapi v4 system,
So that existing content (films, venues, events, users, orders) is preserved in the new Strapi v5 platform.

## Acceptance Criteria

1. **AC#1**: Migration scripts are created at `scripts/migrations/`
2. **AC#2**: Scripts handle all content-type migrations:
   - CreativeWork (from legacy `Movie`, `Play`, `Short` tables)
   - Venues (from legacy `Medium` table)
   - Events and showtimes
   - User accounts (with password hashes preserved)
   - Historical ticket orders and tickets
   - Regions, cities, categories, genres, persons
3. **AC#3**: Scripts are idempotent (can run multiple times safely)
4. **AC#4**: Scripts generate migration report with:
   - Records migrated per type
   - Skipped records with reasons
   - Errors encountered
5. **AC#5**: Rollback scripts exist for each migration
6. **AC#6**: Data integrity validation runs post-migration
7. **AC#7**: Environment variables configure legacy database connection
8. **AC#8**: Migration can be run in dry-run mode for testing

## Tasks / Subtasks

- [ ] **Task 1: Setup Migration Infrastructure** (AC: #1, #7)

  - [ ] 1.1 Create `scripts/migrations/` directory structure
  - [ ] 1.2 Create migration runner with config loading
  - [ ] 1.3 Add environment variables for legacy DB connection
  - [ ] 1.4 Create database connection helpers for both v4 and v5
  - [ ] 1.5 Create migration logging utility

- [ ] **Task 2: Create Reference Data Migrations** (AC: #2, #3)

  - [ ] 2.1 Create Region migration script
  - [ ] 2.2 Create City migration script (with region relations)
  - [ ] 2.3 Create Category migration script
  - [ ] 2.4 Create Genre migration script
  - [ ] 2.5 Add idempotency checks (skip if already exists)

- [ ] **Task 3: Create Person Migration** (AC: #2, #3)

  - [ ] 3.1 Migrate directors from legacy data
  - [ ] 3.2 Migrate actors from legacy data
  - [ ] 3.3 Handle duplicate name detection
  - [ ] 3.4 Preserve legacy ID mapping for relations

- [ ] **Task 4: Create CreativeWork Migration** (AC: #2, #3)

  - [ ] 4.1 Migrate Movies to CreativeWork (type: film)
  - [ ] 4.2 Migrate Plays to CreativeWork (type: play)
  - [ ] 4.3 Migrate Short Films to CreativeWork (type: short-film)
  - [ ] 4.4 Preserve and migrate media (posters, backdrops)
  - [ ] 4.5 Map genre and person relations

- [ ] **Task 5: Create Venue Migration** (AC: #2, #3)

  - [ ] 5.1 Migrate from legacy `Medium` table to Venue
  - [ ] 5.2 Map venue types (cinema, theater, etc.)
  - [ ] 5.3 Migrate venue images and logos
  - [ ] 5.4 Preserve city/region relations

- [ ] **Task 6: Create Event Migration** (AC: #2, #3)

  - [ ] 6.1 Migrate events with date ranges
  - [ ] 6.2 Migrate showtimes as embedded components
  - [ ] 6.3 Link to migrated CreativeWork and Venue
  - [ ] 6.4 Handle status mapping

- [ ] **Task 7: Create User Migration** (AC: #2, #3)

  - [ ] 7.1 Migrate user accounts
  - [ ] 7.2 Preserve password hashes (bcrypt compatible)
  - [ ] 7.3 Map user roles (authenticated, venue-manager, admin)
  - [ ] 7.4 Migrate user preferences
  - [ ] 7.5 Handle duplicate email detection

- [ ] **Task 8: Create Ticketing Migration** (AC: #2, #3)

  - [ ] 8.1 Migrate TicketOrders with payment data
  - [ ] 8.2 Migrate Tickets with QR codes
  - [ ] 8.3 Link to migrated users and events
  - [ ] 8.4 Preserve order/ticket status

- [ ] **Task 9: Create UserWatchlist Migration** (AC: #2, #3)

  - [ ] 9.1 Migrate user watchlists
  - [ ] 9.2 Link to migrated users and creative works

- [ ] **Task 10: Create Reporting System** (AC: #4)

  - [ ] 10.1 Create migration report generator
  - [ ] 10.2 Track records migrated per type
  - [ ] 10.3 Log skipped records with reasons
  - [ ] 10.4 Save report to file after migration

- [ ] **Task 11: Create Rollback Scripts** (AC: #5)

  - [ ] 11.1 Create rollback for each migration
  - [ ] 11.2 Store rollback data during migration
  - [ ] 11.3 Test rollback functionality

- [ ] **Task 12: Create Validation Scripts** (AC: #6)

  - [ ] 12.1 Validate record counts match
  - [ ] 12.2 Validate relations integrity
  - [ ] 12.3 Validate required fields populated
  - [ ] 12.4 Generate validation report

- [ ] **Task 13: Add Dry-Run Mode** (AC: #8)

  - [ ] 13.1 Implement dry-run flag
  - [ ] 13.2 Log what would be migrated without writing
  - [ ] 13.3 Report potential issues

- [ ] **Task 14: Create Migration Commands** (AC: #1)
  - [ ] 14.1 Add `yarn migrate:legacy` command
  - [ ] 14.2 Add `yarn migrate:rollback` command
  - [ ] 14.3 Add `yarn migrate:validate` command
  - [ ] 14.4 Document commands in README

---

## Dev Notes

### Architecture Decision Reference

From `core-architectural-decisions.md`:

```
Primary Database: PostgreSQL 16.x - Continuity with legacy, Strapi default
```

The legacy system also uses PostgreSQL, making migration straightforward.

### Legacy Database Schema (v4)

Based on typical Strapi v4 schema for Tiween:

| Legacy Table | v5 Content-Type | Notes                    |
| ------------ | --------------- | ------------------------ |
| `movies`     | CreativeWork    | type: film               |
| `plays`      | CreativeWork    | type: play               |
| `shorts`     | CreativeWork    | type: short-film         |
| `mediums`    | Venue           | Legacy name for venues   |
| `events`     | Event           | With showtimes component |
| `showtimes`  | Showtime        | Embedded in Event        |
| `users`      | users           | Strapi users             |
| `orders`     | TicketOrder     | Purchase records         |
| `tickets`    | Ticket          | Individual tickets       |
| `watchlists` | UserWatchlist   | User saved items         |
| `regions`    | Region          | Geographic regions       |
| `cities`     | City            | Cities                   |
| `categories` | Category        | Event categories         |
| `genres`     | Genre           | Content genres           |
| `people`     | Person          | Directors, actors        |

### Environment Variables

```bash
# .env.example additions

# ------- Legacy Database Migration -------

# Legacy Strapi v4 database connection
LEGACY_DB_HOST=localhost
LEGACY_DB_PORT=5432
LEGACY_DB_NAME=tiween_legacy
LEGACY_DB_USER=postgres
LEGACY_DB_PASSWORD=your-legacy-password
LEGACY_DB_SSL=false

# Migration options
MIGRATION_DRY_RUN=false
MIGRATION_BATCH_SIZE=100
```

### Directory Structure

```
scripts/migrations/
├── index.ts                    # Main migration runner
├── config.ts                   # Configuration and DB connections
├── utils/
│   ├── logger.ts               # Migration logging
│   ├── reporter.ts             # Report generation
│   ├── id-mapper.ts            # Legacy ID to new ID mapping
│   └── validators.ts           # Data validation helpers
├── migrations/
│   ├── 01-regions.ts
│   ├── 02-cities.ts
│   ├── 03-categories.ts
│   ├── 04-genres.ts
│   ├── 05-persons.ts
│   ├── 06-creative-works.ts
│   ├── 07-venues.ts
│   ├── 08-events.ts
│   ├── 09-users.ts
│   ├── 10-ticket-orders.ts
│   ├── 11-tickets.ts
│   └── 12-watchlists.ts
├── rollbacks/
│   ├── 01-regions.rollback.ts
│   ├── 02-cities.rollback.ts
│   └── ... (one per migration)
└── validation/
    ├── count-validation.ts
    ├── relation-validation.ts
    └── data-validation.ts
```

### Migration Script Template

```typescript
// scripts/migrations/migrations/01-regions.ts
import { LegacyDB, StrapiDB } from "../config"
import { IdMapper } from "../utils/id-mapper"
import { Logger } from "../utils/logger"

interface LegacyRegion {
  id: number
  name: string
  code: string
  name_ar?: string
  created_at: Date
}

interface MigrationResult {
  migrated: number
  skipped: number
  errors: Array<{ id: number; error: string }>
}

export async function migrateRegions(options: {
  dryRun: boolean
}): Promise<MigrationResult> {
  const logger = new Logger("regions")
  const idMapper = IdMapper.getInstance()

  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    errors: [],
  }

  logger.info("Starting regions migration...")

  // Fetch legacy data
  const legacyRegions = await LegacyDB.query<LegacyRegion>(
    "SELECT * FROM regions ORDER BY id"
  )
  logger.info(`Found ${legacyRegions.length} regions in legacy database`)

  for (const legacy of legacyRegions) {
    try {
      // Check if already migrated (idempotency)
      const existing = await StrapiDB.findOne("region", { code: legacy.code })

      if (existing) {
        logger.debug(`Region ${legacy.code} already exists, skipping`)
        idMapper.set("region", legacy.id, existing.id)
        result.skipped++
        continue
      }

      if (options.dryRun) {
        logger.info(`[DRY-RUN] Would create region: ${legacy.name}`)
        result.migrated++
        continue
      }

      // Create in new database
      const newRegion = await StrapiDB.create("region", {
        name: legacy.name,
        code: legacy.code,
        locale: "fr",
        localizations: legacy.name_ar
          ? [{ name: legacy.name_ar, locale: "ar" }]
          : [],
      })

      idMapper.set("region", legacy.id, newRegion.id)
      result.migrated++
      logger.debug(
        `Migrated region: ${legacy.name} (${legacy.id} -> ${newRegion.id})`
      )
    } catch (error) {
      result.errors.push({ id: legacy.id, error: error.message })
      logger.error(`Failed to migrate region ${legacy.id}: ${error.message}`)
    }
  }

  logger.info(
    `Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors.length} errors`
  )
  return result
}

export async function rollbackRegions(): Promise<void> {
  const logger = new Logger("regions-rollback")
  const idMapper = IdMapper.getInstance()

  const mappedIds = idMapper.getAll("region")

  for (const [legacyId, newId] of mappedIds) {
    await StrapiDB.delete("region", newId)
    logger.debug(`Rolled back region: ${newId}`)
  }

  idMapper.clear("region")
  logger.info(`Rollback complete: ${mappedIds.size} regions removed`)
}
```

### ID Mapping Strategy

Store legacy ID to new ID mappings for relation resolution:

```typescript
// scripts/migrations/utils/id-mapper.ts
class IdMapper {
  private static instance: IdMapper
  private maps: Map<string, Map<number, number>> = new Map()
  private persistPath = "scripts/migrations/.id-mappings.json"

  static getInstance(): IdMapper {
    if (!IdMapper.instance) {
      IdMapper.instance = new IdMapper()
      IdMapper.instance.load()
    }
    return IdMapper.instance
  }

  set(type: string, legacyId: number, newId: number): void {
    if (!this.maps.has(type)) {
      this.maps.set(type, new Map())
    }
    this.maps.get(type)!.set(legacyId, newId)
    this.persist()
  }

  get(type: string, legacyId: number): number | undefined {
    return this.maps.get(type)?.get(legacyId)
  }

  // ... persist/load methods
}
```

### CreativeWork Migration Example

```typescript
// scripts/migrations/migrations/06-creative-works.ts
async function migrateCreativeWorks(options: { dryRun: boolean }) {
  const idMapper = IdMapper.getInstance()

  // Migrate Movies
  const movies = await LegacyDB.query("SELECT * FROM movies ORDER BY id")
  for (const movie of movies) {
    await migrateCreativeWork(movie, "film", idMapper, options)
  }

  // Migrate Plays
  const plays = await LegacyDB.query("SELECT * FROM plays ORDER BY id")
  for (const play of plays) {
    await migrateCreativeWork(play, "play", idMapper, options)
  }

  // Migrate Shorts
  const shorts = await LegacyDB.query("SELECT * FROM shorts ORDER BY id")
  for (const short of shorts) {
    await migrateCreativeWork(short, "short-film", idMapper, options)
  }
}

async function migrateCreativeWork(
  legacy: any,
  type: string,
  idMapper: IdMapper,
  options: { dryRun: boolean }
) {
  // Map genre relations using idMapper
  const genreIds = []
  for (const legacyGenreId of legacy.genre_ids || []) {
    const newGenreId = idMapper.get("genre", legacyGenreId)
    if (newGenreId) genreIds.push(newGenreId)
  }

  // Map person relations
  const directorIds = []
  for (const legacyDirectorId of legacy.director_ids || []) {
    const newPersonId = idMapper.get("person", legacyDirectorId)
    if (newPersonId) directorIds.push(newPersonId)
  }

  const data = {
    title: legacy.title,
    originalTitle: legacy.original_title,
    slug: legacy.slug,
    type,
    synopsis: legacy.synopsis,
    duration: legacy.duration,
    releaseYear: legacy.release_year,
    rating: legacy.rating,
    ageRating: mapAgeRating(legacy.age_rating),
    trailer: legacy.trailer_url,
    genres: genreIds,
    directors: directorIds,
    cast: [], // Map similarly
    locale: "fr",
  }

  if (!options.dryRun) {
    const created = await StrapiDB.create("creative-work", data)
    idMapper.set("creative-work", legacy.id, created.id)

    // Migrate media separately
    await migrateMedia(legacy, created.id, "creative-work")
  }
}
```

### User Migration with Password Preservation

```typescript
// scripts/migrations/migrations/09-users.ts
async function migrateUsers(options: { dryRun: boolean }) {
  const users = await LegacyDB.query(`
    SELECT u.*, up.role_id
    FROM up_users u
    LEFT JOIN up_users_role_links up ON u.id = up.user_id
    ORDER BY u.id
  `)

  for (const user of users) {
    // Password hashes from Strapi v4 bcrypt are compatible with v5
    const data = {
      username: user.username,
      email: user.email,
      password: user.password, // Preserve bcrypt hash directly
      confirmed: user.confirmed,
      blocked: user.blocked,
      provider: user.provider,
      // Extended fields
      preferredLanguage: user.preferred_language || "fr",
      // Role mapping
      role: mapUserRole(user.role_id),
    }

    if (!options.dryRun) {
      const created = await StrapiDB.create("user", data)
      idMapper.set("user", user.id, created.id)
    }
  }
}
```

### Migration Report Format

```typescript
// Report output: scripts/migrations/reports/migration-2025-01-15.json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "duration": "5m 32s",
  "summary": {
    "total_migrated": 15234,
    "total_skipped": 45,
    "total_errors": 3
  },
  "by_type": {
    "regions": { "migrated": 24, "skipped": 0, "errors": 0 },
    "cities": { "migrated": 89, "skipped": 0, "errors": 0 },
    "creative-works": { "migrated": 2450, "skipped": 12, "errors": 2 },
    "venues": { "migrated": 156, "skipped": 0, "errors": 0 },
    "events": { "migrated": 8920, "skipped": 33, "errors": 1 },
    "users": { "migrated": 3500, "skipped": 0, "errors": 0 },
    "ticket-orders": { "migrated": 95, "skipped": 0, "errors": 0 }
  },
  "errors": [
    { "type": "creative-work", "legacy_id": 1234, "error": "Missing required field: title" },
    { "type": "creative-work", "legacy_id": 5678, "error": "Invalid genre relation: 999" },
    { "type": "event", "legacy_id": 9012, "error": "Venue not found for legacy_id: 456" }
  ],
  "skipped": [
    { "type": "creative-work", "legacy_id": 111, "reason": "Already exists with slug: my-film" },
    { "type": "event", "legacy_id": 222, "reason": "Start date in past, event completed" }
  ]
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "migrate:legacy": "tsx scripts/migrations/index.ts",
    "migrate:legacy:dry-run": "MIGRATION_DRY_RUN=true tsx scripts/migrations/index.ts",
    "migrate:rollback": "tsx scripts/migrations/rollback.ts",
    "migrate:validate": "tsx scripts/migrations/validate.ts",
    "migrate:report": "tsx scripts/migrations/report.ts"
  }
}
```

### Validation Checks

```typescript
// scripts/migrations/validation/count-validation.ts
async function validateCounts() {
  const checks = [
    { type: "region", legacyTable: "regions" },
    { type: "city", legacyTable: "cities" },
    { type: "creative-work", legacyTable: ["movies", "plays", "shorts"] },
    { type: "venue", legacyTable: "mediums" },
    { type: "event", legacyTable: "events" },
    { type: "user", legacyTable: "up_users" },
  ]

  const results = []
  for (const check of checks) {
    const legacyCount = await getLegacyCount(check.legacyTable)
    const newCount = await StrapiDB.count(check.type)

    results.push({
      type: check.type,
      legacy: legacyCount,
      new: newCount,
      match: legacyCount === newCount,
      difference: newCount - legacyCount,
    })
  }

  return results
}
```

### Previous Story Context

From **Story 2B.13 (API Documentation)**:

- All content-types are documented
- API endpoints structure for reference

From **Story 2B.1-2B.12**:

- All content-types are created and ready to receive migrated data
- User roles and permissions configured

### Files to Create

```
scripts/migrations/
├── index.ts
├── config.ts
├── rollback.ts
├── validate.ts
├── report.ts
├── utils/
│   ├── logger.ts
│   ├── reporter.ts
│   ├── id-mapper.ts
│   └── validators.ts
├── migrations/
│   ├── 01-regions.ts
│   ├── 02-cities.ts
│   ├── 03-categories.ts
│   ├── 04-genres.ts
│   ├── 05-persons.ts
│   ├── 06-creative-works.ts
│   ├── 07-venues.ts
│   ├── 08-events.ts
│   ├── 09-users.ts
│   ├── 10-ticket-orders.ts
│   ├── 11-tickets.ts
│   └── 12-watchlists.ts
└── rollbacks/
    └── (matching rollback files)

apps/strapi/.env.example  # Add legacy DB variables
package.json              # Add migration scripts
```

### References

- [Strapi v4 to v5 Migration Guide](https://docs.strapi.io/dev-docs/migration/v4-to-v5)
- [PostgreSQL Node.js Client (pg)](https://node-postgres.com/)
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.14]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
