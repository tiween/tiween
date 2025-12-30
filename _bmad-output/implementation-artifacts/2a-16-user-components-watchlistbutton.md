# Story 2A.16: User Components - WatchlistButton

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the WatchlistButton component for adding events to watchlist,
So that users can save events for later viewing.

---

## Acceptance Criteria

1. **Given** EventCard component exists
   **When** I create the WatchlistButton component
   **Then** the component is created at `src/features/watchlist/components/WatchlistButton/`

2. **And** it displays a heart icon

3. **And** states supported:

   - Not watchlisted: outline heart
   - Watchlisted: filled heart (yellow)
   - Loading: spinner
   - Disabled: dimmed

4. **And** animation on state change (pulse effect on add)

5. **And** `onToggle` callback fires on click

6. **And** `isWatchlisted` prop controls state

7. **And** touch target is 44x44px minimum

8. **And** accessible label: "Ajouter à la watchlist" / "Retirer de la watchlist"

9. **And** Storybook stories show all states and animation

---

## Tasks / Subtasks

- [ ] **Task 1: Create WatchlistButton Component** (AC: #1, #2, #3)

  - [ ] 1.1 Create directory `src/features/watchlist/components/WatchlistButton/`
  - [ ] 1.2 Define WatchlistButtonProps interface
  - [ ] 1.3 Implement heart icon (outline/filled)
  - [ ] 1.4 Implement not watchlisted state
  - [ ] 1.5 Implement watchlisted state (filled yellow)
  - [ ] 1.6 Implement loading state (spinner)
  - [ ] 1.7 Implement disabled state (dimmed)

- [ ] **Task 2: Animation and Interaction** (AC: #4, #5, #6, #7)

  - [ ] 2.1 Add pulse animation on add
  - [ ] 2.2 Implement onToggle callback
  - [ ] 2.3 Connect isWatchlisted prop
  - [ ] 2.4 Ensure 44x44px touch target

- [ ] **Task 3: Accessibility** (AC: #8)

  - [ ] 3.1 Add aria-label for add state
  - [ ] 3.2 Add aria-label for remove state
  - [ ] 3.3 Add aria-pressed attribute
  - [ ] 3.4 Add focus ring styling

- [ ] **Task 4: Storybook Stories** (AC: #9)
  - [ ] 4.1 Create WatchlistButton.stories.tsx
  - [ ] 4.2 Add NotWatchlisted story
  - [ ] 4.3 Add Watchlisted story
  - [ ] 4.4 Add Loading story
  - [ ] 4.5 Add Disabled story
  - [ ] 4.6 Add WithAnimation story (interaction)

---

## Dev Notes

### WatchlistButton Props

```typescript
export interface WatchlistButtonProps {
  isWatchlisted: boolean
  isLoading?: boolean
  disabled?: boolean
  onToggle: () => void
  size?: "sm" | "md" | "lg"
  className?: string
  labels?: {
    add: string
    remove: string
  }
}
```

### Styling States

```typescript
const iconStyles = {
  notWatchlisted: "text-muted-foreground hover:text-primary",
  watchlisted: "text-primary fill-primary",
  loading: "animate-pulse",
  disabled: "opacity-50 cursor-not-allowed",
}
```

### Animation CSS

```css
@keyframes watchlist-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.watchlist-added {
  animation: watchlist-pulse 0.3s ease-in-out;
}
```

### Size Variants

| Size | Icon Size | Touch Target |
| ---- | --------- | ------------ |
| sm   | 20px      | 36x36px      |
| md   | 24px      | 44x44px      |
| lg   | 28px      | 48x48px      |

### File Structure

```
apps/client/src/features/watchlist/components/
├── WatchlistButton/
│   ├── WatchlistButton.tsx
│   ├── WatchlistButton.stories.tsx
│   ├── WatchlistButton.test.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.16]
- Pattern Reference: `apps/client/src/components/layout/BottomNav/BottomNav.tsx` (for touch target pattern)

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/features/watchlist/components/WatchlistButton/WatchlistButton.tsx` (to create)
- `apps/client/src/features/watchlist/components/WatchlistButton/WatchlistButton.stories.tsx` (to create)
- `apps/client/src/features/watchlist/components/WatchlistButton/WatchlistButton.test.tsx` (to create)
- `apps/client/src/features/watchlist/components/WatchlistButton/index.ts` (to create)
- `apps/client/src/features/watchlist/components/index.ts` (to create)
- `apps/client/src/features/watchlist/index.ts` (to create)
