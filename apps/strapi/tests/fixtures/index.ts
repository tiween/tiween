/**
 * Test Fixtures
 *
 * Provides test data references for unit and integration tests.
 * These match the seeded data from scripts/seeds/
 *
 * @example
 * ```ts
 * import { fixtures } from '../fixtures'
 *
 * describe('Venue API', () => {
 *   it('should fetch venue by slug', async () => {
 *     const res = await fetch(`/api/venues?filters[slug]=${fixtures.venues.cinematheque.slug}`)
 *     expect(res.ok).toBe(true)
 *   })
 * })
 * ```
 */

export const fixtures = {
  /**
   * Test user credentials
   * Note: Admin user must be created via Strapi admin panel
   */
  users: {
    regular: {
      email: "user@test.com",
      password: "Test123!",
      username: "testuser",
    },
    venueManager: {
      email: "manager@test.com",
      password: "Test123!",
      username: "venuemanager",
    },
    admin: {
      email: "admin@test.com",
      password: "Test123!",
      username: "admin",
    },
  },

  /**
   * Sample venues
   */
  venues: {
    cinematheque: {
      name: "Cinémathèque Tunisienne",
      slug: "cinematheque-tunisienne",
      type: "cinema",
      city: "Tunis",
    },
    theatreMunicipal: {
      name: "Théâtre Municipal de Tunis",
      slug: "theatre-municipal-tunis",
      type: "theater",
      city: "Tunis",
    },
    citeCulture: {
      name: "Cité de la Culture",
      slug: "cite-de-la-culture",
      type: "cultural-center",
      city: "Tunis",
    },
  },

  /**
   * Sample creative works
   */
  creativeWorks: {
    film: {
      title: "L'Homme qui a vendu sa peau",
      slug: "homme-vendu-sa-peau",
      type: "film",
      director: "Kaouther Ben Hania",
    },
    play: {
      title: "Familia",
      slug: "familia",
      type: "play",
      director: "Jalila Baccar",
    },
    shortFilm: {
      title: "Fragments de Tunis",
      slug: "fragments-tunis",
      type: "short-film",
    },
  },

  /**
   * Sample regions
   */
  regions: {
    grandTunis: {
      name: "Grand Tunis",
      code: "GT",
      slug: "grand-tunis",
    },
    sahel: {
      name: "Sahel",
      code: "SH",
      slug: "sahel",
    },
  },

  /**
   * Sample cities
   */
  cities: {
    tunis: {
      name: "Tunis",
      slug: "tunis",
      regionCode: "GT",
    },
    sousse: {
      name: "Sousse",
      slug: "sousse",
      regionCode: "SH",
    },
  },

  /**
   * Sample genres
   */
  genres: {
    drame: {
      name: "Drame",
      slug: "drame",
    },
    comedie: {
      name: "Comédie",
      slug: "comedie",
    },
    scienceFiction: {
      name: "Science-fiction",
      slug: "science-fiction",
    },
  },

  /**
   * Sample persons
   */
  persons: {
    kaoutherBenHania: {
      name: "Kaouther Ben Hania",
      slug: "kaouther-ben-hania",
      type: "director",
    },
    denisVilleneuve: {
      name: "Denis Villeneuve",
      slug: "denis-villeneuve",
      type: "director",
    },
  },

  /**
   * Sample event groups (festivals)
   */
  eventGroups: {
    jcc: {
      title: "Journées Cinématographiques de Carthage",
      slug: "jcc-2025",
      type: "festival",
    },
  },

  /**
   * API endpoints for testing
   */
  endpoints: {
    venues: "/api/venues",
    events: "/api/events",
    creativeWorks: "/api/creative-works",
    regions: "/api/regions",
    cities: "/api/cities",
    genres: "/api/genres",
    auth: {
      login: "/api/auth/local",
      register: "/api/auth/local/register",
    },
  },
}

/**
 * Helper to generate auth header for authenticated requests
 */
export function getAuthHeader(jwt: string): { Authorization: string } {
  return { Authorization: `Bearer ${jwt}` }
}

/**
 * Helper to login and get JWT token
 */
export async function loginUser(
  baseUrl: string,
  credentials: { email: string; password: string }
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: credentials.email,
      password: credentials.password,
    }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  const data = await response.json()
  return data.jwt
}
