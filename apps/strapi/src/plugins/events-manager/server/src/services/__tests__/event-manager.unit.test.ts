import eventManagerService from "../event-manager"

describe("event-manager service (unit)", () => {
  const mockEventDocService = {
    findOne: jest.fn(async () => ({
      documentId: "orig-id",
      title: "Original",
      slug: "original",
      category: "movie_screening",
      startDateTime: "2026-07-01T18:00:00.000Z",
      screenings: [
        { documentId: "s1", ticketsAvailable: 100, ticketsSold: 20 },
      ],
      performances: [],
    })),
    create: jest.fn(async (payload: any) => ({
      documentId: "new-event-id",
      ...payload.data,
    })),
  }
  const mockScreeningDocService = {
    create: jest.fn(async (payload: any) => ({
      documentId: "new-id",
      ...payload.data,
    })),
    findOne: jest.fn(async () => ({
      documentId: "s1",
      ticketsAvailable: 100,
      ticketsSold: 20,
    })),
    findMany: jest.fn(async () => [
      { documentId: "s1", ticketsAvailable: 100, ticketsSold: 20 },
    ]),
    update: jest.fn(async (payload: any) => ({ ...payload.data })),
  }

  const mockStrapi: any = {
    documents: jest.fn((uid: string) => {
      if (uid.endsWith(".event")) return mockEventDocService
      if (uid.endsWith(".screening")) return mockScreeningDocService
      return {}
    }),
  }

  const service = eventManagerService({ strapi: mockStrapi })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("createBulkScreenings parses UTC dates correctly", async () => {
    const result = await service.createBulkScreenings({
      eventId: "e1",
      movieId: "m1",
      dates: ["2026-07-01"],
      time: "20:00",
    })

    expect(result[0].startDateTime).toBe("2026-07-01T20:00:00.000Z")
  })

  it("duplicateEvent copies title and slug", async () => {
    const result = await service.duplicateEvent({ eventId: "orig-id" })
    expect(result.title).toBe("Original (Copy)")
  })

  it("updateTicketInventory updates both fields", async () => {
    const result = await service.updateTicketInventory("s1", 200, 50)
    expect(result.ticketsAvailable).toBe(200)
    expect(result.ticketsSold).toBe(50)
  })

  it("getEventStats aggregates correctly", async () => {
    const stats = await service.getEventStats("orig-id")
    expect(stats.totalTicketsAvailable).toBe(100)
    expect(stats.totalTicketsSold).toBe(20)
    expect(stats.soldPercentage).toBe(20)
  })

  describe("createBulkScreenings input validation", () => {
    const baseParams = {
      eventId: "e1",
      movieId: "m1",
      dates: ["2026-07-01"],
      time: "20:00",
    }

    it("rejects a date that is not YYYY-MM-DD", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, dates: ["07/01/2026"] })
      ).rejects.toThrow(/invalid date/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects a calendar-impossible date", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, dates: ["2026-02-30"] })
      ).rejects.toThrow(/invalid date/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects a time that is not HH:mm", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, time: "8pm" })
      ).rejects.toThrow(/invalid time/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects an out-of-range time", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, time: "25:00" })
      ).rejects.toThrow(/invalid time/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects an empty dates array", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, dates: [] })
      ).rejects.toThrow(/dates/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects dates that is not an array", async () => {
      await expect(
        service.createBulkScreenings({
          ...baseParams,
          dates: "2026-07-01" as unknown as string[],
        })
      ).rejects.toThrow(/dates/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("validates all dates before creating anything (no partial writes)", async () => {
      await expect(
        service.createBulkScreenings({
          ...baseParams,
          dates: ["2026-07-01", "not-a-date"],
        })
      ).rejects.toThrow(/invalid date/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects a negative ticketsAvailable", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, ticketsAvailable: -5 })
      ).rejects.toThrow(/ticketsAvailable/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects a negative price", async () => {
      await expect(
        service.createBulkScreenings({ ...baseParams, price: -10 })
      ).rejects.toThrow(/price/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })
  })

  describe("updateTicketInventory bounds checks", () => {
    it("rejects an invalid sub-event kind", async () => {
      await expect(
        service.updateTicketInventory("s1", 100, undefined, "showtime" as never)
      ).rejects.toThrow(/invalid kind/i)
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("rejects a negative ticketsAvailable", async () => {
      await expect(service.updateTicketInventory("s1", -1)).rejects.toThrow(
        /ticketsAvailable/i
      )
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("rejects a non-integer ticketsAvailable", async () => {
      await expect(service.updateTicketInventory("s1", 10.5)).rejects.toThrow(
        /ticketsAvailable/i
      )
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("rejects a negative ticketsSold", async () => {
      await expect(
        service.updateTicketInventory("s1", 100, -3)
      ).rejects.toThrow(/ticketsSold/i)
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("rejects ticketsSold greater than ticketsAvailable (overselling)", async () => {
      await expect(
        service.updateTicketInventory("s1", 100, 150)
      ).rejects.toThrow(/exceed/i)
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("rejects lowering ticketsAvailable below already-sold tickets", async () => {
      // mock screening has ticketsSold: 20
      await expect(service.updateTicketInventory("s1", 10)).rejects.toThrow(
        /exceed/i
      )
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("rejects when explicit ticketsSold exceeds the lowered capacity", async () => {
      await expect(service.updateTicketInventory("s1", 10, 20)).rejects.toThrow(
        /exceed/i
      )
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("accepts lowering both fields together when consistent", async () => {
      const result = await service.updateTicketInventory("s1", 50, 30)
      expect(result.ticketsAvailable).toBe(50)
      expect(result.ticketsSold).toBe(30)
    })

    it("rejects a non-finite price", async () => {
      // covered here for proximity to the other numeric guards
      await expect(
        service.createBulkScreenings({
          eventId: "e1",
          movieId: "m1",
          dates: ["2026-07-01"],
          time: "20:00",
          price: Infinity,
        })
      ).rejects.toThrow(/price/i)
      expect(mockScreeningDocService.create).not.toHaveBeenCalled()
    })

    it("rejects when the screening does not exist", async () => {
      mockScreeningDocService.findOne.mockResolvedValueOnce(
        null as unknown as {
          documentId: string
          ticketsAvailable: number
          ticketsSold: number
        }
      )
      await expect(service.updateTicketInventory("ghost", 100)).rejects.toThrow(
        /not found/i
      )
      expect(mockScreeningDocService.update).not.toHaveBeenCalled()
    })

    it("accepts a valid update at the boundary (sold == available)", async () => {
      const result = await service.updateTicketInventory("s1", 50, 50)
      expect(result.ticketsAvailable).toBe(50)
      expect(result.ticketsSold).toBe(50)
    })
  })
})
