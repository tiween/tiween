/**
 * Production probe for the shorts routes (Phase 2, Plan 01).
 *
 * Verification tooling, not shipped code. It exercises PRODUCTION behaviour
 * only: `next dev` disables the Data Cache (`BaseStrapiClient` forces
 * `revalidate: 0` in development, RESEARCH Pitfall 6), so caching, rendering
 * mode and HTTP status claims mean nothing there.
 *
 * Steps
 *   1. `next build` with STRAPI_URL pointing at an unreachable address: the
 *      build must succeed (a deploy never depends on Strapi, D-06) and
 *      `/[locale]/shorts/[slug]` must be a dynamic route, not prerendered.
 *   2. Start the stub Strapi (stub-strapi.mjs) and `next start` against it.
 *   3. Detail route matrix (fr, ar, en). Known slug: 200 with the film title.
 *      Unknown slug, a slug failing the API pattern (no Strapi request), an
 *      outage, a 429, a non-JSON body and a timeout: the RENDERED STATE is
 *      asserted (D-22): a `noindex` robots meta plus the not-found markup for
 *      the first two, the error markup (never the not-found one) for the rest.
 *      Where Chrome is installed the hydrated DOM is read through a tiny
 *      forwarding proxy and must show the shorts boundaries of Plan 06 in the
 *      page locale: the "introuvable" block (no `role="alert"`) or the detail
 *      error block (`role="alert"`, headline, retry label); otherwise only the
 *      streamed markers are checked.
 *      The HTTP status is printed as INFO only: the site-wide
 *      `app/[locale]/loading.tsx` streams the response before the `[slug]`
 *      layout decides, so these answer 200 until the real 404/500 lands in
 *      Phase 5 (success criterion 5). Recovery after an outage must show the
 *      film on the very next request (failed responses are not cached). The
 *      stub answers 400 to any phantom query key, so zero 400s proves the
 *      fetchers send only allowlisted keys.
 *   4. The load-more route handler: 200, strict 400, upstream failure 502.
 *
 * Usage: node apps/client/scripts/shorts-probe/probe.mjs [--detail-only]
 *        (--skip-build reuses .next for quick iteration; the real verification
 *        is always the full run)
 * Ports: 3999 (app), 4010 (stub), 4020 (forwarding proxy for Chrome). Ends with `PROBE PASS` or `PROBE FAIL`.
 */
import { spawn } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createServer, request as httpRequest } from "node:http"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(here, "../..")
const repoRoot = resolve(clientDir, "../..")

const APP_PORT = 3999
const STUB_PORT = 4010
const PROXY_PORT = 4020
// Must be `localhost`, matching `next start -H localhost`: the default-locale
// (`/shorts/...`) pages are an internal rewrite to `/fr/...`, and Next only
// treats that rewrite as same-origin when the host names agree.
const APP_URL = `http://localhost:${APP_PORT}`
const STUB_URL = `http://127.0.0.1:${STUB_PORT}`
const UNREACHABLE_STRAPI = "http://127.0.0.1:1"
const BUILD_TIMEOUT_MS = 15 * 60_000
const READY_TIMEOUT_MS = 90_000
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]

/** Placeholder values: nothing here is a secret and no secret file is read. */
const probeEnv = {
  ...process.env,
  APP_PUBLIC_URL: APP_URL,
  NEXTAUTH_URL: APP_URL,
  NEXTAUTH_SECRET: "probe-secret-not-real",
  STRAPI_REST_READONLY_API_KEY: "probe-readonly-key-not-real",
  NEXT_TELEMETRY_DISABLED: "1",
}

const children = []
const rows = []

function log(line = "") {
  process.stdout.write(`${line}\n`)
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms))
}

function killAll() {
  for (const child of children) {
    if (child.exitCode !== null || child.pid === undefined) continue
    try {
      process.kill(-child.pid, "SIGTERM")
    } catch {
      // already gone
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    killAll()
    process.exit(130)
  })
}
process.on("exit", killAll)

function record(name, expected, actual, pass, info = false) {
  rows.push({ name, expected, actual, pass, info })
}

/** A line that never fails the probe. */
function info(name, text) {
  rows.push({ name, expected: "", actual: text, pass: true, info: true })
}

function check(name, expected, actual, pass = expected === actual) {
  record(name, String(expected), String(actual), pass)
}

