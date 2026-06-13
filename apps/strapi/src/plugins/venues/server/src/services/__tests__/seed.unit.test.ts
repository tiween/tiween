import seedService from "../seed"

describe("venues seed service (unit)", () => {
  const mockDocService = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    create: jest.fn(async (payload: any) => ({ id: 1, ...payload.data })),
  }
  const mockStrapi: any = {
    documents: jest.fn(() => mockDocService),
    log: { debug: jest.fn(), info: jest.fn() },
  }

  const service = seedService({ strapi: mockStrapi })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("seedVenues creates venues when none exist", async () => {
    const result = await service.seedVenues()
    expect(result.created).toBeGreaterThan(0)
    expect(result.created).toBe(result.total)
    expect(mockStrapi.documents).toHaveBeenCalledWith("plugin::venues.venue")
    expect(mockDocService.create).toHaveBeenCalled()
  })

  it("seedVenues skips existing venues (idempotent)", async () => {
    mockDocService.findMany.mockResolvedValueOnce([{ id: 99 }])
    const result = await service.seedVenues()
    expect(result.skipped).toBeGreaterThan(0)
  })

  it("seedPropertyDefinitions seeds categories then definitions", async () => {
    await service.seedPropertyDefinitions("en")
    expect(mockStrapi.documents).toHaveBeenCalledWith(
      "plugin::venues.property-category"
    )
    expect(mockStrapi.documents).toHaveBeenCalledWith(
      "plugin::venues.property-definition"
    )
  })
})
