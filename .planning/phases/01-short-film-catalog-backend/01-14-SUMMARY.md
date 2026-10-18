---
phase: 01-short-film-catalog-backend
plan: 14
subsystem: api
tags: [strapi, events-manager, zod, venue-manager, vitest, jest, nextjs]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-01 test harness and workspace verification setup"
provides:
  - "VENUE_CREATABLE_WORK_TYPES (film, play) on the events-manager server validation and the client venue schema mirror"
  - "venueWorkCreateSchema refuses type short-film with WORK_TYPE_INVALID, so POST /api/events-manager/venue/creative-works answers 400 VALIDATION_FAILED before the service runs"
  - "Client venue work dialog and venueWorkFormSchema no longer offer or accept short-film"
affects: [01-06, 01-13, venues-admin]

actuals:
  tokens: 2524
  tasks: 2
  commits: 4

plan_head_before: 3b14f4261a584514eb82c247d3389506b97e0544
plan_head_after: bf7bef6c28a0531a91b72386517857fc81c821b2

tech-stack:
  added: []
  patterns:
    - "Creatable-type allowlist (VENUE_CREATABLE_WORK_TYPES) separate from the full CREATIVE_WORK_TYPES list: write paths use the narrow list, scheduling and display keep the full list"
    - "Server is the authority, client mirror is UX only; a controller-level test proves the crafted request is refused before the service"

key-files:
  created:
    - apps/strapi/src/plugins/events-manager/server/src/validation/__tests__/venue-events.unit.test.ts
  modified:
    - apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts
    - apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/venue-events.unit.test.ts
    - apps/client/src/features/venues/schemas/venue-events.ts
    - apps/client/src/features/venues/schemas/venue-events.test.ts
    - apps/client/src/app/[locale]/venue/events/new/_components/VenueEventForm.tsx

key-decisions:
  - "CREATIVE_WORK_TYPES and KIND_BY_WORK_TYPE left untouched so venue managers can still schedule existing short films; only the create path narrows to film and play"
  - "VenueWorkCreateInput.type retyped to VenueCreatableWorkType (exported alias) rather than a bare indexed type, so the interface stays in lockstep with the schema enum"
  - "Client locale files untouched: workTypes.short-film label stays because existing short films are still displayed and scheduled"

patterns-established:
  - "Narrow create allowlist plus full read/schedule list for work types, on both server and client"

requirements-completed: [SDATA-02]

coverage:
  - id: D1
    description: "A venue manager's create-work request with type short-film is refused by the real controller with 400 VALIDATION_FAILED and an issue {path: type, message: WORK_TYPE_INVALID}; the service createCreativeWork is never called"
    requirement: SDATA-02
    verification:
      - kind: unit
        ref: "apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/venue-events.unit.test.ts#refuses a short-film create with 400 before the service runs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Venue managers can still create film and play works (201), and CREATIVE_WORK_TYPES still contains short-film so existing shorts stay schedulable (existing service suite passes unchanged)"
    requirement: SDATA-02
    verification:
      - kind: unit
        ref: "controllers/__tests__/venue-events.unit.test.ts#creates a creative work with 201 and #creates a play creative work with 201"
        status: pass
      - kind: unit
        ref: "validation/__tests__/venue-events.unit.test.ts (4 tests) and services/__tests__/venue-events.unit.test.ts (unchanged)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Client venueWorkFormSchema rejects short-film with WORK_TYPE_INVALID and accepts film and play; WORK_TYPE_FORM_VALUES excludes short-film; CREATIVE_WORK_TYPES keeps it"
    requirement: SDATA-02
    verification:
      - kind: unit
        ref: "apps/client/src/features/venues/schemas/venue-events.test.ts#venueWorkFormSchema / toVenueWorkCreatePayload (4 new tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The venue work dialog's type dropdown no longer lists Short film (VenueEventForm builds typeOptions from VENUE_CREATABLE_WORK_TYPES)"
    requirement: SDATA-02
    verification:
      - kind: other
        ref: "grep -c VENUE_CREATABLE_WORK_TYPES VenueEventForm.tsx prints 2; eslint --max-warnings=0 clean; no component render test exists for the dialog"
        status: pass
    human_judgment: true
    rationale: "The dropdown rendering itself is not asserted by a component test; the option list is derived from the tested constant, but a quick visual check of the dialog confirms no short-film entry"

duration: 12min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 14: Venue Short-Film Create Refusal Summary

**Venue managers can no longer create short-film works: `VENUE_CREATABLE_WORK_TYPES = ["film", "play"]` gates `venueWorkCreateSchema` on the server (coded 400 before the service runs) and the client venue work dialog, while scheduling existing short films is unchanged.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-18T17:25:02Z
- **Completed:** 2026-10-18T17:37:00Z
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- Server `venueWorkCreateSchema.type` now enumerates `VENUE_CREATABLE_WORK_TYPES`; a crafted `{ type: "short-film" }` body to `POST /api/events-manager/venue/creative-works` answers 400 `VALIDATION_FAILED` with issue `{ path: "type", message: "WORK_TYPE_INVALID" }`, proven at controller level with the service mock never called (T-01-18).
- Film and play creation still answer 201 (existing film case kept, new play case added); `CREATIVE_WORK_TYPES` and `KIND_BY_WORK_TYPE` untouched, and the existing venue-events service suite passes without edits.
- Client mirror: `VENUE_CREATABLE_WORK_TYPES` added, `WORK_TYPE_FORM_VALUES` built from it, `VenueEventForm` type options mapped from it; `venueWorkFormSchema` rejects short-film. `CREATIVE_WORK_TYPES` keeps serving `showtimeKindOf` and the display of existing works.

