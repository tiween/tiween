# Story 2A.19: Common Components - Badge Variants

Status: ready-for-dev

---

## Story

As a **developer**,
I want to extend the Badge component with Tiween-specific variants,
So that we have consistent badge styling for categories, formats, and status.

---

## Acceptance Criteria

1. **Given** shadcn/ui Badge is installed
   **When** I extend the Badge component with custom variants
   **Then** Badge variants are added to `src/components/ui/badge.tsx`

2. **And** variants include:

   - `category`: for event categories (Cinéma, Théâtre, etc.)
   - `format`: for showtime formats (VOST, VF, 3D)
   - `status`: for ticket status (Valid, Scanned, Expired)
   - `count`: for numeric badges (ticket count, notification count)

3. **And** each variant has appropriate colors matching the design system

4. **And** Storybook stories demonstrate all variants

5. **And** badges have proper contrast ratios for accessibility

---

## Tasks / Subtasks

- [ ] **Task 1: Extend Badge Variants** (AC: #1, #2, #3)

  - [ ] 1.1 Update `src/components/ui/badge.tsx`
  - [ ] 1.2 Add `category` variant styling
  - [ ] 1.3 Add `format` variant styling
  - [ ] 1.4 Add `status` variant styling
  - [ ] 1.5 Add `count` variant styling
  - [ ] 1.6 Define color mappings for each category

- [ ] **Task 2: Accessibility** (AC: #5)

  - [ ] 2.1 Verify contrast ratios meet WCAG AA
  - [ ] 2.2 Test with color blindness simulators
  - [ ] 2.3 Add appropriate aria-labels where needed

- [ ] **Task 3: Storybook Stories** (AC: #4)
  - [ ] 3.1 Update or create Badge.stories.tsx
  - [ ] 3.2 Add stories for category badges
  - [ ] 3.3 Add stories for format badges
  - [ ] 3.4 Add stories for status badges
  - [ ] 3.5 Add stories for count badges

---

## Dev Notes

### Extended Badge Variants

```typescript
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium...",
  {
    variants: {
      variant: {
        // Existing variants
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",

        // New Tiween variants
        category: "border-transparent bg-primary/20 text-primary",
        format:
          "border border-muted-foreground/50 text-muted-foreground bg-transparent",
        statusValid: "border-transparent bg-green-500/20 text-green-500",
        statusScanned: "border-transparent bg-blue-500/20 text-blue-500",
        statusExpired: "border-transparent bg-muted text-muted-foreground",
        count:
          "border-transparent bg-destructive text-destructive-foreground min-w-5 h-5",
      },
    },
  }
)
```

### Category Color Mappings

```typescript
// For dynamic category badges
const categoryColors: Record<string, string> = {
  cinema: "bg-primary/20 text-primary",
  theater: "bg-purple-500/20 text-purple-400",
  shorts: "bg-orange-500/20 text-orange-400",
  music: "bg-pink-500/20 text-pink-400",
  exhibitions: "bg-cyan-500/20 text-cyan-400",
}
```

### Format Badge Examples

```
[VOST] [VF] [3D] [IMAX] [4DX]
```

### Status Badge Colors

| Status  | Background   | Text             |
| ------- | ------------ | ---------------- |
| Valid   | green-500/20 | green-500        |
| Scanned | blue-500/20  | blue-500         |
| Expired | muted        | muted-foreground |

### Count Badge

Small circular badge for numbers:

- Min width: 20px
- Height: 20px
- Center-aligned number
- Max display: "99+"

### File Updates

The existing `apps/client/src/components/ui/badge.tsx` will be updated with new variants.

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.19]
- Pattern Reference: `apps/client/src/components/ui/badge.tsx`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/components/ui/badge.tsx` (to update)
- `apps/client/src/components/ui/badge.stories.tsx` (to create or update)
