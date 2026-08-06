/**
 * Story 4.7 regression guard: the users-permissions extension's auth overrides
 * must SURVIVE FACTORY INSTANTIATION.
 *
 * Upstream `@strapi/plugin-users-permissions` exports the `auth` controller as
 * a FACTORY (`({ strapi }) => ({...handlers})`), while `user` is a plain
 * object. The pre-4.7 extension assigned its six overrides onto the factory
 * FUNCTION object; Strapi then called the factory at boot and none of the
 * overrides existed on the instantiated controller — six silently-inert
 * handlers and a "Handler not found" boot failure for the two appended routes.
 *
 * These tests pin the wiring itself, in all three relevant configurations:
 *  1. a factory-shaped double (the current upstream shape),
 *  2. a plain-object double (a possible future upstream shape),
 *  3. the REAL upstream export, so an upstream shape change is caught here.
 */
import extension from "./strapi-server"

const OVERRIDDEN_HANDLERS = [
  "register",
  "callback",
  "forgotPassword",
  "resetPassword",
  "changeEmail",
  "confirmEmailChange",
] as const

type AnyRecord = Record<string, unknown>
type Factory = (deps: { strapi: unknown }) => AnyRecord

function stockHandlers() {
  return {
    register: jest.fn(async () => undefined),
    callback: jest.fn(async () => undefined),
    forgotPassword: jest.fn(async () => undefined),
    resetPassword: jest.fn(async () => undefined),
    // Stock handlers the extension does NOT override — must pass through.
    changePassword: jest.fn(async () => undefined),
    emailConfirmation: jest.fn(async () => undefined),
  }
}

