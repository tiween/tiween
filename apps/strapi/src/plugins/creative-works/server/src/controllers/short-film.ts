/**
 * Public short-film controller (SDATA-03).
 *
 * Each handler does exactly three things: strictly validate the request,
 * delegate to the `short-films` service, and answer a uniform envelope. Failures
 * carry a SCREAMING_SNAKE error CODE in `error.details.code` — never prose and
 * never an internal exception message. An unmapped code collapses to a logged
 * 500 `INTERNAL_ERROR`.
 *
 * Bodies: `{ data, meta }` for the list, `{ data }` for the detail.
 */
import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation"
import {
  shortFilmDetailQuerySchema,
  shortFilmFeaturedQuerySchema,
  shortFilmListQuerySchema,
  shortFilmSlugParamSchema,
} from "../validation/short-films"

const PLUGIN_ID = "creative-works"

/** Short-film error CODE -> HTTP status. */
export const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  UNSUPPORTED_LOCALE: 400,
  SHORT_FILM_NOT_FOUND: 404,
}

/**
 * Uniform error envelope. Per-field `issues` (themselves CODES/messages from the
 * schema) ride out only for MAPPED codes, so an unmapped failure can never leak
 * its payload through the issues field.
 */
export function respondError(strapi: Core.Strapi, ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  const issues = err?.details?.issues

  if (!mappedStatus) {
    strapi.log.error(
      `[creative-works:short-films] unmapped error (code=${code ?? "none"}): ${
        err?.stack ?? err
      }`
    )
  }

  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "ShortFilmError",
      message: "Short film request failed",
      details: {
        code: mappedStatus ? code : "INTERNAL_ERROR",
        ...(mappedStatus && Array.isArray(issues) ? { issues } : {}),
      },
    },
  }
}

const shortFilmController = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin(PLUGIN_ID).service("short-films")

  return {
    /** `GET /creative-works/short-films` */
    async list(ctx: any) {
      try {
        const query = validate(shortFilmListQuerySchema, ctx.query ?? {})
        const { data, meta } = await service().list(query)
        ctx.body = { data, meta }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /** `GET /creative-works/short-films/featured` */
    async featured(ctx: any) {
      try {
        const { locale } = validate(
          shortFilmFeaturedQuerySchema,
          ctx.query ?? {}
        )
        const data = await service().featured(locale)
        ctx.body = { data }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },

    /** `GET /creative-works/short-films/:slug` */
    async findOne(ctx: any) {
      try {
        const { slug } = validate(shortFilmSlugParamSchema, ctx.params ?? {})
        const { locale } = validate(shortFilmDetailQuerySchema, ctx.query ?? {})
        const data = await service().findBySlug(slug, locale)
        if (!data) {
          throw new errors.NotFoundError("Short film not found", {
            code: "SHORT_FILM_NOT_FOUND",
          })
        }
        ctx.body = { data }
      } catch (err) {
        respondError(strapi, ctx, err)
      }
    },
  }
}

export default shortFilmController
