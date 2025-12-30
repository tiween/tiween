# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Addressed:** 12 areas where AI agents could make different choices

## Naming Patterns

**Database & API Naming:**
Strapi v5 manages database schema and REST API naming internally. Follow Strapi conventions:

- Content types defined in Strapi admin
- REST endpoints auto-generated: `/api/{content-type-plural}`
- No custom database naming required

**Code Naming Conventions:**

| Element              | Convention                    | Example                                    |
| -------------------- | ----------------------------- | ------------------------------------------ |
| **Components**       | PascalCase                    | `EventCard.tsx`, `TicketPurchaseForm.tsx`  |
| **Hooks**            | camelCase with `use` prefix   | `useEvents.ts`, `useTicketAvailability.ts` |
| **Utils/helpers**    | camelCase                     | `formatDate.ts`, `validateTicket.ts`       |
| **Types/Interfaces** | PascalCase                    | `Event`, `TicketOrder`, `ApiResponse`      |
| **Constants**        | SCREAMING_SNAKE_CASE          | `MAX_TICKETS_PER_ORDER`, `API_BASE_URL`    |
| **Zustand stores**   | camelCase with `Store` suffix | `cartStore.ts`, `userStore.ts`             |
| **Feature folders**  | kebab-case                    | `ticket-purchase/`, `event-discovery/`     |

## Structure Patterns

**Project Organization (Hybrid Approach):**

```
apps/ui/src/
├── app/                      # Next.js App Router pages
│   ├── [locale]/            # i18n routing
│   │   ├── (public)/        # Public routes
│   │   │   ├── events/
│   │   │   └── venues/
│   │   ├── (auth)/          # Protected routes
│   │   │   ├── dashboard/
│   │   │   └── tickets/
│   │   └── (venue)/         # B2B routes
│   │       └── manage/
│   └── api/                 # API routes (Next.js)
├── components/              # Shared UI components
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   └── common/              # Common components
├── features/                # Domain-specific features
│   ├── events/
│   │   ├── components/      # Feature-specific components
│   │   ├── hooks/           # Feature-specific hooks
│   │   ├── types/           # Feature-specific types
│   │   └── utils/           # Feature-specific utils
│   ├── tickets/
│   ├── venues/
│   └── auth/
├── hooks/                   # Shared hooks
├── stores/                  # Zustand stores
├── lib/                     # Utilities and config
│   ├── api/                 # API client, Strapi helpers
│   ├── utils/               # General utilities
│   └── constants/           # App constants
├── types/                   # Shared TypeScript types
└── styles/                  # Global styles
```

**Test Location (Co-located):**

```
src/features/events/
├── components/
│   ├── EventCard/
│   │   ├── EventCard.tsx
│   │   ├── EventCard.test.tsx    # Unit test
│   │   ├── EventCard.stories.tsx # Storybook
│   │   └── index.ts
```

## Format Patterns

**API Response Format:**
Use Strapi v5 response format directly without transformation:

```typescript
// Strapi v5 response structure (use as-is)
interface StrapiResponse<T> {
  data:
    | {
        id: number
        attributes: T
      }
    | {
        id: number
        attributes: T
      }[]
  meta: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// Access pattern in components
const eventTitle = response.data.attributes.title
```

**Date/Time Format:**

| Context               | Format             | Example                          | Library              |
| --------------------- | ------------------ | -------------------------------- | -------------------- |
| API/Storage           | ISO 8601           | `2025-12-25T19:30:00Z`           | Native               |
| Display (all locales) | `DD/MM/YYYY HH:mm` | `25/12/2025 19:30`               | date-fns + next-intl |
| Relative              | Localized          | "il y a 2 heures" / "منذ ساعتين" | next-intl            |

**Note:** Arabic locale uses Western numerals (25/12/2025), not Arabic-Indic numerals.

## Communication Patterns

**Zustand Store Pattern:**

```typescript
// stores/cartStore.ts
import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface CartStore {
  // State
  items: CartItem[]
  isLoading: boolean
  error: string | null

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  setError: (error: string | null) => void
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        isLoading: false,
        error: null,

        addItem: (item) =>
          set((state) => ({
            items: [...state.items, item],
          })),
        removeItem: (itemId) =>
          set((state) => ({
            items: state.items.filter((i) => i.id !== itemId),
          })),
        clearCart: () => set({ items: [] }),
        setError: (error) => set({ error }),
      }),
      { name: "cart-storage" }
    )
  )
)
```

