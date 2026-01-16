export default ({ env }) => {
  const imagekitConfig = prepareImageKitConfig(env)
  if (!imagekitConfig) {
    console.info(
      "ImageKit upload configuration is not complete. Local file storage will be used."
    )
  }

  return {
    // ============================================
    // STRAPI CORE PLUGINS
    // ============================================

    // i18n configuration for ar/fr/en locales
    i18n: {
      enabled: true,
      config: {
        defaultLocale: "fr",
        locales: ["fr", "ar", "en"],
      },
    },

    // Upload provider: ImageKit (production) or local (development)
    upload: {
      enabled: false,
      config: imagekitConfig ?? localUploadConfig,
    },

    "config-sync": {
      enabled: false,
    },

    sentry: {
      enabled: false,
      config: {
        // Only set `dsn` property in production
        dsn: env("NODE_ENV") === "production" ? env("SENTRY_DSN") : null,
        sendMetadata: true,
      },
    },

    // ============================================
    // TIWEEN CUSTOM PLUGINS
    // ============================================
    // NOTE: These MUST load BEFORE users-permissions because
    // the user extension references plugin content types

    // Geography plugin - regions and cities (base plugin, no dependencies)
    // Required by: user.defaultRegion, venue.cityRef
    geography: {
      enabled: true,
      resolve: "./src/plugins/geography",
    },

    // Entity Properties plugin - flexible property/amenity system (base plugin)
    // Required by: venue.properties
    "entity-properties": {
      enabled: true,
      resolve: "./src/plugins/entity-properties",
    },

    // Creative Works plugin - films, plays, people, genres (base plugin)
    // Required by: events-manager, user-engagement, cast/credit components
    "creative-works": {
      enabled: true,
      resolve: "./src/plugins/creative-works",
    },

    // TMDB Integration plugin - movie metadata from TheMovieDB API
    // Required by: events-manager (for movie search and details)
    "tmdb-integration": {
      enabled: true,
      resolve: "./src/plugins/tmdb-integration",
    },

    // Events Manager plugin - events, venues, showtimes (depends on geography, creative-works, tmdb-integration)
    "events-manager": {
      enabled: true,
      resolve: "./src/plugins/events-manager",
    },

    // Ticketing plugin - orders and tickets (depends on events-manager)
    ticketing: {
      enabled: true,
      resolve: "./src/plugins/ticketing",
    },

    // User Engagement plugin - watchlists (depends on creative-works)
    "user-engagement": {
      enabled: true,
      resolve: "./src/plugins/user-engagement",
    },

    // ============================================
    // STRAPI CORE PLUGINS (after custom plugins)
    // ============================================
    // users-permissions must load AFTER custom plugins that it references

    "users-permissions": {
      enabled: true,
      config: {
        jwt: {
          expiresIn: "30d", // this value is synced with NextAuth session maxAge
        },
      },
    },

    // ImageKit Admin Panel Integration (browse, manage, deliver media)
    // Only enabled when credentials are configured
    imagekit: {
      enabled: false,
      config: {
        publicKey: env("IMAGEKIT_PUBLIC_KEY"),
        privateKey: env("IMAGEKIT_PRIVATE_KEY"),
        urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
        folder: env("IMAGEKIT_FOLDER", "tiween"),
      },
    },

    // Email provider: Brevo
    // Falls back to console logging when BREVO_API_KEY is not set
    email: {
      config: {
        provider: "@ayhid/strapi-provider-email-brevo",
        providerOptions: {
          apiKey: env("BREVO_API_KEY"),
        },
        settings: {
          defaultFrom: env("BREVO_SENDER_EMAIL", "noreply@tiween.tn"),
          defaultReplyTo: env("BREVO_SENDER_EMAIL", "noreply@tiween.tn"),
          defaultSenderName: env("BREVO_SENDER_NAME", "Tiween"),
        },
      },
    },
  }
}

const localUploadConfig: any = {
  // Local provider setup
  // https://docs.strapi.io/dev-docs/plugins/upload
  sizeLimit: 250 * 1024 * 1024, // 256mb in bytes,
}

/**
 * Prepare ImageKit upload provider configuration.
 * Returns undefined if credentials are not set (falls back to local storage).
 */
const prepareImageKitConfig = (env) => {
  const publicKey = env("IMAGEKIT_PUBLIC_KEY")
  const privateKey = env("IMAGEKIT_PRIVATE_KEY")
  const urlEndpoint = env("IMAGEKIT_URL_ENDPOINT")

  const requirements = [publicKey, privateKey, urlEndpoint]
  const requirementsOk = requirements.every((req) => req != null && req !== "")

  if (requirementsOk) {
    return {
      provider: "strapi-provider-upload-imagekit",
      providerOptions: {
        publicKey,
        privateKey,
        urlEndpoint,
        params: {
          folder: env("IMAGEKIT_FOLDER", "tiween"),
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    }
  }

  return undefined
}
