import type { Core } from "@strapi/strapi"

/**
 * Creates the Venue Manager role if it doesn't exist.
 * This role allows venue managers to manage their own venues and events.
 */
export async function ensureVenueManagerRole({
  strapi,
}: {
  strapi: Core.Strapi
}) {
  const ROLE_TYPE = "venue-manager"

  try {
    // Check if role already exists
    const existingRole = await strapi
      .query("plugin::users-permissions.role")
      .findOne({
        where: { type: ROLE_TYPE },
      })

    if (existingRole) {
      strapi.log.info(
        `Venue Manager role already exists (id: ${existingRole.id})`
      )
      return existingRole
    }

    // Create the Venue Manager role
    const role = await strapi.query("plugin::users-permissions.role").create({
      data: {
        name: "Venue Manager",
        description:
          "Venue managers can manage their own venues, events, and showtimes",
        type: ROLE_TYPE,
      },
    })

    strapi.log.info(`Created Venue Manager role (id: ${role.id})`)

    // Note: Permissions are configured via the Strapi Admin Panel
    // or can be set programmatically using the permissions API.
    // See docs/PERMISSIONS.md for the full permission matrix.

    return role
  } catch (error) {
    strapi.log.error("Failed to create Venue Manager role:", error)
    throw error
  }
}
