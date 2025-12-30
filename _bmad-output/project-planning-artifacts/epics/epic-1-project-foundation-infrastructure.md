# Epic 1: Project Foundation & Infrastructure

Development teams have a fully configured monorepo with Next.js 16.1, Strapi v5, and all tooling ready for parallel development.

## Story 1.1: Initialize Monorepo from Starter Template

As a **developer**,
I want to have a properly configured monorepo based on the notum-cz/strapi-next-monorepo-starter,
So that I have a solid foundation with Turborepo, TypeScript, and project structure ready for development.

**Acceptance Criteria:**

**Given** the starter template repository is available
**When** I clone the template and run the initialization commands
**Then** the monorepo is created with the following structure:

- `apps/client` (renamed from `apps/ui`) - Next.js frontend
- `apps/strapi` - Strapi v5 backend
- `packages/shared-types` - Shared TypeScript types
- `packages/eslint-config` - Shared ESLint configuration
- `packages/typescript-config` - Shared TypeScript configuration
  **And** `turbo.json` is configured with build pipeline for all apps
  **And** root `package.json` has workspace configuration with Yarn
  **And** `.nvmrc` specifies Node.js 22
  **And** all dependencies install without errors using `yarn install`
  **And** the project is renamed from starter defaults to "tiween"

---

## Story 1.2: Upgrade to Next.js 16.1 with Turbopack

As a **developer**,
I want to upgrade the frontend to Next.js 16.1,
So that I benefit from Turbopack as default bundler, React Compiler support, and latest security fixes.

**Acceptance Criteria:**

**Given** the monorepo is initialized with the starter template
**When** I upgrade the `apps/client` package to Next.js 16.1
**Then** `next` dependency is updated to version 16.1.x in `apps/client/package.json`
**And** `next.config.ts` is updated for Next.js 16.1 compatibility
**And** Turbopack is enabled as the default bundler for development
**And** `yarn dev` starts the development server without errors
**And** `yarn build` completes successfully without errors
**And** the app renders the default page at `http://localhost:3000`

---

## Story 1.3: Configure Tiween Design Tokens and Tailwind Theme

As a **developer**,
I want to configure Tailwind CSS with Tiween brand colors and typography,
So that all components use consistent brand styling throughout the application.

**Acceptance Criteria:**

**Given** the Next.js 16.1 app is running
**When** I configure Tailwind with Tiween design tokens
**Then** `tailwind.config.ts` includes the following color tokens:

- `tiween-green`: #032523 (primary background)
- `tiween-yellow`: #F8EB06 (accent/CTA)
- `surface`: #0A3533 (elevated cards)
- `surface-light`: #0F4542 (hover states)
  **And** CSS variables are defined in `globals.css` for shadcn/ui compatibility:
- `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--destructive`
  **And** typography is configured with:
- Lalezar font loaded for display headings
- Inter font loaded for body text
- Noto Sans Arabic font loaded for Arabic body text
  **And** the spacing scale uses 4px base unit
  **And** a test page displays all colors and typography correctly

---

## Story 1.4: Setup shadcn/ui with Brand Customization

As a **developer**,
I want to install and configure shadcn/ui with Tiween brand styling,
So that I have accessible, customizable UI components as a foundation.

**Acceptance Criteria:**

**Given** Tailwind is configured with Tiween design tokens
**When** I initialize and configure shadcn/ui
**Then** `components.json` is created with correct paths and aliases
**And** the following core components are installed:

- Button, Card, Badge, Tabs, Dialog, Sheet, Input, Select, Form, Label, Skeleton, Toast, Progress
  **And** components are installed to `src/components/ui/`
  **And** Button component renders with yellow primary variant on dark background
  **And** all components respect the dark theme (no light mode toggle)
  **And** focus states use yellow outline (3px) for accessibility
  **And** `cn()` utility is available in `src/lib/utils.ts`

---

## Story 1.5: Configure Storybook with Vite Builder

As a **developer**,
I want to set up Storybook for isolated component development,
So that I can develop and document UI components independently.

**Acceptance Criteria:**

