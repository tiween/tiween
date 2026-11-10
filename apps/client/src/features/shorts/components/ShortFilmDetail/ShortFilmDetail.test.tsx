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
 * Phase 2 additions (SPAGE-03, SPAGE-04, FR56; D-09 to D-12, D-19): the
 * Équipe artistique grid, access sub-labels, original title and origin lines,
 * initials discs, silent French-fallback tagging, and axe at 390px-class
 * markup in fr, ar and en for a full and a sparse record. jsdom cannot compute
 * contrast; that stays a manual pass.
 *
 * NOT covered here: the "unknown slug → notFound() → 404" row, which is the
 * route's (`app/[locale]/shorts/[slug]/page.test.tsx`) behavior, not the
 * component's.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import * as React from "react"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm, ShortFilmCrewCredit } from "../../types"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../../test/helpers/axe"
import { markRetryPending, resetRetryFocus } from "../../utils/retryFocus"
import { ShortFilmDetail } from "./ShortFilmDetail"

const { backSpy, pushSpy, toastSpy, heartState, heartToggle, heartArgs } =
  vi.hoisted(() => ({
    backSpy: vi.fn(),
    pushSpy: vi.fn(),
    toastSpy: vi.fn(),
    heartState: {
      isSaved: false,
      isResolved: true,
      isBusy: false,
      isPending: false,
      status: "authenticated" as
        | "authenticated"
        | "unauthenticated"
        | "loading",
    },
    heartToggle: vi.fn(),
    heartArgs: vi.fn(),
  }))

vi.mock("@/components/ui/use-toast", () => ({ toast: toastSpy }))

// The shared heart state machine has its own suite
// (`useShortFilmHeart.test.tsx`); the detail page only renders what it returns.
vi.mock("@/features/watchlist/hooks/useShortFilmHeart", () => ({
  useShortFilmHeart: (...args: unknown[]) => {
    heartArgs(...args)
    return { ...heartState, toggle: heartToggle }
  },
}))

// The component routes through next-intl's locale-aware navigation (French is
// served unprefixed), so that is the module to stub. `Link` renders the href
// it was handed verbatim, which lets the tests assert it carries no locale.
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: pushSpy, back: backSpy }),
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string
    alt: string
    onError?: React.ReactEventHandler<HTMLImageElement>
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
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
  "watchlistAdd",
  "watchlistRemove",
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
  "shareCopied",
  "shareFailed",
  "originalTitle",
  "countryLabel",
  "languageLabel",
  "languageNames.aeb",
  "languageNames.ber",
  "access.free",
  "access.included",
  "access.subscription",
  "access.rental",
  "crew.title",
  "crew.departments.directing",
  "crew.departments.other",
  "crew.roles.director",
  "crew.roles.other",
] as const

/** Resolve a dotted key inside the `shorts` namespace. */
function lookup(namespace: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      namespace
    )
}

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

function crewCredit(
  name: string,
  department: string,
  roleSlug: string,
  extra: Partial<ShortFilmCrewCredit> = {}
): ShortFilmCrewCredit {
  return {
    person: { slug: name.toLowerCase().replace(/\s+/g, "-"), name },
    roleSlug,
    department,
    ...extra,
  }
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
  originalTitle: "كوميونيون",
  country: ["TN", "FR"],
  language: ["aeb"],
  locale: "fr",
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
    {
      platform: "youtube",
      url: "https://youtube.example/communion",
      accessType: "free",
      label: "VOST",
    },
  ],
  awards: [{ name: "Prix du jury", category: "Clermont-Ferrand", won: true }],
  // Deliberately out of department order and out of billing order.
  crew: [
    crewCredit("Sofian El Fani", "camera", "director-of-photography"),
    crewCredit("Yasmine Ben Ali", "directing", "director"),
    crewCredit("Kahena Attia", "editing", "editor"),
    crewCredit("Néjib Ayed", "production", "producer", { billing: 2 }),
    crewCredit("Amel Zouari", "production", "producer", {
      billing: 1,
      customRole: "Production exécutive",
    }),
    crewCredit("Ali Drone", "camera", "drone-pilot"),
  ],
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
  toastSpy.mockClear()
  heartToggle.mockClear()
  heartArgs.mockClear()
  Object.assign(heartState, {
    isSaved: false,
    isResolved: true,
    isBusy: false,
    isPending: false,
    status: "authenticated",
  })
})

