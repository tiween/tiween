/**
 * Payments plugin configuration (Story 6.3).
 *
 * Holds the Konnect Network API integration knobs. Secrets (API key, wallet id,
 * webhook secret) are read from the environment; everything else is overridable
 * via `config/plugins.ts`. The `validator` WARNS (never throws) when the Konnect
 * env is unset so the app still boots in environments without payment creds
 * (mirrors the `tmdb-integration` ACL convention).
 *
 * Payment-method mapping lives here (config, not constants): `konnectMethods`
 * maps our 5 UI methods to Konnect `acceptedPaymentMethods` tokens so the exact
 * external tokens can be adjusted without a code change.
 */
export default {
  default: {
    /** Konnect Network API base URL (no trailing slash). */
    apiBaseUrl:
      process.env.KONNECT_API_URL || "https://api.konnect.network/api/v2",
    /** Konnect API key (`x-api-key`). Read from env; empty when unset. */
    apiKey: process.env.KONNECT_API_KEY || "",
    /** Konnect receiver wallet id money is credited to. */
    walletId: process.env.KONNECT_WALLET_ID || "",
    /** Optional shared secret checked on the inbound webhook (`?token=`). */
    webhookSecret: process.env.KONNECT_WEBHOOK_SECRET || "",
    /** Currency token Konnect expects for Tunisian dinar (3-decimal, millimes). */
    currencyToken: "TND",
    /** Hosted-payment-link lifespan, in minutes. */
    lifespan: 10,
    /** Konnect hosted-page theme. */
    theme: "light",
    /** Init-payment request timeout in ms (~4.5s under the 5s NFR-IN1 SLA). */
    timeoutMs: 4500,
    /**
     * Base URL of the client app, used to build (and origin-guard) the
     * success/fail redirect URLs. Never taken from client input.
     */
    clientBaseUrl:
      process.env.KONNECT_CLIENT_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:3000",
    /**
     * UI payment method -> Konnect `acceptedPaymentMethods` tokens. An unmapped
     * method falls back to Konnect's full accepted set (empty array omitted).
     */
    konnectMethods: {
      card: ["bank_card"],
      "e-dinar": ["e-DINAR"],
      flouci: ["flouci"],
      sobflous: ["wallet"],
      d17: ["wallet"],
    } as Record<string, string[]>,
  },
  validator: (config: Record<string, unknown>) => {
    if (!config.apiKey && !process.env.KONNECT_API_KEY) {
      strapi.log.warn(
        "[payments] KONNECT_API_KEY is not set. Konnect payment services will not work."
      )
    }
    if (!config.walletId && !process.env.KONNECT_WALLET_ID) {
      strapi.log.warn(
        "[payments] KONNECT_WALLET_ID is not set. Konnect payment services will not work."
      )
    }
  },
}
