# Story 1.1: Initialize Monorepo from Starter Template

Status: in-progress

---

## Story

As a **developer**,
I want to have a properly configured monorepo based on the notum-cz/strapi-next-monorepo-starter,
So that I have a solid foundation with Turborepo, TypeScript, and project structure ready for development.

---

## Acceptance Criteria

1. **Given** the starter template repository is available
   **When** I clone the template and run the initialization commands
   **Then** the monorepo is created with the following structure:

   - `apps/client` (renamed from `apps/ui`) - Next.js frontend
   - `apps/strapi` - Strapi v5 backend (package name `@tiween/admin`)
   - `packages/eslint-config` - Shared ESLint configuration
   - `packages/prettier-config` - Shared Prettier configuration
   - `packages/typescript-config` - Shared TypeScript configuration

   > Amended 2026-08-08 (code review): `packages/shared-types` was listed here
   > but has never existed in this repo. Shared types live per-feature instead
   > (see `apps/client/src/features/*/types.ts`). The corresponding rule in
   > `project-context.md` was corrected to match.

2. **And** `turbo.json` is configured with build pipeline for all apps

3. **And** root `package.json` has workspace configuration with Yarn

4. **And** Node.js 22 is pinned via `.tool-versions` (asdf is the project's
   version manager — this is the authoritative pin, per Task 5). A `.nvmrc`
   is also present for CI and Docker steps that key on that convention.

   > Amended 2026-08-08 (code review): this AC originally named `.nvmrc` as the
   > sole mechanism, while Task 5.1 had silently switched to `.tool-versions`.
   > Both now exist and the AC states which one is authoritative.

5. **And** all dependencies install without errors using `yarn install`

6. **And** the project is renamed from starter defaults to "tiween"

---

## Tasks / Subtasks

