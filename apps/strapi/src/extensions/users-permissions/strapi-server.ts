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
import { randomBytes } from "crypto"

import { errors } from "@strapi/utils"
import { z } from "zod"

import type { Core } from "@strapi/strapi"

import { validate } from "../../shared/validation"

const { ValidationError } = errors

/** Default reset-token time-to-live: 1 hour, in milliseconds. */
const DEFAULT_RESET_TOKEN_TTL_MS = 3_600_000

/**
 * Resolve the reset-token TTL from `RESET_TOKEN_TTL_MS`, honoring it ONLY when
 * it parses to a finite number greater than zero; otherwise the 1h default.
 */
function resolveResetTokenTtlMs(): number {
  const raw = Number(process.env.RESET_TOKEN_TTL_MS)
  // Upper bound guards against a value so large that `Date.now() + ttl` overflows
  // the max representable Date (8.64e15 ms), which would store an Invalid Date and
  // make the token effectively non-expiring.
  return Number.isFinite(raw) && raw > 0 && raw <= 8.64e15
    ? raw
    : DEFAULT_RESET_TOKEN_TTL_MS
}

/**
 * True when `err` looks like a unique-constraint violation, inspecting BOTH the
 * message AND `err.details` — Strapi/DB drivers surface the "must be unique"
 * signal in either place. Used to map such a failure to a stable code
 * (`USERNAME_TAKEN` / `EMAIL_TAKEN`) instead of leaking a raw 500.
 */
function isUniqueViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  let details = ""
  try {
    details = JSON.stringify((err as { details?: unknown })?.details ?? "")
  } catch {
    details = ""
  }
  return /unique|already taken|ER_DUP|duplicate/i.test(`${message} ${details}`)
}

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

/**
 * Server-side reset-password schema. Reuses the SAME password policy as
 * registration (8+ chars, upper, lower, digit, max 72) so the server is never
 * weaker than the client. Each message is a STABLE error CODE, not prose.
 */
const resetPasswordSchema = z.object({
  password: registerSchema.shape.password,
})

/**
 * Server-side self-profile-update schema (`PUT /users/me`). Every field is
 * OPTIONAL — a profile save may touch any subset — but each present value is
 * validated. Display name maps to `username`; an empty/whitespace name is a
 * stable `NAME_REQUIRED` code. `avatar`/`defaultRegion` are ID references linked
 * self-scoped by the controller. No `email`/`role`/`confirmed`/token fields are
 * accepted here (they are not in the schema and the controller never forwards
 * them).
 */
const updateMeSchema = z.object({
  username: z
    .string({
      required_error: "NAME_REQUIRED",
      invalid_type_error: "NAME_REQUIRED",
    })
    .trim()
    .min(1, { message: "NAME_REQUIRED" })
    .optional(),
  preferredLanguage: z.enum(["ar", "fr", "en"]).optional(),
  // Global email-notifications preference (Story 5.6). Governs schedule-change
  // email delivery; in-app notifications are gated separately by the per-item
  // watchlist `notifyChanges`.
  emailNotificationsEnabled: z.boolean().optional(),
  // Relation reference: a Strapi documentId (string) or numeric id.
  defaultRegion: z.union([z.string(), z.number()]).optional(),
  // Uploaded media file id, linked self-scoped through this controller. A
  // stable `INVALID_AVATAR` code (never Zod prose) is surfaced on a bad type.
  avatar: z.number({ invalid_type_error: "INVALID_AVATAR" }).optional(),
})

/**
 * Server-side change-email request schema. A stable `INVALID_EMAIL` code (never
 * Zod prose) is surfaced to the client for translation.
 */
