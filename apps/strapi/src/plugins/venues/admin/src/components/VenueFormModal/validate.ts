/**
 * Pure rules for the venue create/edit form.
 *
 * Extracted from `index.tsx` for the reason the events-manager original was:
 * the Jest UNIT gate matches `**\/*.unit.test.ts` in a node environment, so
 * logic living inside a `.tsx` component cannot be pinned there. Keeping the
 * rules here makes the editor-facing contract verifiable without a DOM.
 *
 * Every value returned is an error **CODE**, never prose — the same vocabulary
 * `server/src/validation/venue-admin.ts` answers with, so one translation table
 * covers both the client pre-check and the server rejection (AC 5). A rule that
 * returned French here would give the same failure two different wordings
 * depending on which side caught it.
 */
import { isValidWebsiteUrl } from "../../../../../../shared/website-url"

/** The subset of form state the rules read. */
export interface VenueFormValues {
  name: string
  slug: string
  type: string
  email: string
  website: string
  capacity: string
}

export type VenueFormErrors = Partial<Record<keyof VenueFormValues, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Mirrors the `slug` rule in `server/src/validation/venue-admin.ts`. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Slugify a venue name: lowercase, diacritics stripped, non-alphanumerics
 * collapsed to single hyphens.
 *
 * Arabic (and any other non-Latin script) has no ASCII transliteration here, so
 * an Arabic-only name slugifies to the empty string. That is deliberate and
 * SAFE: the empty slug is dropped from the payload rather than sent, and Strapi
 * generates one from `name` for the `uid` attribute. Inventing a transliteration
 * would produce URLs no one can predict or search for.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Field errors for the current form state; an empty object means "submittable".
 *
 * `name` and `type` are the two REQUIRED fields (AC 3). Optional fields are
 * only checked when non-empty — an editor clearing a bad legacy value must not
 * be blocked by the field they just emptied.
 */
export function validateVenueForm(values: VenueFormValues): VenueFormErrors {
  const errors: VenueFormErrors = {}

  if (!values.name.trim()) {
    errors.name = "VENUE_NAME_REQUIRED"
  }

  if (!values.type) {
    errors.type = "VENUE_TYPE_REQUIRED"
  }

  // An empty slug is valid: it is omitted from the payload and Strapi derives
  // the `uid` from `name`.
  if (values.slug.trim() && !SLUG_RE.test(values.slug.trim())) {
    errors.slug = "VENUE_SLUG_INVALID"
  }

  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = "VENUE_EMAIL_INVALID"
  }

  // The canonical pattern the venue `schema.json` regex and the venues DB
  // lifecycle enforce — checked here only so the editor gets inline feedback
  // instead of a server rejection. `isValidWebsiteUrl` accepts the empty
  // string, so a cleared website passes.
  if (!isValidWebsiteUrl(values.website.trim())) {
    errors.website = "VENUE_WEBSITE_INVALID"
  }

  if (values.capacity.trim()) {
    const capacity = Number(values.capacity)
    if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 1_000_000) {
      errors.capacity = "VENUE_CAPACITY_INVALID"
    }
  }

  return errors
}
