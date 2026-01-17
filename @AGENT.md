# Tiween - Agent Build Instructions

## Project Overview

**Tiween** is a Next.js 16.1 + Strapi v5 monorepo for Tunisia's cultural events platform.

```
tiween-bmad-version/
├── apps/
│   ├── client/          # Next.js 16.1 (App Router, RSC)
│   └── strapi/          # Strapi v5 backend
├── packages/
│   └── shared-types/    # Shared TypeScript types
└── _bmad-output/        # PRD, epics, tech specs
```

## Project Setup

```bash
# Install all dependencies (from project root)
yarn install

# Or install per-app
cd apps/client && yarn install
cd apps/strapi && yarn install
```

## Development Commands

```bash
# Start all apps (recommended)
yarn dev

# Start individual apps
yarn dev:client       # Next.js on http://localhost:3000
yarn dev:strapi       # Strapi on http://localhost:1337

# Component development
yarn storybook        # Storybook on http://localhost:6006
```

## Build Commands

```bash
# Production build (all apps)
yarn build

# Individual builds
yarn build:client
yarn build:strapi

# Type checking
yarn type-check
```

## Testing

```bash
# Unit tests (Vitest)
yarn test

# E2E tests (Playwright)
yarn test:e2e

# Coverage report
yarn test:coverage
```

## Quality Checks

```bash
# Linting
yarn lint

# Format check
yarn format:check

# Full quality gate
yarn lint && yarn type-check && yarn test
```

## Environment Setup

### Client (.env.local)

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### Strapi (.env)

```env
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tiween
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
ADMIN_JWT_SECRET=your-admin-jwt-secret
```

## Docker Development

```bash
# Start with Docker Compose
docker-compose up -d

# Stop containers
docker-compose down
```

## Key Tech Stack Details

| Technology | Version | Notes                      |
| ---------- | ------- | -------------------------- |
| Next.js    | 16.1    | App Router, RSC by default |
| Strapi     | v5.x    | Document Service API       |
| TypeScript | strict  | No `any` types             |
| Tailwind   | v4      | `@theme` directive         |
| Node.js    | 22.x    | Required by starter        |

## Critical Patterns

### Strapi v5 API Calls

```typescript
// CORRECT: Use Document Service API
const events = await strapi.documents("api::event.event").findMany({
  filters: { category: "cinema" },
  populate: ["venue", "showtimes"],
})

// Access data with documentId (not id)
const eventId = event.documentId
```

### Next.js App Router

```typescript
// Server Component (default)
export default async function EventsPage() {
  const events = await fetchEvents();
  return <EventList events={events} />;
}

// Client Component (only when needed)
'use client';
export function EventCard({ event }) {
  const [isWatched, setIsWatched] = useState(false);
  // ...
}
```

### Component Co-location

```
features/events/
├── EventCard.tsx
├── EventCard.test.tsx
├── EventCard.stories.tsx
└── index.ts
```

## Feature Development Quality Standards

### Testing Requirements

- **Minimum Coverage**: 85% for new code
- **Test Pass Rate**: 100%
- **Test Types**: Unit, Integration, E2E for critical paths

### Git Workflow

```bash
# Conventional commits
git commit -m "feat(events): add category filtering"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "test(watchlist): add offline sync tests"

# Branch naming
feature/event-discovery
fix/payment-validation
docs/api-reference
```

### Feature Completion Checklist

Before marking ANY task complete in @fix_plan.md:

- [ ] All tests pass (`yarn test`)
- [ ] Type checking passes (`yarn type-check`)
- [ ] Linting passes (`yarn lint`)
- [ ] Coverage meets 85% minimum
- [ ] Changes committed with conventional commits
- [ ] Commits pushed to remote
- [ ] @fix_plan.md task marked [x]
- [ ] Documentation updated if needed

## Key Learnings

- **Strapi v5**: Use `documentId` not `id` - this is a breaking change from v4
- **i18n**: Arabic uses Western numerals (25/12/2025), not Arabic-Indic
- **RSC**: Default to Server Components, only use `'use client'` when necessary
- **shadcn/ui**: Copy model, not npm package - components live in `components/ui/`

## Troubleshooting

### Common Issues

**Port conflicts:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Strapi database issues:**

```bash
# Reset database (development only!)
cd apps/strapi
yarn strapi database:reset
```

**Type errors after Strapi changes:**

```bash
# Regenerate types
cd apps/strapi
yarn strapi ts:generate-types
```
