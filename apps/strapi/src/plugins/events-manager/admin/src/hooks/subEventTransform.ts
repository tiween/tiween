/**
 * Pure normalise / merge / map layer between the two sub-event collections and
 * the calendar grid.
 *
 * `screening` and `performance` are heterogeneous (`movie` vs `play`,
 * `subtitleLanguage` vs `surtitleLanguage`, `videoFormat` on the film side
 * only). They are normalised ONCE here, at the boundary; everything downstream
 * — sorting, the calendar mapping, the edit modal — reads `kind` and never
 * re-inspects which collection a row came from.
 *
 * No React and no `@strapi/strapi/admin` import, so `subEventTransform.unit.test.ts`
 * can exercise it under the node jest project. `BigCalendar/utils` is safe to
 * pull in: it is pure date/colour maths with a type-only import of its own.
 */
import type { CalendarEvent } from "../components/BigCalendar/types"
import type { SubEventKind } from "./subEventPopulate"

import { getContrastColor } from "../components/BigCalendar/utils"
import { SUB_EVENT_WORK_FIELD } from "./subEventPopulate"

/** Fallback block length when the linked work carries no duration, in minutes. */
export const DEFAULT_DURATION_MINUTES = 120

/** Block colour per kind — the grid is mixed, so kind must be readable at a glance. */
export const KIND_COLORS: Record<SubEventKind, string> = {
  screening: "hsl(211, 65%, 45%)",
  performance: "hsl(291, 55%, 45%)",
}

/** A creative-work as returned under `movie` / `play`. */
export interface RawWorkRef {
  id?: number
  documentId?: string
  title?: string
  type?: string | null
  duration?: number | null
}

/** The parent event as returned under `event`. */
export interface RawEventRef {
  id?: number
  documentId?: string
  title?: string
  venue?: { id?: number; documentId?: string; name?: string } | null
}

/** A row exactly as the content-manager returns it, before normalisation. */
export interface RawSubEvent {
  id?: number
  documentId?: string
  order?: number | null
  startDateTime?: string | null
  price?: number | string | null
  audioLanguage?: string | null
  /** screening only */
  subtitleLanguage?: string | null
  /** screening only */
  videoFormat?: string | null
  /** performance only */
  surtitleLanguage?: string | null
  /** screening only */
  movie?: RawWorkRef | null
  /** performance only */
  play?: RawWorkRef | null
  event?: RawEventRef | null
}

/** The one shape the whole planning surface reads. */
export interface SubEvent {
  kind: SubEventKind
  id: number | string
  documentId: string
  /** Raw ISO instant as stored, or `null` when unscheduled. */
  startDateTime: string | null
  /** `startDateTime` resolved to a local-time `Date`, or `null`. */
  start: Date | null
  order: number | null
  price: number | null
  audioLanguage: string | null
  subtitleLanguage: string | null
  surtitleLanguage: string | null
  videoFormat: string | null
  work: {
    documentId: string
    title: string
    type: string | null
    duration: number | null
  } | null
  event: {
    documentId: string
    title: string
    venue?: { id?: number; documentId?: string } | null
  } | null
}

// Fractional seconds are `\d{1,9}`, not `\d{1,3}`: Postgres returns microsecond
// precision (`…:00.123456Z`). A 3-digit cap made those values fall through to
// the `new Date()` fallback, which reads a designator-less string as LOCAL —
// the exact shift this function exists to prevent, on the most common source.
const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?(Z|z|[+-]\d{2}:?\d{2})?$/

/**
 * Parse a stored datetime into a `Date` that renders in the browser's local
 * time.
 *
 * Done explicitly rather than leaning on the calendar: `BigCalendarProps` still
 * declares a `timezone` prop, but `BigCalendar.tsx` never reads it, so passing
 * one has no effect — the grid positions blocks with local `getHours()`. What
 * matters is therefore only that the *instant* is right, and the one hazard is
 * a value that arrives without a timezone designator (Strapi returns
 * `2026-08-08T20:00:00.000Z`, but a hand-written or driver-formatted value can
 * come back bare). A bare value is UTC by contract — `new Date("…T20:00:00")`
 * would instead read it as local and silently shift the block by the offset, so
 * it is anchored to UTC here.
 *
 * Returns `null` for empty or unparseable input rather than an `Invalid Date`.
 */
export function parseUtcToLocal(value: string | null | undefined): Date | null {
  if (!value) return null

  const match = ISO_RE.exec(value.trim())
  if (!match) {
    const fallback = new Date(value)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }

  const [, y, mo, d, h, mi, s, ms, zone] = match

  let offsetMinutes = 0
  if (zone && zone !== "Z" && zone !== "z") {
    const sign = zone[0] === "-" ? -1 : 1
    const digits = zone.slice(1).replace(":", "")
    offsetMinutes =
      sign *
      (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || "0"))
  }

  const epoch =
    Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s ?? "0"),
      // Truncate to milliseconds — the precision `Date` can hold.
      Number((ms ?? "0").slice(0, 3).padEnd(3, "0"))
    ) -
    offsetMinutes * 60_000

  return new Date(epoch)
}

function normalizeWork(raw: RawWorkRef | null | undefined) {
  if (!raw?.documentId) return null
  return {
    documentId: raw.documentId,
    title: raw.title ?? "",
    type: raw.type ?? null,
    duration: typeof raw.duration === "number" ? raw.duration : null,
  }
}

