---
title: "Upgrade Strapi to latest stable 5.51.2"
type: "chore"
created: "2026-08-06"
status: "done"
review_loop_iteration: 0
baseline_commit: "3dd74e19a45bedb2c5c722ca464f18945907dff2"
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `apps/strapi` runs Strapi 5.33.1 while the latest stable is 5.51.2 (18 minors behind). The install already has a version skew: `@strapi/plugin-documentation` resolved to 5.48.0 against core 5.33.1, which Strapi flags as unsupported.

**Approach:** Bump every `@strapi/*` package in `apps/strapi/package.json` to `^5.51.2` in lockstep, reinstall, apply any official codemods for the 5.33→5.51 range via `npx @strapi/upgrade minor`, regenerate types, and verify build + unit tests + dev-server boot.

## Boundaries & Constraints

**Always:**

- All `@strapi/*` dependencies move to the same version (`^5.51.2`) — no mixed core/plugin versions.
- Stay on the v5 major. Node engine stays `>=22`, yarn 1 workspaces, install from repo root.
- Local plugins (`apps/strapi/src/plugins/*`, peer `@strapi/strapi ^5.0.0`) and `@tiween/strapi-provider-email-brevo` keep their peer ranges untouched.
- Commit regenerated `apps/strapi/types/generated/*` alongside the bump (note: `contentTypes.d.ts` already has uncommitted modifications from other work — do not revert them).

**Ask First:**

- Any change to root `package.json` `resolutions` (react/react-dom `^19.0.0`; `@strapi/admin@5.51.2` still peers `^17 || ^18` — mismatch pre-exists, upgrading does not fix or worsen it).
- Upgrading `strapi-plugin-config-sync` 2.1.0 → 3.2.0 (major bump; plugin currently `enabled: false`) — out of scope unless requested.
- Any schema/data migration the new version reports on first boot beyond automatic internal migrations.

**Never:**

- Do not touch `apps/client`, `apps/admin`, or other workspaces' dependencies.
- Do not bump `strapi-plugin-imagekit` / `strapi-provider-upload-imagekit` (already latest) or third-party plugin majors.
- Do not run against a production database; dev database only.

## I/O & Edge-Case Matrix

| Scenario   | Input / State                                | Expected Output / Behavior                                                                | Error Handling                                                                                       |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| HAPPY_PATH | `yarn install` after lockstep bump           | Single resolved version 5.51.x for all `@strapi/*`; no peer warnings for @strapi packages | N/A                                                                                                  |
| CODEMODS   | `npx @strapi/upgrade minor` in `apps/strapi` | Tool reports up-to-date or applies codemods; resulting diff reviewed                      | If tool refuses (dirty git tree), fall back to manual bump already applied and list skipped codemods |
| FIRST_BOOT | `develop` after upgrade                      | Internal migrations run once; admin loads; all 9 local plugins register                   | Boot failure → report error, do not retry blindly                                                    |
| UNIT_TESTS | Existing plugin unit tests                   | Same pass rate as before upgrade                                                          | Failures traced to API changes → fix or HALT if ambiguous                                            |

</frozen-after-approval>

## Code Map

