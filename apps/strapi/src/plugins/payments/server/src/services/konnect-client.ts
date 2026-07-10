import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "payments"

/** Error thrown when Konnect is unreachable / times out / returns a 5xx. */
export const KONNECT_UNAVAILABLE = "KONNECT_UNAVAILABLE"
/** Error thrown when Konnect rejects the init request (4xx / bad payload). */
export const KONNECT_INIT_FAILED = "KONNECT_INIT_FAILED"

/** Parameters for a Konnect init-payment request (already in millimes). */
export interface KonnectInitParams {
  /** Amount owed to Konnect, in **millimes** (TND is 3-decimal). */
  amountMillimes: number
  /** Currency token (e.g. "TND"). */
  token: string
  /** Konnect `acceptedPaymentMethods` tokens. */
  acceptedPaymentMethods: string[]
  /** Our order number, echoed back by Konnect as `payment.orderId`. */
  orderId: string
  description: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  /** Absolute webhook URL Konnect notifies (built server-side). */
  webhook: string
  /** Absolute success/fail redirect URLs (built + origin-guarded server-side). */
  successUrl: string
  failUrl: string
}

/** Konnect init-payment response shape (Network API). */
export interface KonnectInitResponse {
  payUrl: string
  paymentRef: string
}

/** Konnect payment-details response shape (Network API). */
export interface KonnectPaymentDetails {
  status: string
  orderId: string | null
  amount: number | null
  paymentRef: string
}

interface KonnectConfig {
  apiBaseUrl: string
  apiKey: string
  walletId: string
  lifespan: number
  theme: string
  timeoutMs: number
}

/**
 * Low-level Konnect Network API client (Story 6.3).
 *
 * Talks HTTP to Konnect with the `x-api-key` header, an AbortController timeout,
 * and maps transport/HTTP failures to stable error CODES. Knows nothing about
 * orders or inventory — it is a pure ACL wrapper around the external API.
 */
const konnectClientService = ({ strapi }: { strapi: Core.Strapi }) => {
  const readConfig = (): KonnectConfig => ({
    apiBaseUrl: (
      strapi.config.get(
        `plugin::${PLUGIN_ID}.apiBaseUrl`,
        "https://api.konnect.network/api/v2"
      ) as string
    ).replace(/\/$/, ""),
    apiKey:
      process.env.KONNECT_API_KEY ||
      (strapi.config.get(`plugin::${PLUGIN_ID}.apiKey`, "") as string),
    walletId:
      process.env.KONNECT_WALLET_ID ||
      (strapi.config.get(`plugin::${PLUGIN_ID}.walletId`, "") as string),
    lifespan: strapi.config.get(`plugin::${PLUGIN_ID}.lifespan`, 10) as number,
    theme: strapi.config.get(`plugin::${PLUGIN_ID}.theme`, "light") as string,
    timeoutMs: strapi.config.get(
      `plugin::${PLUGIN_ID}.timeoutMs`,
      4500
    ) as number,
  })

  const requireCreds = (config: KonnectConfig): void => {
    if (!config.apiKey || !config.walletId) {
      throw Object.assign(
        new Error(
          "Konnect credentials (KONNECT_API_KEY / KONNECT_WALLET_ID) are not configured"
        ),
        { code: KONNECT_UNAVAILABLE }
      )
    }
  }

  /** Run a fetch under a hard timeout, mapping abort/network errors. */
  const timedFetch = async (
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (err) {
      throw Object.assign(
        new Error(
          `Konnect request failed or timed out: ${(err as Error)?.message ?? "unknown"}`
        ),
        { code: KONNECT_UNAVAILABLE }
      )
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    /**
     * POST /payments/init-payment -> `{ payUrl, paymentRef }`.
     *
     * Throws `KONNECT_INIT_FAILED` on a 4xx (bad request), `KONNECT_UNAVAILABLE`
     * on a 5xx / timeout / network error or missing creds.
     */
    async initPayment(params: KonnectInitParams): Promise<KonnectInitResponse> {
      const config = readConfig()
      requireCreds(config)

      const body = {
        receiverWalletId: config.walletId,
        token: params.token,
        amount: params.amountMillimes,
        type: "immediate",
        description: params.description,
        acceptedPaymentMethods: params.acceptedPaymentMethods,
        lifespan: config.lifespan,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        ...(params.phoneNumber ? { phoneNumber: params.phoneNumber } : {}),
        orderId: params.orderId,
        webhook: params.webhook,
        silentWebhook: true,
        successUrl: params.successUrl,
        failUrl: params.failUrl,
        theme: config.theme,
      }

      const response = await timedFetch(
        `${config.apiBaseUrl}/payments/init-payment`,
        {
          method: "POST",
          headers: {
            "x-api-key": config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        config.timeoutMs
      )

      if (!response.ok) {
        const code =
          response.status >= 500 ? KONNECT_UNAVAILABLE : KONNECT_INIT_FAILED
        strapi.log.error(
          `[payments] Konnect init-payment failed (HTTP ${response.status})`
        )
        throw Object.assign(
          new Error(
            `Konnect init-payment failed with status ${response.status}`
          ),
          { code }
        )
      }

      const json = (await response.json()) as Partial<KonnectInitResponse>
      if (!json?.payUrl || !json?.paymentRef) {
        throw Object.assign(
          new Error("Konnect init-payment response missing payUrl/paymentRef"),
          { code: KONNECT_INIT_FAILED }
        )
      }

      return { payUrl: json.payUrl, paymentRef: json.paymentRef }
    },

    /**
     * GET /payments/:paymentRef -> normalized payment details.
     *
     * Used server-to-server to re-query the AUTHORITATIVE status (never trust
     * the webhook body). Throws `KONNECT_UNAVAILABLE` on any failure.
     */
    async getPaymentDetails(
      paymentRef: string
    ): Promise<KonnectPaymentDetails> {
      const config = readConfig()
      requireCreds(config)

      const response = await timedFetch(
        `${config.apiBaseUrl}/payments/${encodeURIComponent(paymentRef)}`,
        {
          method: "GET",
          headers: { "x-api-key": config.apiKey },
        },
        config.timeoutMs
      )

      if (!response.ok) {
        strapi.log.error(
          `[payments] Konnect get-payment failed (HTTP ${response.status})`
        )
        throw Object.assign(
          new Error(
            `Konnect get-payment failed with status ${response.status}`
          ),
          { code: KONNECT_UNAVAILABLE }
        )
      }

      const json = (await response.json()) as {
        payment?: {
          status?: string
          orderId?: string | null
          amount?: number | null
        }
      }
      const payment = json?.payment ?? {}

      return {
        status: payment.status ?? "pending",
        orderId: payment.orderId ?? null,
        amount: payment.amount ?? null,
        paymentRef,
      }
    },
  }
}

export default konnectClientService
