# Story 2B.3: Core Content-Types - Venue and Showtime

Status: review

---

## Story

As a **developer**,
I want to create the Venue and Showtime content-types,
So that the platform can manage venue information and screening times.

## Acceptance Criteria

1. **AC#1**: Venue content-type is created with all required fields:

   - `name` (string, required, i18n)
   - `slug` (uid, from name)
   - `description` (rich text, i18n)
   - `address` (string)
   - `city` (string - placeholder until Story 2B.7 creates City content-type)
   - `region` (string - placeholder until Story 2B.7 creates Region content-type)
   - `latitude` (decimal)
   - `longitude` (decimal)
   - `phone` (string)
   - `email` (email)
   - `website` (string)
   - `images` (media, multiple)
   - `logo` (media, single)
   - `type` (enum: cinema, theater, cultural-center, museum, other)
   - `capacity` (integer)
   - `status` (enum: pending, approved, suspended)
   - `links` (component, social-link)

2. **AC#2**: Showtime content-type is created with all required fields:

   - `event` (relation to Event)
   - `venue` (relation to Venue)
   - `datetime` (datetime, required)
   - `format` (enum: VOST, VF, VO, THREE_D, IMAX)
   - `language` (enum: ar, fr, en, other)
   - `subtitles` (enum: ar, fr, en, none)
   - `price` (decimal)
   - `ticketsAvailable` (integer)
   - `ticketsSold` (integer, default 0)
   - `premiere` (boolean, default false)

3. **AC#3**: Content-types are accessible via REST API at `/api/venues` and `/api/showtimes`

4. **AC#4**: i18n is enabled for Venue translatable fields (name, description)

5. **AC#5**: Event schema is updated to add `venue` relation (manyToOne to Venue)

6. **AC#6**: Event schema is updated to add `showtimes` relation (oneToMany to Showtime)

7. **AC#7**: TypeScript types are generated via `strapi ts:generate-types`

## Tasks / Subtasks

