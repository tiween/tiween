/**
 * SubEventModal component tests.
 *
 * Replaces `EventCreationModal.test.tsx`. The assertion that mattered there —
 * "Search and select a movie to configure the showtime" — described a surface
 * built on the `showtime` collection, which story 2C.3 deleted.
 *
 * What is pinned here instead is the property that surface got wrong: every
 * write — create, update and delete — must target the collection matching the
 * block's `kind`, never the other one and never the dead `showtime` UID.
 *
 * Coverage split, deliberate: the screening create runs end to end here, and
 * the performance side is exercised through edit and delete. The one path this
 * file cannot drive is switching the kind SELECT before creating — the Strapi
 * DS select is Radix-based and its ref handling loops under the React 19 pin
 * (the same pre-existing mismatch the deleted EventCreationModal test worked
 * around by stubbing a child). The performance create is therefore pinned one
 * level down, on the pure builders the submit path calls:
 * `SubEventModal/validate.unit.test.ts` asserts both the target UID and the
 * work field for both kinds.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "react-intl"

import type { SubEvent } from "../../hooks/subEventTransform"

import { SubEventModal } from "../SubEventModal"

/** Catalogue results the work picker will offer; per-test overridable. */
let catalogue: unknown[] = []

// URL-aware: the modal reads the catalogue for the work picker and the venue
// collection to resolve the numeric venue id into the documentId relations are
// written by.
const defaultGet = async (url: string) =>
  url.includes("venues.venue")
    ? { data: { results: [{ documentId: "venue-1" }] } }
    : { data: { results: catalogue } }

const get = jest.fn(defaultGet)
/**
 * URL-aware too: the create path writes the container event, then the
 * sub-event, then publishes both — so each POST must answer with the
 * documentId its caller will use next.
 */
const defaultPost = async (url: string) => {
  if (url.includes("/actions/publish")) return { data: { data: {} } }
  if (url.includes("events-manager.event"))
    return { data: { data: { documentId: "evt-1" } } }
  if (url.includes("events-manager.screening"))
    return { data: { data: { documentId: "scr-1" } } }
  if (url.includes("events-manager.performance"))
    return { data: { data: { documentId: "perf-1" } } }
  return { data: { data: {} } }
}

const post = jest.fn(defaultPost)

/**
 * Jest's `clearMocks` clears CALLS but keeps implementations, so a test that
 * installs a failing `get`/`post` would silently poison every test after it.
 */
function resetFetchMocks() {
  catalogue = []
  get.mockImplementation(defaultGet)
  post.mockImplementation(defaultPost)
  put.mockImplementation(async () => ({ data: { data: {} } }))
  del.mockImplementation(async () => ({ data: { data: {} } }))
}
const put = jest.fn(async () => ({ data: { data: {} } }))
const del = jest.fn(async () => ({ data: { data: {} } }))

// `@strapi/strapi/admin` is already mapped to `tests/__mocks__/strapi-admin.ts`
// by the jest `admin` project (the real admin bundle cannot be loaded under
// jest), so spread it to keep the other hooks it provides available.
jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get, post, put, del }),
}))

// Run the catalogue search immediately rather than after the debounce.
jest.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}))

// Date/time pickers do not survive jsdom; the values under test are held in
// component state either way.
jest.mock("@strapi/design-system", () => ({
  ...jest.requireActual("@strapi/design-system"),
  DatePicker: () => <div data-testid="date-picker" />,
  TimePicker: () => <div data-testid="time-picker" />,
}))

const performance: SubEvent = {
  kind: "performance",
  id: 2,
  documentId: "perf-1",
  startDateTime: "2026-08-10T20:30:00.000Z",
  start: new Date(2026, 7, 10, 20, 30),
  order: 1,
  price: 25,
  audioLanguage: "ar",
  subtitleLanguage: null,
  surtitleLanguage: "fr",
  videoFormat: null,
  work: {
    documentId: "work-play",
    title: "Hamlet",
    type: "play",
    duration: 110,
  },
  event: {
    documentId: "evt-2",
    title: "Représentation",
    venue: { id: 7, documentId: "venue-1" },
  },
}

/**
 * The catalogue search fires on mount, so the render is awaited inside `act`:
 * without it the search's state update lands after the test's act scope and
 * React (correctly) warns about an update outside `act`.
 */
async function renderModal(ui: React.ReactElement) {
  await act(async () => {
    render(
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider theme={lightTheme}>{ui}</DesignSystemProvider>
      </IntlProvider>
    )
  })
}

const noop = () => {}

/** Far enough ahead that the past-date rule can never rot this suite. */
const FUTURE_SLOT = new Date(2099, 0, 1, 20, 0)

