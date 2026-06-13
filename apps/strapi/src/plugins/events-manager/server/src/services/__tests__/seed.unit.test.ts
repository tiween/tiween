import seedService from "../seed"

describe("seed service (unit)", () => {
  const mockDocService = {
    findMany: jest.fn(async () => []),
    create: jest.fn(async (payload: any) => ({ ...payload.data })),
  }
  // Venue seeding moved to the venues plugin (story 2C.1). seedAll delegates
  // to it via strapi.plugin("venues").service("seed").seedVenues().
  const mockVenueSeed = {
    seedVenues: jest.fn(async () => ({ created: 8, skipped: 0, total: 8 })),
  }
  const mockStrapi: any = {
    documents: jest.fn(() => mockDocService),
    plugin: jest.fn(() => ({ service: jest.fn(() => mockVenueSeed) })),
    log: { debug: jest.fn(), info: jest.fn() },
  }

  const service = seedService({ strapi: mockStrapi })

  it("seedEventGroups creates groups", async () => {
    const result = await service.seedEventGroups()
    expect(result.created).toBeGreaterThan(0)
  })

  it("seedAll delegates venue seeding to the venues plugin and seeds groups", async () => {
    const result = await service.seedAll()
    expect(mockStrapi.plugin).toHaveBeenCalledWith("venues")
    expect(mockVenueSeed.seedVenues).toHaveBeenCalled()
    expect(result.venues.total).toBeGreaterThan(0)
    expect(result.eventGroups.total).toBeGreaterThan(0)
  })
})
