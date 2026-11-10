/**
 * Mock-isolation guard (SPAGE-01, T-02-18): `mock-shorts.ts` and the
 * `features/shorts/data` folder are a fixture only. No production file may
 * import them, or visitors could be shown invented films as the real
 * catalogue.
 *
 * Walks `apps/client/src` and fails for any non-test, non-story .ts/.tsx file
 * outside `src/features/shorts/data` that mentions `mock-shorts` or the
 * `features/shorts/data` module path (alias or relative).
 */
import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { describe, expect, it } from "vitest"

const srcDir = join(process.cwd(), "src")
const dataDir = join("src", "features", "shorts", "data")

const TEST_OR_STORY = /\.(test|spec|stories)\.[cm]?[jt]sx?$/u
const SOURCE = /\.[cm]?tsx?$/u
const MOCK_REFERENCE =
  /mock-shorts|features\/shorts\/data|(?:\.\.?\/)+data(?:\/|["'])/u

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return walk(path)
    return [path]
  })
}

/** Production files that could ship mock data to a visitor. */
function productionFiles(): string[] {
  return walk(srcDir)
    .filter((file) => SOURCE.test(file) && !TEST_OR_STORY.test(file))
    .filter((file) => {
      const fromRoot = relative(process.cwd(), file)
      return !fromRoot.startsWith(dataDir + sep)
    })
}

describe("mock isolation", () => {
  it("scans a meaningful number of production files", () => {
    expect(productionFiles().length).toBeGreaterThan(100)
  })

  it("keeps mock-shorts and the shorts data folder out of production code", () => {
    const offenders = productionFiles()
      .filter((file) => MOCK_REFERENCE.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file))

    expect(offenders).toEqual([])
  })

  it("would catch an import (the pattern matches the shapes used in this repo)", () => {
    for (const line of [
      'import { MOCK_SHORT_FILMS } from "@/features/shorts/data"',
      'import { x } from "./mock-shorts"',
      'import { y } from "../data"',
    ]) {
      expect(MOCK_REFERENCE.test(line), line).toBe(true)
    }
  })
})
