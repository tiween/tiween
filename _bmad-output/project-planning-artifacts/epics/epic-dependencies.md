# Epic Dependencies

> **2026-08-06 revision (sprint-change-proposal-2026-08-06):** v1 = multi-
> category aggregation platform, no ticketing. Epic 6 (remaining stories) and
> Epic 8 are Post-V1; Epic 7's aggregation subset (7.1–7.4, 7.8) joins the v1
> path; Epic 3 widens to multi-category (3.2 un-deferred, 3.12 added).
> "2C.4 gates Epic 6" is satisfied (2C.4 done) and moot for v1.

## MVP Dependencies (V1 Aggregation Relaunch)

```
Epic 1 (Foundation) [MVP]
    │
    ├──▶ Epic 2A (Components) [MVP-partial] ──┐
    │                                          ├──▶ Epic 3 (Discovery) [MVP]
    └──▶ Epic 2B (Strapi) [MVP-partial] ───────┘         │
                                                         ├──▶ Epic 4 (Auth) [MVP-basic]
                                                         │
                                                         ├──▶ Epic 9 (Admin) [MVP-partial]
                                                         │
                                                         └──▶ Epic 10 (PWA) [MVP-partial]
```

## Full Dependencies (Including Phase 2)

```
Epic 1 (Foundation) [MVP]
    │
    ├──▶ Epic 2A (Components) ──┐
    │                           ├──▶ Epic 3 (Discovery) [MVP] ──▶ Epic 10 (PWA)
    └──▶ Epic 2B (Strapi) ──────┘         │
              │                           ▼
              ▼                     Epic 4 (Auth) [MVP-basic]
        Epic 2C (Plugin                   │
        Decomposition)                    │
              │                           │
              ├── 2C.4 gates ─────┐       │
              ├── 2C.1 gates ─────┼───┐   │
              │                   │   │   │
                        ┌─────────┼───┼───┼─────────┐
                        ▼         ▼   ▼   ▼         ▼
                  Epic 5 (Watchlist) Epic 6 (Ticketing) Epic 7 (B2B Venue)
                  [Phase 2]          [Phase 2]          [Phase 2]
                        │                 │                 │
                        ▼                 │                 ▼
                  Epic 10 (PWA) ◀─────────┘           Epic 8 (Scanner)
                                                      [Phase 2]
                                                           │
                                                           ▼
                                                     Epic 9 (Admin)
```

**Epic 2C internal sequencing:** 2C.2 (audit) gates 2C.3 (catalog move);
2C.4 (ticketing UoW) may precede 2C.3 but never concurrently; 2C.5 last.

**⚠️ Admin UI sequencing:** the events-manager admin UI rebuild (former
OpenSpec change `add-events-manager-admin-ui`, retired 2026-06-12 — see
`openspec-retirement-ledger-2026-06-12.md`) is re-planned after 2C.3 against
post-move UIDs — building it first wastes the work against UIDs 2C.3 moves.

## MVP Critical Path (updated 2026-08-06)

1. **Epic 1** → Foundation must complete first
2. **Epic 2A + 2B** → Run in parallel after Epic 1
3. **Epic 3** → Discovery pages after components + Strapi ready; now includes
   3.2 (category filtering) and 3.12 (gate ticketing entry points)
4. **Epic 4** → Basic auth (can run parallel with Epic 3)
5. **Epic 2D + Epic 7 (aggregation subset: 7.3, 7.4, 7.8)** → B2B event supply
6. **Epic 9** → Admin content management (partial, for showtimes entry)
7. **Epic 10** → PWA basics (install, offline cache) — minus 10.5

Post-V1: Epic 6 (6.6–6.10), Epic 7 ticketing subset (7.5/7.6/7.7/7.9), Epic 8,
story 10.5.

---
