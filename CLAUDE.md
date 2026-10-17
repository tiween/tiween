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