afterEach(() => {
  cleanup()
  resetRetryFocus()
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
      "Équipe artistique",
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
      const namespace = (messages as { shorts?: Record<string, unknown> })
        .shorts
      expect(
        namespace,
        `${locale}.json is missing the shorts namespace`
      ).toBeDefined()
      for (const key of KEYS_USED) {
        const value = lookup(namespace, key)
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
      "Crew",
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
      "الفريق الفني",
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
          platform: "brand-new-platform" as never,
          url: "https://new.example/communion",
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
  it("renders no rating — ratings are out of v1", () => {
    renderDetail(FULL_FILM, {
      relatedShorts: [
        { ...RELATED[0]!, rating: 5 },
        {
          id: 3,
          documentId: "wissam-003",
          title: "Wissam",
          slug: "wissam",
          rating: 4.8,
        },
      ],
    })

    // Neither the French-comma nor the period form of any rating appears.
    expect(screen.queryByText(/^[0-9][,.][0-9]$/)).not.toBeInTheDocument()
    expect(screen.queryByText("5,0")).not.toBeInTheDocument()
    expect(screen.queryByText("4,8")).not.toBeInTheDocument()
    expect(screen.getByTitle("Wissam")).toBeInTheDocument()
  })

  it("links related films without a locale prefix (no /fr/ redirect)", () => {
    renderDetail(FULL_FILM, { relatedShorts: RELATED })

    const link = screen.getByRole("link", { name: /Brotherhood/ })
    expect(link).toHaveAttribute("href", "/shorts/brotherhood")
    expect(link.getAttribute("href")).not.toMatch(/^\/(fr|ar|en)\//)
  })

  it("falls back to the reserved-artwork stripe when a poster fails to load", () => {
    renderDetail(FULL_FILM, {
      relatedShorts: [
        { ...RELATED[0]!, poster: { url: "https://cdn.example/broken.jpg" } },
      ],
    })

    const poster = screen.getByRole("img", { name: "Brotherhood" })
    fireEvent.error(poster)

    // The broken image (and its overlapping alt text) is gone; the frame's
    // own stripe background shows through, and the title stays as text.
    expect(
      screen.queryByRole("img", { name: "Brotherhood" })
    ).not.toBeInTheDocument()
    expect(screen.getByTitle("Brotherhood")).toBeInTheDocument()
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
    // Locale-aware router: the unprefixed path, never a hand-built `/fr/`.
    expect(pushSpy).toHaveBeenCalledWith("/shorts")
    expect(backSpy).not.toHaveBeenCalled()
  })
})

describe("ShortFilmDetail — watchlist heart (FR19, FR20; UI-SPEC A4, Part E)", () => {
  const LABELS = {
    fr: {
      add: "Ajouter à ma watchlist",
      remove: "Retirer de ma watchlist",
    },
    ar: {
      add: "إضافة إلى قائمة المتابعة",
      remove: "إزالة من قائمة المتابعة",
    },
    en: {
      add: "Add to my watchlist",
      remove: "Remove from my watchlist",
    },
  } as const

  function detailUi(locale: TestLocale = "fr") {
    return (
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone="Africa/Tunis"
      >
        <ShortFilmDetail film={FULL_FILM} />
      </NextIntlClientProvider>
    )
  }

  function stubMotion(reduce: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: reduce && query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    )
  }

  it("reads the detail surface of the shared state machine for the film", () => {
    renderDetail(FULL_FILM)

    expect(heartArgs).toHaveBeenCalledWith("communion-001", {
      surface: "detail",
    })
  })

  it.each(["fr", "ar", "en"] as const)(
    "names the action without the film title and agrees with aria-pressed (%s)",
    (locale) => {
      const { rerender } = render(detailUi(locale))

      const add = screen.getByRole("button", { name: LABELS[locale].add })
      expect(add).toHaveAttribute("aria-pressed", "false")
      expect(add.getAttribute("aria-label")).not.toContain("Communion")

      heartState.isSaved = true
      rerender(detailUi(locale))

      const remove = screen.getByRole("button", {
        name: LABELS[locale].remove,
      })
      expect(remove).toHaveAttribute("aria-pressed", "true")
      expect(remove.getAttribute("aria-label")).not.toContain("Communion")
    }
  )

  it("no longer uses the shorts-only 'Ma liste' wording", () => {
    heartState.isSaved = true
    const { container } = renderDetail(FULL_FILM)

    expect(container.textContent ?? "").not.toMatch(/Ma liste/)
    expect(screen.queryByRole("button", { name: "Ma liste" })).toBeNull()
    expect(
      screen.queryByRole("button", { name: "Retirer de ma liste" })
    ).toBeNull()
  })

  it("forwards a tap to the shared toggle", () => {
    renderDetail(FULL_FILM)

    fireEvent.click(screen.getByRole("button", { name: LABELS.fr.add }))

    expect(heartToggle).toHaveBeenCalledTimes(1)
  })

  it("signed out: an enabled outline invitation, not a disabled control", () => {
    heartState.status = "unauthenticated"
    renderDetail(FULL_FILM)

    const heart = screen.getByRole("button", { name: LABELS.fr.add })
    expect(heart).not.toBeDisabled()
    expect(heart).toHaveAttribute("aria-pressed", "false")
    expect(heart).not.toHaveAttribute("aria-busy")
    fireEvent.click(heart)
    expect(heartToggle).toHaveBeenCalledTimes(1)
  })

  describe("unresolved saved state", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      heartState.isResolved = false
      heartState.isBusy = true
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it("is aria-busy and shows the outline until 200ms have passed", () => {
      const { container } = renderDetail(FULL_FILM)
      const heart = screen.getByRole("button", { name: LABELS.fr.add })

      expect(heart).toHaveAttribute("aria-busy", "true")
      expect(heart).not.toBeDisabled()

      act(() => {
        vi.advanceTimersByTime(199)
      })
      expect(container.querySelector('[class*="heartSpinner"]')).toBeNull()
      expect(container.querySelector('[class*="heartStack"]')).not.toBeNull()
    })

    it("swaps the glyph for a 16px spinner after 200ms", () => {
      const { container } = renderDetail(FULL_FILM)

      act(() => {
        vi.advanceTimersByTime(200)
      })

      const spinner = container.querySelector('[class*="heartSpinner"]')
      expect(spinner).not.toBeNull()
      expect(spinner).toHaveAttribute("width", "16")
      expect(container.querySelector('[class*="heartStack"]')).toBeNull()
      // Static under reduced motion (the Tailwind motion-reduce class).
      expect(spinner!.getAttribute("class")).toMatch(
        /motion-reduce:animate-none/
      )
    })

    it("returns to the heart glyph once the answer arrives", () => {
      const { container, rerender } = render(detailUi())
      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(container.querySelector('[class*="heartSpinner"]')).not.toBeNull()

      heartState.isResolved = true
      heartState.isBusy = false
      rerender(detailUi())

      expect(container.querySelector('[class*="heartSpinner"]')).toBeNull()
      expect(container.querySelector('[class*="heartStack"]')).not.toBeNull()
      expect(
        screen.getByRole("button", { name: LABELS.fr.add })
      ).not.toHaveAttribute("aria-busy")
    })

    it("never shows the spinner to a signed-out visitor", () => {
      heartState.status = "unauthenticated"
      heartState.isResolved = true
      heartState.isBusy = false
      const { container } = renderDetail(FULL_FILM)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(container.querySelector('[class*="heartSpinner"]')).toBeNull()
    })
  })

  describe("save pulse", () => {
    function pulseClass(container: HTMLElement) {
      return container
        .querySelector('[class*="heartFill"]')!
        .getAttribute("class")!
    }

    it("pulses on the visitor's unsaved to saved change, then settles", () => {
      vi.useFakeTimers()
      try {
        stubMotion(false)
        const { container, rerender } = render(detailUi())
        expect(pulseClass(container)).not.toMatch(/animate-watchlist-pulse/)

        heartState.isSaved = true
        rerender(detailUi())
        expect(pulseClass(container)).toMatch(/animate-watchlist-pulse/)

        act(() => {
          vi.advanceTimersByTime(300)
        })
        expect(pulseClass(container)).not.toMatch(/animate-watchlist-pulse/)
      } finally {
        vi.useRealTimers()
      }
    })

    it("does not pulse under reduced motion", () => {
      stubMotion(true)
      const { container, rerender } = render(detailUi())

      heartState.isSaved = true
      rerender(detailUi())

      expect(pulseClass(container)).not.toMatch(/animate-watchlist-pulse/)
      expect(
        screen.getByRole("button", { name: LABELS.fr.remove })
      ).toHaveAttribute("aria-pressed", "true")
    })

    it("does not pulse when a saved film arrives with the check answer", () => {
      stubMotion(false)
      heartState.isResolved = false
      heartState.isBusy = true
      const { container, rerender } = render(detailUi())

      heartState.isResolved = true
      heartState.isBusy = false
      heartState.isSaved = true
      rerender(detailUi())

      expect(pulseClass(container)).not.toMatch(/animate-watchlist-pulse/)
    })

    it("does not pulse when the page renders already saved", () => {
      stubMotion(false)
      heartState.isSaved = true
      const { container } = renderDetail(FULL_FILM)

      expect(pulseClass(container)).not.toMatch(/animate-watchlist-pulse/)
    })

    it("does not pulse on the saved to unsaved change", () => {
      stubMotion(false)
      heartState.isSaved = true
      const { container, rerender } = render(detailUi())

      heartState.isSaved = false
      rerender(detailUi())

      expect(pulseClass(container)).not.toMatch(/animate-watchlist-pulse/)
    })
  })

  describe("axe", () => {
    const STATES: Array<[string, () => void]> = [
      ["unsaved", () => {}],
      [
        "saved",
        () => {
          heartState.isSaved = true
        },
      ],
      [
        "busy",
        () => {
          heartState.isResolved = false
          heartState.isBusy = true
        },
      ],
    ]

    for (const locale of ["fr", "ar", "en"] as const) {
      for (const [name, setup] of STATES) {
        it(`has no violations with the heart ${name} in ${locale}`, async () => {
          setup()
          const { container } = renderDetail(FULL_FILM, { locale })
          if (name === "busy") {
            // Let the 200ms timer swap in the spinner, then audit that state.
            await act(async () => {
              await new Promise((resolve) => setTimeout(resolve, 250))
            })
            expect(
              container.querySelector('[class*="heartSpinner"]')
            ).not.toBeNull()
          }
          await expectNoA11yViolations(container)
        })
      }
    }
  })
})