**Given** shadcn/ui is installed and configured
**When** I initialize Storybook with Vite builder
**Then** Storybook is installed with `@storybook/nextjs-vite` builder
**And** `.storybook/main.ts` is configured for Next.js App Router
**And** `.storybook/preview.ts` includes:

- Tailwind CSS globals
- Dark theme by default
- RTL/LTR toggle decorator
- Viewport presets for mobile (375px), tablet (768px), desktop (1280px)
  **And** `yarn storybook` starts Storybook at `http://localhost:6006`
  **And** a sample Button story renders correctly with all variants
  **And** Storybook build completes without errors

---

## Story 1.6: Configure i18n with RTL Support

As a **developer**,
I want to configure internationalization with Arabic, French, and English support,
So that the application supports all three languages with proper RTL layout for Arabic.

**Acceptance Criteria:**

**Given** the Next.js app is configured
**When** I set up next-intl for i18n
**Then** `next-intl` is installed and configured in `next.config.ts`
**And** routing is configured with locale prefix: `/ar/`, `/fr/`, `/en/`
**And** `src/messages/` directory contains translation files:

- `ar.json` (Arabic)
- `fr.json` (French - default)
- `en.json` (English)
  **And** `middleware.ts` handles locale detection and redirection
  **And** `[locale]` dynamic segment is added to app directory structure
  **And** `dir` attribute is set to `rtl` when locale is Arabic
  **And** Tailwind `rtl:` variant is enabled in config
  **And** a test page displays correctly in all three languages
  **And** language switching works without page reload

---

## Story 1.7: Setup Serwist PWA Configuration

As a **developer**,
I want to configure Serwist for PWA service worker support,
So that the application can be installed and work offline.

**Acceptance Criteria:**

**Given** the Next.js 16.1 app is configured
**When** I set up Serwist for PWA
**Then** `serwist` and `@serwist/next` are installed
**And** `serwist.config.ts` is created with caching strategies:

- Cache-first for static assets (JS, CSS, images)
- Network-first with fallback for API routes
  **And** `public/manifest.json` is created with:
- `name`: "Tiween"
- `short_name`: "Tiween"
- `display`: "standalone"
- `theme_color`: "#032523"
- `background_color`: "#032523"
- `start_url`: "/"
- Icons in 192x192 and 512x512 sizes
  **And** service worker is generated during build
  **And** the app is installable on Chrome Android
  **And** basic offline page is shown when offline

---

## Story 1.8: Configure Docker and Dokploy Deployment

As a **developer**,
I want to configure Docker for local development and Dokploy deployment,
So that the application can be deployed to production infrastructure.

**Acceptance Criteria:**

**Given** the monorepo is fully configured
**When** I set up Docker configuration
**Then** `docker-compose.yml` is created for local development with:

- Next.js client container
- Strapi container
- PostgreSQL container
- Redis container
  **And** `docker-compose.prod.yml` is created for production with:
- Optimized multi-stage builds
- Environment variable configuration
- Health checks
  **And** `Dockerfile` is created for each app (`apps/client`, `apps/strapi`)
  **And** `.env.example` files document all required environment variables
  **And** `docker-compose up` starts all services locally
  **And** containers can communicate (client → strapi → postgres/redis)

---

## Story 1.9: Setup CI/CD Pipeline with GitHub Actions

As a **developer**,
I want to configure GitHub Actions for continuous integration,
So that code quality is automatically verified on every push and pull request.

**Acceptance Criteria:**

**Given** the project is in a GitHub repository
**When** I configure GitHub Actions workflows
**Then** `.github/workflows/ci.yml` is created with jobs for:

- Lint (ESLint on all packages)
- Type check (TypeScript strict mode)
- Test (Vitest unit tests)
- Build (production build of all apps)
  **And** workflows run on push to `main` and on pull requests
  **And** Turborepo caching is enabled for faster CI runs
  **And** `.github/workflows/deploy-staging.yml` is created (placeholder for Dokploy)
  **And** `.github/workflows/deploy-production.yml` is created (placeholder for Dokploy)
  **And** CI passes on a clean commit

---
