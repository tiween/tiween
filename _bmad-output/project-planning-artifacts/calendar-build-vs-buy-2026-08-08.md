# Calendar build-vs-buy audit — 2026-08-08

Prompted by the events-manager planning surface rebuild. Story 2C.3 left the
planning calendar broken; before rebuilding the integration layer on top of the
bespoke `BigCalendar`, we audited whether that component should survive.

## The decision being revisited

FullCalendar was removed deliberately, not accidentally. The rationale survives
in the retired `openspec/` tree — `openspec/changes/add-strapi-calendar-component/proposal.md`,
recoverable via `git show 2c37b78^:<path>`:

> "The current `PlanningCalendar` component relies on FullCalendar, a third-party
> library that requires extensive CSS overrides to match Strapi Design System
> styling. This creates maintenance overhead and inconsistent UX."

`design.md` quantifies the objection: **"FullCalendar requires ~350 lines of CSS
overrides (`CalendarWrapper.tsx`) to approximate Strapi DS styling."** The
proposal set a hard constraint — _"Must use Strapi DS components exclusively (no
external calendar libraries)"_ — and explicitly accepted losing month view,
drag-and-drop, resizing and recurrence visualisation as the price. It also
records that **Strapi admin runs React 18, not 19**.

`BigCalendar` (1,811 LOC, 11 files) landed in a single commit, `485ea10`
(2026-01-16), under the misleading message `style: fix Prettier formatting in
openspec entity-properties docs` — a 382-file commit. The FullCalendar-era
`PlanningCalendar`/`CalendarWrapper` never reached git; it existed only in a
working tree, so its removal is invisible in history.

**What that decision did not weigh: timezone correctness, DST, RTL, or
accessibility.** Those are exactly where the bespoke component now fails. That is
the basis for revisiting — new criteria, not a reversal of the old reasoning.

## What the bespoke component actually does

Audited against `apps/strapi/src/plugins/events-manager/admin/src/components/BigCalendar/`.

**Genuine strengths.** Clean separation across 11 files, controlled/uncontrolled
props, Strapi DS tokens and `styled-components` throughout — visual fidelity with
the admin is real, and it is the whole point of the original decision. Overlapping
events _are_ laid out side by side (`utils.ts:223` `groupOverlappingEvents`,
`utils.ts:315-317` `positionEventsForDay`), which is the hard part of a time grid.

**Load-bearing defects.**

| Defect                  | Evidence                                                                                                                                                                                                                                                                                     | Severity               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `timezone` prop is dead | Declared `types.ts:107`, threaded through every view (`types.ts:138,148,161`), **never read** — `BigCalendar.tsx:54-69` does not destructure it. Data is UTC; the grid renders browser-local.                                                                                                | High                   |
| DST misalignment        | `utils.ts:276` computes grid duration in raw ms; slots are fixed pixel heights (`types.ts:184`). Event positions (`utils.ts:285-288`) and the now-indicator (`utils.ts:353-356`) drift ~1 slot on transition days, and the shifted hour is unreachable.                                      | Medium — see below     |
| RTL unsupported         | Hard-coded physical positioning: `left: ${position.left}%` (`TimeGrid.tsx:143`, `WeekView.tsx:248`), `border-right`, `padding-right` throughout. No logical properties anywhere. The plugin registers `translations/ar.json`.                                                                | High if admin ships AR |
| No tests                | Zero test files under `BigCalendar/`, over 399 lines of pure, trivially testable date math in `utils.ts`.                                                                                                                                                                                    | High                   |
| i18n half-done          | `locale = "fr-FR"` hardcoded as the default in five signatures; `formatTime` (`utils.ts:43`) is called with no locale at all (`utils.ts:156`, `EventBlock.tsx:82-83`). UI strings are French literals: `"aujourd'hui"` (`TimeSlot.tsx:67`), `"Période précédente"` (`NavigationBar.tsx:97`). | Medium                 |
| a11y incomplete         | `role="grid"` with only gridcells and no `role="row"` is an invalid ARIA tree; no roving tabindex, so a 30-min 08:00–24:00 week grid is ~224 sequential tab stops. `WeekView` has no `role="grid"` at all.                                                                                   | Medium                 |

