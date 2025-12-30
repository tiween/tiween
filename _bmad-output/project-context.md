---
project_name: "tiween"
user_name: "Ayoub"
date: "2025-12-26"
sections_completed: ["all"]
status: "complete"
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code for Tiween. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Category           | Technology           | Version     | Notes                                     |
| ------------------ | -------------------- | ----------- | ----------------------------------------- |
| **Frontend**       | Next.js (App Router) | 15.x        | Use RSC by default                        |
| **Backend**        | Strapi               | v5.x        | Document Service API (not Entity Service) |
| **Language**       | TypeScript           | strict mode | No `any` types                            |
| **Styling**        | Tailwind CSS         | v4          | Use `@theme` directive                    |
| **Components**     | shadcn/ui            | latest      | Copy model, not npm package               |
| **State (client)** | Zustand              | latest      | With devtools + persist                   |
| **State (server)** | SWR                  | latest      | For Strapi data fetching                  |
| **Auth**           | NextAuth.js          | latest      | JWT strategy                              |
| **i18n**           | next-intl            | latest      | AR/FR/EN locales                          |
| **PWA**            | Serwist              | latest      | next-pwa successor                        |
| **Testing**        | Vitest + Playwright  | latest      | Co-located tests                          |
| **Database**       | PostgreSQL           | 16.x        | Via Strapi                                |
| **Cache**          | Redis                | 7.x         | Sessions, rate limiting                   |
| **Monorepo**       | Turborepo            | latest      | Yarn workspaces                           |
| **Node**           | Node.js              | 22.x        | Required by starter                       |

---

## Critical Implementation Rules

### TypeScript Rules

- **Strict mode is mandatory** - No `any` types, use `unknown` and narrow
- **Use Zod for runtime validation** - All API inputs must be validated
- **Export types from `packages/shared-types/`** - Never duplicate type definitions
- **Use `satisfies` for type inference** - Preserve literal types where needed
- **Prefer `interface` for objects, `type` for unions** - Consistent type definitions

### Next.js App Router Rules

- **Server Components by default** - Only use `'use client'` when necessary
- **Use `generateMetadata` for SEO** - Never hardcode meta tags
- **Route groups for layouts** - `(public)`, `(auth)`, `(venue)` organization
- **Co-locate loading.tsx and error.tsx** - Per route segment
- **Use `revalidatePath` for ISR** - Not `revalidateTag` unless needed

### Strapi v5 Rules

- **Use Document Service API** - Entity Service is deprecated
- **Never transform API responses** - Use `data.attributes` pattern directly
- **Use `documentId` not `id`** - Strapi v5 breaking change
- **Enable i18n on content types** - AR/FR/EN locales required
- **Use REST, not GraphQL** - Architecture decision

### Component Rules

- **Feature components in `features/`** - Domain logic stays in feature folders
- **Shared components in `components/`** - Only truly reusable UI
- **Co-locate tests and stories** - `Component.test.tsx` + `Component.stories.tsx`
- **Use shadcn/ui primitives** - Never build custom where shadcn exists
- **Export via `index.ts` barrel** - Clean imports

### State Management Rules

**Zustand Stores:**

```typescript
// ALWAYS use this pattern
export const useXxxStore = create<XxxStore>()(
  devtools(
    persist(
      (set) => ({
        /* state and actions */
      }),
      { name: "xxx-storage" }
    )
  )
)
```

**SWR Hooks:**

```typescript
// ALWAYS use array keys for cache invalidation
const { data } = useSWR(["events", filters], fetcher)
```

### Error Handling Rules

- **Return error CODES, not messages** - e.g., `"TICKET_SOLD_OUT"`
- **Translate in frontend with next-intl** - `t(error.code)`
- **Use Error Boundaries** - Per route segment
- **Log to Sentry** - All unhandled errors
- **Never expose stack traces** - Production safety

### i18n Rules

