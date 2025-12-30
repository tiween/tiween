# Story 2A.9: Ticketing Components - ShowtimeButton

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the ShowtimeButton component for showtime selection,
So that users can choose when and where to see an event.

---

## Acceptance Criteria

1. **Given** shadcn/ui Button is available
   **When** I create the ShowtimeButton component
   **Then** the component is created at `src/features/tickets/components/ShowtimeButton/`

2. **And** it displays:

   - Time (e.g., "20:30")
   - Venue name
   - Format badges (VOST, VF, 3D)

3. **And** states supported:

   - Default: dark surface background
   - Hover: lighter surface
   - Selected: yellow border and background
   - Sold out: "Complet" badge, disabled, strikethrough
   - Unavailable: dimmed, not clickable

4. **And** `onSelect` callback fires when clicked

5. **And** component has proper keyboard navigation

6. **And** Storybook stories exist for all states

7. **And** component works in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create ShowtimeButton Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/tickets/components/ShowtimeButton/`
  - [ ] 1.2 Define ShowtimeButtonProps interface
  - [ ] 1.3 Implement time display (prominent)
  - [ ] 1.4 Add venue name
  - [ ] 1.5 Add format badges (VOST, VF, 3D)
  - [ ] 1.6 Use Badge component for formats

- [ ] **Task 2: Implement States** (AC: #3)

  - [ ] 2.1 Default state styling
  - [ ] 2.2 Hover state (lighter surface)
  - [ ] 2.3 Selected state (yellow border/bg)
  - [ ] 2.4 Sold out state with "Complet" badge
  - [ ] 2.5 Unavailable state (dimmed)
  - [ ] 2.6 Add disabled attribute for non-clickable states

- [ ] **Task 3: Accessibility** (AC: #4, #5)

  - [ ] 3.1 Implement `onSelect` callback
  - [ ] 3.2 Add role="radio" in group context
  - [ ] 3.3 Add aria-disabled for unavailable
  - [ ] 3.4 Support keyboard navigation
  - [ ] 3.5 Add focus ring styling

- [ ] **Task 4: Storybook Stories** (AC: #6)

  - [ ] 4.1 Create ShowtimeButton.stories.tsx
  - [ ] 4.2 Add Default, Hover, Selected stories
  - [ ] 4.3 Add SoldOut, Unavailable stories
  - [ ] 4.4 Add WithFormats story
  - [ ] 4.5 Add Group story (multiple buttons)

- [ ] **Task 5: RTL Support** (AC: #7)
  - [ ] 5.1 Align text correctly in RTL
  - [ ] 5.2 Position badges correctly
  - [ ] 5.3 Add RTL story

---

## Dev Notes

### ShowtimeButton Props

```typescript
export type ShowtimeFormat = "VOST" | "VF" | "VO" | "3D" | "IMAX" | "4DX"
export type ShowtimeStatus =
  | "available"
  | "selected"
  | "sold-out"
  | "unavailable"

export interface ShowtimeButtonProps {
  time: string // "20:30"
  venueName: string
  formats?: ShowtimeFormat[]
  status?: ShowtimeStatus
  onSelect?: () => void
  className?: string
  labels?: {
    soldOut: string
  }
}
```

### Styling States

```typescript
const stateStyles = {
  available: "bg-secondary hover:bg-accent border-transparent",
  selected: "bg-primary/10 border-primary border-2",
  "sold-out": "bg-secondary/50 opacity-60 cursor-not-allowed",
  unavailable: "bg-secondary/30 opacity-40 cursor-not-allowed",
}
```

### File Structure

```
apps/client/src/features/tickets/components/
├── ShowtimeButton/
│   ├── ShowtimeButton.tsx
│   ├── ShowtimeButton.stories.tsx
│   ├── ShowtimeButton.test.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.9]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#ShowtimeButton]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/tickets/components/ShowtimeButton/ShowtimeButton.tsx` (to create)
- `apps/client/src/features/tickets/components/ShowtimeButton/ShowtimeButton.stories.tsx` (to create)
- `apps/client/src/features/tickets/components/ShowtimeButton/ShowtimeButton.test.tsx` (to create)
- `apps/client/src/features/tickets/components/ShowtimeButton/index.ts` (to create)
