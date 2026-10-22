# Project Instructions

**Planning system: GSD** (`.planning/`). BMad tooling was removed on 2026-10-17;
its output in `_bmad-output/` is kept as read-only reference material for
documentation ingestion (`/gsd-ingest-docs`). Do not run, recreate, or write to
BMad workflows, and do not edit `_bmad-output/`.

- Codebase map: `.planning/codebase/`
- AI agent rules: `_bmad-output/project-context.md` (still in force — always follow)
- Architecture (reference): `_bmad-output/architecture/` (baseline) +
  `_bmad-output/project-planning-artifacts/architecture.md` (2026-06-12
  plugin-decomposition amendment — supersedes the baseline for backend module structure)
- Historical epics & stories: `_bmad-output/project-planning-artifacts/epics/`
- Historical sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml` (frozen)

OpenSpec was retired on 2026-06-12. Its change history lives in git
(`git log -- openspec/`); dispositions are recorded in
`_bmad-output/project-planning-artifacts/openspec-retirement-ledger-2026-06-12.md`.
Do not recreate `openspec/`. BMad tooling history: `git log -- _bmad/ .claude/skills/`.

## Build rules (owner directive, 2026-10-22)

- **Plugin-first:** new Strapi backend/admin code goes in a local plugin under
  `apps/strapi/src/plugins/`, not `apps/strapi/src/api/`. Exceptions need
  `plugin_waiver: "<reason>"` in the plan frontmatter.
- **Design docs before build:** every phase folder gets `DESIGN.md` + `EXPERIENCE.md`
  and owner-approved Claude Design mockups (`mockup_status: approved` in
  `EXPERIENCE.md` frontmatter, or `not-applicable` + `mockup_waiver`) before code.
- **Design systems:** plugin admin UI uses the Strapi Design System
  (`.claude/skills/strapi-design-system/`, `@strapi/design-system` v2 in code);
  the public site uses the Tiween DS (`ux-designs/ux-tiween-bmad-version-2026-06-16/`).
- Enforced by the GSD capability in `tools/gsd-capabilities/tiween-build-rules/`
  (blocking gates after planning). New machine: run
  `node .claude/gsd-core/bin/gsd-tools.cjs capability install ./tools/gsd-capabilities/tiween-build-rules --scope project`.
