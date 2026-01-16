# Change: Refactor Events Manager Pages to Use Strapi Layout Components

## Why

The events-manager plugin pages currently use a mix of layout approaches: `HomePage.tsx` uses the standard `Layouts.Root/Header/Content` pattern from `@strapi/strapi/admin`, while other pages (`Dashboard`, `Planning`, `Venues`, `Import`) use a custom `PageHeader` component that duplicates built-in functionality. This inconsistency:

- Makes maintenance harder as patterns diverge
- Misses accessibility features built into Strapi's standard components
- Doesn't follow the official Strapi plugin design guidelines

## What Changes

### Layout Standardization

- **Remove custom `PageHeader` component** - Replace with `Layouts.Header` from `@strapi/strapi/admin`
- **Wrap all pages with `Layouts.Root` and `Main`** - Standard container for content
- **Use `Layouts.Content` for page body** - Provides consistent padding and scroll behavior
- **Keep `PluginLayout` with `SideNav`** - The side navigation pattern is valid for multi-page plugins; pages will use `Layouts` inside the outlet

### Per-Page Changes

1. **DashboardPage** - Replace `PageHeader` with `Layouts.Header`, wrap content in `Layouts.Root/Main/Content`
2. **PlanningPage** - Replace `PageHeader` with `Layouts.Header`, wrap content in `Layouts.Root/Main/Content`
3. **VenuesPage** - Replace `PageHeader` with `Layouts.Header`, wrap content in `Layouts.Root/Main/Content`
4. **ImportPage** - Replace `PageHeader` with `Layouts.Header`, wrap content in `Layouts.Root/Main/Content`
5. **HomePage** - Already follows correct pattern (keep as-is or consolidate with App routing)

### Component Cleanup

- **Delete `PageHeader` component** - No longer needed after migration
- **Update imports** - Switch from custom component to `@strapi/strapi/admin` imports

## Impact

- Affected specs: `events-manager-admin` (existing admin UI capability)
- Affected code:
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Dashboard/index.tsx`
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Planning/index.tsx`
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Venues/index.tsx`
  - `apps/strapi/src/plugins/events-manager/admin/src/pages/Import/index.tsx`
  - `apps/strapi/src/plugins/events-manager/admin/src/components/PageHeader/index.tsx` (delete)

## Non-Goals

- This change does NOT add new features or functionality
- This change does NOT modify the side navigation pattern (SideNav stays)
- This change does NOT affect server-side code or content types
