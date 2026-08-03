import controllers from "../index"

/**
 * Unit tests for the `registration.register` controller (Story 7.1).
 *
 * The controller owns the HTTP contract the service does not:
 *  - 201 + `{ data: { venueDocumentId, status } }` on success,
 *  - error CODE → HTTP status mapping (409 duplicate, 400 validation, 500 for
 *    the operational failures),
 *  - and the security property that NO raw internal exception text ever reaches
 *    the response body — this is a public, unauthenticated endpoint, so a leaked
 *    DB/stack message would be visible to anyone.
 */

const VALID_BODY = {
  venue: {
    name: "Le Rio",
    address: "12 rue de Rome, Tunis",
    type: "cinema",
    phone: "+21671000000",
    email: "contact@rio.test",
  },
  manager: {
    firstName: "Alice",
    lastName: "Dupont",
    email: "alice@example.test",
    password: "Password1",
  },
}

function buildController(
  registerVenue: jest.Mock = jest.fn(async () => ({
    venueDocumentId: "venue-doc-1",
    status: "pending",
  }))
) {
  const service = { registerVenue }
  const strapi: any = {
    plugin: jest.fn(() => ({ service: jest.fn(() => service) })),
    log: { error: jest.fn(), warn: jest.fn() },
  }
  return {
    controller: controllers.registration({ strapi }),
    registerVenue,
    strapi,
  }
}

function ctxWith(body: unknown) {
  return {
    request: { body },
    status: 200,
    body: undefined as unknown,
  } as any
}

/** Every string in a response body, flattened — used to assert non-leakage. */
function flatten(value: unknown): string {
  return JSON.stringify(value ?? "")
}

describe("registration controller.register — success (unit)", () => {
  it("returns 201 with the service result under `data`", async () => {
    const { controller, registerVenue } = buildController()
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(ctx.status).toBe(201)
    expect(ctx.body).toEqual({
      data: { venueDocumentId: "venue-doc-1", status: "pending" },
    })
    expect(registerVenue).toHaveBeenCalledTimes(1)
  })

  it("forwards the VALIDATED (trimmed) input, not the raw body", async () => {
    const { controller, registerVenue } = buildController()
    await controller.register(
      ctxWith({
        ...VALID_BODY,
        venue: { ...VALID_BODY.venue, name: "  Le Rio  " },
      })
    )

    const input = registerVenue.mock.calls[0][0] as any
    expect(input.venue.name).toBe("Le Rio")
  })
})

