# tiween-build-rules (GSD capability)

Enforces two owner rules in the GSD loop:

| Hook                            | Point       | What it does                                                                                                                                                                                  |
| ------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| contribution → planner, checker | `plan:pre`  | Injects `fragments/rules.md` (plugin-first, design docs, which design system)                                                                                                                 |
| gate (blocking)                 | `plan:post` | `bin/check-design-docs.cjs`: phase folder must hold `DESIGN.md` + `EXPERIENCE.md`, and `EXPERIENCE.md` frontmatter must say `mockup_status: approved` (or `not-applicable` + `mockup_waiver`) |
| gate (blocking)                 | `plan:post` | `bin/check-plugin-first.cjs`: no plan may list files under `apps/strapi/src/api/` in `files_modified` unless it sets `plugin_waiver`                                                          |

Gates run when a phase is planned, so a phase that skips the rules is stopped before execution.

## Install / update

```bash
node .claude/gsd-core/bin/gsd-tools.cjs capability install ./tools/gsd-capabilities/tiween-build-rules --scope project
```

The install copies the manifest and fragment into `.gsd/capabilities/` (git-ignored, per machine) and records it in
`.gsd-capabilities.json`. After editing `capability.json` or `fragments/`, reinstall (or `capability update`). The gate
scripts run from this folder directly, so edits to `bin/` apply immediately.

## Verify

```bash
node .claude/gsd-core/bin/gsd-tools.cjs loop render-hooks plan:post --raw   # two tiween-build-rules gates
node .claude/gsd-core/bin/gsd-tools.cjs loop render-hooks plan:pre --raw    # planner + checker contributions
node tools/gsd-capabilities/tiween-build-rules/bin/check-design-docs.cjs .planning/phases/<phase-dir>
```

## Turn a gate off

`tiween.design_docs_gate` / `tiween.plugin_first_gate` in `.planning/config.json` (both default `true`).
