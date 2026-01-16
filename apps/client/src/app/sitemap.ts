import { env } from "@/env.mjs"
import { Locale } from "next-intl"

import type { MetadataRoute } from "next"

import { isProduction } from "@/lib/general-helpers"
import { routing } from "@/lib/navigation"

// The URL should be absolute, including the baseUrl (e.g. http://localhost:3000/some/nested-page)
const baseUrl = env.APP_PUBLIC_URL

/**
 * Tiween sitemap generator
 * TODO: Add event pages, venue pages, and other content when routes are implemented
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isProduction()) {
    return []
  }

  const promises = routing.locales.map((locale) =>
    generateLocalizedSitemap(locale)
  )
  const results = await Promise.allSettled(promises)

  return results
    .filter((result) => result.status === "fulfilled")
    .reduce((acc, curr) => {
      acc.push(...curr.value)
      return acc
    }, [] as MetadataRoute.Sitemap)
}

/**
 * Generates sitemap entries for a single locale
 * @param locale locale to retrieve (must be defined in routing `@/lib/navigation`)
 * @returns Sitemap entries for a single locale
 */
async function generateLocalizedSitemap(
  locale: Locale
): Promise<MetadataRoute.Sitemap> {
  const isDefaultLocale = locale === routing.defaultLocale

  // Add static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: isDefaultLocale ? baseUrl : new URL(locale, baseUrl).toString(),
      lastModified: new Date(),
      changeFrequency: "daily",
    },
  ]

  // TODO: Add dynamic pages (events, venues, etc.) when routes are implemented

  return staticPages
}
