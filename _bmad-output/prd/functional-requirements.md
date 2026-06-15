# Functional Requirements

> **Note:** Requirements are tagged with their phase:
>
> - **[MVP]** = Relaunch scope (cinema showtimes parity with legacy)
> - **[Phase 2]** = Post-relaunch features
> - **[Phase 3]** = Future expansion

## Movie Discovery & Browsing (Cinema Focus)

- **FR1:** [MVP] Visitors can browse movie showtimes without creating an account
- **FR2:** [MVP] Users can filter showtimes by date (today, tomorrow, specific date)
- **FR3:** [MVP] Users can filter showtimes by cinema/venue
- **FR4:** [MVP] Users can filter showtimes by region (Greater Tunis initially)
- **FR5:** [MVP] Users can view film details including synopsis, trailer, duration, cast, and rating
- **FR6:** [MVP] Users can view venue details including location, contact, and map
- **FR7:** [MVP] Users can search films by title
- **FR8:** [Phase 2] Users can filter events by category (cinema, theater, concerts, exhibitions)
- **FR9:** [Phase 2] Users can filter events by "near me" using geolocation
- **FR10:** [MVP] Users can share film/showtime details via standard share mechanisms

## User Accounts & Profiles

- **FR11:** [MVP] Users can register with email and password
- **FR12:** [MVP] Users can register/login with social providers (Google, Facebook)
- **FR13:** [MVP] Users can reset their password via email
- **FR14:** [MVP] Users can update their profile information
- **FR15:** [MVP] Users can set their preferred language (Arabic, French, English)
- **FR16:** [MVP] Users can set their default region for discovery
- **FR17:** [Phase 2] Users can view their purchase history
- **FR18:** [Phase 2] Guest users can complete purchases without creating an account

## Watchlist & Personalization

- **FR19:** [Phase 2] Authenticated users can add events to their watchlist
- **FR20:** [Phase 2] Authenticated users can remove events from their watchlist
- **FR21:** [Phase 2] Users can view their watchlist
- **FR22:** [Phase 2] Users can access their watchlist offline
- **FR23:** [Phase 2] Watchlist syncs across devices when online

## Ticketing & Purchases (B2C)

- **FR24:** [Phase 2] Users can view available ticket types and prices for an event
- **FR25:** [Phase 2] Users can select quantity and ticket type for purchase
- **FR26:** [Phase 2] Users can complete payment via integrated payment gateway
- **FR27:** [Phase 2] Users receive QR code tickets via email after purchase
- **FR28:** [Phase 2] Users can view purchased tickets in the app
- **FR29:** [Phase 2] Users can access purchased ticket QR codes offline
- **FR30:** [Phase 2] Users receive booking confirmation with event details
- **FR31:** [Phase 2] Guest checkout users receive tickets via email without app access

## Venue Management (B2B)

- **FR32:** [Phase 2] Venue managers can register their venue on the platform
- **FR33:** [Phase 2] Venue managers can manage their venue profile (photos, description, location, contact)
- **FR34:** [Phase 2] Venue managers can create new events with details (title, description, dates, times, media)
- **FR35:** [Phase 2] Venue managers can edit existing events
- **FR36:** [Phase 2] Venue managers can delete/cancel events
- **FR37:** [Phase 2] Venue managers can set up ticketing for events (price tiers, quantities, sale dates)
- **FR38:** [Phase 2] Venue managers can view ticket sales reports
- **FR39:** [Phase 2] Venue managers can view event analytics (views, demographics)
- **FR40:** [Phase 2] Venue managers can configure multiple ticket types per event (standard, reduced, VIP)

## Ticket Validation (B2B)

- **FR41:** [Phase 2] Venue staff can scan QR codes to validate tickets
- **FR42:** [Phase 2] Scanner displays validation result (valid/invalid/already used)
- **FR43:** [Phase 2] Scanner shows ticket details on successful validation
- **FR44:** [Phase 2] Scanner prevents duplicate ticket usage
- **FR45:** [Phase 2] Venue staff can view real-time attendance counts per event
- **FR46:** [Phase 2] Scanner can operate with intermittent connectivity

## Platform Administration

- **FR47:** [Phase 2] Admins can approve or reject venue registration requests
- **FR48:** [MVP] Admins can create and manage film/showtime listings manually
- **FR49:** [MVP] Admins can edit any film/showtime listing for quality control
- **FR50:** [MVP] Admins can manage venue information
- **FR51:** [Phase 2] Admins can view platform-wide analytics
- **FR52:** [Phase 2] Admins can manage user accounts (view, suspend)
- **FR53:** [MVP] Admins can manage content categories and regions

## Content & Data Management

- **FR54:** [MVP] System supports multilingual content (Arabic, French, English)
- **FR55:** [MVP] System supports RTL layout for Arabic language
- **FR56:** [MVP] System displays content in user's preferred language when available
- **FR57:** [MVP] Films can have multiple images and media attachments (posters, trailers)
- **FR58:** [MVP] Venue profiles can have multiple images

## PWA & Offline Capabilities

- **FR59:** [MVP] Users can install the application on their device
- **FR60:** [MVP] Users can browse cached showtimes when offline
- **FR61:** [Phase 2] Users can access their watchlist when offline
- **FR62:** [Phase 2] Users can view purchased tickets when offline
- **FR63:** [MVP] Application syncs data when connectivity is restored

## Real-Time Updates

- **FR64:** [Phase 2] Users see real-time ticket availability during purchase flow
- **FR65:** [Phase 2] Users receive notifications of schedule changes for watchlisted events
- **FR66:** [Phase 2] Venue managers see real-time sales updates on dashboard

---