describe("SubEventModal", () => {
  beforeEach(resetFetchMocks)

  it("renders the create form when no sub-event is passed", async () => {
    await renderModal(
      <SubEventModal
        isOpen
        onClose={noop}
        onSuccess={noop}
        venueId="7"
        prefilledDate={FUTURE_SLOT}
      />
    )

    expect(
      screen.getByRole("heading", { name: "New showing" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
    // Nothing selected yet, so the picker settles on its empty state once the
    // catalogue search resolves.
    expect(
      screen.getByText("No matching work in the catalogue")
    ).toBeInTheDocument()
  })

  it("creates a screening in the screening collection, with `movie` set", async () => {
    catalogue = [
      { id: 1, documentId: "work-film", title: "Le Silence", type: "film" },
    ]
    const onSuccess = jest.fn()

    await renderModal(
      <SubEventModal
        isOpen
        onClose={noop}
        onSuccess={onSuccess}
        venueId="7"
        prefilledDate={FUTURE_SLOT}
      />
    )

    // Pick a work from the catalogue — the picker only offers the types this
    // kind may reference, and the title auto-fills from the selection.
    fireEvent.click(screen.getByRole("button", { name: "Le Silence" }))
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(4))

    // 1. the container event, which is the type that owns `venue`
    const [eventUrl, eventBody] = post.mock.calls[0] as [string, { data: any }]
    expect(eventUrl).toBe(
      "/content-manager/collection-types/plugin::events-manager.event"
    )
    expect(eventBody.data.category).toBe("movie_screening")
    expect(eventBody.data.title).toBe("Le Silence")
    // The numeric venue id was resolved to the documentId relations use.
    expect(eventBody.data.venue).toBe("venue-1")

    // 2. the sub-event, in the collection matching the kind
    const [subUrl, subBody] = post.mock.calls[1] as [string, { data: any }]
    expect(subUrl).toBe(
      "/content-manager/collection-types/plugin::events-manager.screening"
    )
    expect(subUrl).not.toContain("performance")
    expect(subUrl).not.toContain("showtime")
    expect(subBody.data.movie).toBe("work-film")
    expect(subBody.data.play).toBeUndefined()
    expect(subBody.data.event).toBe("evt-1")
    expect(subBody.data.order).toBe(1)

    // 3 + 4. both rows are published — a draft showing is invisible to the
    // public API while looking correct on this calendar, which reads drafts.
    expect(post.mock.calls[2][0]).toBe(
      "/content-manager/collection-types/plugin::events-manager.screening/scr-1/actions/publish"
    )
    expect(post.mock.calls[3][0]).toBe(
      "/content-manager/collection-types/plugin::events-manager.event/evt-1/actions/publish"
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("constrains the catalogue search to the work types the kind allows", async () => {
    await renderModal(
      <SubEventModal
        isOpen
        onClose={noop}
        onSuccess={noop}
        venueId="7"
        prefilledDate={FUTURE_SLOT}
      />
    )

    const catalogueCall = get.mock.calls.find(([url]) =>
      url.includes("creative-works.creative-work")
    )

    // Without this filter the picker offers plays for a screening, and the
    // server-side `assertSubEventWorkKind` guard turns the save into a 400.
    expect(catalogueCall?.[1]?.params?.filters?.type?.$in).toEqual([
      "film",
      "short-film",
    ])
  })

  it("renders nothing when isOpen is false", async () => {
    await renderModal(
      <SubEventModal
        isOpen={false}
        onClose={noop}
        onSuccess={noop}
        venueId="7"
      />
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "New showing" })
    ).not.toBeInTheDocument()
  })

  it("opens in edit mode against the collection matching the block's kind", async () => {
    const onSuccess = jest.fn()

    await renderModal(
      <SubEventModal
        isOpen
        onClose={noop}
        onSuccess={onSuccess}
        venueId="7"
        subEvent={performance}
      />
    )

    expect(
      screen.getByRole("heading", { name: "Edit showing" })
    ).toBeInTheDocument()
    // Seeded from the row, so no catalogue round-trip is needed to re-save.
    expect(screen.getByText("Hamlet")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(put).toHaveBeenCalled())

    const [url, body] = put.mock.calls[0] as [string, { data: any }]
    expect(url).toBe(
      "/content-manager/collection-types/plugin::events-manager.performance/perf-1"
    )
    expect(url).not.toContain("screening")
    expect(url).not.toContain("showtime")
    // The theatre field is `surtitleLanguage`, and `play` — not `movie` —
    // carries the work.
    expect(body.data.surtitleLanguage).toBe("fr")
    expect(body.data.play).toBe("work-play")
    expect(body.data.movie).toBeUndefined()
    // An update never re-parents the row.
    expect(body.data.event).toBeUndefined()
    // An updated row is republished, or the edit would only reach the draft.
    expect(post).toHaveBeenCalledWith(
      "/content-manager/collection-types/plugin::events-manager.performance/perf-1/actions/publish"
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("deletes through the same kind-matched collection", async () => {
    await renderModal(
      <SubEventModal
        isOpen
        onClose={noop}
        onSuccess={noop}
        venueId="7"
        subEvent={performance}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete this showing" }))
    // The destructive action is behind a confirmation, never a bare click.
    expect(del).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(del).toHaveBeenCalled())
    expect(del.mock.calls[0][0]).toBe(
      "/content-manager/collection-types/plugin::events-manager.performance/perf-1"
    )
  })
})

describe("SubEventModal — failure paths", () => {
  const selectAndSubmit = async (onSuccess = jest.fn()) => {
    catalogue = [
      { id: 1, documentId: "work-film", title: "Le Silence", type: "film" },
    ]

    await renderModal(
      <SubEventModal
        isOpen
        onClose={noop}
        onSuccess={onSuccess}
        venueId="7"
        prefilledDate={FUTURE_SLOT}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Le Silence" }))
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    return onSuccess
  }

  beforeEach(resetFetchMocks)

  it("rolls the container event back when the sub-event write fails", async () => {
    post.mockImplementation(async (url: string) => {
      if (url.includes("events-manager.screening")) throw new Error("boom")
      if (url.includes("events-manager.event"))
        return { data: { data: { documentId: "evt-1" } } }
      return { data: { data: {} } }
    })

    const onSuccess = await selectAndSubmit()

    // Without the rollback the event survives with no sub-event — invisible on
    // the calendar, and a fresh orphan on every retry.
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith(
        "/content-manager/collection-types/plugin::events-manager.event/evt-1"
      )
    )
    expect(onSuccess).not.toHaveBeenCalled()
    expect(
      await screen.findByText("The showing could not be saved")
    ).toBeInTheDocument()
  })

  it("refuses to save when the venue cannot be resolved", async () => {
    // Posting the raw numeric id as a v5 documentId does not fail loudly: the
    // event is created unlinked, so the showing belongs to no venue.
    get.mockImplementation(async (url: string) =>
      url.includes("venues.venue")
        ? { data: { results: [] } }
        : { data: { results: catalogue } }
    )

    const onSuccess = await selectAndSubmit()

    expect(
      await screen.findByText(
        "This venue could not be resolved — nothing was saved"
      )
    ).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("does not report success when the publish fails", async () => {
    post.mockImplementation(async (url: string) => {
      if (url.includes("/actions/publish")) throw new Error("publish failed")
      if (url.includes("events-manager.event"))
        return { data: { data: { documentId: "evt-1" } } }
      return { data: { data: { documentId: "scr-1" } } }
    })

    const onSuccess = await selectAndSubmit()

    expect(
      await screen.findByText(
        "Saved, but publishing failed — the showing is not public yet. Try again."
      )
    ).toBeInTheDocument()
    // The row exists but is a draft: reporting success here is exactly the
    // failure mode the spec amendment forbids.
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("retrying after a failed publish republishes instead of duplicating", async () => {
    let publishAttempts = 0
    post.mockImplementation(async (url: string) => {
      if (url.includes("/actions/publish")) {
        publishAttempts += 1
        if (publishAttempts === 1) throw new Error("publish failed")
        return { data: { data: {} } }
      }
      if (url.includes("events-manager.event"))
        return { data: { data: { documentId: "evt-1" } } }
      return { data: { data: { documentId: "scr-1" } } }
    })

    const onSuccess = await selectAndSubmit()
    await screen.findByText(
      "Saved, but publishing failed — the showing is not public yet. Try again."
    )

    const writesBeforeRetry = post.mock.calls.filter(
      ([url]) => !url.includes("/actions/publish")
    ).length

    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())

    // The retry publishes the rows already written — a second create would
    // leave the venue with two identical showings.
    const writesAfterRetry = post.mock.calls.filter(
      ([url]) => !url.includes("/actions/publish")
    ).length
    expect(writesAfterRetry).toBe(writesBeforeRetry)
  })

  it("routes a lifecycle work-kind rejection onto the work field", async () => {
    post.mockImplementation(async (url: string) => {
      if (url.includes("events-manager.event"))
        return { data: { data: { documentId: "evt-1" } } }
      if (url.includes("events-manager.screening")) {
        throw {
          response: {
            data: {
              error: {
                name: "ValidationError",
                message:
                  'movie must reference a creative-work of type "film" or "short-film", but "work-film" is of type "play".',
              },
            },
          },
        }
      }
      return { data: { data: {} } }
    })

    await selectAndSubmit()

    expect(
      await screen.findByText(
        "A screening must reference a feature film or a short film"
      )
    ).toBeInTheDocument()
  })

  it("does not mistake an unrelated error for a work-field error", async () => {
    // The old substring check fired on any message containing "movie"/"play" —
    // "display", "replay", or a title echoed back by the server.
    post.mockImplementation(async (url: string) => {
      if (url.includes("events-manager.event"))
        return { data: { data: { documentId: "evt-1" } } }
      if (url.includes("events-manager.screening")) {
        throw {
          response: {
            data: {
              error: {
                name: "ApplicationError",
                message: "Unable to display the replay of this movie session",
              },
            },
          },
        }
      }
      return { data: { data: {} } }
    })

    await selectAndSubmit()

    // Reported as what it is — a save failure — not pinned to the picker.
    expect(
      await screen.findByText(
        "Unable to display the replay of this movie session"
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        "A screening must reference a feature film or a short film"
      )
    ).not.toBeInTheDocument()
  })
})
