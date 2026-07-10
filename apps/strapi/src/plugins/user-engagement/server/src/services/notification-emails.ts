/**
 * Localized schedule-change email bodies (Story 5.6).
 *
 * Pure helper — no Strapi, no I/O — so it is fully unit-testable. Mirrors the
 * `build…Email` pattern in `extensions/users-permissions/strapi-server.ts`
 * (localized fr/ar/en record + `escapeHtml` on interpolated user content).
 *
 * Dates are formatted with `Intl.DateTimeFormat` forced to `timeZone:
 * "Africa/Tunis"` and Latin digits for Arabic (the project's always-Western-
 * numerals rule), matching `lib/dates.ts` on the client.
 */

export type SupportedLocale = "ar" | "fr" | "en"

export type ScheduleChangeType =
  | "showtime_changed"
  | "cancelled"
  | "postponed"
  | "rescheduled"

export interface ScheduleChangeEmailInput {
  eventTitle: string
  changeType: ScheduleChangeType
  oldDateTime: string | null
  newDateTime: string | null
}

/**
 * Sanitize a string for use in an email header (the `subject`). Strips CR/LF and
 * other control characters so a title containing a newline can't inject extra
 * email headers (e.g. a smuggled `Bcc:`). Collapses removed control runs to a
 * single space and trims. The HTML body already escapes the title separately.
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
 * Format an ISO datetime for the email body, forcing Africa/Tunis and Latin
 * digits. Arabic uses `ar-TN-u-nu-latn` so the wording stays Arabic but the
 * numerals are Western per Tunisian convention. Returns "" for a null/absent or
 * unparseable value.
 */
function formatEmailDateTime(
  iso: string | null,
  locale: SupportedLocale
): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  const intlLocale =
    locale === "ar" ? "ar-TN-u-nu-latn" : locale === "en" ? "en-GB" : "fr-TN"

  try {
    return new Intl.DateTimeFormat(intlLocale, {
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
 * Build the localized subject + HTML body for a schedule-change email.
 *
 * `changeType` drives the wording:
 *  - `cancelled` — no new time (announces the cancellation, shows the old time)
 *  - `postponed` / `rescheduled` / `showtime_changed` — old → new time
 */
export function buildScheduleChangeEmail(
  locale: SupportedLocale,
  { eventTitle, changeType, oldDateTime, newDateTime }: ScheduleChangeEmailInput
): { subject: string; html: string } {
  const safeTitle = escapeHtml(eventTitle || "")
  const oldFormatted = formatEmailDateTime(oldDateTime, locale)
  const newFormatted = formatEmailDateTime(newDateTime, locale)

  const copy: Record<
    SupportedLocale,
    {
      subject: (title: string) => string
      cancelledHtml: (title: string, oldTime: string) => string
      changedHtml: (
        title: string,
        oldTime: string,
        newTime: string,
        changeType: ScheduleChangeType
      ) => string
    }
  > = {
    fr: {
      subject: (title) => `Changement d'horaire : ${title}`,
      cancelledHtml: (title, oldTime) =>
        `<h2>Événement annulé</h2><p>L'événement <strong>${title}</strong>${
          oldTime ? ` prévu le ${oldTime}` : ""
        } a été annulé.</p>`,
      changedHtml: (title, oldTime, newTime, type) => {
        const heading =
          type === "postponed"
            ? "Événement reporté"
            : type === "rescheduled"
              ? "Événement reprogrammé"
              : "Horaire modifié"
        return `<h2>${heading}</h2><p>L'horaire de l'événement <strong>${title}</strong> a changé.</p>${
          oldTime ? `<p>Ancien horaire : ${oldTime}</p>` : ""
        }${newTime && newTime !== oldTime ? `<p>Nouvel horaire : ${newTime}</p>` : ""}`
      },
    },
    en: {
      subject: (title) => `Schedule change: ${title}`,
      cancelledHtml: (title, oldTime) =>
        `<h2>Event cancelled</h2><p>The event <strong>${title}</strong>${
          oldTime ? ` scheduled for ${oldTime}` : ""
        } has been cancelled.</p>`,
      changedHtml: (title, oldTime, newTime, type) => {
        const heading =
          type === "postponed"
            ? "Event postponed"
            : type === "rescheduled"
              ? "Event rescheduled"
              : "Showtime changed"
        return `<h2>${heading}</h2><p>The schedule for <strong>${title}</strong> has changed.</p>${
          oldTime ? `<p>Previous time: ${oldTime}</p>` : ""
        }${newTime && newTime !== oldTime ? `<p>New time: ${newTime}</p>` : ""}`
      },
    },
    ar: {
      subject: (title) => `تغيير في الموعد: ${title}`,
      cancelledHtml: (title, oldTime) =>
        `<h2>تم إلغاء الفعالية</h2><p>الفعالية <strong>${title}</strong>${
          oldTime ? ` المقررة في ${oldTime}` : ""
        } تم إلغاؤها.</p>`,
      changedHtml: (title, oldTime, newTime, type) => {
        const heading =
          type === "postponed"
            ? "تم تأجيل الفعالية"
            : type === "rescheduled"
              ? "تمت إعادة جدولة الفعالية"
              : "تم تغيير الموعد"
        return `<h2>${heading}</h2><p>تغيّر موعد الفعالية <strong>${title}</strong>.</p>${
          oldTime ? `<p>الموعد السابق: ${oldTime}</p>` : ""
        }${newTime && newTime !== oldTime ? `<p>الموعد الجديد: ${newTime}</p>` : ""}`
      },
    },
  }

  const c = copy[locale]
  const html =
    changeType === "cancelled"
      ? c.cancelledHtml(safeTitle, oldFormatted)
      : c.changedHtml(safeTitle, oldFormatted, newFormatted, changeType)

  return {
    // The subject is an email header — strip CR/LF/control chars from the raw
    // title so it can't inject additional headers.
    subject: c.subject(sanitizeHeader(eventTitle || "")),
    html,
  }
}
