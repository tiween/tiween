const withPWA = require('next-pwa')
const withTM = require('next-transpile-modules')(['react-markdown']);
const { withSentryConfig } = require('@sentry/nextjs');

//where data should be fetched
const DATA_ENV= process.env.DATA_ENV

const IMAGE_CDN_ENDPOINT = DATA_ENV === 'production' ? 'tiween-production' :'tiween-development';
const sentryWebpackPluginOptions = {
  authToken: process.env.SENTRY_TOKEN
};
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
const moduleExports = withBundleAnalyzer(withTM(withPWA({
  pwa: {
    dest: 'public',
    swSrc: 'service-worker.js'
  },
  images: {
    deviceSizes: [320,480,640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60 * 60,
    loader: 'imgix',
    path: `${process.env.NEXT_PUBLIC_CDN_FETCH_URL}/${IMAGE_CDN_ENDPOINT}`,
    domains: [
      'image.tmdb.org',
      'ik.imagekit.io',
    ],
  },
  i18n: {
    localeDetection: false,
    locales: ['fr-FR', 'ar-TN'],
    defaultLocale: 'fr-FR',
  },
  async headers() {
    return [
      {
        "source": "/film/(.*)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=3600, stale-while-revalidate"
          }
        ]
      },
      {
        "source": "/(.*)",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
})));

module.exports = process.env.NODE_ENV ==='production'?withSentryConfig(moduleExports, sentryWebpackPluginOptions): moduleExports;

