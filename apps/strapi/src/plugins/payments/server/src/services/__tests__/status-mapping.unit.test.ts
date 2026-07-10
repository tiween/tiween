import statusMappingService from "../status-mapping"

/**
 * Unit tests for the Konnect -> internal status mapping (Story 6.3). Defensive
 * against case and unknown tokens so an unexpected vocabulary never flips an
 * order to a wrong terminal state.
 */
describe("status-mapping.toInternalStatus", () => {
  const service = statusMappingService({ strapi: {} as any })

  it("maps completed -> paid", () => {
    expect(service.toInternalStatus("completed")).toBe("paid")
    expect(service.toInternalStatus("COMPLETED")).toBe("paid")
  })

  it("maps terminal-failure states -> failed", () => {
    for (const s of [
      "failed",
      "expired",
      "canceled",
      "cancelled",
      "declined",
    ]) {
      expect(service.toInternalStatus(s)).toBe("failed")
    }
  })

  it("maps everything else -> pending", () => {
    expect(service.toInternalStatus("pending")).toBe("pending")
    expect(service.toInternalStatus("processing")).toBe("pending")
    expect(service.toInternalStatus("")).toBe("pending")
    expect(service.toInternalStatus(undefined)).toBe("pending")
    expect(service.toInternalStatus("something-new")).toBe("pending")
  })
})
