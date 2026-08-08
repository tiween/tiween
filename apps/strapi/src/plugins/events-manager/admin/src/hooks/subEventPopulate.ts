/**
 * Sub-event UIDs, populate lists and per-kind field rules.
 *
 * Story 2C.3 deleted the `showtime` collection and replaced it with two
 * heterogeneous collections — `screening` (film) and `performance` (theatre).
 * Everything the planning surface needs to know about *which* collection it is
 * talking to lives here.
 *
 * Kept dependency-free (no React, no `@strapi/strapi/admin`) for the same
 * reason as `workPopulate.ts`: the jest unit gate (`*.unit.test.ts`, node env)
 * cannot load the ESM-only admin bundle, so any module a unit test reaches must
 * not import it — directly or transitively.
 */

/** The two sub-event kinds that replaced `showtime`. */
export type SubEventKind = "screening" | "performance"

export const SCREENING_UID = "plugin::events-manager.screening" as const
export const PERFORMANCE_UID = "plugin::events-manager.performance" as const
export const EVENT_UID = "plugin::events-manager.event" as const

/** Iteration order for the parallel fetches — also the badge/legend order. */
export const SUB_EVENT_KINDS: readonly SubEventKind[] = [
  "screening",
  "performance",
]

export const SUB_EVENT_UID: Record<SubEventKind, string> = {
  screening: SCREENING_UID,
  performance: PERFORMANCE_UID,
}

/** The relation each kind stores its creative-work under. */
export const SUB_EVENT_WORK_FIELD = {
  screening: "movie",
  performance: "play",
} as const

/**
 * Which `creative-work.type` values each kind may reference.
 *
 * Mirrors `server/src/content-types/sub-event-work-kind.ts` (`WORK_KIND_RULES`),
 * which is enforced by the `assertSubEventWorkKind` lifecycle guard wired in
 * `server/src/bootstrap.ts`. Duplicated rather than imported because the server
 * module pulls in `@strapi/utils`; the values are pinned by
 * `subEventTransform.unit.test.ts`.
 */
export const SUB_EVENT_WORK_TYPES = {
  screening: ["film", "short-film"],
  performance: ["play"],
} as const

/** `event.category` to stamp on the container event created for each kind. */
export const EVENT_CATEGORY_BY_KIND: Record<SubEventKind, string> = {
  screening: "movie_screening",
  performance: "theater_performance",
}

/**
 * Relations the calendar needs resolved on every sub-event.
 *
 * `event.venue` rather than a direct `venue`: neither sub-event type has a
 * venue relation of its own — the venue hangs off the parent event.
 */
export const SUB_EVENT_POPULATE = [
  "event",
  "event.venue",
  "movie",
  "play",
] as const

/**
 * The populate list for one kind.
 *
 * The shared list above names both work relations, but `movie` only exists on
 * `screening` and `play` only on `performance`; the content-manager rejects a
 * populate key the model does not declare, so the foreign one is dropped here
 * rather than risking a 400 on an otherwise valid request.
 */
export function subEventPopulate(kind: SubEventKind): string[] {
  const foreign = kind === "screening" ? "play" : "movie"
  return SUB_EVENT_POPULATE.filter((path) => path !== foreign)
}

/** Content-manager collection URL for a UID. */
export const cmUrl = (uid: string) => `/content-manager/collection-types/${uid}`
