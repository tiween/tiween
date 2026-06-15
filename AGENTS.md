# Agent Instructions

**Single source of truth for planning: BMad** (`_bmad-output/`). OpenSpec was
retired 2026-06-12 — do not recreate `openspec/`; plan new work as BMad
epics/stories. History: `git log -- openspec/`; dispositions:
`_bmad-output/project-planning-artifacts/openspec-retirement-ledger-2026-06-12.md`.

When a request involves planning, proposals, architecture shifts, or new
capabilities, consult:

- `_bmad-output/project-context.md` — mandatory AI agent rules
- `_bmad-output/project-planning-artifacts/architecture.md` — plugin
  decomposition amendment (supersedes `_bmad-output/architecture/` for backend
  module structure; dependency rules R1–R5 are review blockers)
- `_bmad-output/project-planning-artifacts/epics/` — epics and stories
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — sprint tracking

Implementation flows through the BMad story cycle: `bmad-create-story` →
`bmad-dev-story` → `bmad-code-review`.
