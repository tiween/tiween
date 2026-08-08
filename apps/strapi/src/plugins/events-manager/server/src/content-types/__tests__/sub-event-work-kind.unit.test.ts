/**
 * Unit tests for the sub-event ↔ catalog-kind guard (code review of 2C.1/2C.3).
 *
 * The invariant under test: after `movie`/`play` collapsed into a single
 * `creative-work`, only `creative-work.type` distinguishes what a screening
 * versus a performance may reference. These cases pin both halves — the guard
 * rejects a positively-wrong kind, and it stays out of the way (fails open) in
 * every case where it cannot positively resolve the work.
 */
import {
  assertSubEventWorkKind,
  extractWorkDocumentId,
  PERFORMANCE_UID,
  SCREENING_UID,
} from "../sub-event-work-kind"

const makeStrapi = (work: { type?: string } | null) => {
  const findWork = jest.fn().mockResolvedValue(work)
  return {
    strapi: {
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue({ findWork }),
      }),
      log: { error: jest.fn() },
    } as any,
    findWork,
  }
}

describe("extractWorkDocumentId", () => {
  it("reads a bare documentId string", () => {
    expect(extractWorkDocumentId("abc123")).toBe("abc123")
  })

  it("reads the admin content-manager connect shape", () => {
    expect(extractWorkDocumentId({ connect: [{ id: "abc123" }] })).toBe(
      "abc123"
    )
  })

  it("takes the last entry when connect carries several", () => {
    expect(
      extractWorkDocumentId({ connect: [{ id: "old" }, { id: "new" }] })
    ).toBe("new")
  })

  it("reads an object carrying documentId", () => {
    expect(extractWorkDocumentId({ documentId: "abc123" })).toBe("abc123")
  })

  it("returns undefined for a numeric internal id, blank, null and disconnect-only", () => {
    expect(extractWorkDocumentId(42)).toBeUndefined()
    expect(extractWorkDocumentId("   ")).toBeUndefined()
    expect(extractWorkDocumentId(null)).toBeUndefined()
    expect(extractWorkDocumentId({ connect: [] })).toBeUndefined()
    expect(
      extractWorkDocumentId({ connect: [], disconnect: [{ id: "x" }] })
    ).toBeUndefined()
  })
})

describe("assertSubEventWorkKind", () => {
  it("accepts a film and a short-film on a screening", async () => {
    for (const type of ["film", "short-film"]) {
      const { strapi } = makeStrapi({ type })
      await expect(
        assertSubEventWorkKind({
          strapi,
          uid: SCREENING_UID,
          data: { movie: "w1" },
        })
      ).resolves.toBeUndefined()
    }
  })

  it("rejects a play attached to a screening", async () => {
    const { strapi } = makeStrapi({ type: "play" })
    await expect(
      assertSubEventWorkKind({
        strapi,
        uid: SCREENING_UID,
        data: { movie: "w1" },
      })
    ).rejects.toThrow(/must reference a creative-work of type/)
  })

  it("rejects a film attached to a performance", async () => {
    const { strapi } = makeStrapi({ type: "film" })
    await expect(
      assertSubEventWorkKind({
        strapi,
        uid: PERFORMANCE_UID,
        data: { play: "w1" },
      })
    ).rejects.toThrow(/must reference a creative-work of type/)
  })

  it("accepts a play on a performance", async () => {
    const { strapi } = makeStrapi({ type: "play" })
    await expect(
      assertSubEventWorkKind({
        strapi,
        uid: PERFORMANCE_UID,
        data: { play: "w1" },
      })
    ).resolves.toBeUndefined()
  })

  it("skips entirely when the relation field is absent from the payload", async () => {
    const { strapi, findWork } = makeStrapi({ type: "play" })
    await expect(
      assertSubEventWorkKind({
        strapi,
        uid: SCREENING_UID,
        data: { startDateTime: "2026-01-01T20:00:00.000Z" },
      })
    ).resolves.toBeUndefined()
    expect(findWork).not.toHaveBeenCalled()
  })

  // Fail-open cases: the guard must never invent a failure it cannot prove.
  it("fails open on an unresolvable work, a typeless work, and a facade error", async () => {
    const unresolved = makeStrapi(null)
    await expect(
      assertSubEventWorkKind({
        strapi: unresolved.strapi,
        uid: SCREENING_UID,
        data: { movie: "w1" },
      })
    ).resolves.toBeUndefined()

    const typeless = makeStrapi({})
    await expect(
      assertSubEventWorkKind({
        strapi: typeless.strapi,
        uid: SCREENING_UID,
        data: { movie: "w1" },
      })
    ).resolves.toBeUndefined()

    const boom = makeStrapi({ type: "play" })
    boom.findWork.mockRejectedValue(new Error("network"))
    await expect(
      assertSubEventWorkKind({
        strapi: boom.strapi,
        uid: SCREENING_UID,
        data: { movie: "w1" },
      })
    ).resolves.toBeUndefined()
    expect(boom.strapi.log.error).toHaveBeenCalled()
  })

  it("fails open when the relation is given as a numeric internal id", async () => {
    const { strapi, findWork } = makeStrapi({ type: "play" })
    await expect(
      assertSubEventWorkKind({
        strapi,
        uid: SCREENING_UID,
        data: { movie: 42 },
      })
    ).resolves.toBeUndefined()
    expect(findWork).not.toHaveBeenCalled()
  })
})
