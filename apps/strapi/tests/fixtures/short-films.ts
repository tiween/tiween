/**
 * Short-film fixtures for the public read suites (plan 01-03, SDATA-05).
 *
 * `seedShortFilmFixtures(strapi)` builds one deterministic graph through the
 * Document Service (the same API production code uses, so lifecycle hooks fire):
 *
 *   slug           genre      director      dur  year  publishedAt  locales            featured
 *   sf-alpha       drame      person-one    12   2019  2026-01-01   fr + ar published  rank 2
 *   sf-bravo       comedie    person-two    25   2021  2026-02-01   fr                 rank 2
 *   sf-charlie     drame      person-one     8   2023  2026-03-01   fr + ar DRAFT      rank 1
 *   sf-echo        comedie    person-two    30   2021  2026-04-01   fr                 yes, no rank
 *   sf-foxtrot     drame      person-three  15   2020  2026-05-01   fr                 no
 *   sf-golf        animation  person-four    5   2018  2026-06-01   fr                 no
 *   sf-delta-draft drame      person-one    (draft only, incomplete on purpose)        rank 1
 *   ff-feature     (type `film`, drame, published)
 *
 * Titles are lowercase ASCII on purpose: `title` sorts use the database's
 * collation, which differs between SQLite and Postgres for mixed case.
 *
 * Every PUBLISHED short satisfies all D-19 publish rules (slug, poster,
 * published director credit, streaming link or trailer), so the suites keep
 * passing once the publish guard (plan 01-06) is active. Only `sf-delta-draft`
 * is incomplete, and it is never published.
 *
 * The Document Service strips `publishedAt`, so the table's values are written
 * straight to the published rows with `strapi.db.query(...).updateMany`.
 */
import type { Core } from "@strapi/strapi"

const CW = "plugin::creative-works.creative-work" as any
const GENRE = "plugin::creative-works.genre" as any
const PERSON = "plugin::creative-works.person" as any
const CREDIT_ROLE = "plugin::creative-works.credit-role" as any
const UPLOAD_FILE = "plugin::upload.file" as any

export const SHORT_FILM_SLUGS = {
  alpha: "sf-alpha",
  bravo: "sf-bravo",
  charlie: "sf-charlie",
  echo: "sf-echo",
  foxtrot: "sf-foxtrot",
  golf: "sf-golf",
  deltaDraft: "sf-delta-draft",
  film: "ff-feature",
} as const

/** The six published shorts in `publishedAt` ascending order. */
export const PUBLISHED_SHORT_SLUGS = [
  SHORT_FILM_SLUGS.alpha,
  SHORT_FILM_SLUGS.bravo,
  SHORT_FILM_SLUGS.charlie,
  SHORT_FILM_SLUGS.echo,
  SHORT_FILM_SLUGS.foxtrot,
  SHORT_FILM_SLUGS.golf,
] as const

export const GENRE_SLUGS = {
  drame: "drame",
  comedie: "comedie",
  animation: "animation",
} as const

/** Arabic strings, compared byte-for-byte by the locale suites. */
export const ALPHA_AR_TITLE = "ألفا"
export const ALPHA_AR_SYNOPSIS = "ملخص الفيلم القصير ألفا"
export const CHARLIE_AR_DRAFT_TITLE = "تشارلي"
export const DRAME_AR_NAME = "دراما"

export interface ShortFilmFixtureIds {
  /** short/film slug -> documentId */
  works: Record<string, string>
  genres: Record<string, string>
  persons: Record<string, string>
  directorRole: string
}

interface ShortRow {
  key: keyof typeof SHORT_FILM_SLUGS
  title: string
  genre: keyof typeof GENRE_SLUGS
  director: string
  duration: number
  releaseYear: number
  publishedAt: string
  featured: boolean
  featuredRank: number | null
  published: boolean
  /** "published" | "draft" | undefined (no `ar` row) */
  arabic?: "published" | "draft"
  arabicTitle?: string
  arabicSynopsis?: string
  distinction?: boolean
  /** Watch source: a streaming link, or only a trailer video. */
  watch: "streaming" | "trailer"
}