describe("ShortFilmDetail — retry focus (UI-SPEC C3)", () => {
  it("focuses the h1 after a successful retry", () => {
    markRetryPending()
    renderDetail(FULL_FILM)

    const h1 = screen.getByRole("heading", { level: 1 })
    expect(h1).toHaveAttribute("tabindex", "-1")
    expect(h1).toHaveFocus()
  })

  it("leaves focus alone when no retry is pending", () => {
    renderDetail(FULL_FILM)

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus()
  })

  it("claims the retry only once", () => {
    markRetryPending()
    const first = renderDetail(FULL_FILM)
    first.unmount()

    renderDetail(FULL_FILM)
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus()
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
    // A silent copy reads as a dead button — the visitor is told it worked.
    await vi.waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({ description: "Lien copié" })
    )
  })

  it("hands the visitor the link when no clipboard is available", async () => {
    stubNavigator({ share: undefined, clipboard: undefined })

    renderDetail(FULL_FILM)
    clickShare()
    await vi.waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        description: `Copiez ce lien pour le partager : ${shareUrl}`,
      })
    )
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

describe("ShortFilmDetail — Équipe artistique (SPAGE-03, D-09, D-10)", () => {
  function crewSection(): HTMLElement {
    return screen
      .getByRole("heading", {
        level: 2,
        name: /Équipe artistique|Crew|الفريق الفني/,
      })
      .closest("section") as HTMLElement
  }

  /** [name, role] per row, in DOM order. */
  function crewRows(): string[][] {
    return within(crewSection())
      .getAllByRole("listitem")
      .map((row) =>
        Array.from(row.querySelectorAll("bdi")).map((n) => n.textContent ?? "")
      )
  }

  it("groups by department in the fixed order with an h3 per group", () => {
    renderDetail(FULL_FILM)

    const departments = within(crewSection())
      .getAllByRole("heading", { level: 3 })
      .map((node) => node.textContent)
    expect(departments).toEqual([
      "Réalisation",
      "Production",
      "Image",
      "Montage",
    ])
  })

  it("sorts by billing inside a group, unbilled last, API order for ties", () => {
    renderDetail(FULL_FILM)

    expect(crewRows()).toEqual([
      ["Yasmine Ben Ali", "Réalisation"],
      ["Amel Zouari", "Production exécutive"],
      ["Néjib Ayed", "Production"],
      ["Sofian El Fani", "Direction de la photographie"],
      ["Ali Drone", "Drone pilot"],
      ["Kahena Attia", "Montage"],
    ])
  })

  it("lets customRole win and humanizes an unknown slug (never blank)", () => {
    renderDetail({
      ...FULL_FILM,
      crew: [
        crewCredit("A", "sound", "sound-mixer"),
        crewCredit("B", "sound", "sound-engineer", {
          customRole: "  Bruiteur ",
        }),
        crewCredit("C", "sound", ""),
      ],
    })

    const rows = crewRows()
    expect(rows[0]).toEqual(["A", "Sound mixer"])
    expect(rows[1]).toEqual(["B", "Bruiteur"])
    expect(rows[2]![1]!.trim().length).toBeGreaterThan(0)
  })

  it("files an unknown department under Autres", () => {
    renderDetail({
      ...FULL_FILM,
      crew: [crewCredit("A", "catering", "caterer")],
    })
    expect(
      within(crewSection())
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent)
    ).toEqual(["Autres"])
  })

  it("keeps two roles of one person in a department as two rows", () => {
    renderDetail({
      ...FULL_FILM,
      crew: [
        crewCredit("Anis Lassoued", "directing", "director"),
        crewCredit("Anis Lassoued", "directing", "assistant-director"),
      ],
    })
    expect(crewRows()).toEqual([
      ["Anis Lassoued", "Réalisation"],
      ["Anis Lassoued", "Assistanat à la réalisation"],
    ])
  })

  it("omits the section and every department heading without credits", () => {
    for (const crew of [undefined, []]) {
      cleanup()
      renderDetail({ ...FULL_FILM, crew })
      expect(screen.queryByText("Équipe artistique")).not.toBeInTheDocument()
      expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0)
    }
  })

  it("keeps directors in the hero meta line as well", () => {
    renderDetail(FULL_FILM)
    // Once in the meta line, once in the crew grid.
    expect(screen.getAllByText("Yasmine Ben Ali")).toHaveLength(2)
  })

  it("renders role copy in en and ar from the locale catalogs", () => {
    renderDetail(FULL_FILM, { locale: "en" })
    expect(crewRows()[3]).toEqual(["Sofian El Fani", "Director of photography"])
    cleanup()

    renderDetail(FULL_FILM, { locale: "ar" })
    expect(crewRows()[0]).toEqual(["Yasmine Ben Ali", "إخراج"])
    expect(
      within(crewSection())
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent)
    ).toEqual(["الإخراج", "الإنتاج", "التصوير", "المونتاج"])
  })

  it("renders editor text as text, never as markup (T-02-12)", () => {
    const { container } = renderDetail({
      ...FULL_FILM,
      crew: [
        crewCredit("<b>Bold</b>", "directing", "director", {
          customRole: '<img src=x onerror="alert(1)">',
        }),
      ],
      streamingLinks: [
        {
          platform: "youtube",
          url: "https://youtube.example/communion",
          accessType: "free",
          label: "<script>alert(1)</script>",
        },
      ],
    })

    expect(screen.getByText("<b>Bold</b>")).toBeInTheDocument()
    expect(
      screen.getByText('<img src=x onerror="alert(1)">')
    ).toBeInTheDocument()
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument()
    expect(container.querySelector("script")).toBeNull()
    expect(container.querySelector('img[src="x"]')).toBeNull()
  })
})

