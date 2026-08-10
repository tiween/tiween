/**
 * Venues admin CRUD service (Story 2D.2).
 *
 * Backs the six `admin-api` routes the venues-plugin admin UI talks to. Every
 * read and write goes through the **Document Service**
 * (`strapi.documents('plugin::venues.venue')`) and is keyed by `documentId` —
 * never by `id`, never by Entity Service.
 *
 * ## The scope object is the security boundary
 *
 * `VenueAdminScope` is built by the `venues-admin-scope` policy from
 * `ctx.state.userAbility` and is the ONLY thing that decides whether a caller
 * sees every venue or exactly one. The UI's `canManageAll` gate is convenience
 * (AC 7); this file is the boundary:
 *
 * - `canManageAll: true`  → unrestricted; `status` and `manager` are writable.
 * - `canManageAll: false` → every query is filtered by `manager.email`, every
 *   write re-reads the row and re-checks ownership, and a payload touching
 *   `status` or `manager` is REFUSED (`VENUE_FORBIDDEN`) rather than silently
 *   stripped — a scoped caller can neither approve its own venue nor reassign
 *   the tenant key it is scoped by.
 *
 * ## Why `manager.email` and not `manager.id`
 *
 * `venue.manager` targets `plugin::users-permissions.user` (a B2C/API account),
 * while an ADMIN-API route authenticates an `admin::user` — two different
 * tables with two independent id spaces, so `manager.id === ctx.state.user.id`
 * would compare unrelated integers and silently match the wrong venue. Email is
 * the only identifier the two accounts share. It is compared case-insensitively
 * because Strapi stores admin and users-permissions emails independently and
 * does not normalize case between them.
 *
 * A cleaner link (an explicit `adminUser` relation on the venue) is a schema
 * change and 2D.2 is additive-only against the 2D.1 schema — flagged in the
 * story's Completion Notes rather than smuggled in here.
 */
import type { Core } from "@strapi/strapi"
import type {
  VenueAdminCreateInput,
  VenueAdminListQuery,
  VenueAdminUpdateInput,
} from "../validation/venue-admin"

import {
  PRIVILEGED_VENUE_FIELDS,
  SCOPED_WRITABLE_VENUE_FIELDS,
  WRITABLE_VENUE_FIELDS,
} from "../validation/venue-admin"
import { VENUE_DETAIL_POPULATE } from "./venue"

const VENUE_UID = "plugin::venues.venue" as const

/* -------------------------------------------------------------------------- */
/* Error codes (project rule: CODES, never prose)                              */
/* -------------------------------------------------------------------------- */

export const VENUE_NOT_FOUND = "VENUE_NOT_FOUND"
export const VENUE_FORBIDDEN = "VENUE_FORBIDDEN"
export const NO_FIELDS_TO_UPDATE = "NO_FIELDS_TO_UPDATE"
export const VENUE_CREATE_FAILED = "VENUE_CREATE_FAILED"
export const VENUE_UPDATE_FAILED = "VENUE_UPDATE_FAILED"
export const VENUE_DELETE_FAILED = "VENUE_DELETE_FAILED"
export const VENUE_LIST_FAILED = "VENUE_LIST_FAILED"
/** The venue still has screenings/performances scheduled against it. */
export const VENUE_HAS_EVENTS = "VENUE_HAS_EVENTS"
/** Another venue already uses this slug (the DB unique index refused it). */
export const VENUE_SLUG_TAKEN = "VENUE_SLUG_TAKEN"

/**
 * The two sub-event collections that replaced `showtime` in story 2C.3. BOTH
 * must be counted wherever "séances for this venue" is asked — counting only
 * one is precisely the bug 2C.3 fixed. Neither carries a `venue` of its own:
 * they hang off `event`, and the venue lives on the event, hence the nested
 * filter in {@link countScheduledSubEvents}.
 */
const SUB_EVENT_UIDS = [
  "plugin::events-manager.screening",
  "plugin::events-manager.performance",
] as const

function codedError(
  message: string,
  code: string,
  issues?: { path: string; message: string }[]
): Error {
  return Object.assign(new Error(message), {
    code,
    ...(issues ? { details: { code, issues } } : {}),
  })
}

/**
 * Is this the database refusing a duplicate?
 *
 * Shape copied from `services/registration.ts` (which uses it for the users
 * unique index). The driver code is checked first; the message sniff is the
 * fallback for drivers that do not set one — SQLite, which the integration
 * suite runs on, is exactly that case.
 */
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null | undefined
  if (!e) return false

  if (e.code === "23505" || e.code === "ER_DUP_ENTRY") return true

  const message = typeof e.message === "string" ? e.message.toLowerCase() : ""
  return (
    message.includes("unique constraint") ||
    message.includes("duplicate key") ||
    message.includes("already taken") ||
    message.includes("already exists")
  )
}

