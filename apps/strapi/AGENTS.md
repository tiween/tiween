<!-- bmad:context -->

**What this is.** The Strapi v5 backend, serving both the public REST API and the
B2B/admin back office. Nearly all behaviour lives in plugins under `src/plugins/`;
`src/api/` holds only `health`.

**The plugins.** Each owns one domain; `ls apps/strapi/src/plugins/` is the
inventory. `creative-works` is the catalog of record — the legacy `movie` and `play`
types are retired, never resurrect them. `entity-properties` is an empty shell —
[entity-properties-vestigial](../../docs/context/entity-properties-vestigial.md).

`src/shared/` is a deliberately dependency-free kit — add nothing to it that imports
a plugin.

**How to run it.** `yarn dev:strapi` from the repo root — it runs
`docker compose up -d db` first, so Docker must be up. `yarn test` covers the unit
and admin-component gates; the DB-booting suites need
`yarn workspace @tiween/admin test:integration` — [test-layout](../../docs/context/test-layout.md).

**What's surprising.**

- Cross-plugin calls go through `services/public-api.ts` only, and nothing enforces it
  — [plugin-dependency-rules](../../docs/context/plugin-dependency-rules.md)
- Admin routes use policies in `<plugin>/server/src/policies/`, not middleware;
  `venues-admin-scope.ts` reads CASL ability off `ctx.state.userAbility`, fails closed,
  and throws `PolicyError` with a `details.code`
- Admin session auth and public users-permissions JWT are different systems; the wrong
  test helper 401s without explanation
- The `website-url.ts` regex is duplicated in a content-type `schema.json`; a unit test
  fails if they drift

**Where to go next.** `_bmad-output/project-planning-artifacts/architecture.md` for the
plugin-decomposition amendment and rules R1–R5 — but verify its plugin inventory
against the tree, which is stale.

<!-- /bmad:context -->
