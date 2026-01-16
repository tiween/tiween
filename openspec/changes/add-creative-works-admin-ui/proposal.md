# Change: Add Creative Works Admin UI

## Why

The `creative-works` plugin has comprehensive content types (creative-work, person, genre, category) but its admin interface is a placeholder (`HomePage.tsx` just displays "Manage your content catalog"). Content managers must use Strapi's generic Content Manager, which:

1. **No TMDB integration** - Can't import movie data from TMDB during creation
2. **Complex cast/crew management** - Component arrays are cumbersome in generic forms
3. **Missing search** - Can't quickly find creative works for event linking
4. **No type-specific views** - Films, plays, concerts all mixed together

## What Changes

### Full Management UI

- **Creative Works List Page**: Filterable by type (film, play, concert, etc.), searchable, with poster thumbnails
- **Creative Work Create/Edit Modal**: Form with TMDB import option, cast/crew management, media uploads
- **Person Management**: List and edit persons (directors, actors, crew)
- **Genre Management**: Simple list with color/icon editors

### Quick Selection Components

- **CreativeWorkSelector**: Search/select component for event forms (replaces ContentSearchPanel)
- **CreativeWorkCard**: Compact display with poster, title, year, type
- **PersonSelector**: For adding cast/crew in creative work forms
- **GenreSelector**: Multi-select for genre assignment

### TMDB Integration

- **Import from TMDB**: Search TMDB, preview, and import with automatic field mapping
- **Update from TMDB**: Refresh existing creative work data from TMDB

## Impact

- **Affected plugins**: `creative-works` (primary), `tmdb-integration` (data import)
- **Affected code**:
  - `apps/strapi/src/plugins/creative-works/admin/src/pages/HomePage.tsx` (redesign)
  - `apps/strapi/src/plugins/creative-works/admin/src/pages/CreativeWorks/` (new)
  - `apps/strapi/src/plugins/creative-works/admin/src/pages/Persons/` (new)
  - `apps/strapi/src/plugins/creative-works/admin/src/components/` (new components)
  - `apps/strapi/src/plugins/creative-works/admin/src/hooks/` (new hooks)
- **Dependencies**: None new - leverages existing `tmdb-integration` plugin
- **Breaking changes**: None

## Design Decisions

See `design.md` for:

- TMDB import workflow
- Cast/crew component management UX
- Person de-duplication strategy
- Type-specific form variations
