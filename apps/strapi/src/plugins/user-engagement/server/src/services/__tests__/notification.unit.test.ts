import notificationService, { deriveScheduleChange } from "../notification"

/**
 * Unit tests for the user-engagement `notification` service (mocked Strapi),
 * mirroring the `watchlist.unit.test.ts` harness style. No DB, no boot:
 * `strapi.documents()` and `strapi.plugins.email.services.email.send` are jest
 * mocks.
 *
 * Two layers:
 *  - `deriveScheduleChange` — the pure delta-derivation table (the I/O matrix's
 *    detection rows).
 *  - `notifyScheduleChange` — per-watcher, deduped, preference-gated fan-out:
 *    multi-watcher, notifyChanges gate (already filtered), per-user dedup,
 *    email-preference gate, email-throw isolation. Plus list/unreadCount/
 *    markAllRead over the mocked documents harness.
 */

const WATCHLIST_UID = "plugin::user-engagement.user-watchlist"
const NOTIFICATION_UID = "plugin::user-engagement.schedule-notification"

describe("deriveScheduleChange (unit)", () => {
  it("showtime moved (status unchanged) ⇒ showtime_changed", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-13T20:00:00.000Z",
        oldStatus: "scheduled",
        newStatus: "scheduled",
      })
    ).toEqual({
      changeType: "showtime_changed",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-13T20:00:00.000Z",
    })
  })

  it("transition into cancelled ⇒ cancelled (newDateTime null)", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-13T18:00:00.000Z",
        oldStatus: "scheduled",
        newStatus: "cancelled",
      })
    ).toEqual({
      changeType: "cancelled",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: null,
    })
  })

  it("transition into postponed ⇒ postponed", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-20T18:00:00.000Z",
        oldStatus: "scheduled",
        newStatus: "postponed",
      })
    ).toEqual({
      changeType: "postponed",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-20T18:00:00.000Z",
    })
  })

  it("transition into rescheduled ⇒ rescheduled", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-14T18:00:00.000Z",
        oldStatus: "scheduled",
        newStatus: "rescheduled",
      })
    ).toEqual({
      changeType: "rescheduled",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-14T18:00:00.000Z",
    })
  })

  it("no time change and no status change ⇒ null", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-13T18:00:00.000Z",
        oldStatus: "scheduled",
        newStatus: "scheduled",
      })
    ).toBeNull()
  })

  it("status unchanged and startDateTime absent ⇒ null (only title/venue edited)", () => {
    expect(
      deriveScheduleChange({
        oldStatus: "scheduled",
        newStatus: "scheduled",
      })
    ).toBeNull()
  })

  it("editing the time of an already-cancelled event ⇒ null (no showtime_changed)", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-13T20:00:00.000Z",
        oldStatus: "cancelled",
        newStatus: "cancelled",
      })
    ).toBeNull()
  })

  it("reinstatement (cancelled → scheduled) with a new time ⇒ null (out of scope, no spurious showtime_changed)", () => {
    expect(
      deriveScheduleChange({
        oldStartDateTime: "2026-07-13T18:00:00.000Z",
        newStartDateTime: "2026-07-14T20:00:00.000Z",
        oldStatus: "cancelled",
        newStatus: "scheduled",
      })
    ).toBeNull()
  })
})

interface DocApiMock {
  findMany: jest.Mock
  create: jest.Mock
  update: jest.Mock
  count: jest.Mock
}

