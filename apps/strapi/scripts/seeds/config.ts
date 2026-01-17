/**
 * Seed configuration
 *
 * This file contains configuration for the database seeding process.
 */

export const config = {
  /** Default locale for seeded content */
  defaultLocale: "fr",

  /** Additional locales to seed */
  locales: ["ar", "en"],

  /** Test user credentials */
  testUsers: {
    regular: {
      username: "testuser",
      email: "user@test.com",
      password: "Test123!",
    },
    venueManager: {
      username: "venuemanager",
      email: "manager@test.com",
      password: "Test123!",
    },
    admin: {
      username: "admin",
      email: "admin@test.com",
      password: "Test123!",
    },
  },

  /** Number of events to generate */
  eventCount: 50,

  /** Number of days in past/future for events */
  eventDateRange: {
    pastDays: 10,
    futureDays: 30,
  },
}

export type SeedConfig = typeof config
