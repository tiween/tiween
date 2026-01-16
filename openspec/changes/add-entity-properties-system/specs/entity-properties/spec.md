## ADDED Requirements

### Requirement: Property Definition Management

The system SHALL provide a `property-definition` content type that allows content editors to define reusable property schemas with the following attributes:

- `name` (required, i18n string) - Human-readable property name
- `slug` (required, uid) - URL-safe unique identifier
- `description` (optional, i18n text) - Explanatory text for the property
- `type` (required, enum) - Value type: `boolean`, `integer`, `string`, `enum`
- `icon` (optional, string) - Icon identifier for UI display
- `enumOptions` (optional, JSON) - Array of valid options when type is `enum`
- `category` (optional, relation) - Reference to `property-category`
- `sortOrder` (optional, integer) - Display ordering within category

#### Scenario: Create boolean property definition

- **WHEN** content editor creates a property definition with type `boolean`
- **THEN** the property is saved with name, slug, type, and optional icon
- **AND** the property can be attached to entities expecting a true/false value

#### Scenario: Create enum property definition with options

- **WHEN** content editor creates a property definition with type `enum`
- **AND** provides `enumOptions` as `["vip", "standard", "economy"]`
- **THEN** the property is saved with the enum options
- **AND** entities using this property can only select from defined options

#### Scenario: Localize property name and description

- **WHEN** content editor creates a property definition in default locale
- **AND** adds translations for `ar-MA` and `fr-MA` locales
- **THEN** the property name and description display in user's preferred locale

---

### Requirement: Property Category Organization

The system SHALL provide a `property-category` content type that allows grouping related properties with the following attributes:

- `name` (required, i18n string) - Category name (e.g., "Accessibility", "Facilities")
- `slug` (required, uid) - URL-safe unique identifier
- `icon` (optional, string) - Icon identifier for category
- `sortOrder` (optional, integer) - Display ordering among categories
- `parent` (optional, self-relation) - Reference to parent category for hierarchical nesting

#### Scenario: Create property category

- **WHEN** content editor creates a category named "Accessibility"
- **THEN** the category is available for assigning to property definitions
- **AND** properties in this category can be displayed grouped together

#### Scenario: Create nested category hierarchy

- **WHEN** content editor creates a category "Seating" with parent "Facilities"
- **THEN** the category appears as a sub-section under "Facilities"
- **AND** properties can be assigned to either the parent or child category

#### Scenario: Display properties grouped by category

- **WHEN** frontend requests venue properties
- **THEN** properties are returned with their category information
- **AND** can be rendered in grouped sections with nested sub-sections

---

### Requirement: Entity Property Value Assignment

The system SHALL provide an `entity-property-value` component that stores actual property values for entities with the following attributes:

- `definition` (required, relation) - Reference to `property-definition`
- `booleanValue` (optional, boolean) - Value when definition type is `boolean`
- `integerValue` (optional, integer) - Value when definition type is `integer`
- `stringValue` (optional, string) - Value when definition type is `string`
- `enumValue` (optional, string) - Value when definition type is `enum`

#### Scenario: Assign boolean property to venue

- **WHEN** venue manager adds "Air Conditioning" property (type: boolean) to venue
- **AND** sets `booleanValue` to `true`
- **THEN** the venue displays as having air conditioning

#### Scenario: Assign integer property to venue

- **WHEN** venue manager adds "Capacity" property (type: integer) to venue
- **AND** sets `integerValue` to `500`
- **THEN** the venue displays capacity of 500

#### Scenario: Assign enum property to venue

- **WHEN** venue manager adds "Seating Type" property (type: enum, options: ["fixed", "flexible", "standing"])
- **AND** sets `enumValue` to `"flexible"`
- **THEN** the venue displays seating type as flexible

---

### Requirement: Venue Properties Integration

The system SHALL add a `properties` field to the Venue content type that:

- Uses the `entity-property-value` component as a repeatable zone
- Allows venue managers to assign multiple properties with values
- Supports querying venues by their property values

#### Scenario: Add multiple properties to venue

- **WHEN** venue manager edits a venue
- **AND** adds properties: "Air Conditioning" (true), "Capacity" (350), "Wheelchair Accessible" (true)
- **THEN** all properties are saved with the venue
- **AND** display on the venue detail page

#### Scenario: Query venues by property

- **WHEN** API consumer requests venues with "Wheelchair Accessible" = true
- **THEN** only venues with that property value are returned

---

### Requirement: Property Definition Admin UI

The system SHALL provide an admin interface for managing property definitions that includes:

- List view of all property definitions with name, type, category
- Create/edit form with all property attributes
- Category filter and search functionality
- Drag-and-drop reordering within categories

#### Scenario: Admin creates new property definition

- **WHEN** admin navigates to Entity Properties plugin
- **AND** clicks "Add Property Definition"
- **AND** fills in name, type, icon, and category
- **THEN** the property definition is created and available for use

#### Scenario: Admin filters properties by category

- **WHEN** admin views property definitions list
- **AND** filters by "Accessibility" category
- **THEN** only properties in that category are displayed
