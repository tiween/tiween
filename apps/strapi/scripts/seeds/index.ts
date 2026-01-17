/**
 * Database Seed Runner
 *
 * Seeds the Strapi database with realistic Tunisian test data.
 * Uses Strapi's Document Service API for v5 compatibility.
 *
 * Usage:
 *   yarn seed       - Run all seeds
 *   yarn seed:clear - Clear seeded data
 *   yarn seed:fresh - Clear and re-seed
 *
 * @example
 * ```bash
 * cd apps/strapi
 * yarn seed
 * ```
 */

import { compileStrapi, createStrapi } from "@strapi/strapi"

import { config } from "./config"
import categoriesData from "./data/categories.json"
import citiesData from "./data/cities.json"
import creativeWorksData from "./data/creative-works.json"
import genresData from "./data/genres.json"
import personsData from "./data/persons.json"
// Import seed data
import regionsData from "./data/regions.json"
import {
  addDays,
  formatDate,
  formatTime,
  randomInt,
  randomPick,
  randomPickMultiple,
} from "./utils/dates"

// Type definitions
interface SeedResult {
  created: number
  skipped: number
  total: number
}

interface IdMap {
  [key: string]: string // slug -> documentId
}

// Global state for seeded document IDs
const idMaps: {
  regions: IdMap
  cities: IdMap
  genres: IdMap
  categories: IdMap
  persons: IdMap
  creativeWorks: IdMap
  venues: IdMap
  events: IdMap
  users: IdMap
} = {
  regions: {},
  cities: {},
  genres: {},
  categories: {},
  persons: {},
  creativeWorks: {},
  venues: {},
  events: {},
  users: {},
}

/**
 * Seed regions
 */
async function seedRegions(strapi: any): Promise<SeedResult> {
  console.log("📍 Seeding regions...")
  const uid = "plugin::geography.region"
  let created = 0,
    skipped = 0

  for (const region of regionsData) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: region.slug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.regions[region.code] = existing[0].documentId
      skipped++
      continue
    }

    const doc = await strapi.documents(uid).create({
      data: {
        name: region.name,
        slug: region.slug,
        code: region.code,
      },
      status: "published",
    })

    idMaps.regions[region.code] = doc.documentId
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: regionsData.length }
}

/**
 * Seed cities
 */
async function seedCities(strapi: any): Promise<SeedResult> {
  console.log("🏙️ Seeding cities...")
  const uid = "plugin::geography.city"
  let created = 0,
    skipped = 0

  for (const city of citiesData) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: city.slug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.cities[city.slug] = existing[0].documentId
      skipped++
      continue
    }

    const regionId = idMaps.regions[city.regionCode]
    const doc = await strapi.documents(uid).create({
      data: {
        name: city.name,
        slug: city.slug,
        latitude: city.latitude,
        longitude: city.longitude,
        region: regionId,
      },
      status: "published",
    })

    idMaps.cities[city.slug] = doc.documentId
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: citiesData.length }
}

/**
 * Seed genres
 */
async function seedGenres(strapi: any): Promise<SeedResult> {
  console.log("🎭 Seeding genres...")
  const uid = "plugin::creative-works.genre"
  let created = 0,
    skipped = 0

  for (const genre of genresData) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: genre.slug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.genres[genre.slug] = existing[0].documentId
      skipped++
      continue
    }

    const doc = await strapi.documents(uid).create({
      data: {
        name: genre.name,
        slug: genre.slug,
      },
      status: "published",
    })

    idMaps.genres[genre.slug] = doc.documentId
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: genresData.length }
}

/**
 * Seed categories
 */
async function seedCategories(strapi: any): Promise<SeedResult> {
  console.log("📂 Seeding categories...")
  const uid = "plugin::creative-works.category"
  let created = 0,
    skipped = 0

  for (const category of categoriesData) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: category.slug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.categories[category.slug] = existing[0].documentId
      skipped++
      continue
    }

    const doc = await strapi.documents(uid).create({
      data: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
      },
      status: "published",
    })

    idMaps.categories[category.slug] = doc.documentId
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: categoriesData.length }
}

/**
 * Seed persons (directors and actors)
 */
