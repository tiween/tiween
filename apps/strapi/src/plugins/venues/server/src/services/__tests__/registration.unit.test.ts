import registrationService from "../registration"

/**
 * Unit tests for the venues `registration` service (Story 7.1), covering every
 * BACKEND row of the spec's I/O matrix with a mocked Strapi — no DB, no boot.
 *
 * The branches here are otherwise unverifiable without a live database, and
 * they are the ones that matter most: the compensating delete (the only
 * atomicity guarantee across two stores), the blocked-user invariant (login is
 * refused until an admin approves), and the two email sends being strictly
 * non-blocking.
 */

const VENUE_UID = "plugin::venues.venue"
const ROLE_UID = "plugin::users-permissions.role"
const USER_UID = "plugin::users-permissions.user"

const VALID_INPUT = {
  venue: {
    name: "Le Rio",
    description: "Cinéma d'art et d'essai",
    address: "12 rue de Rome, Tunis",
    type: "cinema" as const,
    phone: "+21671000000",
    email: "contact@rio.test",
    website: "https://rio.test",
    capacity: 220,
    geo: { latitude: 36.8, longitude: 10.18 },
    logo: 7,
    images: [8, 9],
  },
  manager: {
    firstName: "Alice",
    lastName: "Dupont",
    email: "Alice@Example.TEST",
    password: "Password1",
    preferredLanguage: "fr" as const,
  },
}

interface HarnessOptions {
  /** Existing users-permissions user matched by the duplicate guard. */
  existingUser?: unknown
  /** `venue-manager` role row; `null` simulates the missing-role case. */
  role?: unknown
  /** Make the Document Service `create` reject. */
  createThrows?: boolean
  /** Make `user.add` reject with this exact error (unique-collision cases). */
  addThrows?: unknown
  /** Make the compensating `user.remove` reject too. */
  removeThrows?: boolean
  /** Make `email.send` reject on every call. */
  emailThrows?: boolean
  /** Value of ADMIN_NOTIFICATION_EMAIL for the run. */
  adminEmail?: string
}

