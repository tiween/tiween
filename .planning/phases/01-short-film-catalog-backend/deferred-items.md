## Deferred Items

- Other events-manager admin writes wrap the content-manager body in `{ data }`, which the server silently drops
  status: open
  **Found in:** 01-09 (boot suite `short-film-locale-save.service.test.ts` proves it on Strapi 5.51.2: a `{ data: { title } }` body to `POST`/`PUT /content-manager/collection-types/...` saves an empty document or changes nothing; the flat entity body works).
  **Fixed in 01-09 for:** the Works hooks (`createWork`, `updateWork`) only.
  **Still affected (not touched, out of 01-09 scope):** `hooks/usePeople.ts` (`createPerson`, `updatePerson`) and `components/SubEventModal/index.tsx` (event and sub-event `post`/`put` through `buildEventRequest` / `buildSubEventRequest` in `SubEventModal/validate.ts`). Their jest tests assert the `{ data }` shape against a mock, so they pass while the real request would store nothing. Needs a boot or supertest check per call site, then the same flat-body fix and test updates.

- Switching locale tabs on the Works form discards unsaved edits of the tab being left
  status: open
  **Found in:** 01-09. The default tab (`WorkForm`) and the translation tab (`LocalizedFieldsForm`) own separate react-hook-form state and unmount on switch. The operator guide tells editors to save before switching; a dirty-state confirm would remove the trap.

- `scripts/seeds/index.ts` and `scripts/seeds/clear.ts` boot Strapi with `distDir: process.cwd() + "/.build"`, which does not exist in this checkout
  status: open
  **Found in:** 01-10. Copying that boot into `seed:shorts` failed with `Cannot destructure property 'client' of 'db.config.connection' as it is undefined` (Strapi reads `config/` from `distDir`). `seed:shorts` uses `dist/` instead (what `build:test-dist` emits and what the test helper uses) and boots fine.
  **Not verified:** whether `yarn seed` / `yarn seed:clear` fail the same way on a developer machine that has a `.build` directory or a different Strapi compile output. Not touched (out of 01-10 scope). A boot check of both scripts, then the same `dist/` fix if they fail, is the follow-up.

- Genres get no `ar`/`en` rows from the import, so the Arabic and English directory shows French genre names
  status: open
  **Found in:** 01-10. `data/genres.json` carries `name_ar`, but the importer only creates the default-locale genre row (the plan asks for find-or-create of genres, not for translated rows), and the public overlay falls back to the base name. Writing the `ar` row needs the `slug` uid passed explicitly (uids are not copied to a new locale row). Decide in Phase 2 or at the 01-13 dev run whether the French fallback is acceptable at launch.
