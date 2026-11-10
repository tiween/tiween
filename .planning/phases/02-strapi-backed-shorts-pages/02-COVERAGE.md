# API Coverage — Strapi short-film API (first-party) + Algolia (legacy)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Decided by the owner during `/gsd-verify-work 2` on 2026-11-10.
> The only API this phase consumes is Tiween's own Strapi backend (through the
> Next.js `/api/shorts` route). Streaming platforms (YouTube, Vimeo, …) are
> outbound watch links only, not integrations.

| capability                          | decision  | reason                                                                                             |
| ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| short-film list (paginated, locale) | INTEGRATE |                                                                                                    |
| short-film detail by slug           | INTEGRATE |                                                                                                    |
| watchlist read / check / toggle     | INTEGRATE |                                                                                                    |
| algolia shorts search               | OPT-OUT   | to be dropped: Meilisearch replaces Algolia; full removal is owned by Phase 3 (Meilisearch Search) |
