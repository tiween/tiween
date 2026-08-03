/**
 * Relations the creative-work form needs resolved.
 *
 * `workToApiPayload` re-sends `credits` and `cast` wholesale and Strapi
 * replaces component arrays on write, so a path missing here is not a display
 * bug — it silently drops that data on the next save. `cast` fails quietly (no
 * required relation guards it), which is why the list is pinned by
 * `WorkForm/schema.unit.test.ts`.
 *
 * Kept in its own module so the test can import it without pulling in
 * `@strapi/strapi/admin` (ESM-only, unresolvable under the jest unit gate).
 */
export const WORK_POPULATE = [
  "poster",
  "backdrop",
  "photos",
  "genres",
  "credits",
  "credits.person",
  "credits.creditRole",
  "cast",
  "cast.person",
  "cast.character",
  "distinctions",
  "theatreDetails",
  "theatreDetails.premiereVenue",
  "externalIds",
  "videos",
  "links",
]