**DST, resized.** Tunisia abolished DST in 2009 and the product is Tunisia-first,
so the drift is near-theoretical for local admins. The UTC-versus-browser-local
gap is the real bug: it misrenders for any admin outside UTC+1.

**Missing features** (accepted as non-goals in 2026-01, still absent): month view,
agenda/list view, drag-to-move, resize, all-day row, recurrence expansion. Views
are day and week only (`types.ts:11`).

## Candidates

Filters applied: must work under React 18; must provide a day/week time grid with
custom event content and click-to-create; must not require a paid licence for
those features.

|                          | FullCalendar                                                                                                                                                                          | Schedule-X                                                      | react-big-calendar                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Licence for what we need | Standard plugins (timeGrid, dayGrid, interaction, list) are free; premium is only Timeline View, Vertical Resource View, Print Optimization ($480/dev/yr) — **none of which we need** | MIT core                                                        | MIT                                                   |
| React 18                 | Yes (supports 17–19)                                                                                                                                                                  | Yes                                                             | Yes; React 19 support was still an open issue (#2701) |
| Timezone                 | Yes, first-class                                                                                                                                                                      | Yes — v3+ built on the Temporal API                             | Partial; DST fixes appear in the changelog            |
| RTL                      | Supported                                                                                                                                                                             | Supported (added with Hebrew translations)                      | Supported, with RTL DnD fixes in changelog            |
| Maintenance              | Active                                                                                                                                                                                | Active (v4.6.0, 2026-05-12)                                     | Slower                                                |
| Strapi DS visual fit     | **The original objection: ~350 lines of overrides**                                                                                                                                   | Theming designed for customization, but still not DS components | Requires override CSS                                 |

Unverified before any adoption: whether Schedule-X's Temporal dependency needs a
polyfill (and its weight) under Strapi's admin bundler, and whether Schedule-X
has since introduced a premium tier covering anything we need.

## Decision (2026-08-08, Ayoub)

**Build on `BigCalendar`. No third-party library.** The 2026-01 constraint stands
on its merits — every candidate reintroduces the Strapi DS override problem the
component was built to escape, and the defects arguing for replacement are all
fixable in place for less than a migration costs.

**Future direction: extract `BigCalendar` into a standalone open-source project**
(fork or new repo) and enhance it there — timezone, RTL, a11y, tests, and the
missing month/agenda views — rather than adopting a library or growing it further
inside the plugin. That reframes the defects below as a roadmap for that project
rather than as plugin debt, and gives the work a home where it can be tested and
versioned on its own. Not scheduled here.

## Reasoning behind that decision

**Decouple the two questions.** The problem in front of us is that the planning
surface 404s and blocks the v1 critical path. Replacing a 1,811-LOC calendar is a
separate project with its own risk, and holding the fix hostage to it is the
wrong trade.

1. **Now:** rebuild the integration layer on `BigCalendar` as specced. Keep the
   new transform explicitly UTC-aware so the new code does not inherit the
   browser-local bug, and add the unit tests the calendar has never had — at the
   transform boundary, where they are cheap.
2. **Next, as its own story:** decide replacement on the evidence above. The
   honest read is that the 2026-01 objection still stands — every candidate
   reintroduces the CSS-override problem the bespoke component was built to
   escape — while the defects that argue _for_ replacement (tz, RTL, a11y,
   tests) are all fixable in place for less than a migration costs. Fixing
   `BigCalendar` is the lower-risk path; the strongest case for switching is
   the missing month/agenda views plus drag-to-move, if product wants them.
3. **Either way:** the defects in the table above are logged as deferred work so
   they are tracked rather than rediscovered.

Had replacement gone ahead, Schedule-X was the leading candidate on paper — MIT,
timezone-native, RTL, actively maintained — subject to the Temporal-polyfill and
premium-tier checks above. Recorded for whoever revisits this.

## Incidental finding

`rrule ^2.8.1` is a dependency of both `apps/strapi/package.json` and the
events-manager plugin's own `package.json`, added in `485ea10`, with **zero
references anywhere under `apps/strapi/src`**. It was never paired with
`@fullcalendar/rrule` (never installed). Safe to remove independently of this
decision.
