/**
 * PlanningPage Component
 *
 * Calendar-based planning view for events at a selected venue.
 * Uses Strapi DS components with proper empty states and loading.
 */

import { useState } from "react"
import {
  Box,
  Button,
  EmptyStateLayout,
  Field,
  Flex,
  Loader,
  Main,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system"
import { Calendar, House, Plus } from "@strapi/icons"
import { Layouts } from "@strapi/strapi/admin"

import { PlanningCalendarNew } from "../../components/PlanningCalendarNew"
import { useEventGroups } from "../../hooks/useEventGroups"
import { useVenues } from "../../hooks/useVenues"

const PlanningPage = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [selectedEventGroupId, setSelectedEventGroupId] = useState<
    string | null
  >(null)

  const { venues, isLoading: venuesLoading } = useVenues()
  const { eventGroups, isLoading: eventGroupsLoading } = useEventGroups()

  const selectedVenue = venues.find((v) => String(v.id) === selectedVenueId)
  const selectedEventGroup = eventGroups.find(
    (eg) => String(eg.id) === selectedEventGroupId
  )

  const getSubtitle = () => {
    const parts: string[] = []
    if (selectedVenue) parts.push(selectedVenue.name)
    if (selectedEventGroup) parts.push(selectedEventGroup.title)
    return parts.length > 0
      ? parts.join(" • ")
      : "Gérez les séances et événements de vos lieux"
  }

  // Auto-select first venue when data loads
  const handleVenueChange = (value: string) => {
    setSelectedVenueId(value)
    setSelectedEventGroupId(null) // Reset group filter when venue changes
  }

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Planning"
          subtitle={getSubtitle()}
          primaryAction={
            <Flex gap={3} alignItems="center">
              {/* Venue Selector */}
              <Box style={{ minWidth: 200 }}>
                <SingleSelect
                  placeholder={
                    venuesLoading ? "Chargement..." : "Sélectionner un lieu"
                  }
                  value={selectedVenueId}
                  onChange={handleVenueChange}
                  disabled={venuesLoading}
                  size="S"
                >
                  {venues.map((venue) => (
                    <SingleSelectOption key={venue.id} value={String(venue.id)}>
                      {venue.name}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Box>

              {/* Event Group Selector - only show when venue is selected */}
              {selectedVenueId && (
                <Box style={{ minWidth: 180 }}>
                  <SingleSelect
                    placeholder={
                      eventGroupsLoading ? "Chargement..." : "Tous les groupes"
                    }
                    value={selectedEventGroupId}
                    onChange={(value: string) =>
                      setSelectedEventGroupId(value || null)
                    }
                    disabled={eventGroupsLoading}
                    size="S"
                    onClear={() => setSelectedEventGroupId(null)}
                  >
                    {eventGroups.map((group) => (
                      <SingleSelectOption
                        key={group.id}
                        value={String(group.id)}
                      >
                        {group.shortTitle || group.title}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Box>
              )}
            </Flex>
          }
        />
        <Layouts.Content>
          {venuesLoading ? (
            <Flex
              justifyContent="center"
              alignItems="center"
              paddingTop={10}
              paddingBottom={10}
            >
              <Loader>Chargement des lieux...</Loader>
            </Flex>
          ) : venues.length === 0 ? (
            <EmptyStateLayout
              icon={<House width={64} height={64} />}
              content={
                <Flex direction="column" gap={2} alignItems="center">
                  <Typography variant="delta" textColor="neutral600">
                    Aucun lieu enregistré
                  </Typography>
                  <Typography variant="omega" textColor="neutral500">
                    Commencez par créer un lieu pour pouvoir planifier des
                    événements
                  </Typography>
                </Flex>
              }
              action={
                <Button variant="secondary" startIcon={<Plus />}>
                  Créer un lieu
                </Button>
              }
            />
          ) : !selectedVenueId ? (
            <EmptyStateLayout
              icon={<Calendar width={64} height={64} />}
              content={
                <Flex direction="column" gap={2} alignItems="center">
                  <Typography variant="delta" textColor="neutral600">
                    Sélectionnez un lieu
                  </Typography>
                  <Typography variant="omega" textColor="neutral500">
                    Utilisez le menu déroulant ci-dessus pour choisir un lieu et
                    voir son planning
                  </Typography>
                </Flex>
              }
            />
          ) : (
            <PlanningCalendarNew
              venueId={selectedVenueId}
              eventGroupId={selectedEventGroupId ?? undefined}
            />
          )}
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { PlanningPage }
export default PlanningPage
