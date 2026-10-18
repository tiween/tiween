## Deferred Items

- Other events-manager admin writes wrap the content-manager body in `{ data }`, which the server silently drops
  status: open
  **Found in:** 01-09 (boot suite `short-film-locale-save.service.test.ts` proves it on Strapi 5.51.2: a `{ data: { title } }` body to `POST`/`PUT /content-manager/collection-types/...` saves an empty document or changes nothing; the flat entity body works).
  **Fixed in 01-09 for:** the Works hooks (`createWork`, `updateWork`) only.
  **Still affected (not touched, out of 01-09 scope):** `hooks/usePeople.ts` (`createPerson`, `updatePerson`) and `components/SubEventModal/index.tsx` (event and sub-event `post`/`put` through `buildEventRequest` / `buildSubEventRequest` in `SubEventModal/validate.ts`). Their jest tests assert the `{ data }` shape against a mock, so they pass while the real request would store nothing. Needs a boot or supertest check per call site, then the same flat-body fix and test updates.

- Switching locale tabs on the Works form discards unsaved edits of the tab being left
  status: open
  **Found in:** 01-09. The default tab (`WorkForm`) and the translation tab (`LocalizedFieldsForm`) own separate react-hook-form state and unmount on switch. The operator guide tells editors to save before switching; a dirty-state confirm would remove the trap.
