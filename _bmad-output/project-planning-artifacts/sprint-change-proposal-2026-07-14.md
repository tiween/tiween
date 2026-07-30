# Sprint Change Proposal — ESLint Enforcement & Lint Coverage Hardening

- **Date:** 2026-07-14
- **Author:** Ayoub (via Correct Course workflow)
- **Trigger story:** DW-21 (`refactor(events): make StrapiEvent legacy startDate/endDate/status optional`) — committed with `--no-verify`
- **Change scope classification:** **Moderate** (backlog reorganization + architecture-doc touch; no PRD/MVP change)
- **Review mode:** Batch
- **Path forward:** Option 1 — Direct Adjustment (new stories within the existing Epic 1 structure)

---

## Section 1 — Issue Summary

**Problem statement.** The monorepo's ESLint pipeline has effectively **no enforcement**, and the backend has **no linting at all**. As a result, quality gates that the project believes it has are cosmetic.

Three compounding causes:

1. **`eslint-plugin-only-warn` neutralizes every rule.** It is present in all three shared presets (`packages/eslint-config/{next,library,react-internal}.mjs`) — a `create-turbo` starter leftover. It downgrades _every_ rule to a warning at report time, defeating both:
   - `eslint-config-next/core-web-vitals`, whose entire purpose is to promote perf rules from warnings to **errors**; and
   - the client's own explicit severities (e.g. `@typescript-eslint/no-unused-vars: "error"`).
2. **`turbo lint` has no `--max-warnings`.** The client `lint` script is `eslint .`, so warnings never produce a non-zero exit. `yarn lint` — run locally _and in CI_ (`.github/workflows/ci.yml:64`) — is therefore green regardless of how many issues exist.
3. **The only real gate is the pre-commit hook**, which runs `eslint --max-warnings=0` (via `apps/client/.lintstagedrc.js`) at **whole-staged-file granularity** — so touching any line of a debt-laden file inherits all of that file's pre-existing warnings.

**How it was discovered.** Story DW-21 was a two-line-per-file, lint-clean change, yet the pre-commit hook failed on 9 pre-existing warnings in the two detail-page files it touched. The commit was correctly shipped with `--no-verify`, but the episode exposed that (a) the hook is the sole enforcement point and (b) `yarn lint`/CI cannot see the debt.

**Evidence (measured 2026-07-14).**

- `apps/client`: **`✖ 266 problems (0 errors, 266 warnings)`** — 0 errors because `only-warn` downgrades all of them.
- Top offenders: `no-console` (92), `react/no-unescaped-entities` (57), `@typescript-eslint/no-unused-vars` (49), `storybook/no-renderer-packages` (40), `@typescript-eslint/no-explicit-any` (6), `@next/next/no-img-element` (5, a Core Web Vitals rule).
- The 49 `no-unused-vars` surface as _warnings_ despite being configured `"error"` → direct proof `only-warn` overrides explicit severities.
- 6 `no-explicit-any` + 5 `no-img-element` violate hard rules in `project-context.md` and are invisible today.
- `apps/strapi`: dormant legacy `.eslintrc.js`, **no `lint` script, no declared eslint deps, not in the turbo graph** → backend code is unlinted end-to-end.

**Best-practice alignment.** Per current Next.js 16 and Turborepo docs, the setup is otherwise ~90% aligned (flat config, shared preset package, `core-web-vitals`, `eslint-config-prettier`, correct `turbo.json` `lint` task with `dependsOn: ["^lint"]`). `only-warn` is the one anti-pattern and no longer appears in either project's recommended setup. `next lint` removal (Next 16) is already handled — the client uses the ESLint CLI and `next.config.mjs` has no `eslint` key.

---

## Section 2 — Impact Analysis

### Epic Impact

- **Epic 1 (Project Foundation & Infrastructure)** — in-progress; natural home for the corrective stories. No scope invalidation; stories appended.
- **No other epic's scope changes.** However, the missing gate is a **latent risk to all in-flight epics** (Epic 6 ticketing especially, where `no-explicit-any` / unverified code carries the most cost).

### Story Impact

- No existing story is invalidated or rolled back.
- **DW-21** stands as-is; its `--no-verify` is retroactively justified and superseded once enforcement is real.
- **Four new stories** proposed under Epic 1 (see Section 4).

### Artifact Conflicts

