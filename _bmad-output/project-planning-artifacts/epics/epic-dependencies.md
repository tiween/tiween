# Epic Dependencies

## MVP Dependencies (Cinema Showtimes Relaunch)

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

## MVP Critical Path

1. **Epic 1** → Foundation must complete first
2. **Epic 2A + 2B** → Run in parallel after Epic 1
3. **Epic 3** → Discovery pages after components + Strapi ready
4. **Epic 4** → Basic auth (can run parallel with Epic 3)
5. **Epic 9** → Admin content management (partial, for showtimes entry)
6. **Epic 10** → PWA basics (install, offline cache)

---
