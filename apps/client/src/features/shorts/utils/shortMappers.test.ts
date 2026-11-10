import { describe, expect, it, vi } from "vitest"

import { detailDto, summaryDto } from "../../../../test/fixtures/short-film-api"
import {
  mapShortFilmDetail,
  mapShortFilmSummaries,
  mapShortFilmSummary,
} from "./shortMappers"

describe("mapShortFilmDetail: directors", () => {
  it("derives directors from directing credits, not from a directors field", () => {
    const film = mapShortFilmDetail(detailDto({ directors: [] }))

    expect(film.directors?.map((d) => d.name)).toEqual(["Maher"])
  })

  it("accepts a role slug of director outside the directing department", () => {
    const film = mapShortFilmDetail(
      detailDto({
        directors: [],
        credits: [
          {
            person: { documentId: "p1", slug: "x", name: "X" },
            creditRole: { slug: "director", department: "other" },
            customRole: null,
            billing: null,
          },
        ],
      })
    )

    expect(film.directors?.map((d) => d.name)).toEqual(["X"])
  })

  it("orders directors by billing with null last, then API order", () => {
    const person = (id: string) => ({
      documentId: id,
      slug: id,
      name: id.toUpperCase(),
    })
    const credit = (id: string, billing: number | null) => ({
      person: person(id),
      creditRole: { slug: "director", department: "directing" },
      customRole: null,
      billing,
    })
    const film = mapShortFilmDetail(
      detailDto({
        credits: [
          credit("c", null),
          credit("b", 2),
          credit("a", 1),
          credit("d", null),
        ],
      })
    )

    expect(film.directors?.map((d) => d.name)).toEqual(["A", "B", "C", "D"])
  })

  it("de-duplicates a director credited twice", () => {
    const credit = {
      person: { documentId: "p1", slug: "x", name: "X" },
      creditRole: { slug: "director", department: "directing" },
      customRole: null,
      billing: 1,
    }
    const film = mapShortFilmDetail(
      detailDto({ credits: [credit, { ...credit, billing: 2 }] })
    )

    expect(film.directors).toHaveLength(1)
  })

  it("falls back to the summary directors when there are no credits", () => {
    const film = mapShortFilmDetail(detailDto({ credits: [] }))

    expect(film.directors?.map((d) => d.name)).toEqual(["Maher"])
    expect(film.crew).toEqual([])
  })
})

describe("mapShortFilmDetail: trailer", () => {
  it("takes the trailer video, not the teaser", () => {
    const film = mapShortFilmDetail(detailDto())

    expect(film.trailer).toBe("https://www.youtube.com/watch?v=abc")
  })

  it("never turns a javascript: or non-https url into the trailer", () => {
    const film = mapShortFilmDetail(
      detailDto({
        videos: [
          { url: "javascript:alert(1)", videoType: "trailer" },
          { url: "http://insecure.example/t", videoType: "trailer" },
        ],
      })
    )

    expect(film.trailer).toBeUndefined()
  })

  it("skips an unsafe trailer and keeps a later safe one", () => {
    const film = mapShortFilmDetail(
      detailDto({
        videos: [
          { url: "javascript:alert(1)", videoType: "trailer" },
          { url: "https://vimeo.com/1", videoType: "trailer" },
        ],
      })
    )

    expect(film.trailer).toBe("https://vimeo.com/1")
  })

  it("has no trailer when no video is a trailer", () => {
    const film = mapShortFilmDetail(
      detailDto({ videos: [{ url: "https://x.example", videoType: "clip" }] })
    )

    expect(film.trailer).toBeUndefined()
  })
})

describe("mapShortFilmDetail: streaming links", () => {
  it("drops rows whose url is not a safe external url", () => {
    const film = mapShortFilmDetail(detailDto())

    expect(film.streamingLinks).toEqual([
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=full",
        label: "Film complet",
        accessType: "free",
      },
    ])
  })

  it("maps an unknown platform to other and drops an unknown access type", () => {
    const film = mapShortFilmDetail(
      detailDto({
        streamingLinks: [
          {
            platform: "someplatform",
            url: "https://x.example/w",
            accessType: "pay-per-view",
            label: null,
          },
        ],
      })
    )

    expect(film.streamingLinks).toEqual([
      { platform: "other", url: "https://x.example/w" },
    ])
  })

  it("keeps each of the four access types and the new platforms", () => {
    const film = mapShortFilmDetail(
      detailDto({
        streamingLinks: [
          ["arte", "free"],
          ["shahid", "subscription"],
          ["tv5monde", "included"],
          ["artify", "rental"],
        ].map(([platform, accessType]) => ({
          platform: platform!,
          url: `https://${platform}.example/w`,
          accessType: accessType!,
          label: null,
        })),
      })
    )

    expect(film.streamingLinks?.map((l) => [l.platform, l.accessType])).toEqual(
      [
        ["arte", "free"],
        ["shahid", "subscription"],
        ["tv5monde", "included"],
        ["artify", "rental"],
      ]
    )
  })
})

