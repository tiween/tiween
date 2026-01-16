## 1. Plugin Scaffolding

- [ ] 1.1 Create `entity-properties` plugin directory structure
- [ ] 1.2 Create `package.json` with plugin metadata and dependencies
- [ ] 1.3 Create `strapi-server.js` and `strapi-admin.js` entry points
- [ ] 1.4 Register plugin in `apps/strapi/config/plugins.ts`

## 2. Content Types

- [ ] 2.1 Create `property-category` content type schema with i18n support and parent self-relation for hierarchy
- [ ] 2.2 Create `property-definition` content type schema with i18n support
- [ ] 2.3 Create `entity-property-value` component schema
- [ ] 2.4 Add TypeScript types for content types
- [ ] 2.5 Create controller stubs for property-category
- [ ] 2.6 Create controller stubs for property-definition
- [ ] 2.7 Create service stubs for property-category
- [ ] 2.8 Create service stubs for property-definition
- [ ] 2.9 Create routes for property-category
- [ ] 2.10 Create routes for property-definition

## 3. Venue Integration

- [ ] 3.1 Add `properties` field to Venue schema using `entity-property-value` component
- [ ] 3.2 Update Venue TypeScript types to include properties
- [ ] 3.3 Test property assignment via Strapi admin content manager

## 4. Admin UI - Property Definitions

- [ ] 4.1 Create admin plugin entry point and routing
- [ ] 4.2 Create PropertyDefinitionList page component
- [ ] 4.3 Create PropertyDefinitionForm component for create/edit
- [ ] 4.4 Create PropertyCategoryList page component
- [ ] 4.5 Create PropertyCategoryForm component for create/edit with parent selector
- [ ] 4.5b Add hierarchical tree view for nested categories
- [ ] 4.6 Add navigation menu items for plugin
- [ ] 4.7 Add category filter to property definitions list
- [ ] 4.8 Add i18n translations (en, fr, ar)

## 5. Seed Data

- [ ] 5.1 Create seed service with common venue property definitions
- [ ] 5.2 Add seed categories with hierarchy: "Accessibility", "Facilities" (with sub-categories "Seating", "Audio/Visual"), "Services", "Technical"
- [ ] 5.3 Add seed properties: "Air Conditioning", "Wheelchair Accessible", "Parking", "WiFi", "Capacity", etc.

## 6. Validation & Testing

- [ ] 6.1 Add service-layer validation for property value types
- [ ] 6.2 Verify i18n works for property names/descriptions
- [ ] 6.3 Test property CRUD via admin UI
- [ ] 6.4 Test venue property assignment
- [ ] 6.5 Verify API responses include populated property definitions
