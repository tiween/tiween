# Story 2A.18: Common Components - LoadingSpinner, Skeleton, Toast

Status: review

---

## Story

As a **developer**,
I want to create LoadingSpinner, Skeleton, and Toast components,
So that the app provides feedback during loading and operations.

---

## Acceptance Criteria

1. **Given** shadcn/ui Skeleton and Toast are available
   **When** I create/extend loading and feedback components
   **Then** LoadingSpinner is created at `src/components/common/LoadingSpinner/`

2. **And** LoadingSpinner has:

   - Spinning animation
   - Size variants: `sm`, `md`, `lg`
   - Optional label text
   - Centered positioning option

3. **And** Skeleton components are extended at `src/components/common/Skeleton/` with presets:

   - EventCardSkeleton
   - FilmHeroSkeleton
   - TicketCardSkeleton
   - ListSkeleton (configurable row count)

4. **And** Toast is configured with Tiween theme:

   - Success: green accent
   - Error: red accent
   - Warning: yellow accent
   - Info: blue accent
   - Positioned bottom center on mobile, top right on desktop

5. **And** all components have Storybook stories

---

## Tasks / Subtasks

- [x] **Task 1: Create LoadingSpinner Component** (AC: #1, #2)

  - [x] 1.1 Create directory `src/components/common/LoadingSpinner/`
  - [x] 1.2 Define LoadingSpinnerProps interface
  - [x] 1.3 Implement spinning animation
  - [x] 1.4 Add size variants (sm, md, lg)
  - [x] 1.5 Add optional label text
  - [x] 1.6 Add centered positioning option

- [x] **Task 2: Create Skeleton Presets** (AC: #3)

  - [x] 2.1 Create directory `src/components/common/Skeleton/`
  - [x] 2.2 Create EventCardSkeleton
  - [x] 2.3 Create FilmHeroSkeleton
  - [x] 2.4 Create TicketCardSkeleton
  - [x] 2.5 Create ListSkeleton with configurable rows

- [x] **Task 3: Configure Toast Theme** (AC: #4)

  - [x] 3.1 Extend shadcn Toast with Tiween colors
  - [x] 3.2 Configure success variant (green)
  - [x] 3.3 Configure error variant (red)
  - [x] 3.4 Configure warning variant (yellow)
  - [x] 3.5 Configure info variant (blue)
  - [x] 3.6 Set responsive positioning

- [x] **Task 4: Storybook Stories** (AC: #5)
  - [x] 4.1 Create LoadingSpinner.stories.tsx
  - [x] 4.2 Create Skeleton.stories.tsx with all presets
  - [x] 4.3 Create Toast.stories.tsx with all variants

---

## Dev Notes

### LoadingSpinner Props

```typescript
export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  label?: string
  centered?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}
```

### Skeleton Presets

```typescript
// EventCardSkeleton
export function EventCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

// ListSkeleton
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
```

### Toast Configuration

```typescript
// In globals.css or toast component
const toastVariants = {
  success: "border-green-500 bg-green-500/10 text-green-500",
  error: "border-destructive bg-destructive/10 text-destructive",
  warning: "border-yellow-500 bg-yellow-500/10 text-yellow-500",
  info: "border-blue-500 bg-blue-500/10 text-blue-500",
}

// Responsive positioning
// Mobile: bottom-center (with bottom nav clearance)
// Desktop: top-right
```

### File Structure

```
apps/client/src/components/common/
├── LoadingSpinner/
│   ├── LoadingSpinner.tsx
│   ├── LoadingSpinner.stories.tsx
│   └── index.ts
├── Skeleton/
│   ├── EventCardSkeleton.tsx
│   ├── FilmHeroSkeleton.tsx
│   ├── TicketCardSkeleton.tsx
│   ├── ListSkeleton.tsx
│   ├── Skeleton.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.18]
- Pattern Reference: `apps/client/src/components/ui/skeleton.tsx`
- Pattern Reference: `apps/client/src/components/ui/toast.tsx`

---

## Dev Agent Record

### Agent Model Used

claude-fable-5 (Fable 5)

### Debug Log

- 2026-06-11: Resumed story marked `in-progress` in sprint-status but with code already implemented and unchecked tasks. Audited implementation against all ACs, validated, and finalized story bookkeeping.
- `yarn install` was required at monorepo root (node_modules missing after the Portless/shared-types refactor commit `97e329d`).
- Full `yarn typecheck` reports 123 pre-existing errors, ALL in unrelated files (`src/lib/strapi-api/content/*`, `src/features/*`, map/geolocation libs) caused by the creative-works data model redesign and shared-types package deletion. **Zero type errors in any file owned by this story.** These pre-existing failures are out of scope here and should be addressed in track 2B follow-up work.
- ESLint on story files: 0 errors. Fixed 1 warning (`react/no-unescaped-entities` in `toast.stories.tsx`). Remaining warning in `ErrorBoundary.stories.tsx` belongs to story 2A.17.
- No unit-test infrastructure is configured in `apps/client` (no test script, no vitest config); per epic 2A pattern, Storybook stories are the validation deliverable for visual components (AC #5), and no test tasks exist in this story.

### Completion Notes

- **LoadingSpinner** (`components/common/LoadingSpinner/`): sm/md/lg sizes, optional label with size-matched typography, `centered` and bonus `fullPage` modes, accessible (role=status, aria-busy, sr-only fallback label), i18n-ready via `labels` prop. Satisfies AC #1, #2.
- **Skeleton presets** (`components/common/Skeleton/`): `ListSkeleton` (configurable rows), `FilmHeroSkeleton`, `TicketCardSkeleton` created locally; `EventCardSkeleton` lives in `features/events/components/EventCard/` (co-located with EventCard per project file-organization rules) and is re-exported from the Skeleton barrel for the API required by AC #3.
- **Toast** (`components/ui/toast.tsx`): CVA variants success (green), info (blue), warning (yellow), destructive/error (red) with Tiween theme tokens; viewport positioned bottom-center with bottom-nav clearance (`pb-20`) on mobile, top-right on desktop (`sm:` breakpoint). Satisfies AC #4.
- **Storybook**: LoadingSpinner (9 stories incl. RTL), Skeleton (16 stories covering all 4 presets + base), Toast (8 stories covering all variants, action, interactive demo, RTL). Satisfies AC #5.
- All exports wired through `components/common/index.ts` barrel.

### File List

- `apps/client/src/components/common/LoadingSpinner/LoadingSpinner.tsx` (created)
- `apps/client/src/components/common/LoadingSpinner/LoadingSpinner.stories.tsx` (created)
- `apps/client/src/components/common/LoadingSpinner/index.ts` (created)
- `apps/client/src/components/common/Skeleton/FilmHeroSkeleton.tsx` (created)
- `apps/client/src/components/common/Skeleton/TicketCardSkeleton.tsx` (created)
- `apps/client/src/components/common/Skeleton/ListSkeleton.tsx` (created)
- `apps/client/src/components/common/Skeleton/Skeleton.stories.tsx` (created)
- `apps/client/src/components/common/Skeleton/index.ts` (created)
- `apps/client/src/components/common/index.ts` (modified — barrel exports)
- `apps/client/src/components/ui/toast.tsx` (modified — Tiween variants + responsive viewport)
- `apps/client/src/components/ui/toaster.tsx` (created)
- `apps/client/src/components/ui/use-toast.ts` (created)
- `apps/client/src/components/ui/toast.stories.tsx` (created; lint warning fixed)
- `apps/client/src/features/events/components/EventCard/EventCardSkeleton.tsx` (referenced — re-exported via Skeleton barrel)

### Change Log

- 2026-06-11: Audited existing implementation against all 5 ACs, fixed `react/no-unescaped-entities` lint warning in `toast.stories.tsx`, completed task checkboxes, Dev Agent Record and File List; story confirmed ready for review.
