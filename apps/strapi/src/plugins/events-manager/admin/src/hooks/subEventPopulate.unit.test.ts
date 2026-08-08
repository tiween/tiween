/**
 * Unit tests for the sub-event UID / populate contract.
 *
 * Pure and dependency-free by design, so the node gate can load it. What is
 * pinned here is the per-kind populate list: `movie` exists only on
 * `screening` and `play` only on `performance`, and the content-manager
 * rejects a populate key the model does not declare — so a "shared" list sent
 * verbatim to both collections would 400 one of them on every calendar load.
 */
import {
  cmUrl,
  EVENT_CATEGORY_BY_KIND,
  PERFORMANCE_UID,
  SCREENING_UID,
  SUB_EVENT_KINDS,
  SUB_EVENT_POPULATE,
  SUB_EVENT_UID,
  SUB_EVENT_WORK_FIELD,
  subEventPopulate,
} from "./subEventPopulate"

describe("subEventPopulate (unit)", () => {
  it("drops the foreign work relation per kind", () => {
    expect(subEventPopulate("screening")).not.toContain("play")
    expect(subEventPopulate("screening")).toContain("movie")

    expect(subEventPopulate("performance")).not.toContain("movie")
    expect(subEventPopulate("performance")).toContain("play")
  })

  it("always resolves the parent event and its venue", () => {
    // The venue filter travels through the event, and the block needs the
    // event title as a fallback — both kinds need both paths.
    for (const kind of SUB_EVENT_KINDS) {
      expect(subEventPopulate(kind)).toContain("event")
      expect(subEventPopulate(kind)).toContain("event.venue")
    }
  })

  it("never populates a direct `venue` — no sub-event has one", () => {
    for (const kind of SUB_EVENT_KINDS) {
      expect(subEventPopulate(kind)).not.toContain("venue")
    }
  })

  it("derives every kind's list from the one shared list", () => {
    for (const kind of SUB_EVENT_KINDS) {
      for (const path of subEventPopulate(kind)) {
        expect(SUB_EVENT_POPULATE).toContain(path)
      }
    }
  })
})

describe("sub-event UID map (unit)", () => {
  it("points each kind at its own collection", () => {
    expect(SUB_EVENT_UID.screening).toBe(SCREENING_UID)
    expect(SUB_EVENT_UID.performance).toBe(PERFORMANCE_UID)
    // The pre-2C.3 collection is gone; nothing may address it.
    expect(Object.values(SUB_EVENT_UID).join()).not.toContain("showtime")
  })

  it("pairs each kind with its work field and event category", () => {
    expect(SUB_EVENT_WORK_FIELD.screening).toBe("movie")
    expect(SUB_EVENT_WORK_FIELD.performance).toBe("play")
    expect(EVENT_CATEGORY_BY_KIND.screening).toBe("movie_screening")
    expect(EVENT_CATEGORY_BY_KIND.performance).toBe("theater_performance")
  })

  it("builds content-manager collection URLs", () => {
    expect(cmUrl(SCREENING_UID)).toBe(
      "/content-manager/collection-types/plugin::events-manager.screening"
    )
  })
})
