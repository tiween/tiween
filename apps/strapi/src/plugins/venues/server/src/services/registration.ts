/**
 * Public venue-registration service (Story 7.1).
 *
 * Provisions, in one auditable flow:
 *   1. a duplicate-email guard against users-permissions,
 *   2. a blocked `venue-manager` user (created through the users-permissions
 *      `user.add` service so the password is hashed),
 *   3. a DRAFT venue with `status: "pending"` whose `manager` points at that
 *      user,
 *   4. two non-blocking notification emails (applicant + platform admin).
 *
 * ATOMICITY: the user lives in users-permissions and the venue in the Document
 * Service — there is no shared transaction boundary. The order is user-then-
 * venue so the only failure window leaves an orphan user, which is deletable;
 * the compensating delete IS the atomicity guarantee.
 *
 * APPROVAL is deliberately NOT here: the created user is `blocked: true` (so
 * users-permissions already refuses login) and the venue is an unpublished
 * `pending` draft. Unblocking + publishing + `status: "approved"` is an admin
 * action owned by the platform-administration epic.
 */
import type { Core } from "@strapi/strapi"
import type { VenueRegistrationInput } from "../validation/registration"

import {
  buildAdminNotificationEmail,
  buildApplicantConfirmationEmail,
  normalizeLocale,
} from "./registration-emails"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const
const ROLE_UID = "plugin::users-permissions.role" as const

/** The users-permissions role `type` a venue applicant is provisioned into. */
const VENUE_MANAGER_ROLE_TYPE = "venue-manager"

/** Error code: an account already exists for the applicant's email. */
export const EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
/** Error code: the `venue-manager` role is missing from the database. */
export const VENUE_MANAGER_ROLE_MISSING = "VENUE_MANAGER_ROLE_MISSING"
/** Error code: venue creation failed (the created user was rolled back). */
export const VENUE_REGISTRATION_FAILED = "VENUE_REGISTRATION_FAILED"

/** Attach a stable error CODE to a thrown Error (mirrors ticketing's helper). */
function codedError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code })
}

/**
 * Does `err` look like a UNIQUE-constraint violation on the users table?
 *
 * The duplicate guard and `user.add` are NOT atomic — two concurrent
 * submissions for the same address both pass the guard, and the loser's insert
 * is rejected by the database. That collision is semantically "this email is
 * already registered" (409), not an internal fault (500), so it must be
 * recognized rather than allowed to fall through to `INTERNAL_ERROR` and
 * contradict the spec's duplicate row.
 *
 * Matched broadly on purpose — the shape depends on the driver and on whether
 * users-permissions itself raised the error first: Postgres surfaces SQLSTATE
 * `23505`, SQLite/MySQL surface a message, and users-permissions' own guard
 * throws an `ApplicationError` saying the email/username is taken.
 */
function isUniqueViolation(err: unknown): boolean {
  const e = err as
    | { code?: unknown; message?: unknown; name?: unknown }
    | null
    | undefined
  if (!e) return false

  if (e.code === "23505" || e.code === "ER_DUP_ENTRY") return true

  const message = typeof e.message === "string" ? e.message.toLowerCase() : ""
  return (
    message.includes("unique constraint") ||
    message.includes("duplicate key") ||
    message.includes("already taken") ||
    message.includes("already exists")
  )
}

export interface RegisterVenueResult {
  venueDocumentId: string
  status: "pending"
}

