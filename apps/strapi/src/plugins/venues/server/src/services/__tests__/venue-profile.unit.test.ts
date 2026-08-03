/**
 * `venue-profile` service (Story 7.2), mocked Strapi — Document Service only.
 *
 * The branches pinned here are the ones no live-DB test could reach cheaply and
 * that the spec's I/O matrix names explicitly:
 *  - the venue is LOOKED UP by `manager: { id: user.id }`; no id from the
 *    request ever reaches the Document Service
 *  - `documentId` / `slug` / `manager` / `status` / `events` are stripped
 *  - approved → republish, pending → publish skipped
 *  - a publish failure is logged and does NOT fail the request
 *  - unknown / mistyped amenities are 400 CODES and write nothing
 */
import venueProfileService from "../venue-profile"

const VENUE_UID = "plugin::venues.venue"
const PROPERTY_DEFINITION_UID = "plugin::venues.property-definition"

const USER = { id: 42 }

interface DocApiMock {
  findFirst: jest.Mock
  findMany: jest.Mock
  update: jest.Mock
  publish: jest.Mock
}

/** A draft venue row as the Document Service would return it. */
function venueRow(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "venue-1",
    name: "Le Rio",
    slug: "le-rio",
    status: "pending",
    address: "12 rue de Rome",
    geo: { latitude: 36.8, longitude: 10.18 },
    logo: { id: 5, url: "/uploads/logo.png", name: "logo.png" },
    images: [{ id: 6, url: "/uploads/a.png" }],
    cityRef: { documentId: "city-1", name: "Tunis", slug: "tunis" },
    properties: [],
    manager: { id: 42, email: "manager@example.com" },
    ...overrides,
  }
}

function buildStrapi(overrides: Partial<Record<string, unknown>> = {}) {
  const venueApi: DocApiMock = {
    findFirst: jest.fn(async () => venueRow()),
    findMany: jest.fn(async () => []),
    update: jest.fn(async () => venueRow({ name: "Le Rio 2" })),
    publish: jest.fn(async () => ({})),
    ...(overrides.venueApi as Partial<DocApiMock>),
  }
  const definitionApi = {
    findMany: jest.fn(async () => []),
    ...(overrides.definitionApi as Record<string, unknown>),
  }

  const strapi: any = {
    documents: jest.fn((uid: string) =>
      uid === PROPERTY_DEFINITION_UID ? definitionApi : venueApi
    ),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, venueApi, definitionApi }
}