const SHORTS: ShortRow[] = [
  {
    key: "alpha",
    title: "alpha",
    genre: "drame",
    director: "person-one",
    duration: 12,
    releaseYear: 2019,
    publishedAt: "2026-01-01T00:00:00.000Z",
    featured: true,
    featuredRank: 2,
    published: true,
    arabic: "published",
    arabicTitle: ALPHA_AR_TITLE,
    arabicSynopsis: ALPHA_AR_SYNOPSIS,
    distinction: true,
    watch: "streaming",
  },
  {
    key: "bravo",
    title: "bravo",
    genre: "comedie",
    director: "person-two",
    duration: 25,
    releaseYear: 2021,
    publishedAt: "2026-02-01T00:00:00.000Z",
    featured: true,
    featuredRank: 2,
    published: true,
    watch: "streaming",
  },
  {
    key: "charlie",
    title: "charlie",
    genre: "drame",
    director: "person-one",
    duration: 8,
    releaseYear: 2023,
    publishedAt: "2026-03-01T00:00:00.000Z",
    featured: true,
    featuredRank: 1,
    published: true,
    arabic: "draft",
    arabicTitle: CHARLIE_AR_DRAFT_TITLE,
    arabicSynopsis: ALPHA_AR_SYNOPSIS,
    watch: "streaming",
  },
  {
    key: "echo",
    title: "echo",
    genre: "comedie",
    director: "person-two",
    duration: 30,
    releaseYear: 2021,
    publishedAt: "2026-04-01T00:00:00.000Z",
    featured: true,
    featuredRank: null,
    published: true,
    watch: "streaming",
  },
  {
    key: "foxtrot",
    title: "foxtrot",
    genre: "drame",
    director: "person-three",
    duration: 15,
    releaseYear: 2020,
    publishedAt: "2026-05-01T00:00:00.000Z",
    featured: false,
    featuredRank: null,
    published: true,
    watch: "streaming",
  },
  {
    key: "golf",
    title: "golf",
    genre: "animation",
    director: "person-four",
    duration: 5,
    releaseYear: 2018,
    publishedAt: "2026-06-01T00:00:00.000Z",
    featured: false,
    featuredRank: null,
    published: true,
    watch: "trailer",
  },
  {
    key: "deltaDraft",
    title: "delta",
    genre: "drame",
    director: "person-one",
    duration: 10,
    releaseYear: 2022,
    publishedAt: "2026-07-01T00:00:00.000Z",
    featured: true,
    featuredRank: 1,
    published: false,
    watch: "streaming",
  },
]

async function findOrCreateGenre(
  strapi: Core.Strapi,
  slug: string,
  name: string
): Promise<string> {
  const existing: any = await strapi.documents(GENRE).findFirst({
    locale: "fr",
    filters: { slug: { $eq: slug } },
  } as any)
  if (existing) return existing.documentId
  const created: any = await strapi.documents(GENRE).create({
    data: { name, slug },
    locale: "fr",
  } as any)
  return created.documentId
}

async function findOrCreatePerson(
  strapi: Core.Strapi,
  slug: string,
  name: string,
  status: "published" | "draft"
): Promise<string> {
  const existing: any = await strapi.documents(PERSON).findFirst({
    locale: "fr",
    status,
    filters: { slug: { $eq: slug } },
  } as any)
  if (existing) return existing.documentId
  const created: any = await strapi.documents(PERSON).create({
    data: { name, slug },
    locale: "fr",
    status,
  } as any)
  return created.documentId
}

/** Create (idempotently) and publish the `ar` row of a localized document. */
async function ensureArabicRow(
  strapi: Core.Strapi,
  uid: any,
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const existing: any = await strapi.documents(uid).findOne({
    documentId,
    locale: "ar",
    status: "published",
  } as any)
  if (existing) return
  await strapi.documents(uid).update({
    documentId,
    locale: "ar",
    data,
  } as any)
  await strapi.documents(uid).publish({ documentId, locale: "ar" } as any)
}

async function findOrCreateDirectorRole(strapi: Core.Strapi): Promise<string> {
  const existing: any = await strapi.documents(CREDIT_ROLE).findFirst({
    locale: "fr",
    status: "published",
    filters: { slug: { $eq: "director" } },
  } as any)
  if (existing) return existing.documentId
  const created: any = await strapi.documents(CREDIT_ROLE).create({
    data: { name: "Realisateur", slug: "director", department: "directing" },
    locale: "fr",
    status: "published",
  } as any)
  return created.documentId
}

/**
 * A poster row in the upload table. Carries a `formats.thumbnail`, a `hash`,
 * a `provider` and a `provider_metadata` value so the projection suites can
 * prove the public media object strips them.
 */
async function createPosterFile(
  strapi: Core.Strapi,
  slug: string
): Promise<number> {
  const file: any = await strapi.db.query(UPLOAD_FILE).create({
    data: {
      name: `${slug}-poster.jpg`,
      alternativeText: `Affiche ${slug}`,
      hash: `${slug.replace(/-/g, "_")}_poster`,
      ext: ".jpg",
      mime: "image/jpeg",
      size: 12.5,
      width: 800,
      height: 1200,
      url: `/uploads/${slug}_poster.jpg`,
      provider: "local",
      provider_metadata: {
        public_id: `${slug}-secret-id`,
        resource_type: "image",
      },
      formats: {
        thumbnail: {
          name: `thumbnail_${slug}-poster.jpg`,
          hash: `thumbnail_${slug.replace(/-/g, "_")}`,
          ext: ".jpg",
          mime: "image/jpeg",
          size: 3.2,
          width: 104,
          height: 156,
          url: `/uploads/thumbnail_${slug}_poster.jpg`,
          provider_metadata: { public_id: `${slug}-thumb-secret-id` },
        },
      },
    },
  })
  return file.id
}