- **Arabic uses Western numerals** - `25/12/2025` not `٢٥/١٢/٢٠٢٥`
- **RTL is automatic** - next-intl handles direction
- **Date format: DD/MM/YYYY** - French format for all locales
- **Store translations in `messages/`** - `fr.json`, `ar.json`, `en.json`
- **Use `useTranslations` hook** - Never hardcode strings

### API Communication Rules

- **Use `lib/api/strapi.ts` client** - Centralized API calls
- **Handle Strapi response format directly:**

```typescript
// CORRECT
const title = response.data.attributes.title

// WRONG - never transform
const title = response.title
```

### Testing Rules

- **Co-locate tests** - `Component.test.tsx` next to `Component.tsx`
- **Use Vitest for unit tests** - Not Jest
- **Use Playwright for E2E** - Critical paths only
- **Write Storybook stories** - All visual components
- **Mock Strapi responses** - Use MSW or Vitest mocks

### File Organization Rules

```
apps/client/src/
├── app/[locale]/        # Pages (App Router)
├── components/          # Shared UI only
├── features/            # Domain logic + components
├── hooks/               # Shared hooks
├── stores/              # Zustand stores
├── lib/                 # Utilities, API clients
├── types/               # Local types
└── messages/            # i18n translations
```

### Naming Conventions

| Element    | Convention         | Example            |
| ---------- | ------------------ | ------------------ |
| Components | PascalCase         | `EventCard.tsx`    |
| Hooks      | camelCase + use    | `useEvents.ts`     |
| Stores     | camelCase + Store  | `cartStore.ts`     |
| Utils      | camelCase          | `formatDate.ts`    |
| Constants  | SCREAMING_SNAKE    | `MAX_TICKETS`      |
| Features   | kebab-case folders | `venue-dashboard/` |

---

## Critical Anti-Patterns

### NEVER Do These:

1. **Transform Strapi responses** - Use `data.attributes` directly
2. **Hardcode error messages** - Return codes, translate in UI
3. **Use `any` type** - Use `unknown` and narrow
4. **Put feature code in `components/`** - Use `features/` folder
5. **Create `__tests__` folders** - Co-locate tests
6. **Use Arabic-Indic numerals** - Western numerals only
7. **Skip Zod validation** - All inputs must validate
8. **Use Entity Service API** - Strapi v5 uses Document Service
9. **Nest Zustand state** - Keep stores flat
10. **Skip loading/error states** - Every async needs both

### Security Rules

- **Never expose API keys in client** - Use server actions or API routes
- **Validate all user inputs** - Zod schemas required
- **Use HMAC-SHA256 for QR tickets** - Cryptographic signing
- **Rate limit with Redis** - Protect sensitive endpoints
- **Sanitize user content** - XSS prevention

---

## B2B vs B2C Boundary

| Feature            | Interface        | Notes                     |
| ------------------ | ---------------- | ------------------------- |
| Event discovery    | Next.js client   | Public pages              |
| User dashboard     | Next.js client   | Authenticated             |
| Ticket purchase    | Next.js client   | + Konnect payment         |
| QR Scanner         | Next.js client   | Mobile-friendly page      |
| Venue management   | **Strapi Admin** | Venue Manager role        |
| Content management | **Strapi Admin** | Editor/Admin roles        |
| Analytics          | **Strapi Admin** | Via events-manager plugin |

---

## External Service Integration

| Service      | Usage     | Integration Point              |
| ------------ | --------- | ------------------------------ |
| **Konnect**  | Payments  | `lib/api/konnect.ts` + webhook |
| **Algolia**  | Search    | `lib/api/algolia.ts`           |
| **ImageKit** | Media CDN | Strapi upload provider         |
| **Resend**   | Email     | Strapi email plugin            |
| **Sentry**   | Errors    | Both apps configured           |

---

## Quick Reference Commands

```bash
# Development
yarn dev              # Start all apps
yarn dev:client       # Next.js only
yarn dev:strapi       # Strapi only
yarn storybook        # Component dev

# Testing
yarn test             # Unit tests
yarn test:e2e         # Playwright

# Quality
yarn lint             # ESLint
yarn type-check       # TypeScript
```
