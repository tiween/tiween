---
type: decision
title: Ticketing is dormant, not removed
description: The 2026-08-06 aggregation-only pivot and why built ticketing code stays
tags: [scope, ticketing]
verified: 2026-08-12
sources: [_bmad-output/implementation-artifacts/sprint-status.yaml]

---

v1 pivoted to an aggregation-only platform on 2026-08-06. Epic 6 stories 6-6..6-10,
Epic 7 stories 7-5/7-6/7-7/7-9, and all of Epic 8 (scanner) were deferred post-v1.

Stories 6-1..6-5 were already `done` and stay done. Their purchase surfaces are gated
behind a default-off feature flag added by story 3-12 — an explicit no-rollback
decision. Do not delete, dead-code, or "clean up" dormant ticketing code in
`apps/strapi/src/plugins/ticketing/` or `apps/client/src/features/tickets/`.