describe("users-permissions auth factory wiring (Story 4.7 regression guard)", () => {
  beforeEach(() => {
    ;(global as any).strapi = { log: { error: jest.fn(), warn: jest.fn() } }
  })
  afterEach(() => {
    delete (global as any).strapi
  })

  it("factory-shaped export: all six overrides are own functions on the INSTANTIATED controller", () => {
    const stock = stockHandlers()
    const plugin = {
      controllers: {
        auth: ({ strapi: _strapi }: { strapi: unknown }) => ({ ...stock }),
      },
    }

    const wrapped = extension(plugin as any)

    // The extension must keep the factory shape (Strapi will call it at boot)…
    expect(typeof wrapped.controllers.auth).toBe("function")

    // …and the overrides must exist on the object the factory PRODUCES.
    const instantiated = (wrapped.controllers.auth as unknown as Factory)({
      strapi: (global as any).strapi,
    })

    for (const handler of OVERRIDDEN_HANDLERS) {
      expect(Object.prototype.hasOwnProperty.call(instantiated, handler)).toBe(
        true
      )
      expect(typeof instantiated[handler]).toBe("function")
      // Each override must REPLACE the stock handler, not alias it.
      expect(instantiated[handler]).not.toBe((stock as AnyRecord)[handler])
    }

    // Non-overridden stock handlers pass through unchanged.
    expect(instantiated.changePassword).toBe(stock.changePassword)
    expect(instantiated.emailConfirmation).toBe(stock.emailConfirmation)
  })

  it("factory-shaped export: overrides close over the INSTANTIATED originals (delegation works)", async () => {
    const stock = stockHandlers()
    // The stock register sets ctx.body like the real one, so the override's
    // post-delegation steps run against a realistic response.
    stock.register.mockImplementation(async (ctx: any) => {
      ctx.body = { jwt: "jwt", user: { id: 1, email: "a@b.test" } }
    })
    const userEdit = jest.fn(async () => undefined)
    ;(global as any).strapi = {
      plugin: jest.fn(() => ({ service: jest.fn(() => ({ edit: userEdit })) })),
      plugins: {
        email: {
          services: { email: { send: jest.fn(async () => undefined) } },
        },
      },
      log: { error: jest.fn(), warn: jest.fn() },
    }

    const plugin = {
      controllers: { auth: () => ({ ...stock }) },
    }
    const wrapped = extension(plugin as any)
    const instantiated = (wrapped.controllers.auth as unknown as Factory)({
      strapi: (global as any).strapi,
    })

    const ctx = {
      request: {
        body: {
          email: "a@b.test",
          password: "Password1",
          firstName: "Ada",
        },
      },
    }
    await (instantiated.register as (c: unknown) => Promise<unknown>)(ctx)

    // Pre-4.7, `originalRegister` was read off the factory function object,
    // resolved to `undefined`, and delegation was impossible. Now the override
    // must have delegated to the INSTANTIATED stock register exactly once.
    expect(stock.register).toHaveBeenCalledTimes(1)
  })

  it("object-shaped export (possible future upstream shape): overrides are applied directly", () => {
    const stock = stockHandlers()
    const plugin = { controllers: { auth: { ...stock } } }

    const wrapped = extension(plugin as any)

    expect(typeof wrapped.controllers.auth).toBe("object")
    const auth = wrapped.controllers.auth as AnyRecord
    for (const handler of OVERRIDDEN_HANDLERS) {
      expect(typeof auth[handler]).toBe("function")
      expect(auth[handler]).not.toBe((stock as AnyRecord)[handler])
    }
    expect(auth.changePassword).toBe(stock.changePassword)
  })

  it("REAL upstream export: wrapping @strapi/plugin-users-permissions auth survives instantiation", () => {
    // The package's `exports` map only exposes ./strapi-server, so resolve the
    // controller file relative to the package root instead of via a subpath.

    const path = require("path")
    const packageRoot = path.dirname(
      require.resolve("@strapi/plugin-users-permissions/package.json")
    )

    const realAuthExport = require(
      path.join(packageRoot, "server", "controllers", "auth.js")
    )

    // Pin the upstream shape this fix is built around — if upstream changes
    // it, this fails loudly instead of the extension silently no-opping.
    expect(typeof realAuthExport).toBe("function")

    const realInstantiated = realAuthExport({ strapi: {} }) as AnyRecord
    expect(typeof realInstantiated.register).toBe("function")
    expect(typeof realInstantiated.callback).toBe("function")
    expect(typeof realInstantiated.resetPassword).toBe("function")

    const plugin = { controllers: { auth: realAuthExport } }
    const wrapped = extension(plugin as any)
    expect(typeof wrapped.controllers.auth).toBe("function")

    const instantiated = (wrapped.controllers.auth as unknown as Factory)({
      strapi: {},
    })
    for (const handler of OVERRIDDEN_HANDLERS) {
      expect(Object.prototype.hasOwnProperty.call(instantiated, handler)).toBe(
        true
      )
      expect(typeof instantiated[handler]).toBe("function")
    }
    // The overrides differ from the stock instantiated handlers (they wrap them).
    expect(instantiated.register).not.toBe(realInstantiated.register)
    expect(instantiated.callback).not.toBe(realInstantiated.callback)
  })

  it("every registered content-api route resolves to a handler on the wrapped controllers ('Handler not found' guard)", () => {
    // The exact defect class behind the pre-4.7 boot failure: a route string
    // (`auth.<name>` / `user.<name>`) whose handler does not exist on the
    // controller Strapi actually instantiates. That mismatch only surfaces at
    // real boot — which is opt-in — so pin it here in the default unit gate:
    // run the extension over a factory-shaped double carrying a routes array,
    // then resolve EVERY `auth.*` / `user.*` route handler against the
    // INSTANTIATED wrapped controllers.
    const stock = stockHandlers()
    const plugin = {
      controllers: {
        auth: ({ strapi: _strapi }: { strapi: unknown }) => ({ ...stock }),
        user: {},
      },
      routes: {
        "content-api": {
          // Seed the stock routes whose handlers live on `auth`/`user`; the
          // extension unshifts/appends its own three routes into this array.
          routes: [
            {
              method: "POST",
              path: "/auth/local/register",
              handler: "auth.register",
            },
            {
              method: "GET",
              path: "/auth/:provider/callback",
              handler: "auth.callback",
            },
            {
              method: "POST",
              path: "/auth/forgot-password",
              handler: "auth.forgotPassword",
            },
            {
              method: "POST",
              path: "/auth/reset-password",
              handler: "auth.resetPassword",
            },
            {
              method: "POST",
              path: "/auth/change-password",
              handler: "auth.changePassword",
            },
          ] as Array<{ method: string; path: string; handler: string }>,
        },
      },
    }

    const wrapped = extension(plugin as any)
    const instantiated = (wrapped.controllers.auth as unknown as Factory)({
      strapi: (global as any).strapi,
    })
    const controllersByName: Record<string, AnyRecord> = {
      auth: instantiated,
      user: (wrapped.controllers as AnyRecord).user as AnyRecord,
    }

    const routes = (
      plugin.routes["content-api"] as { routes: Array<{ handler: string }> }
    ).routes
    // The extension's own routes must be present among what we check.
    const handlers = routes.map((r) => r.handler)
    expect(handlers).toEqual(
      expect.arrayContaining([
        "user.updateMe",
        "auth.changeEmail",
        "auth.confirmEmailChange",
      ])
    )

    for (const route of routes) {
      const [controllerName, actionName] = route.handler.split(".")
      const controller = controllersByName[controllerName]
      // Fail with the offending handler string in the assertion message.
      expect(`${route.handler}:${typeof controller?.[actionName]}`).toBe(
        `${route.handler}:function`
      )
    }
  })
})
