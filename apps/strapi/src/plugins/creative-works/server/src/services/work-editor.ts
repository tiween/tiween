/**
 * Work editor read (plan 01-15, gap G-01-1).
 *
 * The Works edit page cannot read a work through the content-manager
 * single-document GET: that controller builds its populate with
 * `populateDeep(Infinity).countRelations()` and ignores the `populate` query
 * parameter, so every relation arrives as `{ count: n }` (genres, credit
 * persons and roles, cast persons and characters, the premiere venue). The form
 * crashed on `.map`, and the publish pre-check and the translation targets saw
 * no director and no credited persons.
 *
 * This service reads the DRAFT row through the Document Service with an
 * explicit, field-allowlisted populate, and delegates `status` and
 * `meta.availableLocales` to the content-manager's own `document-metadata`
 * service so both reads agree on them. The plugin owns the content type, so
 * `strapi.documents()` on its own UID is within the module boundary.
 */
import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"

export const WORK_UID = "plugin::creative-works.creative-work"

/** Error codes the controller maps to HTTP statuses. */
export const UNSUPPORTED_LOCALE = "UNSUPPORTED_LOCALE"
export const WORK_NOT_FOUND = "WORK_NOT_FOUND"

/**
 * What the editor read resolves. Relation targets expose only the fields the
 * form shows (`name`, plus `slug` / `department` where the form branches on
 * them), never a person's bio, birth date or nationality. `id` and
 * `documentId` always ride along.
 *
 * Every path the Works form round-trips must be here: `workToApiPayload`
 * re-sends credits and cast wholesale, so a missing path silently drops data
 * on the next save. `work-editor.service.test.ts` pins this list against
 * `events-manager/admin/src/hooks/workPopulate.ts`.
 */
export const WORK_EDITOR_POPULATE = {
  poster: true,
  backdrop: true,
  photos: true,
  genres: { fields: ["name", "slug"] },
  credits: {
    populate: {
      person: { fields: ["name"] },
      creditRole: { fields: ["name", "slug", "department"] },
    },
  },
  cast: {
    populate: {
      person: { fields: ["name"] },
      character: { fields: ["name"] },
    },
  },
  theatreDetails: {
    populate: {
      premiereVenue: { fields: ["name"] },
    },
  },
  distinctions: true,
  externalIds: true,
  videos: true,
  links: true,
  streamingLinks: true,
} as const

interface EditorMetadata {
  data: Record<string, unknown>
  meta: {
    availableLocales: Array<Record<string, unknown>>
    availableStatus: Array<Record<string, unknown>>
  }
}

const workEditorService = ({ strapi }: { strapi: Core.Strapi }) => {
  const localesService = () => strapi.plugin("i18n").service("locales")
  const contentManager = () => strapi.plugin("content-manager")

  /**
   * Validate the requested locale against the i18n plugin (never a hardcoded
   * list); an absent one means the configured default.
   *
   * @throws ValidationError with `details.code = "UNSUPPORTED_LOCALE"`.
   */
  async function resolveLocale(locale?: string): Promise<string> {
    const defaultLocale = (await localesService().getDefaultLocale()) as string
    if (locale === undefined || locale === defaultLocale) return defaultLocale

    const rows = (await localesService().find()) as
      | Array<{ code?: unknown }>
      | undefined
    const codes = (Array.isArray(rows) ? rows : []).map((row) => row?.code)
    if (!codes.includes(locale)) {
      throw new errors.ValidationError("Unsupported locale", {
        code: UNSUPPORTED_LOCALE,
      })
    }
    return locale
  }

  return {
    /**
     * The draft row of `documentId` in `locale` with its relations resolved.
     * `document` is null when only this locale has no row yet.
     *
     * @throws NotFoundError with `details.code = "WORK_NOT_FOUND"` when no
     *         locale of the document exists.
     * @throws ValidationError with `details.code = "UNSUPPORTED_LOCALE"`.
     */
    async findForEditor({
      documentId,
      locale,
    }: {
      documentId: string
      locale?: string
    }): Promise<{ document: Record<string, unknown> | null; locale: string }> {
      const resolved = await resolveLocale(locale)

      const document = (await strapi.documents(WORK_UID).findOne({
        documentId,
        locale: resolved,
        status: "draft",
        populate: WORK_EDITOR_POPULATE,
      } as never)) as Record<string, unknown> | null

      if (!document) {
        const exists = await contentManager()
          .service("document-manager")
          .exists(WORK_UID, documentId)
        if (!exists) {
          throw new errors.NotFoundError("Work not found", {
            code: WORK_NOT_FOUND,
          })
        }
      }

      return { document, locale: resolved }
    },

    /**
     * The content-manager's `{ data, meta }` envelope for a document (data
     * carries `status`; meta lists the other locales and statuses). For a
     * missing locale row the answer is `{ data: {}, meta }`, like the
     * content-manager.
     */
    async withEditorMetadata(
      document: Record<string, unknown> | null,
      { documentId, locale }: { documentId: string; locale: string }
    ): Promise<EditorMetadata> {
      const metadata = contentManager().service("document-metadata")

      if (document) {
        return (await metadata.formatDocumentWithMetadata(
          WORK_UID,
          document
        )) as EditorMetadata
      }

      const { meta } = await metadata.formatDocumentWithMetadata(
        WORK_UID,
        { documentId, locale, publishedAt: null },
        { availableLocales: true, availableStatus: false }
      )
      return { data: {}, meta } as EditorMetadata
    },
  }
}

export default workEditorService
