# Epic 2A: Component Library & Design System (PARALLEL TRACK A)

Complete UI component library with Storybook stories, ready for integration. Designers and developers can review all components with dummy data.

## Story 2A.1: Layout Components - BottomNav

As a **developer**,
I want to create the BottomNav component for mobile navigation,
So that users can navigate between main sections of the app on mobile devices.

**Acceptance Criteria:**

**Given** shadcn/ui and Storybook are configured
**When** I create the BottomNav component
**Then** the component is created at `src/components/layout/BottomNav/`
**And** it displays 4 tabs: Home (🏠), Search (🔍), Tickets (🎟️), Account (👤)
**And** each tab has an icon and label
**And** active tab is highlighted with yellow (#F8EB06) icon and text
**And** inactive tabs use muted color
**And** component height is 64px with safe area padding for iOS
**And** touch targets are minimum 48x48px
**And** `activeTab` prop controls which tab is highlighted
**And** `onNavigate` callback fires when a tab is tapped
**And** `ticketCount` prop shows a badge on the Tickets tab
**And** Storybook story exists with all states (home active, search active, with badge, etc.)
**And** component works correctly in RTL mode

---

## Story 2A.2: Layout Components - Header and PageContainer

As a **developer**,
I want to create the Header and PageContainer components,
So that pages have consistent layout structure across the app.

**Acceptance Criteria:**

**Given** the BottomNav component exists
**When** I create Header and PageContainer components
**Then** Header component is created at `src/components/layout/Header/` with:

- Logo (Tiween) on the left
- Optional title in center
- Language switcher (AR/FR/EN) on the right
- Optional back button
- Sticky positioning
- Dark background (#032523)
  **And** PageContainer component is created at `src/components/layout/PageContainer/` with:
- Proper padding (16px mobile, 24px tablet+)
- Max-width constraint (1280px)
- Centered content
- Bottom padding for BottomNav clearance (64px + safe area)
  **And** both components have Storybook stories
  **And** components work correctly in RTL mode
  **And** Header flips back arrow direction in RTL

---

## Story 2A.3: Layout Components - StickyFilters

As a **developer**,
I want to create the StickyFilters component for persistent filter controls,
So that users can filter content while scrolling.

**Acceptance Criteria:**

**Given** layout components exist
**When** I create the StickyFilters component
**Then** the component is created at `src/components/layout/StickyFilters/`
**And** it sticks below the Header when scrolling
**And** it contains slots for:

- CategoryTabs (horizontal scrolling tabs)
- DateSelector (date filter)
- Additional filter buttons
  **And** background uses surface color with blur effect
  **And** component has proper z-index layering
  **And** Storybook story exists showing sticky behavior
  **And** component works in RTL mode

---

## Story 2A.4: Discovery Components - EventCard

As a **developer**,
I want to create the EventCard component for displaying event previews,
So that users can browse events in listings and search results.

**Acceptance Criteria:**

**Given** layout components exist
**When** I create the EventCard component
**Then** the component is created at `src/features/events/components/EventCard/`
**And** it displays:

- Poster image (16:9 aspect ratio) with lazy loading
- Category badge (e.g., "Cinéma", "Théâtre")
- Event title (truncated if too long)
- Venue name and date
- Watchlist heart button
- Price (if available)
  **And** three variants are supported: `default`, `compact`, `featured`
  **And** hover state shows subtle elevation
  **And** loading state shows Skeleton placeholder
  **And** `onWatchlist` callback fires when heart is tapped
  **And** `isWatchlisted` prop fills the heart icon
  **And** Storybook stories exist for all variants and states
  **And** component uses dummy event data for stories
  **And** touch target for watchlist button is 44x44px minimum
  **And** component works in RTL mode

---

## Story 2A.5: Discovery Components - FilmHero

As a **developer**,
I want to create the FilmHero component for event detail page headers,
So that event details are presented with visual impact.

**Acceptance Criteria:**

**Given** EventCard component exists
**When** I create the FilmHero component
**Then** the component is created at `src/features/events/components/FilmHero/`
**And** it displays:

- Full-bleed backdrop image with gradient overlay
- Event title in Lalezar display font
- Category and genre badges
- Rating (if available)
- Duration and year
- Venue count ("Dans X salles")
- Watchlist and Share buttons
  **And** image has proper loading placeholder
  **And** gradient ensures text readability
  **And** component is responsive (full-width mobile, 60% desktop with sidebar)
  **And** Storybook stories exist with dummy data
  **And** component works in RTL mode

---

## Story 2A.6: Discovery Components - CategoryTabs and DateSelector

As a **developer**,
I want to create CategoryTabs and DateSelector filter components,
So that users can filter events by category and date.

**Acceptance Criteria:**

**Given** StickyFilters layout component exists
**When** I create CategoryTabs and DateSelector components
**Then** CategoryTabs is created at `src/features/events/components/CategoryTabs/` with:

- Horizontal scrolling tabs
- Categories: Tout, Cinéma, Théâtre, Courts-métrages, Musique, Expositions
- Active tab has yellow underline and text
- Touch-friendly tap targets
- Scroll indicators when content overflows
  **And** DateSelector is created at `src/features/events/components/DateSelector/` with:
- Horizontal scrolling date chips
- "Aujourd'hui", "Demain", specific dates (e.g., "Ven. 16")
- Selected date has yellow background
- "Custom" option opens date picker
  **And** both components have Storybook stories
  **And** components work in RTL mode (scroll direction, text alignment)

---

## Story 2A.7: Discovery Components - VenueCard and SearchBar

As a **developer**,
I want to create VenueCard and SearchBar components,
So that users can browse venues and search for events.

**Acceptance Criteria:**

**Given** EventCard component exists
**When** I create VenueCard and SearchBar components
**Then** VenueCard is created at `src/features/venues/components/VenueCard/` with:

- Venue image/logo
- Venue name
- Location/address
- Event count ("X événements cette semaine")
- Optional distance ("2.3 km")
  **And** SearchBar is created at `src/features/search/components/SearchBar/` with:
- Search icon
- Text input with placeholder
- Clear button when has content
- Recent searches dropdown on focus
- Loading state during search
  **And** both components have Storybook stories
  **And** SearchBar works in RTL mode (icon positions, text direction)

---

## Story 2A.8: Discovery Components - SearchResults

As a **developer**,
I want to create the SearchResults component for displaying search outcomes,
So that users can see results from their search queries.

**Acceptance Criteria:**

**Given** SearchBar and EventCard components exist
**When** I create the SearchResults component
**Then** the component is created at `src/features/search/components/SearchResults/`
**And** it displays:

- Result count header ("X résultats pour 'query'")
- List of EventCard components
- "No results" empty state with suggestions
- Loading state with Skeleton cards
- Filter chips for active filters
  **And** supports infinite scroll loading pattern
  **And** Storybook stories exist for:
- Results found state
- No results state
- Loading state
  **And** component works in RTL mode

---

## Story 2A.9: Ticketing Components - ShowtimeButton

As a **developer**,
I want to create the ShowtimeButton component for showtime selection,
So that users can choose when and where to see an event.

**Acceptance Criteria:**

**Given** shadcn/ui Button is available
**When** I create the ShowtimeButton component
**Then** the component is created at `src/features/tickets/components/ShowtimeButton/`
**And** it displays:

- Time (e.g., "20:30")
- Venue name
- Format badges (VOST, VF, 3D)
  **And** states supported:
- Default: dark surface background
- Hover: lighter surface
- Selected: yellow border and background
- Sold out: "Complet" badge, disabled, strikethrough
- Unavailable: dimmed, not clickable
  **And** `onSelect` callback fires when clicked
  **And** component has proper keyboard navigation
  **And** Storybook stories exist for all states
  **And** component works in RTL mode

---

## Story 2A.10: Ticketing Components - QuantitySelector and OrderSummary

As a **developer**,
I want to create QuantitySelector and OrderSummary components,
So that users can select ticket quantities and review their order.

**Acceptance Criteria:**

**Given** ShowtimeButton component exists
**When** I create QuantitySelector and OrderSummary components
**Then** QuantitySelector is created at `src/features/tickets/components/QuantitySelector/` with:

- Minus and Plus buttons
- Current quantity display
- Min/max limits (e.g., 1-10)
- Disabled state when at limits
- Ticket type label (e.g., "Plein tarif", "Tarif réduit")
- Unit price display
  **And** OrderSummary is created at `src/features/tickets/components/OrderSummary/` with:
- Event title and showtime
- Line items (ticket type × quantity × price)
- Subtotal
- Service fee (if applicable)
- Total in TND
  **And** both components have Storybook stories
  **And** currency displays as "X,XX DT" format
  **And** components work in RTL mode

---

## Story 2A.11: Ticketing Components - TicketQR

As a **developer**,
I want to create the TicketQR component for displaying ticket QR codes,
So that users can present their tickets for scanning at events.

**Acceptance Criteria:**

**Given** OrderSummary component exists
**When** I create the TicketQR component
**Then** the component is created at `src/features/tickets/components/TicketQR/`
**And** it displays:

- Large QR code (centered, high contrast black on white)
- Ticket ID (e.g., "TIW-2024-XXXX")
- Event title
- Date, time, venue
- Ticket count ("2 billets")
- "Add to Wallet" button (optional)
- "Share" button
  **And** size variants: `small` (list view), `large` (detail view)
  **And** states supported:
- Valid: green accent border
- Scanned: checkmark overlay with scan time
- Expired: dimmed with "Événement passé"
- Offline: "Fonctionne hors ligne" badge
  **And** QR uses dummy data (static image) for Storybook
  **And** Storybook stories exist for all states
  **And** high brightness option for better scanning

---

## Story 2A.12: Ticketing Components - SeatSelector

As a **developer**,
I want to create the SeatSelector component for reserved seating,
So that users can choose specific seats when applicable.

**Acceptance Criteria:**

**Given** TicketQR component exists
**When** I create the SeatSelector component
**Then** the component is created at `src/features/tickets/components/SeatSelector/`
**And** it displays:

- Screen indicator at top
- Grid of seats by row (A, B, C...) and number (1, 2, 3...)
- Legend showing: Available (○), Selected (●), Taken (×), Wheelchair (◆)
  **And** seat states:
- Available: outline, tappable
- Selected: filled yellow
- Taken: filled gray, not tappable
- Wheelchair: diamond shape for accessible spots
  **And** `maxSeats` prop limits selection count
  **And** `onSelect` callback returns selected seats array
  **And** grid supports keyboard navigation (arrow keys)
  **And** Storybook stories show various venue layouts
  **And** component works in RTL mode (row labels on right)

---

## Story 2A.13: Ticketing Components - PaymentForm

As a **developer**,
I want to create the PaymentForm component for checkout,
So that users can enter payment information to complete purchases.

**Acceptance Criteria:**

**Given** SeatSelector component exists
**When** I create the PaymentForm component
**Then** the component is created at `src/features/tickets/components/PaymentForm/`
**And** it displays:

- Payment method selector (e-Dinar, Sobflous, D17, Flouci, Carte bancaire)
- Method-specific form fields
- Terms acceptance checkbox
- Submit button with loading state
  **And** form validation using Zod schemas
  **And** error states for invalid fields
  **And** payment method icons/logos
  **And** secure badge indicator
  **And** Storybook stories show all payment methods
  **And** form works in RTL mode

---

## Story 2A.14: User Components - LoginForm and RegisterForm

As a **developer**,
I want to create LoginForm and RegisterForm components,
So that users can authenticate with the application.

**Acceptance Criteria:**

**Given** shadcn/ui Form components are available
**When** I create LoginForm and RegisterForm components
**Then** LoginForm is created at `src/features/auth/components/LoginForm/` with:

- Email input
- Password input with show/hide toggle
- "Forgot password" link
- Submit button
- Social login buttons (Google, Facebook)
- "Create account" link
  **And** RegisterForm is created at `src/features/auth/components/RegisterForm/` with:
- Name input
- Email input
- Password input with strength indicator
- Confirm password input
- Terms acceptance checkbox
- Submit button
- Social login buttons
- "Already have account" link
  **And** both forms use Zod validation
  **And** error messages display inline
  **And** Storybook stories exist for all states
  **And** forms work in RTL mode

---

## Story 2A.15: User Components - ProfileForm and SocialLogin

As a **developer**,
I want to create ProfileForm and SocialLogin components,
So that users can manage their profile and authenticate with social providers.

**Acceptance Criteria:**

**Given** LoginForm and RegisterForm exist
**When** I create ProfileForm and SocialLogin components
**Then** ProfileForm is created at `src/features/auth/components/ProfileForm/` with:

- Avatar upload/change
- Name input
- Email display (non-editable or with verification)
- Language preference selector (AR/FR/EN)
- Default region selector
- Save button
  **And** SocialLogin is created at `src/features/auth/components/SocialLogin/` with:
- "Continue with Google" button with icon
- "Continue with Facebook" button with icon
- Divider with "ou"
- Loading states for each button
  **And** both components have Storybook stories
  **And** components work in RTL mode

---

## Story 2A.16: User Components - WatchlistButton

As a **developer**,
I want to create the WatchlistButton component for adding events to watchlist,
So that users can save events for later viewing.

**Acceptance Criteria:**

**Given** EventCard component exists
**When** I create the WatchlistButton component
**Then** the component is created at `src/features/watchlist/components/WatchlistButton/`
**And** it displays a heart icon
**And** states supported:

- Not watchlisted: outline heart
- Watchlisted: filled heart (yellow)
- Loading: spinner
- Disabled: dimmed
  **And** animation on state change (pulse effect on add)
  **And** `onToggle` callback fires on click
  **And** `isWatchlisted` prop controls state
  **And** touch target is 44x44px minimum
  **And** accessible label: "Ajouter à la watchlist" / "Retirer de la watchlist"
  **And** Storybook stories show all states and animation

---

## Story 2A.17: Common Components - EmptyState and ErrorBoundary

As a **developer**,
I want to create EmptyState and ErrorBoundary components,
So that the app handles empty data and errors gracefully.

**Acceptance Criteria:**

**Given** shadcn/ui components are available
**When** I create EmptyState and ErrorBoundary components
**Then** EmptyState is created at `src/components/common/EmptyState/` with:

- Optional illustration slot
- Title text
- Description text
- Primary CTA button
- Secondary action (optional)
  **And** preset variants for common cases:
- No search results
- Empty watchlist
- No tickets
- No events in category
- Offline mode
  **And** ErrorBoundary is created at `src/components/common/ErrorBoundary/` with:
- Error message display
- "Try again" button
- Fallback UI
- Error logging callback
  **And** both components have Storybook stories
  **And** components work in RTL mode

---

## Story 2A.18: Common Components - LoadingSpinner, Skeleton, Toast

As a **developer**,
I want to create LoadingSpinner, Skeleton, and Toast components,
So that the app provides feedback during loading and operations.

**Acceptance Criteria:**

**Given** shadcn/ui Skeleton and Toast are available
**When** I create/extend loading and feedback components
**Then** LoadingSpinner is created at `src/components/common/LoadingSpinner/` with:

- Spinning animation
- Size variants: `sm`, `md`, `lg`
- Optional label text
- Centered positioning option
  **And** Skeleton components are extended at `src/components/common/Skeleton/` with presets:
- EventCardSkeleton
- FilmHeroSkeleton
- TicketCardSkeleton
- ListSkeleton (configurable row count)
  **And** Toast is configured with Tiween theme:
- Success: green accent
- Error: red accent
- Warning: yellow accent
- Info: blue accent
- Positioned bottom center on mobile, top right on desktop
  **And** all components have Storybook stories

---

## Story 2A.19: Common Components - Badge Variants

As a **developer**,
I want to extend the Badge component with Tiween-specific variants,
So that we have consistent badge styling for categories, formats, and status.

**Acceptance Criteria:**

**Given** shadcn/ui Badge is installed
**When** I extend the Badge component with custom variants
**Then** Badge variants are added to `src/components/ui/badge.tsx`:

- `category`: for event categories (Cinéma, Théâtre, etc.)
- `format`: for showtime formats (VOST, VF, 3D)
- `status`: for ticket status (Valid, Scanned, Expired)
- `count`: for numeric badges (ticket count, notification count)
  **And** each variant has appropriate colors matching the design system
  **And** Storybook stories demonstrate all variants
  **And** badges have proper contrast ratios for accessibility

---

## Story 2A.20: Scanner Components - TicketScanner and ValidationResult

As a **developer**,
I want to create TicketScanner and ValidationResult components,
So that venue staff can scan and validate tickets at entry.

**Acceptance Criteria:**

**Given** TicketQR component exists
**When** I create TicketScanner and ValidationResult components
**Then** TicketScanner is created at `src/features/scanner/components/TicketScanner/` with:

- Camera viewfinder area
- Scan overlay/guide
- Event selector dropdown
- Attendance counter display
- Flash toggle button
- Manual entry fallback button
  **And** ValidationResult is created at `src/features/scanner/components/ValidationResult/` with:
- Large status icon (✓ green, ✕ red, ⚠ yellow)
- Status message ("Valide", "Déjà scanné", "Non trouvé", "Mauvais événement")
- Ticket details (when valid)
- Scan timestamp (when already scanned)
- Auto-dismiss after 2 seconds
- High contrast for dark venue visibility
  **And** audio feedback indicators (visual representation)
  **And** Storybook stories show all validation states
  **And** components optimized for high-throughput scanning

---

## Story 2A.21: Scanner Components - AttendanceCounter

As a **developer**,
I want to create the AttendanceCounter component for real-time attendance tracking,
So that venue staff can monitor event attendance.

**Acceptance Criteria:**

**Given** TicketScanner component exists
**When** I create the AttendanceCounter component
**Then** the component is created at `src/features/scanner/components/AttendanceCounter/`
**And** it displays:

- Scanned count / Total tickets sold
- Progress bar visualization
- No-show count
- Percentage scanned
  **And** large, readable numbers for at-a-glance viewing
  **And** updates in real-time (accepts updated props)
  **And** Storybook stories show various progress states
  **And** high contrast design for visibility in dark venues

---
