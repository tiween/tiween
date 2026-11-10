/**
 * Source-level guard for the shorts routes' rendering rules (RESEARCH E1-E8,
 * D-06): these are properties of the files, not of one rendered output, and a
 * regression is invisible to the behavioural suites.
 *
 * - no static-params export: `generateStaticParams` (even `[]`) turns a cold
 *   outage into a bare-text 500 and caches a soft 404;
 * - no mock data: `mock-shorts.ts` is a fixture, never a production source;
 * - the `[slug]` layout opts into request-time rendering with `connection()`.
 *
 * The directory page (Plan 08) follows the same rules and, because the old
 * mock-backed Showcase and Hero are retired (D-02), their files must stay gone.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const shortsDir = join(process.cwd(), "src/app/[locale]/shorts")

function source(relative: string): string {
  return readFileSync(join(shortsDir, relative), "utf8")
}

describe.each(["page.tsx", "[slug]/layout.tsx", "[slug]/page.tsx"])(
  "%s",
  (file) => {
    const code = source(file)

    it("exports no static params", () => {
      expect(code).not.toMatch(/generateStaticParams/)
    })

    it("imports no mock data", () => {
      expect(code).not.toMatch(/mock-shorts/)
      expect(code).not.toMatch(/features\/shorts\/data/)
    })

    it("does not force dynamic rendering (it would disable the 60 s Data Cache)", () => {
      expect(code).not.toMatch(/force-dynamic/)
      expect(code).not.toMatch(/export const dynamic\b/)
    })
  }
)

describe.each(["page.tsx", "[slug]/layout.tsx"])("%s", (file) => {
  it("renders at request time via connection()", () => {
    const code = source(file)

    expect(code).toMatch(/from "next\/server"/)
    expect(code).toMatch(/await connection\(\)/)
  })
})

describe("page.tsx (directory)", () => {
  it("awaits connection() before it reads anything else", () => {
    const code = source("page.tsx")
    const body = code.slice(code.indexOf("export default async function"))

    expect(body.indexOf("await connection()")).toBeGreaterThan(-1)
    expect(body.indexOf("await connection()")).toBeLessThan(
      body.indexOf("await params")
    )
    expect(body.indexOf("await connection()")).toBeLessThan(
      body.indexOf("getShortFilmsPage")
    )
  })

  it("does not catch the fetch failure (error.tsx must render, D-07)", () => {
    const code = source("page.tsx")

    expect(code).not.toMatch(/\btry\b|\.catch\(/)
  })
})

describe("retired components (D-02)", () => {
  it("has deleted ShortsShowcase", () => {
    expect(existsSync(join(shortsDir, "_components/ShortsShowcase.tsx"))).toBe(
      false
    )
  })

  it("has deleted the ShortsHero folder", () => {
    expect(
      existsSync(
        join(process.cwd(), "src/features/shorts/components/ShortsHero")
      )
    ).toBe(false)
  })
})
