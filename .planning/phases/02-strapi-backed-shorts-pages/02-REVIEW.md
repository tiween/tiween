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
  critical: 1
  warning: 4
  info: 5
  total: 10
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-11-10
**Depth:** standard
**Files Reviewed:** 24 (core source files; test files, fixtures and the probe scripts were skimmed, not reviewed line by line)
**Status:** issues_found

## Summary

The phase is in good shape on the areas the brief singled out. I tried to break these and could not:

- **Open redirect.** `safeCallbackUrl` and `toRouterPath` hold against `//`, `/\`, control chars, scheme URLs, `/fr//evil.com`, and dot-segment re-normalization (`sameOriginPath` re-validates the normalized output). Every sink I traced (SignIn, SignInWithSocial, Register, ResetPassword, OAuth `signIn`) goes through the helper.
- **Load-more route.** The input schema is closed (`.strict()`, locale enum, page 1..500). `pageSize` is fixed server-side. Nothing from the request is echoed, and upstream errors collapse to a code.
- **Watchlist allowlist.** The `fields` allowlist on `getUserWatchlist` is correct, and `type` matches the schema enum `short-film`.
- **Error disclosure and cache.** Error boundaries only log and never render messages. Failed upstream responses are not cached.
- **Slug handling.** Slugs are pattern-checked before any upstream call and `encodeURIComponent`'d.
- **RTL.** Logical properties are used throughout. The one `-translate-x-1/2` has its `rtl:` counterpart.
- **DS tokens.** The `.module.css` raw-hex block is explicitly sanctioned by DESIGN.md.

One real functional defect remains in external-link handling. It is carried into the phase surface, not introduced by it. There are also four warnings and some info items.

Necessity review: `necessity-review.md` was not loaded for this pass, so no `necessity:` count is emitted.

## Critical Issues

### CR-01: `openExternal` always navigates the current tab away as well as opening a new one

**File:** `apps/client/src/features/shorts/utils/index.ts:69-75`
**Issue:** `window.open(safe, "_blank", "noopener,noreferrer")` returns `null` by specification whenever `noopener` is in the features string. The popup-blocker fallback `if (!opened) window.location.href = safe` therefore fires on every call, not only when a popup is blocked. Every tap on "Regarder" (hero disc, action-row pill, sticky bar) and on the trailer button on the detail page (`ShortFilmDetail.tsx:384,388`) opens the new tab and also navigates the Tiween tab to the same external URL. The visitor loses the page and the watchlist and share state. The URL is already validated, so this is a correctness bug, not an injection.
**Fix:** Do not infer a blocked popup from the return value when `noopener` is set. Use an anchor click, which is not popup-blocked inside a user gesture and honours `rel`:

```ts
export function openExternal(url: string | undefined | null): void {
  const safe = toSafeExternalUrl(url)
  if (!safe) return
  const a = document.createElement("a")
  a.href = safe
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  a.click()
}
```

Alternatively, render `<a target="_blank" rel="noopener noreferrer">` for the CTAs, as the streaming rows already do. The unit test for `openExternal` should assert that `location.href` is not assigned when `window.open` returns `null` but a tab was opened.

## Warnings

### WR-01: `/shorts` title is suffixed twice

**File:** `apps/client/src/app/[locale]/shorts/page.tsx:9`
**Issue:** `metadata.title` is the literal `"Courts Métrages | Tiween"`, but `[locale]/layout.tsx:25` sets `title.template = "%s | Tiween"`. The rendered title is "Courts Métrages | Tiween | Tiween". The `[slug]` page's not-found title already relies on the template ("The root layout's title template already appends | Tiween"), so the two pages are inconsistent.
**Fix:** `title: "Courts Métrages"`.

### WR-02: Raw hex `#FF8A8A` instead of the destructive token

**File:** `apps/client/src/features/shorts/components/ShortsDirectory/ShortsDirectory.tsx:302`
**Issue:** `text-[#FF8A8A]` hard-codes the value of `--destructive` (globals.css:46). DESIGN.md says "Use semantic utilities, never raw hex, in components", and `error.tsx` in the same phase correctly uses `text-destructive`. The value will drift if the token changes.
**Fix:** `className="text-destructive size-4 shrink-0"`.

### WR-03: Any `TypeError` is classified as a `NETWORK_ERROR`, which masks mapper bugs

**File:** `apps/client/src/lib/strapi-api/content/shorts.errors.ts:70,85-91` (with `shorts.ts:93-103,127-148`)
**Issue:** `NETWORK_ERROR_NAMES` includes `"TypeError"` so a failed `fetch` is recognised. The mappers (`mapShortFilmDetail`, `mapShortFilmSummary`) run inside the same `try` as the fetch. An unexpected API shape that makes a mapper throw `TypeError` (for example `credit.creditRole.slug` on an unexpected value, or `.map` on a non-array) is reported as "offline / network" and `/api/shorts` still answers 502. This hides data-contract regressions behind a plausible-looking connectivity message in logs and in the code returned to the client. The error boundary decides copy from `navigator.onLine`, so the UI is unaffected. The diagnosability loss is real.
**Fix:** Run the mapping outside the `try` that wraps `fetchAPI`, or wrap mapper failures explicitly as `malformed()`:

