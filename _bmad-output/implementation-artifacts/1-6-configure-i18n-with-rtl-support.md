# Story 1.6: Configure i18n with RTL Support

Status: review

---

## Story

As a **developer**,
I want to configure internationalization with Arabic, French, and English support,
So that the application supports all three languages with proper RTL layout for Arabic.

---

## Acceptance Criteria

1. **Given** the Next.js app is configured
   **When** I set up next-intl for i18n
   **Then** `next-intl` is installed and configured in `next.config.ts`

2. **And** routing is configured with locale prefix: `/ar/`, `/fr/`, `/en/`

3. **And** `src/messages/` directory contains translation files:

   - `ar.json` (Arabic)
   - `fr.json` (French - default)
   - `en.json` (English)

4. **And** `middleware.ts` handles locale detection and redirection

5. **And** `[locale]` dynamic segment is added to app directory structure

6. **And** `dir` attribute is set to `rtl` when locale is Arabic

7. **And** Tailwind `rtl:` variant is enabled in config

8. **And** a test page displays correctly in all three languages

9. **And** language switching works without page reload

---

## Tasks / Subtasks

- [x] **Task 1: Install next-intl** (AC: #1)

  - [x] 1.1 Run `yarn add next-intl` in `apps/client`
  - [x] 1.2 Verify next-intl version (v4.6.1 installed)

- [x] **Task 2: Configure next.config.ts** (AC: #1)

  - [x] 2.1 Import `createNextIntlPlugin` from `next-intl/plugin`
  - [x] 2.2 Wrap nextConfig with `withNextIntl()`
  - [x] 2.3 Verify plugin integrates correctly

- [x] **Task 3: Create Routing Configuration** (AC: #2)

  - [x] 3.1 Create `src/lib/navigation.ts`
  - [x] 3.2 Define locales: `['ar', 'fr', 'en']`
  - [x] 3.3 Set defaultLocale: `'fr'`
  - [x] 3.4 Configure localePrefix: `'as-needed'`

- [x] **Task 4: Create Translation Files** (AC: #3)

  - [x] 4.1 Create `locales/ar.json` (Arabic)
  - [x] 4.2 Create `locales/fr.json` (French - default)
  - [x] 4.3 Update `locales/en.json` (English)
  - [x] 4.4 Add common translations: navigation, buttons, errors

- [x] **Task 5: Configure Middleware** (AC: #4)

  - [x] 5.1 Update `src/middleware.ts`
  - [x] 5.2 Update matcher from `cs|en` to `ar|fr|en`
  - [x] 5.3 Configure matcher to exclude API/static files
  - [x] 5.4 Enable locale detection from browser

- [x] **Task 6: Configure Request Handler** (AC: #1)

  - [x] 6.1 Update `src/lib/i18n.ts`
  - [x] 6.2 Use `getRequestConfig` for server-side locale
  - [x] 6.3 Load messages dynamically based on locale
  - [x] 6.4 Set timezone to `Africa/Tunis`

- [x] **Task 7: Update App Directory Structure** (AC: #5)

  - [x] 7.1 Verify `src/app/[locale]/` directory exists
  - [x] 7.2 Verify `layout.tsx` uses NextIntlClientProvider
  - [x] 7.3 Verify pages use locale param

- [x] **Task 8: Configure RTL Support** (AC: #6, #7)

  - [x] 8.1 Verify `dir` attribute on `<html>` based on locale
  - [x] 8.2 Verify Tailwind `rtl:` variant works (built-in in v4)
  - [x] 8.3 Test RTL layout with Arabic locale

- [x] **Task 9: Create Language Switcher** (AC: #9)

  - [x] 9.1 Verify `src/components/elementary/LocaleSwitcher.tsx` exists
  - [x] 9.2 Uses `useRouter` and `usePathname` for navigation
  - [x] 9.3 Implements client-side locale switching
  - [x] 9.4 No page reload on switch (uses startTransition)

- [x] **Task 10: Verify Development Server** (AC: #8)
  - [x] 10.1 Run `yarn dev` - starts successfully
  - [x] 10.2 TypeScript type check passes
  - [x] 10.3 All 3 locale files are valid JSON

---

## Dev Notes

### Critical Implementation Requirements

**ROUTING CONFIGURATION:**

```typescript
// src/lib/navigation.ts
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["ar", "fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
})
```

**MIDDLEWARE CONFIGURATION:**

```typescript
// src/middleware.ts
import createMiddleware from "next-intl/middleware"

import { routing } from "./lib/navigation"

const intlMiddleware = createMiddleware(routing)

export const config = {
  matcher: [
    "/",
    `/(ar|fr|en)/:path*`,
    "/((?!_next|_vercel|api|robots.txt|favicon.ico|sitemap|.*\\..*).*)",
  ],
}
```

**REQUEST HANDLER:**

```typescript
// src/lib/i18n.ts
import { getRequestConfig } from "next-intl/server"

import { routing } from "./navigation"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default,
    timeZone: "Africa/Tunis",
  }
})
```

**ROOT LAYOUT WITH RTL:**

```typescript
// src/app/[locale]/layout.tsx
const dir = locale === 'ar' ? 'rtl' : 'ltr';

return (
  <html lang={locale} dir={dir} suppressHydrationWarning className="dark">
    ...
  </html>
);
```

### Architecture Compliance

**From [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#RTL Support]:**

- Arabic (RTL), French, English with consistent experience
- `dir="rtl"` on html element when Arabic
- Logical properties (`ps-`, `pe-`, `ms-`, `me-`)
- Mirrored icons flip in RTL

**From [Source: _bmad-output/architecture/core-architectural-decisions.md]:**

- i18n: next-intl
- Default locale: French
- App Router compatible

### File Structure After Completion

```
apps/client/
├── locales/
│   ├── ar.json       # Arabic translations
│   ├── fr.json       # French translations (default)
│   └── en.json       # English translations
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       └── layout.tsx   # RTL support via dir attribute
│   ├── lib/
│   │   ├── i18n.ts          # Request config (Africa/Tunis timezone)
│   │   └── navigation.ts    # Routing config (ar, fr, en)
│   ├── components/
│   │   └── elementary/
│   │       └── LocaleSwitcher.tsx
│   └── middleware.ts        # Updated matcher for ar|fr|en
└── next.config.mjs          # withNextIntl plugin
```

### Testing Requirements

**URL Verification:**

- `http://localhost:3000/` - Redirects to French (default)
- `http://localhost:3000/ar/` - Arabic (RTL)
- `http://localhost:3000/en/` - English

**Visual Verification:**

1. French: LTR layout, French text
2. Arabic: RTL layout, Arabic text, mirrored UI
3. English: LTR layout, English text
4. Language switcher: No page reload on switch

---

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.6]
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#RTL Accessibility]
- [Source: Context7 next-intl docs - App Router setup, middleware, routing]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Existing infrastructure was mostly in place from project starter template
- Updated middleware matcher from `cs|en` to `ar|fr|en` to match routing config
- Updated i18n.ts timezone from `Europe/Prague` to `Africa/Tunis`
- Updated i18n.ts HMR locale from `en` to `fr` (default locale)
- Removed obsolete `cs.json` Czech locale file

### Completion Notes List

- next-intl v4.6.1 was already installed
- Routing configuration in `src/lib/navigation.ts` already had correct locales `['ar', 'fr', 'en']`
- Created `locales/fr.json` with French translations
- Created `locales/ar.json` with Arabic translations
- Updated `locales/en.json` with Tiween-specific SEO and added common/buttons sections
- Removed obsolete `locales/cs.json` (Czech)
- Updated middleware.ts matcher from `cs|en` to `ar|fr|en`
- Updated i18n.ts timezone to `Africa/Tunis`
- Updated i18n.ts HMR import to use `fr` (default locale) instead of `en`
- Layout already had RTL support via `dir={locale === 'ar' ? 'rtl' : 'ltr'}`
- LocaleSwitcher component already existed with proper implementation
- TypeScript check passes
- Dev server starts successfully with Next.js 16.1.1 + Turbopack

### File List

- locales/ar.json (created - Arabic translations)
- locales/fr.json (created - French translations)
- locales/en.json (modified - added common/buttons, updated SEO)
- locales/cs.json (deleted - obsolete Czech locale)
- src/middleware.ts (modified - updated matcher from cs|en to ar|fr|en)
- src/lib/i18n.ts (modified - timezone Africa/Tunis, HMR locale fr)

### Change Log

- 2025-12-28: Configured i18n for Tiween with Arabic, French, English support and RTL for Arabic
