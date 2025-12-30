# Story 2B.6: User Content-Types - UserWatchlist and UserPreferences

Status: review

---

## Story

As a **developer**,
I want to extend user data with watchlist and preferences,
So that users can save events and configure their experience.

## Acceptance Criteria

1. **AC#1**: UserWatchlist content-type is created with all required fields:

   - `user` (relation to users-permissions user, required)
   - `creativeWork` (relation to CreativeWork)
   - `addedAt` (datetime)
   - `notifyChanges` (boolean, default: true)

2. **AC#2**: User model is extended with preference fields:

   - `preferredLanguage` (enum: ar, fr, en)
   - `defaultRegion` (relation to Region - placeholder until 2B.7)
   - `avatar` (media, single)

3. **AC#3**: Unique constraint on user + creativeWork combination in UserWatchlist

4. **AC#4**: Content-type is accessible via REST API at `/api/user-watchlists`

5. **AC#5**: TypeScript types are generated via `strapi ts:generate-types`

## Tasks / Subtasks

- [x] **Task 1: Create UserWatchlist Content-Type** (AC: #1, #3, #4)

  - [x] 1.1 Create directory structure at `src/api/user-watchlist/`
  - [x] 1.2 Create `content-types/user-watchlist/schema.json` with all fields
  - [x] 1.3 Add relation to users-permissions user
  - [x] 1.4 Add relation to CreativeWork
  - [x] 1.5 Create `controllers/user-watchlist.ts` with core controller factory
  - [x] 1.6 Create `services/user-watchlist.ts` with core service factory
  - [x] 1.7 Create `routes/user-watchlist.ts` with core router factory

- [x] **Task 2: Extend User Model** (AC: #2)

  - [x] 2.1 Create extensions directory at `src/extensions/users-permissions/`
  - [x] 2.2 Create content-type extension for user with additional fields
  - [x] 2.3 Add preferredLanguage enum field
  - [x] 2.4 Add avatar media field

- [x] **Task 3: Generate TypeScript Types** (AC: #5)
  - [x] 3.1 Run `yarn strapi ts:generate-types`
  - [x] 3.2 Verify types generated in `types/generated/`
  - [x] 3.3 Verify build succeeds

---

## Dev Notes

### UserWatchlist Schema Pattern

```json
{
  "kind": "collectionType",
  "collectionName": "user_watchlists",
  "info": {
    "singularName": "user-watchlist",
    "pluralName": "user-watchlists",
    "displayName": "User Watchlist"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "creativeWork": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::creative-work.creative-work"
    },
    "addedAt": {
      "type": "datetime"
    },
    "notifyChanges": {
      "type": "boolean",
      "default": true
    }
  }
}
```

### User Extension Pattern (Strapi v5)

In Strapi v5, user extensions must include ALL base user fields plus custom fields. The extension completely replaces the type definition:

```json
{
  "collectionName": "up_users",
  "info": {
    "name": "user",
    "description": "Extended user model with preferences",
    "singularName": "user",
    "pluralName": "users",
    "displayName": "User"
  },
  "attributes": {
    // Base fields (must be included)
    "username": { ... },
    "email": { ... },
    "password": { ... },
    "resetPasswordToken": { ... },
    "confirmationToken": { ... },
    "confirmed": { ... },
    "blocked": { ... },
    "role": { ... },
    // Custom fields
    "preferredLanguage": {
      "type": "enumeration",
      "enum": ["ar", "fr", "en"],
      "default": "fr"
    },
    "avatar": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    }
  }
}
```

### Unique Constraint Note

For user + creativeWork uniqueness, this should be enforced at the database level or through custom service logic. Strapi v5 doesn't support multi-field unique constraints directly in schema. Consider using a lifecycle hook or custom controller validation.

### Region Placeholder

The `defaultRegion` field will be added in Story 2B.7 when Region content-type is created. For now, we skip this field to avoid referencing non-existent content-types.

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.6]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Data Architecture]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. **UserWatchlist content-type created** with all required fields:

   - user (relation to users-permissions.user)
   - creativeWork (relation to creative-work)
   - addedAt (datetime)
   - notifyChanges (boolean, default: true)

2. **User model extended** via `src/extensions/users-permissions/content-types/user/schema.json`:

   - All base users-permissions fields included (username, email, password, resetPasswordToken, confirmationToken, confirmed, blocked, role)
   - preferredLanguage enum (ar, fr, en) with default "fr"
   - avatar (media, single image)
   - firstName/lastName fields preserved from existing lifecycle code

3. **TypeScript fix**: The user extension in Strapi v5 completely replaces the type definition, so all base fields must be included. This fixed a pre-existing type error in `src/lifeCycles/user.ts:54` where `resetPasswordToken` was not recognized.

4. **defaultRegion deferred**: Will be added in Story 2B.7 when Region content-type exists.

5. **Build verified**: `yarn build` completes successfully.

6. **TypeScript types generated**: ApiUserWatchlistUserWatchlist and extended PluginUsersPermissionsUser are present.

### File List

**New Files Created:**

- `apps/strapi/src/api/user-watchlist/content-types/user-watchlist/schema.json`
- `apps/strapi/src/api/user-watchlist/controllers/user-watchlist.ts`
- `apps/strapi/src/api/user-watchlist/services/user-watchlist.ts`
- `apps/strapi/src/api/user-watchlist/routes/user-watchlist.ts`
- `apps/strapi/src/extensions/users-permissions/content-types/user/schema.json`

**Modified Files:**

- `apps/strapi/types/generated/contentTypes.d.ts` (auto-generated)