const changeEmailSchema = z.object({
  email: z
    .string({
      required_error: "INVALID_EMAIL",
      invalid_type_error: "INVALID_EMAIL",
    })
    .email("INVALID_EMAIL"),
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
 * Localized password-reset email content, keyed off the recipient's preferred
 * language. The `url` is the CLIENT-hosted, single-use, time-limited reset link.
 */
export function buildResetPasswordEmail(
  locale: SupportedLocale,
  name: string,
  url: string
): { subject: string; html: string } {
  const safeName = escapeHtml(name || "")
  const safeUrl = escapeHtml(url)

  const content: Record<SupportedLocale, { subject: string; html: string }> = {
    fr: {
      subject: "Réinitialisation de votre mot de passe Tiween",
      html: `<h2>Réinitialisation du mot de passe</h2><p>Bonjour${safeName ? ` ${safeName}` : ""},</p><p>Vous avez demandé à réinitialiser votre mot de passe Tiween. Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans une heure.</p><p><a href="${safeUrl}" target="_blank">Réinitialiser mon mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>`,
    },
    en: {
      subject: "Reset your Tiween password",
      html: `<h2>Password reset</h2><p>Hello${safeName ? ` ${safeName}` : ""},</p><p>You asked to reset your Tiween password. Click the link below to choose a new password. This link expires in one hour.</p><p><a href="${safeUrl}" target="_blank">Reset my password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
    },
    ar: {
      subject: "إعادة تعيين كلمة مرور تيوين",
      html: `<h2>إعادة تعيين كلمة المرور</h2><p>مرحباً${safeName ? ` ${safeName}` : ""},</p><p>لقد طلبت إعادة تعيين كلمة مرور تيوين الخاصة بك. انقر على الرابط أدناه لاختيار كلمة مرور جديدة. تنتهي صلاحية هذا الرابط خلال ساعة واحدة.</p><p><a href="${safeUrl}" target="_blank">إعادة تعيين كلمة المرور</a></p><p>إذا لم تكن أنت من قدّم هذا الطلب، يمكنك تجاهل هذا البريد الإلكتروني.</p>`,
    },
  }

  return content[locale]
}

/**
 * Localized change-email confirmation content, keyed off the recipient's
 * preferred language. The `url` is the CLIENT-hosted, single-use, time-limited
 * confirmation link and is sent to the NEW (pending) address, not the live one.
 */
export function buildEmailChangeEmail(
  locale: SupportedLocale,
  name: string,
  url: string
): { subject: string; html: string } {
  const safeName = escapeHtml(name || "")
  const safeUrl = escapeHtml(url)

  const content: Record<SupportedLocale, { subject: string; html: string }> = {
    fr: {
      subject: "Confirmez votre nouvelle adresse e-mail Tiween",
      html: `<h2>Confirmation d'adresse e-mail</h2><p>Bonjour${safeName ? ` ${safeName}` : ""},</p><p>Vous avez demandé à changer l'adresse e-mail de votre compte Tiween. Cliquez sur le lien ci-dessous pour confirmer cette nouvelle adresse. Ce lien expire dans une heure.</p><p><a href="${safeUrl}" target="_blank">Confirmer ma nouvelle adresse e-mail</a></p><p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>`,
    },
    en: {
      subject: "Confirm your new Tiween email address",
      html: `<h2>Email address confirmation</h2><p>Hello${safeName ? ` ${safeName}` : ""},</p><p>You asked to change the email address on your Tiween account. Click the link below to confirm this new address. This link expires in one hour.</p><p><a href="${safeUrl}" target="_blank">Confirm my new email address</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
    },
    ar: {
      subject: "أكّد عنوان بريدك الإلكتروني الجديد في تيوين",
      html: `<h2>تأكيد عنوان البريد الإلكتروني</h2><p>مرحباً${safeName ? ` ${safeName}` : ""},</p><p>لقد طلبت تغيير عنوان البريد الإلكتروني لحسابك في تيوين. انقر على الرابط أدناه لتأكيد هذا العنوان الجديد. تنتهي صلاحية هذا الرابط خلال ساعة واحدة.</p><p><a href="${safeUrl}" target="_blank">تأكيد عنوان بريدي الإلكتروني الجديد</a></p><p>إذا لم تكن أنت من قدّم هذا الطلب، يمكنك تجاهل هذا البريد الإلكتروني.</p>`,
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
 * Send the localized password-reset email. Throws on failure — callers MUST wrap
 * this in a try/catch so the forgot-password flow is never blocked (and never
 * leaks whether the account exists) by an email-provider error.
 */
export async function sendPasswordResetEmail(
  user: CreatedUser,
  url: string,
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
  const name = user.firstName ?? ""
  const { subject, html } = buildResetPasswordEmail(locale, name, url)

  await strapi.plugins["email"].services.email.send({
    to: user.email,
    subject,
    html,
  })
}

/**
 * Send the localized change-email confirmation to the NEW (pending) address.
 * Throws on failure — callers MUST wrap this in a try/catch so the change-email
 * request is never blocked by an email-provider error (the token is already
 * staged).
 */
export async function sendEmailChangeEmail(
  user: CreatedUser,
  pendingEmail: string,
  url: string,
  requestLocale?: unknown
): Promise<void> {
  if (!pendingEmail) {
    return
  }

  // Precedence: explicit request locale → user.preferredLanguage → "fr".
  const locale =
    requestLocale != null
      ? normalizeLocale(requestLocale)
      : normalizeLocale(user?.preferredLanguage)
  const name = user?.firstName ?? ""
  const { subject, html } = buildEmailChangeEmail(locale, name, url)

  await strapi.plugins["email"].services.email.send({
    to: pendingEmail,
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
  ctx: { state?: { auth?: unknown } }
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

interface ForgotPasswordCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

interface ResetPasswordCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

/** Minimal shape of the authenticated user Strapi puts on `ctx.state.user`. */
interface AuthedUser {
  id?: number
  email?: string
  firstName?: string
  preferredLanguage?: string
}

interface UpdateMeCtx {
  state?: { user?: AuthedUser; auth?: unknown }
  request: { body: Record<string, unknown> }
  body?: unknown
  unauthorized: (message?: string) => unknown
}

interface ChangeEmailCtx {
  state?: { user?: AuthedUser }
  request: { body: Record<string, unknown> }
  body?: unknown
  unauthorized: (message?: string) => unknown
}

interface ConfirmEmailChangeCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

type RegisterController = (ctx: RegisterCtx) => Promise<unknown>
type CallbackController = (ctx: CallbackCtx) => Promise<unknown>
type ForgotPasswordController = (ctx: ForgotPasswordCtx) => Promise<unknown>
type ResetPasswordController = (ctx: ResetPasswordCtx) => Promise<unknown>
type UpdateMeController = (ctx: UpdateMeCtx) => Promise<unknown>
type ChangeEmailController = (ctx: ChangeEmailCtx) => Promise<unknown>
type ConfirmEmailChangeController = (
  ctx: ConfirmEmailChangeCtx
) => Promise<unknown>

interface RouteConfig {
  method: string
  path: string
  handler: string
  config?: { prefix?: string; policies?: unknown[] }
}

interface JwtPayload {
  id?: number
  iat?: number
  exp?: number
}

interface JwtService {
  verify: (token: string) => JwtPayload | Promise<JwtPayload>
  issue?: (payload: object, options?: unknown) => string
}

type JwtServiceFactory = (deps: unknown) => JwtService

interface UsersPermissionsPlugin {
  controllers: {
    auth: {
      register: RegisterController
      callback: CallbackController
      forgotPassword: ForgotPasswordController
      resetPassword: ResetPasswordController
      changeEmail?: ChangeEmailController
      confirmEmailChange?: ConfirmEmailChangeController
    }
    user?: {
      updateMe?: UpdateMeController
      [key: string]: unknown
    }
  }
  services: {
    jwt: JwtServiceFactory
  }
  routes?: Record<string, { routes: RouteConfig[] }>
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

  // --- Story 4.3: forgot-password override -------------------------------------
  //
  // Replace the stock `POST /auth/forgot-password` so it:
  //   - NEVER leaks whether the account exists: always responds `{ ok: true }`;
  //   - SKIPS admin-`blocked` accounts silently (no token, no email);
  //   - mints its OWN single-use token (`crypto.randomBytes(64)`) with an
  //     expiry (`resetPasswordTokenExpiresAt = now + TTL`, 1h default);
  //   - sends a localized AR/FR/EN reset email with the CLIENT-hosted
  //     `?code=&email=` link, swallowing + logging any send error.
  plugin.controllers.auth.forgotPassword = async (ctx: ForgotPasswordCtx) => {
    const body = ctx.request.body ?? {}
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const requestLocale = body.locale

    if (email) {
      try {
        const user = await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({ where: { email } })

        // Skip non-existent AND admin-blocked accounts — a reset must never
        // restore access an administrator revoked.
        if (user && !user.blocked) {
          const resetPasswordToken = randomBytes(64).toString("hex")
          const expiresAt = new Date(Date.now() + resolveResetTokenTtlMs())

          await strapi
            .plugin("users-permissions")
            .service("user")
            .edit(user.id, {
              resetPasswordToken,
              resetPasswordTokenExpiresAt: expiresAt,
            })

          const baseUrl = process.env.CLIENT_RESET_PASSWORD_URL
          if (!baseUrl) {
            strapi.log.warn(
              "CLIENT_RESET_PASSWORD_URL is not set. Password reset email will not be sent."
            )
          } else {
            const url = `${baseUrl}?code=${resetPasswordToken}&email=${encodeURIComponent(
              user.email
            )}`
            try {
              await sendPasswordResetEmail(user, url, requestLocale)
            } catch (err) {
              strapi.log.error(
                "[password-reset] reset email failed to send",
                err
              )
            }
          }
        }
      } catch (err) {
        // A DB/service error must not leak account existence either.
        strapi.log.error("[password-reset] forgotPassword failed", err)
      }
    }

    ctx.body = { ok: true }
  }

  // --- Story 4.3: reset-password override --------------------------------------
  //
  // Wrap the stock `POST /auth/reset-password` to add expiry enforcement, the
  // project password policy, stable error codes, and the `passwordChangedAt`
  // session-invalidation boundary. The stock controller still performs the hash,
  // single-use token clear, and JWT issue.
  const originalResetPassword = plugin.controllers.auth.resetPassword

  plugin.controllers.auth.resetPassword = async (ctx: ResetPasswordCtx) => {
    const body = ctx.request.body ?? {}
    const code = body.code != null ? String(body.code) : ""

    // 1. Expiry check — ONLY when an expiry is set. Activation links minted by
    //    `lifeCycles/user.ts` carry no expiry, so that flow is unaffected. The
    //    boundary is `>=` so an exactly-expired token is rejected.
    if (code) {
      const tokenUser = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { resetPasswordToken: code },
          select: ["id", "blocked", "resetPasswordTokenExpiresAt"],
        })
      // A blocked account must not complete a reset (symmetry with the
      // blocked-skip in forgotPassword; login also rejects blocked users). Do not
      // reveal the block — surface the generic invalid-token code.
      if (tokenUser?.blocked) {
        throw new ValidationError("RESET_TOKEN_INVALID", {
          code: "RESET_TOKEN_INVALID",
        })
      }
      if (tokenUser?.resetPasswordTokenExpiresAt) {
        const expiresAt = new Date(
          tokenUser.resetPasswordTokenExpiresAt
        ).getTime()
        if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
          throw new ValidationError("RESET_TOKEN_EXPIRED", {
            code: "RESET_TOKEN_EXPIRED",
          })
        }
      }
    }

    // 2. Enforce the project password policy (stable codes) BEFORE delegating.
    validate(resetPasswordSchema, { password: body.password })

    // 3. Delegate to stock: hash + single-use token clear + JWT issue → ctx.body.
    //    An unknown/used code surfaces as a stock rejection → RESET_TOKEN_INVALID.
    try {
      await originalResetPassword(ctx)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Stock throws "Incorrect code provided" for an unknown/used token — the
      // only case that is genuinely an invalid link. Anything else (transient
      // persistence/JWT-issue failure) must NOT be mislabeled as an invalid
      // link; surface a distinct generic code and log the real cause.
      if (/incorrect code/i.test(message)) {
        throw new ValidationError("RESET_TOKEN_INVALID", {
          code: "RESET_TOKEN_INVALID",
        })
      }
      strapi.log.error("[password-reset] resetPassword delegation failed", err)
      throw new ValidationError("RESET_FAILED", { code: "RESET_FAILED" })
    }

    // 4. Stamp `passwordChangedAt` to the freshly issued JWT's `iat` so the new
    //    auto-login session survives while every older-second JWT is rejected by
    //    the wrapped `jwt.verify`. If the issued body has no numeric `iat`, LOG
    //    and skip — defaulting to `new Date()` would self-revoke the fresh token.
    const responseBody = ctx.body as
      | { jwt?: string; user?: { id?: number } }
      | undefined
    const issuedJwt = responseBody?.jwt
    const userId = responseBody?.user?.id

    if (issuedJwt && userId != null) {
      let iat: number | undefined
      try {
        const payload = await strapi
          .plugin("users-permissions")
          .service("jwt")
          .verify(issuedJwt)
        iat = (payload as JwtPayload | undefined)?.iat
      } catch (err) {
        strapi.log.error(
          "[password-reset] failed to verify freshly issued jwt",
          err
        )
      }

      if (typeof iat === "number") {
        try {
          await strapi
            .plugin("users-permissions")
            .service("user")
            .edit(userId, {
              passwordChangedAt: new Date(iat * 1000),
              resetPasswordTokenExpiresAt: null,
            })
        } catch (err) {
          strapi.log.error(
            "[password-reset] failed to stamp passwordChangedAt",
            err
          )
        }
      } else {
        strapi.log.error(
          "[password-reset] issued jwt has no numeric iat; skipping passwordChangedAt stamp"
        )
      }
    } else {
      strapi.log.error(
        "[password-reset] stock reset returned no jwt/user id; skipping passwordChangedAt stamp"
      )
    }
  }

  // --- Story 4.3: session invalidation via jwt.verify wrap ---------------------
  //
  // Wrap the users-permissions `jwt` SERVICE factory so the returned instance's
  // `verify(token)` ALSO rejects tokens issued before the user's most recent
  // password reset. The users-permissions auth strategy authenticates EVERY
  // request via `getService("jwt").getToken(ctx)` → `this.verify(token)`, so
  // mutating this same instance's `verify` is the correct universal enforcement
  // point (a throw here surfaces as a standard 401). A global middleware cannot
  // do this — its pre-`next()` code runs before `ctx.state.user` is populated.
  const jwtFactory = plugin.services?.jwt
  if (typeof jwtFactory === "function") {
    plugin.services.jwt = (deps: unknown): JwtService => {
      const service = jwtFactory(deps)
      const originalVerify = service.verify.bind(service)
      service.verify = async (token: string): Promise<JwtPayload> => {
        const payload = await originalVerify(token)
        const iat = payload?.iat
        // Strict no-op unless we can identify the user and compare timestamps.
        if (payload?.id != null && typeof iat === "number") {
          try {
            const user = await strapi.db
              .query("plugin::users-permissions.user")
              .findOne({
                where: { id: payload.id },
                select: ["id", "passwordChangedAt"],
              })
            if (user?.passwordChangedAt) {
              const boundaryMs = new Date(user.passwordChangedAt).getTime()
              // Guard against an unparseable stored value (NaN) — without this the
              // `iat < NaN` comparison is always false and the check fails OPEN.
              if (Number.isFinite(boundaryMs)) {
                const boundarySec = Math.floor(boundaryMs / 1000)
                if (iat < boundarySec) {
                  throw new Error("Invalid token.")
                }
              }
            }
          } catch (err) {
            // Re-throw our own revocation; swallow lookup errors (fail-open — the
            // request already passed the stock verify, so never lock out on a DB
            // hiccup or an un-reset user whose field is unset).
            if (err instanceof Error && err.message === "Invalid token.") {
              throw err
            }
          }
        }
        return payload
      }
      return service
    }
  }

  // --- Story 4.4: self-scoped profile update (`PUT /users/me`) -----------------
  //
  // Stock `PUT /users/:id` accepts an arbitrary path id AND an arbitrary body
  // (including `email`, `role`, `confirmed`, `blocked`). Exposing it would be a
  // privilege-escalation + email-verification-bypass hole. Instead this SELF-
  // scoped controller ignores the path, writes ONLY `ctx.state.user.id`, and
  // applies a fixed whitelist — no `email`/`role`/`confirmed`/token field is
  // ever forwarded (they are not even in `updateMeSchema`).
  if (!plugin.controllers.user) {
    plugin.controllers.user = {}
  }

  plugin.controllers.user.updateMe = async (ctx: UpdateMeCtx) => {
    const userId = ctx.state?.user?.id
    if (!userId) {
      return ctx.unauthorized()
    }

    const body = ctx.request.body ?? {}

    // Validate ONLY the whitelisted fields; every other key is discarded here.
    const parsed = validate(updateMeSchema, {
      username: body.username,
      preferredLanguage: body.preferredLanguage,
      emailNotificationsEnabled: body.emailNotificationsEnabled,
      defaultRegion: body.defaultRegion,
      avatar: body.avatar,
    })

    // Write only the fields the client actually provided (skip `undefined`) so a
    // partial save never blanks an untouched field.
    const data: Record<string, unknown> = {}
    for (const key of [
      "username",
      "preferredLanguage",
      "emailNotificationsEnabled",
      "defaultRegion",
      "avatar",
    ] as const) {
      if (parsed[key] !== undefined) {
        data[key] = parsed[key]
      }
    }

    try {
      const updated = await strapi
        .plugin("users-permissions")
        .service("user")
        .edit(userId, data)
      ctx.body = await sanitizeOutputUser(updated, ctx)
    } catch (err) {
      // A username unique-constraint violation surfaces as a stable code.
      if (isUniqueViolation(err)) {
        throw new ValidationError("USERNAME_TAKEN", { code: "USERNAME_TAKEN" })
      }
      throw err
    }
  }

  // --- Story 4.4: change-email request (`POST /auth/change-email`) -------------
  //
  // Authenticated. Mirrors the password-reset staging pattern: it only STAGES a
  // `pendingEmail` + single-use, time-limited `emailChangeToken` and emails the
  // NEW address a confirmation link; the live `email` is never touched here.
  plugin.controllers.auth.changeEmail = async (ctx: ChangeEmailCtx) => {
    const authUser = ctx.state?.user
    if (!authUser?.id) {
      return ctx.unauthorized()
    }

    const body = ctx.request.body ?? {}
    const requestLocale = body.locale

    const { email } = validate(changeEmailSchema, { email: body.email })
    const normalizedEmail = email.trim().toLowerCase()
    const currentEmail = String(authUser.email ?? "")
      .trim()
      .toLowerCase()

    // Same-as-current is a no-op — reject before any staging.
    if (normalizedEmail === currentEmail) {
      throw new ValidationError("EMAIL_UNCHANGED", { code: "EMAIL_UNCHANGED" })
    }

    // Uniqueness: an email already registered to a (different) account is taken.
    // Case-insensitive (`$eqi`) — local registration does not lowercase the
    // stored email, so an exact match would miss a case-variant duplicate.
    const existing = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: { $eqi: normalizedEmail } } })
    if (existing) {
      throw new ValidationError("EMAIL_TAKEN", { code: "EMAIL_TAKEN" })
    }

    const emailChangeToken = randomBytes(64).toString("hex")
    const emailChangeTokenExpiresAt = new Date(
      Date.now() + resolveResetTokenTtlMs()
    )

    await strapi.plugin("users-permissions").service("user").edit(authUser.id, {
      pendingEmail: normalizedEmail,
      emailChangeToken,
      emailChangeTokenExpiresAt,
    })

    const baseUrl = process.env.CLIENT_EMAIL_CHANGE_URL
    if (!baseUrl) {
      strapi.log.warn(
        "CLIENT_EMAIL_CHANGE_URL is not set. Email-change confirmation email will not be sent."
      )
    } else {
      const url = `${baseUrl}?code=${emailChangeToken}&email=${encodeURIComponent(
        normalizedEmail
      )}`
      try {
        await sendEmailChangeEmail(
          authUser,
          normalizedEmail,
          url,
          requestLocale
        )
      } catch (err) {
        strapi.log.error(
          "[email-change] confirmation email failed to send",
          err
        )
      }
    }

    ctx.body = { ok: true }
  }

  // --- Story 4.4: confirm email change (`POST /auth/confirm-email-change`) -----
  //
  // Public (clicked from the confirmation email). Validates the single-use,
  // unexpired token, re-checks the pending address is still free, then swaps
  // `email = pendingEmail` and clears the staging fields. Does NOT auto-login
  // and does NOT stamp `passwordChangedAt` — an email change must not invalidate
  // the active session.
  plugin.controllers.auth.confirmEmailChange = async (
    ctx: ConfirmEmailChangeCtx
  ) => {
    const body = ctx.request.body ?? {}
    const code = body.code != null ? String(body.code) : ""

    if (!code) {
      throw new ValidationError("EMAIL_CHANGE_TOKEN_INVALID", {
        code: "EMAIL_CHANGE_TOKEN_INVALID",
      })
    }

    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { emailChangeToken: code } })

    // Unknown / already-used token.
    if (!user) {
      throw new ValidationError("EMAIL_CHANGE_TOKEN_INVALID", {
        code: "EMAIL_CHANGE_TOKEN_INVALID",
      })
    }

    // Expiry — `>=` boundary (an exactly-expired token is rejected). Unlike the
    // reset flow (whose activation tokens legitimately carry no expiry), a
    // change-email token is ALWAYS minted with an expiry, so a missing or
    // unparseable value is anomalous and fails CLOSED (rejected), never open.
    const expiresAt = user.emailChangeTokenExpiresAt
      ? new Date(user.emailChangeTokenExpiresAt).getTime()
      : NaN
    if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
      throw new ValidationError("EMAIL_CHANGE_TOKEN_EXPIRED", {
        code: "EMAIL_CHANGE_TOKEN_EXPIRED",
      })
    }

    const pendingEmail = String(user.pendingEmail ?? "")
      .trim()
      .toLowerCase()
    // A token with no staged pending address is not actionable.
    if (!pendingEmail) {
      throw new ValidationError("EMAIL_CHANGE_TOKEN_INVALID", {
        code: "EMAIL_CHANGE_TOKEN_INVALID",
      })
    }

    // Someone else may have registered the pending address since it was staged
    // (case-insensitive, matching the change-email uniqueness check).
    const taken = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: { $eqi: pendingEmail } } })
    if (taken && taken.id !== user.id) {
      throw new ValidationError("EMAIL_TAKEN", { code: "EMAIL_TAKEN" })
    }

    try {
      await strapi.plugin("users-permissions").service("user").edit(user.id, {
        email: pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeTokenExpiresAt: null,
      })
    } catch (err) {
      // TOCTOU: the pending address may be claimed between the check above and
      // this write — the DB unique constraint is the last line of defense. Map
      // it to EMAIL_TAKEN instead of leaking an unmapped 500.
      if (isUniqueViolation(err)) {
        throw new ValidationError("EMAIL_TAKEN", { code: "EMAIL_TAKEN" })
      }
      throw err
    }

    ctx.body = { ok: true }
  }

  // --- Story 4.4: route registration ------------------------------------------
  //
  // `PUT /users/me` MUST be matched BEFORE the stock `PUT /users/:id`, so it is
  // UNSHIFTED to the front (otherwise `me` is captured as `:id`). The two
  // `/auth/*` routes are appended. Guarded so the mocked-plugin unit harnesses
  // (which carry no `routes`) do not crash.
  const contentApiRoutes = plugin.routes?.["content-api"]?.routes
  if (Array.isArray(contentApiRoutes)) {
    contentApiRoutes.unshift({
      method: "PUT",
      path: "/users/me",
      handler: "user.updateMe",
      config: { prefix: "", policies: [] },
    })
    contentApiRoutes.push(
      {
        method: "POST",
        path: "/auth/change-email",
        handler: "auth.changeEmail",
        config: { prefix: "", policies: [] },
      },
      {
        method: "POST",
        path: "/auth/confirm-email-change",
        handler: "auth.confirmEmailChange",
        config: { prefix: "", policies: [] },
      }
    )
  }

  return plugin
}
