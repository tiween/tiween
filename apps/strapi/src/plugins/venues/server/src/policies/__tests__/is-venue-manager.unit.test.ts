/**
 * `plugin::venues.is-venue-manager` (Story 7.2).
 *
 * This policy is the P0 tenant gate: it is the only thing standing between a
 * signed-in B2C user with a raw JWT and the venue-manager endpoints. The UI
 * check is convenience only, so every rejection branch is pinned here.
 */
import policies from "../index"
import isVenueManager from "../is-venue-manager"

function contextWith(user: unknown) {
  return { state: { user } } as any
}

/** Assert a 403 PolicyError carrying the matrix's `NOT_VENUE_MANAGER` code. */
function expectForbidden(run: () => unknown) {
  expect(run).toThrow()
  try {
    run()
  } catch (err) {
    const e = err as { name?: string; details?: { code?: string } }
    expect(e.name).toBe("PolicyError")
    expect(e.details?.code).toBe("NOT_VENUE_MANAGER")
  }
}

describe("is-venue-manager policy (unit)", () => {
  it("is registered under the name the routes reference", () => {
    // The routes declare `plugin::venues.is-venue-manager`; the key here is
    // what that string resolves against. A rename on one side alone would boot
    // fine and then 500 on every profile request.
    expect(policies["is-venue-manager"]).toBe(isVenueManager)
  })

  it("allows a user whose role type is venue-manager", () => {
    expect(
      isVenueManager(contextWith({ id: 7, role: { type: "venue-manager" } }))
    ).toBe(true)
  })

  it("rejects an authenticated user with another role type", () => {
    expectForbidden(() =>
      isVenueManager(contextWith({ id: 7, role: { type: "authenticated" } }))
    )
  })

  it("rejects when there is no user at all", () => {
    expectForbidden(() => isVenueManager(contextWith(undefined)))
    expectForbidden(() => isVenueManager({ state: {} } as any))
    expectForbidden(() => isVenueManager({} as any))
  })

  it.each([
    ["no role relation", { id: 7 }],
    ["an unpopulated role id", { id: 7, role: 3 }],
    ["a role without a type", { id: 7, role: {} }],
    ["a null role", { id: 7, role: null }],
    ["a non-string role type", { id: 7, role: { type: 42 } }],
  ])("rejects a user with %s", (_label, user) => {
    expectForbidden(() => isVenueManager(contextWith(user)))
  })

  it("does not confuse a similarly-named role type", () => {
    expectForbidden(() =>
      isVenueManager(contextWith({ id: 7, role: { type: "venue_manager" } }))
    )
    expectForbidden(() =>
      isVenueManager(contextWith({ id: 7, role: { type: "Venue-Manager" } }))
    )
  })
})
