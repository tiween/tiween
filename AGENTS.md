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

Implementation runs through `bmad-build` (and `bmad-build-auto` under bmad-loop).
`bmad-create-story` and `bmad-dev-story` are deprecated.

<!-- bmad:context -->

# Project Kernel — tiween

## Landmines

- Never add Redis or set `replicas` > 1 — deliberate post-v1 deferral, not an oversight: [redis-deferred](docs/context/redis-deferred.md)
- Never delete dormant Epic 6 ticketing code — feature-flagged off, not rolled back: [ticketing-dormant](docs/context/ticketing-dormant.md)
- `legacy/` is frozen reference-only; CodeGraph indexes it, so its symbols surface as false hits
- Inert, never read or edit: `input/`, `design_handoff_tiween/`, root `progress.json`, root `status.json`
- `apps/strapi/src/plugins/entity-properties/` is an empty shell awaiting deletion — never build on it: [entity-properties-vestigial](docs/context/entity-properties-vestigial.md)
- Never bump `prettier` past 3.3.2 — it corrupts Strapi's generated TS schemas

## Commands

- Yarn 1 classic only — never npm/pnpm
- `yarn test` runs **Vitest in `apps/client`, Jest in `apps/strapi`**: [test-layout](docs/context/test-layout.md)
- Strapi's boot-based suites (`*.service.test.ts`, `*.controller.test.ts`) need `yarn workspace @tiween/admin test:integration`; `yarn test` and CI both skip them
- Single file — client: `cd apps/client && yarn vitest run <file>`; strapi: `yarn workspace @tiween/admin jest <file>`
- No E2E suite — never invent a `test:e2e` command
- `yarn dev:strapi` runs `docker compose up -d db` first — Docker must be running
- Lint is `--max-warnings=0` in both apps: any warning fails
- In a git worktree, run `yarn install --frozen-lockfile` before any test, lint, or build: [worktree-install](docs/context/worktree-install.md)
- Never report a story verified when its verification command could not execute — that story is `blocked`, not `done`

## Process

- Ship from `main` directly: no PRs, no feature branches: [commit-and-push-policy](docs/context/commit-and-push-policy.md)
- Conventional Commits; never add AI attribution trailers or footers
- Push only when the story reads `done` in sprint-status; never at `review`
- Never let a generator write `_bmad-output/implementation-artifacts/sprint-status.yaml`: [sprint-status-hand-maintained](docs/context/sprint-status-hand-maintained.md)
- `_bmad-output/project-planning-artifacts/architecture.md` supersedes `_bmad-output/architecture/` for backend module structure only, and its plugin inventory is stale — trust the tree

## apps/strapi

- New backend features are plugins under `src/plugins/`, never `src/api/`: [strapi compass](docs/context/compass/strapi.md)
- Cross-plugin calls go through the target's `services/public-api.ts` facade only — never `strapi.documents()` with a foreign UID: [plugin-dependency-rules](docs/context/plugin-dependency-rules.md)
- Document Service (`strapi.documents()`) only — never reintroduce the Entity Service
- Admin auth and public auth are different systems: `tests/helpers/admin.ts` vs `tests/helpers/auth.ts`; the wrong one 401s silently
- The regex in `src/shared/website-url.ts` is duplicated in a content-type `schema.json` and must stay byte-identical

## apps/client

- Strapi v5 responses are flat — `response.data.title`. There is no `attributes` wrapper; never remap one: [strapi-v5-shape](docs/context/strapi-v5-shape.md)
- Address documents by `documentId`, never `id`
- Tests are co-located; never create a `__tests__/` directory here
- Translations live in `apps/client/locales/` — not under `src/`
- Arabic uses Western digits and `DD/MM/YYYY` — never format with a raw `ar` locale: [arabic-western-numerals](docs/context/arabic-western-numerals.md)
- APIs return error codes, not prose; translate with `t('errors.<CODE>')`
- Per-user query keys must carry `userId`; clear caches on logout via `signOutAndClearCache` in `src/lib/sign-out.ts`
- Keep `import "server-only"` at the top of private Strapi fetchers
<!-- /bmad:context -->
