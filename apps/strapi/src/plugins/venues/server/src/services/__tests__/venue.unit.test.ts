import venueService from "../venue"

/**
 * Unit tests for `venue.findVenuesForSelector` (mocked Strapi, DW-24 / DW-25).
 *
 * Document Service API only. The load-bearing invariants:
 *  - approved-only, optional `type` scope, `name:asc`, real `start`/`limit`
 *  - `city` + `region` merge into ONE `cityRef` filter object (AND)
 *  - `total` comes from a `count()` with the SAME filters + locale
 *  - `city` is projected from the populated `cityRef.name` (absent when unset)
 *  - `include` prepends an off-page venue, is ignored when unapproved/missing,
 *    and never inflates `total`
 */

const VENUE_UID = "plugin::venues.venue"

interface DocApiMock {
  findMany: jest.Mock
  findOne: jest.Mock
  count: jest.Mock
}

function buildStrapi(docApi: Partial<DocApiMock> = {}) {
  const api: DocApiMock = {
    findMany: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    ...docApi,
  }
  const strapi: any = {
    documents: jest.fn(() => api),
    log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  return { strapi, api }
}

const base = { page: 1, pageSize: 100 }

/**
 * `findVenues` / `findVenue` back the two PUBLIC (`auth: false`) read routes.
 * Neither filters on the `status` ENUM, so the ONLY thing keeping an
 * anonymously-created venue application out of them is the Document Service
 * publication state — and `@strapi/core`'s `defaultToDraft` makes an OMITTED
 * `status` param mean **draft**, i.e. exactly the unpublished rows story 7.1
 * lets anonymous callers insert (with the applicant's phone, email and
 * address). Pin the params: dropping `status: "published"` is a silent data
 * leak that no other assertion in this suite would catch.
 *
 * Gating on publication rather than the `status` enum is also the only option
 * that works: `SEED_VENUES` never sets that enum, so an `approved`-enum filter
 * would empty the public listing.
 */
describe("venue service public reads are published-only (unit)", () => {
  it("findVenues asks the Document Service for PUBLISHED documents", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenues("fr")

    expect(strapi.documents).toHaveBeenCalledWith(VENUE_UID)
    expect(api.findMany).toHaveBeenCalledWith({
      locale: "fr",
      status: "published",
      sort: [{ name: "asc" }],
      populate: { geo: true },
    })
  })

  it("findVenues stays published-only when no locale is given", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenues()

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" })
    )
  })

  it("findVenue asks the Document Service for the PUBLISHED document", async () => {
    const { strapi, api } = buildStrapi({
      findOne: jest.fn(async () => ({ documentId: "v1", name: "Le Rio" })),
    })
    const service = venueService({ strapi })

    await service.findVenue("v1", "en")

    expect(api.findOne).toHaveBeenCalledWith({
      documentId: "v1",
      locale: "en",
      status: "published",
      populate: { geo: true, events: true },
    })
  })

  it("findVenue stays published-only when no locale is given", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenue("v1")

    expect(api.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "v1", status: "published" })
    )
  })
})

