/**
 * creative-works `public-api` facade (Story 7.3): delegation to the internal
 * service, plus `createWork`'s locale replication + immediate publish (the
 * behaviors the spec's matrix pins and no live-DB test reaches cheaply).
 */
import creativeWorkService from "../creative-work"
import publicApiService from "../public-api"

const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"

describe("creative-works public-api facade delegation (unit)", () => {
  function buildStrapi(internal: Record<string, jest.Mock>) {
    return {
      plugin: jest.fn(() => ({ service: jest.fn(() => internal) })),
    } as any
  }

  it("delegates searchWorks to the internal search", async () => {
    const internal = { search: jest.fn(async () => [{ documentId: "w1" }]) }
    const facade = publicApiService({ strapi: buildStrapi(internal) })

    const result = await facade.searchWorks("dune", 5)

    expect(internal.search).toHaveBeenCalledWith("dune", 5)
    expect(result).toEqual([{ documentId: "w1" }])
  })

  it("delegates findWork to findOneWithDetails", async () => {
    const internal = {
      findOneWithDetails: jest.fn(async () => ({ documentId: "w1" })),
    }
    const facade = publicApiService({ strapi: buildStrapi(internal) })

    await facade.findWork("w1")

    expect(internal.findOneWithDetails).toHaveBeenCalledWith("w1")
  })

  it("delegates createWork with input + locale", async () => {
    const internal = { createWork: jest.fn(async () => ({ documentId: "w2" })) }
    const facade = publicApiService({ strapi: buildStrapi(internal) })

    await facade.createWork({ title: "Dune", type: "film" }, "ar")

    expect(internal.createWork).toHaveBeenCalledWith(
      { title: "Dune", type: "film" },
      "ar"
    )
  })
})

describe("creative-works public-api facade: short films (unit)", () => {
  function buildStrapi(internal: Record<string, jest.Mock>) {
    const service = jest.fn(() => internal)
    return {
      strapi: { plugin: jest.fn(() => ({ service })) } as any,
      service,
    }
  }

  it("delegates findShortFilms to the short-films service list", async () => {
    const internal = {
      list: jest.fn(async () => ({ data: [], meta: { pagination: {} } })),
    }
    const { strapi, service } = buildStrapi(internal)
    const facade = publicApiService({ strapi })
    const query = {
      sort: "publishedAt:desc",
      page: 1,
      pageSize: 24,
    } as const

    const result = await facade.findShortFilms(query as any)

    expect(service).toHaveBeenCalledWith("short-films")
    expect(internal.list).toHaveBeenCalledWith(query)
    expect(result).toEqual({ data: [], meta: { pagination: {} } })
  })

  it("delegates findShortFilm to findBySlug with the slug and locale", async () => {
    const internal = {
      findBySlug: jest.fn(async () => ({ documentId: "w1" })),
    }
    const { strapi, service } = buildStrapi(internal)
    const facade = publicApiService({ strapi })

    const result = await facade.findShortFilm("sf-alpha", "ar")

    expect(service).toHaveBeenCalledWith("short-films")
    expect(internal.findBySlug).toHaveBeenCalledWith("sf-alpha", "ar")
    expect(result).toEqual({ documentId: "w1" })
  })
})

describe("creative-works public-api facade: featured and related (unit)", () => {
  function buildStrapi(internal: Record<string, unknown>) {
    const service = jest.fn(() => internal)
    const strapi = { plugin: jest.fn(() => ({ service })) } as any
    return { strapi, service }
  }

  it("delegates findFeaturedShortFilms to the short-films service featured", async () => {
    const internal = { featured: jest.fn(async () => [{ documentId: "w1" }]) }
    const { strapi, service } = buildStrapi(internal)
    const facade = publicApiService({ strapi })

    const result = await facade.findFeaturedShortFilms("ar")

    expect(service).toHaveBeenCalledWith("short-films")
    expect(internal.featured).toHaveBeenCalledWith("ar")
    expect(result).toEqual([{ documentId: "w1" }])
  })

  it("delegates findRelatedShortFilms to related with the slug and locale", async () => {
    const internal = { related: jest.fn(async () => [{ documentId: "w2" }]) }
    const { strapi, service } = buildStrapi(internal)
    const facade = publicApiService({ strapi })

    const result = await facade.findRelatedShortFilms("sf-alpha", "fr")

    expect(service).toHaveBeenCalledWith("short-films")
    expect(internal.related).toHaveBeenCalledWith("sf-alpha", "fr")
    expect(result).toEqual([{ documentId: "w2" }])
  })

  it("passes a null related result through (unknown short)", async () => {
    const internal = { related: jest.fn(async () => null) }
    const { strapi } = buildStrapi(internal)
    const facade = publicApiService({ strapi })

    expect(await facade.findRelatedShortFilms("nope")).toBeNull()
  })
})

