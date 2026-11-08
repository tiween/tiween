/**
 * Work editor read controller (plan 01-15, gap G-01-1).
 *
 * `GET /creative-works/admin/works/:documentId?locale=<code>`: the Works edit
 * page's read. Validate the input, check the content-manager read permission,
 * delegate to `services/work-editor.ts`, and answer the content-manager's own
 * `{ data, meta }` envelope with every output passed through its
 * `sanitizeOutput`. Errors carry a SCREAMING_SNAKE CODE, never prose.
 */
import { z } from "zod"

import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation"
import { WORK_UID } from "../services/work-editor"

const PLUGIN_ID = "creative-works"

const WORK_EDITOR_FORBIDDEN = "WORK_EDITOR_FORBIDDEN"

/**
 * Error CODE → HTTP status. An UNMAPPED code collapses to 500
 * `INTERNAL_ERROR` for the client and is LOGGED, so a raw Document Service
 * failure stays diagnosable without disclosing its message.
 */
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  UNSUPPORTED_LOCALE: 400,
  [WORK_EDITOR_FORBIDDEN]: 403,
  WORK_NOT_FOUND: 404,
}

const paramsSchema = z.object({
  documentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
})

// `.strict()`: populate is server-owned, so any other parameter is refused
// rather than silently ignored.
const querySchema = z
  .object({
    locale: z.string().min(2).max(10).optional(),
  })
  .strict()

function respondError(strapi: Core.Strapi, ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  const issues = err?.details?.issues

  if (!mappedStatus) {
    strapi.log.error(
      `[${PLUGIN_ID}:admin] unmapped work-editor error (code=${code ?? "none"}): ${
        err?.stack ?? err
      }`
    )
  }

  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "WorkEditorError",
      message: "Work editor request failed",
      details: {
        code: mappedStatus ? code : "INTERNAL_ERROR",
        ...(mappedStatus && Array.isArray(issues) ? { issues } : {}),
      },
    },
  }
}

const workEditorController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async findOne(ctx: any) {
    try {
      const { documentId } = validate(paramsSchema, ctx.params)
      const { locale } = validate(querySchema, ctx.query ?? {})

      const permissionChecker = strapi
        .plugin("content-manager")
        .service("permission-checker")
        .create({ userAbility: ctx.state.userAbility, model: WORK_UID })

      const forbidden = () =>
        respondError(strapi, ctx, { details: { code: WORK_EDITOR_FORBIDDEN } })

      if (permissionChecker.cannot.read()) return forbidden()

      const editor = strapi.plugin(PLUGIN_ID).service("work-editor")
      const { document, locale: resolved } = await editor.findForEditor({
        documentId,
        locale,
      })

      // Conditions that need populated content can only be evaluated now.
      if (document && permissionChecker.cannot.read(document)) {
        return forbidden()
      }

      const sanitized = document
        ? await permissionChecker.sanitizeOutput(document)
        : null
      const { data, meta } = await editor.withEditorMetadata(sanitized, {
        documentId,
        locale: resolved,
      })

      // Every other-locale / other-status entry is sanitized too, exactly like
      // the content-manager's own metadata util.
      const sanitizeEntries = (entries: unknown) =>
        Promise.all(
          (Array.isArray(entries) ? entries : []).map((entry) =>
            permissionChecker.sanitizeOutput(entry)
          )
        )

      ctx.body = {
        data,
        meta: {
          availableLocales: await sanitizeEntries(meta?.availableLocales),
          availableStatus: await sanitizeEntries(meta?.availableStatus),
        },
      }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },
})

export default workEditorController
