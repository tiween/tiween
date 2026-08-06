/**
 * Unit coverage for the boot harness itself (Story 4.7, Task 4.2 + the dist
 * freshness guard). The teardown-on-failure path only executes when boot
 * FAILS, so no integration suite ever exercises it — it already regressed
 * once (a `load()` rejection left nothing to destroy) with every suite green.
 * Pin it here, in the default unit gate, with `@strapi/strapi` mocked.
 */
import fs from "fs"
import os from "os"
import path from "path"

import { assertTestDistFresh as mockedAssertTestDistFresh } from "./test-dist"

const mockCreateStrapi = jest.fn()

// jest hoists these above the imports, so the binding above is the mock.
jest.mock("@strapi/strapi", () => ({ createStrapi: mockCreateStrapi }))
jest.mock("./test-dist", () => ({ assertTestDistFresh: jest.fn() }))

const assertTestDistFresh = mockedAssertTestDistFresh as jest.Mock

type Harness = typeof import("./strapi")

/** Fresh copy of the helper module (its `instance` cache is module state). */
function loadHarness(): Harness {
  let harness: Harness
  jest.isolateModules(() => {
    harness = require("./strapi")
  })
  return harness!
}

function makeApp({
  loadError,
  mountError,
}: { loadError?: Error; mountError?: Error } = {}) {
  const app: Record<string, unknown> = {
    destroy: jest.fn(async () => undefined),
  }
  const booted = {
    server: {
      mount: jest.fn(async () => {
        if (mountError) throw mountError
      }),
    },
  }
  app.load = jest.fn(async () => {
    if (loadError) throw loadError
    return booted
  })
  return { app, booted }
}

describe("setupStrapi boot-failure teardown (Task 4.2)", () => {
  beforeEach(() => {
    mockCreateStrapi.mockReset()
    assertTestDistFresh.mockReset()
  })

  it("destroys the partially-booted app and re-throws when load() rejects", async () => {
    const bootError = new Error("bad dist/")
    const { app } = makeApp({ loadError: bootError })
    mockCreateStrapi.mockReturnValue(app)
    const harness = loadHarness()

    await expect(harness.setupStrapi()).rejects.toBe(bootError)
    expect(app.destroy).toHaveBeenCalledTimes(1)
    // The instance cache must be cleared — no half-booted app is handed out.
    expect(() => harness.getStrapi()).toThrow(/not booted/i)
  })

  it("destroys the app and re-throws when mount() rejects after load()", async () => {
    const mountError = new Error("mount failed")
    const { app } = makeApp({ mountError })
    mockCreateStrapi.mockReturnValue(app)
    const harness = loadHarness()

    await expect(harness.setupStrapi()).rejects.toBe(mountError)
    expect(app.destroy).toHaveBeenCalledTimes(1)
  })

  it("surfaces the ORIGINAL boot error even when destroy() itself fails", async () => {
    const bootError = new Error("schema error")
    const { app } = makeApp({ loadError: bootError })
    ;(app.destroy as jest.Mock).mockRejectedValue(new Error("destroy failed"))
    mockCreateStrapi.mockReturnValue(app)
    const harness = loadHarness()

    await expect(harness.setupStrapi()).rejects.toBe(bootError)
  })

  it("returns and caches the booted instance on success", async () => {
    const { app, booted } = makeApp()
    mockCreateStrapi.mockReturnValue(app)
    const harness = loadHarness()

    await expect(harness.setupStrapi()).resolves.toBe(booted)
    await expect(harness.setupStrapi()).resolves.toBe(booted)
    expect(mockCreateStrapi).toHaveBeenCalledTimes(1)
    expect(app.destroy).not.toHaveBeenCalled()
  })

  it("refuses to boot (before creating an app) when dist/ is stale", async () => {
    const staleError = new Error("dist/ is STALE")
    assertTestDistFresh.mockImplementation(() => {
      throw staleError
    })
    const harness = loadHarness()

    await expect(harness.setupStrapi()).rejects.toBe(staleError)
    expect(mockCreateStrapi).not.toHaveBeenCalled()
  })
})

describe("assertTestDistFresh (real implementation)", () => {
  const realTestDist = jest.requireActual("./test-dist") as {
    assertTestDistFresh: (appDir: string, distDir: string) => void
  }

  let tmpRoot: string

  const write = (rel: string, mtimeMs: number) => {
    const full = path.join(tmpRoot, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, "x")
    fs.utimesSync(full, mtimeMs / 1000, mtimeMs / 1000)
  }

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "test-dist-"))
  })
  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  it("throws when dist/ has no compiled output at all", () => {
    write("app/src/a.ts", 2_000)
    expect(() =>
      realTestDist.assertTestDistFresh(
        path.join(tmpRoot, "app"),
        path.join(tmpRoot, "app", "dist")
      )
    ).toThrow(/no compiled src/)
  })

  it("throws when any source file is newer than every compiled file", () => {
    write("app/src/a.ts", 3_000)
    write("app/dist/src/a.js", 2_000)
    expect(() =>
      realTestDist.assertTestDistFresh(
        path.join(tmpRoot, "app"),
        path.join(tmpRoot, "app", "dist")
      )
    ).toThrow(/STALE/)
  })

  it("ignores generated non-code files under src/ (e.g. the documentation plugin's JSON, rewritten at boot)", () => {
    write("app/src/a.ts", 2_000)
    write("app/dist/src/a.js", 2_500)
    // Strapi regenerates this at every boot — newer than dist/, but not code.
    write(
      "app/src/extensions/documentation/documentation/1.0.0/full_documentation.json",
      9_000
    )
    expect(() =>
      realTestDist.assertTestDistFresh(
        path.join(tmpRoot, "app"),
        path.join(tmpRoot, "app", "dist")
      )
    ).not.toThrow()
  })

  it("passes when the compiled output is at least as new as the sources", () => {
    write("app/src/a.ts", 2_000)
    write("app/config/database.ts", 1_500)
    write("app/dist/src/a.js", 2_500)
    expect(() =>
      realTestDist.assertTestDistFresh(
        path.join(tmpRoot, "app"),
        path.join(tmpRoot, "app", "dist")
      )
    ).not.toThrow()
  })
})
