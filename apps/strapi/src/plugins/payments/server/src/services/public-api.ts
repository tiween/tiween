import type { Core } from "@strapi/strapi"
import type { InternalPaymentStatus } from "./status-mapping"

const PLUGIN_ID = "payments"

/** Customer contact forwarded to the Konnect hosted page. */
export interface PaymentCustomer {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

/** Params for {@link PublicApi.initPayment}. */
export interface InitPaymentParams {
  /** Our order number (Konnect echoes it back as `payment.orderId`). */
  orderNumber: string
  /** Amount in TND (decimal); converted to millimes before sending. */
  amountTND: number
  /** Currency code from the order (e.g. "TND"). */
  currency: string
  /** UI payment methods selected by the buyer (mapped to Konnect tokens). */
  methods: string[]
  customer: PaymentCustomer
  /** Optional same-origin success/fail redirect URLs (origin-guarded). */
  successUrl?: string
  failUrl?: string
}

export interface InitPaymentResult {
  payUrl: string
  paymentRef: string
}

export interface PaymentStatusResult {
  status: InternalPaymentStatus
  orderId: string | null
  /** Collected amount in millimes, when Konnect reports it (else null). */
  amount: number | null
  paymentRef: string
}

/**
 * Convert a TND decimal amount to Konnect millimes. TND is 3-decimal:
 * `70.00 DT -> 70000`. Rounded to guard against float drift.
 */
export function tndToMillimes(amountTND: number): number {
  return Math.round(amountTND * 1000)
}

/**
 * Public facade for the payments plugin (D8 — the ONE cross-plugin entry point).
 *
 * Callers (ticketing) reach payments only through
 * `strapi.plugin("payments").service("public-api")`. This service owns the
 * URL construction (from config, never client input) and the amount/method
 * translation, then delegates transport to `konnect-client`.
 */
const publicApiService = ({ strapi }: { strapi: Core.Strapi }) => {
  const konnectClient = () => strapi.plugin(PLUGIN_ID).service("konnect-client")
  const statusMapping = () => strapi.plugin(PLUGIN_ID).service("status-mapping")

  const getClientBaseUrl = (): string =>
    (
      strapi.config.get(
        `plugin::${PLUGIN_ID}.clientBaseUrl`,
        "http://localhost:3000"
      ) as string
    ).replace(/\/$/, "")

  /** Absolute webhook URL Konnect calls back — always from the server config. */
  const buildWebhookUrl = (): string => {
    const serverUrl = (
      strapi.config.get("server.url", "http://localhost:1337") as string
    ).replace(/\/$/, "")
    return `${serverUrl}/api/payments/konnect/webhook`
  }

  /**
   * Only accept a caller-supplied redirect URL when it is SAME-ORIGIN as the
   * configured client base (open-redirect safety); otherwise fall back to the
   * client base root. This keeps redirects on our own domain even though the
   * concrete path (locale / ids) is provided by the caller.
   */
  const safeRedirect = (
    candidate: string | undefined,
    base: string
  ): string => {
    if (!candidate) return base
    try {
      const c = new URL(candidate)
      const b = new URL(base)
      return c.origin === b.origin ? candidate : base
    } catch {
      return base
    }
  }

  /** Map UI methods to Konnect tokens; empty result = Konnect's full set. */
  const mapMethods = (methods: string[]): string[] => {
    const map = strapi.config.get(
      `plugin::${PLUGIN_ID}.konnectMethods`,
      {}
    ) as Record<string, string[]>
    const tokens = new Set<string>()
    for (const method of methods) {
      for (const token of map[method] ?? []) {
        tokens.add(token)
      }
    }
    return [...tokens]
  }

  return {
    /**
     * Initialize a hosted Konnect payment for an order.
     *
     * Builds webhook/success/fail URLs from config, converts the amount to
     * millimes, maps the UI methods, and returns the hosted `payUrl` +
     * `paymentRef`. Throws the konnect-client error CODE on failure.
     */
    async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
      const base = getClientBaseUrl()
      const currencyToken = strapi.config.get(
        `plugin::${PLUGIN_ID}.currencyToken`,
        "TND"
      ) as string

      // Guard: the amount is scaled to millimes for `currencyToken` (TND, ×1000).
      // Reject any order whose currency differs so we never silently misprice a
      // non-TND amount. A matching or absent currency proceeds unchanged.
      if (
        params.currency &&
        params.currency.toUpperCase() !== currencyToken.toUpperCase()
      ) {
        throw Object.assign(new Error("Currency not supported"), {
          code: "INVALID_ORDER",
        })
      }

      return konnectClient().initPayment({
        amountMillimes: tndToMillimes(params.amountTND),
        token: currencyToken,
        acceptedPaymentMethods: mapMethods(params.methods),
        orderId: params.orderNumber,
        description: `Tiween order ${params.orderNumber}`,
        firstName: params.customer.firstName,
        lastName: params.customer.lastName,
        email: params.customer.email,
        phoneNumber: params.customer.phone,
        webhook: buildWebhookUrl(),
        successUrl: safeRedirect(params.successUrl, base),
        failUrl: safeRedirect(params.failUrl, base),
      })
    },

    /**
     * Re-query Konnect for the AUTHORITATIVE status of a payment and map it to
     * the internal vocabulary. The webhook body is never trusted — this is the
     * server-to-server verification step.
     */
    async getPaymentStatus(paymentRef: string): Promise<PaymentStatusResult> {
      const details = await konnectClient().getPaymentDetails(paymentRef)
      return {
        status: statusMapping().toInternalStatus(details.status),
        orderId: details.orderId,
        amount: details.amount,
        paymentRef,
      }
    },
  }
}

export default publicApiService
