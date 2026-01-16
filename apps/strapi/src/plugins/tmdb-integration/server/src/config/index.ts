export default {
  default: {
    // TMDB API configuration
    apiKey: "", // Set via TMDB_API_KEY env variable
    defaultLanguage: "fr",
    defaultRegion: "MA",
    // Rate limiting: TMDB allows ~40 requests per 10 seconds
    rateLimit: {
      maxRequests: 40,
      windowMs: 10000,
    },
    // Cache TTL for API responses (in seconds)
    cache: {
      searchTTL: 900, // 15 minutes for search results
      detailsTTL: 3600, // 1 hour for movie details
    },
  },
  validator: (config: Record<string, unknown>) => {
    if (!config.apiKey && !process.env.TMDB_API_KEY) {
      strapi.log.warn(
        "[tmdb-integration] TMDB_API_KEY environment variable is not set. TMDB services will not work."
      )
    }
  },
}
