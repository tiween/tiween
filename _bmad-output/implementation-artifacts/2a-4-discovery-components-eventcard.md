# Story 2A.4: Discovery Components - EventCard

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the EventCard component for displaying event previews,
So that users can browse events in listings and search results.

---

## Acceptance Criteria

1. **Given** layout components exist
   **When** I create the EventCard component
   **Then** the component is created at `src/features/events/components/EventCard/`

2. **And** it displays:

   - Poster image (16:9 aspect ratio) with lazy loading
   - Category badge (e.g., "Cinéma", "Théâtre")
   - Event title (truncated if too long)
   - Venue name and date
   - Watchlist heart button
   - Price (if available)

3. **And** three variants are supported: `default`, `compact`, `featured`

4. **And** hover state shows subtle elevation

5. **And** loading state shows Skeleton placeholder

6. **And** `onWatchlist` callback fires when heart is tapped

7. **And** `isWatchlisted` prop fills the heart icon

8. **And** Storybook stories exist for all variants and states

9. **And** component uses dummy event data for stories

10. **And** touch target for watchlist button is 44x44px minimum

11. **And** component works in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create EventCard Directory Structure** (AC: #1)

  - [ ] 1.1 Create directory `src/features/events/components/EventCard/`
  - [ ] 1.2 Create EventCard.tsx with TypeScript props interface
  - [ ] 1.3 Create index.ts for exports
  - [ ] 1.4 Create features/events/components/index.ts if not exists
  - [ ] 1.5 Create features/events/index.ts if not exists

- [ ] **Task 2: Implement Core EventCard Component** (AC: #2, #3, #4)

  - [ ] 2.1 Define EventCardProps interface with event data, variant, callbacks
  - [ ] 2.2 Define Event type or import from shared types
  - [ ] 2.3 Implement poster image with 16:9 aspect ratio using next/image
  - [ ] 2.4 Add lazy loading with placeholder blur
  - [ ] 2.5 Implement category Badge component (use existing Badge from ui/)
  - [ ] 2.6 Add event title with line-clamp-2 for truncation
  - [ ] 2.7 Display venue name and formatted date
  - [ ] 2.8 Add price display (conditional)
  - [ ] 2.9 Implement `default` variant styling
  - [ ] 2.10 Implement `compact` variant (smaller, less info)
  - [ ] 2.11 Implement `featured` variant (larger, more prominent)
  - [ ] 2.12 Add hover state with subtle elevation (`hover:shadow-lg`)

- [ ] **Task 3: Implement Watchlist Button** (AC: #6, #7, #10)

  - [ ] 3.1 Create WatchlistButton subcomponent or inline button
  - [ ] 3.2 Use Heart icon from lucide-react (outline/filled states)
  - [ ] 3.3 Implement `isWatchlisted` prop to toggle filled/outline heart
  - [ ] 3.4 Implement `onWatchlist` callback on click
  - [ ] 3.5 Ensure 44x44px minimum touch target
  - [ ] 3.6 Add pulse animation on state change
  - [ ] 3.7 Add proper aria-label for accessibility

- [ ] **Task 4: Implement Loading Skeleton** (AC: #5)

  - [ ] 4.1 Create EventCardSkeleton component
  - [ ] 4.2 Match exact shape of EventCard (poster, title, metadata)
  - [ ] 4.3 Use existing Skeleton component from ui/
  - [ ] 4.4 Export EventCardSkeleton alongside EventCard

- [ ] **Task 5: Create Storybook Stories** (AC: #8, #9)

  - [ ] 5.1 Create EventCard.stories.tsx
  - [ ] 5.2 Create dummy event data for stories
  - [ ] 5.3 Add Default story with standard event
  - [ ] 5.4 Add Compact story with compact variant
  - [ ] 5.5 Add Featured story with featured variant
  - [ ] 5.6 Add Watchlisted story with isWatchlisted=true
  - [ ] 5.7 Add Loading story with skeleton state
  - [ ] 5.8 Add NoPrice story without price
  - [ ] 5.9 Add LongTitle story with truncated title
  - [ ] 5.10 Add WithInteraction story showing hover and click

- [ ] **Task 6: RTL Support** (AC: #11)

  - [ ] 6.1 Use logical properties (ps-, pe-, ms-, me-) for spacing
  - [ ] 6.2 Position watchlist button correctly in RTL (use ltr:/rtl: variants)
  - [ ] 6.3 Test text truncation in RTL mode
  - [ ] 6.4 Add RTL story with Arabic content

- [ ] **Task 7: Update Exports and Tests**
  - [ ] 7.1 Export EventCard and EventCardSkeleton from features/events/
  - [ ] 7.2 Create EventCard.test.tsx with basic render tests
  - [ ] 7.3 Test onWatchlist callback fires correctly
  - [ ] 7.4 Test accessibility (role, aria-label)

---

## Dev Notes

### Component Props Interface

```typescript
export interface EventCardEvent {
  id: string | number
  title: string
  posterUrl?: string
  category: string
  venueName: string
  date: string | Date
  price?: number
  currency?: string
}

export interface EventCardProps {
  event: EventCardEvent
  variant?: "default" | "compact" | "featured"
  isWatchlisted?: boolean
  isLoading?: boolean
  onWatchlist?: () => void
  onClick?: () => void
  className?: string
}
```

### Design Tokens to Use

From `globals.css` and Tiween design system:

- `--card`: #0A3533 (surface color for card background)
- `--card-foreground`: white
- `--primary`: #F8EB06 (yellow for watchlist active state)
- `--muted-foreground`: #A0A0A0 (for secondary text like venue/date)
- `--border`: for card border

### Variant Specifications

| Variant  | Image Height | Title Size | Show Price | Show Date |
| -------- | ------------ | ---------- | ---------- | --------- |
| default  | 160px        | text-lg    | Yes        | Yes       |
| compact  | 100px        | text-base  | No         | Yes       |
| featured | 200px        | text-xl    | Yes        | Yes       |

### Category Badge Colors

Use existing Badge component with custom styles:

- Cinéma: default (yellow)
- Théâtre: secondary (teal)
- Courts-métrages: outline
- Musique: secondary
- Expositions: secondary

### Image Handling

```typescript
import Image from 'next/image'

// Use placeholder blur for loading
<Image
  src={event.posterUrl || '/images/placeholder-poster.jpg'}
  alt={event.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

### File Structure

```
apps/client/src/features/
├── events/
│   ├── components/
│   │   ├── EventCard/
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventCard.stories.tsx
│   │   │   ├── EventCard.test.tsx
│   │   │   ├── EventCardSkeleton.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   ├── types/
│   │   └── event.types.ts
│   └── index.ts
```

### Previous Story Patterns to Follow

From `BottomNav.tsx`:

- Use `cn()` utility for class merging
- Include `labels` prop for i18n
- Use `ltr:/rtl:` Tailwind variants for RTL positioning
- Add displayName to component
- Use proper ARIA attributes

From `Card.tsx`:

- Use forwardRef pattern for refs
- Compose with existing Card components if needed

### Testing Requirements

- Use Vitest for unit tests
- Co-locate tests with component
- Test all variants render correctly
- Test watchlist callback fires
- Test accessibility attributes

### Storybook Configuration

The project uses Storybook with Vite builder. Stories should:

- Import from @storybook/react
- Use `satisfies Meta<typeof EventCard>` pattern
- Include all props in argTypes

### Accessibility Checklist

- [ ] Card uses `role="article"` with `aria-labelledby` for title
- [ ] Heart button has `aria-pressed` state for watchlist
- [ ] Heart button has `aria-label` for screen readers
- [ ] Focus ring uses yellow (`--ring`) color
- [ ] Touch target is 44x44px minimum
- [ ] Image has descriptive alt text

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.4]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#EventCard]
- [Source: _bmad-output/architecture/implementation-patterns-consistency-rules.md]
- [Source: _bmad-output/project-context.md#Component Rules]
- Pattern Reference: `apps/client/src/components/layout/BottomNav/BottomNav.tsx`
- Pattern Reference: `apps/client/src/components/ui/card.tsx`
- Pattern Reference: `apps/client/src/components/ui/badge.tsx`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- `apps/client/src/features/events/components/EventCard/EventCard.tsx` (to create)
- `apps/client/src/features/events/components/EventCard/EventCardSkeleton.tsx` (to create)
- `apps/client/src/features/events/components/EventCard/EventCard.stories.tsx` (to create)
- `apps/client/src/features/events/components/EventCard/EventCard.test.tsx` (to create)
- `apps/client/src/features/events/components/EventCard/index.ts` (to create)
- `apps/client/src/features/events/components/index.ts` (to create)
- `apps/client/src/features/events/types/event.types.ts` (to create)
- `apps/client/src/features/events/index.ts` (to create)

### Change Log
