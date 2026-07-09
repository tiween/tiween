import type { Core } from "@strapi/strapi"

/**
 * Enables the Google and Facebook OAuth providers in the users-permissions
 * `grant` plugin store.
 *
 * Stock `@strapi/plugin-users-permissions` v5.33.1 gates the
 * `GET /auth/:provider/callback` controller on the provider being `enabled` in
 * the grant plugin store (DB `strapi_core_store_settings`, key `grant`) — NOT on
 * `config/plugins.ts`. The plugin's own bootstrap (`initGrant`) seeds provider
 * defaults with `enabled: false` (DB-wins merge). This app `bootstrap()` runs
 * AFTER that, so we flip `enabled: true` for the trusted social providers here.
 *
 * The actual OAuth handshake runs in the Next.js client (NextAuth), so the
 * functional credentials live in the client app. The optional Strapi env vars
 * below are merged into the grant entry only if present (for anyone driving
 * Strapi's own /connect/:provider grant flow directly).
 *
 * Idempotent: reads the current store value, only writes when something changed.
 */
interface GrantProviderConfig {
  enabled?: boolean
  key?: string
  secret?: string
  callback?: string
  [key: string]: unknown
}

type GrantStore = Record<string, GrantProviderConfig>

interface SocialProviderEnv {
  provider: string
  key?: string
  secret?: string
  callback?: string
}

const SOCIAL_PROVIDERS: SocialProviderEnv[] = [
  {
    provider: "google",
    key: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
    callback: process.env.GOOGLE_CALLBACK_URL,
  },
  {
    provider: "facebook",
    key: process.env.FACEBOOK_CLIENT_ID,
    secret: process.env.FACEBOOK_CLIENT_SECRET,
    callback: process.env.FACEBOOK_CALLBACK_URL,
  },
]

export async function ensureSocialProviders({
  strapi,
}: {
  strapi: Core.Strapi
}) {
  try {
    const pluginStore = strapi.store({
      type: "plugin",
      name: "users-permissions",
    })

    const grant = ((await pluginStore.get({ key: "grant" })) ??
      {}) as GrantStore

    let changed = false

    for (const { provider, key, secret, callback } of SOCIAL_PROVIDERS) {
      // Preserve any config the plugin's initGrant already seeded for this
      // provider (scope, authorize_url, etc.); only flip enabled + merge creds.
      const current = grant[provider] ?? {}
      const next: GrantProviderConfig = { ...current, enabled: true }

      if (key) next.key = key
      if (secret) next.secret = secret
      if (callback) next.callback = callback

      const isSame =
        current.enabled === next.enabled &&
        current.key === next.key &&
        current.secret === next.secret &&
        current.callback === next.callback

      if (!isSame) {
        grant[provider] = next
        changed = true
      }
    }

    if (changed) {
      await pluginStore.set({ key: "grant", value: grant })
      strapi.log.info(
        "Enabled social providers (google, facebook) in users-permissions grant store"
      )
    } else {
      strapi.log.info("Social providers already enabled in grant store")
    }
  } catch (error) {
    strapi.log.error("Failed to ensure social providers:", error)
    throw error
  }
}
