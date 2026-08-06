import { toBuffer } from "qrcode"

import type { Core } from "@strapi/strapi"
import type {
  ConfirmationEmailInput,
  SupportedLocale,
} from "./confirmation-email"

import { buildConfirmationEmail, buildIcs } from "./confirmation-email"

const PLUGIN_ID = "ticketing"
const ORDER_UID = `plugin::${PLUGIN_ID}.ticket-order`

/** Locales the confirmation email is authored in. */
const SUPPORTED_LOCALES = new Set<string>(["ar", "fr", "en"])

/**
 * Resolve the email locale: the FIRST supported candidate wins, so an
 * unsupported (but non-null) checkout locale falls through to a valid account
 * preference instead of short-circuiting straight to "fr".
 */
function resolveLocale(...candidates: Array<unknown>): SupportedLocale {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && SUPPORTED_LOCALES.has(candidate)) {
      return candidate as SupportedLocale
    }
  }
  return "fr"
}

/**
 * Signed QR token prefix (Story 6.4). Orders created before 6.4 can carry
 * legacy UNSIGNED `qrCode` values written by the old afterCreate lifecycle
 * (ledger DW-241) — those must never be emailed as QR PNGs.
 */
const SIGNED_QR_PREFIX = "TWQ1."

/** Populated order shape as consumed by `sendForOrder`. */
interface PopulatedOrder {
  documentId: string
  orderNumber?: string
  paymentStatus?: string
  totalAmount?: number
  currency?: string
  locale?: string | null
  confirmationEmailSentAt?: string | Date | null
  guestEmail?: string | null
  guestName?: string | null
  user?: {
    email?: string | null
    username?: string | null
    preferredLanguage?: string | null
  } | null
  event?: {
    title?: string
    startDateTime?: string
    venue?: { name?: string } | null
  } | null
  screening?: { startDateTime?: string } | null
  performance?: { startDateTime?: string } | null
  tickets?: Array<{
    ticketNumber?: string
    type?: string
    price?: number
    qrCode?: string | null
  }> | null
}

/**
 * Confirmation-email delivery engine (Story 6.5).
 *
 * Sends the one-and-only purchase confirmation for a PAID order: localized
 * subject/HTML, one QR PNG attachment per ticket (the token travels only
 * inside the PNG pixels — never in the HTML), plus a `.ics` calendar entry.
 *
 * Exactly-once is enforced with the same CAS idiom as QR issuance, on the
 * private `confirmationEmailSentAt` marker: claim-then-send, best-effort
 * clear-on-throw so the next confirm/webhook self-heal retries a transient
 * failure. Guards that skip WITHOUT claiming the marker (not paid, missing
 * QRs, no recipient) leave delivery to a later self-heal pass.
 */
