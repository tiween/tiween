# Story 2A.10: Ticketing Components - QuantitySelector and OrderSummary

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create QuantitySelector and OrderSummary components,
So that users can select ticket quantities and review their order.

---

## Acceptance Criteria

1. **Given** ShowtimeButton component exists
   **When** I create QuantitySelector and OrderSummary components
   **Then** QuantitySelector is created at `src/features/tickets/components/QuantitySelector/`

2. **And** QuantitySelector has:

   - Minus and Plus buttons
   - Current quantity display
   - Min/max limits (e.g., 1-10)
   - Disabled state when at limits
   - Ticket type label (e.g., "Plein tarif", "Tarif réduit")
   - Unit price display

3. **And** OrderSummary is created at `src/features/tickets/components/OrderSummary/` with:

   - Event title and showtime
   - Line items (ticket type × quantity × price)
   - Subtotal
   - Service fee (if applicable)
   - Total in TND

4. **And** both components have Storybook stories

5. **And** currency displays as "X,XX DT" format

6. **And** components work in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create QuantitySelector Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/tickets/components/QuantitySelector/`
  - [ ] 1.2 Define QuantitySelectorProps interface
  - [ ] 1.3 Implement minus button with icon
  - [ ] 1.4 Implement quantity display
  - [ ] 1.5 Implement plus button with icon
  - [ ] 1.6 Add min/max validation
  - [ ] 1.7 Disable buttons at limits
  - [ ] 1.8 Add ticket type label
  - [ ] 1.9 Add unit price display
  - [ ] 1.10 Implement `onChange` callback

- [ ] **Task 2: Create OrderSummary Component** (AC: #3, #5)

  - [ ] 2.1 Create directory `src/features/tickets/components/OrderSummary/`
  - [ ] 2.2 Define OrderSummaryProps interface
  - [ ] 2.3 Display event title
  - [ ] 2.4 Display showtime info
  - [ ] 2.5 Render line items
  - [ ] 2.6 Calculate and display subtotal
  - [ ] 2.7 Display service fee (conditional)
  - [ ] 2.8 Display total with "X,XX DT" format
  - [ ] 2.9 Create formatCurrency utility if not exists

- [ ] **Task 3: Storybook Stories** (AC: #4)

  - [ ] 3.1 Create QuantitySelector.stories.tsx
  - [ ] 3.2 Add Default, AtMin, AtMax stories
  - [ ] 3.3 Create OrderSummary.stories.tsx
  - [ ] 3.4 Add SingleTicket, MultipleTickets, WithServiceFee stories

- [ ] **Task 4: RTL Support** (AC: #6)
  - [ ] 4.1 Position +/- buttons correctly in RTL
  - [ ] 4.2 Align prices correctly in RTL
  - [ ] 4.3 Add RTL stories

---

## Dev Notes

### QuantitySelector Props

```typescript
export interface QuantitySelectorProps {
  quantity: number
  min?: number // default 1
  max?: number // default 10
  ticketType: string
  unitPrice: number
  currency?: string // default "DT"
  onChange: (quantity: number) => void
  className?: string
}
```

### OrderSummary Props

```typescript
export interface OrderLineItem {
  ticketType: string
  quantity: number
  unitPrice: number
}

export interface OrderSummaryProps {
  eventTitle: string
  showtime: string // "20:30 - Cinéma Le Colisée"
  items: OrderLineItem[]
  serviceFee?: number
  currency?: string // default "DT"
  className?: string
}
```

### Currency Formatting

```typescript
// Use French locale for comma separator
export function formatCurrency(amount: number, currency = "DT"): string {
  return `${amount.toFixed(2).replace(".", ",")} ${currency}`
}
// Example: 25.50 → "25,50 DT"
```

### File Structure

```
apps/client/src/features/tickets/components/
├── ShowtimeButton/
├── QuantitySelector/
│   ├── QuantitySelector.tsx
│   ├── QuantitySelector.stories.tsx
│   └── index.ts
├── OrderSummary/
│   ├── OrderSummary.tsx
│   ├── OrderSummary.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.10]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/tickets/components/QuantitySelector/QuantitySelector.tsx` (to create)
- `apps/client/src/features/tickets/components/QuantitySelector/QuantitySelector.stories.tsx` (to create)
- `apps/client/src/features/tickets/components/QuantitySelector/index.ts` (to create)
- `apps/client/src/features/tickets/components/OrderSummary/OrderSummary.tsx` (to create)
- `apps/client/src/features/tickets/components/OrderSummary/OrderSummary.stories.tsx` (to create)
- `apps/client/src/features/tickets/components/OrderSummary/index.ts` (to create)
- `apps/client/src/lib/utils/formatCurrency.ts` (to create if not exists)
