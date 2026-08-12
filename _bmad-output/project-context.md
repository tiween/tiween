---
project_name: "tiween"
user_name: "Ayoub"
date: "2026-08-12"
status: "superseded"
---

# Project Context for AI Agents

Superseded by the curated context bundle at [`docs/context/`](../docs/context/).

- **Rules that bind every session:** [`docs/context/kernel.md`](../docs/context/kernel.md)
- **Depth on any single rule:** [`docs/context/index.md`](../docs/context/index.md)
- **Backend orientation:** [`docs/context/compass/strapi.md`](../docs/context/compass/strapi.md)

The kernel is injected into agent sessions through the managed block in
[`AGENTS.md`](../AGENTS.md), so it needs no separate consultation step.

This file's previous contents stated several rules that contradicted the code
(a `yarn test:e2e` command and Playwright dependency that do not exist, a blanket
"never create `__tests__` folders" that holds only for `apps/client`, and
translations under `src/messages/` rather than `apps/client/locales/`). Recover them
from git history if needed: `git log -- _bmad-output/project-context.md`.
