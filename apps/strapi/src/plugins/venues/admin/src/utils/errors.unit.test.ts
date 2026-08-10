/**
 * Error-code plumbing (Story 2D.2).
 *
 * Two things are pinned here, and the second is the one that keeps drifting:
 *
 * 1. `parseApiError` — envelope parsing, per-field issues, and the STATUS
 *    fallbacks for failures that carry no envelope of ours (an
 *    `admin::hasPermissions` denial is a bare 403).
 * 2. TRANSLATION COVERAGE — every code the server can emit has a key in ar, en
 *    AND fr. The code list is DERIVED from the server sources rather than
 *    restated here, so adding a code without translating it fails this test
 *    instead of silently degrading to "An unexpected error occurred." in front
 *    of an editor.
 */
import fs from "fs"
import path from "path"

import ar from "../translations/ar.json"
import en from "../translations/en.json"
import fr from "../translations/fr.json"
import {
  errorTranslationKey,
  parseApiError,
  UNKNOWN_ERROR_CODE,
} from "./errors"

describe("parseApiError (unit)", () => {
  it("reads the code and attaches per-field issues to their root field", () => {
    const parsed = parseApiError({
      response: {
        status: 400,
        data: {
          error: {
            details: {
              code: "VALIDATION_FAILED",
              issues: [
                { path: "name", message: "VENUE_NAME_REQUIRED" },
                // A dotted path lands on the input the form actually renders.
                { path: "geo.latitude", message: "VENUE_GEO_INVALID" },
              ],
            },
          },
        },
      },
    })

    expect(parsed.code).toBe("VALIDATION_FAILED")
    expect(parsed.fieldErrors).toEqual({
      name: "VENUE_NAME_REQUIRED",
      geo: "VENUE_GEO_INVALID",
    })
  })

  it("maps a bare 403 (an RBAC denial) to VENUE_FORBIDDEN", () => {
    // `admin::hasPermissions` answers without `details.code`; without this the
    // editor is told "an unexpected error occurred" for a plain permission gap.
    expect(parseApiError({ response: { status: 403, data: {} } }).code).toBe(
      "VENUE_FORBIDDEN"
    )
  })

  it("maps a bare 401 to NOT_AUTHENTICATED", () => {
    expect(parseApiError({ response: { status: 401 } }).code).toBe(
      "NOT_AUTHENTICATED"
    )
  })

  it("falls back to the generic code for a non-HTTP failure", () => {
    expect(parseApiError(new Error("offline")).code).toBe(UNKNOWN_ERROR_CODE)
    expect(parseApiError(undefined).fieldErrors).toEqual({})
  })

  it("prefers the envelope code over the status fallback", () => {
    expect(
      parseApiError({
        response: {
          status: 403,
          data: { error: { details: { code: "VENUE_HAS_EVENTS" } } },
        },
      }).code
    ).toBe("VENUE_HAS_EVENTS")
  })
})

describe("errorTranslationKey (unit)", () => {
  it("degrades an unknown code to the generic key rather than rendering it raw", () => {
    const messages = { "venues.errors.VENUE_NOT_FOUND": "…" }

    expect(errorTranslationKey("VENUE_NOT_FOUND", messages)).toBe(
      "errors.VENUE_NOT_FOUND"
    )
    expect(errorTranslationKey("BRAND_NEW_CODE", messages)).toBe(
      `errors.${UNKNOWN_ERROR_CODE}`
    )
    expect(errorTranslationKey("VENUE_NOT_FOUND", undefined)).toBe(
      `errors.${UNKNOWN_ERROR_CODE}`
    )
  })
})

/* -------------------------------------------------------------------------- */
/* Translation coverage                                                        */
/* -------------------------------------------------------------------------- */

const SERVER_SRC = path.resolve(__dirname, "../../../server/src")
const CLIENT_SRC = path.resolve(__dirname, "..")

/** Files that emit codes — server envelopes, Zod messages, the geocoder. */
const CODE_SOURCES = [
  path.join(SERVER_SRC, "validation/venue-admin.ts"),
  path.join(SERVER_SRC, "services/venue-admin.ts"),
  path.join(SERVER_SRC, "controllers/venue-admin.ts"),
  path.join(SERVER_SRC, "policies/venues-admin-scope.ts"),
  path.join(CLIENT_SRC, "components/VenueFormModal/validate.ts"),
  path.join(CLIENT_SRC, "components/MapPicker/geocode.ts"),
]

/**
 * Every SCREAMING_SNAKE **string literal** in those files.
 *
 * Scanning the source beats restating a list: a restated list is exactly the
 * kind of copy that goes stale the first time someone adds a code. Identifiers
 * (`VENUE_TYPES`, `VENUE_UID`) are not matched — only quoted literals are — and
 * the prefix filter keeps unrelated constants (`SUB_EVENT_UIDS` members, uid
 * strings) out.
 */
function emittedCodes(): string[] {
  const codes = new Set<string>()
  const literal = /["'`]([A-Z][A-Z0-9_]{3,})["'`]/g

  for (const file of CODE_SOURCES) {
    const source = fs.readFileSync(file, "utf8")
    for (const match of source.matchAll(literal)) {
      const code = match[1]
      if (
        code.startsWith("VENUE_") ||
        code.startsWith("GEOCODE_") ||
        [
          "VALIDATION_FAILED",
          "INVALID_QUERY",
          "NO_FIELDS_TO_UPDATE",
          "INTERNAL_ERROR",
          "NOT_AUTHENTICATED",
        ].includes(code)
      ) {
        codes.add(code)
      }
    }
  }

  return [...codes].sort()
}

describe("error-code translation coverage (unit)", () => {
  const locales: [string, Record<string, string>][] = [
    ["ar", ar as Record<string, string>],
    ["en", en as Record<string, string>],
    ["fr", fr as Record<string, string>],
  ]

  it("finds the codes to check (guards against a broken scan)", () => {
    const codes = emittedCodes()

    // A scan that silently matched nothing would make every assertion below
    // vacuously pass.
    expect(codes.length).toBeGreaterThan(15)
    expect(codes).toContain("VENUE_NAME_REQUIRED")
    expect(codes).toContain("VENUE_HAS_EVENTS")
    expect(codes).toContain("NOT_AUTHENTICATED")
  })

  it.each(locales)(
    "translates every emitted code in %s",
    (_locale, messages) => {
      const missing = emittedCodes().filter(
        (code) => messages[`venues.errors.${code}`] === undefined
      )

      expect(missing).toEqual([])
    }
  )

  it("keeps the three catalogues on the same key set", () => {
    const [, arMessages] = locales[0]
    const keys = (m: Record<string, string>) => Object.keys(m).sort()

    for (const [, messages] of locales.slice(1)) {
      expect(keys(messages)).toEqual(keys(arMessages))
    }
  })
})
