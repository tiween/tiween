# Tasks: Refactor Events Manager Pages to Use Strapi Layout Components

## 1. Preparation

- [x] 1.1 Review current `Layouts` import pattern in `HomePage.tsx` as reference implementation
- [x] 1.2 Document the props interface for `Layouts.Header` (title, subtitle, primaryAction, secondaryAction, navigationAction)

## 2. Refactor DashboardPage

- [x] 2.1 Add imports for `Layouts` from `@strapi/strapi/admin` and `Main` from `@strapi/design-system`
- [x] 2.2 Remove `PageHeader` import
- [x] 2.3 Wrap page content with `Layouts.Root > Main > Layouts.Header + Layouts.Content`
- [x] 2.4 Move title/subtitle/primaryAction props to `Layouts.Header`
- [x] 2.5 Wrap existing content in `Layouts.Content` with appropriate padding
- [x] 2.6 Test loading state still displays correctly

## 3. Refactor PlanningPage

- [x] 3.1 Add imports for `Layouts` from `@strapi/strapi/admin` and `Main` from `@strapi/design-system`
- [x] 3.2 Remove `PageHeader` import
- [x] 3.3 Wrap page content with `Layouts.Root > Main > Layouts.Header + Layouts.Content`
- [x] 3.4 Move venue selector into `Layouts.Header` as `primaryAction`
- [x] 3.5 Wrap calendar component in `Layouts.Content`
- [x] 3.6 Test venue/event-group selection still works

## 4. Refactor VenuesPage

- [x] 4.1 Add imports for `Layouts` from `@strapi/strapi/admin` and `Main` from `@strapi/design-system`
- [x] 4.2 Remove `PageHeader` import
- [x] 4.3 Wrap page content with `Layouts.Root > Main > Layouts.Header + Layouts.Content`
- [x] 4.4 Move title/subtitle/primaryAction to `Layouts.Header`
- [x] 4.5 Wrap table, filters, and pagination in `Layouts.Content`
- [x] 4.6 Test search, filtering, pagination, and modal interactions

## 5. Refactor ImportPage

- [x] 5.1 Add imports for `Layouts` from `@strapi/strapi/admin` and `Main` from `@strapi/design-system`
- [x] 5.2 Remove `PageHeader` import
- [x] 5.3 Wrap page content with `Layouts.Root > Main > Layouts.Header + Layouts.Content`
- [x] 5.4 Move title/subtitle to `Layouts.Header`
- [x] 5.5 Wrap stats cards and table in `Layouts.Content`
- [x] 5.6 Test filtering and pagination still work

## 6. Cleanup

- [x] 6.1 Delete `apps/strapi/src/plugins/events-manager/admin/src/components/PageHeader/index.tsx`
- [x] 6.2 Remove `PageHeader` from any barrel exports (if applicable)
- [x] 6.3 Verify no other files import `PageHeader`

## 7. Validation

- [x] 7.1 Run TypeScript compilation to verify no type errors
- [ ] 7.2 Test all pages in browser for visual consistency
- [ ] 7.3 Verify side navigation still works with new layout structure
- [ ] 7.4 Test responsive behavior on mobile/tablet viewports
- [ ] 7.5 Verify all actions (buttons, modals, forms) still function correctly
