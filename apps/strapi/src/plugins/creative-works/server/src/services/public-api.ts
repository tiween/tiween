import type { Core } from "@strapi/strapi"
import type { ShortFilmListQuery } from "../validation/short-films"
import type { CreateWorkInput } from "./creative-work"

const PLUGIN_ID = "creative-works"

/**
 * Public API facade — the ONLY sanctioned cross-plugin entry point for the
 * creative-works plugin (architecture amendment D8, rules R3/R4). Other
 * plugins call `strapi.plugin("creative-works").service("public-api")`;
 * internal services (`creative-work`, `person`) are private by convention.
 *
 * First consumer: events-manager's venue event-creation surface (Story 7.3),
 * which searches or creates the catalog entry an event's showtimes reference.
 */
const publicApiService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Search catalog entries by title. Passthrough to the internal service. */
  async searchWorks(query: string, limit = 20) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("creative-work")
      .search(query, limit)
  },

  /** Find one catalog entry with details, or null. */
  async findWork(documentId: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("creative-work")
      .findOneWithDetails(documentId)
  },

  /**
   * Published short films, paged (public read contract, SDATA-03). Delegates to
   * the `short-films` service; `query` must already be validated.
   */
  async findShortFilms(query: ShortFilmListQuery) {
    return strapi.plugin(PLUGIN_ID).service("short-films").list(query)
  },

  /** One published short film by slug (locale falls back to the default), or null. */
  async findShortFilm(slug: string, locale?: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("short-films")
      .findBySlug(slug, locale)
  },

  /**
   * Create AND publish a catalog entry (localized fields replicated to every
   * configured locale). See `creative-work.createWork` for the rationale.
   */
  async createWork(input: CreateWorkInput, locale?: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("creative-work")
      .createWork(input, locale)
  },
})

export default publicApiService
