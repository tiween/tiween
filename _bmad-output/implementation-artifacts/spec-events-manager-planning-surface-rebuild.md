---
title: "Events-manager planning surface rebuild (post-2C.3)"
type: "bugfix"
created: "2026-08-08"
status: "ready-for-dev"
review_loop_iteration: 0
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/calendar-build-vs-buy-2026-08-08.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2C.3 deleted `plugin::events-manager.showtime` and replaced it with two heterogeneous types, `screening` (film) and `performance` (theatre), but the plugin's planning surface was never retargeted — `PlanningCalendarNew`, `EventEditModal`, `EventCreationModal` and `hooks/useShowtimes.ts` all still call the dead UID, so every request 404s. The surface is reachable from `pages/Planning/index.tsx:158` and `PlanningTab.tsx:95`, and the MVP critical path depends on it for showtime entry.

**Approach:** Rebuild only the integration layer above the healthy, UID-agnostic `BigCalendar`. The calendar fetches both collections in parallel and merges them client-side into one time grid, each block badged by kind. One modal serves create and edit, rendering shared fields always and swapping the kind-specific block on a `kind` discriminator.

## Boundaries & Constraints

**Always:**

- House data-hook pattern: `useFetchClient()` from `@strapi/strapi/admin`, `useState`/`useEffect`, module-level UID constants + `cmUrl` helper. Reuse `Pagination` (`hooks/useVenuesEnhanced.ts:84`) and the sub-event UIDs already declared at `useVenuesEnhanced.ts:18-21`.
- Populate arrays live in a dependency-free module (pattern: `hooks/workPopulate.ts`) so `*.unit.test.ts` can import them without loading the ESM-only `@strapi/strapi/admin`.
- Validation is a **pure function in a sibling `validate.ts`** returning an errors object, empty = submittable. Precedent: `components/VenueFormModal/validate.ts`.
- Filter by venue through the event: `filters: { event: { venue: { id: venueId } } }`. Neither sub-event type has a direct `venue` relation.
- The work picker must constrain `creative-work.type` per kind — screening → `film`/`short-film`, performance → `play`. The lifecycle guard `assertSubEventWorkKind` (wired in `server/src/bootstrap.ts`) throws `ValidationError` otherwise.
- New strings go through a `usePlanningT()` helper mirroring `components/Catalog/i18n.ts:11-19`, prefix `events-manager.planning.`, inline default messages.
- **Convert UTC → local explicitly in `subEventTransform.ts`**, and unit-test it. `BigCalendar`'s `timezone` prop is declared but never read (`types.ts:107` vs `BigCalendar.tsx:54-69`) — passing it does nothing.

**Ask First:**

- If a week window needs more than the two parallel `pageSize: 500` fetches, a server-side union endpoint is required — an API change, not a UI change. Halt.
- Any edit to `screening` / `performance` / `event` `schema.json`.

**Never:**

- No ticketing UI. `ticketTiers`, `ticketsAvailable`, `ticketsSold` stay out of the modal — v1 is aggregation-only per the 2026-08-06 rescope, purchase surfaces gated by story 3-12. `price` may show as informational.
- No recurrence UI. `parentShowtimeId` no longer exists; the old "all occurrences" delete branch (`EventEditModal:105-110`) is not reinstated.
- Do not resurrect `hooks/useShowtimes.ts` — zero call sites, deleted.
- No react-query, no new content type, no schema edits, no change to `BigCalendar`'s public props.
- Do not fix `BigCalendar`'s own defects (DST, RTL, French strings, a11y roles) — audited and deferred. The kind badge in `EventBlock.tsx` is the only edit inside `BigCalendar/`.

## I/O & Edge-Case Matrix

| Scenario            | Input / State                              | Expected Output / Behavior                                                     | Error Handling                                                                                |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Mixed week          | 2 screenings + 1 performance in range      | All 3 on one grid, sorted by `startDateTime`, badged by kind                   | N/A                                                                                           |
| Create, either kind | Kind + a work of the matching type + start | `POST` to the collection for that kind, with `movie` or `play` set accordingly | Field errors block submit                                                                     |
| Kind/work mismatch  | Kind=screening, work of type `play`        | Rejected before the request                                                    | Picker filters by type; if the server still 400s, surface `ValidationError` on the work field |
| Edit / delete       | Click a performance block                  | `PUT`/`DELETE` to `…performance/{documentId}` — never the screening collection | Kind read from `extendedProps.kind`; delete needs confirm                                     |
| One fetch fails     | Screenings resolve, performances 500       | Render the kind that succeeded, show a non-blocking error                      | Never blank the whole calendar on partial failure                                             |
| Empty range         | No sub-events in window                    | Empty grid with empty-state message                                            | N/A                                                                                           |

</frozen-after-approval>

## Code Map

**Rebuild — these target the dead UID:**

- `admin/src/components/PlanningCalendarNew/index.tsx` — inline fetch `:172-175`; dead fields `:81` `datetime`, `:82` `event.creativeWork.duration`, `:92`/`:99` `parentShowtimeId`, `:98` `format`, `:152` direct `venue`. Owns both modals via `useReducer` `:44-68`; refetch is a `setCurrentDate` nudge `:218-232`. Consumers pass only `venueId` + `eventGroupId`.
- `admin/src/components/EventCreationModal/index.tsx` — two sequential POSTs `:70-118`. The event POST `:82-93` stays valid (event _does_ have `venue`); the showtime POST `:98-111` does not.
- `admin/src/components/EventEditModal/index.tsx` — `PUT` `:79-90`, `DELETE` `:101-110`; takes `showtime: ShowtimeWithEvent`.
- `admin/src/hooks/useShowtimes.ts` — **delete**. Only `ShowtimeWithEvent` (`:18-29`) is imported, type-only, by the calendar `:14` and edit modal `:18`.

