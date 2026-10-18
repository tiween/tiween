/**
 * Unit tests for the short-film publish guard (plan 01-06), with a mocked
 * Strapi: no boot, no database. The booted behaviour (content-manager routes,
 * rollback, register-time registration) is covered by
 * `__tests__/short-film-publish-guard.service.test.ts`.
 */
import {
  createShortFilmPublishGuard,
  SHORT_FILM_PUBLISH_BLOCKED,
} from "../short-film-publish-guard"

const CW = "plugin::creative-works.creative-work"
const PERSON = "plugin::creative-works.person"

type Draft = Record<string, unknown>

/** A short-film draft that satisfies every D-19 rule. */
const completeShort = (overrides: Draft = {}): Draft => ({
  documentId: "doc-1",
  type: "short-film",
  slug: "my-short",
  poster: { id: 1 },
  credits: [
    {
      creditRole: { slug: "director" },
      person: { documentId: "person-1" },
    },
  ],
  streamingLinks: [{ platform: "youtube", url: "https://example.org" }],
  videos: [],
  duration: 12,
  ...overrides,
})

interface MockOptions {
  /** Draft returned by the default-locale findOne; null = none. */
  draft?: Draft | null
  /** Person documentIds that have a published version. */
  publishedPersons?: string[]
}

function makeStrapi(options: MockOptions = {}) {
  const draft = options.draft === undefined ? completeShort() : options.draft
  const workDocuments = {
    findOne: jest.fn(async (params: Record<string, unknown>) =>
      params.status === "published"
        ? { documentId: "doc-1", published: true }
        : draft
    ),
    publish: jest.fn(async () => ({ entries: [{}] })),
  }
  const personDocuments = {
    findMany: jest.fn(async () =>
      (options.publishedPersons ?? ["person-1"]).map((documentId) => ({
        documentId,
      }))
    ),
  }
  const documents = jest.fn((uid: string) => {
    if (uid === CW) return workDocuments
    if (uid === PERSON) return personDocuments
    throw new Error(`unexpected uid ${uid}`)
  })
  const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const strapi = {
    documents,
    log,
    plugin: () => ({
      service: () => ({ getDefaultLocale: async () => "fr" }),
    }),
  }
  return {
    strapi: strapi as never,
    workDocuments,
    personDocuments,
    documents,
    log,
  }
}

const run = (
  guard: ReturnType<typeof createShortFilmPublishGuard>,
  context: Record<string, unknown>,
  next: jest.Mock = jest.fn(async () => "next-result")
) => (guard as any)(context, next) as Promise<unknown>

const publishContext = (params: Record<string, unknown> = {}) => ({
  uid: CW,
  action: "publish",
  params: { documentId: "doc-1", locale: "fr", ...params },
})

async function blockedWith(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error as {
      name: string
      message: string
      details: { code: string; issues: Array<{ code: string; path: string }> }
    }
  }
  throw new Error("expected the guard to throw")
}

