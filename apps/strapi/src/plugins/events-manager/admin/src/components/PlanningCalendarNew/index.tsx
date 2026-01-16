/**
 * PlanningCalendarNew
 *
 * Integration layer between BigCalendar and the events-manager data layer.
 * Handles data fetching, event transformation, and modal interactions.
 *
 * This replaces the FullCalendar-based PlanningCalendar.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { Box, Flex, Loader, Typography } from "@strapi/design-system"
import { useFetchClient } from "@strapi/strapi/admin"

import type { ShowtimeWithEvent } from "../../hooks/useShowtimes"
import type { CalendarEvent, CalendarView, SlotDuration } from "../BigCalendar"

import { BigCalendar } from "../BigCalendar"
import {
  addDays,
  generateColorFromString,
  getContrastColor,
  startOfWeek,
} from "../BigCalendar/utils"
import { EventCreationModal } from "../EventCreationModal"
import { EventEditModal } from "../EventEditModal"

interface PlanningCalendarNewProps {
  venueId: string
  eventGroupId?: string
}

// Calendar state management
interface CalendarState {
  creationModal: { isOpen: boolean; date: Date | null }
  editModal: { isOpen: boolean; showtime: ShowtimeWithEvent | null }
}

type CalendarAction =
  | { type: "OPEN_CREATION_MODAL"; payload: Date }
  | { type: "CLOSE_CREATION_MODAL" }
  | { type: "OPEN_EDIT_MODAL"; payload: ShowtimeWithEvent }
  | { type: "CLOSE_EDIT_MODAL" }

const initialState: CalendarState = {
  creationModal: { isOpen: false, date: null },
  editModal: { isOpen: false, showtime: null },
}

function calendarReducer(
  state: CalendarState,
  action: CalendarAction
): CalendarState {
  switch (action.type) {
    case "OPEN_CREATION_MODAL":
      return { ...state, creationModal: { isOpen: true, date: action.payload } }
    case "CLOSE_CREATION_MODAL":
      return { ...state, creationModal: { isOpen: false, date: null } }
    case "OPEN_EDIT_MODAL":
      return {
        ...state,
        editModal: { isOpen: true, showtime: action.payload },
      }
    case "CLOSE_EDIT_MODAL":
      return { ...state, editModal: { isOpen: false, showtime: null } }
    default:
      return state
  }
}

// Map showtime ID to showtime object for click handling
type ShowtimeMap = Map<string | number, ShowtimeWithEvent>

/**
 * Transform showtimes to calendar events
 */
function transformShowtimesToEvents(
  showtimes: ShowtimeWithEvent[],
  showtimeMap: ShowtimeMap
): CalendarEvent[] {
  return showtimes.map((showtime) => {
    const startDate = new Date(showtime.datetime)
    const runtime = showtime.event?.creativeWork?.duration || 120
    const endDate = new Date(startDate.getTime() + runtime * 60 * 1000)
    const title = showtime.event?.title || "Untitled Event"
    const color = generateColorFromString(title)

    // Store in map for later retrieval
    showtimeMap.set(showtime.id, showtime)

    return {
      id: showtime.id,
      title: showtime.parentShowtimeId ? `🔄 ${title}` : title,
      start: startDate,
      end: endDate,
      color,
      textColor: getContrastColor(color),
      extendedProps: {
        format: showtime.format,
        isRecurring: !!showtime.parentShowtimeId,
        showtimeId: showtime.id,
      },
    }
  })
}

