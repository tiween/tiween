# OpenSpec Retirement Ledger

**Date:** 2026-06-12
**Decision:** OpenSpec removed from the repo so BMad is the single source of
truth for planning. The `openspec/` directory was git-tracked — full history
recoverable via `git log -- openspec/`. This ledger records the disposition of
every change that existed at retirement.

## Dispositions

| OpenSpec change                   | Progress | Disposition                                                                                                                                                                                   |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add-venues-admin-ui`             | 32/33    | **Effectively done** (only manual-testing task open). ⚠️ Built against `plugin::events-manager.venue` — story **2C.1** retargets this UI's UID references during the venues extraction.       |
| `add-strapi-calendar-component`   | 30/31    | Effectively done (manual-testing task open). Custom calendar replaced FullCalendar.                                                                                                           |
| `refactor-events-manager-layouts` | 30/34    | Effectively done (4 manual verification tasks open).                                                                                                                                          |
| `centralize-i18n-labels`          | 12/14    | Near done — 2 open tasks fold into normal client cleanup.                                                                                                                                     |
| `add-desktop-pages`               | 23/40    | **In-flight client work** — resume as BMad stories under Epic 3 scope when prioritized (desktop layouts for discovery pages).                                                                 |
| `standardize-icon-library`        | 15/19    | Partial cleanup — fold remainder into client maintenance stories.                                                                                                                             |
| `standardize-focus-rings`         | 8/11     | Partial — same.                                                                                                                                                                               |
| `standardize-animation-tokens`    | 4/6      | Partial — same.                                                                                                                                                                               |
| `fix-select-rtl-support`          | 3/6      | Partial — RTL correctness matters (FR55); fold into next client a11y/RTL story.                                                                                                               |
| `add-events-manager-admin-ui`     | 0/114    | **Superseded** — re-plan AFTER story 2C.3 (catalog move) via `bmad-create-story`, targeting post-move UIDs. Scope was: visual scheduling UI, TMDB import flow, planning calendar integration. |
| `add-creative-works-admin-ui`     | 0/55     | **Superseded** — re-plan after 2C.3; creative-works will own the full catalog (incl. moved person/character/credit).                                                                          |
| `add-entity-properties-system`    | 0/34     | **Superseded by architecture amendment D6** — entity-properties folds into the `venues` plugin (story 2C.1); EAV admin UI re-planned with Epic 7 if needed.                                   |
| `add-tunisian-plays-crawler`      | 0/64     | **Future backlog** — plays-data crawler (Wikipedia/theatre sources). Re-plan as its own story set when content acquisition is prioritized; the `data-extractor` skill supports it.            |
| `extract-prototype-components`    | 0/56     | Future backlog — convert HTML prototypes in `apps/client/src/prototypes/` to React components. Overlaps Epic 2A scope; review before re-planning.                                             |
| `cleanup-duplicate-utilities`     | 0/7      | Trivial — duplicate `cn` functions; fold into any client cleanup story.                                                                                                                       |
| `archive/`                        | —        | Already-applied historical changes; recoverable from git.                                                                                                                                     |

## Standing knowledge worth keeping

- The events-manager admin currently contains a complete venues management UI
  (table, filters, bulk actions, VenueSelector) and a custom planning calendar —
  both move/retarget with 2C.1 and survive 2C.3 respectively.
- Remaining open tasks across near-done changes were all manual-testing items;
  treat as part of each area's next QA pass.
