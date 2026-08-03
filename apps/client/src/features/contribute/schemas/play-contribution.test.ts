/**
 * @vitest-environment node
 *
 * Pins the contribute wizard's video vocabulary and the legacy-draft migration
 * (DW-10). `migrateDraftVideoType` is the only thing standing between a draft
 * autosaved before the vocabulary switch and an unsubmittable media step, and
 * it had no coverage — `src/features/contribute/**` was not in vitest's
 * include list, so a test placed here would not even have been collected.
 */

import { describe, expect, it } from "vitest"

import {
  VIDEO_TYPES,
  migrateDraftVideoType,
  videoSchema,
} from "./play-contribution"

describe("VIDEO_TYPES", () => {
  it("is the videoType vocabulary, not the legacy common.video.type enum", () => {
    expect(VIDEO_TYPES).toEqual([
      "trailer",
      "teaser",
      "clip",
      "featurette",
      "interview",
      "behind-the-scenes",
      "full-length",
    ])
  })

  it("excludes every legacy value", () => {
    for (const legacy of ["FULL_LENGTH", "TEASER", "CLIP"]) {
      expect(VIDEO_TYPES as readonly string[]).not.toContain(legacy)
    }
  })
})

describe("migrateDraftVideoType", () => {
  it.each([
    ["FULL_LENGTH", "full-length"],
    ["TEASER", "teaser"],
    ["CLIP", "clip"],
  ])("maps the legacy %s to %s", (legacy, expected) => {
    expect(migrateDraftVideoType(legacy)).toBe(expected)
  })

  it("passes current vocabulary values through untouched", () => {
    for (const type of VIDEO_TYPES) {
      expect(migrateDraftVideoType(type)).toBe(type)
    }
  })

  it.each([undefined, "", "nonsense", "Trailer"])(
    "drops the unrecognized value %p to undefined",
    (input) => {
      expect(migrateDraftVideoType(input)).toBeUndefined()
    }
  )

  it("produces a value videoSchema accepts, for every legacy input", () => {
    for (const legacy of ["FULL_LENGTH", "TEASER", "CLIP"]) {
      const migrated = migrateDraftVideoType(legacy)
      const parsed = videoSchema.safeParse({
        url: "https://youtube.com/watch?v=abc",
        type: migrated,
      })
      expect(parsed.success).toBe(true)
    }
  })

  it("demonstrates why the migration exists: raw legacy values fail videoSchema", () => {
    const parsed = videoSchema.safeParse({
      url: "https://youtube.com/watch?v=abc",
      type: "TEASER",
    })
    expect(parsed.success).toBe(false)
  })
})
