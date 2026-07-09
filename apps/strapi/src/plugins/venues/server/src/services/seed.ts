import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const
const PROPERTY_CATEGORY_UID = `plugin::${PLUGIN_ID}.property-category` as const
const PROPERTY_DEFINITION_UID =
  `plugin::${PLUGIN_ID}.property-definition` as const

interface SeedVenue {
  name: string
  slug: string
  address: string
  capacity?: number
  /** Real `shared.geo-point` coordinates for the Story 3.8 venue map. */
  geo?: {
    latitude: number
    longitude: number
  }
}

type CategoryId = string | number

interface CategorySeed {
  name: string
  slug: string
  icon?: string
  sortOrder: number
  children?: CategorySeed[]
}

interface PropertySeed {
  name: string
  slug: string
  description?: string
  type: "boolean" | "integer" | "string" | "enum"
  icon?: string
  enumOptions?: string[]
  sortOrder: number
  categorySlug: string
}

const SEED_VENUES: SeedVenue[] = [
  {
    name: "Cinémathèque Tunisienne",
    slug: "cinematheque-tunisienne",
    address: "18 Rue Ibn Rachiq, Tunis",
    capacity: 300,
    geo: { latitude: 36.8008, longitude: 10.1817 },
  },
  {
    name: "Théâtre Municipal de Tunis",
    slug: "theatre-municipal-tunis",
    address: "Avenue Habib Bourguiba, Tunis",
    capacity: 850,
    geo: { latitude: 36.7996, longitude: 10.1837 },
  },
  {
    name: "Cité de la Culture",
    slug: "cite-de-la-culture",
    address: "Avenue Mohamed V, Tunis",
    capacity: 1800,
    geo: { latitude: 36.8258, longitude: 10.1858 },
  },
  {
    name: "Institut Français de Tunisie",
    slug: "institut-francais-tunisie",
    address: "20-22 Avenue de Paris, Tunis",
    capacity: 250,
    geo: { latitude: 36.8033, longitude: 10.1808 },
  },
  {
    name: "Cinéma Le Colisée",
    slug: "cinema-le-colisee",
    address: "Avenue Habib Bourguiba, Tunis",
    capacity: 400,
    geo: { latitude: 36.8003, longitude: 10.1852 },
  },
  {
    name: "Espace El Teatro",
    slug: "espace-el-teatro",
    address: "Rue El Jazira, Tunis",
    capacity: 200,
    geo: { latitude: 36.8021, longitude: 10.1795 },
  },
  {
    name: "Maison de la Culture Ibn Khaldoun",
    slug: "maison-culture-ibn-khaldoun",
    address: "Rue Ibn Khaldoun, Tunis",
    capacity: 350,
    geo: { latitude: 36.8014, longitude: 10.1779 },
  },
  {
    name: "Acropolium de Carthage",
    slug: "acropolium-carthage",
    address: "Colline de Byrsa, Carthage",
    capacity: 500,
    geo: { latitude: 36.8528, longitude: 10.3233 },
  },
]

const PROPERTY_CATEGORIES: CategorySeed[] = [
  {
    name: "Accessibility",
    slug: "accessibility",
    icon: "accessibility",
    sortOrder: 1,
  },
  {
    name: "Facilities",
    slug: "facilities",
    icon: "building",
    sortOrder: 2,
    children: [
      { name: "Seating", slug: "seating", icon: "armchair", sortOrder: 1 },
      {
        name: "Audio/Visual",
        slug: "audio-visual",
        icon: "speaker",
        sortOrder: 2,
      },
    ],
  },
  {
    name: "Services",
    slug: "services",
    icon: "concierge-bell",
    sortOrder: 3,
  },
  { name: "Technical", slug: "technical", icon: "settings", sortOrder: 4 },
]

