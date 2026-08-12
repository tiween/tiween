---
type: landmine
title: Worktree runs need an install first
description: Why node_modules is absent in bmad-loop worktrees and what failure looks like
tags: [bmad-loop, tooling]
verified: 2026-08-12
sources: [_bmad/custom/bmad-build-auto.toml]
---

`bmad-loop` runs with `scm.isolation = "worktree"`: each story is developed in a
fresh git worktree containing tracked files only.

The loop seeds the three gitignored env files (`.env`, `apps/strapi/.env`,
`apps/client/.env.local`) but deliberately never seeds `node_modules` — it is 2.3 GB,
and copying a yarn-1 workspace tree resolves its workspace and `.bin` symlinks back
into the original checkout, so the worktree would silently exercise the main repo's
packages.

Run `yarn install --frozen-lockfile` before any test, lint, or build in a worktree. A
missing-module or command-not-found failure from `yarn test`, `yarn lint`, or
`yarn type-check` is this, not a code defect.
