import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "ticketing"
const ORDER_UID = `plugin::${PLUGIN_ID}.ticket-order`
const TICKET_UID = `plugin::${PLUGIN_ID}.ticket`

/** Error code: `TICKET_QR_SECRET` is unset — issuance fails closed. */
export const QR_SIGNING_UNAVAILABLE = "QR_SIGNING_UNAVAILABLE"
/** Error code: token is not a `TWQ<n>.<payload>.<sig>` triple / undecodable. */
export const QR_MALFORMED = "QR_MALFORMED"
/** Error code: token carries a version this build cannot verify. */
export const QR_UNSUPPORTED_VERSION = "QR_UNSUPPORTED_VERSION"
/** Error code: HMAC mismatch — the payload was tampered with or forged. */
export const QR_SIGNATURE_INVALID = "QR_SIGNATURE_INVALID"

/** Supported payload version and the token prefix that encodes it. */
export const QR_PAYLOAD_VERSION = 1
export const QR_TOKEN_PREFIX = `TWQ${QR_PAYLOAD_VERSION}`

/**
 * Hard bound on the admin-authored event title carried in the payload.
 *
 * `et` is the ONLY unbounded field in the token, and token length is not just
 * a scannability concern: a QR has a finite capacity, and `qrcode.react`
 * THROWS ("Data too long") rather than degrading once the value exceeds it —
 * measured at ~1600 chars for `level="H"`. `TicketList` maps tickets inline
 * with no error boundary, so a single pathological title would blank the whole
 * "Mes Billets" page and the payment success page, not just that one card.
 * 80 characters keeps a realistic worst-case token near ~450 chars while
 * staying long enough to identify the event to a human reading a decoded code
 * (the authoritative title is served by the ticket-read endpoints anyway).
 */
export const MAX_EVENT_TITLE_LENGTH = 80

/**
 * Signed QR payload. Keys are deliberately short — a QR's density (and so its
 * scannability on a small, dimmed phone screen) grows with the payload length.
 */
export interface QrPayload {
  /** Payload version. */
  v: number
  /** Order number. */
  o: string
  /** Ticket number. */
  t: string
  /** Ticket documentId. */
  ti: string
  /** Per-ticket random nonce — uniqueness never rests on the ticket number. */
  n: string
  /** Ticket type (standard/reduced/vip). */
  ty: string
  /** Event documentId. */
  ev: string
  /** Event title, truncated to `MAX_EVENT_TITLE_LENGTH`. */
  et: string
  /** Showtime, ISO-8601, or null when the sub-event has none. */
  st: string | null
  /** Issued-at, seconds since epoch. */
  iat: number
}

export type QrVerifyResult =
  | { valid: true; payload: QrPayload }
  | { valid: false; code: string }

/** Attach a stable error CODE to a thrown Error (mirrors `order.ts`). */
function codedError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code })
}

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url")
}

/**
 * Populate needed to build a QR payload: the tickets to sign plus the event and
 * sub-event fields the payload carries.
 */
const ISSUE_POPULATE = {
  tickets: true,
  event: true,
  screening: true,
  performance: true,
} as const

interface PopulatedOrderLike {
  documentId?: string
  orderNumber?: string
  paymentStatus?: string
  event?: { documentId?: string; title?: string; startDateTime?: string } | null
  screening?: { startDateTime?: string } | null
  performance?: { startDateTime?: string } | null
  tickets?: Array<{
    documentId?: string
    ticketNumber?: string
    type?: string
    qrCode?: string | null
  }> | null
}