- [x] **Task 1: Create Venue Content-Type** (AC: #1, #4)

  - [x] 1.1 Create directory structure at `src/api/venue/`
  - [x] 1.2 Create `content-types/venue/schema.json` with all fields
  - [x] 1.3 Enable i18n for `name` and `description` fields via `pluginOptions`
  - [x] 1.4 Create `controllers/venue.ts` with core controller factory
  - [x] 1.5 Create `services/venue.ts` with core service factory
  - [x] 1.6 Create `routes/venue.ts` with core router factory

- [x] **Task 2: Create Showtime Content-Type** (AC: #2)

  - [x] 2.1 Create directory structure at `src/api/showtime/`
  - [x] 2.2 Create `content-types/showtime/schema.json` with all fields
  - [x] 2.3 Create relation to Event (manyToOne) and Venue (manyToOne)
  - [x] 2.4 Create `controllers/showtime.ts` with core controller factory
  - [x] 2.5 Create `services/showtime.ts` with core service factory
  - [x] 2.6 Create `routes/showtime.ts` with core router factory

- [x] **Task 3: Update Event Schema** (AC: #5, #6)

  - [x] 3.1 Add `venue` relation (manyToOne to Venue)
  - [x] 3.2 Add `showtimes` relation (oneToMany to Showtime, mappedBy event)

- [x] **Task 4: Verify API Endpoints** (AC: #3)

  - [x] 4.1 Build succeeds (Docker not available for runtime test)
  - [x] 4.2 TypeScript types generated for venues and showtimes
  - [ ] 4.3 Runtime test deferred (requires Docker)
  - [ ] 4.4 Admin panel verification deferred (requires Docker)

- [x] **Task 5: Generate TypeScript Types** (AC: #7)
  - [x] 5.1 Run `yarn strapi ts:generate-types`
  - [x] 5.2 Verify types generated in `types/generated/`

---

## Dev Notes

### Strapi v5 Content-Type Structure

Each content-type requires this folder structure:

```
src/api/<content-type>/
├── content-types/
│   └── <content-type>/
│       └── schema.json
├── controllers/
│   └── <content-type>.ts
├── routes/
│   └── <content-type>.ts
└── services/
    └── <content-type>.ts
```

### Venue Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "venues",
  "info": {
    "singularName": "venue",
    "pluralName": "venues",
    "displayName": "Venue"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    }
  }
}
```

### Showtime Schema Pattern

Showtime acts as the junction between Event and Venue with additional screening details:

```json
{
  "kind": "collectionType",
  "collectionName": "showtimes",
  "info": {
    "singularName": "showtime",
    "pluralName": "showtimes",
    "displayName": "Showtime"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event",
      "inversedBy": "showtimes"
    },
    "venue": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::venue.venue"
    }
  }
}
```

### Bidirectional Relations

When adding `showtimes` to Event schema, use `mappedBy` to indicate the owning side:

```json
"showtimes": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "api::showtime.showtime",
  "mappedBy": "event"
}
```

### Enum Values (Strapi v5 Compliant)

Strapi v5 requires enum values to have alphabetical characters before numbers:

- Format: `VOST`, `VF`, `VO`, `THREE_D`, `IMAX` (not `3D`)
- Language: `ar`, `fr`, `en`, `other`

### Legacy Schema Notes

Legacy `Medium` content-type was generic (VENUE, CHANNEL, TV_SHOW, ONLINE). New `Venue` is focused specifically on physical venues with:

- Location data (latitude, longitude, address)
- Contact information (phone, email, website)
- Capacity and venue type
- Status for approval workflow

Legacy `Showtime` had TMDB-specific fields that are no longer needed. New schema focuses on:

- Screening details (format, language, subtitles)
- Ticket inventory (available, sold)
- Pricing information

### Previous Story Learnings (2B.2)

- Use `PG12`, `PG16`, `PG18` instead of `12+`, `16+`, `18+` for enums
- Use `THREE_D` instead of `3D` for format enum
- Components with relations to non-existent content-types will cause Strapi to fail
- Generate types after schema changes with `yarn strapi ts:generate-types`

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.3]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Data Architecture]
- [Source: legacy/backend/src/api/medium/content-types/medium/schema.json]
- [Source: legacy/backend/src/api/showtime/content-types/showtime/schema.json]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Venue content-type created** with full i18n support for name, description, and address. Fields include: name, slug, description, address, city, region, latitude, longitude, phone, email, website, images, logo, type (enum), capacity, status (enum), and links (social-link component).

2. **Showtime content-type created** as junction between Event and Venue. Fields include: event (relation), venue (relation), datetime, format (enum: VOST, VF, VO, THREE_D, IMAX), language (enum), subtitles (enum), price, ticketsAvailable, ticketsSold, premiere.

3. **Event schema updated** with:

   - `venue` relation (manyToOne to Venue)
   - `showtimes` relation (oneToMany to Showtime with mappedBy)

4. **Bidirectional relation pattern** used: Showtime owns the relation via `inversedBy: "showtimes"`, Event references back via `mappedBy: "event"`.

5. **City and Region as strings** temporarily. These will be converted to relations when Story 2B.7 creates the Region, City content-types.

6. **Build verified**: `yarn build` completes successfully.

7. **TypeScript types generated**: ApiVenueVenue and ApiShowtimeShowtime are present in `types/generated/contentTypes.d.ts`.

8. **Runtime testing deferred**: Docker daemon was not running, preventing API endpoint verification. Schema validates via successful build.

### File List

**New Files Created:**

- `apps/strapi/src/api/venue/content-types/venue/schema.json`
- `apps/strapi/src/api/venue/controllers/venue.ts`
- `apps/strapi/src/api/venue/services/venue.ts`
- `apps/strapi/src/api/venue/routes/venue.ts`
- `apps/strapi/src/api/showtime/content-types/showtime/schema.json`
- `apps/strapi/src/api/showtime/controllers/showtime.ts`
- `apps/strapi/src/api/showtime/services/showtime.ts`
- `apps/strapi/src/api/showtime/routes/showtime.ts`

**Modified Files:**

- `apps/strapi/src/api/event/content-types/event/schema.json` (added venue and showtimes relations)
- `apps/strapi/types/generated/contentTypes.d.ts` (auto-generated)
- `apps/strapi/types/generated/components.d.ts` (auto-generated)