function findNextBin() {
  const candidates = [
    resolve(clientDir, "node_modules/.bin/next"),
    resolve(repoRoot, "node_modules/.bin/next"),
  ]
  const bin = candidates.find((candidate) => existsSync(candidate))
  if (!bin) throw new Error("next binary not found in node_modules/.bin")
  return bin
}

/** Run a command to completion, capturing its combined output. */
function run(command, args, env, timeoutMs) {
  return new Promise((done) => {
    const child = spawn(command, args, {
      cwd: clientDir,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    children.push(child)
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL")
      } catch {
        // already gone
      }
    }, timeoutMs)
    child.on("close", (code) => {
      clearTimeout(timer)
      done({ code, output })
    })
  })
}

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: clientDir,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  children.push(child)
  child.output = ""
  child.stdout.on("data", (chunk) => (child.output += chunk))
  child.stderr.on("data", (chunk) => (child.output += chunk))
  return child
}

async function waitUntil(label, probe, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await probe()) return true
    await sleep(500)
  }
  throw new Error(`timed out waiting for ${label}`)
}

/**
 * GET against the app, following redirects by hand: the app builds absolute
 * `https://` Location headers from `x-forwarded-proto`, which this plain-http
 * probe cannot follow, so every hop is re-pointed at the local server.
 */
async function get(path) {
  let target = `${APP_URL}${path}`
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(40_000),
      // The app redirects plain http to https (proxy.ts) unless the TLS
      // terminator in front of it says the client already spoke https.
      headers: { "x-forwarded-proto": "https" },
    })
    const location = response.headers.get("location")
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, target)
      target = `${APP_URL}${next.pathname}${next.search}`
      continue
    }
    return { status: response.status, text: await response.text() }
  }
  throw new Error(`too many redirects for ${path}`)
}

const NOINDEX = /<meta name="robots" content="noindex/

/**
 * What the streamed HTML says about the page state. The not-found / error
 * screens are client-rendered inside the site-wide Suspense boundary, so the
 * server stream carries a marker, not the final markup: Next flags a
 * not-found with `NEXT_HTTP_ERROR_FALLBACK;404` and an error by telling the
 * client to render the boundary (`$RX(`). A real 404 / 500 status (Phase 5)
 * counts too.
 */
function streamState({ status, text }) {
  const notFound =
    text.includes("NEXT_HTTP_ERROR_FALLBACK;404") || status === 404
  const error = (text.includes("$RX(") && !notFound) || status === 500
  return { noindex: NOINDEX.test(text), notFound, error }
}

function expectState(name, res, kind) {
  const state = streamState(res)
  const pass =
    state.noindex &&
    (kind === "not-found"
      ? state.notFound && !state.error
      : state.error && !state.notFound)
  const found = [
    state.noindex ? "noindex" : "no noindex",
    state.notFound ? "not-found" : null,
    state.error ? "error" : null,
  ]
    .filter(Boolean)
    .join(" + ")
  record(`${name}: ${kind} state, noindex`, `${kind} + noindex`, found, pass)
  info(
    `${name}: HTTP status`,
    `status ${res.status}, expected 200 until Phase 5 (D-22)`
  )
}

function findChrome() {
  return CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
}

/**
 * Chrome cannot send `x-forwarded-proto: https`, which the app needs to skip
 * its http-to-https redirect, so it goes through this forwarder.
 */