describe("creative-work.createWork (unit)", () => {
  function buildStrapi(options: { locales?: string[] } = {}) {
    const { locales = ["fr", "ar", "en"] } = options

    const workApi = {
      create: jest.fn(async () => ({ documentId: "work-1", locale: "fr" })),
      update: jest.fn(async () => ({})),
      publish: jest.fn(async () => ({})),
      findOne: jest.fn(async () => ({ documentId: "work-1", title: "Dune" })),
    }
    const localesService = {
      find: jest.fn(async () => locales.map((code) => ({ code }))),
    }

    // Runs the callback inline (no live DB) while still recording that the
    // writes went THROUGH a transaction.
    const transaction = jest.fn(async (cb: () => Promise<unknown>) => cb())

    const strapi: any = {
      documents: jest.fn((uid: string) => {
        if (uid !== CREATIVE_WORK_UID) {
          throw new Error(`Unexpected UID ${uid}`)
        }
        return workApi
      }),
      db: { transaction },
      plugin: jest.fn((name: string) => ({
        service: jest.fn(() => {
          if (name !== "i18n") throw new Error(`Unexpected plugin ${name}`)
          return localesService
        }),
      })),
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    }

    return { strapi, workApi, localesService, transaction }
  }

  const INPUT = {
    title: "Dune",
    type: "film" as const,
    synopsis: "Sand.",
    duration: 155,
    releaseYear: 2021,
    posterId: 12,
  }

  it("creates the DRAFT in the request locale with the full payload", async () => {
    const { strapi, workApi } = buildStrapi()
    const service = creativeWorkService({ strapi })

    await service.createWork(INPUT, "fr")

    const call = workApi.create.mock.calls[0][0]
    expect(call.locale).toBe("fr")
    expect(call.status).toBe("draft")
    expect(call.data).toEqual({
      title: "Dune",
      synopsis: "Sand.",
      poster: 12,
      type: "film",
      duration: 155,
      releaseYear: 2021,
    })
  })

  it("replicates the LOCALIZED fields verbatim to every other configured locale", async () => {
    const { strapi, workApi } = buildStrapi({ locales: ["fr", "ar", "en"] })
    const service = creativeWorkService({ strapi })

    await service.createWork(INPUT, "ar")

    const updates = workApi.update.mock.calls.map((c) => c[0])
    expect(updates.map((u) => u.locale).sort()).toEqual(["en", "fr"])
    for (const update of updates) {
      expect(update.documentId).toBe("work-1")
      // Localized fields only — `type`/`duration`/`releaseYear` are not
      // localized and must not be rewritten per locale.
      expect(update.data).toEqual({
        title: "Dune",
        synopsis: "Sand.",
        poster: 12,
      })
    }
  })

  it("publishes IMMEDIATELY in all locales (catalog data, not an announcement)", async () => {
    const { strapi, workApi } = buildStrapi()
    const service = creativeWorkService({ strapi })

    await service.createWork(INPUT, "fr")

    expect(workApi.publish).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "work-1", locale: "*" })
    )
  })

  it("skips replication for locales the deployment does not have", async () => {
    const { strapi, workApi } = buildStrapi({ locales: ["fr"] })
    const service = creativeWorkService({ strapi })

    await service.createWork({ title: "X", type: "play" }, "fr")

    expect(workApi.update).not.toHaveBeenCalled()
  })

  it("wraps create + replication + publish in ONE transaction", async () => {
    const { strapi, workApi, transaction } = buildStrapi()
    const service = creativeWorkService({ strapi })

    // Every write must have happened before the transaction callback resolved
    // — a half-localized or unpublished catalog entry must not survive a
    // mid-sequence failure.
    transaction.mockImplementation(async (cb: () => Promise<unknown>) => {
      const result = await cb()
      expect(workApi.create).toHaveBeenCalled()
      expect(workApi.update).toHaveBeenCalled()
      expect(workApi.publish).toHaveBeenCalled()
      return result
    })

    await service.createWork(INPUT, "fr")

    expect(transaction).toHaveBeenCalledTimes(1)
    // The final read is OUTSIDE the transaction (it observes committed state).
    expect(workApi.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "work-1" })
    )
  })

  it("propagates a failure inside the transaction (no swallowed partial write)", async () => {
    const { strapi, workApi } = buildStrapi()
    workApi.publish.mockRejectedValueOnce(new Error("db down"))
    const service = creativeWorkService({ strapi })

    await expect(service.createWork(INPUT, "fr")).rejects.toThrow("db down")
    expect(workApi.findOne).not.toHaveBeenCalled()
  })

  it("omits absent optional fields instead of writing null", async () => {
    const { strapi, workApi } = buildStrapi()
    const service = creativeWorkService({ strapi })

    await service.createWork({ title: "X", type: "short-film" }, "fr")

    expect(workApi.create.mock.calls[0][0].data).toEqual({
      title: "X",
      type: "short-film",
    })
  })
})
