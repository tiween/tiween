# Story 2A.22: Discovery Components - FilmCard

Status: done

---

## Story

As a **developer**,
I want to create the FilmCard component for displaying film/movie posters with interactive hover overlay,
So that users can browse films on the homepage with quick access to showtimes and trailers.

---

## Acceptance Criteria

1. **Given** EventCard component exists
   **When** I create the FilmCard component
   **Then** the component is created at `src/features/films/components/FilmCard/`

2. **And** it displays:

   - Poster image (2:3 aspect ratio, 370x556px reference) with lazy loading
   - Film title (visible on hover on desktop, always visible on mobile)
   - Original title in Arabic font if different and is Arabic text
   - "Séances" CTA button with gradient background
   - Optional play trailer button (centered, appears on hover)

3. **And** mobile behavior:

   - Tapping poster navigates directly to film detail page
   - No hover overlay (touch devices)
   - Title visible below poster or as overlay

4. **And** desktop behavior:

   - Poster dims on hover (opacity 25%)
   - Overlay fades in with title, play button, and "Séances" CTA
   - Smooth transition (300ms ease-in-out)

5. **And** loading state shows Skeleton placeholder matching poster aspect ratio

6. **And** `onPlayTrailer` callback fires when play button is clicked

7. **And** `showPlayTrailerButton` prop controls play button visibility

8. **And** Storybook stories exist for all states and interactions

9. **And** component uses dummy film data for stories

10. **And** touch target for play button is 44x44px minimum

11. **And** component works in RTL mode

12. **And** gradient CTA uses Tiween brand colors (teal-500 to primary yellow)

---

## Tasks / Subtasks