function startForwarder() {
  const server = createServer((req, res) => {
    const upstream = httpRequest(
      {
        host: "localhost",
        port: APP_PORT,
        method: req.method,
        path: req.url,
        headers: {
          ...req.headers,
          host: `localhost:${APP_PORT}`,
          "x-forwarded-proto": "https",
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
        upstreamRes.pipe(res)
      }
    )
    upstream.on("error", () => {
      res.writeHead(502)
      res.end()
    })
    req.pipe(upstream)
  })
  return new Promise((done) =>
    server.listen(PROXY_PORT, "127.0.0.1", () => done(server))
  )
}

const messages = Object.fromEntries(
  ["fr", "ar", "en"].map((locale) => [
    locale,
    JSON.parse(
      readFileSync(resolve(clientDir, `locales/${locale}.json`), "utf8")
    ),
  ])
)

/**
 * The hydrated DOM of a shorts URL, read with headless Chrome, asserted against
 * the shorts boundaries Plan 06 added (`shorts/error.tsx`, `shorts/not-found.tsx`):
 *
 * - not-found: the "Court métrage introuvable" headline and body in the PAGE
 *   locale (the unprefixed French path must be French, not the English the
 *   generic `[locale]/not-found.tsx` rendered), no `role="alert"`, and none of
 *   the generic or error copy.
 * - error: `role="alert"`, the detail error headline and the retry label in the
 *   page locale, and neither the not-found copy nor the generic error copy.
 *
 * The raw error message and digest must never appear (T-02-14).
 */
async function expectHydrated(name, locale, slug, kind, chrome) {
  if (!chrome) {
    info(`${name}: hydrated DOM`, "skipped, Chrome not installed")
    return
  }
  const path = locale === "fr" ? `/shorts/${slug}` : `/${locale}/shorts/${slug}`
  const profile = mkdtempSync(resolve(tmpdir(), "shorts-probe-chrome-"))
  const { output } = await run(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      // The unprefixed default-locale path is only French for a visitor whose
      // browser asks for French: next-intl's locale detection answers an
      // English-language browser on `/shorts/...` with a 307 to `/en/shorts/...`.
      // Without this flag headless Chrome (Accept-Language en-US) silently lands
      // on the English page and a French assertion would read English copy.
      `--accept-lang=${locale}`,
      "--virtual-time-budget=20000",
      "--dump-dom",
      `http://127.0.0.1:${PROXY_PORT}${path}`,
    ],
    process.env,
    90_000
  )
  // Markup without the flight payload `<script>`s, which carry every message of
  // the catalog and would make any copy "appear" everywhere.
  const markup = output
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
  const visible = markup.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'")

  const own = messages[locale]
  const hasAlert = /role="alert"/.test(markup)
  const has = (copy) => visible.includes(copy)
  const otherLocales = Object.keys(messages).filter((l) => l !== locale)
  const foreign = (pick) =>
    otherLocales.filter((l) => has(pick(messages[l])) && !has(pick(own)))

  const notFoundHeadline = own.shorts.detail.notFoundTitle
  const errorHeadline = own.shorts.detail.errorTitle
  const genericCopies = [
    own.errors.notFound.title,
    own.errors.global.somethingWentWrong,
  ]

  const found = []
  if (has(notFoundHeadline)) found.push("introuvable block")
  if (has(own.errors.SHORT_FILM_NOT_FOUND)) found.push("introuvable body")
  if (has(errorHeadline)) found.push("error headline")
  if (hasAlert) found.push('role="alert"')
  if (genericCopies.some(has)) found.push("generic boundary copy")
  const wrongLocale = foreign((m) =>
    kind === "not-found"
      ? m.shorts.detail.notFoundTitle
      : m.shorts.detail.errorTitle
  )
  if (wrongLocale.length) found.push(`copy in ${wrongLocale.join("+")}`)

  const pass =
    kind === "not-found"
      ? has(notFoundHeadline) &&
        has(own.errors.SHORT_FILM_NOT_FOUND) &&
        !hasAlert &&
        !has(errorHeadline) &&
        !genericCopies.some(has) &&
        wrongLocale.length === 0
      : has(errorHeadline) &&
        has(own.shorts.directory.retry) &&
        hasAlert &&
        !has(notFoundHeadline) &&
        !genericCopies.some(has) &&
        wrongLocale.length === 0
  record(
    `${name}: hydrated DOM shows the shorts ${kind} block in ${locale}`,
    kind === "not-found"
      ? `introuvable block in ${locale}, no alert`
      : `error headline + role="alert" in ${locale}`,
    found.join(" + ") || "neither block",
    pass
  )
}

async function setMode(mode) {
  await fetch(`${STUB_URL}/__mode`, {
    method: "POST",
    body: JSON.stringify({ mode }),
  })
}

async function stubHits() {
  const response = await fetch(`${STUB_URL}/__hits`)
  return response.json()
}

/* -------------------------------------------------------------------------- */
/* Step 1: build with Strapi unreachable                                      */
/* -------------------------------------------------------------------------- */