describe("createShortFilmPublishGuard: pass-through", () => {
  it("calls next untouched for another content type", async () => {
    const { strapi, documents } = makeStrapi()
    const next = jest.fn(async () => "other")

    const result = await run(
      createShortFilmPublishGuard(strapi),
      { uid: "plugin::events-manager.event", action: "publish", params: {} },
      next
    )

    expect(result).toBe("other")
    expect(next).toHaveBeenCalledTimes(1)
    expect(documents).not.toHaveBeenCalled()
  })

  it.each(["findMany", "findOne", "findFirst", "count", "delete", "unpublish"])(
    "calls next untouched for the %s action",
    async (action) => {
      const { strapi, documents } = makeStrapi()
      const next = jest.fn(async () => "read")

      const result = await run(
        createShortFilmPublishGuard(strapi),
        { uid: CW, action, params: { documentId: "doc-1" } },
        next
      )

      expect(result).toBe("read")
      expect(next).toHaveBeenCalledTimes(1)
      expect(documents).not.toHaveBeenCalled()
    }
  )

  it("lets a film publish even without a poster, director or watch source", async () => {
    const { strapi } = makeStrapi({
      draft: { documentId: "doc-1", type: "film", slug: null },
    })
    const next = jest.fn(async () => "published")

    const result = await run(
      createShortFilmPublishGuard(strapi),
      publishContext(),
      next
    )

    expect(result).toBe("published")
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("lets a complete short film publish", async () => {
    const { strapi } = makeStrapi()
    const next = jest.fn(async () => "published")

    const result = await run(
      createShortFilmPublishGuard(strapi),
      publishContext(),
      next
    )

    expect(result).toBe("published")
  })

  it("lets the call through when no draft exists at all", async () => {
    const { strapi } = makeStrapi({ draft: null })
    const next = jest.fn(async () => "published")

    await run(createShortFilmPublishGuard(strapi), publishContext(), next)

    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe("createShortFilmPublishGuard: blocking a publish", () => {
  it("throws SHORT_FILM_PUBLISH_BLOCKED with ordered coded issues and never calls next", async () => {
    const { strapi } = makeStrapi({
      draft: completeShort({
        slug: "",
        poster: null,
        credits: [],
        streamingLinks: [],
      }),
    })
    const next = jest.fn()

    const error = await blockedWith(
      run(createShortFilmPublishGuard(strapi), publishContext(), next)
    )

    expect(error.name).toBe("ValidationError")
    expect(error.details.code).toBe(SHORT_FILM_PUBLISH_BLOCKED)
    expect(error.details.issues).toEqual([
      { code: "SLUG_REQUIRED", path: "slug" },
      { code: "POSTER_REQUIRED", path: "poster" },
      { code: "DIRECTOR_REQUIRED", path: "credits" },
      { code: "WATCH_SOURCE_REQUIRED", path: "streamingLinks" },
    ])
    expect(next).not.toHaveBeenCalled()
  })

  it("reports the reserved slug", async () => {
    const { strapi } = makeStrapi({
      draft: completeShort({ slug: "featured" }),
    })

    const error = await blockedWith(
      run(createShortFilmPublishGuard(strapi), publishContext())
    )

    expect(error.details.issues).toEqual([
      { code: "SLUG_RESERVED", path: "slug" },
    ])
  })

  it("reports a director whose person has no published version", async () => {
    const { strapi } = makeStrapi({ publishedPersons: [] })

    const error = await blockedWith(
      run(createShortFilmPublishGuard(strapi), publishContext())
    )

    expect(error.details.issues).toEqual([
      { code: "DIRECTOR_UNPUBLISHED", path: "credits" },
    ])
  })

  it("asks only for the published state of the credited persons", async () => {
    const { strapi, personDocuments } = makeStrapi()

    await run(createShortFilmPublishGuard(strapi), publishContext())

    expect(personDocuments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        filters: { documentId: { $in: ["person-1"] } },
      })
    )
  })

  it("logs a duration over 40 minutes and still publishes", async () => {
    const { strapi, log } = makeStrapi({
      draft: completeShort({ duration: 45 }),
    })
    const next = jest.fn(async () => "published")

    const result = await run(
      createShortFilmPublishGuard(strapi),
      publishContext(),
      next
    )

    expect(result).toBe("published")
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("DURATION_OVER_40_MINUTES")
    )
  })
})

describe("createShortFilmPublishGuard: D-20 bypass", () => {
  const withBypass = (reason: string, fn: () => Promise<unknown>) => {
    const {
      withPosterBypassForTest,
    } = require("../../../../../../shared/__tests__/bypass-test-helper")
    return withPosterBypassForTest(
      { reason, skip: ["POSTER_REQUIRED"] },
      fn
    ) as Promise<unknown>
  }

  it("publishes a posterless short inside a scope and logs documentId and reason", async () => {
    const { strapi, log } = makeStrapi({
      draft: completeShort({ poster: null }),
    })
    const next = jest.fn(async () => "published")

    const result = await withBypass("launch import", () =>
      run(createShortFilmPublishGuard(strapi), publishContext(), next)
    )

    expect(result).toBe("published")
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringMatching(/POSTER_REQUIRED.*doc-1.*launch import/)
    )
  })

  it("blocks the same posterless short outside the scope", async () => {
    const { strapi } = makeStrapi({ draft: completeShort({ poster: null }) })

    const error = await blockedWith(
      run(createShortFilmPublishGuard(strapi), publishContext())
    )

    expect(error.details.issues).toEqual([
      { code: "POSTER_REQUIRED", path: "poster" },
    ])
  })

  it("never skips any other rule: no director still blocks, without POSTER_REQUIRED", async () => {
    const { strapi } = makeStrapi({
      draft: completeShort({ poster: null, credits: [] }),
    })

    const error = await blockedWith(
      withBypass("launch import", () =>
        run(createShortFilmPublishGuard(strapi), publishContext())
      )
    )

    expect(error.details.issues).toEqual([
      { code: "DIRECTOR_REQUIRED", path: "credits" },
    ])
  })
})

describe("createShortFilmPublishGuard: writes with status published", () => {
  it("rewrites create(status published) of a short to a draft write followed by publish", async () => {
    const { strapi, workDocuments } = makeStrapi()
    let statusSeenByNext: unknown = "unset"
    const next = jest.fn(async () => {
      statusSeenByNext = context.params.status
      return { documentId: "doc-1" }
    })
    const context = {
      uid: CW,
      action: "create",
      params: {
        status: "published",
        locale: "fr",
        data: { type: "short-film", title: "x" },
      },
    }

    const result = await run(createShortFilmPublishGuard(strapi), context, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(statusSeenByNext).toBeUndefined()
    expect(workDocuments.publish).toHaveBeenCalledWith({
      documentId: "doc-1",
      locale: "fr",
    })
    expect(result).toEqual({ documentId: "doc-1", published: true })
  })

  it("leaves create(status published) of a film untouched", async () => {
    const { strapi, workDocuments } = makeStrapi()
    let statusSeenByNext: unknown
    const context = {
      uid: CW,
      action: "create",
      params: { status: "published", data: { type: "film", title: "x" } },
    }
    const next = jest.fn(async () => {
      statusSeenByNext = context.params.status
      return "created"
    })

    const result = await run(createShortFilmPublishGuard(strapi), context, next)

    expect(result).toBe("created")
    expect(statusSeenByNext).toBe("published")
    expect(workDocuments.publish).not.toHaveBeenCalled()
  })

  it("resolves the type of update(status published) from the existing draft", async () => {
    const { strapi, workDocuments } = makeStrapi()
    const next = jest.fn(async () => ({ documentId: "doc-1" }))
    const context = {
      uid: CW,
      action: "update",
      params: {
        documentId: "doc-1",
        locale: "fr",
        status: "published",
        data: { title: "renamed" },
      },
    }

    await run(createShortFilmPublishGuard(strapi), context, next)

    expect(context.params.status).toBeUndefined()
    expect(workDocuments.publish).toHaveBeenCalledWith({
      documentId: "doc-1",
      locale: "fr",
    })
  })

  it("lets a blocked publish error escape and keeps the draft write", async () => {
    const { strapi, workDocuments } = makeStrapi()
    const blocked = new Error("blocked")
    workDocuments.publish.mockRejectedValueOnce(blocked)
    const next = jest.fn(async () => ({ documentId: "doc-1" }))
    const context = {
      uid: CW,
      action: "create",
      params: { status: "published", data: { type: "short-film" } },
    }

    await expect(
      run(createShortFilmPublishGuard(strapi), context, next)
    ).rejects.toBe(blocked)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("does not publish a plain draft create", async () => {
    const { strapi, workDocuments } = makeStrapi()
    const next = jest.fn(async () => ({ documentId: "doc-1" }))

    await run(
      createShortFilmPublishGuard(strapi),
      { uid: CW, action: "create", params: { data: { type: "short-film" } } },
      next
    )

    expect(next).toHaveBeenCalledTimes(1)
    expect(workDocuments.publish).not.toHaveBeenCalled()
  })
})

describe("createShortFilmPublishGuard: country and language validation", () => {
  const write = (
    action: "create" | "update",
    data: Record<string, unknown>
  ) => ({
    uid: CW,
    action,
    params: { documentId: "doc-1", data },
  })

  it.each(["create", "update"] as const)(
    "rejects lowercase country codes on %s for any work type",
    async (action) => {
      const { strapi } = makeStrapi()
      const next = jest.fn()

      const error = await blockedWith(
        run(
          createShortFilmPublishGuard(strapi),
          write(action, { type: "film", country: ["tn"] }),
          next
        )
      )

      expect(error.name).toBe("ValidationError")
      expect(error.details.code).toBe("INVALID_COUNTRY_CODES")
      expect(error.details.issues).toEqual([
        { code: "INVALID_COUNTRY_CODES", path: "country" },
      ])
      expect(next).not.toHaveBeenCalled()
    }
  )

  it("rejects a language list mixing none with another code", async () => {
    const { strapi } = makeStrapi()

    const error = await blockedWith(
      run(
        createShortFilmPublishGuard(strapi),
        write("create", { type: "play", language: ["none", "fr"] })
      )
    )

    expect(error.details.code).toBe("INVALID_LANGUAGE_CODES")
  })

  it("accepts valid, null and absent codes", async () => {
    const { strapi } = makeStrapi()
    const next = jest.fn(async () => "ok")
    const guard = createShortFilmPublishGuard(strapi)

    await run(
      guard,
      write("create", { country: ["TN", "FR"], language: ["aeb"] }),
      next
    )
    await run(guard, write("update", { country: null, language: null }), next)
    await run(guard, write("update", { title: "no codes" }), next)

    expect(next).toHaveBeenCalledTimes(3)
  })

  it("ignores writes without data", async () => {
    const { strapi } = makeStrapi()
    const next = jest.fn(async () => "ok")

    await run(
      createShortFilmPublishGuard(strapi),
      { uid: CW, action: "update", params: { documentId: "doc-1" } },
      next
    )

    expect(next).toHaveBeenCalledTimes(1)
  })
})
