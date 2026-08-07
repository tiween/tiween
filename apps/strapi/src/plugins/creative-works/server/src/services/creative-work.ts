import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "creative-works"
const CREATIVE_WORK_UID = `plugin::${PLUGIN_ID}.creative-work`

/** The `type` enum on the creative-work schema. */
export type CreativeWorkType = "film" | "play" | "short-film"

/** Accepted input for a manager-created catalog entry (Story 7.3). */
export interface CreateWorkInput {
  title: string
  type: CreativeWorkType
  synopsis?: string
  duration?: number
  releaseYear?: number
  /** Strapi upload file id for the poster (uploaded beforehand). */
  posterId?: number
}

/**
 * Enumerate the configured i18n locale codes from the i18n plugin — never a
 * hardcoded list, so adding a locale to `config/plugins.ts` automatically
 * extends the replication below.
 */
async function listLocaleCodes(strapi: Core.Strapi): Promise<string[]> {
  const rows = (await strapi.plugin("i18n").service("locales").find()) as
    | Array<{ code?: unknown }>
    | undefined
  return (Array.isArray(rows) ? rows : [])
    .map((row) => row?.code)
    .filter((code): code is string => typeof code === "string")
}

const creativeWorkService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find featured creative works
   */
  async findFeatured(limit = 10) {
    return strapi.documents(CREATIVE_WORK_UID).findMany({
      limit,
      populate: ["poster", "genres", "credits"],
    })
  },

  /**
   * Find creative works by type
   */
  async findByType(type: "film" | "play" | "short-film", limit = 20) {
    return strapi.documents(CREATIVE_WORK_UID).findMany({
      filters: { type },
      limit,
      populate: ["poster", "genres"],
    })
  },

  /**
   * Search creative works by title
   */
  async search(query: string, limit = 20) {
    return strapi.documents(CREATIVE_WORK_UID).findMany({
      filters: {
        $or: [
          { title: { $containsi: query } },
          { originalTitle: { $containsi: query } },
        ],
      },
      limit,
      populate: ["poster", "genres"],
    })
  },

  /**
   * Get creative work with full details
   */
  async findOneWithDetails(documentId: string) {
    return strapi.documents(CREATIVE_WORK_UID).findOne({
      documentId,
      populate: [
        "poster",
        "backdrop",
        "photos",
        "genres",
        "credits",
        "videos",
        "links",
      ],
    })
  },

  /**
   * Create a catalog entry on behalf of a venue manager (Story 7.3).
   *
   * The localized fields (`title`, `synopsis`, `poster` — all
   * `i18n.localized: true` on the schema) are written in the REQUEST locale
   * first, then replicated VERBATIM to every other configured locale
   * (enumerated from the i18n plugin, never hardcoded): an aggregation
   * platform needs the work findable in every locale, and translation quality
   * is a later editorial concern.
   *
   * The work is then PUBLISHED immediately in all locales. This is catalog
   * data, not a venue announcement: an unpublished work would vanish from the
   * published event's populate the moment the event goes live.
   *
   * Create + replication + publish are ONE `strapi.db.transaction`: a failure
   * partway through would otherwise leave a half-localized or unpublished
   * catalog entry that the caller believes was never created.
   */
  async createWork(input: CreateWorkInput, locale?: string) {
    const localizedData: Record<string, unknown> = {
      title: input.title,
      ...(input.synopsis !== undefined ? { synopsis: input.synopsis } : {}),
      ...(input.posterId !== undefined ? { poster: input.posterId } : {}),
    }

    const allLocales = await listLocaleCodes(strapi)

    const documentId: string = await strapi.db.transaction(async () => {
      const created = (await strapi.documents(CREATIVE_WORK_UID).create({
        data: {
          ...localizedData,
          type: input.type,
          ...(input.duration !== undefined ? { duration: input.duration } : {}),
          ...(input.releaseYear !== undefined
            ? { releaseYear: input.releaseYear }
            : {}),
        },
        ...(locale ? { locale } : {}),
        status: "draft",
      } as never)) as { documentId: string; locale?: string }

      // The locale the row was actually written in (the Document Service falls
      // back to the default locale when none is passed).
      const writtenLocale = locale ?? created.locale
      for (const other of allLocales) {
        if (other === writtenLocale) continue
        await strapi.documents(CREATIVE_WORK_UID).update({
          documentId: created.documentId,
          locale: other,
          data: localizedData,
        } as never)
      }

      await strapi.documents(CREATIVE_WORK_UID).publish({
        documentId: created.documentId,
        locale: "*",
      } as never)

      return created.documentId
    })

    return strapi.documents(CREATIVE_WORK_UID).findOne({
      documentId,
      ...(locale ? { locale } : {}),
      populate: ["poster"],
    } as never)
  },
})

export default creativeWorkService
