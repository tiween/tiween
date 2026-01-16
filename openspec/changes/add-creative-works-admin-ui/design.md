## Context

The creative-works plugin manages the content catalog (films, plays, concerts, exhibitions) but has no admin UI beyond the basic Strapi Content Manager. This proposal adds a purpose-built interface optimized for entertainment content management with TMDB integration.

**Stakeholders**: Content managers, event planners, catalog administrators

**Constraints**:

- Must use Strapi DS components exclusively
- Must integrate with existing tmdb-integration plugin
- Must handle localized fields (title, synopsis, poster)
- Cast/crew uses component arrays (complex to manage)

## Goals / Non-Goals

**Goals**:

- Provide filterable/searchable creative works catalog
- Enable TMDB import for films with automatic field mapping
- Simplify cast/crew management with person search/create
- Support type-specific views (films vs plays vs concerts)
- Provide reusable selector component for event forms

**Non-Goals**:

- Full localization editing (use Content Manager for translations)
- Automated TMDB sync/updates
- Content recommendation engine
- Public API for catalog browsing

## Decisions

### 1. Page Structure

**Decision**: Tabbed interface in creative-works plugin

```
HomePage.tsx
├── Catalog Tab (creative works list)
├── People Tab (persons management)
└── Genres Tab (genre management)
```

**Rationale**: Separates concerns while keeping related entities together. Categories use generic Content Manager (simple entity).

### 2. Creative Works List Design

**Decision**: Card grid layout with type filtering

```
┌─────────────────────────────────────────────────┐
│ [Search...] [Type: All ▼] [Genre: ▼] [Add New ▼]│
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Poster  │ │ Poster  │ │ Poster  │ │ Poster  │ │
│ │         │ │         │ │         │ │         │ │
│ │ Title   │ │ Title   │ │ Title   │ │ Title   │ │
│ │ 2024•🎬 │ │ 2023•🎭 │ │ 2024•🎬 │ │ 2024•🎵 │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ ...     │ │ ...     │ │ ...     │ │ ...     │ │
└─────────────────────────────────────────────────┘
```

**Type Icons**:

- 🎬 film
- 🎭 play
- 🎬 short-film
- 🎵 concert
- 🖼️ exhibition

**Rationale**: Cards with posters are more scannable for visual content than table rows. Grid adapts to screen width.

### 3. TMDB Import Workflow

**Decision**: Two-step import with preview

```
Step 1: Search TMDB
┌──────────────────────────────────────┐
│ Search TMDB: [The Matrix________] 🔍 │
├──────────────────────────────────────┤
│ ┌─────────────────────────────────┐  │
│ │ [Poster] The Matrix (1999)      │  │
│ │          Sci-Fi action film...  │  │
│ │          [Import →]             │  │
│ └─────────────────────────────────┘  │
│ ┌─────────────────────────────────┐  │
│ │ [Poster] The Matrix Reloaded    │  │
│ │          ...                    │  │
│ └─────────────────────────────────┘  │
└──────────────────────────────────────┘

Step 2: Preview & Confirm
┌──────────────────────────────────────┐
│ Import from TMDB                     │
├──────────────────────────────────────┤
│ Title: The Matrix                    │
│ Original: The Matrix                 │
│ Year: 1999                           │
│ Duration: 136 min                    │
│ Synopsis: A computer hacker...       │
│ Genres: Action, Sci-Fi               │
│ Directors: Lana Wachowski, Lilly...  │
│ Cast: Keanu Reeves, Laurence...      │
│                                      │
│ ☑ Import poster                      │
│ ☑ Import backdrop                    │
│ ☑ Create missing persons             │
│                                      │
│ [Cancel] [Import]                    │
└──────────────────────────────────────┘
```

**Field Mapping**:
| TMDB Field | Creative Work Field |
|------------|---------------------|
| title | title (localized) |
| original_title | originalTitle |
| release_date | releaseYear (extract year) |
| runtime | duration |
| overview | synopsis (localized) |
| genres | genres (match or create) |
| poster_path | poster (download & upload) |
| backdrop_path | backdrop (download & upload) |
| id | tmdbId |

**Person Creation**:

- For each director/cast member, search existing persons by name
- If not found, create new person with name and photo from TMDB
- Link to creative work via directors relation or cast component

### 4. Cast/Crew Management

**Decision**: Inline editable list with person selector

