/**
 * Post-login redirect helpers (phase 2, D-14).
 *
 * The signed-out heart sends visitors to sign-in with `?callbackUrl=<the page
 * they were on>`, which makes the round trip a first-class journey and the
 * `callbackUrl` query parameter a user-controlled redirect target (OWASP open
 * redirect; threat T-02-10). Every sign-in, register and reset-password form
 * reads it through `safeCallbackUrl`, and hands it to the next-intl router
 * through `toRouterPath`.
 */

/**
 * Locales the app serves. Mirrors `routing.locales` in `@/lib/navigation`,
 * which is not imported here because it pulls in `env.mjs` and next-intl's
 * `createNavigation` at module scope (this file must stay a cheap, pure util).
 */
const LOCALES = ["ar", "en", "fr"] as const

/**
 * Only allow a post-login redirect to a same-origin relative path: a single "/"
 * followed by a non-slash, non-backslash char. This rejects absolute URLs,
 * protocol-relative "//host", and backslash tricks ("/\\host", which the URL
 * parser normalizes to "//host") — all of which are open-redirect vectors.
 * Anything else resolves to "/".
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  // Same-origin relative paths only. Reject protocol-relative (`//`) and
  // backslash (`/\`) targets, AND any ASCII control char (tab/newline/CR):
  // browsers strip those during URL parsing, so `/\n/evil.com` collapses to
  // `//evil.com` and would slip past the leading-char check as an off-origin
  // redirect.
  if (raw && /^\/[^/\\]/.test(raw) && !/[\u0000-\u001f\u007f]/.test(raw)) {
    return raw
  }
  return "/"
}

const LOCALE_PREFIX = new RegExp(`^/(?:${LOCALES.join("|")})(?=[/?#]|$)`)

/**
 * Remove exactly one leading locale segment from an app path ("/ar/shorts/x"
 * becomes "/shorts/x"; "/fr" and "/en/" become "/").
 *
 * Why: next-intl's router (`useRouter` from `@/lib/navigation`) prefixes the
 * active locale to every pushed path and does not de-duplicate, so the browser
 * pathname the heart stores as `callbackUrl` (for example "/ar/shorts/x")
 * would become "/ar/ar/shorts/x" on push (RESEARCH Pitfall 16). Full
 * navigations (OAuth `signIn`, `window.location`) are not locale-aware and must
 * keep the prefixed path, so use this only where the next-intl router consumes
 * the value. It is a correctness helper, not a security check: run
 * `safeCallbackUrl` first.
 */
export function toRouterPath(path: string): string {
  const rest = path.replace(LOCALE_PREFIX, "")
  if (rest === path) {
    return path
  }
  if (rest === "" || rest === "/") {
    return "/"
  }
  // "/ar?a=1" or "/ar#x": keep the query or fragment on the root path.
  return rest.startsWith("/") ? rest : `/${rest}`
}
