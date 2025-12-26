# Story 1.1: Initialize Monorepo from Starter Template

Status: ready-for-dev

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
   - `apps/strapi` - Strapi v5 backend
   - `packages/shared-types` - Shared TypeScript types
   - `packages/eslint-config` - Shared ESLint configuration
   - `packages/typescript-config` - Shared TypeScript configuration

2. **And** `turbo.json` is configured with build pipeline for all apps

3. **And** root `package.json` has workspace configuration with Yarn

4. **And** `.nvmrc` specifies Node.js 22

5. **And** all dependencies install without errors using `yarn install`

6. **And** the project is renamed from starter defaults to "tiween"

---

## Tasks / Subtasks

- [ ] **Task 1: Clone and Initialize Starter Template** (AC: #1)
  - [ ] 1.1 Clone `notum-cz/strapi-next-monorepo-starter` to local directory named `tiween`
  - [ ] 1.2 Remove `.git` directory to start fresh
  - [ ] 1.3 Initialize new git repository with `git init`
  - [ ] 1.4 Verify Node.js 22 is active (check `.nvmrc` or create one)

- [ ] **Task 2: Rename and Configure Project Identity** (AC: #6)
  - [ ] 2.1 Update root `package.json` with name: "tiween"
  - [ ] 2.2 Rename `apps/ui` directory to `apps/client`
  - [ ] 2.3 Update `apps/client/package.json` name to "@tiween/client"
  - [ ] 2.4 Update `apps/strapi/package.json` name to "@tiween/strapi"
  - [ ] 2.5 Update all package names in `packages/` to use `@tiween/` scope
  - [ ] 2.6 Update workspace references in root `package.json`

- [ ] **Task 3: Verify and Configure Turborepo** (AC: #2)
  - [ ] 3.1 Verify `turbo.json` exists at root
  - [ ] 3.2 Ensure build pipeline includes: `build`, `dev`, `lint`, `test`
  - [ ] 3.3 Configure outputs for caching (`.next/**`, `dist/**`)
  - [ ] 3.4 Verify dependency graph with `turbo run build --dry-run`

- [ ] **Task 4: Configure Yarn Workspaces** (AC: #3)
  - [ ] 4.1 Verify `workspaces` field in root `package.json` includes `apps/*` and `packages/*`
  - [ ] 4.2 Check for `.yarnrc.yml` if using Yarn 2+
  - [ ] 4.3 Run `yarn install` and verify no errors

- [ ] **Task 5: Verify Node.js Configuration** (AC: #4)
  - [ ] 5.1 Create or update `.nvmrc` with content: `22`
  - [ ] 5.2 Verify engines field in root `package.json`: `"node": ">=22"`
  - [ ] 5.3 Test with `nvm use` command

- [ ] **Task 6: Final Verification** (AC: #5)
  - [ ] 6.1 Delete `node_modules` and `yarn.lock` (clean install test)
  - [ ] 6.2 Run `yarn install` - must complete without errors
  - [ ] 6.3 Run `yarn build` - must complete without errors
  - [ ] 6.4 Verify apps start: `yarn dev` (both client and strapi)
  - [ ] 6.5 Create initial git commit

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
apps/strapi: @tiween/strapi
packages/shared-types: @tiween/shared-types
packages/eslint-config: @tiween/eslint-config
packages/typescript-config: @tiween/typescript-config
```

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

| Dependency | Version | Notes |
|------------|---------|-------|
| Node.js | 22.x | Required by starter, specified in `.nvmrc` |
| Yarn | 1.x or 4.x | Workspaces enabled |
| Turborepo | latest | Monorepo orchestration |
| Next.js | 15.x+ | Will be upgraded to 16.1 in Story 1.2 |
| Strapi | v5.x | Document Service API, not Entity Service |
| TypeScript | strict mode | Shared config in packages/ |

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

