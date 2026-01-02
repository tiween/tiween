export default ({ env }) => {
  const imagekitConfig = prepareImageKitConfig(env)
  if (!imagekitConfig) {
    console.info(
      "ImageKit upload configuration is not complete. Local file storage will be used."
    )
  }

  return {
    // ============================================
    // ALL PLUGINS DISABLED FOR DEBUGGING
    // Re-enable one by one to identify the issue
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

    "users-permissions": {
      enabled: true,
      config: {
        jwt: {
          expiresIn: "30d", // this value is synced with NextAuth session maxAge
        },
      },
    },

    sentry: {
      enabled: false,
      config: {
        // Only set `dsn` property in production
        dsn: env("NODE_ENV") === "production" ? env("SENTRY_DSN") : null,
        sendMetadata: true,
      },
    },

    // Events Manager plugin for venue management
    "events-manager": {
      enabled: false,
      resolve: "./src/plugins/events-manager",
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