describe("ShortFilmDetail — initials discs (D-12, D-21)", () => {
  it("shows aria-hidden initials beside crew names and in the cast rail", () => {
    renderDetail(FULL_FILM)

    for (const letters of ["YA", "SF", "HS"]) {
      expect(screen.getByText(letters)).toHaveAttribute("aria-hidden", "true")
    }
    // The name stays as readable text beside the disc.
    expect(screen.getByText("Hend Sabri")).toBeInTheDocument()
  })

  it("never renders a person photo, even when the data carries one", () => {
    renderDetail({
      ...FULL_FILM,
      cast: [
        {
          person: {
            slug: "hend",
            name: "Hend Sabri",
            photo: { url: "https://cdn.example/hend.jpg" },
          } as never,
          role: "Leïla",
        },
      ],
    })
    expect(screen.queryByRole("img", { name: "Hend Sabri" })).toBeNull()
    expect(screen.getByText("HS")).toBeInTheDocument()
  })

  it("separates two Arabic-script initials with a zero-width non-joiner", () => {
    renderDetail(
      {
        ...FULL_FILM,
        cast: [{ person: { slug: "hend", name: "هند صبري" }, role: "ليلى" }],
      },
      { locale: "ar" }
    )
    expect(screen.getByText("ه‌ص")).toHaveAttribute("aria-hidden", "true")
  })

  it("imports no avatar library and no photo prop", () => {
    const source = readFileSync(
      resolve(__dirname, "ShortFilmDetail.tsx"),
      "utf8"
    )
    const disc = readFileSync(resolve(__dirname, "InitialsDisc.tsx"), "utf8")
    for (const text of [source, disc]) {
      expect(text).not.toMatch(/@radix-ui/)
      expect(text).not.toMatch(/components\/ui\/avatar/)
      expect(text).not.toMatch(/\.photo\b/)
    }
  })
})

