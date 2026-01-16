## 1. Foundation & Hooks

- [ ] 1.1 Create `useCreativeWorks(options)` hook - list with search, type, genre filters
- [ ] 1.2 Create `useCreativeWork(documentId)` hook - single work with all relations
- [ ] 1.3 Create `useCreativeWorkMutations()` hook - create, update, delete operations
- [ ] 1.4 Create `usePersons(options)` hook - list with search
- [ ] 1.5 Create `usePerson(documentId)` hook - single person
- [ ] 1.6 Create `usePersonMutations()` hook - create, update, delete
- [ ] 1.7 Create `useGenres()` hook - full genre list
- [ ] 1.8 Create `useGenreMutations()` hook - create, update, delete
- [ ] 1.9 Create `useTMDBImport()` hook - import workflow with image downloads

## 2. Reusable Components

- [ ] 2.1 Create `CreativeWorkCard` component - poster, title, year, type icon
- [ ] 2.2 Create `CreativeWorkSelector` component - async search dropdown
- [ ] 2.3 Create `PersonSelector` component - search with inline create
- [ ] 2.4 Create `PersonCard` component - photo, name, roles
- [ ] 2.5 Create `GenreSelector` component - multi-select for genres
- [ ] 2.6 Create `GenreBadge` component - colored genre tag
- [ ] 2.7 Create `TypeIcon` component - icons for film, play, concert, etc.

## 3. TMDB Import Feature

- [ ] 3.1 Create `TMDBSearchModal` component - search interface
- [ ] 3.2 Create `TMDBSearchResults` component - display search results
- [ ] 3.3 Create `TMDBImportPreview` component - show mapped data
- [ ] 3.4 Implement image download and upload to Strapi
- [ ] 3.5 Implement person matching and creation
- [ ] 3.6 Implement genre matching and creation
- [ ] 3.7 Add duplicate detection by tmdbId

## 4. Creative Works List Page

- [ ] 4.1 Redesign `pages/HomePage.tsx` with tabbed interface
- [ ] 4.2 Create `pages/CreativeWorks/index.tsx` - catalog tab content
- [ ] 4.3 Implement card grid layout with responsive columns
- [ ] 4.4 Add search input with debounce
- [ ] 4.5 Add type filter dropdown
- [ ] 4.6 Add genre filter dropdown
- [ ] 4.7 Add pagination controls
- [ ] 4.8 Add "Add New" dropdown (Manual Entry / Import from TMDB)

## 5. Creative Work Form

- [ ] 5.1 Create `CreativeWorkFormModal` - main form container
- [ ] 5.2 Implement Basic Info section (title, originalTitle, slug, type)
- [ ] 5.3 Implement Details section (synopsis, duration, releaseYear, ageRating)
- [ ] 5.4 Implement Relations section (genres multi-select, directors multi-select)
- [ ] 5.5 Implement Cast section (component array management)
- [ ] 5.6 Implement Crew section (component array management)
- [ ] 5.7 Implement Media section (poster, backdrop, photos, trailer)
- [ ] 5.8 Add form validation

## 6. Person Management

- [ ] 6.1 Create `pages/Persons/index.tsx` - People tab content
- [ ] 6.2 Implement persons table (Photo, Name, Roles, Works Count)
- [ ] 6.3 Add search functionality
- [ ] 6.4 Create `PersonFormModal` - edit person details
- [ ] 6.5 Compute roles from creative work relations
- [ ] 6.6 Add delete protection for linked persons

## 7. Genre Management

- [ ] 7.1 Create `pages/Genres/index.tsx` - Genres tab content
- [ ] 7.2 Implement genre list with color swatches
- [ ] 7.3 Create `GenreFormModal` - name, slug, icon, color
- [ ] 7.4 Add inline add/edit functionality

## 8. Integration

- [ ] 8.1 Update event forms to use CreativeWorkSelector
- [ ] 8.2 Add loading states and empty states
- [ ] 8.3 Add success/error notifications

## 9. Polish & Testing

- [ ] 9.1 Add keyboard navigation for selectors
- [ ] 9.2 Add placeholder images for missing posters
- [ ] 9.3 Manual testing: TMDB import, CRUD operations, filters