/** Build a Strapi mock whose `documents(uid)` is keyed by UID. */
function buildStrapi(options: {
  watchers?: any[]
  notifications?: any[]
  emailThrows?: boolean
  /** documentId whose notification `create` should throw (per-user isolation). */
  createThrowsForUser?: string
  /** documentId whose `update` should throw (mark-all-read row isolation). */
  updateThrowsForDoc?: string
}) {
  const watchlistApi: DocApiMock = {
    findMany: jest.fn(async () => options.watchers ?? []),
    create: jest.fn(async () => ({ documentId: "wl" })),
    update: jest.fn(async () => ({ documentId: "wl" })),
    count: jest.fn(async () => (options.watchers ?? []).length),
  }
  const created: any[] = []
  const notificationApi: DocApiMock = {
    // When a static `notifications` list is provided (read-API tests) return it.
    // Otherwise serve the fan-out's idempotency probe from the rows created so
    // far in this harness so a repeated notifyScheduleChange is deduped.
    findMany: jest.fn(async (params?: any) => {
      if (options.notifications) return options.notifications
      const f = params?.filters ?? {}
      if (f.eventDocumentId !== undefined) {
        return created.filter(
          (r) =>
            r.user === f.user?.documentId &&
            r.eventDocumentId === f.eventDocumentId &&
            r.changeType === f.changeType &&
            (r.oldDateTime ?? null) === (f.oldDateTime ?? null) &&
            (r.newDateTime ?? null) === (f.newDateTime ?? null)
        )
      }
      return []
    }),
    create: jest.fn(async ({ data }: any) => {
      if (
        options.createThrowsForUser &&
        data.user === options.createThrowsForUser
      ) {
        throw new Error("create failed")
      }
      const row = { documentId: `notif-${created.length + 1}`, ...data }
      created.push(row)
      return row
    }),
    update: jest.fn(async ({ documentId }: any) => {
      if (
        options.updateThrowsForDoc &&
        documentId === options.updateThrowsForDoc
      ) {
        throw new Error("update failed")
      }
      return { documentId }
    }),
    count: jest.fn(async () => (options.notifications ?? []).length),
  }

  const send = jest.fn(async () => {
    if (options.emailThrows) throw new Error("brevo down")
    return { messageId: "m1" }
  })
  const logError = jest.fn()

  const strapi: any = {
    documents: jest.fn((uid: string) =>
      uid === WATCHLIST_UID ? watchlistApi : notificationApi
    ),
    plugins: {
      email: { services: { email: { send } } },
    },
    log: { error: logError },
  }

  return { strapi, watchlistApi, notificationApi, send, logError, created }
}

function watcher(
  userId: string,
  creativeWorkId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    documentId: `wl-${userId}-${creativeWorkId}`,
    creativeWork: { documentId: creativeWorkId },
    user: {
      documentId: userId,
      email: `${userId}@example.com`,
      preferredLanguage: "fr",
      emailNotificationsEnabled: true,
      ...overrides,
    },
  }
}

const CHANGE = {
  eventDocumentId: "evt-1",
  eventTitle: "Dune",
  category: "movie_screening",
  oldStartDateTime: "2026-07-13T18:00:00.000Z",
  newStartDateTime: "2026-07-13T20:00:00.000Z",
  oldStatus: "scheduled",
  newStatus: "scheduled",
}