const qrService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Read the signing key from plugin config. Throws `QR_SIGNING_UNAVAILABLE`
   * when unset so we fail closed — an unsigned token would be trivially
   * forgeable and must never be written.
   */
  secret(): string {
    const secret = strapi.config.get(
      `plugin::${PLUGIN_ID}.qrSecret`,
      ""
    ) as string
    if (!secret) {
      throw codedError(
        "TICKET_QR_SECRET is not configured",
        QR_SIGNING_UNAVAILABLE
      )
    }
    return secret
  },

  /** Encode a payload as the token's base64url middle segment. */
  encode(payload: QrPayload): string {
    return toBase64Url(JSON.stringify(payload))
  },

  /**
   * HMAC-SHA256 the ENCODED payload segment (not the re-serialized object), so
   * verification never depends on JSON key ordering.
   */
  sign(payloadSegment: string): string {
    return createHmac("sha256", this.secret())
      .update(payloadSegment)
      .digest("base64url")
  },

  /** Build the signed payload for one ticket of an order. */
  buildPayload(input: {
    orderNumber: string
    ticketNumber: string
    ticketDocumentId: string
    nonce: string
    ticketType: string
    eventId: string
    eventTitle: string
    startDateTime: string | null
  }): QrPayload {
    return {
      v: QR_PAYLOAD_VERSION,
      o: input.orderNumber,
      t: input.ticketNumber,
      ti: input.ticketDocumentId,
      n: input.nonce,
      ty: input.ticketType,
      ev: input.eventId,
      // Truncated, never rejected: an over-long title is an admin content
      // choice, and failing issuance over it would leave a PAID ticket with no
      // QR at all. See `MAX_EVENT_TITLE_LENGTH`.
      et: input.eventTitle.slice(0, MAX_EVENT_TITLE_LENGTH),
      st: input.startDateTime,
      iat: Math.floor(Date.now() / 1000),
    }
  },

  /** Mint the full `TWQ1.<payload>.<sig>` token for a payload. */
  mint(payload: QrPayload): string {
    const segment = this.encode(payload)
    return `${QR_TOKEN_PREFIX}.${segment}.${this.sign(segment)}`
  },

  /** Fresh 16-byte nonce, base64url. Covered by the signature. */
  generateNonce(): string {
    return randomBytes(16).toString("base64url")
  },

  /**
   * Verify a token. Never throws: a bad token is a `{ valid: false, code }`
   * result so the scanner path (Epic 8) can translate a CODE. The signature
   * compare is constant-time on equal-length buffers.
   */
  verify(token: unknown): QrVerifyResult {
    if (typeof token !== "string" || !token) {
      return { valid: false, code: QR_MALFORMED }
    }

    const parts = token.split(".")
    if (parts.length !== 3) {
      return { valid: false, code: QR_MALFORMED }
    }
    const [prefix, segment, signature] = parts
    if (!/^TWQ\d+$/.test(prefix)) {
      return { valid: false, code: QR_MALFORMED }
    }
    if (prefix !== QR_TOKEN_PREFIX) {
      return { valid: false, code: QR_UNSUPPORTED_VERSION }
    }
    if (!segment || !signature) {
      return { valid: false, code: QR_MALFORMED }
    }

    let expected: string
    try {
      expected = this.sign(segment)
    } catch (err) {
      return {
        valid: false,
        code: (err as { code?: string })?.code ?? QR_SIGNING_UNAVAILABLE,
      }
    }

    // `timingSafeEqual` throws on a length mismatch, so gate on length first —
    // the length of an HMAC digest is not secret.
    const actualBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expected)
    if (
      actualBuf.length !== expectedBuf.length ||
      !timingSafeEqual(actualBuf, expectedBuf)
    ) {
      return { valid: false, code: QR_SIGNATURE_INVALID }
    }

    let payload: QrPayload
    try {
      payload = JSON.parse(
        Buffer.from(segment, "base64url").toString("utf8")
      ) as QrPayload
    } catch {
      return { valid: false, code: QR_MALFORMED }
    }
    if (!payload || typeof payload !== "object" || !payload.t) {
      return { valid: false, code: QR_MALFORMED }
    }
    if (payload.v !== QR_PAYLOAD_VERSION) {
      return { valid: false, code: QR_UNSUPPORTED_VERSION }
    }

    return { valid: true, payload }
  },

  /**
   * Issue QR tokens for every ticket of a PAID order.
   *
   * Called from the exactly-once `paid` transition in
   * `order.reconcileFromGateway` AND from its already-`paid` early return (to
   * self-heal a partially-issued order) — which any number of concurrent
   * confirms/webhooks can enter at once. So the populated `qrCode` read below is
   * only a cheap pre-filter: the write is a per-ticket COMPARE-AND-SET
   * (`updateMany ... WHERE qrCode IS NULL`) and a ticket counts as issued only
   * when that update reports `count === 1`. A racing loser (`count === 0`)
   * discards its freshly-minted token silently, so exactly one signature-valid
   * QR can ever exist per ticket and it always matches the stored `qrNonce`.
   *
   * Non-paid orders are a no-op — a QR must not exist before payment.
   */
  async issueForOrder(
    orderNumber: string
  ): Promise<{ issued: number; skipped: number }> {
    const orders = (await strapi.documents(ORDER_UID).findMany({
      filters: { orderNumber },
      populate: ISSUE_POPULATE,
    })) as unknown as PopulatedOrderLike[]

    const order = orders?.[0]
    if (!order) return { issued: 0, skipped: 0 }
    if (order.paymentStatus !== "paid") return { issued: 0, skipped: 0 }

    const tickets = Array.isArray(order.tickets) ? order.tickets : []
    const eventTitle = order.event?.title ?? ""
    const eventId = order.event?.documentId ?? ""
    const startDateTime =
      order.screening?.startDateTime ??
      order.performance?.startDateTime ??
      order.event?.startDateTime ??
      null

    let issued = 0
    let skipped = 0

    for (const ticket of tickets) {
      // Cheap pre-filter: skip a ticket we can already see is issued. The CAS
      // below is what actually makes this safe under concurrency.
      if (ticket.qrCode) {
        skipped++
        continue
      }
      if (!ticket.documentId) {
        skipped++
        continue
      }

      const nonce = this.generateNonce()
      const qrCode = this.mint(
        this.buildPayload({
          orderNumber: order.orderNumber ?? orderNumber,
          ticketNumber: ticket.ticketNumber ?? "",
          ticketDocumentId: ticket.documentId,
          nonce,
          ticketType: ticket.type ?? "standard",
          eventId,
          eventTitle,
          startDateTime,
        })
      )

      // Compare-and-set: only a ticket that still has NO token matches, so a
      // concurrent issuer cannot overwrite an already-issued one.
      const res = await strapi.db.query(TICKET_UID).updateMany({
        where: { documentId: ticket.documentId, qrCode: { $null: true } },
        data: {
          qrCode,
          qrNonce: nonce,
          qrIssuedAt: new Date().toISOString(),
        },
      })

      if (res?.count === 1) {
        issued++
      } else {
        // Lost the race — another issuer already wrote this ticket's token.
        // Discard ours: it was never persisted, so no second valid QR exists.
        skipped++
      }
    }

    return { issued, skipped }
  },
})

export default qrService