describe("ShortFilmDetail — where to watch access label (SPAGE-03)", () => {
  function subLabelOf(platformName: string): string {
    const row = screen.getByText(platformName).closest("div")!.parentElement!
    return Array.from(row.children)
      .slice(1)
      .map((node) => node.textContent)
      .join("")
  }

  it("shows the translated access type then the editor label verbatim", () => {
    renderDetail(FULL_FILM)
    expect(screen.getByText("VOST").parentElement).toHaveTextContent(
      "Gratuit · VOST"
    )
  })

  it("translates all four access types in fr, ar and en", () => {
    const expected = {
      fr: ["Gratuit", "Inclus", "Sur abonnement", "À la location"],
      ar: ["مجاني", "مشمول", "باشتراك", "للإيجار"],
      en: ["Free", "Included", "Subscription", "Rental"],
    } as const
    for (const locale of ["fr", "ar", "en"] as const) {
      cleanup()
      renderDetail(
        {
          ...FULL_FILM,
          streamingLinks: (
            ["free", "included", "subscription", "rental"] as const
          ).map((accessType, index) => ({
            platform: "vimeo" as const,
            url: `https://vimeo.example/${index}`,
            accessType,
          })),
        },
        { locale }
      )
      for (const label of expected[locale]) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    }
  })

  it("shows the access type alone when the link has no label", () => {
    renderDetail({
      ...FULL_FILM,
      streamingLinks: [
        {
          platform: "arte",
          url: "https://arte.example/communion",
          accessType: "subscription",
        },
      ],
    })
    expect(screen.getByText("Sur abonnement")).toBeInTheDocument()
    expect(subLabelOf("ARTE")).toBe("Sur abonnement")
  })

  it("shows no sub-label for a missing or unknown accessType, and the row still renders", () => {
    renderDetail({
      ...FULL_FILM,
      streamingLinks: [
        { platform: "vimeo", url: "https://vimeo.example/a", label: "VOST" },
        {
          platform: "netflix",
          url: "https://netflix.example/a",
          accessType: "barter" as never,
          label: "VF",
        },
      ],
    })
    expect(screen.getByText("Vimeo")).toBeInTheDocument()
    expect(screen.getByText("Netflix")).toBeInTheDocument()
    expect(subLabelOf("Vimeo")).toBe("")
    expect(subLabelOf("Netflix")).toBe("")
    expect(screen.queryByText("VOST")).not.toBeInTheDocument()
    expect(screen.queryByText("VF")).not.toBeInTheDocument()
  })

  it("resolves all ten platform names", () => {
    const platforms = [
      ["youtube", "YouTube"],
      ["vimeo", "Vimeo"],
      ["dailymotion", "Dailymotion"],
      ["artify", "Artify"],
      ["arte", "ARTE"],
      ["mubi", "MUBI"],
      ["netflix", "Netflix"],
      ["shahid", "Shahid"],
      ["tv5monde", "TV5MONDE"],
      ["other", "Autre plateforme"],
    ] as const
    renderDetail({
      ...FULL_FILM,
      streamingLinks: platforms.map(([platform], index) => ({
        platform,
        url: `https://watch.example/${index}`,
      })),
    })
    for (const [, name] of platforms) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it("keeps the sub-label while a hostile url still yields no Regarder control", () => {
    renderDetail({
      ...FULL_FILM,
      trailer: undefined,
      streamingLinks: [
        {
          platform: "youtube",
          url: "javascript:alert(1)",
          accessType: "free",
        },
      ],
    })
    expect(screen.getByText("Gratuit")).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Regarder/ })
    ).not.toBeInTheDocument()
  })
})

