/**
 * Pure validation and payload helpers for the sub-event create/edit modal.
 *
 * Extracted from `index.tsx` for the same reason as
 * `VenueFormModal/validate.ts`: the jest gate matches `**\/*.unit.test.ts` in a
 * node environment, so rules living inside a `.tsx` component cannot be pinned
 * by a test. The kind ↔ work-type rule in particular is the client-side half of
 * the `assertSubEventWorkKind` lifecycle guard, and it must be verifiable
 * without a DOM.
 *
 * Errors are returned as CODES, not sentences. This module is pure and cannot
 * call `usePlanningT`, so a literal here would be an untranslatable string on
 * an English or Arabic admin — and the house rule (project-context.md, "Error
 * Handling Rules") is codes out, translation at the UI edge. The component maps
 * every code below onto an `events-manager.planning.error.*` key.
 */
import type { SubEventKind } from "../../hooks/subEventPopulate"

import {
  cmUrl,
  EVENT_CATEGORY_BY_KIND,
  EVENT_UID,
  SUB_EVENT_UID,
  SUB_EVENT_WORK_FIELD,
  SUB_EVENT_WORK_TYPES,
} from "../../hooks/subEventPopulate"

/** The subset of the modal state the rules below read. */
export interface SubEventFormValues {
  mode: "create" | "edit"
  kind: SubEventKind
  /** Event title — only editable (and only required) when creating. */
  title: string
  /** documentId of the selected creative-work, "" when none is selected. */
  workDocumentId: string
  /** `creative-work.type` of the selected work, "" when none is selected. */
  workType: string
  /** Local calendar day, `null` when unset. */
  date: Date | null
  /** Local wall-clock time as "HH:MM". */
  time: string
  /** Raw price input; empty means "not priced". */
  price: string
}

/** Field names the form can report an error against. */
export type SubEventFormField =
  | "kind"
  | "title"
  | "work"
  | "date"
  | "time"
  | "price"

/**
 * Stable error codes, translated by the component.
 *
 * `work.kindMismatch` is deliberately kind-agnostic: the reader knows the kind
 * from the form, and one code per kind would duplicate the rule.
 */
export type SubEventErrorCode =
  | "kind.required"
  | "title.required"
  | "work.required"
  | "work.kindMismatch"
  | "date.required"
  | "date.past"
  | "time.invalid"
  | "price.invalid"

export type SubEventFormErrors = Partial<
  Record<SubEventFormField, SubEventErrorCode>
>

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Work types a kind may reference — the picker filters on this list too. */
export function allowedWorkTypes(kind: SubEventKind): readonly string[] {
  return SUB_EVENT_WORK_TYPES[kind]
}

/**
 * Field errors for the current form state; an empty object means "submittable".
 *
 * The kind/work-type rule is checked here rather than trusted to the picker's
 * filter: an edit opened on a legacy row can carry a work of the wrong type,
 * and re-saving it would hit the server guard and 400.
 *
 * The past-date rule applies to CREATE ONLY, and this is the single place it
 * lives. Scheduling something into the past is a mistake; *editing* a showing
 * that has already happened (fixing its price, its subtitle language) is
 * routine, so blocking it would make historical rows uneditable. `now` is a
 * parameter so the rule is testable without freezing the clock.
 */
export function validateSubEventForm(
  values: SubEventFormValues,
  now: Date = new Date()
): SubEventFormErrors {
  const errors: SubEventFormErrors = {}

  if (values.kind !== "screening" && values.kind !== "performance") {
    errors.kind = "kind.required"
    return errors
  }

  if (values.mode === "create" && !values.title.trim()) {
    errors.title = "title.required"
  }

  if (!values.workDocumentId) {
    errors.work = "work.required"
  } else if (
    values.workType &&
    !allowedWorkTypes(values.kind).includes(values.workType)
  ) {
    errors.work = "work.kindMismatch"
  }

  if (!values.date) {
    errors.date = "date.required"
  }

  if (!TIME_RE.test(values.time)) {
    errors.time = "time.invalid"
  }

  // Only meaningful once both halves parse — an unset date already errored.
  if (!errors.date && !errors.time && values.mode === "create") {
    const start = combineDateAndTime(values.date, values.time)
    if (start && start.getTime() < now.getTime()) {
      errors.date = "date.past"
    }
  }

  if (values.price.trim()) {
    const price = Number(values.price)
    if (!Number.isFinite(price) || price < 0) {
      errors.price = "price.invalid"
    }
  }

  return errors
}

/**
 * Combine the local calendar day with the wall-clock time into a local `Date`.
 *
 * Shared by the past-date rule and `toStartDateTimeIso` so both read the same
 * instant — a rule that validated a different moment than the one submitted
 * would be worse than no rule.
 */
