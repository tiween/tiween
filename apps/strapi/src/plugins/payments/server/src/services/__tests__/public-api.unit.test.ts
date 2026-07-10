import publicApiService, { tndToMillimes } from "../public-api"

/**
 * Unit tests for the payments `public-api` facade (Story 6.3). Verifies the
 * millimes conversion, config-built webhook URL, same-origin redirect guard,
 * method mapping, and status delegation. `konnect-client` + `status-mapping`
 * are mocked.
 */

const CONFIG: Record<string, unknown> = {
  "plugin::payments.clientBaseUrl": "https://tiween.example",
  "plugin::payments.currencyToken": "TND",
  "plugin::payments.konnectMethods": {
    card: ["bank_card"],
    "e-dinar": ["e-DINAR"],
    sobflous: ["wallet"],
  },
  "server.url": "https://api.tiween.example",
}

function buildStrapi(
  overrides: {
    initPayment?: jest.Mock
    getPaymentDetails?: jest.Mock
    toInternalStatus?: jest.Mock
  } = {}
) {
  const initPayment =
    overrides.initPayment ??
    jest.fn(async () => ({ payUrl: "https://pay/x", paymentRef: "ref-1" }))
  const getPaymentDetails =
    overrides.getPaymentDetails ??
    jest.fn(async () => ({
      status: "completed",
      orderId: "TW-1",
      amount: 70000,
      paymentRef: "ref-1",
    }))
  const toInternalStatus =
    overrides.toInternalStatus ??
    jest.fn((s: string) => (s === "completed" ? "paid" : "pending"))

  const strapi: any = {
    plugin: jest.fn(() => ({
      service: (svc: string) =>
        svc === "konnect-client"
          ? { initPayment, getPaymentDetails }
          : { toInternalStatus },
    })),
    config: {
      get: jest.fn((key: string, fallback: unknown) =>
        key in CONFIG ? CONFIG[key] : fallback
      ),
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, initPayment, getPaymentDetails, toInternalStatus }
}

describe("tndToMillimes", () => {
  it("converts TND decimals to millimes (3-decimal)", () => {
    expect(tndToMillimes(70)).toBe(70000)
    expect(tndToMillimes(12.5)).toBe(12500)
    expect(tndToMillimes(0.1)).toBe(100)
  })
})

describe("public-api.initPayment", () => {
  it("converts to millimes, maps methods, builds webhook + keeps same-origin redirect", async () => {
    const deps = buildStrapi()
    const service = publicApiService({ strapi: deps.strapi })

    const result = await service.initPayment({
      orderNumber: "TW-1",
      amountTND: 70,
      currency: "TND",
      methods: ["card"],
      customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      successUrl:
        "https://tiween.example/fr/tickets/e/s/payment/result?order=TW-1&status=success",
      failUrl:
        "https://tiween.example/fr/tickets/e/s/payment/result?order=TW-1&status=fail",
    })

    expect(result).toEqual({ payUrl: "https://pay/x", paymentRef: "ref-1" })
    expect(deps.initPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMillimes: 70000,
        token: "TND",
        acceptedPaymentMethods: ["bank_card"],
        orderId: "TW-1",
        webhook: "https://api.tiween.example/api/payments/konnect/webhook",
        successUrl:
          "https://tiween.example/fr/tickets/e/s/payment/result?order=TW-1&status=success",
      })
    )
  })

  it("rejects a cross-origin redirect and falls back to the config base (open-redirect safety)", async () => {
    const deps = buildStrapi()
    const service = publicApiService({ strapi: deps.strapi })

    await service.initPayment({
      orderNumber: "TW-1",
      amountTND: 10,
      currency: "TND",
      methods: ["sobflous"],
      customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      successUrl: "https://evil.example/steal",
      failUrl: "https://evil.example/steal",
    })

    expect(deps.initPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptedPaymentMethods: ["wallet"],
        successUrl: "https://tiween.example",
        failUrl: "https://tiween.example",
      })
    )
  })
})

describe("public-api.getPaymentStatus", () => {
  it("re-queries Konnect and maps the authoritative status", async () => {
    const deps = buildStrapi()
    const service = publicApiService({ strapi: deps.strapi })

    const result = await service.getPaymentStatus("ref-1")

    expect(deps.getPaymentDetails).toHaveBeenCalledWith("ref-1")
    expect(result).toEqual({
      status: "paid",
      orderId: "TW-1",
      paymentRef: "ref-1",
    })
  })
})