describe("notifyScheduleChange (unit)", () => {
  it("creates one in-app row per watcher and emails only the opted-in ones", async () => {
    const { strapi, send, created, notificationApi } = buildStrapi({
      watchers: [
        watcher("user-1", "cw-1"),
        watcher("user-2", "cw-1"),
        watcher("user-3", "cw-1", { emailNotificationsEnabled: false }),
      ],
    })
    const service = notificationService({ strapi })

    const result = await service.notifyScheduleChange({
      ...CHANGE,
      creativeWorkDocumentIds: ["cw-1"],
    })

    expect(result).toEqual({ created: 3 })
    expect(notificationApi.create).toHaveBeenCalledTimes(3)
    // The opted-out user (user-3) gets in-app only → 2 emails sent.
    expect(send).toHaveBeenCalledTimes(2)
    // Snapshot fields denormalized onto the row.
    expect(created[0]).toMatchObject({
      user: "user-1",
      changeType: "showtime_changed",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-13T20:00:00.000Z",
      eventTitle: "Dune",
      eventDocumentId: "evt-1",
      creativeWorkDocumentId: "cw-1",
      read: false,
    })
  })

  it("reads watchlist rows gated on notifyChanges === true", async () => {
    const { strapi, watchlistApi } = buildStrapi({
      watchers: [watcher("user-1", "cw-1")],
    })
    const service = notificationService({ strapi })

    await service.notifyScheduleChange({
      ...CHANGE,
      creativeWorkDocumentIds: ["cw-1"],
    })

    expect(strapi.documents).toHaveBeenCalledWith(WATCHLIST_UID)
    expect(watchlistApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ notifyChanges: true }),
        // Unbounded page so a popular work's watchers are not silently capped by
        // the default page size — every opted-in watcher must be fanned out to.
        pagination: { limit: -1 },
      })
    )
  })

  it("emails each watcher at their own address in their own locale", async () => {
    const { strapi, send } = buildStrapi({
      watchers: [
        watcher("user-fr", "cw-1", { preferredLanguage: "fr" }),
        watcher("user-ar", "cw-1", { preferredLanguage: "ar" }),
        watcher("user-en", "cw-1", { preferredLanguage: "en" }),
      ],
    })
    const service = notificationService({ strapi })

    await service.notifyScheduleChange({
      ...CHANGE,
      creativeWorkDocumentIds: ["cw-1"],
    })

    // Recipient is the watcher's own email and the subject is localized from
    // that watcher's preferredLanguage — a regression to always-fr or a wrong
    // `to` would slip past a call-count-only assertion.
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user-fr@example.com",
        subject: expect.stringContaining("Changement d'horaire"),
      })
    )
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user-ar@example.com",
        subject: expect.stringContaining("تغيير في الموعد"),
      })
    )
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user-en@example.com",
        subject: expect.stringContaining("Schedule change"),
      })
    )
  })

  it("dedupes by user — one notification when a user watches two works on the event", async () => {
    const { strapi, notificationApi, send } = buildStrapi({
      watchers: [watcher("user-1", "cw-1"), watcher("user-1", "cw-2")],
    })
    const service = notificationService({ strapi })

    const result = await service.notifyScheduleChange({
      ...CHANGE,
      creativeWorkDocumentIds: ["cw-1", "cw-2"],
    })

    expect(result).toEqual({ created: 1 })
    expect(notificationApi.create).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("creates zero notifications for a no-op update (deriveScheduleChange → null)", async () => {
    const { strapi, notificationApi, send, watchlistApi } = buildStrapi({
      watchers: [watcher("user-1", "cw-1")],
    })
    const service = notificationService({ strapi })

    const result = await service.notifyScheduleChange({
      ...CHANGE,
      newStartDateTime: CHANGE.oldStartDateTime,
      creativeWorkDocumentIds: ["cw-1"],
    })

    expect(result).toEqual({ created: 0 })
    expect(watchlistApi.findMany).not.toHaveBeenCalled()
    expect(notificationApi.create).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it("isolates an email throw — logs it and still notifies the other watchers", async () => {
    const { strapi, notificationApi, send, logError } = buildStrapi({
      watchers: [watcher("user-1", "cw-1"), watcher("user-2", "cw-1")],
      emailThrows: true,
    })
    const service = notificationService({ strapi })

    const result = await service.notifyScheduleChange({
      ...CHANGE,
      creativeWorkDocumentIds: ["cw-1"],
    })

    // Both in-app rows created despite every email throwing.
    expect(result).toEqual({ created: 2 })
    expect(notificationApi.create).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledTimes(2)
    expect(logError).toHaveBeenCalled()
  })

  it("isolates a create throw — logs it and still notifies the other watchers", async () => {
    const { strapi, notificationApi, send, logError } = buildStrapi({
      watchers: [watcher("user-1", "cw-1"), watcher("user-2", "cw-1")],
      createThrowsForUser: "user-1",
    })
    const service = notificationService({ strapi })

    const result = await service.notifyScheduleChange({
      ...CHANGE,
      creativeWorkDocumentIds: ["cw-1"],
    })

    // user-1's create throws → only user-2 is counted/created/emailed.
    expect(result).toEqual({ created: 1 })
    expect(notificationApi.create).toHaveBeenCalledTimes(2) // both attempted
    expect(send).toHaveBeenCalledTimes(1)
    expect(logError).toHaveBeenCalled()
  })

  it("is idempotent — a repeated identical fan-out creates + emails only once", async () => {
    const { strapi, notificationApi, send } = buildStrapi({
      watchers: [watcher("user-1", "cw-1")],
    })
    const service = notificationService({ strapi })

    const payload = { ...CHANGE, creativeWorkDocumentIds: ["cw-1"] }
    await service.notifyScheduleChange(payload)
    const second = await service.notifyScheduleChange(payload)

    // The second call finds the existing notification and skips it entirely.
    expect(second).toEqual({ created: 0 })
    expect(notificationApi.create).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("cancelled change emails a null new time and stores newDateTime null", async () => {
    const { strapi, created } = buildStrapi({
      watchers: [watcher("user-1", "cw-1")],
    })
    const service = notificationService({ strapi })

    await service.notifyScheduleChange({
      ...CHANGE,
      oldStatus: "scheduled",
      newStatus: "cancelled",
      creativeWorkDocumentIds: ["cw-1"],
    })

    expect(created[0]).toMatchObject({
      changeType: "cancelled",
      newDateTime: null,
    })
  })
})

describe("notification read API (unit)", () => {
  it("listForUser reads the caller's rows sorted newest-first", async () => {
    const rows = [{ documentId: "n1" }, { documentId: "n2" }]
    const { strapi, notificationApi } = buildStrapi({ notifications: rows })
    const service = notificationService({ strapi })

    const result = await service.listForUser("user-1")

    expect(strapi.documents).toHaveBeenCalledWith(NOTIFICATION_UID)
    expect(notificationApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { user: { documentId: "user-1" } },
        sort: { createdAt: "desc" },
        // Unbounded page so the list is not silently capped below the badge
        // count / mark-all-read set (which would clear unseen rows).
        pagination: { limit: -1 },
      })
    )
    expect(result).toEqual(rows)
  })

  it("unreadCount uses documents().count so it is never page-capped", async () => {
    const { strapi, notificationApi } = buildStrapi({
      notifications: [{ documentId: "n1" }, { documentId: "n2" }],
    })
    const service = notificationService({ strapi })

    const count = await service.unreadCount("user-1")

    // Uses `count`, NOT `findMany().length` (which the default page size caps).
    expect(notificationApi.count).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { user: { documentId: "user-1" }, read: false },
      })
    )
    expect(notificationApi.findMany).not.toHaveBeenCalled()
    expect(count).toBe(2)
  })

  it("markAllRead updates every unread row to read:true and returns the count", async () => {
    const { strapi, notificationApi } = buildStrapi({
      notifications: [{ documentId: "n1" }, { documentId: "n2" }],
    })
    const service = notificationService({ strapi })

    const result = await service.markAllRead("user-1")

    // Fetches unread rows with an explicit unbounded page so no unread row is
    // left behind by the default page size.
    expect(notificationApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { user: { documentId: "user-1" }, read: false },
        pagination: { limit: -1 },
      })
    )
    expect(notificationApi.update).toHaveBeenCalledTimes(2)
    expect(notificationApi.update).toHaveBeenCalledWith({
      documentId: "n1",
      data: { read: true },
    })
    expect(result).toEqual({ updated: 2 })
  })

  it("markAllRead isolates a single row failure — logs it and still marks the rest", async () => {
    const { strapi, notificationApi, logError } = buildStrapi({
      notifications: [
        { documentId: "n1" },
        { documentId: "n2" },
        { documentId: "n3" },
      ],
      updateThrowsForDoc: "n2",
    })
    const service = notificationService({ strapi })

    const result = await service.markAllRead("user-1")

    // n2 throws but n1 and n3 are still updated; the request does not reject.
    expect(notificationApi.update).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ updated: 2 })
    expect(logError).toHaveBeenCalled()
  })
})
