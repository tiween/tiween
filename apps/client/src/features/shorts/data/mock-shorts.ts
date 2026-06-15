/**
 * Mock data for Tunisian Short Films
 *
 * This file contains mock data for the shorts directory prototype.
 * Data sourced from YouTube, Vimeo, IMDb, and cinematunisien.com
 */

import type { ShortFilm } from "../types"

/**
 * Mock genres for short films
 */
export const MOCK_GENRES = [
  { slug: "drame", name: "Drame" },
  { slug: "comedie", name: "Comédie" },
  { slug: "documentaire", name: "Documentaire" },
  { slug: "fantastique", name: "Fantastique" },
  { slug: "thriller", name: "Thriller" },
  { slug: "animation", name: "Animation" },
  { slug: "romance", name: "Romance" },
  { slug: "experimental", name: "Expérimental" },
]

/**
 * Mock short films data - Real Tunisian short films
 */
export const MOCK_SHORT_FILMS: ShortFilm[] = [
  {
    id: 1,
    documentId: "khalaa-001",
    title: "Khalâa",
    originalTitle: "خلعة",
    slug: "khalaa",
    synopsis:
      "Monta et Khalaa, deux arnaqueurs vivant dans la rue depuis leur enfance, se croisent après une séparation causée par une trahison. Leur rêve sera bouleversé par un jeune homme nommé Asfour.",
    duration: 13,
    releaseYear: 2016,
    rating: 7.5,
    ageRating: "PG12",
    poster: {
      url: "https://i.ytimg.com/vi/9joWma-XKcQ/maxresdefault.jpg",
      alternativeText: "Khalâa poster",
    },
    backdrop: {
      url: "https://i.ytimg.com/vi/9joWma-XKcQ/maxresdefault.jpg",
      alternativeText: "Khalâa backdrop",
    },
    trailer: "https://www.youtube.com/watch?v=9joWma-XKcQ",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 1,
        documentId: "p1",
        name: "Maher Elhasnaoui",
        slug: "maher-elhasnaoui",
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=9joWma-XKcQ",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    documentId: "le-masseur-002",
    title: "Le Masseur",
    originalTitle: "الطيّاب",
    slug: "le-masseur",
    synopsis:
      "Ounies, un simple masseur, travaille au hammam de son quartier. Quand le laveur de morts est indisponible, les voisins font appel à lui pour laver un défunt. Il accepte à contrecœur et fait le travail à sa manière... De retour au travail, il éprouve de grandes difficultés à masser les vivants.",
    duration: 23,
    releaseYear: 2011,
    rating: 8.6,
    ageRating: "PG12",
    poster: {
      url: "https://i.ytimg.com/vi/zjJjkSHNRx4/maxresdefault.jpg",
      alternativeText: "Le Masseur poster",
    },
    backdrop: {
      url: "https://i.ytimg.com/vi/zjJjkSHNRx4/maxresdefault.jpg",
      alternativeText: "Le Masseur backdrop",
    },
    trailer: "https://www.youtube.com/watch?v=zjJjkSHNRx4",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 2,
        documentId: "p2",
        name: "Anouar Lahouar",
        slug: "anouar-lahouar",
      },
    ],
    cast: [
      {
        person: {
          id: 10,
          documentId: "p10",
          name: "Noomane Hamda",
          slug: "noomane-hamda",
        },
        role: "Ounies",
      },
      {
        person: {
          id: 11,
          documentId: "p11",
          name: "Abdelhamid Gayess",
          slug: "abdelhamid-gayess",
        },
      },
      {
        person: {
          id: 12,
          documentId: "p12",
          name: "Mahmoud Larnaout",
          slug: "mahmoud-larnaout",
        },
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=zjJjkSHNRx4",
        label: "Regarder sur YouTube",
      },
    ],
    awards: [
      {
        name: "Dubai International Film Festival",
        year: 2011,
        category: "Court métrage",
        won: false,
      },
    ],
    isAvailableOnline: true,
    isFeatured: true,
    createdAt: "2024-01-14T10:00:00Z",
    updatedAt: "2024-01-14T10:00:00Z",
  },
  {
    id: 3,
    documentId: "petit-frere-003",
    title: "Petit Frère",
    originalTitle: "قريد العش",
    slug: "petit-frere",
    synopsis:
      "Un court-métrage tunisien touchant sur les liens fraternels et les épreuves de la vie. Mehdi et Slim, deux frères, font face aux difficultés de la vie quotidienne à Tunis.",
    duration: 20,
    releaseYear: 2013,
    rating: 7.8,
    ageRating: "TP",
    poster: {
      url: "https://i.ytimg.com/vi/Au2uDZgmGgs/maxresdefault.jpg",
      alternativeText: "Petit Frère poster",
    },
    backdrop: {
      url: "https://i.ytimg.com/vi/Au2uDZgmGgs/maxresdefault.jpg",
      alternativeText: "Petit Frère backdrop",
    },
    trailer: "https://www.youtube.com/watch?v=Au2uDZgmGgs",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 3,
        documentId: "p3",
        name: "Oussama Boukhris",
        slug: "oussama-boukhris",
      },
    ],
    cast: [
      {
        person: {
          id: 13,
          documentId: "p13",
          name: "Sabri Feddini",
          slug: "sabri-feddini",
        },
        role: "Mehdi",
      },
      {
        person: {
          id: 14,
          documentId: "p14",
          name: "Lamine Belkhodja",
          slug: "lamine-belkhodja",
        },
        role: "Slim",
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=Au2uDZgmGgs",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: true,
    createdAt: "2024-01-13T10:00:00Z",
    updatedAt: "2024-01-13T10:00:00Z",
  },
  {
    id: 4,
    documentId: "souliers-aid-004",
    title: "Les Souliers de l'Aïd",
    originalTitle: "صباط العيد",
    slug: "les-souliers-de-laid",
    synopsis:
      "Dans un petit village, Nader, un garçon de neuf ans passionné de course, choisit d'acheter des chaussures 'merveilleuses' pour l'Aïd, mais son père n'a pas les moyens de les lui offrir. Un conte touchant sur l'enfance et les rêves.",
    duration: 30,
    releaseYear: 2012,
    rating: 8.7,
    ageRating: "TP",
    poster: {
      url: "https://artify.tn/images/films/my-shoes.jpg",
      alternativeText: "Les Souliers de l'Aïd poster",
    },
    backdrop: {
      url: "https://artify.tn/images/films/my-shoes-backdrop.jpg",
      alternativeText: "Les Souliers de l'Aïd backdrop",
    },
    trailer: "https://vimeo.com/211001267",
    genres: [
      { id: 1, documentId: "g1", name: "Drame", slug: "drame" },
      { id: 4, documentId: "g4", name: "Fantastique", slug: "fantastique" },
    ],
    directors: [
      {
        id: 4,
        documentId: "p4",
        name: "Anis Lassoued",
        slug: "anis-lassoued",
      },
    ],
    cast: [
      {
        person: {
          id: 15,
          documentId: "p15",
          name: "Chema Ben Chaabene",
          slug: "chema-ben-chaabene",
        },
      },
      {
        person: {
          id: 16,
          documentId: "p16",
          name: "Farhat Jedidi",
          slug: "farhat-jedidi",
        },
      },
    ],
    country: "Tunisie / France",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "vimeo",
        url: "https://vimeo.com/211001267",
        label: "Regarder sur Vimeo",
      },
      {
        platform: "other",
        url: "https://artify.tn/watch/my-shoes",
        label: "Regarder sur Artify",
      },
    ],
    awards: [
      {
        name: "Journées Cinématographiques de Carthage",
        year: 2012,
        category: "Compétition courts métrages",
        won: false,
      },
    ],
    isAvailableOnline: true,
    isFeatured: true,
    createdAt: "2024-01-12T10:00:00Z",
    updatedAt: "2024-01-12T10:00:00Z",
  },
  {
    id: 5,
    documentId: "comme-un-fils-005",
    title: "Comme Un Fils",
    originalTitle: "كيما ولدي",
    slug: "comme-un-fils",
    synopsis:
      "Un court-métrage émouvant explorant les liens familiaux et les relations père-fils dans la société tunisienne. Une histoire de transmission et de réconciliation.",
    duration: 13,
    releaseYear: 2012,
    rating: 7.6,
    ageRating: "TP",
    poster: {
      url: "https://i.ytimg.com/vi/PeMqkIJ1Oac/maxresdefault.jpg",
      alternativeText: "Comme Un Fils poster",
    },
    backdrop: {
      url: "https://i.ytimg.com/vi/PeMqkIJ1Oac/maxresdefault.jpg",
      alternativeText: "Comme Un Fils backdrop",
    },
    trailer: "https://www.youtube.com/watch?v=PeMqkIJ1Oac",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 5,
        documentId: "p5",
        name: "Aymen Lajmi",
        slug: "aymen-lajmi",
      },
    ],
    cast: [
      {
        person: {
          id: 17,
          documentId: "p17",
          name: "Mohamed Amine Hamzaoui",
          slug: "mohamed-amine-hamzaoui",
        },
      },
      {
        person: {
          id: 18,
          documentId: "p18",
          name: "Mohamed Ali Khmiri",
          slug: "mohamed-ali-khmiri",
        },
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=PeMqkIJ1Oac",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: false,
    createdAt: "2024-01-11T10:00:00Z",
    updatedAt: "2024-01-11T10:00:00Z",
  },
  {
    id: 6,
    documentId: "brotherhood-006",
    title: "Brotherhood",
    originalTitle: "الإخوة",
    slug: "brotherhood",
    synopsis:
      "Mohamed, un berger endurci vivant dans la Tunisie rurale avec sa femme et ses deux fils, est profondément secoué quand son fils aîné Malik rentre à la maison après un long voyage avec une mystérieuse nouvelle épouse.",
    duration: 25,
    releaseYear: 2018,
    rating: 8.4,
    ageRating: "PG16",
    poster: {
      url: "https://i.ytimg.com/vi/ImnbMyEkXX0/maxresdefault.jpg",
      alternativeText: "Brotherhood poster",
    },
    backdrop: {
      url: "https://i.ytimg.com/vi/ImnbMyEkXX0/maxresdefault.jpg",
      alternativeText: "Brotherhood backdrop",
    },
    trailer: "https://www.youtube.com/watch?v=ImnbMyEkXX0",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 6,
        documentId: "p6",
        name: "Meryam Joobeur",
        slug: "meryam-joobeur",
      },
    ],
    country: "Tunisie / Canada / Qatar",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=ImnbMyEkXX0",
        label: "Regarder sur YouTube",
      },
    ],
    awards: [
      {
        name: "Academy Awards (Oscars)",
        year: 2020,
        category: "Meilleur court métrage de fiction",
        won: false,
      },
      {
        name: "Festival de Toronto",
        year: 2018,
        category: "Best Short Film",
        won: true,
      },
      {
        name: "Sundance Film Festival",
        year: 2019,
        category: "Short Film Jury Award",
        won: true,
      },
    ],
    isAvailableOnline: true,
    isFeatured: true,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
  },
  {
    id: 7,
    documentId: "ordure-007",
    title: "Ordure",
    originalTitle: "العز",
    slug: "ordure",
    synopsis:
      "Un court-métrage de Lotfi Achour qui explore les contradictions de la société tunisienne à travers une histoire de dignité humaine.",
    duration: 23,
    releaseYear: 2013,
    rating: 7.4,
    ageRating: "PG12",
    poster: {
      url: "https://i.ytimg.com/vi/PhVtsmgqBWQ/maxresdefault.jpg",
      alternativeText: "Ordure poster",
    },
    backdrop: {
      url: "https://i.ytimg.com/vi/PhVtsmgqBWQ/maxresdefault.jpg",
      alternativeText: "Ordure backdrop",
    },
    trailer: "https://www.youtube.com/watch?v=PhVtsmgqBWQ",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 7,
        documentId: "p7",
        name: "Lotfi Achour",
        slug: "lotfi-achour",
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=PhVtsmgqBWQ",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: false,
    createdAt: "2024-01-09T10:00:00Z",
    updatedAt: "2024-01-09T10:00:00Z",
  },
  {
    id: 8,
    documentId: "flashback-008",
    title: "Flashback",
    originalTitle: "فلاشباك",
    slug: "flashback",
    synopsis:
      "Un court métrage tunisien de Waheb Chargui avec Omar Touihri (Jenjoon). Une plongée dans les souvenirs et les regrets d'un homme face à son passé.",
    duration: 15,
    releaseYear: 2016,
    rating: 7.2,
    ageRating: "PG12",
    poster: {
      url: "https://i.ytimg.com/vi/wJKF95Xyf-A/maxresdefault.jpg",
      alternativeText: "Flashback poster",
    },
    trailer: "https://www.youtube.com/watch?v=wJKF95Xyf-A",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 8,
        documentId: "p8",
        name: "Waheb Chargui",
        slug: "waheb-chargui",
      },
    ],
    cast: [
      {
        person: {
          id: 19,
          documentId: "p19",
          name: "Omar Touihri (Jenjoon)",
          slug: "omar-touihri",
        },
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=wJKF95Xyf-A",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: false,
    createdAt: "2024-01-08T10:00:00Z",
    updatedAt: "2024-01-08T10:00:00Z",
  },
  {
    id: 9,
    documentId: "chrifa-bent-el-fadhel-009",
    title: "Chrifa Bent El Fadhel",
    originalTitle: "شريفة بنت الفاضل",
    slug: "chrifa-bent-el-fadhel",
    synopsis:
      "Un court métrage tunisien qui raconte l'histoire de Chrifa, une jeune femme qui lutte pour sa liberté et son indépendance dans une société conservatrice.",
    duration: 17,
    releaseYear: 2022,
    rating: 7.8,
    ageRating: "PG12",
    poster: {
      url: "https://i.ytimg.com/vi/72lLlIiSDkQ/maxresdefault.jpg",
      alternativeText: "Chrifa Bent El Fadhel poster",
    },
    trailer: "https://www.youtube.com/watch?v=72lLlIiSDkQ",
    genres: [{ id: 1, documentId: "g1", name: "Drame", slug: "drame" }],
    directors: [
      {
        id: 9,
        documentId: "p9",
        name: "KDH Prod",
        slug: "kdh-prod",
      },
    ],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=72lLlIiSDkQ",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: false,
    createdAt: "2024-01-07T10:00:00Z",
    updatedAt: "2024-01-07T10:00:00Z",
  },
  {
    id: 10,
    documentId: "tahtima-010",
    title: "Tahtima",
    originalTitle: "تحطيمة",
    slug: "tahtima",
    synopsis:
      "Un film tunisien complet qui explore les défis de la jeunesse tunisienne face aux difficultés économiques et sociales.",
    duration: 24,
    releaseYear: 2020,
    rating: 7.3,
    ageRating: "PG12",
    poster: {
      url: "https://i.ytimg.com/vi/w6sPncl04lU/maxresdefault.jpg",
      alternativeText: "Tahtima poster",
    },
    trailer: "https://www.youtube.com/watch?v=w6sPncl04lU",
    genres: [
      { id: 1, documentId: "g1", name: "Drame", slug: "drame" },
      { id: 2, documentId: "g2", name: "Comédie", slug: "comedie" },
    ],
    directors: [],
    country: "Tunisie",
    language: "Arabe tunisien",
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=w6sPncl04lU",
        label: "Regarder sur YouTube",
      },
    ],
    isAvailableOnline: true,
    isFeatured: false,
    createdAt: "2024-01-06T10:00:00Z",
    updatedAt: "2024-01-06T10:00:00Z",
  },
]

