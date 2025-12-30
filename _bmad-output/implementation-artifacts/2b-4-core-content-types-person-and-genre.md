# Story 2B.4: Core Content-Types - Person and Genre

Status: review

---

## Story

As a **developer**,
I want to create the Person and Genre content-types,
So that the platform can store filmmakers, actors, and categorize content.

## Acceptance Criteria

1. **AC#1**: Person content-type is created with all required fields:

   - `name` (string, required)
   - `slug` (uid, from name)
   - `bio` (text, i18n)
   - `photo` (media, single)
   - `birthDate` (date)
   - `nationality` (string)
   - `roles` (json, array of roles - director, actor, writer, etc.)

2. **AC#2**: Genre content-type is created with all required fields:

   - `name` (string, required, i18n)
   - `slug` (uid, from name)
   - `icon` (string, icon name)
   - `color` (string, hex color)

3. **AC#3**: CreativeWork schema is updated to add:

   - `genres` relation (manyToMany to Genre)
   - `directors` relation (manyToMany to Person)
   - `cast` component using creative-works.cast
   - `crew` component using creative-works.credit

4. **AC#4**: Content-types are accessible via REST API at `/api/persons` and `/api/genres`

5. **AC#5**: i18n is enabled for Person bio and Genre name

6. **AC#6**: TypeScript types are generated via `strapi ts:generate-types`

## Tasks / Subtasks

- [x] **Task 1: Create Person Content-Type** (AC: #1, #5)

  - [x] 1.1 Create directory structure at `src/api/person/`
  - [x] 1.2 Create `content-types/person/schema.json` with all fields
  - [x] 1.3 Enable i18n for `bio` field via `pluginOptions`
  - [x] 1.4 Create `controllers/person.ts` with core controller factory
  - [x] 1.5 Create `services/person.ts` with core service factory
  - [x] 1.6 Create `routes/person.ts` with core router factory

- [x] **Task 2: Create Genre Content-Type** (AC: #2, #5)

  - [x] 2.1 Create directory structure at `src/api/genre/`
  - [x] 2.2 Create `content-types/genre/schema.json` with all fields
  - [x] 2.3 Enable i18n for `name` field via `pluginOptions`
  - [x] 2.4 Create `controllers/genre.ts` with core controller factory
  - [x] 2.5 Create `services/genre.ts` with core service factory
  - [x] 2.6 Create `routes/genre.ts` with core router factory

- [x] **Task 3: Update CreativeWork Schema** (AC: #3)

  - [x] 3.1 Add `genres` relation (manyToMany to Genre)
  - [x] 3.2 Add `directors` relation (manyToMany to Person)
  - [x] 3.3 Add `cast` component (creative-works.cast, repeatable)
  - [x] 3.4 Add `crew` component (creative-works.credit, repeatable)

- [x] **Task 4: Update Cast/Credit Components** (AC: #3)

  - [x] 4.1 Update cast component to reference Person via relation
  - [x] 4.2 Update credit component to reference Person via relation

- [x] **Task 5: Generate TypeScript Types** (AC: #6)
  - [x] 5.1 Run `yarn strapi ts:generate-types`
  - [x] 5.2 Verify types generated in `types/generated/`
  - [x] 5.3 Verify build succeeds

---

## Dev Notes

### Person Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "persons",
  "info": {
    "singularName": "person",
    "pluralName": "persons",
    "displayName": "Person"
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
          "localized": false
        }
      }
    },
    "bio": {
      "type": "text",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    }
  }
}
```

### Genre Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "genres",
  "info": {
    "singularName": "genre",
    "pluralName": "genres",
    "displayName": "Genre"
  },
  "options": {
    "draftAndPublish": false
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

### ManyToMany Relations

For CreativeWork to Genre/Person relations:

```json
"genres": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "api::genre.genre"
}
```

### Cast/Credit Components with Person Relation

Now that Person exists, update components to use relations:

```json
{
  "attributes": {
    "person": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::person.person"
    },
    "character": {
      "type": "string"
    }
  }
}
```

### Previous Story Learnings

- Components with relations to non-existent content-types cause Strapi to fail
- Cast/Credit components were created with string `name` field as placeholder
- Now that Person exists, we can add proper relations

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.4]
- [Source: legacy/backend/src/api/person/content-types/person/schema.json]
- [Source: legacy/backend/src/components/creative-works/cast.json]
- [Source: legacy/backend/src/components/creative-works/credit.json]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Person content-type created** with i18n support for bio. Fields include: name, slug, bio (i18n), photo, birthDate, nationality, roles (JSON array).

2. **Genre content-type created** with i18n support for name. Fields include: name (i18n), slug, icon, color. Draft & Publish is disabled for genres (reference data).

3. **CreativeWork schema updated** with:

   - `genres` relation (manyToMany to Genre)
   - `directors` relation (manyToMany to Person)
   - `cast` component (creative-works.cast, repeatable)
   - `crew` component (creative-works.credit, repeatable)

4. **Cast/Credit components updated** to use Person relations instead of plain string `name` field:

   - Cast: person (relation to Person) + character (string)
   - Credit: person (relation to Person) + job (string)

5. **Build verified**: `yarn build` completes successfully.

6. **TypeScript types generated**: ApiPersonPerson and ApiGenreGenre are present in `types/generated/contentTypes.d.ts`.

### File List

**New Files Created:**

- `apps/strapi/src/api/person/content-types/person/schema.json`
- `apps/strapi/src/api/person/controllers/person.ts`
- `apps/strapi/src/api/person/services/person.ts`
- `apps/strapi/src/api/person/routes/person.ts`
- `apps/strapi/src/api/genre/content-types/genre/schema.json`
- `apps/strapi/src/api/genre/controllers/genre.ts`
- `apps/strapi/src/api/genre/services/genre.ts`
- `apps/strapi/src/api/genre/routes/genre.ts`

**Modified Files:**

- `apps/strapi/src/api/creative-work/content-types/creative-work/schema.json` (added genres, directors, cast, crew)
- `apps/strapi/src/components/creative-works/cast.json` (changed name to person relation)
- `apps/strapi/src/components/creative-works/credit.json` (changed name to person relation)
- `apps/strapi/types/generated/contentTypes.d.ts` (auto-generated)
- `apps/strapi/types/generated/components.d.ts` (auto-generated)
