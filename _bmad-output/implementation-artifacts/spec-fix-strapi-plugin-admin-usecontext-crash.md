---
title: "Fix Strapi plugin admin pages crashing with useContext null error"
type: "bugfix"
created: "2026-08-06"
status: "draft"
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every local plugin page in the Strapi admin (`apps/strapi/src/plugins/*`) crashes with `TypeError: Cannot read properties of null (reading 'useContext')` from react-router. Plugin admin code imports deps (`react-hook-form`, `@tanstack/react-query`, `use-debounce`, `zod`, `@hookform/resolvers/zod`) that Vite's initial dep scan doesn't see, so navigating to a plugin route triggers a mid-session re-optimization; the browser then runs chunks from two cache generations (observed: `v=217b921d` for react-dom vs `v=b011cb51` for react-router) — two React instances, null hooks dispatcher, crash.

**Approach:** Pre-bundle the plugin admin dependencies at dev-server startup via `optimizeDeps.include` and dedupe React-family packages in the admin Vite config; declare the deps that `apps/strapi` currently borrows via hoisting; clear the stale Vite cache once and verify plugin pages load.

## Boundaries & Constraints

**Always:**

- Keep the existing `@` → `/src` alias in `src/admin/vite.config.ts` intact.
- Declared dependency version ranges must match what is already hoisted/installed (react-hook-form `^7.53.1`, @tanstack/react-query `^5.59.16`, @hookform/resolvers `^5.2.2`) so the lockfile resolution doesn't fork a second copy.
- Run `yarn install` from the repo root (yarn 1 workspaces).

**Ask First:**

- Any change to root `package.json` `resolutions` (currently forcing react/react-dom `^19.0.0` monorepo-wide while `@strapi/admin@5.33` peers on `^17 || ^18`). Known mismatch, admin currently renders on 19 — renegotiating it is a separate decision.
- Adding new runtime dependencies beyond the three listed.

**Never:**

- Do not downgrade React or touch `apps/client` / `apps/admin` dependencies.
- Do not eject or replace Strapi's admin Vite pipeline; only extend via the documented `mergeConfig` hook.
- Do not commit `node_modules` or cache artifacts.

## I/O & Edge-Case Matrix

| Scenario    | Input / State                                                 | Expected Output / Behavior                                       | Error Handling |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | -------------- |
| HAPPY_PATH  | Fresh `yarn develop`, navigate to any plugin admin page       | Page renders; no useContext TypeError; no mid-session reload     | N/A            |
| COLD_CACHE  | `node_modules/.strapi/vite` deleted, then dev start           | Single optimize pass includes plugin deps; consistent `?v=` hash | N/A            |
| ALL_PLUGINS | Visit each of the 9 local plugins' admin pages in one session | All render without re-optimization crash                         | N/A            |

</frozen-after-approval>

## Code Map

- `apps/strapi/src/admin/vite.config.ts` -- Strapi admin Vite customization hook (`mergeConfig`); currently only sets `@` alias. Add `optimizeDeps.include` + `resolve.dedupe` here.
- `apps/strapi/package.json` -- declares `use-debounce ^10`, `zod ^3.25.67`, `styled-components ^6`, `react-router-dom ^6`; MISSING `react-hook-form`, `@tanstack/react-query`, `@hookform/resolvers` (used by plugin admin code, resolved only via hoisting from `apps/client`).
- `apps/strapi/src/plugins/*/admin/src/**` -- read-only evidence: imports of react-hook-form (13×), use-debounce (6×), @tanstack/react-query (3×), zod, @hookform/resolvers/zod.
- `apps/strapi/node_modules/.strapi/vite/deps/_metadata.json` -- stale prebundle cache; `browserHash b011cb51` while page held chunks from `217b921d`. Delete dir before verification.
- Root `package.json` -- `resolutions` react/react-dom `^19.0.0`; single React copy on disk (19.2.3). Read-only for this fix.

## Tasks & Acceptance

**Execution:**

- [ ] `apps/strapi/package.json` -- add dependencies `react-hook-form ^7.53.1`, `@tanstack/react-query ^5.59.16`, `@hookform/resolvers ^5.2.2` -- plugin admin code imports them; undeclared hoisting is fragile and hides them from Vite scanning context.
- [ ] `apps/strapi/src/admin/vite.config.ts` -- extend merged config with `optimizeDeps.include: ["react-hook-form", "@tanstack/react-query", "use-debounce", "zod", "@hookform/resolvers/zod"]` and `resolve.dedupe: ["react", "react-dom", "react-router-dom", "styled-components"]` -- forces one prebundle generation at startup; prevents dual React instances.
- [ ] Run `yarn install` at repo root, then delete `apps/strapi/node_modules/.strapi/vite` -- refresh lockfile and purge the mixed-generation cache.

**Acceptance Criteria:**

- Given a fresh dev server start, when the admin loads and the user navigates to any local plugin page, then the page renders without `useContext` TypeError and the browser console shows no "new dependencies optimized" full-reload for the included deps.
- Given the dev server session, when all 9 plugin admin pages are visited sequentially, then every chunk URL served carries the same `?v=` hash generation and no crash occurs.
- Given `yarn install` after the dependency additions, when the lockfile is inspected, then react-hook-form/@tanstack/react-query/@hookform/resolvers still resolve to the single already-installed versions (no duplicate copies under `apps/strapi/node_modules`).

## Spec Change Log

## Verification

**Commands:**

- `yarn install` -- expected: completes without new conflicting resolutions; `git diff yarn.lock` shows no version forks for the three deps.
- `rm -rf apps/strapi/node_modules/.strapi/vite && yarn workspace @tiween/strapi develop` (or the repo's dev proxy on port 1355) -- expected: admin boots; plugin pages render.

**Manual checks (if no CLI):**

- In the browser, open `https://api.tiween.localhost:1355/admin`, visit each plugin's page; DevTools console shows no `useContext` TypeError; Network tab shows all `node_modules/.strapi/vite/deps/*` chunks sharing one `?v=` value.
