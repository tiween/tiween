---
status: testing
phase: 01-short-film-catalog-backend
source: [01-VERIFICATION.md]
started: 2026-10-24T23:49:12Z
updated: 2026-10-24T23:49:12Z
---

## Current Test

number: 1
name: Admin walkthrough in a real browser
expected: |
In the dev admin, Events Manager → Works is reachable from the side nav. Create a short film with FR/AR/EN fields and media chosen through the media-library picker, publish it, edit it, unpublish it — no raw JSON anywhere. Then reproduce review WR-03: add a blank streaming-link row, switch the work type to Film, and try Save (expected today: silently blocked — record what you see).
awaiting: user response

## Tests

### 1. Admin walkthrough in a real browser

expected: Works reachable from the side nav; create, publish, edit, unpublish a short film in FR/AR/EN with the media-library picker; Save behaviour after toggling work type recorded (WR-03).
result: [pending]

### 2. Owner accepts the posterless launch catalog

expected: Owner accepts that all 13 launch films are published with a backdrop but no 2:3 poster (D-12/D-20), or supplies posters and re-runs `seed:shorts`.
result: [pending]

### 3. Owner Arabic review of the AI-drafted fields

expected: The 24 AI-drafted AR/EN titles and synopses listed in 01-CURATION-SHEET.md "Import results" are marked reviewed or corrected in the AR tab. Non-blocking for Phase 2 (D-13).
result: [pending]

### 4. Featured and related reads on Postgres

expected: With the dev Strapi running on Postgres, `GET /api/creative-works/creative-works/short-films/featured` and `/api/creative-works/creative-works/short-films/:slug/related` return the same ordering the SQLite boot suites assert.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
