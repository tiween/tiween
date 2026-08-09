/**
 * Integration tests for the planning surface's WRITE path, against a real
 * Strapi booted on SQLite.
 *
 * WHICH LAYER THIS TESTS: the actual admin content-manager HTTP endpoints, over
 * supertest, authenticated with a real super-admin session (see
 * `tests/helpers/admin.ts`). Not the Document Service, not a mock — the same
 * requests the browser makes. The payloads come from the SAME builders the
 * modal calls (`buildEventRequest`, `buildSubEventRequest`, `publishUrl`), so
 * what is proven here is that the real payloads are accepted, not that a
 * hand-written approximation of them is.
 *
 * WHY IT EXISTS: every unit test above this layer mocks `useFetchClient`, so
 * the field names, the relation format (bare documentId) and the publish
 * semantics were all assumptions. Four of them turned out to be wrong or
 * incomplete, each marked FINDING below:
 *
 *  1. The work-kind lifecycle guard never fires for real writes.
 *  2. The content-manager silently DROPS unknown fields on create.
 *  3. `required: true` is not enforced on create — only on publish.
 *  4. A linked creative-work must already be published when the sub-event is
 *     published, or the public API returns the showing with no film.
 *
 * Named `*.service.test.ts` so it stays in the opt-in integration project
 * (`yarn test:integration`) and never runs in the default `yarn test` gate.
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import { createAdminSession } from "../../../../../../tests/helpers/admin"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"
import {
  buildEventRequest,
  buildSubEventRequest,
  publishUrl,
} from "../../../admin/src/components/SubEventModal/validate"

jest.setTimeout(120000)

const EVENT_UID = "plugin::events-manager.event"
const SCREENING_UID = "plugin::events-manager.screening"
const PERFORMANCE_UID = "plugin::events-manager.performance"
const WORK_UID = "plugin::creative-works.creative-work"
const VENUE_UID = "plugin::venues.venue"

const CM = "/content-manager/collection-types"

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>

const api = () => request((strapi as any).server.httpServer)

/** An authenticated content-manager POST, exactly as the admin panel issues it. */
const post = (url: string, data: Record<string, unknown> = {}) =>
  api().post(url).set("Authorization", `Bearer ${adminToken}`).send(data)

let seq = 0
const uniq = (prefix: string) => `${prefix}-${++seq}-${Date.now()}`

async function seedVenue() {
  const name = uniq("Venue")
  return strapi.documents(VENUE_UID as never).create({
    data: { name, slug: name.toLowerCase() },
  } as never) as Promise<{ id: number; documentId: string }>
}

async function seedWork(type: "film" | "play" | "short-film") {
  const title = uniq(`Work-${type}`)
  return strapi.documents(WORK_UID as never).create({
    data: { title, slug: title.toLowerCase(), type, duration: 95 },
  } as never) as Promise<{ documentId: string; title: string }>
}

/** Payload input shared by the builder calls below. */
const payloadInput = (
  kind: "screening" | "performance",
  workDocumentId: string,
  eventRef?: string
) => ({
  kind,
  startDateTime: "2099-01-01T20:00:00.000Z",
  workDocumentId,
  price: "35.5",
  audioLanguage: "fr",
  subtitleLanguage: kind === "screening" ? "ar" : "",
  videoFormat: kind === "screening" ? "imax" : "",
  surtitleLanguage: kind === "performance" ? "fr" : "",
  ...(eventRef ? { eventRef } : {}),
})

async function cleanupContent() {
  for (const uid of [
    SCREENING_UID,
    PERFORMANCE_UID,
    EVENT_UID,
    WORK_UID,
    VENUE_UID,
  ]) {
    let rows = await strapi.documents(uid as never).findMany({
      limit: 100,
      status: "draft",
    } as never)
    while (rows.length > 0) {
      for (const row of rows) {
        await strapi
          .documents(uid as never)
          .delete({ documentId: row.documentId } as never)
      }
      rows = await strapi.documents(uid as never).findMany({
        limit: 100,
        status: "draft",
      } as never)
    }
  }
}

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy
})

afterAll(async () => {
  await cleanupContent()
  await destroyAdmin?.()
  await cleanupStrapi()
})