export function combineDateAndTime(
  date: Date | null,
  time: string
): Date | null {
  if (!date || Number.isNaN(date.getTime())) return null
  if (!TIME_RE.test(time)) return null

  const [hours, minutes] = time.split(":").map(Number)
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

/**
 * Combine the local calendar day and wall-clock time into the UTC instant the
 * API stores.
 *
 * The pickers are local-time by construction, so the seconds/millis are zeroed
 * and the conversion to UTC is left to `toISOString()` — the exact inverse of
 * `subEventTransform.parseUtcToLocal`.
 *
 * Returns `null` when the inputs are not a valid date/time, so a caller can
 * never build a payload out of a half-filled form.
 */
export function toStartDateTimeIso(
  date: Date | null,
  time: string
): string | null {
  return combineDateAndTime(date, time)?.toISOString() ?? null
}

/** A ready-to-send content-manager request: where it goes, and what it carries. */
export interface SubEventRequest {
  url: string
  data: Record<string, unknown>
}

/** The kind-independent inputs a sub-event write needs. */
export interface SubEventPayloadInput {
  kind: SubEventKind
  /** UTC instant from `toStartDateTimeIso`. */
  startDateTime: string
  /** documentId of the selected creative-work. */
  workDocumentId: string
  /** Raw price input; empty means "not priced". */
  price: string
  audioLanguage: string
  /** screening only */
  subtitleLanguage: string
  /** screening only */
  videoFormat: string
  /** performance only */
  surtitleLanguage: string
  /**
   * Container event to attach to — create only; an update never re-parents.
   * `documentId` in Strapi v5.
   */
  eventRef?: string | number
}

/**
 * Build the sub-event write — both the target collection and the body.
 *
 * The URL is built here, not at the call site, because the target collection
 * and the work field are the SAME decision: a screening posts to
 * `…events-manager.screening` with `movie` set, a performance to
 * `…events-manager.performance` with `play` set. Splitting them is exactly how
 * the pre-2C.3 surface could write a play into the film collection. Keeping the
 * pair in one pure function is what lets `validate.unit.test.ts` pin it without
 * a DOM. Nothing — including `event` and `order` — may be spliced onto `data`
 * at the call site: a field added outside this function is a field no test
 * covers.
 *
 * `documentId` when updating, `undefined` when creating.
 */
export function buildSubEventRequest(
  input: SubEventPayloadInput,
  documentId?: string
): SubEventRequest {
  const workField = SUB_EVENT_WORK_FIELD[input.kind]

  const data: Record<string, unknown> = {
    startDateTime: input.startDateTime,
    price: input.price.trim() ? Number(input.price) : null,
    audioLanguage: input.audioLanguage.trim() || null,
    [workField]: input.workDocumentId,
  }

  if (input.kind === "screening") {
    data.videoFormat = input.videoFormat || "standard"
    data.subtitleLanguage = input.subtitleLanguage.trim() || null
  } else {
    // surtitle, not subtitle — the theatre field is spelled differently.
    data.surtitleLanguage = input.surtitleLanguage.trim() || null
  }

  if (input.eventRef !== undefined) {
    data.event = input.eventRef
    // `order` sequences sibling sub-events under one event. The create path
    // always mints a FRESH container event holding exactly this one row, so it
    // is the first and only sibling — 1 is derived from that, not a magic
    // number. Attaching a sub-event to an existing event (a later story) must
    // compute the next order instead of reusing this.
    data.order = 1
  }

  const base = cmUrl(SUB_EVENT_UID[input.kind])

  return { url: documentId ? `${base}/${documentId}` : base, data }
}

/**
 * The content-manager publish action for a row.
 *
 * `screening`, `performance` and `event` are all `draftAndPublish`, so a plain
 * POST/PUT leaves a draft: correct-looking in this calendar (which reads
 * drafts) and invisible to the public API. Same pattern as
 * `useCreativeWorks.publishWork`.
 */
export function publishUrl(uid: string, documentId: string): string {
  return `${cmUrl(uid)}/${documentId}/actions/publish`
}

/**
 * Build the container-event write that precedes a create.
 *
 * Ported from the old `EventCreationModal` — that POST stayed valid across
 * 2C.3, since `event` is the type that owns `venue` — with the two fields the
 * current schema requires but the old payload got wrong: `category` (required,
 * and kind-dependent) and `eventStatus` (the old code sent `status`).
 */
export function buildEventRequest(input: {
  kind: SubEventKind
  title: string
  startDateTime: string
  venueRef: string | number
}): SubEventRequest {
  return {
    url: cmUrl(EVENT_UID),
    data: {
      title: input.title.trim(),
      category: EVENT_CATEGORY_BY_KIND[input.kind],
      startDateTime: input.startDateTime,
      eventStatus: "scheduled",
      venue: input.venueRef,
    },
  }
}

/** "HH:MM" for a local date, for seeding the time picker. */
export function toTimeInput(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "20:00"
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`
}
