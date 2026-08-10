/**
 * The venues admin capability set (Story 2D.2, AC 7).
 *
 * Reads the admin RBAC actions registered in `server/src/register.ts` through
 * `useRBAC()`, which derives an `allowedActions` key from the LAST segment of
 * each action id (`plugin::venues.manage-all` → `canManageAll`, a hyphen being
 * dropped and the next letter capitalized).
 *
 * This gate is CONVENIENCE ONLY. The security boundary is
 * `plugin::venues.venues-admin-scope` + `services/venue-admin.ts` on the
 * server: hiding "Nouveau lieu" stops an accident, not an attacker with a
 * console open.
 *
 * While the permissions are still loading everything is reported as DENIED —
 * so the create button and the Propriétés nav appear once, on the answer, and
 * never flash into view and then disappear.
 */
import { useRBAC } from "@strapi/strapi/admin"

import { VENUES_PERMISSIONS } from "../permissions"

export { VENUES_PERMISSIONS }

export interface VenuePermissions {
  isLoading: boolean
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  /** The `canManageAllVenues` capability: every venue, and a writable status. */
  canManageAll: boolean
}

export function useVenuePermissions(): VenuePermissions {
  const { isLoading, allowedActions } = useRBAC([...VENUES_PERMISSIONS])

  const can = (key: string) => !isLoading && allowedActions?.[key] === true

  return {
    isLoading,
    canRead: can("canRead"),
    canCreate: can("canCreate"),
    canUpdate: can("canUpdate"),
    canDelete: can("canDelete"),
    canManageAll: can("canManageAll"),
  }
}