afterEach(async () => {
  await cleanupContent()
})

describe("container event create (buildEventRequest)", () => {
  it("is accepted by the real endpoint, with the venue linked by bare documentId", async () => {
    const venue = await seedVenue()

    const req = buildEventRequest({
      kind: "screening",
      title: "Soirée d'ouverture",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })

    const res = await post(req.url, req.data)

    expect(res.status).toBe(201)

    // Read back through the Document Service: a 201 only says the request was
    // shaped acceptably, not that the relation resolved to the intended row.
    const saved = (await strapi.documents(EVENT_UID as never).findOne({
      documentId: res.body.data.documentId,
      populate: ["venue"],
      status: "draft",
    } as never)) as any

    expect(saved.category).toBe("movie_screening")
    expect(saved.eventStatus).toBe("scheduled")
    expect(saved.startDateTime).toBe("2099-01-01T20:00:00.000Z")
    // The assumption this whole suite exists to check.
    expect(saved.venue?.documentId).toBe(venue.documentId)
  })

  it("stamps the theatre category for a performance", async () => {
    const req = buildEventRequest({
      kind: "performance",
      title: "Représentation",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: (await seedVenue()).documentId,
    })

    const res = await post(req.url, req.data)

    expect(res.status).toBe(201)
    expect(res.body.data.category).toBe("theater_performance")
  })

  it("FINDING: the PRE-2C.3 payload is caught at publish, not on create", async () => {
    // `EventCreationModal` sent `startDate` + `status` and no `category`.
    const venue = await seedVenue()

    const legacy = await post(cmUrlFor(EVENT_UID), {
      title: "Legacy payload",
      startDate: "2099-01-01T20:00:00.000Z",
      status: "scheduled",
      venue: venue.documentId,
    })

    expect(legacy.status).toBe(400)
    // FINDING: it fails on `status` first — and not because the event has no
    // such attribute, but because `status` is RESERVED by the content-manager
    // (it selects draft vs published). The old payload was colliding with a
    // control parameter, which is a louder failure than a plain unknown field
    // would have been (see the unknown-field test below).
    expect(legacy.body.error.name).toBe("ValidationError")
    expect(legacy.body.error.message).toBe("Invalid status")

    // FINDING: with the reserved word removed, the same broken payload is
    // ACCEPTED (201) even though `category` and `startDateTime` are
    // `required: true` — the content-manager does not enforce required on
    // create, because a draft is allowed to be incomplete.
    const withoutReserved = await post(cmUrlFor(EVENT_UID), {
      title: "Legacy payload",
      startDate: "2099-01-01T20:00:00.000Z",
      venue: venue.documentId,
    })

    expect(withoutReserved.status).toBe(201)
    expect(withoutReserved.body.data.category).toBeNull()
    expect(withoutReserved.body.data.startDateTime).toBeNull()

    // Required-ness bites at PUBLISH. Which means the publish step this change
    // added is not only about visibility — it is the first moment the server
    // validates the row at all. A pre-2C.3 payload would have created an empty
    // draft and failed here.
    const publishRes = await post(
      publishUrl(EVENT_UID, withoutReserved.body.data.documentId)
    )

    expect(publishRes.status).toBe(400)
    expect(JSON.stringify(publishRes.body.error)).toMatch(
      /category|startDateTime/
    )
  })
})

