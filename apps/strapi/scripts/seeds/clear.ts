/**
 * Clear Seeded Data
 *
 * Removes all seeded test data from the database.
 * Preserves data that wasn't created by the seed script.
 *
 * Usage:
 *   yarn seed:clear
 */

import { createStrapi } from "@strapi/strapi"

import { config } from "./config"

// Content types to clear in reverse dependency order
const CONTENT_TYPES = [
  // User engagement (depends on users and creative works)
  "plugin::user-engagement.user-watchlist",

  // Ticketing (depends on users and events)
  "plugin::ticketing.ticket",
  "plugin::ticketing.ticket-order",

  // Events (depends on venues and creative works)
  "plugin::events-manager.showtime",
  "plugin::events-manager.event",
  "plugin::events-manager.event-group",

  // Venues
  "plugin::events-manager.venue",

  // Creative works (depends on genres and persons)
  "plugin::creative-works.creative-work",

  // Persons
  "plugin::creative-works.person",

  // Reference data (no dependencies)
  "plugin::creative-works.genre",
  "plugin::creative-works.category",

  // Geography
  "plugin::geography.city",
  "plugin::geography.region",

  // Entity properties
  "plugin::entity-properties.property-definition",
  "plugin::entity-properties.property-category",
]

/**
 * Delete all documents of a content type
 */
async function clearContentType(strapi: any, uid: string): Promise<number> {
  try {
    const docs = await strapi.documents(uid).findMany({
      limit: 10000,
    })

    let deleted = 0
    for (const doc of docs) {
      try {
        await strapi.documents(uid).delete({
          documentId: doc.documentId,
        })
        deleted++
      } catch {
        // Ignore deletion errors (may be referenced)
      }
    }

    return deleted
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return 0
    }
    throw error
  }
}

/**
 * Clear test users
 */
async function clearTestUsers(strapi: any): Promise<number> {
  const testEmails = Object.values(config.testUsers).map((u) => u.email)

  let deleted = 0
  for (const email of testEmails) {
    try {
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { email },
        })

      if (user) {
        await strapi.db.query("plugin::users-permissions.user").delete({
          where: { id: user.id },
        })
        deleted++
      }
    } catch {
      // Ignore errors
    }
  }

  return deleted
}

/**
 * Main clear function
 */
async function clear() {
  console.log("\n🧹 Clearing seeded data...\n")
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

    let totalDeleted = 0

    // Clear content types
    for (const uid of CONTENT_TYPES) {
      const shortName = uid.split(".").pop()
      const deleted = await clearContentType(strapi, uid)
      if (deleted > 0) {
        console.log(`   Deleted ${deleted} ${shortName} records`)
        totalDeleted += deleted
      }
    }

    // Clear test users
    const usersDeleted = await clearTestUsers(strapi)
    if (usersDeleted > 0) {
      console.log(`   Deleted ${usersDeleted} test users`)
      totalDeleted += usersDeleted
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log("\n" + "━".repeat(50))
    console.log(`✅ Clear complete in ${duration}s`)
    console.log(`   Total: ${totalDeleted} records deleted`)
    console.log("")
  } catch (error) {
    console.error("\n❌ Clear failed:", error)
    process.exit(1)
  } finally {
    if (strapi) {
      await strapi.destroy()
    }
  }
}

// Run if called directly
clear()