describe("mapShortFilmDetail: crew, cast, awards", () => {
  it("carries every credit with role, department, custom role and billing", () => {
    const film = mapShortFilmDetail(
      detailDto({
        credits: [
          {
            person: { documentId: "p1", slug: "x", name: "X" },
            creditRole: { slug: "cinematographer", department: "camera" },
            customRole: "Image et lumière",
            billing: 3,
          },
          {
            person: { documentId: "p2", slug: "y", name: "Y" },
            creditRole: { slug: null, department: null },
            customRole: null,
            billing: null,
          },
        ],
      })
    )

    expect(film.crew).toEqual([
      {
        person: { documentId: "p1", slug: "x", name: "X" },
        roleSlug: "cinematographer",
        department: "camera",
        customRole: "Image et lumière",
        billing: 3,
      },
      {
        person: { documentId: "p2", slug: "y", name: "Y" },
        roleSlug: "",
        department: "other",
      },
    ])
  })

  it("orders cast by billing and carries the character name as role", () => {
    const film = mapShortFilmDetail(detailDto())

    expect(film.cast?.map((c) => [c.person.name, c.role, c.billing])).toEqual([
      ["First", "Monta", 1],
      ["Second", "Asfour", 2],
    ])
  })

  it("maps distinctions to awards and marks winning results", () => {
    const base = detailDto().distinctions[0]!
    const film = mapShortFilmDetail(
      detailDto({
        distinctions: [
          base,
          { ...base, result: "nominated", awardName: null, year: null },
          { ...base, result: "special-mention" },
          { ...base, result: "selected" },
          { ...base, name: null, awardName: null },
        ],
      })
    )

    expect(film.awards).toEqual([
      {
        name: "Journées Cinématographiques de Carthage",
        category: "Tanit d'Or",
        year: 2016,
        won: true,
      },
      {
        name: "Journées Cinématographiques de Carthage",
        category: "Compétition courts métrages",
        won: false,
      },
      {
        name: "Journées Cinématographiques de Carthage",
        category: "Tanit d'Or",
        year: 2016,
        won: true,
      },
      {
        name: "Journées Cinématographiques de Carthage",
        category: "Tanit d'Or",
        year: 2016,
        won: false,
      },
    ])
  })

  it("never copies the rating", () => {
    const film = mapShortFilmDetail(detailDto({ rating: 9.9 }))

    expect(film.rating).toBeUndefined()
    expect(JSON.stringify(film)).not.toContain("9.9")
  })
})

describe("mapShortFilmSummary", () => {
  it("normalises null media and keeps only the known formats with a url", () => {
    const film = mapShortFilmSummary(
      summaryDto({
        backdrop: {
          url: null,
          alternativeText: null,
          width: null,
          height: null,
          mime: null,
          formats: null,
        },
      })
    )

    expect(film.backdrop).toBeUndefined()
    expect(film.poster?.url).toBe("https://cdn.example/khalaa-poster.jpg")
    expect(film.poster?.formats).toEqual({
      thumbnail: { url: "https://cdn.example/t.jpg" },
      medium: { url: "https://cdn.example/m.jpg" },
    })
  })

  it("preserves the served locale and the country/language arrays", () => {
    const film = mapShortFilmSummary(
      summaryDto({ locale: "fr", country: ["TN", "FR"], language: ["aeb"] })
    )

    expect(film.locale).toBe("fr")
    expect(film.country).toEqual(["TN", "FR"])
    expect(film.language).toEqual(["aeb"])
  })

  it("falls back to the slug so the title is never blank", () => {
    expect(mapShortFilmSummary(summaryDto({ title: "  " })).title).toBe(
      "khalaa"
    )
    expect(mapShortFilmSummary(summaryDto({ title: null })).title).toBe(
      "khalaa"
    )
  })

  it("maps featured and availableOnline and carries no trailer", () => {
    const film = mapShortFilmSummary(
      summaryDto({ featured: true, availableOnline: false })
    )

    expect(film.isFeatured).toBe(true)
    expect(film.isAvailableOnline).toBe(false)
    expect(film.trailer).toBeUndefined()
  })

  it("turns zero or missing numerics into undefined", () => {
    const film = mapShortFilmSummary(
      summaryDto({ duration: 0, releaseYear: null })
    )

    expect(film.duration).toBeUndefined()
    expect(film.releaseYear).toBeUndefined()
  })
})

describe("mapShortFilmSummaries: slug-less films", () => {
  it("omits a film with a null, blank or missing slug instead of linking its documentId", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const films = mapShortFilmSummaries([
      summaryDto({ documentId: "d-ok", slug: "ok" }),
      summaryDto({ documentId: "d-null-1", slug: null }),
      summaryDto({ documentId: "d-blank-1", slug: "   " }),
    ])

    expect(films.map((f) => f.slug)).toEqual(["ok"])
    expect(films.map((f) => f.documentId)).not.toContain("d-null-1")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0].join(" ")).toContain("d-null-1")
    expect(warn.mock.calls[0].join(" ")).toContain("d-blank-1")
    warn.mockRestore()
  })

  it("stays quiet when every film has a slug", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const films = mapShortFilmSummaries([
      summaryDto(),
      summaryDto({ slug: "b" }),
    ])

    expect(films).toHaveLength(2)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("warns once per documentId, not on every request", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const page = () => [
      summaryDto({ documentId: "d-repeat", slug: null }),
      summaryDto({ documentId: "d-ok-2", slug: "ok-2" }),
    ]

    mapShortFilmSummaries(page())
    mapShortFilmSummaries(page())
    mapShortFilmSummaries([
      ...page(),
      summaryDto({ documentId: "d-new", slug: null }),
    ])

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0].join(" ")).toContain("d-repeat")
    expect(warn.mock.calls[1].join(" ")).toContain("d-new")
    expect(warn.mock.calls[1].join(" ")).not.toContain("d-repeat")
    warn.mockRestore()
  })
})
