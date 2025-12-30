# Story 2A.17: Common Components - EmptyState and ErrorBoundary

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create EmptyState and ErrorBoundary components,
So that the app handles empty data and errors gracefully.

---

## Acceptance Criteria

1. **Given** shadcn/ui components are available
   **When** I create EmptyState and ErrorBoundary components
   **Then** EmptyState is created at `src/components/common/EmptyState/`

2. **And** EmptyState has:

   - Optional illustration slot
   - Title text
   - Description text
   - Primary CTA button
   - Secondary action (optional)

3. **And** preset variants for common cases:

   - No search results
   - Empty watchlist
   - No tickets
   - No events in category
   - Offline mode

4. **And** ErrorBoundary is created at `src/components/common/ErrorBoundary/` with:

   - Error message display
   - "Try again" button
   - Fallback UI
   - Error logging callback

5. **And** both components have Storybook stories

6. **And** components work in RTL mode

---

## Tasks / Subtasks

- [ ] **Task 1: Create EmptyState Component** (AC: #1, #2, #3)

  - [ ] 1.1 Create directory `src/components/common/EmptyState/`
  - [ ] 1.2 Define EmptyStateProps interface
  - [ ] 1.3 Implement illustration slot
  - [ ] 1.4 Add title text
  - [ ] 1.5 Add description text
  - [ ] 1.6 Add primary CTA button
  - [ ] 1.7 Add optional secondary action
  - [ ] 1.8 Create preset variants (noResults, emptyWatchlist, noTickets, noEvents, offline)

- [ ] **Task 2: Create ErrorBoundary Component** (AC: #4)

  - [ ] 2.1 Create directory `src/components/common/ErrorBoundary/`
  - [ ] 2.2 Implement React ErrorBoundary class
  - [ ] 2.3 Create ErrorFallback functional component
  - [ ] 2.4 Add error message display
  - [ ] 2.5 Add "Try again" button
  - [ ] 2.6 Implement onError callback for logging

- [ ] **Task 3: Storybook Stories** (AC: #5)

  - [ ] 3.1 Create EmptyState.stories.tsx
  - [ ] 3.2 Add stories for each preset variant
  - [ ] 3.3 Create ErrorBoundary.stories.tsx
  - [ ] 3.4 Add stories with different error types

- [ ] **Task 4: RTL Support** (AC: #6)
  - [ ] 4.1 Center-align content (works in both directions)
  - [ ] 4.2 Add RTL stories with Arabic text

---

## Dev Notes

### EmptyState Props

```typescript
export type EmptyStateVariant =
  | "noResults"
  | "emptyWatchlist"
  | "noTickets"
  | "noEvents"
  | "offline"
  | "custom"

export interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  illustration?: React.ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}
```

### Preset Configurations

```typescript
const presets: Record<EmptyStateVariant, Partial<EmptyStateProps>> = {
  noResults: {
    title: "Aucun résultat",
    description: "Essayez une autre recherche",
  },
  emptyWatchlist: {
    title: "Votre watchlist est vide",
    description: "Ajoutez des événements pour les retrouver ici",
  },
  noTickets: {
    title: "Pas de billets",
    description: "Vos billets apparaîtront ici après achat",
  },
  noEvents: {
    title: "Aucun événement",
    description: "Aucun événement dans cette catégorie",
  },
  offline: {
    title: "Vous êtes hors ligne",
    description: "Vérifiez votre connexion internet",
  },
}
```

### ErrorBoundary Implementation

```typescript
'use client'

import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

### File Structure

```
apps/client/src/components/common/
├── EmptyState/
│   ├── EmptyState.tsx
│   ├── EmptyState.stories.tsx
│   └── index.ts
├── ErrorBoundary/
│   ├── ErrorBoundary.tsx
│   ├── ErrorFallback.tsx
│   ├── ErrorBoundary.stories.tsx
│   └── index.ts
└── index.ts
```

---

## References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-2a-component-library-design-system-parallel-track-a.md#Story 2A.17]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### File List

- `apps/client/src/components/common/EmptyState/EmptyState.tsx` (to create)
- `apps/client/src/components/common/EmptyState/EmptyState.stories.tsx` (to create)
- `apps/client/src/components/common/EmptyState/index.ts` (to create)
- `apps/client/src/components/common/ErrorBoundary/ErrorBoundary.tsx` (to create)
- `apps/client/src/components/common/ErrorBoundary/ErrorFallback.tsx` (to create)
- `apps/client/src/components/common/ErrorBoundary/ErrorBoundary.stories.tsx` (to create)
- `apps/client/src/components/common/ErrorBoundary/index.ts` (to create)
- `apps/client/src/components/common/index.ts` (to create)
