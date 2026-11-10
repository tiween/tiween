import { notFound } from "next/navigation"
import { connection } from "next/server"

import type { ReactNode } from "react"

import { getShortFilm } from "@/lib/strapi-api/content/shorts"
import { isShortFilmNotFound } from "@/lib/strapi-api/content/shorts.errors"

const LOCALES = ["fr", "ar", "en"] as const
type ShortLocale = (typeof LOCALES)[number]

function isShortLocale(value: string): value is ShortLocale {
  return (LOCALES as readonly string[]).includes(value)
}

interface ShortFilmLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string; slug: string }>
}

/**
 * Existence guard for `/[locale]/shorts/[slug]` (D-06, D-07, SPAGE-01/05).
 *
 * The check lives in the layout, ABOVE any `loading.tsx` Suspense boundary, on
 * purpose: once streaming starts the HTTP status can no longer change, so a
 * `notFound()` raised inside a page that has a loading file becomes a 200
 * soft-404 (RESEARCH E3). From here an unknown slug is a real 404 and an
 * outage is a real 500 (the error is rethrown, never turned into a 404 or an
 * empty shell).
 *
 * `getShortFilm` is wrapped in React `cache()`, so the page and
 * `generateMetadata` reuse this very request.
 */
export default async function ShortFilmLayout({
  children,
  params,
}: ShortFilmLayoutProps) {
  // Request-time render: a deploy must never depend on Strapi being reachable.
  await connection()

  const { locale, slug } = await params
  if (!isShortLocale(locale)) notFound()

  try {
    await getShortFilm(slug, locale)
  } catch (error) {
    if (isShortFilmNotFound(error)) notFound()
    throw error
  }

  return children
}
