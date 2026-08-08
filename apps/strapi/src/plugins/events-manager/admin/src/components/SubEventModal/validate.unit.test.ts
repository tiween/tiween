/**
 * Unit tests for the sub-event form rules.
 *
 * The kind ↔ work-type rule is the one that matters most: it is the client-side
 * half of `assertSubEventWorkKind` (wired in `server/src/bootstrap.ts`), and if
 * it regresses the editor gets an opaque 400 from the lifecycle guard instead
 * of an inline field error.
 */
import type { SubEventFormValues } from "./validate"

import {
  allowedWorkTypes,
  buildEventRequest,
  buildSubEventRequest,
  publishUrl,
  toStartDateTimeIso,
  toTimeInput,
  validateSubEventForm,
} from "./validate"

/** Fixed reference instant, so the past-date rule cannot rot with the clock. */
const NOW = new Date(2026, 7, 8, 12, 0)

const base: SubEventFormValues = {
  mode: "create",
  kind: "screening",
  title: "Projection du soir",
  workDocumentId: "work-1",
  workType: "film",
  date: new Date(2026, 7, 10),
  time: "20:00",
  price: "",
}

describe("validateSubEventForm (unit)", () => {
  it("accepts a minimal valid screening", () => {
    expect(validateSubEventForm(base, NOW)).toEqual({})
  })

  it("accepts a minimal valid performance", () => {
    expect(
      validateSubEventForm(
        { ...base, kind: "performance", workType: "play" },
        NOW
      )
    ).toEqual({})
  })

  it("requires a work", () => {
    // A CODE, not a sentence: this module is pure and cannot translate, so a
    // literal here would reach a non-French admin untranslated.
    expect(
      validateSubEventForm({ ...base, workDocumentId: "", workType: "" }, NOW)
        .work
    ).toBe("work.required")
    expect(
      validateSubEventForm(
        {
          ...base,
          kind: "performance",
          workDocumentId: "",
          workType: "",
        },
        NOW
      ).work
    ).toBe("work.required")
  })

  it("rejects a play attached to a screening before any request is sent", () => {
    expect(validateSubEventForm({ ...base, workType: "play" }, NOW).work).toBe(
      "work.kindMismatch"
    )
  })

  it("rejects a film attached to a performance", () => {
    expect(
      validateSubEventForm(
        { ...base, kind: "performance", workType: "film" },
        NOW
      ).work
    ).toBe("work.kindMismatch")
  })

  it("accepts a short film on a screening", () => {
    expect(
      validateSubEventForm({ ...base, workType: "short-film" }, NOW).work
    ).toBeUndefined()
  })

  it("does not second-guess a work whose type is unknown", () => {
    // The picker always carries a type; a row loaded for edit may not. An
    // unknown type is not evidence of a mistake — same fail-open stance as the
    // server guard.
    expect(
      validateSubEventForm({ ...base, workType: "" }, NOW).work
    ).toBeUndefined()
  })

  it("requires a title only when creating", () => {
    expect(validateSubEventForm({ ...base, title: "  " }, NOW).title).toBe(
      "title.required"
    )
    expect(
      validateSubEventForm({ ...base, mode: "edit", title: "" }, NOW).title
    ).toBeUndefined()
  })

  it("requires a date and a well-formed time", () => {
    expect(validateSubEventForm({ ...base, date: null }, NOW).date).toBe(
      "date.required"
    )
    expect(validateSubEventForm({ ...base, time: "25:00" }, NOW).time).toBe(
      "time.invalid"
    )
    expect(validateSubEventForm({ ...base, time: "" }, NOW).time).toBe(
      "time.invalid"
    )
  })

  it("refuses to schedule a new showing in the past", () => {
    // Same rule the calendar's slot click used to enforce silently and alone —
    // it now lives here only, so picking yesterday in the DatePicker is caught
    // too, with a visible field error instead of an ignored click.
    const yesterday = new Date(2026, 7, 7)

    expect(validateSubEventForm({ ...base, date: yesterday }, NOW).date).toBe(
      "date.past"
    )
    // Earlier the same day counts as past; later the same day does not.
    expect(
      validateSubEventForm(
        { ...base, date: new Date(2026, 7, 8), time: "09:00" },
        NOW
      ).date
    ).toBe("date.past")
    expect(
      validateSubEventForm(
        { ...base, date: new Date(2026, 7, 8), time: "18:00" },
        NOW
      ).date
    ).toBeUndefined()
  })

  it("still allows editing a showing that has already happened", () => {
    // Fixing the price of last week's screening must stay possible — the rule
    // is about scheduling mistakes, not about freezing history.
    expect(
      validateSubEventForm(
        { ...base, mode: "edit", date: new Date(2026, 7, 1) },
        NOW
      ).date
    ).toBeUndefined()
  })

  it("checks the price only when one was typed", () => {
    expect(
      validateSubEventForm({ ...base, price: "" }, NOW).price
    ).toBeUndefined()
    expect(
      validateSubEventForm({ ...base, price: "35.5" }, NOW).price
    ).toBeUndefined()
    expect(validateSubEventForm({ ...base, price: "-1" }, NOW).price).toBe(
      "price.invalid"
    )
    expect(validateSubEventForm({ ...base, price: "gratuit" }, NOW).price).toBe(
      "price.invalid"
    )
  })
})

