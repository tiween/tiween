import venueService, { toPublicVenue } from "../venue"

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

/**
 * `findVenueBySlug` + `toPublicVenue` (Story 7.2) — the public venue page read.
 *
 * Added ALONGSIDE the three readers above, never by editing them: 7.1's review
 * pinned their `status` params to close a data leak and that pin must not
 * regress. This reader carries the same publication gate for the same reason,
 * plus an explicit output whitelist — `manager` (a users-permissions record)
 * and `status` must never reach an unauthenticated caller.
 */
describe("venue service.findVenueBySlug (unit)", () => {
  const RAW_ROW = {
    id: 17,
    documentId: "venue-1",
    name: "Le Rio",
    slug: "le-rio",
    description: "Salle art déco",
    address: "12 rue de Rome",
    type: "cinema",
    status: "approved",
    phone: "+216 71 000 000",
    email: "contact@lerio.tn",
    website: "https://lerio.tn",
    capacity: 300,
    geo: { id: 3, latitude: 36.8, longitude: 10.18 },
    logo: { id: 5, url: "/uploads/logo.png", name: "logo.png" },
    images: [{ id: 6, url: "/uploads/a.png" }],
    cityRef: { id: 2, documentId: "city-1", name: "Tunis", slug: "tunis" },
    properties: [
      {
        id: 9,
        booleanValue: true,
        definition: {
          id: 4,
          documentId: "def-1",
          name: "Wheelchair Accessible",
          slug: "wheelchair-accessible",
          type: "boolean",
        },
      },
    ],
    manager: { id: 42, email: "manager@example.com", password: "$2b$hash" },
  }

  const PROPERTY_DEFINITION_UID = "plugin::venues.property-definition"

  function buildSlugStrapi(row: unknown, localizedDefinitions?: unknown[]) {
    const api = { findFirst: jest.fn(async () => row) }
    const definitionApi = {
      findMany: jest.fn(async () => localizedDefinitions ?? []),
    }
    const strapi: any = {
      documents: jest.fn((uid: string) =>
        uid === PROPERTY_DEFINITION_UID ? definitionApi : api
      ),
      log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    }
    return { strapi, api, definitionApi }
  }

  it("asks the Document Service for the PUBLISHED document matching the slug", async () => {
    const { strapi, api } = buildSlugStrapi(RAW_ROW)
    const service = venueService({ strapi })

    await service.findVenueBySlug("le-rio", "fr")

    expect(strapi.documents).toHaveBeenCalledWith(VENUE_UID)
    expect(api.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { slug: { $eq: "le-rio" }, status: { $ne: "suspended" } },
        locale: "fr",
        status: "published",
      })
    )
  })

  /**
   * A SUSPENDED venue must disappear from the public page. Nothing anywhere
   * unpublishes on suspension — `updateMyVenue` only skips the REPUBLISH — so
   * an already-published venue that is later suspended stays published in the
   * database forever. The enum filter is the only thing that takes it down.
   *
   * It is a `$ne: "suspended"` and NOT an `$eq: "approved"` on purpose:
   * `SEED_VENUES` never sets that enum (DW-211), so an approved-only filter
   * would empty the public page for every seeded venue.
   */
  describe("the suspended-venue takedown gate", () => {
    it("excludes suspended venues via the status ENUM, alongside the publication gate", async () => {
      const { strapi, api } = buildSlugStrapi(RAW_ROW)
      const service = venueService({ strapi })

      await service.findVenueBySlug("le-rio")

      const params = api.findFirst.mock.calls[0][0]
      expect(params.filters.status).toEqual({ $ne: "suspended" })
      expect(params.status).toBe("published")
    })

    it("404s (null) for a suspended venue — the filter matches nothing", async () => {
      // The filter is applied by the Document Service, so the honest mock for
      // "the row is suspended" is a query that returns nothing.
      const { strapi } = buildSlugStrapi(null)
      const service = venueService({ strapi })

      expect(await service.findVenueBySlug("suspended-venue")).toBeNull()
    })

    it("still returns an APPROVED published venue (200)", async () => {
      const { strapi } = buildSlugStrapi(RAW_ROW)
      const service = venueService({ strapi })

      const venue = await service.findVenueBySlug("le-rio")

      expect(venue).not.toBeNull()
      expect(venue?.documentId).toBe("venue-1")
    })

    it("still returns a SEEDED venue whose status enum is unset but is published", async () => {
      // DW-211: `SEED_VENUES` never writes the enum. An `$eq: "approved"` gate
      // here would 404 every seeded venue; `$ne: "suspended"` keeps them.
      const { strapi } = buildSlugStrapi({
        documentId: "seeded-1",
        name: "Seeded Venue",
        slug: "seeded-venue",
      })
      const service = venueService({ strapi })

      const venue = await service.findVenueBySlug("seeded-venue")

      expect(venue?.documentId).toBe("seeded-1")
    })
  })

  /**
   * `property-definition` is LOCALIZED; `venue` is not. Populating
   * `properties.definition` through a venue read therefore always yields
   * DEFAULT-locale labels, so an Arabic or French public page would render
   * English amenity names. The definitions are re-resolved in the requested
   * locale and their labels overlaid.
   */
  describe("localized amenity labels", () => {
    const LOCALIZED = [
      {
        documentId: "def-1",
        name: "Accessible en fauteuil roulant",
        slug: "wheelchair-accessible",
        type: "boolean",
      },
    ]

    it("overlays the requested locale's definition name onto the projection", async () => {
      const { strapi, definitionApi } = buildSlugStrapi(RAW_ROW, LOCALIZED)
      const service = venueService({ strapi })

      const venue = await service.findVenueBySlug("le-rio", "fr")

      expect(definitionApi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { documentId: { $in: ["def-1"] } },
          locale: "fr",
        })
      )
      expect(venue?.properties[0].definition?.name).toBe(
        "Accessible en fauteuil roulant"
      )
      // The venue's own fields are NOT re-read; only the labels are overlaid.
      expect(venue?.properties[0].definition?.slug).toBe(
        "wheelchair-accessible"
      )
      expect(venue?.properties[0].booleanValue).toBe(true)
    })

    it("overlays localized enumOptions too", async () => {
      const { strapi } = buildSlugStrapi(
        {
          documentId: "v",
          name: "N",
          properties: [
            {
              enumValue: "fixed",
              definition: {
                documentId: "def-seat",
                name: "Seating",
                type: "enum",
                enumOptions: ["fixed", "flexible"],
              },
            },
          ],
        },
        [
          {
            documentId: "def-seat",
            name: "Type de sièges",
            enumOptions: ["fixe", "modulable"],
          },
        ]
      )
      const service = venueService({ strapi })

      const venue = await service.findVenueBySlug("x", "fr")

      expect(venue?.properties[0].definition?.name).toBe("Type de sièges")
      expect(venue?.properties[0].definition?.enumOptions).toEqual([
        "fixe",
        "modulable",
      ])
    })

    it("does not issue the extra read when no locale is requested", async () => {
      const { strapi, definitionApi } = buildSlugStrapi(RAW_ROW, LOCALIZED)
      const service = venueService({ strapi })

      await service.findVenueBySlug("le-rio")

      expect(definitionApi.findMany).not.toHaveBeenCalled()
    })

    it("does not bound the lookup by the number of ids (a short read would drop labels)", async () => {
      const { strapi, definitionApi } = buildSlugStrapi(RAW_ROW, LOCALIZED)
      const service = venueService({ strapi })

      await service.findVenueBySlug("le-rio", "ar")

      const { limit } = definitionApi.findMany.mock.calls[0][0]
      expect(limit).toBeGreaterThanOrEqual(100)
    })

    it("keeps the default-locale labels when the localized read fails (fail-soft)", async () => {
      const { strapi, definitionApi } = buildSlugStrapi(RAW_ROW, LOCALIZED)
      definitionApi.findMany.mockRejectedValueOnce(new Error("i18n exploded"))
      const service = venueService({ strapi })

      const venue = await service.findVenueBySlug("le-rio", "fr")

      expect(venue?.properties[0].definition?.name).toBe(
        "Wheelchair Accessible"
      )
      expect(strapi.log.warn).toHaveBeenCalled()
    })

    it("leaves a definition the localized read did not return untouched", async () => {
      const { strapi } = buildSlugStrapi(RAW_ROW, [])
      const service = venueService({ strapi })

      const venue = await service.findVenueBySlug("le-rio", "fr")

      expect(venue?.properties[0].definition?.name).toBe(
        "Wheelchair Accessible"
      )
    })
  })

  it("stays published-only when no locale is given", async () => {
    const { strapi, api } = buildSlugStrapi(RAW_ROW)
    const service = venueService({ strapi })

    await service.findVenueBySlug("le-rio")

    expect(api.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" })
    )
  })

  it("populates everything the public page renders", async () => {
    const { strapi, api } = buildSlugStrapi(RAW_ROW)
    const service = venueService({ strapi })

    await service.findVenueBySlug("le-rio")

    expect(api.findFirst.mock.calls[0][0].populate).toEqual({
      geo: true,
      logo: true,
      images: true,
      cityRef: true,
      properties: { populate: { definition: true } },
    })
  })

  it("returns null (→ 404) when nothing matches", async () => {
    const { strapi } = buildSlugStrapi(null)
    const service = venueService({ strapi })

    expect(await service.findVenueBySlug("ghost")).toBeNull()
  })

  it("returns the whitelisted projection, never the raw row", async () => {
    const { strapi } = buildSlugStrapi(RAW_ROW)
    const service = venueService({ strapi })

    const venue = await service.findVenueBySlug("le-rio")

    expect(venue).toEqual({
      documentId: "venue-1",
      name: "Le Rio",
      slug: "le-rio",
      description: "Salle art déco",
      address: "12 rue de Rome",
      type: "cinema",
      phone: "+216 71 000 000",
      email: "contact@lerio.tn",
      website: "https://lerio.tn",
      capacity: 300,
      geo: { latitude: 36.8, longitude: 10.18 },
      logo: { id: 5, url: "/uploads/logo.png", name: "logo.png" },
      images: [{ id: 6, url: "/uploads/a.png" }],
      city: { documentId: "city-1", name: "Tunis", slug: "tunis" },
      properties: [
        {
          booleanValue: true,
          definition: {
            documentId: "def-1",
            name: "Wheelchair Accessible",
            slug: "wheelchair-accessible",
            type: "boolean",
          },
        },
      ],
    })
  })
})

