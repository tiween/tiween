/**
 * Canonical website-URL pattern for the venue `website` field (DW-15).
 *
 * WHY a dedicated, dependency-free module: the same rule has to hold in three
 * places that live in different bundles — the content-type `schema.json`
 * (`regex`, applied by Strapi's entity validator + the built-in admin field
 * validation), the `venues` plugin DB lifecycle subscriber (server), and the
 * custom `VenueFormModal` admin form (Vite/browser bundle). Any import here
 * (Zod, `@strapi/utils`, …) would leak a server dependency into the admin
 * build, so this file deliberately imports nothing.
 *
 * The pattern string below is the single source of truth: the venue
 * `schema.json` must carry a byte-for-byte identical `regex`, and
 * `src/shared/__tests__/website-url.unit.test.ts` fails the build if the two
 * ever drift apart.
 */

/**
 * Canonical URL pattern.
 *
 * Written with `String.raw` so the literal reads exactly as it is stored in
 * `schema.json` (where the same characters appear as `\\w` / `\\d` / `\\s`,
 * JSON's own escaping of a single backslash).
 *
 * Three deliberate design choices:
 * - The scheme uses a character class (`[Hh][Tt]…`) instead of an `i` flag
 *   because Strapi compiles attribute regexes with `new RegExp(attr.regex)` and
 *   no flags — case-insensitivity has to live inside the pattern.
 * - The leading `^$|` alternative keeps the empty string valid. At the schema
 *   layer this is belt-and-braces rather than load-bearing: Strapi applies the
 *   regex as `validator.matches(re, { excludeEmptyString: !attr.required })`
 *   (`@strapi/core` entity-validator/validators.js), and `website` is optional,
 *   so `""` is already skipped there. It IS load-bearing for any consumer that
 *   uses `WEBSITE_URL_PATTERN` on its own, which is the point of exporting it.
 * - The path/query/fragment tail excludes C0/C7 control characters as well as
 *   whitespace. `[^\s]` alone admits NUL, which Postgres rejects at the driver
 *   with an opaque `22021` ("invalid byte sequence") instead of our validation
 *   error, and admits bidi overrides that let stored link text disagree with
 *   the URL it resolves to. The invisible-character exclusions cover the whole
 *   family, not just the overrides: bidi marks (`U+200E`, `U+200F`, `U+061C`)
 *   steer rendering the same way, and the zero-width characters (`U+200B`-`D`,
 *   `U+2060`-`U+2064`, `U+FEFF`) let two URLs that look identical be stored as
 *   different values. Non-ASCII paths (`https://a.tn/café`) stay valid.
 *
 * Host labels follow the DNS shape (alphanumeric ends, hyphens only inside), so
 * `https://sub_domain.tn` and `https://-a.tn` are rejected rather than stored as
 * unresolvable links.
 *
 * Accepted limits, all deliberate: non-punycode IDN hosts, bare-host intranet
 * URLs, IP-literal hosts (`https://192.168.1.10`) and `user:pass@` credentials
 * are rejected; a syntactically-shaped but out-of-range port (`:0`, `:99999`)
 * is accepted — a URL validator is a shape check, not a reachability check.
 */
export const WEBSITE_URL_PATTERN = String.raw`^$|^(?:[Hh][Tt][Tt][Pp][Ss]?)://(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?::\d{1,5})?(?:[/?#][^\s\x00-\x1F\x7F\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]*)?$`

/**
 * Compiled once at module load — this runs on every lifecycle event and on
 * every admin-form validation pass, so rebuilding it per call is pure waste.
 */
const WEBSITE_URL_RE = new RegExp(WEBSITE_URL_PATTERN)

/** Upper bound mirrored by `maxLength` on the venue `website` attribute. */
export const WEBSITE_URL_MAX_LENGTH = 255

/** Stable error CODE attached to every rejection (project rule: codes, not prose). */
export const INVALID_WEBSITE_URL = "INVALID_WEBSITE_URL"

/**
 * Is `value` an acceptable venue website?
 *
 * `undefined`, `null` and `""` are valid — the field is optional and must never
 * become required. Anything that is not a string is rejected rather than
 * coerced, and no normalization/trimming happens here (never silently rewrite
 * stored user data; the admin form trims before it submits).
 */
export function isValidWebsiteUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true
  if (typeof value !== "string") return false
  if (value.length > WEBSITE_URL_MAX_LENGTH) return false

  return WEBSITE_URL_RE.test(value)
}
