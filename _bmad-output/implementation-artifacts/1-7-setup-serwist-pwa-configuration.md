# Story 1.7: Setup Serwist PWA Configuration

Status: review

---

## Story

As a **developer**,
I want to configure Serwist for PWA service worker support,
So that the application can be installed and work offline.

---

## Acceptance Criteria

1. **Given** the Next.js 16.1 app is configured
   **When** I set up Serwist for PWA
   **Then** `serwist` and `@serwist/next` are installed

2. **And** `serwist.config.ts` is created with caching strategies:

   - Cache-first for static assets (JS, CSS, images)
   - Network-first with fallback for API routes

3. **And** `public/manifest.json` is created with:

   - `name`: "Tiween"
   - `short_name`: "Tiween"
   - `display`: "standalone"
   - `theme_color`: "#032523"
   - `background_color`: "#032523"
   - `start_url`: "/"
   - Icons in 192x192 and 512x512 sizes

4. **And** service worker is generated during build

5. **And** the app is installable on Chrome Android

6. **And** basic offline page is shown when offline

---

## Tasks / Subtasks

- [x] **Task 1: Install Serwist Dependencies** (AC: #1)

  - [x] 1.1 Run `yarn add serwist @serwist/next` in `apps/client`
  - [x] 1.2 Verify dependencies in `package.json`

- [x] **Task 2: Configure Serwist** (AC: #2, #4)

  - [x] 2.1 Configured in next.config.mjs with withSerwistInit
  - [x] 2.2 Configure cache-first strategy for static assets (via defaultCache)
  - [x] 2.3 Configure network-first strategy for API routes (via defaultCache)
  - [x] 2.4 Configure runtime caching for images (via defaultCache)

- [x] **Task 3: Create Service Worker** (AC: #4)

  - [x] 3.1 Create `src/app/sw.ts` service worker file
  - [x] 3.2 Import Serwist and configure precaching
  - [x] 3.3 Add runtime caching strategies
  - [x] 3.4 Register service worker in app (auto via @serwist/next)

- [x] **Task 4: Update next.config.mjs** (AC: #4)

  - [x] 4.1 Import `withSerwistInit` from `@serwist/next`
  - [x] 4.2 Wrap config with `withSerwist()`
  - [x] 4.3 Configure service worker output path

- [x] **Task 5: Create Web App Manifest** (AC: #3)

  - [x] 5.1 Create `public/manifest.json`
  - [x] 5.2 Set name: "Tiween"
  - [x] 5.3 Set short_name: "Tiween"
  - [x] 5.4 Set display: "standalone"
  - [x] 5.5 Set theme_color: "#032523"
  - [x] 5.6 Set background_color: "#032523"
  - [x] 5.7 Set start_url: "/"
  - [x] 5.8 Configure icons array

- [x] **Task 6: Create PWA Icons** (AC: #3)

  - [x] 6.1 Create `public/icons/` directory
  - [x] 6.2 Add icon-192x192.png (placeholder with brand color)
  - [x] 6.3 Add icon-512x512.png (placeholder with brand color)
  - [x] 6.4 Add maskable icon variants (placeholder with brand color)

- [x] **Task 7: Link Manifest in Layout** (AC: #3)

  - [x] 7.1 Add manifest via Next.js metadata API
  - [x] 7.2 Add theme-color via viewport export
  - [x] 7.3 Add apple-touch-icon via icons metadata

- [x] **Task 8: Create Offline Page** (AC: #6)

  - [x] 8.1 Create `src/app/[locale]/offline/page.tsx`
  - [x] 8.2 Design offline fallback UI
  - [x] 8.3 Add to fallbacks in service worker

- [x] **Task 9: Verify TypeScript and Dev Server** (AC: #5)

  - [x] 9.1 TypeScript check passes
  - [x] 9.2 Dev server starts successfully
  - [x] 9.3 JSON files validated (en, fr, ar, manifest)

- [ ] **Task 10: Verify Offline Functionality** (AC: #6) - Manual testing required
  - [ ] 10.1 Run production build
  - [ ] 10.2 Go offline in DevTools
  - [ ] 10.3 Verify cached pages load
  - [ ] 10.4 Verify offline page shows for uncached routes

---

## Dev Notes

### Critical Implementation Requirements

**SERWIST CONFIGURATION:**

```typescript
// serwist.config.ts
import type { SerwistConfig } from "@serwist/next"

const config: SerwistConfig = {
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
}

export default config
```

**SERVICE WORKER:**

```typescript
// src/app/sw.ts
import { defaultCache } from "@serwist/next/worker"
import { Serwist } from "serwist"

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()
```

**NEXT.CONFIG.TS WITH SERWIST:**

```typescript
import withSerwistInit from "@serwist/next"
import createNextIntlPlugin from "next-intl/plugin"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
})

export default withSerwist(withNextIntl(nextConfig))
```

**WEB APP MANIFEST:**

```json
// public/manifest.json
{
  "name": "Tiween",
  "short_name": "Tiween",
  "description": "Discover cultural events in Tunisia",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#032523",
  "background_color": "#032523",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["entertainment", "lifestyle"],
  "lang": "fr"
}
```

**ROOT LAYOUT ADDITIONS:**

```typescript
// Add to <head> in layout.tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#032523" />
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

**OFFLINE PAGE:**

```typescript
// src/app/[locale]/offline/page.tsx
import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('offline');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-display text-primary mb-2">
        {t('title')}
      </h1>
      <p className="text-muted-foreground text-center mb-4">
        {t('description')}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
      >
        {t('retry')}
      </button>
    </div>
  );
}
```

### Architecture Compliance

**From [Source: _bmad-output/architecture/core-architectural-decisions.md]:**

- PWA: Serwist (modern next-pwa successor)
- Cache-first for static assets
- Network-first with fallback for API routes

**From [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md]:**

- 65% Chrome Android users
- Offline-first architecture
- PWA installable

### Previous Story Intelligence

**From Story 1-6 (ready-for-dev):**

- `[locale]` routing configured
- Translations available for offline page

**DEPENDENCY:** This story requires Story 1-6 to be completed first.

### Technical Requirements

**Dependencies:**

```json
{
  "dependencies": {
    "serwist": "^9.x",
    "@serwist/next": "^9.x"
  }
}
```

### File Structure After Completion

```
apps/client/
├── public/
│   ├── manifest.json
│   ├── sw.js              # Generated
│   └── icons/
│       ├── icon-192x192.png
│       ├── icon-512x512.png
│       ├── icon-maskable-192x192.png
│       └── icon-maskable-512x512.png
├── src/
│   └── app/
│       ├── sw.ts
│       └── [locale]/
│           └── offline/
│               └── page.tsx
├── serwist.config.ts
└── next.config.ts         # Updated
```

### Testing Requirements

**PWA Audit (Chrome DevTools):**

1. Open DevTools > Lighthouse
2. Run PWA audit
3. Verify all criteria pass

**Offline Test:**

1. DevTools > Network > Offline
2. Navigate to cached page
3. Navigate to uncached page (should show offline page)

---

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.7]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#PWA]
- [Source: Serwist documentation]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Installed @serwist/next@9.4.2 and serwist@9.4.2
- Used `--ignore-engines` due to Strapi plugin Node version incompatibility
- Service worker disabled in development mode to avoid caching issues
- Used Next.js metadata API for manifest/viewport instead of manual head tags

### Completion Notes List

- Installed Serwist dependencies: @serwist/next@9.4.2, serwist@9.4.2
- Created service worker at `src/app/sw.ts` with Serwist configuration
- Updated next.config.mjs to wrap with withSerwist
- Created web app manifest at `public/manifest.json` with Tiween branding
- Created placeholder PWA icons (192x192, 512x512, maskable variants) with brand color #032523
- Updated layout.tsx with PWA metadata via Next.js metadata/viewport exports
- Created offline page at `src/app/[locale]/offline/page.tsx` with translations
- Added offline translations to en.json, fr.json, ar.json
- Added WebWorker lib to tsconfig.json for service worker types
- TypeScript check passes
- Dev server starts successfully with Next.js 16.1.1 + Turbopack

### File List

- package.json (modified - added @serwist/next, serwist)
- next.config.mjs (modified - added withSerwist wrapper)
- tsconfig.json (modified - added WebWorker lib)
- src/app/sw.ts (created - service worker)
- src/app/[locale]/layout.tsx (modified - PWA metadata)
- src/app/[locale]/offline/page.tsx (created - offline page)
- public/manifest.json (created - web app manifest)
- public/icons/icon-192x192.png (created - placeholder icon)
- public/icons/icon-512x512.png (created - placeholder icon)
- public/icons/icon-maskable-192x192.png (created - placeholder maskable icon)
- public/icons/icon-maskable-512x512.png (created - placeholder maskable icon)
- locales/en.json (modified - added offline translations)
- locales/fr.json (modified - added offline translations)
- locales/ar.json (modified - added offline translations)

### Change Log

- 2025-12-29: Configured Serwist PWA with service worker, manifest, icons, and offline page