/**
 * Get all mock short films
 */
export function getMockShortFilms(): ShortFilm[] {
  return MOCK_SHORT_FILMS
}

/**
 * Get featured mock short films
 */
export function getMockFeaturedShortFilms(limit: number = 5): ShortFilm[] {
  return MOCK_SHORT_FILMS.filter((f) => f.isFeatured).slice(0, limit)
}

/**
 * Get latest mock short films
 */
export function getMockLatestShortFilms(limit: number = 10): ShortFilm[] {
  return [...MOCK_SHORT_FILMS]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
    .slice(0, limit)
}

/**
 * Get a mock short film by slug
 */
export function getMockShortFilmBySlug(slug: string): ShortFilm | undefined {
  return MOCK_SHORT_FILMS.find((f) => f.slug === slug)
}

/**
 * Search mock short films
 */
export function searchMockShortFilms(
  query: string,
  filters?: {
    genres?: string[]
    yearMin?: number
    yearMax?: number
    durationMin?: number
    durationMax?: number
    rating?: number
  }
): ShortFilm[] {
  let results = [...MOCK_SHORT_FILMS]

  // Search by query
  if (query) {
    const lowerQuery = query.toLowerCase()
    results = results.filter(
      (f) =>
        f.title.toLowerCase().includes(lowerQuery) ||
        f.originalTitle?.toLowerCase().includes(lowerQuery) ||
        f.synopsis?.toLowerCase().includes(lowerQuery) ||
        f.directors?.some((d) => d.name.toLowerCase().includes(lowerQuery))
    )
  }

  // Filter by genres
  if (filters?.genres?.length) {
    results = results.filter((f) =>
      f.genres?.some((g) => filters.genres!.includes(g.slug))
    )
  }

  // Filter by year
  if (filters?.yearMin !== undefined) {
    results = results.filter(
      (f) => f.releaseYear && f.releaseYear >= filters.yearMin!
    )
  }
  if (filters?.yearMax !== undefined) {
    results = results.filter(
      (f) => f.releaseYear && f.releaseYear <= filters.yearMax!
    )
  }

  // Filter by duration
  if (filters?.durationMin !== undefined) {
    results = results.filter(
      (f) => f.duration && f.duration >= filters.durationMin!
    )
  }
  if (filters?.durationMax !== undefined) {
    results = results.filter(
      (f) => f.duration && f.duration <= filters.durationMax!
    )
  }

  // Filter by rating
  if (filters?.rating !== undefined) {
    results = results.filter((f) => f.rating && f.rating >= filters.rating!)
  }

  return results
}