describe("venue service.findVenuesForSelector (unit)", () => {
  it("scopes to approved + type, sorts name:asc, paginates, returns the v5 shape", async () => {
    const { strapi, api } = buildStrapi({
      findMany: jest.fn(async () => [
        { documentId: "v1", name: "CinémadArt", type: "cinema" },
        { documentId: "v2", name: "Le Colisée", type: "cinema" },
      ]),
      count: jest.fn(async () => 140),
    })
    const service = venueService({ strapi })

    const result = await service.findVenuesForSelector({
      page: 2,
      pageSize: 50,
      type: "cinema",
      locale: "fr",
    })

    expect(strapi.documents).toHaveBeenCalledWith(VENUE_UID)
    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "fr",
        filters: { status: { $eq: "approved" }, type: { $eq: "cinema" } },
        sort: [{ name: "asc" }],
        populate: { cityRef: true },
        start: 50,
        limit: 50,
      })
    )
    expect(result).toEqual({
      data: [
        { documentId: "v1", name: "CinémadArt", type: "cinema" },
        { documentId: "v2", name: "Le Colisée", type: "cinema" },
      ],
      meta: { pagination: { page: 2, pageSize: 50, pageCount: 3, total: 140 } },
    })
  })

  it("always filters approved-only even with no optional params", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenuesForSelector({ ...base })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { status: { $eq: "approved" } } })
    )
  })

  it("counts with the SAME filters + locale as the page read", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 7) })
    const service = venueService({ strapi })

    await service.findVenuesForSelector({
      ...base,
      locale: "en",
      type: "cinema",
      city: "city-1",
    })

    const expected = {
      status: { $eq: "approved" },
      type: { $eq: "cinema" },
      cityRef: { documentId: { $eq: "city-1" } },
    }
    expect(api.count).toHaveBeenCalledWith({ locale: "en", filters: expected })
    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expected })
    )
  })

  it("applies a city-only scope as cityRef.documentId", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenuesForSelector({ ...base, city: "city-1" })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          cityRef: { documentId: { $eq: "city-1" } },
        }),
      })
    )
  })

  it("applies a region-only scope as cityRef.region.documentId", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenuesForSelector({ ...base, region: "region-1" })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          cityRef: { region: { documentId: { $eq: "region-1" } } },
        }),
      })
    )
  })

  it("merges city + region into ONE cityRef object (AND, no clobber)", async () => {
    const { strapi, api } = buildStrapi()
    const service = venueService({ strapi })

    await service.findVenuesForSelector({
      ...base,
      city: "city-1",
      region: "region-1",
    })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          cityRef: {
            documentId: { $eq: "city-1" },
            region: { documentId: { $eq: "region-1" } },
          },
        }),
      })
    )
  })

  it("projects city from the populated cityRef.name and drops other fields", async () => {
    const { strapi } = buildStrapi({
      findMany: jest.fn(async () => [
        {
          documentId: "v1",
          name: "Pathé",
          type: "cinema",
          status: "approved",
          address: "somewhere",
          cityRef: { documentId: "c1", name: "Tunis", slug: "tunis" },
        },
      ]),
      count: jest.fn(async () => 1),
    })
    const service = venueService({ strapi })

    const result = await service.findVenuesForSelector({ ...base })

    expect(result.data).toEqual([
      { documentId: "v1", name: "Pathé", type: "cinema", city: "Tunis" },
    ])
  })

  it("omits city entirely when cityRef is unset (no empty string)", async () => {
    const { strapi } = buildStrapi({
      findMany: jest.fn(async () => [
        { documentId: "v1", name: "Sans ville", type: "cinema", cityRef: null },
      ]),
      count: jest.fn(async () => 1),
    })
    const service = venueService({ strapi })

    const result = await service.findVenuesForSelector({ ...base })

    expect(result.data[0]).not.toHaveProperty("city")
  })

  it("returns an empty page with valid pagination (not an error)", async () => {
    const { strapi } = buildStrapi()
    const service = venueService({ strapi })

    const result = await service.findVenuesForSelector({ ...base })

    expect(result).toEqual({
      data: [],
      meta: { pagination: { page: 1, pageSize: 100, pageCount: 0, total: 0 } },
    })
  })

  describe("include (active selection escape hatch)", () => {
    it("prepends an approved venue that is not on the page, without inflating total", async () => {
      const { strapi, api } = buildStrapi({
        findMany: jest.fn(async () => [
          { documentId: "v1", name: "A", type: "cinema" },
        ]),
        count: jest.fn(async () => 140),
        findOne: jest.fn(async () => ({
          documentId: "far-away",
          name: "Zénith",
          type: "theater",
          status: "approved",
          cityRef: { name: "Sfax" },
        })),
      })
      const service = venueService({ strapi })

      const result = await service.findVenuesForSelector({
        ...base,
        type: "cinema",
        include: "far-away",
        locale: "fr",
      })

      expect(api.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "far-away",
          locale: "fr",
          populate: { cityRef: true },
        })
      )
      expect(result.data[0]).toEqual({
        documentId: "far-away",
        name: "Zénith",
        type: "theater",
        city: "Sfax",
      })
      expect(result.data).toHaveLength(2)
      expect(result.meta.pagination.total).toBe(140)
    })

    it("does not re-fetch when the included venue is already on the page", async () => {
      const { strapi, api } = buildStrapi({
        findMany: jest.fn(async () => [
          { documentId: "v1", name: "A", type: "cinema" },
        ]),
        count: jest.fn(async () => 1),
      })
      const service = venueService({ strapi })

      const result = await service.findVenuesForSelector({
        ...base,
        include: "v1",
      })

      expect(api.findOne).not.toHaveBeenCalled()
      expect(result.data).toHaveLength(1)
    })

    it("ignores an unknown include (no 404, no throw)", async () => {
      const { strapi } = buildStrapi({
        findMany: jest.fn(async () => [
          { documentId: "v1", name: "A", type: "cinema" },
        ]),
        count: jest.fn(async () => 1),
        findOne: jest.fn(async () => null),
      })
      const service = venueService({ strapi })

      const result = await service.findVenuesForSelector({
        ...base,
        include: "bogus",
      })

      expect(result.data).toEqual([
        { documentId: "v1", name: "A", type: "cinema" },
      ])
    })

    it("ignores a non-approved include", async () => {
      const { strapi } = buildStrapi({
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        findOne: jest.fn(async () => ({
          documentId: "pending-1",
          name: "Pending",
          type: "cinema",
          status: "pending",
        })),
      })
      const service = venueService({ strapi })

      const result = await service.findVenuesForSelector({
        ...base,
        include: "pending-1",
      })

      expect(result.data).toEqual([])
    })

    it("keeps the already-fetched page when the include lookup throws", async () => {
      const { strapi } = buildStrapi({
        findMany: jest.fn(async () => [
          { documentId: "v1", name: "A", type: "cinema" },
        ]),
        count: jest.fn(async () => 1),
        findOne: jest.fn(async () => {
          throw new Error("malformed documentId")
        }),
      })
      const service = venueService({ strapi })

      const result = await service.findVenuesForSelector({
        ...base,
        include: "../../etc/passwd",
      })

      // Best-effort convenience: a failing include never 500s the request nor
      // discards the page the picker actually needs.
      expect(result.data).toEqual([
        { documentId: "v1", name: "A", type: "cinema" },
      ])
      expect(strapi.log.warn).toHaveBeenCalled()
    })
  })
})
