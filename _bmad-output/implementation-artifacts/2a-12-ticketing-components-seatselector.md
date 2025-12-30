# Story 2A.12: Ticketing Components - SeatSelector

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the SeatSelector component for reserved seating,
So that users can choose specific seats when applicable.

---

## Acceptance Criteria

1. **Given** TicketQR component exists
   **When** I create the SeatSelector component
   **Then** the component is created at `src/features/tickets/components/SeatSelector/`

2. **And** it displays:

   - Screen indicator at top
   - Grid of seats by row (A, B, C...) and number (1, 2, 3...)
   - Legend showing: Available (○), Selected (●), Taken (×), Wheelchair (◆)

3. **And** seat states:

   - Available: outline, tappable
   - Selected: filled yellow
   - Taken: filled gray, not tappable
   - Wheelchair: diamond shape for accessible spots

4. **And** `maxSeats` prop limits selection count

5. **And** `onSelect` callback returns selected seats array

6. **And** grid supports keyboard navigation (arrow keys)

7. **And** Storybook stories show various venue layouts

8. **And** component works in RTL mode (row labels on right)

---

## Tasks / Subtasks

- [ ] **Task 1: Create SeatSelector Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/tickets/components/SeatSelector/`
  - [ ] 1.2 Define SeatSelectorProps and SeatLayout interfaces
  - [ ] 1.3 Implement screen indicator
  - [ ] 1.4 Implement seat grid layout
  - [ ] 1.5 Render row labels (A, B, C...)
  - [ ] 1.6 Render seat numbers (1, 2, 3...)
  - [ ] 1.7 Implement legend component

- [ ] **Task 2: Implement Seat States** (AC: #3)

  - [ ] 2.1 Available state (outline, clickable)
  - [ ] 2.2 Selected state (filled yellow)
  - [ ] 2.3 Taken state (filled gray, disabled)
  - [ ] 2.4 Wheelchair accessible state (diamond shape)

- [ ] **Task 3: Selection Logic** (AC: #4, #5)

  - [ ] 3.1 Track selected seats array
  - [ ] 3.2 Enforce maxSeats limit
  - [ ] 3.3 Toggle seat selection on click
  - [ ] 3.4 Implement onSelect callback

- [ ] **Task 4: Keyboard Navigation** (AC: #6)

  - [ ] 4.1 Add arrow key navigation
  - [ ] 4.2 Add Enter/Space to select
  - [ ] 4.3 Focus management between seats
  - [ ] 4.4 Add aria-labels for seats

- [ ] **Task 5: Storybook Stories** (AC: #7)

  - [ ] 5.1 Create SeatSelector.stories.tsx
  - [ ] 5.2 Add SmallVenue story
  - [ ] 5.3 Add LargeVenue story
  - [ ] 5.4 Add WithSelected story
  - [ ] 5.5 Add WithWheelchair story

- [ ] **Task 6: RTL Support** (AC: #8)
  - [ ] 6.1 Position row labels on right in RTL
  - [ ] 6.2 Reverse seat numbering direction
  - [ ] 6.3 Add RTL story

---

## Dev Notes

### SeatSelector Props

```typescript
export type SeatStatus = "available" | "selected" | "taken" | "wheelchair"

export interface Seat {
  row: string // "A", "B", "C"
  number: number // 1, 2, 3
  status: SeatStatus
}

export interface SeatLayout {
  rows: string[] // ["A", "B", "C", "D"]
  seatsPerRow: number
  seats: Seat[]
  screenLabel?: string
}

export interface SeatSelectorProps {
  layout: SeatLayout
  selectedSeats?: Seat[]
  maxSeats?: number
  onSelect: (seats: Seat[]) => void
  className?: string
  labels?: {
    screen: string
    available: string
    selected: string
    taken: string
    wheelchair: string
  }
}
```

### Seat Styling

```typescript
const seatStyles = {
  available:
    "border-2 border-muted-foreground hover:border-primary cursor-pointer",
  selected: "bg-primary border-primary",
  taken: "bg-muted cursor-not-allowed",
  wheelchair: "border-2 border-blue-500 rotate-45", // Diamond shape
}
```

### Grid Layout

```
       [SCREEN]
   1  2  3  4  5  6  7  8
A  ○  ○  ●  ●  ○  ○  ○  ○
B  ○  ○  ○  ○  ○  ○  ○  ○
C  ○  ○  ○  ○  ×  ×  ○  ○
D  ○  ○  ○  ○  ○  ○  ○  ◆

Legend: ○ Available  ● Selected  × Taken  ◆ Wheelchair
```

### File Structure

```
apps/client/src/features/tickets/components/
├── SeatSelector/
│   ├── SeatSelector.tsx
│   ├── SeatLegend.tsx
│   ├── SeatSelector.stories.tsx
│   ├── SeatSelector.test.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.12]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#SeatSelector]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/tickets/components/SeatSelector/SeatSelector.tsx` (to create)
- `apps/client/src/features/tickets/components/SeatSelector/SeatLegend.tsx` (to create)
- `apps/client/src/features/tickets/components/SeatSelector/SeatSelector.stories.tsx` (to create)
- `apps/client/src/features/tickets/components/SeatSelector/SeatSelector.test.tsx` (to create)
- `apps/client/src/features/tickets/components/SeatSelector/index.ts` (to create)