async function seedPersons(strapi: any): Promise<SeedResult> {
  console.log("👤 Seeding persons...")
  const uid = "plugin::creative-works.person"
  let created = 0,
    skipped = 0

  for (const person of personsData) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: person.slug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.persons[person.slug] = existing[0].documentId
      skipped++
      continue
    }

    const doc = await strapi.documents(uid).create({
      data: {
        name: person.name,
        slug: person.slug,
        biography: person.biography,
        birthDate: person.birthDate,
        nationality: person.nationality,
      },
      status: "published",
    })

    idMaps.persons[person.slug] = doc.documentId
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: personsData.length }
}

/**
 * Seed creative works (films, plays, short films)
 */
async function seedCreativeWorks(strapi: any): Promise<SeedResult> {
  console.log("🎬 Seeding creative works...")
  const uid = "plugin::creative-works.creative-work"
  let created = 0,
    skipped = 0

  for (const work of creativeWorksData) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: work.slug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.creativeWorks[work.slug] = existing[0].documentId
      skipped++
      continue
    }

    // Map genre slugs to document IDs
    const genreIds = work.genres
      .map((slug: string) => idMaps.genres[slug])
      .filter(Boolean)

    // Map director slugs to document IDs
    const directorIds = work.directors
      .map((slug: string) => idMaps.persons[slug])
      .filter(Boolean)

    const doc = await strapi.documents(uid).create({
      data: {
        title: work.title,
        originalTitle: work.originalTitle,
        slug: work.slug,
        type: work.type,
        synopsis: work.synopsis,
        duration: work.duration,
        releaseYear: work.releaseYear,
        ageRating: work.ageRating,
        rating: work.rating,
        genres: genreIds,
        directors: directorIds,
      },
      status: "published",
    })

    idMaps.creativeWorks[work.slug] = doc.documentId
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: creativeWorksData.length }
}

/**
 * Seed venues using existing events-manager seed service
 */
async function seedVenues(strapi: any): Promise<SeedResult> {
  console.log("🏛️ Seeding venues...")

  // Use the existing seed service from events-manager plugin
  const seedService = strapi.plugin("events-manager").service("seed")
  const result = await seedService.seedVenues()

  // Populate idMaps.venues with created venues
  const venues = await strapi
    .documents("plugin::events-manager.venue")
    .findMany({
      limit: 100,
    })
  for (const venue of venues) {
    idMaps.venues[venue.slug] = venue.documentId
  }

  return result
}

/**
 * Seed event groups using existing events-manager seed service
 */
async function seedEventGroups(strapi: any): Promise<SeedResult> {
  console.log("📅 Seeding event groups...")

  const seedService = strapi.plugin("events-manager").service("seed")
  return await seedService.seedEventGroups()
}

/**
 * Seed events with showtimes
 */
async function seedEvents(strapi: any): Promise<SeedResult> {
  console.log("🎪 Seeding events...")
  const eventUid = "plugin::events-manager.event"
  const showtimeUid = "plugin::events-manager.showtime"
  let created = 0,
    skipped = 0

  const creativeWorkSlugs = Object.keys(idMaps.creativeWorks)
  const venueSlugs = Object.keys(idMaps.venues)

  if (venueSlugs.length === 0) {
    console.log("   No venues found, skipping events")
    return { created: 0, skipped: 0, total: 0 }
  }

  const today = new Date()
  const { pastDays, futureDays } = config.eventDateRange

  for (let i = 0; i < config.eventCount; i++) {
    const workSlug = creativeWorkSlugs[i % creativeWorkSlugs.length]
    const venueSlug = venueSlugs[i % venueSlugs.length]
    const work = creativeWorksData.find((w: any) => w.slug === workSlug)

    if (!work) continue

    // Generate unique slug for this event
    const eventSlug = `${work.slug}-${venueSlug}-${i}`

    // Check if event already exists
    const existing = await strapi.documents(eventUid).findMany({
      filters: { slug: eventSlug },
      limit: 1,
    })

    if (existing.length > 0) {
      idMaps.events[eventSlug] = existing[0].documentId
      skipped++
      continue
    }

    // Random start date within range
    const startOffset = randomInt(-pastDays, futureDays)
    const startDate = addDays(today, startOffset)
    const endDate = addDays(startDate, randomInt(7, 21))

    // Determine status based on dates
    const status =
      startOffset < -pastDays / 2
        ? "completed"
        : startOffset < 0
          ? "scheduled"
          : "scheduled"

    // Create event
    const event = await strapi.documents(eventUid).create({
      data: {
        title: work.title,
        slug: eventSlug,
        description: work.synopsis,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        status,
        featured: i < 5, // First 5 events are featured
        creativeWork: idMaps.creativeWorks[workSlug],
        venue: idMaps.venues[venueSlug],
      },
      status: "published",
    })

    idMaps.events[eventSlug] = event.documentId

    // Create showtimes for this event
    const showtimeCount = randomInt(2, 4)
    const showtimeHours = [14, 17, 20, 22]

    for (let j = 0; j < showtimeCount; j++) {
      await strapi.documents(showtimeUid).create({
        data: {
          time: formatTime(showtimeHours[j]),
          format: work.type === "film" ? "VOST" : null,
          language: "ar",
          subtitles: "fr",
          price: randomInt(15, 35),
          ticketsAvailable: randomInt(50, 150),
          ticketsSold: randomInt(0, 30),
          event: event.documentId,
        },
        status: "published",
      })
    }

    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: config.eventCount }
}