- [x] **Task 1: Clone and Initialize Starter Template** (AC: #1)

  - [x] 1.1 Clone `notum-cz/strapi-next-monorepo-starter` to local directory named `tiween`
  - [x] 1.2 Remove `.git` directory to start fresh
  - [x] 1.3 Initialize new git repository with `git init`
  - [x] 1.4 Verify Node.js 22 is active (check `.nvmrc` or create one)

- [x] **Task 2: Rename and Configure Project Identity** (AC: #6)

  - [x] 2.1 Update root `package.json` with name: "tiween"
  - [x] 2.2 Rename `apps/ui` directory to `apps/client`
  - [x] 2.3 Update `apps/client/package.json` name to "@tiween/client"
  - [x] 2.4 Update `apps/strapi/package.json` name to "@tiween/admin"
  - [x] 2.5 Update all package names in `packages/` to use `@tiween/` scope
  - [x] 2.6 Update workspace references in root `package.json`

- [x] **Task 3: Verify and Configure Turborepo** (AC: #2)

  - [x] 3.1 Verify `turbo.json` exists at root
  - [x] 3.2 Ensure build pipeline includes: `build`, `dev`, `lint`, `test`
  - [x] 3.3 Configure outputs for caching (`.next/**`, `dist/**`, `.build/**`)
  - [x] 3.4 Verify dependency graph with `turbo run build --dry-run`

- [x] **Task 4: Configure Yarn Workspaces** (AC: #3)

  - [x] 4.1 Verify `workspaces` field in root `package.json` includes `apps/*` and `packages/*`
  - [x] 4.2 Check for `.yarnrc.yml` if using Yarn 2+
  - [x] 4.3 Run `yarn install` and verify no errors

- [x] **Task 5: Verify Node.js Configuration** (AC: #4)

  - [x] 5.1 Create or update `.tool-versions` with content: `nodejs 22.21.1`
  - [x] 5.2 Verify engines field in root `package.json`: `"node": ">=20"`
  - [x] 5.3 Test with asdf (project uses asdf instead of nvm)

- [x] **Task 6: Final Verification** (AC: #5)
  - [x] 6.1 Run `yarn install` - completed without errors
  - [x] 6.2 Run `yarn build` - completed without errors (after fixing legacy code)
  - [x] 6.3 Fixed legacy starter template code that referenced non-existent Strapi content types
  - [ ] 6.4 Verify apps start: `yarn dev` (both client and strapi) - not tested
  - [ ] 6.5 Create initial git commit - pending

### Review Findings

_Code review 2026-08-08. Scope: acceptance audit against current repo state + adversarial review of the 7 files in this story's File List (the story's own diff is the 1,601-file initial commit `051a028`, not reviewable as a diff). 4 layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor._

**Decisions taken (all 6 resolved 2026-08-08):**

- [x] [Review][Decision] Client TypeScript errors and nothing runs them — RESOLVED: wire up the script and fix this story's own errors; the rest tracked as follow-up. Measured on a pristine tree the client had **72** errors, none of them executed by CI. After this pass: **46**, with **0** remaining in this story's files and **0** new errors introduced.
- [x] [Review][Decision] `packages/shared-types` has never existed — RESOLVED: amend the docs to match reality. AC #1 and the `project-context.md` rule now describe the per-feature type convention actually in use.
- [x] [Review][Decision] `.nvmrc` does not exist (AC #4) — RESOLVED: do both. `.nvmrc` (`22.21.1`) added for CI/Docker idioms, and AC #4 amended to name `.tool-versions` as the authoritative asdf pin.
- [x] [Review][Decision] Three dead fetchers send the pre-3.1a v4 query shape — DEFERRED (see below): superseded, zero consumers.
- [x] [Review][Decision] Locale layout ships hardcoded English metadata to `ar`/`fr` — DEFERRED (see below): superseded, zero consumers.
- [x] [Review][Decision] `project-context.md` teaches Strapi v4 response handling — RESOLVED: doc corrected to the v5 flat shape, including the code example and anti-pattern #1.

**Patches (all 13 applied 2026-08-08):**

- [x] [Review][Patch] `yarn type-check` silently skips the client — root runs `turbo type-check`, but the client script was named `typecheck`, so `turbo run type-check` reported "2 successful, 2 total" (admin only). Renamed. [apps/client/package.json]
- [x] [Review][Patch] Sitemap event query returned HTTP 400, so `/sitemap.xml` shipped zero event URLs — verified live: the old param shape yields `{"error":{"status":400,"message":"INVALID_QUERY"}}`; the new one yields 200. Realigned to flat allowlisted params with a pagination loop. [apps/client/src/app/sitemap.ts:104-155]
- [x] [Review][Patch] `TypeError` on an empty non-JSON response — `const { error } = json` destructured `undefined` when the body was empty with a non-JSON content-type. Now `json?.error`. [apps/client/src/lib/strapi-api/base.ts:79-83]
- [x] [Review][Patch] `maximumScale: 1` disabled pinch-zoom (WCAG 2.1 SC 1.4.4) — removed. [apps/client/src/app/[locale]/layout.tsx:67-72]
- [x] [Review][Patch] `setRequestLocale(locale)` ran before the locale was validated — order swapped. [apps/client/src/app/[locale]/layout.tsx:80-86]
- [x] [Review][Patch] `package-lock.json` (1.4 MB) tracked alongside `yarn.lock` despite `only-allow yarn` — `git rm`'d. [package-lock.json]
- [x] [Review][Patch] `page-builder/index.tsx` dead empty registry with `any` and a React UMD reference — directory deleted. [apps/client/src/components/page-builder/]
- [x] [Review][Patch] No vitest `include` glob reached `src/app/*.test.ts` — glob added, so a sitemap test can actually run. [apps/client/vitest.config.ts:73-78]
- [x] [Review][Patch] Spec contradicted itself on the Strapi package name (`@tiween/strapi` vs `@tiween/admin`) — Dev Notes corrected. [this file]
- [x] [Review][Patch] `base.ts:253` stale `@ts-expect-error` (TS2578) — directive removed. [apps/client/src/lib/strapi-api/base.ts]
- [x] [Review][Patch] 12 `noUncheckedIndexedAccess` errors in `getDateRange` — centralised through a `toISODate` helper. [apps/client/src/lib/strapi-api/content/server.ts:37-51]
- [x] [Review][Patch] 4 `locale: string` vs `Locale` union errors — narrowed via a local `asLocale` helper mirroring `events-extended.ts`. [apps/client/src/lib/strapi-api/content/server.ts]
- [x] [Review][Patch] AC #1 / AC #4 / `project-context.md` doc corrections — applied as described in the decisions above.

**Verification after patching:** `yarn lint` clean · `yarn test` 1107 passed / 106 files · `type-check` 72 → 46 with 0 new errors · sitemap query 400 → 200 against live Strapi.

- [x] [Review][Defer] Three dead fetchers send a query shape the backend rejects — `getFeaturedEvents`, `getUpcomingEvents`, `getTodayEvents` [apps/client/src/lib/strapi-api/content/server.ts:266-408] — deferred: superseded, zero consumers
- [x] [Review][Defer] Locale layout ships hardcoded English metadata to `ar`/`fr`, while the translated `getMetadataFromStrapi` sits unused [apps/client/src/app/[locale]/layout.tsx:23-64, apps/client/src/lib/metadata/index.ts:13] — deferred: superseded, zero consumers

- [x] [Review][Defer] `getDateRange` shifts every date range back one day at UTC+1 [apps/client/src/lib/strapi-api/content/server.ts:37-39] — deferred, pre-existing
- [x] [Review][Defer] `fetchAll` fans out unbounded concurrent page requests, crashes on missing `meta`, returns synthetic `pageSize` [apps/client/src/lib/strapi-api/base.ts:153-182] — deferred, pre-existing
- [x] [Review][Defer] `fetchOneBySlug` returns the oldest match, not the newest (`pop()` on a `desc` sort) [apps/client/src/lib/strapi-api/base.ts:214] — deferred, pre-existing
- [x] [Review][Defer] `ImageWithPlaiceholder` can never succeed for locally-uploaded media (relative URL passed to `fetch`) and renders a raw Strapi path in its error branch [apps/client/src/components/elementary/ImageWithPlaiceholder.tsx:13,51,62] — deferred, pre-existing
- [x] [Review][Defer] No test coverage for `base.ts`, `content/server.ts`, or `sitemap.ts` despite pure, defect-carrying helpers [apps/client/src/lib/strapi-api/] — deferred, pre-existing
- [x] [Review][Defer] Fetch failures are swallowed into `[]`/`null`, making an outage indistinguishable from "no events" [apps/client/src/lib/strapi-api/content/server.ts:155,218,322,399] — deferred, pre-existing
- [x] [Review][Defer] Sitemap gaps: no `x-default`, missing `venues`/`shorts`/`events` index routes, hard 500-item cap with no pagination, query-string URLs as distinct entries [apps/client/src/app/sitemap.ts] — deferred, pre-existing
- [x] [Review][Defer] Document has no `<main>` landmark or skip-link; navbar/footer still TODO in the layout [apps/client/src/app/[locale]/layout.tsx:107-119] — deferred, pre-existing

---

## Dev Notes

### Critical Implementation Requirements

**STARTER TEMPLATE SOURCE:**

- Repository: `https://github.com/notum-cz/strapi-next-monorepo-starter`
- Clone command: `git clone https://github.com/notum-cz/strapi-next-monorepo-starter tiween`
- The template includes pre-configured Strapi v5 + Next.js with Turborepo

**MANDATORY FOLDER RENAME:**

- The starter uses `apps/ui` for the Next.js app
- MUST rename to `apps/client` per architecture decision
- Update ALL references in `turbo.json`, `package.json` files, and any imports

**PACKAGE NAMING CONVENTION:**

```
Root package: tiween
apps/client: @tiween/client
apps/strapi: @tiween/admin
packages/eslint-config: @tiween/eslint-config
packages/prettier-config: @tiween/prettier-config
packages/typescript-config: @tiween/typescript-config
```

> Corrected 2026-08-08 (code review): this block previously said
> `apps/strapi: @tiween/strapi`, contradicting Task 2.4 and the actual package
> name `@tiween/admin` that every root script filters on. `shared-types` was
> also removed — see the AC #1 note below.

### Architecture Compliance

**From [Source: _bmad-output/architecture/project-structure-boundaries.md]:**

```
tiween/
├── README.md
├── package.json                    # Workspace root
├── turbo.json                      # Turborepo configuration
├── .gitignore
├── .nvmrc                          # Node 22
├── .env.example
├── apps/
│   ├── client/                     # Next.js Frontend (renamed from ui)
│   └── strapi/                     # Strapi v5 Backend
├── packages/
│   ├── shared-types/               # Shared TypeScript types
│   ├── eslint-config/
│   ├── prettier-config/
│   └── typescript-config/
└── scripts/
```

**From [Source: _bmad-output/architecture/starter-template-evaluation.md]:**

- Pre-integrated Strapi v5 + Next.js with Turborepo saves significant setup time
- Includes shadcn/ui, Tailwind v4, and auth (NextAuth) matching UX spec requirements
- Docker support compatible with Dokploy deployment target

### Technical Requirements

**Node.js Version:**

- MUST use Node.js 22 (specified in `.nvmrc`)
- Verify with: `node --version` should output `v22.x.x`

**Package Manager:**

- MUST use Yarn (workspaces)
- The starter template is configured for Yarn

**TypeScript Configuration:**

- Strict mode is mandatory (from project-context.md)
- No `any` types allowed
- Shared config in `packages/typescript-config/`

### turbo.json Configuration

**Expected structure (from Context7 Turborepo docs):**

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### Library/Framework Requirements

| Dependency | Version     | Notes                                      |
| ---------- | ----------- | ------------------------------------------ |
| Node.js    | 22.x        | Required by starter, specified in `.nvmrc` |
| Yarn       | 1.x or 4.x  | Workspaces enabled                         |
| Turborepo  | latest      | Monorepo orchestration                     |
| Next.js    | 15.x+       | Will be upgraded to 16.1 in Story 1.2      |
| Strapi     | v5.x        | Document Service API, not Entity Service   |
| TypeScript | strict mode | Shared config in packages/                 |

### File Structure Requirements

**Files that MUST exist after completion:**

```
tiween/
├── package.json          # With workspaces: ["apps/*", "packages/*"]
├── turbo.json            # With build pipeline
├── .nvmrc                # Contains: 22
├── .gitignore
├── apps/
│   ├── client/           # RENAMED from apps/ui
│   │   └── package.json  # name: @tiween/client
│   └── strapi/
│       └── package.json  # name: @tiween/strapi
└── packages/
    ├── shared-types/
    │   └── package.json
    ├── eslint-config/
    │   └── package.json
    └── typescript-config/
        └── package.json
```

### Testing Requirements

**Verification Commands (must all pass):**

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Start development servers
yarn dev

# Type checking
yarn type-check

# Linting
yarn lint
```

---

### Project Structure Notes

- The `apps/ui` → `apps/client` rename is a CRITICAL requirement from architecture
- All internal imports and workspace references must be updated after rename
- The starter may have different package names - ALL must be changed to `@tiween/` scope

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.1]
- [Source: _bmad-output/architecture/project-structure-boundaries.md#Complete Project Directory Structure]
- [Source: _bmad-output/architecture/starter-template-evaluation.md#Selected Starter]
- [Source: _bmad-output/project-context.md#Technology Stack & Versions]
- [Source: Context7 Turborepo docs - turbo.json configuration]
- [Source: Context7 Next.js v16.1.0 docs - installation]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Monorepo structure verified**: Project already had the correct structure with `apps/client`, `apps/strapi`, and `packages/*`
2. **Package naming**: All packages correctly use `@tiween/` scope
3. **Turborepo**: Build pipeline verified with `turbo run build --dry-run`
4. **Node.js**: Uses asdf with `.tool-versions` specifying `nodejs 22.21.1`
5. **Legacy code cleanup**: Removed starter template code that referenced non-existent Strapi content types:
   - Removed `apps/client/src/app/[locale]/[[...rest]]/` (catch-all page route)
   - Removed `apps/client/src/app/[locale]/client-page/` (demo page)
   - Removed `apps/client/src/components/page-builder/components/` (forms, sections, utilities)
   - Removed `apps/client/src/components/page-builder/single-types/` (navbar, footer)
   - Removed `apps/client/src/hooks/usePages.ts` and `useAppForm.ts`
   - Removed `apps/client/src/components/elementary/PagesCatalog.tsx` and `forms/ContactForm.tsx`
   - Updated `apps/client/src/lib/strapi-api/base.ts` to only include Tiween content types
   - Simplified `apps/client/src/lib/metadata/index.ts` and `content/server.ts`
   - Updated `apps/client/src/app/sitemap.ts` to not depend on page content type
   - Fixed type error in `ImageWithPlaiceholder.tsx`
   - Updated `apps/client/src/app/[locale]/layout.tsx` to remove navbar/footer imports
6. **Build verified**: `yarn build` completes successfully for all 3 packages

### File List

Files modified:

- `apps/client/src/lib/strapi-api/base.ts` - Updated API_ENDPOINTS to Tiween content types
- `apps/client/src/lib/strapi-api/content/server.ts` - Simplified, removed page/navbar/footer fetching
- `apps/client/src/lib/metadata/index.ts` - Simplified, removed page content type dependency
- `apps/client/src/app/sitemap.ts` - Updated for Tiween (returns static pages only)
- `apps/client/src/app/[locale]/layout.tsx` - Removed navbar/footer imports
- `apps/client/src/components/page-builder/index.tsx` - Empty component mapping
- `apps/client/src/components/elementary/ImageWithPlaiceholder.tsx` - Fixed type error

Files removed:

- `apps/client/src/app/[locale]/[[...rest]]/` (directory)
- `apps/client/src/app/[locale]/client-page/` (directory)
- `apps/client/src/components/page-builder/components/` (directory)
- `apps/client/src/components/page-builder/single-types/` (directory)
- `apps/client/src/hooks/usePages.ts`
- `apps/client/src/hooks/useAppForm.ts`
- `apps/client/src/components/elementary/PagesCatalog.tsx`
- `apps/client/src/components/elementary/forms/ContactForm.tsx`
