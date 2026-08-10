/**
 * The accounts a venue may be assigned to (`venue.manager`).
 *
 * SCOPED TO THE `venue-manager` ROLE on purpose. `manager` targets
 * `plugin::users-permissions.user`, a table that also holds every B2C account
 * on the platform — offering all of them would be an unusable select and would
 * invite assigning a venue to a ticket buyer. `venue-manager` is the role
 * `src/bootstrap/venue-manager-role.ts` provisions and the one
 * `plugin::venues.is-venue-manager` gates the self-service dashboard on, so it
 * is the same vocabulary the rest of the tenant story uses.
 *
 * Read through the content-manager collection endpoint (as `useCities` does)
 * and FAIL-SOFT: a caller who cannot read the user collection gets an empty
 * select, not a broken form. The field itself is only rendered for a
 * `manage-all` caller — a scoped one is refused server-side (`VENUE_FORBIDDEN`)
 * because `manager` is the key its own scoping is derived from.
 */
import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

const USER_CM_PATH =
  "/content-manager/collection-types/plugin::users-permissions.user"

/** The users-permissions role `type` venue applicants are provisioned into. */
const VENUE_MANAGER_ROLE_TYPE = "venue-manager"

/** One page is the whole set in practice; venue managers are few. */
const PAGE_SIZE = 100

export interface VenueManager {
  id: number
  documentId?: string
  username?: string
  email?: string
}

interface ManagersResponse {
  results?: VenueManager[]
}

/** A human label for a manager option — never a bare numeric id. */
export function managerLabel(manager: VenueManager): string {
  if (manager.username && manager.email) {
    return `${manager.username} (${manager.email})`
  }
  return manager.username ?? manager.email ?? `#${manager.id}`
}

export function useVenueManagers(enabled = true) {
  const { get } = useFetchClient()
  const [managers, setManagers] = useState<VenueManager[]>([])
  const [isLoading, setIsLoading] = useState(enabled)

  const fetchManagers = useCallback(async () => {
    if (!enabled) {
      setManagers([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await get<ManagersResponse>(USER_CM_PATH, {
        params: {
          page: 1,
          pageSize: PAGE_SIZE,
          sort: "username:asc",
          filters: { role: { type: VENUE_MANAGER_ROLE_TYPE } },
        },
      })
      setManagers(response.data.results ?? [])
    } catch {
      setManagers([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled, get])

  useEffect(() => {
    fetchManagers()
  }, [fetchManagers])

  return { managers, isLoading, refetch: fetchManagers }
}
