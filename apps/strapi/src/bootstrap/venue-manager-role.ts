import type { Core } from "@strapi/strapi"

const ROLE_UID = "plugin::users-permissions.role" as const
const PERMISSION_UID = "plugin::users-permissions.permission" as const

/** The users-permissions role `type` venue applicants are provisioned into. */
export const VENUE_MANAGER_ROLE_TYPE = "venue-manager"

/**
 * The content-api actions the Venue Manager role is granted, in code.
 *
 * WHY seeded rather than clicked: in users-permissions the EXISTENCE of a
 * permission row IS the grant. Without these rows every `/venues/me` route
 * 403s on any fresh database until a human walks Settings → Roles → Venue
 * Manager, which is exactly the kind of undocumented manual step that makes a
 * shipped feature look broken. Seeding is idempotent and cheap.
 *
 * The id format is `plugin::<plugin>.<controller>.<action>` — the same string
 * users-permissions derives from `strapi.plugins[…].controllers` in
 * `getActions()`/`syncPermissions()`. A rename on either side leaves a dangling
 * row that `syncPermissions` prunes on the next boot, so these MUST track the
 * controller keys in `plugins/venues/server/src/controllers/index.ts`.
 *
 * `plugin::upload.content-api.upload` is here because the profile form uploads
 * the logo and photos BEFORE it saves (the venue stores file ids); without it
 * the media pickers fail with a 403 that looks like a form bug. It is NOT a
 * formality: unlike the three venue-profile actions it carries no scope, so it
 * lets every venue-manager account upload arbitrary files into the SHARED media
 * library at any time, not just files destined for their own venue. Narrowing
 * it needs a scoped upload proxy that does not exist yet — see
 * `docs/PERMISSIONS.md`.
 *
 * NOT here: `/venues`, `/venues/selector`, `/venues/by-slug/:slug` and
 * `POST /venues/register` — those routes are `auth: false`, so the
 * users-permissions permission layer never runs for them.
 */
export const VENUE_MANAGER_PERMISSION_ACTIONS = [
  "plugin::venues.venue-profile.getMine",
  "plugin::venues.venue-profile.updateMine",
  "plugin::venues.venue-profile.propertyDefinitions",
  "plugin::upload.content-api.upload",
] as const

/**
 * Idempotently grant {@link VENUE_MANAGER_PERMISSION_ACTIONS} to `roleId`.
 *
 * Deliberately non-fatal per action: a single failed grant is an operator
 * problem to read in the logs, not a reason to refuse to boot the whole API.
 */
async function ensureVenueManagerPermissions(
  strapi: Core.Strapi,
  roleId: number | string
): Promise<void> {
  for (const action of VENUE_MANAGER_PERMISSION_ACTIONS) {
    try {
      const existing = await strapi.query(PERMISSION_UID).findOne({
        where: { action, role: roleId },
      })

      if (existing) continue

      await strapi.query(PERMISSION_UID).create({
        data: { action, role: roleId },
      })

      strapi.log.info(
        `Granted "${action}" to the Venue Manager role (id: ${roleId})`
      )
    } catch (error) {
      strapi.log.error(
        `Failed to grant "${action}" to the Venue Manager role: ${error}`
      )
    }
  }
}

/**
 * Creates the Venue Manager role if it doesn't exist, then seeds its
 * content-api permissions.
 *
 * The permission pass runs on BOTH paths — an existing role from a database
 * provisioned before story 7.2 has none of the new grants, so returning early
 * on the "already exists" branch would leave every upgraded environment
 * broken.
 */
export async function ensureVenueManagerRole({
  strapi,
}: {
  strapi: Core.Strapi
}) {
  try {
    // Check if role already exists
    const existingRole = await strapi.query(ROLE_UID).findOne({
      where: { type: VENUE_MANAGER_ROLE_TYPE },
    })

    if (existingRole) {
      strapi.log.info(
        `Venue Manager role already exists (id: ${existingRole.id})`
      )
      await ensureVenueManagerPermissions(strapi, existingRole.id)
      return existingRole
    }

    // Create the Venue Manager role
    const role = await strapi.query(ROLE_UID).create({
      data: {
        name: "Venue Manager",
        description:
          "Venue managers can manage their own venues, events, and showtimes",
        type: VENUE_MANAGER_ROLE_TYPE,
      },
    })

    strapi.log.info(`Created Venue Manager role (id: ${role.id})`)

    // Story 7.2: the venue-profile grants are seeded in code, not clicked in
    // the Admin Panel. See docs/PERMISSIONS.md for the full intended matrix —
    // the content-type CRUD rows there are still operator-configured.
    await ensureVenueManagerPermissions(strapi, role.id)

    return role
  } catch (error) {
    strapi.log.error("Failed to create Venue Manager role:", error)
    throw error
  }
}
