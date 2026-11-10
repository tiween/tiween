# Phase 2 deferred items

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

## 02-07

- **CategoryTabs `aria-controls` points at a missing tabpanel.** Each tab in
  `apps/client/src/features/events/components/CategoryTabs` carries
  `aria-controls="tabpanel-<category>"`, but the watchlist page (and any other consumer that does
  not render a matching `id`) has no such element, so axe reports `aria-valid-attr-value` (critical)
  on the strip. Pre-existing and shared with the home page; the 02-07 axe cases therefore run on the
  list sections, not on the tab strip. Fix belongs with the CategoryTabs owner (add the panel id
  or drop `aria-controls` when no panel is rendered).
- **Short-film posters never reach the watchlist.** `getUserWatchlist` ignores the client's
  `populate=creativeWork.poster` query (the controller passes only the user id), and the nested media
  relation is not populated server-side, so every short film shows the reserved stripe artwork on the
  watchlist (RESEARCH Pitfall 18 accepted this: no launch film has a 2:3 poster). When real posters
  land, add `poster` to the populate in `services/watchlist.ts` together with an allowlist assertion
  in `watchlist-payload.service.test.ts`.
