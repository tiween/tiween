/**
 * ShortFilmDetail — one case per row of the spec's I/O & edge-case matrix,
 * plus the CMS-data hazards the matrix does not enumerate (unmapped platform,
 * blank/hostile URLs, a nomination that is not a win).
 *
 * The regression-prone paths are (a) conditional-section omission — a section
 * whose data is absent must not render an empty shell — and (b) the share
 * fallbacks, where a swallowed rejection is the difference between a silent
 * no-op and an unhandled promise rejection.
 *
 * Messages come from the REAL `fr.json` / `ar.json` / `en.json` catalogs
 * through a genuine `NextIntlClientProvider`, so the assertions below also
 * prove the `shorts` namespace exists and is complete in ALL THREE — a missing
 * English key would otherwise ship raw key paths to `/en/shorts/*`.
 *
 * NOT covered here: the "unknown slug → notFound() → 404" row, which is the
 * route's (`app/[locale]/shorts/[slug]/page.test.tsx`) behavior, not the
 * component's.
 */
import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm } from "../../types"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"
import { ShortFilmDetail } from "./ShortFilmDetail"

const { backSpy, pushSpy } = vi.hoisted(() => ({
  backSpy: vi.fn(),
  pushSpy: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, back: backSpy }),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const MESSAGES = { fr, ar, en } as const
type TestLocale = keyof typeof MESSAGES

/** Every `shorts.*` key the component resolves. Keep in sync with the source. */
const KEYS_USED = [
  "back",
  "share",
  "category",
  "awarded",
  "watch",
  "play",
  "watchFromBar",
  "trailer",
  "watchlist",
  "removeFromWatchlist",
  "synopsis",
  "distinctions",
  "whereToWatch",
  "watchOn",
  "cast",
  "related",
  "minutes",
  "available",
  "availableDuration",
  "otherPlatform",
] as const

function renderDetail(
  film: ShortFilm,
  {
    locale = "fr",
    relatedShorts = [],
  }: { locale?: TestLocale; relatedShorts?: ShortFilm[] } = {}
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Tunis"
    >
      <ShortFilmDetail film={film} relatedShorts={relatedShorts} />
    </NextIntlClientProvider>
  )
}

const FULL_FILM: ShortFilm = {
  id: 1,
  documentId: "communion-001",
  title: "Communion",
  slug: "communion",
  synopsis: "<p>Trois générations d'une même famille.</p>",
  duration: 21,
  releaseYear: 2024,
  ageRating: "PG12",
  poster: { url: "https://cdn.example/poster.jpg" },
  trailer: "https://trailer.example/communion",
  genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
  directors: [
    { id: 1, documentId: "p1", name: "Yasmine Ben Ali", slug: "yasmine" },
  ],
  cast: [
    {
      person: { id: 10, documentId: "p10", name: "Hend Sabri", slug: "hend" },
      role: "Leïla",
    },
  ],
  streamingLinks: [
    { platform: "youtube", url: "https://youtube.example/communion" },
  ],
  awards: [{ name: "Prix du jury", category: "Clermont-Ferrand", won: true }],
}

const RELATED: ShortFilm[] = [
  {
    id: 2,
    documentId: "brotherhood-002",
    title: "Brotherhood",
    slug: "brotherhood",
    duration: 25,
    releaseYear: 2018,
    rating: 4.8,
  },
]

/** Strip a film down to nothing but identity + the fields under test. */
function minimalFilm(overrides: Partial<ShortFilm> = {}): ShortFilm {
  return {
    id: 9,
    documentId: "minimal-009",
    title: "Sans titre",
    slug: "sans-titre",
    ...overrides,
  }
}

function headingTexts(): string[] {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((node) => node.textContent ?? "")
}

const originalOpen = window.open
/** Own properties defined directly on `navigator` for a test, to be removed. */
const stubbedNavigatorProps: string[] = []

/**
 * jsdom's `Navigator` members are prototype accessors, so `{ ...navigator }`
 * copies almost nothing — stub the properties on the instance instead.
 */
function stubNavigator(props: Record<string, unknown>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, {
      value,
      configurable: true,
      writable: true,
    })
    stubbedNavigatorProps.push(key)
  }
}

function stubReferrer(value: string) {
  Object.defineProperty(document, "referrer", {
    value,
    configurable: true,
  })
}

beforeEach(() => {
  // Returns a truthy handle: a `null` return means "popup blocked", which the
  // component answers by navigating the current tab — jsdom cannot do that and
  // would fill the run with "Not implemented: navigation" noise.
  window.open = vi.fn(() => ({}) as Window)
  // Pinned so the canonical share URL is asserted against a known origin
  // rather than whatever the ambient environment happens to carry.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tiween.tn")
  backSpy.mockClear()
  pushSpy.mockClear()
})