- **PRD:** none. No product-scope or MVP impact.
- **Architecture (`architecture.md`):** minor. The "Development Workflow Integration" PR-gate line (515–516) lists `type-check + existing tests + grep gates + strapi-reviewer` and **omits ESLint** — correct today (it's toothless), but must be updated to include a real lint gate once restored. The "Nice-to-have: dependency-rule lint" note (573) is adjacent future work, not in scope here.
- **UX specs:** none.
- **CI/CD (`.github/workflows/ci.yml`):** the `Lint` job becomes a genuine gate; the backend joins it. `format:check` already enforced — unaffected.

### Technical Impact

- Removing `only-warn` + adding `--max-warnings=0` will **immediately fail CI on the current 266 client warnings** unless a paydown/ratchet is executed first. This is the central risk and is designed into Story 1-10.
- Backend flat-config migration is ESLint-10-readiness work (legacy `.eslintrc.*` is dropped in ESLint 10).

---

## Section 3 — Recommended Approach

**Selected: Option 1 — Direct Adjustment.** Add corrective stories within the existing Epic 1 structure. No rollback (nothing to revert), no MVP review (no product scope touched).

|          | Assessment                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Effort   | **Medium** — dominated by the one-time 266-warning paydown in Story 1-10                                          |
| Risk     | **Low–Medium** — the only real risk (CI breakage on flip) is contained by measuring + baselining before enforcing |
| Timeline | No epic delivery-date impact; runs as standard sprint stories, ideally before deeper Epic 6 work                  |

**Rationale.** The corrective work is purely additive tooling/tech-debt; it does not disturb feature scope. Doing it now (rather than later) protects Epic 6/7 backend work — the highest-cost place for silently-passing `any` and unverified code — and unblocks the two open Epic 5 retro action items that both _assume_ a working lint gate.

**Alternatives considered.**

- _Diff-only linting (`eslint-plugin-diff`)_ — rejected as the primary fix: it has blind spots (hides warnings your change causes on adjacent unchanged lines) and lets debt live forever. Reserve for a genuinely untouchable legacy surface only.
- _Do nothing / keep `--no-verify` culture_ — rejected: normalizes bypassing the sole gate and lets debt compound (266 → more).

---

## Section 4 — Detailed Change Proposals

### New stories (Epic 1 — Project Foundation & Infrastructure)

#### Story 1-10 — Restore client ESLint enforcement

**Rationale:** make `turbo lint`/CI and the pre-commit hook agree, and give real rules teeth.

- Remove `eslint-plugin-only-warn` from all three presets (`next.mjs`, `library.mjs`, `react-internal.mjs`) and drop the dep from `packages/eslint-config/package.json`.
- Run `eslint .` to get the true **error** set; **pay down or explicitly, per-rule downgrade** the 266 surfaced items (e.g. keep `no-console` as `"warn"` deliberately if desired, but fix `no-explicit-any`, `no-unused-vars`, `no-img-element`). Baseline is a conscious decision per rule, not an accident.
- Add `--max-warnings=0` to the client `lint` script (`eslint . --max-warnings=0`) so CI and the hook share one strictness level.
- **AC:** `yarn lint` fails on a newly-introduced `any`; passes on a clean tree; pre-commit hook and CI produce identical verdicts.

#### Story 1-11 — Bring the Strapi backend under lint

**Rationale:** backend is currently unlinted and on a to-be-removed config format.

- Migrate `apps/strapi/.eslintrc.js` → flat `apps/strapi/eslint.config.mjs` (node/Strapi-appropriate rules; keep the frontend/backend configs separate as intended).
- Add a `lint` script to `apps/strapi/package.json` so it joins the turbo graph and the CI `Lint` job.
- **AC:** `yarn lint` runs ESLint over `apps/strapi`; CI `Lint` job covers backend; ESLint-10-ready (no `.eslintrc.*`).

#### Story 1-12 — i18n Western-numeral lint guard _(closes Epic 5 retro action item)_

**Rationale:** the `ar-u-nu-latn` Arabic-Indic numeral bug recurred in stories 5.4 and 5.5; `project-context.md` mandates Western numerals.

- Add a shared formatter or custom lint rule that forbids Arabic-Indic numeral output / unguarded locale number formatting.
- **AC:** a reintroduction of the 5.4/5.5 pattern fails lint. Depends on 1-10 (needs real enforcement to have teeth).

#### Story 1-13 — Repo-hygiene CI guard for non-UTF-8 / control-byte files _(closes Epic 5 retro action item)_

**Rationale:** a binary email source in story 5.6 hid from two review passes.

- Add a CI check (and optionally a pre-commit check) rejecting non-UTF-8 / control-byte source files.
- **AC:** committing a binary/control-byte source file fails CI.

**Suggested sequencing:** 1-10 → 1-11 → 1-12 → 1-13 (1-10 gates 1-12).

### Architecture doc change (`architecture.md`, lines 515–516)

```
OLD:
Unchanged commands (`yarn dev`, `yarn test`). Each step's PR gate:
type-check + existing tests + grep gates above + strapi-reviewer agent pass.

NEW:
Unchanged commands (`yarn dev`, `yarn test`). Each step's PR gate:
lint (`eslint . --max-warnings=0`, both apps) + type-check + existing tests
+ grep gates above + strapi-reviewer agent pass.
```

_(Apply only after Story 1-10 + 1-11 land, so the doc doesn't describe a gate that isn't real yet.)_

### sprint-status.yaml changes

- Add under Epic 1: `1-10 … 1-13` (status `backlog`, or `ready-for-dev` for 1-10 to start immediately).
- Update the two Epic 5 `action_items`:
  - i18n Western-numeral guard: `status: open` → `status: specced`, `story: "1-12-i18n-western-numeral-lint-guard"`.
  - non-UTF-8/control-byte guard: `status: open` → `status: specced`, `story: "1-13-repo-hygiene-encoding-ci-guard"`.

---

## Section 5 — Implementation Handoff

**Scope: Moderate → Product Owner / Developer.**

| Recipient         | Responsibility                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PO / SM           | Insert 1-10…1-13 into Epic 1; set statuses; update the two retro action items in `sprint-status.yaml`.                                |
| Developer agent   | Implement stories in sequence (1-10 first). Story 1-10 owns the 266-warning paydown decision (fix vs. deliberate per-rule downgrade). |
| Architect (light) | Apply the `architecture.md` PR-gate edit after 1-10 + 1-11 land.                                                                      |

**Success criteria.**

- `only-warn` removed; `yarn lint` (CI + local) fails on real errors and matches the pre-commit hook.
- `apps/strapi` linted in CI on flat config.
- Reintroducing the 5.4/5.5 numeral bug or a binary source file fails a gate.
- No `--no-verify` needed for a lint-clean change.

**Deferred / out of scope:** dependency-rule "foreign UID" lint (architecture nice-to-have); the integration-seam test-tier retro action item; migrating Strapi tests from Jest → Vitest (separate `project-context.md` drift).
