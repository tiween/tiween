---
phase: 02-strapi-backed-shorts-pages
reviewed: 2026-11-10T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - apps/client/src/lib/safe-callback-url.ts
  - apps/client/src/app/api/shorts/route.ts
  - apps/client/src/lib/strapi-api/content/shorts.ts
  - apps/client/src/lib/strapi-api/content/shorts.errors.ts
  - apps/client/src/app/[locale]/shorts/page.tsx
  - apps/client/src/app/[locale]/shorts/error.tsx
  - apps/client/src/app/[locale]/shorts/not-found.tsx
  - apps/client/src/app/[locale]/shorts/loading.tsx
  - apps/client/src/app/[locale]/shorts/[slug]/layout.tsx
  - apps/client/src/app/[locale]/shorts/[slug]/page.tsx
  - apps/client/src/app/[locale]/shorts/[slug]/loading.tsx
  - apps/client/src/app/[locale]/auth/signin/_components/SignInForm.tsx
  - apps/client/src/app/[locale]/auth/register/_components/RegisterForm.tsx
  - apps/client/src/app/[locale]/auth/reset-password/_components/ResetPasswordForm.tsx
  - apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx
  - apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCard.tsx
  - apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx
  - apps/client/src/features/shorts/utils/index.ts
  - apps/client/src/features/shorts/utils/shortMappers.ts
  - apps/client/src/features/shorts/utils/placeNames.ts
  - apps/client/src/features/shorts/utils/crew.ts
  - apps/client/src/features/watchlist/hooks/useShortFilmHeart.ts
  - apps/client/src/features/watchlist/components/ShortsWatchlistProvider/ShortsWatchlistProvider.tsx
  - apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts
findings:
  critical: 0
  warning: 1
  info: 6
  total: 7
status: issues_found
---

# Phase 2: Code Review Report (iteration 2)

**Reviewed:** 2026-11-10
**Depth:** standard
**Files Reviewed:** 24 (same scope as iteration 1)
**Status:** issues_found

## Summary

All five findings from the prior review (CR-01, WR-01..WR-04) are resolved in the current code. I looked for regressions in the fixes. The synthetic-anchor `openExternal` and the `mapPayload` error classification hold up. The WR-04 omission introduced one new Warning: the client's `hasMore` is derived from `total`, which still counts the omitted films.

`necessity-review.md` was not loaded, so no `necessity:` count is emitted.

## Resolved since prior review

- **CR-01 (`openExternal` navigated the current tab).** Resolved.
  - **Evidence:** `features/shorts/utils/index.ts:74-82` now builds `<a href target="_blank" rel="noopener noreferrer">` and calls `.click()`. It never reads `window.open`'s return value and never assigns `location.href`.
  - **Regression check, user gesture:** both callers (`ShortFilmDetail.tsx:384,388`) are synchronous `onClick` handlers with no `await` before the call, so the click stays inside the user gesture. They are the only two callers.
  - **Regression check, browsers:** a programmatic click on a detached anchor is not popup-blocked inside a gesture in Chrome, Firefox (75+) or Safari/iOS. It honours `rel`, and the URL is already restricted to http(s) by `toSafeExternalUrl`. Nothing was lost from the old `window.open` path, because that path's blocked-popup fallback never worked.
  - **Tests:** `openExternal.test.ts` was added, and `ShortFilmDetail.test.tsx` was updated in c4d97ef.
- **WR-01 (double title suffix).** Resolved. `app/[locale]/shorts/page.tsx` has `title: "Courts Métrages"`, and the locale layout template appends `| Tiween`.
- **WR-02 (raw `#FF8A8A`).** Resolved. `ShortsDirectory.tsx:~302` now uses `text-destructive` on the `AlertCircle` icon.
- **WR-03 (`TypeError` classified as `NETWORK_ERROR`).** Resolved.
  - **Evidence:** `shorts.ts` `mapPayload()` wraps the mapper calls in all three fetchers (detail, list, related). It rethrows a `ShortFilmApiError` (`INTERNAL_ERROR`/`UPSTREAM`, original as `cause`).
  - **Regression check:** `toShortFilmApiError` returns an existing `ShortFilmApiError` unchanged (`isShortFilmApiError` is checked first), so the outer catch does not reclassify it. Real fetch failures still reach `NETWORK_ERROR`, because `NETWORK_ERROR_NAMES` is untouched.
- **WR-04 (slug fallback to `documentId` produced dead links).** Resolved for the link problem. List and related now go through `mapShortFilmSummaries`, which drops slug-less films. The documentId fallback remains only in the detail path, where the film was fetched by slug. The count/paging side effect of the omission is raised as WR-01 below.

## Warnings

### WR-01: Omitting slug-less films desynchronises the client's `hasMore` and result count from what is actually shown

**File:** `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx:~153-165, 170-190` (with `lib/strapi-api/content/shorts.ts` `getShortFilmsPage` and `app/api/shorts/route.ts`)
**Issue:** `getShortFilmsPage` returns `total` straight from the API's pagination. After `mapShortFilmSummaries` drops slug-less films, `total` still counts them. `slug` is a non-required `uid` in the creative-work schema, so the case is reachable.