```
Cast
┌─────────────────────────────────────────────────┐
│ ┌──────┐ Keanu Reeves as "Neo"          [×]    │
│ └──────┘                                        │
│ ┌──────┐ Laurence Fishburne as "Morpheus" [×]  │
│ └──────┘                                        │
│ [+ Add Cast Member]                             │
└─────────────────────────────────────────────────┘

Add Cast Member Modal
┌──────────────────────────────────────┐
│ Person: [Search or create...    ▼]   │
│ Character: [Neo___________________]  │
│ [Cancel] [Add]                       │
└──────────────────────────────────────┘
```

**PersonSelector** behavior:

1. User types name → async search existing persons
2. Results shown in dropdown
3. If no match, option to "Create [Name]" inline
4. Creating opens mini-form: name, photo (optional)

### 5. Person List Design

**Decision**: Table with search and role filters

| Column      | Type                            |
| ----------- | ------------------------------- |
| Photo       | Thumbnail                       |
| Name        | Text, searchable                |
| Roles       | Tags (director, actor, etc.)    |
| Works Count | Number of linked creative works |
| Actions     | Edit, Delete                    |

**Role determination**: Computed from relations (if person is in any `directors` → "Director" role, if in any `cast` → "Actor" role).

### 6. Genre Management

**Decision**: Simple inline editable list

```
┌─────────────────────────────────────────────────┐
│ Genres                              [+ Add]     │
├─────────────────────────────────────────────────┤
│ [●] Action        [Edit] [×]                    │
│ [●] Comedy        [Edit] [×]                    │
│ [●] Drama         [Edit] [×]                    │
│ [●] Horror        [Edit] [×]                    │
│ ...                                             │
└─────────────────────────────────────────────────┘

Edit Genre
┌──────────────────────────────────────┐
│ Name: [Action_____________________]  │
│ Slug: [action_____________________]  │
│ Icon: [🎬________________________]   │
│ Color: [#FF5733] [■]                 │
│ [Cancel] [Save]                      │
└──────────────────────────────────────┘
```

### 7. CreativeWorkSelector Component

**Decision**: Async search with poster preview, for event forms

```typescript
interface CreativeWorkSelectorProps {
  value: string | null // documentId
  onChange: (id: string | null) => void
  typeFilter?: ("film" | "play" | "concert" | "exhibition")[]
}
```

**Dropdown item display**:

```
┌─────────────────────────────────────┐
│ [Poster] The Matrix                 │
│          1999 • Film • 136 min      │
├─────────────────────────────────────┤
│ [Poster] Inception                  │
│          2010 • Film • 148 min      │
└─────────────────────────────────────┘
```

**Rationale**: Replaces generic ContentSearchPanel with purpose-built component. Poster thumbnails help identify works quickly.

### 8. API Integration

**New hooks for creative-works plugin**:

```typescript
// List/search creative works
useCreativeWorks(options: {
  page?: number
  pageSize?: number
  search?: string
  type?: string
  genreId?: number
  sort?: string
})

// Single creative work with full relations
useCreativeWork(documentId: string)

// CRUD operations
useCreativeWorkMutations()
  - create(data)
  - update(documentId, data)
  - delete(documentId)
  - importFromTMDB(tmdbId, options)

// Persons
usePersons(options)
usePerson(documentId)
usePersonMutations()

// Genres
useGenres()
useGenreMutations()
```

## Risks / Trade-offs

| Risk                 | Impact                             | Mitigation                                          |
| -------------------- | ---------------------------------- | --------------------------------------------------- |
| TMDB rate limits     | Import fails under heavy use       | Implement queue/throttle; cache responses           |
| Person deduplication | Same person created multiple times | Fuzzy name matching before create; merge tool later |
| Large cast lists     | Slow form with 50+ cast members    | Virtual scrolling; paginate cast                    |
| Image downloads      | Slow import if downloading posters | Show progress; allow skipping images                |

## Open Questions

1. **Localization workflow**: Should TMDB import fetch translations for multiple languages?

   - Recommendation: Import only French initially; add language selector in future.

2. **Existing person matching**: How strict should name matching be?

   - Recommendation: Exact match first, then suggest similar. Admin decides.

3. **TMDB ID uniqueness**: Prevent duplicate imports of same TMDB movie?
   - Recommendation: Yes, check tmdbId before import; offer to view existing if found.
