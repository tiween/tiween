// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Contribute-route payload contract (DW-10).
 *
 * Runs in the node environment: `@/env.mjs` refuses to read server-only vars
 * when a `window` exists, which the suite-wide jsdom default provides.
 *
 * `transformToStrapiFormat` is the only place the wizard's flat credit list is
 * reshaped for the post-2C.3 catalog model, and the three things it has to get
 * right are invisible until Strapi rejects (or silently mangles) a submission:
 *
 * - actors go to `cast[]`, everyone else to `credits[]`
 * - `credits[].creditRole` carries a resolved credit-role documentId, because
 *   the component declares that relation `required`
 * - videos carry `videoType` (what every consumer reads) with the legacy
 *   `type` explicitly nulled so the schema default is not stamped on new rows
 */

// The route imports `@/env.mjs`, which validates on import — seed the three
// required server vars before the dynamic import below. `NODE_ENV` is set
// because env.mjs's shared schema only admits development|production and
// vitest sets it to "test" (file-isolated, so this does not leak).
process.env.NODE_ENV = "development"
process.env.APP_PUBLIC_URL ||= "http://localhost:3000"
process.env.STRAPI_URL ||= "http://strapi.test"
process.env.STRAPI_REST_READONLY_API_KEY ||= "test-key"

const { transformToStrapiFormat } = await import("./route")

type StrapiPayload = Awaited<ReturnType<typeof transformToStrapiFormat>>
type Credit = {
  person?: string
  creditRole?: string
  customRole?: string | null
}
type CastMember = { person?: string; billing?: number }
type Video = { url: string; type: null; videoType: string }

/** Minimal valid wizard output; each test overrides only what it exercises. */
const baseData = {
  title: "Le Fil",
  playType: "original",
  format: "full-length",
  hasIntermission: false,
  credits: [],
  videos: [],
  links: [],
  distinctions: [],
  genres: [],
  photos: [],
} as unknown as Parameters<typeof transformToStrapiFormat>[0]

/**
 * Stubs the two endpoints the transform calls: the credit-role slug lookup and
 * person creation. `knownRoles` maps slug -> documentId; anything else misses.
 */
function stubStrapi(knownRoles: Record<string, string>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url.includes("/api/credit-roles")) {
      const slug = decodeURIComponent(url.split("filters[slug][$eq]=")[1] ?? "")
      const documentId = knownRoles[slug]
      return {
        ok: true,
        json: async () => ({ data: documentId ? [{ documentId }] : [] }),
      } as Response
    }

    if (url.includes("/api/persons")) {
      return {
        ok: true,
        json: async () => ({ data: { documentId: "person-new" } }),
      } as Response
    }

    throw new Error(`unexpected fetch: ${url}`)
  })

  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("transformToStrapiFormat", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("routes actors to cast[] and everyone else to credits[]", async () => {
    stubStrapi({ playwright: "role-playwright" })

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          {
            person: { documentId: "person-actor", name: "Amel" },
            role: "cast",
            character: "Nour",
            billing: 1,
          },
          {
            person: { documentId: "person-author", name: "Hedi" },
            role: "playwright",
            billing: 2,
          },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { cast: CastMember[]; credits: Credit[] }

    expect(payload.cast).toEqual([{ person: "person-actor", billing: 1 }])
    expect(payload.credits).toHaveLength(1)
    expect(payload.credits[0].person).toBe("person-author")
  })

  it("resolves a role slug to the credit-role documentId", async () => {
    stubStrapi({ director: "role-director" })

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          {
            person: { documentId: "person-1", name: "Sonia" },
            role: "director",
            billing: 1,
          },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { credits: Credit[] }

    expect(payload.credits[0].creditRole).toBe("role-director")
    expect(payload.credits[0].customRole).toBeNull()
  })

  it("looks a repeated slug up only once per request", async () => {
    const fetchMock = stubStrapi({ director: "role-director" })

    await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          {
            person: { documentId: "p1", name: "A" },
            role: "director",
            billing: 1,
          },
          {
            person: { documentId: "p2", name: "B" },
            role: "director",
            billing: 2,
          },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )

    const roleCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/credit-roles")
    )
    expect(roleCalls).toHaveLength(1)
  })

  it("omits creditRole and keeps the slug in customRole when the lookup misses", async () => {
    stubStrapi({})

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          {
            person: { documentId: "p1", name: "A" },
            role: "set-designer",
            billing: 1,
          },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { credits: Credit[] }

    expect(payload.credits[0]).not.toHaveProperty("creditRole")
    expect(payload.credits[0].customRole).toBe("set-designer")
  })

  it("creates a person without a documentId and uses the new id", async () => {
    stubStrapi({ playwright: "role-playwright" })

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          {
            person: { name: "Nouvelle Personne", isNew: true },
            role: "playwright",
            billing: 1,
          },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { credits: Credit[] }

    expect(payload.credits[0].person).toBe("person-new")
  })

  it("writes videoType and nulls the legacy type", async () => {
    stubStrapi({})

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        videos: [
          { url: "https://youtu.be/a", type: "trailer" },
          { url: "https://youtu.be/b" },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { videos: Video[] }

    expect(payload.videos).toEqual([
      { url: "https://youtu.be/a", type: null, videoType: "trailer" },
      { url: "https://youtu.be/b", type: null, videoType: "trailer" },
    ])
    // The legacy vocabulary must never reach the payload.
    expect(
      payload.videos.some((video) =>
        ["FULL_LENGTH", "TEASER", "CLIP"].includes(video.videoType)
      )
    ).toBe(false)
  })
})

describe("credit-role lookup caching", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("resolves a repeated slug with a single request", async () => {
    const fetchMock = stubStrapi({ director: "role-director" })

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          { person: "A", role: "director", billing: 1 },
          { person: "B", role: "director", billing: 2 },
          { person: "C", role: "director", billing: 3 },
        ],
      } as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { credits: Credit[] }

    expect(payload.credits.every((c) => c.creditRole === "role-director")).toBe(
      true
    )
    const roleCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/credit-roles")
    )
    expect(roleCalls).toHaveLength(1)
  })

  // A failed lookup degrades every credit sharing that slug the same way, and
  // the whole submission is rejected downstream (creditRole is required). The
  // slug survives in customRole so the failure is diagnosable from the payload.
  it("degrades every credit sharing an unresolvable slug identically", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/credit-roles")) {
        return { ok: false, status: 502, json: async () => ({}) } as Response
      }

      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const payload = (await transformToStrapiFormat(
      {
        ...baseData,
        credits: [
          { person: "A", personId: "p-a", role: "director", billing: 1 },
          { person: "B", personId: "p-b", role: "director", billing: 2 },
        ],
      } as unknown as Parameters<typeof transformToStrapiFormat>[0],
      "127.0.0.1"
    )) as StrapiPayload & { credits: Credit[] }

    for (const credit of payload.credits) {
      expect(credit.creditRole).toBeUndefined()
      expect(credit.customRole).toBe("director")
    }
  })
})
