import type { Core } from "@strapi/strapi"

interface SeedVenue {
  name: string
  slug: string
  type: "cinema" | "theater" | "cultural-center" | "museum" | "other"
  address: string
  city: string
  region: string
  capacity?: number
  status: "approved"
}

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

const SEED_VENUES: SeedVenue[] = [
  {
    name: "Cinémathèque Tunisienne",
    slug: "cinematheque-tunisienne",
    type: "cinema",
    address: "18 Rue Ibn Rachiq",
    city: "Tunis",
    region: "Tunis",
    capacity: 300,
    status: "approved",
  },
  {
    name: "Théâtre Municipal de Tunis",
    slug: "theatre-municipal-tunis",
    type: "theater",
    address: "Avenue Habib Bourguiba",
    city: "Tunis",
    region: "Tunis",
    capacity: 850,
    status: "approved",
  },
  {
    name: "Cité de la Culture",
    slug: "cite-de-la-culture",
    type: "cultural-center",
    address: "Avenue Mohamed V",
    city: "Tunis",
    region: "Tunis",
    capacity: 1800,
    status: "approved",
  },
  {
    name: "Institut Français de Tunisie",
    slug: "institut-francais-tunisie",
    type: "cultural-center",
    address: "20-22 Avenue de Paris",
    city: "Tunis",
    region: "Tunis",
    capacity: 250,
    status: "approved",
  },
  {
    name: "Cinéma Le Colisée",
    slug: "cinema-le-colisee",
    type: "cinema",
    address: "Avenue Habib Bourguiba",
    city: "Tunis",
    region: "Tunis",
    capacity: 400,
    status: "approved",
  },
  {
    name: "Espace El Teatro",
    slug: "espace-el-teatro",
    type: "theater",
    address: "Rue El Jazira",
    city: "Tunis",
    region: "Tunis",
    capacity: 200,
    status: "approved",
  },
  {
    name: "Maison de la Culture Ibn Khaldoun",
    slug: "maison-culture-ibn-khaldoun",
    type: "cultural-center",
    address: "Rue Ibn Khaldoun",
    city: "Tunis",
    region: "Tunis",
    capacity: 350,
    status: "approved",
  },
  {
    name: "Acropolium de Carthage",
    slug: "acropolium-carthage",
    type: "cultural-center",
    address: "Colline de Byrsa",
    city: "Carthage",
    region: "Tunis",
    capacity: 500,
    status: "approved",
  },
]

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
  async seedVenues() {
    const venueUID = "plugin::events-manager.venue"
    let created = 0
    let skipped = 0

    for (const venueData of SEED_VENUES) {
      // Check if venue already exists by slug
      const existing = await strapi.documents(venueUID).findMany({
        filters: { slug: venueData.slug },
        limit: 1,
      })

      if (existing.length > 0) {
        strapi.log.debug(
          `[seed] Venue "${venueData.name}" already exists, skipping`
        )
        skipped++
        continue
      }

      await strapi.documents(venueUID).create({
        data: venueData,
        status: "published",
      })
      strapi.log.info(`[seed] Created venue: ${venueData.name}`)
      created++
    }

    return { created, skipped, total: SEED_VENUES.length }
  },

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

    const venueResults = await this.seedVenues()
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
