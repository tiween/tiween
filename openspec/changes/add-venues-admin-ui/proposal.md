# Change: Add Venues Admin UI

## Why

The `plugin::events-manager.venue` content type exists with a complete schema (name, address, city, coordinates, type, capacity, status, etc.) but lacks a dedicated admin interface. Currently, venue management requires using Strapi's generic Content Manager, which:

1. **Lacks context** - No visual map preview for coordinates
2. **Missing bulk operations** - Can't approve/suspend multiple venues at once
3. **No quick selection** - Event creation needs a venue picker component
4. **Poor discoverability** - Venues are buried in Content Manager

## What Changes

### Full Management UI

- **Venues List Page**: Filterable/searchable table with status badges, type icons, city display
- **Venue Create/Edit Modal**: Form with all fields, city selector (geography plugin integration), map preview for coordinates
- **Status Management**: Bulk approve/suspend actions
- **Tab Integration**: Add "Venues" tab to events-manager homepage

### Quick Selection Components

- **VenueSelector**: Dropdown/modal for selecting a venue in event forms
- **VenueCard**: Compact venue display with key info (name, city, type, capacity)
- **VenueSearchPanel**: Search/filter panel for venue selection

## Impact

- **Affected plugins**: `events-manager` (primary), `geography` (city selection)
- **Affected code**:
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/HomePage.tsx` (add Venues tab)
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Venues/` (new)
  - `apps/strapi/src/plugins/events-manager/admin/src/components/VenueSelector/` (new)
  - `apps/strapi/src/plugins/events-manager/admin/src/components/VenueCard/` (new)
  - `apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenues.ts` (enhance)
- **Dependencies**: None new - uses existing `@strapi/design-system`
- **Breaking changes**: None

## Design Decisions

See `design.md` for:

- List view column configuration
- Form field organization
- City selector integration with geography plugin
- Map preview implementation options