describe("ShortFilmDetail — original title (SPAGE-04)", () => {
  it("shows a differing original title in its own bdi, tagged Arabic", () => {
    renderDetail(FULL_FILM)

    const bdi = screen.getByText("كوميونيون")
    expect(bdi.tagName).toBe("BDI")
    expect(bdi).toHaveAttribute("dir", "auto")
    expect(bdi).toHaveAttribute("lang", "ar")
    expect(bdi.parentElement).toHaveTextContent("Titre original : كوميونيون")
  })

  it("sets no lang when the original title is not Arabic script", () => {
    renderDetail({ ...FULL_FILM, originalTitle: "The Communion" })
    const bdi = screen.getByText("The Communion")
    expect(bdi).toHaveAttribute("dir", "auto")
    expect(bdi).not.toHaveAttribute("lang")
  })

  it("uses the page locale copy in en and ar", () => {
    renderDetail(FULL_FILM, { locale: "en" })
    expect(screen.getByText("كوميونيون").parentElement).toHaveTextContent(
      "Original title: كوميونيون"
    )
    cleanup()
    renderDetail(FULL_FILM, { locale: "ar" })
    expect(screen.getByText("كوميونيون").parentElement).toHaveTextContent(
      "العنوان الأصلي: كوميونيون"
    )
  })

  it.each([
    ["undefined", undefined],
    ["blank", "   "],
    ["identical", "Communion"],
    ["case-only difference", "COMMUNION"],
    ["accent-only difference", "Communiòn"],
    ["padded", "  communion "],
  ])("hides the line when the original title is %s", (_name, originalTitle) => {
    renderDetail({ ...FULL_FILM, originalTitle })
    expect(screen.queryByText(/Titre original/)).not.toBeInTheDocument()
  })

  it("folds accents on the displayed side too", () => {
    renderDetail({
      ...FULL_FILM,
      title: "Été",
      originalTitle: "ete",
    })
    expect(screen.queryByText(/Titre original/)).not.toBeInTheDocument()
  })
})

