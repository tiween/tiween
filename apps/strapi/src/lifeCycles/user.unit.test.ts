import { linkGuestOrdersForUser } from "./user"

/**
 * Unit tests for the `linkGuestOrdersForUser` lifecycle glue (mocked Strapi).
 *
 * Covers the story 4.6 lifecycle rows:
 *  - delegates to ticketing `order.linkGuestOrders` with the created user's
 *    email + documentId
 *  - no-op when `event.result` lacks email/documentId
 *  - error-isolation: a rejecting service is swallowed (helper resolves)
 */

function buildStrapi(linkGuestOrders: jest.Mock) {
  const strapi: any = {
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({ linkGuestOrders })),
    })),
  }
  return strapi
}

describe("linkGuestOrdersForUser (unit)", () => {
  it("delegates to linkGuestOrders with the created user's email and documentId", async () => {
    const linkGuestOrders = jest.fn().mockResolvedValue(1)
    const strapi = buildStrapi(linkGuestOrders)

    await linkGuestOrdersForUser(strapi, {
      result: { email: "a@b.com", documentId: "u1" },
    } as any)

    expect(linkGuestOrders).toHaveBeenCalledWith("a@b.com", "u1")
    expect(strapi.plugin).toHaveBeenCalledWith("ticketing")
  })

  it("no-op when email/documentId are missing", async () => {
    const linkGuestOrders = jest.fn().mockResolvedValue(0)
    const strapi = buildStrapi(linkGuestOrders)

    await linkGuestOrdersForUser(strapi, { result: {} } as any)

    expect(linkGuestOrders).not.toHaveBeenCalled()
  })

  it("error-isolation: a rejecting service is swallowed and does not throw", async () => {
    const linkGuestOrders = jest
      .fn()
      .mockRejectedValue(new Error("ticketing exploded"))
    const strapi = buildStrapi(linkGuestOrders)

    await expect(
      linkGuestOrdersForUser(strapi, {
        result: { email: "a@b.com", documentId: "u1" },
      } as any)
    ).resolves.toBeUndefined()
  })
})
