## 1. Foundation & Hooks

- [x] 1.1 Create `useRegions()` hook - fetch regions from geography plugin
- [x] 1.2 Create `useCities(regionId?)` hook - fetch cities with optional region filter
- [x] 1.3 Enhance `useVenues()` hook - add search, status, type, city filters
  - Note: Implemented as `useVenuesList()` in `useVenuesEnhanced.ts`
- [x] 1.4 Create `useVenue(documentId)` hook - fetch single venue with relations
- [x] 1.5 Create `useVenueMutations()` hook - create, update, delete, bulk status update

## 2. Reusable Components

- [x] 2.1 Create `CitySelector` component - two-step region/city selection
- [x] 2.2 Create `VenueCard` component - compact venue display
- [x] 2.3 Create `VenueSelector` component - async search dropdown for event forms
- [x] 2.4 Create `StatusBadge` component - colored badges for pending/approved/suspended

## 3. Venues List Page

- [x] 3.1 Create `pages/Venues/index.tsx` - main venues list page
- [x] 3.2 Implement venues table with columns (Name, City, Type, Status, Capacity, Actions)
- [x] 3.3 Add search input with debounce
- [x] 3.4 Add filter dropdowns (status, type, city)
  - Note: Status and type filters implemented; city filter UI not yet added
- [x] 3.5 Add pagination controls
- [x] 3.6 Add column sorting

## 4. Venue Form Modal

- [x] 4.1 Create `components/VenueFormModal/index.tsx` - create/edit modal
- [x] 4.2 Implement Basic Info section (name, slug, type, status)
- [x] 4.3 Implement Location section (address, CitySelector, lat/lng)
- [x] 4.4 Implement Contact section (phone, email, website)
- [x] 4.5 Implement Details section (description, capacity, manager)
- [x] 4.6 Implement Media section (logo, images upload)
  - Created `MediaInput` component using Strapi's `AssetDialog` and `UploadAssetDialog`
- [x] 4.7 Add form validation for required fields
- [x] 4.8 Add auto-slug generation from name

## 5. Bulk Actions

- [x] 5.1 Add row selection checkboxes to venues table
- [x] 5.2 Create bulk actions dropdown (Approve, Suspend, Delete)
- [x] 5.3 Implement bulk status update with confirmation dialog
- [x] 5.4 Implement bulk delete with confirmation dialog

## 6. Integration

- [x] 6.1 Add "Venues" tab to events-manager HomePage.tsx
- [x] 6.2 Update event forms to use VenueSelector component
  - Note: VenueSelector component created and ready; EventCreationModal uses venue from calendar context
- [x] 6.3 Add delete protection for venues with showtimes

## 7. Polish & Testing

- [x] 7.1 Add loading states and empty states
- [x] 7.2 Add success/error notifications
- [ ] 7.3 Manual testing: create, edit, delete, bulk actions, filters
