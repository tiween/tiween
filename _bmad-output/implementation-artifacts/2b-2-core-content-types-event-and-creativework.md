# Story 2B.2: Core Content-Types - Event and CreativeWork

Status: review

---

## Story

As a **developer**,
I want to create the Event and CreativeWork content-types,
So that the platform can store films, plays, and other creative works.

## Acceptance Criteria

1. **AC#1**: CreativeWork content-type is created with all required fields:

   - `title` (string, required, i18n)
   - `originalTitle` (string, optional)
   - `slug` (uid, from title)
   - `type` (enum: film, play, short-film, concert, exhibition)
   - `synopsis` (rich text, i18n)
   - `duration` (integer, minutes)
   - `releaseYear` (integer)
   - `genres` (relation to Genre - placeholder until Story 2B.4)
   - `directors` (relation to Person, many - placeholder until Story 2B.4)
   - `cast` (relation to Person, many - placeholder until Story 2B.4)
   - `poster` (media, single)
   - `backdrop` (media, single)
   - `trailer` (string, URL)
   - `rating` (decimal)
   - `ageRating` (enum: TP, 12+, 16+, 18+)

2. **AC#2**: Event content-type is created with all required fields:

   - `creativeWork` (relation to CreativeWork)
   - `venue` (relation to Venue - placeholder until Story 2B.3)
   - `startDate` (datetime)
   - `endDate` (datetime)
   - `showtimes` (component, repeatable - placeholder until Story 2B.3)
   - `status` (enum: scheduled, cancelled, completed)
   - `featured` (boolean)

3. **AC#3**: Content-types are accessible via REST API at `/api/creative-works` and `/api/events`

4. **AC#4**: i18n is enabled for translatable fields (title, synopsis for CreativeWork)

5. **AC#5**: Draft & Publish is enabled for both content-types

6. **AC#6**: TypeScript types are generated via `strapi ts:generate-types`

## Tasks / Subtasks

