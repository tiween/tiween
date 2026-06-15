# Project Instructions

**Single source of truth for planning: BMad** (`_bmad-output/`).

- Architecture: `_bmad-output/architecture/` (baseline) + `_bmad-output/project-planning-artifacts/architecture.md` (2026-06-12 plugin-decomposition amendment — supersedes the baseline for backend module structure)
- Epics & stories: `_bmad-output/project-planning-artifacts/epics/`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- AI agent rules: `_bmad-output/project-context.md` (always follow)

OpenSpec was retired on 2026-06-12 (single source of truth consolidation). Its
change history lives in git (`git log -- openspec/`); dispositions are recorded
in `_bmad-output/project-planning-artifacts/openspec-retirement-ledger-2026-06-12.md`.
Do not recreate `openspec/` — plan new work as BMad epics/stories instead.