function normalizeEvent(raw: RawEventRef | null | undefined) {
  if (!raw?.documentId) return null
  return {
    documentId: raw.documentId,
    title: raw.title ?? "",
    venue: raw.venue ?? null,
  }
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Normalise one raw row of either collection.
 *
 * Returns `null` for a row with no `documentId` — the whole surface addresses
 * rows by documentId (edit, delete, calendar identity), so such a row is not
 * merely incomplete, it is unusable.
 */
export function normalizeSubEvent(
  kind: SubEventKind,
  raw: RawSubEvent | null | undefined
): SubEvent | null {
  if (!raw?.documentId) return null

  const workField = SUB_EVENT_WORK_FIELD[kind]
  const work = normalizeWork(raw[workField])

  return {
    kind,
    id: raw.id ?? raw.documentId,
    documentId: raw.documentId,
    startDateTime: raw.startDateTime ?? null,
    start: parseUtcToLocal(raw.startDateTime),
    order: toNumber(raw.order),
    price: toNumber(raw.price),
    audioLanguage: raw.audioLanguage ?? null,
    subtitleLanguage:
      kind === "screening" ? raw.subtitleLanguage ?? null : null,
    surtitleLanguage:
      kind === "performance" ? raw.surtitleLanguage ?? null : null,
    videoFormat: kind === "screening" ? raw.videoFormat ?? null : null,
    work,
    event: normalizeEvent(raw.event),
  }
}

/** Normalise a whole page of one collection, dropping unusable rows. */
export function normalizeSubEvents(
  kind: SubEventKind,
  rows: RawSubEvent[] | null | undefined
): SubEvent[] {
  return (rows ?? [])
    .map((row) => normalizeSubEvent(kind, row))
    .filter((row): row is SubEvent => row !== null)
}

/**
 * Merge the per-collection results into one chronological list.
 *
 * Unscheduled rows (`startDateTime === null`) sort last; ties break on kind then
 * documentId so the order is stable across refetches regardless of which
 * request resolved first.
 */
export function mergeSubEvents(...lists: SubEvent[][]): SubEvent[] {
  return lists.flat().sort((a, b) => {
    const at = a.start?.getTime()
    const bt = b.start?.getTime()

    if (at === undefined && bt === undefined) return compareStable(a, b)
    if (at === undefined) return 1
    if (bt === undefined) return -1
    if (at !== bt) return at - bt

    return compareStable(a, b)
  })
}

function compareStable(a: SubEvent, b: SubEvent): number {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1
  return a.documentId < b.documentId ? -1 : a.documentId > b.documentId ? 1 : 0
}

/** Stable calendar id — kind-scoped, because documentIds are per-collection. */
export function calendarEventId(subEvent: SubEvent): string {
  return `${subEvent.kind}:${subEvent.documentId}`
}

/** Already-translated badge labels, keyed by kind. */
export type KindLabels = Partial<Record<SubEventKind, string>>

/** Presentation strings the caller has already translated. */
export interface CalendarMappingOptions {
  kindLabels?: KindLabels
  /** Shown when neither the work nor the event has a title. */
  fallbackTitle?: string
}

/**
 * Map one normalised sub-event onto a calendar block.
 *
 * `extendedProps.kind` is what `PlanningCalendarNew` routes clicks on;
 * `extendedProps.subEvent` carries the row itself so the edit modal needs no
 * second lookup.
 *
 * `options` carries strings the caller already translated (badge labels, the
 * untitled fallback) — this module is pure and has no translator, and a French
 * literal here would reach an English or Arabic admin untranslated. `EventBlock` renders whatever
 * string it is handed and nothing when there is none, so `BigCalendar` stays
 * generic — it never learns what a screening is, and it gains no French
 * literals of its own (its existing hardcoded strings are logged deferred work
 * this change must not grow).
 */
export function toCalendarEvent(
  subEvent: SubEvent,
  options: CalendarMappingOptions = {}
): CalendarEvent | null {
  if (!subEvent.start) return null

  // A zero or negative duration renders a zero-height block: present in the
  // DOM, impossible to see or click, so the showing looks lost.
  const duration = subEvent.work?.duration
  const minutes =
    typeof duration === "number" && duration > 0
      ? duration
      : DEFAULT_DURATION_MINUTES
  const end = new Date(subEvent.start.getTime() + minutes * 60_000)
  const title =
    subEvent.work?.title ||
    subEvent.event?.title ||
    options.fallbackTitle ||
    "—"
  const color = KIND_COLORS[subEvent.kind]

  return {
    id: calendarEventId(subEvent),
    title,
    start: subEvent.start,
    end,
    color,
    textColor: getContrastColor(color),
    extendedProps: {
      kind: subEvent.kind,
      kindLabel: options.kindLabels?.[subEvent.kind],
      documentId: subEvent.documentId,
      subEvent,
    },
  }
}

/** Map a merged list onto calendar blocks, dropping unscheduled rows. */
export function toCalendarEvents(
  subEvents: SubEvent[],
  options: CalendarMappingOptions = {}
): CalendarEvent[] {
  return subEvents
    .map((subEvent) => toCalendarEvent(subEvent, options))
    .filter((event): event is CalendarEvent => event !== null)
}

/** Read the kind back off a calendar block. */
export function readKind(
  event: Pick<CalendarEvent, "extendedProps">
): SubEventKind | null {
  const kind = event.extendedProps?.kind
  return kind === "screening" || kind === "performance" ? kind : null
}

/** Read the originating sub-event back off a calendar block. */
export function readSubEvent(
  event: Pick<CalendarEvent, "extendedProps">
): SubEvent | null {
  const subEvent = event.extendedProps?.subEvent
  return subEvent && typeof subEvent === "object"
    ? (subEvent as SubEvent)
    : null
}
