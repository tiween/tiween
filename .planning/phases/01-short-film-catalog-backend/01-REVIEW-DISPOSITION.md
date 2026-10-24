---
phase: 01
review: 01-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "A re-import silently reverts editor-set `featured` / `featuredRank` and republishes the film"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Replacing or removing the default-language poster leaves a stale poster on every translation, and the public API prefers it"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Save is silently blocked when an invalid value sits in a section hidden by the work type"
  - id: WR-04
    severity: warning
    disposition: open
    title: "Saving a work whose slug was blank can silently change its public URL"
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
  - id: IN-05
    severity: info
    disposition: open
    title: "Admin lookups are silently capped"
open: 9
total: 9
recorded: 2026-10-24T23:37:00.431Z
---

# Phase 01: Code Review Disposition

| Finding | Severity | Disposition | Source |
| ------- | -------- | ----------- | ------ |
| WR-01   | warning  | open        | -      |
| WR-02   | warning  | open        | -      |
| WR-03   | warning  | open        | -      |
| WR-04   | warning  | open        | -      |
| IN-01   | info     | open        | -      |
| IN-02   | info     | open        | -      |
| IN-03   | info     | open        | -      |
| IN-04   | info     | open        | -      |
| IN-05   | info     | open        | -      |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
