## Context

Tiween needs a flexible property/amenity system for venues (and potentially other content types like events or creative works). Properties include things like:

- Boolean flags: "Air Conditioning", "Wheelchair Accessible", "Parking Available"
- Numeric values: "Capacity", "Number of Screens", "Year Built"
- String values: "WiFi Password", "Special Instructions"

The system must support i18n for property names and descriptions (ar-MA, fr-MA locales).

### Stakeholders

- Content editors: Define and manage property definitions
- Venue managers: Set property values for their venues
- End users: View venue properties when browsing

### Constraints

- Must work within Strapi 5 plugin architecture
- Must support i18n localization
- Must be type-safe (different value types per property)
- Should be extensible to other content types in future

## Goals / Non-Goals

### Goals

- Create reusable property definition system
- Support multiple value types (boolean, integer, string, enum)
- Enable i18n for property metadata (name, description)
- Organize properties into categories
- First integration: Venue content type
- Provide admin UI for managing property definitions

### Non-Goals

- Complex EAV querying/filtering (keep simple for now)
- Property inheritance hierarchies
- Dynamic property creation by end-users
- Real-time property validation rules

## Decisions

### Decision 1: Hybrid Approach vs Pure EAV vs Hardcoded Fields

**Chosen: Hybrid Approach with Property Definitions + Component Values**

| Approach         | Flexibility | Performance | Complexity | Strapi Fit |
| ---------------- | ----------- | ----------- | ---------- | ---------- |
| Hardcoded fields | Low         | Best        | Low        | Native     |
| Pure EAV         | Highest     | Poor        | High       | Poor       |
| **Hybrid**       | High        | Good        | Medium     | Good       |

**Rationale:**

- Pure EAV requires complex joins and loses Strapi's type safety
- Hardcoded fields don't allow editor-defined properties
- Hybrid gives flexibility while leveraging Strapi components

**Implementation:**

```
property_definitions (content type)
├── name (i18n string)
├── slug (uid)
├── description (i18n text)
├── type (enum: boolean, integer, string, enum)
├── icon (string - icon identifier)
├── enumOptions (JSON - for enum type)
├── category (relation to property_category)
└── sortOrder (integer)

property_categories (content type)
├── name (i18n string)
├── slug (uid)
├── icon (string)
├── sortOrder (integer)
└── parent (self-relation) - for nested groups/sections

property_groups (content type) - optional sub-sections within categories
├── name (i18n string)
├── slug (uid)
├── category (relation to property_category)
└── sortOrder (integer)

entity-property-value (component)
├── definition (relation to property_definition)
├── booleanValue (boolean)
├── integerValue (integer)
├── stringValue (string)
└── enumValue (string)
```

### Decision 2: Value Storage Strategy

**Chosen: Single component with typed nullable fields**

**Alternatives considered:**

1. **Separate components per type** (`boolean-property`, `integer-property`, etc.)

   - Pro: Cleaner schema per value
   - Con: Cannot mix property types in single repeatable zone

2. **JSON blob for values**

   - Pro: Maximum flexibility
   - Con: Loses type safety, harder to query

3. **Single component with nullable typed fields** (chosen)
   - Pro: One component, supports all types, queryable
   - Con: Slight storage overhead (unused fields)

**Rationale:** Strapi components work best as repeatable zones. A single component with the property definition relation lets us validate which field to use based on the definition's type.

### Decision 3: Plugin Location

**Chosen: New `entity-properties` plugin**

Rather than adding to `geography` or `events-manager`, create a dedicated plugin for reusability across domains.

**Plugin structure:**

```
apps/strapi/src/plugins/entity-properties/
├── admin/src/           # Admin UI for property management
├── server/src/
│   ├── content-types/
│   │   ├── property-definition/
│   │   └── property-category/
│   ├── components/
│   │   └── entity-property-value/
│   ├── controllers/
│   ├── routes/
│   └── services/
└── package.json
```

### Decision 4: i18n Strategy

**Chosen: Localize metadata only, not values**

- Property definition `name` and `description`: Localized (content editors translate once)
- Property values: Not localized (same value regardless of locale)

**Rationale:** "Capacity = 500" doesn't change per locale. The label "Capacity" / "السعة" / "Capacité" does.

### Decision 5: Icon System

**Chosen: String identifier referencing icon library**

Store icon as string (e.g., `"air-conditioning"`, `"wheelchair"`, `"parking"`) that maps to:

- Lucide icons in admin UI
- Custom icon set on frontend

**Alternatives:** Media upload (overhead), SVG blob (security), hardcoded enum (inflexible)

## Risks / Trade-offs

| Risk                             | Likelihood | Impact | Mitigation                                                       |
| -------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Performance with many properties | Medium     | Medium | Index property_definition relations, limit properties per entity |
| Complex admin UI                 | Medium     | Low    | Start with simple list UI, enhance later                         |
| Type validation gaps             | Low        | Medium | Add service-layer validation for value types                     |

## Migration Plan

1. Create `entity-properties` plugin with content types
2. Seed initial property definitions (common venue amenities)
3. Add `properties` field to Venue schema
4. Migrate any existing hardcoded venue fields if applicable

**Rollback:** Remove `properties` field from Venue, disable plugin. No data loss for existing venue data.

## Resolved Questions

1. **Property groups/sections within categories?** → **Yes** - Added `property-group` content type and `parent` self-relation on categories for hierarchical organization
2. **Enum options i18n?** → **No** - Keep simple for now, can add later if needed
3. **Required flag on property definitions?** → **No** - Skip for now to reduce complexity; can add later for enforcing data completeness
