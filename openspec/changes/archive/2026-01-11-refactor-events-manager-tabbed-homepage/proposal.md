# Change: Refactor Events Manager to Tabbed Homepage

## Why

The current Events Manager plugin has a landing page with cards linking to separate Planning and Import pages. This requires extra navigation and context switching. A tabbed interface consolidates both features on the homepage, reduces clicks, and provides a more cohesive workflow for venue managers scheduling events.

## What Changes

### Homepage Restructure

- **Remove card-based landing page:** Replace the current grid of feature cards with a tabbed layout
- **Add Tabs component:** Use Strapi's `Tabs` design-system component for Planning/Import tabs
- **Planning as default tab:** Planning calendar is the primary view, displayed by default
- **Import as secondary tab:** Import functionality moves to the second tab
- **Consolidate routing:** Remove separate `/planning` and `/import` routes; all content lives on the plugin homepage

### Planning Tab Layout

- **Venue/Event Group selectors:** Move dropdowns to the top-right corner of the Planning tab content area (not in the global header)
- **Calendar view:** Full-width calendar component below the selectors
- **Context-aware subtitle:** Dynamic subtitle showing selected venue and event group

### Import Tab Layout

- **Preserved functionality:** Import table, filters, and bulk import button remain unchanged
- **Self-contained:** Import tab operates independently of Planning tab selections

## Impact

- Affected specs:
  - `events-manager-admin` - Homepage layout and tab navigation
- Affected code:
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/HomePage.tsx` - Complete rewrite with tabs
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/App.tsx` - Remove `/planning` and `/import` routes
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Planning/index.tsx` - Extract to component (no longer a page)
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Import/index.tsx` - Extract to component (no longer a page)

## Dependencies

- Existing `@strapi/design-system` Tabs component
- Existing `useVenues` and `useEventGroups` hooks

## Constraints

- **MANDATORY:** All UI components MUST use `@strapi/design-system` exclusively
- Tab state does not persist across page refreshes (acceptable for this use case)
