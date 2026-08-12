---
type: landmine
title: sprint-status.yaml is hand-maintained
description: Why the generator corrupts it and which statuses it would destroy
tags: [process, bmad]
verified: 2026-08-12
sources: [_bmad-output/implementation-artifacts/sprint-status.yaml]
---

Never let `.claude/skills/bmad-sprint-planning/scripts/sprint_plan.py` write
`_bmad-output/implementation-artifacts/sprint-status.yaml`. Use
`generate --dry-run` as a diff oracle only, then apply changes by hand.

Two failure modes. The generator's `STORY_RANK` omits the project-local statuses
`deferred` and `awaiting-operator`, so a write flattens all 19 such entries to
`backlog` and re-exposes consciously parked work to bmad-loop. Its `EPIC_RE` captures
only `Epic\s+(\d+)`, so Epics 2A–2D collapse onto one `epic-2` key and their
`## Story 2A.n:` headings fail to parse at all.

Renumbering 2A–2D to plain integers was rejected on 2026-08-11: it would rewrite 766
references across 85 files and rename 45 story files mid-flight.

Beyond the standard `backlog`/`ready-for-dev`/`in-progress`/`review`/`done`, this file
uses `deferred` (parked out of v1; bmad-loop skips) and `awaiting-operator` (blocked
on a human action, not dev work).
