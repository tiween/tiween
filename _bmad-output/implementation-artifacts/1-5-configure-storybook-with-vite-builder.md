# Story 1.5: Configure Storybook with Vite Builder

Status: review

---

## Story

As a **developer**,
I want to set up Storybook for isolated component development,
So that I can develop and document UI components independently.

---

## Acceptance Criteria

1. **Given** shadcn/ui is installed and configured
   **When** I initialize Storybook with Vite builder
   **Then** Storybook is installed with `@storybook/nextjs-vite` builder

2. **And** `.storybook/main.ts` is configured for Next.js App Router

3. **And** `.storybook/preview.ts` includes:

   - Tailwind CSS globals
   - Dark theme by default
   - RTL/LTR toggle decorator
   - Viewport presets for mobile (375px), tablet (768px), desktop (1280px)

4. **And** `yarn storybook` starts Storybook at `http://localhost:6006`

5. **And** a sample Button story renders correctly with all variants

6. **And** Storybook build completes without errors

---

## Tasks / Subtasks

- [x] **Task 1: Install Storybook with Next.js Vite Builder** (AC: #1)

  - [x] 1.1 Run `npx storybook@latest init` in `apps/client`
  - [x] 1.2 Select `@storybook/nextjs-vite` framework
  - [x] 1.3 Verify Storybook 9.x is installed
  - [x] 1.4 Verify dependencies in `package.json`

- [x] **Task 2: Configure main.ts** (AC: #2)

  - [x] 2.1 Set framework to `@storybook/nextjs-vite`
  - [x] 2.2 Configure stories glob: `../src/**/*.stories.@(js|jsx|ts|tsx|mdx)`
  - [x] 2.3 Add essential addons: `@storybook/addon-essentials`
  - [x] 2.4 Add interactions addon: `@storybook/addon-interactions`
  - [x] 2.5 Add a11y addon: `@storybook/addon-a11y`

- [x] **Task 3: Configure preview.ts** (AC: #3)

  - [x] 3.1 Import Tailwind globals: `import '../src/app/globals.css'`
  - [x] 3.2 Set dark theme as default background
  - [x] 3.3 Create RTL/LTR toggle decorator
  - [x] 3.4 Configure viewport presets:
    - Mobile: 375px
    - Tablet: 768px
    - Desktop: 1280px
  - [x] 3.5 Configure global parameters for dark theme

- [x] **Task 4: Create Sample Button Story** (AC: #5)

  - [x] 4.1 Create `src/components/ui/button.stories.tsx`
  - [x] 4.2 Add story for default variant
  - [x] 4.3 Add story for all variants (primary, secondary, destructive, outline, ghost, link)
  - [x] 4.4 Add story for all sizes (default, sm, lg, icon)
  - [x] 4.5 Add story for disabled state
  - [x] 4.6 Add story for loading state (if applicable)

- [x] **Task 5: Add Scripts to package.json** (AC: #4)

  - [x] 5.1 Add `"storybook": "storybook dev -p 6006"`
  - [x] 5.2 Add `"build-storybook": "storybook build"`
  - [x] 5.3 Verify scripts in root `package.json` for Turborepo

- [x] **Task 6: Verify Storybook Runs** (AC: #4, #6)
  - [x] 6.1 Run `yarn storybook` - starts at localhost:6006
  - [x] 6.2 Verify Button story renders correctly
  - [x] 6.3 Test RTL/LTR toggle
  - [x] 6.4 Test viewport presets
  - [x] 6.5 Run `yarn build-storybook` - completes without errors

---

## Dev Notes

### Critical Implementation Requirements

**STORYBOOK INITIALIZATION:**

```bash
cd apps/client
npx storybook@latest init --builder @storybook/nextjs-vite
```

**MAIN.TS CONFIGURATION:**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/nextjs-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
}

export default config
```

**PREVIEW.TS CONFIGURATION:**

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'tiween-dark',
      values: [
        { name: 'tiween-dark', value: '#032523' },
        { name: 'surface', value: '#0A3533' },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
      },
      defaultViewport: 'mobile',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const direction = context.globals.direction || 'ltr';
      return (
        <div dir={direction} className="font-body">
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    direction: {
      name: 'Direction',
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' },
        ],
        showName: true,
      },
    },
  },
};

export default preview;
```

**BUTTON STORY EXAMPLE:**

```typescript
// src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react"

import { Button } from "./button"

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: "Acheter",
    variant: "default",
  },
}

export const Secondary: Story = {
  args: {
    children: "Annuler",
    variant: "secondary",
  },
}

export const Destructive: Story = {
  args: {
    children: "Supprimer",
    variant: "destructive",
  },
}

export const Outline: Story = {
  args: {
    children: "Voir plus",
    variant: "outline",
  },
}

export const Ghost: Story = {
  args: {
    children: "Passer",
    variant: "ghost",
  },
}

export const Link: Story = {
  args: {
    children: "En savoir plus",
    variant: "link",
  },
}

export const Small: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
}

export const Large: Story = {
  args: {
    children: "Confirmer",
    size: "lg",
  },
}

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
}
```

### Architecture Compliance

**From [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Design System Choice]:**

- Storybook (Vite builder) for isolated component development
- Test components in RTL mode
- Dark theme by default

**From [Source: _bmad-output/architecture/core-architectural-decisions.md]:**

- Component Dev: Storybook (Vite)
- Testing: Co-located stories with components

### Previous Story Intelligence

**From Story 1-4 (ready-for-dev):**

- shadcn/ui components in `src/components/ui/`
- Button component with Tiween brand variants
- CSS variables for dark theme

**DEPENDENCY:** This story requires Story 1-4 to be completed first.

### Technical Requirements

**Dependencies to Install:**

```json
{
  "devDependencies": {
    "@storybook/nextjs-vite": "^9.0.0",
    "@storybook/addon-essentials": "^9.0.0",
    "@storybook/addon-interactions": "^9.0.0",
    "@storybook/addon-a11y": "^9.0.0",
    "@storybook/react": "^9.0.0",
    "@storybook/test": "^9.0.0"
  }
}
```

### File Structure After Completion

```
apps/client/
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── src/
│   └── components/
│       └── ui/
│           ├── button.tsx
│           └── button.stories.tsx
└── package.json          # Updated scripts
```

### Testing Requirements

**Verification Commands:**

```bash
# Start Storybook
yarn storybook

# Build Storybook
yarn build-storybook
```

**Visual Verification:**

1. Button renders with yellow primary variant
2. Dark background (#032523) is default
3. RTL toggle flips layout direction
4. Viewport presets switch correctly
5. All button variants display correctly

---

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.5]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Design System Choice]
- [Source: Context7 Storybook docs - Next.js Vite builder configuration]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed Tailwind v4 CSS compatibility issue: removed `@apply border-border` and `@apply bg-background text-foreground` from globals.css base layer, replaced with direct CSS using `hsl(var(--variable))` syntax
- Storybook 9.x addon structure differs from 8.x: `@storybook/addon-essentials` and `@storybook/addon-interactions` are bundled in core; only `@storybook/addon-a11y` needed as separate addon

### Completion Notes List

- Upgraded Storybook from 8.x to 9.1.17 with `@storybook/nextjs-vite` framework
- Configured main.ts with nextjs-vite framework and a11y addon
- Configured preview.tsx with dark theme backgrounds, viewport presets (mobile 375px, tablet 768px, desktop 1280px), and RTL/LTR toggle decorator
- Button story already existed with all variants (primary, secondary, destructive, outline, ghost, link), sizes (sm, default, lg, icon), disabled and loading states
- Added Turborepo scripts to root package.json: `yarn storybook` and `yarn build-storybook`
- Fixed Tailwind v4 CSS compatibility in globals.css for Vite builder
- Verified `yarn storybook` starts successfully at localhost:6006
- Verified `yarn build-storybook` completes successfully (18.45s build time)

### File List

- apps/client/package.json (modified - updated Storybook dependencies to 9.1.17)
- apps/client/.storybook/main.ts (modified - updated to use @storybook/nextjs-vite)
- apps/client/.storybook/preview.tsx (modified - dark theme, RTL toggle, viewports)
- apps/client/src/styles/globals.css (modified - fixed Tailwind v4 @apply compatibility)
- package.json (modified - added storybook and build-storybook Turborepo scripts, updated @storybook/nextjs-vite)

### Change Log

- 2025-12-28: Configured Storybook 9.1.17 with Vite builder for Next.js, including dark theme, RTL support, and viewport presets
