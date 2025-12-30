# Story 2A.8: Discovery Components - SearchResults

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the SearchResults component for displaying search outcomes,
So that users can see results from their search queries.

---

## Acceptance Criteria

1. **Given** SearchBar and EventCard components exist
   **When** I create the SearchResults component
   **Then** the component is created at `src/features/search/components/SearchResults/`

2. **And** it displays:

   - Result count header ("X résultats pour 'query'")
   - List of EventCard components
   - "No results" empty state with suggestions
   - Loading state with Skeleton cards
   - Filter chips for active filters

3. **And** supports infinite scroll loading pattern

4. **And** Storybook stories exist for:

   - Results found state
   - No results state
   - Loading state

5. **And** component works in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create SearchResults Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/search/components/SearchResults/`
  - [ ] 1.2 Define SearchResultsProps interface
  - [ ] 1.3 Implement result count header
  - [ ] 1.4 Render list of EventCard components
  - [ ] 1.5 Create empty state component
  - [ ] 1.6 Create loading state with skeletons
  - [ ] 1.7 Add filter chips display
  - [ ] 1.8 Add remove filter callback

- [ ] **Task 2: Implement Infinite Scroll** (AC: #3)

  - [ ] 2.1 Add intersection observer for load more
  - [ ] 2.2 Add loading indicator at bottom
  - [ ] 2.3 Implement `onLoadMore` callback
  - [ ] 2.4 Handle hasMore state

- [ ] **Task 3: Create Storybook Stories** (AC: #4)

  - [ ] 3.1 Create SearchResults.stories.tsx
  - [ ] 3.2 Add WithResults story
  - [ ] 3.3 Add NoResults story
  - [ ] 3.4 Add Loading story
  - [ ] 3.5 Add WithFilters story

- [ ] **Task 4: RTL Support** (AC: #5)
  - [ ] 4.1 Align result count text correctly
  - [ ] 4.2 Position filter chips correctly
  - [ ] 4.3 Add RTL story

---

## Dev Notes

### SearchResults Props

```typescript
export interface SearchResultsProps {
  query: string
  results: EventCardEvent[]
  totalCount: number
  isLoading?: boolean
  hasMore?: boolean
  activeFilters?: Array<{ key: string; label: string }>
  onLoadMore?: () => void
  onRemoveFilter?: (key: string) => void
  onEventClick?: (event: EventCardEvent) => void
  onWatchlist?: (eventId: string) => void
  labels?: SearchResultsLabels
  className?: string
}

export interface SearchResultsLabels {
  resultsFor: (count: number, query: string) => string
  noResults: string
  noResultsSuggestion: string
  loading: string
}
```

### Empty State

Use EmptyState pattern:

- Illustration (optional)
- "Aucun résultat pour '[query]'"
- Suggestions: "Essayez une autre recherche" or category links

### File Structure

```
apps/client/src/features/search/components/
├── SearchBar/
├── SearchResults/
│   ├── SearchResults.tsx
│   ├── SearchResultsEmpty.tsx
│   ├── SearchResultsSkeleton.tsx
│   ├── SearchResults.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.8]
- Pattern Reference: `apps/client/src/features/events/components/EventCard/`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/search/components/SearchResults/SearchResults.tsx` (to create)
- `apps/client/src/features/search/components/SearchResults/SearchResultsEmpty.tsx` (to create)
- `apps/client/src/features/search/components/SearchResults/SearchResultsSkeleton.tsx` (to create)
- `apps/client/src/features/search/components/SearchResults/SearchResults.stories.tsx` (to create)
- `apps/client/src/features/search/components/SearchResults/index.ts` (to create)
