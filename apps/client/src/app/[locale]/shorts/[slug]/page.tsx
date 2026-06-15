import { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getMockLatestShortFilms,
  getMockShortFilmBySlug,
  MOCK_SHORT_FILMS,
} from "@/features/shorts/data"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { ShortFilmDetailPage } from "./ShortFilmDetailPage"

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

/**
 * Generate static params for all mock short films
 * This enables static generation of all film detail pages
 */
export async function generateStaticParams() {
  return MOCK_SHORT_FILMS.map((film) => ({
    slug: film.slug,
  }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const film = getMockShortFilmBySlug(slug)

  if (!film) {
    return {
      title: "Court métrage non trouvé - Tiween",
    }
  }

  const description = film.synopsis
    ? film.synopsis.replace(/<[^>]*>/g, "").slice(0, 160)
    : `Découvrez ${film.title}, un court métrage${film.directors?.[0] ? ` de ${film.directors[0].name}` : ""}`

  return {
    title: `${film.title} - Courts métrages - Tiween`,
    description,
    robots: { index: false, follow: false },
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

  // Enable static rendering
  setRequestLocale(locale)

  // Fetch film data from mock data
  const film = getMockShortFilmBySlug(slug)

  if (!film) {
    notFound()
  }

  // Fetch related shorts (same genre or latest)
  const relatedShorts = getMockLatestShortFilms(6)
  const filteredRelated = relatedShorts.filter(
    (s) => s.documentId !== film.documentId
  )

  return (
    <ShortFilmDetailPage
      film={film}
      relatedShorts={filteredRelated.slice(0, 5)}
    />
  )
}
