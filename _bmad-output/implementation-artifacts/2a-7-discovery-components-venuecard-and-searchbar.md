# Story 2A.7: Discovery Components - VenueCard and SearchBar

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create VenueCard and SearchBar components,
So that users can browse venues and search for events.

---

## Acceptance Criteria

1. **Given** EventCard component exists
   **When** I create VenueCard and SearchBar components
   **Then** VenueCard is created at `src/features/venues/components/VenueCard/`

2. **And** VenueCard displays:

   - Venue image/logo
   - Venue name
   - Location/address
   - Event count ("X événements cette semaine")
   - Optional distance ("2.3 km")

3. **And** SearchBar is created at `src/features/search/components/SearchBar/` with:

   - Search icon
   - Text input with placeholder
   - Clear button when has content
   - Recent searches dropdown on focus
   - Loading state during search

4. **And** both components have Storybook stories

5. **And** SearchBar works in RTL mode (icon positions, text direction)

---

## Tasks / Subtasks

- [ ] **Task 1: Create VenueCard Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/venues/components/VenueCard/`
  - [ ] 1.2 Define VenueCardProps interface
  - [ ] 1.3 Implement venue image with fallback
  - [ ] 1.4 Add venue name display
  - [ ] 1.5 Add location/address text
  - [ ] 1.6 Add event count badge
  - [ ] 1.7 Add optional distance display
  - [ ] 1.8 Create VenueCardSkeleton for loading state
  - [ ] 1.9 Add onClick callback

- [ ] **Task 2: Create SearchBar Component** (AC: #3)

  - [ ] 2.1 Create directory `src/features/search/components/SearchBar/`
  - [ ] 2.2 Define SearchBarProps interface
  - [ ] 2.3 Implement search input with icon
  - [ ] 2.4 Add clear button (X) when has content
  - [ ] 2.5 Implement recent searches dropdown
  - [ ] 2.6 Add loading spinner state
  - [ ] 2.7 Implement `onSearch` callback
  - [ ] 2.8 Store recent searches in localStorage

- [ ] **Task 3: Create Storybook Stories** (AC: #4)

  - [ ] 3.1 Create VenueCard.stories.tsx
  - [ ] 3.2 Add stories: Default, WithDistance, NoEvents, Loading
  - [ ] 3.3 Create SearchBar.stories.tsx
  - [ ] 3.4 Add stories: Empty, WithValue, Loading, WithRecents

- [ ] **Task 4: RTL Support** (AC: #5)
  - [ ] 4.1 Position search icon correctly in RTL
  - [ ] 4.2 Position clear button correctly in RTL
  - [ ] 4.3 Add RTL stories

---

## Dev Notes

### VenueCard Props

```typescript
export interface VenueCardVenue {
  id: string | number
  name: string
  imageUrl?: string
  address: string
  city?: string
  eventCount?: number
  distance?: number // in km
}

export interface VenueCardProps {
  venue: VenueCardVenue
  onClick?: () => void
  className?: string
}
```

### SearchBar Props

```typescript
export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  onClear?: () => void
  isLoading?: boolean
  recentSearches?: string[]
  placeholder?: string
  className?: string
}
```

### File Structure

```
apps/client/src/features/
├── venues/
│   ├── components/
│   │   ├── VenueCard/
│   │   │   ├── VenueCard.tsx
│   │   │   ├── VenueCardSkeleton.tsx
│   │   │   ├── VenueCard.stories.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
├── search/
│   ├── components/
│   │   ├── SearchBar/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchBar.stories.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.7]
- Pattern Reference: `apps/client/src/features/events/components/EventCard/`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/venues/components/VenueCard/VenueCard.tsx` (to create)
- `apps/client/src/features/venues/components/VenueCard/VenueCardSkeleton.tsx` (to create)
- `apps/client/src/features/venues/components/VenueCard/VenueCard.stories.tsx` (to create)
- `apps/client/src/features/venues/components/VenueCard/index.ts` (to create)
- `apps/client/src/features/search/components/SearchBar/SearchBar.tsx` (to create)
- `apps/client/src/features/search/components/SearchBar/SearchBar.stories.tsx` (to create)
- `apps/client/src/features/search/components/SearchBar/index.ts` (to create)
