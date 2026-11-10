---
status: testing
phase: 02-strapi-backed-shorts-pages
source: [02-VERIFICATION.md, 02-10-SUMMARY.md]
started: 2026-11-10T17:16:33Z
updated: 2026-11-10T17:16:33Z
---

## Current Test

number: 1
name: Contrast (WCAG AA), 390px
expected: |
Check the Gold Leaf saved-heart glyph over the stripe artwork and over a light real poster (at least 3:1 non-text); crew initials on Surface Raised `#3E2A48` (at least 4.5:1, spec 12.9:1); muted `#B0A6B8` metadata, department headings, crew role and the access sub-label on the page field `#241326` and on Surface `#31203A` (at least 4.5:1, spec 6.3:1 or better); muted original-title and origin lines over the worst-case bright backdrop scrim; the white outline heart glyph on the 80% Aubergine Deep disc over a light poster (spec predicts 4.2:1 filled gold, 9.7:1 white). Expected: all meet the UI-SPEC Color figures. If a real poster breaks the heart disc, darken the disc scrim stop, not the glyph. Record the disc stroke `#4A3556` value.
awaiting: user response

## Tests

### 1. Contrast (WCAG AA), 390px

expected: Check the Gold Leaf saved-heart glyph over the stripe artwork and over a light real poster (at least 3:1 non-text); crew initials on Surface Raised `#3E2A48` (at least 4.5:1, spec 12.9:1); muted `#B0A6B8` metadata, department headings, crew role and the access sub-label on the page field `#241326` and on Surface `#31203A` (at least 4.5:1, spec 6.3:1 or better); muted original-title and origin lines over the worst-case bright backdrop scrim; the white outline heart glyph on the 80% Aubergine Deep disc over a light poster (spec predicts 4.2:1 filled gold, 9.7:1 white). Expected: all meet the UI-SPEC Color figures. If a real poster breaks the heart disc, darken the disc scrim stop, not the glyph. Record the disc stroke `#4A3556` value.
result: [pending]

### 2. RTL

expected: Open `/ar/shorts` and `/ar/shorts/<slug>` at 390px. Expected: the heart at the top-left of the poster, the first card top-right, the crew grid filling right to left with the disc at the right of its text, Western digits, a French fallback block inside an Arabic page left-aligned, no horizontal scroll at 320px and at 200% zoom.
result: [pending]

### 3. Offline queue replay

expected: Signed in, go offline (browser offline toggle or a real device), tap a heart. Expected: the heart fills and the toast says it will sync once online; reconnect, then confirm the film appears on `/watchlist` and the heart is still filled.
result: [pending]

### 4. Revalidation window

expected: Production build and start (not dev): edit a film's title in the Strapi admin, wait more than 60 seconds, load the detail twice. Expected: the second load shows the change (stale-while-revalidate serves the old title once).
result: [pending]

### 5. Sign-in return path

expected: Signed out, tap a heart on `/ar/shorts/<slug>`, on `/en/shorts/<slug>` and on a French `/shorts/<slug>` page, then sign in. Expected: you land back on the same page in the same locale (no doubled locale prefix), with the heart unsaved. Also tap a heart on the `/shorts` directory and confirm the toast then `/auth/signin?callbackUrl=%2Fshorts`.
result: [pending]

### 6. Keyboard and focus

expected: Tab through a directory card (link, then heart). Activate the heart with Enter and with Space. Stop the stub, trigger the error block, press Retry (fails), restart the stub, press Retry again. Expected: a visible 3px gold focus ring (including the corner of the 44px heart target, which must not be clipped by the card frame), no navigation on heart activation, focus on the h1 after a successful retry and staying on the button after a failed one.
result: [pending]

### 7. In-app browser

expected: Open a detail link inside the Instagram in-app browser. Expected: the page hydrates; note whether the pre-hydration blank shell on layout-level failures (RESEARCH assumption A7) is acceptable.
result: [pending]

### 8. Signed-in network counts (from the Plan 09 handoff)

expected: Signed in, open DevTools Network on `/shorts`: exactly one `.../user-engagement/watchlist` request and no `/watchlist/check/` requests; on a detail page exactly one check request. Also confirm the 200 ms spinner on a slow connection and the pulse on a real signed-in save.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
