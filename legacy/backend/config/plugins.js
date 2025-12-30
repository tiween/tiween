module.exports = ({ env }) => ({
  "events-manager": {
    enabled: true,
    resolve: "./src/plugins/events-manager", // path to plugin folder
  },
  email: {
    config: {
      provider: "strapi-provider-email-resend",
      providerOptions: {
        apiKey: "re_dHcnRTfY_Q1vQpzNJeFNYRHWyS55zQof6",
      },
    },
  },
  upload: {
    config: {
      provider: "strapi-provider-upload-imagekit", // Community providers need to have the full package name
      providerOptions: {
        publicKey: env(
          "IMAGE_KIT_PUBLIC_KEY",
          "public_/WxWzg8xq8JvIqM0E4vVMNFr5Pk="
        ),
        privateKey: env(
          "IMAGE_KIT_PRIVATE_KEY",
          "private_I9GkInBCLKy/h7hSfcNQAJKkeTs="
        ),
        urlEndpoint: env(
          "IMAGE_KIT_URL_ENDPOINT",
          "https://ik.imagekit.io/bc2xslzyt/tiween-development"
        ), // Example: https://ik.imagekit.io/username

        // Optional
        params: {
          folder: env("IMAGE_KIT_DIRECTORY", "/development/images"), // Defaults to "/" if value is not supplied
        },
      },
    },
  },
  sentry: {
    enabled: true,
    config: {
      dsn: env("SENTRY_DSN"),
      sendMetadata: true,
    },
  },
  tmdb: {
    enabled: true,
    resolve: "./src/plugins/@tiween/tmdb",
  },
})