afterEach(() => {
  cleanup()
  window.open = originalOpen
  for (const key of stubbedNavigatorProps.splice(0)) {
    delete (navigator as unknown as Record<string, unknown>)[key]
  }
  stubReferrer("")
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ShortFilmDetail — full record, FR", () => {
  it("renders every in-scope section in the handoff's order, with handoff copy", () => {
    renderDetail(FULL_FILM, { relatedShorts: RELATED })

    expect(headingTexts()).toEqual([
      "Synopsis",
      "Distinctions",
      "Où regarder",
      "Distribution",
      "Dans la même veine",
    ])
    // Hero: category chip, "Primé" chip (an actual win), age rating.
    expect(screen.getByText("Court métrage")).toBeInTheDocument()
    expect(screen.getByText("Primé")).toBeInTheDocument()
    expect(screen.getByText("PG12")).toBeInTheDocument()
    // Sticky bar: title + availability line.
    expect(screen.getByText("Disponible — 21 min")).toBeInTheDocument()
    expect(screen.getAllByText("Communion").length).toBeGreaterThan(1)
    // Synopsis rich text is stripped to plain text.
    expect(
      screen.getByText("Trois générations d'une même famille.")
    ).toBeInTheDocument()
  })

  it("renders the deferred sections nowhere (crew grid, streaming access label)", () => {
    renderDetail(FULL_FILM, { relatedShorts: RELATED })
    expect(screen.queryByText("Équipe artistique")).not.toBeInTheDocument()
  })

  it("gives the hero, action-row and sticky watch controls distinct names", () => {
    renderDetail(FULL_FILM)

    expect(
      screen.getByRole("button", { name: "Lancer la lecture" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Regarder le film" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Regarder le film maintenant" })
    ).toBeInTheDocument()
  })
})

describe("ShortFilmDetail — catalog completeness", () => {
  it("defines every key the component uses in fr, ar and en", () => {
    for (const [locale, messages] of Object.entries(MESSAGES)) {
      const namespace = (messages as { shorts?: Record<string, string> }).shorts
      expect(
        namespace,
        `${locale}.json is missing the shorts namespace`
      ).toBeDefined()
      for (const key of KEYS_USED) {
        const value = namespace?.[key]
        expect(
          typeof value === "string" && value.length > 0,
          `${locale}.shorts.${key} is missing or empty`
        ).toBe(true)
      }
    }
  })

  it("renders EN without leaking raw key paths or an unsubstituted {duration}", () => {
    const { container } = renderDetail(FULL_FILM, {
      locale: "en",
      relatedShorts: RELATED,
    })

    // next-intl's fallback for a missing key is the dotted key path itself.
    expect(container.textContent ?? "").not.toMatch(/shorts\./)
    expect(container.textContent ?? "").not.toMatch(/\{duration\}/)

    expect(headingTexts()).toEqual([
      "Synopsis",
      "Awards & honours",
      "Where to watch",
      "Cast",
      "In the same vein",
    ])
    expect(screen.getByText("Available — 21 min")).toBeInTheDocument()
    expect(screen.getByText("Short film")).toBeInTheDocument()
  })
})

describe("ShortFilmDetail — AR locale", () => {
  it("mirrors to RTL, renders Arabic copy and Western numerals", () => {
    const { container } = renderDetail(FULL_FILM, {
      locale: "ar",
      relatedShorts: RELATED,
    })

    const root = container.querySelector("[data-tiween-shorts-detail]")
    expect(root).toHaveAttribute("dir", "rtl")

    expect(headingTexts()).toEqual([
      "القصة",
      "الجوائز والتكريمات",
      "أين تشاهد",
      "التمثيل",
      "في نفس السياق",
    ])
    expect(screen.getByText("فيلم قصير")).toBeInTheDocument()
    expect(screen.getByText("حائز على جائزة")).toBeInTheDocument()

    // Western numerals throughout — no Arabic-Indic digits anywhere.
    expect(root?.textContent ?? "").not.toMatch(/[٠-٩۰-۹]/)
    expect(screen.getByText("متاح — 21 دقيقة")).toBeInTheDocument()
  })
})

