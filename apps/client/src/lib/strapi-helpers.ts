import type { StaticImport } from "next/dist/shared/lib/get-img-props"

// Must stay in sync with the fullPath of the root page in Strapi.
export const ROOT_PAGE_PATH = "/"

/**
 * Join Strapi page path segments into a single normalized path (no duplicate slashes).
 * Always starts with ROOT_PAGE_PATH ("/"). Optionally prefixes a locale.
 */
export const normalizePageFullPath = (
  paths: Array<string | undefined | null>,
  locale?: string | null
) => {
  const filteredPaths = paths.filter(Boolean) as string[]
  const fullPath = [ROOT_PAGE_PATH, ...filteredPaths]
    .join("/")
    .replace(/\/+/g, "/")

  if (locale) {
    if (fullPath.startsWith(`/${locale}/`) || fullPath === `/${locale}`) {
      return fullPath
    }
    return `/${locale}${fullPath === "/" ? "" : fullPath}`
  }

  return fullPath
}

/**
 * Function to format Strapi media URLs. There are 2 types of upload:
 * - S3 bucket - in this case, the URL is already correct and starts with https
 * - local upload - in this case, the URL starts with /uploads and we need to add API url prefix
 * (this happens in route handler for Strapi assets)
 *
 * TODO: make this generic - return same type as argument has
 */
export const formatStrapiMediaUrl = (
  imageUrl: string | StaticImport | undefined | null
): string | StaticImport | undefined => {
  if (!imageUrl) {
    return undefined
  }

  if (typeof imageUrl === "string") {
    if (!imageUrl.startsWith("http")) {
      if (imageUrl.startsWith("/uploads")) {
        return `/api/asset${imageUrl}`
      }
    }
  }

  return imageUrl
}
