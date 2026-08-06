/**
 * Localized purchase-confirmation email builder (Story 6.5).
 *
 * Pure helper — no Strapi, no I/O — so it is fully unit-testable. Mirrors the
 * `notification-emails.ts` pattern in the user-engagement plugin (per-plugin
 * duplication precedent set by `venues/registration-emails.ts`): localized
 * fr/ar/en copy, `sanitizeHeader` on the subject, `escapeHtml` on every
 * interpolated value.
 *
 * Dates are formatted with `Intl.DateTimeFormat` forced to `timeZone:
 * "Africa/Tunis"` and Latin digits for Arabic (`ar-TN-u-nu-latn`, the
 * project's always-Western-numerals rule). Prices are localized decimals with
 * the currency taken from the order (never a hardcoded "TND").
 *
 * SECURITY: the HTML must NEVER contain `accessToken`, `qrNonce`, or the raw
 * `TWQ1.` token text — the QR token travels only inside the attached PNG
 * pixels. This module never receives any of those values.
 */

export type SupportedLocale = "ar" | "fr" | "en"

/** One purchased ticket as rendered in the email body. */
export interface ConfirmationTicketLine {
  ticketNumber: string
  type: string
  price: number
}

/** Everything the builder needs — plain data, no tokens, no documents. */
export interface ConfirmationEmailInput {
  orderNumber: string
  /** Buyer display name for the greeting (guestName or account name). */
  recipientName?: string | null
  totalAmount: number
  /** ISO currency code from the order (e.g. "TND"). */
  currency: string
  eventTitle: string
  /** ISO datetime of the booked sub-event (screening/performance). */
  startDateTime: string | null
  venueName: string | null
  tickets: ConfirmationTicketLine[]
}

/**
 * Sanitize a string for use in an email header (the `subject`). Strips CR/LF
 * and other control characters so a title containing a newline can't inject
 * extra email headers (e.g. a smuggled `Bcc:`). Collapses removed control runs
 * to a single space and trims. The HTML body escapes the title separately.
 */
export function sanitizeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim()
}

/** Escape a string for safe interpolation into HTML attribute/text content. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Intl locale tag per supported locale (Latin digits forced for Arabic). */
function intlLocaleFor(locale: SupportedLocale): string {
  return locale === "ar"
    ? "ar-TN-u-nu-latn"
    : locale === "en"
      ? "en-GB"
      : "fr-TN"
}

/**
 * Format an ISO datetime for the email body, forcing Africa/Tunis and Latin
 * digits. Returns "" for a null/absent or unparseable value.
 */
