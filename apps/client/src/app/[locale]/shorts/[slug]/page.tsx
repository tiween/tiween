import { Metadata } from "next"
import { ShortFilmDetail } from "@/features/shorts/components"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { getShortFilm } from "@/lib/strapi-api/content/shorts"
import { isShortFilmNotFound } from "@/lib/strapi-api/content/shorts.errors"

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

// No static-params export on purpose: pages render on first request and are
// cached by the fetch Data Cache (D-06). The `[slug]` layout owns the 404/500.

/** Pages stay unindexed until the Phase 6 go-live switch. */
const NOINDEX: Metadata = { robots: { index: false, follow: false } }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params

  // The layout guard already decided the page's fate. A metadata throw would
  // only duplicate a page failure, so any failure here yields bare noindex
  // robots metadata.
  let film
  try {
    film = await getShortFilm(slug, locale)
  } catch (error) {
    if (isShortFilmNotFound(error)) {
      return {
        // The root layout's title template already appends "| Tiween".
        title: "Court métrage non trouvé",
        ...NOINDEX,
      }
    }
    return NOINDEX
  }

  const description = film.synopsis
    ? film.synopsis.replace(/<[^>]*>/g, "").slice(0, 160)
    : `Découvrez ${film.title}, un court métrage${film.directors?.[0] ? ` de ${film.directors[0].name}` : ""}`

  return {
    title: `${film.title} - Courts métrages`,
    description,
    ...NOINDEX,
    openGraph: {
      title: film.title,
      description,
      type: "video.movie",
      images: film.poster?.url
        ? [{ url: film.poster.url, alt: film.title }]
        : undefined,
    },
  }
}

export default async function ShortFilmPage({ params }: PageProps) {
  const { locale, slug } = await params

  setRequestLocale(locale)

  // React cache(): this is the layout's request, not a second one. A failure
  // is thrown (never rendered as an empty shell), see the layout.
  const film = await getShortFilm(slug, locale)

  return <ShortFilmDetail film={film} relatedShorts={[]} />
}