const orderEmailService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Build + send the confirmation email for one order.
   *
   * Throws only AFTER the marker was claimed and then cleared (so the caller's
   * throw-safe wrapper logs it and a later reconcile retries). All skip paths
   * return silently after logging.
   */
  async sendForOrder(orderNumber: string): Promise<void> {
    const orders = (await strapi.documents(ORDER_UID).findMany({
      filters: { orderNumber },
      populate: {
        tickets: true,
        event: { populate: { venue: true } },
        screening: true,
        performance: true,
        // Only the fields the email needs — never pull the full
        // users-permissions record (password/reset hashes) into memory.
        user: { fields: ["email", "username", "preferredLanguage"] },
      },
    })) as unknown as PopulatedOrder[]

    const order = orders?.[0]
    if (!order) return

    // Email is strictly downstream of the money: only a settled order emails.
    if (order.paymentStatus !== "paid") return

    // Cheap idempotency pre-check: every self-heal poll of a paid order lands
    // here — don't fire a CAS write when the loaded row already carries the
    // marker. The CAS below remains the authoritative race guard.
    if (order.confirmationEmailSentAt) return

    // All-QRs-present gate: the email's value is the QR backup. A partially
    // issued order waits (marker NOT claimed) for the next confirm/webhook
    // self-heal, which completes issuance and then sends one complete email.
    // A legacy UNSIGNED code (pre-6.4 afterCreate lifecycle, DW-241) counts as
    // missing: it must never be emailed as a QR PNG.
    const tickets = Array.isArray(order.tickets) ? order.tickets : []
    const allSigned =
      tickets.length > 0 &&
      tickets.every(
        (t) =>
          typeof t.qrCode === "string" && t.qrCode.startsWith(SIGNED_QR_PREFIX)
      )
    if (!allSigned) {
      strapi.log.warn(
        `[ticketing] confirmation email deferred for order ${orderNumber}: QR issuance incomplete or legacy/unsigned code present`
      )
      return
    }

    // Recipient: account email, else guest email. No recipient → skip WITHOUT
    // claiming the marker (nothing to retry against, but nothing consumed).
    const to = order.user?.email ?? order.guestEmail
    if (!to) {
      strapi.log.warn(
        `[ticketing] confirmation email skipped for order ${orderNumber}: no recipient email`
      )
      return
    }

    // Locale precedence: checkout locale → account preference → fr (first
    // SUPPORTED candidate wins). This is a transactional email —
    // `emailNotificationsEnabled` is deliberately NOT consulted (suppressing
    // fulfilment would strand guests with no artifact).
    const locale = resolveLocale(order.locale, order.user?.preferredLanguage)

    // Exactly-once claim: only a row whose marker is still NULL matches.
    // (Sanctioned `db.query` CAS write — same idiom as QR issuance.)
    const res = await strapi.db.query(ORDER_UID).updateMany({
      where: {
        documentId: order.documentId,
        confirmationEmailSentAt: { $null: true },
      },
      data: { confirmationEmailSentAt: new Date() },
    })
    if (res?.count !== 1) {
      // Already sent, or a concurrent racer claimed it — nothing to do.
      return
    }

    try {
      const input: ConfirmationEmailInput = {
        orderNumber: order.orderNumber ?? orderNumber,
        recipientName: order.user
          ? order.user.username ?? null
          : order.guestName ?? null,
        totalAmount: order.totalAmount ?? 0,
        currency: order.currency ?? "TND",
        eventTitle: order.event?.title ?? "",
        startDateTime:
          order.screening?.startDateTime ??
          order.performance?.startDateTime ??
          order.event?.startDateTime ??
          null,
        venueName: order.event?.venue?.name ?? null,
        tickets: tickets.map((t) => ({
          ticketNumber: t.ticketNumber ?? "",
          type: t.type ?? "standard",
          price: t.price ?? 0,
        })),
      }

      const { subject, html, text } = buildConfirmationEmail(locale, input)

      // One QR PNG per ticket — the signed token exists only inside the pixels.
      const attachments: Array<{
        filename: string
        content: Buffer
        contentType?: string
      }> = []
      for (const ticket of tickets) {
        attachments.push({
          filename: `${ticket.ticketNumber ?? "ticket"}.png`,
          content: await toBuffer(ticket.qrCode as string, {
            errorCorrectionLevel: "M",
            width: 512,
          }),
          contentType: "image/png",
        })
      }

      const ics = buildIcs(input)
      if (ics) {
        attachments.push({
          filename: `${input.orderNumber}.ics`,
          content: Buffer.from(ics, "utf8"),
          contentType: "text/calendar",
        })
      }

      await strapi.plugins["email"].services.email.send({
        to,
        subject,
        html,
        text,
        attachments,
      })
    } catch (err) {
      // Best-effort clear so a later confirm/webhook retries the send; then
      // rethrow for the caller's throw-safe wrapper to log. A failure here
      // must never undo or block the paid transition.
      try {
        await strapi.db.query(ORDER_UID).updateMany({
          where: { documentId: order.documentId },
          data: { confirmationEmailSentAt: null },
        })
      } catch (clearErr) {
        strapi.log.error(
          `[ticketing] failed to clear confirmation-email marker for order ${orderNumber}: ${(clearErr as Error)?.message}`
        )
      }
      throw err
    }
  },
})

export default orderEmailService
