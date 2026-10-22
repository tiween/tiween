---
created: 2026-10-22T12:12:44.023Z
title: Adopt plugin-first and design docs before building
area: planning
severity: major
files:
  - apps/strapi/src/plugins/
  - _bmad-output/project-planning-artifacts/architecture.md
---

## Problem

Owner directive (verbatim): "always favor creating local plugins to enbcourage reuse and have better control on the ui and the data input workflow, befor developping anything write design.md and experience.md in order to create mockups using claude design"

Two standing rules that are not yet encoded anywhere GSD planners read:

1. **Plugin-first:** new backend/admin capability should be built as a local Strapi plugin (apps/strapi/src/plugins/\*) rather than ad-hoc api/ code. Reasons: reuse across features, and full control over the admin UI and the data-entry workflow (custom admin pages instead of the default Content Manager forms). Aligns with the 2026-06-12 plugin-decomposition architecture amendment.
2. **Design-before-build:** before developing any feature, write `DESIGN.md` (visual/UI design: layout, components, tokens) and `EXPERIENCE.md` (user flows, data-input workflow, states) so mockups can be produced in Claude Design and reviewed before code.

## Solution

- Add both rules to the project's planning conventions (CLAUDE.md and/or `_bmad-output/project-context.md` agent rules) so discuss/plan agents enforce them.
- Make phase planning produce `DESIGN.md` + `EXPERIENCE.md` in the phase dir (before `/gsd-ui-phase` / execution) for any phase with UI or data-entry, then a mockup review gate.
- Apply first to the upcoming Strapi-Backed Shorts Pages and Directory Experience and Brand phases.

## Resolution (2026-10-22)

- GSD capability `tools/gsd-capabilities/tiween-build-rules/` (installed `--scope project`): rules injected into planner + plan checker at plan:pre; two blocking plan:post gates (design docs + approved mockup; plugin-first via `files_modified`).
- Project skill `.claude/skills/strapi-design-system/` copied from the Claude Design "Strapi Design System" project (rules + foundations; component API intentionally not copied — code uses `@strapi/design-system` v2).
- `agent_skills` in `.planning/config.json` for ui-researcher, ui-checker, planner, plan-checker, executor, verifier (project skill + `strapi-ui-design` / `strapi-plugin-dev` plugin skills).
- `CLAUDE.md` "Build rules" section.
- Open: move the Strapi DS into Claude's in-app design systems before standalone Claude Design closes (2026-12-14).