describe("sub-event create (buildSubEventRequest)", () => {
  it("puts a screening in the screening collection with `movie` resolved", async () => {
    const [venue, film] = await Promise.all([seedVenue(), seedWork("film")])

    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Projection",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)
    const eventDocumentId = eventRes.body.data.documentId

    const req = buildSubEventRequest(
      payloadInput("screening", film.documentId, eventDocumentId)
    )

    expect(req.url).toContain("events-manager.screening")

    const res = await post(req.url, req.data)
    expect(res.status).toBe(201)

    const saved = (await strapi.documents(SCREENING_UID as never).findOne({
      documentId: res.body.data.documentId,
      populate: ["movie", "event"],
      status: "draft",
    } as never)) as any

    // Relations resolved to the intended rows, from bare documentId strings.
    expect(saved.movie?.documentId).toBe(film.documentId)
    expect(saved.event?.documentId).toBe(eventDocumentId)
    expect(saved.videoFormat).toBe("imax")
    expect(saved.subtitleLanguage).toBe("ar")
    expect(saved.price).toBe(35.5)
    expect(saved.order).toBe(1)

    // Nothing landed in the other collection.
    const performances = await strapi
      .documents(PERFORMANCE_UID as never)
      .findMany({ status: "draft" } as never)
    expect(performances).toHaveLength(0)
  })

  it("puts a performance in the performance collection with `play` resolved", async () => {
    const [venue, play] = await Promise.all([seedVenue(), seedWork("play")])

    const eventReq = buildEventRequest({
      kind: "performance",
      title: "Représentation",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)

    const req = buildSubEventRequest(
      payloadInput(
        "performance",
        play.documentId,
        eventRes.body.data.documentId
      )
    )

    expect(req.url).toContain("events-manager.performance")

    const res = await post(req.url, req.data)
    expect(res.status).toBe(201)

    const saved = (await strapi.documents(PERFORMANCE_UID as never).findOne({
      documentId: res.body.data.documentId,
      populate: ["play", "event"],
      status: "draft",
    } as never)) as any

    expect(saved.play?.documentId).toBe(play.documentId)
    expect(saved.surtitleLanguage).toBe("fr")
    // `subtitleLanguage`/`videoFormat` do not exist on this type, and the
    // builder never sends them — a payload carrying them would 400 here.
    expect(saved.subtitleLanguage).toBeUndefined()

    const screenings = await strapi
      .documents(SCREENING_UID as never)
      .findMany({ status: "draft" } as never)
    expect(screenings).toHaveLength(0)
  })

  it("SILENTLY DROPS unknown fields — a stale payload does not fail loudly", async () => {
    const [film, venue] = await Promise.all([seedWork("film"), seedVenue()])
    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Projection",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)

    const res = await post(cmUrlFor(SCREENING_UID), {
      startDateTime: "2099-01-01T20:00:00.000Z",
      // The pre-2C.3 field names.
      datetime: "2099-01-01T20:00:00.000Z",
      format: "VOST",
      movie: film.documentId,
      event: eventRes.body.data.documentId,
    })

    /*
     * FINDING: the content-manager accepts this (201) and simply DISCARDS the
     * unknown attributes. So a payload that has drifted from the schema does
     * not announce itself — it writes a row that is quietly missing data.
     *
     * That is precisely why `buildSubEventRequest` is the single place the body
     * is constructed, and why splicing extra keys on at the call site was worth
     * removing: nothing downstream would have caught it.
     */
    expect(res.status).toBe(201)

    const saved = (await strapi.documents(SCREENING_UID as never).findOne({
      documentId: res.body.data.documentId,
      status: "draft",
    } as never)) as any

    expect(saved.datetime).toBeUndefined()
    expect(saved.format).toBeUndefined()
  })
})

describe("publish on save (publishUrl)", () => {
  it("makes the showing visible on the PUBLIC endpoint the client reads", async () => {
    const [venue, film] = await Promise.all([seedVenue(), seedWork("film")])

    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Projection publique",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)
    const eventDocumentId = eventRes.body.data.documentId

    // A freshly created row is a DRAFT — the failure mode the spec amendment
    // exists for: correct-looking in the admin calendar, absent from the site.
    expect(eventRes.body.data.publishedAt).toBeNull()

    const subReq = buildSubEventRequest(
      payloadInput("screening", film.documentId, eventDocumentId)
    )
    const subRes = await post(subReq.url, subReq.data)
    const screeningDocumentId = subRes.body.data.documentId
    expect(subRes.body.data.publishedAt).toBeNull()

    const publicUrl = `/api/events-manager/events/${eventDocumentId}`

    // Before publishing, the public API cannot see the event at all.
    expect((await api().get(publicUrl)).status).toBe(404)

    // Publish exactly as the modal does.
    expect(
      (await post(publishUrl(SCREENING_UID, screeningDocumentId))).status
    ).toBe(200)
    expect((await post(publishUrl(EVENT_UID, eventDocumentId))).status).toBe(
      200
    )

    const publicRes = await api().get(publicUrl)

    expect(publicRes.status).toBe(200)
    expect(publicRes.body.data.title).toBe("Projection publique")
    // The screening is on the published event, with its work attached — this is
    // the assertion that a 200 from the publish action alone would not give.
    expect(publicRes.body.data.screenings).toHaveLength(1)
    expect(publicRes.body.data.screenings[0].documentId).toBe(
      screeningDocumentId
    )
    // FINDING: `movie` is EMPTY here, even though the relation is set and both
    // the event and the screening are published — see the next test.
    expect(publicRes.body.data.screenings[0].movie).toBeFalsy()
  })

  it("FINDING: the linked work must ALREADY be published when the sub-event is", async () => {
    /*
     * The public detail read resolves relations at `status: "published"`, so a
     * published screening pointing at a DRAFT creative-work comes back with no
     * `movie` at all — a showing on the public site with no film attached.
     *
     * The planning surface publishes the sub-event and its container event
     * (spec amendment) but never the work, and the picker offers drafts. Out of
     * scope to change here — it is a product decision (auto-publish the work,
     * or restrict the picker to published works) — but it is a real gap between
     * "saved successfully" and "correct on the site".
     */
    const [venue, film] = await Promise.all([seedVenue(), seedWork("film")])

    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Avec oeuvre publiee",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)
    const eventDocumentId = eventRes.body.data.documentId

    const subReq = buildSubEventRequest(
      payloadInput("screening", film.documentId, eventDocumentId)
    )
    const subRes = await post(subReq.url, subReq.data)

    await post(publishUrl(SCREENING_UID, subRes.body.data.documentId))
    await post(publishUrl(EVENT_UID, eventDocumentId))

    const beforeWorkPublish = await api().get(
      `/api/events-manager/events/${eventDocumentId}`
    )
    expect(beforeWorkPublish.body.data.screenings[0].movie).toBeFalsy()

    // Publishing the work AFTERWARDS does not repair it: publishing the
    // screening snapshotted a link to the work's draft entry, and the new
    // published work entry is a different row.
    await strapi
      .documents(WORK_UID as never)
      .publish({ documentId: film.documentId } as never)

    const afterWorkPublish = await api().get(
      `/api/events-manager/events/${eventDocumentId}`
    )
    expect(afterWorkPublish.body.data.screenings[0].movie).toBeFalsy()

    // Publishing the work BEFORE the sub-event is what works.
    const orderedFilm = await seedWork("film")
    await strapi
      .documents(WORK_UID as never)
      .publish({ documentId: orderedFilm.documentId } as never)

    const orderedEventRes = await post(
      eventReq.url,
      buildEventRequest({
        kind: "screening",
        title: "Ordre correct",
        startDateTime: "2099-01-01T20:00:00.000Z",
        venueRef: venue.documentId,
      }).data
    )
    const orderedEventId = orderedEventRes.body.data.documentId
    const orderedSubReq = buildSubEventRequest(
      payloadInput("screening", orderedFilm.documentId, orderedEventId)
    )
    const orderedSub = await post(orderedSubReq.url, orderedSubReq.data)
    await post(publishUrl(SCREENING_UID, orderedSub.body.data.documentId))
    await post(publishUrl(EVENT_UID, orderedEventId))

    const ordered = await api().get(
      `/api/events-manager/events/${orderedEventId}`
    )
    expect(ordered.body.data.screenings[0].movie?.title).toBe(orderedFilm.title)
  })

  it("a published event still hides an unpublished screening", async () => {
    const [venue, film] = await Promise.all([seedVenue(), seedWork("film")])

    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Événement publié",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)
    const eventDocumentId = eventRes.body.data.documentId

    const subReq = buildSubEventRequest(
      payloadInput("screening", film.documentId, eventDocumentId)
    )
    await post(subReq.url, subReq.data)

    // Publish ONLY the event — i.e. what the surface did before the amendment.
    await post(publishUrl(EVENT_UID, eventDocumentId))

    const publicRes = await api().get(
      `/api/events-manager/events/${eventDocumentId}`
    )

    expect(publicRes.status).toBe(200)
    // The event is public but has no showings: a listing with nothing to book.
    // Publishing the sub-event too is what the spec amendment requires.
    expect(publicRes.body.data.screenings).toHaveLength(0)
  })
})

describe("compensating rollback", () => {
  it("leaves no orphan event when the sub-event write fails", async () => {
    const venue = await seedVenue()

    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Sera annulé",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)
    const eventDocumentId = eventRes.body.data.documentId
    expect(eventRes.status).toBe(201)

    // Force the second write to fail the way the modal's catch block expects:
    // an invalid enum value the server rejects.
    const failing = await post(cmUrlFor(SCREENING_UID), {
      startDateTime: "2099-01-01T20:00:00.000Z",
      videoFormat: "not-a-real-format",
      event: eventDocumentId,
    })
    expect(failing.status).toBe(400)

    // The modal's compensating rollback, verbatim.
    const rollback = await api()
      .delete(`${cmUrlFor(EVENT_UID)}/${eventDocumentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(rollback.status).toBe(200)

    const remaining = await strapi
      .documents(EVENT_UID as never)
      .findMany({ status: "draft" } as never)
    expect(remaining).toHaveLength(0)
  })
})

describe("sub-event ↔ work-kind lifecycle guard", () => {
  it("DOES NOT FIRE for real writes — the relation reaches it as a numeric id", async () => {
    /*
     * FINDING (2026-08-09), not a design decision of this change.
     *
     * `assertSubEventWorkKind` is wired in `server/src/bootstrap.ts` through
     * `strapi.db.lifecycles.subscribe`, i.e. at the DATABASE layer. By the time
     * a write reaches there, the Document Service has already resolved the
     * relation: the payload is `movie: { set: [{ id: 2 }] }` — an INTERNAL
     * NUMERIC ID.
     *
     * `extractWorkDocumentId` handles `connect`, `documentId` and string ids,
     * and deliberately returns `undefined` for a numeric id ("we cannot read it
     * as a documentId, so skip rather than guess"). The guard is fail-open, so
     * it skips — every time, for every write path. Its unit tests pass because
     * they call the function directly with documentId-shaped payloads the DB
     * layer never actually produces.
     *
     * Net effect: attaching a play to a screening is currently ACCEPTED by the
     * server. This test asserts the real behaviour rather than the intended
     * one, so the suite stays honest; when the guard is fixed (its own change —
     * `sub-event-work-kind.ts` is read-only contract for this spec), this
     * expectation must flip to 400.
     *
     * Consequence for the planning surface: the client-side type filter in the
     * work picker plus `validateSubEventForm`'s `work.kindMismatch` rule are
     * the ONLY things preventing a wrong-kind link today. The modal's
     * server-error routing remains correct, but it is currently unreachable.
     */
    const [venue, play] = await Promise.all([seedVenue(), seedWork("play")])

    const eventReq = buildEventRequest({
      kind: "screening",
      title: "Kind mismatch",
      startDateTime: "2099-01-01T20:00:00.000Z",
      venueRef: venue.documentId,
    })
    const eventRes = await post(eventReq.url, eventReq.data)

    // A PLAY sent to the SCREENING collection.
    const req = buildSubEventRequest(
      payloadInput("screening", play.documentId, eventRes.body.data.documentId)
    )
    const res = await post(req.url, req.data)

    expect(res.status).toBe(201) // ← should be 400 once the guard is repaired

    const saved = (await strapi.documents(SCREENING_UID as never).findOne({
      documentId: res.body.data.documentId,
      populate: ["movie"],
      status: "draft",
    } as never)) as any

    // A stage play, attached to a cinema screening, persisted.
    expect(saved.movie?.type).toBe("play")
  })

  it("still resolves the work it would need — the guard's lookup is not the broken part", async () => {
    const play = await seedWork("play")

    const work = await (strapi as any)
      .plugin("creative-works")
      .service("public-api")
      .findWork(play.documentId)

    // `findWork` returns the row (draft included), so the guard has everything
    // it needs; only the documentId extraction fails.
    expect(work?.type).toBe("play")
  })
})

/** Local mirror of the admin `cmUrl` helper, for hand-written payloads. */
function cmUrlFor(uid: string): string {
  return `${CM}/${uid}`
}
