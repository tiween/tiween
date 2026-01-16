# Design Document: Extract Prototype Components

## Component Inventory

Based on analysis of the 10 HTML prototype files, the following components have been identified:

### Phase 1: Primitives & Layout (~12 components)

| Component       | Source Prototype                   | Description                             |
| --------------- | ---------------------------------- | --------------------------------------- |
| `Badge`         | All                                | Category, status, and price badges      |
| `Chip`          | home, search                       | Selectable chips for filters/dates      |
| `IconButton`    | All                                | Round icon buttons (back, share, heart) |
| `Avatar`        | account, event-detail              | User/person avatar with fallback        |
| `Rating`        | home, event-detail, venue-detail   | Star rating display                     |
| `ProgressSteps` | ticketing-flow                     | Step indicator (1-2-3-4)                |
| `ProgressBar`   | scanner                            | Attendance/progress bar                 |
| `NoiseOverlay`  | All                                | Subtle texture overlay effect           |
| `QRCode`        | ticket-detail, ticket-confirmation | QR code display component               |
| `Divider`       | Various                            | Dashed ticket divider                   |
| `SectionHeader` | home, search, account              | Title with "See all" link               |
| `EmptyState`    | search, my-tickets                 | Empty state illustration + message      |

### Phase 2: Cards & Display (~12 components)

| Component             | Source Prototype      | Description                              |
| --------------------- | --------------------- | ---------------------------------------- |
| `EventCard`           | home, search          | Event poster with price, heart, category |
| `EventCardCompact`    | home (Arabic section) | Smaller event card for carousels         |
| `VenueCard`           | home                  | Venue with image and session count       |
| `TicketCard`          | my-tickets            | Ticket with QR preview and details       |
| `PurchaseHistoryItem` | account               | Compact purchase history row             |
| `WatchlistItem`       | account               | Watchlist carousel item                  |
| `CastMember`          | event-detail          | Circular avatar with name/role           |
| `ShowtimeButton`      | event-detail          | Time slot selection button               |
| `VenueShowtimes`      | event-detail          | Venue with showtime grid                 |
| `CategoryCard`        | search                | Category with icon and count             |
| `SearchResultCard`    | search                | Search result (event or venue)           |
| `EventListItem`       | venue-detail          | Horizontal event card with times         |

### Phase 3: Navigation & Filters (~8 components)

| Component        | Source Prototype            | Description                            |
| ---------------- | --------------------------- | -------------------------------------- |
| `Header`         | home                        | App header with logo and notifications |
| `HeaderDetail`   | event-detail, ticket-detail | Back button + title + actions          |
| `BottomNav`      | All pages                   | Bottom navigation with 4 tabs          |
| `CategoryTabs`   | home                        | Horizontal scrollable category tabs    |
| `DateSelector`   | home, event-detail          | Horizontal scrollable date chips       |
| `FilterChips`    | search                      | Filter chip row (All, Films, etc.)     |
| `RecentSearches` | search                      | Recent search list with icons          |
| `TrendingTags`   | search                      | Trending hashtag buttons               |

### Phase 4: Forms & Inputs (~6 components)

| Component               | Source Prototype | Description                         |
| ----------------------- | ---------------- | ----------------------------------- |
| `SearchInput`           | search           | Search input with clear button      |
| `QuantitySelector`      | ticketing-flow   | +/- quantity control                |
| `TicketTypeCard`        | ticketing-flow   | Ticket type with price and quantity |
| `ContactForm`           | ticketing-flow   | Email/phone input section           |
| `PaymentMethodSelector` | ticketing-flow   | Payment method radio cards          |
| `CardInput`             | ticketing-flow   | Credit card input fields            |

### Phase 5: Ticketing Flow (~7 components)

| Component            | Source Prototype    | Description                     |
| -------------------- | ------------------- | ------------------------------- |
| `EventSummaryBanner` | ticketing-flow      | Compact event info at top       |
| `SeatMap`            | ticketing-flow      | Interactive seat selection grid |
| `SeatLegend`         | ticketing-flow      | Seat status legend              |
| `OrderSummary`       | ticketing-flow      | Bottom bar with total and CTA   |
| `SuccessAnimation`   | ticket-confirmation | Animated checkmark              |
| `ConfettiEffect`     | ticket-confirmation | Celebration confetti            |
| `TicketConfirmation` | ticket-confirmation | Full confirmation view          |