async function buildStep() {
  log("[1/4] next build with Strapi unreachable ...")
  const next = findNextBin()
  const { code, output } = await run(
    next,
    ["build"],
    { ...probeEnv, STRAPI_URL: UNREACHABLE_STRAPI },
    BUILD_TIMEOUT_MS
  )

  check("build succeeds with Strapi down", "exit 0", `exit ${code}`)
  if (code !== 0) {
    log(output.split("\n").slice(-60).join("\n"))
    return false
  }

  const lines = output.split("\n")
  const routeLine = lines.find((line) =>
    line.includes("/[locale]/shorts/[slug]")
  )
  check(
    "[slug] route is dynamic (not prerendered)",
    "ƒ /[locale]/shorts/[slug]",
    routeLine?.trim() ?? "route missing from the build table",
    Boolean(routeLine?.includes("ƒ")) && !routeLine?.includes("●")
  )

  const manifestPath = resolve(clientDir, ".next/prerender-manifest.json")
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    const prerendered = [
      ...Object.keys(manifest.routes ?? {}),
      ...Object.keys(manifest.dynamicRoutes ?? {}),
    ].filter((route) => /\/shorts\/(\[slug\]|[^/]+)$/.test(route))
    check(
      "no [slug] page in the prerender manifest",
      "none",
      prerendered.length === 0 ? "none" : prerendered.join(", "),
      prerendered.length === 0
    )
  }
  return true
}

/* -------------------------------------------------------------------------- */
/* Steps 2-4: start, status matrix, load-more route                           */
/* -------------------------------------------------------------------------- */