/**
 * Translate a write failure into the code the editor can act on.
 *
 * A duplicate `slug` is the validation error editors hit most often (two
 * cinemas called "Le Colisée" in different cities), and left untranslated it
 * escapes as an opaque 500 with no field attached. The issue rides on `slug` so
 * the form highlights the input rather than only toasting.
 */
function writeError(fallbackCode: string, err: unknown): Error {
  if (isUniqueViolation(err)) {
    return codedError("Venue slug already taken", VENUE_SLUG_TAKEN, [
      { path: "slug", message: VENUE_SLUG_TAKEN },
    ])
  }
  return codedError("Venue write failed", fallbackCode)
}

/* -------------------------------------------------------------------------- */
/* Scope                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The sentinel a scoped caller with NO email is confined to. It cannot equal
 * any stored address (an email always has an `@`), so the filter matches
 * nothing — the fail-closed reading of a missing join key.
 */
const NO_MATCH_EMAIL = "__no_manager__"

/** What the caller is allowed to reach. Built by the `venues-admin-scope` policy. */
export interface VenueAdminScope {
  /** `plugin::venues.manage-all` — Admin/Editor. */
  canManageAll: boolean
  /** The admin account's email; the join key for a scoped caller. */
  email?: string
}

/** The row shape the list/detail projections read off the Document Service. */
interface VenueRow {
  documentId: string
  name?: string
  status?: string
  manager?: { email?: string | null } | null
  [key: string]: unknown
}

/** The list read also needs `manager` so a scoped caller can be verified. */
const VENUE_ADMIN_POPULATE = {
  ...VENUE_DETAIL_POPULATE,
  manager: true,
} as const

/**
 * The `manager.email` filter a scoped caller is confined to.
 *
 * A scoped caller with NO email cannot be matched to any venue, so it is
 * confined to the impossible filter rather than being let through unscoped —
 * failing closed is the only safe reading of a missing join key.
 */
function scopeFilter(scope: VenueAdminScope): Record<string, unknown> {
  if (scope.canManageAll) return {}
  return { manager: { email: { $eqi: scope.email ?? NO_MATCH_EMAIL } } }
}

/** Does this row belong to a scoped caller? Case-insensitive, fails closed. */
function ownedBy(row: VenueRow, scope: VenueAdminScope): boolean {
  if (scope.canManageAll) return true
  const managerEmail = row.manager?.email
  if (!scope.email || typeof managerEmail !== "string") return false
  return managerEmail.toLowerCase() === scope.email.toLowerCase()
}

/**
 * Build the Document Service `filters` for a list read: the caller's scope
 * ANDed with the UI's search / status / type / city filters.
 *
 * `search` matches `name` OR `address` (AC 1) and is nested under its own
 * `$and` entry so it cannot swallow the sibling filters — a top-level `$or`
 * alongside `status` would be read as "(name matches OR address matches) OR
 * status", quietly widening the result set past the active filter.
 */
export function buildListFilters(
  query: VenueAdminListQuery,
  scope: VenueAdminScope
): Record<string, unknown> {
  const and: Record<string, unknown>[] = []

  const scoped = scopeFilter(scope)
  if (Object.keys(scoped).length > 0) and.push(scoped)

  if (query.search) {
    and.push({
      $or: [
        { name: { $containsi: query.search } },
        { address: { $containsi: query.search } },
      ],
    })
  }

  if (query.status) and.push({ status: query.status })
  if (query.type) and.push({ type: query.type })
  if (query.city) and.push({ cityRef: { documentId: query.city } })

  if (and.length === 0) return {}
  if (and.length === 1) return and[0]
  return { $and: and }
}

/**
 * Rebuild the Document Service payload from the field whitelist. Anything that
 * slipped past Zod (or that a scoped caller is not allowed to write) is dropped
 * here, before the database.
 *
 * `cityRef` arrives as a `documentId` string; Strapi v5 relations accept a
 * documentId (or `null` to clear), so it is forwarded as-is.
 */
export function buildWritePayload(
  input: VenueAdminCreateInput | VenueAdminUpdateInput,
  scope: VenueAdminScope
): Record<string, unknown> {
  const allowed: readonly string[] = scope.canManageAll
    ? WRITABLE_VENUE_FIELDS
    : SCOPED_WRITABLE_VENUE_FIELDS

  const data: Record<string, unknown> = {}
  for (const field of allowed) {
    const value = (input as Record<string, unknown>)[field]
    if (value === undefined) continue
    data[field] = value
  }
  return data
}

/**
 * Did a scoped caller send a field only `manage-all` may write?
 *
 * Without this, a Venue Manager submitting ONLY a status change has its payload
 * stripped to `{}` and is told "Nothing to save" (`NO_FIELDS_TO_UPDATE`) — the
 * wrong answer twice over: the write was refused, not empty, and the editor is
 * left believing the form is broken rather than that the field is not theirs.
 */
