---
title: "Events-manager planning surface rebuild (post-2C.3)"
type: "bugfix"
created: "2026-08-08"
status: "done"
review_loop_iteration: 1
baseline_commit: "740dbbb9d6ca73810c99534bdd56c8db38636f8b"
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
- **Publish on save.** `screening`, `performance` and `event` all have `draftAndPublish: true`, so a plain `POST`/`PUT` leaves the row a draft that never reaches the public API — invisible to the aggregation site while looking correct in the admin calendar, which reads drafts. After a successful create or update, publish both the sub-event and (on create) its container event via `POST {cmUrl(UID)}/{documentId}/actions/publish`, following the existing pattern at `hooks/useCreativeWorks.ts:399`. A failed publish must surface, not pass silently. (Added 2026-08-08 — human decision, see Spec Change Log.)

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

| Scenario            | Input / State                                | Expected Output / Behavior                                                     | Error Handling                                                                                |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Mixed week          | 2 screenings + 1 performance in range        | All 3 on one grid, sorted by `startDateTime`, badged by kind                   | N/A                                                                                           |
| Create, either kind | Kind + a work of the matching type + start   | `POST` to the collection for that kind, with `movie` or `play` set accordingly | Field errors block submit                                                                     |
| Kind/work mismatch  | Kind=screening, work of type `play`          | Rejected before the request                                                    | Picker filters by type; if the server still 400s, surface `ValidationError` on the work field |
| Edit / delete       | Click a performance block                    | `PUT`/`DELETE` to `…performance/{documentId}` — never the screening collection | Kind read from `extendedProps.kind`; delete needs confirm                                     |
| One fetch fails     | Screenings resolve, performances 500         | Render the kind that succeeded, show a non-blocking error                      | Never blank the whole calendar on partial failure                                             |
| Empty range         | No sub-events in window                      | Empty grid with empty-state message                                            | N/A                                                                                           |
| Publish on save     | Create a screening, then read the public API | Sub-event and container event are published, not drafts                        | A failed publish surfaces an error; never report success on an unpublished row                |

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

- [x] `admin/src/hooks/subEventPopulate.ts` — new; UID constants, shared populate list (`event`, `event.venue`, `movie`, `play`), `SubEventKind` type. Dependency-free for unit tests.
- [x] `admin/src/hooks/subEventTransform.ts` + `.unit.test.ts` — new; pure normalise/merge/sort plus the `→ CalendarEvent` mapping (kind into `extendedProps`, colour per kind). Covers the mixed-week, empty-range and partial-failure rows.
- [x] `admin/src/hooks/useSubEvents.ts` — new; both collections in parallel for a date range + venue, normalised, merged, sorted. Returns `{ subEvents, isLoading, error, partialError, refetch }`. Delete `useShowtimes.ts`.
- [x] `admin/src/components/PlanningCalendarNew/index.tsx` — rewrite the data layer onto `useSubEvents`; drop recurrence handling; route `onEventClick` by `extendedProps.kind`. Keep the reducer and refetch nudge.
- [x] `admin/src/components/BigCalendar/EventBlock.tsx` — optional kind badge from `extendedProps.kind`; no public prop change.
- [x] `admin/src/components/SubEventModal/{index.tsx,validate.ts,validate.unit.test.ts}` — new; one modal for create and edit. Kind selector, shared fields, kind-specific block. `validate.ts` covers the kind/work-type rule.
- [x] `admin/src/components/{EventCreationModal,EventEditModal}/` — delete both; port the event-creation POST (`EventCreationModal:82-93`) into the new modal's create path.
- [x] `admin/src/components/__tests__/EventCreationModal.test.tsx` — replace with `SubEventModal.test.tsx`; the assertion on `"Search and select a movie to configure the showtime"` (`:79`,`:106`) no longer applies.
- [x] `admin/src/translations/{en,fr,ar}.json` — add the `events-manager.planning.*` keys.

**Acceptance Criteria:**

- Given a venue with both kinds scheduled in the visible week, when the Planning page loads, then no request targets `plugin::events-manager.showtime` and the grid shows both.
- Given a block on the grid, when clicked, then the modal opens in edit mode against the collection matching its kind.
- Given `admin/src/` is grepped after this change, then zero references to `showtime`, `parentShowtimeId`, `premiere`, or a direct sub-event `venue` relation remain.

## Spec Change Log

### 2026-08-08 — iteration 1 — publish semantics were never captured

**Triggering finding.** Review found that `screening`, `performance` and `event` all carry `draftAndPublish: true` and that no code path in the new surface publishes anything. Every showing created through the planning calendar stayed a draft: correct-looking in the admin (the calendar reads drafts) and absent from the public API, which is the entire point of the v1 aggregation directory. The plugin already had the pattern — `hooks/useCreativeWorks.ts:399` and `hooks/usePeople.ts:181` both `POST …/actions/publish` — so this was an omission, not a missing capability.

**Why it was an intent gap, not a bad spec.** Two readings were defensible: publish immediately, or keep drafts behind an explicit publish affordance like Works and People. Nothing in the captured intent chose between them, so it could not be inferred.

