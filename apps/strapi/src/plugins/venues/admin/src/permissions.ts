/**
 * The admin RBAC permissions this plugin's UI checks.
 *
 * Deliberately DEPENDENCY-FREE (no `@strapi/*` import): the menu link
 * (`./index.tsx`), the capability hook (`./hooks/useVenuePermissions.ts`) and
 * the unit test that pins these against `server/src/register.ts` all read the
 * same constants. The test runs on the node gate, where importing the admin
 * bundle explodes on ESM — so the shared truth has to live somewhere that
 * imports nothing.
 *
 * Each `action` must exist in `VENUES_ADMIN_RBAC_ACTIONS`
 * (`server/src/register.ts`); `server/src/__tests__/register.unit.test.ts`
 * fails the build if it does not.
 */

/** Every capability the venues admin asks `useRBAC()` about. */
export const VENUES_PERMISSIONS = [
  { action: "plugin::venues.read", subject: null },
  { action: "plugin::venues.create", subject: null },
  { action: "plugin::venues.update", subject: null },
  { action: "plugin::venues.delete", subject: null },
  { action: "plugin::venues.manage-all", subject: null },
] as const

/**
 * What the left-menu entry is gated on. Read-only: seeing the plugin at all
 * requires being able to read venues, and nothing more.
 */
export const VENUES_MENU_PERMISSIONS = [
  { action: "plugin::venues.read", subject: null },
] as const