- [x] **Task 1: Create FilmCard Directory Structure** (AC: #1)

  - [x] 1.1 Create directory `src/features/films/components/FilmCard/`
  - [x] 1.2 Create FilmCard.tsx with TypeScript props interface
  - [x] 1.3 Create index.ts for exports
  - [x] 1.4 Create features/films/components/index.ts
  - [x] 1.5 Create features/films/index.ts
  - [x] 1.6 Create features/films/types/film.types.ts

- [x] **Task 2: Implement Core FilmCard Component** (AC: #2, #12)

  - [x] 2.1 Define FilmCardProps interface with film data and callbacks
  - [x] 2.2 Define FilmCardFilm type with required fields
  - [x] 2.3 Implement poster image with 2:3 aspect ratio using next/image
  - [x] 2.4 Add lazy loading with placeholder blur
  - [x] 2.5 Implement film title display with text shadow for readability
  - [x] 2.6 Add original title support with Arabic font detection (isArabic utility)
  - [x] 2.7 Implement "Séances" CTA button with gradient (from-teal-500 to-primary)
  - [x] 2.8 Style gradient button with rounded corners, shadow, uppercase text

- [x] **Task 3: Implement Mobile Behavior** (AC: #3)

  - [x] 3.1 Create mobile-specific layout (md:hidden)
  - [x] 3.2 Wrap poster in Link component for direct navigation
  - [x] 3.3 Ensure touch-friendly tap areas

- [x] **Task 4: Implement Desktop Hover Overlay** (AC: #4)

  - [x] 4.1 Create desktop-specific layout (hidden md:block)
  - [x] 4.2 Implement poster dim effect on hover (group-hover:opacity-25)
  - [x] 4.3 Create overlay container with absolute positioning
  - [x] 4.4 Add opacity transition (opacity-0 to group-hover:opacity-100)
  - [x] 4.5 Set transition timing (duration-300 ease-in-out)
  - [x] 4.6 Position title at top of overlay
  - [x] 4.7 Position "Séances" CTA at bottom of overlay

- [x] **Task 5: Implement Play Trailer Button** (AC: #6, #7, #10)

  - [x] 5.1 Add play icon button (lucide-react Play or PlayCircle icon)
  - [x] 5.2 Position centered in overlay (top-1/3, centered horizontally)
  - [x] 5.3 Ensure 44x44px minimum touch target (h-14 w-14 = 56px)
  - [x] 5.4 Implement `onPlayTrailer` callback on click
  - [x] 5.5 Use `showPlayTrailerButton` prop to conditionally render
  - [x] 5.6 Stop event propagation to prevent card navigation

- [x] **Task 6: Implement Loading Skeleton** (AC: #5)

  - [x] 6.1 Create FilmCardSkeleton component
  - [x] 6.2 Match 2:3 aspect ratio of poster
  - [x] 6.3 Use existing Skeleton component from ui/
  - [x] 6.4 Export FilmCardSkeleton alongside FilmCard

- [x] **Task 7: Create Storybook Stories** (AC: #8, #9)

  - [x] 7.1 Create FilmCard.stories.tsx
  - [x] 7.2 Create dummy film data (TMDB-style with poster_path, title, original_title)
  - [x] 7.3 Add Default story with standard film
  - [x] 7.4 Add WithTrailerButton story showing play button
  - [x] 7.5 Add ArabicTitle story with Arabic original title
  - [x] 7.6 Add Loading story with skeleton state
  - [x] 7.7 Add Interactive story demonstrating hover and click interactions
  - [x] 7.8 Add Grid story showing multiple cards in a row (homepage layout)

- [x] **Task 8: RTL Support** (AC: #11)

  - [x] 8.1 Use logical properties (start/end) for any horizontal spacing
  - [x] 8.2 Test Arabic title rendering in RTL mode
  - [x] 8.3 Add RTL story with Arabic content
  - [x] 8.4 Verify gradient direction is appropriate in RTL

- [x] **Task 9: Create Utilities**

  - [x] 9.1 Create `isArabic` utility function at `src/lib/utils/isArabic.ts`
  - [ ] 9.2 Create `slugify` utility function at `src/lib/utils/slugify.ts` (not needed - slug provided in film data)

- [x] **Task 10: Update Exports**
  - [x] 10.1 Export FilmCard and FilmCardSkeleton from features/films/
  - [ ] 10.2 Create FilmCard.test.tsx with basic render tests (optional, requires Vitest)

---

## Dev Notes

### Component Props Interface

```typescript
export interface FilmCardFilm {
  id: string | number
  title: string
  originalTitle?: string
  posterUrl: string
  slug: string
}

export interface FilmCardLabels {
  showtimes: string
  playTrailer: string
}

export interface FilmCardProps {
  /** Film data to display */
  film: FilmCardFilm
  /** Show the play trailer button on hover */
  showPlayTrailerButton?: boolean
  /** Called when play trailer button is clicked */
  onPlayTrailer?: () => void
  /** Called when the card/Séances button is clicked */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: FilmCardLabels
}
```

### Default Labels

```typescript
const defaultLabels: FilmCardLabels = {
  showtimes: "Séances",
  playTrailer: "Voir la bande-annonce",
}
```

### Design Tokens

From Tiween theme:

- **Gradient CTA**: `bg-gradient-to-r from-teal-500 to-primary`
- **Background**: `bg-background` (#032523)
- **Surface**: `bg-card` (#0A3533)
- **Primary (Yellow)**: `text-primary` (#F8EB06)
- **Text**: `text-white` or `text-foreground`

### Poster Dimensions

| Reference | Width | Height | Aspect Ratio |
| --------- | ----- | ------ | ------------ |
| Standard  | 370px | 556px  | 2:3          |

Use `aspect-[2/3]` for responsive sizing.

### Hover Overlay Transition

```typescript
// Poster dimming
className = "group-hover:opacity-25 transition-opacity duration-300 ease-in-out"

// Overlay fade in
className =
  "opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
```

### isArabic Utility

```typescript
const isArabic = (text: string): boolean => {
  const arabic = /[\u0600-\u06FF]/
  return arabic.test(text)
}
```

### File Structure

```
apps/client/src/features/
├── events/              # Existing
│   └── components/
│       └── EventCard/
├── films/               # New
│   ├── components/
│   │   ├── FilmCard/
│   │   │   ├── FilmCard.tsx
│   │   │   ├── FilmCard.stories.tsx
│   │   │   ├── FilmCardSkeleton.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── types/
│   │   └── film.types.ts
│   └── index.ts
└── ...
```

### Legacy Component Reference

Based on `legacy/frontend/components/Movie/HomePageMovieCard/HomePageMovieCard.tsx`:

- Uses `group` class on container for hover state coordination
- Mobile: Direct link wrapping image
- Desktop: Separate overlay div with `group-hover:` states
- Play button stops propagation to prevent navigation
- "Séances" CTA at bottom with gradient background
- MovieTitle component handles French + Arabic title display

### Accessibility Checklist

- [x] Card container uses appropriate semantic element (article with role="article")
- [x] Play button has aria-label for screen readers
- [x] Focus ring uses yellow (`--ring`) color via focus-visible:ring-ring
- [x] Touch targets are 44x44px minimum (56px for play button)
- [x] Image has descriptive alt text (film title)
- [x] Keyboard navigation supported for interactive elements

### Gradient Colors

Legacy gradient: `from-wild-strawberry to-gold` (pink to gold)

New Tiween gradient: `from-teal-500 to-primary` (teal to yellow)

```css
/* Legacy */
background: linear-gradient(to right, #ff4081, #ffd700);

/* New Tiween */
background: linear-gradient(
  to right,
  var(--color-teal-500),
  hsl(var(--primary))
);
/* Tailwind: bg-gradient-to-r from-teal-500 to-primary */
```

---

## References

- [Source: legacy/frontend/components/Movie/HomePageMovieCard/HomePageMovieCard.tsx]
- [Source: legacy/frontend/components/Movie/MovieTitle.tsx]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md]
- Pattern Reference: `apps/client/src/features/events/components/EventCard/`
- Design Reference: `/input/TIWEEN_Homepage_Mobile.png`

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript type check passed for FilmCard files
- Storybook smoke test passed successfully (v9.1.17)

### Completion Notes List

- Created complete FilmCard component with 2:3 aspect ratio poster
- Implemented mobile behavior: direct link navigation, title overlay at bottom
- Implemented desktop hover overlay: poster dims (opacity-25), overlay fades in with title, play button, CTA
- Created FilmCardSkeleton with matching 2:3 aspect ratio
- Added comprehensive Storybook stories: Default, WithTrailerButton, ArabicTitle, LongTitle, Loading, RTLMode, Interactive, Grid, SkeletonGrid, CustomLabels
- RTL support implemented via logical properties and RTL story with Arabic content
- isArabic utility function created for detecting Arabic text
- Gradient CTA uses Tiween brand colors (from-teal-500 to-primary)
- All accessibility requirements met (aria-labels, touch targets, semantic HTML)

### File List

- `apps/client/src/features/films/components/FilmCard/FilmCard.tsx` (created)
- `apps/client/src/features/films/components/FilmCard/FilmCardSkeleton.tsx` (created)
- `apps/client/src/features/films/components/FilmCard/FilmCard.stories.tsx` (created)
- `apps/client/src/features/films/components/FilmCard/index.ts` (created)
- `apps/client/src/features/films/components/index.ts` (created)
- `apps/client/src/features/films/types/film.types.ts` (created)
- `apps/client/src/features/films/types/index.ts` (created)
- `apps/client/src/features/films/index.ts` (created)
- `apps/client/src/lib/utils/isArabic.ts` (created)
- `apps/client/src/lib/utils/index.ts` (created)
- `apps/client/src/lib/storybook/tmdb-posters.ts` (created)

### Change Log

- 2026-01-02: Implemented FilmCard component with all features: hover overlay, play trailer button, Arabic title support, skeleton loading, RTL support, and comprehensive Storybook stories
- 2026-01-02: [Code Review] Fixed issues: removed unused React imports, added utils barrel export, fixed redundant ARIA role, improved accessibility with aria-label, moved tmdb-posters to lib/storybook for cleaner imports
