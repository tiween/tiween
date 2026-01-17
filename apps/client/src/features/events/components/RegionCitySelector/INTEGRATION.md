# RegionCitySelector Integration Guide

## Overview

The RegionCitySelector component enables geographic filtering of events by Tunisia's governorates (regions) and cities.

## Files Created

### Strapi Backend

- `apps/strapi/src/plugins/geography/server/src/services/index.ts` - Data access layer
- `apps/strapi/src/plugins/geography/server/src/controllers/index.ts` - REST handlers
- `apps/strapi/src/plugins/geography/server/src/routes/index.ts` - Public API routes

### Client API Functions

- `apps/client/src/lib/strapi-api/content/geography.ts` - Region/City API functions
- `apps/client/src/lib/strapi-api/content/events.ts` - Extended event queries with city filter

### Components

- `apps/client/src/features/events/components/RegionCitySelector/RegionCitySelector.tsx`
- `apps/client/src/features/events/components/RegionCitySelector/index.ts`
- `apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx`

## Integration Steps

### 1. Update `apps/client/src/features/events/components/index.ts`

Add export:

```typescript
export { RegionCitySelector } from "./RegionCitySelector"
export type {
  RegionCitySelectorProps,
  RegionCitySelectorLabels,
  RegionOption,
  CityOption,
} from "./RegionCitySelector"
```

### 2. Update `apps/client/src/features/events/components/HomePage/index.ts`

Add export:

```typescript
export {
  HomePageWithCity,
  type HomePageWithCityProps,
  type HomePageWithCityLabels,
} from "./HomePageWithCity"
```

### 3. Update `apps/client/src/app/[locale]/page.tsx`

Add imports:

```typescript
import { HomePageWithCity } from "@/features/events/components/HomePage/HomePageWithCity"

import {
  getEventsWithFilters,
  getFeaturedEventsWithFilters,
} from "@/lib/strapi-api/content/events"
import { getRegions } from "@/lib/strapi-api/content/geography"
```

Update searchParams interface:

```typescript
interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ category?: string; date?: string; city?: string }>
}
```

Update the component:

```typescript
export default async function HomePageRoute({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { category: rawCategory, date: rawDate, city: rawCity } = await searchParams

  // Validate city (should be a documentId format)
  const cityDocumentId = rawCity || undefined

  // Fetch regions for the selector
  const regions = await getRegions(locale)

  // Use extended filter functions with city support
  const [featuredEvents, upcomingData] = await Promise.all([
    getFeaturedEventsWithFilters(locale, {
      category: categoryFilter,
      dateFilter,
      cityDocumentId,
    }),
    getEventsWithFilters(locale, {
      category: categoryFilter,
      dateFilter,
      cityDocumentId,
      limit: 10,
    }),
  ])

  // ... rest of data fetching

  return (
    <HomePageWithCity
      featuredEvents={featuredEvents}
      upcomingEvents={upcomingData.events}
      todayEvents={todayEvents}
      totalUpcoming={upcomingData.total}
      regions={regions}
      activeCategory={category}
      activeDate={dateFilter}
      activeCityId={cityDocumentId}
    />
  )
}
```

## API Endpoints

### Geography Plugin Routes

- `GET /api/geography/regions` - List all regions with cities
- `GET /api/geography/regions/:documentId` - Get single region
- `GET /api/geography/cities` - List cities (optional `?region=documentId`)
- `GET /api/geography/cities/:documentId` - Get single city

## URL State

The city filter uses URL query parameter: `?city=<documentId>`

Example: `/?category=cinema&date=today&city=abc123def456`

## Component Usage

```tsx
import { RegionCitySelector } from "@/features/events/components"

;<RegionCitySelector
  regions={regions}
  selectedCityId={activeCityId}
  onCityChange={(cityId) => updateUrl({ city: cityId })}
  labels={{
    allLocations: "Toute la Tunisie",
    selectLocation: "Lieu",
    allCities: "Toutes les villes",
  }}
/>
```