describe("venue service.toPublicVenue whitelist (unit)", () => {
  it("drops manager, status and every internal numeric entity id", () => {
    const projected = toPublicVenue({
      id: 17,
      documentId: "venue-1",
      name: "Le Rio",
      status: "approved",
      manager: { id: 42, email: "manager@example.com" },
      cityRef: { id: 2, documentId: "city-1", name: "Tunis" },
      createdBy: { id: 1 },
      publishedAt: "2026-01-01T00:00:00.000Z",
    })

    expect(projected).not.toHaveProperty("manager")
    expect(projected).not.toHaveProperty("status")
    expect(projected).not.toHaveProperty("id")
    expect(projected).not.toHaveProperty("createdBy")
    expect(projected).not.toHaveProperty("publishedAt")
    expect(projected.city).toEqual({ documentId: "city-1", name: "Tunis" })
    expect(projected.city).not.toHaveProperty("id")
  })

  it("never invents a key: absent optionals stay absent", () => {
    const projected = toPublicVenue({ documentId: "v", name: "N" })

    expect(projected).toEqual({
      documentId: "v",
      name: "N",
      geo: null,
      logo: null,
      images: [],
      city: null,
      properties: [],
    })
  })

  it("returns null for an unusable row rather than a half-built object", () => {
    expect(toPublicVenue(null)).toBeNull()
    expect(toPublicVenue([])).toBeNull()
    expect(toPublicVenue({ name: "no documentId" })).toBeNull()
    expect(toPublicVenue({ documentId: "v" })).toBeNull()
  })

  it("drops media entries that carry no usable url", () => {
    const projected = toPublicVenue({
      documentId: "v",
      name: "N",
      logo: { id: 5 },
      images: [{ id: 6, url: "/uploads/a.png" }, { id: 7 }, null],
    })

    expect(projected.logo).toBeNull()
    expect(projected.images).toEqual([{ id: 6, url: "/uploads/a.png" }])
  })

  it("treats partial coordinates as no location", () => {
    const projected = toPublicVenue({
      documentId: "v",
      name: "N",
      geo: { latitude: 36.8 },
    })

    expect(projected.geo).toBeNull()
  })
})
