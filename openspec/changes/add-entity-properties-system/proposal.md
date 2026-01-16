# Change: Add Entity Properties System

## Why

Venues (and potentially other content types) need configurable properties/amenities that vary by entity type. Currently, properties like "Air Conditioning", "Wheelchair Accessible", or "Capacity" would require hardcoding fields in each content type schema. This lacks flexibility and makes it impossible for content editors to define new properties without developer intervention.

A dedicated property system enables:

- Content editors to define property schemas (name, type, icon, description)
- Reusable property definitions across multiple content types
- Type-safe property values (boolean, integer, string, enum)
- i18n support for property names and descriptions
- Consistent UI/UX for displaying properties across the platform

## What Changes

- **NEW** `entity-properties` Strapi plugin with:

  - `property-definition` content type - defines available properties (name, type, icon, description, category)
  - `property-category` content type - groups related properties (e.g., "Accessibility", "Facilities", "Services")
  - `entity-property-value` component - stores actual property values attached to entities

- **MODIFIED** `events-manager` plugin:
  - Add `properties` field to `venue` content type using the new component

## Impact

- **Affected code**:

  - New plugin: `apps/strapi/src/plugins/entity-properties/`
  - Modified: `apps/strapi/src/plugins/events-manager/server/src/content-types/venue/schema.json`
  - Frontend: Property display components (future)

- **Database**:

  - New tables: `property_definitions`, `property_categories`, component table for values
  - New junction: venue-to-property-values relationship

- **Breaking changes**: None - additive only

## Design Considerations

See `design.md` for detailed architectural decisions including:

- Why hybrid approach over pure EAV or hardcoded fields
- Property type system design
- i18n strategy for property names/descriptions
- Extensibility to other content types beyond Venue