export function formatEmailDateTime(
  iso: string | null,
  locale: SupportedLocale
): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  try {
    return new Intl.DateTimeFormat(intlLocaleFor(locale), {
      timeZone: "Africa/Tunis",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

/**
 * Localized decimal + currency code from the order's own currency. Falls back
 * to `"<amount> <code>"` when the code is unknown to Intl.
 */
export function formatEmailPrice(
  amount: number,
  currency: string,
  locale: SupportedLocale
): string {
  try {
    return new Intl.NumberFormat(intlLocaleFor(locale), {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(amount)
  } catch {
    // Unknown code: don't guess minor units (TND has 3, most have 2) — emit
    // the raw amount so nothing is misstated.
    return `${amount} ${currency}`
  }
}

/** Localized labels for the three ticket types (unknown types pass through). */
const TICKET_TYPE_LABELS: Record<SupportedLocale, Record<string, string>> = {
  fr: { standard: "Plein tarif", reduced: "Tarif réduit", vip: "VIP" },
  en: { standard: "Full price", reduced: "Reduced", vip: "VIP" },
  ar: { standard: "تعرفة كاملة", reduced: "تعرفة مخفضة", vip: "VIP" },
}

export function ticketTypeLabel(locale: SupportedLocale, type: string): string {
  return TICKET_TYPE_LABELS[locale][type] ?? type
}

/** `YYYYMMDDTHHMMSSZ` UTC stamp used by both the calendar URL and the .ics. */
function toCalendarUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
}

/**
 * Display duration for the calendar entry: no duration data exists on
 * sub-events, 2 hours is a display default (see spec Design Notes).
 */
const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000

/** Parse the sub-event start into `[start, start+2h]`, or null when absent. */
function calendarWindow(input: ConfirmationEmailInput): [Date, Date] | null {
  if (!input.startDateTime) return null
  const start = new Date(input.startDateTime)
  if (Number.isNaN(start.getTime())) return null
  return [start, new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS)]
}

/**
 * Google-Calendar template URL (`action=TEMPLATE`, UTC dates). The description
 * carries the order number, never tokens. Returns null when the sub-event has
 * no (parseable) start time — the email then simply omits the link.
 */
export function buildGoogleCalendarUrl(
  input: ConfirmationEmailInput
): string | null {
  const window = calendarWindow(input)
  if (!window) return null
  const [start, end] = window

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.eventTitle,
    dates: `${toCalendarUtc(start)}/${toCalendarUtc(end)}`,
    details: `Tiween — ${input.orderNumber}`,
  })
  if (input.venueName) {
    params.set("location", input.venueName)
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Escape a text value for an iCalendar TEXT property (RFC 5545 §3.3.11).
 * Any line break — `\r\n`, bare `\r`, or bare `\n` — becomes a literal `\n`.
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
}

/**
 * RFC 5545 §3.1 line folding: a content line longer than 75 octets is split
 * into multiple physical lines, each continuation prefixed with one space.
 * We cap every physical line at 74 octets (continuation space included) and
 * never split inside a multi-byte UTF-8 character.
 */
function foldIcsLine(line: string): string[] {
  const MAX_OCTETS = 74
  const folded: string[] = []
  let current = ""
  let octets = 0
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8")
    if (octets + size > MAX_OCTETS) {
      folded.push(current)
      current = " "
      octets = 1
    }
    current += char
    octets += size
  }
  folded.push(current)
  return folded
}

/**
 * Hand-built `.ics` calendar entry (CRLF line endings, UTC times, 2h display
 * duration). Location = venue name; description = order number, never tokens.
 * Returns null when the sub-event has no (parseable) start time.
 */
export function buildIcs(input: ConfirmationEmailInput): string | null {
  const window = calendarWindow(input)
  if (!window) return null
  const [start, end] = window

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiween//Ticketing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.orderNumber)}@tiween.tn`,
    `DTSTAMP:${toCalendarUtc(new Date())}`,
    `DTSTART:${toCalendarUtc(start)}`,
    `DTEND:${toCalendarUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.eventTitle || "")}`,
  ]
  if (input.venueName) {
    lines.push(`LOCATION:${escapeIcsText(input.venueName)}`)
  }
  lines.push(
    `DESCRIPTION:${escapeIcsText(`Tiween — ${input.orderNumber}`)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  )
  return lines.flatMap(foldIcsLine).join("\r\n")
}

/** Localized copy strings for the confirmation email. */
interface ConfirmationCopy {
  subject: (title: string) => string
  heading: string
  greeting: (name: string) => string
  greetingAnon: string
  orderLabel: string
  dateLabel: string
  venueLabel: string
  ticketsHeading: string
  totalLabel: string
  calendarCta: string
  qrNote: string
}

const COPY: Record<SupportedLocale, ConfirmationCopy> = {
  fr: {
    subject: (title) => `Vos billets — ${title}`,
    heading: "Merci pour votre achat !",
    greeting: (name) => `Bonjour ${name},`,
    greetingAnon: "Bonjour,",
    orderLabel: "Commande :",
    dateLabel: "Date :",
    venueLabel: "Lieu :",
    ticketsHeading: "Vos billets",
    totalLabel: "Total :",
    calendarCta: "Ajouter à mon calendrier Google",
    qrNote:
      "Vos codes QR sont en pièces jointes — un par billet. Présentez-les à l'entrée le jour de l'événement.",
  },
  en: {
    subject: (title) => `Your tickets — ${title}`,
    heading: "Thank you for your purchase!",
    greeting: (name) => `Hello ${name},`,
    greetingAnon: "Hello,",
    orderLabel: "Order:",
    dateLabel: "Date:",
    venueLabel: "Venue:",
    ticketsHeading: "Your tickets",
    totalLabel: "Total:",
    calendarCta: "Add to Google Calendar",
    qrNote:
      "Your QR codes are attached — one per ticket. Show them at the entrance on the day of the event.",
  },
  ar: {
    subject: (title) => `تذاكرك — ${title}`,
    heading: "شكراً لشرائك!",
    greeting: (name) => `مرحباً ${name}،`,
    greetingAnon: "مرحباً،",
    orderLabel: "الطلب:",
    dateLabel: "التاريخ:",
    venueLabel: "المكان:",
    ticketsHeading: "تذاكرك",
    totalLabel: "المجموع:",
    calendarCta: "أضف إلى تقويم Google",
    qrNote:
      "رموز QR الخاصة بك مرفقة — رمز لكل تذكرة. اعرضها عند المدخل يوم الفعالية.",
  },
}

/**
 * Build the localized subject + HTML body + plain-text alternative for the
 * purchase-confirmation email.
 *
 * Every HTML-interpolated value goes through `escapeHtml`; the subject goes
 * through `sanitizeHeader`; the text part carries the raw values (no markup).
 * The QR codes are NOT in any part — they travel as PNG attachments generated
 * by the `order-email` service.
 */
export function buildConfirmationEmail(
  locale: SupportedLocale,
  input: ConfirmationEmailInput
): { subject: string; html: string; text: string } {
  const c = COPY[locale]
  const safeTitle = escapeHtml(input.eventTitle || "")
  const when = formatEmailDateTime(input.startDateTime, locale)
  const venue = escapeHtml(input.venueName || "")
  const total = escapeHtml(
    formatEmailPrice(input.totalAmount, input.currency, locale)
  )
  const calendarUrl = buildGoogleCalendarUrl(input)

  const ticketRows = input.tickets
    .map(
      (t) =>
        `<li>${escapeHtml(t.ticketNumber)} — ${escapeHtml(
          ticketTypeLabel(locale, t.type)
        )} — ${escapeHtml(formatEmailPrice(t.price, input.currency, locale))}</li>`
    )
    .join("")

  const greeting = input.recipientName
    ? c.greeting(escapeHtml(input.recipientName))
    : c.greetingAnon

  const html =
    `<div dir="${locale === "ar" ? "rtl" : "ltr"}">` +
    `<h2>${c.heading}</h2>` +
    `<p>${greeting}</p>` +
    `<p>${c.orderLabel} <strong>${escapeHtml(input.orderNumber)}</strong></p>` +
    `<h3>${safeTitle}</h3>` +
    (when ? `<p>${c.dateLabel} ${escapeHtml(when)}</p>` : "") +
    (venue ? `<p>${c.venueLabel} ${venue}</p>` : "") +
    `<h4>${c.ticketsHeading}</h4>` +
    `<ul>${ticketRows}</ul>` +
    `<p>${c.totalLabel} <strong>${total}</strong></p>` +
    (calendarUrl
      ? `<p><a href="${escapeHtml(calendarUrl)}">${c.calendarCta}</a></p>`
      : "") +
    `<p>${c.qrNote}</p>` +
    `</div>`

  // Plain-text alternative: same content, raw values, no markup.
  const rawTotal = formatEmailPrice(input.totalAmount, input.currency, locale)
  const textLines = [
    c.heading,
    input.recipientName ? c.greeting(input.recipientName) : c.greetingAnon,
    `${c.orderLabel} ${input.orderNumber}`,
    "",
    input.eventTitle || "",
  ]
  if (when) textLines.push(`${c.dateLabel} ${when}`)
  if (input.venueName) textLines.push(`${c.venueLabel} ${input.venueName}`)
  textLines.push("", c.ticketsHeading)
  for (const t of input.tickets) {
    textLines.push(
      `- ${t.ticketNumber} — ${ticketTypeLabel(locale, t.type)} — ${formatEmailPrice(t.price, input.currency, locale)}`
    )
  }
  textLines.push(`${c.totalLabel} ${rawTotal}`)
  if (calendarUrl) textLines.push("", `${c.calendarCta}: ${calendarUrl}`)
  textLines.push("", c.qrNote)

  return {
    text: textLines.join("\n"),
    // The subject is an email header — strip CR/LF/control chars from the raw
    // title so it can't inject additional headers.
    subject: c.subject(sanitizeHeader(input.eventTitle || "")),
    html,
  }
}
