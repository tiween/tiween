# Tasks: Refactor Events Manager to Tabbed Homepage

> **Note**: The implementation evolved from a tabbed homepage to a side navigation layout with dedicated routes. This provides better UX for the expanded feature set (Planning, Venues, Import).

## 1. Prepare Components

- [x] 1.1 Create `PlanningTab` component by extracting content from `Planning/index.tsx`
  - Evolved to: `PlanningPage` component with side nav layout
- [x] 1.2 Create `ImportTab` component by extracting content from `Import/index.tsx`
  - Evolved to: `ImportPage` component with side nav layout
- [x] 1.3 Move venue/event group selectors into PlanningTab (top-right positioning)
  - Implemented: Selectors in PageHeader primary action slot

## 2. Implement Tabbed Homepage

- [x] 2.1 Rewrite `HomePage.tsx` with Strapi `Tabs` component
  - Evolved to: Side navigation layout with `PluginLayout` wrapper
- [x] 2.2 Add Planning tab (default/active) with PlanningTab component
  - Evolved to: `/planning` route as default
- [x] 2.3 Add Import tab with ImportTab component
  - Evolved to: `/import` route
- [x] 2.4 Update page header title and subtitle
  - Implemented: Dynamic subtitles per page

## 3. Update Routing

- [x] 3.1 Update `App.tsx` to remove `/planning` and `/import` routes
  - Inverted: Using dedicated routes with side nav instead of tabs
- [x] 3.2 Ensure homepage route (`/`) renders the new tabbed interface
  - Implemented: Index route redirects to `/planning`
- [x] 3.3 Remove or repurpose standalone Planning and Import page files
  - Repurposed: As route-based pages with `PageHeader`

## 4. Validation

- [x] 4.1 Verify Planning tab loads as default
  - Verified: `/` redirects to `/planning`
- [x] 4.2 Verify venue/event group selectors appear in top-right of Planning content
  - Verified: In PageHeader primary action area
- [x] 4.3 Verify Import tab displays events table correctly
  - Verified: Import page working
- [x] 4.4 Verify tab switching preserves state within each tab
  - N/A: Using routes instead of tabs; state managed per-page
- [x] 4.5 Test on various screen sizes (responsive behavior)
  - Implemented: Side nav + responsive content area