export function PlanningCalendarNew({
  venueId,
  eventGroupId,
}: PlanningCalendarNewProps) {
  const { get } = useFetchClient()
  const [state, dispatch] = useReducer(calendarReducer, initialState)

  // Calendar state
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>("week")
  const [slotDuration, setSlotDuration] = useState<SlotDuration>(15)

  // Data state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep a map of showtime IDs to showtime objects
  const showtimeMap = useMemo(
    () => new Map<string | number, ShowtimeWithEvent>(),
    []
  )

  // Calculate date range based on view
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "day") {
      const start = new Date(currentDate)
      start.setHours(0, 0, 0, 0)
      const end = addDays(start, 1)
      return { rangeStart: start, rangeEnd: end }
    } else {
      const start = startOfWeek(currentDate, 1) // Monday
      const end = addDays(start, 7)
      return { rangeStart: start, rangeEnd: end }
    }
  }, [currentDate, view])

  // Fetch events when date range or venue changes
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)
      showtimeMap.clear()

      try {
        const filters: Record<string, unknown> = {
          venue: { id: venueId },
          datetime: {
            $gte: rangeStart.toISOString(),
            $lte: rangeEnd.toISOString(),
          },
        }

        // Add event group filter if specified
        if (eventGroupId) {
          filters["event"] = { eventGroup: { id: eventGroupId } }
        }

        const params = {
          page: 1,
          pageSize: 500,
          sort: "datetime:asc",
          populate: ["event", "event.creativeWork", "event.eventGroup"],
          filters,
        }

        const response = await get<{ results: ShowtimeWithEvent[] }>(
          "/content-manager/collection-types/plugin::events-manager.showtime",
          { params }
        )

        const calendarEvents = transformShowtimesToEvents(
          response.data.results ?? [],
          showtimeMap
        )
        setEvents(calendarEvents)
      } catch (err) {
        console.error("Failed to fetch events:", err)
        setError("Failed to load events")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [venueId, eventGroupId, rangeStart, rangeEnd, get, showtimeMap])

  // Handle slot click - open creation modal
  const handleSlotClick = useCallback((date: Date) => {
    // Don't allow creating events in the past
    if (date < new Date()) {
      return
    }
    dispatch({ type: "OPEN_CREATION_MODAL", payload: date })
  }, [])

  // Handle event click - open edit modal
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      const showtime = showtimeMap.get(event.id)
      if (showtime) {
        dispatch({ type: "OPEN_EDIT_MODAL", payload: showtime })
      }
    },
    [showtimeMap]
  )

  // Modal handlers
  const handleCreationModalClose = useCallback(() => {
    dispatch({ type: "CLOSE_CREATION_MODAL" })
  }, [])

  const handleEventCreated = useCallback(() => {
    dispatch({ type: "CLOSE_CREATION_MODAL" })
    // Trigger refetch by updating a dependency
    setCurrentDate(new Date(currentDate))
  }, [currentDate])

  const handleEditModalClose = useCallback(() => {
    dispatch({ type: "CLOSE_EDIT_MODAL" })
  }, [])

  const handleEventUpdated = useCallback(() => {
    dispatch({ type: "CLOSE_EDIT_MODAL" })
    // Trigger refetch
    setCurrentDate(new Date(currentDate))
  }, [currentDate])

  if (error) {
    return (
      <Box padding={4} background="danger100" hasRadius>
        <Typography textColor="danger700">{error}</Typography>
      </Box>
    )
  }

  return (
    <>
      <Box position="relative">
        {isLoading && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            style={{ transform: "translate(-50%, -50%)", zIndex: 100 }}
          >
            <Loader>Loading events...</Loader>
          </Box>
        )}
        <Box style={{ opacity: isLoading ? 0.5 : 1 }}>
          <BigCalendar
            events={events}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            view={view}
            onViewChange={setView}
            slotDuration={slotDuration}
            onSlotDurationChange={setSlotDuration}
            minTime="08:00"
            maxTime="24:00"
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            locale="fr-FR"
            firstDayOfWeek={1}
          />
        </Box>
      </Box>

      {/* Event Creation Modal */}
      {state.creationModal.isOpen && state.creationModal.date && (
        <EventCreationModal
          isOpen={state.creationModal.isOpen}
          onClose={handleCreationModalClose}
          onSuccess={handleEventCreated}
          venueId={venueId}
          prefilledDate={state.creationModal.date}
        />
      )}

      {/* Event Edit Modal */}
      {state.editModal.isOpen && state.editModal.showtime && (
        <EventEditModal
          isOpen={state.editModal.isOpen}
          onClose={handleEditModalClose}
          onSuccess={handleEventUpdated}
          showtime={state.editModal.showtime}
        />
      )}
    </>
  )
}
