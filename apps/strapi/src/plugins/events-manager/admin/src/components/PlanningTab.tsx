import { useState } from "react"
import {
  Box,
  Field,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system"

import { useEventGroups } from "../hooks/useEventGroups"
import { useVenues } from "../hooks/useVenues"
import { PlanningCalendarNew } from "./PlanningCalendarNew"

const PlanningTab = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [selectedEventGroupId, setSelectedEventGroupId] = useState<
    string | null
  >(null)

  const { venues, isLoading: venuesLoading } = useVenues()
  const { eventGroups, isLoading: eventGroupsLoading } = useEventGroups()

  return (
    <Box padding={4} background="neutral0" hasRadius>
      {/* Top bar with selectors on the right */}
      <Flex justifyContent="flex-end" gap={4} paddingBottom={4}>
        {/* Venue Selector */}
        <Box minWidth="220px">
          <Field.Root>
            <SingleSelect
              placeholder={venuesLoading ? "Loading venues..." : "Select Venue"}
              value={selectedVenueId}
              onChange={(value: string) => setSelectedVenueId(value)}
              disabled={venuesLoading}
              size="S"
            >
              {venues.map((venue) => (
                <SingleSelectOption key={venue.id} value={String(venue.id)}>
                  {venue.name}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Box>

        {/* Event Group Selector */}
        <Box minWidth="220px">
          <Field.Root>
            <SingleSelect
              placeholder={
                eventGroupsLoading ? "Loading..." : "Filter by Event Group"
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
                <SingleSelectOption key={group.id} value={String(group.id)}>
                  {group.shortTitle || group.title}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Box>
      </Flex>

      {/* Calendar content */}
      {venuesLoading ? (
        <Flex justifyContent="center" padding={8}>
          <Loader>Loading venues...</Loader>
        </Flex>
      ) : !selectedVenueId ? (
        <Box
          padding={8}
          background="neutral100"
          hasRadius
          style={{ textAlign: "center" }}
        >
          <Flex direction="column" gap={2} alignItems="center">
            <Typography variant="beta" textColor="neutral600">
              Select a venue to view its schedule
            </Typography>
            <Typography variant="omega" textColor="neutral500">
              Use the dropdown above to choose a venue
            </Typography>
          </Flex>
        </Box>
      ) : (
        <PlanningCalendarNew
          venueId={selectedVenueId}
          eventGroupId={selectedEventGroupId ?? undefined}
        />
      )}
    </Box>
  )
}

export { PlanningTab }
export default PlanningTab