The server computes `hasMore` correctly (`page < pageCount`), but `fetchShortsPage` discards it. The client computes `hasMore = !exhausted && shorts.length < total`, and `shorts.length` can never reach `total` while any film is omitted. Consequences:

- After the real last page the "Load more" button stays visible, the end-of-grid suggestion prompt stays hidden, and the observer or the visitor fires one more request.
- That request lands past `pageCount`. It only resolves cleanly if the API answers 200 with an empty list, which sets `exhausted`. If it ever answers a 4xx or 5xx, the visitor gets a permanent "load more failed / retry" loop.
- The polite result line ("N courts métrages") overstates the count by the number of omitted films.
- A page whose 24 films are all slug-less returns `shorts: []`, which sets `exhausted` and stops paging before later pages. This is an extreme edge case, but it is the same root cause.

**Fix:** Use the server's page-based `hasMore` and make `total` consistent. In `fetchShortsPage`, also return `hasMore` from the response body, and in the component page on that instead of `shorts.length < total`. Either subtract the omitted count from `total` inside `getShortFilmsPage` (this covers the current page only), or accept an approximate count line. Do not infer exhaustion from an empty page:

```ts
// fetchShortsPage: return { shorts, total, hasMore: body.hasMore === true }
// component: const hasMore = !exhausted && serverHasMore
```

## Info

### IN-01: A card heart outside a `ShortsWatchlistProvider` never shows a saved state (carried forward)

**File:** `apps/client/src/features/watchlist/hooks/useShortFilmHeart.ts:62-66`, `ShortsWatchlistProvider.tsx:104-107`
**Issue:** `useShortsWatchlistResolved()` returns `{ isResolved: true }` with no provider, and the card passes `check: false`. A signed-in user would see every heart as unsaved and could never remove from it. The only `<ShortFilmCard>` consumer today is `ShortsDirectory`, which wraps in the provider, so this is latent. Seeding is also skipped while any mutation in the app is in flight (`useIsMutating()` is global), and `isResolved` is already true in that window.
**Fix:** Make the provider required for `surface: "card"` (throw in dev when missing), or scope the mutation count to the watchlist keys.

### IN-02: `pageSize: 24` literal duplicates `SHORT_FILM_PAGE_SIZE` (carried forward)

**File:** `apps/client/src/app/[locale]/shorts/page.tsx:41`
**Issue:** The load-more route uses the constant. If the constant changes, the first page and later pages disagree and `page + 1` offsets misalign.
**Fix:** Omit `pageSize` (the default is the constant) or import `SHORT_FILM_PAGE_SIZE`.

### IN-03: Raw `text-white`, `from-black/90` and `drop-shadow-lg` remain on the card (carried forward)

**File:** `apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCard.tsx:~176-239`
**Issue:** D-02 deleted `ShortsShowcase` partly for raw black/white and `shadow-lg`. The card still uses `text-white`, `text-white/70`, `from-black/90 via-black/60`, `bg-white/10`, `bg-white/20` and `drop-shadow-lg` (Flat Chrome rule). The dark-only theme makes the values equivalent, but they bypass the tokens.
**Fix:** Move to token utilities (`text-foreground`, `bg-aubergine-deep`) at the card's visual pass. This is not a regression, since the code predates the phase.

### IN-04: Unvalidated locale reaches Strapi from `generateMetadata` and the directory page (carried forward)

**File:** `apps/client/src/app/[locale]/shorts/[slug]/page.tsx:20-26`, `apps/client/src/app/[locale]/shorts/page.tsx:36-40`
**Issue:** `[slug]/layout.tsx` validates the locale, but the page, `generateMetadata` and the directory page run in parallel with their parent layouts and pass `params.locale` straight to the fetchers. For `/zz/shorts` a Strapi request with `locale=zz` is made and answers a 400 before the parent's `notFound()` wins. It is bounded by the API's validation, but it is an avoidable upstream call on attacker-chosen input.
**Fix:** Guard with `hasLocale(routing.locales, locale)` (or the layout's `isShortLocale`) before fetching.

### IN-05: New-tab streaming links give no cue to assistive tech (carried forward)

**File:** `apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx:746-755`
**Issue:** The "Regarder sur" anchors use `target="_blank"` with only a decorative `ArrowUpRight` icon. Screen-reader users are not told the link leaves the site and opens a new tab. The Watch and Trailer buttons now also open new tabs through `openExternal` with no cue.
**Fix:** Add a visually hidden suffix (a `shorts.opensInNewTab` string), or use `aria-describedby`.

### IN-06: `mapShortFilmSummaries` warns on every render of an affected list

**File:** `apps/client/src/features/shorts/utils/shortMappers.ts` (`mapShortFilmSummaries`)
**Issue:** The mapping runs on every request, because only the fetch is in the Data Cache. A single slug-less film therefore writes a `console.warn` for each visit to `/shorts` and to every related shelf that includes it. Server logs fill with the same message.
**Fix:** Log once per `documentId` (module-level `Set`), or log from a cached path.

---

_Reviewed: 2026-11-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
