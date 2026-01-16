import { env } from "@/env.mjs"
import { Locale } from "next-intl"
import { getTranslations } from "next-intl/server"

import type { Metadata } from "next"

import {
  getDefaultMetadata,
  getDefaultOgMeta,
  getDefaultTwitterMeta,
} from "@/lib/metadata/defaults"

export async function getMetadataFromStrapi({
  fullPath,
  locale,
  customMetadata,
}: {
  fullPath?: string
  locale: Locale
  customMetadata?: Metadata
}): Promise<Metadata | null> {
  const t = await getTranslations({ locale, namespace: "seo" })

  const siteUrl = env.APP_PUBLIC_URL

  if (!siteUrl) {
    console.error(
      "Please provide APP_PUBLIC_URL (public URL of site) for SEO metadata generation."
    )
    return null
  }

  const defaultMeta: Metadata = getDefaultMetadata(customMetadata, siteUrl, t)
  const defaultOgMeta: Metadata["openGraph"] = getDefaultOgMeta(
    locale,
    fullPath,
    t
  )
  const defaultTwitterMeta: Metadata["twitter"] = getDefaultTwitterMeta(t)

  // Return default SEO from translations
  // TODO: Add Strapi SEO fetching when content types with SEO components are implemented
  return {
    ...defaultMeta,
    openGraph: defaultOgMeta,
    twitter: defaultTwitterMeta,
  }
}
