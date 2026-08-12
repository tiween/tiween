---
type: convention
title: Plugin dependency rules R1–R5
description: The acyclic facade-only rules governing cross-plugin calls, and why nothing enforces them
tags: [architecture, strapi, review]
verified: 2026-08-12
sources: [_bmad-output/project-planning-artifacts/architecture.md]

---

From `architecture.md:234-238`:

- **R1** cross-plugin schema relations and service calls form one acyclic graph
- **R2** a plugin may call another's services only along an edge that already exists
  in its schema relations
- **R3** cross-plugin calls go through the target's facade service only
- **R4** no plugin reaches into another's content types via `strapi.documents()` with
  a foreign UID
- **R5** integration plugins (`tmdb-integration`, `payments`) depend on nothing;
  anyone may call them

The facade is each plugin's `services/public-api.ts`.

No lint rule enforces any of this — `apps/strapi/eslint.config.mjs` and
`packages/eslint-config` carry no `no-restricted-paths` or boundaries plugin.
Violations are caught only in review, where they are blockers.
