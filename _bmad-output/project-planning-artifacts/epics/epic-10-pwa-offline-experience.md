# Epic 10: PWA & Offline Experience [MVP-partial]

Users can install the app and browse cached content offline.

> **MVP Scope:** PWA installation, showtime caching, offline browsing, basic offline indicators.
> **Phase 2:** Offline watchlist, offline tickets, background sync for user actions.

## Story 10.1: PWA Installation [MVP]

As a **user**,
I want to install Tiween on my device,
So that I can access it like a native app.

**Acceptance Criteria:**

**Given** I am using a PWA-compatible browser
**When** I meet the installation criteria (visited, engaged)
**Then** I see an install prompt (custom or browser default)
**And** tapping install adds the app to my home screen
**And** the app launches in standalone mode (no browser UI)
**And** app icon uses proper Tiween branding
**And** splash screen shows during startup

---

## Story 10.2: Event Listing Caching [MVP]

As a **user**,
I want showtime listings to be cached,
So that I can browse even with poor connectivity.

**Acceptance Criteria:**

**Given** I have browsed showtimes while online
**When** I go offline or have poor connectivity
**Then** cached showtime listings are shown
**And** film posters load from cache
**And** "Last updated: X ago" indicator is shown
**And** cache is refreshed in background when online
**And** cache uses stale-while-revalidate strategy

---

## Story 10.3: Offline Browsing [MVP]

As a **user**,
I want to browse cached content offline,
So that I can check showtimes without internet.

**Acceptance Criteria:**

**Given** I am offline
**When** I browse the app
**Then** cached homepage loads
**And** cached film detail pages load
**And** navigation works between cached pages
**And** "You're offline" indicator is shown
**And** uncached pages show offline fallback

---

## Story 10.4: Offline Watchlist Access [Phase 2]

> **Deferred:** Watchlist feature deferred to Phase 2.

As a **user**,
I want to view my watchlist offline,
So that I can remember my saved events.

**Acceptance Criteria:**

**Given** I have a watchlist with items
**When** I go offline
**Then** my watchlist page shows cached items
**And** event cards display correctly
**And** adding/removing is disabled (with tooltip)
**And** "Syncs when online" message is shown

---

## Story 10.5: Offline Ticket Display [Phase 2]

> **Deferred:** Ticketing feature deferred to Phase 2.

As a **user**,
I want to view my tickets offline,
So that I can enter venues without internet.

**Acceptance Criteria:**

**Given** I have purchased tickets
**When** I go offline on event day
**Then** my tickets load from cache
**And** QR codes display correctly
**And** "Works offline" badge is shown
**And** brightness boost works
**And** tickets remain valid for scanning

---

## Story 10.6: Background Sync [Phase 2]

> **Deferred:** No user actions to sync in MVP (no watchlist, no purchases).

As a **user**,
I want my actions to sync when I'm back online,
So that nothing is lost from offline usage.

**Acceptance Criteria:**

**Given** I performed actions while offline (e.g., added to watchlist)
**When** connectivity is restored
**Then** queued actions sync automatically
**And** sync happens in background
**And** I see a toast when sync completes
**And** any conflicts are resolved (last write wins)
**And** failed syncs are retried with backoff

---

## Story 10.7: Install Prompts [MVP]

As a **user**,
I want to be prompted to install the app at the right time,
So that I'm not annoyed but do learn about the option.

**Acceptance Criteria:**

**Given** I am a first-time visitor
**When** I engage with the app (browse showtimes, etc.)
**Then** I see a custom install banner (not immediately)
**And** banner appears after 2-3 page views or 30 seconds
**And** I can dismiss the banner (remembered for 7 days)
**And** prompts respect "beforeinstallprompt" event

---

## Story 10.8: Offline Status Indicators [MVP]

As a **user**,
I want clear indicators when I'm offline,
So that I understand why some features are limited.

**Acceptance Criteria:**

**Given** I lose internet connection
**When** I use the app
**Then** a non-intrusive "Offline" indicator appears
**And** the indicator updates when back online
**And** indicators don't block core functionality
**And** graceful degradation messaging for unavailable features
