/**
 * Ticketing plugin configuration.
 *
 * The QR signing key is config/env-driven (`TICKET_QR_SECRET`), never a
 * hardcoded literal. The `validator` WARNS (never throws) when it is unset so
 * the app still boots without ticketing creds (mirrors `payments`); QR issuance
 * then fails closed with `QR_SIGNING_UNAVAILABLE` rather than emitting an
 * unsigned — and therefore forgeable — token.
 */
export default {
  default: {
    /** ISO 4217 currency code used for new orders. */
    defaultCurrency: "TND",
    /** HMAC-SHA256 key used to sign ticket QR tokens. Empty when unset. */
    qrSecret: process.env.TICKET_QR_SECRET || "",
    // NOTE: the payload/token format version is deliberately NOT config —
    // it lives as `QR_PAYLOAD_VERSION` in `services/qr.ts`, which derives both
    // the `TWQ<n>` prefix it mints AND the single version `verify` accepts. A
    // config knob here would look like a rotation lever while changing
    // nothing, which is worse than no lever: bumping the format requires a
    // code change that also decides which older versions stay verifiable.
  },
  validator: (config: Record<string, unknown>) => {
    if (!config.qrSecret && !process.env.TICKET_QR_SECRET) {
      strapi.log.warn(
        "[ticketing] TICKET_QR_SECRET is not set. QR ticket issuance will fail with QR_SIGNING_UNAVAILABLE (no unsigned token is ever written)."
      )
    }
  },
}
