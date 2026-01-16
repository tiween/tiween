# Change: Add Strapi DS Big Calendar Component

## Why

The current `PlanningCalendar` component relies on FullCalendar, a third-party library that requires extensive CSS overrides to match Strapi Design System styling. This creates maintenance overhead and inconsistent UX. A native Strapi DS-based calendar component will provide:

1. **Consistent styling** - Uses Strapi DS tokens directly without CSS hacks
2. **Smaller bundle** - No FullCalendar dependency (~150KB gzipped)
3. **Better control** - Full customization without fighting library internals
4. **Reusability** - Can be used across plugins (events-manager, ticketing, etc.)

## What Changes

### MVP Scope (Phase 1)

- New `BigCalendar` component using Strapi DS primitives (`Box`, `Flex`, `Typography`, `Button`, `IconButton`)
- **Day View**: Single day with configurable time slots
- **Week View**: 7-day grid with time slots
- **Navigation**: Previous/Next buttons, Today button, date display
- **Current Time Indicator**: Visual line showing current time with pulse animation
- **Configurable Slot Interval**: Support for 15min, 30min, 1hour slots
- **Event rendering**: Render events as positioned blocks within time slots

### Future Scope (Not in MVP)

- Month view
- Drag-and-drop event moving
- Event resizing
- Multi-day events
- Recurring event indicators

## Impact

- **Affected specs**: New `strapi-calendar` capability
- **Affected code**:
  - `apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/` (new)
  - Replaces `PlanningCalendar` component directly (development phase - no backward compatibility needed)
  - Removes FullCalendar dependency from `package.json`
- **Dependencies**: None new (uses existing `@strapi/design-system`, `@strapi/icons`, `styled-components`)
- **Breaking changes**: None externally - direct replacement during development

## Design Decisions

See `design.md` for detailed technical decisions on:

- Time slot rendering approach
- Event positioning algorithm
- Accessibility considerations
- Performance optimizations for large event sets