function buildHarness(options: HarnessOptions = {}) {
  const {
    existingUser = null,
    role = { id: 3, type: "venue-manager" },
    createThrows = false,
    removeThrows = false,
    emailThrows = false,
    addThrows,
  } = options

  const create = jest.fn(async () => ({ documentId: "venue-doc-1" }))
  const documents = jest.fn(() => ({
    create: createThrows
      ? jest.fn(async () => {
          throw new Error("db exploded: column x does not exist")
        })
      : create,
  }))

  const add = jest.fn(async () => {
    if (addThrows) throw addThrows
    return { id: 42, email: "alice@example.test" }
  })
  const remove = removeThrows
    ? jest.fn(async () => {
        throw new Error("remove failed")
      })
    : jest.fn(async () => ({ id: 42 }))

  const send = emailThrows
    ? jest.fn(async () => {
        throw new Error("brevo down")
      })
    : jest.fn(async () => ({}))

  // Stable per-UID mocks so a test can assert the actual `where` clause.
  const userFindOne = jest.fn(async () => existingUser)
  const roleFindOne = jest.fn(async () => role)
  const otherFindOne = jest.fn(async () => null as unknown)
  const query = jest.fn((uid: string) => ({
    findOne:
      uid === USER_UID
        ? userFindOne
        : uid === ROLE_UID
          ? roleFindOne
          : otherFindOne,
  }))

  const strapi: any = {
    documents,
    query,
    plugins: {
      "users-permissions": { services: { user: { add, remove } } },
      email: { services: { email: { send } } },
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return {
    service: registrationService({ strapi }),
    strapi,
    mocks: {
      create,
      add,
      remove,
      send,
      documents,
      query,
      userFindOne,
      roleFindOne,
    },
  }
}

const ORIGINAL_ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL

beforeEach(() => {
  process.env.ADMIN_NOTIFICATION_EMAIL = "admin@tiween.test"
})

afterEach(() => {
  if (ORIGINAL_ADMIN_EMAIL === undefined) {
    delete process.env.ADMIN_NOTIFICATION_EMAIL
  } else {
    process.env.ADMIN_NOTIFICATION_EMAIL = ORIGINAL_ADMIN_EMAIL
  }
})

describe("registration.registerVenue — happy path (unit)", () => {
  it("returns the created venue documentId and a pending status", async () => {
    const { service } = buildHarness()

    await expect(service.registerVenue(VALID_INPUT)).resolves.toEqual({
      venueDocumentId: "venue-doc-1",
      status: "pending",
    })
  })

  it("creates the manager through users-permissions as a BLOCKED, confirmed venue-manager", async () => {
    const { service, mocks } = buildHarness()

    await service.registerVenue(VALID_INPUT)

    expect(mocks.add).toHaveBeenCalledTimes(1)
    const payload = mocks.add.mock.calls[0][0] as Record<string, unknown>
    expect(payload).toMatchObject({
      // Blocked is the whole approval gate: users-permissions refuses login for
      // a blocked user, so the account confers nothing until an admin unblocks.
      blocked: true,
      confirmed: true,
      provider: "local",
      role: 3,
      firstName: "Alice",
      lastName: "Dupont",
      preferredLanguage: "fr",
    })
    // The email is normalized to lower case and doubles as the username.
    expect(payload.email).toBe("alice@example.test")
    expect(payload.username).toBe("alice@example.test")
    // The raw password is handed to `user.add`, which hashes it — the service
    // must never hash or store it itself.
    expect(payload.password).toBe("Password1")
  })

  it("looks the role up by the hyphenated `venue-manager` type", async () => {
    const { service, mocks } = buildHarness()

    await service.registerVenue(VALID_INPUT)

    expect(mocks.query).toHaveBeenCalledWith(ROLE_UID)
    // Hyphenated, NOT the seed script's `venue_manager` typo.
    expect(mocks.roleFindOne).toHaveBeenCalledWith({
      where: { type: "venue-manager" },
    })
  })

  it("creates the venue as a pending DRAFT linked to the new user", async () => {
    const { service, mocks } = buildHarness()

    await service.registerVenue(VALID_INPUT)

    expect(mocks.documents).toHaveBeenCalledWith(VENUE_UID)
    const { data } = mocks.create.mock.calls[0][0] as { data: any }
    expect(data).toMatchObject({
      name: "Le Rio",
      address: "12 rue de Rome, Tunis",
      type: "cinema",
      phone: "+21671000000",
      email: "contact@rio.test",
      website: "https://rio.test",
      capacity: 220,
      logo: 7,
      images: [8, 9],
      status: "pending",
      manager: 42,
    })
    // No `status: "published"` publish flag is passed anywhere in the call, so
    // the document stays a draft and can never surface in a public listing.
    expect(JSON.stringify(mocks.create.mock.calls[0][0])).not.toContain(
      "published"
    )
  })

  it("sends exactly one applicant email and one admin email", async () => {
    const { service, mocks } = buildHarness()

    await service.registerVenue(VALID_INPUT)

    expect(mocks.send).toHaveBeenCalledTimes(2)
    const recipients = mocks.send.mock.calls.map(
      (c) => (c[0] as { to: string }).to
    )
    expect(recipients).toEqual(["alice@example.test", "admin@tiween.test"])
  })
})

describe("registration.registerVenue — error matrix (unit)", () => {
  it("rejects a duplicate applicant email WITHOUT creating anything", async () => {
    const { service, mocks } = buildHarness({
      existingUser: { id: 1, email: "alice@example.test" },
    })

    await expect(service.registerVenue(VALID_INPUT)).rejects.toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
    })
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("matches the duplicate guard case-insensitively on BOTH email and username", async () => {
    const { service, mocks } = buildHarness({ existingUser: { id: 1 } })

    await expect(service.registerVenue(VALID_INPUT)).rejects.toBeDefined()

    // `Alice@Example.TEST` must not be able to shadow `alice@example.test`:
    // the lookup is `$eqi` on the lowercased address. `username` is checked too
    // because the service writes `username: email`, and that column has its own
    // UNIQUE index — guarding on `email` alone would let the insert collide and
    // surface as a 500 instead of the specified 409.
    expect(mocks.userFindOne).toHaveBeenCalledWith({
      where: {
        $or: [
          { email: { $eqi: "alice@example.test" } },
          { username: { $eqi: "alice@example.test" } },
        ],
      },
    })
  })

  /**
   * The guard and `user.add` are not atomic: two concurrent submissions for the
   * same address both pass the guard and the loser collides on the UNIQUE
   * index. That is semantically a duplicate (409), not an internal fault (500).
   */
  it.each([
    [
      "a Postgres SQLSTATE 23505",
      Object.assign(new Error("insert failed"), {
        code: "23505",
      }),
    ],
    [
      "a SQLite unique-constraint message",
      new Error("UNIQUE constraint failed: up_users.username"),
    ],
    [
      "users-permissions' own 'Email already taken'",
      new Error("Email already taken"),
    ],
  ])(
    "maps %s from user.add to EMAIL_ALREADY_REGISTERED",
    async (_label, thrown) => {
      const { service, mocks } = buildHarness({ addThrows: thrown })

      await expect(service.registerVenue(VALID_INPUT)).rejects.toMatchObject({
        code: "EMAIL_ALREADY_REGISTERED",
      })
      // Nothing downstream ran: no venue, no emails.
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.send).not.toHaveBeenCalled()
    }
  )

  it("maps any OTHER user.add failure to VENUE_REGISTRATION_FAILED, logged, without leaking the message", async () => {
    const { service, mocks, strapi } = buildHarness({
      addThrows: new Error("ECONNREFUSED 127.0.0.1:5432"),
    })

    const err = await service.registerVenue(VALID_INPUT).catch((e) => e)

    expect(err.code).toBe("VENUE_REGISTRATION_FAILED")
    expect(err.message).not.toContain("ECONNREFUSED")
    // A P7-class failure must leave a server-side trace.
    expect(strapi.log.error).toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("fails with VENUE_MANAGER_ROLE_MISSING (and creates no user) when the role is absent", async () => {
    const { service, mocks, strapi } = buildHarness({ role: null })

    await expect(service.registerVenue(VALID_INPUT)).rejects.toMatchObject({
      code: "VENUE_MANAGER_ROLE_MISSING",
    })
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(strapi.log.error).toHaveBeenCalled()
  })

  it("deletes the created user when venue creation fails, and hides the internal error", async () => {
    const { service, mocks, strapi } = buildHarness({ createThrows: true })

    const err = await service.registerVenue(VALID_INPUT).catch((e) => e)

    expect(err.code).toBe("VENUE_REGISTRATION_FAILED")
    // The internal exception text must never ride out on the thrown error.
    expect(err.message).not.toContain("column x does not exist")
    // Compensating delete — the only atomicity guarantee across the two stores.
    expect(mocks.remove).toHaveBeenCalledWith({ id: 42 })
    expect(strapi.log.error).toHaveBeenCalled()
    // No email is sent for a failed registration.
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("still surfaces VENUE_REGISTRATION_FAILED when the compensating delete itself fails", async () => {
    const { service, strapi } = buildHarness({
      createThrows: true,
      removeThrows: true,
    })

    await expect(service.registerVenue(VALID_INPUT)).rejects.toMatchObject({
      code: "VENUE_REGISTRATION_FAILED",
    })
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("registration.registerVenue — non-blocking notifications (unit)", () => {
  it("succeeds with 'pending' even when BOTH email sends reject", async () => {
    const { service, strapi, mocks } = buildHarness({ emailThrows: true })

    await expect(service.registerVenue(VALID_INPUT)).resolves.toEqual({
      venueDocumentId: "venue-doc-1",
      status: "pending",
    })
    expect(mocks.send).toHaveBeenCalledTimes(2)
    expect(strapi.log.error).toHaveBeenCalledTimes(2)
  })

  it("skips the admin email with a warning when ADMIN_NOTIFICATION_EMAIL is unset", async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL
    const { service, strapi, mocks } = buildHarness()

    await expect(service.registerVenue(VALID_INPUT)).resolves.toMatchObject({
      status: "pending",
    })
    // Only the applicant confirmation went out.
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(strapi.log.warn).toHaveBeenCalledTimes(1)
  })

  it("skips the admin email when ADMIN_NOTIFICATION_EMAIL is blank", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "   "
    const { service, strapi, mocks } = buildHarness()

    await service.registerVenue(VALID_INPUT)

    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(strapi.log.warn).toHaveBeenCalledTimes(1)
  })

  it("localizes the applicant email from preferredLanguage (ar) and defaults to fr when absent", async () => {
    const arHarness = buildHarness()
    await arHarness.service.registerVenue({
      ...VALID_INPUT,
      manager: { ...VALID_INPUT.manager, preferredLanguage: "ar" as const },
    })
    const arSubject = (
      arHarness.mocks.send.mock.calls[0][0] as { subject: string }
    ).subject

    const defaultHarness = buildHarness()
    await defaultHarness.service.registerVenue({
      ...VALID_INPUT,
      manager: {
        firstName: "Alice",
        lastName: "Dupont",
        email: "alice@example.test",
        password: "Password1",
      },
    })
    const defaultSubject = (
      defaultHarness.mocks.send.mock.calls[0][0] as { subject: string }
    ).subject

    expect(arSubject).not.toBe(defaultSubject)
    // The fr fallback is the operational default for an unspecified language.
    expect(defaultSubject).toContain("Demande d'inscription")
  })
})
