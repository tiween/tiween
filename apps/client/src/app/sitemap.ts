import { env } from "@/env.mjs"
import { Locale } from "next-intl"

import type { MetadataRoute } from "next"

import { isProduction } from "@/lib/general-helpers"
import { routing } from "@/lib/navigation"
import { PublicStrapiClient } from "@/lib/strapi-api"

// The URL should be absolute, including the baseUrl (e.g. http://localhost:3000/some/nested-page)
const baseUrl = env.APP_PUBLIC_URL

/**
 * Tiween sitemap generator
 *
 * Generates sitemap entries for:
 * - Static pages (homepage, search)
 * - Category filter pages
 * - Dynamic event pages
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
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
  const localePrefix = isDefaultLocale ? "" : `/${locale}`

  // Build URL helper
  const buildUrl = (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`
    return isDefaultLocale
      ? `${baseUrl}${cleanPath}`
      : `${baseUrl}/${locale}${cleanPath}`
  }

  // Build hreflang alternates
  const buildAlternates = (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`
    return {
      languages: routing.locales.reduce(
        (acc, loc) => {
          const isDefault = loc === routing.defaultLocale
          acc[loc] = isDefault
            ? `${baseUrl}${cleanPath}`
            : `${baseUrl}/${loc}${cleanPath}`
          return acc
        },
        {} as Record<string, string>
      ),
    }
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: buildUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: buildAlternates("/"),
    },
    {
      url: buildUrl("/search"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: buildAlternates("/search"),
    },
  ]

  // Category filter pages
  const categories = ["cinema", "theater", "music", "exhibitions", "shorts"]
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: buildUrl(`/?category=${category}`),
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
    alternates: buildAlternates(`/?category=${category}`),
  }))

  // Dynamic event pages
  let eventPages: MetadataRoute.Sitemap = []
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/events-manager/events",
      {
        locale,
        filters: {
          status: { $in: ["scheduled", "active"] },
          endDate: { $gte: new Date().toISOString().split("T")[0] },
        },
        fields: ["documentId", "updatedAt", "startDate"],
        sort: ["updatedAt:desc"],
        pagination: {
          page: 1,
          pageSize: 500, // Reasonable limit for sitemap
        },
      },
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    const events = (response.data || []) as Array<{
      documentId: string
      updatedAt?: string
      startDate: string
    }>

    eventPages = events.map((event) => ({
      url: buildUrl(`/events/${event.documentId}`),
      lastModified: new Date(event.updatedAt || event.startDate),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: buildAlternates(`/events/${event.documentId}`),
    }))
  } catch (error) {
    console.error(
      `[sitemap] Error fetching events for locale ${locale}:`,
      error
    )
    // Continue with static pages even if event fetch fails
  }

  return [...staticPages, ...categoryPages, ...eventPages]
}
