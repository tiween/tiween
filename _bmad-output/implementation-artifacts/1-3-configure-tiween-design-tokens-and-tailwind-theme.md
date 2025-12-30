# Story 1.3: Configure Tiween Design Tokens and Tailwind Theme

Status: review

---

## Story

As a **developer**,
I want to configure Tailwind CSS with Tiween brand colors and typography,
So that all components use consistent brand styling throughout the application.

---

## Acceptance Criteria

1. **Given** the Next.js 16.1 app is running
   **When** I configure Tailwind with Tiween design tokens
   **Then** `tailwind.config.ts` includes the following color tokens:

   - `tiween-green`: #032523 (primary background)
   - `tiween-yellow`: #F8EB06 (accent/CTA)
   - `surface`: #0A3533 (elevated cards)
   - `surface-light`: #0F4542 (hover states)

2. **And** CSS variables are defined in `globals.css` for shadcn/ui compatibility:

   - `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--destructive`

3. **And** typography is configured with:

   - Lalezar font loaded for display headings
   - Inter font loaded for body text
   - Noto Sans Arabic font loaded for Arabic body text

4. **And** the spacing scale uses 4px base unit

5. **And** a test page displays all colors and typography correctly

---

## Tasks / Subtasks

- [x] **Task 1: Configure Tailwind v4 Color Tokens** (AC: #1)

  - [x] 1.1 Create `@theme` block in `globals.css` with brand colors
  - [x] 1.2 Define `--color-tiween-green: #032523` (169 79% 8% in HSL)
  - [x] 1.3 Define `--color-tiween-yellow: #F8EB06` (56 97% 50% in HSL)
  - [x] 1.4 Define `--color-surface: #0A3533` (elevated cards)
  - [x] 1.5 Define `--color-surface-light: #0F4542` (hover states)
  - [x] 1.6 Verify utility classes work: `bg-tiween-green`, `text-tiween-yellow`

- [x] **Task 2: Configure shadcn/ui CSS Variables** (AC: #2)

  - [x] 2.1 Define `:root` CSS variables in `globals.css`
  - [x] 2.2 Set `--background: 169 79% 8%` (tiween-green HSL)
  - [x] 2.3 Set `--foreground: 0 0% 100%` (white)
  - [x] 2.4 Set `--primary: 56 97% 50%` (tiween-yellow HSL)
  - [x] 2.5 Set `--primary-foreground: 169 79% 8%` (dark text on yellow)
  - [x] 2.6 Set `--muted: 169 60% 12%` (surface color)
  - [x] 2.7 Set `--muted-foreground: 0 0% 63%` (muted text ~#A0A0A0)
  - [x] 2.8 Set `--destructive: 0 84% 60%` (red for errors)
  - [x] 2.9 Set `--card`, `--card-foreground`, `--border`, `--input`, `--ring`

- [x] **Task 3: Configure Typography - Font Loading** (AC: #3)

  - [x] 3.1 Import Lalezar from Google Fonts (display headings)
  - [x] 3.2 Import Inter from Google Fonts (body text - Latin)
  - [x] 3.3 Import Noto Sans Arabic from Google Fonts (body text - Arabic)
  - [x] 3.4 Configure font-display: swap for performance
  - [x] 3.5 Use Next.js `next/font` for optimized font loading

- [x] **Task 4: Configure Typography - Tailwind Theme** (AC: #3)

  - [x] 4.1 Define `--font-display: 'Lalezar', cursive` in `@theme`
  - [x] 4.2 Define `--font-body: 'Inter', sans-serif` in `@theme`
  - [x] 4.3 Define `--font-arabic: 'Noto Sans Arabic', sans-serif` in `@theme`
  - [x] 4.4 Configure font-family fallback stacks
  - [x] 4.5 Set base font-size to 16px

- [x] **Task 5: Configure Spacing Scale** (AC: #4)

  - [x] 5.1 Define `--spacing: 4px` as base unit in `@theme`
  - [x] 5.2 Verify Tailwind spacing utilities use 4px multiplier
  - [x] 5.3 Document spacing scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

- [x] **Task 6: Create Design System Test Page** (AC: #5)

  - [x] 6.1 Create `apps/client/src/app/[locale]/design-system/page.tsx`
  - [x] 6.2 Display all brand colors with hex values
  - [x] 6.3 Display typography samples (Lalezar, Inter, Noto Sans Arabic)
  - [x] 6.4 Display spacing scale visually
  - [x] 6.5 Display button states (primary, secondary, destructive)
  - [x] 6.6 Verify page renders correctly in all 3 languages

- [x] **Task 7: Verify Theme Integration** (AC: #1-5)
  - [x] 7.1 Run `yarn dev` - no Tailwind errors
  - [x] 7.2 Verify `bg-tiween-green` works in components
  - [x] 7.3 Verify `text-tiween-yellow` works in components
  - [x] 7.4 Verify `font-display` applies Lalezar
  - [x] 7.5 Verify RTL layout works with spacing

---

## Dev Notes

### Critical Implementation Requirements

**TAILWIND CSS v4 CONFIGURATION:**

Tailwind v4 uses CSS-first configuration with `@theme` directive. No more `tailwind.config.ts` for theme values - everything goes in CSS.

**globals.css Structure:**

```css
@import "tailwindcss";

/* ============================================
   TIWEEN DESIGN TOKENS - TAILWIND v4
   ============================================ */
@theme {
  /* Brand Colors */
  --color-tiween-green: #032523;
  --color-tiween-yellow: #f8eb06;
  --color-surface: #0a3533;
  --color-surface-light: #0f4542;

  /* Typography */
  --font-display: "Lalezar", cursive;
  --font-body: "Inter", sans-serif;
  --font-arabic: "Noto Sans Arabic", sans-serif;

  /* Spacing (4px base) */
  --spacing: 4px;
}

/* ============================================
   SHADCN/UI CSS VARIABLES
   ============================================ */
:root {
  /* Background & Foreground */
  --background: 169 79% 8%; /* #032523 */
  --foreground: 0 0% 100%; /* white */

  /* Primary (Yellow CTA) */
  --primary: 56 97% 50%; /* #F8EB06 */
  --primary-foreground: 169 79% 8%; /* dark text on yellow */

  /* Secondary */
  --secondary: 169 60% 12%; /* #0A3533 */
  --secondary-foreground: 0 0% 100%;

  /* Muted */
  --muted: 169 60% 12%; /* #0A3533 */
  --muted-foreground: 0 0% 63%; /* #A0A0A0 */

  /* Card */
  --card: 169 60% 12%; /* #0A3533 */
  --card-foreground: 0 0% 100%;

  /* Popover */
  --popover: 169 60% 12%;
  --popover-foreground: 0 0% 100%;

  /* Border & Input */
  --border: 169 40% 20%;
  --input: 169 40% 20%;
  --ring: 56 97% 50%; /* yellow focus ring */

  /* Destructive */
  --destructive: 0 84% 60%; /* red */
  --destructive-foreground: 0 0% 100%;

  /* Accent */
  --accent: 169 55% 16%; /* #0F4542 */
  --accent-foreground: 0 0% 100%;

  /* Chart Colors (for analytics) */
  --chart-1: 56 97% 50%;
  --chart-2: 169 60% 40%;
  --chart-3: 0 84% 60%;
  --chart-4: 200 70% 50%;
  --chart-5: 280 60% 50%;

  /* Radius */
  --radius: 0.5rem;
}

/* Dark theme only - no light mode */
.dark {
  /* Same as :root since Tiween is dark-only */
}
```

### Architecture Compliance

**From [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Color System]:**

| Color               | Hex     | HSL         | Usage                          |
| ------------------- | ------- | ----------- | ------------------------------ |
| **Tiween Green**    | #032523 | 169 79% 8%  | Backgrounds, primary surfaces  |
| **Tiween Yellow**   | #F8EB06 | 56 97% 50%  | CTAs, highlights, focus states |
| **White**           | #FFFFFF | 0 0% 100%   | Text on dark backgrounds       |
| **Surface Light**   | #0A3533 | 169 60% 12% | Elevated cards, modals         |
| **Surface Lighter** | #0F4542 | 169 55% 16% | Hover states                   |

**Accessibility Compliance:**

- Yellow on Dark Teal: **12.5:1 contrast ratio** (exceeds AAA)
- White on Dark Teal: **15.8:1 contrast ratio** (exceeds AAA)
- Focus rings: 3px yellow border with offset for visibility

**From [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Typography System]:**

| Role              | Font             | Weight  | Usage                    |
| ----------------- | ---------------- | ------- | ------------------------ |
| **Display**       | Lalezar          | 400     | Headlines, brand moments |
| **Body (Latin)**  | Inter            | 400-700 | Body text, UI elements   |
| **Body (Arabic)** | Noto Sans Arabic | 400-700 | Arabic body text         |

### Previous Story Intelligence

**From Story 1-2 (ready-for-dev):**

- Next.js 16.1 with Turbopack configured
- `next.config.ts` updated for v16 compatibility
- React 19 dependencies installed

**DEPENDENCY:** This story requires Stories 1-1 and 1-2 to be completed first.

### Technical Requirements

**Next.js Font Loading (Recommended Pattern):**

```typescript
// apps/client/src/app/fonts.ts
import { Inter, Noto_Sans_Arabic } from "next/font/google"
import localFont from "next/font/local"

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
})

// Lalezar from Google Fonts
export const lalezar = localFont({
  src: "./fonts/Lalezar-Regular.woff2",
  variable: "--font-lalezar",
  display: "swap",
})
```

**Layout Integration:**

```typescript
// apps/client/src/app/[locale]/layout.tsx
import { inter, notoSansArabic, lalezar } from '../fonts'

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${notoSansArabic.variable} ${lalezar.variable}`}>
      <body className="font-body bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
```

### Library/Framework Requirements

| Dependency   | Version  | Notes                                            |
| ------------ | -------- | ------------------------------------------------ |
| Tailwind CSS | v4.x     | Use `@theme` directive, not `tailwind.config.ts` |
| next/font    | built-in | Optimized font loading                           |
| Google Fonts | -        | Lalezar, Inter, Noto Sans Arabic                 |

### File Structure Requirements

**Files to create/modify:**

```
apps/client/src/
├── app/
│   ├── globals.css              # MODIFY: Add @theme and CSS variables
│   ├── fonts.ts                 # CREATE: Font configuration
│   └── [locale]/
│       ├── layout.tsx           # MODIFY: Apply font classes
│       └── (public)/
│           └── design-system/
│               └── page.tsx     # CREATE: Design system test page
└── tailwind.config.ts           # MINIMAL: Keep for plugins only
```

### Testing Requirements

**Verification Commands:**

```bash
# Development server
yarn dev
# Navigate to /design-system page

# Visual checks:
# - All colors display correctly
# - Lalezar renders for headings
# - Inter renders for body (Latin)
# - Noto Sans Arabic renders for Arabic text
# - Spacing uses 4px base
# - RTL layout works for Arabic
```

**Design System Test Page Content:**

```
1. Color Palette Section
   - Tiween Green (#032523) - background
   - Tiween Yellow (#F8EB06) - buttons
   - Surface (#0A3533) - cards
   - Surface Light (#0F4542) - hover

2. Typography Section
   - Lalezar headline samples (AR/FR/EN)
   - Inter body samples (FR/EN)
   - Noto Sans Arabic samples (AR)

3. Spacing Section
   - Visual scale: 4px → 64px

4. Component Samples
   - Primary button (yellow)
   - Secondary button (outline)
   - Card with elevation
```

### Common Issues & Solutions

**Issue 1: @theme directive not recognized**

```
Error: Unknown at-rule '@theme'
```

**Solution:** Ensure Tailwind CSS v4 is installed and `@import "tailwindcss"` is at top of globals.css

**Issue 2: Fonts not loading**

```
Error: Font 'Lalezar' not found
```

**Solution:** Use `next/font/google` for Google Fonts or download and use `localFont`

**Issue 3: CSS variables not working with shadcn/ui**

```
Error: Invalid color value
```

**Solution:** shadcn/ui expects HSL values without `hsl()` wrapper - use format: `169 79% 8%`

**Issue 4: RTL spacing issues**
**Solution:** Use logical properties: `ps-4` instead of `pl-4`, `me-2` instead of `mr-2`

---

### Project Structure Notes

- `globals.css` is the single source of truth for design tokens
- No colors in `tailwind.config.ts` - all in `@theme` block
- `tailwind.config.ts` only for plugins (typography, forms, etc.)
- CSS variables use HSL format for shadcn/ui compatibility

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.3]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Color System]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Typography System]
- [Source: _bmad-output/project-context.md#Tailwind CSS v4]
- [Source: Context7 Tailwind CSS docs - @theme directive]
- [Source: Context7 Tailwind CSS docs - CSS variables configuration]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Design system built successfully: `tailwindcss v4.1.4` - Done in 89ms
- Dev server started: `Next.js 16.1.1 (Turbopack)` - Ready in 7.2s
- No Tailwind CSS errors during compilation

### Completion Notes List

- **Brand colors added to theme.css** using OKLCH color space for consistency with Tailwind v4
- **shadcn/ui CSS variables configured** in globals.css with HSL format
- **Typography configured** with Lalezar (display), Inter (body Latin), Noto Sans Arabic (body Arabic)
- **RTL support added** - layout direction determined by locale (`dir="rtl"` for Arabic)
- **Dark theme only** - Tiween is a dark-themed application, class "dark" applied to html element
- **Design system test page created** at `/[locale]/design-system` with comprehensive samples
- **Font utilities added** - `font-display` and `font-arabic` custom utilities
- **Spacing uses 0.25rem base** (4px at 16px root font size)
- **Legacy fontRoboto export maintained** for backward compatibility

### File List

**Modified:**

- `packages/design-system/src/theme.css` - Added Tiween brand colors and typography fonts
- `apps/client/src/styles/globals.css` - Complete rewrite with shadcn/ui variables and Tiween theme
- `apps/client/src/lib/fonts.ts` - Changed from Roboto to Inter/Lalezar/Noto Sans Arabic
- `apps/client/src/app/[locale]/layout.tsx` - Applied new fonts and RTL support

**Created:**

- `apps/client/src/app/[locale]/design-system/page.tsx` - Design system test page

---

## Change Log

| Date       | Change                                                                           | Author          |
| ---------- | -------------------------------------------------------------------------------- | --------------- |
| 2025-12-26 | Configured Tiween design tokens, typography, and created design system test page | Claude Opus 4.5 |
