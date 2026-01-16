# Events Manager Admin - Tabbed Homepage

## ADDED Requirements

### Requirement: Tabbed Homepage Navigation

The Events Manager plugin homepage SHALL display a tabbed interface with Planning and Import tabs using the Strapi design-system Tabs component.

#### Scenario: Default tab on page load

- **WHEN** a user navigates to the Events Manager plugin
- **THEN** the Planning tab SHALL be active by default
- **AND** the Planning calendar content SHALL be visible

#### Scenario: Switching between tabs

- **WHEN** a user clicks the Import tab
- **THEN** the Import tab content SHALL be displayed
- **AND** the Planning tab content SHALL be hidden
- **WHEN** a user clicks the Planning tab
- **THEN** the Planning tab content SHALL be displayed
- **AND** the Import tab content SHALL be hidden

#### Scenario: Tab state preservation

- **WHEN** a user switches from Planning tab to Import tab and back
- **THEN** the Planning tab SHALL retain its previous state (selected venue, event group, calendar position)

### Requirement: Planning Tab Selector Positioning

The venue and event group dropdown selectors in the Planning tab SHALL be positioned in the top-right corner of the tab content area.

#### Scenario: Selector layout in Planning tab

- **WHEN** the Planning tab is active
- **THEN** the venue selector SHALL appear in the top-right of the content area
- **AND** the event group selector SHALL appear adjacent to the venue selector
- **AND** the calendar component SHALL appear below the selectors

#### Scenario: Responsive selector behavior

- **WHEN** the viewport width is reduced to mobile size
- **THEN** the selectors SHALL stack vertically or wrap appropriately
- **AND** the selectors SHALL remain accessible and functional

## REMOVED Requirements

### Requirement: Separate Planning and Import Pages

**Reason**: Planning and Import are now tabs on the homepage instead of separate pages
**Migration**: Content from `/planning` and `/import` routes is consolidated into the homepage tabs

### Requirement: Card-based Landing Page

**Reason**: The landing page with feature cards is replaced by the tabbed interface
**Migration**: No migration needed; this was a navigation intermediary
