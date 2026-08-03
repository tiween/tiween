/**
 * Venue-registration email bodies (Story 7.1).
 *
 * Pure helpers — no Strapi, no I/O — so they are fully unit-testable, mirroring
 * `plugins/user-engagement/server/src/services/notification-emails.ts`
 * (localized fr/ar/en record, `escapeHtml` on every interpolated value,
 * `sanitizeHeader` on the subject).
 *
 * The applicant confirmation is localized fr/en/ar. The admin notification is
 * fr-only: operational copy is French-first per the Epic 7 locale rules and the
 * recipient is the platform team, not a public user.
 */

export type SupportedLocale = "ar" | "fr" | "en"

const SUPPORTED_LOCALES: readonly SupportedLocale[] = ["ar", "fr", "en"]

/**
 * Sanitize a string for use in an email header (the `subject`). Strips CR/LF and
 * other control characters so a venue name containing a newline can't inject
 * extra email headers (e.g. a smuggled `Bcc:`). The HTML body escapes separately.
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

/**
 * Narrow an arbitrary locale-ish value to a supported locale, defaulting to
 * French (the platform's operational default) for anything unknown or absent.
 */
export function normalizeLocale(value: unknown): SupportedLocale {
  const raw = typeof value === "string" ? value.slice(0, 2).toLowerCase() : ""
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as SupportedLocale)
    : "fr"
}

export interface ApplicantConfirmationInput {
  applicantName: string
  venueName: string
}

/**
 * Build the localized "we received your application" email sent to the venue
 * owner immediately after registration. Deliberately says nothing about a
 * timeline — approval is a manual admin action (platform-administration epic).
 */
export function buildApplicantConfirmationEmail(
  locale: SupportedLocale,
  { applicantName, venueName }: ApplicantConfirmationInput
): { subject: string; html: string } {
  const safeName = escapeHtml(applicantName || "")
  const safeVenue = escapeHtml(venueName || "")

  const copy: Record<
    SupportedLocale,
    {
      subject: (venue: string) => string
      html: (n: string, v: string) => string
    }
  > = {
    fr: {
      subject: (venue) => `Demande d'inscription reçue : ${venue}`,
      html: (n, v) =>
        `<h2>Merci ${n}</h2><p>Nous avons bien reçu la demande d'inscription du lieu <strong>${v}</strong>.</p><p>Votre dossier est en cours d'examen par notre équipe. Vous recevrez un email dès qu'une décision aura été prise. Votre compte gestionnaire est créé mais reste inactif jusqu'à l'approbation.</p>`,
    },
    en: {
      subject: (venue) => `Registration request received: ${venue}`,
      html: (n, v) =>
        `<h2>Thank you ${n}</h2><p>We have received the registration request for the venue <strong>${v}</strong>.</p><p>Your application is under review by our team. You will receive an email as soon as a decision is made. Your manager account has been created but stays inactive until approval.</p>`,
    },
    ar: {
      subject: (venue) => `تم استلام طلب التسجيل: ${venue}`,
      html: (n, v) =>
        `<h2>شكرا ${n}</h2><p>لقد استلمنا طلب تسجيل المكان <strong>${v}</strong>.</p><p>طلبك قيد المراجعة من طرف فريقنا. سيصلك بريد إلكتروني بمجرد اتخاذ القرار. تم إنشاء حساب المسؤول لكنه يبقى غير مفعّل إلى حين الموافقة.</p>`,
    },
  }

  const c = copy[locale]

  return {
    // The subject is an email header — strip CR/LF/control chars from the RAW
    // venue name so it can't inject additional headers.
    subject: c.subject(sanitizeHeader(venueName || "")),
    html: c.html(safeName, safeVenue),
  }
}

export interface AdminNotificationInput {
  venueName: string
  contactEmail: string
  applicantName: string
  venueDocumentId: string
}

/**
 * Build the fr-only "a new venue applied" email sent to
 * `ADMIN_NOTIFICATION_EMAIL`. Carries the `documentId` so an admin can jump
 * straight to the pending draft in the admin panel.
 */
export function buildAdminNotificationEmail({
  venueName,
  contactEmail,
  applicantName,
  venueDocumentId,
}: AdminNotificationInput): { subject: string; html: string } {
  const safeVenue = escapeHtml(venueName || "")
  const safeEmail = escapeHtml(contactEmail || "")
  const safeApplicant = escapeHtml(applicantName || "")
  const safeDocumentId = escapeHtml(venueDocumentId || "")

  return {
    subject: `Nouvelle demande d'inscription de lieu : ${sanitizeHeader(
      venueName || ""
    )}`,
    html:
      `<h2>Nouvelle demande d'inscription</h2>` +
      `<p>Lieu : <strong>${safeVenue}</strong></p>` +
      `<p>Demandeur : ${safeApplicant}</p>` +
      `<p>Email de contact : ${safeEmail}</p>` +
      `<p>Identifiant du lieu : <code>${safeDocumentId}</code></p>` +
      `<p>Le lieu est enregistré en statut « pending » et non publié. Il reste invisible côté public jusqu'à l'approbation.</p>`,
  }
}