const registrationService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Register a venue application. See the module docstring for the ordering
   * rationale. Returns the created venue's `documentId` and its `pending`
   * status; never returns anything about the created user.
   */
  async registerVenue(
    input: VenueRegistrationInput
  ): Promise<RegisterVenueResult> {
    const { venue, manager } = input
    const email = manager.email.trim().toLowerCase()

    // 1. Duplicate guard. users-permissions stores emails as entered, so match
    //    case-insensitively — an applicant must not be able to shadow an
    //    existing account by changing the casing.
    //
    //    BOTH columns are checked: step 3 sets `username: email`, and `username`
    //    carries its own UNIQUE index. Guarding on `email` alone lets an
    //    applicant whose address is someone else's *username* pass the check and
    //    then collide at insert time — which used to surface as a raw DB error
    //    mapped to 500 INTERNAL_ERROR instead of the specified 409.
    const existing = await strapi
      .query("plugin::users-permissions.user")
      .findOne({
        where: {
          $or: [{ email: { $eqi: email } }, { username: { $eqi: email } }],
        },
      })

    if (existing) {
      throw codedError("Email already registered", EMAIL_ALREADY_REGISTERED)
    }

    // 2. Role lookup. `venue-manager` (hyphen) is created by
    //    `src/bootstrap/venue-manager-role.ts`; its absence is an operator
    //    misconfiguration, not a client error.
    const role = await strapi
      .query(ROLE_UID)
      .findOne({ where: { type: VENUE_MANAGER_ROLE_TYPE } })

    if (!role) {
      strapi.log.error(
        `[venues:registration] role "${VENUE_MANAGER_ROLE_TYPE}" is missing — cannot provision a venue manager`
      )
      throw codedError("Venue manager role missing", VENUE_MANAGER_ROLE_MISSING)
    }

    // 3. Create the manager account. `user.add` hashes the password.
    //    `confirmed: true` skips the email-confirmation flow (there is nothing
    //    to confirm yet); `blocked: true` is what makes the account inert until
    //    an admin approves the application.
    //
    //    The call is wrapped because the guard above is NOT atomic with it: two
    //    concurrent submissions for the same address both pass step 1 and the
    //    loser collides on the `email`/`username` UNIQUE index. That collision
    //    means "already registered" (409), so it is translated rather than left
    //    to escape as an unmapped error the controller would report as a 500.
    let user: { id: number }
    try {
      user = await strapi.plugins["users-permissions"].services.user.add({
        username: email,
        email,
        password: manager.password,
        firstName: manager.firstName,
        lastName: manager.lastName,
        ...(manager.preferredLanguage
          ? { preferredLanguage: manager.preferredLanguage }
          : {}),
        provider: "local",
        confirmed: true,
        blocked: true,
        role: role.id,
      })
    } catch (err) {
      if (isUniqueViolation(err)) {
        strapi.log.warn(
          `[venues:registration] user creation lost a race on a unique constraint: ${err}`
        )
        throw codedError("Email already registered", EMAIL_ALREADY_REGISTERED)
      }
      strapi.log.error(`[venues:registration] user creation failed: ${err}`)
      throw codedError("Venue registration failed", VENUE_REGISTRATION_FAILED)
    }

    // 4. Create the venue as an UNPUBLISHED draft in `pending`. No `status: "published"`
    //    is passed, so the Document Service leaves it in draft — it cannot leak
    //    into any public listing (which additionally filters on `approved`).
    let created: { documentId: string }
    try {
      created = await strapi.documents(VENUE_UID).create({
        data: {
          name: venue.name,
          description: venue.description,
          address: venue.address,
          type: venue.type,
          phone: venue.phone,
          email: venue.email,
          website: venue.website,
          capacity: venue.capacity,
          geo: venue.geo,
          logo: venue.logo,
          images: venue.images,
          status: "pending",
          manager: user.id,
        } as never,
      })
    } catch (err) {
      // Compensating delete: no cross-store transaction exists, so undo the one
      // side that did succeed before surfacing the failure.
      try {
        await strapi.plugins["users-permissions"].services.user.remove({
          id: user.id,
        })
      } catch (cleanupErr) {
        strapi.log.error(
          `[venues:registration] failed to roll back user ${user.id}: ${cleanupErr}`
        )
      }
      strapi.log.error(`[venues:registration] venue creation failed: ${err}`)
      throw codedError("Venue registration failed", VENUE_REGISTRATION_FAILED)
    }

    const applicantName = `${manager.firstName} ${manager.lastName}`.trim()

    // 5. Notifications. Each send is isolated: an email failure can NEVER turn a
    //    successful registration into an error response.
    await this.sendApplicantConfirmation({
      to: email,
      locale: manager.preferredLanguage,
      applicantName,
      venueName: venue.name,
    })

    await this.sendAdminNotification({
      venueName: venue.name,
      contactEmail: venue.email,
      applicantName,
      venueDocumentId: created.documentId,
    })

    return { venueDocumentId: created.documentId, status: "pending" }
  },

  /** Best-effort applicant confirmation. Logs and swallows every failure. */
  async sendApplicantConfirmation(params: {
    to: string
    locale?: string
    applicantName: string
    venueName: string
  }): Promise<void> {
    try {
      const { subject, html } = buildApplicantConfirmationEmail(
        normalizeLocale(params.locale),
        {
          applicantName: params.applicantName,
          venueName: params.venueName,
        }
      )
      await strapi.plugins["email"].services.email.send({
        to: params.to,
        subject,
        html,
      })
    } catch (err) {
      strapi.log.error(
        `[venues:registration] applicant confirmation email failed: ${err}`
      )
    }
  },

  /**
   * Best-effort admin notification. Skipped with a warning when
   * `ADMIN_NOTIFICATION_EMAIL` is unset — an unconfigured operator address is
   * not an applicant-facing failure.
   */
  async sendAdminNotification(params: {
    venueName: string
    contactEmail: string
    applicantName: string
    venueDocumentId: string
  }): Promise<void> {
    const adminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL ?? "").trim()
    if (!adminEmail) {
      strapi.log.warn(
        "[venues:registration] ADMIN_NOTIFICATION_EMAIL is not configured — admin notification skipped"
      )
      return
    }

    try {
      const { subject, html } = buildAdminNotificationEmail(params)
      await strapi.plugins["email"].services.email.send({
        to: adminEmail,
        subject,
        html,
      })
    } catch (err) {
      strapi.log.error(
        `[venues:registration] admin notification email failed: ${err}`
      )
    }
  },
})

export default registrationService
