/**
 * venues `public-api` facade (Story 7.3).
 *
 * `findVenueForManager` is the ONE cross-plugin seam behind all six
 * events-manager `/venue/*` endpoints: it derives the tenant from the
 * authenticated caller. Every test on the events-manager side mocks this
 * facade wholesale, so without this suite a shape change here — a dropped
 * `status`, a renamed `documentId`, a delegation moved to the projected
 * `getMyVenue` — would 404 every endpoint or refuse publication for every
 * approved venue with the whole Strapi gate still green.
 */
import publicApiService from "../public-api"

describe("venues public-api.findVenueForManager (unit)", () => {
  function buildStrapi(profile: Record<string, jest.Mock>) {
    const service = jest.fn((name: string) => {
      if (name !== "venue-profile")
        throw new Error(`Unexpected service ${name}`)
      return profile
    })
    const strapi: any = {
      plugin: jest.fn((name: string) => {
        if (name !== "venues") throw new Error(`Unexpected plugin ${name}`)
        return { service }
      }),
    }
    return { strapi, service }
  }

  it("looks the venue up BY MANAGER ID — never by a caller-supplied id", async () => {
    const profile = {
      findVenueDraftForManager: jest.fn(async () => ({
        documentId: "venue-1",
        status: "approved",
        name: "Le Rio",
      })),
    }
    const { strapi } = buildStrapi(profile)

    await publicApiService({ strapi }).findVenueForManager(42)

    expect(profile.findVenueDraftForManager).toHaveBeenCalledWith({ id: 42 })
  })

  it("returns the documentId AND the status the publish gate reads", async () => {
    const profile = {
      findVenueDraftForManager: jest.fn(async () => ({
        documentId: "venue-1",
        status: "approved",
        name: "Le Rio",
      })),
    }
    const { strapi } = buildStrapi(profile)

    const result = await publicApiService({ strapi }).findVenueForManager(42)

    // `status` is load-bearing: events-manager refuses publication with
    // VENUE_NOT_APPROVED for anything other than "approved", so dropping it
    // here would block every approved venue from ever publishing.
    expect(result).toEqual({
      documentId: "venue-1",
      status: "approved",
      name: "Le Rio",
    })
  })

  it("carries a PENDING status through rather than normalizing it away", async () => {
    const profile = {
      findVenueDraftForManager: jest.fn(async () => ({
        documentId: "venue-2",
        status: "pending",
      })),
    }
    const { strapi } = buildStrapi(profile)

    const result = await publicApiService({ strapi }).findVenueForManager("7")

    expect(result).toEqual({ documentId: "venue-2", status: "pending" })
  })

  it("returns null when the caller manages no venue", async () => {
    const profile = { findVenueDraftForManager: jest.fn(async () => null) }
    const { strapi } = buildStrapi(profile)

    expect(
      await publicApiService({ strapi }).findVenueForManager(42)
    ).toBeNull()
  })

  it("returns null for a row without a usable documentId", async () => {
    const profile = {
      findVenueDraftForManager: jest.fn(async () => ({ status: "approved" })),
    }
    const { strapi } = buildStrapi(profile)

    expect(
      await publicApiService({ strapi }).findVenueForManager(42)
    ).toBeNull()
  })
})
