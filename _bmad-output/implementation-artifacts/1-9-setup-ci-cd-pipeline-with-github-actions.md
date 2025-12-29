# Story 1.9: Setup CI/CD Pipeline with GitHub Actions

Status: review

---

## Story

As a **developer**,
I want to configure GitHub Actions for continuous integration,
So that code quality is automatically verified on every push and pull request.

---

## Acceptance Criteria

1. **Given** the project is in a GitHub repository
   **When** I configure GitHub Actions workflows
   **Then** `.github/workflows/ci.yml` is created with jobs for:

   - Lint (ESLint on all packages)
   - Type check (TypeScript strict mode)
   - Test (Vitest unit tests)
   - Build (production build of all apps)

2. **And** workflows run on push to `main` and on pull requests

3. **And** Turborepo caching is enabled for faster CI runs

4. **And** `.github/workflows/deploy-staging.yml` is created (placeholder for Dokploy)

5. **And** `.github/workflows/deploy-production.yml` is created (placeholder for Dokploy)

6. **And** CI passes on a clean commit

---

## Tasks / Subtasks

- [x] **Task 1: Create CI Workflow** (AC: #1, #2, #3)

  - [x] 1.1 CI workflow already existed - enhanced with new jobs
  - [x] 1.2 Configure triggers: push to main, pull_request, workflow_dispatch
  - [x] 1.3 Set up Node.js 22
  - [x] 1.4 Configure Yarn caching
  - [x] 1.5 Configure Turborepo remote caching (TURBO_TOKEN, TURBO_TEAM)

- [x] **Task 2: Add Lint Job** (AC: #1)

  - [x] 2.1 Lint job already existed
  - [x] 2.2 Run `yarn lint` via Turborepo
  - [x] 2.3 Format check included

- [x] **Task 3: Add Type Check Job** (AC: #1)

  - [x] 3.1 Added type-check job to CI workflow
  - [x] 3.2 Run `yarn type-check` via Turborepo
  - [x] 3.3 Added type-check task to turbo.json

- [x] **Task 4: Add Test Job** (AC: #1)

  - [x] 4.1 Added test job to CI workflow
  - [x] 4.2 Run `yarn test` via Turborepo
  - [x] 4.3 Test task already configured in turbo.json

- [x] **Task 5: Add Build Job** (AC: #1)

  - [x] 5.1 Build job already existed
  - [x] 5.2 Updated to depend on lint, type-check, test
  - [x] 5.3 Build all apps (client, strapi)
  - [x] 5.4 Turbo cache configured

- [x] **Task 6: Create Staging Deploy Workflow** (AC: #4)

  - [x] 6.1 Created `.github/workflows/deploy-staging.yml`
  - [x] 6.2 Configure trigger on push to `develop` branch
  - [x] 6.3 Add placeholder for Dokploy deployment
  - [x] 6.4 Document required secrets

- [x] **Task 7: Create Production Deploy Workflow** (AC: #5)

  - [x] 7.1 Created `.github/workflows/deploy-production.yml`
  - [x] 7.2 Configure trigger on push to `main` branch + workflow_dispatch
  - [x] 7.3 Add placeholder for Dokploy deployment
  - [x] 7.4 Add manual approval via GitHub environment protection
  - [x] 7.5 Document required secrets

- [x] **Task 8: Add Turbo Scripts to package.json** (AC: #1)

  - [x] 8.1 `lint` script already exists
  - [x] 8.2 Added `type-check` script
  - [x] 8.3 Added `test` script
  - [x] 8.4 `build` script already exists

- [ ] **Task 9: Verify CI Pipeline** (AC: #6)
  - [ ] 9.1 Manual: Push to branch and create PR
  - [ ] 9.2 Manual: Verify all CI jobs run
  - [ ] 9.3 Manual: Verify all jobs pass
  - [ ] 9.4 Manual: Verify caching works on second run

---

## Dev Notes

### Critical Implementation Requirements

**CI WORKFLOW:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Lint
        run: yarn lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Type Check
        run: yarn type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Test
        run: yarn test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build
        run: yarn build
        env:
          NEXT_PUBLIC_STRAPI_URL: http://localhost:1337
```

**STAGING DEPLOY WORKFLOW:**

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

concurrency:
  group: deploy-staging
  cancel-in-progress: true

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build
        run: yarn build
        env:
          NEXT_PUBLIC_STRAPI_URL: ${{ secrets.STAGING_STRAPI_URL }}

      # TODO: Add Dokploy deployment steps
      # - name: Deploy to Dokploy
      #   run: |
      #     # Add Dokploy CLI commands here
      #     echo "Deploying to staging..."

      - name: Placeholder - Deploy
        run: |
          echo "🚀 Staging deployment placeholder"
          echo "Configure Dokploy deployment in this step"
          echo "Required secrets:"
          echo "  - DOKPLOY_API_KEY"
          echo "  - STAGING_STRAPI_URL"
```

**PRODUCTION DEPLOY WORKFLOW:**

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build
        run: yarn build
        env:
          NEXT_PUBLIC_STRAPI_URL: ${{ secrets.PRODUCTION_STRAPI_URL }}

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build]
    environment:
      name: production
      url: https://tiween.tn
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # TODO: Add Dokploy deployment steps
      # - name: Deploy to Dokploy
      #   run: |
      #     # Add Dokploy CLI commands here
      #     echo "Deploying to production..."

      - name: Placeholder - Deploy
        run: |
          echo "🚀 Production deployment placeholder"
          echo "Configure Dokploy deployment in this step"
          echo "Required secrets:"
          echo "  - DOKPLOY_API_KEY"
          echo "  - PRODUCTION_STRAPI_URL"
          echo ""
          echo "⚠️  Manual approval required before this job runs"
```

**ROOT PACKAGE.JSON SCRIPTS:**

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "clean": "turbo run clean"
  }
}
```

**TURBO.JSON CONFIGURATION:**

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
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Architecture Compliance

**From [Source: _bmad-output/architecture/core-architectural-decisions.md]:**

- CI/CD: GitHub Actions (included in starter template)
- Hosting: Dokploy on VPS

**From [Source: _bmad-output/architecture/project-structure-boundaries.md]:**

```
.github/
└── workflows/
    ├── ci.yml
    ├── deploy-staging.yml
    └── deploy-production.yml
```

### Previous Story Intelligence

**From Story 1-8 (ready-for-dev):**

- Docker configuration complete
- Production build verified

**DEPENDENCY:** This story can run in parallel with other Epic 1 stories.

### Technical Requirements

**GitHub Secrets Required:**

- `TURBO_TOKEN` - Turborepo remote cache token
- `DOKPLOY_API_KEY` - Dokploy deployment (placeholder)
- `STAGING_STRAPI_URL` - Staging Strapi URL
- `PRODUCTION_STRAPI_URL` - Production Strapi URL

**GitHub Environments:**

- `staging` - For develop branch deploys
- `production` - For main branch deploys (with protection rules)

### File Structure After Completion

```
.github/
└── workflows/
    ├── ci.yml
    ├── deploy-staging.yml
    └── deploy-production.yml
```

### Testing Requirements

**CI Verification:**

1. Create a PR
2. Verify all jobs run (lint, type-check, test, build)
3. Verify jobs pass
4. Merge PR
5. Verify deploy workflow triggers

---

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.9]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#CI/CD]
- [Source: Turborepo documentation - Remote Caching]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- CI workflow already existed with lint, build, and release jobs
- Added type-check and test jobs to CI workflow
- Build job now depends on lint, type-check, and test jobs
- Release job updated to depend on all jobs including type-check and test
- Added Turborepo remote caching environment variables (TURBO_TOKEN, TURBO_TEAM)
- Created staging and production deploy workflows with Dokploy placeholders

### Completion Notes List

- Enhanced existing `.github/workflows/ci.yml` with type-check and test jobs
- Added `type-check` task to `turbo.json` (depends on ^build)
- Added `type-check` and `test` scripts to root `package.json`
- Created `.github/workflows/deploy-staging.yml` for develop branch deploys
- Created `.github/workflows/deploy-production.yml` for main branch deploys with manual approval
- Both deploy workflows include documented placeholder for Dokploy configuration
- Verified `yarn type-check` runs successfully via Turborepo
- Manual testing of CI pipeline required for full verification

### File List

- `.github/workflows/ci.yml` (modified - added type-check and test jobs)
- `.github/workflows/deploy-staging.yml` (created)
- `.github/workflows/deploy-production.yml` (created)
- `turbo.json` (modified - added type-check task)
- `package.json` (modified - added type-check and test scripts)

### Change Log

- 2025-12-29: Configured CI/CD pipeline with GitHub Actions for lint, type-check, test, build, and deployment