describe("allowedWorkTypes (unit)", () => {
  it("constrains the picker per kind", () => {
    expect(allowedWorkTypes("screening")).toEqual(["film", "short-film"])
    expect(allowedWorkTypes("performance")).toEqual(["play"])
  })
})

describe("buildSubEventRequest (unit)", () => {
  const payload = {
    kind: "screening" as const,
    startDateTime: "2026-08-10T19:00:00.000Z",
    workDocumentId: "work-film",
    price: "35.5",
    audioLanguage: "fr",
    subtitleLanguage: "ar",
    videoFormat: "imax",
    surtitleLanguage: "",
  }

  it("posts a screening to the screening collection with `movie` set", () => {
    const { url, data } = buildSubEventRequest(payload)

    expect(url).toBe(
      "/content-manager/collection-types/plugin::events-manager.screening"
    )
    expect(url).not.toContain("performance")
    expect(data.movie).toBe("work-film")
    expect(data.play).toBeUndefined()
    expect(data.videoFormat).toBe("imax")
    expect(data.subtitleLanguage).toBe("ar")
    expect(data.surtitleLanguage).toBeUndefined()
    expect(data.startDateTime).toBe("2026-08-10T19:00:00.000Z")
    expect(data.price).toBe(35.5)
  })

  it("posts a performance to the performance collection with `play` set", () => {
    const { url, data } = buildSubEventRequest({
      ...payload,
      kind: "performance",
      workDocumentId: "work-play",
      subtitleLanguage: "",
      surtitleLanguage: "fr",
    })

    expect(url).toBe(
      "/content-manager/collection-types/plugin::events-manager.performance"
    )
    expect(url).not.toContain("screening")
    expect(data.play).toBe("work-play")
    expect(data.movie).toBeUndefined()
    expect(data.surtitleLanguage).toBe("fr")
    // Film-only fields must not leak onto the theatre collection.
    expect(data.videoFormat).toBeUndefined()
    expect(data.subtitleLanguage).toBeUndefined()
  })

  it("never targets the dead pre-2C.3 collection", () => {
    expect(buildSubEventRequest(payload).url).not.toContain("showtime")
    expect(
      buildSubEventRequest({ ...payload, kind: "performance" }).url
    ).not.toContain("showtime")
  })

  it("carries the container event and its order inside the builder", () => {
    // `event` and `order` must NOT be spliced on at the call site: a field
    // added outside this function is a field no test covers.
    const { data } = buildSubEventRequest({ ...payload, eventRef: "evt-1" })

    expect(data.event).toBe("evt-1")
    // The create path always mints a fresh event holding exactly this row, so
    // it is the first and only sibling.
    expect(data.order).toBe(1)
  })

  it("omits event/order on an update — an edit never re-parents a row", () => {
    const { data } = buildSubEventRequest(payload, "scr-1")

    expect(data.event).toBeUndefined()
    expect(data.order).toBeUndefined()
  })

  it("addresses one row by documentId when updating", () => {
    expect(buildSubEventRequest(payload, "scr-1").url).toBe(
      "/content-manager/collection-types/plugin::events-manager.screening/scr-1"
    )
  })

  it("normalises empty optional fields to null rather than empty strings", () => {
    const { data } = buildSubEventRequest({
      ...payload,
      price: "  ",
      audioLanguage: " ",
      subtitleLanguage: "",
      videoFormat: "",
    })

    expect(data.price).toBeNull()
    expect(data.audioLanguage).toBeNull()
    expect(data.subtitleLanguage).toBeNull()
    // The schema default, not an empty enum value the server would reject.
    expect(data.videoFormat).toBe("standard")
  })
})

