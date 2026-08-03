import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"

import {
  INVALID_WEBSITE_URL,
  isValidWebsiteUrl,
} from "../../../../shared/website-url"

const { ValidationError } = errors

const VENUE_UID = "plugin::venues.venue"

/**
 * Venue `website` URL enforcement (DW-15).
 *
 * WHY a DB lifecycle on top of the schema `regex`: `@strapi/core`'s entity
 * validator only applies an attribute `regex` when the entry is NOT a draft
 * (see `services/entity-validator/validators.js`), and `venue` has
 * `draftAndPublish: true`. A draft save from the admin — which is exactly what
 * the custom venue form does through the content-manager REST API — would
 * therefore bypass the schema entirely, as would Document Service and seed
 * writes. `strapi.db.lifecycles` sits below every one of those write paths, so
 * one subscriber here closes the hole for all of them.
 *
 * The check is intentionally key-presence based: a partial update that does not
 * carry a `website` key leaves the stored value untouched and must not be
 * rejected on behalf of a field it never mentioned.
 *
 * The `*Many` hooks are subscribed too because `createMany` / `updateMany` emit
 * their own `beforeCreateMany` / `beforeUpdateMany` events (`@strapi/database`
 * entity-manager) and never fire the single-entry hooks. Nothing in this repo
 * writes venues that way today — they are here so a future bulk caller is
 * covered by default rather than silently unvalidated.
 *
 * KNOWN GAP, deliberate: `strapi import` (`@strapi/data-transfer`) is NOT
 * covered by any layer. Its local-destination provider calls
 * `strapi.db.lifecycles.disable()` for the whole restore and writes through
 * `db.query().create` — so neither this subscriber nor the schema `regex` (the
 * entity validator is bypassed too) runs. A data transfer is an operator
 * restoring a trusted export, not user input; validating it would need a
 * separate pre-import check, which DW-15 does not attempt.
 */
type LifecycleData = Record<string, unknown>

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  /** Reject one entry payload; a payload without a `website` key is a no-op. */
  const assertEntry = (data: LifecycleData | undefined) => {
    if (!data || !("website" in data)) return
    if (isValidWebsiteUrl(data.website)) return

    // Human-readable message + stable CODE in `details` (the shared kit's
    // precedent, src/shared/validation.ts). API consumers key off
    // `details.code`; the built-in content-manager surfaces the message in a
    // generic error banner — a flat `details` object is not the
    // `details.errors[].path` shape it needs to highlight the field itself, so
    // `field` here is for API consumers, not for the admin UI.
    throw new ValidationError("Invalid website URL", {
      code: INVALID_WEBSITE_URL,
      field: "website",
    })
  }

  const assertWebsite = (event: {
    params?: { data?: LifecycleData | LifecycleData[] }
  }) => {
    // `createMany` passes an array of entries; `updateMany` passes one payload
    // applied to every matched row. Both shapes funnel into the same check.
    const data = event.params?.data
    if (Array.isArray(data)) {
      data.forEach(assertEntry)
      return
    }
    assertEntry(data)
  }

  strapi.db.lifecycles.subscribe({
    models: [VENUE_UID],
    beforeCreate: assertWebsite,
    beforeCreateMany: assertWebsite,
    beforeUpdate: assertWebsite,
    beforeUpdateMany: assertWebsite,
  })
}

export default bootstrap