/** Run `fn` and return the thrown error's `code`. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn()
  } catch (err) {
    return (err as { code?: string }).code
  }
  return undefined
}

describe("venue-profile.getMyVenue (unit)", () => {
  it("resolves the venue from the CALLER, never from a request id", async () => {
    const { strapi, venueApi } = buildStrapi()
    const service = venueProfileService({ strapi })

    await service.getMyVenue(USER)

    expect(strapi.documents).toHaveBeenCalledWith(VENUE_UID)
    expect(venueApi.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { manager: { id: { $eq: 42 } } },
        status: "draft",
      })
    )
  })

  it("returns the manager projection with status but WITHOUT manager", async () => {
    const { strapi } = buildStrapi()
    const service = venueProfileService({ strapi })

    const venue = await service.getMyVenue(USER)

    expect(venue).toMatchObject({
      documentId: "venue-1",
      name: "Le Rio",
      slug: "le-rio",
      status: "pending",
      geo: { latitude: 36.8, longitude: 10.18 },
      logo: { id: 5, url: "/uploads/logo.png" },
      city: { documentId: "city-1", name: "Tunis" },
    })
    expect(venue).not.toHaveProperty("manager")
    expect(venue).not.toHaveProperty("id")
    expect(venue.images).toEqual([{ id: 6, url: "/uploads/a.png" }])
  })

  it("throws VENUE_NOT_FOUND when the manager has no venue", async () => {
    const { strapi } = buildStrapi({
      venueApi: { findFirst: jest.fn(async () => null) },
    })
    const service = venueProfileService({ strapi })

    expect(await codeOf(() => service.getMyVenue(USER))).toBe("VENUE_NOT_FOUND")
  })
})

describe("venue-profile.updateMyVenue (unit)", () => {
  it("writes only the whitelisted fields to the caller's own venue", async () => {
    const { strapi, venueApi } = buildStrapi()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      name: "Le Rio",
      capacity: 300,
      website: "https://lerio.tn",
    } as any)

    expect(venueApi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "venue-1",
        data: { name: "Le Rio", capacity: 300, website: "https://lerio.tn" },
      })
    )
  })

  /**
   * The tenant-isolation strip. Even if one of these keys survived validation,
   * the payload is rebuilt from `UPDATABLE_VENUE_FIELDS`, so none of them can
   * reach the Document Service — and the documentId written is still the one
   * the LOOKUP returned, not the one in the body.
   */
  it("strips documentId / slug / manager / status / events from the payload", async () => {
    const { strapi, venueApi } = buildStrapi()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      name: "Renamed",
      documentId: "someone-elses-venue",
      slug: "hijacked",
      manager: 99,
      status: "approved",
      events: [1, 2, 3],
    } as any)

    const call = venueApi.update.mock.calls[0][0]
    expect(call.documentId).toBe("venue-1")
    expect(call.data).toEqual({ name: "Renamed" })
    for (const key of [
      "documentId",
      "slug",
      "manager",
      "status",
      "events",
    ] as const) {
      expect(call.data).not.toHaveProperty(key)
    }
  })

  it("throws NO_FIELDS_TO_UPDATE and writes nothing on an empty payload", async () => {
    const { strapi, venueApi } = buildStrapi()
    const service = venueProfileService({ strapi })

    expect(await codeOf(() => service.updateMyVenue(USER, {} as any))).toBe(
      "NO_FIELDS_TO_UPDATE"
    )
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("treats a body of only stripped keys as an empty payload", async () => {
    const { strapi, venueApi } = buildStrapi()
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, { status: "approved" } as any)
      )
    ).toBe("NO_FIELDS_TO_UPDATE")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("throws VENUE_NOT_FOUND and writes nothing when the manager has no venue", async () => {
    const { strapi, venueApi } = buildStrapi({
      venueApi: { findFirst: jest.fn(async () => null) },
    })
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() => service.updateMyVenue(USER, { name: "X" } as any))
    ).toBe("VENUE_NOT_FOUND")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("writes explicit nulls through (clearing a field is not 'absent')", async () => {
    const { strapi, venueApi } = buildStrapi()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      description: null,
      website: null,
    } as any)

    expect(venueApi.update.mock.calls[0][0].data).toEqual({
      description: null,
      website: null,
    })
  })

  describe("publish-on-save, conditioned on the status enum", () => {
    it("republishes an APPROVED venue after updating the draft", async () => {
      const { strapi, venueApi } = buildStrapi({
        venueApi: {
          findFirst: jest.fn(async () => venueRow({ status: "approved" })),
        },
      })
      const service = venueProfileService({ strapi })

      await service.updateMyVenue(USER, { name: "Renamed" } as any)

      expect(venueApi.update).toHaveBeenCalled()
      expect(venueApi.publish).toHaveBeenCalledWith({ documentId: "venue-1" })
      // Order matters: publishing before the draft write would publish stale
      // content.
      expect(venueApi.update.mock.invocationCallOrder[0]).toBeLessThan(
        venueApi.publish.mock.invocationCallOrder[0]
      )
    })

    it.each(["pending", "suspended", undefined])(
      "does NOT publish a %s venue (it stays invisible publicly)",
      async (status) => {
        const { strapi, venueApi } = buildStrapi({
          venueApi: { findFirst: jest.fn(async () => venueRow({ status })) },
        })
        const service = venueProfileService({ strapi })

        await service.updateMyVenue(USER, { name: "Renamed" } as any)

        expect(venueApi.update).toHaveBeenCalled()
        expect(venueApi.publish).not.toHaveBeenCalled()
      }
    )

    it("logs a publish failure and still returns 200-worthy data", async () => {
      const { strapi, venueApi } = buildStrapi({
        venueApi: {
          findFirst: jest.fn(async () => venueRow({ status: "approved" })),
          publish: jest.fn(async () => {
            throw new Error("publish exploded")
          }),
        },
      })
      const service = venueProfileService({ strapi })

      const result = await service.updateMyVenue(USER, {
        name: "Renamed",
      } as any)

      expect(result.documentId).toBe("venue-1")
      expect(strapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining("publish after profile update failed")
      )
      expect(venueApi.update).toHaveBeenCalled()
    })
  })

  it("maps a Document Service failure to VENUE_PROFILE_UPDATE_FAILED", async () => {
    const { strapi } = buildStrapi({
      venueApi: {
        update: jest.fn(async () => {
          throw new Error("db is on fire")
        }),
      },
    })
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() => service.updateMyVenue(USER, { name: "X" } as any))
    ).toBe("VENUE_PROFILE_UPDATE_FAILED")
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue-profile amenity resolution (unit)", () => {
  const definitions = [
    { documentId: "def-bool", type: "boolean" },
    { documentId: "def-int", type: "integer" },
    { documentId: "def-str", type: "string" },
    {
      documentId: "def-enum",
      type: "enum",
      enumOptions: ["fixed", "flexible"],
    },
  ]

  function withDefinitions() {
    return buildStrapi({
      definitionApi: { findMany: jest.fn(async () => definitions) },
    })
  }

  it("persists each value in the slot its definition's type dictates", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      properties: [
        { definition: "def-bool", booleanValue: true },
        { definition: "def-int", integerValue: 400 },
        { definition: "def-str", stringValue: "art-deco" },
        { definition: "def-enum", enumValue: "flexible" },
      ],
    } as any)

    expect(venueApi.update.mock.calls[0][0].data.properties).toEqual([
      { definition: "def-bool", booleanValue: true },
      { definition: "def-int", integerValue: 400 },
      { definition: "def-str", stringValue: "art-deco" },
      { definition: "def-enum", enumValue: "flexible" },
    ])
  })

  it("keeps ONLY the matching slot when several are sent", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      properties: [
        { definition: "def-bool", booleanValue: false, stringValue: "noise" },
      ],
    } as any)

    expect(venueApi.update.mock.calls[0][0].data.properties).toEqual([
      { definition: "def-bool", booleanValue: false },
    ])
  })

  it("throws PROPERTY_DEFINITION_UNKNOWN for an unknown definition", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, {
          properties: [{ definition: "nope", booleanValue: true }],
        } as any)
      )
    ).toBe("PROPERTY_DEFINITION_UNKNOWN")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("throws PROPERTY_VALUE_TYPE_MISMATCH on integerValue for a boolean", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, {
          properties: [{ definition: "def-bool", integerValue: 3 }],
        } as any)
      )
    ).toBe("PROPERTY_VALUE_TYPE_MISMATCH")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("rejects an enum value outside the definition's options", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, {
          properties: [{ definition: "def-enum", enumValue: "hammock" }],
        } as any)
      )
    ).toBe("PROPERTY_VALUE_TYPE_MISMATCH")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("accepts an explicit null as clearing a value", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      properties: [{ definition: "def-int", integerValue: null }],
    } as any)

    expect(venueApi.update.mock.calls[0][0].data.properties).toEqual([
      { definition: "def-int", integerValue: null },
    ])
  })

  it("resolves every referenced definition in ONE read", async () => {
    const { strapi, definitionApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      properties: [
        { definition: "def-bool", booleanValue: true },
        { definition: "def-str", stringValue: "art-deco" },
        { definition: "def-int", integerValue: 1 },
      ],
    } as any)

    expect(definitionApi.findMany).toHaveBeenCalledTimes(1)
    expect(definitionApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { documentId: { $in: ["def-bool", "def-str", "def-int"] } },
      })
    )
  })

  /**
   * `properties` is a repeatable component and this list REPLACES the stored
   * one wholesale, so two entries naming the same definition persist two
   * component rows for ONE amenity — permanently, since every later read/edit
   * round-trips both while the editor renders a single control per definition.
   * Which of the two values wins is not knowable, so the save is refused.
   */
  it("rejects two entries naming the SAME definition instead of writing two rows", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, {
          properties: [
            { definition: "def-bool", booleanValue: true },
            { definition: "def-bool", booleanValue: false },
          ],
        } as any)
      )
    ).toBe("PROPERTY_VALUE_TYPE_MISMATCH")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("rejects duplicates even when both entries carry the identical value", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, {
          properties: [
            { definition: "def-int", integerValue: 400 },
            { definition: "def-int", integerValue: 400 },
          ],
        } as any)
      )
    ).toBe("PROPERTY_VALUE_TYPE_MISMATCH")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  /**
   * `limit: ids.length` made the read exactly as large as the id list, so ANY
   * short read reported a perfectly valid amenity as
   * `PROPERTY_DEFINITION_UNKNOWN` and rejected the whole save. The bound is a
   * generous constant instead.
   */
  it("does not bound the definition read by the number of ids", async () => {
    const { strapi, definitionApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, {
      properties: [{ definition: "def-bool", booleanValue: true }],
    } as any)

    const { limit } = definitionApi.findMany.mock.calls[0][0]
    expect(limit).toBeGreaterThanOrEqual(100)
  })

  it("refuses the whole save (writing nothing) when the read resolves only some ids", async () => {
    const { strapi, venueApi } = buildStrapi({
      definitionApi: {
        // A short read: two ids asked for, one row back.
        findMany: jest.fn(async () => [
          { documentId: "def-bool", type: "boolean" },
        ]),
      },
    })
    const service = venueProfileService({ strapi })

    expect(
      await codeOf(() =>
        service.updateMyVenue(USER, {
          properties: [
            { definition: "def-bool", booleanValue: true },
            { definition: "def-int", integerValue: 1 },
          ],
        } as any)
      )
    ).toBe("PROPERTY_DEFINITION_UNKNOWN")
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("writes an empty amenity list as an explicit clear", async () => {
    const { strapi, venueApi } = withDefinitions()
    const service = venueProfileService({ strapi })

    await service.updateMyVenue(USER, { properties: [] } as any)

    expect(venueApi.update.mock.calls[0][0].data).toEqual({ properties: [] })
  })
})
