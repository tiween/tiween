import { Metadata } from "next"
import {
  getMockFeaturedShortFilms,
  getMockLatestShortFilms,
  MOCK_GENRES,
  MOCK_SHORT_FILMS,
} from "@/features/shorts/data"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { ShortsShowcase } from "./_components/ShortsShowcase"

export const metadata: Metadata = {
  title: "Courts Métrages | Tiween",
  description:
    "Découvrez les meilleurs courts métrages tunisiens. Drames primés, comédies touchantes et documentaires captivants.",
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export default async function ShortsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const featuredFilms = getMockFeaturedShortFilms(5)
  const latestFilms = getMockLatestShortFilms(10)
  const awardWinners = MOCK_SHORT_FILMS.filter(
    (f) => f.awards && f.awards.length > 0
  )
  const dramaFilms = MOCK_SHORT_FILMS.filter((f) =>
    f.genres?.some((g) => g.slug === "drame")
  )

  return (
    <ShortsShowcase
      locale={locale}
      featuredFilms={featuredFilms}
      latestFilms={latestFilms}
      awardWinners={awardWinners}
      dramaFilms={dramaFilms}
      allFilms={MOCK_SHORT_FILMS}
      genres={MOCK_GENRES}
    />
  )
}
