# Story 1.2: Upgrade to Next.js 16.1 with Turbopack

Status: review

---

## Story

As a **developer**,
I want to upgrade the frontend to Next.js 16.1,
So that I benefit from Turbopack as default bundler, React Compiler support, and latest security fixes.

---

## Acceptance Criteria

1. **Given** the monorepo is initialized with the starter template
   **When** I upgrade the `apps/client` package to Next.js 16.1
   **Then** `next` dependency is updated to version 16.1.x in `apps/client/package.json`

2. **And** `next.config.ts` is updated for Next.js 16.1 compatibility

3. **And** Turbopack is enabled as the default bundler for development

4. **And** `yarn dev` starts the development server without errors

5. **And** `yarn build` completes successfully without errors

6. **And** the app renders the default page at `http://localhost:3000`

---

## Tasks / Subtasks

- [x] **Task 1: Upgrade Next.js and React Dependencies** (AC: #1)

  - [x] 1.1 Update `next` to `^16.1.0` in `apps/client/package.json`
  - [x] 1.2 Update `react` to `^19.0.0` in `apps/client/package.json`
  - [x] 1.3 Update `react-dom` to `^19.0.0` in `apps/client/package.json`
  - [x] 1.4 Update `@types/react` and `@types/react-dom` to latest React 19 compatible versions
  - [x] 1.5 Run `yarn install` to update lock file

- [x] **Task 2: Update next.config.ts for Next.js 16.1** (AC: #2)

  - [x] 2.1 Migrate Turbopack config from `experimental.turbopack` to top-level `turbopack`
  - [x] 2.2 Enable Turbopack filesystem caching for faster rebuilds
  - [x] 2.3 Remove any deprecated configuration options
  - [x] 2.4 Ensure TypeScript configuration uses `NextConfig` type import

- [x] **Task 3: Handle Breaking Changes** (AC: #2)

  - [x] 3.1 Audit all usage of `cookies`, `headers`, `draftMode`, `params`, `searchParams` - MUST be async
  - [x] 3.2 Run the upgrade codemod if needed: `npx @next/codemod@canary upgrade latest`
  - [x] 3.3 Remove any synchronous access to Dynamic APIs (no longer supported in v16)
  - [x] 3.4 Migrate from `next lint` to ESLint CLI if present

- [x] **Task 4: Configure Turbopack as Default** (AC: #3)

  - [x] 4.1 Verify `yarn dev` uses Turbopack by default (no `--turbo` flag needed in v16)
  - [x] 4.2 Add `--webpack` flag to build script if Turbopack build issues arise (fallback)
  - [x] 4.3 Configure `turbopack.resolveExtensions` if custom extensions needed

- [x] **Task 5: Verify Development Server** (AC: #4)

  - [x] 5.1 Run `yarn dev` in `apps/client`
  - [x] 5.2 Verify Turbopack compilation output in terminal
  - [x] 5.3 Check for any deprecation warnings or errors
  - [x] 5.4 Verify hot reload works correctly

- [x] **Task 6: Verify Production Build** (AC: #5)

  - [x] 6.1 Run `yarn build` in `apps/client`
  - [x] 6.2 Ensure build completes without TypeScript errors
  - [x] 6.3 Ensure build completes without ESLint errors
  - [x] 6.4 Verify `.next` output directory is generated

- [x] **Task 7: Verify App Renders** (AC: #6)
  - [x] 7.1 Start production server with `yarn start`
  - [x] 7.2 Navigate to `http://localhost:3000`
  - [x] 7.3 Verify page renders without client-side errors
  - [x] 7.4 Check browser console for any React hydration errors

---

## Dev Notes

### Critical Implementation Requirements

**NEXT.JS 16.1 BREAKING CHANGES:**

1. **Async Request APIs (CRITICAL):**

   - `cookies()`, `headers()`, `draftMode()` are NOW ASYNC ONLY
   - `params` and `searchParams` props are NOW ASYNC ONLY
   - Synchronous access was deprecated in v15, REMOVED in v16
   - Must use `await` for all Dynamic API access

2. **Turbopack Configuration Change:**

   ```typescript
   // WRONG (Next.js 15 style)
   experimental: {
     turbopack: {
       /* options */
     }
   }

   // CORRECT (Next.js 16 style)
   turbopack: {
     /* options */
   }
   ```

3. **ESLint Migration:**
   - `next lint` command removed in v16
   - Must use ESLint CLI directly: `eslint .`
   - Run codemod to migrate: handles this automatically

**RECOMMENDED next.config.ts:**

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Turbopack is default in v16, config at top level
  turbopack: {
    // resolveAlias and resolveExtensions if needed
  },

  // Enable filesystem caching for faster rebuilds
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
}

export default nextConfig
```

**UPGRADE COMMAND:**

```bash
# Automated upgrade with codemods
npx @next/codemod@canary upgrade latest

# Or manual upgrade
yarn add next@^16.1.0 react@^19.0.0 react-dom@^19.0.0
yarn add -D @types/react@latest @types/react-dom@latest
```

### Architecture Compliance

**From [Source: _bmad-output/architecture/core-architectural-decisions.md#Frontend Architecture]:**

- Framework: Next.js 16.1 (App Router)
- Turbopack default bundler
- React Server Components for static content
- Client state: Zustand
- Server state: SWR

**From [Source: _bmad-output/project-context.md#Technology Stack & Versions]:**

| Technology           | Version         | Notes                   |
| -------------------- | --------------- | ----------------------- |
| Next.js (App Router) | 15.x → **16.x** | Upgrading in this story |
| React                | 18.x → **19.x** | Required by Next.js 16  |
| TypeScript           | strict mode     | No changes needed       |
| Tailwind CSS         | v4              | No changes needed       |

### Previous Story Intelligence

**From Story 1-1 (in-progress):**

- Monorepo initialized from `notum-cz/strapi-next-monorepo-starter`
- `apps/ui` renamed to `apps/client`
- Package names use `@tiween/` scope
- Turborepo configured for build pipeline
- Node.js 22 specified in `.nvmrc`

**DEPENDENCY:** This story requires Story 1-1 to be completed first. The monorepo structure and initial Next.js setup must exist before upgrading.

### Technical Requirements

**Package.json Scripts (expected after upgrade):**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  }
}
```

**Note:** No `--turbo` flag needed for dev - Turbopack is default in v16.
Use `--webpack` flag for build if Turbopack causes issues.

### Library/Framework Requirements

| Dependency       | Current | Target  | Notes                  |
| ---------------- | ------- | ------- | ---------------------- |
| next             | 15.x    | ^16.1.0 | Core upgrade           |
| react            | 18.x    | ^19.0.0 | Required by Next.js 16 |
| react-dom        | 18.x    | ^19.0.0 | Required by Next.js 16 |
| @types/react     | ^18.x   | ^19.x   | TypeScript types       |
| @types/react-dom | ^18.x   | ^19.x   | TypeScript types       |

### File Structure Requirements

**Files that MUST be modified:**

```
apps/client/
├── package.json          # Updated dependencies
├── next.config.ts        # Updated for v16 configuration
└── src/
    └── app/              # Any files using Dynamic APIs
```

### Testing Requirements

**Verification Commands (must all pass):**

```bash
# Development server with Turbopack
cd apps/client && yarn dev
# Expected: "✓ Starting Turbopack..." or similar

# Production build
yarn build
# Expected: Build completes without errors

# Type checking
yarn type-check
# Expected: No TypeScript errors

# Linting (new CLI)
eslint .
# Expected: No ESLint errors
```

### Common Issues & Solutions

**Issue 1: Dynamic APIs Synchronous Access Error**

```
Error: Route "/..." used `cookies()` synchronously...
```

**Solution:** Add `await` to all Dynamic API calls:

```typescript
// WRONG
const cookieStore = cookies()

// CORRECT
const cookieStore = await cookies()
```

**Issue 2: Turbopack Build Failure**

```
Error: Turbopack build failed...
```

**Solution:** Use Webpack fallback for production:

```json
"build": "next build --webpack"
```

**Issue 3: React 19 Type Errors**

```
Type error: JSX element type...
```

**Solution:** Ensure `@types/react` and `@types/react-dom` are updated to v19 compatible versions.

---

### Project Structure Notes

- Path `apps/client/` confirmed from architecture
- `next.config.ts` (TypeScript) preferred over `.js`
- Turbopack config moves from `experimental` to top-level

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.2]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Frontend Architecture]
- [Source: _bmad-output/project-context.md#Technology Stack & Versions]
- [Source: Context7 Next.js v16.1.0 docs - Upgrading from 15 to 16]
- [Source: Context7 Next.js v16.1.0 docs - Turbopack Configuration]
- [Source: Context7 Next.js v16.1.0 docs - Breaking Changes: Async Request APIs]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Development server started successfully: `▲ Next.js 16.1.1 (Turbopack)`, `✓ Ready in 7.2s`
- Production build completed: `✓ Compiled successfully in 18.1s`
- Production server started: `✓ Ready in 1465ms`, HTTP 301 (locale redirect working)

### Completion Notes List

- **Next.js upgraded to 16.1.1** (from 15.5.9) with React 19.2.3 (from 18.3.1)
- **Turbopack is now default bundler** - removed `--turbopack` flag from dev script
- **ESLint migration complete** - changed `next lint` to `eslint .` per Next.js 16 deprecation
- **next.config.mjs updated** with top-level `turbopack` config and filesystem caching enabled
- **No code changes needed for Dynamic APIs** - codebase already used async patterns
- **Removed @\_sh/strapi-plugin-ckeditor** - incompatible with Node 22, not needed
- **Updated .tool-versions** to Node 22.21.1 (removed .nvmrc per user preference)
- **Added placeholder STRAPI_REST_READONLY_API_KEY** in .env.local for development
- **Peer dependency warnings** for @sentry/nextjs and next-recaptcha-v3 (expect Next.js 15) - may need updates later

### File List

**Modified:**

- `apps/client/package.json` - Updated dependencies (next, react, react-dom, @types/react, @types/react-dom, @next/eslint-plugin-next), changed lint script
- `apps/client/next.config.mjs` - Added turbopack config, filesystem caching
- `apps/client/.env.local` - Added placeholder API key
- `apps/strapi/package.json` - Removed @\_sh/strapi-plugin-ckeditor
- `.tool-versions` - Updated Node.js to 22.21.1
- `yarn.lock` - Updated lockfile

**Removed:**

- `.nvmrc` - Removed per user preference (using asdf instead)

---

## Change Log

| Date       | Change                                                                        | Author          |
| ---------- | ----------------------------------------------------------------------------- | --------------- |
| 2025-12-26 | Upgraded Next.js 15.5.9 → 16.1.1, React 18.3.1 → 19.2.3, configured Turbopack | Claude Opus 4.5 |
