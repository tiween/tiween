# Frontend Component Audit Report

**Date:** 2026-01-20
**Audited by:** Claude (frontend-design skill)
**Scope:** apps/client/src/components, apps/client/src/features

---

## Executive Summary

After a thorough review of the Tiween frontend codebase, several implementation gaps, inconsistencies, and areas requiring attention were identified. The codebase generally follows good practices with shadcn/ui + Tailwind CSS, but there were **critical design system violations** and **aesthetic inconsistencies** that needed resolution.

---

## Critical Issues (Fixed)

### 1. Input Component - Hardcoded Light Theme Colors

**File:** `components/ui/input.tsx`

**Before:**

```tsx
"bg-gray-100" // Light gray - jarring on dark theme
```

**After:**

```tsx
"bg-secondary text-foreground rounded-md focus-visible:ring-ring focus-visible:ring-1"
```

---

### 2. Dialog Component - Hardcoded Light Theme Colors

**File:** `components/ui/dialog.tsx`

**Before:**

```tsx
"bg-gray-100" // Light gray - white popup on dark UI
```

**After:**

```tsx
"bg-card text-card-foreground"
```

---

### 3. Tabs Component - Off-Brand Colors

**File:** `components/ui/tabs.tsx`

**Before:**

```tsx
"data-[state=active]:bg-gray-100 data-[state=active]:text-blue-900"
```

**After:**

```tsx
"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
```

---

### 4. Heading Component - Legacy Import & Color System

**File:** `components/typography/Heading.tsx`

**Before:**

```tsx
import { cn } from "@/lib/styles" // Legacy duplicate file

const textColorVariants = {
  black: "text-black", // Invisible on dark theme
  white: "text-white",
}
```

**After:**

```tsx
import { cn } from "@/lib/utils" // Standardized import

const textColorVariants = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
}
```

---

## Moderate Issues (Pending)

### 1. Inconsistent Focus Ring Implementations

Focus rings are implemented inconsistently across the codebase:

| Pattern                    | Components Using It                       |
| -------------------------- | ----------------------------------------- |
| `focus-visible:ring-[3px]` | Button, Badge                             |
| `focus-visible:ring-2`     | EventCard, FilmHero, SearchBar, BottomNav |
| `focus-visible:ring-1`     | Select                                    |

**Recommendation:** Standardize to a single focus ring pattern across all interactive components.

---

### 2. Mixed Icon Libraries

The codebase uses multiple icon libraries inconsistently:

| Library                 | Components               |
| ----------------------- | ------------------------ |
| `lucide-react`          | Most components          |
| `@radix-ui/react-icons` | Dialog, Select, Checkbox |

**Affected files:**

- `dialog.tsx` uses `Cross2Icon` from Radix
- `sheet.tsx` uses `XIcon` from Lucide
- `select.tsx` uses `CaretSortIcon`, `CheckIcon` from Radix

**Recommendation:** Standardize on Lucide React throughout:

- `Cross2Icon` → `X`
- `CaretSortIcon` → `ChevronsUpDown`
- `CheckIcon` → `Check`

---

### 3. Inconsistent Animation Patterns

| Component        | Animation Method                                        |
| ---------------- | ------------------------------------------------------- |
| Sheet, Dialog    | `data-[state=open]:animate-in` (Tailwind Animate)       |
| EventCard        | `transition-all duration-200` + `lg:hover:scale-[1.02]` |
| FilmHero buttons | `transition-all duration-200` + `active:scale-95`       |
| SearchBar        | `transition-colors duration-200`                        |
| Skeleton         | `animate-pulse`                                         |

**Recommendation:** Define animation tokens:

```css
--transition-fast: 150ms;
--transition-normal: 200ms;
--transition-slow: 300ms;
```

---

### 4. Select Component Missing RTL Support

**File:** `components/ui/select.tsx`

The `SelectItem` component uses hardcoded directional positioning:

```tsx
"pr-8 pl-2" // Should be "pe-8 ps-2"
"absolute right-2" // Should be "absolute end-2"
```

---

### 5. Hardcoded French Labels as Defaults

Many components have French labels hardcoded:

| Component   | Example                                         |
| ----------- | ----------------------------------------------- |
| EventCard   | `addToWatchlist: "Ajouter à la liste de suivi"` |
| PaymentForm | `title: "Paiement"`                             |
| Header      | `aria-label={isRTL ? "رجوع" : "Retour"}`        |
| Footer      | `copyright: "© 2024 Tiween..."`                |

**Recommendation:** Move all default labels to a central i18n file.

---

## Minor Issues (Backlog)

### 1. Inconsistent Border Radius

| Component       | Border Radius   |
| --------------- | --------------- |
| Card            | `rounded-xl`    |
| SearchBar input | `rounded-full`  |
| Dialog          | `sm:rounded-lg` |
| Badge           | `rounded-full`  |
| Select content  | `rounded-md`    |

The design system defines `--radius: 0.5rem` but components use varied values.

---

### 2. EventDetailPageDesktop Hardcoded Strings

**File:** `features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx`

Hardcoded French strings that bypass the labels system:

- Line 349: `de {work.directors[0].name}`
- Line 411: `01 / 03` (hardcoded pagination)
- Line 480: `Partager`
- Line 496: `Enregistré` / `Enregistrer`

---

### 3. Duplicate Utility File

Both files export identical `cn` function:

- `@/lib/styles` (legacy)
- `@/lib/utils` (standard)

**Recommendation:** Remove `@/lib/styles` after migrating any remaining usages.

---

## Positive Patterns to Maintain

1. **Excellent RTL Support** - Most feature components use CSS logical properties (`start`, `end`, `ps`, `pe`)
2. **Strong TypeScript Interfaces** - Well-defined props interfaces with JSDoc comments
3. **Consistent Labels Pattern** - Most components accept a `labels` prop for i18n
4. **Good Accessibility Basics** - `aria-label`, `role`, `aria-pressed`, `aria-expanded` used appropriately
5. **Loading State Handling** - Components properly support `isLoading` props
6. **Skeleton Components** - Loading placeholders are available

---

## Summary Matrix

| Category                      | Issues Found | Severity | Status   |
| ----------------------------- | ------------ | -------- | -------- |
| Design System Violations      | 3            | Critical | ✅ Fixed |
| Import/Path Issues            | 1            | Critical | ✅ Fixed |
| Accessibility Inconsistencies | 2            | Moderate | Pending  |
| Icon Library Mixing           | 1            | Moderate | Pending  |
| Animation Inconsistencies     | 1            | Moderate | Pending  |
| RTL Support Gaps              | 1            | Moderate | Pending  |
| i18n/Hardcoded Strings        | 3            | Minor    | Backlog  |
| Border Radius Inconsistencies | 1            | Minor    | Backlog  |

---

## Recommended Action Items

### Priority 1 (Completed)

- [x] Fix Input, Dialog, and Tabs components to use design system colors
- [x] Fix Heading component import path and color system

### Priority 2 (Next Sprint)

- [ ] Standardize focus ring implementation across all components
- [ ] Migrate from Radix icons to Lucide icons throughout
- [ ] Fix RTL positioning in SelectItem

### Priority 3 (Backlog)

- [ ] Define motion design tokens
- [ ] Centralize all default labels
- [ ] Document and enforce border-radius scale
- [ ] Remove duplicate `@/lib/styles` file
