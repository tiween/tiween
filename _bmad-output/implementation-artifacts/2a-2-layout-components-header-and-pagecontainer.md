# Story 2A.2: Layout Components - Header and PageContainer

Status: review

---

## Story

As a **developer**,
I want to create the Header and PageContainer components,
So that users see consistent navigation and content layout across all pages.

---

## Acceptance Criteria

1. **Given** shadcn/ui and Storybook are configured
   **When** I create the Header component
   **Then** the component is created at `src/components/layout/Header/`

2. **And** Header displays the Tiween logo on the left

3. **And** Header has optional title displayed in the center

4. **And** Header has language switcher on the right

5. **And** Header supports optional back button (replaces logo when shown)

6. **And** Header is sticky at the top with appropriate z-index

7. **And** Header height is 48px (h-12)

8. **Given** shadcn/ui and Storybook are configured
   **When** I create the PageContainer component
   **Then** the component is created at `src/components/layout/PageContainer/`

9. **And** PageContainer has responsive horizontal padding (16px mobile, 24px tablet+)

10. **And** PageContainer has max-width constraint (default 1280px)

11. **And** PageContainer has bottom padding for BottomNav clearance (64px + safe area)

12. **And** PageContainer is centered on larger screens

13. **And** Storybook stories exist for both components with all variants

14. **And** components work correctly in RTL mode

---

## Tasks / Subtasks

- [x] **Task 1: Create Header Component** (AC: #1-7)
  - [x] 1.1 Create directory structure `src/components/layout/Header/`
  - [x] 1.2 Create Header.tsx with TypeScript props interface
  - [x] 1.3 Display Tiween logo on the left
  - [x] 1.4 Implement optional `title` prop for center display
  - [x] 1.5 Implement `showLanguageSwitcher` prop (uses LocaleSwitcher)
  - [x] 1.6 Implement `showBackButton` prop with RTL-aware arrow direction
  - [x] 1.7 Implement `showLogo` prop
  - [x] 1.8 Implement `rightContent` prop for custom actions
  - [x] 1.9 Add sticky positioning with z-40
  - [x] 1.10 Set height to 48px (h-12)
  - [x] 1.11 Add bottom border with border-border color
  - [x] 1.12 Create index.ts for exports

- [x] **Task 2: Create PageContainer Component** (AC: #8-12)
  - [x] 2.1 Create directory structure `src/components/layout/PageContainer/`
  - [x] 2.2 Create PageContainer.tsx with TypeScript props interface
  - [x] 2.3 Implement responsive padding (px-4 md:px-6)
  - [x] 2.4 Implement `maxWidth` prop with options (sm, md, lg, xl, 2xl, full)
  - [x] 2.5 Implement `hasBottomNav` prop for bottom clearance
  - [x] 2.6 Implement `noPadding` prop for full-bleed content
  - [x] 2.7 Use safe area inset for iOS: `pb-[calc(64px+env(safe-area-inset-bottom))]`
  - [x] 2.8 Set minimum height: `min-h-[calc(100vh-48px)]`
  - [x] 2.9 Center container with mx-auto
  - [x] 2.10 Create index.ts for exports

- [x] **Task 3: Create Storybook Stories** (AC: #13)
  - [x] 3.1 Create Header.stories.tsx
  - [x] 3.2 Add Default, WithTitle, WithBackButton, NoLanguageSwitcher, Minimal stories
  - [x] 3.3 Add AllVariants showcase story
  - [x] 3.4 Create PageContainer.stories.tsx
  - [x] 3.5 Add Default, NoBottomNav, FullWidth, NoPadding stories
  - [x] 3.6 Add CompleteLayout story (Header + PageContainer + BottomNav)
  - [x] 3.7 Verify Storybook builds successfully

- [x] **Task 4: RTL Support** (AC: #14)
  - [x] 4.1 Use `useLocale()` from next-intl for RTL detection
  - [x] 4.2 Flip back arrow direction (ArrowLeft in LTR, ArrowRight in RTL)
  - [x] 4.3 Add RTLMode story for both components
  - [x] 4.4 Verify layout works in both directions

- [x] **Task 5: Update Exports** (AC: #1, #8)
  - [x] 5.1 Update `src/components/layout/index.ts` to export Header and PageContainer

---

## Dev Notes

### Header Props Interface

```typescript
export interface HeaderProps {
  title?: string
  showBackButton?: boolean
  onBack?: () => void
  showLanguageSwitcher?: boolean
  showLogo?: boolean
  className?: string
  rightContent?: React.ReactNode
}
```

### PageContainer Props Interface

```typescript
export interface PageContainerProps {
  children: React.ReactNode
  hasBottomNav?: boolean
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  className?: string
  noPadding?: boolean
}
```

### Design Tokens Used

- `--background`: For header and page background
- `--foreground`: For text
- `--border`: For header bottom border
- `--muted-foreground`: For secondary text

### Responsive Behavior

Header:
- Fixed height of 48px (h-12)
- Sticky positioning with z-40
- Padding: px-4 (16px)

PageContainer:
- Horizontal padding: 16px mobile, 24px tablet+ (px-4 md:px-6)
- Max width: 1280px default (max-w-screen-xl)
- Bottom clearance for BottomNav: 64px + safe area inset
- Minimum height: 100vh - 48px (header height)

### File Structure

```
apps/client/src/components/layout/
├── BottomNav/
│   ├── BottomNav.tsx
│   ├── BottomNav.stories.tsx
│   └── index.ts
├── Header/
│   ├── Header.tsx
│   ├── Header.stories.tsx
│   └── index.ts
├── PageContainer/
│   ├── PageContainer.tsx
│   ├── PageContainer.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.2]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Header]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#PageContainer]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Used next-intl `useLocale()` for RTL detection
- Back arrow flips automatically based on locale (ArrowLeft for LTR, ArrowRight for RTL)
- Safe area inset via CSS calc() with env() function
- LocaleSwitcher component reused from elementary components

### Completion Notes List

- Created Header component at `src/components/layout/Header/`
- Header displays logo on left, optional title in center, language switcher on right
- Optional back button replaces logo when shown
- Back arrow direction flips for RTL (ArrowRight in Arabic)
- Header is sticky with z-40 and 48px height
- Created PageContainer component at `src/components/layout/PageContainer/`
- PageContainer has responsive padding (16px mobile, 24px tablet+)
- Max-width options: sm, md, lg, xl, 2xl, full
- Bottom padding for BottomNav: 64px + safe area inset
- Minimum height accounts for header (100vh - 48px)
- Storybook stories created for all variants
- RTL stories demonstrate proper layout
- CompleteLayout story shows all components working together
- TypeScript compiles without errors
- Storybook builds successfully

### File List

- `apps/client/src/components/layout/Header/Header.tsx` (created)
- `apps/client/src/components/layout/Header/Header.stories.tsx` (created)
- `apps/client/src/components/layout/Header/index.ts` (created)
- `apps/client/src/components/layout/PageContainer/PageContainer.tsx` (created)
- `apps/client/src/components/layout/PageContainer/PageContainer.stories.tsx` (created)
- `apps/client/src/components/layout/PageContainer/index.ts` (created)
- `apps/client/src/components/layout/index.ts` (updated)

### Change Log

- 2025-12-29: Created Header and PageContainer components with Storybook stories and RTL support