- `apps/strapi/package.json` -- six `@strapi/*` deps at `^5.33.1` (strapi, plugin-documentation, plugin-sentry, plugin-users-permissions, provider-email-mailgun, provider-upload-aws-s3) → `^5.51.2`. Third-party: `strapi-plugin-config-sync` pinned 2.1.0 (leave), imagekit pair (leave), `@tiween/strapi-provider-email-brevo *` (workspace, leave).
- `yarn.lock` -- regenerated entries; verify no duplicate @strapi trees remain.
- `apps/strapi/types/generated/contentTypes.d.ts`, `components.d.ts` -- regenerated on first `develop`/`ts:generate-types`; has pre-existing uncommitted edits — preserve them, expect only tooling-version header/content-type deltas.
- `apps/strapi/src/plugins/*/package.json` -- read-only: peer `@strapi/strapi ^5.0.0`, no changes needed.
- `apps/strapi/config/plugins.ts` -- read-only: documentation enabled, sentry/config-sync/upload(imagekit-conditional) config; no API changes expected in this range.
- `packages/strapi-provider-email-brevo` -- read-only: peer `^5.0.0` compatible.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/package.json` -- bump the six `@strapi/*` dependencies to `^5.51.2` -- lockstep versions are required by Strapi; also resolves the existing 5.48.0/5.33.1 documentation-plugin skew.
- [x] Repo root -- run `yarn install` -- regenerate lockfile with a single @strapi version tree.
- [x] `apps/strapi` -- run `npx @strapi/upgrade minor` (accept codemods for 5.33→5.51) -- applies any official code transforms; if it declines to run on the dirty tree, verify manually that no codemods exist for this range (tool output) and record that in the spec change log.
- [x] `apps/strapi` -- rebuild admin + regenerate types (`yarn build` / first `develop` run) -- confirm compile against 5.51 APIs.
- [x] `apps/strapi` -- run existing unit tests -- confirm no regressions from the version bump.

**Acceptance Criteria:**

- Given the updated lockfile, when `yarn why @strapi/strapi` (and `@strapi/admin`) is run, then exactly one version resolves and it is 5.51.2.
- Given a fresh `develop` boot, when the admin panel loads, then all nine local plugins register without errors and no @strapi version-mismatch warning appears in the boot log.
- Given the pre-upgrade test baseline, when the strapi workspace unit tests run post-upgrade, then the pass rate is unchanged.

## Spec Change Log

- 2026-08-06: `npx @strapi/upgrade minor` run after the manual lockstep bump reported "The project is already up-to-date (minor)". Verified via `npx @strapi/upgrade codemods ls` that the newest codemod is for 5.1.0 — no codemods exist in the 5.33→5.51 range, so none were skipped.

## Verification

**Commands:**

- `yarn install` -- expected: completes; `yarn why @strapi/strapi` shows only 5.51.2.
- `yarn workspace @tiween/strapi build` (or the workspace's build script) -- expected: TS + admin build succeed.
- Strapi workspace test script (e.g. `yarn workspace @tiween/strapi test:unit`) -- expected: same results as pre-upgrade baseline run.

**Manual checks (if no CLI):**

- Boot `develop`, open the admin at `https://api.tiween.localhost:1355/admin`: no version-mismatch warnings in terminal, plugins listed in the sidebar, one content-type editable end-to-end.

## Suggested Review Order

**Version bump**

- The whole change in one glance: six @strapi/\* deps, lockstep `^5.51.2` carets
  [`package.json:43`](../../apps/strapi/package.json#L43)

- Regenerated lockfile: single 5.51.2 tree, old 5.33/5.48 skew gone (skim only)
  [`yarn.lock:1`](../../yarn.lock#L1)

**Regression guard hardening (Story 4.7)**

- Guard now pins the real runtime artifact via the `./strapi-server` dist entry
  [`factory-wiring.unit.test.ts:150`](../../apps/strapi/src/extensions/users-permissions/factory-wiring.unit.test.ts#L150)

- Source-layout probe: single ≥5.51 candidate, actionable throw when layout moves again
  [`factory-wiring.unit.test.ts:168`](../../apps/strapi/src/extensions/users-permissions/factory-wiring.unit.test.ts#L168)

**Regenerated types (tooling output, verify plausibility only)**

- New upstream api-token surface: `kind` enum + admin-scoped token relations
  [`contentTypes.d.ts:47`](../../apps/strapi/types/generated/contentTypes.d.ts#L47)

- Other 5.51 additions: session `metadata`, `resetPasswordTokenExpiresAt`, upload `focalPoint`
  [`contentTypes.d.ts:252`](../../apps/strapi/types/generated/contentTypes.d.ts#L252)

- Generator churn: `export module` → `export namespace` (type-only)
  [`components.d.ts:462`](../../apps/strapi/types/generated/components.d.ts#L462)