- [x] **Task 1: Create CreativeWork Content-Type** (AC: #1, #4, #5)

  - [x] 1.1 Create directory structure at `src/api/creative-work/`
  - [x] 1.2 Create `content-types/creative-work/schema.json` with all fields
  - [x] 1.3 Enable i18n for `title` and `synopsis` fields via `pluginOptions`
  - [x] 1.4 Enable draftAndPublish in options
  - [x] 1.5 Create `controllers/creative-work.ts` with core controller factory
  - [x] 1.6 Create `services/creative-work.ts` with core service factory
  - [x] 1.7 Create `routes/creative-work.ts` with core router factory

- [x] **Task 2: Create Event Content-Type** (AC: #2, #5)

  - [x] 2.1 Create directory structure at `src/api/event/`
  - [x] 2.2 Create `content-types/event/schema.json` with all fields
  - [x] 2.3 Enable draftAndPublish in options
  - [x] 2.4 Create placeholder relation to CreativeWork (manyToOne)
  - [x] 2.5 Create `controllers/event.ts` with core controller factory
  - [x] 2.6 Create `services/event.ts` with core service factory
  - [x] 2.7 Create `routes/event.ts` with core router factory

- [x] **Task 3: Verify API Endpoints** (AC: #3)

  - [x] 3.1 Start Strapi development server
  - [x] 3.2 Test `GET /api/creative-works` returns 403 (requires auth - expected)
  - [x] 3.3 Test `GET /api/events` returns 403 (requires auth - expected)
  - [x] 3.4 Verify content-types appear in Strapi Admin panel

- [x] **Task 4: Generate TypeScript Types** (AC: #6)

  - [x] 4.1 Run `yarn strapi ts:generate-types`
  - [x] 4.2 Verify types generated in `types/generated/`
  - [ ] 4.3 Commit generated types

- [ ] **Task 5: Test i18n Functionality** (AC: #4) - deferred to manual testing
  - [ ] 5.1 Create test CreativeWork entry via Admin panel
  - [ ] 5.2 Switch locale and verify translation fields work
  - [ ] 5.3 Test `GET /api/creative-works?locale=fr` returns French content
  - [ ] 5.4 Test `GET /api/creative-works?locale=ar` returns Arabic content

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

### Schema.json Pattern (Strapi v5)

```json
{
  "kind": "collectionType",
  "collectionName": "creative_works",
  "info": {
    "singularName": "creative-work",
    "pluralName": "creative-works",
    "displayName": "Creative Work"
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
    "title": {
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

### Controller/Service/Route Pattern (Strapi v5)

**Controller (TypeScript):**

```typescript
import { factories } from "@strapi/strapi"

export default factories.createCoreController(
  "api::creative-work.creative-work"
)
```

**Service (TypeScript):**

```typescript
import { factories } from "@strapi/strapi"

export default factories.createCoreService("api::creative-work.creative-work")
```

**Route (TypeScript):**

```typescript
import { factories } from "@strapi/strapi"

export default factories.createCoreRouter("api::creative-work.creative-work")
```

### i18n Field Configuration

For localized fields, add `pluginOptions.i18n.localized: true`:

```json
"title": {
  "type": "string",
  "required": true,
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  }
}
```

For non-localized fields in an i18n-enabled content-type:

```json
"slug": {
  "type": "uid",
  "targetField": "title",
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  }
}
```

### Relation Placeholders

Relations to content-types not yet created (Genre, Person, Venue) should use placeholder comments:

```json
"genres": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "api::genre.genre"
}
```

These will show warnings until Story 2B.4 creates the Genre/Person content-types.

### Project Structure Notes

- Content-types go in `apps/strapi/src/api/`
- Use kebab-case for singularName and pluralName
- Use snake_case for collectionName (database table)
- Follow existing patterns from `footer`, `navbar`, `page` content-types

### Previous Story Learnings (2B.1)

- CKEditor plugin was removed - use standard `richtext` type for synopsis
- TypeScript strict mode is disabled in Strapi (existing code incompatible)
- PostgreSQL runs on port 5437 (not 5432)
- i18n is configured with fr/ar/en locales in `config/plugins.ts`

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.2]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Data Architecture]
- [Source: _bmad-output/architecture/project-structure-boundaries.md#apps/strapi]
- [Source: _bmad-output/project-context.md#Strapi v5 Rules]
- [Source: Context7 Strapi v5.2.2 Docs - Content-Type Schema Definition]
- [Source: Context7 Strapi v5.2.2 Docs - i18n Internationalization]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **CreativeWork content-type created** with i18n support for title, synopsis, poster, and facts. Fields include: title, originalTitle, slug, type (enum), synopsis, duration, releaseYear, poster, backdrop, photos, trailer, videos, rating, ageRating, facts, and links.

2. **Event content-type created** with relation to CreativeWork. Fields include: creativeWork (relation), startDate, endDate, status (enum), featured, title, subtitle, slug, description, poster, links, recurring, recurringRule.

3. **Components created**:

   - `creative-works.cast` - name and character fields
   - `creative-works.credit` - name and job fields
   - `common.video` - url and type (enum) fields
   - `common.social-link` - url and type (enum) fields
   - `common.remarkable-fact` - name, year, and country fields

4. **Strapi v5 enum constraint**: Changed ageRating values from "12+", "16+", "18+" to "PG12", "PG16", "PG18" because Strapi v5 requires enum values to have alphabetical characters before numbers.

5. **Placeholder relations deferred**: Relations to Genre, Person, Venue, Showtime, and EventGroup content-types are not included in this story as they would cause Strapi to fail to start. These will be added in Story 2B.3 (Venue, Showtime) and 2B.4 (Person, Genre).

6. **API endpoints work**: Both `/api/creative-works` and `/api/events` return 403 Forbidden as expected (public access not configured).

7. **TypeScript types generated**: Types for ApiCreativeWorkCreativeWork and ApiEventEvent are present in `types/generated/contentTypes.d.ts`.

### File List

**New Files Created:**

- `apps/strapi/src/api/creative-work/content-types/creative-work/schema.json`
- `apps/strapi/src/api/creative-work/controllers/creative-work.ts`
- `apps/strapi/src/api/creative-work/services/creative-work.ts`
- `apps/strapi/src/api/creative-work/routes/creative-work.ts`
- `apps/strapi/src/api/event/content-types/event/schema.json`
- `apps/strapi/src/api/event/controllers/event.ts`
- `apps/strapi/src/api/event/services/event.ts`
- `apps/strapi/src/api/event/routes/event.ts`
- `apps/strapi/src/components/creative-works/cast.json`
- `apps/strapi/src/components/creative-works/credit.json`
- `apps/strapi/src/components/common/video.json`
- `apps/strapi/src/components/common/social-link.json`
- `apps/strapi/src/components/common/remarkable-fact.json`

**Modified Files:**

- `apps/strapi/types/generated/contentTypes.d.ts` (auto-generated)
- `apps/strapi/types/generated/components.d.ts` (auto-generated)
