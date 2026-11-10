/**
 * Stub of the Phase 1 public short-film API, for the production probe and
 * manual UAT. Verification tooling, not shipped code: plain ESM, no dependency.
 *
 * Mimics the real contract (creative-works plugin, `/short-films` routes):
 * flat Strapi v5 JSON, the `{ error: { status, name, message, details } }`
 * envelope, and the `.strict()` query schemas. ANY query key outside the
 * allowlist (`locale` on detail/related; `locale`, `page`, `pageSize` on the
 * list) answers 400 VALIDATION_FAILED, so the probe proves the client sends no
 * phantom parameters (`filters`, `populate`, `pagination`, `sort[]`...).
 *
 * Control endpoints (never affected by the mode):
 *   POST /__mode   body { mode }  ok | down | limited | slow | badjson
 *   GET  /__hits                  per-path request counts + the 400 count
 *   POST /__reset                 clear the counters, back to ok
 *
 * Env: STUB_PORT (default 4010), STUB_FILMS (total films served, default 30, so
 * the directory has two pages at 24 per page; two of them are the rich and the
 * sparse fixture, the rest are generated).
 * Binds 127.0.0.1 only; the fixtures are fictional (T-02-05).
 */
import { createServer } from "node:http"
import process from "node:process"

const PORT = Number(process.env.STUB_PORT ?? 4010)
const TOTAL_FILMS = Math.max(2, Number(process.env.STUB_FILMS ?? 30))
const GENERATED = TOTAL_FILMS - 2
const BASE = "/api/creative-works/creative-works/short-films"
const SLUG_PATTERN = /^[A-Za-z0-9._~-]+$/
const PAGE_SIZE_MAX = 48
const SLOW_MS = 10_000

const LOCALES = new Set(["fr", "ar", "en"])

const person = (id, name) => ({
  documentId: `person-${id}`,
  slug: id,
  name,
})

const base = (slug, title, locale, extra = {}) => ({
  documentId: `doc-${slug}`,
  slug,
  locale,
  title: `${title} [${locale}]`,
  originalTitle: null,
  synopsis: null,
  duration: 12,
  releaseYear: 2024,
  country: ["TN"],
  language: ["aeb"],
  featured: false,
  featuredRank: null,
  publishedAt: "2026-10-20T10:00:00.000Z",
  poster: null,
  backdrop: null,
  genres: [{ documentId: "genre-drame", slug: "drame", name: "Drame" }],
  directors: [person("sana-ben-youssef", "Sana Ben Youssef")],
  availableOnline: false,
  hasAwards: false,
  ...extra,
})

/** Rich film: directing credit, cast, trailer, distinction, two links. */
function richFilm(locale) {
  return {
    ...base("probe-film", "Probe Film", locale, {
      originalTitle: "فيلم تجريبي",
      synopsis: "Un court métrage fictif pour la sonde de production.",
      availableOnline: true,
      hasAwards: true,
    }),
    rating: null,
    ageRating: "PG12",
    photos: [],
    credits: [
      {
        person: person("sana-ben-youssef", "Sana Ben Youssef"),
        creditRole: { slug: "director", department: "directing" },
        customRole: null,
        billing: 1,
      },
      {
        person: person("karim-trabelsi", "Karim Trabelsi"),
        creditRole: { slug: "cinematographer", department: "camera" },
        customRole: null,
        billing: 2,
      },
    ],
    cast: [
      {
        person: person("nour-gharbi", "Nour Gharbi"),
        character: { documentId: "char-leila", name: "Leila" },
        billing: 1,
      },
    ],
    distinctions: [
      {
        name: "Festival fictif",
        edition: "2025",
        year: 2025,
        section: null,
        category: "Courts métrages",
        result: "winner",
        awardName: "Grand prix",
      },
    ],
    videos: [
      { url: "https://example.com/probe-trailer", videoType: "trailer" },
    ],
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://example.com/probe-watch",
        accessType: "free",
        label: "Film complet",
      },
      {
        platform: "arte",
        url: "https://example.com/probe-arte",
        accessType: "included",
        label: null,
      },
    ],
  }
}

/** Sparse film: the minimum the API can return. */
function sparseFilm(locale) {
  return {
    ...base("probe-sparse", "Probe Sparse", locale, {
      duration: null,
      releaseYear: null,
      country: [],
      language: [],
      genres: [],
      directors: [],
    }),
    rating: null,
    ageRating: null,
    photos: [],
    credits: [],
    cast: [],
    distinctions: [],
    videos: [],
    streamingLinks: [],
  }
}

function generatedFilm(index, locale) {
  const slug = `probe-film-${String(index).padStart(3, "0")}`
  return {
    ...base(slug, `Probe Film ${index}`, locale),
    rating: null,
    ageRating: null,
    photos: [],
    credits: [],
    cast: [],
    distinctions: [],
    videos: [],
    streamingLinks: [],
  }
}

