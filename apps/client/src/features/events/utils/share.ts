/**
 * Pure, unit-tested URL builders for event sharing (Story 3.10).
 *
 * These are the only cleanly testable core of the share feature: the native
 * Web Share sheet and the clipboard cannot be exercised unattended, but the
 * canonical URL and the social deep-links are pure string composition.
 */

export interface BuildEventShareUrlOptions {
  /** Absolute site origin, e.g. `https://tiween.tn` (a trailing slash is tolerated). */
  baseUrl: string
  /** Active locale segment, e.g. `fr`. */
  locale: string
  /** Strapi v5 documentId of the event (there is no slug). */
  documentId: string
}

/**
 * Build the canonical, absolute share URL for an event detail page —
 * `${baseUrl}/${locale}/events/${documentId}` — mirroring the shape of
 * `generateMetadata`'s `canonical`. Any trailing slash on `baseUrl` is
 * stripped so the result never contains a double slash.
 */
export function buildEventShareUrl({
  baseUrl,
  locale,
  documentId,
}: BuildEventShareUrlOptions): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  return `${normalizedBase}/${locale}/events/${documentId}`
}

export interface BuildSocialShareLinksOptions {
  /** The (already absolute) canonical URL to share. */
  url: string
  /** Human-readable title of the event. */
  title: string
}

export interface SocialShareLinks {
  whatsapp: string
  facebook: string
  twitter: string
}

/**
 * Build hand-rolled share deep-links for WhatsApp, Facebook, and Twitter/X.
 * All parameters are URL-encoded; no third-party share SDK is used.
 */
export function buildSocialShareLinks({
  url,
  title,
}: BuildSocialShareLinksOptions): SocialShareLinks {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
  }
}

export interface ToAbsoluteMediaUrlOptions {
  /** A media URL that may be absolute (http/https), protocol-relative, or root/relative. */
  url: string
  /** Absolute site origin, e.g. `https://tiween.tn` (trailing slash tolerated). */
  baseUrl: string
}

/**
 * Resolve a media URL to an absolute URL so social crawlers can fetch it
 * regardless of asset host. `http(s)` URLs pass through unchanged;
 * protocol-relative `//host/x` gets `https:`; any other value is treated as a
 * site-relative path and joined to `baseUrl` (with exactly one separating slash).
 */
export function toAbsoluteMediaUrl({
  url,
  baseUrl,
}: ToAbsoluteMediaUrlOptions): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith("//")) return `https:${url}`
  const base = baseUrl.replace(/\/+$/, "")
  const path = url.startsWith("/") ? url : `/${url}`
  return `${base}${path}`
}

/**
 * Decide whether a rejected `navigator.share(...)` should open the copy/social
 * fallback. A user-cancelled native sheet rejects with a DOMException named
 * `AbortError` — that is NOT a failure, so return false (no fallback). Any other
 * error means the native share machinery failed → true (show the fallback).
 */
export function shouldFallbackAfterShareError(error: unknown): boolean {
  return !(error instanceof DOMException && error.name === "AbortError")
}