## TDD Evidence

- **RED (server, `9a86905`):** command `yarn workspace @tiween/admin jest src/plugins/events-manager/server/src/validation src/plugins/events-manager/server/src/controllers/__tests__/venue-events.unit.test.ts src/plugins/events-manager/server/src/services/__tests__/venue-events.unit.test.ts`, exit 1, `3 failed, 56 passed`. Failures: controller short-film case received status 201 where 400 was expected; schema `safeParse` of short-film returned `success: true` where `false` was expected; `VENUE_CREATABLE_WORK_TYPES is not iterable` (export absent). Semantic assessment: the target tests executed and failed on the planned assertions (short-film accepted), no syntax, import or fixture fault.
- **RED (client, `44d8c91`):** command `yarn workspace @tiween/client vitest run src/features/venues/schemas/venue-events.test.ts`, exit 1, `2 failed, 23 passed`. Failures: `venueWorkFormSchema` accepted short-film (`expected false, received true`); `VENUE_CREATABLE_WORK_TYPES is not iterable`. Semantic assessment: same, planned assertions failed for the intended reason.
- **GREEN:** `3fcff46` (server) and `bf7bef6` (client); both suites pass. No REFACTOR commit needed.
- The RED evidence was inspected semantically but not run through `gsd_run check tdd-red-evidence`, because the plan is `type: execute` (not `type: tdd`) and jest/vitest default console output is not one of the classifier's supported report formats.

## Task Commits

1. **Task 1: Server refusal (tracer)** - `9a86905` (test, RED), `3fcff46` (feat, GREEN)
2. **Task 2: Client mirror (tdd)** - `44d8c91` (test, RED), `bf7bef6` (feat, GREEN)

**Plan metadata:** committed separately after this file (docs: summary, then state and roadmap).

**Tracer gate:** Task 1 `<verify>` is automated-only and was re-run end to end after the GREEN commit (59/59 across controller, validation, service suites, plus `yarn workspace @tiween/admin lint` exit 0) before the client expansion task started. Tracer verified end-to-end, then expanded.

## Files Created/Modified

- `apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts` - adds `VENUE_CREATABLE_WORK_TYPES` and `VenueCreatableWorkType`; `venueWorkCreateSchema.type` and `VenueWorkCreateInput.type` use them
- `apps/strapi/src/plugins/events-manager/server/src/validation/__tests__/venue-events.unit.test.ts` - new: film/play accepted, short-film rejected with `WORK_TYPE_INVALID`, creatable list pinned, `CREATIVE_WORK_TYPES` keeps short-film
- `apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/venue-events.unit.test.ts` - adds play 201 case and the short-film 400 refusal case
- `apps/client/src/features/venues/schemas/venue-events.ts` - adds client `VENUE_CREATABLE_WORK_TYPES`; `WORK_TYPE_FORM_VALUES` built from it
- `apps/client/src/features/venues/schemas/venue-events.test.ts` - four new cases for the work form schema and constants
- `apps/client/src/app/[locale]/venue/events/new/_components/VenueEventForm.tsx` - `typeOptions` from `VENUE_CREATABLE_WORK_TYPES`; unused `CREATIVE_WORK_TYPES` import dropped

## Decisions Made

- Kept `CREATIVE_WORK_TYPES` and `KIND_BY_WORK_TYPE` unchanged so scheduling existing short films keeps working (plan requirement).
- Exported a `VenueCreatableWorkType` alias on the server so `VenueWorkCreateInput.type` tracks the schema enum; no behavior change.
- No locale or `apps/client/package.json` changes; the user's uncommitted `package.json` edit was left byte-identical and unstaged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The repo pre-commit hook (turbo lint across both workspaces) takes about 100 seconds per commit, so each commit exceeded the default shell timeout once and was run to completion in the background; all four commits succeeded with hooks enabled and no `--no-verify`.

## Verification

- `yarn workspace @tiween/admin jest <validation, controller, service paths>`: 3 suites, 59 tests pass.
- `yarn workspace @tiween/admin test`: 90 suites, 1349 tests pass. `yarn workspace @tiween/admin lint`: exit 0.
- `yarn workspace @tiween/client vitest run src/features/venues`: 6 files, 138 tests pass.
- `yarn workspace @tiween/client eslint <the three client files> --max-warnings=0`: exit 0. Client `tsc --noEmit` filtered to the touched files: no errors.
- Acceptance greps: server `VENUE_CREATABLE_WORK_TYPES = ["film", "play"]` count 1; controller test `"short-film"` count 1; client schema count 1; `VenueEventForm.tsx` count 2.

## Known Stubs

None.

## Threat Flags

None - no new endpoints or trust boundaries; T-01-18 mitigated as planned and T-01-SC (no dependency changes) held.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The low-privilege short-film create path is closed on server and client; 01-06's publish guard no longer has to account for venue-created shorts.
- The venue dialog dropdown is derived from the tested constant but has no render test; a one-time visual check that the dialog lists only Film and Play is cheap at phase verification.

## Self-Check: PASSED

All six touched files exist on disk; commits `9a86905`, `3fcff46`, `44d8c91`, `bf7bef6` are ancestors of HEAD.

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