const PROPERTY_DEFINITIONS: PropertySeed[] = [
  // Accessibility
  {
    name: "Wheelchair Accessible",
    slug: "wheelchair-accessible",
    description: "Venue has wheelchair access and accommodations",
    type: "boolean",
    icon: "wheelchair",
    sortOrder: 1,
    categorySlug: "accessibility",
  },
  {
    name: "Hearing Loop",
    slug: "hearing-loop",
    description: "Audio induction loop for hearing aids",
    type: "boolean",
    icon: "ear",
    sortOrder: 2,
    categorySlug: "accessibility",
  },
  {
    name: "Accessible Restrooms",
    slug: "accessible-restrooms",
    description: "Restrooms accessible for people with disabilities",
    type: "boolean",
    icon: "accessibility",
    sortOrder: 3,
    categorySlug: "accessibility",
  },
  // Facilities - Seating
  {
    name: "Seating Capacity",
    slug: "seating-capacity",
    description: "Total number of seats available",
    type: "integer",
    icon: "users",
    sortOrder: 1,
    categorySlug: "seating",
  },
  {
    name: "Seating Type",
    slug: "seating-type",
    description: "Type of seating arrangement",
    type: "enum",
    icon: "armchair",
    enumOptions: ["fixed", "flexible", "standing", "mixed"],
    sortOrder: 2,
    categorySlug: "seating",
  },
  {
    name: "VIP Seating",
    slug: "vip-seating",
    description: "Premium seating options available",
    type: "boolean",
    icon: "crown",
    sortOrder: 3,
    categorySlug: "seating",
  },
  // Facilities - Audio/Visual
  {
    name: "Surround Sound",
    slug: "surround-sound",
    description: "Multi-channel surround sound system",
    type: "boolean",
    icon: "volume-2",
    sortOrder: 1,
    categorySlug: "audio-visual",
  },
  {
    name: "3D Capable",
    slug: "3d-capable",
    description: "Can show 3D content",
    type: "boolean",
    icon: "box",
    sortOrder: 2,
    categorySlug: "audio-visual",
  },
  {
    name: "IMAX",
    slug: "imax",
    description: "IMAX projection system",
    type: "boolean",
    icon: "maximize",
    sortOrder: 3,
    categorySlug: "audio-visual",
  },
  {
    name: "Screen Count",
    slug: "screen-count",
    description: "Number of screens/projection areas",
    type: "integer",
    icon: "monitor",
    sortOrder: 4,
    categorySlug: "audio-visual",
  },
  // Services
  {
    name: "Parking Available",
    slug: "parking-available",
    description: "On-site parking facilities",
    type: "boolean",
    icon: "car",
    sortOrder: 1,
    categorySlug: "services",
  },
  {
    name: "Concession Stand",
    slug: "concession-stand",
    description: "Food and beverages available",
    type: "boolean",
    icon: "coffee",
    sortOrder: 2,
    categorySlug: "services",
  },
  {
    name: "WiFi",
    slug: "wifi",
    description: "Wireless internet access",
    type: "boolean",
    icon: "wifi",
    sortOrder: 3,
    categorySlug: "services",
  },
  {
    name: "Coat Check",
    slug: "coat-check",
    description: "Coat check service available",
    type: "boolean",
    icon: "shirt",
    sortOrder: 4,
    categorySlug: "services",
  },
  // Technical
  {
    name: "Air Conditioning",
    slug: "air-conditioning",
    description: "Climate controlled environment",
    type: "boolean",
    icon: "thermometer",
    sortOrder: 1,
    categorySlug: "technical",
  },
  {
    name: "Year Built",
    slug: "year-built",
    description: "Year the venue was constructed",
    type: "integer",
    icon: "calendar",
    sortOrder: 2,
    categorySlug: "technical",
  },
  {
    name: "Last Renovated",
    slug: "last-renovated",
    description: "Year of last major renovation",
    type: "integer",
    icon: "wrench",
    sortOrder: 3,
    categorySlug: "technical",
  },
]

const seedService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async seedVenues() {
    let created = 0
    let skipped = 0

    for (const venueData of SEED_VENUES) {
      // Check if venue already exists by slug
      const existing = await strapi.documents(VENUE_UID).findMany({
        filters: { slug: venueData.slug },
        limit: 1,
      })

      if (existing.length > 0) {
        strapi.log.debug(
          `[venues:seed] Venue "${venueData.name}" already exists, skipping`
        )
        skipped++
        continue
      }

      await strapi.documents(VENUE_UID).create({
        data: venueData,
        status: "published",
      })
      strapi.log.info(`[venues:seed] Created venue: ${venueData.name}`)
      created++
    }

    return { created, skipped, total: SEED_VENUES.length }
  },

  async seedPropertyCategories(locale: string = "en") {
    const categoryMap = new Map<string, CategoryId>()

    for (const category of PROPERTY_CATEGORIES) {
      const existing = await strapi
        .documents(PROPERTY_CATEGORY_UID)
        .findFirst({ filters: { slug: category.slug }, locale })

      if (!existing) {
        const created = await strapi.documents(PROPERTY_CATEGORY_UID).create({
          data: {
            name: category.name,
            slug: category.slug,
            icon: category.icon,
            sortOrder: category.sortOrder,
          },
          locale,
        })
        categoryMap.set(category.slug, created.id)
        strapi.log.info(`[venues:seed] Created category: ${category.name}`)

        if (category.children) {
          for (const child of category.children) {
            const childCreated = await strapi
              .documents(PROPERTY_CATEGORY_UID)
              .create({
                data: {
                  name: child.name,
                  slug: child.slug,
                  icon: child.icon,
                  sortOrder: child.sortOrder,
                  parent: created.id,
                },
                locale,
              })
            categoryMap.set(child.slug, childCreated.id)
            strapi.log.info(
              `[venues:seed] Created child category: ${child.name}`
            )
          }
        }
      } else {
        categoryMap.set(category.slug, existing.id)
        if (category.children) {
          for (const child of category.children) {
            const existingChild = await strapi
              .documents(PROPERTY_CATEGORY_UID)
              .findFirst({ filters: { slug: child.slug }, locale })
            if (existingChild) {
              categoryMap.set(child.slug, existingChild.id)
            }
          }
        }
      }
    }

    return categoryMap
  },

  async seedPropertyDefinitions(locale: string = "en") {
    const categoryMap = await this.seedPropertyCategories(locale)

    for (const property of PROPERTY_DEFINITIONS) {
      const existing = await strapi
        .documents(PROPERTY_DEFINITION_UID)
        .findFirst({ filters: { slug: property.slug }, locale })

      if (!existing) {
        const categoryId = categoryMap.get(property.categorySlug)
        await strapi.documents(PROPERTY_DEFINITION_UID).create({
          data: {
            name: property.name,
            slug: property.slug,
            description: property.description,
            type: property.type,
            icon: property.icon,
            enumOptions: property.enumOptions,
            sortOrder: property.sortOrder,
            category: categoryId,
          },
          locale,
        })
        strapi.log.info(`[venues:seed] Created property: ${property.name}`)
      }
    }
  },
})

export default seedService
