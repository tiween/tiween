---
status: complete
phase: 01-short-film-catalog-backend
source: [01-VERIFICATION.md]
started: 2026-10-24T23:49:12Z
updated: 2026-11-08T10:05:51Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin walkthrough in a real browser

expected: Works reachable from the side nav; create, publish, edit, unpublish a short film in FR/AR/EN with the media-library picker; Save behaviour after toggling work type recorded (WR-03).
result: issue
reported: "Automated (Playwright e2e/specs/admin-short-film-walkthrough.spec.ts, 2026-11-08): nav, create with FR fields, media-library picker upload, director credit, streaming link and Save all work, no raw JSON. After create, the redirect to works/:documentId crashes with 'Something went wrong — (e.genres ?? []).map is not a function'. Translate/publish/edit/unpublish steps not reached. WR-03 reproduced: blank streaming-link row + switch to Film + Save sends no request and shows no message (test.fail). AR tab sets no dir=rtl."
severity: blocker

### 2. Owner accepts the posterless launch catalog

expected: Owner accepts that all 13 launch films are published with a backdrop but no 2:3 poster (D-12/D-20), or supplies posters and re-runs `seed:shorts`.
result: pass
note: 'Owner accepted the posterless launch catalog on 2026-11-08 (confirms the SC4 override in 01-VERIFICATION.md).'

### 3. Owner Arabic review of the AI-drafted fields

expected: The 24 AI-drafted AR/EN titles and synopses listed in 01-CURATION-SHEET.md "Import results" are marked reviewed or corrected in the AR tab. Non-blocking for Phase 2 (D-13).
result: skipped
reason: 'Deferred follow-up: owner defers the Arabic review of AI-drafted fields (non-blocking per D-13).'

### 4. Featured and related reads on Postgres

expected: With the dev Strapi running on Postgres, `GET /api/creative-works/creative-works/short-films/featured` and `/api/creative-works/creative-works/short-films/:slug/related` return the same ordering the SQLite boot suites assert.
result: pass
note: 'Automated: e2e/specs/short-films-featured-related.spec.ts, 9/9 pass on the isolated Postgres E2E stack (2026-11-08).'

## Summary

total: 4
passed: 2
issues: 1
pending: 0
skipped: 1
blocked: 0

## Gaps

- gap_id: G-01-1
  truth: "Works edit page opens a saved short film so it can be translated, published, edited and unpublished"
  status: failed
  reason: "User reported (automated UAT): edit page crashes after create with '(e.genres ?? []).map is not a function'"
  severity: blocker
  test: 1
  root_cause: "useWork (events-manager/admin/src/hooks/useCreativeWorks.ts) calls the content-manager single-document GET with populate=WORK_POPULATE; on Strapi 5.51.2 that endpoint ignores populate for relations and returns {count: n} (genres, credits[].person). workToFormValues in WorkForm/schema.ts maps over it and throws."
  artifacts:
  - path: "apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts"
    issue: "single-document fetch relies on populate the CM endpoint ignores"
  - path: "apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts"
    issue: "workToFormValues assumes relation arrays"
    missing:
  - "Fetch the work with relations resolved (plugin admin route using the Document Service, or CM relations endpoints) and make workToFormValues tolerate {count} shapes"
  - "Re-run the Playwright walkthrough through translate/publish/edit/unpublish"
    debug_session: ""
- gap_id: G-01-2
  truth: "Save with a blank streaming-link row hidden by switching to Film either saves or shows a visible validation error"
  status: failed
  reason: "User reported (automated UAT): no request sent, no message shown (review WR-03)"
  severity: major
  test: 1
  root_cause: "See 01-REVIEW.md WR-03"
  artifacts: []
  missing:
  - "Drop hidden streaming-link rows on type switch or surface the validation error; flip the test.fail() in the walkthrough spec"
    debug_session: ""

## Deferred Follow-Ups

- test: 3
  idea: 'Owner Arabic review of the 24 AI-drafted AR/EN titles and synopses (01-CURATION-SHEET.md Import results)'
  deferred_at: 2026-11-08
