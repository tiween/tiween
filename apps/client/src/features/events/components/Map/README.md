# Map Components for Tiween

Interactive map components using Leaflet and OpenStreetMap.

## Installation

Before using these components, install the required dependencies:

```bash
yarn workspace @tiween/client add leaflet react-leaflet
yarn workspace @tiween/client add -D @types/leaflet
```

## Components

### VenueMap

The main map component for displaying venue locations. Handles SSR gracefully through dynamic imports.

```tsx
import { VenueMap } from "@/features/events/components/Map"

// Single venue (event detail page)
<VenueMap
  venue={{
    documentId: "venue-1",
    name: "Cinéma Le Palace",
    latitude: 36.8065,
    longitude: 10.1815,
    type: "cinema",
    address: "12 Avenue Habib Bourguiba",
    city: "Tunis",
  }}
  height="300px"
  showDirections
/>

// Multiple venues (search/listing)
<VenueMap
  venues={venueList}
  height="400px"
  onVenueClick={(venue) => router.push(`/venues/${venue.documentId}`)}
  selectedVenueId={highlightedVenueId}
/>
```

### Props

| Prop            | Type               | Default            | Description                     |
| --------------- | ------------------ | ------------------ | ------------------------------- |
| venue           | VenueLocation      | -                  | Single venue to display         |
| venues          | VenueLocation[]    | []                 | Multiple venues to display      |
| height          | string             | "300px"            | Map container height            |
| className       | string             | -                  | Additional CSS classes          |
| config          | Partial<MapConfig> | DEFAULT_MAP_CONFIG | Map configuration               |
| onVenueClick    | (venue) => void    | -                  | Callback when marker clicked    |
| selectedVenueId | string             | -                  | Highlight specific venue        |
| showDirections  | boolean            | false              | Show directions button in popup |

### Types

```typescript
interface VenueLocation {
  documentId: string
  name: string
  address?: string
  city?: string
  latitude: number
  longitude: number
  type?: VenueType // "cinema" | "theater" | "cultural-center" | "museum" | "other"
  logoUrl?: string
}

interface MapConfig {
  defaultZoom?: number // 1-18, default: 13
  minZoom?: number // default: 6
  maxZoom?: number // default: 18
  tileUrl?: string // OpenStreetMap by default
  attribution?: string
  showZoomControl?: boolean // default: true
  scrollWheelZoom?: boolean // default: true
}
```

## Constants

```typescript
import {
  DEFAULT_MAP_CONFIG,
  TUNISIA_CENTER,
  VENUE_TYPE_COLORS,
} from "@/features/events/components/Map"

// Default center point (Tunis)
TUNISIA_CENTER = { latitude: 36.8065, longitude: 10.1815 }

// Color scheme for venue type markers
VENUE_TYPE_COLORS = {
  cinema: "#ef4444", // red-500
  theater: "#f97316", // orange-500
  "cultural-center": "#22c55e", // green-500
  museum: "#3b82f6", // blue-500
  other: "#8b5cf6", // violet-500
}
```

## Integration with EventDetailPage

To use the map in event detail pages, use `EventDetailPageWithMap`:

```tsx
// In page.tsx
import { EventDetailPageWithMap } from "@/features/events/components/exports-extended"

export default function EventDetailRoute({ params }) {
  return <EventDetailPageWithMap event={event} relatedEvents={related} />
}
```

Or integrate VenueMap manually in existing EventDetailPage by following the pattern in `EventDetailPageWithMap.tsx`.

## Notes

- The map requires `latitude` and `longitude` fields on the venue data
- If coordinates are missing, the map component returns null (graceful fallback)
- Leaflet CSS is imported automatically in the client component
- SSR is handled via Next.js dynamic imports with `ssr: false`
