/**
 * Unit tests for the D-20 publish-rule bypass scope (plan 01-06).
 *
 * The scope is process-global (`Symbol.for` on `globalThis`) because the
 * importer (tsx, loading `src/shared` source) and the creative-works plugin
 * (loaded from compiled `dist/`) hold two separate copies of this module; a
 * module-local store would never match between them.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import {
  getShortFilmPublishBypass,
  runWithShortFilmPublishBypass,
} from "../short-film-publish-bypass"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const scope = (reason: string) => ({
  reason,
  skip: ["POSTER_REQUIRED"] as const,
})

describe("short-film publish bypass scope", () => {
  it("is undefined outside a scope", () => {
    expect(getShortFilmPublishBypass()).toBeUndefined()
  })

  it("returns the scope inside it, across awaits, and is gone afterwards", async () => {
    const seen = await runWithShortFilmPublishBypass(
      scope("launch import"),
      async () => {
        await sleep(5)
        await Promise.resolve()
        return getShortFilmPublishBypass()
      }
    )

    expect(seen).toEqual({ reason: "launch import", skip: ["POSTER_REQUIRED"] })
    expect(getShortFilmPublishBypass()).toBeUndefined()
  })

  it("keeps two concurrent scopes apart", async () => {
    const read = (reason: string, delay: number) =>
      runWithShortFilmPublishBypass(scope(reason), async () => {
        await sleep(delay)
        return getShortFilmPublishBypass()?.reason
      })

    const [first, second] = await Promise.all([
      read("first", 20),
      read("second", 1),
    ])

    expect(first).toBe("first")
    expect(second).toBe("second")
  })

  it("is visible to a second copy of the module (process-global store)", async () => {
    let otherCopy: typeof import("../short-film-publish-bypass") | undefined
    jest.isolateModules(() => {
      otherCopy = require("../short-film-publish-bypass")
    })

    expect(otherCopy).toBeDefined()
    expect(otherCopy).not.toBe(
      require("../short-film-publish-bypass") as unknown
    )

    const seen = await runWithShortFilmPublishBypass(
      scope("shared"),
      async () => otherCopy!.getShortFilmPublishBypass()
    )

    expect(seen?.reason).toBe("shared")
  })

  it("rejects an empty or blank reason with INVALID_BYPASS_SCOPE", async () => {
    await expect(
      runWithShortFilmPublishBypass(scope(""), async () => "never")
    ).rejects.toThrow("INVALID_BYPASS_SCOPE")
    await expect(
      runWithShortFilmPublishBypass(scope("   "), async () => "never")
    ).rejects.toThrow("INVALID_BYPASS_SCOPE")
  })

  it.each([
    [["DIRECTOR_REQUIRED"]],
    [["POSTER_REQUIRED", "DIRECTOR_REQUIRED"]],
    [[]],
  ])("rejects skip %j with INVALID_BYPASS_SCOPE", async (skip) => {
    await expect(
      runWithShortFilmPublishBypass(
        { reason: "launch import", skip } as never,
        async () => "never"
      )
    ).rejects.toThrow("INVALID_BYPASS_SCOPE")
  })

  it("never runs the callback for an invalid scope", async () => {
    const fn = jest.fn(async () => "ran")

    await expect(
      runWithShortFilmPublishBypass(
        { reason: "", skip: ["POSTER_REQUIRED"] } as never,
        fn
      )
    ).rejects.toThrow("INVALID_BYPASS_SCOPE")
    expect(fn).not.toHaveBeenCalled()
  })

  it("propagates the callback's own error and clears the scope", async () => {
    await expect(
      runWithShortFilmPublishBypass(scope("boom"), async () => {
        throw new Error("inner failure")
      })
    ).rejects.toThrow("inner failure")

    expect(getShortFilmPublishBypass()).toBeUndefined()
  })
})

describe("the bypass stays out of reach of HTTP-facing code (T-01-17)", () => {
  const SRC_ROOT = join(__dirname, "..", "..")
  const SHARED_ROOT = join(SRC_ROOT, "shared")

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry)
      if (full === SHARED_ROOT) return []
      if (statSync(full).isDirectory()) return sourceFiles(full)
      return /\.(ts|tsx|js|cjs|mjs)$/.test(entry) ? [full] : []
    })
  }

  it("is never referenced from src outside src/shared (controllers, routes, policies, admin)", () => {
    const files = sourceFiles(SRC_ROOT)
    // Guard against a vacuous pass if the walk ever stops finding files.
    expect(files.length).toBeGreaterThan(50)
    const callers = files.filter((file) =>
      readFileSync(file, "utf8").includes("runWithShortFilmPublishBypass")
    )

    expect(callers).toEqual([])
  })
})
