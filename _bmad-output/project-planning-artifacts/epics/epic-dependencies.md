# Epic Dependencies

```
Epic 1 (Foundation)
    │
    ├──▶ Epic 2A (Components) ──┐
    │                           ├──▶ Epic 3 (Discovery) ──▶ Epic 10 (PWA)
    └──▶ Epic 2B (Strapi) ──────┘         │
                                          ▼
                                    Epic 4 (Auth)
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                  Epic 5 (Watchlist) Epic 6 (Ticketing) Epic 7 (B2B Venue)
                        │                 │                 │
                        ▼                 │                 ▼
                  Epic 10 (PWA) ◀─────────┘           Epic 8 (Scanner)
                                                            │
                                                            ▼
                                                      Epic 9 (Admin)
```

---
