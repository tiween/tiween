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
 *   3. Status matrix for the detail route (fr, ar, en): known slug 200 with the
 *      film title, unknown slug 404, a slug failing the API pattern 404 with
 *      no upstream request, an outage 500 (never 404), recovery 200 on the
 *      very next request (failed responses are not cached), 429 and a non-JSON
 *      body and a timeout all 500. The stub answers 400 to any phantom query
 *      key, so zero 400s proves the fetchers send only allowlisted keys.
 *   4. The load-more route handler: 200, strict 400, upstream failure 502.
 *
 * Usage: node apps/client/scripts/shorts-probe/probe.mjs [--detail-only]
 * Ports: 3999 (app), 4010 (stub). Ends with `PROBE PASS` or `PROBE FAIL`.
 */
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(here, "../..")
const repoRoot = resolve(clientDir, "../..")

const APP_PORT = 3999
const STUB_PORT = 4010
// Must be `localhost`, matching `next start -H localhost`: the default-locale
// (`/shorts/...`) pages are an internal rewrite to `/fr/...`, and Next only
// treats that rewrite as same-origin when the host names agree.
const APP_URL = `http://localhost:${APP_PORT}`
const STUB_URL = `http://127.0.0.1:${STUB_PORT}`
const UNREACHABLE_STRAPI = "http://127.0.0.1:1"
const BUILD_TIMEOUT_MS = 15 * 60_000
const READY_TIMEOUT_MS = 90_000

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

function record(name, expected, actual, pass) {
  rows.push({ name, expected, actual, pass })
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

  for (const locale of ["fr", "ar", "en"]) {
    const res = await get(`/${locale}/shorts/no-such-film`)
    check(`unknown slug, ${locale}: 404`, 404, res.status)
  }

  const bad = await get("/fr/shorts/bad%20slug")
  check("pattern-failing slug: 404", 404, bad.status)
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

  await setMode("down")
  const down = await get("/fr/shorts/probe-film-002")
  check("outage on a fresh slug: 500, never 404", 500, down.status)
  await setMode("ok")
  const recovered = await get("/fr/shorts/probe-film-002")
  check(
    "recovery: 200 on the very next request (failure not cached)",
    200,
    recovered.status
  )

  await setMode("limited")
  const limited = await get("/fr/shorts/probe-film-003")
  check("429 from the rate limiter: 500", 500, limited.status)

  await setMode("badjson")
  const badJson = await get("/fr/shorts/probe-film-004")
  check("non-JSON 200 body: 500", 500, badJson.status)

  await setMode("slow")
  const slow = await get("/fr/shorts/probe-film-005")
  check("upstream timeout: 500", 500, slow.status)
  await setMode("ok")

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
      `${row.pass ? "PASS" : "FAIL"}  ${row.name}  (expected ${row.expected}, got ${row.actual})`
    )
  }
  log()
}

async function main() {
  let failed = 0
  try {
    if (await buildStep()) await runMatrix()
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
  failed = rows.filter((row) => !row.pass).length
  log(
    failed === 0
      ? `PROBE PASS (${rows.length} checks)`
      : `PROBE FAIL (${failed} of ${rows.length} checks failed)`
  )
  process.exitCode = failed === 0 ? 0 : 1
}

await main()
