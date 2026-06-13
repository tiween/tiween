import type { Core } from "@strapi/strapi"

interface SeedEventGroup {
  title: string
  shortTitle?: string
  slug: string
  type: "festival" | "season" | "series" | "retrospective" | "special"
  description?: string
  startDate?: string
  endDate?: string
  featured: boolean
}

const SEED_EVENT_GROUPS: SeedEventGroup[] = [
  {
    title: "Journées Cinématographiques de Carthage",
    shortTitle: "JCC 2025",
    slug: "jcc-2025",
    type: "festival",
    description:
      "Les Journées Cinématographiques de Carthage, le plus ancien festival de cinéma du monde arabe et africain.",
    startDate: "2025-10-25",
    endDate: "2025-11-02",
    featured: true,
  },
  {
    title: "Festival International du Film de Sfax",
    shortTitle: "FIFS 2025",
    slug: "fifs-2025",
    type: "festival",
    description:
      "Festival dédié au cinéma indépendant et aux nouvelles voix du cinéma tunisien.",
    startDate: "2025-04-10",
    endDate: "2025-04-17",
    featured: true,
  },
  {
    title: "Rétrospective Nouri Bouzid",
    shortTitle: "Bouzid",
    slug: "retrospective-nouri-bouzid",
    type: "retrospective",
    description:
      "Redécouvrez l'œuvre du maître du cinéma tunisien Nouri Bouzid.",
    startDate: "2025-02-01",
    endDate: "2025-02-28",
    featured: false,
  },
  {
    title: "Ciné-Club Jeune Public",
    shortTitle: "Jeune Public",
    slug: "cine-club-jeune-public",
    type: "series",
    description: "Séances de cinéma pour les enfants et adolescents tunisiens.",
    featured: false,
  },
  {
    title: "Nuits du Cinéma Arabe",
    shortTitle: "Nuits Arabes",
    slug: "nuits-cinema-arabe-2025",
    type: "special",
    description:
      "Projections nocturnes de films arabes classiques et contemporains à la Cité de la Culture.",
    startDate: "2025-06-01",
    endDate: "2025-06-15",
    featured: true,
  },
  {
    title: "Printemps du Cinéma Tunisien",
    shortTitle: "Printemps 2025",
    slug: "printemps-cinema-tunisien-2025",
    type: "season",
    description: "Une saison dédiée aux nouvelles productions tunisiennes.",
    startDate: "2025-03-01",
    endDate: "2025-05-31",
    featured: false,
  },
]

const seedService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async seedEventGroups() {
    const eventGroupUID = "plugin::events-manager.event-group"
    let created = 0
    let skipped = 0

    for (const groupData of SEED_EVENT_GROUPS) {
      // Check if event group already exists by slug
      const existing = await strapi.documents(eventGroupUID).findMany({
        filters: { slug: groupData.slug },
        limit: 1,
      })

      if (existing.length > 0) {
        strapi.log.debug(
          `[seed] Event Group "${groupData.title}" already exists, skipping`
        )
        skipped++
        continue
      }

      await strapi.documents(eventGroupUID).create({
        data: groupData,
        status: "published",
      })
      strapi.log.info(`[seed] Created event group: ${groupData.title}`)
      created++
    }

    return { created, skipped, total: SEED_EVENT_GROUPS.length }
  },

  async seedAll() {
    strapi.log.info("[seed] Starting seed process...")

    // Venue seeding lives in the venues plugin (architecture amendment 2C.1).
    const venueResults = await strapi
      .plugin("venues")
      .service("seed")
      .seedVenues()
    const eventGroupResults = await this.seedEventGroups()

    strapi.log.info(
      `[seed] Completed! Venues: ${venueResults.created} created, ${venueResults.skipped} skipped. ` +
        `Event Groups: ${eventGroupResults.created} created, ${eventGroupResults.skipped} skipped.`
    )

    return {
      venues: venueResults,
      eventGroups: eventGroupResults,
    }
  },
})

export default seedService
