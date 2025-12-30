# Story 2A.13: Ticketing Components - PaymentForm

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the PaymentForm component for checkout,
So that users can enter payment information to complete purchases.

---

## Acceptance Criteria

1. **Given** SeatSelector component exists
   **When** I create the PaymentForm component
   **Then** the component is created at `src/features/tickets/components/PaymentForm/`

2. **And** it displays:

   - Payment method selector (e-Dinar, Sobflous, D17, Flouci, Carte bancaire)
   - Method-specific form fields
   - Terms acceptance checkbox
   - Submit button with loading state

3. **And** form validation using Zod schemas

4. **And** error states for invalid fields

5. **And** payment method icons/logos

6. **And** secure badge indicator

7. **And** Storybook stories show all payment methods

8. **And** form works in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create PaymentForm Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/features/tickets/components/PaymentForm/`
  - [ ] 1.2 Define PaymentFormProps interface
  - [ ] 1.3 Implement payment method selector
  - [ ] 1.4 Add payment method icons/logos
  - [ ] 1.5 Implement method-specific fields
  - [ ] 1.6 Add terms checkbox
  - [ ] 1.7 Add submit button with loading

- [ ] **Task 2: Form Validation** (AC: #3, #4)

  - [ ] 2.1 Create Zod validation schemas
  - [ ] 2.2 Implement inline error display
  - [ ] 2.3 Validate on blur and submit
  - [ ] 2.4 Handle server validation errors

- [ ] **Task 3: Visual Elements** (AC: #5, #6)

  - [ ] 3.1 Add payment method icons
  - [ ] 3.2 Add secure badge (lock icon)
  - [ ] 3.3 Style active payment method

- [ ] **Task 4: Storybook Stories** (AC: #7)

  - [ ] 4.1 Create PaymentForm.stories.tsx
  - [ ] 4.2 Add stories for each payment method
  - [ ] 4.3 Add ValidationError story
  - [ ] 4.4 Add Loading story

- [ ] **Task 5: RTL Support** (AC: #8)
  - [ ] 5.1 Align form fields correctly
  - [ ] 5.2 Position icons correctly
  - [ ] 5.3 Add RTL story

---

## Dev Notes

### PaymentForm Props

```typescript
export type PaymentMethod = "e-dinar" | "sobflous" | "d17" | "flouci" | "card"

export interface PaymentFormProps {
  selectedMethod?: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  onSubmit: (data: PaymentFormData) => void
  isLoading?: boolean
  error?: string
  className?: string
  labels?: PaymentFormLabels
}

export interface PaymentFormData {
  method: PaymentMethod
  cardNumber?: string
  expiryDate?: string
  cvv?: string
  phone?: string // For mobile payment methods
  acceptTerms: boolean
}
```

### Zod Validation Schema

```typescript
import { z } from "zod"

export const paymentFormSchema = z
  .object({
    method: z.enum(["e-dinar", "sobflous", "d17", "flouci", "card"]),
    cardNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),
    phone: z.string().optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "TERMS_REQUIRED" }),
    }),
  })
  .refine(
    (data) => {
      if (data.method === "card") {
        return data.cardNumber && data.expiryDate && data.cvv
      }
      return true
    },
    { message: "CARD_FIELDS_REQUIRED" }
  )
```

### Payment Method Config

```typescript
const paymentMethods = [
  { id: "e-dinar", label: "e-Dinar", icon: "/icons/e-dinar.svg" },
  { id: "sobflous", label: "Sobflous", icon: "/icons/sobflous.svg" },
  { id: "d17", label: "D17", icon: "/icons/d17.svg" },
  { id: "flouci", label: "Flouci", icon: "/icons/flouci.svg" },
  { id: "card", label: "Carte bancaire", icon: "/icons/card.svg" },
]
```

### File Structure

```
apps/client/src/features/tickets/components/
├── PaymentForm/
│   ├── PaymentForm.tsx
│   ├── PaymentMethodSelector.tsx
│   ├── CardFields.tsx
│   ├── MobilePaymentFields.tsx
│   ├── paymentSchema.ts
│   ├── PaymentForm.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.13]
- Pattern Reference: shadcn/ui Form components

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/tickets/components/PaymentForm/PaymentForm.tsx` (to create)
- `apps/client/src/features/tickets/components/PaymentForm/PaymentMethodSelector.tsx` (to create)
- `apps/client/src/features/tickets/components/PaymentForm/CardFields.tsx` (to create)
- `apps/client/src/features/tickets/components/PaymentForm/MobilePaymentFields.tsx` (to create)
- `apps/client/src/features/tickets/components/PaymentForm/paymentSchema.ts` (to create)
- `apps/client/src/features/tickets/components/PaymentForm/PaymentForm.stories.tsx` (to create)
- `apps/client/src/features/tickets/components/PaymentForm/index.ts` (to create)
- `apps/client/public/icons/e-dinar.svg` (to create)
- `apps/client/public/icons/sobflous.svg` (to create)
- `apps/client/public/icons/d17.svg` (to create)
- `apps/client/public/icons/flouci.svg` (to create)
- `apps/client/public/icons/card.svg` (to create)