export async function seedShortFilmFixtures(
  strapi: Core.Strapi
): Promise<ShortFilmFixtureIds> {
  const genres = {
    drame: await findOrCreateGenre(strapi, GENRE_SLUGS.drame, "Drame"),
    comedie: await findOrCreateGenre(strapi, GENRE_SLUGS.comedie, "Comedie"),
    animation: await findOrCreateGenre(
      strapi,
      GENRE_SLUGS.animation,
      "Animation"
    ),
  }
  // Genre has no draft-and-publish; only `drame` gets an Arabic name.
  await strapi.documents(GENRE).update({
    documentId: genres.drame,
    locale: "ar",
    data: { name: DRAME_AR_NAME },
  } as any)

  const persons: Record<string, string> = {
    "person-one": await findOrCreatePerson(
      strapi,
      "person-one",
      "Personne Un",
      "published"
    ),
    "person-two": await findOrCreatePerson(
      strapi,
      "person-two",
      "Personne Deux",
      "published"
    ),
    "person-three": await findOrCreatePerson(
      strapi,
      "person-three",
      "Personne Trois",
      "published"
    ),
    "person-four": await findOrCreatePerson(
      strapi,
      "person-four",
      "Personne Quatre",
      "published"
    ),
    "person-draft": await findOrCreatePerson(
      strapi,
      "person-draft",
      "Personne Brouillon",
      "draft"
    ),
  }
  const directorRole = await findOrCreateDirectorRole(strapi)

  // Creating an `ar` row of a work copies its non-localized `credits`
  // component, whose person and credit-role targets are localized content
  // types: each target needs an `ar` row of its own first, or the copy throws
  // `Document with id ..., locale "ar" not found`.
  for (const row of SHORTS.filter((r) => r.arabic)) {
    await ensureArabicRow(strapi, PERSON, persons[row.director], {})
  }
  // `slug` is a required uid and uids are NOT copied to a new locale row.
  await ensureArabicRow(strapi, CREDIT_ROLE, directorRole, {
    name: "مخرج",
    slug: "director",
  })

  const works: Record<string, string> = {}

  for (const row of SHORTS) {
    const slug = SHORT_FILM_SLUGS[row.key]
    // The draft-only short is incomplete on purpose: no poster, no watch source.
    const complete = row.published
    const poster = complete ? await createPosterFile(strapi, slug) : undefined

    const data: Record<string, unknown> = {
      title: row.title,
      slug,
      type: "short-film",
      synopsis: `Synopsis de ${row.title}`,
      duration: row.duration,
      releaseYear: row.releaseYear,
      country: ["TN"],
      language: ["aeb"],
      featured: row.featured,
      featuredRank: row.featuredRank,
      genres: [genres[row.genre]],
      credits: [
        {
          person: persons[row.director],
          creditRole: directorRole,
          billing: 1,
        },
      ],
      ...(poster !== undefined ? { poster } : {}),
      ...(complete && row.watch === "streaming"
        ? {
            streamingLinks: [
              {
                platform: "youtube",
                url: `https://www.youtube.com/watch?v=${slug}`,
                accessType: "free",
              },
            ],
          }
        : {}),
      ...(complete && row.watch === "trailer"
        ? {
            videos: [
              {
                url: `https://www.youtube.com/watch?v=${slug}-trailer`,
                videoType: "trailer",
              },
            ],
          }
        : {}),
      ...(row.distinction
        ? {
            distinctions: [
              {
                name: "Journees Cinematographiques de Carthage",
                year: 2019,
                result: "winner",
                section: "Courts metrages",
              },
            ],
          }
        : {}),
    }

    const created: any = await strapi.documents(CW).create({
      data,
      locale: "fr",
      status: row.published ? "published" : "draft",
    } as any)
    works[slug] = created.documentId

    if (row.arabic) {
      await strapi.documents(CW).update({
        documentId: created.documentId,
        locale: "ar",
        data: {
          title: row.arabicTitle,
          synopsis: row.arabicSynopsis,
        },
      } as any)
      if (row.arabic === "published") {
        await strapi.documents(CW).publish({
          documentId: created.documentId,
          locale: "ar",
        } as any)
      }
    }
  }

  // A published non-short work: must never appear in the short-film routes.
  const film: any = await strapi.documents(CW).create({
    data: {
      title: "feature",
      slug: SHORT_FILM_SLUGS.film,
      type: "film",
      duration: 95,
      releaseYear: 2020,
      genres: [genres.drame],
    },
    locale: "fr",
    status: "published",
  } as any)
  works[SHORT_FILM_SLUGS.film] = film.documentId

  // Controllable publishedAt (the Document Service strips it).
  for (const row of SHORTS.filter((r) => r.published)) {
    await strapi.db.query(CW).updateMany({
      where: {
        documentId: works[SHORT_FILM_SLUGS[row.key]],
        publishedAt: { $notNull: true },
      },
      data: { publishedAt: new Date(row.publishedAt) },
    })
  }

  return { works, genres, persons, directorRole }
}
