---
phase: 01-short-film-catalog-backend
plan: 07
subsystem: admin-ui
tags:
  [
    strapi,
    admin,
    react-router,
    media-library,
    upload,
    jest,
    jsdom,
    events-manager,
  ]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-01 boot harness and A13 finding (upload plugin enabled, provider resolves to local without ImageKit keys)"
provides:
  - "Events Manager routes works, works/new, works/:documentId, works/:documentId/edit rendering the existing Works list and Work form pages"
  - "Side-nav Works entry with events-manager.sidenav.works in en, fr, ar"
  - "MediaInput backed by Strapi's media-library dialog (real upload rows), exported toMediaAsset"
  - "useStrapiApp stand-in in the admin jest mock"
affects: [01-08, 01-09, 01-13]

actuals:
  tokens: 9060
  tasks: 2
  commits: 3

plan_head_before: 4bae97f499cb37b1f114dac36d108ec2428eef16
plan_head_after: 48c52c1463316e19ef41a0cf9fcc52a4f18e6c52

tech-stack:
  added: []
  patterns:
    - "Read a registered admin component with useStrapiApp(name, selector) and components[key]; render nothing but a disabled control when absent"
    - "Admin jsdom test injects a fake registered component through the useStrapiApp mock"

key-files:
  created:
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorksRouting.test.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/MediaInput.test.tsx
  modified:
    - apps/strapi/src/plugins/events-manager/admin/src/pages/App.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/SideNav/index.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/translations/en.json
    - apps/strapi/src/plugins/events-manager/admin/src/translations/fr.json
    - apps/strapi/src/plugins/events-manager/admin/src/translations/ar.json
    - apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx
    - apps/strapi/tests/__mocks__/strapi-admin.ts

key-decisions:
  - "Multiple-mode removal passes the filtered array (possibly empty) to onChange, per the plan's behavior bullet; WorkForm's photos handler already normalizes to an array"
  - "Single-mode disabled/removal controls stay rendered and disabled rather than hidden, so the disabled state is visible and testable"
  - "Catalog keys media.add/replace/remove/unavailable ship as useCatalogT defaults only (no catalog keys exist in the translation files today)"

patterns-established:
  - "Styling without inline style props: styled-components wrappers over Design System Box/Flex (strapi-ui-design hook rejects inline styles and native buttons, including in tests)"

requirements-completed: [SDATA-02, FR57]

