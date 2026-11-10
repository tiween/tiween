---
status: partial
phase: 02-strapi-backed-shorts-pages
source: [02-VERIFICATION.md, 02-10-SUMMARY.md]
started: 2026-11-10T17:16:33Z
updated: 2026-11-10T21:47:31.744Z
---

## Current Test

[testing complete]

## Tests

### 1. Contrast (WCAG AA), 390px

expected: Check the Gold Leaf saved-heart glyph over the stripe artwork and over a light real poster (at least 3:1 non-text); crew initials on Surface Raised `#3E2A48` (at least 4.5:1, spec 12.9:1); muted `#B0A6B8` metadata, department headings, crew role and the access sub-label on the page field `#241326` and on Surface `#31203A` (at least 4.5:1, spec 6.3:1 or better); muted original-title and origin lines over the worst-case bright backdrop scrim; the white outline heart glyph on the 80% Aubergine Deep disc over a light poster (spec predicts 4.2:1 filled gold, 9.7:1 white). Expected: all meet the UI-SPEC Color figures. If a real poster breaks the heart disc, darken the disc scrim stop, not the glyph. Record the disc stroke `#4A3556` value.
result: pass
source: automated-browser
evidence: "Playwright at 390px, local dev against local Strapi, ratios computed from rendered colours (canvas-normalised). Card heart disc = #161015 @ 80% with a 1px #493455 stroke (detail heart: 1.5px #4A3556, same token rounded). Worst case pure-white poster under the card disc: white outline 10.18:1, filled gold #D4A24C 4.40:1 (spec 9.7 / 4.2); over the stripe: 18.1 / 7.8. Crew initials on #3E2A48: 12.89:1. Muted #B0A6B8: 7.52 on #241326, 6.43 on #31203A. Hero muted origin line over a pure-white backdrop under the scrim (96% at that height): 7.9:1; meta line 10.1:1. No local film has a poster (all null), so 'light real poster' was simulated as pure white, the worst case. Screenshots: apps/client/.playwright-mcp/uat/dir-390.png, detail-390.png."

### 2. RTL

expected: Open `/ar/shorts` and `/ar/shorts/<slug>` at 390px. Expected: the heart at the top-left of the poster, the first card top-right, the crew grid filling right to left with the disc at the right of its text, Western digits, a French fallback block inside an Arabic page left-aligned, no horizontal scroll at 320px and at 200% zoom.
result: issue
source: automated-browser
reported: "Automated browser check: at 200% zoom on a 390px phone (195 CSS px) the detail page scrolls horizontally — /ar/shorts/abderrahman scrollWidth 204 vs 195, /en/ 210 vs 195. Cause: the award name 'Journées cinématographiques de Carthage' — the single word 'cinématographiques' cannot wrap inside the award card. Everything else passes: dir=rtl, heart 4px from the card's left edge, first card 16px from the right edge, crew disc right of its text, cast fills right to left, 0 Eastern Arabic digits, no horizontal scroll at 390 and 320 on directory and detail, directory fine at 195; French fallback (lang=fr dir=ltr) aligns left (simulated: every local film has an Arabic translation)."
severity: minor

### 3. Offline queue replay

expected: Signed in, go offline (browser offline toggle or a real device), tap a heart. Expected: the heart fills and the toast says it will sync once online; reconnect, then confirm the film appears on `/watchlist` and the heart is still filled.
result: pass
source: automated-browser
evidence: "Playwright, signed in, context.setOffline(true) on /shorts/action-figuration: heart aria-pressed false→true, toast 'Enregistré — la synchronisation se fera une fois en ligne'; on reconnect one POST /user-engagement/watchlist replayed; /watchlist shows 'Action figuration' with a filled heart (screenshot .playwright-mcp/uat/watchlist.png); heart still pressed after a reload."

### 4. Revalidation window

expected: Production build and start (not dev): edit a film's title in the Strapi admin, wait more than 60 seconds, load the detail twice. Expected: the second load shows the change (stale-while-revalidate serves the old title once).
result: pass
source: automated-browser
evidence: "next build + next start on :3999 against local Strapi (x-forwarded-proto: https). Primed /shorts/brotherhood, set the published title to 'Brotherhood UAT' at 22:18:45: loads at +5s still 'Brotherhood'; at +62s the 1st load served 'Brotherhood' (stale), the 2nd 'Brotherhood UAT'. Title reverted afterwards. Edited in the DB, not the admin UI — this check is the Data Cache window, not the admin."

### 5. Sign-in return path

