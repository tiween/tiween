# Story 2A.1: Layout Components - BottomNav

Status: review

---

## Story

As a **developer**,
I want to create the BottomNav component for mobile navigation,
So that users can navigate between main sections of the app on mobile devices.

---

## Acceptance Criteria

1. **Given** shadcn/ui and Storybook are configured
   **When** I create the BottomNav component
   **Then** the component is created at `src/components/layout/BottomNav/`

2. **And** it displays 4 tabs: Home (🏠), Search (🔍), Tickets (🎟️), Account (👤)

3. **And** each tab has an icon and label

4. **And** active tab is highlighted with yellow (#F8EB06) icon and text

5. **And** inactive tabs use muted color

6. **And** component height is 64px with safe area padding for iOS

7. **And** touch targets are minimum 48x48px

8. **And** `activeTab` prop controls which tab is highlighted

9. **And** `onNavigate` callback fires when a tab is tapped

10. **And** `ticketCount` prop shows a badge on the Tickets tab

11. **And** Storybook story exists with all states (home active, search active, with badge, etc.)

12. **And** component works correctly in RTL mode

---

## Tasks / Subtasks

- [x] **Task 1: Create BottomNav Component** (AC: #1-10)

  - [x] 1.1 Create directory structure `src/components/layout/BottomNav/`
  - [x] 1.2 Create BottomNav.tsx with TypeScript props interface
  - [x] 1.3 Implement 4 tabs: Home, Search, Tickets, Account
  - [x] 1.4 Use Lucide icons (Home, Search, Ticket, User)
  - [x] 1.5 Implement `activeTab` prop for highlighting
  - [x] 1.6 Implement `onNavigate` callback
  - [x] 1.7 Implement `ticketCount` prop with badge display
  - [x] 1.8 Style with primary color for active, muted for inactive
  - [x] 1.9 Add safe area inset padding for iOS
  - [x] 1.10 Ensure 48x48px minimum touch targets
  - [x] 1.11 Create index.ts for exports

- [x] **Task 2: Create Storybook Stories** (AC: #11)

  - [x] 2.1 Create BottomNav.stories.tsx
  - [x] 2.2 Add Default story
  - [x] 2.3 Add HomeActive, SearchActive, TicketsActive, AccountActive stories
  - [x] 2.4 Add WithBadgeSmall, WithBadgeLarge, WithBadgeOverflow stories
  - [x] 2.5 Add Interactive story with state management
  - [x] 2.6 Add AllStates showcase story
  - [x] 2.7 Verify Storybook builds successfully

- [x] **Task 3: RTL Support** (AC: #12)

  - [x] 3.1 Use `ltr:` and `rtl:` Tailwind modifiers for badge positioning
  - [x] 3.2 Add RTLMode story to demonstrate RTL behavior
  - [x] 3.3 Verify badge flips to left side in RTL mode

- [x] **Task 4: Accessibility** (AC: #1)
  - [x] 4.1 Add `role="navigation"` with `aria-label`
  - [x] 4.2 Add `role="link"` to each tab button
  - [x] 4.3 Add `aria-current="page"` to active tab
  - [x] 4.4 Add `aria-label` for each tab
  - [x] 4.5 Add `aria-label` for badge count
  - [x] 4.6 Add focus-visible styles

---

## Dev Notes

### Component Props Interface

```typescript
export type TabType = "home" | "search" | "tickets" | "account"

export interface BottomNavProps {
  activeTab: TabType
  ticketCount?: number
  onNavigate: (tab: TabType) => void
  className?: string
}
```

### Design Tokens Used

- `--primary`: Yellow (#F8EB06) for active state
- `--muted-foreground`: Gray for inactive state
- `--background`: Dark green (#032523) with 95% opacity + backdrop blur
- `--border`: For top border
- `--destructive`: Red for badge background

### Responsive Behavior

- Hidden on desktop (lg and above) via `lg:hidden`
- Uses safe area inset for iOS home indicator: `pb-[env(safe-area-inset-bottom)]`
- Fixed height of 64px (h-16)

### File Structure

```
apps/client/src/components/layout/
└── BottomNav/
    ├── BottomNav.tsx
    ├── BottomNav.stories.tsx
    └── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.1]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#BottomNav]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Lucide icons used: Home, Search, Ticket, User
- Tailwind RTL modifiers used for badge positioning (ltr:/rtl:)
- Safe area inset via CSS env() function
- Backdrop blur for glass effect

### Completion Notes List

- Created BottomNav component at `src/components/layout/BottomNav/`
- Component displays 4 tabs with icons and labels
- Active tab highlighted with primary (yellow) color
- Inactive tabs use muted-foreground color
- Height is 64px (h-16) with safe area padding
- Touch targets are 48x48px minimum (min-h-12 min-w-12)
- `ticketCount` prop shows red badge on Tickets tab
- Badge shows "99+" for counts over 99
- Storybook stories created for all states
- RTL support implemented with ltr:/rtl: modifiers
- Accessibility: role="navigation", aria-label, aria-current
- Hidden on desktop (lg:hidden)
- TypeScript compiles without errors
- Storybook builds successfully

### File List

- `apps/client/src/components/layout/BottomNav/BottomNav.tsx` (created)
- `apps/client/src/components/layout/BottomNav/BottomNav.stories.tsx` (created)
- `apps/client/src/components/layout/BottomNav/index.ts` (created)
- `apps/client/src/components/layout/index.ts` (created)

### Change Log

- 2025-12-29: Created BottomNav component with Storybook stories and RTL support
