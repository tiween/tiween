---
title: "Story 5.6 — Schedule Change Notifications"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "e56c62168eee03dbcf6eb00edcec0b95ed28c7fd"
final_revision: "19e1484d25de23e8eeee45d13bec3248c562f873"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-5-5-watchlist-sync-across-devices.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** When a watchlisted event's schedule changes (showtime moved, or the event cancelled/postponed/rescheduled) there is no way for a user to find out — nothing detects `event.startDateTime`/`event.eventStatus` transitions, there is no notification store, no Account-tab badge, no notifications list, and no email. Story 5.6 must close all five gaps for authenticated watchers.

**Approach:** Add a **`schedule-notification` content type + `notification` service** to the `user-engagement` plugin (the epic-designated owner; no separate notifications plugin yet). Detect changes with an **additive `event` DB lifecycle subscriber in the events-manager `bootstrap`** that, on an `afterUpdate` that moved the time or flipped the status, resolves the affected creative-work ids (via the event's `screenings.movie` / `performances.play`) and delegates — cross-plugin, owner-emits — to `user-engagement`'s `notification.notifyScheduleChange(...)`. That fan-out creates one in-app notification per distinct watcher whose `user-watchlist.notifyChanges` is on, and sends a localized Brevo email when the user's new `emailNotificationsEnabled` preference is on. Client: react-query hooks (`useNotifications`, a polled `useUnreadNotificationCount`, `useMarkAllNotificationsRead`), a `/auth/notifications` page (loading/empty/error/success), a generalized Account-tab badge on `BottomNav`, and an email-notifications toggle on the profile page.

## Boundaries & Constraints

**Always:**

- **Change detection is an additive lifecycle, never a business-logic edit.** Register a `strapi.db.lifecycles.subscribe({ models: ["plugin::events-manager.event"], beforeUpdate, afterUpdate })` in the events-manager `bootstrap.ts` (today an empty stub). `beforeUpdate` snapshots the current `startDateTime`+`eventStatus` (keyed by row id in a module Map); `afterUpdate` compares, and only on a notifiable delta collects creative-work documentIds and calls the user-engagement service. Everything is wrapped in try/catch so a notification failure NEVER blocks or throws out of the event save (mirror the existing non-blocking email pattern). Do not touch the event schema, controllers, or services.
- **Respect the plugin facade boundary.** `user-engagement` must NOT issue a foreign-UID `strapi.documents("plugin::events-manager.event")` call. The events-manager lifecycle passes the resolved `creativeWorkDocumentIds` (+ title, category, old/new time, old/new status) INTO `notifyScheduleChange`; the service only ever reads its own `user-watchlist`/`schedule-notification` UIDs and the users-permissions user.
- **Notifiable-delta derivation is a pure, exported, unit-tested helper.** `deriveScheduleChange({ oldStartDateTime, newStartDateTime, oldStatus, newStatus })` returns `{ changeType, oldDateTime, newDateTime } | null`. Mapping: transition INTO `cancelled` ⇒ `cancelled` (newDateTime null); INTO `postponed` ⇒ `postponed`; INTO `rescheduled` ⇒ `rescheduled`; else if status unchanged but `startDateTime` changed (both present, not equal) ⇒ `showtime_changed`; otherwise `null` (no notification). A no-op update (nothing relevant changed) creates zero notifications.
- **Per-watcher, deduped, preference-gated fan-out.** `notifyScheduleChange` finds `user-watchlist` rows whose `creativeWork.documentId ∈ creativeWorkDocumentIds` AND `notifyChanges === true`, dedupes by user (a user watching several works for one event gets ONE notification), creates a `schedule-notification` row per user, and sends the email ONLY when that user's `emailNotificationsEnabled !== false`. Email send is try/catch'd and never throws. Returns `{ created: number }`.
- **In-app notification is a self-contained snapshot.** The `schedule-notification` row denormalizes `changeType`, `oldDateTime`, `newDateTime`, `eventTitle`, `eventDocumentId`, `creativeWorkDocumentId` (plain strings — NO cross-plugin relation), `read` (default false), plus the automatic `createdAt`. It survives later event edits and needs no join to render.
- **All list/read routes are JWT-self-scoped** via the existing `plugin::user-engagement.is-owner` policy; controllers read `ctx.state.user.documentId`; the service filters every query by `user.documentId`. A user can only ever read/mark their own notifications.
- **Client reuses the established stack.** react-query (not SWR); the `PrivateStrapiClient.fetchAPI(path, params, init, { useProxy: true })` proxy; the `notificationKeys` factory mirroring `watchlistKeys`; the online-gated `refetchInterval` pattern from 5.5 for the unread-count poll (`refetchIntervalInBackground: false`, `refetchOnReconnect: true`); `useSession().status === "authenticated"` gating. New proxy endpoints MUST be added to `ALLOWED_STRAPI_ENDPOINTS` per method or the proxy 403s.
- **Every async surface defines loading, empty, error, and success** (epic hard rule). The notifications page uses a skeleton (loading), `EmptyState` with a `Bell` illustration + discovery CTA (empty), an inline error state, and the list (success). Opening the page marks all as read so the badge clears.
- **Localized, Western-numeral, additive i18n.** New copy lives in a new `notifications` next-intl namespace (fr default / ar / en) and new `profile` keys for the email toggle; fr/ar/en stay key-consistent. Dates in-app use the existing `lib/dates.ts` helpers (`formatRelativeTime` for "X ago", `formatDate`/`formatTime` for old↔new times — already Western-numeral for Arabic). The backend email formats dates with `Intl.DateTimeFormat` forcing `timeZone: "Africa/Tunis"` and Latin digits for Arabic.

**Block If:**

- Achieving detection would require modifying the event content-type schema, its controllers/services, or the ticketing/screening write paths — HALT (`schedule-detection needs a backend business-logic change`). Only a colocated additive lifecycle subscriber is sanctioned.
- Satisfying "notification in the app" / badge freshness would require a realtime transport (WebSocket/SSE/pusher), a message queue, or new infra beyond the existing DB + polling proxy — HALT (`realtime infra required`). Polling + lifecycle is the sanctioned mechanism.

**Never:**

- Do NOT add a realtime/push channel, a service worker push, or web-push. Badge freshness is a gated poll only.
- Do NOT modify the watchlist service/schema/controllers/routes semantics, `useWatchlist.ts`, `watchlistQueue.ts`, `watchlistCache.ts`, `useWatchlistSync.ts`, `useOfflineWatchlist.ts`, `EventCard.tsx`, or the `/watchlist` page. Re-use `notifyChanges` read-only.
- Do NOT re-target the watchlist off `creativeWork`, and do NOT read events-manager UIDs from user-engagement.
- Do NOT build a general-purpose notification system (only schedule-change types), an admin UI, digest batching, or per-notification delete. Per-item mark-read beyond "mark all read on view" is out of scope.
- Do NOT expose the stock `PUT /users/:id`; the email preference goes only through the existing self-scoped `PUT /users/me` (`updateMeSchema`) path.

## I/O & Edge-Case Matrix

| Scenario                               | Input / State                                                                                     | Expected Output / Behavior                                                                            | Error Handling                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- | --- |
| Derive — showtime moved                | `{ oldStart:"T1", newStart:"T2", oldStatus:"scheduled", newStatus:"scheduled" }`                  | `{ changeType:"showtime_changed", oldDateTime:"T1", newDateTime:"T2" }`                               | n/a                                          |
| Derive — cancelled                     | `{ oldStatus:"scheduled", newStatus:"cancelled" }`                                                | `{ changeType:"cancelled", oldDateTime:oldStart, newDateTime:null }`                                  | n/a                                          |
| Derive — postponed / rescheduled       | status → `postponed` / `rescheduled`                                                              | `{ changeType:"postponed"                                                                             | "rescheduled", ... }`                        | n/a |
| Derive — no notifiable change          | same time, same status (or only title/venue edited)                                               | `null` → zero notifications created                                                                   | n/a                                          |
| Fan-out — multiple watchers            | 3 users watch the event's work; all `notifyChanges:true`; 1 has `emailNotificationsEnabled:false` | 3 in-app rows created; 2 emails sent (the opted-out user gets in-app only)                            | one email throw → logged, others still sent  |
| Fan-out — notifyChanges off            | watcher row `notifyChanges:false`                                                                 | no in-app row, no email for that watcher                                                              | n/a                                          |
| Fan-out — same user, two watched works | user watches both the screening movie and another work on the same event                          | exactly ONE in-app notification (deduped by user)                                                     | n/a                                          |
| List — authed                          | `GET /user-engagement/notifications`                                                              | `{ data: ScheduleNotification[] }` sorted `createdAt:desc`, only the caller's rows                    | unauth → 401 via is-owner                    |
| Unread count                           | `GET /user-engagement/notifications/unread-count`                                                 | `{ count: N }` (rows with `read:false` for caller)                                                    | unauth → 401                                 |
| Mark all read                          | `PUT /user-engagement/notifications/read-all`                                                     | caller's unread rows set `read:true`; `{ updated: N }`; unread count → 0                              | unauth → 401                                 |
| Badge — unread present, online         | `useUnreadNotificationCount` → N>0                                                                | `BottomNav` renders the account-tab badge (`N`, `99+` cap); polls while online, paused hidden/offline | fetch fail → keep last value, no badge crash |
| Notifications page — empty             | authed, zero notifications                                                                        | `EmptyState` (Bell) + discovery CTA; no error                                                         | n/a                                          |
| Notifications page — loading / error   | query pending / query error                                                                       | skeleton while pending; inline error message on error                                                 | error state, no blank screen                 |
| Email preference toggle                | profile toggle flipped off → `PUT /users/me { emailNotificationsEnabled:false }`                  | persisted on the user; future changes send in-app only                                                | invalid body → 400 from `updateMeSchema`     |

</intent-contract>

## Code Map

**Backend (`apps/strapi`)**

- `src/plugins/user-engagement/server/src/content-types/schedule-notification/schema.json` -- NEW. `plugin::user-engagement.schedule-notification`, `collectionName: schedule_notifications`, `draftAndPublish:false`. Attrs: `user` (manyToOne → `plugin::users-permissions.user`), `changeType` (enum `["showtime_changed","cancelled","postponed","rescheduled"]`), `oldDateTime` (datetime), `newDateTime` (datetime), `eventTitle` (string), `eventDocumentId` (string), `creativeWorkDocumentId` (string), `read` (boolean, default false).
- `src/plugins/user-engagement/server/src/content-types/schedule-notification/index.ts` -- NEW. `export default { schema }`.
- `src/plugins/user-engagement/server/src/content-types/index.ts` -- EDIT. Register `"schedule-notification"` alongside `"user-watchlist"`.
- `src/plugins/user-engagement/server/src/services/notification.ts` -- NEW. Exports the pure `deriveScheduleChange(...)` and a service factory with `notifyScheduleChange(payload)`, `listForUser(userId)`, `unreadCount(userId)`, `markAllRead(userId)`. Uses `strapi.documents(NOTIFICATION_UID)` (findMany/create/update) + `strapi.documents(WATCHLIST_UID)` for the watcher lookup + `strapi.plugins["email"].services.email.send(...)`. `unreadCount` = `findMany({filters:{user,read:false}}).length` (matches the mocked harness; avoids relying on `count`).
- `src/plugins/user-engagement/server/src/services/notification-emails.ts` -- NEW. Pure `buildScheduleChangeEmail(locale, { eventTitle, changeType, oldDateTime, newDateTime }): { subject, html }`, localized fr/ar/en, `Intl.DateTimeFormat("fr-TN"|..., { timeZone:"Africa/Tunis" })` with Latin digits, HTML-escaped title (mirror `escapeHtml` usage in `strapi-server.ts`).
- `src/plugins/user-engagement/server/src/services/index.ts` -- EDIT. Register `notification`.
- `src/plugins/user-engagement/server/src/controllers/notification.ts` -- NEW. `list`, `unreadCount`, `markAllRead`; each guards `ctx.state.user`, delegates to the service with `user.documentId`, mirrors `watchlist.ts` shape (`ctx.body = { data }` / `{ count }` / `{ updated }`).
- `src/plugins/user-engagement/server/src/controllers/index.ts` -- EDIT. Register `notification`.
- `src/plugins/user-engagement/server/src/routes/content-api.ts` -- EDIT. Add `GET /notifications` (`notification.list`), `GET /notifications/unread-count` (`notification.unreadCount`), `PUT /notifications/read-all` (`notification.markAllRead`) — all with `policies:["plugin::user-engagement.is-owner"]`.
- `src/plugins/events-manager/server/src/content-types/event/lifecycle-utils.ts` -- NEW. Pure `collectWatchedCreativeWorkIds(event): string[]` (dedup of `screenings[].movie.documentId` + `performances[].play.documentId`).
- `src/plugins/events-manager/server/src/bootstrap.ts` -- EDIT (empty stub today). Register the `event` DB lifecycle subscriber (before/after snapshot + delegate to `strapi.plugin("user-engagement").service("notification").notifyScheduleChange(...)`), all try/catch'd.
- `src/extensions/users-permissions/content-types/user/schema.json` -- EDIT. Add `emailNotificationsEnabled` (boolean, default `true`).
- `src/extensions/users-permissions/strapi-server.ts` -- EDIT. Add `emailNotificationsEnabled: z.boolean().optional()` to `updateMeSchema` and persist it in the `PUT /users/me` update (passthrough to the update data).

**Frontend (`apps/client`)**

- `src/features/notifications/hooks/useNotifications.ts` -- NEW. `ScheduleNotification` type; `notificationKeys` factory; `NOTIFICATION_POLL_MS` + pure `notificationRefetchInterval(online)`; `useNotifications()` (list), `useUnreadNotificationCount()` (polled), `useMarkAllNotificationsRead()` (mutation → invalidate list + unread-count). All via `PrivateStrapiClient` + proxy, gated on auth.
- `src/app/[locale]/auth/notifications/page.tsx` -- NEW. Server component: `setRequestLocale`, `getServerSession(authOptions)`, redirect to signin if unauth, render `NotificationsPageClient`. Mirror `profile/page.tsx`.
- `src/app/[locale]/auth/notifications/NotificationsPageClient.tsx` -- NEW. `"use client"`. `useNotifications()` + `useMarkAllNotificationsRead()` (fire once on mount); header (localized, RTL back-arrow), skeleton/empty(`EmptyState` Bell + CTA)/error/list states; renders `NotificationItem`s.
- `src/app/[locale]/auth/notifications/_components/NotificationItem.tsx` -- NEW. Presentational: localized change-type headline, old→new time (or "cancelled") via `formatDate`/`formatTime`, `formatRelativeTime(createdAt)` stamp, unread dot when `!read`.
- `src/app/[locale]/auth/notifications/loading.tsx` -- NEW. Route-level skeleton.
- `src/components/layout/BottomNav/BottomNav.tsx` -- EDIT. Add `accountBadgeCount?: number` prop + `labels.notifications(count)` aria; render the (generalized) badge on the `account` tab when `>0` (reuse the existing tickets-badge markup/behavior, incl. `99+` cap).
- `src/features/events/components/HomePage/HomePage.tsx`, `HomePageWithCity.tsx`, `HomePageWithVenue.tsx` -- EDIT (3 sites). Call `useUnreadNotificationCount()` and pass `accountBadgeCount` to `<BottomNav>`. Do NOT change existing `onNavigate` semantics — the badge is the AC deliverable; the list is reached from the profile hub (below).
- `src/app/[locale]/auth/profile/_components/NotificationPreferences.tsx` -- NEW. `"use client"` Switch bound to `useCurrentUser().data.emailNotificationsEnabled` (default true) + a `PUT /users/me { emailNotificationsEnabled }` mutation invalidating `["user","me"]`; localized via `profile` namespace; RTL-safe.
- `src/app/[locale]/auth/profile/ProfilePageClient.tsx` -- EDIT. Mount `<Separator/>` + `<NotificationPreferences/>` after `WatchlistSyncStatus`, AND add a "Notifications" navigation entry (a `Button` with a `Bell` icon, mirroring the existing `changePassword` button) that routes to `/${locale}/auth/notifications` — this is how the notifications list is reached (the Account-tab badge only signals unread).
- `src/hooks/useUser.ts` (`UserProfile` type) / `src/types/next-auth.d.ts` -- EDIT as needed so `emailNotificationsEnabled?: boolean` is typed on the fetched profile.
- `src/lib/strapi-api/request-auth.ts` -- EDIT. Add `"api/user-engagement/notifications"` to GET and PUT in `ALLOWED_STRAPI_ENDPOINTS`.
- `src/lib/dates.ts` -- REUSE (`formatRelativeTime`, `formatDate`, `formatTime`). No change.
- `src/components/common/EmptyState/EmptyState.tsx` -- REUSE via `variant="custom"` (Bell illustration + title/description/CTA). No new preset required.
- `apps/client/locales/{fr,ar,en}.json` -- ADD a `notifications` namespace (page title, change-type headlines, old/new labels, empty-state, error, relative-time reuse) and `profile` keys for the email toggle. No duplicate keys; fr/ar/en parity.
- `apps/client/vitest.config.ts` -- ADD globs: `"src/features/notifications/**/*.test.ts"`, `"src/app/**/notifications/**/*.test.tsx"` (component/page tests). Hook tests under `features/**` may already match — verify and add if not.

## Tasks & Acceptance

**Execution:** (ordered by dependency — backend store → detection → client)

- [x] `content-types/schedule-notification/{schema.json,index.ts}` + `content-types/index.ts` -- NEW/EDIT: register the `schedule-notification` type. -- The in-app notification store.
- [x] `services/notification-emails.ts` -- NEW: pure `buildScheduleChangeEmail(locale, {...})` → `{subject,html}`, localized fr/ar/en, Africa/Tunis + Latin digits, escaped title. -- Localized email body.
- [x] `services/notification.ts` -- NEW: pure `deriveScheduleChange(...)`; `notifyScheduleChange`, `listForUser`, `unreadCount`, `markAllRead`. Watcher lookup gated on `notifyChanges`, deduped by user; email gated on `emailNotificationsEnabled` and try/catch'd. -- Detection fan-out + read API.
- [x] `services/index.ts` -- EDIT: register `notification`. -- Wire the service.
- [x] `controllers/notification.ts` + `controllers/index.ts` -- NEW/EDIT: `list`/`unreadCount`/`markAllRead`, JWT-self-scoped. -- HTTP surface.
- [x] `routes/content-api.ts` -- EDIT: add the 3 notification routes under `is-owner`. -- Expose the endpoints.
- [x] `events-manager/.../event/lifecycle-utils.ts` -- NEW: pure `collectWatchedCreativeWorkIds(event)`. -- Testable id resolution seam.
- [x] `events-manager/server/src/bootstrap.ts` -- EDIT: register the `event` before/after lifecycle subscriber that snapshots old time/status, derives+resolves on change, and delegates to `notifyScheduleChange`; fully try/catch'd, non-blocking. -- The change trigger.
- [x] `extensions/users-permissions/content-types/user/schema.json` + `strapi-server.ts` -- EDIT: add `emailNotificationsEnabled` (default true) to the user + `updateMeSchema`/`PUT /users/me` persistence. -- Email-channel preference.
- [x] `features/notifications/hooks/useNotifications.ts` -- NEW: types, keys, poll helper, `useNotifications`/`useUnreadNotificationCount`/`useMarkAllNotificationsRead`. -- Client data layer.
- [x] `app/[locale]/auth/notifications/{page.tsx,NotificationsPageClient.tsx,loading.tsx,_components/NotificationItem.tsx}` -- NEW: the notifications route with loading/empty/error/success + mark-all-read on mount + old↔new time rendering. -- AC "view all notifications" + "old vs new time".
- [x] `components/layout/BottomNav/BottomNav.tsx` -- EDIT: `accountBadgeCount` prop + account-tab badge. -- AC "badge on Account tab".
- [x] `features/events/components/HomePage/{HomePage,HomePageWithCity,HomePageWithVenue}.tsx` -- EDIT: wire `useUnreadNotificationCount()` → `accountBadgeCount`. -- Surface the badge app-wide.
- [x] `app/[locale]/auth/profile/_components/NotificationPreferences.tsx` + `ProfilePageClient.tsx` -- NEW/EDIT: email-notifications Switch + mount, plus a "Notifications" button linking to `/auth/notifications`. -- AC "email sent if enabled in preferences" (user-controllable) + reachability of the list.
- [x] `hooks/useUser.ts` / `types/next-auth.d.ts` -- EDIT: type `emailNotificationsEnabled` on the profile. -- Toggle initial state.
- [x] `lib/strapi-api/request-auth.ts` -- EDIT: allow `api/user-engagement/notifications` for GET + PUT. -- Otherwise proxy 403s.
- [x] `apps/client/locales/{fr,ar,en}.json` -- EDIT: `notifications` namespace + `profile` toggle keys; fr/ar/en parity, Western numerals. -- No `MISSING_MESSAGE`.
- [x] `apps/client/vitest.config.ts` -- EDIT: add notification test globs. -- So new tests run.
- [x] Backend unit tests (`*.unit.test.ts`, colocated `__tests__/`): `notification.unit.test.ts` (deriveScheduleChange table + notifyScheduleChange fan-out: multi-watcher, notifyChanges gate, per-user dedup, email-preference gate, email-throw isolation, list/unreadCount/markAllRead over the mocked `documents()`+`plugins.email` harness); `notification-emails.unit.test.ts` (subject/html per locale, Latin digits, escaped title); events-manager `event/__tests__/lifecycle-utils.unit.test.ts` (`collectWatchedCreativeWorkIds` dedup/empty). -- Lock the tested contract (the I/O matrix's detection + fan-out rows).
- [x] Frontend tests (Vitest): `useNotifications.test.ts` (poll gate `notificationRefetchInterval(true|false)`, list/unread queryFn paths, mark-all invalidation); `NotificationItem.test.tsx` (each change-type headline, old↔new vs cancelled, unread dot); `NotificationsPageClient.test.tsx` (loading/empty/error/list + mark-all-read fired on mount); `BottomNav` badge test (account badge when count>0, hidden at 0, `99+` cap); `NotificationPreferences.test.tsx` (toggle reflects value, mutation fires with the flipped boolean). -- Lock the client surfaces.

**Acceptance Criteria:**

- Given an authenticated user watching an event's creative work with `notifyChanges` on, when that event's `startDateTime` moves or its `eventStatus` flips to cancelled/postponed/rescheduled, then a `schedule-notification` row is created for that user (deduped once even across multiple watched works), and no row is created for a no-op update or for a watcher with `notifyChanges` off.
- Given a created notification, when the user opens `/auth/notifications`, then each item shows the localized change type with the old→new time (or a cancellation), sorted newest-first, with proper loading/empty/error states.
- Given the user has unread notifications, when any page with `BottomNav` renders, then the Account tab shows an unread badge (polled while online, paused when hidden/offline, `99+` capped); opening the notifications page marks all read so the badge clears.
- Given a schedule change and the user's `emailNotificationsEnabled` preference on, when the fan-out runs, then a localized Western-numeral Brevo email is sent to that user; with the preference off, only the in-app notification is created; an email send failure is caught and never blocks the event save or the other watchers' notifications.
- Given the profile page, when the user flips the email-notifications toggle, then it persists via self-scoped `PUT /users/me` and governs future email delivery.
- Given the whole change, when `apps/client yarn test` + `yarn typecheck` + `yarn lint` and `apps/strapi yarn test` run, then all new unit/component tests pass, all prior 5.1–5.5 tests still pass, fr/ar/en stay key-consistent with no `MISSING_MESSAGE`, and no new type errors are introduced.

## Design Notes

Detection = additive lifecycle, not a rebuild. events-manager has no lifecycles today; the `bootstrap` stub is the sanctioned home. The subscriber is deliberately thin — snapshot, compare, resolve ids, delegate — because the risk-bearing logic (delta derivation, watcher fan-out, email gating) lives in the pure/unit-tested user-engagement seam. The lifecycle glue itself is boot-level (not covered by the `*.unit.test.ts` gate, like the repo's other boot code); its correctness is asserted by the extracted pure helpers + manual verification below.

```ts
// events-manager/server/src/bootstrap.ts (shape)
const prev = new Map<number, { startDateTime?: string; eventStatus?: string }>()
strapi.db.lifecycles.subscribe({
  models: ["plugin::events-manager.event"],
  async beforeUpdate(event) {
    const id = event.params?.where?.id
    if (id == null) return
    const cur = await strapi.db
      .query("plugin::events-manager.event")
      .findOne({ where: { id }, select: ["startDateTime", "eventStatus"] })
    if (cur)
      prev.set(id, {
        startDateTime: cur.startDateTime,
        eventStatus: cur.eventStatus,
      })
  },
  async afterUpdate(event) {
    const id = event.params?.where?.id
    const before = id != null ? prev.get(id) : undefined
    if (id != null) prev.delete(id)
    try {
      const row = await strapi.db
        .query("plugin::events-manager.event")
        .findOne({
          where: { id },
          populate: {
            screenings: { populate: { movie: true } },
            performances: { populate: { play: true } },
          },
        })
      if (!row || !before) return
      const ids = collectWatchedCreativeWorkIds(row)
      if (!ids.length) return
      await strapi
        .plugin("user-engagement")
        .service("notification")
        .notifyScheduleChange({
          eventDocumentId: row.documentId,
          eventTitle: row.title,
          category: row.category,
          creativeWorkDocumentIds: ids,
          oldStartDateTime: before.startDateTime,
          newStartDateTime: row.startDateTime,
          oldStatus: before.eventStatus,
          newStatus: row.eventStatus,
        })
    } catch (err) {
      strapi.log.error("[schedule-notification] fan-out failed", err)
    }
  },
})
```

```ts
// user-engagement notification service — pure derivation (unit-tested core)
export function deriveScheduleChange({
  oldStartDateTime,
  newStartDateTime,
  oldStatus,
  newStatus,
}) {
  if (newStatus !== oldStatus && newStatus === "cancelled")
    return {
      changeType: "cancelled",
      oldDateTime: oldStartDateTime ?? null,
      newDateTime: null,
    }
  if (
    newStatus !== oldStatus &&
    (newStatus === "postponed" || newStatus === "rescheduled")
  )
    return {
      changeType: newStatus,
      oldDateTime: oldStartDateTime ?? null,
      newDateTime: newStartDateTime ?? null,
    }
  if (
    oldStartDateTime &&
    newStartDateTime &&
    oldStartDateTime !== newStartDateTime
  )
    return {
      changeType: "showtime_changed",
      oldDateTime: oldStartDateTime,
      newDateTime: newStartDateTime,
    }
  return null
}
```

Email uses the existing Brevo pattern: `strapi.plugins["email"].services.email.send({ to, subject, html })` with a localized `build…Email` → `{subject,html}` helper (locale precedence: `user.preferredLanguage` → "fr"), exactly like `sendWelcomeEmail`/`sendPasswordResetEmail` in `strapi-server.ts`. Note: the epic context names "Resend", but the repo's actual provider is Brevo (`@ayhid/strapi-provider-email-brevo`) — implement against Brevo.

Badge: `BottomNav` stays presentational (accepts `accountBadgeCount`); the count is fetched by `useUnreadNotificationCount()` at each `BottomNav` mount site (the 3 HomePage variants), mirroring how `ticketCount` is threaded. The unread-count poll reuses 5.5's online-gate (`refetchIntervalInBackground:false`, `refetchOnReconnect:true`) with a longer `NOTIFICATION_POLL_MS` (e.g. 60000) since schedule changes are far rarer than watchlist edits.

Email preference: no notification opt-in exists on the user today; add `emailNotificationsEnabled` (default true) and expose it via the established self-scoped `PUT /users/me` (`updateMeSchema`) path with a profile Switch — the honest fulfilment of "if enabled in preferences". In-app notifications are gated by the per-item `notifyChanges` (existing); email is additionally gated by this global flag.

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: new `notification.unit.test.ts`, `notification-emails.unit.test.ts`, `lifecycle-utils.unit.test.ts` pass (deriveScheduleChange table, fan-out gating/dedup/email-isolation, email locales, id dedup); prior suites green.
- `cd apps/client && yarn test` -- expected: new notification hook/component/page + BottomNav badge + NotificationPreferences tests pass; all prior 5.1–5.5 watchlist/profile tests still pass; fr/ar/en key-parity green; no `MISSING_MESSAGE`.
- `cd apps/client && yarn typecheck` -- expected: no NEW type errors vs the pre-existing baseline count.
- `cd apps/client && yarn lint` -- expected: clean on changed files.

**Manual checks (if no CLI):**

- Updating an event's `startDateTime` or `eventStatus` in Strapi admin creates a `schedule-notification` row for each watcher (with `notifyChanges` on) and sends a Brevo email to those with `emailNotificationsEnabled` (console/log fallback when `BREVO_API_KEY` unset); a no-op event edit creates none; the event save never fails on a notification/email error.
- `/[locale]/auth/notifications` renders the list (old→new time / cancellation, newest-first), an empty state with a Bell + CTA when none, a skeleton while loading; opening it clears the Account-tab badge.
- The Account tab shows a numeric badge when unread > 0 across the home surfaces; the profile page shows an email-notifications toggle that persists.

## Spec Change Log

_No bad_spec loopback occurred. The implementation matched the frozen intent-contract; every review finding was a localized hardening/verification patch, one deferral, or rejected noise — none required amending the spec._

## Review Triage Log

### 2026-07-10 — Review pass 1

Three parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) on the full since-baseline diff. No intent*gap (the intended behavior — one notification per \_published* schedule change per user — has exactly one reading) and no bad_spec (the lifecycle approach lives inside the read-only intent-contract and was refinable in code). All actionable findings auto-fixed as patches; one deferred; the rest rejected.

- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 1, medium 3, low 7)
- defer: 1
- reject: 5
- addressed_findings:
  - `[high]` `[patch]` The `event` content-type is `draftAndPublish:true` + i18n-localized, so the lifecycle subscriber fired on draft saves (pre-publish emails) and once per locale/publish (duplicate emails) — the marquee feature over-notified. Fixed: subscriber skips non-published rows (`if (!row.publishedAt) return`) and `notifyScheduleChange` is now idempotent per `(user, eventDocumentId, changeType, oldDateTime, newDateTime)` (read-check dedup collapses per-locale/repeat fires to one notification + one email); tests lock draft-skip and repeat-idempotency.
  - `[medium]` `[patch]` A single per-user `create` throw aborted the whole fan-out. Each per-user create+email is now individually try/catch'd (logged, loop continues, `created` counted on success); test isolates a create throw and asserts the other watchers still notified.
  - `[medium]` `[patch]` `unreadCount`/`markAllRead` used `findMany().length` (mock-shaped) and could be silently page-capped → badge undercount / never-clears. Switched to `documents().count()` for the count and explicit `pagination:{limit:-1}` for mark-all; tests updated.
  - `[medium]` `[patch]` The lifecycle subscriber (the sole production trigger) had no test — its old→new field mapping / draft-skip could invert and ship green. Extracted `handleEventScheduleUpdate({strapi,before,row})` and added a unit test (correct non-swapped mapping, id dedup, draft skip, no-works skip, error non-propagation).
  - `[low]` `[patch]` Email `subject` used the raw title (body was escaped) → CR/LF header-injection risk. Added `sanitizeHeader` stripping control chars from the subject; test asserts it.
  - `[low]` `[patch]` `deriveScheduleChange` emitted a misleading `showtime_changed` when a time was edited on an already-cancelled event; now returns `null` for `cancelled→cancelled`. (Reinstatement `cancelled→scheduled` intentionally left silent — not in the changeType enum/AC.)
  - `[low]` `[patch]` `NotificationItem` could render literal "Invalid Date" and showed a lone struck old time (reads as "removed") for a postponed/rescheduled item with null/equal new time. Added a validity guard + a `newTimeToBeConfirmed` copy (fr/ar/en, Western numerals); component tests extended.
  - `[low]` `[patch]` The profile email toggle showed its default (ON) and accepted clicks while the profile query was still loading. Disabled while loading/`user` undefined; test added.
  - `[low]` `[patch]` The notifications page fired `mark-all-read` on every open even with zero unread. Now fires only when the list has an unread item (fire-once preserved); tests cover unread/all-read/empty.
  - `[low]` `[patch]` The new `notifications`/`profile.notifications`/`home.bottomNav.notifications` i18n keys were only echoed via mocks. Added a real `createTranslator` test over en/fr/ar (placeholder resolution, no Arabic-Indic digits), mirroring the 5.5 `watchlistSyncI18n` guard.
  - `[low]` `[patch]` The `PUT /users/me` `emailNotificationsEnabled` persistence (the email opt-out's only write path) was unasserted server-side. Added an updateMe case asserting `userEdit` receives the field and forbidden fields are still stripped.
  - (deferred — 1, appended to `deferred-work.md`: bulk `updateMany` / non-scalar-`where` event edits are not detected by the single-id lifecycle subscriber, so schedule changes made via bulk tooling/import go unnotified. Low severity — the admin UI edits single entries; the sanctioned path is covered.)
  - (rejected as noise/by-design — 5: reinstatement `cancelled→scheduled` notifications [not in the changeType enum/AC]; the plumbed-but-unused `category` payload field [harmless, reserved for future per-category copy]; `is-owner` being an auth-only check with a broad `startsWith` PUT allowlist entry [self-scoping via `ctx.state.user.documentId` is correct; matches the established watchlist pattern]; the just-rendered unread rows losing their highlight the instant mark-all settles [cosmetic]; no dedicated test that the proxy allowlist admits the new paths [the hook tests exercise the exact paths; low value].)

### 2026-07-10 — Review pass 2 (follow-up review of the `done` artifact)

Fresh three-reviewer pass (Blind Hunter, Edge Case Hunter, Verification Gap) on the full since-baseline diff. Most findings deduped to pass-1's already-fixed items, acknowledged residual risks (best-effort dedup/email, in-process `Map` snapshot concurrency, boot-level lifecycle glue), by-design decisions, or the already-deferred bulk-`updateMany` entry. No new intent_gap or bad_spec. Six genuine, code-caused, trivially-fixable findings were patched (one of them — the reinstatement leak — was wrongly rejected in pass 1 on the false premise that the code already returned null).

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 2, low 4)
- defer: 0
- reject: many (all deduped to pass-1 fixes / acknowledged residual risks / by-design / already-deferred bulk-update)
- addressed_findings:
  - `[medium]` `[patch]` `notification-emails.ts` embedded **literal control bytes** (a NUL `0x00`, `0x1f`, `0x7f`) in the `sanitizeHeader` regex character class, so git treated the entire source as **binary** — it was silently excluded from every textual diff/review (`file` reported `data`, not text) and no reviewer could see it. Replaced the literal-byte class with the escape form `/[ -]+/g`; the file is now UTF-8 text and diffable. Behavior unchanged (still strips CR/LF/control chars for header-injection safety).
  - `[medium]` `[patch]` `listForUser` had **no pagination** (default page cap 25) while `unreadCount` (via `count()`) and `markAllRead` (`limit:-1`) are unbounded. A user with >25 unread would see a badge count exceeding the rendered list, and opening the page (mark-all-read on mount, `limit:-1`) would mark the unseen older rows read with no way to ever view them. Added `pagination:{ limit:-1 }` to `listForUser` so the three methods agree; test asserts it.
  - `[low]` `[patch]` `deriveScheduleChange` fired a spurious `showtime_changed` on a **`cancelled→scheduled` reinstatement that also moved the time** — the guard only caught `cancelled→cancelled`, so a reinstatement fell through to the showtime branch, contradicting the spec's "status **unchanged** but startDateTime changed ⇒ showtime_changed" precondition and the code's own comment. Broadened the guard to `oldStatus === "cancelled" ⇒ null` (transitions INTO postponed/rescheduled are still handled earlier); added a reinstatement unit test. (Pass 1 rejected this as by-design believing the code already returned null — it did not.)
  - `[low]` `[patch]` `markAllRead` iterated `update()` with **no per-row isolation** (unlike the fan-out): a single row's throw rejected the whole request → 500, partial marks, badge stuck. Wrapped each update in try/catch (log + continue); test isolates a mid-loop update throw and asserts the other rows still marked read.
  - `[low]` `[patch]` The schedule-change **email** rendered a redundant identical "old → new" time for a `postponed`/`rescheduled` change that did not move the time (in-app was collapsed to "to be confirmed" in pass 1; the email was missed). Guarded the new-time line with `newTime && newTime !== oldTime` in fr/ar/en; test asserts the line is omitted for an equal-time postponement.
  - `[low]` `[patch]` The email's `Africa/Tunis` offset (`timeZone` forcing) was **unpinned by any assertion** — dropping it would ship raw-UTC (hour-wrong) times with every existing test still green. Added a wall-clock assertion (18:00Z/20:00Z → 19:00/21:00 local, and NOT 18:00/20:00).

### 2026-07-10 — Review pass 3 (follow-up review of the `done` artifact)

Fresh three-reviewer pass (Blind Hunter, Edge Case Hunter, Verification Gap) on the full since-baseline diff. Most findings deduped to pass-1/pass-2 fixes, documented residual risks (best-effort idempotency, in-process `Map` snapshot concurrency, boot-level lifecycle glue), or by-design decisions. Two genuinely new, code-caused, trivially-fixable findings were patched; three real findings were deferred (a product decision, a non-trivial test-harness gap, and an unverifiable-without-live-DB robustness item). No intent_gap or bad_spec.

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 2, low 0)
- defer: 3
- reject: 11
- addressed_findings:
  - `[medium]` `[patch]` The **watcher fan-out** `findMany` (`notifyScheduleChange`, the query that actually drives delivery) had **no pagination** while its three sibling read methods were deliberately un-capped in pass 1/2 (`unreadCount`→`count()`, `listForUser`/`markAllRead`→`limit:-1`) on the stated premise that `documents().findMany()` is capped at config `defaultLimit: 25`. So a schedule change on a work with **>25 opted-in watchers** silently notified only the first 25 (no in-app row, no email for the rest) — the exact under-delivery the read-path fixes closed, left open on the write path. Added `pagination:{ limit:-1 }` to the watcher query; strengthened the `notifyChanges` test to assert the unbounded page.
  - `[medium]` `[patch]` The localized-**email** send (`to: user.email`, locale from `normalizeLocale(user.preferredLanguage)`) was verified only by **call-count** (`toHaveBeenCalledTimes`), and every test fixture hard-coded `preferredLanguage:"fr"` — a regression to always-`fr`, or a wrong `to`, would ship green. Added a fan-out test with fr/ar/en watchers asserting `send` receives each watcher's own address and a locale-correct subject (`Changement d'horaire` / `تغيير في الموعد` / `Schedule change`).
  - (deferred — 3, appended to `deferred-work.md` as new entries: (1) `postponed`/`rescheduled`→`scheduled` reinstatement that also moves the time still emits `showtime_changed`, while the spec's "status **unchanged**" precondition would read as `null` — the pass-2 guard only covers `cancelled`; the desired behavior is a product decision, not a mechanical fix; (2) the Account-tab unread **badge wiring at the three `HomePage*` mount sites** has no test — only `BottomNav` (prop injected) and the hook are tested, so the marquee badge could regress silently; (3) the idempotency dedup keys on **datetime-string equality across a DB round-trip** — if Strapi normalizes the stored `datetime` differently from the incoming ISO string the probe misses and a duplicate notification/email slips through, unverifiable without a live DB.)
  - (rejected as noise/by-design/already-known — 11: notifications page briefly showing the empty state while the session is still `loading` [cosmetic flash]; email never retried after a caught send failure [by-design best-effort per spec]; unbounded notification history / no retention [out of scope per spec]; email-preference toggle no error toast on a failed save [low, no spec requirement]; concurrent same-id updates corrupting the `prev` snapshot `Map` [documented residual risk]; `beforeUpdate` snapshot leak on a failed update [self-healing, memory-only]; `badgeLabel` evaluating an unused label on non-badge tabs [harmless]; broad `startsWith` PUT allowlist prefix [self-scoping is correct; established pattern]; `formatEmailDateTime` ISO fallback on an `Intl` throw [low-probability]; boot-level lifecycle glue untested [documented accepted risk; core logic unit-tested via `handleEventScheduleUpdate`]; assorted findings deduped to pass-1/pass-2 already-fixed items.)

## Auto Run Result

Status: done

### Summary

Delivered Story 5.6 "Schedule Change Notifications" end-to-end across the `user-engagement` and `events-manager` Strapi plugins and the Next.js client. A new `schedule-notification` content type + `notification` service in `user-engagement` store and fan out notifications; an **additive `event` DB lifecycle subscriber** in the events-manager `bootstrap` detects `startDateTime`/`eventStatus` transitions on **published** events, resolves the affected creative-work ids from the event's `screenings.movie`/`performances.play`, and delegates (owner-emits, facade-respecting) to `notification.notifyScheduleChange(...)`. That fan-out creates one **idempotent, per-user-deduped** in-app notification per watcher whose `user-watchlist.notifyChanges` is on, and sends a localized **Brevo** email when the user's new `emailNotificationsEnabled` preference is on (each create+email individually isolated). Client: react-query `useNotifications`/`useUnreadNotificationCount` (online-gated poll)/`useMarkAllNotificationsRead`, a `/auth/notifications` page (loading/empty/error/success, mark-all-read on mount when unread), a generalized Account-tab badge on `BottomNav`, a "Notifications" entry + email-notifications toggle on the profile page, and a new `notifications` i18n namespace (fr/ar/en, Western numerals).

### Files changed

Backend (new): `user-engagement/.../content-types/schedule-notification/{schema.json,index.ts}`, `.../services/{notification.ts,notification-emails.ts}`, `.../controllers/notification.ts`, `events-manager/.../content-types/event/{lifecycle-utils.ts,schedule-update-handler.ts}`, + unit tests (`notification`, `notification-emails`, `lifecycle-utils`, `schedule-update-handler`).
Backend (edit): `user-engagement/.../content-types/index.ts`, `.../services/index.ts`, `.../controllers/index.ts`, `.../routes/content-api.ts`, `events-manager/.../bootstrap.ts`, `extensions/users-permissions/content-types/user/schema.json`, `.../strapi-server.ts` (+ `profile-management.unit.test.ts`).
Frontend (new): `features/notifications/hooks/useNotifications.ts`, `app/[locale]/auth/notifications/{page.tsx,NotificationsPageClient.tsx,loading.tsx,_components/NotificationItem.tsx}`, `app/[locale]/auth/profile/_components/NotificationPreferences.tsx`, + tests (`useNotifications`, `NotificationItem`, `NotificationsPageClient`, `NotificationPreferences`, `BottomNav`, `notificationsI18n`).
Frontend (edit): `components/layout/BottomNav/BottomNav.tsx` (+ stories), `features/events/components/HomePage/{HomePage,HomePageWithCity,HomePageWithVenue}.tsx`, `app/[locale]/page.tsx`, `app/[locale]/auth/profile/ProfilePageClient.tsx` (+ test), `hooks/useUser.ts`, `lib/strapi-api/request-auth.ts`, `vitest.config.ts`, `locales/{fr,ar,en}.json`.

### Review findings breakdown

Review pass 1 (3 parallel reviewers): 0 intent_gap / 0 bad_spec. **11 patches** (1 high: draftAndPublish+i18n over-/pre-publish notification; 3 medium: fan-out create-throw isolation, page-cap-safe unread/mark-all, subscriber-trigger test; 7 low: subject header hygiene, cancelled→cancelled derive, NotificationItem date rendering, load-time toggle disable, skip-mark-all-when-none, real-formatter i18n test, server-side preference-persistence test). **1 deferred** (bulk `updateMany` events not detected). **5 rejected** (by-design/cosmetic).

### Verification

- `cd apps/strapi && yarn test` — PASS (20 suites / 248 tests).
- `cd apps/client && yarn test` — PASS (44 files / 498 tests; all prior 5.1–5.5 tests green; fr/ar/en parity, no `MISSING_MESSAGE`).
- `cd apps/client && yarn typecheck` — 64 errors == 64 baseline (zero new; all in pre-existing `lib/strapi-api/content/*`).
- `cd apps/client && yarn lint` — clean on changed files. (Strapi has no lint script; ts-jest transpile of changed files succeeds.)

### Residual risks

- **Bulk/import schedule edits are not notified** (deferred): the single-id lifecycle subscriber only covers single-entry updates (the admin UI path). Bulk `updateMany`/non-scalar-`where` changes fan out nothing.
- **Idempotency dedup is best-effort (read-check, not a DB constraint):** a tight concurrent race across per-locale publish writes could still create a duplicate notification; mirrors the pre-existing non-atomic watchlist dedup.
- **Detection is boot-level:** the lifecycle subscriber itself runs only in a booted Strapi; its core logic is unit-tested via the extracted `handleEventScheduleUpdate`, but end-to-end firing is confirmed only by manual admin verification.
- **Cross-device badge freshness is polling-based** (60s while online, paused hidden/offline) — no realtime push, by design.

### Follow-up review pass 2 (2026-07-10)

A fresh independent three-reviewer pass over the shipped artifact hardened six real, code-caused issues (all backend, two files + their tests). See the pass-2 entry in the Review Triage Log for the full list. Highlights: a git-**binary** email source (literal control bytes hid it from all textual review), a `listForUser` page-cap that disagreed with the uncapped badge/mark-all (unseen rows could be silently marked read), a `cancelled→scheduled` reinstatement leaking a spurious `showtime_changed`, missing per-row isolation in `markAllRead`, a redundant identical old→new time in the email, and an unpinned Africa/Tunis email-offset assertion. No intent_gap, no bad_spec, no new deferrals.

- Files changed (pass 2): `user-engagement/.../services/notification.ts` (reinstatement guard, `listForUser` unbounded page, `markAllRead` per-row isolation), `.../services/notification-emails.ts` (control-byte→escape fix restoring text/diffability, equal-time new-line guard), + `__tests__/notification.unit.test.ts` and `__tests__/notification-emails.unit.test.ts` (4 new assertions).
- Verification (pass 2): `cd apps/strapi && yarn test` — PASS (20 suites / **252 tests**, +4 new). No client files changed → client `test`/`typecheck`/`lint` unaffected from the pass-1 recorded results. `notification-emails.ts` is now UTF-8 text (`file` reports "JavaScript source, Unicode text"); no control bytes remain in any changed file.
- Follow-up recommendation: `true` — the pass changed notification-firing behavior (reinstatement), a read-path query shape, and error-isolation semantics; an independent confirmation pass is worthwhile despite each fix being localized and test-covered.

### Follow-up review pass 3 (2026-07-10)

A fresh independent three-reviewer pass over the shipped artifact. Most findings deduped to pass-1/pass-2 fixes, documented residual risks, or by-design decisions. Two genuinely new, code-caused findings were patched (both backend, one file + its test); three real findings were deferred; the rest rejected. No intent_gap, no bad_spec.

- Patches (2): (medium) the **watcher fan-out** `findMany` — the query that actually drives delivery — had no `pagination` while its three sibling read methods were deliberately un-capped in pass-1/2 on the stated `defaultLimit: 25` premise, so a work with **>25 opted-in watchers** silently notified only the first 25 (no in-app row, no email for the rest); added `pagination:{ limit:-1 }` and strengthened the `notifyChanges` test to assert it. (medium) the localized-**email** send was verified only by call-count with every fixture hard-coded to `fr`; added a fr/ar/en fan-out test asserting `send` receives each watcher's own address and a locale-correct subject.
- Deferred (3, appended to `deferred-work.md`): `postponed`/`rescheduled`→`scheduled` reinstatement-with-time-move still emits `showtime_changed` (product decision — the notification is arguably desirable); the Account-tab badge wiring at the three `HomePage*` mount sites has no test (non-trivial harness); the idempotency probe keys on datetime-string equality across a DB round-trip (unverifiable without a live DB).
- Files changed (pass 3): `user-engagement/.../services/notification.ts` (watcher fan-out unbounded page) + `__tests__/notification.unit.test.ts` (strengthened pagination assertion + new fr/ar/en recipient-locale test).
- Verification (pass 3): `cd apps/strapi && yarn test` — PASS (20 suites / **253 tests**, +1 new). No client files changed → client `test`/`typecheck`/`lint` unaffected from the pass-1/2 recorded results.
- Follow-up recommendation: `false` — the one behavioral fix (watcher pagination) is a single-line delivery-correctness change fully covered by an assertion, the other patch is test-only, and the remaining items are all deferred to the orchestrator; two prior independent passes plus this one have converged.
