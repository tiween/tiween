import type { Core } from "@strapi/strapi"

/**
 * Admin RBAC actions for the venues plugin (Story 2D.2).
 *
 * Registering them is what makes the plugin appear under Settings → Roles →
 * Plugins, and what gives `ctx.state.userAbility` (server) and `useRBAC()`
 * (admin UI) something to answer about. The resulting action ids are
 * `plugin::venues.<uid>` — the strings the routes' `admin::hasPermissions`
 * config and the admin UI's permission checks BOTH reference, so a rename here
 * has to be made in three places at once.
 *
 * `manage-all` is the capability AC 7 calls `canManageAllVenues`: with it the
 * caller sees every venue, may create one, and may edit `status`; without it
 * `services/venue-admin.ts` confines every read and write to the venues whose
 * `manager` matches the caller and strips `status` from the payload. The uid is
 * hyphenated on purpose — `useRBAC()` derives `canManageAll` from it (a hyphen
 * is dropped and the next letter capitalized).
 *
 * OPERATOR NOTE: a fresh database grants these to the Super Admin role only.
 * Any other role (including a custom "Venue Manager" admin role) sees an empty
 * venues list until an administrator ticks the boxes in Settings → Roles. That
 * is Strapi's standard model — the alternative, seeding grants onto roles we do
 * not own, silently widens permissions on every boot.
 */
export const VENUES_ADMIN_RBAC_ACTIONS = [
  {
    section: "plugins",
    displayName: "Read venues",
    uid: "read",
    pluginName: "venues",
  },
  {
    section: "plugins",
    displayName: "Create venues",
    uid: "create",
    pluginName: "venues",
  },
  {
    section: "plugins",
    displayName: "Edit venues",
    uid: "update",
    pluginName: "venues",
  },
  {
    section: "plugins",
    displayName: "Delete venues",
    uid: "delete",
    pluginName: "venues",
  },
  {
    section: "plugins",
    displayName: "Manage all venues (not only their own)",
    uid: "manage-all",
    pluginName: "venues",
  },
] as const

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Non-fatal: a failure to register the actions must not take the whole API
  // down at boot. It degrades to "no venues admin permissions offered", which
  // is visible in Settings → Roles and in the log line below.
  try {
    await strapi
      .service("admin::permission")
      .actionProvider.registerMany(VENUES_ADMIN_RBAC_ACTIONS)
  } catch (err) {
    strapi.log.error(
      `[venues] failed to register admin RBAC actions: ${
        (err as Error)?.stack ?? err
      }`
    )
  }
}
