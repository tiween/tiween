/**
 * Relation paths the Works form needs resolved.
 *
 * This list is the CONTRACT of the server route
 * `GET /creative-works/admin/works/:documentId`: it must resolve every path
 * here (a relation target carries `documentId` and `name`, never a `{ count }`),
 * and `creative-works/server/src/__tests__/work-editor.service.test.ts` pins
 * that. The content-manager single-document GET cannot be used instead: it
 * counts every relation and ignores a `populate` parameter (G-01-1).
 *
 * `workToApiPayload` re-sends `credits` and `cast` wholesale and Strapi
 * replaces component arrays on write, so a path missing from the route answer
 * is not a display bug: it silently drops that data on the next save. `cast`
 * fails quietly (no required relation guards it), which is why the list is
 * pinned by `WorkForm/schema.unit.test.ts` as well.
 *
 * Kept in its own module so the tests can import it without pulling in
 * `@strapi/strapi/admin` (ESM-only, unresolvable under the jest server gate).
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
  "streamingLinks",
]
