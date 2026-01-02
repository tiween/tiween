/**
 * TMDB movie poster URLs for Storybook stories
 *
 * These are real movie posters from The Movie Database (TMDB).
 * Image base URL: https://image.tmdb.org/t/p/{size}{poster_path}
 *
 * Available sizes: w92, w154, w185, w342, w500, w780, original
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

// Poster paths for popular movies (from TMDB)
const POSTER_PATHS = {
  // Recent blockbusters
  dunePartTwo: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
  gladiator2: "/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
  jokerFolieADeux: "/aciP8Km0waTLXEYf5ybFK5CSUxl.jpg",
  furiosa: "/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
  insideOut2: "/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
  deadpoolWolverine: "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",

  // Classic films
  babettesFeast: "/1R4VyNMkT9L3hLYdyuS0yEDYdEF.jpg",
  cinemaParadiso: "/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg",
  amelie: "/f0uorE7K7ggHfr8r7pUTOHWkOlE.jpg",
  theLunchbox: "/bJYfNiYwPgjrL5GrjcjF4bvvJJy.jpg",

  // Pirates of the Caribbean
  piratesDeadMenTellNoTales: "/qwoGfcg6YQF7XKo0Yc4xg.jpg",

  // Arabic/MENA cinema
  theSquare: "/h9DIk6yRnYkW2q6HpSpXIYhsaHj.jpg",
  capernaum: "/9b6wPdDfUBzm7Mv6H3NmDlJiKN4.jpg",

  // Theatre/Arts themed
  birdman: "/rSZs93P0LLxqlVEbI001UKoeCQC.jpg",
  whiplash: "/6uSPcdGNA2A6vJmCagXkvnutegs.jpg",

  // Music themed
  laLaLand: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  bohemianRhapsody: "/lHu1wtNaczFPGFDTrjCSzeLPTKN.jpg",

  // Festival/Documentary style
  parasite: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  roma: "/dtGzyyreK7u84DFJVFWMM2LVpYB.jpg",
} as const

type PosterKey = keyof typeof POSTER_PATHS

/**
 * Get a TMDB poster URL for a specific movie
 */
export function getTmdbPoster(
  movie: PosterKey,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w500"
): string {
  return `${TMDB_IMAGE_BASE}/${size}${POSTER_PATHS[movie]}`
}

/**
 * Pre-configured poster URLs for common story use cases
 */
export const storyPosters = {
  // Film cards (aspect ratio ~2:3, recommended w342 or w500)
  film: {
    dune: getTmdbPoster("dunePartTwo", "w500"),
    gladiator: getTmdbPoster("gladiator2", "w500"),
    joker: getTmdbPoster("jokerFolieADeux", "w500"),
    furiosa: getTmdbPoster("furiosa", "w500"),
    insideOut: getTmdbPoster("insideOut2", "w500"),
    deadpool: getTmdbPoster("deadpoolWolverine", "w500"),
    babette: getTmdbPoster("babettesFeast", "w500"),
    cinemaParadiso: getTmdbPoster("cinemaParadiso", "w500"),
    amelie: getTmdbPoster("amelie", "w500"),
    lunchbox: getTmdbPoster("theLunchbox", "w500"),
    capernaum: getTmdbPoster("capernaum", "w500"),
    parasite: getTmdbPoster("parasite", "w500"),
  },

  // Event cards
  event: {
    cinema: getTmdbPoster("cinemaParadiso", "w500"),
    theatre: getTmdbPoster("birdman", "w500"),
    music: getTmdbPoster("laLaLand", "w500"),
    festival: getTmdbPoster("parasite", "w500"),
    documentary: getTmdbPoster("roma", "w500"),
    arabic: getTmdbPoster("capernaum", "w500"),
  },
} as const
