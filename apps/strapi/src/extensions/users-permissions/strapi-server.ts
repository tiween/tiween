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

/**
 * Providers whose email is verified by the provider itself, making email-based
 * account linking safe. Only these get the linking + profile-enrichment
 * treatment; every other provider (including `local`) delegates unchanged.
 */
export const TRUSTED_SOCIAL_PROVIDERS = new Set(["google", "facebook"])

export interface SocialProfile {
  email: string | null
  /** Whether the provider itself asserts the email is verified — the only case in
   *  which email-based linking into an existing account is safe. */
  emailVerified: boolean
  name: string | null
  avatarUrl: string | null
}

const EMPTY_SOCIAL_PROFILE: SocialProfile = {
  email: null,
  emailVerified: false,
  name: null,
  avatarUrl: null,
}

/**
 * Fetch the provider profile (display name + avatar) that the stock
 * Google/Facebook connect only partially exposes (`{username,email}`).
 *
 * Uses the Node 22 global `fetch`. Never throws for the caller's benefit —
 * returns nulls on any failure so login is never blocked by profile enrichment.
 */
export async function fetchSocialProfile(
  provider: string,
  accessToken: string
): Promise<SocialProfile> {
  try {
    if (provider === "google") {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        return EMPTY_SOCIAL_PROFILE
      }
      const data = (await res.json()) as {
        email?: string
        email_verified?: boolean
        name?: string
        picture?: string
      }
      return {
        email: data.email ?? null,
        // Google returns `email_verified`; only a verified email may be linked.
        emailVerified: data.email_verified === true,
        name: data.name ?? null,
        avatarUrl: data.picture ?? null,
      }
    }

    if (provider === "facebook") {
      const url = `https://graph.facebook.com/me?fields=name,email,picture&access_token=${encodeURIComponent(
        accessToken
      )}`
      const res = await fetch(url)
      if (!res.ok) {
        return EMPTY_SOCIAL_PROFILE
      }
      const data = (await res.json()) as {
        email?: string
        name?: string
        picture?: { data?: { url?: string } }
      }
      return {
        email: data.email ?? null,
        // Facebook only ever returns a verified email (it requires confirmation).
        emailVerified: Boolean(data.email),
        name: data.name ?? null,
        avatarUrl: data.picture?.data?.url ?? null,
      }
    }
  } catch (err) {
    strapi.log.error("[social-login] failed to fetch provider profile", err)
  }

  return EMPTY_SOCIAL_PROFILE
}

interface CallbackCtx {
  params: { provider?: string }
  query: Record<string, unknown>
  state?: { auth?: unknown }
  body?: unknown
}

/**
 * Sanitize a user for the response body, mirroring the stock callback
 * controller's `sanitizeUser` (contentAPI output sanitizer with the request
 * auth), so the linking branch returns the same shape as `ctx.send({jwt,user})`.
 */
async function sanitizeOutputUser(
  user: Record<string, unknown>,
  ctx: CallbackCtx
): Promise<unknown> {
  const userSchema = strapi.getModel("plugin::users-permissions.user")
  return strapi.contentAPI.sanitize.output(user, userSchema, {
    auth: ctx.state?.auth,
  })
}

interface RegisterCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

type RegisterController = (ctx: RegisterCtx) => Promise<unknown>
type CallbackController = (ctx: CallbackCtx) => Promise<unknown>

interface UsersPermissionsPlugin {
  controllers: {
    auth: {
      register: RegisterController
      callback: CallbackController
    }
  }
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

  // --- Story 4.2: social-login callback override -------------------------------
  //
  // Wrap the stock `GET /auth/:provider/callback` (a JSON endpoint returning
  // `{jwt,user}`) so that, for TRUSTED social providers only:
  //   1. A social login whose provider-verified email already exists under a
  //      DIFFERENT provider is LINKED (signed into the same account) instead of
  //      being rejected with "Email is already taken" — the existing user's
  //      `provider` field is never overwritten.
  //   2. A brand-new social account gets `firstName` + `avatarUrl` from the
  //      provider and a non-blocking localized welcome email.
  // Non-trusted providers and `local` delegate to the stock controller unchanged.
  const originalCallback = plugin.controllers.auth.callback

  plugin.controllers.auth.callback = async (ctx: CallbackCtx) => {
    const provider = ctx.params.provider || "local"

    if (!TRUSTED_SOCIAL_PROVIDERS.has(provider)) {
      return originalCallback(ctx)
    }

    const token = String(
      ctx.query.access_token ?? ctx.query.code ?? ctx.query.oauth_token ?? ""
    )

    // Fetch the richer provider profile (name + avatar) up front.
    const profile = await fetchSocialProfile(provider, token)
    const email = String(profile.email ?? "").toLowerCase()

    const userService = strapi.plugin("users-permissions").service("user")

    // Pre-lookup: does an account already exist for this verified email?
    const preExisting = email
      ? await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({ where: { email } })
      : null

    try {
      // Stock controller: create a new account OR repeat-login → sets ctx.body.
      await originalCallback(ctx)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // LINK: an account already exists for this email under a different provider.
      // Only link a PROVIDER-VERIFIED email (else this is an account-takeover vector).
      // Re-query at catch time — not the pre-lookup — so a concurrent first-login
      // race also links instead of surfacing a raw error.
      if (email && profile.emailVerified && /already taken/i.test(message)) {
        const linkTarget = await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({ where: { email } })
        // Never let the social path bypass an administrator block that the stock
        // repeat-login path enforces. A blocked target falls through to `throw err`.
        if (linkTarget && !linkTarget.blocked) {
          // Sign into the SAME existing account. Do NOT clobber its provider.
          ctx.body = {
            jwt: strapi
              .plugin("users-permissions")
              .service("jwt")
              .issue({ id: linkTarget.id }),
            user: await sanitizeOutputUser(linkTarget, ctx),
          }
          return
        }
      }
      throw err
    }

    // Brand-new account only. Requires BOTH that the pre-lookup found nothing AND
    // that we actually resolved an email from the provider — without a fetched
    // email we cannot distinguish a fresh account from a repeat login, so we skip
    // enrichment rather than clobber an existing user's data / re-send the email.
    const body = ctx.body as
      | { user?: Record<string, unknown> & { id?: number } }
      | undefined
    const createdUser = body?.user

    if (!preExisting && email && createdUser?.id != null) {
      // Persist only the fields the provider actually supplied (no null overwrites).
      const patch: { firstName?: string; avatarUrl?: string } = {}
      if (profile.name) patch.firstName = profile.name
      if (profile.avatarUrl) patch.avatarUrl = profile.avatarUrl

      if (Object.keys(patch).length > 0) {
        try {
          await userService.edit(createdUser.id, patch)
          Object.assign(createdUser, patch)
        } catch (err) {
          strapi.log.error("[social-login] failed to persist profile", err)
        }
      }

      // Non-blocking welcome email — kept in its OWN try/catch so a profile-persist
      // failure never suppresses it. No request locale on the OAuth callback, so it
      // falls back to the user's preferredLanguage → "fr".
      try {
        await sendWelcomeEmail(createdUser, profile.name ?? "")
      } catch (err) {
        strapi.log.error("[social-login] welcome email failed to send", err)
      }
    }
  }

  return plugin
}
