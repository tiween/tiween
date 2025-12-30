# Story 2A.11: Ticketing Components - TicketQR

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the TicketQR component for displaying ticket QR codes,
So that users can present their tickets for scanning at events.

---

## Acceptance Criteria

1. **Given** OrderSummary component exists
   **When** I create the TicketQR component
   **Then** the component is created at `src/features/tickets/components/TicketQR/`

2. **And** it displays:

   - Large QR code (centered, high contrast black on white)
   - Ticket ID (e.g., "TIW-2024-XXXX")
   - Event title
   - Date, time, venue
   - Ticket count ("2 billets")
   - "Add to Wallet" button (optional)
   - "Share" button

3. **And** size variants: `small` (list view), `large` (detail view)

4. **And** states supported:

   - Valid: green accent border
   - Scanned: checkmark overlay with scan time
   - Expired: dimmed with "Événement passé"
   - Offline: "Fonctionne hors ligne" badge

5. **And** QR uses dummy data (static image) for Storybook

6. **And** Storybook stories exist for all states

7. **And** high brightness option for better scanning

---

## Tasks / Subtasks

- [ ] **Task 1: Create TicketQR Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/tickets/components/TicketQR/`
  - [ ] 1.2 Define TicketQRProps interface
  - [ ] 1.3 Implement QR code container (use qrcode.react or static image)
  - [ ] 1.4 Display ticket ID
  - [ ] 1.5 Display event title
  - [ ] 1.6 Display date, time, venue
  - [ ] 1.7 Display ticket count
  - [ ] 1.8 Add "Add to Wallet" button
  - [ ] 1.9 Add "Share" button

- [ ] **Task 2: Implement Size Variants** (AC: #3)

  - [ ] 2.1 Implement `small` variant (compact, for lists)
  - [ ] 2.2 Implement `large` variant (full detail view)
  - [ ] 2.3 Adjust QR code size per variant

- [ ] **Task 3: Implement States** (AC: #4)

  - [ ] 3.1 Valid state (green border accent)
  - [ ] 3.2 Scanned state (checkmark overlay + time)
  - [ ] 3.3 Expired state (dimmed + "Événement passé")
  - [ ] 3.4 Offline state (badge indicator)

- [ ] **Task 4: Storybook Stories** (AC: #5, #6)

  - [ ] 4.1 Create TicketQR.stories.tsx
  - [ ] 4.2 Use static QR image for stories
  - [ ] 4.3 Add Valid, Scanned, Expired, Offline stories
  - [ ] 4.4 Add Small, Large variant stories

- [ ] **Task 5: High Brightness Option** (AC: #7)
  - [ ] 5.1 Add `highBrightness` prop
  - [ ] 5.2 Increase background brightness when enabled
  - [ ] 5.3 Add story for high brightness mode

---

## Dev Notes

### TicketQR Props

```typescript
export type TicketStatus = "valid" | "scanned" | "expired"

export interface TicketQRTicket {
  id: string // "TIW-2024-XXXX"
  qrData: string
  eventTitle: string
  date: string
  time: string
  venueName: string
  quantity: number
  status: TicketStatus
  scannedAt?: Date
}

export interface TicketQRProps {
  ticket: TicketQRTicket
  size?: "small" | "large"
  isOffline?: boolean
  highBrightness?: boolean
  onAddToWallet?: () => void
  onShare?: () => void
  showActions?: boolean
  className?: string
}
```

### QR Code Library

For Storybook: use static placeholder image
For production: use `qrcode.react` library

```typescript
// Production (later)
import { QRCodeSVG } from "qrcode.react"

// Storybook placeholder
const QR_PLACEHOLDER = "/images/qr-placeholder.png"
```

### State Styling

```typescript
const statusStyles = {
  valid: "border-green-500 border-2",
  scanned: "opacity-70",
  expired: "opacity-50 grayscale",
}
```

### File Structure

```
apps/client/src/features/tickets/components/
├── TicketQR/
│   ├── TicketQR.tsx
│   ├── TicketQR.stories.tsx
│   ├── TicketQR.test.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.11]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#TicketQR]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/tickets/components/TicketQR/TicketQR.tsx` (to create)
- `apps/client/src/features/tickets/components/TicketQR/TicketQR.stories.tsx` (to create)
- `apps/client/src/features/tickets/components/TicketQR/TicketQR.test.tsx` (to create)
- `apps/client/src/features/tickets/components/TicketQR/index.ts` (to create)
- `apps/client/public/images/qr-placeholder.png` (to create for Storybook)