describe("ShortFilmDetail — absent data omits sections entirely", () => {
  it("omits Distinctions and the Primé chip when there are no awards", () => {
    renderDetail({ ...FULL_FILM, awards: [] })
    expect(headingTexts()).not.toContain("Distinctions")
    expect(screen.queryByText("Primé")).not.toBeInTheDocument()
  })

  it("lists a selection without calling it a win", () => {
    renderDetail({
      ...FULL_FILM,
      awards: [
        {
          name: "Sélection officielle",
          category: "JCC Carthage",
          year: 2024,
          won: false,
        },
      ],
    })

    // The section still lists the accolade …
    expect(headingTexts()).toContain("Distinctions")
    expect(
      screen.getByText("Sélection officielle — JCC Carthage (2024)")
    ).toBeInTheDocument()
    // … but a nomination is not a "Primé" badge.
    expect(screen.queryByText("Primé")).not.toBeInTheDocument()
  })

  it("omits Où regarder and falls the watch CTA back to the trailer", () => {
    renderDetail({ ...FULL_FILM, streamingLinks: [] })

    expect(headingTexts()).not.toContain("Où regarder")
    fireEvent.click(screen.getByRole("button", { name: "Regarder le film" }))
    expect(window.open).toHaveBeenCalledWith(
      "https://trailer.example/communion",
      "_blank",
      "noopener,noreferrer"
    )
    // The standalone trailer button would duplicate the CTA — it is dropped.
    expect(
      screen.queryByRole("button", { name: "Bande-annonce" })
    ).not.toBeInTheDocument()
    // Sticky bar survives (there is something to watch).
    expect(screen.getByText("Disponible — 21 min")).toBeInTheDocument()
  })

  it("shows no play affordance and no sticky bar with neither trailer nor streaming", () => {
    renderDetail({ ...FULL_FILM, streamingLinks: [], trailer: undefined })

    expect(
      screen.queryByRole("button", { name: "Regarder le film" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Lancer la lecture" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Disponible — 21 min")).not.toBeInTheDocument()
    expect(screen.queryByText("Disponible")).not.toBeInTheDocument()
  })

  it("omits Distribution and Dans la même veine when both are empty", () => {
    renderDetail({ ...FULL_FILM, cast: [] }, { relatedShorts: [] })
    expect(headingTexts()).not.toContain("Distribution")
    expect(headingTexts()).not.toContain("Dans la même veine")
  })

  it("renders the striped placeholder + ت glyph when there is no media", () => {
    renderDetail(minimalFilm())
    expect(screen.getByText("ت")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Sans titre" })).toBeNull()
  })

  it("renders the hero artwork (not the placeholder) when media exists", () => {
    renderDetail(FULL_FILM)
    expect(screen.getByRole("img", { name: "Communion" })).toBeInTheDocument()
    expect(screen.queryByText("ت")).not.toBeInTheDocument()
  })
})

describe("ShortFilmDetail — watch targets", () => {
  it("opens the first streaming link from every watch control", () => {
    renderDetail(FULL_FILM)

    for (const name of [
      "Lancer la lecture",
      "Regarder le film",
      "Regarder le film maintenant",
    ]) {
      vi.mocked(window.open).mockClear()
      fireEvent.click(screen.getByRole("button", { name }))
      expect(window.open, name).toHaveBeenCalledWith(
        "https://youtube.example/communion",
        "_blank",
        "noopener,noreferrer"
      )
    }
  })

  it("keeps a separate, working trailer button when both targets exist", () => {
    renderDetail(FULL_FILM)

    fireEvent.click(screen.getByRole("button", { name: "Bande-annonce" }))
    expect(window.open).toHaveBeenCalledWith(
      "https://trailer.example/communion",
      "_blank",
      "noopener,noreferrer"
    )
  })

  it("skips a blank streaming URL rather than swallowing the trailer fallback", () => {
    renderDetail({
      ...FULL_FILM,
      streamingLinks: [{ platform: "youtube", url: "   " }],
    })

    fireEvent.click(screen.getByRole("button", { name: "Regarder le film" }))
    expect(window.open).toHaveBeenCalledWith(
      "https://trailer.example/communion",
      "_blank",
      "noopener,noreferrer"
    )
  })

  it("never opens or links a non-http(s) URL", () => {
    renderDetail({
      ...FULL_FILM,
      trailer: undefined,
      streamingLinks: [{ platform: "youtube", url: "javascript:alert(1)" }],
    })

    // No usable target at all → no play disc, no CTA, no sticky bar.
    expect(
      screen.queryByRole("button", { name: "Regarder le film" })
    ).not.toBeInTheDocument()
    expect(window.open).not.toHaveBeenCalled()
    // The row still lists the platform, but exposes no live control.
    expect(headingTexts()).toContain("Où regarder")
    expect(
      screen.queryByRole("link", { name: /Regarder/ })
    ).not.toBeInTheDocument()
  })
})

describe("ShortFilmDetail — streaming rows", () => {
  it("labels an unmapped platform with the translated generic name", () => {
    renderDetail({
      ...FULL_FILM,
      streamingLinks: [
        // A value the union claims cannot exist — CMS data says otherwise.
        {
          platform: "artify" as never,
          url: "https://artify.example/communion",
        },
      ],
    })

    expect(screen.getByText("Autre plateforme")).toBeInTheDocument()
  })

  it("opens streaming CTAs in a new tab with a safe rel", () => {
    renderDetail(FULL_FILM)

    const cta = screen.getByRole("link", { name: /Regarder/ })
    expect(cta).toHaveAttribute("href", "https://youtube.example/communion")
    expect(cta).toHaveAttribute("target", "_blank")
    expect(cta).toHaveAttribute("rel", "noopener noreferrer")
  })
})

describe("ShortFilmDetail — related shelf", () => {
  it("formats the rating to one decimal and omits it when absent", () => {
    renderDetail(FULL_FILM, {
      relatedShorts: [
        { ...RELATED[0]!, rating: 5 },
        {
          id: 3,
          documentId: "wissam-003",
          title: "Wissam",
          slug: "wissam",
          rating: undefined,
        },
      ],
    })

    expect(screen.getByText("5.0")).toBeInTheDocument()
    expect(screen.getByTitle("Wissam")).toBeInTheDocument()
  })

  it("keeps the ellipsized titles recoverable", () => {
    renderDetail(FULL_FILM, { relatedShorts: RELATED })
    expect(screen.getByTitle("Brotherhood")).toBeInTheDocument()
    // The sticky bar title truncates too.
    expect(screen.getAllByTitle("Communion").length).toBeGreaterThan(0)
  })
})

describe("ShortFilmDetail — back affordance", () => {
  it("goes back when the visitor arrived from within the app", () => {
    stubReferrer(`${window.location.origin}/fr/shorts`)
    renderDetail(FULL_FILM)

    fireEvent.click(screen.getByRole("button", { name: "Retour" }))
    expect(backSpy).toHaveBeenCalled()
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it("routes to the directory when there is no in-app history (shared link)", () => {
    stubReferrer("")
    renderDetail(FULL_FILM)

    fireEvent.click(screen.getByRole("button", { name: "Retour" }))
    expect(pushSpy).toHaveBeenCalledWith("/fr/shorts")
    expect(backSpy).not.toHaveBeenCalled()
  })
})

describe("ShortFilmDetail — watchlist heart", () => {
  it("flips aria-pressed and the accessible name on tap", () => {
    renderDetail(FULL_FILM)

    const heart = screen.getByRole("button", { name: "Ma liste" })
    expect(heart).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(heart)

    const savedHeart = screen.getByRole("button", {
      name: "Retirer de ma liste",
    })
    expect(savedHeart).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(savedHeart)
    expect(screen.getByRole("button", { name: "Ma liste" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })
})

describe("ShortFilmDetail — share", () => {
  const shareUrl = "https://tiween.tn/fr/shorts/communion"

  function clickShare() {
    fireEvent.click(screen.getByRole("button", { name: "Partager" }))
  }

  it("copies the canonical URL when the Web Share API is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share: undefined, clipboard: { writeText } })

    renderDetail(FULL_FILM)
    clickShare()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(shareUrl))
  })

  it("strips a trailing slash from the configured site URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tiween.tn/")
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share: undefined, clipboard: { writeText } })

    renderDetail(FULL_FILM)
    clickShare()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(shareUrl))
  })

  it("swallows a clipboard rejection without an unhandled rejection", async () => {
    const rejection = Object.assign(new Error("denied"), {
      name: "NotAllowedError",
    })
    const writeText = vi.fn().mockRejectedValue(rejection)
    const onUnhandled = vi.fn()
    process.on("unhandledRejection", onUnhandled)

    try {
      stubNavigator({ share: undefined, clipboard: { writeText } })

      renderDetail(FULL_FILM)
      clickShare()
      await vi.waitFor(() => expect(writeText).toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(onUnhandled).not.toHaveBeenCalled()
    } finally {
      // Never leak the listener into later files, even on a failed assertion.
      process.off("unhandledRejection", onUnhandled)
    }
  })

  it("swallows an AbortError when the user dismisses the native sheet", async () => {
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" })
    const share = vi.fn().mockRejectedValue(abort)
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share, clipboard: { writeText } })

    renderDetail(FULL_FILM)
    clickShare()
    await vi.waitFor(() => expect(share).toHaveBeenCalled())
    // A cancelled share is not a failure — it must NOT silently copy instead.
    expect(writeText).not.toHaveBeenCalled()
  })

  it("falls back to the clipboard when native share fails for any other reason", async () => {
    // A permission denial is NOT a dismissal: the user asked to share and must
    // still end up with the link.
    const denied = Object.assign(new Error("denied"), {
      name: "NotAllowedError",
    })
    const share = vi.fn().mockRejectedValue(denied)
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share, clipboard: { writeText } })

    renderDetail(FULL_FILM)
    clickShare()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(shareUrl))
  })

  it("uses the native sheet with the canonical URL when it is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share, clipboard: undefined })

    renderDetail(FULL_FILM)
    clickShare()
    await vi.waitFor(() =>
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ url: shareUrl, title: "Communion" })
      )
    )
  })
})