**Amendment.** Human chose publish-on-save (2026-08-08). Added a publish rule to Boundaries → Always, and a matrix row pinning it. The frozen block was amended under its own renegotiation clause.

**Known-bad state avoided.** A planning surface that reports success while writing rows the public site can never see — a failure mode invisible from inside the admin, so it would likely have reached production undetected.

**Deviation from process, recorded deliberately.** The workflow prescribes reverting the code on an intent gap and re-deriving. The human chose to patch forward, on the grounds that the gap is purely additive — nothing already built becomes wrong — and the implementation was uncommitted, making a revert unrecoverable.

**KEEP — must survive any future re-derivation:**

- `buildSubEventRequest` deciding target collection _and_ work field in one function. Splitting that decision is exactly how the pre-2C.3 surface could write a play into the film collection.
- Explicit UTC parsing in `subEventTransform` (`parseUtcToLocal`), anchoring designator-less datetimes to UTC rather than local.
- `Promise.allSettled` partial degradation in `useSubEvents`, plus the `runIdRef` stale-run guard for fast calendar paging.
- Page overflow surfaced through `partialError` instead of silently truncating.
- The kind badge label passed through `extendedProps` rather than hardcoded in `BigCalendar`, keeping it UID-agnostic and free of new French literals.

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

## Suggested Review Order

**The kind decision — start here**

- One function decides both target collection and work field; splitting them is how a play reached the film collection pre-2C.3.
  [`validate.ts:227`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/validate.ts#L227)

- Client mirror of the server's `WORK_KIND_RULES`; keeps the picker from offering what the lifecycle guard would reject.
  [`subEventPopulate.ts:48`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/subEventPopulate.ts#L48)

- Per-kind populate: sending `play` to the screening collection is a content-manager 400.
  [`subEventPopulate.ts:80`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/subEventPopulate.ts#L80)

**Merging two collections into one grid**

- No server union exists, so both collections are fetched and merged here.
  [`useSubEvents.ts:136`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/useSubEvents.ts#L136)

- Venue reaches the sub-event only through the parent event; `$lt` keeps the week boundary from double-counting.
  [`useSubEvents.ts:126`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/useSubEvents.ts#L126)

- Stale-run guard: the user can page the calendar faster than two requests resolve.
  [`useSubEvents.ts:100`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/useSubEvents.ts#L100)

- Normalise once at the boundary so nothing downstream re-inspects which collection a row came from.
  [`subEventTransform.ts:216`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/subEventTransform.ts#L216)

**Timezone — the audit's finding**

- `BigCalendar`'s `timezone` prop is dead, so UTC is anchored explicitly here instead.
  [`subEventTransform.ts:119`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/subEventTransform.ts#L119)

**The write path — highest risk**

- Publish after write: `draftAndPublish` means an unpublished row is invisible to the public API.
  [`index.tsx:339`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/index.tsx#L339)

- Create writes two rows; a failed second write rolls the first back rather than orphaning it.
  [`index.tsx:344`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/index.tsx#L344)

- Retry resumes at the publish step, so a failed publish cannot duplicate the showing.
  [`index.tsx:210`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/index.tsx#L210)

- Throws rather than guessing: a numeric id where a v5 documentId belongs links the wrong venue.
  [`index.tsx:310`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/index.tsx#L310)

**UI binding**

- Click routing reads the kind off the block, so edits return to the collection they came from.
  [`PlanningCalendarNew/index.tsx:133`](../../apps/strapi/src/plugins/events-manager/admin/src/components/PlanningCalendarNew/index.tsx#L133)

- Partial failure warns above the grid instead of blanking the week.
  [`PlanningCalendarNew/index.tsx:165`](../../apps/strapi/src/plugins/events-manager/admin/src/components/PlanningCalendarNew/index.tsx#L165)

- Badge label arrives pre-translated through `extendedProps`, keeping `BigCalendar` generic and French-literal-free.
  [`EventBlock.tsx:107`](../../apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/EventBlock.tsx#L107)

**Validation and i18n**

- Returns error codes, not prose — a pure module cannot call a hook, and codes are the house rule.
  [`validate.ts:95`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/validate.ts#L95)

**Tests**

- The hook's contract: request shape per kind, and the three-way resolved/degraded/failed outcome.
  [`useSubEvents.test.tsx:1`](../../apps/strapi/src/plugins/events-manager/admin/src/hooks/useSubEvents.test.tsx#L1)

- Pins that create targets the right collection with the right work field, and publishes.
  [`validate.unit.test.ts:1`](../../apps/strapi/src/plugins/events-manager/admin/src/components/SubEventModal/validate.unit.test.ts#L1)

- End-to-end through the real modal: rollback, venue-resolution failure, publish failure, retry.
  [`SubEventModal.test.tsx:1`](../../apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/SubEventModal.test.tsx#L1)

- Refetch after save — nothing else refreshes the grid now the date-churn nudge is gone.
  [`PlanningCalendarNew.test.tsx:1`](../../apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/PlanningCalendarNew.test.tsx#L1)