/**
 * Seed test users
 */
async function seedUsers(strapi: any): Promise<SeedResult> {
  console.log("👥 Seeding users...")
  let created = 0,
    skipped = 0

  const users = Object.entries(config.testUsers)

  for (const [role, userData] of users) {
    // Check if user exists
    const existing = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { email: userData.email },
      })

    if (existing) {
      idMaps.users[role] = existing.id.toString()
      skipped++
      continue
    }

    // Get the appropriate role
    let roleEntity
    if (role === "admin") {
      // Admin users are created via Strapi admin, skip
      skipped++
      continue
    } else if (role === "venueManager") {
      roleEntity = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { type: "venue_manager" },
        })
    } else {
      roleEntity = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { type: "authenticated" },
        })
    }

    if (!roleEntity) {
      roleEntity = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { type: "authenticated" },
        })
    }

    // Create user with hashed password
    const user = await strapi.plugins["users-permissions"].services.user.add({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      confirmed: true,
      blocked: false,
      role: roleEntity?.id,
    })

    idMaps.users[role] = user.id.toString()
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
  return { created, skipped, total: users.length }
}

/**
 * Seed entity properties
 */
async function seedEntityProperties(strapi: any): Promise<void> {
  console.log("🏷️ Seeding entity properties...")

  // Use the existing seed service from entity-properties plugin
  const seedService = strapi.plugin("entity-properties").service("seed")
  await seedService.seedAll("en")

  console.log("   Done")
}

/**
 * Main seed function
 */
async function seed() {
  console.log("\n🌱 Starting database seeding...\n")
  console.log("━".repeat(50))

  const startTime = Date.now()

  let strapi: any

  try {
    // Bootstrap Strapi
    console.log("⏳ Initializing Strapi...")
    strapi = await createStrapi({
      appDir: process.cwd(),
      distDir: process.cwd() + "/.build",
    }).load()
    console.log("✅ Strapi initialized\n")

    // Run seeders in order
    const results: { [key: string]: SeedResult } = {}

    // 1. Reference data (no dependencies)
    results.regions = await seedRegions(strapi)
    results.cities = await seedCities(strapi)
    results.genres = await seedGenres(strapi)
    results.categories = await seedCategories(strapi)

    // 2. Entity properties
    await seedEntityProperties(strapi)

    // 3. Content data
    results.persons = await seedPersons(strapi)
    results.venues = await seedVenues(strapi)
    results.eventGroups = await seedEventGroups(strapi)
    results.creativeWorks = await seedCreativeWorks(strapi)
    results.events = await seedEvents(strapi)

    // 4. User data
    results.users = await seedUsers(strapi)

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log("\n" + "━".repeat(50))
    console.log(`✅ Seeding complete in ${duration}s`)
    console.log("\n📊 Summary:")

    let totalCreated = 0
    for (const [name, result] of Object.entries(results)) {
      if (result) {
        console.log(
          `   ${name}: ${result.created} created, ${result.skipped} skipped`
        )
        totalCreated += result.created
      }
    }
    console.log(`   Total: ${totalCreated} records created`)

    console.log("\n🔑 Test Credentials:")
    console.log(
      `   Regular User:    ${config.testUsers.regular.email} / ${config.testUsers.regular.password}`
    )
    console.log(
      `   Venue Manager:   ${config.testUsers.venueManager.email} / ${config.testUsers.venueManager.password}`
    )
    console.log(`   Admin:           (use Strapi admin panel)`)
    console.log("")
  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    process.exit(1)
  } finally {
    if (strapi) {
      await strapi.destroy()
    }
  }
}

// Run if called directly
seed()
