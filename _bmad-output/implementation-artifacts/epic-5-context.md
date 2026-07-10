# Epic 5 Context: Watchlist & Personalization [Phase 2]

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give authenticated users a personal watchlist so they can save cultural events, find them again later, and act on them. Watchlist turns passive discovery into active planning: users save events with one tap from any event card, browse and filter their saved items on a dedicated page, access that list offline on spotty connectivity, keep it consistent across devices, and get notified when a saved event's schedule changes or is cancelled. This epic is deferred to Phase 2 (descoped from the MVP, which focuses on cinema showtimes discovery); it builds on the accounts/auth capability and the discovery event/EventCard surfaces already shipped.

## Stories

- Story 5.1: Add Event to Watchlist
- Story 5.2: Remove Event from Watchlist
- Story 5.3: View Watchlist Page
- Story 5.4: Offline Watchlist Access
- Story 5.5: Watchlist Sync Across Devices
- Story 5.6: Schedule Change Notifications

## Requirements & Constraints

- Watchlist is available to authenticated users only. Unauthenticated users attempting to save should be prompted to create an account ("create account to save"); the prompt is low-friction and optional.
- Offline-first is a hard product constraint (target audience is on variable mobile connectivity). A previously-viewed watchlist must be readable offline, showing an offline indicator and a "last synced X ago" timestamp. Add/remove are disabled while offline (with an explanatory tooltip) and any actions taken are queued for replay on reconnect.
- Cross-device consistency: an add/remove on one device should appear on others within ~5 seconds while online. Conflicts resolve last-write-wins. Sync status must be surfaced to the user (in settings/account).
- Every async surface must define all of loading, empty, error, and success states — never a blank screen. The watchlist empty state is encouraging with a CTA back into discovery.
- Success is measured by watchlist adoption and engagement (share of users with an active watchlist, average saves per active user, and a high offline/online sync success rate), so instrumentation of save/remove/sync events matters.

## Technical Decisions

- **Backend ownership:** the `user-engagement` Strapi plugin owns the `user-watchlist` content type; all Epic 5 backend work lands here. Cross-plugin access goes through the plugin's single named facade service (public-api), never by reaching into another plugin's internals. Note: per architecture the watchlist entity relates to `creative-work`, while the stories describe saving _events_ — reconcile the watchlist target (event vs. creative-work) before building, as it drives the schema and API shape.
- **Strapi v5 conventions:** Document Service API (not Entity Service); use `documentId`, not `id`; enable i18n (AR/FR/EN) on any localized content.
- **Frontend stack:** Next.js App Router; Zustand (with persist) for client-side/offline state including the pending-action queue; SWR for Strapi data fetching; NextAuth.js (JWT) for auth-gating; next-intl for i18n. UI strings default to French; dates are DD/MM/YYYY in all locales and always Western numerals; RTL is automatic for Arabic.
- **Optimistic UI + offline queue:** watchlist toggles apply immediately in the UI and sync afterward. When offline, the add/remove is enqueued (persisted) and replayed on reconnection; the server write to Strapi is the source of truth once online.
- **Offline caching:** the PWA service worker (Serwist) caches watchlist listings so the page renders offline; pair cached data with the sync-status metadata (offline indicator, last-synced time).
- **Notifications (Story 5.6):** there is no dedicated notifications plugin yet (deferred until a second engagement feature justifies it), so schedule-change notification logic lives within `user-engagement` for now. In-app notifications drive an account-tab badge and a notifications list; email delivery uses the Strapi email plugin (Resend) and respects the user's notification preferences.

## UX & Interaction Patterns

- **One-tap save from the card:** watchlisting is a heart/bookmark control present on every EventCard. The reusable `WatchlistButton` (heart with animation) and the EventCard's `isWatchlisted` / `onWatchlist` props already model this. On add, the heart fills (brand gold/yellow) with a pulse animation and a success toast confirms ("Ajouté à la watchlist").
- **Remove with undo:** removing flips the heart to outline, shows a toast with an undo option, and animates the card out of the watchlist page.
- **Watchlist page:** reached via the Account tab; shows saved events as EventCards sorted soonest-first, filterable by category, with expired events in a separate "Past" section and an encouraging empty state + CTA.
- **Feedback conventions:** success/error use the shared toast component; destructive/irreversible actions only get confirmation dialogs; loading uses skeletons.

## Cross-Story Dependencies

- Depends on shipped capabilities: authentication/accounts (watchlist is auth-gated) and the discovery event model + EventCard/WatchlistButton components that host the save control.
- 5.1/5.2 (add/remove) establish the write path and optimistic/offline queue that 5.3 (view), 5.4 (offline), and 5.5 (sync) all build on; the queue and sync-status model are shared infrastructure across 5.4 and 5.5.
- 5.6 (schedule-change notifications) depends on the events-manager scheduling data (screening/performance changes and cancellations) as the trigger source and on user notification preferences from the accounts capability.