### Phase 6: Ticket & Scanner Views (~6 components)

| Component           | Source Prototype          | Description                        |
| ------------------- | ------------------------- | ---------------------------------- |
| `TicketDetail`      | ticket-detail             | Full ticket view with QR           |
| `TicketTabs`        | my-tickets                | Upcoming/Past tabs                 |
| `OfflineIndicator`  | my-tickets, ticket-detail | Offline status badge               |
| `ScannerViewfinder` | scanner                   | QR scanner frame with animation    |
| `ScanResult`        | scanner                   | Valid/Invalid/Warning result panel |
| `AttendanceCounter` | scanner                   | Scanned count display              |

## Component API Design Principles

### 1. Composition over Configuration

```tsx
// Prefer composition
<EventCard>
  <EventCard.Image src="..." />
  <EventCard.Badge>Cinema</EventCard.Badge>
  <EventCard.Price>15 DT</EventCard.Price>
  <EventCard.WatchlistButton />
  <EventCard.Content>
    <EventCard.Title>Dachra</EventCard.Title>
    <EventCard.Venue>Cinema Le Colisée</EventCard.Venue>
  </EventCard.Content>
</EventCard>

// Over prop drilling
<EventCard
  imageSrc="..."
  badge="Cinema"
  price="15 DT"
  showWatchlist
  title="Dachra"
  venue="Cinema Le Colisée"
/>
```

### 2. Variant-based Styling (using class-variance-authority)

```tsx
const badgeVariants = cva("px-2 py-0.5 text-xs font-semibold rounded", {
  variants: {
    variant: {
      primary: "bg-tiween-yellow text-tiween-green",
      secondary: "bg-surface text-white",
      success: "bg-green-500/20 text-green-500",
      error: "bg-red-500/20 text-red-400",
    },
    size: {
      sm: "text-[10px] px-1.5 py-0.5",
      default: "text-xs px-2 py-0.5",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
})
```

### 3. RTL-aware Layout

```tsx
// Use logical properties
<div className="ps-4 pe-2 ms-auto">
  {" "}
  // padding-start, padding-end, margin-start
  <ChevronIcon className="rtl:rotate-180" />
</div>
```

### 4. Dummy Data Types

```typescript
// types/dummy.ts
export interface DummyEvent {
  id: string
  title: string
  imageUrl: string
  venue: string
  date: string
  time: string
  price: number | "free"
  category: string
  rating?: number
  language?: "VOST" | "VF" | "AR"
}

export interface DummyVenue {
  id: string
  name: string
  imageUrl: string
  address: string
  sessionCount: number
}

export interface DummyTicket {
  id: string
  code: string
  event: DummyEvent
  seats: string[]
  status: "upcoming" | "past"
  scannedAt?: string
}
```

## Storybook Organization

```
stories/
├── Primitives/
│   ├── Badge.stories.tsx
│   ├── Chip.stories.tsx
│   └── ...
├── Cards/
│   ├── EventCard.stories.tsx
│   ├── VenueCard.stories.tsx
│   └── ...
├── Navigation/
│   ├── Header.stories.tsx
│   ├── BottomNav.stories.tsx
│   └── ...
├── Forms/
│   ├── SearchInput.stories.tsx
│   └── ...
├── Ticketing/
│   ├── SeatMap.stories.tsx
│   └── ...
└── Pages/ (composed examples)
    ├── HomePage.stories.tsx
    └── ...
```

## Theme Token Usage

All components must use existing Tailwind theme tokens:

```typescript
// Colors (from tailwind.config)
const colors = {
  "tiween-green": "#032523",
  "tiween-green-light": "#0A3533",
  "tiween-green-lighter": "#0F4542",
  "tiween-yellow": "#F8EB06",
  "tiween-yellow-dim": "#C4BA05",
  muted: "#A0A0A0",
  surface: "#0A3533",
  "surface-hover": "#0F4542",
}

// Font families
const fonts = {
  display: "Lalezar", // Titles, branding
  arabic: "Noto Sans Arabic",
  body: "DM Sans",
}
```

## Accessibility Considerations

1. **Touch targets**: All interactive elements minimum 44x44px
2. **Color contrast**: Ensure WCAG AA compliance (already good with yellow on green)
3. **Focus states**: Use Tailwind's `focus-visible:` for keyboard navigation
4. **Screen readers**: Add `aria-label` for icon-only buttons
5. **RTL**: Test all components with `dir="rtl"`
