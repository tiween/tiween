# Story 2A.21: Scanner Components - AttendanceCounter

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the AttendanceCounter component for real-time attendance tracking,
So that venue staff can monitor event attendance.

---

## Acceptance Criteria

1. **Given** TicketScanner component exists
   **When** I create the AttendanceCounter component
   **Then** the component is created at `src/features/scanner/components/AttendanceCounter/`

2. **And** it displays:

   - Scanned count / Total tickets sold
   - Progress bar visualization
   - No-show count
   - Percentage scanned

3. **And** large, readable numbers for at-a-glance viewing

4. **And** updates in real-time (accepts updated props)

5. **And** Storybook stories show various progress states

6. **And** high contrast design for visibility in dark venues

---

## Tasks / Subtasks

- [ ] **Task 1: Create AttendanceCounter Component** (AC: #1, #2, #3)

  - [ ] 1.1 Create directory `src/features/scanner/components/AttendanceCounter/`
  - [ ] 1.2 Define AttendanceCounterProps interface
  - [ ] 1.3 Implement scanned/total display
  - [ ] 1.4 Add progress bar visualization
  - [ ] 1.5 Add no-show count
  - [ ] 1.6 Add percentage calculation and display
  - [ ] 1.7 Use large, readable typography

- [ ] **Task 2: Real-time Updates** (AC: #4)

  - [ ] 2.1 Optimize for prop updates without flicker
  - [ ] 2.2 Add smooth number transitions (optional)
  - [ ] 2.3 Ensure efficient re-renders

- [ ] **Task 3: Storybook Stories** (AC: #5)

  - [ ] 3.1 Create AttendanceCounter.stories.tsx
  - [ ] 3.2 Add Empty (0/200) story
  - [ ] 3.3 Add InProgress (87/200) story
  - [ ] 3.4 Add NearlyFull (195/200) story
  - [ ] 3.5 Add Full (200/200) story

- [ ] **Task 4: High Contrast Design** (AC: #6)
  - [ ] 4.1 Use high contrast colors
  - [ ] 4.2 Large typography (24px+)
  - [ ] 4.3 Bold progress bar

---

## Dev Notes

### AttendanceCounter Props

```typescript
export interface AttendanceCounterProps {
  scannedCount: number
  totalTickets: number
  noShowCount?: number
  className?: string
  labels?: {
    scanned: string
    noShow: string
    percentage: string
  }
}
```

### Display Layout

```
┌─────────────────────────────┐
│      87 / 200               │
│   ██████████░░░░░░░░  44%   │
│                             │
│   No-shows: 13              │
└─────────────────────────────┘
```

### Typography Scale

| Element       | Size | Weight  |
| ------------- | ---- | ------- |
| Scanned count | 48px | Bold    |
| Total count   | 36px | Regular |
| Percentage    | 24px | Bold    |
| No-show label | 18px | Regular |

### Progress Bar Colors

```typescript
const progressColors = {
  low: "bg-green-500", // 0-50%
  medium: "bg-yellow-500", // 50-80%
  high: "bg-primary", // 80-100%
}
```

### High Contrast Styling

```typescript
// For dark venue visibility
const containerStyles = cn(
  "bg-background/95 backdrop-blur-sm",
  "border border-border",
  "rounded-xl p-6",
  "text-foreground"
)
```

### File Structure

```
apps/client/src/features/scanner/components/
├── TicketScanner/
├── ValidationResult/
├── AttendanceCounter/
│   ├── AttendanceCounter.tsx
│   ├── AttendanceCounter.stories.tsx
│   ├── AttendanceCounter.test.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.21]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/scanner/components/AttendanceCounter/AttendanceCounter.tsx` (to create)
- `apps/client/src/features/scanner/components/AttendanceCounter/AttendanceCounter.stories.tsx` (to create)
- `apps/client/src/features/scanner/components/AttendanceCounter/AttendanceCounter.test.tsx` (to create)
- `apps/client/src/features/scanner/components/AttendanceCounter/index.ts` (to create)
