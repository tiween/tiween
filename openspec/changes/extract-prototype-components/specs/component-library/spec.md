# Component Library Specification

This specification defines requirements for the Tiween UI component library extracted from HTML prototypes.

## ADDED Requirements

### Requirement: The library SHALL provide primitive UI components

The component library MUST provide foundational primitive components for building complex UI elements.

#### Scenario: Badge component renders with variants

Given a Badge component
When rendered with variant "primary"
Then it displays with yellow background and green text
And when rendered with variant "secondary"
Then it displays with surface background and white text

#### Scenario: Chip component supports selection state

Given a Chip component
When rendered in default state
Then it displays with surface background
And when the active prop is true
Then it displays with yellow background and green text

#### Scenario: IconButton component renders with different styles

Given an IconButton component
When rendered with variant "ghost"
Then it displays with transparent background
And when rendered with variant "surface"
Then it displays with surface background

#### Scenario: Rating component displays star rating

Given a Rating component with value 4.5
When rendered
Then it displays filled stars proportional to the value
And optionally shows the review count

#### Scenario: QRCode component displays ticket code

Given a QRCode component with a ticket code
When rendered
Then it displays a QR code pattern
And optionally applies a glow effect

---

### Requirement: The library SHALL provide card components for events and venues

The component library MUST provide card components for displaying events, venues, and tickets.

#### Scenario: EventCard displays event details

Given an EventCard component with event data
When rendered
Then it displays the event poster image
And shows the category badge
And shows the price badge
And shows the event title and venue
And includes a watchlist button

#### Scenario: VenueCard displays venue information

Given a VenueCard component with venue data
When rendered
Then it displays the venue image
And shows the venue name and address
And shows the session count

#### Scenario: TicketCard displays ticket with QR preview

Given a TicketCard component with ticket data
When rendered with status "upcoming"
Then it displays a QR preview
And shows event details
And shows seat information
And when rendered with status "past"
Then it displays with reduced opacity

---

### Requirement: The library SHALL provide navigation components

The component library MUST provide navigation components for the mobile app.

#### Scenario: BottomNav displays four navigation tabs

Given a BottomNav component
When rendered
Then it displays Home, Search, Tickets, and Account tabs
And the current tab is highlighted
And optionally shows a badge on the Tickets tab

#### Scenario: HeaderDetail provides page navigation

Given a HeaderDetail component with title "Event Name"
When rendered
Then it displays a back button
And shows the title
And optionally shows action buttons (share, heart)

#### Scenario: DateSelector enables date filtering

Given a DateSelector component
When rendered
Then it displays "Today", "Tomorrow", and upcoming dates
And allows selecting a date
And the selected date is highlighted

---

### Requirement: The library SHALL provide ticketing flow components

The component library MUST provide components for the 4-step ticket booking flow.

#### Scenario: SeatMap displays interactive seat grid

Given a SeatMap component with seat data
When rendered
Then it displays rows of seats (A-E)
And shows seat status (available, selected, taken, VIP)
And allows selecting available seats

#### Scenario: QuantitySelector allows adjusting ticket count

Given a QuantitySelector component
When the plus button is clicked
Then the count increases by 1
And when the minus button is clicked
Then the count decreases by 1
And the count respects min/max limits

#### Scenario: OrderSummary displays booking total

Given an OrderSummary component with cart data
When rendered
Then it displays the total price
And shows the ticket count
And includes a CTA button

---

### Requirement: The library SHALL provide ticket display components

The component library MUST provide components for displaying purchased tickets.

#### Scenario: TicketDetail displays full ticket view

Given a TicketDetail component with ticket data
When rendered
Then it displays a large QR code
And shows event details in a grid
And shows venue address with map link
And includes action buttons (calendar, share)

#### Scenario: TicketTabs switches between upcoming and past

Given a TicketTabs component
When the "Past" tab is clicked
Then it displays the past tickets view
And hides the upcoming tickets view

---

### Requirement: The library SHALL provide scanner components for Pro app

The component library MUST provide components for the Tiween Pro scanner app.

#### Scenario: ScannerViewfinder displays scanning frame

Given a ScannerViewfinder component
When rendered
Then it displays a scanning frame with corner markers
And shows an animated scanning line

#### Scenario: ScanResult displays ticket validation result

Given a ScanResult component with validation data
When the ticket is valid
Then it displays a green success panel with ticket details
And when the ticket is already scanned
Then it displays a red error panel with scan timestamp
And when the ticket is for wrong event
Then it displays a yellow warning panel with event mismatch

#### Scenario: AttendanceCounter tracks scanned tickets

Given an AttendanceCounter component
When rendered with 187 scanned of 200 total
Then it displays "187/200"
And shows a progress bar at 93.5%

---

### Requirement: All components MUST support RTL layout

All components MUST support right-to-left text direction for Arabic language.

#### Scenario: Components render correctly in RTL mode

Given any component
When the document direction is set to "rtl"
Then the component layout mirrors horizontally
And icons that indicate direction rotate appropriately
And text alignment follows RTL conventions

---

### Requirement: Every component MUST have Storybook stories

Every component MUST have at least one Storybook story for documentation and testing.

#### Scenario: Component has default story

Given a component
When opened in Storybook
Then it displays a default story with typical props
And optionally shows variant stories for different states

#### Scenario: Stories work with RTL toggle

Given a component story in Storybook
When the RTL toggle is activated
Then the story renders in RTL mode
And the layout adjusts appropriately

---

### Requirement: All components MUST use theme tokens

All components MUST use Tailwind theme tokens for colors and fonts.

#### Scenario: Colors come from theme configuration

Given any component
When rendered
Then background colors use theme classes (bg-tiween-green, bg-surface, etc.)
And text colors use theme classes (text-tiween-yellow, text-muted, etc.)
And no hardcoded hex color values are used

#### Scenario: Fonts come from theme configuration

Given any component
When rendered
Then display text uses font-display (Lalezar)
And body text uses font-body (DM Sans)
And Arabic text uses font-arabic (Noto Sans Arabic)