async function runMatrix() {
  log("[2/4] starting the stub Strapi and next start ...")
  start(process.execPath, [resolve(here, "stub-strapi.mjs")], {
    ...process.env,
    STUB_PORT: String(STUB_PORT),
    STUB_FILMS: "5",
  })
  await waitUntil(
    "stub Strapi",
    async () => {
      try {
        await fetch(`${STUB_URL}/__hits`)
        return true
      } catch {
        return false
      }
    },
    10_000
  )

  // The Data Cache persists in `.next/cache/fetch-cache` across `next start`
  // runs, and a stale entry is served when revalidation fails. Entries left by
  // an earlier probe run would hide an outage behind a stale film, so start
  // from an empty cache.
  rmSync(resolve(clientDir, ".next/cache/fetch-cache"), {
    recursive: true,
    force: true,
  })

  const app = start(
    findNextBin(),
    ["start", "-p", String(APP_PORT), "-H", "localhost"],
    {
      ...probeEnv,
      STRAPI_URL: STUB_URL,
    }
  )
  try {
    await waitUntil(
      "next start",
      async () => {
        if (app.exitCode !== null)
          throw new Error(`next start exited:\n${app.output}`)
        try {
          await fetch(`${APP_URL}/`, {
            redirect: "manual",
            signal: AbortSignal.timeout(5000),
          })
          return true
        } catch {
          return false
        }
      },
      READY_TIMEOUT_MS
    )
  } catch (error) {
    log(app.output.split("\n").slice(-40).join("\n"))
    throw error
  }

  log("[3/4] detail route status matrix ...")

  for (const locale of ["fr", "ar", "en"]) {
    const res = await get(`/${locale}/shorts/probe-film`)
    check(`known slug, ${locale}: 200`, 200, res.status)
    check(
      `known slug, ${locale}: serves that locale's film`,
      `title "Probe Film [${locale}]"`,
      res.text.includes(`Probe Film [${locale}]`)
        ? "title found"
        : "title missing",
      res.text.includes(`Probe Film [${locale}]`)
    )
  }

  const sparse = await get("/ar/shorts/probe-sparse")
  check("sparse film, ar: 200", 200, sparse.status)

  const chrome = findChrome()
  const forwarder = chrome ? await startForwarder() : null
  try {
    for (const locale of ["fr", "ar", "en"]) {
      const name = `unknown slug, ${locale}`
      const res = await get(`/${locale}/shorts/no-such-film`)
      expectState(name, res, "not-found")
      await expectHydrated(name, locale, "no-such-film", "not-found", chrome)
    }

    const bad = await get("/fr/shorts/bad%20slug")
    expectState("pattern-failing slug", bad, "not-found")
    const afterBad = await stubHits()
    const badHits = Object.keys(afterBad.hits).filter((path) =>
      path.includes("bad")
    )
    check(
      "pattern-failing slug: no request reached Strapi",
      "0 requests",
      `${badHits.length} requests`,
      badHits.length === 0
    )
    await expectHydrated(
      "pattern-failing slug",
      "fr",
      "bad%20slug",
      "not-found",
      chrome
    )

    await setMode("down")
    const down = await get("/fr/shorts/probe-film-002")
    expectState("outage on a fresh slug", down, "error")
    await expectHydrated(
      "outage on a fresh slug",
      "ar",
      "probe-film-002",
      "error",
      chrome
    )
    await setMode("ok")
    const recovered = await get("/fr/shorts/probe-film-002")
    check(
      "recovery: the film renders on the very next request (failure not cached)",
      'title "Probe Film 2 [fr]"',
      recovered.text.includes("Probe Film 2 [fr]")
        ? "title found"
        : "title missing",
      recovered.status === 200 && recovered.text.includes("Probe Film 2 [fr]")
    )

    await setMode("limited")
    const limited = await get("/fr/shorts/probe-film-003")
    expectState("429 from the rate limiter", limited, "error")
    await expectHydrated(
      "429 from the rate limiter",
      "en",
      "probe-film-003",
      "error",
      chrome
    )

    await setMode("badjson")
    const badJson = await get("/fr/shorts/probe-film-004")
    expectState("non-JSON 200 body", badJson, "error")
    await expectHydrated(
      "non-JSON 200 body",
      "fr",
      "probe-film-004",
      "error",
      chrome
    )

    await setMode("slow")
    const slow = await get("/fr/shorts/probe-film-005")
    expectState("upstream timeout", slow, "error")
    await expectHydrated(
      "upstream timeout",
      "ar",
      "probe-film-005",
      "error",
      chrome
    )
    await setMode("ok")
  } finally {
    forwarder?.close()
    forwarder?.closeAllConnections()
  }

  log("[4/4] load-more route handler ...")
  const page = await get("/api/shorts?locale=fr&page=1")
  let body = {}
  try {
    body = JSON.parse(page.text)
  } catch {
    // leave empty; the checks below fail with a clear message
  }
  check("GET /api/shorts: 200", 200, page.status)
  check(
    "GET /api/shorts: films returned, hasMore false",
    "7 films, hasMore false",
    `${body.shorts?.length ?? "no"} films, hasMore ${body.hasMore}`,
    body.shorts?.length === 7 && body.hasMore === false
  )
  const strict = await get("/api/shorts?locale=fr&page=1&sort=title:asc")
  check("GET /api/shorts with an unknown key: 400", 400, strict.status)
  await setMode("down")
  const loadMoreDown = await get("/api/shorts?locale=fr&page=2")
  check("GET /api/shorts on an upstream failure: 502", 502, loadMoreDown.status)
  await setMode("ok")

  const finalHits = await stubHits()
  check(
    "Strapi rejected no request (no phantom query keys)",
    "0 rejected",
    `${finalHits.rejected} rejected`,
    finalHits.rejected === 0
  )
}

/* -------------------------------------------------------------------------- */

function printTable() {
  log()
  for (const row of rows) {
    log(
      row.info
        ? `INFO  ${row.name}  (${row.actual})`
        : `${row.pass ? "PASS" : "FAIL"}  ${row.name}  (expected ${row.expected}, got ${row.actual})`
    )
  }
  log()
}

async function main() {
  let failed = 0
  try {
    const skipBuild = process.argv.includes("--skip-build")
    if (skipBuild) {
      log("[1/4] --skip-build: reusing the existing .next (iteration only)")
    }
    if (skipBuild || (await buildStep())) await runMatrix()
  } catch (error) {
    record(
      "probe ran to completion",
      "no error",
      `${error?.message ?? error}${error?.cause ? ` (${error.cause.message ?? error.cause})` : ""}`,
      false
    )
  } finally {
    killAll()
  }
  await sleep(1000)

  printTable()
  const counted = rows.filter((row) => !row.info)
  failed = counted.filter((row) => !row.pass).length
  log(
    failed === 0
      ? `PROBE PASS (${counted.length} checks)`
      : `PROBE FAIL (${failed} of ${counted.length} checks failed)`
  )
  process.exitCode = failed === 0 ? 0 : 1
}

await main()