describe("registration controller.register — validation (unit)", () => {
  it("returns 400 VALIDATION_FAILED and never calls the service on a bad payload", async () => {
    const { controller, registerVenue } = buildController()
    const ctx = ctxWith({
      venue: {
        name: "",
        address: "",
        type: "spaceship",
        phone: "",
        email: "x",
      },
      manager: {
        firstName: "",
        lastName: "",
        email: "nope",
        password: "short",
      },
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.error.details.code).toBe("VALIDATION_FAILED")
    expect(registerVenue).not.toHaveBeenCalled()
  })

  it("surfaces per-field SCREAMING_SNAKE issue codes, never prose", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({
      venue: { ...VALID_BODY.venue, type: "spaceship" },
      manager: VALID_BODY.manager,
    })

    await controller.register(ctx)

    const issues = ctx.body.error.details.issues as {
      path: string
      message: string
    }[]
    expect(Array.isArray(issues)).toBe(true)
    const typeIssue = issues.find((i) => i.path === "venue.type")
    expect(typeIssue?.message).toBe("VENUE_TYPE_INVALID")
    for (const issue of issues) {
      expect(issue.message).toMatch(/^[A-Z0-9_]+$/)
    }
  })

  it("rejects a weak manager password with MANAGER_PASSWORD_* codes", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({
      venue: VALID_BODY.venue,
      manager: { ...VALID_BODY.manager, password: "abc" },
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(400)
    const issues = ctx.body.error.details.issues as { message: string }[]
    expect(issues.some((i) => i.message.startsWith("MANAGER_PASSWORD"))).toBe(
      true
    )
  })

  it("treats a missing body as a validation failure, not a crash", async () => {
    const { controller } = buildController()
    const ctx = { request: {}, status: 200, body: undefined } as any

    await controller.register(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.error.details.code).toBe("VALIDATION_FAILED")
  })
})

/**
 * `website` has to be rejected here with the SAME rule the DB lifecycle applies
 * (`src/shared/website-url.ts`). Zod's `.url()` is laxer — it accepts
 * `ftp://…`, `javascript:…` and underscore hosts — and anything it lets through
 * that the lifecycle then rejects fails at venue-create time, i.e. AFTER the
 * manager account was provisioned: the compensating delete fires and the
 * applicant gets an opaque 500 no amount of correcting their input can fix.
 */
describe("registration controller.register — website matches the DB rule (unit)", () => {
  const bad = [
    "ftp://example.tn",
    "javascript:alert(1)",
    "http://sub_domain.tn",
    "http://-a.tn",
    "https://192.168.1.10",
    "https://user:pass@example.tn",
    "mailto:contact@rio.test",
  ]

  it.each(bad)("rejects %s with VENUE_WEBSITE_INVALID", async (website) => {
    const { controller, registerVenue } = buildController()
    const ctx = ctxWith({
      venue: { ...VALID_BODY.venue, website },
      manager: VALID_BODY.manager,
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(400)
    const issues = ctx.body.error.details.issues as { message: string }[]
    expect(issues.some((i) => i.message === "VENUE_WEBSITE_INVALID")).toBe(true)
    // Nothing was provisioned, so there is nothing to roll back.
    expect(registerVenue).not.toHaveBeenCalled()
  })

  const good = [
    "https://rio.test",
    "http://rio.test",
    "HTTPS://RIO.TEST",
    "https://www.rio.test:8443/salles?x=1#top",
    "https://sub-domain.rio.test/café",
  ]

  it.each(good)("accepts %s", async (website) => {
    const { controller, registerVenue } = buildController()
    const ctx = ctxWith({
      venue: { ...VALID_BODY.venue, website },
      manager: VALID_BODY.manager,
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(201)
    expect(registerVenue).toHaveBeenCalledTimes(1)
  })

  it("treats a blank website as absent, not as a validation failure", async () => {
    const { controller, registerVenue } = buildController()
    const ctx = ctxWith({
      venue: { ...VALID_BODY.venue, website: "   " },
      manager: VALID_BODY.manager,
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(201)
    expect(registerVenue.mock.calls[0][0].venue.website).toBeUndefined()
  })
})

/**
 * bcrypt truncates at 72 BYTES. A character-only cap lets a multi-byte password
 * exceed it, and every password sharing its first 72 bytes hashes identically.
 */
describe("registration controller.register — password byte cap (unit)", () => {
  it("rejects a password that is <= 72 CHARACTERS but > 72 BYTES", async () => {
    // 40 × "é" (2 bytes each) = 80 bytes, 40 characters — under any char cap.
    const password = `Aa1${"é".repeat(40)}`
    expect(password.length).toBeLessThanOrEqual(72)
    expect(new TextEncoder().encode(password).length).toBeGreaterThan(72)

    const { controller, registerVenue } = buildController()
    const ctx = ctxWith({
      venue: VALID_BODY.venue,
      manager: { ...VALID_BODY.manager, password },
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(400)
    const issues = ctx.body.error.details.issues as { message: string }[]
    expect(issues.some((i) => i.message === "MANAGER_PASSWORD_TOO_LONG")).toBe(
      true
    )
    expect(registerVenue).not.toHaveBeenCalled()
  })

  it("accepts a 72-BYTE multi-byte password", async () => {
    const password = `Aa1${"é".repeat(34)}` // 3 + 68 = 71 bytes
    expect(new TextEncoder().encode(password).length).toBeLessThanOrEqual(72)

    const { controller } = buildController()
    const ctx = ctxWith({
      venue: VALID_BODY.venue,
      manager: { ...VALID_BODY.manager, password },
    })

    await controller.register(ctx)

    expect(ctx.status).toBe(201)
  })
})

describe("registration controller.register — code → status mapping (unit)", () => {
  const cases: [string, number][] = [
    ["EMAIL_ALREADY_REGISTERED", 409],
    ["VENUE_MANAGER_ROLE_MISSING", 500],
    ["VENUE_REGISTRATION_FAILED", 500],
  ]

  it.each(cases)("maps %s to HTTP %i", async (code, status) => {
    const { controller } = buildController(
      jest.fn(async () => {
        throw Object.assign(new Error("internal detail"), { code })
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(ctx.status).toBe(status)
    expect(ctx.body.error.details.code).toBe(code)
  })

  it("maps an UNKNOWN code to 500 INTERNAL_ERROR (never echoes the code)", async () => {
    const { controller } = buildController(
      jest.fn(async () => {
        throw Object.assign(new Error("boom"), { code: "SOME_INTERNAL_THING" })
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(flatten(ctx.body)).not.toContain("SOME_INTERNAL_THING")
  })

  it("maps a bare Error (no code) to 500 INTERNAL_ERROR", async () => {
    const { controller } = buildController(
      jest.fn(async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:5432")
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
  })
})

/**
 * Collapsing an unmapped error to 500 INTERNAL_ERROR is right for the CLIENT
 * and wrong for the operator: without a server-side log a lost race on the
 * users unique index, or any driver failure, leaves no trace on either side and
 * is undiagnosable. And whatever the error carried in `details.issues` must not
 * ride out alongside a code we deliberately refused to disclose.
 */
describe("registration controller.register — unmapped errors are logged (unit)", () => {
  it("logs an unmapped CODE server-side while still collapsing it for the client", async () => {
    const { controller, strapi } = buildController(
      jest.fn(async () => {
        throw Object.assign(new Error("boom"), { code: "SOME_INTERNAL_THING" })
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(strapi.log.error).toHaveBeenCalledTimes(1)
    // The trace has to name the swallowed code, otherwise the log is as
    // uninformative as the response.
    expect(String(strapi.log.error.mock.calls[0][0])).toContain(
      "SOME_INTERNAL_THING"
    )
  })

  it("logs a bare Error with no code", async () => {
    const { controller, strapi } = buildController(
      jest.fn(async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:5432")
      })
    )

    await controller.register(ctxWith(VALID_BODY))

    expect(strapi.log.error).toHaveBeenCalledTimes(1)
    expect(String(strapi.log.error.mock.calls[0][0])).toContain("ECONNREFUSED")
  })

  it("does NOT log a MAPPED error (the code already tells the whole story)", async () => {
    const { controller, strapi } = buildController(
      jest.fn(async () => {
        throw Object.assign(new Error("dup"), {
          code: "EMAIL_ALREADY_REGISTERED",
        })
      })
    )

    await controller.register(ctxWith(VALID_BODY))

    expect(strapi.log.error).not.toHaveBeenCalled()
  })

  it("withholds details.issues when the code itself was withheld", async () => {
    const { controller } = buildController(
      jest.fn(async () => {
        throw Object.assign(new Error("boom"), {
          code: "SOME_INTERNAL_THING",
          details: {
            code: "SOME_INTERNAL_THING",
            issues: [{ path: "venue.name", message: "SECRET_INTERNAL_CODE" }],
          },
        })
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(ctx.body.error.details.issues).toBeUndefined()
    expect(flatten(ctx.body)).not.toContain("SECRET_INTERNAL_CODE")
  })

  it("still forwards details.issues for a MAPPED code (the form needs them)", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({
      venue: { ...VALID_BODY.venue, type: "spaceship" },
      manager: VALID_BODY.manager,
    })

    await controller.register(ctx)

    expect(ctx.body.error.details.code).toBe("VALIDATION_FAILED")
    expect(Array.isArray(ctx.body.error.details.issues)).toBe(true)
  })
})

describe("registration controller.register — no internal leakage (unit)", () => {
  it("never puts the raw exception message in the response", async () => {
    const { controller } = buildController(
      jest.fn(async () => {
        throw Object.assign(
          new Error('insert into "venues" failed: duplicate key value'),
          { code: "VENUE_REGISTRATION_FAILED" }
        )
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    const serialized = flatten(ctx.body)
    expect(serialized).not.toContain("duplicate key value")
    expect(serialized).not.toContain("insert into")
    expect(ctx.body.error.message).toBe("Venue registration failed")
  })

  it("never leaks a stack trace", async () => {
    const { controller } = buildController(
      jest.fn(async () => {
        throw new Error("boom")
      })
    )
    const ctx = ctxWith(VALID_BODY)

    await controller.register(ctx)

    expect(flatten(ctx.body)).not.toContain("at Object.")
  })
})
