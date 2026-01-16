# Tasks: Extract Prototype Components

## Overview

This work is split into 6 phases, each delivering a usable set of components with Storybook stories. Phases can be worked on independently after Phase 1 completes.

---

## Phase 1: Primitives & Layout Foundation

**Goal**: Create foundational components that other phases depend on.

- [ ] **1.1** Create dummy data types in `types/dummy.ts`

  - DummyEvent, DummyVenue, DummyTicket, DummyPerson interfaces
  - Mock data factories for Storybook stories

- [ ] **1.2** Create `Badge` component (`components/ui/badge.tsx`)

  - Variants: primary (yellow), secondary (surface), success, error, warning
  - Sizes: sm, default
  - Story with all variants

- [ ] **1.3** Create `Chip` component (`components/ui/chip.tsx`)

  - Active/inactive states
  - Size variants
  - Story with toggle behavior

- [ ] **1.4** Create `IconButton` component (`components/ui/icon-button.tsx`)

  - Round button for icons (back, share, heart, etc.)
  - Variants: ghost, surface, blur
  - Story with common icons

- [ ] **1.5** Create `Avatar` component (`components/ui/avatar.tsx`)

  - Image with fallback (initials)
  - Sizes: sm, md, lg
  - Story with image and fallback

- [ ] **1.6** Create `Rating` component (`components/ui/rating.tsx`)

  - Star display with value
  - Optional review count
  - Story with various values

- [ ] **1.7** Create `ProgressSteps` component (`components/ui/progress-steps.tsx`)

  - Step indicator (active, complete, pending states)
  - Story with 4-step example

- [ ] **1.8** Create `ProgressBar` component (`components/ui/progress-bar.tsx`)

  - Animated fill bar
  - Label support
  - Story with various percentages

- [ ] **1.9** Create `NoiseOverlay` component (`components/layout/noise-overlay.tsx`)

  - Fixed position texture overlay
  - Story demonstrating effect

- [ ] **1.10** Create `QRCode` component (`components/ui/qr-code.tsx`)

  - SVG QR code display (static/dummy)
  - Glow effect variant
  - Story with code examples

- [ ] **1.11** Create `Divider` component (`components/ui/divider.tsx`)

  - Dashed ticket-style divider
  - Story with examples

- [ ] **1.12** Create `SectionHeader` component (`components/ui/section-header.tsx`)

  - Title with optional "See all" link
  - RTL support
  - Story with link/no-link variants

- [ ] **1.13** Create `EmptyState` component (`components/ui/empty-state.tsx`)
  - Icon, title, description, action button
  - Story with search/tickets examples

---

## Phase 2: Cards & Display Components

**Goal**: Create visual card components for events, venues, and tickets.

- [ ] **2.1** Create `EventCard` component (`components/cards/event-card.tsx`)

  - Poster image with gradient
  - Category badge, price badge, watchlist button
  - Title, venue, time, language badge
  - Hover effects
  - Story with various states

- [ ] **2.2** Create `EventCardCompact` component (`components/cards/event-card-compact.tsx`)

  - Smaller version for carousels
  - RTL support for Arabic section
  - Story with carousel example

- [ ] **2.3** Create `VenueCard` component (`components/cards/venue-card.tsx`)

  - Venue image, name, address
  - Session count badge
  - Story with examples

- [ ] **2.4** Create `TicketCard` component (`components/tickets/ticket-card.tsx`)

  - QR preview, event info, seat info
  - Upcoming/past variants
  - Ticket cutout effect (CSS)
  - Story with upcoming/past examples

- [ ] **2.5** Create `PurchaseHistoryItem` component (`components/cards/purchase-history-item.tsx`)

  - Compact row with image, title, date, price
  - Story with list example

- [ ] **2.6** Create `WatchlistItem` component (`components/cards/watchlist-item.tsx`)

  - Small card for watchlist carousel
  - Story with carousel example

- [ ] **2.7** Create `CastMember` component (`components/cards/cast-member.tsx`)

  - Circular avatar with name and role
  - Story with horizontal scroll example

- [ ] **2.8** Create `ShowtimeButton` component (`components/ticketing/showtime-button.tsx`)

  - Time display with language badge
  - Selected/available/soldout states
  - Story with all states

- [ ] **2.9** Create `VenueShowtimes` component (`components/venue/venue-showtimes.tsx`)

  - Venue info with showtime grid
  - "View venue" link
  - Story with example

- [ ] **2.10** Create `CategoryCard` component (`components/cards/category-card.tsx`)

  - Icon, title, count
  - Hover effect
  - Story with grid example

- [ ] **2.11** Create `SearchResultCard` component (`components/search/search-result-card.tsx`)

  - Event or venue result
  - Horizontal layout for venues
  - Story with both types

- [ ] **2.12** Create `EventListItem` component (`components/cards/event-list-item.tsx`)
  - Horizontal event card for venue detail
  - Showtime chips
  - Story with list example

---

## Phase 3: Navigation & Filters

**Goal**: Create navigation and filter components.

- [ ] **3.1** Update `Header` component (`components/layout/Header/`)

  - Add notification button variant
  - Language toggle button
  - Story update with new variants

- [ ] **3.2** Create `HeaderDetail` component (`components/layout/header-detail.tsx`)

  - Back button, title, action buttons
  - Transparent/solid variants
  - Story with both variants

