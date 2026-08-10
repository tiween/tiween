/**
 * Venues ADMIN CRUD controller (Story 2D.2).
 *
 * The six `admin-api` handlers the venues-plugin admin UI calls. Each one does
 * exactly three things: Zod-validate the input, delegate to
 * `services/venue-admin.ts` (Document Service, `documentId`-keyed), and answer
 * a uniform envelope carrying a SCREAMING_SNAKE **error CODE** — never prose,
 * never an internal exception message. The UI maps every code to a translated
 * `Field.Error`/toast.
 *
 * Response bodies mirror the `{ data, meta }` envelope the plugin's content-api
 * controller already uses, and the rows inside are the Document Service result
 * READ DIRECTLY — no hand-transformation of attributes (project rule).
 */
import type { Core } from "@strapi/strapi"
import type { VenueAdminScope } from "../services/venue-admin"

import { validate } from "../../../../../shared/validation"
import { VENUE_ADMIN_SCOPE_KEY } from "../policies/venues-admin-scope"
import {
  venueAdminBulkDeleteSchema,
  venueAdminCreateSchema,
  venueAdminListQuerySchema,
  venueAdminUpdateSchema,
} from "../validation/venue-admin"

const PLUGIN_ID = "venues"

/**
 * Venue-admin error CODE → HTTP status.
 *
 * An UNMAPPED code collapses to 500 `INTERNAL_ERROR` for the client and is
 * LOGGED here, so a raw Document Service failure stays diagnosable instead of
 * vanishing into a generic 500. (Same discipline as the registration and
 * profile envelopes in `./index.ts`.)
 */
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  INVALID_QUERY: 400,
  NO_FIELDS_TO_UPDATE: 400,
  VENUE_FORBIDDEN: 403,
  VENUE_NOT_FOUND: 404,
  // A duplicate slug is a field-level validation failure the editor fixes in
  // the form, so it answers 400 with an issue attached to `slug` — not the
  // opaque 500 an unmapped unique-constraint violation used to produce.
  VENUE_SLUG_TAKEN: 400,
  // The venue still has screenings/performances scheduled against it, or the
  // count could not be established (fail-closed). 409: the request is valid,
  // the resource's state refuses it.
  VENUE_HAS_EVENTS: 409,
  VENUE_LIST_FAILED: 500,
  VENUE_CREATE_FAILED: 500,
  VENUE_UPDATE_FAILED: 500,
  VENUE_DELETE_FAILED: 500,
}

/**
 * Uniform error envelope. Per-field `issues` (themselves CODES) ride out only
 * for MAPPED codes: emitting them alongside a code we deliberately refused to
 * disclose would leak, through the issues field, the payload the collapse was
 * meant to hide.
 */
function respondError(strapi: Core.Strapi, ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  const issues = err?.details?.issues

  if (!mappedStatus) {
    strapi.log.error(
      `[venues:admin] unmapped venue-admin error (code=${code ?? "none"}): ${
        err?.stack ?? err
      }`
    )
  }

  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "VenueAdminError",
      message: "Venue admin request failed",
      details: {
        code: mappedStatus ? code : "INTERNAL_ERROR",
        ...(mappedStatus && Array.isArray(issues) ? { issues } : {}),
      },
    },
  }
}

/**
 * The scope the `venues-admin-scope` policy attached.
 *
 * A MISSING scope means the policy did not run — a route misdeclaration, not a
 * super admin. It resolves to the most restrictive scope (no manage-all, no
 * email), which `services/venue-admin.ts` confines to an impossible filter, so
 * the failure mode is an empty list rather than an open door.
 */
function scopeOf(ctx: any): VenueAdminScope {
  const scope = ctx?.state?.[VENUE_ADMIN_SCOPE_KEY]
  if (scope && typeof scope === "object") return scope as VenueAdminScope
  return { canManageAll: false }
}

const venueAdminController = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin(PLUGIN_ID).service("venue-admin")

  return {
    /** `GET /venues/admin/venues` — search / filter / sort / paginate. */
    async find(ctx: any) {
      try {
        const parsed = venueAdminListQuerySchema.safeParse(ctx.query ?? {})
        if (!parsed.success) {
          // A bad LIST query is a caller mistake with no per-field UI to attach
          // issues to, so it answers one code rather than a field map.
          return respondError(strapi, ctx, { code: "INVALID_QUERY" })
        }

        ctx.body = await service().list(parsed.data, scopeOf(ctx))
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /** `GET /venues/admin/venues/:documentId`. */
    async findOne(ctx: any) {
      try {
        const documentId =
          typeof ctx.params?.documentId === "string"
            ? ctx.params.documentId
            : ""
        if (!documentId) {
          return respondError(strapi, ctx, { code: "VENUE_NOT_FOUND" })
        }

        const venue = await service().findOne(documentId, scopeOf(ctx))
        ctx.body = { data: venue, meta: {} }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /** `POST /venues/admin/venues`. */
    async create(ctx: any) {
      try {
        const input = validate(venueAdminCreateSchema, ctx.request?.body ?? {})
        const venue = await service().create(input, scopeOf(ctx))

        ctx.status = 201
        ctx.body = { data: venue, meta: {} }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /** `PUT /venues/admin/venues/:documentId`. */
    async update(ctx: any) {
      try {
        const documentId =
          typeof ctx.params?.documentId === "string"
            ? ctx.params.documentId
            : ""
        if (!documentId) {
          return respondError(strapi, ctx, { code: "VENUE_NOT_FOUND" })
        }

        const input = validate(venueAdminUpdateSchema, ctx.request?.body ?? {})
        const venue = await service().update(documentId, input, scopeOf(ctx))

        ctx.body = { data: venue, meta: {} }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /** `DELETE /venues/admin/venues/:documentId`. */
    async delete(ctx: any) {
      try {
        const documentId =
          typeof ctx.params?.documentId === "string"
            ? ctx.params.documentId
            : ""
        if (!documentId) {
          return respondError(strapi, ctx, { code: "VENUE_NOT_FOUND" })
        }

        const result = await service().delete(documentId, scopeOf(ctx))
        ctx.body = { data: result, meta: {} }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /**
     * `POST /venues/admin/venues/bulk-delete`.
     *
     * Answers 200 with the per-id outcome even when some ids failed: the UI
     * refetches the list afterwards (no optimistic delete), and it needs to
     * know WHICH ids survived to word its toast honestly.
     */
    async bulkDelete(ctx: any) {
      try {
        const input = validate(
          venueAdminBulkDeleteSchema,
          ctx.request?.body ?? {}
        )
        const result = await service().bulkDelete(
          input.documentIds,
          scopeOf(ctx)
        )

        ctx.body = { data: result, meta: {} }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },
  }
}

export default venueAdminController