**Reuse verbatim:** `BigCalendar/` (props `types.ts:76-115`; event shape `types.ts:14-25` carries `extendedProps` + `color`; colour resolved `EventBlock.tsx:66-67`) · `hooks/useCreativeWorks.ts` (hook shape `:183`/`:247`/`:285`, fetch `:196-237`) · `WorkForm/` (kind-switch precedent: `watch("type")` branch `index.tsx:108-110`,`:420-426`; `superRefine`; payload nulls the inactive branch `schema.ts:391`) · `VenueFormModal/` (modal + `validate.ts` + `validate.unit.test.ts`).

**Read-only contract** — `server/src/content-types/`:

- Common to both: `order`, `startDateTime`, `audioLanguage`, `price`, `event`, `features`. Screening-only: `videoFormat` (`standard|threeD|imax|fourDX|format70mm`), `subtitleLanguage`, `movie`. Performance-only: `surtitleLanguage`, `play`. Nothing is required; mind `subtitleLanguage` vs `surtitleLanguage`.
- `sub-event-work-kind.ts` — `SCREENING_UID`, `PERFORMANCE_UID`, `WORK_KIND_RULES`.

## Tasks & Acceptance

**Execution:**

- [ ] `admin/src/hooks/subEventPopulate.ts` — new; UID constants, shared populate list (`event`, `event.venue`, `movie`, `play`), `SubEventKind` type. Dependency-free for unit tests.
- [ ] `admin/src/hooks/subEventTransform.ts` + `.unit.test.ts` — new; pure normalise/merge/sort plus the `→ CalendarEvent` mapping (kind into `extendedProps`, colour per kind). Covers the mixed-week, empty-range and partial-failure rows.
- [ ] `admin/src/hooks/useSubEvents.ts` — new; both collections in parallel for a date range + venue, normalised, merged, sorted. Returns `{ subEvents, isLoading, error, partialError, refetch }`. Delete `useShowtimes.ts`.
- [ ] `admin/src/components/PlanningCalendarNew/index.tsx` — rewrite the data layer onto `useSubEvents`; drop recurrence handling; route `onEventClick` by `extendedProps.kind`. Keep the reducer and refetch nudge.
- [ ] `admin/src/components/BigCalendar/EventBlock.tsx` — optional kind badge from `extendedProps.kind`; no public prop change.
- [ ] `admin/src/components/SubEventModal/{index.tsx,validate.ts,validate.unit.test.ts}` — new; one modal for create and edit. Kind selector, shared fields, kind-specific block. `validate.ts` covers the kind/work-type rule.
- [ ] `admin/src/components/{EventCreationModal,EventEditModal}/` — delete both; port the event-creation POST (`EventCreationModal:82-93`) into the new modal's create path.
- [ ] `admin/src/components/__tests__/EventCreationModal.test.tsx` — replace with `SubEventModal.test.tsx`; the assertion on `"Search and select a movie to configure the showtime"` (`:79`,`:106`) no longer applies.
- [ ] `admin/src/translations/{en,fr,ar}.json` — add the `events-manager.planning.*` keys.

**Acceptance Criteria:**

- Given a venue with both kinds scheduled in the visible week, when the Planning page loads, then no request targets `plugin::events-manager.showtime` and the grid shows both.
- Given a block on the grid, when clicked, then the modal opens in edit mode against the collection matching its kind.
- Given `admin/src/` is grepped after this change, then zero references to `showtime`, `parentShowtimeId`, `premiere`, or a direct sub-event `venue` relation remain.

## Design Notes

**Prior art, audited 2026-08-08.** Reusing `BigCalendar` is a decision, not an assumption: FullCalendar was removed here deliberately (~350 lines of CSS to approximate Strapi DS), and every current candidate reintroduces that problem. Evidence and the decision are in the doc under `context`.

Two collections, no server union — `useSubEvents` issues both `GET`s with `Promise.allSettled`, so one failure degrades to a partial render instead of an empty calendar. Hence the distinct `partialError`.

Normalise once, at the boundary:

```ts
type SubEvent = {
  kind: "screening" | "performance"
  documentId: string
  startDateTime: string | null
  work: { documentId: string; title: string } | null // movie | play
  event: { documentId: string; title: string; venue?: { id: number } } | null
}
```

Everything downstream — sorting, calendar mapping, the edit modal — reads `kind` and never re-inspects which collection a row came from.

## Verification

**Commands:**

- `yarn workspace @tiween/admin test` — both Jest projects pass; new `*.unit.test.ts` under `server`, `SubEventModal.test.tsx` under `admin`.
- `yarn workspace @tiween/admin lint` — clean at `--max-warnings=0`.
- `grep -rn "events-manager.showtime\|parentShowtimeId" apps/strapi/src/plugins/events-manager/admin/src/` — no matches.

**Manual checks:**

- `type-check` does **not** cover this code: `apps/strapi/tsconfig.json` excludes `src/plugins/**/admin/**` and ts-jest runs `diagnostics: false`. Neither gate catches type errors here — read the new files for type correctness rather than trusting a green run.
- Boot Strapi, open Planning for a venue with both kinds scheduled: mixed grid renders, create works per kind, editing a performance does not write to the screening collection.
