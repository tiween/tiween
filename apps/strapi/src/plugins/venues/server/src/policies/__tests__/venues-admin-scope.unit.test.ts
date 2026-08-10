/**
 * `plugin::venues.venues-admin-scope` (Story 2D.2).
 *
 * This policy is half the tenant boundary AC 7 pins server-side, so the cases
 * that matter are the ones where it could FAIL OPEN: an ability that is absent,
 * that is not a function, or that throws must all resolve to "no manage-all".
 */
import policies from "../index"
import venuesAdminScope, {
  MANAGE_ALL_VENUES_ACTION,
  VENUE_ADMIN_SCOPE_KEY,
} from "../venues-admin-scope"

function contextWith(user: unknown, userAbility?: unknown) {
  return { state: { user, userAbility } } as any
}

/** An ability that grants exactly `granted`. */
function abilityGranting(...granted: string[]) {
  return { can: (action: string) => granted.includes(action) }
}

describe("venues-admin-scope policy (unit)", () => {
  it("is exported under the key the routes reference", () => {
    expect(policies["venues-admin-scope"]).toBe(venuesAdminScope)
  })

  it("resolves manage-all from the admin ability and stashes the scope on ctx.state", () => {
    const ctx = contextWith(
      { id: 1, email: "Admin@Tiween.tn" },
      abilityGranting(MANAGE_ALL_VENUES_ACTION)
    )

    expect(venuesAdminScope(ctx)).toBe(true)
    expect(ctx.state[VENUE_ADMIN_SCOPE_KEY]).toEqual({
      canManageAll: true,
      email: "Admin@Tiween.tn",
    })
  })

  it("resolves canManageAll=false for an ability without the action", () => {
    const ctx = contextWith(
      { id: 2, email: "manager@example.com" },
      abilityGranting("plugin::venues.read")
    )

    venuesAdminScope(ctx)

    expect(ctx.state[VENUE_ADMIN_SCOPE_KEY]).toEqual({
      canManageAll: false,
      email: "manager@example.com",
    })
  })

  it.each([
    ["absent", undefined],
    ["not an ability", { can: "nope" }],
    [
      "throwing",
      {
        can: () => {
          throw new Error("casl exploded")
        },
      },
    ],
  ])("fails closed when the ability is %s", (_label, ability) => {
    const ctx = contextWith({ id: 3, email: "x@example.com" }, ability)

    venuesAdminScope(ctx)

    expect(ctx.state[VENUE_ADMIN_SCOPE_KEY].canManageAll).toBe(false)
  })

  it("leaves `email` undefined when the admin account has none", () => {
    const ctx = contextWith({ id: 4, email: "   " }, abilityGranting())

    venuesAdminScope(ctx)

    expect(ctx.state[VENUE_ADMIN_SCOPE_KEY].email).toBeUndefined()
  })

  it("throws a coded 403 rather than a bare false when there is no user", () => {
    expect(() => venuesAdminScope(contextWith(undefined))).toThrow()

    try {
      venuesAdminScope(contextWith(undefined))
    } catch (err) {
      expect((err as { details?: { code?: string } }).details?.code).toBe(
        "NOT_AUTHENTICATED"
      )
    }
  })
})
