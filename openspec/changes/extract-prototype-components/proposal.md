# Extract Prototype Components to Reusable React Components with Storybook

## Summary

Convert the 10 HTML prototype files in `apps/client/src/prototypes/` into reusable React components with Storybook stories. The prototypes contain a comprehensive mobile-first UI design for the Tiween event discovery and ticketing platform.

## Motivation

The HTML prototypes represent a complete mobile UI design for:

- Home page with featured events, category filters, and venue listings
- Event detail page with showtimes and venue information
- Search interface with filters and results
- Ticketing flow (4-step wizard: ticket selection, seat selection, contact, payment)
- Ticket confirmation and ticket detail views
- My Tickets page (upcoming/past tabs)
- Account/profile page with settings
- Venue detail page
- Scanner (Tiween Pro) for venue staff

These prototypes contain reusable UI patterns that should be extracted into a component library for:

1. **Consistency**: Ensure UI consistency across the app
2. **Reusability**: Avoid duplicating code when building actual pages
3. **Documentation**: Storybook provides interactive documentation
4. **Testing**: Components can be visually tested in isolation
5. **RTL Support**: Storybook already has RTL toggle configured

## Scope

### In Scope

- Extract ~45 reusable components from prototypes
- Create Storybook stories for all components
- Support RTL (Arabic) layout variants
- Use existing Tailwind theme tokens (tiween-green, tiween-yellow, surface, etc.)
- Follow existing component structure patterns in the codebase
- Create dummy/static props (no API integration)

### Out of Scope

- API integration (these are presentational components with static data)
- Form validation logic
- Authentication/authorization
- State management beyond component-local state
- E2E or integration tests

## Technical Approach

### Component Organization

Components will be organized under `apps/client/src/components/` following the existing structure:

```
components/
├── ui/              # Atomic UI elements (existing)
├── layout/          # Layout components (existing)
├── cards/           # Card variants (new)
├── navigation/      # Navigation components (new)
├── forms/           # Form components (existing)
├── ticketing/       # Ticketing flow components (new)
├── tickets/         # Ticket display components (new)
├── search/          # Search-related components (new)
├── venue/           # Venue-related components (new)
├── scanner/         # Scanner (Pro) components (new)
└── shared/          # Shared utilities/primitives (new)
```

### Component Extraction Strategy

Components are categorized by complexity and dependencies:

**Phase 1 - Primitives & Layout** (~12 components)
Foundation components with no external dependencies.

**Phase 2 - Cards & Display** (~12 components)
Visual display components built on primitives.

**Phase 3 - Navigation & Filters** (~8 components)
Interactive navigation and filter components.

**Phase 4 - Forms & Inputs** (~6 components)
Form elements and input components.

**Phase 5 - Ticketing Flow** (~7 components)
Complex ticketing wizard components.

**Phase 6 - Ticket Views** (~6 components)
Ticket display and scanner components.

## Dependencies

- Existing Storybook configuration (already set up)
- Tailwind CSS with Tiween theme tokens (already configured)
- Existing UI components in `components/ui/`
- Radix UI primitives (already available)

## Risks & Mitigations

| Risk                                          | Mitigation                                       |
| --------------------------------------------- | ------------------------------------------------ |
| Component API design may not fit future needs | Use composition patterns, keep props minimal     |
| RTL support may be incomplete                 | Test all components with RTL toggle in Storybook |
| Accessibility gaps                            | Use Storybook a11y addon (already installed)     |
| Inconsistent styling                          | Strictly use theme tokens, no hardcoded values   |

## Success Criteria

1. All identified components are implemented as React components
2. Each component has at least one Storybook story
3. Components render correctly in both LTR and RTL modes
4. No hardcoded colors (use Tailwind theme classes)
5. Components pass basic accessibility checks in Storybook
