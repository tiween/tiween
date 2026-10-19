import fs from "fs"
import path from "path"

import { SHORT_FILM_SORTS } from "../../validation/short-films"
import contentApi from "../content-api"

/**
 * Keeps `apps/strapi/docs/short-films-api.md` in step with the code: every
 * short-films route (with its real `/api/creative-works` prefix), every error
 * code and every allowlisted sort must appear in the published contract.
 */

const DOC_PATH = path.resolve(
  __dirname,
  "../../../../../../../docs/short-films-api.md"
)

const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNSUPPORTED_LOCALE",
  "SHORT_FILM_NOT_FOUND",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]

const doc = fs.readFileSync(DOC_PATH, "utf8")

const shortFilmRoutes = (contentApi.routes as any[]).filter((r) =>
  r.path.startsWith("/creative-works/short-films")
)

describe("short-films-api.md stays in step with the code", () => {
  it("finds the four short-films routes to document", () => {
    expect(shortFilmRoutes).toHaveLength(4)
  })

  it.each(shortFilmRoutes.map((r) => r.path))(
    "documents the route %s",
    (routePath) => {
      expect(doc).toContain(`/api/creative-works${routePath}`)
    }
  )

  it.each(ERROR_CODES)("documents the error code %s", (code) => {
    expect(doc).toContain(code)
  })

  it.each([...SHORT_FILM_SORTS])("documents the sort %s", (sort) => {
    expect(doc).toContain(sort)
  })
})
