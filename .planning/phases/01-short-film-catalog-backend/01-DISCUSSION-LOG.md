# Phase 1: Short-Film Catalog Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-18
**Phase:** 01-short-film-catalog-backend
**Areas discussed:** Country / language / streaming model, Public API shape, Launch catalog & media, WorkForm short-film UX

---

## Country / language / streaming model

| Option                  | Description                                                 | Selected |
| ----------------------- | ----------------------------------------------------------- | -------- |
| ISO codes, multi-select | JSON array of ISO 3166 alpha-2, names via Intl.DisplayNames | ✓        |
| Single ISO code         | One primary country                                         |          |
| Country collection type | Localized content type + relation                           |          |

**Country:** ISO codes, multi-select.

| Option                        | Description                                          | Selected |
| ----------------------------- | ---------------------------------------------------- | -------- |
| Codes, multi-select incl. aeb | Curated BCP-47 list incl. Tunisian Arabic and `none` | ✓        |
| Single enum                   | One primary language                                 |          |
| Free text, localized          | Matches mock, not filterable                         |          |

**Language:** curated codes, multi-select.

| Option                       | Description                                         | Selected |
| ---------------------------- | --------------------------------------------------- | -------- |
| New streaming-link component | platform, url, accessType, label; links[] untouched | ✓        |
| Extend common.link           | Add accessType to shared component                  |          |

| Option                       | Description                            | Selected |
| ---------------------------- | -------------------------------------- | -------- |
| Derived from streaming links | ≥1 streaming link or full-length video | ✓        |
| Explicit boolean             | Manual flag                            |          |

| Option        | Description                 | Selected |
| ------------- | --------------------------- | -------- |
| Not localized | Same links for every locale | ✓        |
| Localized     | Per-locale links            |          |

---

## Public API shape

| Option                               | Description                                        | Selected |
| ------------------------------------ | -------------------------------------------------- | -------- |
| Dedicated /short-films routes        | Server-owned populate, flat Zod-allowlisted params | ✓        |
| Generic creative-works + type filter | Reuse filters[]/populate                           |          |

| Option                    | Description               | Selected |
| ------------------------- | ------------------------- | -------- |
| Fix: published-only, keep | Add status:'published'    |          |
| Remove them               | Delete after caller audit | ✓        |
| Leave untouched           | Backlog the draft leak    |          |

**Related:** options were same director then genre / shared genre / manually curated. **User's choice (free text):** "use meilisearch recommendation features". Resolved with the user: Phase 1 ships the route with deterministic logic; Phase 3 swaps it to Meilisearch similar-documents.

| Option                  | Description             | Selected |
| ----------------------- | ----------------------- | -------- |
| Boolean + optional rank | featured + featuredRank | ✓        |
| Boolean only            | Newest first            |          |
| Singleton featured list | Ordered relation        |          |

| Option                     | Description              | Selected |
| -------------------------- | ------------------------ | -------- |
| Newest published, 24/page  | publishedAt:desc, max 48 | ✓        |
| Release year desc, 24/page | Film year order          |          |

**Follow-up (user):** "apart from the recommendations we will have a search/filter features on the shorts page I think we can use it to implement a basic search and facet search with meilisearch". This led to the question below.

| Option                  | Description                                               | Selected |
| ----------------------- | --------------------------------------------------------- | -------- |
| Lean list               | Sort + pagination + locale + genre; facets to Meilisearch | ✓        |
| Full filters as written | Strapi implements every filter                            |          |
| Lean + range filters    | Genre + duration/year in Strapi                           |          |

**Notes:** SDATA-03, SDATA-05, SRCH-03 and ROADMAP Phase 1 criteria 2–3 amended accordingly.

---

## Launch catalog & media

| Option                      | Description            | Selected |
| --------------------------- | ---------------------- | -------- |
| 10 mock films, add later    | Import 10 now          |          |
| 10 + a list I'll provide    | Owner names more       |          |
| Target ~30–50 before launch | Bigger curated catalog | ✓        |

| Option                                       | Description                           | Selected |
| -------------------------------------------- | ------------------------------------- | -------- |
| Thumbs as backdrop, real posters where found | ImageKit upload, placeholder fallback | ✓        |
| Thumbnails for both                          | Cropped 16:9 as poster                |          |
| Only permission-cleared art                  | Contact rights holders                |          |

| Option                      | Description             | Selected |
| --------------------------- | ----------------------- | -------- |
| AI drafts, owner reviews AR | Published with AI EN/AR | ✓        |
| FR only, rely on fallback   |                         |          |
| Human translation first     |                         |          |

| Option                     | Description                              | Selected |
| -------------------------- | ---------------------------------------- | -------- |
| Idempotent seed script     | Existing seeds framework, upsert by slug | ✓        |
| Strapi bootstrap migration | Runs on boot                             |          |
| Manual admin entry         | Not repeatable                           |          |

| Option                            | Description         | Selected |
| --------------------------------- | ------------------- | -------- |
| Claude researches, owner approves | Candidate sheet     | ✓        |
| Owner provides list               |                     |          |
| Crawler                           | Like tunisian-plays |          |

| Option                                    | Description             | Selected |
| ----------------------------------------- | ----------------------- | -------- |
| Phase 1 = 10 + pipeline; 30–50 by Phase 6 | Curation does not block | ✓        |
| 30+ in Phase 1                            |                         |          |

**Eligibility (multi):** Tunisian (co-)production ✓, Watchable online legally ✓, Under ~40 minutes ✓, Festival-selected OR online ✓. Interpreted as: Tunisian AND ≤40 min AND (legally online OR festival-selected with trailer).

---

## WorkForm short-film UX

| Option                                               | Description            | Selected |
| ---------------------------------------------------- | ---------------------- | -------- |
| Country/language all; streaming+featured shorts only | Mirrors isPlay pattern | ✓        |
| All new fields shorts-only                           |                        |          |
| All fields for all types                             |                        |          |

| Option                                   | Description     | Selected |
| ---------------------------------------- | --------------- | -------- |
| Searchable multi-select, localized names | TN / aeb pinned | ✓        |
| Plain multi-select of codes              |                 |          |

**Publish validation (multi):** Duration ≤40 min warning ✓, Require poster ✓, Require ≥1 directing credit ✓, Require streaming link or trailer ✓.

---

## Claude's Discretion

- Platform enum values and the language-list long tail
- Related-ranking details and cap
- Server-side publish enforcement mechanism
- Seed data file format, media-upload helper
- Response envelope details

## Deferred Ideas

- Meilisearch similar-documents for related → Phase 3
- Facet filters + text search → Phase 3
- Catalog growth to 30–50 → Phase 6 launch gate
- Draft-leak audit of other public reads → backlog 999.6
