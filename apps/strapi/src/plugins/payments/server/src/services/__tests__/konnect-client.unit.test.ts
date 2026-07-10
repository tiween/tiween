import konnectClientService, {
  KONNECT_INIT_FAILED,
  KONNECT_UNAVAILABLE,
} from "../konnect-client"

/**
 * Unit tests for the low-level Konnect client (Story 6.3). `fetch` is mocked;
 * verifies the millimes body + x-api-key header, response parsing, and the
 * transport/HTTP error -> CODE mapping.
 */

const CONFIG: Record<string, unknown> = {
  "plugin::payments.apiBaseUrl": "https://konnect.test/api/v2",
  "plugin::payments.apiKey": "test-key",
  "plugin::payments.walletId": "wallet-1",
  "plugin::payments.lifespan": 10,
  "plugin::payments.theme": "light",
  "plugin::payments.timeoutMs": 4500,
}

function buildStrapi() {
  return {
    config: {
      get: jest.fn((key: string, fallback: unknown) =>
        key in CONFIG ? CONFIG[key] : fallback
      ),
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  } as any
}

const baseInitParams = {
  amountMillimes: 70000,
  token: "TND",
  acceptedPaymentMethods: ["bank_card"],
  orderId: "TW-1",
  description: "Tiween order TW-1",
  firstName: "A",
  lastName: "B",
  email: "a@b.co",
  webhook: "https://api.test/api/payments/konnect/webhook",
  successUrl: "https://client.test/ok",
  failUrl: "https://client.test/ko",
}

afterEach(() => {
  jest.restoreAllMocks()
  delete process.env.KONNECT_API_KEY
  delete process.env.KONNECT_WALLET_ID
})

describe("konnect-client.initPayment", () => {
  it("sends millimes + x-api-key and returns payUrl/paymentRef", async () => {
    const fetchMock = jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ payUrl: "https://pay/x", paymentRef: "ref-1" }),
    } as any)

    const service = konnectClientService({ strapi: buildStrapi() })
    const result = await service.initPayment(baseInitParams)

    expect(result).toEqual({ payUrl: "https://pay/x", paymentRef: "ref-1" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://konnect.test/api/v2/payments/init-payment")
    expect((init as any).headers["x-api-key"]).toBe("test-key")
    const body = JSON.parse((init as any).body)
    expect(body.amount).toBe(70000)
    expect(body.receiverWalletId).toBe("wallet-1")
    expect(body.acceptedPaymentMethods).toEqual(["bank_card"])
    expect(body.silentWebhook).toBe(true)
  })

  it("maps a 5xx to KONNECT_UNAVAILABLE", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as any)

    const service = konnectClientService({ strapi: buildStrapi() })
    await expect(service.initPayment(baseInitParams)).rejects.toMatchObject({
      code: KONNECT_UNAVAILABLE,
    })
  })

  it("maps a 4xx to KONNECT_INIT_FAILED", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as any)

    const service = konnectClientService({ strapi: buildStrapi() })
    await expect(service.initPayment(baseInitParams)).rejects.toMatchObject({
      code: KONNECT_INIT_FAILED,
    })
  })

  it("maps a network/timeout error to KONNECT_UNAVAILABLE", async () => {
    jest
      .spyOn(global, "fetch" as any)
      .mockRejectedValue(
        Object.assign(new Error("aborted"), { name: "AbortError" })
      )

    const service = konnectClientService({ strapi: buildStrapi() })
    await expect(service.initPayment(baseInitParams)).rejects.toMatchObject({
      code: KONNECT_UNAVAILABLE,
    })
  })
})

describe("konnect-client.getPaymentDetails", () => {
  it("parses the { payment } envelope", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        payment: { status: "completed", orderId: "TW-1", amount: 70000 },
      }),
    } as any)

    const service = konnectClientService({ strapi: buildStrapi() })
    const details = await service.getPaymentDetails("ref-1")

    expect(details).toEqual({
      status: "completed",
      orderId: "TW-1",
      amount: 70000,
      paymentRef: "ref-1",
    })
  })

  it("maps a failed lookup to KONNECT_UNAVAILABLE", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as any)

    const service = konnectClientService({ strapi: buildStrapi() })
    await expect(service.getPaymentDetails("ref-1")).rejects.toMatchObject({
      code: KONNECT_UNAVAILABLE,
    })
  })
})
