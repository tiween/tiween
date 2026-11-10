import { connection } from "next/server"
import { ShortsDirectory } from "@/features/shorts/components"
import { Metadata } from "next"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { getShortFilmsPage } from "@/lib/strapi-api/content/shorts"

export const metadata: Metadata = {
  title: "Courts Métrages",
  description:
    "Découvrez les meilleurs courts métrages tunisiens. Drames primés, comédies touchantes et documentaires captivants.",
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/**
 * The short-film directory on the Strapi list (SPAGE-01, SPAGE-05).
 *
 * `await connection()` comes first: without it this page is statically
 * eligible, `next build` would call Strapi, and a deploy would fail whenever
 * Strapi is down (D-06, RESEARCH Pitfall 2). The fetch itself is cached by the
 * Data Cache (revalidate 60, tagged) in the fetcher, which is why the page is
 * not forced to a dynamic segment config.
 *
 * A failed fetch is NOT caught: the error must throw out of the page so
 * `error.tsx` renders the retryable block (D-07). Catching it and rendering an
 * error shell would be cached for a whole revalidate window, and an empty
 * catalogue would pass an outage off as "no short films" (T-02-20).
 */
export default async function ShortsPage({ params }: PageProps) {
  await connection()

  const { locale } = await params
  setRequestLocale(locale)

  const { shorts, total } = await getShortFilmsPage({
    locale,
    page: 1,
    pageSize: 24,
  })

  return <ShortsDirectory initialShorts={shorts} totalShorts={total} />
}
