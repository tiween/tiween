# Story 2B.7: Reference Content-Types - Region, City, Category

Status: review

---

## Story

As a **developer**,
I want to create Region, City, and Category content-types,
So that events can be organized by location and type.

## Acceptance Criteria

1. **AC#1**: Region content-type is created with all required fields:

   - `name` (string, required, i18n)
   - `slug` (uid, from name)
   - `code` (string, e.g., "TUN", "SFX")

2. **AC#2**: City content-type is created with all required fields:

   - `name` (string, required, i18n)
   - `slug` (uid, from name)
   - `region` (relation to Region)
   - `latitude` (decimal)
   - `longitude` (decimal)

3. **AC#3**: Category content-type is created with all required fields:

   - `name` (string, required, i18n)
   - `slug` (uid, from name)
   - `icon` (string)
   - `order` (integer, for sorting)

4. **AC#4**: Content-types are accessible via REST API at `/api/regions`, `/api/cities`, `/api/categories`

5. **AC#5**: User model is updated to add `defaultRegion` relation

6. **AC#6**: Venue model is updated to use City relation instead of string fields

7. **AC#7**: TypeScript types are generated via `strapi ts:generate-types`

## Tasks / Subtasks

- [x] **Task 1: Create Region Content-Type** (AC: #1, #4)

  - [x] 1.1 Create directory structure at `src/api/region/`
  - [x] 1.2 Create `content-types/region/schema.json` with all fields
  - [x] 1.3 Enable i18n for `name` field
  - [x] 1.4 Create `controllers/region.ts` with core controller factory
  - [x] 1.5 Create `services/region.ts` with core service factory
  - [x] 1.6 Create `routes/region.ts` with core router factory

- [x] **Task 2: Create City Content-Type** (AC: #2, #4)

  - [x] 2.1 Create directory structure at `src/api/city/`
  - [x] 2.2 Create `content-types/city/schema.json` with all fields
  - [x] 2.3 Enable i18n for `name` field
  - [x] 2.4 Add relation to Region
  - [x] 2.5 Create `controllers/city.ts` with core controller factory
  - [x] 2.6 Create `services/city.ts` with core service factory
  - [x] 2.7 Create `routes/city.ts` with core router factory

- [x] **Task 3: Create Category Content-Type** (AC: #3, #4)

  - [x] 3.1 Create directory structure at `src/api/category/`
  - [x] 3.2 Create `content-types/category/schema.json` with all fields
  - [x] 3.3 Enable i18n for `name` field
  - [x] 3.4 Create `controllers/category.ts` with core controller factory
  - [x] 3.5 Create `services/category.ts` with core service factory
  - [x] 3.6 Create `routes/category.ts` with core router factory

- [x] **Task 4: Update User Model** (AC: #5)

  - [x] 4.1 Add `defaultRegion` relation to user extension schema

- [x] **Task 5: Update Venue Model** (AC: #6)

  - [x] 5.1 Add `cityRef` relation to Venue schema
  - [x] 5.2 Keep string fields as fallback for legacy data

- [x] **Task 6: Generate TypeScript Types** (AC: #7)
  - [x] 6.1 Run `yarn strapi ts:generate-types`
  - [x] 6.2 Verify types generated in `types/generated/`
  - [x] 6.3 Verify build succeeds

---

## Dev Notes

### Region Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "regions",
  "info": {
    "singularName": "region",
    "pluralName": "regions",
    "displayName": "Region"
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
    },
    "slug": {
      "type": "uid",
      "targetField": "name"
    },
    "code": {
      "type": "string"
    }
  }
}
```

### City Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "cities",
  "info": {
    "singularName": "city",
    "pluralName": "cities",
    "displayName": "City"
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
    },
    "slug": {
      "type": "uid",
      "targetField": "name"
    },
    "region": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::region.region"
    },
    "latitude": {
      "type": "decimal"
    },
    "longitude": {
      "type": "decimal"
    }
  }
}
```

### Category Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "categories",
  "info": {
    "singularName": "category",
    "pluralName": "categories",
    "displayName": "Category"
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
    },
    "slug": {
      "type": "uid",
      "targetField": "name"
    },
    "icon": {
      "type": "string"
    },
    "order": {
      "type": "integer",
      "default": 0
    }
  }
}
```

### Seed Data (for Story 2B.15)

Reference data for seeding:

- Regions: Grand Tunis (TUN), Sfax (SFX), Sousse (SOU), Nabeul (NAB), etc.
- Cities: Tunis, La Marsa, Carthage, Sfax, Sousse, Hammamet, etc.
- Categories: Cinéma, Théâtre, Concerts, Expositions, Festivals, etc.

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.7]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Data Architecture]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **Region content-type created** with i18n support:

   - name (i18n, required)
   - slug (uid from name)
   - code (e.g., "TUN", "SFX")
   - Draft & Publish disabled (reference data)

2. **City content-type created** with i18n support:

   - name (i18n, required)
   - slug (uid from name)
   - region (manyToOne relation to Region)
   - latitude/longitude (decimals for geo-location)
   - Draft & Publish disabled (reference data)

3. **Category content-type created** with i18n support:

   - name (i18n, required)
   - slug (uid from name)
   - icon (string for icon name)
   - order (integer for sorting, default: 0)
   - Draft & Publish disabled (reference data)

4. **User model updated** with `defaultRegion` relation to Region

5. **Venue model updated** with `cityRef` relation to City:

   - Added as new field to preserve backward compatibility
   - Original string `city` and `region` fields kept for legacy data

6. **Build verified**: `yarn build` completes successfully

7. **TypeScript types generated**: ApiRegionRegion, ApiCityCity, ApiCategoryCategory present in contentTypes.d.ts

### File List

**New Files Created:**

- `apps/strapi/src/api/region/content-types/region/schema.json`
- `apps/strapi/src/api/region/controllers/region.ts`
- `apps/strapi/src/api/region/services/region.ts`
- `apps/strapi/src/api/region/routes/region.ts`
- `apps/strapi/src/api/city/content-types/city/schema.json`
- `apps/strapi/src/api/city/controllers/city.ts`
- `apps/strapi/src/api/city/services/city.ts`
- `apps/strapi/src/api/city/routes/city.ts`
- `apps/strapi/src/api/category/content-types/category/schema.json`
- `apps/strapi/src/api/category/controllers/category.ts`
- `apps/strapi/src/api/category/services/category.ts`
- `apps/strapi/src/api/category/routes/category.ts`

**Modified Files:**

- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json` (added defaultRegion)
- `apps/strapi/src/api/venue/content-types/venue/schema.json` (added cityRef)
- `apps/strapi/types/generated/contentTypes.d.ts` (auto-generated)