- [ ] **3.3** Update `BottomNav` component (`components/layout/BottomNav/`)

  - Add badge support for tickets count
  - Verify RTL behavior
  - Story update with badge

- [ ] **3.4** Create `CategoryTabs` component (`components/navigation/category-tabs.tsx`)

  - Horizontal scrollable tabs
  - Active state styling
  - Story with scroll behavior

- [ ] **3.5** Create `DateSelector` component (`components/navigation/date-selector.tsx`)

  - Horizontal scrollable date chips
  - "Today", "Tomorrow", dates, "More" button
  - Story with selection

- [ ] **3.6** Create `FilterChips` component (`components/navigation/filter-chips.tsx`)

  - Horizontal filter chips
  - Single/multi select modes
  - Story with both modes

- [ ] **3.7** Create `RecentSearches` component (`components/search/recent-searches.tsx`)

  - Search history list with icons
  - Clear all button
  - Story with items

- [ ] **3.8** Create `TrendingTags` component (`components/search/trending-tags.tsx`)
  - Hashtag button grid
  - Story with tags

---

## Phase 4: Forms & Inputs

**Goal**: Create form and input components for ticketing flow.

- [ ] **4.1** Create `SearchInput` component (`components/search/search-input.tsx`)

  - Search icon, input, clear button
  - Focus styling
  - Story with typing simulation

- [ ] **4.2** Create `QuantitySelector` component (`components/forms/quantity-selector.tsx`)

  - +/- buttons with count display
  - Min/max limits
  - Story with interaction

- [ ] **4.3** Create `TicketTypeCard` component (`components/ticketing/ticket-type-card.tsx`)

  - Ticket type name, description, price
  - Quantity selector integration
  - VIP variant with premium styling
  - Story with all types

- [ ] **4.4** Create `ContactForm` component (`components/forms/contact-form.tsx`)

  - Email and phone inputs
  - Create account checkbox
  - Story with validation states

- [ ] **4.5** Create `PaymentMethodSelector` component (`components/forms/payment-method-selector.tsx`)

  - Radio card selection
  - Card, Flouci options
  - Story with selection

- [ ] **4.6** Create `CardInput` component (`components/forms/card-input.tsx`)
  - Card number, expiry, CVV, name fields
  - Card icon
  - Story with input masking demo

---

## Phase 5: Ticketing Flow Components

**Goal**: Create components for the 4-step booking wizard.

- [ ] **5.1** Create `EventSummaryBanner` component (`components/ticketing/event-summary-banner.tsx`)

  - Compact event info for checkout header
  - Story with example

- [ ] **5.2** Create `SeatMap` component (`components/ticketing/seat-map.tsx`)

  - Seat grid with rows (A-E)
  - Available/selected/taken/VIP states
  - Screen indicator
  - Story with interactive selection

- [ ] **5.3** Create `SeatLegend` component (`components/ticketing/seat-legend.tsx`)

  - Seat status legend
  - Story with legend

- [ ] **5.4** Create `OrderSummary` component (`components/ticketing/order-summary.tsx`)

  - Fixed bottom bar
  - Total price, ticket count, CTA button
  - Story with various totals

- [ ] **5.5** Create `SuccessAnimation` component (`components/feedback/success-animation.tsx`)

  - Animated circle + checkmark SVG
  - Story with animation

- [ ] **5.6** Create `ConfettiEffect` component (`components/feedback/confetti-effect.tsx`)

  - Falling confetti animation
  - Story with trigger

- [ ] **5.7** Create `TicketConfirmation` component (`components/ticketing/ticket-confirmation.tsx`)
  - Full confirmation layout composition
  - QR code, event details, actions
  - Story as full page

---

## Phase 6: Ticket & Scanner Views

**Goal**: Create ticket display and scanner (Pro) components.

- [ ] **6.1** Create `TicketDetail` component (`components/tickets/ticket-detail.tsx`)

  - Full ticket view with large QR
  - Event info grid, venue link
  - Brightness toggle
  - Story as full page

- [ ] **6.2** Create `TicketTabs` component (`components/tickets/ticket-tabs.tsx`)

  - Upcoming/Past tab toggle
  - Count badges
  - Story with tab switching

- [ ] **6.3** Create `OfflineIndicator` component (`components/ui/offline-indicator.tsx`)

  - Green dot with "Works offline" text
  - Story with indicator

- [ ] **6.4** Create `ScannerViewfinder` component (`components/scanner/scanner-viewfinder.tsx`)

  - QR scanner frame with corner markers
  - Scanning line animation
  - Story with animation

- [ ] **6.5** Create `ScanResult` component (`components/scanner/scan-result.tsx`)

  - Valid/Invalid/AlreadyScanned/WrongEvent variants
  - Slide-up panel animation
  - Ticket details display
  - Story with all variants

- [ ] **6.6** Create `AttendanceCounter` component (`components/scanner/attendance-counter.tsx`)
  - Scanned/total count
  - Progress bar
  - Story with various counts

---

## Validation & Documentation

- [ ] **7.1** Run Storybook and verify all stories render
- [ ] **7.2** Test all components in RTL mode
- [ ] **7.3** Run accessibility checks for all stories
- [ ] **7.4** Create README for component library usage

---

## Notes

- Each task creates a component file + a story file
- Components should use existing `cn()` utility for class merging
- All stories should demonstrate interactive states where applicable
- Test on mobile viewport (375px) as primary target
