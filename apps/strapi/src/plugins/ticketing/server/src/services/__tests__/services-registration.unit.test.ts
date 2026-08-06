import services from "../index"

/**
 * Wiring pin (Story 6.5 review): the services barrel is what Strapi registers,
 * and a missing key fails SILENTLY at runtime (the throw-safe email wrapper
 * reduces a broken `service("order-email")` lookup to a log line). Pin the
 * exported map and the factory contracts here so a refactor cannot drop one.
 */

describe("ticketing services registration (unit)", () => {
  it("exports exactly the four expected service keys", () => {
    expect(Object.keys(services).sort()).toEqual([
      "order",
      "order-email",
      "qr",
      "ticket",
    ])
  })

  it('the "order-email" factory yields a service exposing sendForOrder', () => {
    const factory = services["order-email"]
    expect(typeof factory).toBe("function")

    const svc = factory({ strapi: {} as never })
    expect(typeof svc.sendForOrder).toBe("function")
  })

  it("every registered factory yields a service object from a stub strapi", () => {
    for (const [name, factory] of Object.entries(services)) {
      const svc = (factory as (args: { strapi: unknown }) => object)({
        strapi: {},
      })
      expect(typeof svc).toBe("object")
      expect(svc).not.toBeNull()
      expect(Object.keys(svc).length).toBeGreaterThan(0)
      // Sanity: name is one of the pinned keys.
      expect(["order", "order-email", "qr", "ticket"]).toContain(name)
    }
  })
})
