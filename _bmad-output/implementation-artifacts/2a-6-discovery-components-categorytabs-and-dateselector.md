# Story 2A.6: Discovery Components - CategoryTabs and DateSelector

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create CategoryTabs and DateSelector filter components,
So that users can filter events by category and date.

---

## Acceptance Criteria

1. **Given** StickyFilters layout component exists
   **When** I create CategoryTabs and DateSelector components
   **Then** CategoryTabs is created at `src/features/events/components/CategoryTabs/`

2. **And** CategoryTabs has:

   - Horizontal scrolling tabs
   - Categories: Tout, Cinéma, Théâtre, Courts-métrages, Musique, Expositions
   - Active tab has yellow underline and text
   - Touch-friendly tap targets
   - Scroll indicators when content overflows

3. **And** DateSelector is created at `src/features/events/components/DateSelector/` with:

   - Horizontal scrolling date chips
   - "Aujourd'hui", "Demain", specific dates (e.g., "Ven. 16")
   - Selected date has yellow background
   - "Custom" option opens date picker

4. **And** both components have Storybook stories

5. **And** components work in RTL mode (scroll direction, text alignment)

---

## Tasks / Subtasks

- [ ] **Task 1: Create CategoryTabs Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/events/components/CategoryTabs/`
  - [ ] 1.2 Define CategoryTabsProps interface
  - [ ] 1.3 Implement horizontal scroll container with `no-scrollbar`
  - [ ] 1.4 Create tab items for each category
  - [ ] 1.5 Style active tab (yellow underline + text)
  - [ ] 1.6 Style inactive tabs (muted color)
  - [ ] 1.7 Ensure 44px minimum tap targets
  - [ ] 1.8 Add scroll indicators (fade gradients at edges)
  - [ ] 1.9 Implement `onCategoryChange` callback
  - [ ] 1.10 Add labels prop for i18n

- [ ] **Task 2: Create DateSelector Component** (AC: #3)

  - [ ] 2.1 Create directory `src/features/events/components/DateSelector/`
  - [ ] 2.2 Define DateSelectorProps interface
  - [ ] 2.3 Implement horizontal scroll container
  - [ ] 2.4 Generate date chips (today, tomorrow, next 5 days)
  - [ ] 2.5 Format dates localized ("Aujourd'hui", "Ven. 16")
  - [ ] 2.6 Style selected date chip (yellow background)
  - [ ] 2.7 Add "Custom" chip for date picker
  - [ ] 2.8 Integrate with shadcn Calendar for custom date
  - [ ] 2.9 Implement `onDateChange` callback

- [ ] **Task 3: Create Storybook Stories** (AC: #4)

  - [ ] 3.1 Create CategoryTabs.stories.tsx
  - [ ] 3.2 Add stories: Default, CinemaActive, WithScroll
  - [ ] 3.3 Create DateSelector.stories.tsx
  - [ ] 3.4 Add stories: Today, Tomorrow, CustomDate, WithCalendar

- [ ] **Task 4: RTL Support** (AC: #5)
  - [ ] 4.1 Test scroll direction in RTL
  - [ ] 4.2 Align text correctly in RTL
  - [ ] 4.3 Add RTL stories with Arabic labels

---

## Dev Notes

### CategoryTabs Props

```typescript
export type CategoryType =
  | "all"
  | "cinema"
  | "theater"
  | "shorts"
  | "music"
  | "exhibitions"

export interface CategoryTabsLabels {
  all: string
  cinema: string
  theater: string
  shorts: string
  music: string
  exhibitions: string
}

export interface CategoryTabsProps {
  activeCategory: CategoryType
  onCategoryChange: (category: CategoryType) => void
  labels?: CategoryTabsLabels
  className?: string
}
```

### DateSelector Props

```typescript
export interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  locale?: string
  labels?: {
    today: string
    tomorrow: string
    custom: string
  }
  className?: string
}
```

### Styling Pattern

```typescript
// Active tab
className={cn(
  "border-b-2",
  isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground"
)}

// Selected date chip
className={cn(
  "rounded-full px-4 py-2",
  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
)}
```

### File Structure

```
apps/client/src/features/events/components/
├── CategoryTabs/
│   ├── CategoryTabs.tsx
│   ├── CategoryTabs.stories.tsx
│   └── index.ts
├── DateSelector/
│   ├── DateSelector.tsx
│   ├── DateSelector.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.6]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#CategoryTabs]
- Pattern Reference: `apps/client/src/components/layout/StickyFilters/`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/events/components/CategoryTabs/CategoryTabs.tsx` (to create)
- `apps/client/src/features/events/components/CategoryTabs/CategoryTabs.stories.tsx` (to create)
- `apps/client/src/features/events/components/CategoryTabs/index.ts` (to create)
- `apps/client/src/features/events/components/DateSelector/DateSelector.tsx` (to create)
- `apps/client/src/features/events/components/DateSelector/DateSelector.stories.tsx` (to create)
- `apps/client/src/features/events/components/DateSelector/index.ts` (to create)
