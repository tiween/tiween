/**
 * API-contract fixtures for the public short-film endpoints
 * (`/api/creative-works/creative-works/short-films`), shared by the mapper,
 * fetcher, route and layout tests so they all speak the real wire shape.
 */
import type {
  ShortFilmDetailDto,
  ShortFilmSummaryDto,
} from "@/features/shorts/utils/shortMappers"

export function summaryDto(
  overrides: Partial<ShortFilmSummaryDto> = {}
): ShortFilmSummaryDto {
  return {
    documentId: "doc-khalaa",
    slug: "khalaa",
    locale: "fr",
    title: "Khalâa",
    originalTitle: "خلعة",
    synopsis: "Deux arnaqueurs vivant dans la rue.",
    duration: 13,
    releaseYear: 2016,
    country: ["TN"],
    language: ["aeb"],
    featured: false,
    featuredRank: null,
    publishedAt: "2026-10-20T10:00:00.000Z",
    poster: {
      url: "https://cdn.example/khalaa-poster.jpg",
      alternativeText: "Affiche",
      width: 600,
      height: 900,
      mime: "image/jpeg",
      formats: {
        thumbnail: {
          url: "https://cdn.example/t.jpg",
          width: 156,
          height: 234,
        },
        medium: { url: "https://cdn.example/m.jpg", width: 500, height: 750 },
        custom: { url: "https://cdn.example/c.jpg", width: 1, height: 1 },
      },
    },
    backdrop: null,
    genres: [{ documentId: "g-drame", slug: "drame", name: "Drame" }],
    directors: [{ documentId: "p-maher", slug: "maher", name: "Maher" }],
    availableOnline: true,
    hasAwards: true,
    ...overrides,
  }
}

export function detailDto(
  overrides: Partial<ShortFilmDetailDto> = {}
): ShortFilmDetailDto {
  return {
    ...summaryDto(),
    rating: 7.5,
    ageRating: "PG12",
    photos: [],
    credits: [
      {
        person: { documentId: "p-writer", slug: "sana", name: "Sana" },
        creditRole: { slug: "screenwriter", department: "writing" },
        customRole: null,
        billing: 1,
      },
      {
        person: { documentId: "p-maher", slug: "maher", name: "Maher" },
        creditRole: { slug: "director", department: "directing" },
        customRole: null,
        billing: 2,
      },
    ],
    cast: [
      {
        person: { documentId: "p-b", slug: "b", name: "Second" },
        character: { documentId: "c-b", name: "Asfour" },
        billing: 2,
      },
      {
        person: { documentId: "p-a", slug: "a", name: "First" },
        character: { documentId: "c-a", name: "Monta" },
        billing: 1,
      },
    ],
    distinctions: [
      {
        name: "Journées Cinématographiques de Carthage",
        edition: "2016",
        year: 2016,
        section: null,
        category: "Compétition courts métrages",
        result: "winner",
        awardName: "Tanit d'Or",
      },
    ],
    videos: [
      { url: "https://example.com/teaser", videoType: "teaser" },
      { url: "https://www.youtube.com/watch?v=abc", videoType: "trailer" },
    ],
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=full",
        accessType: "free",
        label: "Film complet",
      },
      {
        platform: "javascript-evil",
        url: "javascript:alert(1)",
        accessType: "free",
        label: "Hostile",
      },
    ],
    ...overrides,
  }
}

/** Strapi list envelope for `GET /short-films`. */
export function listBody(
  items: ShortFilmSummaryDto[],
  pagination: { page: number; pageCount: number; total: number }
) {
  return {
    data: items,
    meta: { pagination: { ...pagination, pageSize: 24 } },
  }
}

/** Strapi error envelope. */
export function errorBody(
  status: number,
  code: string | null,
  message = "error"
) {
  return {
    error: {
      status,
      name: "ShortFilmError",
      message,
      details: code ? { code } : {},
    },
  }
}
