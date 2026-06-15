import eventManagerController from "../event-manager"

describe("event-manager controller (unit)", () => {
  const mockService = {
    createBulkScreenings: jest.fn(async () => [1, 2]),
    duplicateEvent: jest.fn(async () => ({ id: "new-id" })),
    updateTicketInventory: jest.fn(async () => ({})),
    getEventStats: jest.fn(async () => ({})),
  }

  const mockStrapi: any = {
    plugin: jest.fn(() => ({
      service: jest.fn(() => mockService),
    })),
  }

  const controller = eventManagerController({ strapi: mockStrapi })

  it("createBulkScreenings 400s if missing required fields", async () => {
    const ctx: any = { request: { body: {} }, badRequest: jest.fn() }
    await controller.createBulkScreenings(ctx)
    expect(ctx.badRequest).toHaveBeenCalledWith(
      expect.stringMatching(/missing/i)
    )
  })

  it("createBulkScreenings 200s and calls service", async () => {
    const ctx: any = {
      request: {
        body: { eventId: "e1", movieId: "m1", dates: ["d1"], time: "20:00" },
      },
      send: jest.fn(),
    }
    await controller.createBulkScreenings(ctx)
    expect(mockService.createBulkScreenings).toHaveBeenCalled()
    expect(ctx.send).toHaveBeenCalled()
  })

  it("duplicateEvent 400s if missing eventId", async () => {
    const ctx: any = { request: { body: {} }, badRequest: jest.fn() }
    await controller.duplicateEvent(ctx)
    expect(ctx.badRequest).toHaveBeenCalledWith(
      expect.stringMatching(/missing/i)
    )
  })

  it("updateTicketInventory 400s if missing fields", async () => {
    const ctx: any = { request: { body: {} }, badRequest: jest.fn() }
    await controller.updateTicketInventory(ctx)
    expect(ctx.badRequest).toHaveBeenCalled()
  })

  it("getEventStats 400s if missing param", async () => {
    const ctx: any = { params: {}, badRequest: jest.fn() }
    await controller.getEventStats(ctx)
    expect(ctx.badRequest).toHaveBeenCalled()
  })
})