**SWR Data Fetching Pattern:**

```typescript
// hooks/useEvents.ts
import useSWR from "swr"

import { strapiClient } from "@/lib/api/strapi"

export function useEvents(filters?: EventFilters) {
  const { data, error, isLoading, mutate } = useSWR(
    ["events", filters],
    () => strapiClient.getEvents(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    events: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    isError: !!error,
    mutate,
  }
}
```

## Error Handling Patterns

**API Error Structure:**

```typescript
// Error response from API (Strapi or custom)
interface ApiError {
  error: {
    code: string // e.g., "TICKET_SOLD_OUT"
    details?: unknown // Additional context
  }
}

// Error codes (no messages - use i18n)
const ERROR_CODES = {
  TICKET_SOLD_OUT: "TICKET_SOLD_OUT",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  INVALID_QR_CODE: "INVALID_QR_CODE",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  RATE_LIMITED: "RATE_LIMITED",
} as const
```

**Frontend Error Translation (next-intl):**

```typescript
// messages/fr.json
{
  "errors": {
    "TICKET_SOLD_OUT": "Cette séance est complète",
    "PAYMENT_FAILED": "Le paiement a échoué. Veuillez réessayer.",
    "INVALID_QR_CODE": "Code QR invalide",
    "SESSION_EXPIRED": "Votre session a expiré",
    "RATE_LIMITED": "Trop de tentatives. Veuillez patienter."
  }
}

// Usage in component
const t = useTranslations('errors');
const message = t(error.code); // Translated message
```

**Error Boundary Pattern:**

```typescript
// components/ErrorBoundary.tsx
'use client';

import { useTranslations } from 'next-intl';

export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('errors');

  return (
    <div role="alert" className="error-container">
      <h2>{t('GENERIC_ERROR')}</h2>
      <button onClick={reset}>{t('TRY_AGAIN')}</button>
    </div>
  );
}
```

## Process Patterns

**Loading State Pattern:**

```typescript
// Consistent loading state in stores
interface AsyncState {
  isLoading: boolean;
  error: string | null;  // Error code, not message
}

// Loading UI component usage
{isLoading ? <Skeleton /> : <EventCard event={event} />}
```

**Form Validation Pattern:**

```typescript
// Use Zod for validation schemas
import { z } from "zod"

export const ticketPurchaseSchema = z.object({
  showtimeId: z.number(),
  quantity: z.number().min(1).max(10),
  email: z.string().email(),
})

// Validate before API call
const result = ticketPurchaseSchema.safeParse(formData)
if (!result.success) {
  // Handle validation errors
}
```

## Enforcement Guidelines

**All AI Agents MUST:**

1. Follow the hybrid folder structure (shared `components/` + domain `features/`)
2. Co-locate tests with components (`Component.test.tsx` next to `Component.tsx`)
3. Use Strapi response format directly (no transformation layer)
4. Return error codes only (no hardcoded messages) - use i18n for translation
5. Use Zustand pattern with devtools + persist middleware where appropriate
6. Use SWR for server state with consistent cache keys
7. Use date-fns for date formatting with next-intl for localization
8. Use Zod for runtime validation schemas

**Pattern Verification:**

- ESLint rules enforce naming conventions
- TypeScript strict mode catches type inconsistencies
- Storybook ensures component isolation
- PR reviews verify pattern compliance

## Anti-Patterns to Avoid

| Anti-Pattern                         | Correct Approach                     |
| ------------------------------------ | ------------------------------------ |
| Transforming Strapi responses        | Use `data.attributes` directly       |
| Hardcoded error messages             | Return error codes, translate in UI  |
| Nested store state                   | Keep stores flat and focused         |
| Mixing feature code in `components/` | Domain code goes in `features/`      |
| Tests in separate `__tests__` folder | Co-locate with component             |
| Arabic-Indic numerals in dates       | Use Western numerals for all locales |

---
