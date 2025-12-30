# Story 2A.18: Common Components - LoadingSpinner, Skeleton, Toast

Status: ready-for-dev

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

- [ ] **Task 1: Create LoadingSpinner Component** (AC: #1, #2)

  - [ ] 1.1 Create directory `src/components/common/LoadingSpinner/`
  - [ ] 1.2 Define LoadingSpinnerProps interface
  - [ ] 1.3 Implement spinning animation
  - [ ] 1.4 Add size variants (sm, md, lg)
  - [ ] 1.5 Add optional label text
  - [ ] 1.6 Add centered positioning option

- [ ] **Task 2: Create Skeleton Presets** (AC: #3)

  - [ ] 2.1 Create directory `src/components/common/Skeleton/`
  - [ ] 2.2 Create EventCardSkeleton
  - [ ] 2.3 Create FilmHeroSkeleton
  - [ ] 2.4 Create TicketCardSkeleton
  - [ ] 2.5 Create ListSkeleton with configurable rows

- [ ] **Task 3: Configure Toast Theme** (AC: #4)

  - [ ] 3.1 Extend shadcn Toast with Tiween colors
  - [ ] 3.2 Configure success variant (green)
  - [ ] 3.3 Configure error variant (red)
  - [ ] 3.4 Configure warning variant (yellow)
  - [ ] 3.5 Configure info variant (blue)
  - [ ] 3.6 Set responsive positioning

- [ ] **Task 4: Storybook Stories** (AC: #5)
  - [ ] 4.1 Create LoadingSpinner.stories.tsx
  - [ ] 4.2 Create Skeleton.stories.tsx with all presets
  - [ ] 4.3 Create Toast.stories.tsx with all variants

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

{{agent_model_name_version}}

### File List

- `apps/client/src/components/common/LoadingSpinner/LoadingSpinner.tsx` (to create)
- `apps/client/src/components/common/LoadingSpinner/LoadingSpinner.stories.tsx` (to create)
- `apps/client/src/components/common/LoadingSpinner/index.ts` (to create)
- `apps/client/src/components/common/Skeleton/EventCardSkeleton.tsx` (to create)
- `apps/client/src/components/common/Skeleton/FilmHeroSkeleton.tsx` (to create)
- `apps/client/src/components/common/Skeleton/TicketCardSkeleton.tsx` (to create)
- `apps/client/src/components/common/Skeleton/ListSkeleton.tsx` (to create)
- `apps/client/src/components/common/Skeleton/Skeleton.stories.tsx` (to create)
- `apps/client/src/components/common/Skeleton/index.ts` (to create)
