# Story 2A.20: Scanner Components - TicketScanner and ValidationResult

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create TicketScanner and ValidationResult components,
So that venue staff can scan and validate tickets at entry.

---

## Acceptance Criteria

1. **Given** TicketQR component exists
   **When** I create TicketScanner and ValidationResult components
   **Then** TicketScanner is created at `src/features/scanner/components/TicketScanner/`

2. **And** TicketScanner has:

   - Camera viewfinder area
   - Scan overlay/guide
   - Event selector dropdown
   - Attendance counter display
   - Flash toggle button
   - Manual entry fallback button

3. **And** ValidationResult is created at `src/features/scanner/components/ValidationResult/` with:

   - Large status icon (✓ green, ✕ red, ⚠ yellow)
   - Status message ("Valide", "Déjà scanné", "Non trouvé", "Mauvais événement")
   - Ticket details (when valid)
   - Scan timestamp (when already scanned)
   - Auto-dismiss after 2 seconds

4. **And** high contrast for dark venue visibility

5. **And** audio feedback indicators (visual representation)

6. **And** Storybook stories show all validation states

7. **And** components optimized for high-throughput scanning

---

## Tasks / Subtasks

- [ ] **Task 1: Create TicketScanner Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/scanner/components/TicketScanner/`
  - [ ] 1.2 Define TicketScannerProps interface
  - [ ] 1.3 Implement camera viewfinder area (placeholder for Storybook)
  - [ ] 1.4 Add scan overlay/guide frame
  - [ ] 1.5 Add event selector dropdown
  - [ ] 1.6 Add attendance counter display
  - [ ] 1.7 Add flash toggle button
  - [ ] 1.8 Add manual entry button

- [ ] **Task 2: Create ValidationResult Component** (AC: #3, #4)

  - [ ] 2.1 Create directory `src/features/scanner/components/ValidationResult/`
  - [ ] 2.2 Define ValidationResultProps interface
  - [ ] 2.3 Implement large status icon
  - [ ] 2.4 Add status message display
  - [ ] 2.5 Add ticket details section
  - [ ] 2.6 Add scan timestamp display
  - [ ] 2.7 Implement auto-dismiss timer
  - [ ] 2.8 Add high contrast styling

- [ ] **Task 3: Visual Feedback** (AC: #5)

  - [ ] 3.1 Add visual indicator for success beep
  - [ ] 3.2 Add visual indicator for error beep
  - [ ] 3.3 Add vibration animation for feedback

- [ ] **Task 4: Storybook Stories** (AC: #6)

  - [ ] 4.1 Create TicketScanner.stories.tsx
  - [ ] 4.2 Add ScannerReady, Scanning, WithEvent stories
  - [ ] 4.3 Create ValidationResult.stories.tsx
  - [ ] 4.4 Add Valid, AlreadyScanned, NotFound, WrongEvent stories

- [ ] **Task 5: Performance** (AC: #7)
  - [ ] 5.1 Optimize for quick render cycles
  - [ ] 5.2 Minimize re-renders during scanning
  - [ ] 5.3 Test with rapid succession scans

---

## Dev Notes

### TicketScanner Props

```typescript
export interface TicketScannerEvent {
  id: string
  title: string
  date: string
  scannedCount: number
  totalTickets: number
}

export interface TicketScannerProps {
  events: TicketScannerEvent[]
  selectedEventId?: string
  onEventChange: (eventId: string) => void
  onScan: (qrData: string) => void
  onManualEntry: () => void
  isFlashOn?: boolean
  onFlashToggle?: () => void
  className?: string
}
```

### ValidationResult Props

```typescript
export type ValidationStatus =
  | "valid"
  | "already-scanned"
  | "not-found"
  | "wrong-event"

export interface ValidationResultProps {
  status: ValidationStatus
  ticketDetails?: {
    ticketId: string
    eventTitle: string
    quantity: number
    holderName?: string
  }
  scannedAt?: Date // For already-scanned status
  autoDismissMs?: number // Default 2000
  onDismiss?: () => void
  className?: string
  labels?: ValidationResultLabels
}
```

### Status Styling

```typescript
const statusStyles = {
  valid: {
    bg: "bg-green-500",
    icon: "CheckCircle",
    message: "Valide",
  },
  "already-scanned": {
    bg: "bg-red-500",
    icon: "XCircle",
    message: "Déjà scanné",
  },
  "not-found": {
    bg: "bg-red-500",
    icon: "XCircle",
    message: "Non trouvé",
  },
  "wrong-event": {
    bg: "bg-yellow-500",
    icon: "AlertTriangle",
    message: "Mauvais événement",
  },
}
```

### High Contrast Design

For dark venue visibility:

- Large icons (64px+)
- Bold status messages
- High contrast backgrounds
- Avoid subtle gradients

### File Structure

```
apps/client/src/features/scanner/components/
├── TicketScanner/
│   ├── TicketScanner.tsx
│   ├── ScannerViewfinder.tsx
│   ├── TicketScanner.stories.tsx
│   └── index.ts
├── ValidationResult/
│   ├── ValidationResult.tsx
│   ├── ValidationResult.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.20]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Scanner UX Requirements]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/scanner/components/TicketScanner/TicketScanner.tsx` (to create)
- `apps/client/src/features/scanner/components/TicketScanner/ScannerViewfinder.tsx` (to create)
- `apps/client/src/features/scanner/components/TicketScanner/TicketScanner.stories.tsx` (to create)
- `apps/client/src/features/scanner/components/TicketScanner/index.ts` (to create)
- `apps/client/src/features/scanner/components/ValidationResult/ValidationResult.tsx` (to create)
- `apps/client/src/features/scanner/components/ValidationResult/ValidationResult.stories.tsx` (to create)
- `apps/client/src/features/scanner/components/ValidationResult/index.ts` (to create)
- `apps/client/src/features/scanner/components/index.ts` (to create)
- `apps/client/src/features/scanner/index.ts` (to create)