expected: Signed out, tap a heart on `/ar/shorts/<slug>`, on `/en/shorts/<slug>` and on a French `/shorts/<slug>` page, then sign in. Expected: you land back on the same page in the same locale (no doubled locale prefix), with the heart unsaved. Also tap a heart on the `/shorts` directory and confirm the toast then `/auth/signin?callbackUrl=%2Fshorts`.
result: issue
source: automated-browser
reported: "Automated browser check: the round trip itself is correct — toasts in each locale ('سجّل الدخول لحفظ هذا الفيلم القصير', 'Sign in to save this short film', 'Connectez-vous pour enregistrer ce court métrage'), callbackUrl /ar/shorts/abderrahman, /en/shorts/abderrahman, /shorts/abderrahman and /shorts, no doubled prefix, heart unsaved after sign-in, and the router does land on /ar/shorts/abderrahman. But the existing PreferenceSync (root layout, applies session.user.preferredLanguage once per mount) then router.replace()s to the user's saved language: a user whose saved language is fr (the default for a new account) who signed in from /ar/... or /en/... ends on /shorts/abderrahman in French. Navigation trace: /ar/shorts/abderrahman → 307 /fr/shorts/abderrahman → /shorts/abderrahman. Owner decision needed: should the language the visitor was reading win over the saved preference on a sign-in return trip?"
severity: major

### 6. Keyboard and focus

expected: Tab through a directory card (link, then heart). Activate the heart with Enter and with Space. Stop the stub, trigger the error block, press Retry (fails), restart the stub, press Retry again. Expected: a visible 3px gold focus ring (including the corner of the 44px heart target, which must not be clipped by the card frame), no navigation on heart activation, focus on the h1 after a successful retry and staying on the button after a failed one.
result: issue
source: automated-browser
reported: "Automated browser check: tab order link → heart; Enter saves and Space unsaves with no navigation and focus kept on the heart; with real Strapi stopped (signed out — a signed-in session is itself signed out when Strapi is down) the detail error block renders, a failed Retry keeps focus on the button (aria-busy during the attempt), and after restarting Strapi a successful Retry moves focus to the h1. Defect: the heart's ring is box-shadow 0 0 0 2px white + 0 0 0 5px gold (#D4A149), the 44px target sits 4px inside the card's top and right edges, and the card is overflow:hidden, so the outer 1px of the gold band is clipped at the top and right (button top 425 vs card top 421, button right 183 vs card right 187)."
severity: cosmetic

### 7. In-app browser

expected: Open a detail link inside the Instagram in-app browser. Expected: the page hydrates; note whether the pre-hydration blank shell on layout-level failures (RESEARCH assumption A7) is acceptable.
result: blocked
blocked_by: release-build
reason: "Needs a public URL opened inside Instagram on a phone; owner pushed main 2026-11-10 — run after the production deploy is live."

### 8. Signed-in network counts (from the Plan 09 handoff)

expected: Signed in, open DevTools Network on `/shorts`: exactly one `.../user-engagement/watchlist` request and no `/watchlist/check/` requests; on a detail page exactly one check request. Also confirm the 200 ms spinner on a slow connection and the pulse on a real signed-in save.
result: pass
source: automated-browser
evidence: "Playwright, signed in: /shorts → exactly one 200 GET /user-engagement/watchlist and zero /watchlist/check/ requests; /shorts/abderrahman → exactly one 200 GET /watchlist/check/<documentId>. With the check delayed 1.5s: unsaved outline + aria-busy, spinner at ~200ms, then the filled heart. Save with 2s network latency: heart fills immediately with animate-watchlist-pulse, aria-busy until the POST resolves. Local-env note: the local DB's authenticated role had no user-engagement watchlist permissions (403, three TanStack retries) — granted locally (list/add/toggle/remove/check) before measuring; production must have them, there is no seed."

## Summary

total: 8
passed: 4
issues: 3
pending: 0
skipped: 0
blocked: 1

## Gaps

- gap_id: G-02-2
  truth: "No horizontal scroll on the short-film detail page at 320px and at 200% zoom, in every locale"
  status: failed
  reason: "Automated browser check: at 195 CSS px (200% zoom on a 390px phone) the award name 'Journées cinématographiques de Carthage' overflows its card because 'cinématographiques' cannot break; page scrollWidth 204 (ar) / 210 (en) vs 195."
  severity: minor
  test: 2
  root_cause: "`.awardText` in ShortFilmDetail.module.css has no overflow-wrap, so a single long word (French festival names) cannot break inside the award card at narrow widths."
  artifacts:

  - path: "apps/client/src/features/shorts/components/ShortFilmDetail/ShortFilmDetail.module.css"
    issue: ".awardText (line ~578) lacks overflow-wrap: anywhere; min-width:0 on its flex parent may also be needed"
    missing:
  - "Allow long words in award names (and any other long free-text line on the detail page) to wrap: overflow-wrap: anywhere, min-width: 0 on the flex child"
  - "A regression check: no document scrollWidth > clientWidth on the detail page at 195px in ar/fr/en"
    debug_session: "inline — diagnosed during automated UAT 2026-11-10 (Playwright offender scan)"