describe("buildEventRequest (unit)", () => {
  it("stamps the category matching the kind on the container event", () => {
    const screening = buildEventRequest({
      kind: "screening",
      title: "  Projection du soir  ",
      startDateTime: "2026-08-10T19:00:00.000Z",
      venueRef: "venue-1",
    })

    expect(screening.url).toBe(
      "/content-manager/collection-types/plugin::events-manager.event"
    )
    expect(screening.data.category).toBe("movie_screening")
    expect(screening.data.title).toBe("Projection du soir")
    // `event.category`, `startDateTime` and `title` are required by the schema;
    // `eventStatus` is the current field name (the pre-2C.3 payload sent
    // `status`, which the event type does not declare).
    expect(screening.data.eventStatus).toBe("scheduled")
    expect(screening.data.status).toBeUndefined()
    expect(screening.data.venue).toBe("venue-1")

    expect(
      buildEventRequest({
        kind: "performance",
        title: "Hamlet",
        startDateTime: "2026-08-10T19:00:00.000Z",
        venueRef: 7,
      }).data.category
    ).toBe("theater_performance")
  })
})

describe("publishUrl (unit)", () => {
  it("targets the content-manager publish action for a row", () => {
    // All three types are draftAndPublish: without this call the row stays a
    // draft — visible on the admin calendar, absent from the public API.
    expect(publishUrl("plugin::events-manager.screening", "scr-1")).toBe(
      "/content-manager/collection-types/plugin::events-manager.screening/scr-1/actions/publish"
    )
    expect(publishUrl("plugin::events-manager.event", "evt-1")).toBe(
      "/content-manager/collection-types/plugin::events-manager.event/evt-1/actions/publish"
    )
  })
})

describe("toStartDateTimeIso / toTimeInput (unit)", () => {
  it("combines the local day and wall-clock time into a UTC instant", () => {
    const iso = toStartDateTimeIso(new Date(2026, 7, 10), "20:30")!
    const parsed = new Date(iso)

    // Asserted through local getters so the expectation holds in any timezone.
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(10)
    expect(parsed.getHours()).toBe(20)
    expect(parsed.getMinutes()).toBe(30)
    expect(parsed.getSeconds()).toBe(0)
    expect(iso.endsWith("Z")).toBe(true)
  })

  it("refuses to build a payload from a half-filled form", () => {
    expect(toStartDateTimeIso(null, "20:00")).toBeNull()
    expect(toStartDateTimeIso(new Date(2026, 7, 10), "nope")).toBeNull()
  })

  it("round-trips through the time input", () => {
    const date = new Date(2026, 7, 10, 9, 5)
    expect(toTimeInput(date)).toBe("09:05")
    expect(toTimeInput(null)).toBe("20:00")
  })
})
