import type { Core } from "@strapi/strapi"

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

const categories: CategorySeed[] = [
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
      {
        name: "Seating",
        slug: "seating",
        icon: "armchair",
        sortOrder: 1,
      },
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
  {
    name: "Technical",
    slug: "technical",
    icon: "settings",
    sortOrder: 4,
  },
]

const properties: PropertySeed[] = [
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

const seed = ({ strapi }: { strapi: Core.Strapi }) => ({
  async seedCategories(locale: string = "en") {
    const categoryMap = new Map<string, number>()

    // Create root categories first
    for (const category of categories) {
      const existing = await strapi
        .documents("plugin::entity-properties.property-category")
        .findFirst({
          filters: { slug: category.slug },
          locale,
        })

      if (!existing) {
        const created = await strapi
          .documents("plugin::entity-properties.property-category")
          .create({
            data: {
              name: category.name,
              slug: category.slug,
              icon: category.icon,
              sortOrder: category.sortOrder,
            },
            locale,
          })
        categoryMap.set(category.slug, created.id)
        strapi.log.info(`Created category: ${category.name}`)

        // Create children if any
        if (category.children) {
          for (const child of category.children) {
            const childCreated = await strapi
              .documents("plugin::entity-properties.property-category")
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
            strapi.log.info(`Created child category: ${child.name}`)
          }
        }
      } else {
        categoryMap.set(category.slug, existing.id)
        // Still need to map children
        if (category.children) {
          for (const child of category.children) {
            const existingChild = await strapi
              .documents("plugin::entity-properties.property-category")
              .findFirst({
                filters: { slug: child.slug },
                locale,
              })
            if (existingChild) {
              categoryMap.set(child.slug, existingChild.id)
            }
          }
        }
      }
    }

    return categoryMap
  },

  async seedProperties(locale: string = "en") {
    // First ensure categories exist
    const categoryMap = await this.seedCategories(locale)

    for (const property of properties) {
      const existing = await strapi
        .documents("plugin::entity-properties.property-definition")
        .findFirst({
          filters: { slug: property.slug },
          locale,
        })

      if (!existing) {
        const categoryId = categoryMap.get(property.categorySlug)
        await strapi
          .documents("plugin::entity-properties.property-definition")
          .create({
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
        strapi.log.info(`Created property: ${property.name}`)
      }
    }
  },

  async seedAll(locale: string = "en") {
    strapi.log.info("Seeding entity properties...")
    await this.seedProperties(locale)
    strapi.log.info("Entity properties seeding complete")
  },
})

export default seed