- gap_id: G-02-5
  truth: "After the signed-out heart → sign-in round trip, the visitor lands back on the same page in the same locale"
  status: failed
  reason: "Automated browser check: callbackUrl and router push are correct, but PreferenceSync then switches to the account's saved preferredLanguage (fr by default), so sign-ins from /ar/ or /en/ end on the French page. Owner decision: visitor's current locale vs saved preference on a sign-in return."
  severity: major
  test: 5
  owner_decision: "2026-11-10: the browser decides the site language (next-intl Accept-Language detection + NEXT_LOCALE cookie, already active). REMOVE the preferredLanguage field from user accounts entirely. Users must still be able to switch languages from the interface (LocaleSwitcher stays). Emails: use the request/order locale where one exists; asynchronous notifications with no request locale fall back to fr (owner accepted)."
  root_cause: "components/providers/PreferenceSync.tsx (root layout) router.replace()s to session.user.preferredLanguage once per mount after sign-in, overriding the locale the visitor was reading; new accounts default to fr."
  artifacts:

  - path: "apps/client/src/components/providers/PreferenceSync.tsx"
    issue: "forces the saved account language after sign-in — delete (and its test, and its mount in the root layout)"
  - path: "apps/client/src/lib/auth.ts"
    issue: "copies preferredLanguage into the JWT/session (lines ~174, ~192)"
  - path: "apps/client/src/types/next-auth.d.ts"
    issue: "declares preferredLanguage on User/Session"
  - path: "apps/client/src/hooks/useUser.ts"
    issue: "exposes preferredLanguage"
  - path: "apps/client/src/app/[locale]/auth/profile/\_components/ProfileForm.tsx"
    issue: "language field writes preferredLanguage via PUT /users/me"
  - path: "apps/client/src/app/[locale]/venues/register/\_components/VenueRegistrationForm.tsx, app/api/venues/register/route.ts, features/venues/schemas/venue-registration.ts"
    issue: "venue-manager registration sends preferredLanguage"
  - path: "apps/strapi/src/extensions/users-permissions/content-types/user/schema.json"
    issue: "the preferredLanguage attribute itself"
  - path: "apps/strapi/src/extensions/users-permissions/strapi-server.ts"
    issue: "register/profile validation accepts preferredLanguage; password-reset locale precedence uses it (request locale → preferredLanguage → fr)"
  - path: "apps/strapi/src/plugins/ticketing/server/src/services/order-email.ts"
    issue: "resolveLocale(order.locale, user.preferredLanguage)"
  - path: "apps/strapi/src/plugins/user-engagement/server/src/services/notification.ts"
    issue: "normalizeLocale(user.preferredLanguage) for notification emails"
  - path: "apps/strapi/src/plugins/venues/server/src/services/registration.ts, validation/registration.ts"
    issue: "stores/uses manager preferredLanguage for registration emails"
    missing:
  - "Delete PreferenceSync and every client read/write of preferredLanguage (session, types, useUser, profile form field, venue registration payload); keep LocaleSwitcher and the NEXT_LOCALE cookie"
  - "Remove the preferredLanguage attribute from the user schema and from register/profile/venue-registration validation (unknown key must be rejected or ignored, decide per the existing zod strictness)"
  - "Email locale: order email uses order.locale → fr; password reset uses the request locale → fr; venue registration emails use the request locale captured at submit → fr; watchlist notifications use fr (no request context)"
  - "Update every affected unit test; add a regression test that signing in from /ar/... or /en/... keeps that locale"
  - "Strapi drops the column on next boot when the attribute is removed — confirm no data migration is needed (value is discarded by owner decision)"
    debug_session: "inline — navigation trace during automated UAT 2026-11-10: /ar/shorts/abderrahman → 307 /fr/shorts/abderrahman → /shorts/abderrahman"

- gap_id: G-02-6
  truth: "The heart's 3px gold focus ring is fully visible, not clipped by the card frame"
  status: failed
  reason: "Automated browser check: the ring extends 5px (2px white offset + 3px gold) beyond the 44px target, which sits 4px inside an overflow:hidden card, so 1px of the gold band is clipped at the top and right edges."
  severity: cosmetic
  test: 6
  root_cause: "ShortFilmHeart positions the 44px target at `absolute end-1 top-1` (4px) inside the ShortFilmCard article, which is `overflow-hidden rounded-2xl`; the focus ring (ring-offset 2px + 3px ring = 5px outset) exceeds the 4px inset by 1px."
  artifacts:
  - path: "apps/client/src/features/shorts/components/ShortFilmHeart/ShortFilmHeart.tsx"
    issue: "className 'absolute end-1 top-1' — inset smaller than the ring outset"
  - path: "apps/client/src/features/shorts/components/ShortFilmCard/ShortFilmCard.tsx"
    issue: "article is overflow-hidden (line ~139)"
    missing:
  - "Keep the whole 5px ring inside the card: inset the heart by at least 6px (end-1.5/top-1.5) while keeping the visible 40px disc where the spec places it, or draw the ring inset; do not remove overflow-hidden (it clips the poster to the radius)"
    debug_session: "inline — geometry measured during automated UAT 2026-11-10"
