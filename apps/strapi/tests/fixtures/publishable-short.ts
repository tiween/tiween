/**
 * Parts that make a short-film draft satisfy every D-19 publish rule except the
 * slug and title (plan 01-06).
 *
 * The creative-works publish guard refuses to publish a short film without a
 * poster, a published directing credit and a watch source. Boot suites that
 * characterize unrelated Strapi behaviour (revisions, locales, relations) but
 * still publish a short film spread `publishableShortParts()` into their data
 * instead of weakening the guard.
 *
 * `locales`: non-default locales the work will later get a row in. Creating a
 * locale row of a credited work copies the non-localized `credits` component,
 * whose person and credit-role targets are localized, so each target needs a
 * published row in that locale first (01-03 finding). The credit-role `slug` is
 * a uid and uids are not copied to a new locale row, so it is passed explicitly.
 */
import type { Core } from "@strapi/strapi"

const PERSON = "plugin::creative-works.person" as any
const ROLE = "plugin::creative-works.credit-role" as any
const UPLOAD_FILE = "plugin::upload.file" as any

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function ensureLocaleRow(
  strapi: Core.Strapi,
  uid: any,
  documentId: string,
  locale: string,
  data: Record<string, unknown>
): Promise<void> {
  const existing = await strapi
    .documents(uid)
    .findOne({ documentId, locale, status: "published" } as any)
  if (existing) return
  await strapi.documents(uid).update({ documentId, locale, data } as any)
  await strapi.documents(uid).publish({ documentId, locale } as any)
}

export interface PublishableShortParts {
  poster: number
  credits: Array<{ person: string; creditRole: string; billing: number }>
  streamingLinks: Array<{ platform: string; url: string; accessType: string }>
  /** documentId of the published person credited as director. */
  personId: string
  /** documentId of the published `director` credit-role. */
  directorRoleId: string
}

export async function publishableShortParts(
  strapi: Core.Strapi,
  tag: string,
  options: { locales?: string[] } = {}
): Promise<PublishableShortParts> {
  const file: any = await strapi.db.query(UPLOAD_FILE).create({
    data: {
      name: `${tag}.jpg`,
      hash: uniq(tag).replace(/-/g, "_"),
      ext: ".jpg",
      mime: "image/jpeg",
      size: 10,
      width: 800,
      height: 1200,
      url: `/uploads/${tag}.jpg`,
      provider: "local",
    },
  })

  const person: any = await strapi.documents(PERSON).create({
    data: { name: `Director ${tag}`, slug: uniq(`dir-${tag}`) } as any,
    locale: "fr",
    status: "published",
  } as any)

  const existingRole: any = await strapi.documents(ROLE).findFirst({
    locale: "fr",
    status: "published",
    filters: { slug: { $eq: "director" } },
  } as any)
  const role: any =
    existingRole ??
    (await strapi.documents(ROLE).create({
      data: { name: "Realisateur", slug: "director", department: "directing" },
      locale: "fr",
      status: "published",
    } as any))

  for (const locale of options.locales ?? []) {
    await ensureLocaleRow(strapi, PERSON, person.documentId, locale, {})
    await ensureLocaleRow(strapi, ROLE, role.documentId, locale, {
      name: `Realisateur ${locale}`,
      slug: "director",
    })
  }

  return {
    poster: file.id,
    credits: [
      { person: person.documentId, creditRole: role.documentId, billing: 1 },
    ],
    streamingLinks: [
      {
        platform: "youtube",
        url: `https://www.youtube.com/watch?v=${uniq(tag)}`,
        accessType: "free",
      },
    ],
    personId: person.documentId,
    directorRoleId: role.documentId,
  }
}
