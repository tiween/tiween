/**
 * Users-Permissions plugin extension.
 *
 * Overrides the default `auth.register` controller to close the Story 4.1 gaps
 * on top of the already-wired register flow:
 *
 *  1. Validate `{ name, email, password }` server-side with Zod via the shared
 *     `validate()` helper — surfacing stable error CODES (never prose); the
 *     client translates them via next-intl. Password policy matches the client:
 *     8+ chars with at least one uppercase, one lowercase, and one digit.
 *  2. Persist the entered name as `firstName` on the created user. The default
 *     register controller rejects unknown body keys and never persists custom
 *     fields, so `name`/`firstName` are stripped before delegating and the user
 *     is updated afterwards via the users-permissions user service.
 *  3. Delegate to the ORIGINAL register controller so a JWT is returned and the
 *     client auto-login (NextAuth credentials) is preserved. Email confirmation
 *     stays OFF.
 *  4. Send a localized welcome email (AR/FR/EN) non-blockingly. The locale is
 *     resolved with precedence: explicit request `locale` → the user's
 *     `preferredLanguage` → `fr`. A send failure is logged and swallowed — it
 *     MUST NOT fail registration.
 *
 * Note: the user lifecycle (`src/lifeCycles/user.ts`) returns early for
 * self-registered `confirmed:true` users, so the welcome email must live here.
 */
import { z } from "zod"

import type { Core } from "@strapi/strapi"

import { validate } from "../../shared/validation"

// `strapi` is the ambient global available inside Strapi controllers.
declare const strapi: Core.Strapi

type SupportedLocale = "ar" | "fr" | "en"

/**
 * Server-side registration schema. Each message is a STABLE error CODE (not
 * prose); the client maps these codes to localized strings.
 */
const registerSchema = z.object({
  name: z
    .string({
      required_error: "NAME_REQUIRED",
      invalid_type_error: "NAME_REQUIRED",
    })
    .trim()
    .min(1, {
      message: "NAME_REQUIRED",
    }),
  email: z
    .string({
      required_error: "EMAIL_REQUIRED",
      invalid_type_error: "EMAIL_REQUIRED",
    })
    .email("INVALID_EMAIL"),
  password: z
    .string({
      required_error: "PASSWORD_REQUIRED",
      invalid_type_error: "PASSWORD_REQUIRED",
    })
    .min(8, "PASSWORD_TOO_SHORT")
    .max(72, "PASSWORD_TOO_LONG")
    .regex(/[A-Z]/, "PASSWORD_NO_UPPERCASE")
    .regex(/[a-z]/, "PASSWORD_NO_LOWERCASE")
    .regex(/\d/, "PASSWORD_NO_DIGIT"),
})

/** Escape a string for safe interpolation into HTML attribute/text content. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Localized welcome-email content, keyed off the user's preferred language. */
export function buildWelcomeEmail(
  locale: SupportedLocale,
  name: string
): { subject: string; html: string } {
  const safeName = escapeHtml(name || "")

  const content: Record<SupportedLocale, { subject: string; html: string }> = {
    fr: {
      subject: "Bienvenue sur Tiween",
      html: `<h2>Bienvenue${safeName ? `, ${safeName}` : ""} !</h2><p>Votre compte Tiween a bien été créé. Découvrez dès maintenant les événements près de chez vous.</p>`,
    },
    en: {
      subject: "Welcome to Tiween",
      html: `<h2>Welcome${safeName ? `, ${safeName}` : ""}!</h2><p>Your Tiween account has been created. Start exploring the events happening near you.</p>`,
    },
    ar: {
      subject: "مرحباً بك في تيوين",
      html: `<h2>مرحباً${safeName ? ` ${safeName}` : ""}!</h2><p>تم إنشاء حسابك في تيوين بنجاح. اكتشف الآن الفعاليات القريبة منك.</p>`,
    },
  }

  return content[locale]
}

/**
 * Normalize a locale-ish value to a supported locale, accepting case/region
 * variants (e.g. "EN", "en-US", "ar-MA"). Falls back to "fr".
 */
function normalizeLocale(value: unknown): SupportedLocale {
  if (value == null) {
    return "fr"
  }
  const base = String(value).toLowerCase().split("-")[0]
  return base === "ar" || base === "en" ? base : "fr"
}

interface CreatedUser {
  id?: number
  email?: string
  firstName?: string
  preferredLanguage?: string
}

/**
 * Send the localized welcome email. Throws on failure — callers MUST wrap this
 * in a try/catch so registration is never blocked by an email error.
 */
export async function sendWelcomeEmail(
  user: CreatedUser,
  name: string,
  requestLocale?: unknown
): Promise<void> {
  if (!user?.email) {
    return
  }

  // Precedence: explicit request locale → user.preferredLanguage → "fr".
  const locale =
    requestLocale != null
      ? normalizeLocale(requestLocale)
      : normalizeLocale(user.preferredLanguage)
  const { subject, html } = buildWelcomeEmail(locale, name)

  await strapi.plugins["email"].services.email.send({
    to: user.email,
    subject,
    html,
  })
}

interface RegisterCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

type RegisterController = (ctx: RegisterCtx) => Promise<unknown>

interface UsersPermissionsPlugin {
  controllers: { auth: { register: RegisterController } }
}

export default (plugin: UsersPermissionsPlugin): UsersPermissionsPlugin => {
  const originalRegister = plugin.controllers.auth.register

  plugin.controllers.auth.register = async (ctx: RegisterCtx) => {
    const body = ctx.request.body
    const rawName = body.firstName ?? body.name
    // Read the request locale BEFORE stripping custom keys — it drives the
    // welcome-email language for brand-new registrants (no preferredLanguage yet).
    const requestLocale = body.locale

    // 1. Validate — throws a Strapi ValidationError carrying stable codes.
    const input = validate(registerSchema, {
      name: rawName,
      email: body.email,
      password: body.password,
    })

    // 2. Strip custom keys: the default controller rejects unknown body keys.
    delete body.name
    delete body.firstName
    delete body.locale

    // 3. Delegate to the original controller (issues JWT, preserves auto-login).
    await originalRegister(ctx)

    // 4. Persist firstName on the created user (default register drops it).
    const responseBody = ctx.body as { user?: CreatedUser } | undefined
    const createdUser = responseBody?.user

    if (createdUser?.id != null) {
      try {
        await strapi
          .plugin("users-permissions")
          .service("user")
          .edit(createdUser.id, { firstName: input.name })
        createdUser.firstName = input.name
      } catch (err) {
        strapi.log.error("[register] failed to persist firstName", err)
      }

      // 5. Non-blocking localized welcome email — never fails registration.
      //    Locale precedence: request locale → user.preferredLanguage → "fr".
      try {
        await sendWelcomeEmail(createdUser, input.name, requestLocale)
      } catch (err) {
        strapi.log.error("[register] welcome email failed to send", err)
      }
    }
  }

  return plugin
}
