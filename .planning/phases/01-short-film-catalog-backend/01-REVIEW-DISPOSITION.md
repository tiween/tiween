---
phase: 01
review: 01-REVIEW.md
titles: json
updated: 2026-11-10
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "Rate limiting keys on `ctx.ip`, and Strapi's `server.proxy` is not set"
  - id: IN-02
    severity: info
    disposition: open
    title: "`isHttpsUrl` accepts strings that are not clean https URLs, and the stored raw value is served as-is"
  - id: IN-03
    severity: info
    disposition: open
    title: "A changed `poster.sourceUrl` or `backdrop.sourceUrl` has no effect once an image is uploaded"
  - id: IN-04
    severity: info
    disposition: open
    title: "`mapCountryNames` and `COUNTRY_NAMES` are dead production code"
  - id: WR-03
    severity: warning
    disposition: fixed
    commit: 8c95175
    title: "Save is silently blocked when an invalid value sits in a section hidden by the work type"
  - id: IN-05
    severity: info
    disposition: open
    title: "Admin lookups are silently capped"
  - id: IN-06
    severity: info
    disposition: open
    title: "`SHORT_FILM_ONLY_KEYS` is not the source of truth for the payload"
  - id: IN-07
    severity: info
    disposition: open
    title: "The WR-03 E2E URL assertion is vacuous"
  - id: IN-08
    severity: info
    disposition: open
    title: "The importer's stale-poster clearing only reaches locales the data file translates"
  - id: IN-09
    severity: info
    disposition: open
    title: "Clearing the slug field on a saved work no longer regenerates a slug"
  - id: WR-05
    severity: warning
    disposition: fixed
    commit: e57fe88
    title: "A Film or Play save cleared stored `theatreDetails`"
  - id: WR-01
    severity: warning
    disposition: fixed
    commit: 91fc06c
    title: "A re-import silently reverted editor-set `featured` / `featuredRank` and republished the film"
  - id: WR-02
    severity: warning
    disposition: fixed
    commit: 139780f
    title: "Replacing or removing the default poster left a stale poster on every translation"
  - id: WR-04
    severity: warning
    disposition: fixed
    commit: 4ba4792
    title: "Saving a work whose slug was blank could silently change its public URL"
---

# Phase 01: Code review disposition

Review loop 2026-11-10: iteration 1 fixed 4 warnings (theatreDetails omitted for non-plays per owner decision; featured placement kept on re-import; translation posters fall back to the default poster; stored slug re-sent on a blank slug field). Iteration 2 re-review: status clean, 0 critical / 0 warning, 9 info left open as advisory.
