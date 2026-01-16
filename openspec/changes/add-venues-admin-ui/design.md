## Context

The events-manager plugin manages venues as a content type but relies on Strapi's generic Content Manager for CRUD operations. This proposal adds a purpose-built admin UI that integrates venue management into the plugin's workflow.

**Stakeholders**: Venue managers, event planners, platform administrators

**Constraints**:

- Must use Strapi DS components exclusively
- Must integrate with existing geography plugin for city selection
- Must work with existing `useVenues` hook
- Cannot break existing event creation flow

## Goals / Non-Goals

**Goals**:

- Provide searchable/filterable venue list with status management
- Create/edit venues with all schema fields
- Integrate city selector from geography plugin
- Provide reusable venue selection component for event forms
- Support bulk status updates (approve/suspend)

**Non-Goals**:

- Interactive map editing (coordinates entered manually)
- Venue analytics/reporting dashboard
- Public venue pages (client-side feature)
- Venue verification workflow

## Decisions

### 1. Page Structure

**Decision**: Add "Venues" tab to events-manager HomePage

```
HomePage.tsx
├── Planning Tab (existing)
├── Import Tab (existing)
└── Venues Tab (new)
    └── VenuesPage component
```

**Rationale**: Keeps venue management within the events-manager context. Users expect venue-related features alongside event planning.

### 2. Venues List Design

**Decision**: Table layout with key columns and action buttons

| Column   | Type                                 | Sortable | Filterable |
| -------- | ------------------------------------ | -------- | ---------- |
| Name     | Text with logo thumbnail             | Yes      | Search     |
| City     | Text (from cityRef)                  | Yes      | Dropdown   |
| Type     | Badge (cinema, theater, etc.)        | Yes      | Dropdown   |
| Status   | Badge (pending, approved, suspended) | Yes      | Dropdown   |
| Capacity | Number                               | Yes      | -          |
| Actions  | Edit, Delete buttons                 | -        | -          |

**Filters Panel**:

- Search (name)
- Status dropdown
- Type dropdown
- City/Region dropdown

**Bulk Actions**:

- Approve selected
- Suspend selected
- Delete selected (with confirmation)

### 3. Venue Form Structure

**Decision**: Grouped form sections in a modal

```
VenueEditModal
├── Section: Basic Info
│   ├── name (required, localized)
│   ├── slug (auto-generated from name)
│   ├── type (dropdown: cinema, theater, cultural-center, museum, other)
│   └── status (dropdown: pending, approved, suspended)
│
├── Section: Location
│   ├── address (text)
│   ├── cityRef (CitySelector component)
│   ├── latitude (decimal input)
│   └── longitude (decimal input)
│
├── Section: Contact
│   ├── phone
│   ├── email
│   └── website
│
├── Section: Details
│   ├── description (rich text)
│   ├── capacity (number)
│   └── manager (UserSelector)
│
└── Section: Media
    ├── logo (single image upload)
    └── images (multiple image upload)
```

**Rationale**: Grouped sections improve scanability. Most important fields (name, location) appear first.

### 4. City Selector Integration

**Decision**: Custom `CitySelector` component that queries geography plugin

```typescript
interface CitySelectorProps {
  value: number | null
  onChange: (cityId: number | null) => void
  placeholder?: string
}

// Two-step selection:
// 1. Select region (dropdown)
// 2. Select city within region (dropdown, filtered)
```

**API calls**:

- GET `/content-manager/collection-types/plugin::geography.region` (list regions)
- GET `/content-manager/collection-types/plugin::geography.city?filters[region][id]={regionId}` (cities in region)

**Rationale**: Two-step selection reduces cognitive load (12 regions vs 200+ cities).

### 5. VenueSelector Component

**Decision**: Dropdown with search, used in event forms

```typescript
interface VenueSelectorProps {
  value: string | null // venue documentId
  onChange: (venueId: string | null) => void
  disabled?: boolean
}

// Features:
// - Async search as user types
// - Shows venue name, city, type badge
// - Clear button
// - Optional "Add new venue" action
```

**Rationale**: Consistent with how event group selector works. Async search prevents loading all venues upfront.

### 6. API Integration

**Decision**: Extend existing routes, add new hooks

**Existing hook enhancement** (`useVenues.ts`):

```typescript
interface UseVenuesOptions {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  type?: string
  cityId?: number
  sort?: string
}
```

**New hooks**:

- `useVenue(documentId)` - Single venue with relations
- `useVenueMutations()` - Create, update, delete, bulk status update
- `useCities(regionId?)` - Cities list with optional region filter
- `useRegions()` - Regions list

### 7. Status Management

**Decision**: Color-coded badges with bulk actions

| Status    | Badge Color      | Meaning              |
| --------- | ---------------- | -------------------- |
| pending   | warning (orange) | Awaiting review      |
| approved  | success (green)  | Active, visible      |
| suspended | danger (red)     | Temporarily disabled |

**Bulk action flow**:

1. Select venues via checkboxes
2. Click "Bulk Actions" dropdown
3. Choose action (Approve/Suspend)
4. Confirm in dialog
5. Execute API call
6. Refresh list

## Risks / Trade-offs

| Risk                         | Impact                                       | Mitigation                                              |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Geography plugin dependency  | Venue creation fails if geography not seeded | Show helpful error message; document prerequisite       |
| Large venue list performance | Slow loading with 500+ venues                | Server-side pagination; virtual scrolling if needed     |
| Localization complexity      | Multiple fields need translation             | Focus MVP on French/Arabic; add language switcher later |

## Open Questions

1. **Map preview**: Should we add a static map preview for coordinates?

   - Recommendation: Defer to future iteration. Users can verify in Google Maps.

2. **Manager assignment**: Should we auto-assign current user as manager on create?

   - Recommendation: Yes, with ability to change.

3. **Venue duplication**: Should we support cloning a venue?
   - Recommendation: Defer. Less common operation than event duplication.