export function usedPrivilegedFields(
  input: VenueAdminCreateInput | VenueAdminUpdateInput,
  scope: VenueAdminScope
): boolean {
  if (scope.canManageAll) return false
  return PRIVILEGED_VENUE_FIELDS.some(
    (field) => (input as Record<string, unknown>)[field] !== undefined
  )
}

function pageCountOf(total: number, pageSize: number): number {
  return pageSize > 0 ? Math.ceil(total / pageSize) : 0
}

const venueAdminService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * `GET /venues/admin/venues`.
   *
   * Reads the DRAFT version of every document: this is the working copy the
   * admin edits, so an approved venue whose published copy lags by one edit
   * still lists what a save would modify.
   */
  async list(query: VenueAdminListQuery, scope: VenueAdminScope) {
    const filters = buildListFilters(query, scope)
    const sort = [{ [query.sortField]: query.sortOrder }]

    try {
      // The Document Service query types derive field names from the generated
      // registry, which is excluded from this project's tsc compilation, so the
      // params objects are cast (mirroring `services/venue.ts`).
      const [rows, total] = await Promise.all([
        strapi.documents(VENUE_UID).findMany({
          filters,
          sort,
          status: "draft",
          populate: VENUE_ADMIN_POPULATE,
          start: (query.page - 1) * query.pageSize,
          limit: query.pageSize,
        } as never) as Promise<VenueRow[]>,
        strapi.documents(VENUE_UID).count({
          filters,
          status: "draft",
        } as never) as Promise<number>,
      ])

      return {
        data: Array.isArray(rows) ? rows : [],
        meta: {
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            pageCount: pageCountOf(total, query.pageSize),
            total,
          },
        },
      }
    } catch (err) {
      strapi.log.error(`[venues:admin] venue list failed: ${err}`)
      throw codedError("Venue list failed", VENUE_LIST_FAILED)
    }
  },

  /**
   * The raw draft row for `documentId`, or `null`.
   *
   * Ownership is checked HERE rather than by filtering the read: a scoped
   * caller asking for someone else's venue gets `VENUE_NOT_FOUND` (the
   * existence of another tenant's venue is itself not disclosed), which is why
   * this returns `null` for both "absent" and "not yours".
   */
  async findOneScoped(
    documentId: string,
    scope: VenueAdminScope
  ): Promise<VenueRow | null> {
    const row = (await strapi.documents(VENUE_UID).findOne({
      documentId,
      status: "draft",
      populate: VENUE_ADMIN_POPULATE,
    } as never)) as VenueRow | null

    if (!row) return null
    if (!ownedBy(row, scope)) return null
    return row
  },

  /** `GET /venues/admin/venues/:documentId`. */
  async findOne(documentId: string, scope: VenueAdminScope): Promise<VenueRow> {
    const row = await this.findOneScoped(documentId, scope)
    if (!row) throw codedError("Venue not found", VENUE_NOT_FOUND)
    return row
  },

  /**
   * `POST /venues/admin/venues`.
   *
   * A scoped caller cannot CREATE: a venue it created would carry no `manager`
   * and would therefore be invisible to it on the very next read (and to
   * everyone but an Admin). AC 7 states the same rule from the UI side ("no
   * 'Nouveau lieu'"); this is its server half.
   */
  async create(input: VenueAdminCreateInput, scope: VenueAdminScope) {
    if (!scope.canManageAll) {
      throw codedError("Forbidden", VENUE_FORBIDDEN)
    }

    const data = buildWritePayload(input, scope)

    let created: VenueRow
    try {
      created = (await strapi.documents(VENUE_UID).create({
        data,
        status: "draft",
        populate: VENUE_ADMIN_POPULATE,
      } as never)) as VenueRow
    } catch (err) {
      strapi.log.error(`[venues:admin] venue create failed: ${err}`)
      throw writeError(VENUE_CREATE_FAILED, err)
    }

    await this.syncPublication(created)
    return created
  },

  /** `PUT /venues/admin/venues/:documentId`. */
  async update(
    documentId: string,
    input: VenueAdminUpdateInput,
    scope: VenueAdminScope
  ) {
    const existing = await this.findOneScoped(documentId, scope)
    if (!existing) throw codedError("Venue not found", VENUE_NOT_FOUND)

    // Checked BEFORE the payload is built: a scoped caller sending only
    // `status`/`manager` is refused, not told there was nothing to save.
    if (usedPrivilegedFields(input, scope)) {
      throw codedError("Forbidden", VENUE_FORBIDDEN)
    }

    const data = buildWritePayload(input, scope)
    if (Object.keys(data).length === 0) {
      throw codedError("No fields to update", NO_FIELDS_TO_UPDATE)
    }

    let updated: VenueRow
    try {
      updated = (await strapi.documents(VENUE_UID).update({
        documentId,
        data,
        populate: VENUE_ADMIN_POPULATE,
      } as never)) as VenueRow
    } catch (err) {
      strapi.log.error(
        `[venues:admin] venue update failed for ${documentId}: ${err}`
      )
      throw writeError(VENUE_UPDATE_FAILED, err)
    }

    await this.syncPublication(updated)
    return updated
  },

  /**
   * Count the scheduled sub-events (séances) attached to a venue, across BOTH
   * collections story 2C.3 split `showtime` into.
   *
   * Returns `null` when the count could not be established. That is not the
   * same as zero and the caller must not treat it as such: swallowing a failed
   * count into `0` is the exact bug 2C.3 fixed, and it let the delete guard
   * pass for EVERY venue, including venues with live screenings.
   */
  async countScheduledSubEvents(documentId: string): Promise<number | null> {
    try {
      const counts = await Promise.all(
        SUB_EVENT_UIDS.map(
          (uid) =>
            strapi.documents(uid as never).count({
              filters: { event: { venue: { documentId } } },
            } as never) as Promise<number>
        )
      )

      return counts.reduce<number>((sum, n) => sum + (Number(n) || 0), 0)
    } catch (err) {
      strapi.log.error(
        `[venues:admin] sub-event count failed for ${documentId}: ${err}`
      )
      return null
    }
  },

  /**
   * `DELETE /venues/admin/venues/:documentId`.
   *
   * GUARDED and FAIL-CLOSED: a venue with screenings or performances scheduled
   * against it cannot be deleted, and neither can one whose count could not be
   * established. The retired events-manager page enforced this client-side;
   * doing it in the service is what makes it hold for the bulk path and for any
   * caller that skips the UI. A destructive action must never be UNBLOCKED by a
   * check that failed.
   */
  async delete(documentId: string, scope: VenueAdminScope) {
    const existing = await this.findOneScoped(documentId, scope)
    if (!existing) throw codedError("Venue not found", VENUE_NOT_FOUND)

    const scheduled = await this.countScheduledSubEvents(documentId)
    if (scheduled === null || scheduled > 0) {
      throw codedError("Venue has scheduled events", VENUE_HAS_EVENTS)
    }

    try {
      await strapi.documents(VENUE_UID).delete({ documentId } as never)
    } catch (err) {
      strapi.log.error(
        `[venues:admin] venue delete failed for ${documentId}: ${err}`
      )
      throw codedError("Venue delete failed", VENUE_DELETE_FAILED)
    }

    return { documentId }
  },

  /**
   * `POST /venues/admin/venues/bulk-delete`.
   *
   * Per-id and best-effort: one unreachable row must not abort the rest, and
   * the caller is told exactly which ids failed so the list refetch it does
   * next is explainable. Ids the scope does not cover land in `failed` for the
   * same reason `findOneScoped` returns `null` — the caller learns nothing
   * about another tenant's venues beyond "not deleted".
   */
  async bulkDelete(documentIds: string[], scope: VenueAdminScope) {
    const deleted: string[] = []
    const failed: string[] = []

    for (const documentId of documentIds) {
      try {
        await this.delete(documentId, scope)
        deleted.push(documentId)
      } catch {
        failed.push(documentId)
      }
    }

    return { deleted, failed }
  },

  /**
   * Keep the PUBLISHED copy in step with `status`, in BOTH directions.
   *
   * `approved` publishes; anything else UNPUBLISHES. The unpublish half is not
   * symmetry for its own sake: demoting an approved venue back to `pending`
   * used to leave the published copy live, and `pending` has no public read
   * gate to hide it behind (`findVenueBySlug` filters `status: { $ne:
   * "suspended" }`, which covers suspension and nothing else). The venue would
   * have stayed publicly readable after being un-approved.
   *
   * Non-fatal in both directions by design — the draft IS saved, and failing
   * the request here would tell an editor their edit was lost when it was not.
   * (`services/venue-profile.ts` only ever publishes; it cannot change `status`
   * at all, so it has no demotion case to handle.)
   */
  async syncPublication(row: VenueRow): Promise<void> {
    if (!row?.documentId) return

    const shouldBePublished = row.status === "approved"

    try {
      if (shouldBePublished) {
        await strapi.documents(VENUE_UID).publish({
          documentId: row.documentId,
        } as never)
      } else {
        await strapi.documents(VENUE_UID).unpublish({
          documentId: row.documentId,
        } as never)
      }
    } catch (err) {
      strapi.log.error(
        `[venues:admin] ${
          shouldBePublished ? "publish" : "unpublish"
        } after write failed for ${row.documentId}: ${err}`
      )
    }
  },
})

export default venueAdminService
