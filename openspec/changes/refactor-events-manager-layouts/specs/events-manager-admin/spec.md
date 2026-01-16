# Events Manager Admin UI - Layout Refactoring

## MODIFIED Requirements

### Requirement: Page Layout Structure

All Events Manager admin pages SHALL use Strapi's standard layout components (`Layouts.Root`, `Layouts.Header`, `Layouts.Content`) from `@strapi/strapi/admin` to ensure consistency with the Strapi admin panel and follow plugin design guidelines.

#### Scenario: Dashboard page uses standard layout

- **WHEN** user navigates to the Dashboard page
- **THEN** the page SHALL be wrapped in `Layouts.Root` with `Main` component
- **AND** the page header SHALL use `Layouts.Header` with title "Tableau de bord", subtitle, and primary action button
- **AND** the page content SHALL be wrapped in `Layouts.Content`

#### Scenario: Planning page uses standard layout

- **WHEN** user navigates to the Planning page
- **THEN** the page SHALL be wrapped in `Layouts.Root` with `Main` component
- **AND** the page header SHALL use `Layouts.Header` with title "Planning", subtitle, and venue/event-group selectors
- **AND** the calendar content SHALL be wrapped in `Layouts.Content`

#### Scenario: Venues page uses standard layout

- **WHEN** user navigates to the Venues page
- **THEN** the page SHALL be wrapped in `Layouts.Root` with `Main` component
- **AND** the page header SHALL use `Layouts.Header` with title "Lieux", subtitle, and "Add venue" primary action
- **AND** the table, filters, and pagination SHALL be wrapped in `Layouts.Content`

#### Scenario: Import page uses standard layout

- **WHEN** user navigates to the Import page
- **THEN** the page SHALL be wrapped in `Layouts.Root` with `Main` component
- **AND** the page header SHALL use `Layouts.Header` with title "Import" and subtitle
- **AND** the stats cards and events table SHALL be wrapped in `Layouts.Content`

### Requirement: Layout Component Imports

All page components SHALL import layout components from the correct Strapi packages to maintain compatibility with Strapi 5.

#### Scenario: Layouts imported from strapi/admin

- **WHEN** a page component needs layout wrappers
- **THEN** `Layouts` SHALL be imported from `@strapi/strapi/admin`
- **AND** `Main` SHALL be imported from `@strapi/design-system`

### Requirement: No Custom PageHeader Component

The plugin SHALL NOT use a custom `PageHeader` component; instead, all pages SHALL use the built-in `Layouts.Header` component for page headers.

#### Scenario: PageHeader component removed

- **WHEN** the refactoring is complete
- **THEN** the `PageHeader` component file SHALL be deleted
- **AND** no page components SHALL import from `PageHeader`
