/**
 * Sub-event ↔ catalog-kind guard (code review of stories 2C.1 / 2C.3).
 *
 * 2C.3 retired the separate `movie` and `play` content types and pointed both
 * sub-event kinds at the single `plugin::creative-works.creative-work`:
 *
 *   screening.movie -> creative-work
 *   performance.play -> creative-work
 *
 * The field names still carry the old meaning, but the schema no longer
 * enforces it — nothing stopped a stage play being attached to a cinema
 * screening, or a film to a theatre performance. `creative-work.type`
 * (`film` | `play` | `short-film`) is the surviving discriminator, so this
 * module re-establishes the invariant the type split used to give for free.
 *
 * The decision logic lives here rather than in `bootstrap.ts` so it can be
 * unit-tested without booting Strapi (same split as
 * `event/schedule-update-handler.ts`).
 *
 * Boundary note: the linked work is read through
 * `creative-works.public-api.findWork` — the sanctioned cross-plugin entry
 * point (architecture amendment D8, rules R3/R4). This module never touches a
 * foreign UID with `strapi.documents()`.
 */
import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"

const { ValidationError } = errors

export const SCREENING_UID = "plugin::events-manager.screening" as const
export const PERFORMANCE_UID = "plugin::events-manager.performance" as const

/** Which `creative-work.type` values each sub-event kind may reference. */
export const WORK_KIND_RULES = {
  [SCREENING_UID]: { field: "movie", allowed: ["film", "short-film"] },
  [PERFORMANCE_UID]: { field: "play", allowed: ["play"] },
} as const

export type GuardedUid = keyof typeof WORK_KIND_RULES

/**
 * Pull the referenced work's `documentId` out of a lifecycle `data` payload.
 *
 * Strapi hands relations over in several shapes depending on the writer: a bare
 * documentId string (programmatic `documents().create`), a `{ connect: [...] }`
 * set (admin content-manager), or an object carrying `documentId`. Anything we
 * cannot read as a documentId — most importantly a numeric internal id — yields
 * `undefined`, and the caller then skips validation rather than guessing.
 */
export function extractWorkDocumentId(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined

  if (Array.isArray(value)) {
    // A to-one relation given as an array: the last entry wins, matching how
    // Strapi collapses `connect` ordering.
    return extractWorkDocumentId(value[value.length - 1])
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>

    // `{ connect: [...], disconnect: [...] }` — a payload that only
    // disconnects leaves nothing to validate.
    if ("connect" in obj) return extractWorkDocumentId(obj.connect)

    if (typeof obj.documentId === "string") {
      return obj.documentId.trim() || undefined
    }
    // v5 `connect` entries carry the documentId under `id`.
    if (typeof obj.id === "string") return obj.id.trim() || undefined
  }

  return undefined
}

/**
 * Validate that the work a screening/performance is being linked to is of an
 * allowed kind.
 *
 * Fail-open by design: if the relation is absent, expressed as an internal
 * numeric id, or the work cannot be fetched, the write proceeds untouched. The
 * guard exists to catch the wrong-kind mistake, not to become a new way for
 * saves to break. It only throws on a work it positively resolved and whose
 * `type` is positively disallowed.
 */
export async function assertSubEventWorkKind({
  strapi,
  uid,
  data,
}: {
  strapi: Core.Strapi
  uid: GuardedUid
  data: Record<string, unknown> | undefined
}): Promise<void> {
  const rule = WORK_KIND_RULES[uid]
  if (!rule || !data || !(rule.field in data)) return

  const documentId = extractWorkDocumentId(data[rule.field])
  if (!documentId) return

  let work: { type?: string } | null = null
  try {
    work = await strapi
      .plugin("creative-works")
      .service("public-api")
      .findWork(documentId)
  } catch (err) {
    strapi.log.error(
      `[${uid}] work-kind guard could not resolve creative-work ${documentId}`,
      err
    )
    return
  }

  const type = work?.type
  // An unresolved work, or one with no `type`, is not evidence of a mistake.
  if (!type) return

  if (!(rule.allowed as readonly string[]).includes(type)) {
    throw new ValidationError(
      `${rule.field} must reference a creative-work of type ${rule.allowed
        .map((t) => `"${t}"`)
        .join(" or ")}, but "${documentId}" is of type "${type}".`
    )
  }
}
