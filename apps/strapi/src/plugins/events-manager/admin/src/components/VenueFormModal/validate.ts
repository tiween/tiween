/**
 * Pure validation rules for the venue create/edit form.
 *
 * Extracted from `index.tsx` for the same reason `WorkForm/schema.ts` is a
 * separate module: the Jest gate is `**\/*.unit.test.ts` in a node environment,
 * so logic living inside a `.tsx` component cannot be pinned by a test. Keeping
 * the rules here makes the editor-facing contract — including the DW-15 website
 * rule — verifiable without a DOM.
 *
 * These messages are the admin-facing French strings this plugin's UI already
 * uses (the built-in `next-intl` code translation applies to the client app,
 * not to the Strapi admin).
 */
import { isValidWebsiteUrl } from "../../../../../../shared/website-url"

/** The subset of the form state the rules below read. */
export interface VenueFormValues {
  name: string
  type: string
  email: string
  website: string
}

export type VenueFormErrors = Partial<Record<keyof VenueFormValues, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Field errors for the current form state; an empty object means "submittable".
 *
 * `email` and `website` are optional — only a non-empty value is checked.
 * `website` is trimmed first because `handleSubmit` submits the trimmed value,
 * so validating the raw string would reject a harmless trailing space that is
 * never sent to the server.
 */
export function validateVenueForm(values: VenueFormValues): VenueFormErrors {
  const errors: VenueFormErrors = {}

  if (!values.name.trim()) {
    errors.name = "Le nom est requis"
  }

  if (!values.type) {
    errors.type = "Le type est requis"
  }

  if (values.email && !EMAIL_RE.test(values.email)) {
    errors.email = "Email invalide"
  }

  // Same canonical pattern the venue `schema.json` regex and the venues DB
  // lifecycle enforce — checked here only so the editor gets inline feedback
  // instead of a silent server rejection.
  if (!isValidWebsiteUrl(values.website.trim())) {
    errors.website = "URL invalide (ex: https://www.lieu.tn)"
  }

  return errors
}
