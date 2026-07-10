import type { Core } from "@strapi/strapi"

/** The internal payment statuses reconciliation can act on. */
export type InternalPaymentStatus = "pending" | "paid" | "failed"

/**
 * Konnect status vocabulary -> internal status (Story 6.3).
 *
 * Terminal-failure states (`failed`, `expired`, `canceled`) map to `failed`;
 * `completed` maps to `paid`; everything else (`pending`, `processing`, …) is
 * treated as still `pending`. Case-insensitive and defensive against unknown
 * tokens so an unexpected Konnect vocabulary never flips an order to a wrong
 * terminal state.
 */
const statusMappingService = (_ctx: { strapi: Core.Strapi }) => ({
  toInternalStatus(
    konnectStatus: string | null | undefined
  ): InternalPaymentStatus {
    switch ((konnectStatus ?? "").toLowerCase()) {
      case "completed":
        return "paid"
      case "failed":
      case "expired":
      case "canceled":
      case "cancelled":
      case "declined":
        return "failed"
      default:
        return "pending"
    }
  },
})

export default statusMappingService