function allDetails(locale) {
  return [
    richFilm(locale),
    sparseFilm(locale),
    ...Array.from({ length: GENERATED }, (_, i) =>
      generatedFilm(i + 1, locale)
    ),
  ]
}

const summary = (detail) => {
  const {
    rating: _rating,
    ageRating: _ageRating,
    photos: _photos,
    credits: _credits,
    cast: _cast,
    distinctions: _distinctions,
    videos: _videos,
    streamingLinks: _streamingLinks,
    ...rest
  } = detail
  return rest
}

const state = { mode: "ok", hits: {}, rejected: 0 }

function envelope(status, name, message, code) {
  return {
    error: { status, name, message, details: code ? { code } : {} },
  }
}

function send(res, status, body, contentType = "application/json") {
  const payload = typeof body === "string" ? body : JSON.stringify(body)
  res.writeHead(status, { "content-type": contentType })
  res.end(payload)
}

function rejectValidation(res) {
  state.rejected += 1
  send(
    res,
    400,
    envelope(400, "ShortFilmError", "Invalid query", "VALIDATION_FAILED")
  )
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ""
    req.on("data", (chunk) => (raw += chunk))
    req.on("end", () => resolve(raw))
  })
}

function serveApi(url, res) {
  const rest = url.pathname.slice(BASE.length)
  const keys = [...url.searchParams.keys()]
  const segments = rest.split("/").filter(Boolean)
  const isList = segments.length === 0
  const allowed = isList ? ["locale", "page", "pageSize"] : ["locale"]

  if (keys.some((key) => !allowed.includes(key))) return rejectValidation(res)

  const locale = url.searchParams.get("locale") ?? "fr"
  if (!LOCALES.has(locale)) {
    return send(
      res,
      400,
      envelope(
        400,
        "ShortFilmError",
        "Unsupported locale",
        "UNSUPPORTED_LOCALE"
      )
    )
  }

  if (isList) {
    const page = Number(url.searchParams.get("page") ?? 1)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 24)
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > PAGE_SIZE_MAX
    ) {
      return rejectValidation(res)
    }
    const items = allDetails(locale).map(summary)
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
    const slice = items.slice((page - 1) * pageSize, page * pageSize)
    return send(res, 200, {
      data: slice,
      meta: {
        pagination: { page, pageSize, pageCount, total: items.length },
      },
    })
  }

  const slug = decodeURIComponent(segments[0])
  if (!SLUG_PATTERN.test(slug) || slug.length > 200)
    return rejectValidation(res)

  const film = allDetails(locale).find((candidate) => candidate.slug === slug)
  if (!film) {
    return send(
      res,
      404,
      envelope(
        404,
        "ShortFilmError",
        "Short film not found",
        "SHORT_FILM_NOT_FOUND"
      )
    )
  }

  if (segments[1] === "related") {
    return send(res, 200, {
      data: allDetails(locale)
        .filter((candidate) => candidate.slug !== slug)
        .slice(0, 6)
        .map(summary),
    })
  }

  return send(res, 200, { data: film })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`)

  if (url.pathname === "/__mode" && req.method === "POST") {
    const { mode } = JSON.parse((await readBody(req)) || "{}")
    if (!["ok", "down", "limited", "slow", "badjson"].includes(mode)) {
      return send(res, 400, { error: "unknown mode" })
    }
    state.mode = mode
    return send(res, 200, { mode })
  }
  if (url.pathname === "/__hits") {
    return send(res, 200, {
      mode: state.mode,
      hits: state.hits,
      rejected: state.rejected,
    })
  }
  if (url.pathname === "/__reset" && req.method === "POST") {
    state.mode = "ok"
    state.hits = {}
    state.rejected = 0
    return send(res, 200, { mode: state.mode })
  }

  if (!url.pathname.startsWith(BASE) || req.method !== "GET") {
    return send(res, 404, envelope(404, "NotFoundError", "Not Found"))
  }

  state.hits[url.pathname] = (state.hits[url.pathname] ?? 0) + 1

  switch (state.mode) {
    case "down":
      return send(
        res,
        500,
        envelope(500, "InternalServerError", "Internal Server Error")
      )
    case "limited":
      return send(
        res,
        429,
        envelope(429, "TooManyRequestsError", "RATE_LIMITED")
      )
    case "badjson":
      return send(res, 200, "<html>Bad gateway</html>", "text/plain")
    case "slow":
      return void setTimeout(() => serveApi(url, res), SLOW_MS)
    default:
      return serveApi(url, res)
  }
})

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`stub-strapi listening on 127.0.0.1:${PORT}\n`)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
