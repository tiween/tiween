# Story 2A.5: Discovery Components - FilmHero

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create the FilmHero component for event detail page headers,
So that event details are presented with visual impact.

---

## Acceptance Criteria

1. **Given** EventCard component exists
   **When** I create the FilmHero component
   **Then** the component is created at `src/features/events/components/FilmHero/`

2. **And** it displays:

   - Full-bleed backdrop image with gradient overlay
   - Event title in Lalezar display font
   - Category and genre badges
   - Rating (if available)
   - Duration and year
   - Venue count ("Dans X salles")
   - Watchlist and Share buttons

3. **And** image has proper loading placeholder

4. **And** gradient ensures text readability

5. **And** component is responsive (full-width mobile, 60% desktop with sidebar)

6. **And** Storybook stories exist with dummy data

7. **And** component works in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create FilmHero Directory Structure** (AC: #1)

  - [ ] 1.1 Create directory `src/features/events/components/FilmHero/`
  - [ ] 1.2 Create FilmHero.tsx with TypeScript props interface
  - [ ] 1.3 Create index.ts for exports
  - [ ] 1.4 Update features/events/components/index.ts

- [ ] **Task 2: Implement FilmHero Component** (AC: #2, #3, #4)

  - [ ] 2.1 Define FilmHeroProps interface
  - [ ] 2.2 Implement full-bleed backdrop image container
  - [ ] 2.3 Add gradient overlay (from transparent to background)
  - [ ] 2.4 Add blur placeholder for image loading
  - [ ] 2.5 Implement title with `font-display` (Lalezar) class
  - [ ] 2.6 Add category Badge (reuse from EventCard)
  - [ ] 2.7 Add genre badges (multiple)
  - [ ] 2.8 Add rating display (star + number)
  - [ ] 2.9 Add duration and year metadata
  - [ ] 2.10 Add venue count display ("Dans X salles")

- [ ] **Task 3: Implement Action Buttons** (AC: #2)

  - [ ] 3.1 Add Watchlist button (heart icon)
  - [ ] 3.2 Add Share button (share icon)
  - [ ] 3.3 Ensure 44x44px touch targets
  - [ ] 3.4 Add proper callbacks (onWatchlist, onShare)

- [ ] **Task 4: Responsive Layout** (AC: #5)

  - [ ] 4.1 Mobile: full-width, stacked layout
  - [ ] 4.2 Desktop: 60% width with space for sidebar
  - [ ] 4.3 Adjust image height per breakpoint
  - [ ] 4.4 Test on various screen sizes

- [ ] **Task 5: Create Storybook Stories** (AC: #6)

  - [ ] 5.1 Create FilmHero.stories.tsx
  - [ ] 5.2 Create dummy film data
  - [ ] 5.3 Add Default story
  - [ ] 5.4 Add WithRating story
  - [ ] 5.5 Add NoRating story
  - [ ] 5.6 Add MultipleGenres story
  - [ ] 5.7 Add Loading story with placeholder
  - [ ] 5.8 Add Watchlisted story

- [ ] **Task 6: RTL Support** (AC: #7)
  - [ ] 6.1 Use logical properties for spacing
  - [ ] 6.2 Mirror button positions in RTL
  - [ ] 6.3 Add RTL story with Arabic content
  - [ ] 6.4 Test gradient direction in RTL

---

## Dev Notes

### Component Props Interface

```typescript
export interface FilmHeroEvent {
  id: string | number
  title: string
  backdropUrl?: string
  category: string
  genres?: string[]
  rating?: number
  duration?: number // in minutes
  year?: number
  venueCount?: number
}

export interface FilmHeroProps {
  event: FilmHeroEvent
  isWatchlisted?: boolean
  onWatchlist?: () => void
  onShare?: () => void
  className?: string
}
```

### Design Tokens

- `font-display` utility for Lalezar font
- Gradient: `bg-gradient-to-t from-background via-background/80 to-transparent`
- Hero height: 300px mobile, 400px desktop

### Responsive Breakpoints

| Breakpoint | Width | Height | Layout             |
| ---------- | ----- | ------ | ------------------ |
| Mobile     | 100%  | 300px  | Stacked            |
| Tablet     | 100%  | 350px  | Stacked            |
| Desktop    | 60%   | 400px  | With sidebar space |

### File Structure

```
apps/client/src/features/events/components/
├── EventCard/
├── FilmHero/
│   ├── FilmHero.tsx
│   ├── FilmHero.stories.tsx
│   ├── FilmHero.test.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.5]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#FilmHero]
- Pattern Reference: `apps/client/src/features/events/components/EventCard/`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

### File List

- `apps/client/src/features/events/components/FilmHero/FilmHero.tsx` (to create)
- `apps/client/src/features/events/components/FilmHero/FilmHero.stories.tsx` (to create)
- `apps/client/src/features/events/components/FilmHero/FilmHero.test.tsx` (to create)
- `apps/client/src/features/events/components/FilmHero/index.ts` (to create)
