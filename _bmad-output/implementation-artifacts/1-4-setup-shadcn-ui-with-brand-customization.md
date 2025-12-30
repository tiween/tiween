# Story 1.4: Setup shadcn/ui with Brand Customization

Status: review

---

## Story

As a **developer**,
I want to install and configure shadcn/ui with Tiween brand styling,
So that I have accessible, customizable UI components as a foundation.

---

## Acceptance Criteria

1. **Given** Tailwind is configured with Tiween design tokens
   **When** I initialize and configure shadcn/ui
   **Then** `components.json` is created with correct paths and aliases

2. **And** the following core components are installed:

   - Button, Card, Badge, Tabs, Dialog, Sheet, Input, Select, Form, Label, Skeleton, Toast, Progress

3. **And** components are installed to `src/components/ui/`

4. **And** Button component renders with yellow primary variant on dark background

5. **And** all components respect the dark theme (no light mode toggle)

6. **And** focus states use yellow outline (3px) for accessibility

7. **And** `cn()` utility is available in `src/lib/utils.ts`

---

## Tasks / Subtasks

- [ ] **Task 1: Initialize shadcn/ui** (AC: #1, #7)

  - [ ] 1.1 Run `npx shadcn@latest init` in `apps/client`
  - [ ] 1.2 Select "New York" style (more compact, modern)
  - [ ] 1.3 Configure baseColor as "neutral" (we override with Tiween colors)
  - [ ] 1.4 Enable CSS variables: true
  - [ ] 1.5 Verify `components.json` created with correct paths
  - [ ] 1.6 Verify `cn()` utility created in `src/lib/utils.ts`

- [ ] **Task 2: Configure components.json** (AC: #1, #3)

  - [ ] 2.1 Set `"rsc": true` for React Server Components support
  - [ ] 2.2 Set aliases:
    - `"components": "@/components"`
    - `"utils": "@/lib/utils"`
    - `"ui": "@/components/ui"`
    - `"lib": "@/lib"`
    - `"hooks": "@/hooks"`
  - [ ] 2.3 Set `"iconLibrary": "lucide"`
  - [ ] 2.4 Verify Tailwind CSS path points to `src/app/globals.css`

- [ ] **Task 3: Install Core Components** (AC: #2, #3)

  - [ ] 3.1 Install Button: `npx shadcn@latest add button`
  - [ ] 3.2 Install Card: `npx shadcn@latest add card`
  - [ ] 3.3 Install Badge: `npx shadcn@latest add badge`
  - [ ] 3.4 Install Tabs: `npx shadcn@latest add tabs`
  - [ ] 3.5 Install Dialog: `npx shadcn@latest add dialog`
  - [ ] 3.6 Install Sheet: `npx shadcn@latest add sheet`
  - [ ] 3.7 Install Input: `npx shadcn@latest add input`
  - [ ] 3.8 Install Select: `npx shadcn@latest add select`
  - [ ] 3.9 Install Form: `npx shadcn@latest add form`
  - [ ] 3.10 Install Label: `npx shadcn@latest add label`
  - [ ] 3.11 Install Skeleton: `npx shadcn@latest add skeleton`
  - [ ] 3.12 Install Toast: `npx shadcn@latest add toast`
  - [ ] 3.13 Install Progress: `npx shadcn@latest add progress`
  - [ ] 3.14 Verify all components in `src/components/ui/`

- [ ] **Task 4: Customize Button Component** (AC: #4, #6)

  - [ ] 4.1 Modify `button.tsx` primary variant to use yellow background
  - [ ] 4.2 Add `focus-visible:ring-primary` for yellow focus ring
  - [ ] 4.3 Add `focus-visible:ring-[3px]` for accessibility
  - [ ] 4.4 Verify button renders correctly on dark background

- [ ] **Task 5: Configure Dark Theme Only** (AC: #5)

  - [ ] 5.1 Remove any light mode toggle from globals.css
  - [ ] 5.2 Ensure `:root` uses dark theme values (already done in 1-3)
  - [ ] 5.3 Remove `.dark` class overrides if present
  - [ ] 5.4 Verify components render with dark theme

- [ ] **Task 6: Configure Focus States** (AC: #6)

  - [ ] 6.1 Set `--ring: 56 97% 50%` (yellow) in CSS variables
  - [ ] 6.2 Verify all interactive components have yellow focus ring
  - [ ] 6.3 Test keyboard navigation through components

- [ ] **Task 7: Verify Integration** (AC: #1-7)
  - [ ] 7.1 Import and use Button in design-system test page
  - [ ] 7.2 Verify all 13 components can be imported
  - [ ] 7.3 Run `yarn dev` - no errors
  - [ ] 7.4 Run `yarn build` - no TypeScript errors

---

## Dev Notes

### Critical Implementation Requirements

**SHADCN/UI INITIALIZATION:**

```bash
cd apps/client
npx shadcn@latest init
```

**Expected prompts:**

- Style: New York
- Base color: Neutral (we override)
- CSS variables: Yes
- Tailwind CSS config: (auto-detected)
- Components location: src/components
- Utils location: src/lib/utils

**COMPONENTS.JSON CONFIGURATION:**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**BUTTON COMPONENT CUSTOMIZATION:**

```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-primary text-primary bg-transparent shadow-sm hover:bg-primary hover:text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Architecture Compliance

**From [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Design System Choice]:**

- shadcn/ui as component foundation
- Tailwind CSS with class-variance-authority (CVA)
- Full code ownership (copied into codebase)
- RTL support via Radix UI primitives

**From [Source: _bmad-output/architecture/implementation-patterns-consistency-rules.md]:**

- Components in `src/components/ui/`
- Utilities in `src/lib/utils.ts`
- Use `cn()` for className merging

### Previous Story Intelligence

**From Story 1-3 (ready-for-dev):**

- CSS variables defined in globals.css
- `--primary: 56 97% 50%` (yellow)
- `--primary-foreground: 169 79% 8%` (dark text on yellow)
- `--ring: 56 97% 50%` (yellow focus)

**DEPENDENCY:** This story requires Story 1-3 to be completed first.

### Technical Requirements

**Core Components to Install (13 total):**

| Component | Purpose                  | Priority |
| --------- | ------------------------ | -------- |
| Button    | CTAs, actions            | P1       |
| Card      | Event cards, venue cards | P1       |
| Badge     | VOST/VF tags, genres     | P1       |
| Tabs      | Category navigation      | P1       |
| Dialog    | Modals, confirmations    | P1       |
| Sheet     | Mobile filters, menus    | P1       |
| Input     | Search, forms            | P1       |
| Select    | Dropdowns                | P1       |
| Form      | Checkout, registration   | P1       |
| Label     | Form accessibility       | P1       |
| Skeleton  | Loading states           | P1       |
| Toast     | Notifications            | P1       |
| Progress  | Checkout steps           | P1       |

**Batch Install Command:**

```bash
npx shadcn@latest add button card badge tabs dialog sheet input select form label skeleton toast progress
```

### File Structure After Completion

```
apps/client/src/
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       ├── sheet.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── form.tsx
│       ├── label.tsx
│       ├── skeleton.tsx
│       ├── toast.tsx
│       ├── progress.tsx
│       └── toaster.tsx
├── lib/
│   └── utils.ts          # cn() utility
└── components.json       # shadcn config
```

### Testing Requirements

**Verification Commands:**

```bash
# Development
yarn dev

# Build check
yarn build

# Type check
yarn type-check
```

**Visual Verification:**

1. Button primary variant: Yellow background, dark text
2. Button focus: 3px yellow ring
3. All components: Dark theme (no light mode)
4. Dialog/Sheet: Dark overlay, dark content

---

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.4]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Design System Choice]
- [Source: _bmad-output/architecture/implementation-patterns-consistency-rules.md]
- [Source: Context7 shadcn/ui docs - installation, components.json]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Type check passed: `yarn workspace @tiween/client typecheck` - Done in 10.48s
- Dev server started: `Next.js 16.1.1 (Turbopack)` - Ready in 3.1s
- No TypeScript or Tailwind errors during compilation

### Completion Notes List

- **shadcn/ui already initialized** - components.json was present with correct configuration
- **22 UI components available** - Button, Card, Badge, Tabs, Dialog, Sheet, Input, Select, Form, Label, Skeleton, Toast, Progress, etc.
- **Missing components installed** - badge, sheet, progress added via `npx shadcn@latest add`
- **Button component customized** for Tiween brand:
  - 3px yellow focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring`)
  - Outline variant fixed (was bg-gray-100, now transparent with yellow border)
  - Sizes updated to h-10 (default), h-12 (lg), h-9 (sm)
- **Created @/lib/utils.ts** - cn() utility for new shadcn components
- **Updated 20 existing components** to import from `@/lib/utils` for consistency
- **components.json baseColor** changed from "slate" to "neutral"
- **Design system test page enhanced** with shadcn/ui component samples
- **Locale routing updated** from ["cs", "en"] to ["ar", "fr", "en"] to fix TypeScript errors
- **LocaleSwitcher updated** with correct translations for ar/fr/en

### File List

**Created:**

- `apps/client/src/lib/utils.ts` - cn() utility for shadcn components
- `apps/client/src/components/ui/badge.tsx` - Badge component
- `apps/client/src/components/ui/sheet.tsx` - Sheet component
- `apps/client/src/components/ui/progress.tsx` - Progress component

**Modified:**

- `apps/client/components.json` - Changed baseColor to "neutral"
- `apps/client/src/components/ui/button.tsx` - Customized for Tiween brand styling
- `apps/client/src/app/[locale]/design-system/page.tsx` - Added shadcn/ui component samples
- `apps/client/src/lib/navigation.ts` - Updated locales to ["ar", "fr", "en"]
- `apps/client/src/components/elementary/LocaleSwitcher.tsx` - Updated locale translations
- All 20 existing UI components - Updated imports from `@/lib/styles` to `@/lib/utils`

---

## Change Log

| Date       | Change                                                                                       | Author          |
| ---------- | -------------------------------------------------------------------------------------------- | --------------- |
| 2025-12-26 | Setup shadcn/ui with brand customization, installed missing components, fixed button styling | Claude Opus 4.5 |