describe("ShortFilmDetail — origin line (SPAGE-04, D-19)", () => {
  function originLine(): HTMLElement {
    return screen.getByText("Tunisie et France", { exact: false })
      .parentElement as HTMLElement
  }

  it("shows country and language names in fr with hidden labels", () => {
    renderDetail(FULL_FILM)

    const line = screen.getByText("Pays:", { exact: false }).parentElement!
    expect(line).toHaveTextContent(
      "Pays: Tunisie et France · Langue: arabe tunisien"
    )
    expect(screen.getByText("Pays:", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("Langue:", { exact: false })).toBeInTheDocument()
  })

  it("uses plural-aware labels", () => {
    renderDetail({ ...FULL_FILM, language: ["aeb", "fr"] })
    expect(screen.getByText("Langues:", { exact: false })).toBeInTheDocument()
  })

  it("shows names in en and ar, never a raw code", () => {
    renderDetail(FULL_FILM, { locale: "en" })
    expect(
      screen.getByText("Countries:", { exact: false }).parentElement
    ).toHaveTextContent(
      "Countries: Tunisia, France · Language: Tunisian Arabic"
    )
    cleanup()

    const { container } = renderDetail(FULL_FILM, { locale: "ar" })
    const text = container.textContent ?? ""
    expect(text).toContain("تونس")
    expect(text).toContain("فرنسا")
    expect(text).toContain("العربية التونسية")
    expect(text).not.toMatch(/\b(TN|FR|aeb)\b/)
  })

  it("resolves ber and aeb, drops none silently", () => {
    const { container } = renderDetail({
      ...FULL_FILM,
      language: ["aeb", "none", "ber"],
    })
    expect(container.textContent).toContain("arabe tunisien et berbère")
    expect(container.textContent).not.toMatch(/\bnone\b/i)
    expect(container.textContent).not.toMatch(/\b(aeb|ber)\b/)
  })

  it("never prints a raw code for an unknown country", () => {
    const { container } = renderDetail({
      ...FULL_FILM,
      country: ["XX", "ZZZZ", "TN"],
    })
    expect(container.textContent).toContain("Tunisie")
    expect(container.textContent).not.toMatch(/\bXX\b|ZZZZ/)
  })

  it("drops an empty group together with its separator", () => {
    renderDetail({ ...FULL_FILM, language: ["none"] })
    const line = screen.getByText("Pays:", { exact: false }).parentElement!
    expect(line).toHaveTextContent("Pays: Tunisie et France")
    expect(line.textContent).not.toContain("·")
    expect(screen.queryByText(/Langue/)).not.toBeInTheDocument()
    cleanup()

    renderDetail({ ...FULL_FILM, country: [] })
    expect(screen.queryByText(/Pays/)).not.toBeInTheDocument()
    expect(
      screen.getByText("Langue:", { exact: false }).parentElement
    ).toHaveTextContent("Langue: arabe tunisien")
  })

  it("renders no line when both groups are empty", () => {
    renderDetail({ ...FULL_FILM, country: [], language: ["none"] })
    expect(screen.queryByText(/Pays/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Langue/)).not.toBeInTheDocument()
    cleanup()
    renderDetail(minimalFilm())
    expect(screen.queryByText(/Pays/)).not.toBeInTheDocument()
  })

  it("keeps the origin line out of the way of the focal pair", () => {
    // The line is plain text: no control, no link, no heading.
    renderDetail(FULL_FILM)
    const group = originLine()
    expect(group.querySelector("a, button, h1, h2, h3")).toBeNull()
  })
})

describe("ShortFilmDetail — silent French fallback (FR56, D-11)", () => {
  function titleNode(): HTMLElement {
    return screen
      .getByRole("heading", { level: 1 })
      .querySelector("bdi") as HTMLElement
  }
  const synopsisNode = () =>
    screen.getByText("Trois générations d'une même famille.")

  it("adds no tag on a French page", () => {
    renderDetail({ ...FULL_FILM, locale: "fr" })
    expect(titleNode()).not.toHaveAttribute("lang")
    expect(synopsisNode()).not.toHaveAttribute("lang")
  })

  it("tags lang fr (no dir) on an English page served French", () => {
    renderDetail({ ...FULL_FILM, locale: "fr" }, { locale: "en" })
    expect(titleNode()).toHaveAttribute("lang", "fr")
    expect(titleNode()).not.toHaveAttribute("dir")
    expect(synopsisNode()).toHaveAttribute("lang", "fr")
  })

  it("tags lang fr and dir ltr on an Arabic page served French", () => {
    renderDetail({ ...FULL_FILM, locale: "fr" }, { locale: "ar" })
    expect(titleNode()).toHaveAttribute("lang", "fr")
    expect(titleNode()).toHaveAttribute("dir", "ltr")
    expect(synopsisNode()).toHaveAttribute("lang", "fr")
    expect(synopsisNode()).toHaveAttribute("dir", "ltr")
  })

  it("tags only the synopsis when an Arabic title sits beside a French synopsis", () => {
    renderDetail(
      { ...FULL_FILM, title: "كوميونيون", locale: "ar" },
      { locale: "ar" }
    )
    expect(titleNode()).not.toHaveAttribute("lang")
    expect(synopsisNode()).toHaveAttribute("lang", "fr")
    expect(synopsisNode()).toHaveAttribute("dir", "ltr")
  })

  it("leaves Arabic text on an Arabic page untouched", () => {
    renderDetail(
      {
        ...FULL_FILM,
        title: "كوميونيون",
        synopsis: "<p>ثلاثة أجيال من عائلة واحدة.</p>",
        locale: "ar",
      },
      { locale: "ar" }
    )
    expect(titleNode()).not.toHaveAttribute("lang")
    expect(screen.getByText("ثلاثة أجيال من عائلة واحدة.")).not.toHaveAttribute(
      "lang"
    )
  })

  it("never adds a visible fallback label and never blanks the title", () => {
    const { container } = renderDetail(
      { ...FULL_FILM, locale: "fr" },
      { locale: "ar" }
    )
    expect(container.textContent).not.toMatch(/fran[cç]ais|french|fallback/i)
    expect(titleNode()).toHaveTextContent("Communion")
  })
})

describe("ShortFilmDetail — accessibility (axe, SPAGE-03, SPAGE-04)", () => {
  const SPARSE = minimalFilm()

  for (const locale of ["fr", "ar", "en"] as const) {
    it(`has no violations with full data in ${locale}`, async () => {
      const { container } = renderDetail(FULL_FILM, {
        locale,
        relatedShorts: RELATED,
      })
      await expectNoA11yViolations(container)
    })

    it(`has no violations with sparse data in ${locale}`, async () => {
      const { container } = renderDetail(SPARSE, { locale })
      await expectNoA11yViolations(container)
    })

    it(`has no violations with a French fallback in ${locale}`, async () => {
      const { container } = renderDetail(
        { ...FULL_FILM, locale: "fr" },
        { locale, relatedShorts: RELATED }
      )
      await expectNoA11yViolations(container)
    })
  }
})

describe("ShortFilmDetail — sticky watch bar", () => {
  type ObserverCallback = (
    entries: Partial<IntersectionObserverEntry>[]
  ) => void
  let observerCallback: ObserverCallback | null = null
  const observe = vi.fn()
  const disconnect = vi.fn()

  beforeEach(() => {
    observerCallback = null
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: ObserverCallback) {
          observerCallback = callback
        }
        observe = observe
        unobserve = vi.fn()
        disconnect = disconnect
        takeRecords = () => []
      }
    )
  })

  const STICKY_NAME = "Regarder le film maintenant"
  const ROOT_BOUNDS = { top: 66 } as DOMRectReadOnly

  function report(entry: { isIntersecting: boolean; bottom: number }): void {
    act(() => {
      observerCallback?.([
        {
          isIntersecting: entry.isIntersecting,
          boundingClientRect: { bottom: entry.bottom } as DOMRectReadOnly,
          rootBounds: ROOT_BOUNDS,
        },
      ])
    })
  }

  function stickyBar(): HTMLElement {
    const button = screen.getByRole("button", {
      name: STICKY_NAME,
      hidden: true,
    })
    return button.closest("[data-state]") as HTMLElement
  }

  it("observes the action row", () => {
    renderDetail(FULL_FILM)
    expect(observe).toHaveBeenCalledTimes(1)
    expect(observe.mock.calls[0]![0]).toContainElement(
      screen.getByRole("button", { name: "Regarder le film" })
    )
  })

  it("hides the bar (aria-hidden + inert) while the action row is visible", () => {
    renderDetail(FULL_FILM)
    report({ isIntersecting: true, bottom: 600 })

    const bar = stickyBar()
    expect(bar).toHaveAttribute("data-state", "hidden")
    expect(bar).toHaveAttribute("aria-hidden", "true")
    expect(bar).toHaveAttribute("inert")
    expect(
      screen.queryByRole("button", { name: STICKY_NAME })
    ).not.toBeInTheDocument()
    // The hero disc and the action-row pill remain the reachable controls.
    expect(
      screen.getByRole("button", { name: "Lancer la lecture" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Regarder le film" })
    ).toBeInTheDocument()
  })

  it("keeps the bar hidden while the action row is still below the fold", () => {
    renderDetail(FULL_FILM)
    report({ isIntersecting: false, bottom: 1200 })
    expect(stickyBar()).toHaveAttribute("data-state", "hidden")
  })

  it("shows the bar once the action row has scrolled above the viewport", () => {
    renderDetail(FULL_FILM)
    report({ isIntersecting: true, bottom: 600 })
    report({ isIntersecting: false, bottom: 20 })

    const bar = stickyBar()
    expect(bar).toHaveAttribute("data-state", "visible")
    expect(bar).not.toHaveAttribute("aria-hidden")
    expect(bar).not.toHaveAttribute("inert")
    expect(
      screen.getByRole("button", { name: STICKY_NAME })
    ).toBeInTheDocument()
  })

  it("disconnects the observer on unmount", () => {
    const { unmount } = renderDetail(FULL_FILM)
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})

describe("ShortFilmDetail — sticky bar without IntersectionObserver", () => {
  it("keeps the bar shown (no regression where IO is missing)", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    renderDetail(FULL_FILM)

    const button = screen.getByRole("button", {
      name: "Regarder le film maintenant",
    })
    const bar = button.closest("[data-state]")
    expect(bar).toHaveAttribute("data-state", "visible")
    expect(bar).not.toHaveAttribute("inert")
  })
})
