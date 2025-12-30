export default ({ env }) => {
  const imagekitConfig = prepareImageKitConfig(env)
  if (!imagekitConfig) {
    console.info(
      "ImageKit upload configuration is not complete. Local file storage will be used."
    )
  }

  return {
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
      config: imagekitConfig ?? localUploadConfig,
    },

    seo: {
      enabled: true,
    },

    "config-sync": {
      enabled: true,
    },

    "users-permissions": {
      config: {
        jwt: {
          expiresIn: "30d", // this value is synced with NextAuth session maxAge
        },
      },
    },

    sentry: {
      enabled: true,
      config: {
        // Only set `dsn` property in production
        dsn: env("NODE_ENV") === "production" ? env("SENTRY_DSN") : null,
        sendMetadata: true,
      },
    },

    // Events Manager plugin for venue management
    "events-manager": {
      enabled: true,
      resolve: "./src/plugins/events-manager",
    },

    // ImageKit Admin Panel Integration (browse, manage, deliver media)
    // Only enabled when credentials are configured
    imagekit: {
      enabled: !!env("IMAGEKIT_PUBLIC_KEY"),
      config: {
        publicKey: env("IMAGEKIT_PUBLIC_KEY"),
        privateKey: env("IMAGEKIT_PRIVATE_KEY"),
        urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
        folder: env("IMAGEKIT_FOLDER", "tiween"),
      },
    },

    // REST API Response Caching with Redis
    "rest-cache": {
      enabled: env.bool("CACHE_ENABLED", true),
      config: {
        provider: {
          name: "redis",
          options: {
            max: 32767,
            connection: {
              host: env("REDIS_HOST", "localhost"),
              port: env.int("REDIS_PORT", 6379),
              password: env("REDIS_PASSWORD", undefined),
              db: env.int("REDIS_DB", 0),
            },
          },
        },
        strategy: {
          enableEtagSupport: true,
          enableXCacheHeaders: true,
          clearRelatedCache: true,
          maxAge: 300000, // 5 minutes default TTL
          contentTypes: [
            // Public read-only content with caching
            {
              contentType: "api::event.event",
              maxAge: 300000, // 5 minutes - frequently updated
            },
            {
              contentType: "api::venue.venue",
              maxAge: 900000, // 15 minutes - rarely changes
            },
            {
              contentType: "api::creative-work.creative-work",
              maxAge: 1800000, // 30 minutes - static content
            },
            {
              contentType: "api::showtime.showtime",
              maxAge: 120000, // 2 minutes - ticket availability changes
            },
            {
              contentType: "api::person.person",
              maxAge: 1800000, // 30 minutes - rarely changes
            },
            {
              contentType: "api::genre.genre",
              maxAge: 3600000, // 60 minutes - reference data
            },
            {
              contentType: "api::category.category",
              maxAge: 3600000, // 60 minutes - reference data
            },
            {
              contentType: "api::region.region",
              maxAge: 3600000, // 60 minutes - reference data
            },
            {
              contentType: "api::city.city",
              maxAge: 3600000, // 60 minutes - reference data
            },
          ],
        },
      },
    },

    // email: {
    //   config: {
    //     provider: "mailgun",
    //     providerOptions: {
    //       key: env("MAILGUN_API_KEY"),
    //       domain: env("MAILGUN_DOMAIN"),
    //       url: env("MAILGUN_HOST", "https://api.eu.mailgun.net"),
    //     },
    //     settings: {
    //       defaultFrom: env("MAILGUN_EMAIL"),
    //       defaultReplyTo: env("MAILGUN_EMAIL"),
    //     },
    //   },
    // },
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
