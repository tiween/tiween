---
phase: quick-261024-iy3
plan: 01
subsystem: strapi-uploads
tags: [imagekit, strapi-upload-provider, media-library, seed]
status: complete
requires: []
provides:
  - "@tiween/strapi-provider-upload-imagekit: ImageKit upload provider mirroring Media Library folders"
  - "findOrUploadImage source.folder + ensureUploadFolderPath for the seeds"
affects: [apps/strapi upload config, seed:shorts]
tech-stack:
  added: ["local workspace package (imagekit 6.0.0, already locked)"]
  patterns:
    [
      "injected-SDK provider with node:test suite",
      "synchronous placement + parent registry",
    ]
key-files:
  created:
    - packages/strapi-provider-upload-imagekit/package.json
    - packages/strapi-provider-upload-imagekit/index.js
    - packages/strapi-provider-upload-imagekit/index.test.js
  modified:
    - apps/strapi/package.json
    - yarn.lock
    - apps/strapi/config/plugins.ts
    - apps/strapi/.env.example
    - apps/strapi/scripts/seeds/utils/media-upload.ts
    - apps/strapi/scripts/seeds/utils/media-upload.unit.test.ts
    - apps/strapi/scripts/seeds/shorts/import-short-films.ts
    - apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts
    - apps/strapi/tests/strapi-semantics.service.test.ts
decisions:
  - "Root/env path building lives in one function (buildBasePath) so a sibling folder (tiween/tmdb/) can be added later without restructuring"
  - "Existing files are reused where they are: the seed never moves a file into a folder after the fact"
metrics:
  tasks: 3
  files: 12
commits: 3
plan_head_before: 3e5fd1e04d0ec1e7c5423cb9286f0d20c3402529
plan_head_after: 664ba2c09bcde5c74009eb25498d55d6ba4e3995
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
---

# Quick 261024-iy3: Mirror Strapi Media Library folders in ImageKit uploads

A local upload provider stores files at `/{IMAGEKIT_FOLDER}/{env}/{slugified Media Library folders}/{hash}{ext}` (root default `tiween`, env from `IMAGEKIT_ENV_FOLDER` or NODE_ENV production/development, `unsorted` outside any folder). Thumbnails and every responsive format follow the parent image. The short-film seed files posters under `Short films > Posters` and backdrops under `Short films > Backdrops`.

## Commits

| Task       | Commit  | Content                                                                                        |
| ---------- | ------- | ---------------------------------------------------------------------------------------------- |
| 1 (tracer) | 00c4409 | Workspace provider (main files), config/dependency switch, yarn.lock, seed guard + A13 updated |
| 2          | b39b727 | Parent registry for thumbnail/formats, `replace`/`replaceStream`                               |
| 3          | 664ba2c | Folder-aware seed helper, poster/backdrop folders, `.env.example` docs                         |

## Verification

- `node --test packages/strapi-provider-upload-imagekit/index.test.js`: 20 pass, 0 fail (T1-T11, B1-B9).
- `yarn --silent workspace @tiween/admin jest scripts/seeds --selectProjects server`: 4 suites, 176 tests pass (media-upload unit 65, was 58 baseline; +1 retired-name case, +6 folder cases).
- Server project, full: 91 suites / 1585 tests pass (baseline 1578 + 7).
- Boot suites on SQLite (ImageKit variables blanked on the command line): `strapi-semantics.service.test.ts -t A13` 2 pass; `import-short-films.service.test.ts` 25 pass (S1, S2 included).
- eslint `--max-warnings=0` on the in-scope apps/strapi files and prettier `--check` on all in-scope files: clean.
- `check-design-docs.cjs` and `check-plugin-first.cjs`: both pass.
- `yarn install --frozen-lockfile` succeeds with the edited lockfile.
- Full `yarn workspace @tiween/admin test` run once showed 5 admin-project (jsdom) suites failing under parallel load (events-manager and venues UI tests, timeouts). All 13 of those suites pass with `--runInBand` (153 tests), and none touch files of this plan.

## yarn.lock diff

Only the `strapi-provider-upload-imagekit@^5.11.11` block is removed (7 deletions, 0 additions). `imagekit@6.0.0` stays (strapi-plugin-imagekit and the new package pin it). `yarn install` itself also re-sorted the unrelated `@phosphor-icons/react` block; that churn was reverted by hand so the diff is minimal. No registry package was added.

## Which provider did A13 resolve?

`local`. The worktree has no `apps/strapi/.env` (never created or read), so ImageKit keys are absent and the boot check resolved the local provider. The new package name is accepted by the test and its option-key assertion (`rootFolder`, `envFolder`), but Strapi's loader resolving it with keys present is covered only by T11 (`require.resolve` from @strapi/upload's directory lands on the package) and not by a keyed boot.

## Deviations from Plan

None to the code scope. Process notes:

- The first `yarn install` hung on network retries; a later `--prefer-offline` run succeeded (environment, not a plan change).
- The U1-U6 seed unit tests were written together with the implementation instead of watched failing first (the new exports did not exist, so they could not have passed).

## Boundaries and open items

- **Upload-time placement only.** Moving or renaming a Media Library folder afterwards does not move files already stored in ImageKit (also noted in `261024-iy3-EXPERIENCE.md`).
- **Owner key rotation still pending.** The ImageKit private key is refused (HTTP 403). No live ImageKit call and no dev Postgres write happened. The first real upload after rotation is the live check of the mirrored URLs.
- **TMDB folder (later todo).** Root/env path building is isolated in `buildBasePath` in the provider so `tiween/tmdb/` can be added as a sibling later; not implemented here.
- Folder names become part of public asset URLs (T-iy3-06, accepted, documented in `.env.example`).
- Owner-dirty files (D-09) were never touched; the worktree does not contain the owner's uncommitted edits.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model.

## Self-Check: PASSED

Files exist: provider package (3 files), all modified files committed; commits 00c4409, b39b727, 664ba2c are ancestors of HEAD; working tree clean.
