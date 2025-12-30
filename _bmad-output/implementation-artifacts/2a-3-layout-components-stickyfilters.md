# Story 2A.3: Layout Components - StickyFilters

Status: review

---

## Story

As a **developer**,
I want to create the StickyFilters component for persistent filter controls,
So that users can filter content while scrolling.

---

## Acceptance Criteria

1. **Given** layout components exist
   **When** I create the StickyFilters component
   **Then** the component is created at `src/components/layout/StickyFilters/`

2. **And** it sticks below the Header when scrolling (top: 48px)

3. **And** it contains slots for:

   - CategoryTabs (horizontal scrolling tabs)
   - DateSelector (date filter)
   - Additional filter buttons

4. **And** background uses surface color with blur effect

5. **And** component has proper z-index layering (z-30, below header's z-40)

6. **And** Storybook story exists showing sticky behavior

7. **And** component works in RTL mode

---

## Tasks / Subtasks

- [x] **Task 1: Create StickyFilters Component** (AC: #1-5)

  - [x] 1.1 Create directory structure `src/components/layout/StickyFilters/`
  - [x] 1.2 Create StickyFilters.tsx with TypeScript props interface
  - [x] 1.3 Implement `categoryTabs` slot for horizontal scrolling tabs
  - [x] 1.4 Implement `dateSelector` slot for date filter
  - [x] 1.5 Implement `filterButtons` slot for additional filter buttons
  - [x] 1.6 Add sticky positioning with `top-12` (48px below header)
  - [x] 1.7 Use z-30 for proper layering below header
  - [x] 1.8 Add surface background with `bg-secondary/95 backdrop-blur-md`
  - [x] 1.9 Add `isSticky` prop for conditional border/shadow styling
  - [x] 1.10 Create index.ts for exports

- [x] **Task 2: Create Storybook Stories** (AC: #6)

  - [x] 2.1 Create StickyFilters.stories.tsx
  - [x] 2.2 Create mock CategoryTabs component for stories
  - [x] 2.3 Create mock DateSelector component for stories
  - [x] 2.4 Create mock FilterButtons component for stories
  - [x] 2.5 Add Default story with all slots filled
  - [x] 2.6 Add CategoryTabsOnly, DateSelectorOnly, WithFilters stories
  - [x] 2.7 Add StickyState story showing border/shadow when stuck
  - [x] 2.8 Add CompleteLayout story showing full page integration
  - [x] 2.9 Add ScrollDemo story demonstrating sticky behavior
  - [x] 2.10 Add Empty story for minimum render state

- [x] **Task 3: RTL Support** (AC: #7)

  - [x] 3.1 Create Arabic mock components for stories
  - [x] 3.2 Add RTLMode story with Arabic content
  - [x] 3.3 Add `labels` prop for localization
  - [x] 3.4 Verify horizontal scroll direction works in RTL

- [x] **Task 4: Update Exports** (AC: #1)
  - [x] 4.1 Update `src/components/layout/index.ts` to export StickyFilters

---

## Dev Notes

### Component Props Interface

```typescript
export interface StickyFiltersProps {
  categoryTabs?: React.ReactNode
  dateSelector?: React.ReactNode
  filterButtons?: React.ReactNode
  isSticky?: boolean
  className?: string
  labels?: StickyFiltersLabels
}

export interface StickyFiltersLabels {
  filters: string
}
```

### Design Tokens Used

- `--secondary`: Surface background color (#0A3533)
- `--border`: For bottom border when sticky
- `--muted`: For inactive filter items
- `--primary`: For active filter items (yellow)

### Z-Index Layering

- Header: z-40
- StickyFilters: z-30
- BottomNav: z-50

### Responsive Behavior

- Horizontal scrolling for CategoryTabs and DateSelector
- Uses `no-scrollbar` utility to hide scrollbar
- Negative margins (`-mx-4`) with padding (`px-4`) for edge-to-edge scrolling
- Filter buttons are fixed on the right, don't scroll

### File Structure

```
apps/client/src/components/layout/
├── BottomNav/
├── Header/
├── PageContainer/
├── StickyFilters/
│   ├── StickyFilters.tsx
│   ├── StickyFilters.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.3]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#StickyFilters]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Uses slot pattern for flexible content composition
- Mock components created for Storybook demonstrations
- Sticky behavior achieved with `sticky top-12`
- Blur effect for glass-like appearance

### Completion Notes List

- Created StickyFilters component at `src/components/layout/StickyFilters/`
- Component sticks below Header (top: 48px) when scrolling
- Three content slots: categoryTabs, dateSelector, filterButtons
- Background uses surface color with backdrop blur
- z-index set to 30 (below header's 40, above content)
- `isSticky` prop adds border and shadow when stuck
- Horizontal scrolling containers for tabs and dates
- Filter buttons stay fixed on the right
- Mock components demonstrate CategoryTabs, DateSelector, FilterButtons
- RTL mode with Arabic content verified
- TypeScript compiles without errors
- Storybook stories created for all variants

### File List

- `apps/client/src/components/layout/StickyFilters/StickyFilters.tsx` (created)
- `apps/client/src/components/layout/StickyFilters/StickyFilters.stories.tsx` (created)
- `apps/client/src/components/layout/StickyFilters/index.ts` (created)
- `apps/client/src/components/layout/index.ts` (updated)

### Change Log

- 2025-12-30: Created StickyFilters component with Storybook stories and RTL support