```ts
const res = await fetchRaw() // try/catch -> toShortFilmApiError
try {
  return mapShortFilmDetail(data)
} catch (e) {
  throw new ShortFilmApiError({
    code: "INTERNAL_ERROR",
    kind: "UPSTREAM",
    cause: e,
  })
}
```

### WR-04: Summary mapper falls back to `documentId` as the slug, producing dead links

**File:** `apps/client/src/features/shorts/utils/shortMappers.ts:~200` (`mapShortFilmSummary`: `const slug = nonBlank(dto.slug) ?? dto.documentId`)
**Issue:** The API's `slug` is nullable. When it is null, the card links to `/shorts/<documentId>`, the share URL becomes `/<locale>/shorts/<documentId>`, and the related shelf links there too. The detail route resolves by slug only, so it returns `SHORT_FILM_NOT_FOUND` and the visitor sees "introuvable" for a film that is listed. The watchlist card, by contrast, correctly renders unlinked when there is no slug (`WatchlistPageClient.tsx`).
**Fix:** Keep `slug` optional through the mapper. Skip films with no slug in the grid, or render the card unlinked, as the watchlist page does. At minimum, log once server-side when it happens.

## Info

### IN-01: A card heart outside a `ShortsWatchlistProvider` never shows a saved state

**File:** `apps/client/src/features/watchlist/hooks/useShortFilmHeart.ts:62-66`, `ShortsWatchlistProvider.tsx:104-107`
**Issue:** `useShortsWatchlistResolved()` returns `{ isResolved: true }` with no provider, and the card passes `check: false`. A signed-in user would see every heart as unsaved and could never remove from it. Today the only `<ShortFilmCard>` consumer is `ShortsDirectory`, which wraps in the provider, so this is latent. A related transient: seeding is skipped while any mutation in the app is in flight (`useIsMutating()` is global) or the list is refetching, and `isResolved` is already true in that window.
**Fix:** Make the provider required for `surface: "card"` (throw in dev when missing), or scope the mutation count to the watchlist keys.

### IN-02: `pageSize: 24` literal duplicates `SHORT_FILM_PAGE_SIZE`

**File:** `apps/client/src/app/[locale]/shorts/page.tsx:41`
**Issue:** The load-more route uses the exported constant. If the constant changes, the server-rendered first page and the later pages will disagree and `page + 1` offsets will misalign.
**Fix:** Omit `pageSize` (the default is the constant) or import `SHORT_FILM_PAGE_SIZE`.

### IN-03: Raw `text-white`, `from-black/90` and `drop-shadow-lg` remain on the card

**File:** `apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCard.tsx:~176-239`
**Issue:** D-02 deleted `ShortsShowcase` partly for raw black/white and `shadow-lg`. The card still uses `text-white`, `text-white/70`, `from-black/90 via-black/60`, `bg-white/10`, `bg-white/20` and `drop-shadow-lg` (Flat Chrome rule). The values are equivalent in the dark-only theme, but they bypass the tokens (`text-foreground`, `bg-aubergine-deep`).
**Fix:** Move to token utilities when the card gets its visual pass. This is not a regression, since the code predates the phase.

### IN-04: Unvalidated locale reaches Strapi from `generateMetadata` and the directory page

**File:** `apps/client/src/app/[locale]/shorts/[slug]/page.tsx:20-26`, `apps/client/src/app/[locale]/shorts/page.tsx:36-40`
**Issue:** `[slug]/layout.tsx` validates the locale, but the page, `generateMetadata` and the directory page run in parallel with their parent layouts and pass `params.locale` straight to the fetchers. For `/zz/shorts` a Strapi request with `locale=zz` is made, answers a 400, and is swallowed or thrown before the parent's `notFound()` wins. It is bounded by the API's validation and by caching, but it is an avoidable upstream call on attacker-chosen input.
**Fix:** Guard with `hasLocale(routing.locales, locale)` (or the layout's `isShortLocale`) before fetching.

### IN-05: New-tab streaming links give no cue to assistive tech

**File:** `apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.tsx:746-755`
**Issue:** The "Regarder sur" anchors use `target="_blank"` with only a decorative `ArrowUpRight` icon, which has no accessible text. Screen-reader users are not told that the link leaves the site and opens a new tab.
**Fix:** Add a visually hidden suffix (a `shorts.opensInNewTab` string), or use `aria-describedby`.

---

_Reviewed: 2026-11-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
