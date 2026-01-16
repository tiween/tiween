# Project Context

## Purpose

Tiween is a platform for discovering and managing creative works, events, and ticketing in Morocco. The platform enables users to browse events, manage watchlists, and purchase tickets for shows and cultural experiences.

## Tech Stack

### Monorepo Structure

- **Package Manager:** Yarn Workspaces
- **Build System:** Turborepo
- **Node.js:** >= 22

### Frontend (`apps/client`)

- **Framework:** Next.js 16+ with App Router
- **React:** 19.0.0
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation
- **UI Components:** Radix UI primitives + custom components
- **i18n:** next-intl
- **Auth:** NextAuth.js v4

### Backend (`apps/strapi`)

- **CMS:** Strapi 5
- **Database:** PostgreSQL
- **Storage:** AWS S3 / ImageKit
- **Email:** Brevo (via custom provider)

### Custom Strapi Plugins

- `events-manager` - Event and showtime management
- `creative-works` - Movies, shows, and creative content
- `geography` - Regions, cities, venues
- `ticketing` - Ticket orders and management
- `user-engagement` - Watchlists and user preferences

### Shared Packages

- `@tiween/shared-types` - Shared TypeScript types
- `@tiween/eslint-config` - ESLint configuration
- `@tiween/prettier-config` - Prettier configuration
- `@tiween/typescript-config` - TypeScript base configs

## Project Conventions

### Code Style

- Prettier with `@tiween/prettier-config`
- ESLint with `@tiween/eslint-config`
- Use absolute imports with `@/` alias
- Functional components with hooks
- Avoid `any` types - use proper TypeScript typing

### Architecture Patterns

- **API Routes:** Use Next.js API routes for server actions
- **Data Fetching:** Server components fetch directly; client components use React Query
- **Forms:** React Hook Form with Zod schemas for validation
- **Component Structure:** Feature-based organization under `components/`
- **Strapi Plugins:** Domain-driven design - each plugin handles a specific domain

### Testing Strategy

- Jest for Strapi unit tests
- Storybook for component documentation
- Chromatic for visual regression testing

### Git Workflow

- Conventional Commits (enforced via commitlint)
- Semantic Release for versioning
- Husky + lint-staged for pre-commit hooks
- Branch: `develop` for active development

## Domain Context

- **Creative Works:** Movies, shows, and cultural content with metadata (genres, cast, crew)
- **Events:** Scheduled showings of creative works at venues
- **Showtimes:** Specific time slots for events
- **Venues:** Physical locations where events occur (theaters, cinemas)
- **Geography:** Morocco-focused with regions and cities
- **Tickets:** Purchase and order management for event attendance
- **Watchlists:** User-curated lists of interested creative works

## Important Constraints

- **Locale:** Primary focus on Morocco (ar-MA, fr-MA locales)
- **Strapi Version:** Must maintain Strapi 5 compatibility
- **React Versions:** Client uses React 19, Strapi admin uses React 18
- **Image Handling:** Use plaiceholder for blur placeholders
- **Environment:** Docker Compose for local PostgreSQL

## External Dependencies

- **Brevo:** Email service for notifications
- **ImageKit:** Image CDN and transformations
- **AWS S3:** File storage (alternative to ImageKit)
- **reCAPTCHA v3:** Form protection
- **Sentry:** Error tracking (Strapi plugin)