coverage:
  - id: D1
    description: "Works list and Work form pages are routed (works, works/new, works/:documentId, works/:documentId/edit) and the catch-all still redirects to the dashboard"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorksRouting.test.tsx (5 routing tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Side navigation lists Works, translated in en, fr and ar"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "WorksRouting.test.tsx#lists Works and #defines events-manager.sidenav.works in en|fr|ar"
        status: pass
    human_judgment: false
  - id: D3
    description: "MediaInput selects assets through the media-library dialog, keeping real id/url/formats; single takes the first asset, multiple appends de-duplicated by id; remove, allowedTypes, disabled, missing-dialog fallback; URL-paste and fabricated id are gone"
    requirement: FR57
    verification:
      - kind: unit
        ref: "apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/MediaInput.test.tsx (14 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real upload through the live media-library dialog in a running admin: poster saved, visible after reload, present in the Media Library, and served from ik.imagekit.io when IMAGEKIT_* is set"
    requirement: FR57
    verification: []
    human_judgment: true
    rationale: "Needs a running admin in a real browser (the real dialog is a lazily-loaded admin bundle that jsdom cannot host) and, for the ImageKit host, environment credentials; not executed in this run"

duration: 17min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 07: Works Routes and Media-Library MediaInput Summary

**The existing Works list and form pages are now routed and linked from the Events Manager side nav (en/fr/ar), and MediaInput is rewritten onto Strapi's own `media-library` dialog so poster, backdrop and photos hold real upload rows instead of URL-pasted stubs with fabricated timestamp ids.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-10-18T17:00:28Z
- **Completed:** 2026-10-18T17:17:39Z
- **Tasks:** 2 (3 task commits: tracer, RED, GREEN)
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- `WorksListPage` and `WorkFormPage` render at `works`, `works/new`, `works/:documentId` and `works/:documentId/edit` inside the existing `PluginLayout`; unknown paths still redirect to the dashboard.
- Works appears in the side navigation after Planning, with `events-manager.sidenav.works` defined as "Works" / "Œuvres" / "الأعمال".
- `MediaInput` reads `components["media-library"]` via `useStrapiApp` (the registration `@strapi/upload` makes), maps results through the exported pure `toMediaAsset`, and has no URL input and no `Date.now()` id.
- Admin gate: `yarn workspace @tiween/admin test` passes with 89 suites and 1342 tests (was 84 and 1244 after 01-01); `yarn workspace @tiween/admin lint` exits 0.

## Task Commits

1. **Task 1: Works routes, side-nav item, translations, routing test (tracer)** - `aa12e26` (feat)
2. **Task 2 RED: failing MediaInput tests plus `useStrapiApp` mock** - `a551714` (test)
3. **Task 2 GREEN: media-library-backed MediaInput** - `48c52c1` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Tracer feedback gate

Task 1 is `type="tracer"` with an `<automated>`-only verify. After its commit the routing suite was re-run (9 of 9 passing) before expansion, so the gate passed without a checkpoint.

## TDD Gate Compliance

- **RED** (`a551714`): `MediaInput.test.tsx` run against the old URL-paste stub: 14 failed, 14 total. Failures are on the planned behaviors: no button matching add/replace/remove (the stub had Aucune/Sélectionner labels), `toMediaAsset` is not a function, no disabled/unavailable message, and the URL form appearing once the add control is pressed. One test (the "no URL input" check) initially passed against the stub because the URL form only mounts after a click; it was strengthened to press the add control first and then failed as intended. The `gsd_run check tdd-red-evidence` classifier has no jest adapter (supported report formats are TAP, JUnit XML, swift-testing, unittest), so RED was assessed semantically from the verbose jest output rather than machine-classified.
- **GREEN** (`48c52c1`): same file, 14 passed, 14 total.
- **REFACTOR:** none needed.

## Files Created/Modified

- `apps/strapi/src/plugins/events-manager/admin/src/pages/App.tsx` - four Works routes before the catch-all
- `apps/strapi/src/plugins/events-manager/admin/src/components/SideNav/index.tsx` - `works` nav entry
- `apps/strapi/src/plugins/events-manager/admin/src/translations/{en,fr,ar}.json` - `events-manager.sidenav.works`
- `apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx` - media-library-backed input; `MediaAsset` and props unchanged, `toMediaAsset` and `MediaLibraryFile` added
- `apps/strapi/tests/__mocks__/strapi-admin.ts` - `useStrapiApp` stand-in (empty `components` by default)
- `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorksRouting.test.tsx` - routing, nav and translation tests
- `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/MediaInput.test.tsx` - media input behavior tests with an injected fake dialog

## Decisions Made

- Multiple-mode removal passes the filtered array (possibly empty) rather than `null`, as the plan's behavior bullet states; WorkForm's photos handler already turns any value into an array.
- Disabled and remove controls stay visible and disabled instead of being hidden, so the state is observable.
- The new catalog keys (`media.add`, `media.replace`, `media.remove`, `media.unavailable`) live as `useCatalogT` defaults only, consistent with every other catalog key (no `events-manager.catalog.*` entries exist in the translation files).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's verify command swallows the test path**

- **Found during:** Task 1 verification
- **Issue:** `jest --selectProjects admin <path>` treats the path as a second project name, so the whole admin project runs and the path filter is ignored.
- **Fix:** Ran `jest <path> --selectProjects admin` (path first) for focused runs; ran the full `yarn workspace @tiween/admin test` for the plan-level gate. No plan file edited.
- **Verification:** Focused runs report exactly the target suite; full run green.
- **Committed in:** n/a (command-level only)

**2. [Rule 1 - Bug] Test assertions wrong for the Design System and for the missing-dialog case**

- **Found during:** Task 2 GREEN
- **Issue:** The RED tests asserted `toBeDisabled()`, but the Design System marks disabled buttons with `aria-disabled="true"` and leaves the native attribute off. Separately, `registerDialog(undefined)` fell into the default parameter and registered the fake dialog, so the "not registered" test never exercised the fallback.
- **Fix:** Assert `aria-disabled="true"`; pass `null` to simulate an unregistered dialog.
- **Files modified:** `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/MediaInput.test.tsx`
- **Verification:** 14 of 14 pass; both tests fail against a component that does not disable or message.
- **Committed in:** `48c52c1`

**3. [Rule 3 - Blocking] strapi-ui-design hook rejects inline `style` props and native `<button>`**

- **Found during:** Task 2 (writing the component and test)
- **Issue:** The original component used inline `style={{...}}`; the project hook blocks both that and native buttons, including in the test's fake dialog.
- **Fix:** Used styled-components wrappers over Design System `Box`/`Flex` (`EmptyFrame`, `AssetFrame`, `AssetImage`, `RemoveSlot`) and Design System `Button` in the fake dialog.
- **Files modified:** `MediaInput/index.tsx`, `MediaInput.test.tsx`
- **Verification:** Lint exits 0; tests pass.
- **Committed in:** `a551714`, `48c52c1`

**4. [Rule 1 - Bug] Weak "no URL input" test**

- **Found during:** Task 2 RED
- **Issue:** The assertion passed against the old stub because the URL form only mounts after the add control is clicked.
- **Fix:** Press the add control before asserting no `url` text and no textbox.
- **Committed in:** `a551714`

---

**Total deviations:** 4 auto-fixed (2 bug, 2 blocking)
**Impact on plan:** No scope change; all fixes were needed for correct, enforceable tests and for hook compliance.

## Issues Encountered

- The WorksRouting test stubs the Dashboard, Planning, Import pages and the WorkForm component, because those pull in calendar and picker machinery that jsdom cannot host; routing is asserted at the page-selection level. The real WorkForm still has its own coverage and was not changed.
- The plan listed `WorkForm/index.tsx` as read-only context; its poster/backdrop/photos handlers needed no change (single inputs unwrap arrays, photos normalizes to an array).

## Human-check (not executed)

**Real upload through the media library: NOT verified in this run.** It needs a running admin in a browser. To do: `yarn workspace @tiween/admin develop` (Docker up), open Events Manager, Works, Add a work, press the poster's "Add from media library" control, upload a new image in the dialog and select it, then save as draft. Expected: the saved work shows the poster after reload, the image appears in the Media Library, and with `IMAGEKIT_*` set in `apps/strapi/.env` the asset URL host is `ik.imagekit.io` (otherwise files land in local `public/uploads`). Record which provider served the file. The jsdom tests prove the contract against a fake dialog (real `id`, `url`, `formats` pass through, no invented id) but not the live dialog's integration or the provider.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. The "media library is unavailable" message is a deliberate fallback, not a stub.

## Threat Flags

None. No new endpoint, auth path or dependency (T-01-SC: lockfile and manifests untouched). T-01-21 mitigated: assets come only from the media-library dialog, the fabricated id path is deleted, and a jsdom test asserts no URL input after opening the control. T-01-22 and T-01-23 are transferred or accepted as planned.

## Next Phase Readiness

- 01-08 (new short-film fields) and 01-09 (locale tabs, publish bar) have a reachable form with real uploads.
- Open: the live-dialog upload human-check above, and the FR57 provider question (ImageKit only when keys are set), which the 01-13 dev import should also record.

## Self-Check: PASSED

- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/**tests**/WorksRouting.test.tsx
- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/**tests**/MediaInput.test.tsx
- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx
- FOUND commits aa12e26, a551714, 48c52c1
- Acceptance criteria re-run: route grep prints 4; translation node check exits 0; `Date.now` count 0; `"media-library"` count 1; `useStrapiApp` in mock count 2; admin test 89 suites / 1342 tests passed; admin lint exit 0.

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
