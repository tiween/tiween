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
 * Plan 08 extends this to the directory page.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const shortsDir = join(process.cwd(), "src/app/[locale]/shorts")

function source(relative: string): string {
  return readFileSync(join(shortsDir, relative), "utf8")
}

describe.each(["[slug]/layout.tsx", "[slug]/page.tsx"])("%s", (file) => {
  const code = source(file)

  it("exports no static params", () => {
    expect(code).not.toMatch(/generateStaticParams/)
  })

  it("imports no mock data", () => {
    expect(code).not.toMatch(/mock-shorts/)
    expect(code).not.toMatch(/features\/shorts\/data/)
  })
})

describe("[slug]/layout.tsx", () => {
  it("renders at request time via connection()", () => {
    const code = source("[slug]/layout.tsx")

    expect(code).toMatch(/from "next\/server"/)
    expect(code).toMatch(/await connection\(\)/)
  })
})
